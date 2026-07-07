// skill/commit-class.mjs — SKILL-04: validate -> write -> update manifest -> git commit.
// Fail-closed: validateClass runs FIRST; nothing is written on any validation failure.
// Idempotent: re-processing a class REPLACES its index entry (never duplicates) and
// re-produces byte-identical class files (canonical pretty-print, deterministic IDs).
// Phase 2 (D-09): the class commit also carries this class's pre-generated audio
// (content/audio/<classId>/ + content/audio/index.json) via explicit git pathspec.
//
// Usage: node skill/commit-class.mjs <candidate-class.json>
import { validateClass } from './validate.mjs';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url)); // repo root (skill/..)

const candidatePath = process.argv[2];
if (!candidatePath) {
  console.error('usage: node skill/commit-class.mjs <candidate-class.json>');
  process.exit(1);
}

// 1. Read + VALIDATE FIRST (schema + 3 renderability invariants + ID determinism). Refuse on failure.
let doc;
try {
  doc = JSON.parse(readFileSync(resolve(candidatePath), 'utf8'));
  validateClass(doc);
} catch (err) {
  console.error(`REFUSED (validation failed): ${err.message}`);
  process.exit(1);
}

// 2. Write content/classes/<classId>.json — canonical pretty-print (stable, deterministic bytes).
const classRel = `content/classes/${doc.classId}.json`;
const classAbs = join(ROOT, classRel);
mkdirSync(join(ROOT, 'content/classes'), { recursive: true });
const classBytes = JSON.stringify(doc, null, 2) + '\n';
const prevBytes = existsSync(classAbs) ? readFileSync(classAbs, 'utf8') : null;
if (prevBytes !== classBytes) writeFileSync(classAbs, classBytes);

// 3. contentHash = sha256 of the written file, "sha256-" prefixed.
const contentHash = 'sha256-' + createHash('sha256').update(classBytes).digest('hex');

// 4. Upsert content/index.json — REPLACE the entry if the classId already exists (idempotent).
const indexRel = 'content/index.json';
const indexAbs = join(ROOT, indexRel);
// Phase 2 (D-09): the class commit also carries this class's pre-generated audio + the
// audio manifest — explicit pathspec only, guarded by existence (audio is optional).
const audioDirRel = `content/audio/${doc.classId}`;
const audioIndexRel = 'content/audio/index.json';
const audioPaths = [audioDirRel, audioIndexRel].filter((p) => existsSync(join(ROOT, p)));
const index = existsSync(indexAbs)
  ? JSON.parse(readFileSync(indexAbs, 'utf8'))
  : { contentVersion: 1, generatedAt: '', classes: [] };
const entry = {
  id: doc.classId,
  date: doc.date,
  label: doc.label,
  file: `classes/${doc.classId}.json`,
  contentHash,
  counts: {
    vocab: doc.vocab?.length ?? 0,
    grammar: doc.grammar?.length ?? 0,
    kanji: doc.kanji?.length ?? 0,
    notes: doc.notes?.length ?? 0,
  },
};
const at = index.classes.findIndex((c) => c.id === doc.classId);
const entryChanged = at < 0 || JSON.stringify(index.classes[at]) !== JSON.stringify(entry);
if (entryChanged) {
  if (at >= 0) index.classes[at] = entry;
  else index.classes.push(entry);
  index.contentVersion = 1;
  index.generatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); // refreshed only on real change (deterministic re-runs)
  writeFileSync(indexAbs, JSON.stringify(index, null, 2) + '\n');
}

// 5. Copy class file + index into app/public/content/ so a freshly-skilled class is
//    immediately servable locally (gitignored; CI re-does this copy at build — Plan 06).
const pubDir = join(ROOT, 'app/public/content');
mkdirSync(join(pubDir, 'classes'), { recursive: true });
copyFileSync(classAbs, join(pubDir, `classes/${doc.classId}.json`));
copyFileSync(indexAbs, join(pubDir, 'index.json'));

// 6. git add + git commit with the fixed message convention. Guard: only commit if staged changes exist.
const git = (...args) => execFileSync('git', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });

// 6a. Manifest/binary consistency gate (WR-05). The audio manifest is GLOBAL
// across classes but this commit's pathspec only carries THIS class's audio
// dir — committing the manifest while another class's .m4a files are still
// uncommitted would publish entries that 404 on a fresh checkout (a silent
// speaker button, see IN-01). Fail closed BEFORE staging: every manifest entry
// must resolve to a file that exists on disk AND is either part of this
// commit (under this class's audio dir) or already tracked in git.
// Classes without audio still commit fine (check only runs when the manifest exists).
if (audioPaths.includes(audioIndexRel)) {
  const audioManifest = JSON.parse(readFileSync(join(ROOT, audioIndexRel), 'utf8'));
  const tracked = new Set(
    git('ls-files', '--', 'content/audio').toString().split('\n').filter(Boolean),
  );
  for (const [key, relPath] of Object.entries(audioManifest.files ?? {})) {
    const contentRel = `content/${relPath}`;
    if (!existsSync(join(ROOT, contentRel))) {
      console.error(`REFUSED: audio manifest entry "${key}" -> ${contentRel} does not exist on disk (re-run generate-audio for its class)`);
      process.exit(1);
    }
    const inThisCommit = contentRel.startsWith(`${audioDirRel}/`);
    if (!inThisCommit && !tracked.has(contentRel)) {
      console.error(`REFUSED: audio manifest entry "${key}" -> ${contentRel} is not committed and not part of this commit (run commit-class for its class first)`);
      process.exit(1);
    }
  }
}

git('add', classRel, indexRel, ...audioPaths);
let staged = true;
try {
  git('diff', '--cached', '--quiet', '--', classRel, indexRel,
    ...audioPaths);
  staged = false; // exit 0 -> nothing staged for these paths
} catch {
  staged = true; // non-zero exit -> staged changes exist
}
if (staged) {
  // Explicit pathspec: commit ONLY the class JSON, content index, and this class's
  // audio dir + audio manifest, so anything the user had staged beforehand is never
  // swept into this commit.
  git('commit', '-m', `content(${doc.classId}): add/update class ${doc.label}`, '--', classRel, indexRel, ...audioPaths);
  console.log(`COMMITTED ${doc.classId} (${contentHash})`);
} else {
  console.log(`NO CHANGES ${doc.classId} (already up to date)`);
}

// skill/commit-class.mjs — SKILL-04: validate -> write -> update manifest -> git commit.
// Fail-closed: validateClass runs FIRST; nothing is written on any validation failure.
// Idempotent: re-processing a class REPLACES its index entry (never duplicates) and
// re-produces byte-identical class files (canonical pretty-print, deterministic IDs).
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
git('add', classRel, indexRel);
let staged = true;
try {
  git('diff', '--cached', '--quiet', '--', classRel, indexRel);
  staged = false; // exit 0 -> nothing staged for these paths
} catch {
  staged = true; // non-zero exit -> staged changes exist
}
if (staged) {
  git('commit', '-m', `content(${doc.classId}): add/update class ${doc.label}`);
  console.log(`COMMITTED ${doc.classId} (${contentHash})`);
} else {
  console.log(`NO CHANGES ${doc.classId} (already up to date)`);
}

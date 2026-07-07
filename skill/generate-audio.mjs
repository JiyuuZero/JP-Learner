// skill/generate-audio.mjs — Phase 2: pre-generated TTS audio (TTS-01 delivery).
// say -v Kyoko on the KANA field -> ffmpeg AAC/M4A mono 48k. Idempotent: only missing
// or changed-kana files are regenerated; orphans are deleted. Sidecar layout — the
// frozen content.schema.json is NOT touched.
//
// Fail-closed: validateClass runs FIRST (schema + invariants + ID rules); then hard
// guards on classId and derived filenames (path-traversal allowlist, T-02-02) and a
// Kyoko preflight (never generate Japanese audio with a non-JA voice, T-02-05).
// NO git operations here — the class commit (incl. audio) lives in commit-class.mjs (D-09).
//
// Usage: node skill/generate-audio.mjs <class.json>
import { validateClass } from './validate.mjs';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = fileURLToPath(new URL('..', import.meta.url)); // repo root (skill/..)

const candidatePath = process.argv[2];
if (!candidatePath) {
  console.error('usage: node skill/generate-audio.mjs <class.json>');
  process.exit(1);
}

// 1. Read + VALIDATE FIRST. Refuse to generate anything on any validation failure.
let doc;
try {
  doc = JSON.parse(readFileSync(resolve(candidatePath), 'utf8'));
  validateClass(doc);
} catch (err) {
  console.error(`REFUSED (validation failed): ${err.message}`);
  process.exit(1);
}

// 2. Preflight guards (fail-closed).
// 2a. Kyoko must be installed — NEVER generate JA audio with a non-Japanese voice (T-02-05).
try {
  const voices = execFileSync('say', ['-v', '?'], { encoding: 'utf8' });
  if (!voices.includes('Kyoko')) throw new Error('Kyoko not listed');
} catch {
  console.error('REFUSED: Kyoko voice not installed (System Settings -> Accessibility -> Spoken Content)');
  process.exit(1);
}
// 2b. classId shape guard (T-02-02) — it becomes a directory name under content/audio/.
if (!/^\d{4}-\d{2}-\d{2}(-\d+)?$/.test(doc.classId)) {
  console.error(`REFUSED: classId "${doc.classId}" does not match YYYY-MM-DD(-n)`);
  process.exit(1);
}

// 3. Entry list — vocab ONLY (D-04: grammar/kanji/notes get no audio, v2).
//    Word audio key = item.id ; example audio key = `${item.id}:example`.
const entries = [];
for (const item of doc.vocab ?? []) {
  entries.push([item.id, item.kana]);
  if (item.example?.kana) entries.push([`${item.id}:example`, item.example.kana]);
}

// 4. Derive filenames (D-02) with a hard allowlist guard (T-02-02).
const FILENAME_RE = /^[A-Za-z0-9_-]+\.m4a$/;
const plan = entries.map(([key, kana]) => {
  const filename = key.replaceAll(':', '_') + '.m4a';
  if (!FILENAME_RE.test(filename)) {
    console.error(`REFUSED: derived filename "${filename}" fails the allowlist (key ${key})`);
    process.exit(1);
  }
  const relPath = `audio/${doc.classId}/${filename}`;
  const kanaHash = 'sha256-' + createHash('sha256').update(kana, 'utf8').digest('hex');
  return { key, kana, filename, relPath, kanaHash };
});

// 5. Load the sidecar manifest (content/audio/index.json) or start fresh.
const manifestRel = 'content/audio/index.json';
const manifestAbs = join(ROOT, manifestRel);
const manifest = existsSync(manifestAbs)
  ? JSON.parse(readFileSync(manifestAbs, 'utf8'))
  : { audioVersion: 1, generatedAt: '', files: {}, kanaHashes: {} };
const before = JSON.stringify({ files: manifest.files, kanaHashes: manifest.kanaHashes });

// 6. Generate only missing/changed-kana files (idempotence via kanaHash).
const classDirAbs = join(ROOT, 'content/audio', doc.classId);
let generated = 0;
let skipped = 0;
for (const { key, kana, relPath, kanaHash } of plan) {
  const outAbs = join(ROOT, 'content', relPath);
  if (existsSync(outAbs) && manifest.kanaHashes[key] === kanaHash) {
    skipped++;
  } else {
    const tmp = mkdtempSync(join(tmpdir(), 'jp-audio-'));
    try {
      // Kana goes through a FILE, never argv/shell (T-02-01); execFileSync arg arrays, no shell.
      const textFile = join(tmp, 'text.txt');
      const aiffFile = join(tmp, 'out.aiff');
      writeFileSync(textFile, kana, 'utf8');
      execFileSync('say', ['-v', 'Kyoko', '-o', aiffFile, '-f', textFile]);
      mkdirSync(classDirAbs, { recursive: true });
      // ffmpeg (already a skill dependency — transcribe.sh) -> AAC/M4A mono 48 kbps (D-01).
      execFileSync(
        'ffmpeg',
        ['-y', '-i', aiffFile, '-ac', '1', '-c:a', 'aac', '-b:a', '48k', outAbs],
        { stdio: ['ignore', 'ignore', 'inherit'] },
      );
      generated++;
    } finally {
      rmSync(tmp, { recursive: true, force: true }); // T-02-04: no temp accumulation
    }
  }
  manifest.files[key] = relPath;
  manifest.kanaHashes[key] = kanaHash;
}

// 7. Orphan cleanup (D-09): delete stray .m4a files and prune stale manifest keys.
let deleted = 0;
const expectedFiles = new Set(plan.map((p) => p.filename));
if (existsSync(classDirAbs)) {
  for (const f of readdirSync(classDirAbs)) {
    if (f.endsWith('.m4a') && !expectedFiles.has(f)) {
      unlinkSync(join(classDirAbs, f));
      deleted++;
    }
  }
}
const currentKeys = new Set(plan.map((p) => p.key));
for (const key of Object.keys(manifest.files)) {
  if (key.startsWith(`${doc.classId}:`) && !currentKeys.has(key)) delete manifest.files[key];
}
for (const key of Object.keys(manifest.kanaHashes)) {
  if (key.startsWith(`${doc.classId}:`) && !currentKeys.has(key)) delete manifest.kanaHashes[key];
}

// 8. Idempotent manifest write — sorted keys (deterministic bytes), generatedAt only on real change.
const sortObj = (obj) =>
  Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));
manifest.files = sortObj(manifest.files);
manifest.kanaHashes = sortObj(manifest.kanaHashes);
const after = JSON.stringify({ files: manifest.files, kanaHashes: manifest.kanaHashes });
if (before !== after || !existsSync(manifestAbs)) {
  manifest.generatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const out = {
    audioVersion: 1,
    generatedAt: manifest.generatedAt,
    files: manifest.files,
    kanaHashes: manifest.kanaHashes,
  };
  mkdirSync(join(ROOT, 'content/audio'), { recursive: true });
  writeFileSync(manifestAbs, JSON.stringify(out, null, 2) + '\n');
}

// 9. Copy to app/public/content/audio/ so audio is immediately servable locally
//    (gitignored — root .gitignore covers app/public/content/ entirely).
const pubAudioDir = join(ROOT, 'app/public/content/audio');
mkdirSync(pubAudioDir, { recursive: true });
if (existsSync(classDirAbs)) {
  cpSync(classDirAbs, join(pubAudioDir, doc.classId), { recursive: true });
}
if (existsSync(manifestAbs)) copyFileSync(manifestAbs, join(pubAudioDir, 'index.json'));

// 10. Fixed output contract.
console.log(`AUDIO ${doc.classId} generated=${generated} skipped=${skipped} deleted=${deleted}`);

// Copies canonical content/ (repo root) into public/content/ so the app and
// deploys always serve the single source of truth. public/content/ is
// gitignored — regenerate with `npm run sync:content` (runs before build).
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const canonical = join(appRoot, '..', 'content');
const dest = join(appRoot, 'public', 'content');

rmSync(dest, { recursive: true, force: true });
mkdirSync(join(dest, 'classes'), { recursive: true });
cpSync(join(canonical, 'index.json'), join(dest, 'index.json'));
cpSync(join(canonical, 'classes'), join(dest, 'classes'), { recursive: true });
// Phase 2: pre-generated pronunciation audio (sidecar — same single canonical source).
// Guarded: content/audio/ may not exist before the skill has ever generated audio.
const audioSrc = join(canonical, 'audio');
if (existsSync(audioSrc)) cpSync(audioSrc, join(dest, 'audio'), { recursive: true });
console.log('synced content/ -> app/public/content/');

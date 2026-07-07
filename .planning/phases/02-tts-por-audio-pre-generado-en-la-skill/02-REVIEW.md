---
phase: 02-tts-por-audio-pre-generado-en-la-skill
reviewed: 2026-07-07T10:04:33Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - skill/generate-audio.mjs
  - skill/commit-class.mjs
  - skill/SKILL.md
  - skill/prompts/structure.md
  - content/audio/index.json
  - app/src/tts/audio.ts
  - app/src/tts/audio.test.ts
  - app/src/tts/TtsContext.tsx
  - app/src/components/SpeakerButton.tsx
  - app/src/exercises/Flashcard.tsx
  - app/src/views/Glosario.tsx
  - app/src/views/Perfil.tsx
  - app/scripts/sync-content.mjs
  - app/vite.config.ts
findings:
  critical: 0
  warning: 5
  info: 6
  total: 11
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-07-07T10:04:33Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Reviewed the Phase 2 pre-generated TTS pipeline end to end: skill-side generation (`generate-audio.mjs`), the class commit path (`commit-class.mjs`), the app-side manifest loading and fallback chain (`audio.ts`, `TtsContext.tsx`, `SpeakerButton.tsx`), the three views wiring `audioKey`, the content sync script, and the service-worker caching rules. Cross-checked against `skill/validate.mjs`, `app/src/tts/tts.ts`, the frozen `content/schema/content.schema.json`, `.gitignore`, and `app/package.json` build wiring.

The security posture is genuinely solid: `execFileSync` with arg arrays (no shell), kana passed via temp file (never argv), fail-closed validation before any write, and a two-sided path allowlist (skill filename guard + app manifest-path regex that structurally excludes `..` and absolute URLs). The manifest parse degrades correctly on 404/HTML-200/malformed input, matching the tests.

No critical (security / data-loss / crash) findings. Five warnings were found, all provable defects: an overlapping-voices bug that violates the phase's own "never overlap" invariant, a non-injective key-to-filename mapping that lets two schema-valid IDs silently overwrite each other's audio (reproduced), prototype-chain object lookups in the manifest hot path, a 30-day stale-audio window after a kana correction (same URL, changed bytes, CacheFirst), and a cross-class coupling in the commit pathspec that can publish manifest entries pointing at uncommitted audio files.

## Warnings

### WR-01: Web Speech fallback does not stop a playing .m4a — overlapping voices

**File:** `app/src/tts/TtsContext.tsx:55-61` (also `app/src/tts/audio.ts:75-80`)
**Issue:** The overlap prevention is one-directional. `playAudio()` cancels any Web Speech utterance before playing a file (`audio.ts:64`), and `speakJa()` cancels any prior utterance (`tts.ts:41`) — but nothing stops a playing `HTMLAudioElement` when the chain falls through to Web Speech. Repro: in a practice session, tap the example-sentence speaker on a vocab card (multi-second `.m4a` starts), advance to a grammar/kanji card, tap Pronunciación (no `audioKey` → `speakJa`) — the utterance speaks over the still-playing file. This violates the invariant stated in `audio.ts:62-63` ("Never overlap voices"). Relatedly, `stopAudio()` (`audio.ts:75-80`) is exported but never called anywhere in `app/src` — it is dead code that is exactly the missing half of this invariant.
**Fix:**
```tsx
// TtsContext.tsx
import { loadAudioManifest, playAudio, stopAudio, type AudioManifest } from './audio'
...
const speak = useCallback(
  (text: string, audioKey?: string) => {
    if (audioKey && playAudio(manifest, audioKey)) return
    stopAudio() // never speak Web Speech over a playing .m4a
    speakJa(text)
  },
  [manifest],
)
```

### WR-02: Non-injective key→filename mapping — two schema-valid IDs can silently overwrite each other's audio

**File:** `skill/generate-audio.mjs:73-83`
**Issue:** `key.replaceAll(':', '_') + '.m4a'` is not injective because the frozen schema's vocab id pattern is `^[^:]+:vocab:.+$` — the slug (`.+`) may itself contain `_` or `:`. Reproduced: ids `2026-04-14:vocab:o_kane` and `2026-04-14:vocab:o:kane` both derive `2026-04-14_vocab_o_kane.m4a` and both pass `FILENAME_RE` (the T-02-02 allowlist blocks traversal but not ambiguity). Worse, an id with slug `kau:example` produces a *manifest key* identical to the example key of id `...:vocab:kau` — the last-generated file wins and one item plays the other item's pronunciation. That is precisely the "wrong audio for an item" failure the Kyoko preflight (T-02-05) exists to prevent, and validate.mjs's duplicate-id check does not catch it (the ids are distinct). Likelihood is low (structure.md prescribes `[a-z0-9-]` hepburn slugs), but the prompt is convention, not enforcement, and this script is documented as fail-closed.
**Fix:** Detect collisions in the plan and refuse — cheap and airtight:
```js
const seenFiles = new Map();
const plan = entries.map(([key, kana]) => {
  const filename = key.replaceAll(':', '_') + '.m4a';
  if (!FILENAME_RE.test(filename)) { /* existing refusal */ }
  if (seenFiles.has(filename)) {
    console.error(`REFUSED: keys "${seenFiles.get(filename)}" and "${key}" collide on ${filename}`);
    process.exit(1);
  }
  seenFiles.set(filename, key);
  ...
});
```
Additionally (or alternatively) enforce the slug convention where it belongs: a `^[a-z0-9-]+$` slug check in `skill/validate.mjs`.

### WR-03: Prototype-chain lookups on the manifest object (`key in manifest`, `manifest[key]`)

**File:** `app/src/tts/TtsContext.tsx:63` and `app/src/tts/audio.ts:60`
**Issue:** The manifest is a plain object built from remote JSON. `hasAudio` uses `key in manifest`, which walks the prototype chain: `hasAudio('toString')` and `hasAudio('constructor')` return `true` on an empty manifest. `playAudio`'s `manifest[key]` has the same hole — for a prototype key, `path` is a function (not `undefined`), so the guard at `audio.ts:61` passes and `new Audio(BASE + 'content/' + path)` fires a garbage request and returns `true` (suppressing the Web Speech fallback). Today this is unreachable through the call sites — `audioKey` is always a schema-validated id containing `:`, which no `Object.prototype` property matches — but this file is the hardened T-02-06/T-02-07 parse boundary, and correctness there should not depend on distant schema guarantees.
**Fix:** Own-property checks (one line each), and optionally a null-prototype map:
```ts
// audio.ts
const path = Object.hasOwn(manifest, key) ? manifest[key] : undefined
// TtsContext.tsx
const hasAudio = useCallback((key: string) => Object.hasOwn(manifest, key), [manifest])
```

### WR-04: Corrected pronunciation audio stays stale for up to 30 days (CacheFirst + content-independent filenames)

**File:** `app/vite.config.ts:38-43` (interacts with `skill/generate-audio.mjs:75`)
**Issue:** Audio filenames are derived from the item key only — when a kana correction is committed (a first-class, documented workflow: human-in-the-loop corrections + idempotent regeneration via `kanaHashes`), the `.m4a` bytes change but the URL does not. The manifest is NetworkFirst so it refreshes, but its value (the path) is identical, and the `content-audio` CacheFirst cache never revalidates until `maxAgeSeconds` (30 days) or `maxEntries` eviction. Installed devices keep playing the OLD (wrong) pronunciation for up to a month after the fix ships. The comment brands this "T-02-11: bounded staleness", but a 30-day window for a *pronunciation correction* undercuts the core value ("practicar exactamente el contenido dado en clase") and the TTS-02 never-teach-wrong-pronunciation spirit.
**Fix:** Make the filename content-addressed — the app is already fully manifest-driven, so this is free on the app side and orphan cleanup removes the old file automatically:
```js
// generate-audio.mjs — include a short kana-hash fragment in the filename
const filename = `${key.replaceAll(':', '_')}-${kanaHash.slice(7, 15)}.m4a`;
```
(Alternatively switch the SW handler to `StaleWhileRevalidate`, at the cost of a network hit per tap.)

### WR-05: Class commit stages the shared audio manifest but only this class's audio dir — can publish manifest entries whose files were never committed

**File:** `skill/commit-class.mjs:50-52, 88-101`
**Issue:** `content/audio/index.json` is global across classes, but the commit pathspec only includes `content/audio/<classId>/` for the class being committed. If `generate-audio.mjs` has been run for class B and then `commit-class.mjs` is run for class A (out-of-order runs, or a B commit that was aborted), A's commit carries the manifest *including B's entries* while B's `.m4a` files stay uncommitted. On a fresh checkout / deploy, the app's `hasAudio()` returns true for B's items, `SpeakerButton` renders, `playAudio()` returns `true`, the fetch 404s, and `play()` rejects into the silent catch — a speaker button that does nothing and never falls back to Web Speech (see IN-01). The workflow's step ordering makes this unlikely per class, but nothing enforces it.
**Fix (any of):**
- Before staging, verify every manifest `files` entry resolves to an existing file under `content/audio/` and refuse otherwise (mirrors the fail-closed style of the rest of the script); or
- stage `content/audio/` wholesale so manifest and binaries can never diverge in a commit.

## Info

### IN-01: `playAudio` reports success before playback is known — a manifest hit that 404s produces a silent button instead of the Web Speech fallback

**File:** `app/src/tts/audio.ts:59-72`
**Issue:** `playAudio` returns `true` synchronously on a manifest hit; a missing/uncached file rejects `play()` into a silent catch, so the chain never reaches `speakJa`. This is a documented decision (comment at lines 56-58, justified by the iOS user-gesture constraint on the async boundary), but note it compounds WR-05: any manifest/file divergence becomes invisible, permanent silence rather than a degraded-but-working fallback. If WR-05 is fixed fail-closed, this tradeoff stays acceptable as-is.
**Fix:** None required if WR-05 is addressed; otherwise consider `current.onerror = () => speakJa(text)` accepting that iOS may block the late utterance.

### IN-02: Step-9 `cpSync` merge never prunes orphans from `app/public/content/audio/`

**File:** `skill/generate-audio.mjs:162-169`
**Issue:** Orphan `.m4a` files are deleted from `content/audio/<classId>/` (step 7) but `cpSync` into `app/public/content/audio/` only adds/overwrites — previously copied orphans stay servable locally until `npm run sync:content` (which does `rmSync` first) runs. Dev-only, gitignored, self-heals at build.
**Fix:** `rmSync(join(pubAudioDir, doc.classId), { recursive: true, force: true })` before the `cpSync`.

### IN-03: Hand-edited manifest missing `files`/`kanaHashes` crashes with a raw TypeError instead of a REFUSED message

**File:** `skill/generate-audio.mjs:88-99`
**Issue:** If `content/audio/index.json` exists but lacks `files` or `kanaHashes` (hand edit, merge damage), line 99 (`manifest.kanaHashes[key]`) throws an unhandled TypeError. Still fail-closed (non-zero exit, nothing written), but inconsistent with the script's otherwise-deliberate error reporting.
**Fix:** After loading: `manifest.files ??= {}; manifest.kanaHashes ??= {};`

### IN-04: Flashcard heart toggle keyboard handler missing `preventDefault` — Space scrolls the page

**File:** `app/src/exercises/Flashcard.tsx:91-96`
**Issue:** The `span[role=button]` heart's `onKeyDown` handles Enter/Space with `stopPropagation()` but no `preventDefault()`, so Space toggles the favorite *and* scrolls the page. `SpeakerButton.tsx:32-37` does this correctly — the two patterns should match. Pre-existing (not introduced by this phase's diff), but the file is in scope.
**Fix:** Add `e.preventDefault()` inside the key check, as in SpeakerButton.

### IN-05: `initTTS` effect has no cleanup — duplicate `voiceschanged` listeners and pollers under StrictMode/remount

**File:** `app/src/tts/TtsContext.tsx:36-38` (with `app/src/tts/tts.ts:22-31`)
**Issue:** `initTTS` registers a `voiceschanged` listener and a 250ms polling interval on every call and never removes the listener; the mount effect has no cleanup. Under React StrictMode dev double-mount (or any provider remount) listeners accumulate for the page lifetime. Bounded in practice (provider mounts once, `pick()` is idempotent, pollers self-terminate), pre-existing from Phase 1.
**Fix:** Have `initTTS` return a disposer (`removeEventListener` + `clearInterval`) and return it from the effect.

### IN-06: Importing a backup file containing literal JSON `null` silently does nothing

**File:** `app/src/views/Perfil.tsx:35-38, 154`
**Issue:** `JSON.parse('null')` succeeds with `null`, so `setPendingImport(null)` is a no-op against the `pendingImport !== null` modal gate — no confirm dialog, no error message. Conflates the "no pending import" sentinel with a parsed-null payload. Pre-existing edge, cosmetic.
**Fix:** Guard after parse: `if (parsed === null) { setMessage('El archivo no es un backup válido.'); return }` (or use a `{ payload: unknown } | null` wrapper state).

---

_Reviewed: 2026-07-07T10:04:33Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

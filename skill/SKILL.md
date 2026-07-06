# JP-Learner Content Skill — the fixed contract (SKILL-05)

This skill is the ONLY supported way to add classes to JP-Learner. It converts one class
audio recording (mixed Spanish/Japanese) into schema-valid content JSON that the app
consumes unchanged. It always runs the SAME five steps, in the SAME order, against the
SAME frozen schema — never skip, reorder, or improvise steps.

The skill depends ONLY on the frozen contract `content/schema/content.schema.json`
(and `content/index.json`). It NEVER depends on the app, and it never deploys anywhere:
everything runs locally on the Mac, with no API keys and no cloud services.

## One-time setup

- Node >= 20 (run `npm install` inside `skill/` once — installs ajv + ajv-formats).
- `brew install whisper-cpp ffmpeg`
- Download the Whisper model (required: **large-v3** — never tiny/base/small, they garble
  mixed ES/JA; `large-v3-turbo` only if the Mac is memory-constrained):
  ```sh
  sh "$(brew --prefix)/share/whisper-cpp/models/download-ggml-model.sh" large-v3
  ```
  which produces `models/ggml-large-v3.bin` (referenced by `transcribe.sh`).

## The 5 steps (invariant sequence)

### 1. Capture

Place the class audio file (m4a/mp3/wav, as recorded) in `audio-src/` at the repo root.
`audio-src/` is gitignored — raw audio is never committed and never leaves the machine.

### 2. Transcribe — `sh skill/transcribe.sh <audiofile>`

Converts the audio to 16kHz mono 16-bit WAV with ffmpeg, then runs whisper.cpp
(`whisper-cli -m models/ggml-large-v3.bin -l auto -oj`) → `audio-src/<audiofile>.json`,
a transcript with per-segment `detected_language`. Fully local, no API key.
`--translate` is NEVER passed (we want the original ES/JA text).

### 3. Structure — apply `skill/prompts/structure.md` to the transcript

Claude (this agent) reads the whisper JSON and produces ONE candidate class JSON:

- Claude reasoning is the ES/JA disambiguator (Whisper does not code-switch; segment
  language tags are hints only).
- Fills kanji / kana / romaji / es / pos / example for every vocab item and builds
  per-word AND per-kanji `tokens[]` satisfying the renderability invariant.
- Fallback: if per-kanji segmentation of a word is not certain, emit a single word-level
  token (`isKanji: true`, `kanji` = all kanji in the word, whole-word reading) — same
  schema, coarser Mode B display, never wrong readings.
- Classifies items into vocab / grammar / kanji / note; derives deterministic IDs
  (`<classId>:<type>:<slug>`, hepburn slug from kana for vocab) and tags every item with
  the classId.

**Human-in-the-loop (mandatory):** the user attended the class — show them the candidate
JSON and have them verify readings, translations and coverage BEFORE validating and
committing. Their corrections are authoritative. This human verification step is the
safety net for transcription and structuring errors.

### 4. Validate — `node skill/validate.mjs <candidate.json>`

Fail-closed gate against the frozen `content/schema/content.schema.json`:
ajv (draft 2020-12) shape validation + the 3 cross-field renderability invariants
(token surfaces concat === kanji, token readings concat === kana, isKanji tokens carry
non-empty `kanji[]`) + ID prefix/duplicate rules. Prints `VALID <classId>` on success;
exits 1 with the reason on ANY failure. Nothing may be written until this passes.

### 5. Write + commit — `node skill/commit-class.mjs <candidate.json>`

Re-validates (fail-closed), then:

- writes `content/classes/<classId>.json` (canonical pretty-print),
- updates `content/index.json` (upsert by classId — re-processing REPLACES the entry,
  never duplicates; recomputes `counts` and the `sha256-` `contentHash`, refreshes
  `generatedAt`, keeps `contentVersion: 1`),
- copies both into `app/public/content/` so the class is immediately servable locally
  (gitignored; CI re-copies at build),
- `git add` + `git commit -m "content(<classId>): add/update class <label>"` (fixed
  message convention; skips the commit when nothing changed).

Re-running the whole skill on the same class is idempotent: identical deterministic IDs
(SRS history survives re-processing) and a single index entry per class.

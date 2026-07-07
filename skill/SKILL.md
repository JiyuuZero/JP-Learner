# JP-Learner Content Skill — the fixed contract (SKILL-05)

This skill is the ONLY supported way to add classes to JP-Learner. It converts one or more
class audio recordings (mixed Spanish/Japanese) and/or user-provided class notes into
schema-valid content JSON that the app consumes unchanged. It always runs the SAME six
steps, in the SAME order, against the SAME frozen schema — never skip, reorder, or
improvise steps.

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
- `say -v Kyoko` ships with macOS — verify with `say -v '?' | grep Kyoko`.

## Ejecutar la skill con clase.py

La forma recomendada de procesar una clase: ejecuta `python3 clase.py` desde la raíz del
repo y **arrastra los ficheros a la ventana del terminal** — los audios (m4a/mp3/wav/aac/ogg)
y las notas opcionales (.txt/.md) — bien después de `python3 clase.py ` en la línea de
comandos, bien en el prompt interactivo; el launcher los copia a `audio-src/`. Después hace
el preflight de dependencias, transcribe en local lo pendiente (incremental — no
re-transcribe lo que ya tiene su `.json`) y lanza Claude interactivo con el contrato desde
el paso 3. Flags opcionales: `--fecha YYYY-MM-DD`, `--notas "texto"`, `--modelo <m>`.

Sin terminal: doble clic en **"Procesar Clase.app"** (regenerable con `sh skill/make-app.sh`;
el .app está gitignorado) → se abre la GUI (`python3 clase.py --gui`) → arrastra o añade los
ficheros, escribe apuntes si quieres y pulsa "Procesar clase" → la sesión interactiva de
Claude se abre sola en Terminal para la revisión humana.

## The 6 steps (invariant sequence)

### 1. Capture

Place the class audio file(s) (m4a/mp3/wav, as recorded) in `audio-src/` at the repo root.
A class may be recorded in SEVERAL files — place them all in `audio-src/`. Written notes,
corrections, or photo transcriptions from the user may complement — or fully replace — the
audio. A class may be created from text only (no audio): enter the pipeline at step 3.
`audio-src/` is gitignored — raw audio is never committed and never leaves the machine.

### 2. Transcribe — `sh skill/transcribe.sh <audiofile>`

Run once per audio file — N recordings of the class produce N transcript JSONs.
Converts the audio to 16kHz mono 16-bit WAV with ffmpeg, then runs whisper.cpp
(`whisper-cli -m models/ggml-large-v3.bin -l auto -oj`) → `audio-src/<audiofile>.json`,
a transcript with per-segment `detected_language`. Fully local, no API key.
`--translate` is NEVER passed (we want the original ES/JA text).

### 3. Structure — apply `skill/prompts/structure.md` to the sources

Claude (this agent) reads ALL the transcripts of the class plus any user-provided text
(notes, corrections, transcribed photos) and produces ONE merged candidate class JSON.
User-provided text is AUTHORITATIVE over Whisper on any conflict. Deterministic slugs
dedupe items repeated across recordings (same slug = same item, merged — never duplicated):

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

**Human-in-the-loop (mandatory in every input mode — audio, text, or both):** the user
attended the class — show them the candidate JSON and have them verify readings,
translations and coverage BEFORE validating and committing. Their corrections are
authoritative. This human verification step is the safety net for transcription and
structuring errors.

### 4. Validate — `node skill/validate.mjs <candidate.json>`

Fail-closed gate against the frozen `content/schema/content.schema.json`:
ajv (draft 2020-12) shape validation + the 3 cross-field renderability invariants
(token surfaces concat === kanji, token readings concat === kana, isKanji tokens carry
non-empty `kanji[]`) + ID prefix/duplicate rules. Prints `VALID <classId>` on success;
exits 1 with the reason on ANY failure. Nothing may be written until this passes.

### 5. Generate audio — `node skill/generate-audio.mjs <candidate.json>`

Re-validates (fail-closed), then pre-generates pronunciation audio (Phase 2, TTS-01):

- `say -v Kyoko` on the KANA field of every vocab word AND its example sentence
  (grammar / kanji / notes get no audio — v2 if needed); refuses to run if the Kyoko
  voice is not installed (never a non-Japanese voice),
- converts with ffmpeg to AAC/M4A mono 48 kbps,
- layout: `content/audio/<classId>/<id with ':' -> '_'>.m4a` (deterministic from item IDs),
- sidecar manifest `content/audio/index.json` (`files` key->path map + `kanaHashes`);
  the frozen `content/schema/content.schema.json` is untouched,
- idempotent: regenerates ONLY missing or changed-kana files, deletes orphan `.m4a`
  files and prunes stale manifest entries,
- copies everything to `app/public/content/audio/` (gitignored; servable locally).

### 6. Write + commit — `node skill/commit-class.mjs <candidate.json>`

Re-validates (fail-closed), then:

- writes `content/classes/<classId>.json` (canonical pretty-print),
- updates `content/index.json` (upsert by classId — re-processing REPLACES the entry,
  never duplicates; recomputes `counts` and the `sha256-` `contentHash`, refreshes
  `generatedAt`, keeps `contentVersion: 1`),
- copies both into `app/public/content/` so the class is immediately servable locally
  (gitignored; CI re-copies at build),
- also stages `content/audio/<classId>/` and `content/audio/index.json` when they exist
  (explicit pathspec — the class commit carries the audio produced by
  `skill/generate-audio.mjs` in step 5),
- `git add` + `git commit -m "content(<classId>): add/update class <label>"` (fixed
  message convention; skips the commit when nothing changed).

Re-running the whole skill on the same class is idempotent: identical deterministic IDs
(SRS history survives re-processing) and a single index entry per class.

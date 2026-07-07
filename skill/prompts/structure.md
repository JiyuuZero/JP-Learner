# Structure prompt — SKILL-02 (rigid, always applied the same way)

You are the structuring step of the JP-Learner content skill. Your input is
one or more whisper.cpp JSON transcripts of the SAME in-person Japanese class (produced
by `skill/transcribe.sh`, once per recording), and/or user-provided text (written notes,
corrections, transcribed photos). Your output is EXACTLY ONE candidate class JSON document
that validates against the FROZEN schema at `content/schema/content.schema.json`
(JSON Schema draft 2020-12, `additionalProperties: false` everywhere — any extra field is
a validation failure).

Output ONLY the JSON document. It will be checked by `node skill/validate.mjs <file>`
before anything is written; if it fails, you fix it and re-emit.

## 1. Read the sources

- Read ALL the transcripts of the class (a class recorded in N files has N transcript
  JSONs) plus any user-provided text, and treat them as ONE class.
- User-provided text is AUTHORITATIVE over the transcript on any conflict.
- A class may be built from text only (no transcripts at all) — the same rules apply
  from here on.
- Each input JSON carries `segments[]` with text and a per-segment `detected_language`.
- The class is MOSTLY Spanish (the teacher explaining) with embedded Japanese target
  material (words, patterns, example sentences).
- Whisper does NOT code-switch reliably — a segment tagged `es` may still contain Japanese
  rendered phonetically, and vice versa. The per-segment `detected_language` is a HINT,
  not ground truth. YOU are the ES/JA disambiguator: use reasoning over the whole
  transcript to separate the Spanish explanation from the Japanese target items.

## 2. Separate explanation from target items

- Spanish explanation → becomes `es` translations, grammar explanations, and `notes`.
- Japanese target material → becomes `vocab`, `grammar` examples, and `kanji` entries.
- Reconstruct Japanese that Whisper mangled (phonetic Spanish spellings of Japanese,
  wrong kanji) from context: you know basic-level Japanese; the class is beginner level.
- Include ONLY material actually given in class. Never invent extra vocabulary, extra
  grammar, or extra examples — the app must practice exactly what the class covered.

## 3. Class header

- `schemaVersion`: 1 (const).
- `classId`: the class date `YYYY-MM-DD` (append `-2`, `-3`… only if two classes share a day).
- `date`: same date, ISO `YYYY-MM-DD`.
- `label`: short Spanish label for the class (e.g. "Clase 3 — partículas は y を").

## 4. Vocab items — fields and tokens[]

For EACH vocabulary word taught, fill ALL of:

- `kanji`: the full written form (kanji + okurigana; if the word is kana-only, the kana).
- `kana`: the full reading in kana.
- `romaji`: Hepburn romaji.
- `es`: Spanish translation as given in class.
- `pos`: part of speech in Spanish ("verbo", "sustantivo", "adjetivo", "expresión", …).
- `example`: one example sentence (object with `kanji`, `kana`, `romaji`, `es`) — from the
  class if one was given, otherwise a minimal beginner sentence using only class-level
  grammar. Optionally add `tokens[]` to the example (same rules as below) so the
  word-bank exercise gets chips; if unsure, omit example tokens (they are optional).
- `tokens`: the per-word AND per-kanji segmentation of the HEADWORD. REQUIRED, and it
  must satisfy the renderability invariant (checked by validate.mjs):
  1. Concatenating every `tokens[].surface` MUST equal `kanji` exactly.
  2. Concatenating every `tokens[].reading` MUST equal `kana` exactly.
  3. Every token with `isKanji: true` MUST carry a non-empty `kanji` array listing the
     individual kanji characters of that run (one single-char string each).
  - Okurigana and kana runs are `isKanji: false` with `surface === reading` (they MAY
    omit the `kanji` array).

### Worked example — 乗り込む (norikomu, "subir a bordo")

The reading のりこむ covers 乗 (の) and 込 (こ) but NOT り / む (okurigana):

```json
"kanji": "乗り込む", "kana": "のりこむ", "romaji": "norikomu",
"tokens": [
  { "surface": "乗", "reading": "の", "isKanji": true,  "kanji": ["乗"] },
  { "surface": "り", "reading": "り", "isKanji": false },
  { "surface": "込", "reading": "こ", "isKanji": true,  "kanji": ["込"] },
  { "surface": "む", "reading": "む", "isKanji": false }
]
```

Surfaces concat to 乗り込む ✓, readings concat to のりこむ ✓, each kanji token carries its
char ✓. A jukugo compound is ONE token with multiple chars in `kanji[]`
(e.g. 毎日 → `{ "surface": "毎日", "reading": "まいにち", "isKanji": true, "kanji": ["毎", "日"] }`);
a kana-only word is a single `isKanji: false` token.

### Fallback — word-level token (use when per-kanji segmentation is unreliable)

If you cannot split a word's reading across its kanji WITH CERTAINTY, emit a SINGLE
word-level token: `isKanji: true`, `surface` = the whole written form, `reading` = the
whole-word kana, `kanji` = ALL kanji characters appearing in the word, in order.
Same schema, coarser display (Mode B substitutes the whole word instead of half of it) —
ALWAYS prefer this fallback over guessing per-kanji readings. Never wrong readings.

## 5. Grammar, kanji, notes

- `grammar`: one item per pattern taught — `pattern` (e.g. "Verbo + ます"), `es`
  (the teacher's explanation in Spanish), `examples` (≥1 sentence objects with
  `kanji`/`kana`/`romaji`/`es`, from class where possible).
- `kanji`: one item per kanji explicitly presented in class — `char` (the single
  character), `readings` (`on`/`kun` arrays as given), `es` meaning, `seenIn` (IDs of the
  vocab items where it appears).
- `notes`: standalone Spanish observations from the teacher that are neither vocab nor a
  pattern (culture, usage warnings, mnemonics).

## 6. Deterministic IDs and tags (never random, never positional for vocab)

Every item `id` = `<classId>:<type>:<slug>`, with `type` ∈ `vocab|grammar|kanji|note`:

- **vocab slug**: Hepburn-ASCII of the KANA reading — lowercase, every non-`[a-z0-9]` run
  → `-`, collapsed, trimmed of leading/trailing `-` (のりこむ → `norikomu`).
- **grammar slug**: short ASCII slug of the pattern (Verbo + ます → `masu-form`).
- **kanji slug**: the literal kanji character itself (e.g. `2026-04-14:kanji:食`).
- **note slug**: ordinal by document order (`1`, `2`, …).
- On slug collision within the class, append `-2`, `-3`, … deterministically by document
  order.

Re-running the skill on the same class MUST produce identical IDs — SRS history attaches
to IDs and must survive re-processing.

**Dedupe rule (multi-source classes):** the same item appearing in several recordings or
segments yields ONE item — an identical deterministic slug means it IS the same item;
merge the information, never emit duplicates (validate.mjs rejects duplicate ids).

`tags[]`: EVERY item's tags MUST include the `classId`. Add a few useful Spanish topic
tags ("verbo", "-masu", "tiempo", "gramática", …).

## 7. Human-in-the-loop (safety net)

Present the candidate JSON to the user BEFORE validation/commit and ask them to verify the
readings, translations and items — the user attended the class and is the authority on
what was taught. Apply their corrections, then run, in order: `node skill/validate.mjs
<file>` (must print `VALID <classId>`), then `node skill/generate-audio.mjs <file>`, and
only then `node skill/commit-class.mjs <file>`.

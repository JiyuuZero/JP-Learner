---
phase: 01-jp-learner-v1-complete-pwa-content-skill
plan: 01
subsystem: content-contract
tags: [json-schema, ajv, json-schema-to-typescript, vite, react, typescript]

# Dependency graph
requires: []
provides:
  - "content/schema/content.schema.json v1 — the FROZEN skill↔app contract (draft 2020-12, additionalProperties:false on all 8 objects, schemaVersion const 1). DO NOT MODIFY in later plans."
  - "content/classes/2026-04-14.json — hand-authored sample class (5 vocab incl. okurigana 乗り込む, 1 grammar, 3 kanji, 2 notes); the norikomu example sentence carries authored word-bank tokens[] for EXER-04"
  - "content/index.json — manifest (contentVersion:1, per-class counts + sha256 contentHash)"
  - "app/src/content/content.ts — generated TS types (Vocab, Grammar, Kanji, Note, Token, Sentence + root JPLearnerClassContent); regenerate via `npm run gen:types`, never hand-edit"
  - "app/src/content/validate.mjs — exports validateClass(doc): ajv shape + 3 renderability invariants + ID prefix/dup rules, enforced on vocab items AND token-carrying sentences; CLI prints VALID <classId>"
  - "app/ Vite React-TS scaffold with gen:types / validate:content npm scripts"
affects: [01-02, 01-03, 01-04, 01-05, 01-06, skill, content-store, exercises, display-modes]

# Tech tracking
tech-stack:
  added: [json-schema-to-typescript@15, ajv@8, ajv-formats@3, vite@8 scaffold (react-ts template)]
  patterns:
    - "Schema-first: all content types are generated from the frozen schema (json2ts), never written by hand"
    - "Validation split: JSON Schema handles shape; validate.mjs handles cross-field semantics (concat invariants, ID determinism)"
    - "Ajv draft 2020-12 requires the `ajv/dist/2020.js` build, not the default export"

key-files:
  created:
    - content/schema/content.schema.json
    - content/classes/2026-04-14.json
    - content/index.json
    - app/src/content/content.ts
    - app/src/content/validate.mjs
    - app/package.json
  modified: []

key-decisions:
  - "Root generated interface is JPLearnerClassContent (json2ts derives it from the frozen schema title); downstream plans alias it to ClassContent on import rather than editing the generated file or the frozen schema"
  - "validate.mjs imports Ajv from 'ajv/dist/2020.js' because the frozen schema declares draft 2020-12 (default Ajv export only bundles draft-07 meta-schema)"
  - "Sentence-level tokens[] invariants enforced via the same checkTokens() used for vocab headwords — word-bank chips are guaranteed to reconstruct the exact sentence"

patterns-established:
  - "gen:types: `cd app && npm run gen:types` regenerates content.ts from ../content/schema/content.schema.json"
  - "validate:content: `cd app && npm run validate:content` validates the sample class; validate.mjs also works as `node validate.mjs <any-class.json>`"
  - "Content IDs: ^<classId>:<type>:<slug>$, duplicates rejected within a class"

requirements-completed: [CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06]

# Metrics
duration: 5min
completed: 2026-07-06
---

# Phase 1 Plan 01: Content Contract Freeze Summary

**Frozen content.schema.json v1 (draft 2020-12) with generated TS types, ajv+invariant validator, and a hand-authored sample class proving per-kanji tokens (乗り込む) plus authored word-bank sentence tokens**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-06T22:05:21Z
- **Completed:** 2026-07-06T22:10:26Z
- **Tasks:** 2
- **Files modified:** 24 (19 app scaffold + 3 content + 2 generated/validator)

## Accomplishments

- `content/schema/content.schema.json` frozen verbatim from 01-RESEARCH.md: draft 2020-12, `"schemaVersion": { "const": 1 }`, exactly 8 `"additionalProperties": false` objects (root, token, sentence, vocab, grammar, kanji, nested readings, note).
- Sample class `content/classes/2026-04-14.json` validates clean, including the okurigana compound 乗り込む (乗→の isKanji, り kana, 込→こ isKanji, む kana), the 毎日 jukugo token (`kanji:["毎","日"]`), single-kanji 本, and kana-only ありがとう.
- The norikomu example sentence (電車に乗り込む。) carries authored `tokens[]` (7 chips) whose surfaces/readings concatenate exactly to the sentence kanji/kana — EXER-04 word-bank has chip data before the skill exists.
- `app/src/content/content.ts` generated deterministically via `json2ts` (re-running `gen:types` produces zero diff); exports 7 interfaces: JPLearnerClassContent, Vocab, Token, Sentence, Grammar, Kanji, Note.
- `app/src/content/validate.mjs` exports `validateClass(doc)`: ajv shape validation + invariant 1 ("token surface != kanji"), invariant 2 ("token reading != kana"), invariant 3 ("kanji token missing kanji[]"), ID prefix rule ("bad id"), duplicate rejection ("dup id") — applied to vocab items AND any token-carrying sentence (vocab examples + grammar examples).
- `content/index.json` manifest: contentVersion 1, sha256-prefixed contentHash of the class file, counts {vocab:5, grammar:1, kanji:3, notes:2}.

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold app package + frozen schema, sample class, manifest** - `e8b0aa2` (feat)
2. **Task 2: Generate TS types + validate.mjs invariant enforcement** - `651816c` (feat)

## Files Created/Modified

- `content/schema/content.schema.json` - The FROZEN skill↔app contract (do not modify in later plans)
- `content/classes/2026-04-14.json` - Hand-authored sample class; only authored change vs RESEARCH spec is the permitted norikomu example `tokens[]`
- `content/index.json` - Manifest with counts + contentHash
- `app/src/content/content.ts` - Generated types (regenerate with `npm run gen:types`; never hand-edit)
- `app/src/content/validate.mjs` - `validateClass` export + CLI (`VALID <classId>` / exit 1 with reason)
- `app/package.json` - Vite react-ts scaffold + `gen:types` / `validate:content` scripts + json-schema-to-typescript@15, ajv@8, ajv-formats@3 dev deps

## Decisions Made

- **Root type name is `JPLearnerClassContent`, not `ClassContent`**: json2ts names the root interface from the schema `title` ("JP-Learner class content"). The schema is frozen and the generated file must stay regenerable, so downstream consumers should alias on import: `import type { JPLearnerClassContent as ClassContent } from './content'`. All $defs-derived names (Vocab, Grammar, Kanji, Note, Token, Sentence) match the plan's interface block exactly.
- **Ajv 2020-12 build**: `import Ajv from 'ajv/dist/2020.js'` (see deviation below).
- Vite scaffold's full runtime dependency tree resolves as an npm side effect of installing the 3 schema-tooling dev deps; only the tooling packages were added to package.json beyond the stock scaffold. Runtime deps (idb, ts-fsrs, tailwind, PWA) remain Plan 02's job.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Ajv default export cannot compile a draft 2020-12 schema**
- **Found during:** Task 2 (validate.mjs first run)
- **Issue:** The RESEARCH.md snippet uses `import Ajv from 'ajv'`, but ajv@8's default export only bundles the draft-07 meta-schema; compiling the frozen schema threw `no schema with key or ref "https://json-schema.org/draft/2020-12/schema"`.
- **Fix:** Changed the import to `import Ajv from 'ajv/dist/2020.js'` (ajv's official draft 2020-12 build). No schema change, no behavior change otherwise.
- **Files modified:** app/src/content/validate.mjs
- **Verification:** `npm run validate:content` prints `VALID 2026-04-14`, exit 0; corrupted copies exit 1 with the correct invariant message.
- **Committed in:** 651816c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for the validator to run at all against the frozen draft-2020-12 schema. No scope creep; schema untouched.

## Issues Encountered

None beyond the Ajv build deviation above. Negative checks all behaved as specified (run on scratchpad copies, never committed):
- Corrupted token reading → exit 1, `token reading != kana: 2026-04-14:vocab:norikomu`
- Corrupted sentence token surface → exit 1, `token surface != kanji: 2026-04-14:vocab:norikomu example`
- Duplicated item id → exit 1, `dup id 2026-04-14:vocab:hon`

## Known Stubs

None — no placeholder data; the sample class is real, validated content and all authored tokens satisfy the concat invariants.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The contract is frozen: every downstream plan (02-06) can import `app/src/content/content.ts` types and call `validateClass` from `app/src/content/validate.mjs`.
- `npm run gen:types` and `npm run validate:content` are wired in `app/package.json` for the skill plan to reuse.
- Reminder for downstream plans: the root content type is `JPLearnerClassContent` (alias to `ClassContent` at import sites).

---
*Phase: 01-jp-learner-v1-complete-pwa-content-skill*
*Completed: 2026-07-06*

## Self-Check: PASSED

- All 6 key files exist on disk
- Task commits e8b0aa2 and 651816c present in git log
- All acceptance criteria and plan-level verification re-run PASS

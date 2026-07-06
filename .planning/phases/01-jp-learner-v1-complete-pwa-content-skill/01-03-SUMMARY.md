---
phase: 01-jp-learner-v1-complete-pwa-content-skill
plan: 03
subsystem: content-skill
tags: [whisper-cpp, ffmpeg, ajv, claude-skill, transcription, sha256]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Frozen content/schema/content.schema.json v1, content/classes/2026-04-14.json sample, content/index.json manifest, app/src/content/validate.mjs (mirrored)"
provides:
  - "skill/SKILL.md — the fixed 5-step contract: capture -> transcribe -> structure -> validate -> write+commit (SKILL-05)"
  - "skill/transcribe.sh — ffmpeg 16kHz mono 16-bit WAV + whisper-cli ggml-large-v3 -l auto -oj, fully local, no API key, never --translate (SKILL-01)"
  - "skill/prompts/structure.md — rigid ES/JA disambiguation + per-kanji tokens[] prompt with norikomu worked example, word-level fallback, deterministic ID rules (SKILL-02)"
  - "skill/validate.mjs — exports validateClass(doc): ajv draft-2020-12 vs the frozen schema + 3 renderability invariants + ID prefix/dup rules; CLI prints VALID <classId> (SKILL-03)"
  - "skill/commit-class.mjs — validate-first fail-closed writer: canonical class file, sha256- contentHash, idempotent index upsert (single entry per class), copy to app/public/content/, fixed-message git commit (SKILL-04)"
  - "Root .gitignore: audio-src/, node_modules/, app/public/content/ (generated copies)"
affects: [01-04, 01-05, 01-06, content-store, deploy]

# Tech tracking
tech-stack:
  added: [ajv@8 (skill-local), ajv-formats@3 (skill-local), whisper.cpp large-v3 (documented external toolchain), ffmpeg (documented external toolchain)]
  patterns:
    - "Producer-boundary enforcement: the skill validates against the SAME frozen schema file as the app (mirror of app/src/content/validate.mjs); neither side can drift"
    - "Fail-closed write path: validateClass runs before any filesystem or git mutation; refusal leaves content/ untouched"
    - "Canonical content bytes: JSON.stringify(doc, null, 2) is the single write format, so contentHash is deterministic and re-runs are byte-identical no-ops"
    - "Fixed git message convention for content: content(<classId>): add/update class <label>"

key-files:
  created:
    - skill/SKILL.md
    - skill/transcribe.sh
    - skill/prompts/structure.md
    - skill/validate.mjs
    - skill/commit-class.mjs
    - skill/package.json
    - .gitignore
  modified:
    - content/classes/2026-04-14.json
    - content/index.json

key-decisions:
  - "generatedAt in index.json is refreshed only when the class entry actually changed — re-running the skill on unchanged content is a deterministic no-op (no clock-dependent commit noise)"
  - "app/public/content/ copies are gitignored generated artifacts: commit-class.mjs copies for local serving, CI re-copies at build (Plan 06); avoids untracked noise and parallel-worktree merge conflicts"
  - "skill/ is a self-contained npm package (own package.json with ajv/ajv-formats) so the skill never depends on app/ node_modules"

patterns-established:
  - "Skill CLI entry points: node skill/validate.mjs <class.json> and node skill/commit-class.mjs <class.json>, both run from repo root; sh skill/transcribe.sh <audiofile-under-audio-src>"
  - "Idempotent upsert: index.classes keyed by id, REPLACE never duplicate"

requirements-completed: [SKILL-01, SKILL-02, SKILL-03, SKILL-04, SKILL-05]

# Metrics
duration: 7min
completed: 2026-07-06
---

# Phase 1 Plan 03: Content Skill Summary

**Local whisper.cpp large-v3 transcription pipeline + rigid Claude structuring prompt + fail-closed ajv/invariant gate + idempotent sha256-manifested write/commit, all under one documented 5-step contract that depends only on the frozen schema**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-06T22:15:10Z
- **Completed:** 2026-07-06T22:22:26Z
- **Tasks:** 2
- **Files modified:** 10 (8 created incl. package-lock, 2 content files canonicalized by the sanctioned commit-class verification run)

## The 5-step contract (SKILL.md)

1. **Capture** — audio into gitignored `audio-src/` (never committed, never leaves the Mac).
2. **Transcribe** — `sh skill/transcribe.sh <audiofile>`: ffmpeg `-ar 16000 -ac 1 -c:a pcm_s16le` then `whisper-cli -m models/ggml-large-v3.bin -l auto -oj -of` (per-segment detected_language JSON; `--translate` never passed).
3. **Structure** — apply `skill/prompts/structure.md`: Claude reasoning disambiguates ES/JA, fills kanji/kana/romaji/es/pos/example, builds per-word AND per-kanji `tokens[]`, derives deterministic `<classId>:<type>:<slug>` IDs, tags every item with the classId. Human-in-the-loop verification before validation.
4. **Validate** — `node skill/validate.mjs <candidate.json>`: ajv (draft 2020-12 build) against the frozen schema + the 3 renderability invariants + ID prefix/dup rules; `VALID <classId>` or exit 1.
5. **Write + commit** — `node skill/commit-class.mjs <candidate.json>`: validate-first, canonical write, `sha256-` contentHash, idempotent index upsert, copy to `app/public/content/`, `git commit -m "content(<classId>): add/update class <label>"` guarded by staged-change check.

**One-time setup:** Node >= 20 + `npm install` in `skill/`; `brew install whisper-cpp ffmpeg`; `sh "$(brew --prefix)/share/whisper-cpp/models/download-ggml-model.sh" large-v3`. Never tiny/base/small; large-v3-turbo only if memory-constrained.

**Fallback semantics:** when per-kanji reading segmentation of a word is not certain, the prompt mandates a single word-level token (`isKanji:true`, `kanji[]` = all kanji in the word, whole-word reading) — same schema, coarser Mode B rendering, never wrong readings.

## Accomplishments

- Full producer half of the system shipped: audio -> transcript -> structured JSON -> validated -> committed content, no API key anywhere, all local.
- `skill/validate.mjs` mirrors Plan 01's validator exactly (same invariant messages `token surface != kanji` / `token reading != kana` / `kanji token missing kanji[]`), validating the frozen sample clean (`VALID 2026-04-14`).
- Idempotency proven live: first `commit-class` run canonicalized the sample and committed (`0b6d8ad`); every subsequent run prints `NO CHANGES 2026-04-14 (already up to date)` with exactly one index entry and identical deterministic IDs.
- Fail-closed proven live: a corrupted candidate (broken reading token) is REFUSED with `token reading != kana: 2026-04-14:vocab:norikomu` and `content/` stays untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1: transcribe.sh + structure.md prompt + skill/validate.mjs** - `5571166` (feat)
2. **Task 2: commit-class.mjs + SKILL.md contract** - `6e66cfa` (feat)

Additional commit produced BY the skill during sanctioned verification:
- `0b6d8ad` `content(2026-04-14): add/update class Clase 1 — presentaciones y verbos -masu` — proof that the fixed-message write/commit path works end to end.

## Files Created/Modified

- `skill/SKILL.md` - The fixed, documented 5-step contract (SKILL-05)
- `skill/transcribe.sh` - ffmpeg 16kHz + whisper-cli large-v3 `-l auto -oj` pipeline (SKILL-01), executable, `bash -n` clean
- `skill/prompts/structure.md` - Rigid structuring prompt: ES/JA disambiguation, 乗り込む worked example, fallback, ID rules, human-in-the-loop (SKILL-02)
- `skill/validate.mjs` - `validateClass` export + CLI; ajv + 3 invariants + ID determinism against the frozen schema (SKILL-03)
- `skill/commit-class.mjs` - Validate-first writer: canonical bytes, sha256 contentHash, idempotent upsert, public copy, fixed git message (SKILL-04)
- `skill/package.json` + `skill/package-lock.json` - Self-contained skill package (type module, ajv@8, ajv-formats@3)
- `.gitignore` - `audio-src/`, `node_modules/`, `app/public/content/`, `.DS_Store`
- `content/classes/2026-04-14.json` - Canonicalized to the skill's deterministic pretty-print (data unchanged, still `VALID`)
- `content/index.json` - contentHash recomputed for the canonical bytes (`sha256-0a1cd5db…`), single entry preserved

## Decisions Made

- **generatedAt only bumps on real change**: unconditional `generatedAt = now` made re-runs clock-dependent (commit noise when re-run in a different second). The index is now rewritten only when the class entry (hash/counts/label) actually changed, making re-processing a deterministic byte-level no-op.
- **app/public/content/ gitignored**: the copy exists for local serving; CI performs the same copy at build (Plan 06). Tracking it would duplicate content in git and risk merge conflicts with the parallel app worktree (Plan 02).
- **Canonical pretty-print as the single write format**: the hand-authored sample was reformatted once on first commit-class run; from then on every skill-produced file has stable, hashable bytes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Clock-dependent idempotency in commit-class.mjs**
- **Found during:** Task 2 (verification runs)
- **Issue:** Plan said "set generatedAt to now" unconditionally; two identical re-runs straddling a second boundary would produce a meaningless index-only diff and commit, making "re-processing is idempotent" timing-dependent.
- **Fix:** Upsert compares the new entry against the existing one; index.json (and generatedAt) is only rewritten when the entry actually changed. Class file writes also skip when bytes are identical.
- **Files modified:** skill/commit-class.mjs
- **Verification:** Two consecutive runs >1s apart both print `NO CHANGES 2026-04-14 (already up to date)`; single index entry.
- **Committed in:** 6e66cfa (Task 2 commit)

**2. [Rule 2 - Missing critical] .gitignore hardening beyond the planned audio-src/ entry**
- **Found during:** Task 1 (skill npm install) and Task 2 (public copy step)
- **Issue:** Plan only specified `audio-src/`. `npm install` in `skill/` creates `skill/node_modules` (root had no ignore for it), and commit-class.mjs generates `app/public/content/` copies that would sit untracked forever and could merge-conflict with the parallel Plan 02 worktree.
- **Fix:** Root `.gitignore` also ignores `node_modules/`, `app/public/content/`, and `.DS_Store`.
- **Files modified:** .gitignore
- **Verification:** `git status --short` clean after full verification runs (no untracked generated files).
- **Committed in:** 5571166 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes strengthen the plan's own idempotency/cleanliness goals. No scope creep; frozen schema untouched.

## Threat Model Compliance

- T-03-01 (invalid content committed): validate-first fail-closed path proven — refused candidate leaves `content/` untouched; human verification documented as mandatory in SKILL.md and structure.md.
- T-03-02 (non-deterministic IDs orphaning SRS): ID rule enforced by validate.mjs; upsert-by-classId proven to keep a single entry with identical IDs across re-runs.
- T-03-03 (key leak / cloud upload): whisper.cpp fully local, no key anywhere; `--translate` appears only in comments; `audio-src/` gitignored.

## Issues Encountered

- One acceptance-criterion grep (`grep -q 'human'` / `grep -q 'verifi'`, lowercase) initially failed against SKILL.md's capitalized "Human-in-the-loop" / "verify" wording; fixed by adding an explicit "human verification step" sentence before the Task 2 commit.

## Known Stubs

None — every script is functional and proven against the real frozen sample; no placeholder data or unwired paths.

## User Setup Required

None committed to the repo, but the skill's one-time local toolchain (documented in SKILL.md) must exist before first real use: `brew install whisper-cpp ffmpeg`, download `ggml-large-v3.bin`, `npm install` inside `skill/`.

## Next Phase Readiness

- The producer boundary is enforced: Plans 04/05 (content store, exercises) can trust every `content/classes/*.json` to be schema-valid with renderable tokens.
- Plan 06 (deploy) should replicate the `content/ -> app/public/content/` copy in CI, as anticipated; the copy is already gitignored locally.
- Note for the orchestrator merge: this branch canonicalized `content/classes/2026-04-14.json` (whitespace only) and refreshed `content/index.json` contentHash via commit `0b6d8ad` — both still validate clean.

---
*Phase: 01-jp-learner-v1-complete-pwa-content-skill*
*Completed: 2026-07-06*

## Self-Check: PASSED

- All 7 created key files exist on disk (`FOUND` for each)
- Commits 5571166, 0b6d8ad, 6e66cfa present in git log
- All Task 1 (8/8) and Task 2 (6/6) acceptance criteria re-run PASS
- Plan-level verification re-run PASS: `bash -n` clean, `VALID 2026-04-14`, idempotent single index entry, SKILL.md documents all 5 steps

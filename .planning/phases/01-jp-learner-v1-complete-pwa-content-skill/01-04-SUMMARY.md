---
phase: 01-jp-learner-v1-complete-pwa-content-skill
plan: 04
subsystem: persistence
tags: [idb, indexeddb, ts-fsrs, fsrs, vitest, fake-indexeddb, react-context, backup, srs]

# Dependency graph
requires:
  - phase: 01-01
    provides: "frozen content contract + generated TS types (Vocab/Kanji/Token used by kanji.ts)"
  - phase: 01-02
    provides: "PWA shell (app.tsx), ContentStore (store.ts), Card/Button primitives, Perfil view slot"
provides:
  - "app/src/progress/db.ts — idb stores srs (byDue/byClass indexes) / learnedKanji / meta, APP_VERSION=1 additive+idempotent migrations, requestPersistence() (PROG-01/05)"
  - "app/src/progress/srs.ts — gradeItem: one shared ts-fsrs Card per item, TypeConvert rehydrate + ISO serialize, graduatedToReview D-03 trigger, gradeForAnswer mapping; re-exports buildSession (SRS-01/02)"
  - "app/src/progress/day.ts — localDayKey/startOfLocalDay/startOfLocalWeek (Monday) / bumpStreak, all local-calendar math (SRS-04)"
  - "app/src/progress/backup.ts — exportProgress/importProgress: FROZEN backup v1, fail-closed validation BEFORE clear, transactional restore, downloadBackup (PROG-02/03)"
  - "app/src/progress/kanji.ts — markLearned/unmarkLearned/autoLearnFromGraduation/loadLearnedSet with manual-removal suppression markers (D-03)"
  - "app/src/progress/session.ts — inScope + buildSession scope(hoy/semana/total) x subMode(srs/periodo), reviews-before-new, NEW_CARDS_PER_DAY=10 cap (D-02, SRS-03/05)"
  - "app/src/progress/ProgressContext.tsx — ProgressProvider + useProgress() wired into the app shell"
  - "Perfil.tsx — display-mode A/B/C selector + romaji toggle + Exportar/Importar progreso with destructive confirm"
  - "vitest@3 + fake-indexeddb@6 test infrastructure (npm test), 22 passing tests"
affects: [01-05, 01-06, exercises, display-modes, dashboard]

# Tech tracking
tech-stack:
  added: [vitest@3, fake-indexeddb@6]
  patterns:
    - "SRS cards persist as ISO-string plain objects; ALWAYS rehydrate with TypeConvert.card() before scheduler.next()"
    - "Day/streak/scope logic uses local-calendar components only — getTime()/timestamp deltas banned in day math"
    - "Untrusted input (backup files) validated fail-closed BEFORE any destructive store operation"
    - "Manual learned-kanji removals persist as suppression markers (learnedAt:'') so auto-learn never overrides the user"
    - "vitest.config.ts standalone (node env) — tests never load the PWA/Tailwind Vite plugins"

key-files:
  created:
    - app/src/progress/db.ts
    - app/src/progress/day.ts
    - app/src/progress/srs.ts
    - app/src/progress/backup.ts
    - app/src/progress/kanji.ts
    - app/src/progress/session.ts
    - app/src/progress/ProgressContext.tsx
    - app/src/progress/day.test.ts
    - app/src/progress/srs.test.ts
    - app/src/progress/backup.test.ts
    - app/vitest.config.ts
  modified:
    - app/src/app.tsx
    - app/src/views/Perfil.tsx
    - app/package.json

key-decisions:
  - "Manual-removal suppression: unmarkLearned writes {learnedAt:'', source:'manual'} instead of deleting, keeping the frozen LearnedKanji shape while making manual removals permanent against auto-graduation (D-03)"
  - "buildSession takes meta as an optional 6th param for the SRS-05 cap; the newCardsToday counter is incremented in ProgressContext.grade when a never-seen item is first graded"
  - "buildSession lives in session.ts and is re-exported from srs.ts so the must_haves artifact contract (srs.ts exports gradeItem+buildSession) holds with no circular imports"
  - "Import restore runs clear+put inside ONE readwrite transaction over the 3 stores — a failed restore can never leave a half-cleared DB"

patterns-established:
  - "npm test (vitest run) is the progress-logic gate; fake-indexeddb with a fresh IDBFactory per test for store-level tests"
  - "Progress records reference content by itemId string only — content text never enters IndexedDB (PROG-04)"

requirements-completed: [PROG-01, PROG-02, PROG-03, PROG-04, PROG-05, SRS-01, SRS-02, SRS-03, SRS-04, SRS-05]

# Metrics
duration: 12min
completed: 2026-07-07
---

# Phase 1 Plan 04: Progress & SRS Persistence Summary

**Durable, portable progress subsystem: idb stores with versioned migrations + persist(), one shared ts-fsrs Card per item with D-03 graduation trigger, verified byte-identical export→clear→import round-trip, local-calendar streak/day math, and the D-02 scope×sub-mode session builder with the 10/day new-card cap — all TDD'd (22 tests)**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-07T01:06:36Z
- **Completed:** 2026-07-07T01:18:31Z
- **Tasks:** 2 (both TDD: RED→GREEN)
- **Files modified:** 15 (11 created, 4 modified incl. lockfile)

## Accomplishments

- **Core-Value guardrail shipped complete:** export → clear → import proven byte-identical by test (all 3 stores), bad/missing `backupVersion` and malformed store arrays rejected fail-closed WITHOUT clearing existing data, rehydrated cards accepted by `scheduler.next()` (TypeConvert round-trip).
- `db.ts`: `jp-learner` IndexedDB v1 — `srs` (keyPath itemId, byDue/byClass indexes), `learnedKanji` (keyPath char), `meta` (singleton); additive+idempotent `upgrade()` keyed on oldVersion with blocked/blocking handlers; `requestPersistence()` surfaces the persist() boolean (PROG-05).
- `srs.ts`: `gradeItem` rehydrates via `TypeConvert.card()` / `createEmptyCard`, schedules with FSRS-6 defaults, reports `graduatedToReview` exactly once at the New/Learning→Review transition (proven by test — the Mode B auto-learn trigger), serializes Dates→ISO.
- `day.ts`: pure local-calendar day keys, Monday-based weeks, `bumpStreak` (same-day noop / next-day++ / gap reset) — tested across local midnight, month boundary, and TZ-independence; zero `getTime()` deltas.
- `kanji.ts`: auto-learn on graduation adds every kanji char with `source:'auto'`; manual unmark writes a suppression marker so the char stays removed even if later auto-graduated (D-03 both directions).
- `session.ts`: `inScope` (hoy/semana/total on local calendar) × `subMode` ('periodo' = whole block, 'srs' = FSRS-due with new-counts-as-due), reviews before new, `NEW_CARDS_PER_DAY=10` intake cap fed by `meta.newCardsToday`/`newCardsDay` with day-change reset (SRS-05); D-01 hybrid documented (rotation, NOT maturity — v2 ADAPT-01).
- `ProgressContext.tsx` wired into the shell: `grade` persists the record, bumps streak, +1 non-punitive point on correct, counts new-card intake, auto-learns on graduation; `exportBackup`/`importBackup`/`markLearned`/`unmarkLearned`/`setDisplayMode`/`setRomajiVisible`; persistence requested on first interaction with result surfaced.
- Perfil view: display-mode A/B/C selector + romaji toggle (writes `meta.displayMode`/`romajiVisible` for Plan 05), Exportar/Importar progreso with the exact UI-SPEC destructive-confirm copy ("Esto reemplazará todo tu progreso actual…" · Cancelar/Reemplazar in `#DC2626`), persistence status line.

## API surface for downstream plans

**`useProgress()` (ProgressContext):**
`{ ready, meta, learnedSet: Set<string>, srsByItem: Map<string, SrsRecord>, persisted: boolean|null, grade(itemId, itemType, classId, grade, item?), exportBackup(), importBackup(parsed), markLearned(char), unmarkLearned(char), setDisplayMode('A'|'B'|'C'), setRomajiVisible(boolean) }`

**Store shapes (db.ts):** `SrsRecord { itemId, itemType, card{ISO dates, state 0-3}, classId }` · `LearnedKanji { char, learnedAt, source }` (learnedAt `''` = suppression marker, excluded from `loadLearnedSet`) · `ProgressMeta { key:'singleton', streakCount, lastActiveDay, points, displayMode, romajiVisible, newCardsToday, newCardsDay, appVersion }`

**`buildSession(store, srsByItem, scope, subMode, now?, meta?)`** → `SessionItem[]` (`{ item: Vocab|Grammar|Kanji, classId, classDate }`), exported from both `session.ts` and `srs.ts`.

**Plan 05 consumes:** `meta.displayMode`, `meta.romajiVisible`, `learnedSet`, `grade`, `buildSession`, `gradeForAnswer`.
**Plan 06 consumes:** `meta.streakCount`, `meta.points`, `srsByItem` (progress % = records with `card.state === 2` / reviewable items — formula per RESEARCH GAM-02).

## Task Commits

Each task was committed atomically (TDD: RED → GREEN):

1. **Task 1: db.ts + day.ts + srs.ts with tests**
   - RED `7d2f442` (test): failing day-boundary + FSRS grading tests, vitest/fake-indexeddb infra
   - GREEN `8ff20ce` (feat): db/day/srs implementation, 17 tests green
2. **Task 2: backup round-trip + session + kanji + ProgressContext**
   - RED `77cb185` (test): failing export/import round-trip + rejection tests
   - GREEN `c107114` (feat): backup/kanji/session/ProgressContext + Perfil + shell wiring, 22 tests green

No REFACTOR commits — GREEN implementations needed no cleanup pass.

## Files Created/Modified

- `app/src/progress/db.ts` - idb stores + APP_VERSION migrations + requestPersistence + createDefaultMeta
- `app/src/progress/day.ts` - local-calendar day/week helpers + bumpStreak (SRS-04)
- `app/src/progress/srs.ts` - gradeItem/serialize/gradeForAnswer + buildSession re-export (SRS-01/02)
- `app/src/progress/backup.ts` - export/import with fail-closed validation + transactional restore (PROG-02/03)
- `app/src/progress/kanji.ts` - learned-kanji engine with suppression markers (D-03)
- `app/src/progress/session.ts` - inScope + buildSession + NEW_CARDS_PER_DAY (D-02, SRS-03/05)
- `app/src/progress/ProgressContext.tsx` - provider + useProgress hook
- `app/src/progress/{day,srs,backup}.test.ts` - 22 tests (day-boundary, graduation-once, round-trip, rejection)
- `app/vitest.config.ts` - standalone node-env vitest config
- `app/src/app.tsx` - ProgressProvider wired around the router
- `app/src/views/Perfil.tsx` - settings + backup UI (was placeholder)
- `app/package.json` - test script + vitest/fake-indexeddb dev deps

## Decisions Made

- **Suppression markers instead of a new store/field:** manual unmark writes `{learnedAt:'', source:'manual'}` — stays inside the frozen `LearnedKanji` shape (backup format untouched) while making manual removals permanent against auto-graduation.
- **`buildSession` meta param:** the SRS-05 cap needs `newCardsToday`; passed as an optional trailing param to keep the RESEARCH-verbatim 5-arg signature callable.
- **Transactional import restore:** clear + bulk put run in a single readwrite transaction across the 3 stores, so a mid-restore failure cannot leave progress half-cleared (strengthens T-04-01 beyond the plan's validate-first minimum).
- **Standalone `vitest.config.ts`:** tests deliberately do not extend `vite.config.ts`, keeping the PWA/Tailwind plugins out of the test pipeline.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Acceptance-criteria grep gate tripped by a comment naming the banned API**
- **Found during:** Task 2 (acceptance criteria verification)
- **Issue:** A threat-model comment in `backup.ts` mentioned `dangerouslySetInnerHTML` by name, tripping the plan's grep gate (`grep -rq 'dangerouslySetInnerHTML' src/progress/ ...` must find nothing).
- **Fix:** Reworded the comment to "never rendered as raw HTML" — the gate now proves zero occurrences of the string anywhere in the progress subsystem or Perfil.
- **Files modified:** app/src/progress/backup.ts
- **Verification:** AC8 grep passes; tests/tsc/build re-run green.
- **Committed in:** c107114 (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug — grep-gate hygiene, no behavior change)
**Impact on plan:** None. Plan executed as written otherwise; frozen contracts (content schema, backup format v1, store shapes) untouched.

## Issues Encountered

None. RED phases failed for the expected reason (missing modules) and GREEN passed on first full run in both tasks.

## TDD Gate Compliance

Both tasks completed the RED→GREEN sequence with commits in order: `test` 7d2f442 → `feat` 8ff20ce (Task 1), `test` 77cb185 → `feat` c107114 (Task 2). No REFACTOR needed.

## Known Stubs

None in this plan's files. Plan-02 placeholder stubs still outstanding elsewhere and unchanged in scope: Home dashboard (Plan 06), Glosario display modes (Plan 05), Guardados (Plan 05+). Perfil's TTS toggle/status block (UI-SPEC §4) is Plan 05's job alongside the TTS engine.

## Verification Notes

- `npm test` (22 tests), `npx tsc --noEmit`, and `npm run build` all exit 0.
- The plan's manual check (install-as-PWA, confirm `requestPersistence()` true, reload persists) cannot run headless in a worktree; the persist() call path is wired and surfaced in Perfil, and live-install verification is part of Plan 06's deploy checkpoint.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 05 (exercises + display modes) has everything it needs: `useProgress().grade` + `gradeForAnswer` + `buildSession` for sessions, `meta.displayMode`/`romajiVisible`/`learnedSet` for rendering.
- Plan 06 (dashboard + deploy) reads `meta.streakCount`/`points` and `srsByItem` for progress %.

---
*Phase: 01-jp-learner-v1-complete-pwa-content-skill*
*Completed: 2026-07-07*

## Self-Check: PASSED

- All 12 key files exist on disk ([ -f ] verified)
- Task commits 7d2f442, 8ff20ce, 77cb185, c107114 present in git log
- Plan-level verification re-run: 22/22 tests pass, tsc --noEmit clean, build verified green in Task 2
- All 15 acceptance criteria (7 Task 1 + 8 Task 2) PASS

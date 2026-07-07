---
phase: 01-jp-learner-v1-complete-pwa-content-skill
plan: 05
subsystem: ui
tags: [react, ruby, furigana, fsrs, exercises, word-bank, testing-library, jsdom, favorites]

# Dependency graph
requires:
  - phase: 01-01
    provides: "frozen content contract + Token/Vocab/Sentence types + the norikomu example's authored sentence.tokens[]"
  - phase: 01-02
    provides: "PWA shell (app.tsx routes), ContentStore/useContent, Card/Button/BottomNav primitives, @theme tokens"
  - phase: 01-04
    provides: "ProgressContext (grade/learnedSet/meta.displayMode/romajiVisible), buildSession, gradeForAnswer, kanjiCharsOf, meta store"
provides:
  - "app/src/display/ruby.tsx — renderTokens(tokens, mode, learned, romajiVisible, wordRomaji?) pure A/B/C rendering: Mode B per-run every()-learned substitution with kana rt + <rp>, Mode C surfaces only, Mode A word-level romaji rt (A1); zero in-app NLP"
  - "app/src/display/JapaneseText.tsx — <JapaneseText kanji kana romaji tokens?> renders any word/sentence per the ACTIVE display mode + romaji toggle + learnedSet from ProgressContext; kana fallback in Mode B without tokens"
  - "app/src/exercises/check.ts — isAnswerCorrect (verbatim tolerant chain: n/nn, shi/si, chi/ti, tsu/tu, NFKC, dash, doubled consonants) + isEsAnswerCorrect loose ES matcher"
  - "app/src/exercises/generators.ts — pure flashcard/multipleChoice/typing/wordBank/matching generators + pickDistractors (same-class only) + Direction JA_ES/ES_JA + checkWordBankOrder; wordBank returns null without authored tokens (A2)"
  - "5 exercise components (Flashcard/MultipleChoice/Typing/WordBank/Matching) — each renders JA via JapaneseText and grades the ONE shared FSRS card via ProgressContext.grade"
  - "app/src/views/Session.tsx — hybrid D-01 session frame: buildSession queue, auto type ROTATION + manual type pick, scope/subMode via ?scope=&subMode= route query, numbered indigo progress bar, Comprobar->Seguir 56px pill, Terminar sesión"
  - "app/src/views/Glosario.tsx — Por clase / Por categoría views + global search + item detail with per-kanji Aprendido star (markLearned/unmarkLearned) + Guardar heart"
  - "Favorites: ProgressMeta.favorites?: string[] (additive), ProgressContext.favoriteSet + toggleFavorite, Guardados view listing favorited items with un-save heart"
  - "app/src/display/SpeakerSlot.tsx — single TTS slot component for Plan 06 to implement (currently renders null = hidden, per UI-SPEC no-voice rule)"
affects: [01-06, dashboard, tts, deploy]

# Tech tracking
tech-stack:
  added: ["@testing-library/react@16", "@testing-library/dom", jsdom]
  patterns:
    - "All JA content renders through JapaneseText/renderTokens — never raw strings for Japanese, never computed readings"
    - "Exercise components own their grading (call grade in their check/finish path); Session owns queue/frame/bottom button via a registerCheck ref contract"
    - "Exercise instances are generated ONCE per queue index inside useMemo — generators shuffle, so render-time generation would reshuffle mid-exercise"
    - "Per-file vitest environment: render tests opt into jsdom via // @vitest-environment docblock; logic tests stay node"

key-files:
  created:
    - app/src/display/ruby.tsx
    - app/src/display/ruby.test.tsx
    - app/src/display/JapaneseText.tsx
    - app/src/display/SpeakerSlot.tsx
    - app/src/exercises/check.ts
    - app/src/exercises/check.test.ts
    - app/src/exercises/generators.ts
    - app/src/exercises/generators.test.ts
    - app/src/exercises/Flashcard.tsx
    - app/src/exercises/MultipleChoice.tsx
    - app/src/exercises/Typing.tsx
    - app/src/exercises/WordBank.tsx
    - app/src/exercises/Matching.tsx
    - app/src/views/Session.tsx
  modified:
    - app/src/views/Glosario.tsx
    - app/src/views/Guardados.tsx
    - app/src/progress/ProgressContext.tsx
    - app/src/progress/db.ts
    - app/src/progress/backup.ts
    - app/src/app.tsx
    - app/src/components/BottomNav.tsx
    - app/src/index.css
    - app/vitest.config.ts
    - app/tsconfig.app.json
    - app/package.json

key-decisions:
  - "renderTokens gained an optional 5th param wordRomaji for Mode A word-level rt (A1) — the 4-arg RESEARCH signature stays callable; Modes B/C ignore it"
  - "Executed Task 3 (favorites) before Task 2 (exercises/Glosario) so every task commit compiles: the Glosario/Flashcard hearts require toggleFavorite"
  - "Exercise components call grade() themselves (per plan contract) via a registerCheck ref handed to the Session frame's single Comprobar button"
  - "Matching consumes a consecutive run of 2-5 vocab items from the queue and advances by the run length; graceful kind fallbacks (no tokens -> multipleChoice, <3 distractors -> typing, non-vocab -> flashcard)"

patterns-established:
  - "Direction rotation: index % 2 alternates JA_ES/ES_JA; exercise kind rotation: index % 5 over the 5 types (D-01 auto mode; maturity-adaptive is v2 ADAPT-01)"
  - "Session launch contract for Plan 06's dashboard: navigate to #/session?scope=hoy|semana|total&subMode=srs|periodo (defaults total/srs); the picker also exposes both controls standalone"

requirements-completed: [DISP-01, DISP-02, DISP-03, DISP-04, EXER-01, EXER-02, EXER-03, EXER-04, EXER-05, EXER-06, UI-02]

# Metrics
duration: 24min
completed: 2026-07-07
---

# Phase 1 Plan 05: Display Modes, Exercises & Session Summary

**Native-`<ruby>` A/B/C rendering (Mode B per-kanji-run gradual substitution) + all 5 bidirectional exercise types grading the one shared FSRS card inside the hybrid D-01 session frame, with the word-bank running on authored norikomu tokens and the Guardar-heart -> Guardados favorites path — 36 new tests (58 total)**

## Performance

- **Duration:** 24 min
- **Started:** 2026-07-07T01:22:54Z
- **Completed:** 2026-07-07T01:47:00Z
- **Tasks:** 3 (Task 1 TDD RED→GREEN; executed in order 1 → 3 → 2, see Deviations)
- **Files modified:** 26 (14 created, 12 modified incl. lockfile)

## Accomplishments

- **Display modes (DISP-01..04):** `renderTokens` implements A/B/C as pure transforms over schema tokens — Mode B substitutes a kanji run only when EVERY char in its `kanji[]` is learned (毎日 stays まいにち until both 毎 and 日 are learned; 乗/込 ruby independently while り/む stay literal — both proven by jsdom render tests). Mode A applies word-level romaji rt (A1) with `<rp>` fallback. Zero JA NLP anywhere (grep-gated).
- **JapaneseText** is the single JA rendering component: consumes `meta.displayMode`/`romajiVisible`/`learnedSet` from ProgressContext; kana fallback in Mode B when tokens are absent (never a wrong reading). `.jp-text` CSS: CJK stack, line-height 1.5, rt 58%/muted/4px gap.
- **Tolerant checker (EXER-03):** verbatim normalization chain — n/nn, shi/si, chi/ti, tsu/tu, fu/hu, ji/zi, sya/tya foldings, NFKC, punctuation/space strip, long-vowel dash, doubled-consonant collapse — plus `isEsAnswerCorrect` loose ES matching for the JA_ES direction. 15 checker tests.
- **Generators (EXER-01..06):** 5 pure generators + `pickDistractors` (same-class pool only, never the target) + `Direction`. The word-bank builds chips exclusively from authored `sentence.tokens[]` and returns `null` otherwise (A2) — the norikomu test reconstructs 電車に乗り込む。 from the pre-skill Plan-01 sample, proving EXER-04 works before the skill has authored any class.
- **5 exercise components** per UI-SPEC: Flashcard (lavender reveal card, heart, 4 grade pills → Again/Hard/Good/Easy), MultipleChoice (4 same-class options, indigo/coral feedback), Typing (dashed input, "¡Bien!" / "Casi. La respuesta es: {answer}"), WordBank (dashed slot + alternating pastel chips, indigo when placed, ref_3), Matching (ES/JA columns, coarse Good/Again per pair). Every one calls `ProgressContext.grade` on the ONE shared card; all bidirectional with a header JA→ES / ES→JA indicator.
- **Session frame (D-01):** back arrow + centered title + gold points pill, numbered indigo progress bar, `buildSession` queue (reviews-before-new + SRS-05 cap inherited from Plan 04), automatic per-item type rotation + manual single-type pick over the same queue, fixed 56px Comprobar→Seguir pill replacing BottomNav, "¡Todo al día!" empty state, "Terminar sesión" finish.
- **Glosario (D-04):** Por clase (date → vocab/gramática/notas) and Por categoría views + global search with the exact "Sin resultados" copy; rows render per active mode with the Guardar heart; item detail shows kanji·kana·romaji·es·example per mode plus the per-kanji "Aprendido" golden star (auto-graduated kanji arrive pre-filled via learnedSet; manual unmark persists as a Plan-04 suppression marker).
- **Favorites (UI-02):** additive `ProgressMeta.favorites?: string[]` (ids only, PROG-04; no APP_VERSION bump), `favoriteSet`/`toggleFavorite` on ProgressContext, backup validation extended fail-closed for the new optional field, and Guardados now lists favorited vocab/grammar with a filled un-save heart and the "Sin nada guardado" empty state — the heart finally has a destination.

## API surface for Plan 06

- **Session launch:** `#/session?scope=hoy|semana|total&subMode=srs|periodo` (defaults `total`/`srs`). The dashboard's "Continuar" card and scope/sub-mode block just navigate there; Session also exposes both controls standalone in its picker.
- **TTS:** implement `app/src/display/SpeakerSlot.tsx` ({ text: string }, currently returns null). Every speaking surface (flashcard front/back/example, Glosario item detail word + example) already mounts it with the kana text. Perfil's TTS status line (TTS-02) also lands in Plan 06.
- **Progress reads for the dashboard:** unchanged from Plan 04 (`meta.streakCount`, `meta.points`, `srsByItem`).

## Task Commits

1. **Task 1: ruby A/B/C + checker + generators (TDD)**
   - RED `a0853ff` (test): 36 failing tests + @testing-library/react@16/jsdom infra, vitest include .test.{ts,tsx}
   - GREEN `82bbb8f` (feat): ruby.tsx, JapaneseText.tsx, check.ts, generators.ts, .jp-text CSS — 58 tests green
   - fix `778da54`: DOM.Iterable in tsconfig lib (see Deviations)
2. **Task 3: favorites + Guardados** — `cb1aefe` (feat) *(executed second — see Deviations)*
3. **Task 2: 5 exercise components + Session + Glosario** — `73a4231` (feat)

No REFACTOR commit — GREEN needed no cleanup pass.

## Files Created/Modified

- `app/src/display/ruby.tsx` — renderTokens A/B/C (DISP-01/02/03)
- `app/src/display/JapaneseText.tsx` — mode-aware JA renderer used everywhere
- `app/src/display/SpeakerSlot.tsx` — hidden TTS slot for Plan 06
- `app/src/exercises/check.ts` — isAnswerCorrect + isEsAnswerCorrect (EXER-03)
- `app/src/exercises/generators.ts` — 5 generators + pickDistractors + Direction (EXER-01..06)
- `app/src/exercises/{Flashcard,MultipleChoice,Typing,WordBank,Matching}.tsx` — exercise bodies feeding grade()
- `app/src/views/Session.tsx` — hybrid D-01 session frame
- `app/src/views/Glosario.tsx` — D-04 views + search + item detail with learned/favorite toggles
- `app/src/views/Guardados.tsx` — favorites destination (UI-02)
- `app/src/progress/{ProgressContext.tsx,db.ts,backup.ts}` — additive favorites API + fail-closed validation
- `app/src/app.tsx` + `app/src/components/BottomNav.tsx` — /session route; nav hides during sessions
- `app/src/{display/ruby.test.tsx,exercises/check.test.ts,exercises/generators.test.ts}` — 36 new tests
- `app/{vitest.config.ts,tsconfig.app.json,package.json,src/index.css}` — test env, lib, deps, jp-text styles

## Decisions Made

- **wordRomaji as optional 5th renderTokens param:** cleanest way to honor both the RESEARCH-verbatim 4-arg signature and the plan's A1 word-level-romaji mandate for Mode A.
- **registerCheck ref contract:** Session owns the single bottom Comprobar/Seguir pill; MC/Typing/WordBank register a check() that computes correctness, shows feedback, and grades — keeping "each exercise calls grade" true while the frame stays the only button owner. Flashcard/Matching self-advance (grade pills / pair completion), so the bar hides for them.
- **Exercise built once per index in useMemo:** generators shuffle; building them in JSX would reshuffle options on every re-render (caught during implementation).
- **Matching batches a consecutive vocab run (2-5)** and grades each pair Good/Again by first-try success, advancing the queue by the run length.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] tsc -b failed on NodeList spread in the ruby render test**
- **Found during:** Task 3 verification (`npm run build` runs `tsc -b`, stricter than the vitest pipeline)
- **Issue:** `[...container.querySelectorAll(...)]` requires `DOM.Iterable` in `lib`; the scaffold tsconfig only had `["ES2023", "DOM"]`
- **Fix:** added `DOM.Iterable` to `app/tsconfig.app.json` lib
- **Files modified:** app/tsconfig.app.json
- **Verification:** `tsc -b` + `npm run build` green
- **Committed in:** 778da54 (dedicated fix commit)

**2. [Rule 3 - Blocking] Task execution reordered 1 → 3 → 2**
- **Found during:** Task planning before Task 2
- **Issue:** Task 2's Glosario/Flashcard heart requires `toggleFavorite`, which the plan defines in Task 3 — executing 2 before 3 would leave Task 2's commit uncompilable/failing its own tsc gate
- **Fix:** executed Task 3 (favorites API + Guardados) before Task 2; each commit compiles, tests, and builds on its own
- **Files modified:** none beyond the tasks' own files
- **Verification:** per-task `tsc -b`/`npm test`/`npm run build` all green at each commit

**3. [Rule 2 - Missing critical] Backup validation extended for the new favorites field**
- **Found during:** Task 3
- **Issue:** `isProgressMeta` (fail-closed import gate, T-04-02) didn't constrain the new optional `favorites` field — a malformed backup could smuggle non-string data into meta
- **Fix:** `favorites === undefined || (Array.isArray && every isStr)` added to the validator
- **Files modified:** app/src/progress/backup.ts
- **Verification:** backup round-trip + rejection tests still green (58/58)
- **Committed in:** cb1aefe (Task 3 commit)

Additionally, the plan's `files_modified` list did not include `app/src/app.tsx` (the /session route), `app/src/components/BottomNav.tsx` (hide during session), `app/src/index.css` (.jp-text rules), `app/src/progress/db.ts`/`backup.ts` (favorites field), or `app/src/display/SpeakerSlot.tsx` — all are direct requirements of the plan's own action text and are documented above.

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 missing critical)
**Impact on plan:** None on scope — all fixes were required for the plan's own gates. Frozen contracts (content schema, backup format v1, store shapes) untouched; the favorites field is additive-optional.

## Issues Encountered

None beyond the deviations above. RED failed for the expected reason (missing modules; prior 22 tests unaffected) and GREEN passed on the first full run.

## TDD Gate Compliance

Task 1 completed RED→GREEN in order: `test(01-05)` a0853ff → `feat(01-05)` 82bbb8f. No refactor needed. Tasks 2/3 were standard (non-TDD) tasks per the plan.

## Known Stubs

| Stub | File | Reason / Resolves in |
|------|------|----------------------|
| SpeakerSlot renders null (TTS hidden) | app/src/display/SpeakerSlot.tsx | Plan-mandated: "render the button slot now, hidden if no voice"; Plan 06 wires Web Speech + ja-JP voice detection (TTS-01/02). All speaking surfaces already mount it. |
| Home dashboard placeholder (no Continuar card / scope launcher) | app/src/views/Home.tsx | Unchanged from Plan 02; Plan 06. Session is reachable standalone at #/session meanwhile. |

## Threat Flags

None — no new network endpoints, storage stores, or trust boundaries beyond the plan's threat model. T-05-01 (XSS) mitigated: all content renders as React text/`<ruby>` children, `dangerouslySetInnerHTML` grep-gated to zero across exercises/display/Session/Glosario/Guardados. T-05-02 mitigated: readings only from schema tokens; NLP-lib grep gates pass; 毎日/乗り込む render tests prove correctness.

## Verification Notes

- `npm test` 58/58 (incl. Mode B 毎日 substitution, n/nn checker, same-class distractors, wordBank-from-norikomu reconstructing 電車に乗り込む。), `tsc -b`, and `npm run build` all exit 0.
- The plan's manual checks (switch mode in Perfil → Glosario re-renders; heart → Guardados round-trip; one session of each type) cannot run headless in a worktree; the underlying logic paths are unit-tested (renderTokens modes, generators, checker) and every wiring gate greps green. Live interaction verification belongs to the phase verifier / Plan 06's deploy checkpoint.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 06 (dashboard + TTS + gamification + deploy) has its integration points ready: the `#/session` launch query contract, `SpeakerSlot` as the single TTS implementation target, and the Plan-04 progress reads for streak/points/%.
- Every practice requirement of the Core Value now works end-to-end on the pre-skill sample content.

---
*Phase: 01-jp-learner-v1-complete-pwa-content-skill*
*Completed: 2026-07-07*

## Self-Check: PASSED

- All 14 created key files exist on disk (`[ -f ]` verified)
- Task commits a0853ff, 82bbb8f, 778da54, cb1aefe, 73a4231 present in git log
- Final re-run: 58/58 tests pass, `tsc -b` clean, `npm run build` green
- All acceptance criteria re-verified: 11/11 (Task 1), 17/17 (Task 2), 10/10 (Task 3) PASS

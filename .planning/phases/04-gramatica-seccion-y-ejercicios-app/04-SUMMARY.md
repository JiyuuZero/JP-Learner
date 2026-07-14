---
phase: 04-gramatica-seccion-y-ejercicios-app
status: complete
date: 2026-07-14
---

# Summary — Phase 4: grammar section + rich exercises + interstitials

Consumes the Phase 3 authored data (grammar example `tokens[]` + `blank`).

## Wave 1 — generators + renderers (commit c6965d9)
- `generators.ts`: `grammarReorder` (word-bank from tokens), `grammarCloze`
  (fill-the-blank using the `blank` marker; blanks sharing the answer, e.g. both
  の, all render as gaps), `grammarChoice` ("¿qué expresa?" — es distractors),
  `grammarExerciseFor(preferred)` + `GRAMMAR_ROTATION` (reorder/cloze/choice with
  fallback), `clozeGapText`.
- Renderers `Grammar{Reorder,Cloze,Choice}.tsx` mirror WordBank/MultipleChoice;
  grade into shared FSRS via `grade(id,'grammar',…)` (no kanji auto-learn arg).
- 8 unit tests.

## Wave 2 — session integration + interstitials (commit 094249d)
- `Session.tsx`: grammar items now build grammar exercises (rotated) instead of
  the flashcard shortcut; kanji still flashcard, vocab unchanged. Render switch,
  header labels, direction indicator updated.
- "¿Sabías que?" (`SabiasQue.tsx`): non-gradable, self-advancing card every 4
  steps, surfacing a grammar pattern or a cultural note from the session's
  classes; does not consume a queue item or grade.

## Wave 3 — Gramática section (commit 9a52c2b)
- New `/gramatica` view + BottomNav "Gramática" tab: patterns grouped by class
  (foldable), tappable → detail overlay (explanation + ALL examples with
  furigana + on-demand audio) + "Practicar gramática".
- `Session` honors `?only=grammar` for a grammar-only queue (period scope).

## Verification
- `npx tsc -b` clean; `npm test` 86/86 (8 new grammar tests); `npm run build`
  green (PWA precache built).
- **Recommended before shipping:** a visual/device smoke test — run a session and
  confirm a grammar reorder/cloze/choice renders and grades, a "¿Sabías que?"
  card appears ~every 4 exercises, and the Gramática tab + detail + "practicar"
  work. (Not yet driven in a browser this session.)

## Grammar redesign (Phases 3+4) COMPLETE
Grammar now has its own section, its own exercises, and interstitial review —
no longer shown as a vocab card. Milestone follow-up done.

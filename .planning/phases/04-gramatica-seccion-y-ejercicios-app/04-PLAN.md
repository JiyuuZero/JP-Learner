---
phase: 04-gramatica-seccion-y-ejercicios-app
type: execute
depends_on: ["03"]
requirements: [EXER-01, EXER-02, EXER-03, EXER-04, EXER-05, EXER-06, DISP-01, GAM-01]
waves:
  - "1: grammar exercise generators + renderers + tests"
  - "2: session integration (grammar exercises, no more flashcard-forcing) + ¿Sabías que? interstitial"
  - "3: Gramática section/tab + detail overlay + practicar"
---

# Phase 4 — Gramática: sección y ejercicios en la app

App-side of the grammar redesign. Consumes the Phase 3 data (grammar example
`tokens[]` + `blank`). Design/refs: `skill/LEARNINGS.md` "Design DECIDED with
user 2026-07-13"; architecture verified in Session.tsx / generators.ts.

## Wave 1 — grammar generators + renderers (04-01)
Files: `app/src/exercises/generators.ts` (+ types), new
`app/src/exercises/Grammar{Reorder,Cloze,Choice}.tsx`, `generators.test.ts`.
- `grammarReorder(g, direction)`: word-bank reorder from the first example with
  `tokens[]` (chips = token surfaces, shuffled). null if no tokenized example.
- `grammarCloze(g)`: from the first example with a `blank:true` token — answer =
  the blank surface (all blanks share it in our data, e.g. both の); options =
  answer + distractors from a common-particle pool ∪ other tokens, deduped. null
  if no blank example.
- `grammarChoice(g, pool)`: "¿qué expresa?" — options = g.es + 3 distractor `es`
  from other grammar (same class preferred). Always available.
- Renderers mirror MultipleChoice/WordBank (phase/registerCheck/onReadyChange,
  grade(g.id,'grammar',classId,gradeForAnswer(correct),g)).
- Tests: reorder chips reconstruct the sentence; cloze answer = blank surface;
  choice includes the correct es; null-safety when data is absent.

## Wave 2 — session integration + interstitial (04-02)
File: `app/src/views/Session.tsx`, new `app/src/exercises/SabiasQue.tsx`.
- `resolveKind`: grammar items → a grammar kind (reorder if tokenized, else
  cloze if blank, else choice) instead of the flashcard shortcut; keep grammar in
  mixed sessions. Vocab path unchanged.
- Render switch handles grammarReorder/grammarCloze/grammarChoice.
- "¿Sabías que?" interstitial: every ~4 steps insert a NON-gradable, self-
  advancing card (frameless) showing a grammar pattern OR a note from the
  session's classes; does not consume a queue item or grade.

## Wave 3 — Gramática section (04-03)
Files: new `app/src/views/Gramatica.tsx`, `app/src/app.tsx` (route), 
`app/src/components/BottomNav.tsx` (tab).
- New tab/route `/gramatica`: grammar grouped by class, each pattern tappable →
  detail overlay (pattern + es + ALL examples with furigana/audio) + "practicar"
  launching a grammar-only session.

## Verify (each wave)
`npx tsc -b` clean, `npm test` green; final: build + visual check of a grammar
exercise, an interstitial, and the grammar tab.

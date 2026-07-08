---
name: learn
description: >-
  Capture and compound user feedback about JP-Learner into durable, applied
  learnings. Invoke this AFTER the user comments on a processed class or on the
  app ("esto está mal", "no se entiende", "no elimines X", "debería ser Y",
  bug reports, UX complaints) so the same mistake is not repeated class after
  class. Triggers whenever the user gives corrective or evaluative feedback on
  generated content or on app behaviour.
---

# learn — turn user feedback into applied learnings

The user attends the classes and uses the app; their feedback is authoritative.
This skill converts each feedback comment into a durable rule that actually
changes future behaviour, instead of a note that gets forgotten.

Run these steps every time the user gives feedback.

## 1. Split the feedback into atomic points

One comment usually contains several distinct points. List each one separately
and classify it into exactly one bucket:

- **content-skill** — something wrong with what the structuring step (step 3 of
  `skill/SKILL.md`) produced: readings, translations, kanji choices, invented
  material, unclear explanations, scope. These are fixable by ME next class.
- **app-bug** — the app misbehaves (navigation, wrong data loaded, crashes).
- **app-feature** — a UX/feature request in the app.
- **ambiguous / destructive** — I cannot act safely without clarifying (e.g.
  "borra los datos de prueba" when it is unclear WHICH data, or deleting
  content I did not create). Ask before doing anything irreversible.

## 2. Generalise, don't just log the instance

For each **content-skill** point, write the underlying RULE (not the single
example) as a checklist item and append/update it in `skill/LEARNINGS.md`.
Include the concrete example that triggered it and the "why". A learning that
only restates the incident ("kanji X was wrong") is useless — capture the
policy ("default to kana unless the kanji was taught, because beginners can't
read it").

`skill/LEARNINGS.md` is CONSULTED at the top of `skill/prompts/structure.md`,
so anything recorded there binds the next class automatically.

## 3. Route the non-content points

- **app-bug / app-feature** → append to the "App feedback (open)" section of
  `skill/LEARNINGS.md` AND surface it to the user as work that needs a code
  session (do NOT silently edit app code from inside a class-processing flow;
  offer to open a `/gsd-debug` or `/gsd-quick` task instead).
- **ambiguous / destructive** → ask a focused question (AskUserQuestion) before
  acting; never guess when the action is hard to reverse.

## 4. Mirror durable behavioural rules into agent memory

Write the cross-session behavioural rules as `feedback`-type memories under the
memory dir and add the one-line pointer to `MEMORY.md`, so the rule is in
context at the START of the next session even before `LEARNINGS.md` is read.
Keep repo-specific checklists in `skill/LEARNINGS.md`; keep "how Claude should
work" in memory. Link the two.

## 5. Confirm back

Tell the user, per point: which bucket, what rule was recorded, and what (if
anything) still needs their decision or a separate code session. Do not claim
an app bug is fixed — only that it was recorded — unless code was actually
changed and verified.

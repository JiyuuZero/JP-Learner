---
phase: 03-gramatica-contenido-y-schema
plan: 02
status: complete
date: 2026-07-14
---

# Summary — 03-02 backfill grammar tokens+blank for the 5 committed classes

## What changed
Added word/bunsetsu-level `tokens[]` (with `blank:true` on the taught particle/form) to
the grammar examples of all 5 committed classes, via the skill contract
(validate → commit-class). ONLY grammar examples changed — verified no drift in
label/vocab/kanji/notes, no id changes, no pattern/es/example-text changes.

- 2026-07-13 (3 grammar items) — おきます/おきる forms blanked; both の in の-encadenado.
- 2026-07-03 (4) — です / の / は / か particles blanked.
- 2026-07-06 (1) — たち plural suffix blanked.
- 2026-07-08 (9 of 11 tokenized) — じん / ご / じゃないです / ではありません / これ・それ / なん / ね
  blanked; numbers split (no blank). **Skipped tokens** on `sai-edad` and
  `autopresentacion` examples: their `kanji` uses digit ages (35 / 27) while `kana`
  spells them out (さんじゅうご / にじゅうなな), so word-level chips can't satisfy both
  surface===kanji AND reading===kana cleanly. Tokens are optional; these fall back to
  no-tokens (still valid). Reconsider in Phase 4 if an edad exercise is wanted.
- 2026-07-10 (5) — この・あの / あそこ・どこ / なんの / だれの blanked; basho-wa-desu left
  blankless (reorder-only; the pattern is word ORDER).

## Convention (decided by me, not the user — user is the learner)
- Chips = word/particle level (bunsetsu), not per-kanji.
- `blank` marks the particle/form the pattern teaches (the cloze answer). Particle-fill
  practice targets EACH occurrence of the taught particle → both の in の-encadenado are
  blanked. Contrast/answer examples (adjective-sin-の, question answers) and
  word-order patterns get tokens but no blank (reorder-only).

## Verification
- All 5 classes `VALID` after commit; content/index.json has one entry per class,
  refreshed hashes, no dup ids.
- Diff sanity check: only grammar `tokens`/`blank` added; vocab/kanji/notes/ids/pattern/
  es/example-text byte-identical to before.
- Grammar has no TTS (generate-audio is vocab-only) → no audio regen needed.

## Phase 3 status: COMPLETE
Ready for Phase 4 (app: grammar section + rich exercises + "¿Sabías que?" cards).

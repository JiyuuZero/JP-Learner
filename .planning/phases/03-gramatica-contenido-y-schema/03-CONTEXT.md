# Phase 3 — Gramática: contenido y schema · Context

**Gathered:** 2026-07-14
**Status:** Ready for planning (decisions pre-locked with user 2026-07-13/14)

<domain>
## Phase Boundary

Content/skill-side prerequisite for the grammar redesign (Phase 4). Make grammar
EXAMPLE sentences carry the data the app needs for rich grammar exercises
(reorder-the-sentence + fill-in-the-particle/form cloze), and backfill the grammar
of the already-committed classes — without breaking the frozen content contract for
existing consumers. NO app code in this phase (that is Phase 4).
</domain>

<decisions>
## Implementation Decisions (locked)

### Schema change shape — additive per-token `blank` flag
- Add ONE optional field to the frozen `content/schema/content.schema.json`: a boolean
  `blank` on the `token` def (`$defs.token`). Additive + backward-compatible: existing
  tokens omit it and still validate (but note `token` currently has
  `additionalProperties:false`, so the field MUST be added to the def or existing files
  with the field would fail — the field is NEW so no existing file has it; adding the
  property to the def is the change).
- A grammar example marks its answer/blank token(s) with `"blank": true`.
- Reorder-the-sentence needs only `tokens[]` on the example Sentence — ALREADY allowed
  by the schema (`$defs.sentence.tokens`), so it needs emission, not a schema change.
- Rejected alternatives: `focus: number[]` on the Sentence (indices are brittle across
  edits); a `cloze:{answer,options}` object (heavier; distractors can be app-generated).

### Grammar example tokens = word-level (not per-kanji)
- For grammar examples the useful chunking is WORD/bunsetsu-level chips (what the learner
  reorders), e.g. これ / は / ほん / です. Per-kanji splitting is unnecessary here; the
  renderability invariants still apply (surfaces concat === kanji, readings concat ===
  kana, isKanji→non-empty kanji[]). Kana-only chips are `isKanji:false`,
  surface===reading.

### Backfill scope
- Re-emit the GRAMMAR of the 5 committed classes: 2026-07-03, 2026-07-06, 2026-07-08,
  2026-07-10, 2026-07-13. Add word-level `tokens[]` to each grammar example and mark the
  pedagogically-focused token(s) with `blank:true` (the particle/form the pattern teaches).
- Deterministic IDs unchanged (SRS preserved). Each class re-emission goes through the
  skill contract: `validate.mjs` → MANDATORY human review → `commit-class.mjs`. Audio:
  grammar examples get NO TTS today (generate-audio only does vocab), so no audio regen is
  expected — verify per class.
- Vocab/kanji/notes untouched; only grammar examples gain tokens+blank.

### Claude's discretion
- Exact per-example choice of which token is `blank` (the taught particle/form) — pick the
  one the pattern is about; surface in human review.
</decisions>

<specifics>
## References
- Design + app architecture: `skill/LEARNINGS.md` → "App / tooling feedback (open)" →
  grammar item → "Design DECIDED with user 2026-07-13".
- Contract: `skill/SKILL.md`, `skill/prompts/structure.md`, `skill/validate.mjs`,
  `content/schema/content.schema.json`. App types generated into
  `app/src/content/content.ts` (regenerate after schema change).
</specifics>

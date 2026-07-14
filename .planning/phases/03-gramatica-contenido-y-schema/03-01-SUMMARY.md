---
phase: 03-gramatica-contenido-y-schema
plan: 01
status: complete
date: 2026-07-14
---

# Summary — 03-01 schema + validator + structure.md + types

## What changed
- **content/schema/content.schema.json**: added optional `blank: boolean` to `$defs.token`
  (additive; `additionalProperties:false` respected). `$defs.sentence.tokens` already
  allowed → reorder needs no schema change.
- **skill/prompts/structure.md** (§5 grammar): rules to emit word/bunsetsu-level `tokens[]`
  on grammar examples + mark the taught particle/form token with `blank:true`, with a
  worked example (これはほんです。, は marked blank) and the certainty fallback.
- **app/src/content/content.ts**: regenerated via `npm run gen:types` → now has
  `blank?: boolean`.

## Not changed (already satisfied)
- **skill/validate.mjs & app/src/content/validate.mjs**: already enforce the 3
  renderability invariants on ANY sentence with `tokens[]`, including grammar
  `examples[]` (built that way in Phase 2). Confirmed parity — the two differ only in
  comments + the relative schema path; both read the same frozen schema, so `blank`
  flows to both. No edit needed.

## Verification
- All 5 committed classes still `VALID` (backward-compatible schema change).
- Positive: grammar example with word-level tokens + `blank:true` → VALID.
- Negative: grammar example whose token surfaces don't concat to `kanji` → exit 1
  ("token surface != kanji").
- `npx tsc -b` clean; `npm test` 78/78 pass.

## Next
03-02: backfill the grammar of the 5 committed classes with tokens+blank, via the skill
contract with mandatory human review per class.

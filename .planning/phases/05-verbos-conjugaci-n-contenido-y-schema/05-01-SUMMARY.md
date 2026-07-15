# 05-01 — Summary

**Plan:** 05-01 (wave 1) — Schema aditivo `conjugation` + validadores en espejo + structure.md + tipos TS
**Estado:** COMPLETO

## Qué se hizo

- **Esquema** (`content/schema/content.schema.json`): añadidos `$defs.conjForm` (`{kana, romaji, kanji?}`, required kana+romaji) y `$defs.conjugation` (`group` enum ichidan|godan|irregular, `irregular?`, y las 5 formas `dictionary/masu/masen/mashita/masendeshita` → `$ref conjForm`). Añadida la propiedad OPCIONAL `conjugation` a `$defs.vocab.properties` (NO en `required`). Cambio estrictamente aditivo; `additionalProperties:false` intacto. Precedente imitado: campo `blank` en `token` (Phase 3).
- **Tipos TS** (`app/src/content/content.ts`): regenerados con `npm run gen:types` → interfaz `Conjugation` + `conjugation?` en `Vocab`.
- **Validadores** (`skill/validate.mjs` y espejo `app/src/content/validate.mjs`): añadida `checkConjugation` (byte-idéntica en ambos) + en la rama vocab: exige `conjugation` cuando `pos==='verbo'` y valida el objeto si está presente. Verifica formas no vacías, `group` válido y coherencia `irregular`⇔group.

## Verificación

- `SCHEMA OK`; `grep -c '"conjugation"'` = 2; `masendeshita` presente.
- `content.ts` contiene `Conjugation` y `conjugation`.
- `checkConjugation` byte-idéntica entre los dos validadores (`CONJ_FUNC_IDENTICAL`). El único diff de cuerpo restante es el comentario de cabecera pre-existente de skill.
- Clase sin verbos sigue validando: `VALID 2026-07-03`.
- Efecto intencional: `2026-07-13` y `2026-07-15` quedan INVÁLIDAS (verbos sin conjugation) → las repara 05-02.

## Notas para 05-02

- `romaji` de `benkyousuru` debe usar macrón: `benkyō suru` (coincide con el fichero actual).
- Backfill de 6 verbos con formas EXACTAS del plan; preservar IDs (SRS); re-commit por el gate de la skill.

# 06-01 — Summary

**Plan:** 06-01 (wave 1) — Verbos: tabla en la app
**Estado:** COMPLETO

## Qué se hizo

- **Componente nuevo** `app/src/components/ConjugationTable.tsx`: recibe un objeto `Conjugation` y renderiza las 5 formas ます en filas flex mobile-first dentro de una tarjeta `rounded-2xl bg-lavender/40 p-4` (coherente con la tarjeta `example`). Etiquetas ES exactas: Diccionario · Presente (ます) · Presente negativo (ません) · Pasado (ました) · Pasado negativo (ませんでした). Kana plano (`lang="ja"` + `jp-text`) + romaji; NO usa el renderer de ruby (las ConjForm no traen tokens). Pill de grupo ("Ichidan (grupo 2)" / "Godan (grupo 1)"); para irregulares la pill de grupo es la coral con texto "Irregular". Pronunciación por forma vía `SpeakerButton` sin `audioKey` (fallback Web Speech; se oculta si no hay voz ja-JP).
- **Test** `ConjugationTable.test.tsx` (jsdom, 3 tests): etiquetas + kana/romaji de un ichidan, marca de irregular, y forma sin kanji sin `<ruby>`.
- **Cableado** en `app/src/views/Glosario.tsx`: `VocabDetail` renderiza `{item.conjugation && <ConjugationTable …/>}` tras el bloque `example` → degradación elegante (no-verbo o verbo sin datos = sin tabla). Pill "verbo" en `VocabRow`.

## Verificación

- `cd app && npx tsc -b` exit 0; `npm test` verde (89/89, 3 nuevos).
- Render probado contra los datos REALES commiteados (2026-07-15): los 5 verbos (ねる/たべる ichidan, のむ/はたらく godan, べんきょうする irregular) renderizan sus 5 formas correctamente; guard de degradación verificado.
- Dev server (`npm run dev`, http://localhost:5173/JP-Learner/) sirviendo HTTP 200 para inspección visual.
- Fix sobre la marcha: se eliminó el doble "Irregular" (la pill de grupo ya lo dice) — ahora una sola pill coral.

## Estado de la fase

Phase 6 COMPLETA. La feature de verbos con tabla de conjugación (feedback del usuario 2026-07-15) queda cerrada de punta a punta: dato (Phase 5) + render (Phase 6).

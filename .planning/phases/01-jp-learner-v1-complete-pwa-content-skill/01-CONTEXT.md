# Phase 1: JP-Learner v1 (complete PWA + content skill) - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Entrega completa de JP-Learner v1 en una sola fase: una PWA instalable y offline (Vite 8 / React 19 / TS / Tailwind 4 / idb / ts-fsrs / vite-plugin-pwa) que consume contenido de clase con esquema JSON rígido y lo practica con SRS (FSRS) + recuerdo activo, con progreso local duradero (IndexedDB + export/import + `persist()`), más la skill de Claude Code que transcribe audio de clase (mezcla ES/JA) con whisper.cpp local y produce ese contenido. Los 37 requisitos v1 se implementan aquí, siguiendo el orden interno: esquema → shell+deploy → persistencia+SRS → display+ejercicios → TTS+gamificación+skill+hardening.

Esta discusión clarifica **cómo** implementar lo ya scopeado; no añade capacidades nuevas.
</domain>

<decisions>
## Implementation Decisions

### Composición de la sesión de práctica
- **D-01:** Sesión **híbrida**: por defecto arranca en modo automático (la app sirve la cola de ítems que tocan, variando el tipo de ejercicio), y además el usuario puede elegir un tipo de ejercicio concreto cuando quiera. (aclara EXER-01..06, SRS-02)

### Ámbito de repaso × cola SRS
- **D-02:** Dos sub-modos explícitos conviviendo: (a) **Repaso SRS** = lo que toca por calendario FSRS; (b) **Repasar periodo** = todo el bloque de Hoy / Esta semana / Total aunque no toque por SRS (repaso intensivo). El selector de ámbito (Hoy/Semana/Total) aplica a ambos. (aclara SRS-01..03)

### Marcado de kanji "aprendido" (motor del Modo B)
- **D-03:** **Automático + manual**. Un kanji/palabra se auto-marca como aprendido cuando su tarjeta FSRS se gradúa a estado `Review` (por defecto tras ~2-3 aciertos consecutivos Good/Easy — constante configurable `LEARNED_THRESHOLD`), y el usuario puede además marcar/desmarcar manualmente. Este set de kanji aprendidos alimenta la sustitución paulatina del Modo B. (aclara DISP-03/04)

### Navegación del glosario / biblioteca
- **D-04:** **Dos vistas conmutables** en la biblioteca: por **clase** (lista por fecha → vocab/gramática/notas de esa clase) y por **categoría** (vocabulario / gramática), con buscador global. (aclara UI-02, CONT-06)

### Idioma de la interfaz
- **D-05:** UI en **español** (el usuario es hispanohablante); el contenido japonés se muestra según el modo de visualización activo (A/B/C).

### Claude's Discretion
- Valor exacto de `LEARNED_THRESHOLD`, tolerancia de respuesta en typing (variantes romaji/kana, n/nn), número de ítems por sesión automática, y micro-interacciones/animaciones: a criterio del planner/ejecutor con defaults sensatos.
- Toda decisión técnica de arquitectura, patrones y rendimiento: del planner (ya guiado por research/SUMMARY.md).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Proyecto y alcance
- `.planning/PROJECT.md` — contexto, Core Value, constraints, decisiones clave
- `.planning/REQUIREMENTS.md` — los 37 requisitos v1 (+ v2, out-of-scope, descope lever)
- `.planning/ROADMAP.md` §"Phase 1" — objetivo, 9 criterios de éxito, orden interno de 5 pasos, anti-features

### Investigación (crítica — decisiones técnicas ya tomadas)
- `.planning/research/SUMMARY.md` — síntesis + orden de construcción + guardarraíles
- `.planning/research/STACK.md` — versiones verificadas, toolchain whisper.cpp, qué NO usar
- `.planning/research/ARCHITECTURE.md` — esquema de contenido propuesto, split contenido/progreso, boundaries
- `.planning/research/FEATURES.md` — FSRS vs SM-2, mecánica de ejercicios, lógica Modo B
- `.planning/research/PITFALLS.md` — 10 pitfalls con mitigación (iOS eviction, code-switching, furigana, día SRS, GitHub Pages)

### Diseño (referencias visuales)
- `references/reference_0.png` — home "Classroom": nav inferior, rejilla de categorías, saludo+avatar
- `references/reference_1.png` — onboarding: tipografía bold, índigo+amarillo, ilustración
- `references/reference_2.png` — dashboard: tarjeta "continuar" con %, "Today's Challenge", puntos/gemas
- `references/reference_3.png` — pantalla de ejercicio: progreso numerado, tarjeta grande, banco de palabras, botón grande

### Contrato (se crea en el paso 1 de la fase)
- `content.schema.json` (a crear) — contrato rígido skill↔app; se congela antes de cualquier consumidor. Genera los tipos TS de la app.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Ninguno — proyecto greenfield. Solo existe `.planning/` y `references/`. No hay código todavía.

### Established Patterns
- Stack objetivo (de STACK.md): Vite 8 + React 19 + TS 5.9 + Tailwind 4 (**CSS-first `@theme`, NO `tailwind.config.js` v3**) + `idb` + `ts-fsrs` + `vite-plugin-pwa`. Furigana con `<ruby>` nativo. TTS con Web Speech API. Sin backend, sin API keys en la app.
- Monorepo: app (PWA) + skill (whisper.cpp + estructurado Claude + validación ajv) en un solo repo; la skill escribe los JSON que la app lee.

### Integration Points
- El único acoplamiento skill↔app es `content.schema.json` + los ficheros JSON de contenido en el repo. El progreso vive aparte en IndexedDB y referencia el contenido solo por ID.

</code_context>

<specifics>
## Specific Ideas

- **Look & feel**: índigo/morado como color base + amarillo/dorado y pastel de acento; mobile-first; tarjetas muy redondeadas, botones pill, barra de navegación inferior; pantallas de ejercicio con progreso arriba y botón grande abajo. Lo más parecido posible a las 4 referencias (no calco).
- **Ejercicio estrella**: completar la frase con banco de palabras (frase japonesa con huecos + fichas de palabras japonesas), tal como en `reference_3.png`.
- **3 modos de visualización del japonés**: (A) kana+kanji con romaji encima; (B) kana por defecto con sustitución paulatina a kanji-con-furigana-kana según kanji aprendidos; (C) solo kanji.
- **Ámbitos de repaso**: Hoy / Esta semana / Total, sobre fechas de clase.

</specifics>

<deferred>
## Deferred Ideas

- Selección automática del tipo de ejercicio según madurez del ítem (v2 — ADAPT-01)
- Panel de puntos débiles por clase (v2 — ADAPT-02)
- Entrenamiento de parámetros FSRS (v2 — ADAPT-03; requiere 1.000+ repasos)
- Sincronización automática entre dispositivos (v2 — SYNC-01)
- Recordatorios / notificaciones push (v2 — SYNC-02)
- Re-transcripción por segmentos con VAD para code-switching intra-frase difícil (v2 — TRANS-01)

</deferred>

---

*Phase: 1-JP-Learner v1 (complete PWA + content skill)*
*Context gathered: 2026-07-06*

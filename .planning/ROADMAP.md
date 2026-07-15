# Roadmap: JP-Learner

## Overview

JP-Learner ships as a **single comprehensive implementation phase** (hard constraint: limited time, autonomous execution in Fable 5, one pass). This one phase turns every class into effective practice material: a Claude skill transcribes class audio locally and writes rigid-schema JSON content, and an offline-first React PWA renders that content as spaced-repetition, active-recall practice. The whole system is two loosely-coupled halves meeting at one versioned JSON contract, and it must be delivered end-to-end in one go. Internally the work follows a strict, dependency-ordered build sequence — schema first, so nothing is ever built against a moving target — but there is only one roadmap phase covering all 37 v1 requirements.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: JP-Learner v1 (complete PWA + content skill)** - Ship the full offline PWA (schema, persistence/SRS, 3 display modes, 5 exercises, TTS, gamification, GitHub Pages) plus the local-Whisper Claude content skill, in one pass.
- [x] **Phase 2: TTS por audio pre-generado en la skill** - La skill genera audio japonés local por ítem; la app lo reproduce offline con Web Speech de fallback; contrato de skill extendido a entrada flexible.
- [x] **Phase 3: Gramática — contenido y schema** - Campo aditivo de "foco" para cloze; la skill emite tokens+foco en ejemplos de gramática; backfill de la gramática de las 5 clases anteriores. (Prerequisito de Phase 4.)
- [x] **Phase 4: Gramática — sección y ejercicios en la app** - Sección propia de gramática, ejercicios ricos (reordenar/cloze/MC/emparejar) y tarjetas "¿Sabías que?" intercaladas.
- [ ] **Phase 5: Verbos — conjugación (contenido y schema)** - Campo aditivo/opcional en `vocab` para el paradigma ます (dic + ます/ません/ました/ませんでした) con grupo e irregulares; la skill lo emite en cada verbo; backfill de los verbos ya publicados. (Prerequisito de Phase 6.)
- [ ] **Phase 6: Verbos — tabla en la app** - Render de la tabla de conjugación en el detalle de vocab de verbos, reutilizando furigana/audio; irregulares distinguidos.

## Phase Details

### Phase 1: JP-Learner v1 (complete PWA + content skill)
**Goal**: Deliver the entire JP-Learner product in one phase — an installable, offline PWA that consumes rigid-schema class content and drives effective SRS + active-recall practice, backed by durable local progress with export/import, plus the Claude skill that produces the content — so the user can convert each class into useful practice with minimal friction.
**Depends on**: Nothing (single-phase milestone)
**Requirements**: PWA-01, PWA-02, PWA-03, PWA-04, CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, PROG-01, PROG-02, PROG-03, PROG-04, PROG-05, SRS-01, SRS-02, SRS-03, SRS-04, SRS-05, DISP-01, DISP-02, DISP-03, DISP-04, EXER-01, EXER-02, EXER-03, EXER-04, EXER-05, EXER-06, TTS-01, TTS-02, GAM-01, GAM-02, GAM-03, UI-01, UI-02, UI-03, SKILL-01, SKILL-02, SKILL-03, SKILL-04, SKILL-05

**Success Criteria** (what must be TRUE):
  1. **Installable & offline**: The user can install the app on mobile and desktop from the browser and, after the first load, use it fully offline; a class committed after that load appears on refresh (network-first for HTML and content JSON, cache-first only for hashed assets), and the app opens from its public GitHub Pages URL with no blank-page/routing failure. *(PWA-01/02/03/04, UI-01)*
  2. **Content is schema-driven and read-only**: All content (vocab with kanji · kana · romaji · ES translation · example sentence, plus grammar patterns and class notes) loads from versioned JSON in the repo, keyed by stable deterministic IDs (`<classId>:<type>:<slug>`) and tagged by class/date, conforming to `content.schema.json` — the single skill↔app contract — with app TS types generated from it; every vocab item carries per-word **and** per-kanji `tokens[]` reading segments so the app renders all display modes with zero in-client Japanese analysis. *(CONT-01/02/03/04/05/06)*
  3. **Progress is durable and portable (Core-Value guardrail)**: The user's SRS state, learned-kanji set, streak and points persist in IndexedDB across sessions; the user can export the entire progress to a JSON backup and re-import it to restore the complete state with no loss (round-trip verified); the store requests persistent storage (`navigator.storage.persist()`) and versions itself with migrations, and progress references content by ID only — so re-processing a class never corrupts history.  *(PROG-01/02/03/04/05)*
  4. **Practice by review scope with correct scheduling**: Each item has one shared FSRS schedule (via `ts-fsrs`) used by every exercise type; the user grades recall and the next review is scheduled; the user can practice by scope — **Today** (the day's new items), **This week**, or **Total** — where "Today/This week" and the streak use local-calendar day boundaries (not timestamp deltas), and daily new-card intake is capped so gaps don't build an unmanageable backlog. *(SRS-01/02/03/04/05)*
  5. **Japanese renders correctly in all 3 display modes incl. progressive Mode B**: The user can switch display mode in settings — (A) kana+kanji with romaji furigana, (B) progressive kanji, (C) kanji only — with furigana rendered via native `<ruby>` from schema data; in Mode B words appear in kana by default and switch to kanji-with-kana-furigana as the user marks kanji as learned (gradual substitution), and marking kanji/words as learned updates the learned-kanji set that drives Mode B. *(DISP-01/02/03/04)*
  6. **All 5 exercise types work, bidirectionally, on shared state**: The user can practice with flashcards + active recall (show → reveal → self-grade), multiple choice, fill-in/typing with tolerant answer checking (romaji/kana variants, n/nn), sentence-completion with a Japanese word bank, and ES↔JA matching — each feeding the one shared FSRS state and practicable in both directions (JA→ES and ES→JA). *(EXER-01/02/03/04/05/06)*
  7. **On-demand Japanese pronunciation that never blocks**: The user can hear Japanese pronunciation on demand via the Web Speech API (button, never auto-play), and if no `ja-JP` voice exists the feature degrades gracefully — it never blocks and never speaks with a non-Japanese voice. *(TTS-01/02)*
  8. **Light, non-punitive gamification in a mobile-first indigo/pastel UI**: The app shows a daily streak, a global progress %, and a non-punitive points counter within the mobile-first indigo/pastel interface (rounded cards, bottom nav: Inicio · Glosario/Biblioteca · Guardados · Perfil/Ajustes; exercise screens with progress on top and a large action button), and the home dashboard greets the user and offers "continue" plus practice-by-scope entry points. *(GAM-01/02/03, UI-01/02/03)*
  9. **The content skill produces valid content under a fixed contract**: A Claude Code skill transcribes class audio locally with `whisper.cpp` (large-v3, no API key), structures the transcription into schema-valid JSON — disambiguating the mixed ES/JA in its LLM reasoning step — validates its output against `content.schema.json` with `ajv` before writing, and writes/commits content with deterministic IDs and class/date tags, always running the same way under one fixed, documented contract; a hand-authored realistic class JSON exists so the app is usable before the skill runs. *(SKILL-01/02/03/04/05)*

**Plans**: 6 plans in 5 waves (mandatory dependency-ordered internal build order)

Plans:
**Wave 1**
- [x] 01-01-PLAN.md — Content Schema + Contract (freeze content.schema.json, gen TS types, sample class, validate.mjs) [Wave 1]

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02-PLAN.md — App Shell + Deploy Skeleton (Vite 8/React 19/TS 5.9/Tailwind 4 CSS-first + PWA + HashRouter + bottom nav + ContentStore) [Wave 2]
- [x] 01-03-PLAN.md — Content Skill (whisper.cpp large-v3 transcribe + structure prompt + ajv validate + deterministic commit + SKILL.md) [Wave 2]

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 01-04-PLAN.md — Persistence + SRS (idb stores + migrations + ts-fsrs wrapper + verified export/import + persist() + day-boundary + scope×sub-mode) [Wave 3]

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 01-05-PLAN.md — Display Modes + Exercise Engine (ruby A/B/C + Mode B substitution + 5 bidirectional exercises + tolerant checker + session frame) [Wave 4]

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 01-06-PLAN.md — TTS + Gamification + Home Dashboard + Deploy Hardening (Web Speech ja-JP + streak/progress%/points + dashboard + GitHub Actions + live-URL verify) [Wave 5]

**Phase notes (internal build order & guardrails — inputs for `/gsd-plan-phase`):**
- **Single phase by hard constraint.** All 37 v1 requirements ship here. The five items below are the *internal build order* (waves/plans), NOT separate roadmap phases. Order is dependency-strict so nothing is built against a moving target.
  1. **Content Schema + Contract (the spine — schema-first, freeze before any consumer).** `content.schema.json` (vocab/grammar/kanji/notes, stable deterministic IDs, class/date tags, per-word **and** per-kanji `tokens[]` reading segments), generated TS types, one hand-authored realistic class JSON. Validate the per-kanji `tokens[]` renderability invariant + okurigana (e.g. 乗り込む) against a real vocab sample before freezing. Covers CONT-01..06 and the source-of-truth for DISP/EXER/SRS.
  2. **App Shell + Deploy Skeleton.** Vite 8 + React 19 + TS 5.9 + Tailwind 4 (**CSS-first `@theme`, NOT v3 `tailwind.config.js`**) + `vite-plugin-pwa`, HashRouter or 404.html fallback, `base: '/JP-Learner/'`, install manifest, indigo/pastel mobile-first shell + bottom nav, ContentStore boot fetch. Wire GitHub Pages base-path/SW early (they fail silently only against the live URL). Network-first HTML + content JSON from the start. Covers PWA-01/02/03/04 (skeleton), UI-01/02.
  3. **Persistence + SRS (Core-Value guardrail — ships WITH export/import and `persist()`, never after).** IndexedDB via `idb` (srs / learnedKanji / meta stores) with `appVersion` migrations, `ts-fsrs` wrapper (one `Card` per item), verified export→clear→import round-trip, `navigator.storage.persist()`, local-calendar day-boundary logic, capped daily new cards, progress-references-content-by-ID-only invariant. Covers PROG-01..05, SRS-01..05.
  4. **Display Modes + Exercise Engine (pure functions over the frozen schema + progress).** `<ruby>` rendering for Modes A/B/C, Mode B learned-kanji substitution, 5 exercise generators feeding one shared FSRS state, bidirectional JA↔ES, review-scope-filtered due queue, tolerant typing checker. Mode B fallback if per-kanji segments prove unreliable: word-level ruby. Covers DISP-01..04, EXER-01..06.
  5. **TTS + Gamification + Skill Pipeline + Deploy Hardening.** Web Speech `ja-JP` TTS with graceful no-voice fallback (button, never auto-play); streak / progress% / points UI + home dashboard; the `whisper.cpp` (large-v3) + Claude-structuring + `ajv`-validate + git-commit skill under a fixed documented contract (spot-check a real class clip for ES/JA quality; human-in-the-loop verification is the safety net); GitHub Actions deploy with 404.html copy, verified against the live URL. Covers TTS-01/02, GAM-01/02/03, UI-03, SKILL-01..05, PWA-04 (hardening).
- **Descope lever if time-boxed** (least→most critical, cut in this order): gamification (GAM-*) → Mode C (part of DISP-01) → **never** SRS correctness, content ingestion, or export/import. PROG-02/03/05 and SRS correctness are Core-Value guardrails and are not cut.
- **Anti-features (do NOT build):** in-app transcription, in-app furigana/reading computation or morphological analysis, hand-rolled SRS math, STT/pronunciation scoring, deck-builder UI, backend/accounts. Readings are authoritative schema data — never computed in the app (computing them teaches wrong kanji).

**UI hint**: yes

## Progress

**Execution Order:**
Single phase — Phase 1 only.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. JP-Learner v1 (complete PWA + content skill) | 6/6 | Complete | 2026-07-07 |
| 2. TTS por audio pre-generado en la skill | 3/3 | Complete | 2026-07-07 |
| 3. Gramática — contenido y schema | 2/2 | Complete | 2026-07-14 |
| 4. Gramática — sección y ejercicios en la app | 1/1 | Complete | 2026-07-14 |

### Phase 2: TTS por audio pre-generado en la skill

**Goal:** Sustituir la dependencia de voces del dispositivo: la skill genera audio japonés localmente (say -v Kyoko en macOS) por ítem al procesar cada clase y lo committea como ficheros estáticos; la app reproduce ese audio (offline, idéntico en todos los dispositivos) con Web Speech como fallback para contenido sin audio, sin romper el schema congelado (manifiesto sidecar por convención de IDs). Además, el contrato de la skill se extiende a entrada flexible: varios audios por clase (fusión multi-transcript en un único JSON) y texto complementario o standalone como fuente (apuntes del usuario, autoritativos), sin cambios de schema.
**Requirements**: TTS-01, TTS-02, SKILL-02, SKILL-05 (requisitos v1 existentes reforzados — sin IDs nuevos)
**Depends on:** Phase 1
**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md — Skill: generate-audio.mjs (say -v Kyoko → ffmpeg M4A), manifiesto sidecar, commit con pathspec de audio, audio de la clase 2026-04-14, contrato 6 pasos + entrada flexible (multi-audio/texto) [Wave 1]
- [x] 02-02-PLAN.md — App: cadena de fallback audio → Web Speech → oculto (audio.ts + tests, TtsContext con manifiesto en boot, SpeakerButton audioKey, callsites Flashcard/Glosario, Perfil combinado) [Wave 2]
- [x] 02-03-PLAN.md — Build/cache: sync-content copia audio, CacheFirst .m4a antes de NetworkFirst /content/, build verificado + checkpoint humano de reproducción [Wave 3]

### Phase 3: Gramática — contenido y schema

**Goal:** Habilitar ejercicios ricos de gramática haciendo que las frases de EJEMPLO de gramática lleven los datos que la app necesita, SIN romper el contrato de contenido congelado para los consumidores existentes. (a) Añadir UN campo aditivo y opcional al schema para que un ejemplo de gramática marque qué token(s) son la respuesta/hueco (ejercicios "cloze" de rellenar la partícula/forma) — el tipo `Sentence` YA admite `tokens[]` opcionales, así que reordenar-la-frase a nivel palabra NO requiere cambio de schema, solo emisión; (b) actualizar `skill/prompts/structure.md` para que el paso de estructuración emita `tokens[]` a nivel palabra en los ejemplos de gramática más el nuevo marcador de foco; (c) actualizar `skill/validate.mjs` para validar el nuevo campo y (como hoy) los invariantes de renderizabilidad de tokens en los ejemplos de gramática; (d) rehacer la gramática de las 5 clases ya commiteadas (2026-07-03, 2026-07-06, 2026-07-08, 2026-07-10, 2026-07-13) para que sus ejemplos lleven tokens+foco — cada re-emisión pasa por el contrato de la skill (validar → revisión humana obligatoria → commit-class.mjs → regenerar audio si hace falta). Regenerar los tipos TS de la app (derivados del schema).
**Depends on:** Phase 2

**Success Criteria** (what must be TRUE):
  1. El cambio de schema es aditivo/retrocompatible: las clases existentes siguen validando sin cambios.
  2. `structure.md` + `validate.mjs` emiten/exigen `tokens[]` + foco en los ejemplos de gramática.
  3. Las 5 clases anteriores re-emitidas con tokens+foco en su gramática, validadas y commiteadas con IDs deterministas idénticos (SRS preservado).
  4. Tipos de contenido de la app regenerados desde el schema.

**Requirements**: CONT-01, CONT-02, SKILL-02, SKILL-05 (reforzados — sin IDs nuevos)
**Plans:** 2 plans en 2 waves
- [x] 03-01-PLAN.md — Schema (token.blank aditivo) + validate.mjs (invariantes en ejemplos de gramática) + structure.md (emitir tokens+blank) + regenerar tipos TS [Wave 1]
- [x] 03-02-PLAN.md — Backfill de la gramática de las 5 clases (tokens+blank por ejemplo) vía contrato de skill con revisión humana por clase [Wave 2]

### Phase 4: Gramática — sección y ejercicios en la app

**Goal:** Dar a la gramática su propio lugar en la app y dejar de mostrarla como una tarjeta de vocabulario. (a) Nueva sección/pestaña "Gramática" (overlay de detalle: patrón + TODOS los ejemplos con furigana/audio + botón practicar); (b) generadores de ejercicios propios de gramática — reordenar-la-frase (word-bank desde los `tokens[]` del ejemplo) y rellenar-la-partícula/forma (cloze usando el marcador de foco de la Phase 3), más opción múltiple "¿qué expresa?" y emparejar ejemplo↔ES como calentamiento/fallback; quitar el atajo de `Session.tsx resolveKind` que fuerza la gramática a flashcard, y mantener la gramática en sesiones mixtas renderizada como ejercicios de gramática; (c) tarjetas "¿Sabías que?" — nuevo paso de sesión NO puntuable y auto-avanzable, mostrado cada ~4 ejercicios, con patrones de gramática Y las notas culturales (las notas hoy no se muestran nunca en práctica).
**Depends on:** Phase 3

**Success Criteria** (what must be TRUE):
  1. La gramática tiene una sección dedicada con detalle tocable.
  2. La gramática NUNCA se renderiza como flashcard de vocabulario.
  3. Los ejercicios de gramática reordenar + cloze + MC + emparejar funcionan y alimentan el FSRS compartido.
  4. Las tarjetas "¿Sabías que?" aparecen cada ~4 ejercicios mostrando gramática+notas y NO puntúan.

**Requirements**: EXER-01, EXER-02, EXER-03, EXER-04, EXER-05, EXER-06, DISP-01, GAM-01 (reforzados — sin IDs nuevos)
**Plans:** TBD (pendiente de `/gsd-plan-phase`)

**Phase notes (grammar redesign — user-approved decomposition 2026-07-13/14):**
- Decisiones de diseño y refs de arquitectura de la app en `skill/LEARNINGS.md` ("App / tooling feedback (open)" → gramática; "Design DECIDED with user 2026-07-13").
- Phase 3 es prerequisito de Phase 4: los ejercicios ricos (reordenar/cloze) necesitan los `tokens`+foco que emite la Phase 3.

### Phase 5: Verbos — conjugación (contenido y schema)

**Goal:** Que un verbo deje de representarse solo con su forma diccionario y pase a llevar su paradigma ます completo como dato estructurado, listo para que la app lo muestre como tabla. (a) Campo ADITIVO y OPCIONAL en `vocab` (p.ej. `conjugation`) con: forma diccionario + ます (presente afirmativo) / ません (presente negativo) / ました (pasado afirmativo) / ませんでした (pasado negativo), cada forma con lectura en kana + romaji; `group` del verbo (`ichidan`|`godan`|`irregular`) y flag de irregular. Opcional para no romper los no-verbos. (b) Actualizar `content/schema/content.schema.json`, `skill/validate.mjs` y su espejo `app/src/content/validate.mjs` (deben seguir sin divergir). (c) Actualizar `skill/prompts/structure.md` para emitir el paradigma en CADA verbo a partir de ahora, conjugando por grupo y marcando irregulares (nunca inventar formas; si hay duda del grupo, buscar). (d) Backfill de los verbos ya publicados con sus conjugaciones. Prerequisito de Phase 6.
**Depends on:** Phase 4

**Success Criteria** (what must be TRUE):
  1. El esquema admite conjugaciones en `vocab` de forma aditiva y opcional; validate.mjs (y su espejo en la app) las valida sin romper el contenido existente.
  2. `skill/prompts/structure.md` obliga a emitir el paradigma ます (dic + 4 formas) por verbo, con grupo e irregulares marcados.
  3. Todos los verbos ya publicados quedan con sus conjugaciones (backfill): `2026-07-13` おきる; `2026-07-15` ねる・はたらく・べんきょうする・のむ・たべる — validados y re-commiteados por el flujo de la skill.
  4. Las conjugaciones son correctas por grupo (ichidan / godan / irregular する・くる) — verificación humana de lecturas.

**Requirements**: DISP-01 (reforzado — sin IDs nuevos)
**Plans:** 2 plans en 2 waves
- [ ] 05-01-PLAN.md — Schema aditivo `conjugation` (defs conjForm/conjugation, vocab opcional) + validadores en espejo (obligatorio para pos verbo) + structure.md (emitir paradigma masu por grupo) + regenerar tipos TS [Wave 1]
- [ ] 05-02-PLAN.md — Backfill de los 6 verbos publicados (2026-07-13 おきる; 2026-07-15 ねる・たべる・のむ・はたらく・べんきょうする) con revision humana de lecturas, re-commit por el gate de la skill (IDs/SRS preservados) [Wave 2]

**Phase notes (verb tables — user-approved 2026-07-15):**
- Contexto y refs completas en `skill/LEARNINGS.md`: regla de contenido "Verbos: tabla de conjugación completa" + ítem abierto "Verbos con tabla de conjugación (esquema + app + backfill)" con las 4 partes y refs de ficheros. Memoria: [[jp-verb-conjugation-tables]].
- Mismo molde que la feature de gramática: Phase 3 (contenido/schema, aditivo) fue prerequisito de Phase 4 (app). Aquí Phase 5 (contenido/schema) es prerequisito de Phase 6 (app).
- Regla dura del proyecto: NUNCA lecturas/formas inventadas; el humano revisa solo cobertura/lecturas, no decisiones de gramática.

### Phase 6: Verbos — tabla en la app

**Goal:** Mostrar en la app la conjugación de cada verbo como una TABLA legible (no un único infinitivo), consumiendo el campo aditivo que emite la Phase 5. Renderizar la tabla en el detalle/tarjeta de vocab de verbos (`app/src/views/Glosario.tsx`) reutilizando el patrón de furigana y de audio pre-generado ya existente; distinguir visualmente las formas y marcar los verbos irregulares. (Decidir en el plan si además se generan ejercicios por-forma; para este objetivo basta con mostrar la tabla correctamente.)
**Depends on:** Phase 5

**Success Criteria** (what must be TRUE):
  1. El detalle de un verbo muestra su tabla de conjugación (dic + 4 formas ます) con furigana/lectura.
  2. Los verbos irregulares se distinguen de los regulares en la tabla.
  3. Un no-verbo (o un verbo sin datos de conjugación) no rompe: la tarjeta degrada con elegancia.

**Requirements**: DISP-01 (reforzado — sin IDs nuevos)
**Plans:** TBD (pendiente de `/gsd-plan-phase 6`)

**Phase notes:**
- Depende de la Phase 5: la tabla necesita el campo de conjugaciones en el contenido.
- Refs de arquitectura de la app en `skill/LEARNINGS.md` ("App feedback (open)"): tarjeta/detalle de vocab en `app/src/views/Glosario.tsx`; generadores en `app/src/exercises/generators.ts`.

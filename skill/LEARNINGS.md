# Skill learnings — accumulated corrections

**Consult this checklist BEFORE structuring every class (step 3 of `SKILL.md`).**
Maintained by the `learn` skill from the user's feedback. The user attended the
class and is the authority; every item here is a mistake already made once.

## Content quality (binds the structuring step)

- **Kanji vs kana — default to KANA for beginner classes.** Write the vocab
  `kanji` field in kana UNLESS that specific kanji was explicitly taught/shown
  in the class. A hiragana-stage learner cannot read 寿司 / 果物 / 黄色 / 手袋 /
  靴 / 傘 / 緑 …; putting unknown kanji on a card makes it unusable.
  _Trigger (2026-07-08): 03/06 classes shipped kanji the user had not learned._
  _Why: the app shows the written form on cards; unknown kanji = dead card._

- **Never introduce untaught words, names or counters.** Include ONLY material
  actually given in class. Example sentences must reuse ONLY vocabulary from the
  same class plus already-known basics — do not invent new lexical items (names
  like 田中, extra nouns, counters) the learner has not seen.
  _Trigger (2026-07-08): "hay palabras que yo no sé"._
  _Why: the app must practise exactly what the class covered (Core Value)._

- **Grammar explanations must be clear on a flashcard.** The `es` must be
  self-contained, concrete and jargon-free, understandable at a glance with no
  dangling references. Bad: "Forma cortés del presente/futuro. Se une a la raíz
  del verbo." Good: plain what-it-does + a concrete «X → Y» example. If a
  concept cannot be made clear in card form, reconsider whether it belongs as a
  card at all (maybe a note, maybe reformulated).
  _Trigger (2026-07-08): "No se entiende nada… difícil de entender."_

- **No test/seed/demo data in shipped content.** Seed/example classes are not
  real practice material; do not let them stay in `content/` where they mix into
  the user's practice. Confirm with the user before deleting content you did not
  create.
  _Trigger (2026-07-08): "No has eliminado los datos de prueba que añadiste."_

- **Class labels must be SHORT, in exactly two forms.** Duolingo self-study →
  label is exactly `Duolingo` (nothing more). In-person class → `Clase N: <tema>`
  where N is the sequential in-person-class number (by date; Duolingo doesn't
  count — check `content/index.json` for the next N) and `<tema>` is ≤ 4 words.
  Never dump the whole syllabus into the label. Applies going forward AND the
  existing classes were relabelled to match.
  _Trigger (2026-07-14): "acorta mucho más los nombres… Duolingo solo Duolingo;
  para las clases Clase N: tema en máximo 4 palabras."_ See [[jp-class-labels]].

- **The user is the LEARNER — never ask them Japanese-grammar / pedagogy
  decisions; research and decide yourself.** Do NOT ask things like "which token
  is the cloze blank", "how should this be tokenized", "which reading is right".
  When unsure about grammar or how best to teach something, do a web search to
  find the correct/standard approach and decide. The mandatory human review is
  for COVERAGE and what-was-actually-taught-in-class (readings/translations that
  the user heard), NOT for resolving grammar you should know or look up.
  _Trigger (2026-07-14): asked the user which の to mark as the cloze answer and
  to approve a tokenization convention. User: "yo soy el que aprende… si tienes
  dudas de gramática haz una búsqueda en internet."_ See [[jp-user-is-learner]].

- **Process ONLY the new class; use committed content as reference, never
  reprocess the old.** The user hands me only the NEW audio each session;
  `audio-src/` merely CACHES all past audio. Do NOT treat cached transcripts as
  sources to (re)process, and do NOT ask "¿solo el nuevo o todos los
  anteriores?" — the answer is always "solo el nuevo". Structure exactly one new
  class from the newly-provided file(s). Consult `content/index.json` +
  `content/classes/*.json` (the canonical record of what's already been taught)
  ONLY as reference so you don't re-teach vocab already covered — never as input
  to re-emit.
  _Trigger (2026-07-13): I read all 7 cached transcripts, treated 6 old ones as
  candidate sources, and asked whether to merge them. User: "yo solo te he
  pasado el nuevo, solo quiero que proceses el nuevo." Root cause below (clase.py
  feeds all cached transcripts)._

- **Verbos: tabla de conjugación completa, no solo la forma diccionario.** En
  clase cada verbo se practica en TODAS sus formas, así que un ítem `vocab` de
  tipo verbo debe llevar su paradigma ます, no solo el infinitivo: forma
  diccionario + ます (presente afirmativo) / ません (presente negativo) / ました
  (pasado afirmativo) / ませんでした (pasado negativo), conjugado correctamente
  según el grupo del verbo — ichidan (る: たべる→たべます, ねる→ねます,
  おきる→おきます); godan (う: のむ→のみます, はたらく→はたらきます); irregular
  (する→します, くる→きます; べんきょうする→べんきょうします) — y marcando cuáles
  son irregulares. La app los muestra como TABLA, no como un único infinitivo.
  Aplica a las clases nuevas Y retroactivamente a los verbos ya publicados.
  Requiere una extensión ADITIVA del esquema (un campo de conjugaciones en
  `vocab`) + render en la app + backfill — es un trabajo de código; ver el ítem
  abierto abajo. No inventes formas que no sepas con certeza: si dudas del grupo
  de un verbo, búscalo antes de conjugar (nunca lecturas/formas inventadas).
  _Trigger (2026-07-15): "los verbos solo los muestras con el infinitivo, pero
  en clase tratamos todas las formas… quiero que aparezcan con su tabla, con las
  formas regulares e irregulares."_ Ver [[jp-verb-conjugation-tables]].

## Proceso de la skill

- **Cada clase procesada evalúa modos de ejercicio dedicados (paso 7 de
  `SKILL.md`).** Tras commitear una clase, SIEMPRE ejecuta la evaluación
  IDENTIFY → ANALYZE → RESEARCH → BUILD/COMMIT: ¿esta clase, combinada con
  TODAS las anteriores, hace emerger un tema que merece su propio modo de
  ejercicio en la app (como Números / Días de la semana / Horas)? Si sí,
  constrúyelo en `app/src/modes/<id>/`, regístralo en
  `app/src/modes/registry.tsx` y commitéalo como `feat(exercises): …`; si es
  valioso pero no da para construirlo ahora, apúntalo en
  `skill/NEXT-EXERCISES.md`. Los ítems implicados siguen SIEMPRE en las
  tarjetas — el modo dedicado es práctica EXTRA, nunca las sustituye. Los modos
  son práctica libre (sin escrituras SRS) y muestran las lecturas vía
  `JapaneseText` respetando la config de escritura del usuario.
  _Trigger (2026-07-21): petición del usuario — modos dedicados (números 0–99 999,
  días de la semana, horas) + que la skill haga esta evaluación en cada clase._

## App feedback

App/code issues surfaced while reviewing generated classes. Fixed in a dedicated
code session (2026-07-08), NOT from inside class processing.

- [x] **"Continuar" no avanza** — the dark "Continuar" card only opened the
  session picker. Now it links to `/session?...&auto=1` and Session auto-starts
  the automatic hybrid session (Home.tsx / Session.tsx).
- [x] **Total → Repaso SRS "carga sólo los de ejemplo"** — the "de ejemplo"
  items were the 2026-04-14 **seed/demo class**, now deleted. The SRS-vs-periodo
  distinction (SRS = only due today + ≤10 new; periodo = whole block) is now
  spelled out in the launcher and the Home hints. NOTE: how many SRS cards load
  is state-dependent (the user's IndexedDB SRS records) — confirm on device.
- [x] **Glosario: clases plegables** — each class in "Por clase" is now a
  collapsible section with a chevron toggle (Glosario.tsx).

## App / tooling feedback (open — needs a dedicated code session, NOT class flow)

Recorded 2026-07-13. Route these through `/gsd-quick` (bug) or a planned phase
(feature); do NOT edit app/tooling code from inside a class-processing run.

- [ ] **clase.py must scope to the NEWLY-ADDED files, not the whole cache.**
  `clase.py` currently enumerates every transcript in `audio-src/` (which
  accumulates) and hands them all to the structuring step, and its re-ingest
  guard cross-checks all of them. Two symptoms: (1) I keep re-reading old classes
  and asking "¿solo el nuevo o todos?"; (2) the "Ya hay una clase procesada para
  el día X" warning fires on EVERY run because it sees the cached prior classes.
  Fix: track only the files copied/added THIS invocation (the `copiados` list
  from `copiar_a_audio_src`) and (a) pass ONLY those as sources to process,
  (b) fire `avisos_reingesta` ONLY for those newly-added files — never for
  cached ones. Prior context: [[jp-reingest-guard]].
  _Trigger (2026-07-13): user passed 1 new audio; prompt listed 7; warning
  always fires._

- [ ] **Grammar needs its own place in the app — not mixed into vocab.** The
  user dislikes grammar being shown as if it were just another vocab card. Three
  asks: (a) a SEPARATE grammar section (distinct from vocabulary); (b) a new
  presentation — e.g. "¿Sabías que?"-style cards interleaved every X exercises so
  grammar gets reviewed between exercises; (c) AUTO-GENERATED exercises derived
  from each grammar pattern (fill-in-the-particle, reorder-the-sentence,
  choose-the-form…), not just a static example card. Applies to this class AND
  all prior classes' grammar. Needs design + likely a content-schema/exercise
  extension. This is the biggest open item.
  _Trigger (2026-07-13): "la gramática merece un apartado aparte… mezclarla con
  el vocabulario como si fuese una palabra más es extraño."_

  **Design DECIDED with user 2026-07-13 (build to this):**
  1. **Grammar gets its own tab/section** (detail overlay: pattern + ALL examples
     with furigana/audio + "practicar") AND **still appears in mixed sessions**,
     but rendered as GRAMMAR exercises — NEVER again forced to a vocab flashcard
     (remove the `Session.tsx resolveKind` non-vocab→flashcard shortcut for
     grammar).
  2. **Rich exercises from the start**: reorder-the-sentence (word-bank) and
     fill-in-the-particle/form (cloze). Simple MC "¿qué expresa?" + example↔ES
     matching can be the fallback/warm-up.
  3. **"¿Sabías que?" interstitial cards** — new NON-gradable, self-advancing step
     every ~4 exercises, showing grammar patterns AND the cultural `notes` (notes
     are currently never surfaced in practice). Distinct visual style.
  - **Data lever (skill side, MY job):** reorder needs word-level `tokens[]` on
    grammar `examples[]` — the `Sentence` type ALREADY allows optional `tokens`,
    so NO schema change is needed; the skill just has to emit them going forward
    AND backfill prior classes (07-03/06/08/10/13). Cloze (fill-the-blank) needs
    ONE small additive field to mark which token is the answer/blank — the only
    schema change required.
  - App architecture refs (verified 2026-07-13): exercise generators
    `app/src/exercises/generators.ts` (all vocab-only today); grammar forced to
    flashcard at `app/src/views/Session.tsx` `resolveKind`; session assembler
    `app/src/progress/session.ts` (`buildSession`, `NEW_CARDS_PER_DAY`); routing
    `app/src/app.tsx` (HashRouter) + `app/src/components/BottomNav.tsx`; grammar
    shown statically in `app/src/views/Glosario.tsx` (`GrammarRow`, not tappable);
    no interstitial/info-card mechanism exists yet; SRS keyed by item id incl.
    `itemType:'grammar'` (`app/src/progress/srs.ts`).

- [ ] **Verbos con tabla de conjugación (esquema + app + backfill).** Hoy un
  verbo solo se muestra con su forma diccionario; la app debe enseñar la TABLA
  de conjugación (ver la regla de contenido arriba). Tres partes:
  1. **Esquema (cambio ADITIVO, mi job):** añadir a `vocab` un campo opcional
     para las conjugaciones — p.ej. `conjugation` con `{ dictionary, masu,
     masen, mashita, masendeshita, group: 'ichidan'|'godan'|'irregular',
     irregular?: bool }` (readings en kana + romaji por forma; furigana/audio
     reutilizando el patrón actual). Opcional para no romper no-verbos.
     Actualizar `content/schema/content.schema.json` y `skill/validate.mjs`
     (+ el espejo `app/src/content/validate.mjs`).
  2. **Skill (structure.md):** emitir el paradigma para cada verbo a partir de
     ahora, conjugando por grupo y marcando irregulares.
  3. **App:** renderizar la tabla en el detalle de vocab (y decidir si genera
     ejercicios por-forma; de momento basta con mostrarla). Refs: vocab card /
     detalle en `app/src/views/Glosario.tsx` + `app/src/exercises/generators.ts`.
  4. **Backfill:** regenerar los verbos ya publicados con conjugaciones. Verbos
     actuales: `2026-07-13` おきる; `2026-07-15` ねる・はたらく・べんきょうする・
     のむ・たべる. (Confirmar con grep `"pos": "verbo"` en `content/classes/`.)
  Trabajo de código con cambio de esquema → NO editar desde un run de clase;
  planificar fase GSD. _Trigger (2026-07-15): ver regla de contenido arriba._

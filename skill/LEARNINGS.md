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

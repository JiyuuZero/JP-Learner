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

## App feedback (OPEN — needs a code session, NOT the content skill)

These are app/code issues surfaced while reviewing generated classes. They are
recorded here so they are not lost; they must be fixed in a dedicated code
session (`/gsd-debug` / `/gsd-quick`), not from inside class processing.

- [ ] **"Continuar" no avanza** — the Continuar button does not advance the app.
- [ ] **Total → Repaso SRS carga sólo los de ejemplo** — SRS review loads only
  example items; and the difference between "Repaso periodo" and "Repaso SRS" is
  unclear to the user (labelling/UX + likely an SRS query bug).
- [ ] **Glosario: clases plegables** — classes in the Glosario view should be
  foldable/collapsible.

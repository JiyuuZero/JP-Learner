# Exercise-mode backlog (step 7 of SKILL.md)

Standing backlog of exercise-mode candidates. Every class-processing run consults and
updates this file during the step-7 assessment (IDENTIFY → ANALYZE → RESEARCH →
BUILD/COMMIT). When a mode is built, move it to "Built" with its commit; new candidates
get a line with the classes that motivate them. Cards are never affected — modes are
extra practice on top of the flashcards.

## Built (in `app/src/modes/registry.tsx`)

- **numeros** — Números 0–99 999 (百/千/万 + irregulares さんびゃく・ろっぴゃく・はっぴゃく・
  さんぜん・はっせん), reveal per script config, optional contrarreloj. Classes 2026-07-08 + 2026-07-17.
- **dias** — Días de la semana (〜ようび, mnemotecnia planetaria, drill de dominio). Class 2026-07-17.
- **horas** — Horas (〜じ + irregulares よじ・くじ・しちじ, 〜ふん/ぷん + irregulares, はん).
  Classes 2026-07-15 + 2026-07-20.
- **particulas** — Cloze de partículas (は・を・の・と・も・に・か・ね・から〜まで) sobre los
  ejemplos de gramática con `blank` de TODAS las clases. Classes 2026-07-03 … 2026-07-20.

## Candidates (pending)

- **Colores** — tap-the-swatch: muestra una muestra de color y eliges el nombre en
  japonés (あかい・あお・しろい／しろ・きいろ・みどり・はいいろ・むらさき・ちゃいろ・くろ).
  Motiva: 2026-07-03/06 (colores base) + 2026-07-20 (más colores). Mapeo kana→CSS en la
  app, cero contenido nuevo. Barato y muy visual.
- **Saludos situacionales** — escena → respuesta correcta: entrar/salir de casa
  (いってきます／いってらっしゃい／ただいま／おかえり), comer (いただきます／ごちそうさま),
  enfermo (おだいじに, nunca がんばって). Motiva: 2026-07-15 (notas 1-2) + 2026-07-10
  (またね・またらいしゅう). Formato: mini-diálogo con hueco.
- **Conjugación ます** — dado el diccionario (たべる) y una forma pedida (pasado negativo),
  elige/escribe たべませんでした; deriva del campo `conjugation` ya emitido para cada verbo.
  Motiva: 2026-07-13/15/20 (verbos con paradigma). Cuidado con くる si aparece.
- **Hiragana ↔ katakana** — reconocimiento cruzado (ネコ↔ねこ) y trampas シ/ツ・ソ/ン usando
  el vocabulario katakana ya enseñado (カメラ, サッカー, アレルギー…). Motiva: 2026-07-20
  (clase de katakana, notas 1-2). Necesita mapa kana↔kana en la app (determinista, seguro).
- **Demostrativos こ・そ・あ・ど** — これ/それ/あれ + ここ/そこ/あそこ/どこ + この/その/あの con
  posiciones dibujadas (cerca de mí / de ti / lejos). Motiva: 2026-07-08 + 2026-07-10.

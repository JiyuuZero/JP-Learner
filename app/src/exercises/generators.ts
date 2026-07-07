// Pure exercise generators (EXER-01..06) over the frozen content schema.
// All Japanese analysis lives in the schema/skill: word-bank chips come ONLY
// from authored sentence.tokens[] (A2) — the app NEVER splits Japanese text
// itself. Distractors always come from SAME-CLASS vocab (plausible, never
// random strangers). Direction (EXER-06) swaps prompt/answer sides.
import type { Grammar, Kanji, Sentence, Vocab } from '../content/content'

export type Direction = 'JA_ES' | 'ES_JA'
export type ExerciseKind = 'flashcard' | 'multipleChoice' | 'typing' | 'wordBank' | 'matching'
export type ReviewableItem = Vocab | Grammar | Kanji

const promptSideOf = (direction: Direction): 'ja' | 'es' => (direction === 'JA_ES' ? 'ja' : 'es')

export function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Shuffle the same-class pool minus the target, take n.
export function pickDistractors(pool: Vocab[], exclude: string, n: number): Vocab[] {
  return shuffle(pool.filter((v) => v.id !== exclude)).slice(0, n)
}

// ---- EXER-01 Flashcard ------------------------------------------------------
// Front = prompt (per direction), reveal = answer + example + TTS, then the 4
// self-grade buttons (Otra vez/Difícil/Bien/Fácil = Again/Hard/Good/Easy).
export interface FlashcardExercise {
  kind: 'flashcard'
  item: ReviewableItem
  direction: Direction
  promptSide: 'ja' | 'es'
}

export function flashcard(
  item: ReviewableItem,
  _pool: Vocab[],
  direction: Direction,
): FlashcardExercise {
  return { kind: 'flashcard', item, direction, promptSide: promptSideOf(direction) }
}

// ---- EXER-02 Multiple choice ------------------------------------------------
// Prompt + 4 options; correct = the item; 3 distractors sampled from the
// same-class pool. wrong -> Again, correct -> Good.
export interface MultipleChoiceExercise {
  kind: 'multipleChoice'
  item: Vocab
  direction: Direction
  promptSide: 'ja' | 'es'
  options: Vocab[] // exactly 4 when the pool allows, shuffled, includes the item
  correctId: string
}

export function multipleChoice(
  item: Vocab,
  pool: Vocab[],
  direction: Direction,
): MultipleChoiceExercise {
  const options = shuffle([item, ...pickDistractors(pool, item.id, 3)])
  return {
    kind: 'multipleChoice',
    item,
    direction,
    promptSide: promptSideOf(direction),
    options,
    correctId: item.id,
  }
}

// ---- EXER-03 Typing ---------------------------------------------------------
// Prompt + text input; check with isAnswerCorrect (ES_JA: kana/romaji/kanji)
// or isEsAnswerCorrect (JA_ES: loose ES match). wrong -> Again, correct -> Good.
export interface TypingExercise {
  kind: 'typing'
  item: Vocab
  direction: Direction
  promptSide: 'ja' | 'es'
  accepted: string[]
}

export function typing(item: Vocab, _pool: Vocab[], direction: Direction): TypingExercise {
  const accepted =
    direction === 'ES_JA' ? [item.kana, item.romaji, item.kanji] : [item.es]
  return { kind: 'typing', item, direction, promptSide: promptSideOf(direction), accepted }
}

// ---- EXER-04 Word-bank (the signature exercise) -----------------------------
// Chips are split from the AUTHORED sentence.tokens[] (A2). If the chosen
// example lacks tokens the generator returns null — the caller must pick
// another exercise/item; the app never derives chips itself.
export interface WordBankChip {
  id: string
  surface: string
  distractor: boolean
}

export interface WordBankExercise {
  kind: 'wordBank'
  item: Vocab
  direction: Direction
  sentence: Sentence
  correctOrder: string[] // authored token surfaces, in order
  chips: WordBankChip[] // shuffled: correct chips + 1-2 same-class distractors
}

export function wordBank(item: Vocab, pool: Vocab[], direction: Direction): WordBankExercise | null {
  const sentence = item.example
  const tokens = sentence?.tokens
  if (!sentence || !tokens || tokens.length === 0) return null
  const correctOrder = tokens.map((t) => t.surface)
  const distractorChips: WordBankChip[] = pickDistractors(pool, item.id, 2)
    .map((v, i): WordBankChip => ({ id: `d${i}`, surface: v.kanji, distractor: true }))
    .filter((c) => !correctOrder.includes(c.surface))
    .slice(0, 2)
  const chips = shuffle([
    ...correctOrder.map((surface, i): WordBankChip => ({ id: `c${i}`, surface, distractor: false })),
    ...distractorChips,
  ])
  return { kind: 'wordBank', item, direction, sentence, correctOrder, chips }
}

// Validation: placed order must equal the authored token order exactly.
export function checkWordBankOrder(placed: string[], correctOrder: string[]): boolean {
  return placed.length === correctOrder.length && placed.every((s, i) => s === correctOrder[i])
}

// ---- EXER-05 Matching -------------------------------------------------------
// Two columns (ES / JA) of up to 5 cards; tap one then its pair; matched pairs
// clear. Coarse Good/Again per pair.
export interface MatchingPair {
  id: string
  item: Vocab
}

export interface MatchingExercise {
  kind: 'matching'
  direction: Direction
  pairs: MatchingPair[]
  left: MatchingPair[] // ES column order
  right: MatchingPair[] // JA column order
}

export function matching(items: Vocab[], direction: Direction): MatchingExercise {
  const pairs = items.slice(0, 5).map((item): MatchingPair => ({ id: item.id, item }))
  return { kind: 'matching', direction, pairs, left: shuffle(pairs), right: shuffle(pairs) }
}

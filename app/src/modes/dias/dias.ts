// Días de la semana — data + pure drill logic (skill step 7, class 2026-07-17).
// The 7 kana readings match the committed vocab EXACTLY (the mode looks each
// day up in the store by kana to reuse its tokens + pre-generated audio).
// Research (Tofugu / Team Japanese / KanaDojo memory guides): all days share
// the 〜ようび suffix — only the prefix changes — and each prefix is an
// element/planet (月 luna, 火 fuego/Marte, 水 agua/Mercurio, 木 madera/Júpiter,
// 金 oro/Venus, 土 tierra/Saturno, 日 sol), the class note 2026-07-17:note:1
// teaches the same prefix decomposition. Apps (Duolingo/Renshuu) drill them
// with fast multiple-choice + re-queue until mastered — encoded below as a
// remaining-correct-answers counter per day.
import { shuffle } from '../../exercises/generators'

export interface DayMeta {
  kana: string // matches committed vocab kana (2026-07-17)
  es: string
  prefijo: string
  simbolo: string // element/planet mnemonic emoji
  pista: string // the mnemonic in Spanish
}

// Monday-first (Spanish convention; the class notes the traditional Japanese
// calendar starts on Sunday — that stays a flashcard note, not drill order).
export const DAYS: DayMeta[] = [
  { kana: 'げつようび', es: 'lunes', prefijo: 'げつ', simbolo: '🌙', pista: 'luna' },
  { kana: 'かようび', es: 'martes', prefijo: 'か', simbolo: '🔥', pista: 'fuego (Marte)' },
  { kana: 'すいようび', es: 'miércoles', prefijo: 'すい', simbolo: '💧', pista: 'agua (Mercurio)' },
  { kana: 'もくようび', es: 'jueves', prefijo: 'もく', simbolo: '🌳', pista: 'madera (Júpiter)' },
  { kana: 'きんようび', es: 'viernes', prefijo: 'きん', simbolo: '✨', pista: 'oro (Venus)' },
  { kana: 'どようび', es: 'sábado', prefijo: 'ど', simbolo: '⛰️', pista: 'tierra (Saturno)' },
  { kana: 'にちようび', es: 'domingo', prefijo: 'にち', simbolo: '☀️', pista: 'sol' },
]

// Corrects needed per day to consider it mastered in this round.
export const NEED = 2

export const nextDay = (i: number): number => (i + 1) % 7

// Random unmastered day, avoiding an immediate repeat when possible.
export function pickNext(remaining: number[], prev: number): number {
  const pending = remaining.map((r, i) => (r > 0 ? i : -1)).filter((i) => i >= 0)
  const candidates = pending.length > 1 ? pending.filter((i) => i !== prev) : pending
  return candidates[Math.floor(Math.random() * candidates.length)]
}

// 4 options: the answer + 3 other days, shuffled.
export function pickOptions(answer: number): number[] {
  const others = shuffle(DAYS.map((_, i) => i).filter((i) => i !== answer)).slice(0, 3)
  return shuffle([answer, ...others])
}

export type QuestionType = 'esja' | 'jaes' | 'seq'

export interface DayQuestion {
  type: QuestionType
  answer: number // index into DAYS — the day being recalled
  options: number[] // 4 day indices, includes answer
}

// Rotation weights: recognition both ways dominates; sequence recall ("what
// comes after X?") appears too so the weekly ORDER also gets drilled.
export function makeQuestion(remaining: number[], prev: number): DayQuestion {
  const answer = pickNext(remaining, prev)
  const roll = Math.random()
  const type: QuestionType = roll < 0.4 ? 'esja' : roll < 0.8 ? 'jaes' : 'seq'
  return { type, answer, options: pickOptions(answer) }
}

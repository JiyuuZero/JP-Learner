// Horas — pure question builders (skill step 7, classes 2026-07-15 + 2026-07-20).
// Two drills: full clock times (digital ⇄ reading, both directions) and the
// 1-10 minutes counter (the ふん/ぷん irregulars from 2026-07-20:note:3).
// Distractors are engineered the way textbook time exercises trap you:
// same minute with a NEIGHBOURING hour, and the same hour with another minute.
import { shuffle } from '../../exercises/generators'
import { timeReading, type JaTime } from './timeReading'

export interface HourLevel {
  id: string
  label: string
  minutes: number[]
}

export const LEVELS: HourLevel[] = [
  { id: 'punto', label: 'En punto y media', minutes: [0, 30] },
  { id: 'cinco', label: 'Con minutos', minutes: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] },
]

const randomOf = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

export function randomTime(minutes: number[]): JaTime {
  return timeReading(1 + Math.floor(Math.random() * 12), randomOf(minutes))
}

export interface TimeQuestion {
  kind: 'timeToReading' | 'readingToTime'
  answer: JaTime
  options: JaTime[] // 4, includes answer, unique readings
}

export function makeTimeQuestion(minutes: number[], prevLabel?: string): TimeQuestion {
  let answer = randomTime(minutes)
  while (answer.label === prevLabel) answer = randomTime(minutes)

  const options: JaTime[] = [answer]
  const push = (t: JaTime) => {
    if (!options.some((o) => o.kana === t.kana)) options.push(t)
  }
  // plausible traps first: neighbouring hour / same hour other minute
  push(timeReading((answer.h % 12) + 1, answer.m))
  const otherMinutes = minutes.filter((m) => m !== answer.m)
  if (otherMinutes.length > 0) push(timeReading(answer.h, randomOf(otherMinutes)))
  while (options.length < 4) push(randomTime(minutes))

  return {
    kind: Math.random() < 0.5 ? 'timeToReading' : 'readingToTime',
    answer,
    options: shuffle(options),
  }
}

export interface MinuteQuestion {
  kind: 'numToKana' | 'kanaToNum'
  answer: number // 1..10
  options: number[] // 4, includes answer
}

export function makeMinuteQuestion(prev: number): MinuteQuestion {
  let answer = 1 + Math.floor(Math.random() * 10)
  while (answer === prev) answer = 1 + Math.floor(Math.random() * 10)
  const others = shuffle(
    Array.from({ length: 10 }, (_, i) => i + 1).filter((n) => n !== answer),
  ).slice(0, 3)
  return {
    kind: Math.random() < 0.5 ? 'numToKana' : 'kanaToNum',
    answer,
    options: shuffle([answer, ...others]),
  }
}

// Exercise generator tests (EXER-01..06) — pure transforms over the frozen
// content schema. The word-bank test runs against the REAL pre-skill sample
// class (the norikomu example carries authored tokens[] from Plan 01).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  checkWordBankOrder,
  flashcard,
  matching,
  multipleChoice,
  pickDistractors,
  typing,
  wordBank,
} from './generators'
import type { JPLearnerClassContent, Vocab } from '../content/content'

const cls = JSON.parse(
  readFileSync(new URL('../../../content/classes/2026-04-14.json', import.meta.url), 'utf8'),
) as JPLearnerClassContent
const pool: Vocab[] = cls.vocab ?? []
const norikomu = pool.find((v) => v.id === '2026-04-14:vocab:norikomu')!
const tabemasu = pool.find((v) => v.id === '2026-04-14:vocab:tabemasu')!

describe('pickDistractors (same-class pool, never random strangers)', () => {
  it('returns n items from the pool, never including the excluded target', () => {
    const picked = pickDistractors(pool, tabemasu.id, 3)
    expect(picked).toHaveLength(3)
    expect(picked.map((v) => v.id)).not.toContain(tabemasu.id)
    const poolIds = pool.map((v) => v.id)
    for (const v of picked) expect(poolIds).toContain(v.id)
  })

  it('never returns fewer than requested when the pool allows', () => {
    // pool of 5 minus the excluded target leaves exactly 4
    expect(pickDistractors(pool, tabemasu.id, 4)).toHaveLength(4)
  })
})

describe('multipleChoice (EXER-02)', () => {
  it('produces exactly 4 options including the correct one', () => {
    const ex = multipleChoice(tabemasu, pool, 'JA_ES')
    expect(ex.options).toHaveLength(4)
    expect(ex.options.map((o) => o.id)).toContain(tabemasu.id)
    expect(ex.correctId).toBe(tabemasu.id)
    // distractors all come from the same-class pool
    const poolIds = pool.map((v) => v.id)
    for (const o of ex.options) expect(poolIds).toContain(o.id)
  })
})

describe('wordBank (EXER-04 — authored tokens only, never in-app splitting)', () => {
  it('builds chips from the norikomu example whose correct order reconstructs 電車に乗り込む。', () => {
    const ex = wordBank(norikomu, pool, 'JA_ES')
    expect(ex).not.toBeNull()
    expect(ex!.correctOrder.join('')).toBe('電車に乗り込む。')
  })

  it('chip set = correct tokens + 1-2 same-class distractors', () => {
    const ex = wordBank(norikomu, pool, 'JA_ES')!
    const correctChips = ex.chips.filter((c) => !c.distractor)
    expect(correctChips.map((c) => c.surface).sort()).toEqual([...ex.correctOrder].sort())
    const distractors = ex.chips.filter((c) => c.distractor)
    expect(distractors.length).toBeGreaterThanOrEqual(1)
    expect(distractors.length).toBeLessThanOrEqual(2)
  })

  it('validation passes only for the correct order', () => {
    const ex = wordBank(norikomu, pool, 'JA_ES')!
    expect(checkWordBankOrder(ex.correctOrder, ex.correctOrder)).toBe(true)
    expect(checkWordBankOrder([...ex.correctOrder].reverse(), ex.correctOrder)).toBe(false)
    expect(checkWordBankOrder(ex.correctOrder.slice(1), ex.correctOrder)).toBe(false)
  })

  it('returns null (skip; pick another item) when the example has no authored tokens', () => {
    // tabemasu's example carries no tokens[] in the sample class
    expect(tabemasu.example?.tokens).toBeUndefined()
    expect(wordBank(tabemasu, pool, 'JA_ES')).toBeNull()
  })
})

describe('direction (EXER-06) swaps prompt/answer sides', () => {
  it('JA_ES: prompt is the JA side, accepted answer is the ES translation', () => {
    const ex = typing(tabemasu, pool, 'JA_ES')
    expect(ex.promptSide).toBe('ja')
    expect(ex.accepted).toEqual([tabemasu.es])
  })

  it('ES_JA: prompt is the ES side, accepted answers are kana/romaji/kanji', () => {
    const ex = typing(tabemasu, pool, 'ES_JA')
    expect(ex.promptSide).toBe('es')
    expect(ex.accepted).toContain(tabemasu.kana)
    expect(ex.accepted).toContain(tabemasu.romaji)
    expect(ex.accepted).toContain(tabemasu.kanji)
  })

  it('flashcard carries the direction through', () => {
    expect(flashcard(tabemasu, pool, 'ES_JA').direction).toBe('ES_JA')
    expect(flashcard(tabemasu, pool, 'JA_ES').direction).toBe('JA_ES')
  })
})

describe('matching (EXER-05)', () => {
  it('builds two shuffled columns over the same pairs', () => {
    const ex = matching(pool.slice(0, 4), 'JA_ES')
    expect(ex.pairs).toHaveLength(4)
    expect(ex.left.map((p) => p.id).sort()).toEqual(ex.right.map((p) => p.id).sort())
    expect(ex.left.map((p) => p.id).sort()).toEqual(ex.pairs.map((p) => p.id).sort())
  })

  it('caps a larger input at 5 pairs', () => {
    const six = [...pool, tabemasu] // 6 entries
    expect(matching(six, 'JA_ES').pairs.length).toBeLessThanOrEqual(5)
  })
})

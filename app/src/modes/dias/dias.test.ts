// Días drill logic tests — data integrity (the drill must match the committed
// 2026-07-17 vocab readings exactly) + pure queue/option helpers.
import { describe, expect, it } from 'vitest'
import { DAYS, NEED, makeQuestion, nextDay, pickNext, pickOptions } from './dias'

describe('DAYS data', () => {
  it('has the 7 days, Monday-first, matching the taught readings', () => {
    expect(DAYS.map((d) => d.es)).toEqual([
      'lunes',
      'martes',
      'miércoles',
      'jueves',
      'viernes',
      'sábado',
      'domingo',
    ])
    expect(DAYS.map((d) => d.kana)).toEqual([
      'げつようび',
      'かようび',
      'すいようび',
      'もくようび',
      'きんようび',
      'どようび',
      'にちようび',
    ])
  })

  it('every day ends in the shared 〜ようび suffix and starts with its prefix', () => {
    for (const d of DAYS) {
      expect(d.kana.endsWith('ようび')).toBe(true)
      expect(d.kana.startsWith(d.prefijo)).toBe(true)
    }
  })
})

describe('nextDay', () => {
  it('follows the weekly order and wraps domingo -> lunes', () => {
    expect(nextDay(0)).toBe(1) // げつようび -> かようび
    expect(nextDay(6)).toBe(0) // にちようび -> げつようび
  })
})

describe('pickNext', () => {
  it('only returns unmastered days and avoids immediate repeats when possible', () => {
    const remaining = [0, NEED, 0, NEED, 0, 0, 0] // only martes (1) and jueves (3) pending
    for (let i = 0; i < 50; i++) {
      expect(pickNext(remaining, 1)).toBe(3) // prev=1 -> must pick 3
      expect(pickNext(remaining, 3)).toBe(1)
    }
  })

  it('repeats the previous day when it is the only one left', () => {
    const remaining = [0, 0, 0, 0, 0, 0, 1]
    expect(pickNext(remaining, 6)).toBe(6)
  })
})

describe('pickOptions / makeQuestion', () => {
  it('returns 4 unique day indices including the answer', () => {
    for (let a = 0; a < 7; a++) {
      const opts = pickOptions(a)
      expect(opts).toHaveLength(4)
      expect(new Set(opts).size).toBe(4)
      expect(opts).toContain(a)
      for (const o of opts) expect(o).toBeGreaterThanOrEqual(0)
    }
  })

  it('makeQuestion targets a pending day with a valid type', () => {
    const remaining = [0, 0, NEED, 0, 0, 0, 0]
    for (let i = 0; i < 30; i++) {
      const q = makeQuestion(remaining, -1)
      expect(q.answer).toBe(2)
      expect(['esja', 'jaes', 'seq']).toContain(q.type)
      expect(q.options).toContain(q.answer)
    }
  })
})

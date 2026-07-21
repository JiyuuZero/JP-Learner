// timeReading / horas tests — the taught clock system: hour irregulars
// よじ・しちじ・くじ, minute counter ふん/ぷん irregulars, はん for :30, plus
// token renderability invariants and question-builder properties.
import { describe, expect, it } from 'vitest'
import { minutePart, timeReading, MINUTE_VARIANTS } from './timeReading'
import { LEVELS, makeMinuteQuestion, makeTimeQuestion } from './horas'

describe('timeReading — hours', () => {
  it('irregular hours: 4 よじ, 7 しちじ, 9 くじ', () => {
    expect(timeReading(4, 0).kana).toBe('よじ')
    expect(timeReading(4, 0).romaji).toBe('yoji')
    expect(timeReading(7, 0).kana).toBe('しちじ')
    expect(timeReading(9, 0).kana).toBe('くじ')
  })
  it('regular hours and the 10-12 range', () => {
    expect(timeReading(1, 0).kana).toBe('いちじ')
    expect(timeReading(6, 0).kana).toBe('ろくじ')
    expect(timeReading(10, 0).kana).toBe('じゅうじ')
    expect(timeReading(12, 0).kana).toBe('じゅうにじ')
    expect(timeReading(12, 0).kanji).toBe('十二時')
  })
  it('rejects out-of-range times', () => {
    expect(() => timeReading(0, 0)).toThrow()
    expect(() => timeReading(13, 0)).toThrow()
    expect(() => timeReading(5, 60)).toThrow()
  })
})

describe('timeReading — はん and minutes', () => {
  it(':30 reads はん right after the hour', () => {
    const r = timeReading(8, 30)
    expect(r.kana).toBe('はちじはん')
    expect(r.romaji).toBe('hachiji han')
    expect(r.kanji).toBe('八時半')
    expect(r.label).toBe('8:30')
  })
  it('ふん minutes: 2・5・7・9', () => {
    expect(minutePart(2).kana).toBe('にふん')
    expect(minutePart(5).kana).toBe('ごふん')
    expect(minutePart(7).kana).toBe('ななふん')
    expect(minutePart(9).kana).toBe('きゅうふん')
  })
  it('っ+ぷん minutes: 1・6・8・10', () => {
    expect(minutePart(1).kana).toBe('いっぷん')
    expect(minutePart(1).romaji).toBe('ippun')
    expect(minutePart(6).kana).toBe('ろっぷん')
    expect(minutePart(8).kana).toBe('はっぷん')
    expect(minutePart(10).kana).toBe('じゅっぷん')
    expect(minutePart(10).romaji).toBe('juppun')
  })
  it('3・4 primary ぷん readings, both variants recorded', () => {
    expect(minutePart(3).kana).toBe('さんぷん')
    expect(minutePart(4).kana).toBe('よんぷん')
    expect(MINUTE_VARIANTS[3]).toBe('さんふん')
    expect(MINUTE_VARIANTS[4]).toBe('よんふん')
  })
  it('composite minutes: 15, 20, 45, 47', () => {
    expect(minutePart(15).kana).toBe('じゅうごふん')
    expect(minutePart(20).kana).toBe('にじゅっぷん')
    expect(minutePart(20).romaji).toBe('nijuppun')
    expect(minutePart(45).kana).toBe('よんじゅうごふん')
    expect(minutePart(47).kana).toBe('よんじゅうななふん')
  })
  it('full times compose hour + minutes', () => {
    expect(timeReading(2, 5).kana).toBe('にじごふん')
    expect(timeReading(2, 5).romaji).toBe('niji gofun')
    expect(timeReading(1, 1).kana).toBe('いちじいっぷん')
    expect(timeReading(9, 45).kana).toBe('くじよんじゅうごふん')
  })
})

describe('timeReading — renderability invariants', () => {
  it('token surfaces concat to kanji, readings to kana, kanji[] present', () => {
    for (let h = 1; h <= 12; h++) {
      for (const m of [0, 1, 5, 10, 15, 30, 45, 59]) {
        const r = timeReading(h, m)
        expect(r.tokens.map((t) => t.surface).join('')).toBe(r.kanji)
        expect(r.tokens.map((t) => t.reading).join('')).toBe(r.kana)
        for (const t of r.tokens) {
          expect(t.isKanji).toBe(true)
          expect(t.kanji?.join('')).toBe(t.surface)
        }
      }
    }
  })
})

describe('question builders', () => {
  it('makeTimeQuestion: 4 options with unique readings, includes the answer', () => {
    for (const level of LEVELS) {
      for (let i = 0; i < 40; i++) {
        const q = makeTimeQuestion(level.minutes)
        expect(q.options).toHaveLength(4)
        expect(new Set(q.options.map((o) => o.kana)).size).toBe(4)
        expect(q.options.some((o) => o.kana === q.answer.kana)).toBe(true)
        expect(level.minutes).toContain(q.answer.m)
      }
    }
  })
  it('makeTimeQuestion avoids repeating the previous time', () => {
    for (let i = 0; i < 30; i++) {
      const q = makeTimeQuestion([0], '3:00')
      expect(q.answer.label).not.toBe('3:00')
    }
  })
  it('makeMinuteQuestion: 4 unique options 1-10 incl. answer, no immediate repeat', () => {
    for (let i = 0; i < 40; i++) {
      const q = makeMinuteQuestion(6)
      expect(q.answer).not.toBe(6)
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options).size).toBe(4)
      expect(q.options).toContain(q.answer)
      for (const o of q.options) {
        expect(o).toBeGreaterThanOrEqual(1)
        expect(o).toBeLessThanOrEqual(10)
      }
    }
  })
})

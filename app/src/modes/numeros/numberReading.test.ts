// numberReading tests — the taught 0–99 999 system with its irregular
// readings (さんびゃく・ろっぴゃく・はっぴゃく・さんぜん・はっせん, いちまん)
// plus the schema renderability invariants over tokens.
import { describe, expect, it } from 'vitest'
import { numberReading } from './numberReading'

describe('numberReading — basics', () => {
  it('0 is ゼロ (as taught), kana-only token', () => {
    const r = numberReading(0)
    expect(r.kana).toBe('ゼロ')
    expect(r.romaji).toBe('zero')
    expect(r.tokens).toEqual([{ surface: 'ゼロ', reading: 'ゼロ', isKanji: false }])
  })

  it('digits and tens are regular', () => {
    expect(numberReading(5).kana).toBe('ご')
    expect(numberReading(7).kana).toBe('なな')
    expect(numberReading(10).kana).toBe('じゅう')
    expect(numberReading(10).romaji).toBe('jū')
    expect(numberReading(11).kana).toBe('じゅういち')
    expect(numberReading(34).kana).toBe('さんじゅうよん')
    expect(numberReading(99).kana).toBe('きゅうじゅうきゅう')
  })

  it('rejects out-of-range input', () => {
    expect(() => numberReading(-1)).toThrow()
    expect(() => numberReading(100000)).toThrow()
    expect(() => numberReading(1.5)).toThrow()
  })
})

describe('numberReading — hundreds (百) irregulars', () => {
  it('100 is bare ひゃく', () => {
    expect(numberReading(100).kana).toBe('ひゃく')
    expect(numberReading(100).kanji).toBe('百')
  })
  it('300 さんびゃく / 600 ろっぴゃく / 800 はっぴゃく', () => {
    expect(numberReading(300).kana).toBe('さんびゃく')
    expect(numberReading(300).romaji).toBe('sanbyaku')
    expect(numberReading(600).kana).toBe('ろっぴゃく')
    expect(numberReading(600).romaji).toBe('roppyaku')
    expect(numberReading(800).kana).toBe('はっぴゃく')
    expect(numberReading(800).romaji).toBe('happyaku')
  })
  it('other hundreds stay regular', () => {
    expect(numberReading(200).kana).toBe('にひゃく')
    expect(numberReading(400).kana).toBe('よんひゃく')
    expect(numberReading(900).kana).toBe('きゅうひゃく')
    expect(numberReading(305).kana).toBe('さんびゃくご')
  })
})

describe('numberReading — thousands (千) irregulars', () => {
  it('1000 is bare せん standalone', () => {
    expect(numberReading(1000).kana).toBe('せん')
    expect(numberReading(1000).kanji).toBe('千')
  })
  it('3000 さんぜん / 8000 はっせん', () => {
    expect(numberReading(3000).kana).toBe('さんぜん')
    expect(numberReading(3000).romaji).toBe('sanzen')
    expect(numberReading(8000).kana).toBe('はっせん')
    expect(numberReading(8000).romaji).toBe('hassen')
  })
  it('other thousands stay regular (6000 ろくせん — no gemination)', () => {
    expect(numberReading(6000).kana).toBe('ろくせん')
    expect(numberReading(4000).kana).toBe('よんせん')
    expect(numberReading(9000).kana).toBe('きゅうせん')
  })
})

describe('numberReading — ten-thousands (万)', () => {
  it('10 000 always carries its digit: いちまん', () => {
    expect(numberReading(10000).kana).toBe('いちまん')
    expect(numberReading(10000).romaji).toBe('ichiman')
    expect(numberReading(10000).kanji).toBe('一万')
  })
  it('万 never geminates (60 000 ろくまん, 80 000 はちまん)', () => {
    expect(numberReading(60000).kana).toBe('ろくまん')
    expect(numberReading(80000).kana).toBe('はちまん')
  })
  it('1000 after 万 reads せん (11 000 = いちまんせん, 一万千)', () => {
    expect(numberReading(11000).kana).toBe('いちまんせん')
    expect(numberReading(11000).romaji).toBe('ichiman sen')
    expect(numberReading(11000).kanji).toBe('一万千')
  })
  it('composites read component by component', () => {
    const r = numberReading(34567)
    expect(r.kana).toBe('さんまんよんせんごひゃくろくじゅうなな')
    expect(r.kanji).toBe('三万四千五百六十七')
    expect(r.romaji).toBe('sanman yonsen gohyaku rokujū nana')
    expect(numberReading(99999).kana).toBe('きゅうまんきゅうせんきゅうひゃくきゅうじゅうきゅう')
    // interior zeros are silent
    expect(numberReading(20050).kana).toBe('にまんごじゅう')
  })
})

describe('numberReading — renderability invariants (schema token rules)', () => {
  it('token surfaces concat to kanji, readings concat to kana, kanji[] present', () => {
    const samples = [1, 8, 10, 16, 111, 300, 608, 999, 1000, 3333, 8888, 10000, 11111, 68000, 99999]
    for (let i = 0; i <= 99999; i += 997) samples.push(i)
    for (const n of samples) {
      const r = numberReading(n)
      expect(r.tokens.map((t) => t.surface).join('')).toBe(r.kanji)
      expect(r.tokens.map((t) => t.reading).join('')).toBe(r.kana)
      for (const t of r.tokens) {
        if (t.isKanji) {
          expect(t.kanji && t.kanji.length).toBeTruthy()
          expect(t.kanji?.join('')).toBe(t.surface)
        }
      }
    }
  })
})

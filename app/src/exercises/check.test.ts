// Tolerant typing checker tests (EXER-03) — romaji/kana variants, n/nn,
// punctuation/space stripping, NFKC width unification, long-vowel dash.
import { describe, expect, it } from 'vitest'
import { isAnswerCorrect, isEsAnswerCorrect } from './check'

describe('isAnswerCorrect (tolerant typing checker, EXER-03)', () => {
  it('accepts an exact romaji match', () => {
    expect(isAnswerCorrect('tabemasu', ['たべます', 'tabemasu'])).toBe(true)
  })

  it('folds n/nn: "sennsei" matches "sensei"', () => {
    expect(isAnswerCorrect('sennsei', ['せんせい', 'sensei'])).toBe(true)
  })

  it('treats shi/si as equivalent', () => {
    expect(isAnswerCorrect('susi', ['すし', 'sushi'])).toBe(true)
  })

  it('treats tsu/tu as equivalent', () => {
    expect(isAnswerCorrect('tunami', ['つなみ', 'tsunami'])).toBe(true)
  })

  it('treats chi/ti as equivalent', () => {
    expect(isAnswerCorrect('mainiti', ['まいにち', 'mainichi'])).toBe(true)
  })

  it('strips punctuation and spaces', () => {
    expect(
      isAnswerCorrect('  Densha ni norikomu。 ', ['でんしゃにのりこむ', 'Densha ni norikomu.']),
    ).toBe(true)
  })

  it('ignores the long-vowel dash and doubled vowels', () => {
    expect(isAnswerCorrect('ra-men', ['らーめん', 'raamen'])).toBe(true)
  })

  it('unifies full-width and half-width input via NFKC', () => {
    expect(isAnswerCorrect('ｔａｂｅｍａｓｕ', ['たべます', 'tabemasu'])).toBe(true)
  })

  it('accepts kana input matching item.kana', () => {
    expect(isAnswerCorrect('たべます', ['たべます', 'tabemasu'])).toBe(true)
  })

  it('collapses doubled consonants (small っ tolerance)', () => {
    expect(isAnswerCorrect('gakou', ['がっこう', 'gakkou'])).toBe(true)
  })

  it('returns false for a clearly wrong answer', () => {
    expect(isAnswerCorrect('nomimasu', ['たべます', 'tabemasu'])).toBe(false)
  })
})

describe('isEsAnswerCorrect (loose ES match, JA_ES direction)', () => {
  it('accepts the exact translation', () => {
    expect(isEsAnswerCorrect('gracias', 'gracias')).toBe(true)
  })

  it('accepts a loose match ignoring the parenthetical', () => {
    expect(isEsAnswerCorrect('comer', 'comer (cortés)')).toBe(true)
  })

  it('rejects a wrong translation', () => {
    expect(isEsAnswerCorrect('beber', 'comer (cortés)')).toBe(false)
  })

  it('rejects empty input', () => {
    expect(isEsAnswerCorrect('   ', 'comer (cortés)')).toBe(false)
  })
})

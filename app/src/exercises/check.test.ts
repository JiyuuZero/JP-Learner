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

  it('expands the long-vowel dash to the doubled vowel', () => {
    expect(isAnswerCorrect('ra-men', ['らーめん', 'raamen'])).toBe(true)
  })

  it('treats bi-ru as biiru (dash = long vowel, not deletion)', () => {
    expect(isAnswerCorrect('bi-ru', ['びーる', 'biiru'])).toBe(true)
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

  // WR-01 regressions: long-vowel minimal pairs and kana doubling must stay
  // DISTINCT — the doubling collapse only applies to ASCII consonants.
  it('does NOT fold biru (building) into biiru (beer)', () => {
    expect(isAnswerCorrect('biru', ['びーる', 'biiru'])).toBe(false)
  })

  it('does NOT fold obasan (aunt) into obaasan (grandmother)', () => {
    expect(isAnswerCorrect('obasan', ['おばあさん', 'obaasan'])).toBe(false)
  })

  it('does NOT fold kana ころ into こころ', () => {
    expect(isAnswerCorrect('ころ', ['こころ', 'kokoro'])).toBe(false)
  })

  it('does NOT fold kana ち into ちち', () => {
    expect(isAnswerCorrect('ち', ['ちち', 'chichi'])).toBe(false)
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

  // WR-01 regressions: the ES path must NOT apply romaji foldings or the
  // doubling collapse — Spanish minimal pairs stay distinct.
  it('does NOT fold pero into perro', () => {
    expect(isEsAnswerCorrect('pero', 'perro')).toBe(false)
  })

  // NOTE: 'lamar' vs 'llamar' still matches via the >=3-char containment rule
  // ('llamar'.includes('lamar')) — that looseness is IN-01, tracked separately.
  it('keeps normalized ES text unfolded (llamar keeps its ll)', () => {
    expect(isEsAnswerCorrect('llamar', 'llamar')).toBe(true)
    expect(isEsAnswerCorrect('lamas', 'llamar')).toBe(false)
  })
})

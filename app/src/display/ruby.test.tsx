// @vitest-environment jsdom
// Ruby rendering tests (DISP-01/02/03) — Modes A/B/C are pure transforms over
// schema tokens + the learned-kanji set. Zero in-app Japanese analysis.
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { renderTokens } from './ruby'
import type { Token } from '../content/content'

// 乗り込む — okurigana compound: 乗/込 are kanji runs, り/む literal kana
const norikomuTokens: Token[] = [
  { surface: '乗', reading: 'の', isKanji: true, kanji: ['乗'] },
  { surface: 'り', reading: 'り', isKanji: false },
  { surface: '込', reading: 'こ', isKanji: true, kanji: ['込'] },
  { surface: 'む', reading: 'む', isKanji: false },
]

// 毎日 — jukugo: ONE run carrying two kanji chars
const mainichiTokens: Token[] = [
  { surface: '毎日', reading: 'まいにち', isKanji: true, kanji: ['毎', '日'] },
]

function renderMode(
  tokens: Token[],
  mode: 'A' | 'B' | 'C',
  learned: Set<string>,
  romajiVisible = true,
  wordRomaji?: string,
) {
  return render(<>{renderTokens(tokens, mode, learned, romajiVisible, wordRomaji)}</>)
}

describe('Mode C (kanji only, DISP-01)', () => {
  it('renders surfaces with no rt', () => {
    const { container } = renderMode(norikomuTokens, 'C', new Set())
    expect(container.textContent).toBe('乗り込む')
    expect(container.querySelectorAll('rt')).toHaveLength(0)
    expect(container.querySelectorAll('ruby')).toHaveLength(0)
  })
})

describe('Mode B (progressive kanji, DISP-03 — per-run learned substitution)', () => {
  it('renders plain kana when the kanji is not learned', () => {
    const { container } = renderMode(mainichiTokens, 'B', new Set())
    expect(container.textContent).toBe('まいにち')
    expect(container.querySelectorAll('ruby')).toHaveLength(0)
  })

  it('does NOT substitute 毎日 when only 毎 is learned (needs EVERY kanji in the run)', () => {
    const { container } = renderMode(mainichiTokens, 'B', new Set(['毎']))
    expect(container.textContent).toBe('まいにち')
    expect(container.querySelectorAll('ruby')).toHaveLength(0)
  })

  it('substitutes 毎日 to kanji-with-kana-furigana once BOTH 毎 and 日 are learned', () => {
    const { container } = renderMode(mainichiTokens, 'B', new Set(['毎', '日']))
    const ruby = container.querySelector('ruby')
    expect(ruby).not.toBeNull()
    expect(ruby!.textContent).toContain('毎日')
    expect(container.querySelector('rt')!.textContent).toBe('まいにち')
  })

  it('renders 乗/込 as ruby when learned while り/む stay literal kana', () => {
    const { container } = renderMode(norikomuTokens, 'B', new Set(['乗', '込']))
    const rubies = container.querySelectorAll('ruby')
    expect(rubies).toHaveLength(2)
    const rts = [...container.querySelectorAll('rt')].map((rt) => rt.textContent)
    expect(rts).toEqual(['の', 'こ'])
    const spans = [...container.querySelectorAll('span')].map((s) => s.textContent)
    expect(spans).toContain('り')
    expect(spans).toContain('む')
  })

  it('keeps an unlearned run as kana while a learned run substitutes (gradual)', () => {
    const { container } = renderMode(norikomuTokens, 'B', new Set(['乗']))
    // only 乗 substitutes; 込 still renders as its kana reading こ
    expect(container.querySelectorAll('ruby')).toHaveLength(1)
    const spans = [...container.querySelectorAll('span')].map((s) => s.textContent)
    expect(spans).toContain('こ')
  })
})

describe('Mode A (romaji over, DISP-01/02 — word-level rt, A1)', () => {
  it('renders one word-level ruby with the romaji rt when romaji is visible', () => {
    const { container } = renderMode(norikomuTokens, 'A', new Set(), true, 'norikomu')
    const rubies = container.querySelectorAll('ruby')
    expect(rubies).toHaveLength(1)
    expect(rubies[0].textContent).toContain('乗り込む')
    expect(container.querySelector('rt')!.textContent).toBe('norikomu')
    // <rp> fallback parens present for non-ruby contexts
    expect(container.querySelectorAll('rp')).toHaveLength(2)
  })

  it('renders plain surfaces when romaji is hidden', () => {
    const { container } = renderMode(norikomuTokens, 'A', new Set(), false, 'norikomu')
    expect(container.textContent).toBe('乗り込む')
    expect(container.querySelectorAll('ruby')).toHaveLength(0)
  })

  it('falls back to the kana reading as rt when no word romaji is provided', () => {
    const { container } = renderMode(mainichiTokens, 'A', new Set(), true)
    expect(container.querySelector('rt')!.textContent).toBe('まいにち')
  })
})

// Ruby rendering (DISP-01/02/03) — native <ruby> only, verbatim from
// 01-RESEARCH.md §Ruby Rendering. Pure transform over schema tokens + the
// learned-kanji set: readings are AUTHORITATIVE schema data, NEVER computed
// in-app (no JA analysis libraries — wrong furigana teaches wrong readings).
//
// Modes:
//  A — kanji/kana base with romaji rt at WORD granularity (A1: the frozen
//      schema stores word-level romaji, not per-token) when romajiVisible;
//      plain surfaces otherwise.
//  B — progressive: a kanji run substitutes to kanji-with-KANA-furigana only
//      when EVERY kanji char in its kanji[] is in the learned set; otherwise
//      the run renders as its kana reading (gradual substitution, DISP-03).
//  C — kanji only, no rt.
import type { ReactNode } from 'react'
import type { Token } from '../content/content'

type Mode = 'A' | 'B' | 'C'

export function renderTokens(
  tokens: Token[],
  mode: Mode,
  learned: Set<string>,
  romajiVisible: boolean,
  wordRomaji?: string,
): ReactNode[] {
  if (mode === 'A') {
    // Mode A: kanji + romaji-over at word granularity (A1).
    if (!romajiVisible) return tokens.map((t, i) => <span key={i}>{t.surface}</span>)
    const surface = tokens.map((t) => t.surface).join('')
    // rt = word-level romaji from the schema; kana reading as fallback rt.
    const rt = wordRomaji ?? tokens.map((t) => t.reading).join('')
    return [
      <ruby key="word">
        {surface}
        <rp>(</rp>
        <rt>{rt}</rt>
        <rp>)</rp>
      </ruby>,
    ]
  }

  return tokens.map((t, i) => {
    if (!t.isKanji) return <span key={i}>{t.surface}</span> // kana/okurigana: always literal

    if (mode === 'C') return <span key={i}>{t.surface}</span> // kanji only, no rt

    // Mode B (progressive): learned kanji-run -> kanji + KANA furigana;
    // unlearned -> plain KANA (hide kanji until every char is learned).
    const known = (t.kanji ?? []).every((k) => learned.has(k))
    return known ? (
      <ruby key={i}>
        {t.surface}
        <rp>(</rp>
        <rt>{t.reading}</rt>
        <rp>)</rp>
      </ruby>
    ) : (
      <span key={i}>{t.reading}</span> // not learned yet -> kana only
    )
  })
}

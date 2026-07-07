// Japanese content renderer — the single component every surface (Glosario,
// exercises, item detail, Guardados) uses to show JA text per the ACTIVE
// display mode (meta.displayMode) + romaji toggle + learned-kanji set.
// Readings come ONLY from schema data (tokens / kana / romaji) — never computed.
import { useProgress } from '../progress/ProgressContext'
import { renderTokens } from './ruby'
import type { Token } from '../content/content'

interface JapaneseTextProps {
  kanji: string
  kana: string
  romaji: string
  tokens?: Token[]
  className?: string
}

export default function JapaneseText({ kanji, kana, romaji, tokens, className }: JapaneseTextProps) {
  const { meta, learnedSet } = useProgress()
  const mode = meta?.displayMode ?? 'A'
  const romajiVisible = meta?.romajiVisible ?? true

  let body: React.ReactNode
  if (tokens && tokens.length > 0) {
    // Mode A applies the word/sentence-level romaji as rt (A1).
    body = renderTokens(tokens, mode, learnedSet, romajiVisible, romaji)
  } else if (mode === 'B') {
    // No tokens -> no per-run substitution possible; kana is the safe fallback
    // (never a wrong reading).
    body = kana
  } else if (mode === 'A' && romajiVisible) {
    body = (
      <ruby>
        {kanji}
        <rp>(</rp>
        <rt>{romaji}</rt>
        <rp>)</rp>
      </ruby>
    )
  } else {
    body = kanji
  }

  return (
    <span lang="ja" className={`jp-text ${className ?? ''}`}>
      {body}
    </span>
  )
}

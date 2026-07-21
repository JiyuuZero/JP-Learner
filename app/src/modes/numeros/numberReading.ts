// Japanese readings for 0..99 999 — exactly the system taught in class
// (2026-07-08: dígitos 0-10; 2026-07-17: ひゃく・せん・まん + irregulares).
// Deterministic data tables verified against reference material — readings are
// NEVER guessed at runtime:
// - 300 さんびゃく / 600 ろっぴゃく / 800 はっぴゃく (class note 2026-07-17:note:4)
// - 3000 さんぜん / 8000 はっせん (same note)
// - 10 000 always carries its digit: いちまん, never bare まん
// - 1000 in the thousands slot AFTER まん reads いっせん (11 000 = いちまんいっせん);
//   standalone 1000 stays せん, as taught.
// Sources: Coto Academy / LingQ counting guides; japanese-lesson.com numbers
// table ("1000 = sen / issen — issen only in higher units").
// Tokens follow the schema conventions (jukugo run = one token, kanji[] chars)
// so JapaneseText renders the reveal per the user's script-display config.
import type { Token } from '../../content/content'

export interface JaNumber {
  value: number
  kanji: string
  kana: string
  romaji: string
  tokens: Token[]
}

interface Part {
  kanji: string
  kana: string
  romaji: string
}

const DIGIT_KANJI = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const DIGIT_KANA = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう']
const DIGIT_ROMAJI = ['', 'ichi', 'ni', 'san', 'yon', 'go', 'roku', 'nana', 'hachi', 'kyū']

// 万: regular for every digit, and 1 is explicit (一万 いちまん).
const manPart = (d: number): Part => ({
  kanji: DIGIT_KANJI[d] + '万',
  kana: DIGIT_KANA[d] + 'まん',
  romaji: DIGIT_ROMAJI[d] + 'man',
})

// 千: bare せん standalone, いっせん after 万; irregulars さんぜん・はっせん.
function senPart(d: number, afterMan: boolean): Part {
  if (d === 1) {
    return afterMan
      ? { kanji: '一千', kana: 'いっせん', romaji: 'issen' }
      : { kanji: '千', kana: 'せん', romaji: 'sen' }
  }
  if (d === 3) return { kanji: '三千', kana: 'さんぜん', romaji: 'sanzen' }
  if (d === 8) return { kanji: '八千', kana: 'はっせん', romaji: 'hassen' }
  return { kanji: DIGIT_KANJI[d] + '千', kana: DIGIT_KANA[d] + 'せん', romaji: DIGIT_ROMAJI[d] + 'sen' }
}

// 百: bare ひゃく for 1; irregulars さんびゃく・ろっぴゃく・はっぴゃく.
function hyakuPart(d: number): Part {
  if (d === 1) return { kanji: '百', kana: 'ひゃく', romaji: 'hyaku' }
  if (d === 3) return { kanji: '三百', kana: 'さんびゃく', romaji: 'sanbyaku' }
  if (d === 6) return { kanji: '六百', kana: 'ろっぴゃく', romaji: 'roppyaku' }
  if (d === 8) return { kanji: '八百', kana: 'はっぴゃく', romaji: 'happyaku' }
  return { kanji: DIGIT_KANJI[d] + '百', kana: DIGIT_KANA[d] + 'ひゃく', romaji: DIGIT_ROMAJI[d] + 'hyaku' }
}

// 十: bare じゅう for 1, fully regular otherwise.
const juuPart = (d: number): Part =>
  d === 1
    ? { kanji: '十', kana: 'じゅう', romaji: 'jū' }
    : { kanji: DIGIT_KANJI[d] + '十', kana: DIGIT_KANA[d] + 'じゅう', romaji: DIGIT_ROMAJI[d] + 'jū' }

const onesPart = (d: number): Part => ({
  kanji: DIGIT_KANJI[d],
  kana: DIGIT_KANA[d],
  romaji: DIGIT_ROMAJI[d],
})

const toToken = (p: Part): Token => ({
  surface: p.kanji,
  reading: p.kana,
  isKanji: true,
  kanji: [...p.kanji],
})

export function numberReading(n: number): JaNumber {
  if (!Number.isInteger(n) || n < 0 || n > 99999) {
    throw new Error(`numberReading: fuera de rango 0–99999 (${n})`)
  }
  if (n === 0) {
    // 0 se enseñó como ゼロ (2026-07-08:vocab:zero) — kana-only token.
    return {
      value: 0,
      kanji: 'ゼロ',
      kana: 'ゼロ',
      romaji: 'zero',
      tokens: [{ surface: 'ゼロ', reading: 'ゼロ', isKanji: false }],
    }
  }

  const man = Math.floor(n / 10000)
  const sen = Math.floor((n % 10000) / 1000)
  const hyaku = Math.floor((n % 1000) / 100)
  const juu = Math.floor((n % 100) / 10)
  const one = n % 10

  const parts: Part[] = []
  if (man > 0) parts.push(manPart(man))
  if (sen > 0) parts.push(senPart(sen, man > 0))
  if (hyaku > 0) parts.push(hyakuPart(hyaku))
  if (juu > 0) parts.push(juuPart(juu))
  if (one > 0) parts.push(onesPart(one))

  return {
    value: n,
    kanji: parts.map((p) => p.kanji).join(''),
    kana: parts.map((p) => p.kana).join(''),
    romaji: parts.map((p) => p.romaji).join(' '),
    tokens: parts.map(toToken),
  }
}

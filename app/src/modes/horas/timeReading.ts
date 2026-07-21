// Japanese clock-time readings — exactly the system taught in class
// (2026-07-15: 〜じ + irregulars; 2026-07-20: 〜ふん/ぷん + はん).
// Deterministic data tables verified against reference material:
// - hours: 4時 よじ (never よんじ/しじ), 7時 しちじ, 9時 くじ (never きゅうじ)
//   (class note 2026-07-15:note:3; by phone ななじ is preferred for 7 — noted
//   in the mode intro, しちじ stays the canonical reading here);
// - minutes: ふん after 2・5・7・9, っ+ぷん after 1・6・8・10 (いっぷん・ろっぷん・
//   はっぷん・じゅっぷん); 3・4 admit both — さんぷん/よんぷん shown as primary,
//   さんふん/よんふん accepted variants (class note 2026-07-20:note:3);
// - :30 reads はん right after the hour (class 2026-07-20 grammar ji-han).
// Sources: Tofugu counter-分 guide; Japanese Professor "Telling Time";
// Coto Academy telling-time guide.
import type { Token } from '../../content/content'

export interface JaTime {
  h: number // 1..12
  m: number // 0..59
  label: string // digital form, e.g. "8:30"
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

// Hour digit readings BEFORE 時 (よ・しち・く irregulars).
const HOUR_KANJI = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
const HOUR_KANA = ['', 'いち', 'に', 'さん', 'よ', 'ご', 'ろく', 'しち', 'はち', 'く', 'じゅう', 'じゅういち', 'じゅうに']
const HOUR_ROMAJI = ['', 'ichi', 'ni', 'san', 'yo', 'go', 'roku', 'shichi', 'hachi', 'ku', 'jū', 'jūichi', 'jūni']

// Minute readings 1-9 WITH the counter fused (gemination crosses the digit/分
// boundary, so the minutes part is one word-level token — never split it).
const MIN_ONES_KANJI = ['', '一分', '二分', '三分', '四分', '五分', '六分', '七分', '八分', '九分']
const MIN_ONES_KANA = ['', 'いっぷん', 'にふん', 'さんぷん', 'よんぷん', 'ごふん', 'ろっぷん', 'ななふん', 'はっぷん', 'きゅうふん']
const MIN_ONES_ROMAJI = ['', 'ippun', 'nifun', 'sanpun', 'yonpun', 'gofun', 'roppun', 'nanafun', 'happun', 'kyūfun']

// Variants the class allows for 3 and 4 (both readings taught as valid).
export const MINUTE_VARIANTS: Record<number, string> = { 3: 'さんふん', 4: 'よんふん' }

const TENS_DIGIT_KANJI = ['', '', '二', '三', '四', '五']
const TENS_DIGIT_KANA = ['', '', 'に', 'さん', 'よん', 'ご']
const TENS_DIGIT_ROMAJI = ['', '', 'ni', 'san', 'yon', 'go']

// The minutes part (1..59) as ONE Part: 5 ごふん, 10 じゅっぷん, 15 じゅうごふん,
// 20 にじゅっぷん, 47 よんじゅうななふん…
export function minutePart(m: number): Part {
  if (!Number.isInteger(m) || m < 1 || m > 59) {
    throw new Error(`minutePart: fuera de rango 1–59 (${m})`)
  }
  if (m < 10) {
    return { kanji: MIN_ONES_KANJI[m], kana: MIN_ONES_KANA[m], romaji: MIN_ONES_ROMAJI[m] }
  }
  const d = Math.floor(m / 10)
  const o = m % 10
  if (o === 0) {
    // 10・20・30・40・50 → (digit +) じゅっぷん
    return {
      kanji: `${TENS_DIGIT_KANJI[d]}十分`,
      kana: `${TENS_DIGIT_KANA[d]}じゅっぷん`,
      romaji: `${TENS_DIGIT_ROMAJI[d]}juppun`,
    }
  }
  const tensKanji = d === 1 ? '十' : `${TENS_DIGIT_KANJI[d]}十`
  const tensKana = d === 1 ? 'じゅう' : `${TENS_DIGIT_KANA[d]}じゅう`
  const tensRomaji = d === 1 ? 'jū' : `${TENS_DIGIT_ROMAJI[d]}jū`
  return {
    kanji: tensKanji + MIN_ONES_KANJI[o],
    kana: tensKana + MIN_ONES_KANA[o],
    romaji: tensRomaji + MIN_ONES_ROMAJI[o],
  }
}

const toToken = (p: Part): Token => ({
  surface: p.kanji,
  reading: p.kana,
  isKanji: true,
  kanji: [...p.kanji],
})

// Standalone minutes reading (for the 1-10 counter drill), JapaneseText-ready.
export function minuteJa(m: number): { kanji: string; kana: string; romaji: string; tokens: Token[] } {
  const p = minutePart(m)
  return { kanji: p.kanji, kana: p.kana, romaji: p.romaji, tokens: [toToken(p)] }
}

// Full clock time: hour + 時 (+ はん for :30, + minutes otherwise).
export function timeReading(h: number, m: number): JaTime {
  if (!Number.isInteger(h) || h < 1 || h > 12 || !Number.isInteger(m) || m < 0 || m > 59) {
    throw new Error(`timeReading: hora fuera de rango (${h}:${m})`)
  }
  const tokens: Token[] = [
    { surface: HOUR_KANJI[h], reading: HOUR_KANA[h], isKanji: true, kanji: [...HOUR_KANJI[h]] },
    { surface: '時', reading: 'じ', isKanji: true, kanji: ['時'] },
  ]
  const romajiParts = [`${HOUR_ROMAJI[h]}ji`]
  if (m === 30) {
    // la manera normal de decir «y media» (2026-07-20 grammar ji-han)
    tokens.push({ surface: '半', reading: 'はん', isKanji: true, kanji: ['半'] })
    romajiParts.push('han')
  } else if (m > 0) {
    tokens.push(toToken(minutePart(m)))
    romajiParts.push(minutePart(m).romaji)
  }
  return {
    h,
    m,
    label: `${h}:${String(m).padStart(2, '0')}`,
    kanji: tokens.map((t) => t.surface).join(''),
    kana: tokens.map((t) => t.reading).join(''),
    romaji: romajiParts.join(' '),
    tokens,
  }
}

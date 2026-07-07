// Tolerant typing checker (EXER-03). Input is COMPARED in-memory only, never
// executed/rendered as HTML. Kana input (via OS IME) matches item.kana after
// NFKC; the romaji foldings only fire when the user typed romaji.
//
// Base normalization shared by both directions: trim + lowercase +
// punctuation/space strip + NFKC full/half-width unification. NO foldings.
const normBase = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .replace(/[。、.!?！？\s]/g, '') // strip punctuation/space
    .normalize('NFKC') // full/half-width unify

// JA normalizer: romaji variant folding on top of normBase. Tolerances are
// DELIBERATELY narrow so distinct vocabulary stays distinct (long-vowel
// minimal pairs biiru≠biru / obaasan≠obasan, kana こころ≠ころ):
// - ん as n or nn
// - Hepburn ↔ Kunrei variants (shi/si, chi/ti, tsu/tu, ...)
// - the long-vowel dash EXPANDS to the doubled vowel (ra-men ≡ raamen ≠ ramen)
// - doubled ASCII CONSONANTS collapse (small っ tolerance: gakou ≡ gakkou);
//   vowels and kana are NEVER collapsed.
const normJa = (s: string): string =>
  normBase(s)
    .replace(/nn/g, 'n') // ん: n or nn
    .replace(/shi/g, 'si')
    .replace(/chi/g, 'ti')
    .replace(/tsu/g, 'tu')
    .replace(/fu/g, 'hu')
    .replace(/ji/g, 'zi')
    .replace(/sha/g, 'sya')
    .replace(/shu/g, 'syu')
    .replace(/sho/g, 'syo')
    .replace(/cha/g, 'tya')
    .replace(/chu/g, 'tyu')
    .replace(/cho/g, 'tyo')
    .replace(/([aeiou])[-ー]/g, '$1$1') // long-vowel dash = doubled vowel
    .replace(/([bcdfghjklmnpqrstvwxyz])\1/g, '$1') // doubled consonants only (small っ tolerance)

// accepted = [item.kana, item.romaji] (+ item.kanji for advanced input).
export function isAnswerCorrect(input: string, accepted: string[]): boolean {
  const target = accepted.map(normJa)
  return target.includes(normJa(input))
}

// JA_ES direction: the ES translation matches LOOSELY — normalized equality,
// or a sufficiently long containment either way (tolerates answering "comer"
// for "comer (cortés)"). Uses ONLY the mild base normalizer: no romaji
// foldings, no doubling collapse (perro≠pero), no dash handling.
export function isEsAnswerCorrect(input: string, es: string): boolean {
  const a = normBase(input)
  const b = normBase(es)
  if (a.length === 0) return false
  if (a === b) return true
  return a.length >= 3 && (b.includes(a) || a.includes(b))
}

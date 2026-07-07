// Tolerant typing checker (EXER-03) — verbatim normalization chain from
// 01-RESEARCH.md. Input is COMPARED in-memory only, never executed/rendered
// as HTML. Kana input (via OS IME) matches item.kana after NFKC; the romaji
// foldings only fire when the user typed romaji.
const norm = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .replace(/[。、.!?！？\s]/g, '') // strip punctuation/space
    .normalize('NFKC') // full/half-width unify
    // romaji variant folding (only affects romaji input; kana passes through):
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
    .replace(/-|ー/g, '') // ignore long-vowel dash
    .replace(/(.)\1/g, '$1') // collapse doubled consonants (small っ tolerance)

// accepted = [item.kana, item.romaji] (+ item.kanji for advanced input).
export function isAnswerCorrect(input: string, accepted: string[]): boolean {
  const target = accepted.map(norm)
  return target.includes(norm(input))
}

// JA_ES direction: the ES translation matches LOOSELY — normalized equality,
// or a sufficiently long containment either way (tolerates answering "comer"
// for "comer (cortés)").
export function isEsAnswerCorrect(input: string, es: string): boolean {
  const a = norm(input)
  const b = norm(es)
  if (a.length === 0) return false
  if (a === b) return true
  return a.length >= 3 && (b.includes(a) || a.includes(b))
}

// Partículas queue tests — only particle-blank grammar makes it into the
// round; the cloze data itself comes from the shared grammarCloze generator.
import { describe, expect, it } from 'vitest'
import { buildParticleQueue } from './particulas'
import type { Grammar } from '../../content/content'

const grammar = (id: string, blankSurface: string, blank = true): Grammar => ({
  id: `2026-07-15:grammar:${id}`,
  type: 'grammar',
  pattern: `〜${blankSurface}`,
  es: `patrón ${id}`,
  examples: [
    {
      kanji: `これ${blankSurface}ほんです。`,
      kana: `これ${blankSurface}ほんです。`,
      romaji: 'kore x hon desu.',
      es: 'Esto es un libro.',
      tokens: [
        { surface: 'これ', reading: 'これ', isKanji: false },
        { surface: blankSurface, reading: blankSurface, isKanji: false, blank },
        { surface: 'ほん', reading: 'ほん', isKanji: false },
        { surface: 'です', reading: 'です', isKanji: false },
        { surface: '。', reading: '。', isKanji: false },
      ],
    },
  ],
  tags: ['2026-07-15'],
})

describe('buildParticleQueue', () => {
  it('includes particle blanks and excludes non-particle blanks / no tokens', () => {
    const items: Grammar[] = [
      grammar('wa', 'は'),
      grammar('wo', 'を'),
      grammar('desu', 'です'), // blank but not a particle -> out
      grammar('mo-sin-blank', 'も', false), // tokens but no blank -> out
      {
        ...grammar('sin-tokens', 'の'),
        examples: [{ kanji: 'あのほん。', kana: 'あのほん。', romaji: 'ano hon.', es: 'Ese libro.' }],
      },
    ]
    const queue = buildParticleQueue(items)
    const ids = queue.map((q) => q.item.id)
    expect(ids).toHaveLength(2)
    expect(ids.some((i) => i.includes(':wa'))).toBe(true)
    expect(ids.some((i) => i.includes(':wo'))).toBe(true)
  })

  it('caps the round at max and produces 4-option clozes containing the answer', () => {
    const items = ['は', 'を', 'の', 'と', 'も', 'に', 'か'].map((p, i) => grammar(`p${i}`, p))
    const queue = buildParticleQueue(items, 5)
    expect(queue).toHaveLength(5)
    for (const ex of queue) {
      expect(ex.options).toHaveLength(4)
      expect(ex.options).toContain(ex.answer)
      expect(ex.gapIndices.length).toBeGreaterThan(0)
    }
  })
})

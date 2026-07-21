// @vitest-environment jsdom
// Exercise-mode framework smoke tests — the registry's availability rules and
// a real render of every mode through the providers + the /ejercicios/:modeId
// route. Progress is a stub (modes are practice-only and must not need SRS);
// TtsContext keeps its safe no-voice default so SpeakerButtons hide.
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ContentContext } from '../content/context'
import type { ContentStore } from '../content/store'
import { ProgressContext, type ProgressContextValue } from '../progress/ProgressContext'
import { EXERCISE_MODES, modeById } from './registry'
import { DAYS } from './dias/dias'
import NumerosMode from './numeros/NumerosMode'
import DiasMode from './dias/DiasMode'
import HorasMode from './horas/HorasMode'
import ParticulasMode from './particulas/ParticulasMode'
import Ejercicio from '../views/Ejercicio'
import type { Grammar, Vocab } from '../content/content'

const progressStub: ProgressContextValue = {
  ready: true,
  meta: null,
  learnedSet: new Set(),
  srsByItem: new Map(),
  persisted: null,
  grade: async () => {},
  exportBackup: async () => {},
  importBackup: async () => {},
  markLearned: async () => {},
  unmarkLearned: async () => {},
  setDisplayMode: async () => {},
  setRomajiVisible: async () => {},
  setClassSortDir: async () => {},
  favoriteSet: new Set(),
  toggleFavorite: async () => {},
}

const vocab = (slug: string, kana: string): Vocab => ({
  id: `2026-07-17:vocab:${slug}`,
  type: 'vocab',
  kanji: kana,
  kana,
  romaji: slug,
  es: slug,
  tokens: [{ surface: kana, reading: kana, isKanji: false }],
  tags: ['2026-07-17'],
})

const particleGrammar = (slug: string, particle: string): Grammar => ({
  id: `2026-07-15:grammar:${slug}`,
  type: 'grammar',
  pattern: `〜${particle}`,
  es: `patrón ${slug}`,
  examples: [
    {
      kanji: `これ${particle}ほんです。`,
      kana: `これ${particle}ほんです。`,
      romaji: 'kore x hon desu.',
      es: 'Esto es un libro.',
      tokens: [
        { surface: 'これ', reading: 'これ', isKanji: false },
        { surface: particle, reading: particle, isKanji: false, blank: true },
        { surface: 'ほん', reading: 'ほん', isKanji: false },
        { surface: 'です', reading: 'です', isKanji: false },
        { surface: '。', reading: '。', isKanji: false },
      ],
    },
  ],
  tags: ['2026-07-15'],
})

function makeStore(vocabItems: Vocab[], grammarItems: Grammar[]): ContentStore {
  return {
    index: { contentVersion: 1, generatedAt: '', classes: [] },
    classes: [],
    vocabById: new Map(vocabItems.map((x) => [x.id, x])),
    grammarById: new Map(grammarItems.map((x) => [x.id, x])),
    kanjiById: new Map(),
    noteById: new Map(),
    byClass: new Map(),
  }
}

// Everything the four shipped modes need taught, as committed-style items.
const fullStore = makeStore(
  [
    ...DAYS.map((d, i) => vocab(`day${i}`, d.kana)),
    vocab('hyaku', 'ひゃく'),
    vocab('sen', 'せん'),
    vocab('man', 'まん'),
    vocab('fun', 'ふん'),
    vocab('han', 'はん'),
  ],
  [particleGrammar('wa', 'は'), particleGrammar('wo', 'を'), particleGrammar('no', 'の')],
)

function wrap(ui: ReactNode, store: ContentStore | null = fullStore, path?: string) {
  return render(
    <ContentContext.Provider value={{ store, loading: false, error: null, reload: () => {} }}>
      <ProgressContext.Provider value={progressStub}>
        <MemoryRouter initialEntries={path ? [path] : undefined}>{ui}</MemoryRouter>
      </ProgressContext.Provider>
    </ContentContext.Provider>,
  )
}

describe('registry availability', () => {
  it('all shipped modes are available once their classes are committed', () => {
    for (const m of EXERCISE_MODES) {
      expect(m.isAvailable(fullStore), m.id).toBe(true)
    }
  })

  it('no mode is available on an empty store (topic not taught yet)', () => {
    const empty = makeStore([], [])
    for (const m of EXERCISE_MODES) {
      expect(m.isAvailable(empty), m.id).toBe(false)
    }
  })

  it('modeById resolves every registered id and rejects unknowns', () => {
    for (const m of EXERCISE_MODES) expect(modeById(m.id)).toBe(m)
    expect(modeById('nope')).toBeUndefined()
  })
})

describe('NumerosMode', () => {
  it('setup -> play -> reveal -> self-grade advances', () => {
    const { container } = wrap(<NumerosMode />)
    expect(container.textContent).toContain('Rango')
    fireEvent.click(screen.getByRole('button', { name: /Empezar/ }))
    expect(container.textContent).toContain('Dilo en voz alta en japonés')
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar respuesta' }))
    expect(container.textContent).toContain('Se lee')
    fireEvent.click(screen.getByRole('button', { name: /La he dicho bien/ }))
    // next number is asked, back in unrevealed state
    expect(container.textContent).toContain('Mostrar respuesta')
  })
})

describe('DiasMode', () => {
  it('intro shows the 7-day mnemonic table and the drill starts with 4 options', () => {
    const { container } = wrap(<DiasMode />)
    for (const d of DAYS) expect(container.textContent).toContain(d.es)
    expect(container.textContent).toContain('ようび')
    fireEvent.click(screen.getByRole('button', { name: 'Empezar el drill' }))
    // question card + 4 tappable options (plus the back button)
    const options = [...container.querySelectorAll('button')].filter(
      (b) => b.getAttribute('aria-label') !== 'Volver',
    )
    expect(options).toHaveLength(4)
  })
})

describe('HorasMode', () => {
  it('setup lists the 3 levels and play shows a 4-option question', () => {
    const { container } = wrap(<HorasMode />)
    expect(container.textContent).toContain('En punto y media')
    expect(container.textContent).toContain('Minutos 1–10')
    fireEvent.click(screen.getByRole('button', { name: /Empezar/ }))
    expect(container.textContent).toMatch(/¿Cómo se lee esta hora\?|¿Qué hora es\?/)
    const options = [...container.querySelectorAll('button')].filter(
      (b) => b.getAttribute('aria-label') !== 'Volver',
    )
    expect(options).toHaveLength(4)
  })
})

describe('ParticulasMode', () => {
  it('drills the committed particle clozes directly', () => {
    const { container } = wrap(<ParticulasMode />)
    expect(container.textContent).toContain('Completa la frase')
    expect(container.textContent).toContain('＿＿')
    expect(container.textContent).toContain('Esto es un libro.')
  })

  it('degrades gracefully when no particle examples exist', () => {
    const { container } = wrap(<ParticulasMode />, makeStore([], []))
    expect(container.textContent).toContain('Sin frases todavía')
  })
})

describe('/ejercicios/:modeId route (Ejercicio view)', () => {
  const routed = (path: string) =>
    wrap(
      <Routes>
        <Route path="/ejercicios/:modeId" element={<Ejercicio />} />
      </Routes>,
      fullStore,
      path,
    )

  it('renders the mode component for a registered id', () => {
    const { container } = routed('/ejercicios/dias')
    expect(container.textContent).toContain('Días de la semana')
  })

  it('shows the not-found card for an unknown id', () => {
    const { container } = routed('/ejercicios/desconocido')
    expect(container.textContent).toContain('Ejercicio no encontrado')
  })
})

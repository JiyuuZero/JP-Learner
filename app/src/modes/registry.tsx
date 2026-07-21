// Exercise-mode registry (skill step 7) — dedicated, independently-launchable
// practice modes ON TOP of the flashcards (cards stay the primary system and
// keep every item; modes never write SRS records). Each mode is a
// self-contained component under src/modes/<id>/ that reads ONLY committed
// content and/or deterministic generated readings, and reveals Japanese via
// JapaneseText so the user's script-display config always applies.
//
// To add a mode: create src/modes/<id>/<Name>Mode.tsx, append an entry here.
// Availability derives from committed content (a mode only appears once the
// class that taught its topic has been processed) — never hardcode class ids.
import type { ComponentType } from 'react'
import { CalendarDays, Clock, Hash } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ContentStore } from '../content/store'
import NumerosMode from './numeros/NumerosMode'
import DiasMode from './dias/DiasMode'
import { DAYS } from './dias/dias'
import HorasMode from './horas/HorasMode'

export interface ExerciseMode {
  id: string // route: /ejercicios/<id>
  title: string
  tagline: string // one-liner under the tile title (Home)
  tint: 'lavender' | 'mint' | 'peach' | 'softblue'
  Icon: LucideIcon
  isAvailable: (store: ContentStore) => boolean
  Component: ComponentType
}

// Availability helper: every listed kana reading exists in committed vocab.
export function hasVocabKana(store: ContentStore, ...kanas: string[]): boolean {
  const all = new Set([...store.vocabById.values()].map((v) => v.kana))
  return kanas.every((k) => all.has(k))
}

export const EXERCISE_MODES: ExerciseMode[] = [
  {
    id: 'numeros',
    title: 'Números',
    tagline: 'Del 0 al 99 999, en voz alta',
    tint: 'softblue',
    Icon: Hash,
    // Needs 百/千/万 taught (2026-07-17); digits 0-10 came earlier (2026-07-08).
    isAvailable: (store) => hasVocabKana(store, 'ひゃく', 'せん', 'まん'),
    Component: NumerosMode,
  },
  {
    id: 'dias',
    title: 'Días de la semana',
    tagline: 'Los 7 〜ようび hasta dominarlos',
    tint: 'mint',
    Icon: CalendarDays,
    // Needs the 7 day words taught (2026-07-17).
    isAvailable: (store) => hasVocabKana(store, ...DAYS.map((d) => d.kana)),
    Component: DiasMode,
  },
  {
    id: 'horas',
    title: 'Horas',
    tagline: '〜じ・〜ふん・はん, ida y vuelta',
    tint: 'lavender',
    Icon: Clock,
    // Hours came in 2026-07-15; ふん + はん complete the system (2026-07-20).
    isAvailable: (store) => hasVocabKana(store, 'ふん', 'はん'),
    Component: HorasMode,
  },
]

export const modeById = (id: string): ExerciseMode | undefined =>
  EXERCISE_MODES.find((m) => m.id === id)

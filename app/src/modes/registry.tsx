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
import type { LucideIcon } from 'lucide-react'
import type { ContentStore } from '../content/store'

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

export const EXERCISE_MODES: ExerciseMode[] = []

export const modeById = (id: string): ExerciseMode | undefined =>
  EXERCISE_MODES.find((m) => m.id === id)

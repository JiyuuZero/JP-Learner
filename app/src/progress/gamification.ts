// Light non-punitive gamification (GAM-01/02/03).
// - Streak (GAM-01) lives in day.ts (bumpStreak) — LOCAL-calendar days (SRS-04).
// - Progress % (GAM-02) below: motivational, monotonic-ish.
// - Points (GAM-03): only ever INCREASE — never decremented, never a gate.
import { State } from 'ts-fsrs'
import type { ContentStore } from '../content/store'
import type { ProgressMeta, SrsRecord } from './db'

// GAM-02: % = count(srs records in FSRS Review state) / reviewable universe.
// Reviewable universe = vocabById.size + grammarById.size (RESEARCH formula).
// Kanji SRS records are excluded from the numerator so the two sides match
// (kanji cards are optional and not part of the denominator).
export function progressPercent(store: ContentStore, srsByItem: Map<string, SrsRecord>): number {
  const total = store.vocabById.size + store.grammarById.size
  if (total === 0) return 0 // divide-by-zero guard -> 0
  let inReview = 0
  for (const rec of srsByItem.values()) {
    if (rec.itemType !== 'kanji' && rec.card.state === State.Review) inReview++
  }
  return Math.min(100, Math.round((inReview / total) * 100))
}

// GAM-03: returns meta with points incremented. Points ONLY ever go up:
// zero/negative deltas are ignored, so no caller can ever reduce them.
export function addPoints(meta: ProgressMeta, delta: number): ProgressMeta {
  if (delta <= 0) return meta
  return { ...meta, points: meta.points + delta }
}

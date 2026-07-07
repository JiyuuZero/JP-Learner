import { describe, expect, it } from 'vitest'
import { Rating, State, TypeConvert, fsrs } from 'ts-fsrs'
import { gradeItem } from './srs'
import type { SrsRecord } from './db'

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/

describe('gradeItem', () => {
  it('creates an empty card for a brand-new item and returns a serialized SrsRecord with ISO dates', () => {
    const now = new Date('2026-04-14T10:00:00Z')
    const { record } = gradeItem(
      undefined,
      '2026-04-14:vocab:tabemasu',
      'vocab',
      '2026-04-14',
      Rating.Good,
      now,
    )
    expect(record.itemId).toBe('2026-04-14:vocab:tabemasu')
    expect(record.itemType).toBe('vocab')
    expect(record.classId).toBe('2026-04-14')
    expect(typeof record.card.due).toBe('string')
    expect(record.card.due).toMatch(ISO_RE)
    expect(record.card.last_review).toMatch(ISO_RE)
    expect(record.card.reps).toBe(1)
    expect([0, 1, 2, 3]).toContain(record.card.state)
  })

  it('reports graduatedToReview exactly once at the New/Learning -> Review transition when grading Good repeatedly', () => {
    let rec: SrsRecord | undefined
    let now = new Date('2026-04-14T10:00:00Z')
    const graduations: number[] = []

    for (let i = 0; i < 8; i++) {
      const out = gradeItem(rec, 'id:x', 'vocab', '2026-04-14', Rating.Good, now)
      if (out.graduatedToReview) graduations.push(i)
      rec = out.record
      // review again exactly when the card comes due
      now = new Date(rec.card.due)
    }

    expect(graduations).toHaveLength(1)
    expect(rec!.card.state).toBe(State.Review)

    // The transition happened at the recorded step: before it the card was not
    // yet in Review, after it (with only Good grades) it stays in Review.
    expect(graduations[0]).toBeGreaterThan(0) // never on the very first grade with default 2 learning steps
  })

  it('returns a record whose card round-trips through TypeConvert.card() and scheduler.next() without throwing', () => {
    const now = new Date('2026-04-14T10:00:00Z')
    const { record } = gradeItem(undefined, 'id:y', 'kanji', '2026-04-14', Rating.Good, now)

    // Simulate IndexedDB persistence: structured-clone-safe plain object with ISO strings
    const persisted = JSON.parse(JSON.stringify(record)) as SrsRecord

    const live = TypeConvert.card(persisted.card)
    expect(live.due).toBeInstanceOf(Date)
    const scheduler = fsrs()
    expect(() => scheduler.next(live, new Date(persisted.card.due), Rating.Good)).not.toThrow()
  })

  it('keeps grading an existing record via rehydration (one shared card per item)', () => {
    const now = new Date('2026-04-14T10:00:00Z')
    const first = gradeItem(undefined, 'id:z', 'grammar', '2026-04-14', Rating.Good, now)
    const second = gradeItem(
      first.record,
      'id:z',
      'grammar',
      '2026-04-14',
      Rating.Again,
      new Date(first.record.card.due),
    )
    expect(second.record.card.reps).toBe(2)
    expect(second.record.card.lapses).toBeGreaterThanOrEqual(first.record.card.lapses)
  })
})

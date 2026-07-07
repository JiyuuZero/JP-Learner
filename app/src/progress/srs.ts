// FSRS integration (SRS-01/02) — ONE Card per item, shared across all exercise
// types. Vary the presentation, never the schedule.
import { createEmptyCard, fsrs, Rating, State, TypeConvert, type Card, type Grade } from 'ts-fsrs'
import type { SrsRecord } from './db'

// FSRS-6 defaults: request_retention 0.9, enable_fuzz false,
// enable_short_term true, learning_steps ['1m','10m'], relearning ['10m']
const scheduler = fsrs()

export function gradeItem(
  rec: SrsRecord | undefined,
  itemId: string,
  itemType: SrsRecord['itemType'],
  classId: string,
  grade: Grade,
  now = new Date(),
): { record: SrsRecord; graduatedToReview: boolean } {
  const card = rec ? TypeConvert.card(rec.card) : createEmptyCard(now)
  const { card: next } = scheduler.next(card, now, grade)
  // D-03 auto-learn trigger: fires at the New/Learning -> Review transition
  const graduatedToReview = card.state !== State.Review && next.state === State.Review
  return { record: serialize(itemId, itemType, classId, next), graduatedToReview }
}

// Date -> ISO string so the record is IndexedDB/JSON-safe; rehydrate with TypeConvert.card().
export function serialize(
  itemId: string,
  itemType: SrsRecord['itemType'],
  classId: string,
  card: Card,
): SrsRecord {
  return {
    itemId,
    itemType,
    classId,
    card: {
      due: card.due.toISOString(),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      learning_steps: card.learning_steps,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state as 0 | 1 | 2 | 3,
      ...(card.last_review ? { last_review: card.last_review.toISOString() } : {}),
    },
  }
}

// Grade mapping per exercise (FEATURES.md, made concrete):
//
// | Exercise                                   | Wrong | Correct    |
// |--------------------------------------------|-------|------------|
// | Flashcard (EXER-01)                        | user picks — expose all 4 buttons |
// |                                            | (Otra vez/Difícil/Bien/Fácil = Again/Hard/Good/Easy) |
// | Typing (EXER-03)                           | Again | Good       |
// | Multiple choice / word-bank / matching     | Again | Good       |
// | (EXER-02/04/05) — coarse binary signal     |       |            |
export function gradeForAnswer(correct: boolean): Grade {
  return correct ? Rating.Good : Rating.Again
}

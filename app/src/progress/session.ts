// Session builder — review scope x sub-modes (SRS-03 + D-02).
//
// The scope selector (Hoy/Semana/Total) and the sub-mode selector
// (Repaso SRS / Repasar periodo) are ORTHOGONAL and combine into the session
// item list. Scope windows use LOCAL CALENDAR comparisons on content class
// dates — never timestamp deltas.
//
// D-01 hybrid note: in automatic mode the engine picks the exercise TYPE per
// item by simple rotation/random over the available types — NOT by card
// maturity (maturity-adaptive selection is v2, ADAPT-01). Manual mode uses the
// same buildSession item list but forces a single exercise type.
import { TypeConvert } from 'ts-fsrs'
import { localDayKey, startOfLocalWeek } from './day'
import type { ProgressMeta, SrsRecord } from './db'
import type { ContentStore } from '../content/store'
import type { Grammar, Kanji, Vocab } from '../content/content'

export type ReviewScope = 'hoy' | 'semana' | 'total'
export type SubMode = 'srs' | 'periodo' // D-02: Repaso SRS / Repasar periodo

export type ReviewableItem = Vocab | Grammar | Kanji

export interface SessionItem {
  item: ReviewableItem
  classId: string
  classDate: string // YYYY-MM-DD
}

// SRS-05 daily new-card cap (~10/day — stops the post-vacation wall of cards)
export const NEW_CARDS_PER_DAY = 10

// scope → the date window (local calendar) applied to CONTENT class dates
export function inScope(classDate: string, scope: ReviewScope, now = new Date()): boolean {
  if (scope === 'total') return true
  const cd = new Date(classDate + 'T00:00:00')
  if (scope === 'hoy') return localDayKey(cd) === localDayKey(now)
  /* semana */ return cd >= startOfLocalWeek(now)
}

export function allReviewableItems(store: ContentStore): SessionItem[] {
  const dateByClass = new Map(store.classes.map((c) => [c.id, c.date]))
  const out: SessionItem[] = []
  for (const [classId, bucket] of store.byClass) {
    const classDate = dateByClass.get(classId) ?? classId
    for (const item of [...bucket.vocab, ...bucket.grammar, ...bucket.kanji]) {
      out.push({ item, classId, classDate })
    }
  }
  return out
}

// sub-mode → whether SRS-due filtering is applied on top of scope.
//  - 'periodo': everything in the block, due or not (D-02b, repaso intensivo)
//  - 'srs':     only what's due by the FSRS calendar; never-seen items count as
//               due but their intake is capped per local day via
//               meta.newCardsToday/newCardsDay (SRS-05, reset on day change).
// Ordering: reviews before new items.
export function buildSession(
  store: ContentStore,
  srsByItem: Map<string, SrsRecord>,
  scope: ReviewScope,
  subMode: SubMode,
  now = new Date(),
  meta?: ProgressMeta,
): SessionItem[] {
  const items = allReviewableItems(store).filter((si) => inScope(si.classDate, scope, now))
  if (subMode === 'periodo') return items // Repasar periodo: todo el bloque (D-02b)

  const due = items.filter((si) => {
    const rec = srsByItem.get(si.item.id)
    if (!rec) return true // new (never seen) counts as due
    return TypeConvert.card(rec.card).due <= now // due by FSRS calendar
  })

  const reviews = due.filter((si) => srsByItem.has(si.item.id))
  const fresh = due.filter((si) => !srsByItem.has(si.item.id))

  // SRS-05: cap new-card intake per local day
  const usedToday = meta && meta.newCardsDay === localDayKey(now) ? meta.newCardsToday : 0
  const remaining = Math.max(0, NEW_CARDS_PER_DAY - usedToday)

  return [...reviews, ...fresh.slice(0, remaining)]
}

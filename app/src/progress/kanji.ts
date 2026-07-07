// Learned-kanji engine (D-03) — feeds the Mode B progressive-kanji substitution.
//
// Two entry points:
//  - auto:   when gradeItem reports graduatedToReview, every kanji char of the
//            vocab/kanji item is added with source:'auto'
//  - manual: the user toggles chars explicitly. A MANUAL REMOVAL writes a
//            suppression marker (learnedAt:'') so a later auto-graduation never
//            re-adds the char — the user's explicit choice always wins.
import type { IDBPDatabase } from 'idb'
import type { JPDB, LearnedKanji } from './db'
import type { Kanji, Vocab } from '../content/content'

export async function markLearned(
  db: IDBPDatabase<JPDB>,
  char: string,
  source: 'auto' | 'manual' = 'manual',
): Promise<void> {
  await db.put('learnedKanji', { char, learnedAt: new Date().toISOString(), source })
}

// Manual unmark: replaces the record with a suppression marker instead of
// deleting it, so autoLearnFromGraduation can respect the removal (D-03).
export async function unmarkLearned(db: IDBPDatabase<JPDB>, char: string): Promise<void> {
  await db.put('learnedKanji', { char, learnedAt: '', source: 'manual' })
}

export function kanjiCharsOf(item: Vocab | Kanji): string[] {
  if (item.type === 'kanji') return [item.char]
  return item.tokens.flatMap((t) => t.kanji ?? [])
}

// Mode B auto-learn: call when gradeItem reports graduatedToReview === true.
// Returns the chars actually added (skips manual-state chars and already-learned ones).
export async function autoLearnFromGraduation(
  db: IDBPDatabase<JPDB>,
  item: Vocab | Kanji,
): Promise<string[]> {
  const added: string[] = []
  for (const char of new Set(kanjiCharsOf(item))) {
    const existing: LearnedKanji | undefined = await db.get('learnedKanji', char)
    if (existing?.source === 'manual') continue // manual state (learned OR suppressed) always wins
    if (existing && existing.learnedAt !== '') continue // already learned
    await db.put('learnedKanji', { char, learnedAt: new Date().toISOString(), source: 'auto' })
    added.push(char)
  }
  return added
}

// The learned set consumed by Mode B rendering — suppression markers excluded.
export async function loadLearnedSet(db: IDBPDatabase<JPDB>): Promise<Set<string>> {
  const all = await db.getAll('learnedKanji')
  return new Set(all.filter((k) => k.learnedAt !== '').map((k) => k.char))
}

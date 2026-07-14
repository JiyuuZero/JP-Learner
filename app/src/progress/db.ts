// Progress persistence (PROG-01..05) — IndexedDB via idb.
// Progress references content BY ID ONLY — never embeds content text (PROG-04).
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export const APP_VERSION = 1 // == IndexedDB version; bump + migrate on shape change

export interface SrsRecord {
  itemId: string // == content id, e.g. "2026-04-14:vocab:tabemasu"
  itemType: 'vocab' | 'grammar' | 'kanji'
  card: {
    // ts-fsrs Card, dates as ISO strings
    due: string
    stability: number
    difficulty: number
    elapsed_days: number
    scheduled_days: number
    learning_steps: number
    reps: number
    lapses: number
    state: 0 | 1 | 2 | 3
    last_review?: string
  }
  classId: string // for review-scope filtering without a content join
}

export interface LearnedKanji {
  char: string
  learnedAt: string // ISO; '' == manual-removal suppression marker (D-03)
  source: 'auto' | 'manual'
}

export interface ProgressMeta {
  // single record, key "singleton"
  key: 'singleton'
  streakCount: number
  lastActiveDay: string // YYYY-MM-DD local
  points: number
  displayMode: 'A' | 'B' | 'C'
  romajiVisible: boolean // Mode A romaji toggle (UI-SPEC settings)
  newCardsToday: number
  newCardsDay: string // YYYY-MM-DD, for the daily cap (SRS-05)
  appVersion: number // schema version stamp for export/migration
  // Favorited item ids (UI-02) — content referenced BY ID ONLY (PROG-04).
  // Additive field: pre-existing meta records read it as undefined -> [].
  favorites?: string[]
  // Shared class-ordering preference for the Glosario + Gramática lists.
  // Additive+optional: pre-existing meta reads it as undefined -> 'asc'.
  classSortDir?: 'asc' | 'desc'
}

export interface JPDB extends DBSchema {
  srs: { key: string; value: SrsRecord; indexes: { byDue: string; byClass: string } }
  learnedKanji: { key: string; value: LearnedKanji }
  meta: { key: string; value: ProgressMeta }
}

export function openProgress(): Promise<IDBPDatabase<JPDB>> {
  return openDB<JPDB>('jp-learner', APP_VERSION, {
    upgrade(db, oldVersion /*, newVersion, tx */) {
      // MIGRATIONS ARE ADDITIVE + IDEMPOTENT. Never recreate stores that hold data.
      if (oldVersion < 1) {
        const srs = db.createObjectStore('srs', { keyPath: 'itemId' })
        srs.createIndex('byDue', 'card.due')
        srs.createIndex('byClass', 'classId')
        db.createObjectStore('learnedKanji', { keyPath: 'char' })
        db.createObjectStore('meta', { keyPath: 'key' })
      }
      // if (oldVersion < 2) { /* future: transform existing records here */ }
    },
    blocked() {
      /* another tab holds an older version open — prompt reload */
    },
    blocking() {
      /* this tab blocks a newer version — close/reload */
    },
  })
}

// PROG-05: request durable storage on first meaningful interaction; surface the boolean.
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist() // best-effort; materially better for installed PWAs
}

export function createDefaultMeta(now = new Date()): ProgressMeta {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const today = `${y}-${m}-${dd}`
  return {
    key: 'singleton',
    streakCount: 0,
    lastActiveDay: '',
    points: 0,
    displayMode: 'A',
    romajiVisible: true,
    newCardsToday: 0,
    newCardsDay: today,
    appVersion: APP_VERSION,
    favorites: [],
    classSortDir: 'asc',
  }
}

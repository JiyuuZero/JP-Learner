// Export/Import (PROG-02/03) — the ONLY progress backup (iOS evicts IndexedDB
// after 7 days; git holds content, THIS holds progress).
// Backup format FROZEN v1:
//   { backupVersion:1, appVersion, exportedAt, srs:SrsRecord[], learnedKanji:LearnedKanji[], meta:ProgressMeta }
//
// Threat model: an imported file is untrusted input crossing into local storage
// (T-04-01/T-04-02). importProgress validates shape + backupVersion FIRST and
// NEVER clears on rejection (fail-closed). Imported fields are data only —
// never eval'd, never rendered as raw HTML (only as React text children).
import type { IDBPDatabase } from 'idb'
import {
  APP_VERSION,
  createDefaultMeta,
  type JPDB,
  type LearnedKanji,
  type ProgressMeta,
  type SrsRecord,
} from './db'
import { localDayKey } from './day'

export interface ProgressBackup {
  backupVersion: 1
  appVersion: number
  exportedAt: string
  srs: SrsRecord[]
  learnedKanji: LearnedKanji[]
  meta: ProgressMeta
}

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupValidationError'
  }
}

export async function exportProgress(db: IDBPDatabase<JPDB>): Promise<ProgressBackup> {
  const [srs, learnedKanji, meta] = await Promise.all([
    db.getAll('srs'),
    db.getAll('learnedKanji'),
    db.get('meta', 'singleton'),
  ])
  return {
    backupVersion: 1,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    srs,
    learnedKanji,
    meta: meta ?? createDefaultMeta(),
  }
}

// UI helper: trigger the Blob download (jp-learner-backup-YYYY-MM-DD.json).
export function downloadBackup(backup: ProgressBackup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `jp-learner-backup-${localDayKey()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ---- shape validation (fail-closed, T-04-02) --------------------------------

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

function isSrsRecord(v: unknown): v is SrsRecord {
  if (!isObj(v)) return false
  if (!isStr(v.itemId) || !isStr(v.classId)) return false
  if (v.itemType !== 'vocab' && v.itemType !== 'grammar' && v.itemType !== 'kanji') return false
  const c = v.card
  if (!isObj(c)) return false
  return (
    isStr(c.due) &&
    isNum(c.stability) &&
    isNum(c.difficulty) &&
    isNum(c.elapsed_days) &&
    isNum(c.scheduled_days) &&
    isNum(c.learning_steps) &&
    isNum(c.reps) &&
    isNum(c.lapses) &&
    (c.state === 0 || c.state === 1 || c.state === 2 || c.state === 3) &&
    (c.last_review === undefined || isStr(c.last_review))
  )
}

function isLearnedKanji(v: unknown): v is LearnedKanji {
  if (!isObj(v)) return false
  return isStr(v.char) && isStr(v.learnedAt) && (v.source === 'auto' || v.source === 'manual')
}

function isProgressMeta(v: unknown): v is ProgressMeta {
  if (!isObj(v)) return false
  return (
    v.key === 'singleton' &&
    isNum(v.streakCount) &&
    isStr(v.lastActiveDay) &&
    isNum(v.points) &&
    (v.displayMode === 'A' || v.displayMode === 'B' || v.displayMode === 'C') &&
    isBool(v.romajiVisible) &&
    isNum(v.newCardsToday) &&
    isStr(v.newCardsDay) &&
    isNum(v.appVersion) &&
    // favorites is additive+optional (item-id strings only, PROG-04)
    (v.favorites === undefined || (Array.isArray(v.favorites) && v.favorites.every(isStr)))
  )
}

export function validateBackup(parsed: unknown): ProgressBackup {
  if (!isObj(parsed)) throw new BackupValidationError('El archivo no es un backup válido.')
  if (parsed.backupVersion !== 1) {
    throw new BackupValidationError(
      `Versión de backup desconocida (${String(parsed.backupVersion)}). Se esperaba la versión 1.`,
    )
  }
  if (!isNum(parsed.appVersion) || !isStr(parsed.exportedAt)) {
    throw new BackupValidationError('Faltan campos appVersion/exportedAt en el backup.')
  }
  if (!Array.isArray(parsed.srs) || !parsed.srs.every(isSrsRecord)) {
    throw new BackupValidationError('El bloque "srs" del backup no tiene la forma esperada.')
  }
  if (!Array.isArray(parsed.learnedKanji) || !parsed.learnedKanji.every(isLearnedKanji)) {
    throw new BackupValidationError('El bloque "learnedKanji" del backup no tiene la forma esperada.')
  }
  if (!isProgressMeta(parsed.meta)) {
    throw new BackupValidationError('El bloque "meta" del backup no tiene la forma esperada.')
  }
  return parsed as unknown as ProgressBackup
}

// Validates FIRST (throws BackupValidationError, never touches the stores on
// rejection), then clears the 3 stores and bulk-puts inside one transaction.
// Card ISO strings are stored as-is; rehydrate with TypeConvert.card() downstream.
export async function importProgress(db: IDBPDatabase<JPDB>, parsed: unknown): Promise<void> {
  const backup = validateBackup(parsed)

  const tx = db.transaction(['srs', 'learnedKanji', 'meta'], 'readwrite')
  const srsStore = tx.objectStore('srs')
  const kanjiStore = tx.objectStore('learnedKanji')
  const metaStore = tx.objectStore('meta')

  await Promise.all([srsStore.clear(), kanjiStore.clear(), metaStore.clear()])
  await Promise.all([
    ...backup.srs.map((r) => srsStore.put(r)),
    ...backup.learnedKanji.map((k) => kanjiStore.put(k)),
    metaStore.put(backup.meta),
  ])
  await tx.done
}

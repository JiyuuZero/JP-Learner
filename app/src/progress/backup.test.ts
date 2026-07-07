import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { Rating, TypeConvert, fsrs } from 'ts-fsrs'
import type { IDBPDatabase } from 'idb'
import { createDefaultMeta, openProgress, type JPDB, type LearnedKanji } from './db'
import { gradeItem } from './srs'
import { exportProgress, importProgress } from './backup'

async function seededDb(): Promise<IDBPDatabase<JPDB>> {
  const db = await openProgress()

  // realistic SRS records produced by the actual grading path
  const a = gradeItem(
    undefined,
    '2026-04-14:vocab:tabemasu',
    'vocab',
    '2026-04-14',
    Rating.Good,
    new Date('2026-04-14T10:00:00Z'),
  ).record
  const b = gradeItem(
    undefined,
    '2026-04-14:kanji:hon',
    'kanji',
    '2026-04-14',
    Rating.Again,
    new Date('2026-04-14T10:05:00Z'),
  ).record
  await db.put('srs', a)
  await db.put('srs', b)

  const learned: LearnedKanji[] = [
    { char: '食', learnedAt: '2026-04-14T11:00:00.000Z', source: 'auto' },
    { char: '本', learnedAt: '', source: 'manual' }, // suppression marker (D-03 manual removal)
  ]
  for (const k of learned) await db.put('learnedKanji', k)

  await db.put('meta', {
    ...createDefaultMeta(new Date('2026-04-14T12:00:00Z')),
    streakCount: 4,
    lastActiveDay: '2026-04-14',
    points: 120,
    displayMode: 'B',
    newCardsToday: 3,
  })
  return db
}

async function snapshot(db: IDBPDatabase<JPDB>) {
  return {
    srs: await db.getAll('srs'),
    learnedKanji: await db.getAll('learnedKanji'),
    meta: await db.getAll('meta'),
  }
}

async function clearAll(db: IDBPDatabase<JPDB>) {
  const tx = db.transaction(['srs', 'learnedKanji', 'meta'], 'readwrite')
  await Promise.all([
    tx.objectStore('srs').clear(),
    tx.objectStore('learnedKanji').clear(),
    tx.objectStore('meta').clear(),
  ])
  await tx.done
}

describe('export -> clear -> import round-trip', () => {
  beforeEach(() => {
    // fresh IndexedDB per test
    globalThis.indexedDB = new IDBFactory()
  })

  it('restores all 3 stores byte-identically', async () => {
    const db = await seededDb()
    const before = await snapshot(db)

    const backup = await exportProgress(db)
    // simulate the file round-trip: serialize to JSON text and parse back
    const parsed = JSON.parse(JSON.stringify(backup))

    await clearAll(db)
    expect(await db.getAll('srs')).toHaveLength(0)

    await importProgress(db, parsed)
    const after = await snapshot(db)

    expect(after).toEqual(before)
    expect(JSON.stringify(after)).toBe(JSON.stringify(before)) // byte-identical
    db.close()
  })

  it('rehydrated imported cards are accepted by scheduler.next()', async () => {
    const db = await seededDb()
    const backup = JSON.parse(JSON.stringify(await exportProgress(db)))
    await clearAll(db)
    await importProgress(db, backup)

    const rec = await db.get('srs', '2026-04-14:vocab:tabemasu')
    expect(rec).toBeDefined()
    const live = TypeConvert.card(rec!.card)
    expect(live.due).toBeInstanceOf(Date)
    const scheduler = fsrs()
    expect(() => scheduler.next(live, new Date(rec!.card.due), Rating.Good)).not.toThrow()
    db.close()
  })

  it('rejects a backup with a wrong backupVersion and does NOT clear existing data', async () => {
    const db = await seededDb()
    const before = await snapshot(db)
    const bad = { ...JSON.parse(JSON.stringify(await exportProgress(db))), backupVersion: 2 }

    await expect(importProgress(db, bad)).rejects.toThrow()
    expect(await snapshot(db)).toEqual(before) // untouched
    db.close()
  })

  it('rejects a backup with a missing backupVersion and does NOT clear existing data', async () => {
    const db = await seededDb()
    const before = await snapshot(db)

    await expect(importProgress(db, {})).rejects.toThrow()
    await expect(importProgress(db, null)).rejects.toThrow()
    await expect(importProgress(db, 'not an object')).rejects.toThrow()
    expect(await snapshot(db)).toEqual(before)
    db.close()
  })

  it('rejects malformed store arrays (fail-closed shape validation) without clearing', async () => {
    const db = await seededDb()
    const before = await snapshot(db)
    const good = JSON.parse(JSON.stringify(await exportProgress(db)))

    await expect(importProgress(db, { ...good, srs: [{ nope: true }] })).rejects.toThrow()
    await expect(importProgress(db, { ...good, srs: 'not-an-array' })).rejects.toThrow()
    await expect(
      importProgress(db, { ...good, learnedKanji: [{ char: 5, learnedAt: '', source: 'auto' }] }),
    ).rejects.toThrow()
    await expect(importProgress(db, { ...good, meta: null })).rejects.toThrow()
    expect(await snapshot(db)).toEqual(before)
    db.close()
  })
})

// React context exposing the progress subsystem to all views.
// On mount: opens IndexedDB, loads meta (creating the singleton if absent),
// loads the learned-kanji set and the SRS record map. navigator.storage.persist()
// is requested on the first meaningful interaction and its result surfaced
// via `persisted` (PROG-05).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { IDBPDatabase } from 'idb'
import { Rating, type Grade } from 'ts-fsrs'
import {
  createDefaultMeta,
  openProgress,
  requestPersistence,
  type JPDB,
  type ProgressMeta,
  type SrsRecord,
} from './db'
import { bumpStreak, localDayKey } from './day'
import { gradeItem } from './srs'
import { downloadBackup, exportProgress, importProgress } from './backup'
import {
  autoLearnFromGraduation,
  loadLearnedSet,
  markLearned as putLearned,
  unmarkLearned as putSuppressed,
} from './kanji'
import type { Kanji, Vocab } from '../content/content'

export interface ProgressContextValue {
  ready: boolean
  meta: ProgressMeta | null
  learnedSet: Set<string>
  srsByItem: Map<string, SrsRecord>
  // navigator.storage.persist() result (PROG-05); null = not requested yet
  persisted: boolean | null
  grade: (
    itemId: string,
    itemType: SrsRecord['itemType'],
    classId: string,
    grade: Grade,
    item?: Vocab | Kanji,
  ) => Promise<void>
  exportBackup: () => Promise<void>
  importBackup: (parsed: unknown) => Promise<void>
  markLearned: (char: string) => Promise<void>
  unmarkLearned: (char: string) => Promise<void>
  setDisplayMode: (mode: ProgressMeta['displayMode']) => Promise<void>
  setRomajiVisible: (visible: boolean) => Promise<void>
}

export const ProgressContext = createContext<ProgressContextValue | null>(null)

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within <ProgressProvider>')
  return ctx
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const dbRef = useRef<IDBPDatabase<JPDB> | null>(null)
  const persistRequested = useRef(false)
  const [ready, setReady] = useState(false)
  const [meta, setMeta] = useState<ProgressMeta | null>(null)
  const [learnedSet, setLearnedSet] = useState<Set<string>>(new Set())
  const [srsByItem, setSrsByItem] = useState<Map<string, SrsRecord>>(new Map())
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const db = await openProgress()
      if (cancelled) {
        db.close()
        return
      }
      dbRef.current = db
      let m = await db.get('meta', 'singleton')
      if (!m) {
        m = createDefaultMeta()
        await db.put('meta', m)
      }
      const [set, all] = await Promise.all([loadLearnedSet(db), db.getAll('srs')])
      if (cancelled) return
      setMeta(m)
      setLearnedSet(set)
      setSrsByItem(new Map(all.map((r) => [r.itemId, r])))
      setReady(true)
    })().catch(() => setReady(true)) // progress unavailable ≠ app unusable
    return () => {
      cancelled = true
      dbRef.current?.close()
      dbRef.current = null
    }
  }, [])

  // PROG-05: request durable storage on the first meaningful interaction.
  const ensurePersistence = useCallback(async () => {
    if (persistRequested.current) return
    persistRequested.current = true
    try {
      setPersisted(await requestPersistence())
    } catch {
      setPersisted(false)
    }
  }, [])

  const putMeta = useCallback(async (m: ProgressMeta) => {
    const db = dbRef.current
    if (db) await db.put('meta', m)
    setMeta(m)
  }, [])

  const grade = useCallback<ProgressContextValue['grade']>(
    async (itemId, itemType, classId, g, item) => {
      const db = dbRef.current
      if (!db) return
      void ensurePersistence()
      const now = new Date()

      const prev = await db.get('srs', itemId)
      const { record, graduatedToReview } = gradeItem(prev, itemId, itemType, classId, g, now)
      await db.put('srs', record)
      setSrsByItem((map) => new Map(map).set(itemId, record))

      let m = (await db.get('meta', 'singleton')) ?? createDefaultMeta(now)
      m = bumpStreak(m, now)
      // Non-punitive points (GAM-03): +1 per correct answer, never decrement.
      if (g !== Rating.Again) m = { ...m, points: m.points + 1 }
      if (!prev) {
        // SRS-05 intake accounting: this item consumed one new-card slot today.
        const today = localDayKey(now)
        m =
          m.newCardsDay === today
            ? { ...m, newCardsToday: m.newCardsToday + 1 }
            : { ...m, newCardsDay: today, newCardsToday: 1 }
      }
      await putMeta(m)

      // D-03 Mode B auto-learn: graduation to Review marks the item's kanji learned.
      if (graduatedToReview && item) {
        await autoLearnFromGraduation(db, item)
        setLearnedSet(await loadLearnedSet(db))
      }
    },
    [ensurePersistence, putMeta],
  )

  const exportBackup = useCallback(async () => {
    const db = dbRef.current
    if (!db) return
    void ensurePersistence()
    downloadBackup(await exportProgress(db))
  }, [ensurePersistence])

  const importBackup = useCallback(async (parsed: unknown) => {
    const db = dbRef.current
    if (!db) return
    // Validates first; throws WITHOUT clearing anything on a bad backup.
    await importProgress(db, parsed)
    const [m, set, all] = await Promise.all([
      db.get('meta', 'singleton'),
      loadLearnedSet(db),
      db.getAll('srs'),
    ])
    setMeta(m ?? createDefaultMeta())
    setLearnedSet(set)
    setSrsByItem(new Map(all.map((r) => [r.itemId, r])))
  }, [])

  const markLearned = useCallback(
    async (char: string) => {
      const db = dbRef.current
      if (!db) return
      void ensurePersistence()
      await putLearned(db, char, 'manual')
      setLearnedSet(await loadLearnedSet(db))
    },
    [ensurePersistence],
  )

  const unmarkLearned = useCallback(
    async (char: string) => {
      const db = dbRef.current
      if (!db) return
      void ensurePersistence()
      await putSuppressed(db, char)
      setLearnedSet(await loadLearnedSet(db))
    },
    [ensurePersistence],
  )

  const setDisplayMode = useCallback(
    async (mode: ProgressMeta['displayMode']) => {
      const db = dbRef.current
      const m = (await db?.get('meta', 'singleton')) ?? meta ?? createDefaultMeta()
      await putMeta({ ...m, displayMode: mode })
    },
    [meta, putMeta],
  )

  const setRomajiVisible = useCallback(
    async (visible: boolean) => {
      const db = dbRef.current
      const m = (await db?.get('meta', 'singleton')) ?? meta ?? createDefaultMeta()
      await putMeta({ ...m, romajiVisible: visible })
    },
    [meta, putMeta],
  )

  return (
    <ProgressContext.Provider
      value={{
        ready,
        meta,
        learnedSet,
        srsByItem,
        persisted,
        grade,
        exportBackup,
        importBackup,
        markLearned,
        unmarkLearned,
        setDisplayMode,
        setRomajiVisible,
      }}
    >
      {children}
    </ProgressContext.Provider>
  )
}

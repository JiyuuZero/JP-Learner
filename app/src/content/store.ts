// Read-only in-memory ContentStore (CONT-06).
// Boot flow: fetch(BASE + 'content/index.json') → each class file → merge into flat Maps.
import type {
  JPLearnerClassContent as ClassContent,
  Vocab,
  Grammar,
  Kanji,
  Note,
} from './content' // generated — never hand-edit

export interface ContentIndex {
  contentVersion: number
  generatedAt: string
  classes: ClassMeta[]
}

export interface ClassMeta {
  id: string
  date: string
  label: string
  file: string
  contentHash: string
  counts: Record<string, number>
}

export interface ContentStore {
  index: ContentIndex
  classes: ClassMeta[]
  vocabById: Map<string, Vocab>
  grammarById: Map<string, Grammar>
  kanjiById: Map<string, Kanji>
  noteById: Map<string, Note>
  byClass: Map<string, { vocab: Vocab[]; grammar: Grammar[]; kanji: Kanji[]; notes: Note[] }>
}

const BASE = import.meta.env.BASE_URL // e.g. "/JP-Learner/"

export async function loadContent(): Promise<ContentStore> {
  const index: ContentIndex = await (await fetch(`${BASE}content/index.json`)).json()
  const store: ContentStore = {
    index,
    classes: index.classes,
    vocabById: new Map(),
    grammarById: new Map(),
    kanjiById: new Map(),
    noteById: new Map(),
    byClass: new Map(),
  }
  for (const c of index.classes) {
    // ClassMeta.file is relative to the content/ root (e.g. "classes/2026-04-14.json")
    const data: ClassContent = await (await fetch(`${BASE}content/${c.file}`)).json()
    const bucket = {
      vocab: data.vocab ?? [],
      grammar: data.grammar ?? [],
      kanji: data.kanji ?? [],
      notes: data.notes ?? [],
    }
    store.byClass.set(c.id, bucket)
    for (const v of bucket.vocab) store.vocabById.set(v.id, v)
    for (const g of bucket.grammar) store.grammarById.set(g.id, g)
    for (const k of bucket.kanji) store.kanjiById.set(k.id, k)
    for (const n of bucket.notes) store.noteById.set(n.id, n)
  }
  return store
}

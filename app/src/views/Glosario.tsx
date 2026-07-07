// Glosario / biblioteca (D-04, CONT-06, DISP-01..04) — two switchable views
// (Por clase / Por categoría) + global search. Vocab rows render JA per the
// ACTIVE display mode via JapaneseText (<ruby>), plus romaji, ES and the
// Guardar/heart toggle feeding Guardados (UI-02). Tapping a row opens the item
// detail with a per-kanji "Aprendido" golden-star toggle — the manual side of
// D-03 (auto-marked FSRS-graduated kanji show the star pre-filled).
import { useState } from 'react'
import { Heart, Search, Star, X } from 'lucide-react'
import Card from '../components/Card'
import JapaneseText from '../display/JapaneseText'
import SpeakerButton from '../components/SpeakerButton'
import { useContent } from '../content/context'
import { useProgress } from '../progress/ProgressContext'
import { kanjiCharsOf } from '../progress/kanji'
import type { Grammar, Note, Vocab } from '../content/content'

type View = 'clase' | 'categoria'

function VocabRow({ item, onOpen }: { item: Vocab; onOpen: (v: Vocab) => void }) {
  const { favoriteSet, toggleFavorite } = useProgress()
  const saved = favoriteSet.has(item.id)
  return (
    <Card padding="compact">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onOpen(item)} className="min-w-0 flex-1 text-left">
          <p className="text-[20px] font-bold leading-snug">
            <JapaneseText kanji={item.kanji} kana={item.kana} romaji={item.romaji} tokens={item.tokens} />
          </p>
          <p className="text-[14px] text-muted">{item.romaji}</p>
          <p className="text-[16px] leading-normal">{item.es}</p>
        </button>
        <button
          type="button"
          aria-label={saved ? 'Quitar de guardados' : 'Guardar'}
          onClick={() => void toggleFavorite(item.id)}
          className="flex h-11 w-11 shrink-0 items-center justify-center"
        >
          <Heart size={22} strokeWidth={1.8} className={saved ? 'fill-coral text-coral' : 'text-muted'} />
        </button>
      </div>
    </Card>
  )
}

function GrammarRow({ item }: { item: Grammar }) {
  return (
    <Card padding="compact">
      <p lang="ja" className="jp-text text-[18px] font-bold leading-snug">
        {item.pattern}
      </p>
      <p className="mt-1 text-[15px] leading-normal">{item.es}</p>
      {item.examples[0] && (
        <p className="mt-2 text-[15px] leading-normal">
          <JapaneseText
            kanji={item.examples[0].kanji}
            kana={item.examples[0].kana}
            romaji={item.examples[0].romaji}
            tokens={item.examples[0].tokens}
          />
          <span className="ml-2 text-[13px] text-muted">{item.examples[0].es}</span>
        </p>
      )}
    </Card>
  )
}

function NoteRow({ item }: { item: Note }) {
  return (
    <Card padding="compact" tint="peach">
      <p className="text-[15px] leading-normal">{item.es}</p>
    </Card>
  )
}

// Item detail overlay: kanji · kana · romaji · ES · example (all per active
// mode) + TTS slot + per-kanji Aprendido toggle (DISP-03/04, D-03 manual side).
function VocabDetail({ item, onClose }: { item: Vocab; onClose: () => void }) {
  const { learnedSet, markLearned, unmarkLearned } = useProgress()
  const chars = [...new Set(kanjiCharsOf(item))]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[85dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-soft sm:rounded-3xl">
        <div className="flex items-start justify-between">
          <p className="text-[32px] font-bold leading-snug">
            <JapaneseText kanji={item.kanji} kana={item.kana} romaji={item.romaji} tokens={item.tokens} />
          </p>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-muted"
          >
            <X size={22} />
          </button>
        </div>
        <p lang="ja" className="jp-text mt-1 text-[18px]">
          {item.kana}
        </p>
        <p className="text-[15px] text-muted">{item.romaji}</p>
        <p className="mt-2 text-[18px] font-bold">{item.es}</p>
        <SpeakerButton text={item.kana} label="Pronunciación" />

        {item.example && (
          <div className="mt-4 rounded-2xl bg-lavender/40 p-4">
            <p className="text-[17px] leading-relaxed">
              <JapaneseText
                kanji={item.example.kanji}
                kana={item.example.kana}
                romaji={item.example.romaji}
                tokens={item.example.tokens}
              />
            </p>
            <p className="mt-1 text-[14px] text-muted">{item.example.es}</p>
            <SpeakerButton text={item.example.kana} />
          </div>
        )}

        {chars.length > 0 && (
          <div className="mt-5">
            <h3 className="text-[14px] font-bold text-muted">Kanji de esta palabra</h3>
            <ul className="mt-2 flex list-none flex-col gap-2 p-0">
              {chars.map((char) => {
                const learned = learnedSet.has(char)
                return (
                  <li key={char} className="flex items-center justify-between">
                    <span lang="ja" className="jp-text text-[26px] font-bold">
                      {char}
                    </span>
                    <button
                      type="button"
                      onClick={() => void (learned ? unmarkLearned(char) : markLearned(char))}
                      className={`flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-[14px] font-bold transition ${
                        learned ? 'bg-gold/25 text-ink' : 'bg-bg text-muted'
                      }`}
                    >
                      <Star
                        size={18}
                        strokeWidth={1.8}
                        className={learned ? 'fill-gold text-gold' : 'text-muted'}
                      />
                      {learned ? 'Aprendido' : 'Marcar como aprendido'}
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="mt-2 text-[12px] text-muted">
              Los kanji aprendidos aparecen con furigana en el modo B.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Glosario() {
  const { store, loading } = useContent()
  const [view, setView] = useState<View>('clase')
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<Vocab | null>(null)

  const q = query.trim().toLowerCase()
  const matchesVocab = (v: Vocab) =>
    v.kanji.includes(query.trim()) ||
    v.kana.includes(query.trim()) ||
    v.romaji.toLowerCase().includes(q) ||
    v.es.toLowerCase().includes(q)
  const matchesGrammar = (g: Grammar) =>
    g.pattern.includes(query.trim()) || g.es.toLowerCase().includes(q)

  const allVocab = store ? [...store.vocabById.values()] : []
  const allGrammar = store ? [...store.grammarById.values()] : []

  return (
    <main>
      <h1 className="text-[28px] font-extrabold leading-tight">Glosario</h1>

      {/* global search */}
      <div className="mt-4 flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-card">
        <Search size={18} className="shrink-0 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar palabra…"
          className="w-full border-0 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
        />
      </div>

      {loading ? (
        <div className="mt-6 flex flex-col gap-4">
          <p className="text-[14px] text-muted">Cargando tu contenido…</p>
          <div className="h-20 animate-pulse rounded-3xl bg-lavender/70" />
          <div className="h-20 animate-pulse rounded-3xl bg-peach/70" />
          <div className="h-20 animate-pulse rounded-3xl bg-mint/70" />
        </div>
      ) : allVocab.length === 0 && allGrammar.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <h2 className="text-[20px] font-bold">Aún no hay clases</h2>
          <p className="text-[14px] text-muted">
            Añade una clase con la skill para empezar a practicar.
          </p>
        </div>
      ) : q !== '' ? (
        // search results (across everything)
        (() => {
          const vs = allVocab.filter(matchesVocab)
          const gs = allGrammar.filter(matchesGrammar)
          if (vs.length === 0 && gs.length === 0) {
            return (
              <div className="mt-12 flex flex-col items-center gap-2 text-center">
                <h2 className="text-[20px] font-bold">Sin resultados</h2>
                <p className="text-[14px] text-muted">
                  No encontramos nada para «{query.trim()}». Prueba con otra palabra.
                </p>
              </div>
            )
          }
          return (
            <ul className="mt-6 flex list-none flex-col gap-3 p-0">
              {vs.map((v) => (
                <li key={v.id}>
                  <VocabRow item={v} onOpen={setDetail} />
                </li>
              ))}
              {gs.map((g) => (
                <li key={g.id}>
                  <GrammarRow item={g} />
                </li>
              ))}
            </ul>
          )
        })()
      ) : (
        <>
          {/* segmented view toggle (D-04) — indigo active */}
          <div className="mt-4 flex gap-2">
            {(
              [
                { id: 'clase', label: 'Por clase' },
                { id: 'categoria', label: 'Por categoría' },
              ] as { id: View; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setView(t.id)}
                className={`min-h-11 flex-1 rounded-full px-3 text-[14px] font-bold transition ${
                  view === t.id ? 'bg-indigo text-white' : 'bg-white text-ink shadow-card'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {view === 'clase' ? (
            <div className="mt-6 flex flex-col gap-8">
              {store?.classes.map((c) => {
                const bucket = store.byClass.get(c.id)
                if (!bucket) return null
                return (
                  <section key={c.id}>
                    <h2 className="text-[18px] font-bold">{c.label}</h2>
                    <p className="text-[13px] text-muted">{c.date}</p>
                    {bucket.vocab.length > 0 && (
                      <ul className="mt-3 flex list-none flex-col gap-3 p-0">
                        {bucket.vocab.map((v) => (
                          <li key={v.id}>
                            <VocabRow item={v} onOpen={setDetail} />
                          </li>
                        ))}
                      </ul>
                    )}
                    {bucket.grammar.length > 0 && (
                      <>
                        <h3 className="mt-4 text-[14px] font-bold text-muted">Gramática</h3>
                        <ul className="mt-2 flex list-none flex-col gap-3 p-0">
                          {bucket.grammar.map((g) => (
                            <li key={g.id}>
                              <GrammarRow item={g} />
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {bucket.notes.length > 0 && (
                      <>
                        <h3 className="mt-4 text-[14px] font-bold text-muted">Notas</h3>
                        <ul className="mt-2 flex list-none flex-col gap-3 p-0">
                          {bucket.notes.map((n) => (
                            <li key={n.id}>
                              <NoteRow item={n} />
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </section>
                )
              })}
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-8">
              <section>
                <h2 className="text-[18px] font-bold">Vocabulario</h2>
                <ul className="mt-3 flex list-none flex-col gap-3 p-0">
                  {allVocab.map((v) => (
                    <li key={v.id}>
                      <VocabRow item={v} onOpen={setDetail} />
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h2 className="text-[18px] font-bold">Gramática</h2>
                {allGrammar.length === 0 ? (
                  <p className="mt-2 text-[14px] text-muted">Nada por aquí todavía.</p>
                ) : (
                  <ul className="mt-3 flex list-none flex-col gap-3 p-0">
                    {allGrammar.map((g) => (
                      <li key={g.id}>
                        <GrammarRow item={g} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </>
      )}

      {detail !== null && <VocabDetail item={detail} onClose={() => setDetail(null)} />}
    </main>
  )
}

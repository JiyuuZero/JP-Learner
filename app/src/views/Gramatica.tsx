// Gramática section (Phase 4) — grammar gets its OWN place, not mixed into the
// vocab glossary. Patterns grouped by class; tapping one opens a detail overlay
// with the explanation + ALL examples (furigana via <ruby> + on-demand audio)
// and a "Practicar" button that launches a grammar-only practice session.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, X } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import JapaneseText from '../display/JapaneseText'
import SpeakerButton from '../components/SpeakerButton'
import ClassSort, { orderClasses, type SortDir } from '../components/ClassSort'
import { useContent } from '../content/context'
import type { Grammar } from '../content/content'

// Practice all grammar (period scope so it's not gated by SRS due-dates).
const GRAMMAR_SESSION = '/session?scope=total&subMode=periodo&only=grammar&auto=1'

function GrammarRow({ item, onOpen }: { item: Grammar; onOpen: (g: Grammar) => void }) {
  return (
    <button type="button" onClick={() => onOpen(item)} className="w-full text-left">
      <Card padding="compact">
        <p lang="ja" className="jp-text text-[18px] font-bold leading-snug">
          {item.pattern}
        </p>
        <p className="mt-1 text-[15px] leading-normal">{item.es}</p>
        {item.examples[0] && (
          <p className="mt-2 text-[15px] leading-normal text-muted">
            <JapaneseText
              kanji={item.examples[0].kanji}
              kana={item.examples[0].kana}
              romaji={item.examples[0].romaji}
              tokens={item.examples[0].tokens}
            />
          </p>
        )}
      </Card>
    </button>
  )
}

function GrammarDetail({
  item,
  onClose,
  onPractice,
}: {
  item: Grammar
  onClose: () => void
  onPractice: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[85dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-soft sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <p lang="ja" className="jp-text text-[26px] font-extrabold leading-tight">
            {item.pattern}
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
        <p className="mt-2 text-[16px] leading-normal">{item.es}</p>

        <h3 className="mt-5 text-[14px] font-bold text-muted">
          {item.examples.length === 1 ? 'Ejemplo' : 'Ejemplos'}
        </h3>
        <ul className="mt-2 flex list-none flex-col gap-3 p-0">
          {item.examples.map((ex, i) => (
            <li key={i} className="rounded-2xl bg-lavender/40 p-4">
              <p className="text-[18px] leading-relaxed">
                <JapaneseText kanji={ex.kanji} kana={ex.kana} romaji={ex.romaji} tokens={ex.tokens} />
              </p>
              <p className="mt-1 text-[14px] text-muted">{ex.es}</p>
              <SpeakerButton text={ex.kana} label="Escuchar" />
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <Button onClick={onPractice}>Practicar gramática</Button>
        </div>
      </div>
    </div>
  )
}

export default function Gramatica() {
  const { store, loading } = useContent()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<Grammar | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggleClass = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const total = store ? [...store.grammarById.values()].length : 0

  return (
    <main>
      <h1 className="text-[28px] font-extrabold leading-tight">Gramática</h1>

      {loading ? (
        <div className="mt-6 flex flex-col gap-4">
          <p className="text-[14px] text-muted">Cargando tu contenido…</p>
          <div className="h-20 animate-pulse rounded-3xl bg-lavender/70" />
          <div className="h-20 animate-pulse rounded-3xl bg-mint/70" />
        </div>
      ) : total === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <h2 className="text-[20px] font-bold">Aún no hay gramática</h2>
          <p className="text-[14px] text-muted">
            Añade una clase con la skill para practicar patrones gramaticales.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <Button onClick={() => void navigate(GRAMMAR_SESSION)}>Practicar toda la gramática</Button>
          </div>

          <div className="mt-4">
            <ClassSort dir={sortDir} onChange={setSortDir} />
          </div>

          <div className="mt-6 flex flex-col gap-8">
            {orderClasses(store?.classes ?? [], sortDir).map((c) => {
              const bucket = store?.byClass.get(c.id)
              if (!bucket || bucket.grammar.length === 0) return null
              const open = !collapsed.has(c.id)
              return (
                <section key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggleClass(c.id)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    <ChevronDown
                      size={20}
                      className={`shrink-0 text-muted transition-transform ${open ? '' : '-rotate-90'}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[18px] font-bold">{c.label}</span>
                      <span className="block text-[13px] text-muted">{c.date}</span>
                    </span>
                  </button>
                  {open && (
                    <ul className="mt-3 flex list-none flex-col gap-3 p-0">
                      {bucket.grammar.map((g) => (
                        <li key={g.id}>
                          <GrammarRow item={g} onOpen={setDetail} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        </>
      )}

      {detail !== null && (
        <GrammarDetail
          item={detail}
          onClose={() => setDetail(null)}
          onPractice={() => {
            setDetail(null)
            void navigate(GRAMMAR_SESSION)
          }}
        />
      )}
    </main>
  )
}

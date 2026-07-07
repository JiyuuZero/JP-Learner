// Guardados (UI-02) — the heart-toggle destination: lists favorited items,
// resolved BY ID from the ContentStore (favorites store no content text,
// PROG-04). Rows reuse the Glosario vocab-row layout: JA per active display
// mode via JapaneseText + romaji + ES + the filled heart to un-save.
import { Heart } from 'lucide-react'
import Card from '../components/Card'
import JapaneseText from '../display/JapaneseText'
import { useContent } from '../content/context'
import { useProgress } from '../progress/ProgressContext'
import type { Grammar, Vocab } from '../content/content'

export default function Guardados() {
  const { store } = useContent()
  const { favoriteSet, toggleFavorite } = useProgress()

  const ids = [...favoriteSet]
  const vocab = store
    ? ids.map((id) => store.vocabById.get(id)).filter((v): v is Vocab => v !== undefined)
    : []
  const grammar = store
    ? ids.map((id) => store.grammarById.get(id)).filter((g): g is Grammar => g !== undefined)
    : []
  const empty = vocab.length === 0 && grammar.length === 0

  return (
    <main>
      <h1 className="text-[28px] font-extrabold leading-tight">Guardados</h1>

      {empty ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <h2 className="text-[20px] font-bold">Sin nada guardado</h2>
          <p className="text-[14px] text-muted">
            Toca el corazón en el glosario para guardar palabras aquí.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex list-none flex-col gap-3 p-0">
          {vocab.map((v) => (
            <li key={v.id}>
              <Card padding="compact">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[20px] font-bold leading-snug">
                      <JapaneseText
                        kanji={v.kanji}
                        kana={v.kana}
                        romaji={v.romaji}
                        tokens={v.tokens}
                      />
                    </p>
                    <p className="text-[14px] text-muted">{v.romaji}</p>
                    <p className="text-[16px] leading-normal">{v.es}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Quitar de guardados"
                    onClick={() => void toggleFavorite(v.id)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center"
                  >
                    <Heart size={22} strokeWidth={1.8} className="fill-coral text-coral" />
                  </button>
                </div>
              </Card>
            </li>
          ))}
          {grammar.map((g) => (
            <li key={g.id}>
              <Card padding="compact">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[20px] font-bold leading-snug">{g.pattern}</p>
                    <p className="text-[16px] leading-normal">{g.es}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Quitar de guardados"
                    onClick={() => void toggleFavorite(g.id)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center"
                  >
                    <Heart size={22} strokeWidth={1.8} className="fill-coral text-coral" />
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

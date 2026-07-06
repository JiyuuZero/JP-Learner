import Card from '../components/Card'
import { useContent } from '../content/context'

// Placeholder glossary — plain-text vocab listing. Display modes (<ruby>, A/B/C) are Plan 05.
export default function Glosario() {
  const { store, loading } = useContent()
  const vocab = store ? [...store.vocabById.values()] : []

  return (
    <main>
      <h1 className="text-[28px] font-extrabold leading-tight">Glosario</h1>
      {loading ? (
        <div className="mt-6 flex flex-col gap-4">
          <p className="text-[14px] text-muted">Cargando tu contenido…</p>
          <div className="h-20 animate-pulse rounded-3xl bg-lavender/70" />
          <div className="h-20 animate-pulse rounded-3xl bg-peach/70" />
          <div className="h-20 animate-pulse rounded-3xl bg-mint/70" />
        </div>
      ) : vocab.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <h2 className="text-[20px] font-bold">Aún no hay clases</h2>
          <p className="text-[14px] text-muted">
            Añade una clase con la skill para empezar a practicar.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex list-none flex-col gap-3 p-0">
          {vocab.map((v) => (
            <li key={v.id}>
              <Card padding="compact">
                <p className="text-[20px] font-bold leading-snug">{v.kanji}</p>
                <p className="text-[14px] text-muted">{v.romaji}</p>
                <p className="text-[16px] leading-normal">{v.es}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

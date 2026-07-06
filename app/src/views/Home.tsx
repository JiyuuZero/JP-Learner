import { useContent } from '../content/context'

// Placeholder home — the full dashboard (streak, continue card, scopes) is Plan 06.
export default function Home() {
  const { store, loading } = useContent()

  return (
    <main>
      <h1 className="text-[28px] font-extrabold leading-tight">¡Hola!</h1>
      {loading ? (
        <div className="mt-6 flex flex-col gap-4">
          <p className="text-[14px] text-muted">Cargando tu contenido…</p>
          <div className="h-24 animate-pulse rounded-3xl bg-lavender/70" />
          <div className="h-24 animate-pulse rounded-3xl bg-mint/70" />
        </div>
      ) : (
        <p className="mt-4 text-[16px] leading-normal">
          {store && store.classes.length > 0
            ? `Tienes ${store.classes.length} ${store.classes.length === 1 ? 'clase cargada' : 'clases cargadas'} y ${store.vocabById.size} palabras para practicar.`
            : 'Aún no hay clases.'}
        </p>
      )}
    </main>
  )
}

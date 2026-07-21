import { useCallback, useEffect, useState } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { ContentContext } from './content/context'
import { loadContent } from './content/store'
import type { ContentStore } from './content/store'
import { ProgressProvider } from './progress/ProgressContext'
import { TtsProvider } from './tts/TtsContext'
import BottomNav from './components/BottomNav'
import Button from './components/Button'
import Card from './components/Card'
import Home from './views/Home'
import Glosario from './views/Glosario'
import Gramatica from './views/Gramatica'
import Guardados from './views/Guardados'
import Perfil from './views/Perfil'
import Session from './views/Session'
import Ejercicio from './views/Ejercicio'

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-12">
      <Card>
        <h2 className="text-[20px] font-bold">No se pudo cargar el contenido</h2>
        <p className="mt-2 mb-6 text-[14px] text-muted">
          Revisa tu conexión y vuelve a intentarlo.
        </p>
        <Button onClick={onRetry}>Reintentar</Button>
      </Card>
    </div>
  )
}

export default function App() {
  const [store, setStore] = useState<ContentStore | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    loadContent()
      .then((s) => setStore(s))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return (
    <ContentContext.Provider value={{ store, loading, error, reload }}>
      <ProgressProvider>
        <TtsProvider>
        <HashRouter>
        <div className="mx-auto min-h-dvh w-full max-w-[480px] px-4 pt-8 pb-24">
          {error !== null ? (
            <ErrorState onRetry={reload} />
          ) : (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/glosario" element={<Glosario />} />
              <Route path="/gramatica" element={<Gramatica />} />
              <Route path="/guardados" element={<Guardados />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/session" element={<Session />} />
              <Route path="/ejercicios/:modeId" element={<Ejercicio />} />
            </Routes>
          )}
        </div>
          <BottomNav />
        </HashRouter>
        </TtsProvider>
      </ProgressProvider>
    </ContentContext.Provider>
  )
}

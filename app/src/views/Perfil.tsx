// Settings / Perfil (DISP-01, PROG-02/03/05):
// display-mode selector A/B/C + romaji toggle (feed Plan 05 rendering),
// backup block (Exportar/Importar progreso with destructive confirm).
import { useRef, useState } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'
import { useProgress } from '../progress/ProgressContext'
import { useTts } from '../tts/TtsContext'
import type { ProgressMeta } from '../progress/db'

const MODES: { id: ProgressMeta['displayMode']; label: string; hint: string }[] = [
  { id: 'A', label: 'A · Romaji sobre kana/kanji', hint: 'Texto japonés con romaji encima.' },
  { id: 'B', label: 'B · Kanji progresivo', hint: 'Kana; los kanji aprendidos aparecen con furigana.' },
  { id: 'C', label: 'C · Solo kanji', hint: 'Japonés sin ayudas de lectura.' },
]

export default function Perfil() {
  const {
    meta,
    persisted,
    exportBackup,
    importBackup,
    setDisplayMode,
    setRomajiVisible,
  } = useProgress()
  const { hasVoice, audioReady } = useTts()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<unknown | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const onFilePicked = async (file: File | undefined) => {
    setMessage(null)
    if (!file) return
    try {
      const parsed: unknown = JSON.parse(await file.text())
      setPendingImport(parsed) // confirm before anything destructive
    } catch {
      setMessage('El archivo no es un JSON válido.')
    }
  }

  const confirmImport = async () => {
    const parsed = pendingImport
    setPendingImport(null)
    try {
      await importBackup(parsed)
      setMessage('Progreso importado correctamente.')
    } catch (e: unknown) {
      // Rejected imports never touch the existing data.
      setMessage(e instanceof Error ? e.message : 'No se pudo importar el backup.')
    }
  }

  const onExport = async () => {
    setMessage(null)
    try {
      await exportBackup()
    } catch (e: unknown) {
      // e.g. storage unavailable (the context throws instead of no-oping).
      setMessage(e instanceof Error ? e.message : 'No se pudo exportar el progreso.')
    }
  }

  return (
    <main>
      <h1 className="text-[28px] font-extrabold leading-tight">Perfil</h1>

      <section className="mt-6">
        <h2 className="mb-3 text-[18px] font-bold">Modo de visualización</h2>
        <Card padding="compact">
          <div className="flex flex-col gap-2">
            {MODES.map((m) => {
              const active = meta?.displayMode === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => void setDisplayMode(m.id)}
                  className={`rounded-2xl px-4 py-3 text-left transition ${
                    active ? 'bg-indigo text-white' : 'bg-lavender/40 text-ink'
                  }`}
                >
                  <span className="block text-[15px] font-bold">{m.label}</span>
                  <span className={`block text-[13px] ${active ? 'text-white/80' : 'text-muted'}`}>
                    {m.hint}
                  </span>
                </button>
              )
            })}
          </div>
          <label className="mt-4 flex items-center justify-between px-1">
            <span className="text-[15px] font-semibold">Mostrar romaji (modo A)</span>
            <input
              type="checkbox"
              className="h-6 w-6 accent-indigo"
              checked={meta?.romajiVisible ?? true}
              onChange={(e) => void setRomajiVisible(e.target.checked)}
            />
          </label>
        </Card>
      </section>

      {/* Pronunciation status (TTS-02, UI-SPEC §4, Phase 2 D-05): with
          pre-generated audio shipped alongside the content, a missing ja-JP
          voice no longer means no pronunciation — this line reflects the
          combined chain state (audio incluido / voz del sistema / nada, in
          which case the speaker buttons stay hidden app-wide). */}
      <section className="mt-6">
        <h2 className="mb-3 text-[18px] font-bold">Pronunciación</h2>
        <Card padding="compact">
          <p className="text-[14px] text-muted">
            {audioReady
              ? 'Audio de pronunciación incluido con el contenido de clase.'
              : hasVoice
                ? 'Voz japonesa disponible en este dispositivo.'
                : 'Pronunciación no disponible en este dispositivo.'}
          </p>
        </Card>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-[18px] font-bold">Copia de seguridad</h2>
        <Card padding="compact">
          <p className="mb-4 text-[14px] text-muted">
            Tu progreso vive solo en este dispositivo. Exporta una copia de vez en cuando para no
            perderlo.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => void onExport()}>Exportar progreso</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              Importar progreso
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              void onFilePicked(e.target.files?.[0])
              e.target.value = '' // allow re-picking the same file
            }}
          />
          {message !== null && <p className="mt-3 text-[14px] text-muted">{message}</p>}
          {persisted !== null && (
            <p className="mt-3 text-[13px] text-muted">
              Almacenamiento persistente:{' '}
              {persisted ? 'activado' : 'no garantizado — exporta tu progreso a menudo'}
            </p>
          )}
        </Card>
      </section>

      {pendingImport !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-[400px]">
            <Card>
              <h3 className="text-[18px] font-bold">Importar progreso</h3>
              <p className="mt-2 mb-6 text-[14px] text-muted">
                Esto reemplazará todo tu progreso actual por el del archivo. Esta acción no se
                puede deshacer. ¿Continuar?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => void confirmImport()}
                  className="h-14 w-full rounded-full bg-[#DC2626] text-[16px] font-bold text-white transition active:scale-[0.98]"
                >
                  Reemplazar
                </button>
                <Button variant="secondary" onClick={() => setPendingImport(null)}>
                  Cancelar
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </main>
  )
}

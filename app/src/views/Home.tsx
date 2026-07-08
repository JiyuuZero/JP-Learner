// Home dashboard (UI-03, GAM-01/02/03, D-01/D-02 — UI-SPEC §Home dashboard).
// Greeting + avatar + golden points pill, streak (flame + "{n} días"), global
// progress % (indigo), the dark "Continuar donde lo dejaste" card that resumes
// the automatic hybrid session (D-01), the practice-by-scope block
// (Hoy·Semana·Total x Repaso SRS / Repasar periodo -> Session, D-02) and the
// "Reto de hoy" pastel tiles. Non-punitive tone throughout — nothing here ever
// scolds or shows losses.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, User } from 'lucide-react'
import Card from '../components/Card'
import { useContent } from '../content/context'
import { useProgress } from '../progress/ProgressContext'
import { progressPercent } from '../progress/gamification'
import type { ReviewScope, SubMode } from '../progress/session'

const SCOPES: { id: ReviewScope; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Semana' },
  { id: 'total', label: 'Total' },
]

const SUB_MODES: { id: SubMode; label: string; hint: string }[] = [
  { id: 'srs', label: 'Repaso SRS', hint: 'solo lo que toca hoy' },
  { id: 'periodo', label: 'Repasar periodo', hint: 'todo el bloque' },
]

// Circular % ring (ref_2) for the dark Continuar card — indigo fill on dark.
function ProgressRing({ pct }: { pct: number }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" role="img" aria-label={`Progreso global ${pct}%`}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="8" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="#8A8AF0"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="41" textAnchor="middle" fill="#FFFFFF" fontSize="15" fontWeight="700">
        {pct}%
      </text>
    </svg>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { store, loading } = useContent()
  const { meta, srsByItem } = useProgress()
  const [scope, setScope] = useState<ReviewScope>('hoy')

  const points = meta?.points ?? 0
  const streak = meta?.streakCount ?? 0
  const pct = store ? progressPercent(store, srsByItem) : 0
  const hasContent = store !== null && (store.vocabById.size > 0 || store.grammarById.size > 0)

  const launch = (subMode: SubMode) => {
    // D-01/D-02 launch contract (Plan 05): Session reads ?scope=&subMode=.
    void navigate(`/session?scope=${scope}&subMode=${subMode}`)
  }

  return (
    <main className="pb-8">
      {/* header: greeting + streak (GAM-01) | points pill (GAM-03) + avatar */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight">¡Hola!</h1>
          <p className="mt-1 flex items-center gap-1 text-[14px] font-bold text-ink">
            <Flame size={18} strokeWidth={2} className="fill-gold text-gold" />
            {streak} {streak === 1 ? 'día' : 'días'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gold px-3 py-1 text-[14px] font-bold text-ink">
            {points} pts
          </span>
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-lavender text-indigo"
          >
            <User size={22} strokeWidth={2} />
          </span>
        </div>
      </header>

      {loading ? (
        <div className="mt-6 flex flex-col gap-4">
          <p className="text-[14px] text-muted">Cargando tu contenido…</p>
          <div className="h-24 animate-pulse rounded-3xl bg-lavender/70" />
          <div className="h-24 animate-pulse rounded-3xl bg-mint/70" />
        </div>
      ) : !hasContent ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <h2 className="text-[20px] font-bold">Aún no hay clases</h2>
          <p className="text-[14px] text-muted">
            Añade una clase con la skill para empezar a practicar.
          </p>
        </div>
      ) : (
        <>
          {/* global progress % (GAM-02) — slim indigo bar */}
          <section className="mt-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-muted">Progreso global</h2>
              <span className="text-[14px] font-bold text-indigo">{pct}%</span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-lavender">
              <div className="h-full rounded-full bg-indigo transition-all" style={{ width: `${pct}%` }} />
            </div>
          </section>

          {/* dark Continuar card (#30303C) — resumes the automatic hybrid session (D-01) */}
          <section className="mt-6">
            <Card tint="dark">
              <div className="flex items-center gap-4">
                <ProgressRing pct={pct} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-[18px] font-bold text-white">Continuar donde lo dejaste</h2>
                  <p className="mt-1 text-[13px] text-[#C8C8D4]">
                    Sesión automática con tus repasos pendientes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void navigate('/session?scope=total&subMode=srs&auto=1')}
                className="mt-4 h-12 w-full rounded-full bg-white text-[16px] font-bold text-ink transition active:scale-[0.98]"
              >
                Continuar
              </button>
            </Card>
          </section>

          {/* practice-by-scope block (D-02): Hoy·Semana·Total x sub-mode -> Session */}
          <section className="mt-8">
            <h2 className="mb-2 text-[18px] font-bold">Practicar</h2>
            <div className="flex gap-2">
              {SCOPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScope(s.id)}
                  className={`min-h-11 flex-1 rounded-full px-3 text-[14px] font-bold transition ${
                    scope === s.id ? 'bg-indigo text-white' : 'bg-white text-ink shadow-card'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              {SUB_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => launch(m.id)}
                  className="min-h-14 flex-1 rounded-2xl bg-white px-3 py-3 text-left shadow-card transition active:scale-[0.98]"
                >
                  <span className="block text-[14px] font-bold text-indigo">{m.label}</span>
                  <span className="block text-[12px] text-muted">{m.hint}</span>
                </button>
              ))}
            </div>
          </section>

          {/* "Reto de hoy" pastel tiles (ref_2 mint/peach) with counts */}
          <section className="mt-8">
            <h2 className="mb-2 text-[18px] font-bold">Reto de hoy</h2>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => void navigate('/glosario')} className="text-left">
                <Card tint="mint" padding="compact">
                  <p className="text-[16px] font-bold">Vocabulario</p>
                  <p className="mt-1 text-[13px] text-muted">
                    {store.vocabById.size} {store.vocabById.size === 1 ? 'palabra' : 'palabras'}
                  </p>
                </Card>
              </button>
              <button type="button" onClick={() => void navigate('/glosario')} className="text-left">
                <Card tint="peach" padding="compact">
                  <p className="text-[16px] font-bold">Gramática</p>
                  <p className="mt-1 text-[13px] text-muted">
                    {store.grammarById.size} {store.grammarById.size === 1 ? 'patrón' : 'patrones'}
                  </p>
                </Card>
              </button>
            </div>
          </section>
        </>
      )}
    </main>
  )
}

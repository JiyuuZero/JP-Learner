// Números mode (skill step 7 — 2026-07-08 dígitos + 2026-07-17 百/千/万).
// Voice-first drill (à la Count Biki / langpractice number drills): a number
// appears in DIGITS, the user says it aloud in Japanese, reveals the reading
// — rendered via JapaneseText so the script-display config (romaji /
// progressive kanji+furigana / kanji) always applies — and self-grades.
// Optional contrarreloj: the answer auto-reveals when the time runs out.
// Practice-only: no SRS writes; the number words stay in the flashcards too.
import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'
import Button from '../../components/Button'
import Card from '../../components/Card'
import SpeakerButton from '../../components/SpeakerButton'
import JapaneseText from '../../display/JapaneseText'
import ModeHeader from '../ModeHeader'
import { numberReading } from './numberReading'

const SESSION_LENGTH = 10

interface Range {
  id: string
  label: string
  min: number
  max: number
}

const RANGES: Range[] = [
  { id: '0-10', label: '0–10', min: 0, max: 10 },
  { id: '11-99', label: '11–99', min: 11, max: 99 },
  { id: '100-999', label: 'Centenas', min: 100, max: 999 },
  { id: '1000-9999', label: 'Miles', min: 1000, max: 9999 },
  { id: '10000-99999', label: 'Decenas de mil', min: 10000, max: 99999 },
  { id: 'todo', label: 'Todo', min: 0, max: 99999 },
]

const TIMER_SECONDS = [5, 8, 12]

// Random session queue: never the same number twice in a row, all-unique when
// the range is large enough to allow it.
function buildQueue(min: number, max: number, n: number): number[] {
  const size = max - min + 1
  const out: number[] = []
  while (out.length < n) {
    const v = min + Math.floor(Math.random() * size)
    if (out[out.length - 1] === v) continue
    if (size > n && out.includes(v)) continue
    out.push(v)
  }
  return out
}

export default function NumerosMode() {
  const [screen, setScreen] = useState<'setup' | 'play' | 'done'>('setup')
  const [rangeId, setRangeId] = useState('todo')
  const [timed, setTimed] = useState(false)
  const [seconds, setSeconds] = useState(8)
  const [queue, setQueue] = useState<number[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [saidIt, setSaidIt] = useState(0)
  // ms left in the countdown (contrarreloj); only meaningful while unrevealed
  const [remaining, setRemaining] = useState(0)

  const range = RANGES.find((r) => r.id === rangeId) ?? RANGES[RANGES.length - 1]

  const start = () => {
    setQueue(buildQueue(range.min, range.max, SESSION_LENGTH))
    setIndex(0)
    setRevealed(false)
    setSaidIt(0)
    setScreen('play')
  }

  // Contrarreloj: countdown per number; at 0 the reading reveals itself.
  useEffect(() => {
    if (screen !== 'play' || revealed || !timed) return
    const end = Date.now() + seconds * 1000
    setRemaining(seconds * 1000)
    const t = setInterval(() => {
      const left = end - Date.now()
      if (left <= 0) setRevealed(true)
      else setRemaining(left)
    }, 100)
    return () => clearInterval(t)
  }, [screen, revealed, timed, seconds, index])

  const answer = (ok: boolean) => {
    if (ok) setSaidIt((c) => c + 1)
    if (index + 1 >= queue.length) {
      setScreen('done')
    } else {
      setIndex((i) => i + 1)
      setRevealed(false)
    }
  }

  // ---- setup ----------------------------------------------------------------
  if (screen === 'setup') {
    return (
      <main className="pb-8">
        <ModeHeader title="Números" />

        <section className="mt-6">
          <h2 className="mb-2 text-[14px] font-bold text-muted">Rango</h2>
          <div className="grid grid-cols-3 gap-2">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRangeId(r.id)}
                className={`min-h-11 rounded-full px-2 text-[13px] font-bold transition ${
                  rangeId === r.id ? 'bg-indigo text-white' : 'bg-white text-ink shadow-card'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-[14px] font-bold text-muted">Contrarreloj</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTimed(false)}
              className={`min-h-11 flex-1 rounded-full px-3 text-[14px] font-bold transition ${
                !timed ? 'bg-indigo text-white' : 'bg-white text-ink shadow-card'
              }`}
            >
              Sin límite
            </button>
            <button
              type="button"
              onClick={() => setTimed(true)}
              className={`min-h-11 flex-1 items-center rounded-full px-3 text-[14px] font-bold transition ${
                timed ? 'bg-indigo text-white' : 'bg-white text-ink shadow-card'
              }`}
            >
              <Timer size={16} strokeWidth={2.5} className="mr-1 inline" aria-hidden="true" />
              Con tiempo
            </button>
          </div>
          {timed && (
            <div className="mt-3 flex gap-2">
              {TIMER_SECONDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeconds(s)}
                  className={`min-h-11 flex-1 rounded-full px-3 text-[14px] font-bold transition ${
                    seconds === s ? 'bg-indigo text-white' : 'bg-white text-ink shadow-card'
                  }`}
                >
                  {s} s
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6">
          <Card tint="peach" padding="compact">
            <p className="text-[14px] font-bold">Recuerda las lecturas irregulares</p>
            <p lang="ja" className="jp-text mt-1 text-[14px] leading-relaxed">
              300 さんびゃく · 600 ろっぴゃく · 800 はっぴゃく · 3000 さんぜん · 8000 はっせん
            </p>
            <p className="mt-1 text-[13px] leading-normal text-muted">
              10 000 lleva siempre su dígito (いちまん), y tras まん, 1000 se lee いっせん:
              11 000 = いちまんいっせん.
            </p>
          </Card>
        </section>

        <section className="mt-8">
          <Button onClick={start}>Empezar · {SESSION_LENGTH} números</Button>
        </section>
      </main>
    )
  }

  // ---- done -----------------------------------------------------------------
  if (screen === 'done') {
    return (
      <main className="pb-8">
        <ModeHeader title="Números" />
        <div className="mt-10">
          <Card tint="mint">
            <h2 className="text-[24px] font-extrabold">¡Ronda completada!</h2>
            <p className="mt-2 text-[16px] leading-normal">
              Has dicho bien {saidIt} de {queue.length} números.
            </p>
          </Card>
        </div>
        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={start}>Otra ronda</Button>
          <Button variant="secondary" onClick={() => setScreen('setup')}>
            Cambiar ajustes
          </Button>
        </div>
      </main>
    )
  }

  // ---- play -----------------------------------------------------------------
  const n = queue[index]
  const reading = numberReading(n)

  return (
    <main className="pb-8">
      <ModeHeader title="Números" />

      {/* progress segments (Session-style) */}
      <div className="mt-4 flex items-center gap-1">
        {queue.map((q, i) => (
          <div
            key={`${q}-${i}`}
            className={`h-2 flex-1 rounded-full ${
              i < index ? 'bg-indigo/30' : i === index ? 'bg-indigo' : 'bg-lavender'
            }`}
          />
        ))}
      </div>

      <div className="mt-6">
        <Card tint="softblue">
          <p className="text-[14px] text-muted">Dilo en voz alta en japonés</p>
          <p className="mt-3 text-center text-[44px] font-extrabold leading-tight tabular-nums">
            {n.toLocaleString('es-ES')}
          </p>
          {timed && !revealed && (
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/60">
              <div
                className="h-full rounded-full bg-indigo transition-[width] duration-100 ease-linear"
                style={{ width: `${(remaining / (seconds * 1000)) * 100}%` }}
              />
            </div>
          )}
        </Card>
      </div>

      {!revealed ? (
        <div className="mt-6">
          <Button onClick={() => setRevealed(true)}>Mostrar respuesta</Button>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <Card>
              <p className="text-[14px] text-muted">Se lee</p>
              <p className="mt-2 text-center text-[26px] font-extrabold leading-snug">
                <JapaneseText
                  kanji={reading.kanji}
                  kana={reading.kana}
                  romaji={reading.romaji}
                  tokens={reading.tokens}
                />
              </p>
              <div className="flex justify-center">
                <SpeakerButton text={reading.kana} label="Escuchar" />
              </div>
            </Card>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={() => answer(true)}>¡La he dicho bien!</Button>
            <Button variant="secondary" onClick={() => answer(false)}>
              He fallado
            </Button>
          </div>
        </>
      )}
    </main>
  )
}

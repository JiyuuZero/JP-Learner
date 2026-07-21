// Partículas mode (skill step 7, Part D extra) — fill-in-the-particle drill
// aggregated across ALL classes: every committed grammar example whose
// authored blank is a particle (は・を・の・と・も・から〜まで…) becomes a
// tap-to-answer cloze. Same look as the in-session GrammarCloze but
// practice-only: instant feedback, NO SRS writes — the grammar items keep
// their own SRS life in the normal sessions untouched.
import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '../../components/Button'
import Card from '../../components/Card'
import { useContent } from '../../content/context'
import { clozeGapText, type GrammarClozeExercise } from '../../exercises/generators'
import ModeHeader from '../ModeHeader'
import { buildParticleQueue } from './particulas'

const CHIP_TINTS = ['bg-lavender', 'bg-mint', 'bg-peach', 'bg-softblue']

export default function ParticulasMode() {
  const { store } = useContent()
  const [round, setRound] = useState(0) // bump to reshuffle a new round
  const [index, setIndex] = useState(0)
  const [hits, setHits] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  const queue: GrammarClozeExercise[] = useMemo(
    () => (store ? buildParticleQueue(store.grammarById.values()) : []),
    // `round` intentionally reshuffles a fresh queue for "Otra ronda".
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, round],
  )

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    },
    [],
  )

  if (!store) {
    return (
      <main>
        <p className="mt-12 text-center text-[14px] text-muted">Cargando tu contenido…</p>
      </main>
    )
  }

  const restart = () => {
    setRound((r) => r + 1)
    setIndex(0)
    setHits(0)
    setSelected(null)
    setDone(false)
  }

  // ---- done -----------------------------------------------------------------
  if (done || queue.length === 0) {
    return (
      <main className="pb-8">
        <ModeHeader title="Partículas" />
        <div className="mt-10">
          <Card tint="mint">
            <h2 className="text-[24px] font-extrabold">
              {queue.length === 0 ? 'Sin frases todavía' : '¡Ronda completada!'}
            </h2>
            <p className="mt-2 text-[16px] leading-normal">
              {queue.length === 0
                ? 'Aún no hay ejemplos de gramática con partículas para practicar.'
                : `${hits} de ${queue.length} aciertos.`}
            </p>
          </Card>
        </div>
        {queue.length > 0 && (
          <div className="mt-8">
            <Button onClick={restart}>Otra ronda</Button>
          </div>
        )}
      </main>
    )
  }

  // ---- play -----------------------------------------------------------------
  const ex = queue[index]
  const gapped = clozeGapText(ex)

  const tap = (opt: string) => {
    if (selected !== null) return
    setSelected(opt)
    const ok = opt === ex.answer
    if (ok) setHits((h) => h + 1)
    timeoutRef.current = window.setTimeout(
      () => {
        setSelected(null)
        if (index + 1 >= queue.length) setDone(true)
        else setIndex((i) => i + 1)
      },
      ok ? 650 : 1500,
    )
  }

  return (
    <main className="pb-8">
      <ModeHeader title="Partículas" />

      <div className="mt-4 flex items-center gap-1">
        {queue.map((q, i) => (
          <div
            key={`${q.item.id}-${i}`}
            className={`h-2 flex-1 rounded-full ${
              i < index ? 'bg-indigo/30' : i === index ? 'bg-indigo' : 'bg-lavender'
            }`}
          />
        ))}
      </div>

      <div className="mt-6">
        <Card tint="lavender">
          <p className="text-[14px] text-muted">Completa la frase</p>
          <p lang="ja" className="jp-text mt-2 text-[26px] font-extrabold leading-tight">
            {gapped}
          </p>
          <p className="mt-2 text-[14px] text-muted">{ex.sentence.es}</p>
        </Card>
      </div>

      <div lang="ja" className="jp-text mt-4 flex flex-wrap gap-2">
        {ex.options.map((opt, i) => {
          let cls = `text-ink ${CHIP_TINTS[i % CHIP_TINTS.length]}`
          if (selected !== null) {
            if (opt === ex.answer) cls = 'bg-indigo text-white'
            else if (selected === opt) cls = 'bg-coral text-white'
          }
          return (
            <button
              key={`${opt}-${i}`}
              type="button"
              disabled={selected !== null}
              onClick={() => tap(opt)}
              className={`min-h-12 rounded-2xl px-4 py-2 text-[18px] font-bold shadow-card transition active:scale-[0.97] ${cls}`}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {selected !== null && (
        <p
          className={`mt-4 text-center text-[16px] font-bold ${
            selected === ex.answer ? 'text-indigo' : 'text-coral'
          }`}
        >
          {selected === ex.answer ? '¡Bien!' : `Casi. La respuesta es: ${ex.answer}`}
        </p>
      )}
    </main>
  )
}

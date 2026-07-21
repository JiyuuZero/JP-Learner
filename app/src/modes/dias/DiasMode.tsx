// Días de la semana mode (skill step 7 — class 2026-07-17). Two screens of
// pedagogy researched from Tofugu / Team Japanese / KanaDojo + app drills
// (Duolingo, Renshuu): (1) a mnemonic table — shared 〜ようび suffix + the
// element/planet behind each prefix — then (2) a fast tap-to-answer recall
// drill (ES→JA, JA→ES and "what comes after X?") that re-queues each day
// until it has been answered right NEED times. Practice-only: no SRS writes;
// the 7 day cards stay in the flashcard system untouched. Japanese renders
// through JapaneseText with the COMMITTED vocab tokens (looked up by kana),
// so the script-display config applies and the pre-generated audio plays.
import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '../../components/Button'
import Card from '../../components/Card'
import SpeakerButton from '../../components/SpeakerButton'
import JapaneseText from '../../display/JapaneseText'
import { useContent } from '../../content/context'
import ModeHeader from '../ModeHeader'
import { DAYS, NEED, makeQuestion, type DayQuestion } from './dias'
import type { Vocab } from '../../content/content'

// A day rendered in Japanese: committed vocab tokens when available (script
// config + furigana apply), plain kana as the safe fallback.
function DayJa({ vocab, kana }: { vocab?: Vocab; kana: string }) {
  if (vocab) {
    return (
      <JapaneseText kanji={vocab.kanji} kana={vocab.kana} romaji={vocab.romaji} tokens={vocab.tokens} />
    )
  }
  return (
    <span lang="ja" className="jp-text">
      {kana}
    </span>
  )
}

export default function DiasMode() {
  const { store } = useContent()
  const [screen, setScreen] = useState<'intro' | 'play' | 'done'>('intro')
  const [remaining, setRemaining] = useState<number[]>(() => DAYS.map(() => NEED))
  const [q, setQ] = useState<DayQuestion | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [taps, setTaps] = useState(0)
  const [hits, setHits] = useState(0)
  const timeoutRef = useRef<number | null>(null)

  // Committed day vocab by kana — tokens + audio come from the real items.
  const vocabByKana = useMemo(() => {
    const m = new Map<string, Vocab>()
    if (store) for (const v of store.vocabById.values()) m.set(v.kana, v)
    return m
  }, [store])

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    },
    [],
  )

  const start = () => {
    const fresh = DAYS.map(() => NEED)
    setRemaining(fresh)
    setTaps(0)
    setHits(0)
    setSelected(null)
    setQ(makeQuestion(fresh, -1))
    setScreen('play')
  }

  const tap = (opt: number) => {
    if (selected !== null || !q) return
    setSelected(opt)
    setTaps((t) => t + 1)
    const ok = opt === q.answer
    if (ok) setHits((h) => h + 1)
    const rem = [...remaining]
    if (ok) rem[q.answer] = Math.max(0, rem[q.answer] - 1)
    timeoutRef.current = window.setTimeout(
      () => {
        setRemaining(rem)
        setSelected(null)
        if (rem.every((r) => r === 0)) setScreen('done')
        else setQ(makeQuestion(rem, q.answer))
      },
      ok ? 650 : 1400,
    )
  }

  // ---- intro: mnemonic table ------------------------------------------------
  if (screen === 'intro') {
    return (
      <main className="pb-8">
        <ModeHeader title="Días de la semana" />
        <div className="mt-6">
          <Card tint="lavender">
            <p className="text-[15px] leading-normal">
              Todos acaban en <span lang="ja" className="jp-text font-bold">〜ようび</span> («día
              de…»): solo cambia el prefijo, y cada prefijo es un elemento o planeta.
            </p>
          </Card>
        </div>
        <ul className="mt-4 flex list-none flex-col gap-2 p-0">
          {DAYS.map((d) => {
            const v = vocabByKana.get(d.kana)
            return (
              <li key={d.kana} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-card">
                <span className="text-[22px]" aria-hidden="true">
                  {d.simbolo}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-bold">
                    <DayJa vocab={v} kana={d.kana} />
                  </span>
                  <span className="block text-[13px] text-muted">
                    {d.prefijo} = {d.pista}
                  </span>
                </span>
                <span className="text-[15px] font-bold text-indigo">{d.es}</span>
                {v && <SpeakerButton text={v.kana} audioKey={v.id} />}
              </li>
            )
          })}
        </ul>
        <div className="mt-6">
          <Button onClick={start}>Empezar el drill</Button>
        </div>
      </main>
    )
  }

  // ---- done -------------------------------------------------------------------
  if (screen === 'done') {
    return (
      <main className="pb-8">
        <ModeHeader title="Días de la semana" />
        <div className="mt-10">
          <Card tint="mint">
            <h2 className="text-[24px] font-extrabold">¡Los 7 días dominados!</h2>
            <p className="mt-2 text-[16px] leading-normal">
              {hits} aciertos en {taps} respuestas.
            </p>
          </Card>
        </div>
        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={start}>Otra ronda</Button>
          <Button variant="secondary" onClick={() => setScreen('intro')}>
            Ver la mnemotecnia
          </Button>
        </div>
      </main>
    )
  }

  // ---- play -------------------------------------------------------------------
  if (!q) return null
  const answerVocab = vocabByKana.get(DAYS[q.answer].kana)
  const prevDay = DAYS[(q.answer + 6) % 7]

  return (
    <main className="pb-8">
      <ModeHeader title="Días de la semana" />

      {/* mastery dots: one per day (indigo = dominated, half = 1 correct) */}
      <div className="mt-4 flex items-center gap-1">
        {DAYS.map((d, i) => (
          <div
            key={d.kana}
            title={d.es}
            className={`flex h-7 flex-1 items-center justify-center rounded-full text-[13px] ${
              remaining[i] === 0
                ? 'bg-indigo'
                : remaining[i] < NEED
                  ? 'bg-indigo/30'
                  : 'bg-lavender'
            }`}
          >
            <span aria-hidden="true">{d.simbolo}</span>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Card tint="peach">
          <p className="text-[14px] text-muted">
            {q.type === 'esja' && '¿Cómo se dice en japonés?'}
            {q.type === 'jaes' && '¿Qué día es?'}
            {q.type === 'seq' && '¿Qué día va DESPUÉS de…?'}
          </p>
          <p className="mt-2 text-[28px] font-extrabold leading-tight">
            {q.type === 'esja' && DAYS[q.answer].es}
            {q.type === 'jaes' && (
              <>
                <DayJa vocab={answerVocab} kana={DAYS[q.answer].kana} />
                {answerVocab && (
                  <SpeakerButton text={answerVocab.kana} audioKey={answerVocab.id} className="ml-1" />
                )}
              </>
            )}
            {q.type === 'seq' && <DayJa vocab={vocabByKana.get(prevDay.kana)} kana={prevDay.kana} />}
          </p>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {q.options.map((opt) => {
          const isSelected = selected === opt
          let cls = 'bg-white text-ink'
          if (selected !== null) {
            if (opt === q.answer) cls = 'bg-indigo text-white'
            else if (isSelected) cls = 'bg-coral text-white'
          }
          return (
            <button
              key={opt}
              type="button"
              disabled={selected !== null}
              onClick={() => tap(opt)}
              className={`min-h-14 rounded-2xl px-3 py-3 text-[16px] font-bold shadow-card transition active:scale-[0.98] ${cls}`}
            >
              {q.type === 'jaes' ? (
                DAYS[opt].es
              ) : (
                <DayJa vocab={vocabByKana.get(DAYS[opt].kana)} kana={DAYS[opt].kana} />
              )}
            </button>
          )
        })}
      </div>

      {selected !== null && (
        <p
          className={`mt-4 text-center text-[16px] font-bold ${
            selected === q.answer ? 'text-indigo' : 'text-coral'
          }`}
        >
          {selected === q.answer
            ? '¡Bien!'
            : `Casi. Era ${q.type === 'jaes' ? DAYS[q.answer].es : DAYS[q.answer].kana}`}
        </p>
      )}
    </main>
  )
}

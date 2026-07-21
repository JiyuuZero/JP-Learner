// Horas mode (skill step 7 — 2026-07-15 la hora + 2026-07-20 minutos).
// Classic textbook time drill, both directions (clock → reading and
// reading → clock, the format used in Japanese Professor / Coto Academy
// telling-time exercises), plus a dedicated 1-10 minutes counter drill for
// the ふん/ぷん irregulars. Answers render via JapaneseText (script-display
// config applies); distractors are the researched traps: neighbouring hour
// with the same minutes, same hour with other minutes. Practice-only: no SRS
// writes; the hour/minute vocab stays in the flashcards untouched.
import { useEffect, useRef, useState } from 'react'
import Button from '../../components/Button'
import Card from '../../components/Card'
import SpeakerButton from '../../components/SpeakerButton'
import JapaneseText from '../../display/JapaneseText'
import ModeHeader from '../ModeHeader'
import { LEVELS, makeMinuteQuestion, makeTimeQuestion, type MinuteQuestion, type TimeQuestion } from './horas'
import { minuteJa } from './timeReading'

const QUESTIONS = 10

type LevelId = 'punto' | 'cinco' | 'minutos'

const LEVEL_CHOICES: { id: LevelId; label: string; hint: string }[] = [
  { id: 'punto', label: 'En punto y media', hint: '〜じ y 〜じはん' },
  { id: 'cinco', label: 'Con minutos', hint: '〜じ 〜ふん, de 5 en 5' },
  { id: 'minutos', label: 'Minutos 1–10', hint: 'いっぷん…じゅっぷん' },
]

type Question = { t: 'time'; q: TimeQuestion } | { t: 'min'; q: MinuteQuestion }

export default function HorasMode() {
  const [screen, setScreen] = useState<'setup' | 'play' | 'done'>('setup')
  const [levelId, setLevelId] = useState<LevelId>('punto')
  const [num, setNum] = useState(0) // questions answered so far
  const [hits, setHits] = useState(0)
  const [question, setQuestion] = useState<Question | null>(null)
  const [selected, setSelected] = useState<number | null>(null) // option index tapped
  const timeoutRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    },
    [],
  )

  const nextQuestion = (level: LevelId, prev: Question | null): Question => {
    if (level === 'minutos') {
      const prevAnswer = prev?.t === 'min' ? prev.q.answer : -1
      return { t: 'min', q: makeMinuteQuestion(prevAnswer) }
    }
    const minutes = (LEVELS.find((l) => l.id === level) ?? LEVELS[0]).minutes
    const prevLabel = prev?.t === 'time' ? prev.q.answer.label : undefined
    return { t: 'time', q: makeTimeQuestion(minutes, prevLabel) }
  }

  const start = () => {
    setNum(0)
    setHits(0)
    setSelected(null)
    setQuestion(nextQuestion(levelId, null))
    setScreen('play')
  }

  const isCorrect = (optIndex: number, q: Question): boolean =>
    q.t === 'time'
      ? q.q.options[optIndex].kana === q.q.answer.kana
      : q.q.options[optIndex] === q.q.answer

  const tap = (optIndex: number) => {
    if (selected !== null || !question) return
    setSelected(optIndex)
    const ok = isCorrect(optIndex, question)
    if (ok) setHits((h) => h + 1)
    timeoutRef.current = window.setTimeout(
      () => {
        setSelected(null)
        if (num + 1 >= QUESTIONS) {
          setScreen('done')
        } else {
          setNum((n) => n + 1)
          setQuestion(nextQuestion(levelId, question))
        }
      },
      ok ? 650 : 1500,
    )
  }

  // ---- setup ----------------------------------------------------------------
  if (screen === 'setup') {
    return (
      <main className="pb-8">
        <ModeHeader title="Horas" />

        <section className="mt-6">
          <h2 className="mb-2 text-[14px] font-bold text-muted">Nivel</h2>
          <div className="flex flex-col gap-2">
            {LEVEL_CHOICES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLevelId(l.id)}
                className={`min-h-14 rounded-2xl px-4 py-3 text-left transition ${
                  levelId === l.id ? 'bg-indigo text-white' : 'bg-white text-ink shadow-card'
                }`}
              >
                <span className="block text-[15px] font-bold">{l.label}</span>
                <span
                  lang="ja"
                  className={`jp-text block text-[13px] ${levelId === l.id ? 'text-white/80' : 'text-muted'}`}
                >
                  {l.hint}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <Card tint="peach" padding="compact">
            <p className="text-[14px] font-bold">Recuerda las lecturas irregulares</p>
            <p lang="ja" className="jp-text mt-1 text-[14px] leading-relaxed">
              4:00 よじ · 7:00 しちじ · 9:00 くじ
            </p>
            <p lang="ja" className="jp-text mt-1 text-[14px] leading-relaxed">
              いっぷん · ろっぷん · はっぷん · じゅっぷん
            </p>
            <p className="mt-1 text-[13px] leading-normal text-muted">
              3 y 4 minutos admiten las dos lecturas (さんぷん／さんふん, よんぷん／よんふん); por
              teléfono se prefiere ななじ para las 7. La media es 〜じはん.
            </p>
          </Card>
        </section>

        <section className="mt-8">
          <Button onClick={start}>Empezar · {QUESTIONS} preguntas</Button>
        </section>
      </main>
    )
  }

  // ---- done -----------------------------------------------------------------
  if (screen === 'done') {
    return (
      <main className="pb-8">
        <ModeHeader title="Horas" />
        <div className="mt-10">
          <Card tint="mint">
            <h2 className="text-[24px] font-extrabold">¡Ronda completada!</h2>
            <p className="mt-2 text-[16px] leading-normal">
              {hits} de {QUESTIONS} aciertos.
            </p>
          </Card>
        </div>
        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={start}>Otra ronda</Button>
          <Button variant="secondary" onClick={() => setScreen('setup')}>
            Cambiar nivel
          </Button>
        </div>
      </main>
    )
  }

  // ---- play -----------------------------------------------------------------
  if (!question) return null

  return (
    <main className="pb-8">
      <ModeHeader title="Horas" />

      <div className="mt-4 flex items-center gap-1">
        {Array.from({ length: QUESTIONS }, (_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full ${
              i < num ? 'bg-indigo/30' : i === num ? 'bg-indigo' : 'bg-lavender'
            }`}
          />
        ))}
      </div>

      {question.t === 'time' ? (
        <TimeQuestionBody q={question.q} selected={selected} onTap={tap} />
      ) : (
        <MinuteQuestionBody q={question.q} selected={selected} onTap={tap} />
      )}

      {selected !== null && (
        <p
          className={`mt-4 text-center text-[16px] font-bold ${
            isCorrect(selected, question) ? 'text-indigo' : 'text-coral'
          }`}
        >
          {isCorrect(selected, question)
            ? '¡Bien!'
            : `Casi. Era ${
                question.t === 'time'
                  ? `${question.q.answer.label} · ${question.q.answer.kana}`
                  : `${question.q.answer} min · ${minuteJa(question.q.answer).kana}`
              }`}
        </p>
      )}
    </main>
  )
}

// Option chip styling shared by both question bodies.
const optionClass = (state: 'idle' | 'correct' | 'wrong'): string => {
  if (state === 'correct') return 'bg-indigo text-white'
  if (state === 'wrong') return 'bg-coral text-white'
  return 'bg-white text-ink'
}

function TimeQuestionBody({
  q,
  selected,
  onTap,
}: {
  q: TimeQuestion
  selected: number | null
  onTap: (i: number) => void
}) {
  return (
    <>
      <div className="mt-6">
        <Card tint="softblue">
          <p className="text-[14px] text-muted">
            {q.kind === 'timeToReading' ? '¿Cómo se lee esta hora?' : '¿Qué hora es?'}
          </p>
          {q.kind === 'timeToReading' ? (
            <p className="mt-2 text-center text-[44px] font-extrabold leading-tight tabular-nums">
              {q.answer.label}
            </p>
          ) : (
            <p className="mt-2 text-center text-[26px] font-extrabold leading-snug">
              <JapaneseText
                kanji={q.answer.kanji}
                kana={q.answer.kana}
                romaji={q.answer.romaji}
                tokens={q.answer.tokens}
              />
              <SpeakerButton text={q.answer.kana} className="ml-1" />
            </p>
          )}
        </Card>
      </div>

      <div className={`mt-4 grid gap-2 ${q.kind === 'timeToReading' ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {q.options.map((opt, i) => {
          const state =
            selected === null
              ? 'idle'
              : opt.kana === q.answer.kana
                ? 'correct'
                : selected === i
                  ? 'wrong'
                  : 'idle'
          return (
            <button
              key={opt.kana}
              type="button"
              disabled={selected !== null}
              onClick={() => onTap(i)}
              className={`min-h-14 rounded-2xl px-3 py-3 text-[17px] font-bold shadow-card transition active:scale-[0.98] ${optionClass(state)}`}
            >
              {q.kind === 'timeToReading' ? (
                <JapaneseText kanji={opt.kanji} kana={opt.kana} romaji={opt.romaji} tokens={opt.tokens} />
              ) : (
                <span className="tabular-nums">{opt.label}</span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}

function MinuteQuestionBody({
  q,
  selected,
  onTap,
}: {
  q: MinuteQuestion
  selected: number | null
  onTap: (i: number) => void
}) {
  const answerJa = minuteJa(q.answer)
  return (
    <>
      <div className="mt-6">
        <Card tint="softblue">
          <p className="text-[14px] text-muted">
            {q.kind === 'numToKana' ? '¿Cómo se dice?' : '¿Cuántos minutos son?'}
          </p>
          {q.kind === 'numToKana' ? (
            <p className="mt-2 text-center text-[44px] font-extrabold leading-tight tabular-nums">
              {q.answer} <span className="text-[20px] font-bold text-muted">min</span>
            </p>
          ) : (
            <p className="mt-2 text-center text-[26px] font-extrabold leading-snug">
              <JapaneseText
                kanji={answerJa.kanji}
                kana={answerJa.kana}
                romaji={answerJa.romaji}
                tokens={answerJa.tokens}
              />
              <SpeakerButton text={answerJa.kana} className="ml-1" />
            </p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {q.options.map((opt, i) => {
          const optJa = minuteJa(opt)
          const state =
            selected === null ? 'idle' : opt === q.answer ? 'correct' : selected === i ? 'wrong' : 'idle'
          return (
            <button
              key={opt}
              type="button"
              disabled={selected !== null}
              onClick={() => onTap(i)}
              className={`min-h-14 rounded-2xl px-3 py-3 text-[17px] font-bold shadow-card transition active:scale-[0.98] ${optionClass(state)}`}
            >
              {q.kind === 'numToKana' ? (
                <JapaneseText kanji={optJa.kanji} kana={optJa.kana} romaji={optJa.romaji} tokens={optJa.tokens} />
              ) : (
                <span className="tabular-nums">{opt} min</span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}

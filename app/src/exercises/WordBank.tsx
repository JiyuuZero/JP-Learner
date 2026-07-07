// Sentence word-bank (EXER-04) — THE signature exercise (ref_3): dashed slot
// area + wrapped pastel chips built from AUTHORED sentence.tokens[] (never
// in-app splitting, A2). Tapping a chip places it (indigo fill); tapping a
// placed chip returns it. Comprobar (the session frame button) validates the
// placed order against the authored token order. wrong -> Again, correct -> Good.
import { useEffect, useState } from 'react'
import Card from '../components/Card'
import { useProgress } from '../progress/ProgressContext'
import { gradeForAnswer } from '../progress/srs'
import { checkWordBankOrder, type WordBankChip, type WordBankExercise } from './generators'

interface WordBankProps {
  exercise: WordBankExercise
  classId: string
  phase: 'answer' | 'feedback'
  onReadyChange: (ready: boolean) => void
  registerCheck: (fn: (() => boolean) | null) => void
}

// alternating pastel tints for bank chips, exactly like ref_3
const CHIP_TINTS = ['bg-lavender', 'bg-mint', 'bg-peach', 'bg-softblue']

export default function WordBank({
  exercise,
  classId,
  phase,
  onReadyChange,
  registerCheck,
}: WordBankProps) {
  const { grade } = useProgress()
  const [placed, setPlaced] = useState<WordBankChip[]>([])
  const [result, setResult] = useState<boolean | null>(null)
  const { item, sentence, chips, correctOrder } = exercise

  useEffect(() => {
    onReadyChange(placed.length === correctOrder.length)
  }, [placed, correctOrder, onReadyChange])

  useEffect(() => {
    registerCheck(() => {
      const correct = checkWordBankOrder(
        placed.map((c) => c.surface),
        correctOrder,
      )
      setResult(correct)
      void grade(item.id, item.type, classId, gradeForAnswer(correct), item)
      return correct
    })
    return () => registerCheck(null)
  }, [registerCheck, placed, correctOrder, grade, item, classId])

  const placedIds = new Set(placed.map((c) => c.id))
  const place = (chip: WordBankChip) => setPlaced((p) => [...p, chip])
  const unplace = (chip: WordBankChip) => setPlaced((p) => p.filter((c) => c.id !== chip.id))

  return (
    <div className="flex flex-col gap-4">
      <Card tint="lavender">
        <p className="text-[14px] text-muted">Construye la frase en japonés</p>
        <p className="mt-2 text-[22px] font-extrabold leading-tight">{sentence.es}</p>
        <p className="mt-2 text-[13px] text-muted">Toca las fichas en orden y pulsa Comprobar.</p>
      </Card>

      {/* dashed slot area — placed chips appear here, indigo-filled */}
      <div
        lang="ja"
        className="jp-text flex min-h-16 flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-indigo/50 bg-white p-3"
      >
        {placed.length === 0 && <span className="text-[14px] text-muted">…</span>}
        {placed.map((chip) => (
          <button
            key={chip.id}
            type="button"
            disabled={phase === 'feedback'}
            onClick={() => unplace(chip)}
            className="min-h-11 rounded-2xl bg-indigo px-3 py-2 text-[18px] font-bold text-white shadow-card transition active:scale-[0.97]"
          >
            {chip.surface}
          </button>
        ))}
      </div>

      {/* chip bank — wrapped pastel chips (correct tokens + 1-2 distractors) */}
      <div lang="ja" className="jp-text flex flex-wrap gap-2">
        {chips.map((chip, i) =>
          placedIds.has(chip.id) ? null : (
            <button
              key={chip.id}
              type="button"
              disabled={phase === 'feedback'}
              onClick={() => place(chip)}
              className={`min-h-11 rounded-2xl px-3 py-2 text-[18px] font-bold text-ink shadow-card transition active:scale-[0.97] ${CHIP_TINTS[i % CHIP_TINTS.length]}`}
            >
              {chip.surface}
            </button>
          ),
        )}
      </div>

      {result !== null && (
        <p className={`text-center text-[16px] font-bold ${result ? 'text-indigo' : 'text-coral'}`}>
          {result ? '¡Bien!' : `Casi. La respuesta es: ${sentence.kanji}`}
        </p>
      )}
    </div>
  )
}

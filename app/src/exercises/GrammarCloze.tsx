// Grammar cloze (Phase 4) — fill in the taught particle/form. The sentence is
// shown with the blank position(s) as gaps (＿＿); the user taps the missing
// token from option chips. Uses the authored `blank` marker (Phase 3).
// wrong -> Again, correct -> Good.
import { useEffect, useState } from 'react'
import Card from '../components/Card'
import { useProgress } from '../progress/ProgressContext'
import { gradeForAnswer } from '../progress/srs'
import { clozeGapText, type GrammarClozeExercise } from './generators'

interface Props {
  exercise: GrammarClozeExercise
  classId: string
  phase: 'answer' | 'feedback'
  onReadyChange: (ready: boolean) => void
  registerCheck: (fn: (() => boolean) | null) => void
}

const CHIP_TINTS = ['bg-lavender', 'bg-mint', 'bg-peach', 'bg-softblue']

export default function GrammarCloze({
  exercise,
  classId,
  phase,
  onReadyChange,
  registerCheck,
}: Props) {
  const { grade } = useProgress()
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<boolean | null>(null)
  const { item, sentence, answer, options } = exercise
  const gapped = clozeGapText(exercise)

  useEffect(() => {
    onReadyChange(selected !== null)
  }, [selected, onReadyChange])

  useEffect(() => {
    registerCheck(() => {
      const correct = selected === answer
      setResult(correct)
      void grade(item.id, item.type, classId, gradeForAnswer(correct))
      return correct
    })
    return () => registerCheck(null)
  }, [registerCheck, selected, answer, grade, item, classId])

  return (
    <div className="flex flex-col gap-4">
      <Card tint="lavender">
        <p className="text-[14px] text-muted">Completa la frase</p>
        <p lang="ja" className="jp-text mt-2 text-[26px] font-extrabold leading-tight">
          {gapped}
        </p>
        <p className="mt-2 text-[14px] text-muted">{sentence.es}</p>
      </Card>

      <div lang="ja" className="jp-text flex flex-wrap gap-2">
        {options.map((opt, i) => {
          const isSelected = selected === opt
          let cls = `text-ink ${CHIP_TINTS[i % CHIP_TINTS.length]}`
          if (phase === 'feedback') {
            if (opt === answer) cls = 'bg-indigo text-white'
            else if (isSelected) cls = 'bg-coral text-white'
          } else if (isSelected) {
            cls = 'bg-indigo text-white'
          }
          return (
            <button
              key={`${opt}-${i}`}
              type="button"
              disabled={phase === 'feedback'}
              onClick={() => setSelected(opt)}
              className={`min-h-12 rounded-2xl px-4 py-2 text-[18px] font-bold shadow-card transition active:scale-[0.97] ${cls}`}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {result !== null && (
        <p className={`text-center text-[16px] font-bold ${result ? 'text-indigo' : 'text-coral'}`}>
          {result ? '¡Bien!' : `Casi. La respuesta es: ${answer}`}
        </p>
      )}
    </div>
  )
}

// Grammar multiple choice (Phase 4) — "¿Qué expresa este patrón?"
// Prompt = the grammar pattern; 4 options are Spanish explanations (the correct
// `es` + 3 distractors from other grammar). wrong -> Again, correct -> Good.
import { useEffect, useState } from 'react'
import Card from '../components/Card'
import { useProgress } from '../progress/ProgressContext'
import { gradeForAnswer } from '../progress/srs'
import type { GrammarChoiceExercise } from './generators'

interface Props {
  exercise: GrammarChoiceExercise
  classId: string
  phase: 'answer' | 'feedback'
  onReadyChange: (ready: boolean) => void
  registerCheck: (fn: (() => boolean) | null) => void
}

export default function GrammarChoice({
  exercise,
  classId,
  phase,
  onReadyChange,
  registerCheck,
}: Props) {
  const { grade } = useProgress()
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<boolean | null>(null)
  const { item, options, correctId } = exercise

  useEffect(() => {
    onReadyChange(selected !== null)
  }, [selected, onReadyChange])

  useEffect(() => {
    registerCheck(() => {
      const correct = selected === correctId
      setResult(correct)
      void grade(item.id, item.type, classId, gradeForAnswer(correct))
      return correct
    })
    return () => registerCheck(null)
  }, [registerCheck, selected, correctId, grade, item, classId])

  return (
    <div className="flex flex-col gap-4">
      <Card tint="lavender">
        <p className="text-[14px] text-muted">¿Qué expresa este patrón?</p>
        <p lang="ja" className="jp-text mt-2 text-[26px] font-extrabold leading-tight">
          {item.pattern}
        </p>
      </Card>

      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const isSelected = selected === o.id
          let cls = 'bg-white text-ink'
          if (phase === 'feedback') {
            if (o.id === correctId) cls = 'bg-indigo text-white'
            else if (isSelected) cls = 'bg-coral text-white'
          } else if (isSelected) {
            cls = 'bg-indigo text-white'
          }
          return (
            <button
              key={o.id}
              type="button"
              disabled={phase === 'feedback'}
              onClick={() => setSelected(o.id)}
              className={`min-h-14 rounded-2xl px-4 py-3 text-left text-[15px] font-semibold leading-snug shadow-card transition active:scale-[0.98] ${cls}`}
            >
              {o.es}
            </button>
          )
        })}
      </div>

      {result !== null && (
        <p className={`text-center text-[16px] font-bold ${result ? 'text-indigo' : 'text-coral'}`}>
          {result ? '¡Bien!' : 'Casi. Fíjate en la opción correcta.'}
        </p>
      )}
    </div>
  )
}

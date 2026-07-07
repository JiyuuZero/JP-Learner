// Multiple choice (EXER-02) — prompt card + 4 option chips (2-col grid).
// Correct fills indigo, wrong fills coral. Distractors come from the
// same-class pool (generators.pickDistractors). wrong -> Again, correct -> Good.
import { useEffect, useState } from 'react'
import Card from '../components/Card'
import JapaneseText from '../display/JapaneseText'
import { useProgress } from '../progress/ProgressContext'
import { gradeForAnswer } from '../progress/srs'
import type { MultipleChoiceExercise } from './generators'
import type { Vocab } from '../content/content'

interface MultipleChoiceProps {
  exercise: MultipleChoiceExercise
  classId: string
  phase: 'answer' | 'feedback'
  onReadyChange: (ready: boolean) => void
  registerCheck: (fn: (() => boolean) | null) => void
}

function OptionFace({ option, side }: { option: Vocab; side: 'ja' | 'es' }) {
  if (side === 'es') return <>{option.es}</>
  return (
    <JapaneseText kanji={option.kanji} kana={option.kana} romaji={option.romaji} tokens={option.tokens} />
  )
}

export default function MultipleChoice({
  exercise,
  classId,
  phase,
  onReadyChange,
  registerCheck,
}: MultipleChoiceProps) {
  const { grade } = useProgress()
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<boolean | null>(null)
  const { item, options, correctId, promptSide } = exercise
  const answerSide = promptSide === 'ja' ? 'es' : 'ja'

  useEffect(() => {
    onReadyChange(selected !== null)
  }, [selected, onReadyChange])

  useEffect(() => {
    registerCheck(() => {
      const correct = selected === correctId
      setResult(correct)
      void grade(item.id, item.type, classId, gradeForAnswer(correct), item)
      return correct
    })
    return () => registerCheck(null)
  }, [registerCheck, selected, correctId, grade, item, classId])

  return (
    <div className="flex flex-col gap-4">
      <Card tint="lavender">
        <p className="text-[14px] text-muted">{promptSide === 'ja' ? 'En japonés' : 'En español'}</p>
        <p className="mt-2 text-[28px] font-extrabold leading-tight">
          {promptSide === 'ja' ? (
            <JapaneseText kanji={item.kanji} kana={item.kana} romaji={item.romaji} tokens={item.tokens} />
          ) : (
            item.es
          )}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-2">
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
              className={`min-h-14 rounded-2xl px-3 py-3 text-[16px] font-bold shadow-card transition active:scale-[0.98] ${cls}`}
            >
              <OptionFace option={o} side={answerSide} />
            </button>
          )
        })}
      </div>

      {result !== null && (
        <p className={`text-center text-[16px] font-bold ${result ? 'text-indigo' : 'text-coral'}`}>
          {result ? '¡Bien!' : `Casi. La respuesta es: ${answerSide === 'es' ? item.es : item.kana}`}
        </p>
      )}
    </div>
  )
}

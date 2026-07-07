// Fill-in / typing (EXER-03) — prompt card + text input (dashed underline).
// Checked with the tolerant checker: ES_JA accepts kana/romaji/kanji variants
// (n/nn, shi/si...); JA_ES matches the ES translation loosely.
// wrong -> Again, correct -> Good.
import { useEffect, useState } from 'react'
import Card from '../components/Card'
import JapaneseText from '../display/JapaneseText'
import { useProgress } from '../progress/ProgressContext'
import { gradeForAnswer } from '../progress/srs'
import { isAnswerCorrect, isEsAnswerCorrect } from './check'
import type { TypingExercise } from './generators'

interface TypingProps {
  exercise: TypingExercise
  classId: string
  phase: 'answer' | 'feedback'
  onReadyChange: (ready: boolean) => void
  registerCheck: (fn: (() => boolean) | null) => void
}

export default function Typing({
  exercise,
  classId,
  phase,
  onReadyChange,
  registerCheck,
}: TypingProps) {
  const { grade } = useProgress()
  const [input, setInput] = useState('')
  const [result, setResult] = useState<boolean | null>(null)
  const { item, direction, promptSide, accepted } = exercise

  useEffect(() => {
    onReadyChange(input.trim().length > 0)
  }, [input, onReadyChange])

  useEffect(() => {
    registerCheck(() => {
      const correct =
        direction === 'JA_ES'
          ? isEsAnswerCorrect(input, item.es)
          : isAnswerCorrect(input, accepted)
      setResult(correct)
      void grade(item.id, item.type, classId, gradeForAnswer(correct), item)
      return correct
    })
    return () => registerCheck(null)
  }, [registerCheck, input, direction, accepted, grade, item, classId])

  const answerShown =
    direction === 'JA_ES' ? item.es : `${item.kana} (${item.romaji})`

  return (
    <div className="flex flex-col gap-4">
      <Card tint="lavender">
        <p className="text-[14px] text-muted">
          {promptSide === 'ja' ? 'Escribe la traducción en español' : 'Escribe en japonés (kana o romaji)'}
        </p>
        <p className="mt-2 text-[28px] font-extrabold leading-tight">
          {promptSide === 'ja' ? (
            <JapaneseText kanji={item.kanji} kana={item.kana} romaji={item.romaji} tokens={item.tokens} />
          ) : (
            item.es
          )}
        </p>
      </Card>

      <input
        type="text"
        value={input}
        disabled={phase === 'feedback'}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Tu respuesta…"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="w-full border-0 border-b-2 border-dashed border-indigo bg-transparent px-1 py-3 text-[20px] font-bold text-ink outline-none placeholder:font-normal placeholder:text-muted"
      />

      {result !== null && (
        <p className={`text-center text-[16px] font-bold ${result ? 'text-indigo' : 'text-coral'}`}>
          {result ? '¡Bien!' : `Casi. La respuesta es: ${answerShown}`}
        </p>
      )}
    </div>
  )
}

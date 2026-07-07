// ES <-> JA matching (EXER-05) — two columns of cards; tap one then its pair;
// matched pairs clear. Coarse Good/Again per pair: a pair matched without a
// failed attempt involving it grades Good, otherwise Again.
import { useState } from 'react'
import JapaneseText from '../display/JapaneseText'
import { useProgress } from '../progress/ProgressContext'
import { gradeForAnswer } from '../progress/srs'
import type { MatchingExercise, MatchingPair } from './generators'

interface MatchingProps {
  exercise: MatchingExercise
  classIdByItem: Map<string, string>
  onFinish: () => void
}

export default function Matching({ exercise, classIdByItem, onFinish }: MatchingProps) {
  const { grade } = useProgress()
  const [selEs, setSelEs] = useState<string | null>(null)
  const [selJa, setSelJa] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [failed, setFailed] = useState<Set<string>>(new Set())
  const { pairs, left, right } = exercise

  const tryResolve = (esId: string | null, jaId: string | null) => {
    if (esId === null || jaId === null) return
    if (esId === jaId) {
      // pair matched — grade it now (Good on first try, Again if it failed before)
      const pair = pairs.find((p) => p.id === esId)
      if (pair) {
        const correct = !failed.has(pair.id)
        void grade(
          pair.item.id,
          pair.item.type,
          classIdByItem.get(pair.item.id) ?? '',
          gradeForAnswer(correct),
          pair.item,
        )
      }
      const nextMatched = new Set(matched).add(esId)
      setMatched(nextMatched)
      setSelEs(null)
      setSelJa(null)
      if (nextMatched.size === pairs.length) onFinish()
    } else {
      // mismatch: both involved pairs count as failed (coarse Again signal)
      setFailed((f) => new Set(f).add(esId).add(jaId))
      setSelEs(null)
      setSelJa(null)
    }
  }

  const pickEs = (id: string) => {
    if (matched.has(id)) return
    setSelEs(id)
    tryResolve(id, selJa)
  }
  const pickJa = (id: string) => {
    if (matched.has(id)) return
    setSelJa(id)
    tryResolve(selEs, id)
  }

  const cardCls = (id: string, selected: boolean) => {
    if (matched.has(id)) return 'invisible'
    if (selected) return 'bg-indigo text-white'
    return 'bg-white text-ink'
  }

  const CardBtn = ({
    pair,
    side,
    selected,
    onPick,
  }: {
    pair: MatchingPair
    side: 'es' | 'ja'
    selected: boolean
    onPick: (id: string) => void
  }) => (
    <button
      type="button"
      onClick={() => onPick(pair.id)}
      className={`min-h-14 w-full rounded-2xl px-3 py-3 text-[15px] font-bold shadow-card transition active:scale-[0.98] ${cardCls(pair.id, selected)}`}
    >
      {side === 'es' ? (
        pair.item.es
      ) : (
        <JapaneseText
          kanji={pair.item.kanji}
          kana={pair.item.kana}
          romaji={pair.item.romaji}
          tokens={pair.item.tokens}
        />
      )}
    </button>
  )

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-[14px] text-muted">Empareja cada palabra con su pareja</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          {left.map((p) => (
            <CardBtn key={p.id} pair={p} side="es" selected={selEs === p.id} onPick={pickEs} />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {right.map((p) => (
            <CardBtn key={p.id} pair={p} side="ja" selected={selJa === p.id} onPick={pickJa} />
          ))}
        </div>
      </div>
    </div>
  )
}

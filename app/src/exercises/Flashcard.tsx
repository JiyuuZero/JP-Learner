// Flashcard (EXER-01) — large lavender card, tap to reveal, then the 4
// self-grade pills (Otra vez/Difícil/Bien/Fácil = FSRS Again/Hard/Good/Easy).
// Grades the ONE shared FSRS card via ProgressContext.grade.
import { useState } from 'react'
import { Heart } from 'lucide-react'
import { Rating, type Grade } from 'ts-fsrs'
import JapaneseText from '../display/JapaneseText'
import SpeakerButton from '../components/SpeakerButton'
import { exampleKey } from '../tts/audio'
import { useProgress } from '../progress/ProgressContext'
import type { FlashcardExercise } from './generators'
import type { Kanji, Vocab } from '../content/content'

interface FlashcardProps {
  exercise: FlashcardExercise
  classId: string
  onNext: () => void
}

const GRADES: { label: string; grade: Grade; className: string }[] = [
  { label: 'Otra vez', grade: Rating.Again, className: 'bg-white text-ink' },
  { label: 'Difícil', grade: Rating.Hard, className: 'bg-peach text-ink' },
  { label: 'Bien', grade: Rating.Good, className: 'bg-mint text-ink' },
  { label: 'Fácil', grade: Rating.Easy, className: 'bg-lavender text-indigo' },
]

// JA face of any reviewable item (per active display mode via JapaneseText).
function JaFace({ item }: { item: FlashcardExercise['item'] }) {
  if (item.type === 'vocab') {
    return (
      <JapaneseText
        kanji={item.kanji}
        kana={item.kana}
        romaji={item.romaji}
        tokens={item.tokens}
        className="text-[32px] font-bold"
      />
    )
  }
  if (item.type === 'kanji') {
    return (
      <span lang="ja" className="jp-text text-[48px] font-bold">
        {item.char}
      </span>
    )
  }
  return (
    <span lang="ja" className="jp-text text-[24px] font-bold">
      {item.pattern}
    </span>
  )
}

function jaSpeechText(item: FlashcardExercise['item']): string {
  if (item.type === 'vocab') return item.kana
  if (item.type === 'kanji') return item.char
  return item.pattern
}

export default function Flashcard({ exercise, classId, onNext }: FlashcardProps) {
  const { grade, favoriteSet, toggleFavorite } = useProgress()
  const [revealed, setRevealed] = useState(false)
  const { item, direction } = exercise
  const saved = favoriteSet.has(item.id)

  const pick = (g: Grade) => {
    // grammar has no kanji chars to auto-learn; vocab/kanji feed D-03
    const gradable: Vocab | Kanji | undefined = item.type === 'grammar' ? undefined : item
    void grade(item.id, item.type, classId, g, gradable)
    onNext()
  }

  const front = direction === 'JA_ES'
  const example = item.type === 'vocab' ? item.example : item.type === 'grammar' ? item.examples[0] : undefined

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="relative w-full rounded-3xl bg-lavender p-6 text-left shadow-soft"
      >
        <span
          role="button"
          tabIndex={0}
          aria-label={saved ? 'Quitar de guardados' : 'Guardar'}
          onClick={(e) => {
            e.stopPropagation()
            void toggleFavorite(item.id)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation()
              void toggleFavorite(item.id)
            }
          }}
          className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center"
        >
          <Heart size={22} strokeWidth={1.8} className={saved ? 'fill-coral text-coral' : 'text-muted'} />
        </span>

        <p className="text-[14px] text-muted">{front ? 'En japonés' : 'En español'}</p>
        <div className="mt-3 min-h-16">
          {front ? <JaFace item={item} /> : <p className="text-[28px] font-extrabold leading-tight">{item.es}</p>}
        </div>
        {/* Pronunciación bar (TTS) — tap only, never auto-play on card load.
            Only vocab has pre-generated audio (D-04); kanji/grammar keep Web Speech. */}
        {front && (
          <SpeakerButton
            text={jaSpeechText(item)}
            label="Pronunciación"
            audioKey={item.type === 'vocab' ? item.id : undefined}
          />
        )}

        {revealed ? (
          <div className="mt-5 border-t border-ink/10 pt-4">
            <p className="text-[14px] text-muted">{front ? 'En español' : 'En japonés'}</p>
            <div className="mt-2">
              {front ? (
                <p className="text-[22px] font-bold leading-snug">{item.es}</p>
              ) : (
                <JaFace item={item} />
              )}
            </div>
            {!front && (
              <SpeakerButton
                text={jaSpeechText(item)}
                label="Pronunciación"
                audioKey={item.type === 'vocab' ? item.id : undefined}
              />
            )}
            {example && (
              <p className="mt-3 text-[16px] leading-normal">
                <JapaneseText
                  kanji={example.kanji}
                  kana={example.kana}
                  romaji={example.romaji}
                  tokens={example.tokens}
                />
                <span className="mt-1 block text-[14px] text-muted">{example.es}</span>
              </p>
            )}
            {/* grammar examples[0] has no pre-generated audio (D-04); only vocab
                examples map to the `<itemId>:example` manifest key */}
            {example && (
              <SpeakerButton
                text={example.kana}
                audioKey={item.type === 'vocab' ? exampleKey(item.id) : undefined}
              />
            )}
          </div>
        ) : (
          <p className="mt-5 text-[14px] text-muted">Toca la tarjeta para ver la respuesta</p>
        )}
      </button>

      {revealed && (
        <div className="grid grid-cols-4 gap-2">
          {GRADES.map(({ label, grade: g, className }) => (
            <button
              key={label}
              type="button"
              onClick={() => pick(g)}
              className={`min-h-11 rounded-full px-1 py-3 text-[14px] font-bold shadow-card transition active:scale-[0.97] ${className}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

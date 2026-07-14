// "¿Sabías que?" interstitial (Phase 4) — a NON-gradable, self-advancing review
// card shown every few exercises. Surfaces a grammar pattern or a cultural note
// (notes are otherwise never seen in practice). Distinct gold styling so it
// reads as a break, not an exercise. Own "Entendido" button (frameless).
import JapaneseText from '../display/JapaneseText'
import type { Grammar, Note } from '../content/content'

interface Props {
  grammar?: Grammar
  note?: Note
  onNext: () => void
}

export default function SabiasQue({ grammar, note, onNext }: Props) {
  const example = grammar?.examples?.[0]
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl bg-gold/25 p-5 shadow-card">
        <p className="text-[13px] font-extrabold uppercase tracking-wide text-amber-700">
          ✨ ¿Sabías que?
        </p>

        {grammar && (
          <>
            <p lang="ja" className="jp-text mt-3 text-[24px] font-extrabold leading-tight">
              {grammar.pattern}
            </p>
            <p className="mt-2 text-[15px] leading-normal text-ink">{grammar.es}</p>
            {example && (
              <div className="mt-3 rounded-2xl bg-white/70 p-3">
                <p className="text-[18px] font-bold">
                  <JapaneseText
                    kanji={example.kanji}
                    kana={example.kana}
                    romaji={example.romaji}
                    tokens={example.tokens}
                  />
                </p>
                <p className="mt-1 text-[13px] text-muted">{example.es}</p>
              </div>
            )}
          </>
        )}

        {note && <p className="mt-3 text-[16px] leading-normal text-ink">{note.es}</p>}
      </div>

      <button
        type="button"
        onClick={onNext}
        className="min-h-14 w-full rounded-full bg-indigo text-[16px] font-bold text-white shadow-card transition active:scale-[0.99]"
      >
        Entendido
      </button>
    </div>
  )
}

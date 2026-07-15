// Verb conjugation table (Phase 6, DISP-01) — renders a Vocab's `conjugation`
// (the ます paradigm emitted by the skill in Phase 5) as a readable, mobile-first
// list: 5 forms with ES labels + kana + romaji, the verb group, and an "Irregular"
// marker. ConjForm carries no tokens/display-mode, so it renders plain kana
// (lang="ja" jp-text) — not the ruby renderer. Only mounted behind an `item.conjugation`
// guard in VocabDetail, so non-verbs never reach it. Per-form pronunciation uses
// SpeakerButton without an audioKey (no pre-generated audio for forms in v1) → it
// falls back to Web Speech and hides itself when no ja-JP voice exists.
import SpeakerButton from './SpeakerButton'
import type { Conjugation } from '../content/content'

const FORMS: { key: keyof Conjugation; label: string }[] = [
  { key: 'dictionary', label: 'Diccionario' },
  { key: 'masu', label: 'Presente (ます)' },
  { key: 'masen', label: 'Presente negativo (ません)' },
  { key: 'mashita', label: 'Pasado (ました)' },
  { key: 'masendeshita', label: 'Pasado negativo (ませんでした)' },
]

const GROUP_LABEL: Record<Conjugation['group'], string> = {
  ichidan: 'Ichidan (grupo 2)',
  godan: 'Godan (grupo 1)',
  irregular: 'Irregular',
}

export default function ConjugationTable({ conjugation }: { conjugation: Conjugation }) {
  const isIrregular = conjugation.irregular === true || conjugation.group === 'irregular'

  return (
    <div className="mt-4 rounded-2xl bg-lavender/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[14px] font-bold text-muted">Conjugación</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            isIrregular ? 'bg-coral/20 text-coral' : 'bg-bg text-muted'
          }`}
        >
          {GROUP_LABEL[conjugation.group]}
        </span>
      </div>
      <ul className="mt-3 flex list-none flex-col gap-2 p-0">
        {FORMS.map(({ key, label }) => {
          const form = conjugation[key] as Conjugation['dictionary']
          return (
            <li key={key} className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-muted">{label}</span>
              <div className="flex items-center gap-1 text-right">
                <div>
                  <span lang="ja" className="jp-text text-[17px] font-bold">
                    {form.kana}
                  </span>
                  <span className="block text-[13px] text-muted">{form.romaji}</span>
                </div>
                <SpeakerButton text={form.kana} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

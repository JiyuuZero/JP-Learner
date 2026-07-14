// Class ordering control (asc/desc by date) for the Glosario and Gramática
// "por clase" lists. Segmented pill toggle, indigo active.
import type { ClassMeta } from '../content/store'

export type SortDir = 'asc' | 'desc'

// Order a copy of the class list by date. 'asc' = oldest first (Clase 1 → N),
// 'desc' = newest first.
export function orderClasses(classes: readonly ClassMeta[], dir: SortDir): ClassMeta[] {
  return [...classes].sort((a, b) =>
    dir === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date),
  )
}

const OPTIONS: { id: SortDir; label: string }[] = [
  { id: 'asc', label: 'Antiguas primero' },
  { id: 'desc', label: 'Nuevas primero' },
]

export default function ClassSort({
  dir,
  onChange,
}: {
  dir: SortDir
  onChange: (d: SortDir) => void
}) {
  return (
    <div className="flex gap-2" role="group" aria-label="Ordenar clases">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={dir === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-10 flex-1 rounded-full px-3 text-[13px] font-bold transition ${
            dir === o.id ? 'bg-indigo text-white' : 'bg-white text-ink shadow-card'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

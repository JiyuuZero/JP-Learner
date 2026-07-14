// Class ordering control (asc/desc by date) for the Glosario and Gramática
// "por clase" lists. A single compact sort button (like most apps): tap to
// toggle; the icon shows the sort glyph with an up (oldest→newest) or down
// (newest→oldest) arrow.
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react'
import type { ClassMeta } from '../content/store'

export type SortDir = 'asc' | 'desc'

// Order a copy of the class list by date. 'asc' = oldest first (Clase 1 → N),
// 'desc' = newest first.
export function orderClasses(classes: readonly ClassMeta[], dir: SortDir): ClassMeta[] {
  return [...classes].sort((a, b) =>
    dir === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date),
  )
}

export default function ClassSort({
  dir,
  onChange,
}: {
  dir: SortDir
  onChange: (d: SortDir) => void
}) {
  const label = dir === 'asc' ? 'Antiguas primero' : 'Nuevas primero'
  const Icon = dir === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow
  return (
    <button
      type="button"
      onClick={() => onChange(dir === 'asc' ? 'desc' : 'asc')}
      aria-label={`Ordenar clases por fecha: ${label}. Toca para cambiar.`}
      title={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-card transition active:scale-[0.95]"
    >
      <Icon size={20} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}

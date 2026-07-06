import type { ReactNode } from 'react'

type Tint = 'lavender' | 'mint' | 'peach' | 'softblue' | 'dark'

interface CardProps {
  tint?: Tint
  padding?: 'large' | 'compact'
  children: ReactNode
}

const TINTS: Record<Tint, string> = {
  lavender: 'bg-lavender',
  mint: 'bg-mint',
  peach: 'bg-peach',
  softblue: 'bg-softblue',
  dark: 'bg-dark text-white',
}

// rounded-3xl (24px), soft shadow, 24px inner padding (large) / 16px (compact).
export default function Card({ tint, padding = 'large', children }: CardProps) {
  const bg = tint ? TINTS[tint] : 'bg-white'
  const pad = padding === 'compact' ? 'p-4' : 'p-6'
  return <div className={`rounded-3xl shadow-soft ${bg} ${pad}`}>{children}</div>
}

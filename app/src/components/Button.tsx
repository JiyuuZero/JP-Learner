import type { ReactNode } from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  onClick?: () => void
  children: ReactNode
  disabled?: boolean
}

// Primary = full-width 56px indigo pill; secondary = white pill with indigo border/text.
// Min hit area 44px guaranteed by the 56px height.
export default function Button({ variant = 'primary', onClick, children, disabled }: ButtonProps) {
  const styles =
    variant === 'secondary'
      ? 'bg-white text-indigo border-2 border-indigo'
      : 'bg-indigo text-white'
  return (
    <button
      type="button"
      className={`h-14 w-full rounded-full text-[16px] font-bold transition active:scale-[0.98] disabled:opacity-50 ${styles}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

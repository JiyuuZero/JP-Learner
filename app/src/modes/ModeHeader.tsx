// Shared exercise-mode header — back arrow + centered title + optional right
// slot, mirroring the Session frame header (BottomNav hides on /ejercicios).
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function ModeHeader({ title, right }: { title: string; right?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Volver"
        onClick={() => void navigate('/')}
        className="flex h-11 w-11 items-center justify-center"
      >
        <ArrowLeft size={22} />
      </button>
      <h1 className="flex-1 text-center text-[20px] font-bold">{title}</h1>
      {right ?? <span className="h-11 w-11" aria-hidden="true" />}
    </header>
  )
}

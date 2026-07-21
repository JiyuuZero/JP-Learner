// Exercise-mode player — /ejercicios/:modeId resolves the mode in the
// registry and renders its self-contained component. Modes are practice-only
// (no SRS writes); the flashcard session at /session stays the primary system.
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { modeById } from '../modes/registry'

export default function Ejercicio() {
  const navigate = useNavigate()
  const { modeId } = useParams()
  const mode = modeId !== undefined ? modeById(modeId) : undefined

  if (!mode) {
    return (
      <main className="mt-12">
        <Card>
          <h2 className="text-[20px] font-bold">Ejercicio no encontrado</h2>
          <p className="mt-2 mb-6 text-[14px] text-muted">
            Este modo de ejercicio no existe (todavía).
          </p>
          <Button onClick={() => void navigate('/')}>Volver al inicio</Button>
        </Card>
      </main>
    )
  }

  const Body = mode.Component
  return <Body />
}

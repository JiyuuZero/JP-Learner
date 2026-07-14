// Practice session frame (SRS-02, D-01 hybrid, UI-SPEC §Practice session).
// Top: back arrow + centered title + points pill. Under it: numbered progress
// bar (indigo active). Body: the current exercise in a large rounded card
// area. Bottom: ONE full-width 56px pill (Comprobar -> Seguir) replacing the
// bottom nav (BottomNav hides itself on /session).
//
// Hybrid session (D-01): AUTOMATIC mode builds the queue with buildSession
// (reviews-before-new + the SRS-05 new-card cap come from it) and rotates the
// exercise type per item by SIMPLE ROTATION — never by maturity (that is v2,
// ADAPT-01). The user can instead pick ONE exercise type (manual mode) over
// the same queue. Launch params (scope + subMode) arrive via the route query
// (?scope=hoy|semana|total&subMode=srs|periodo — Plan 06's dashboard wires
// them); sensible defaults make Session fully testable standalone.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Button from '../components/Button'
import Card from '../components/Card'
import { useContent } from '../content/context'
import { useProgress } from '../progress/ProgressContext'
import { buildSession } from '../progress/srs'
import type { ReviewScope, SessionItem, SubMode } from '../progress/session'
import {
  flashcard,
  grammarExerciseFor,
  matching,
  multipleChoice,
  typing,
  wordBank,
  GRAMMAR_ROTATION,
  type Direction,
  type ExerciseKind,
  type FlashcardExercise,
  type GrammarChoiceExercise,
  type GrammarClozeExercise,
  type GrammarReorderExercise,
  type MatchingExercise,
  type MultipleChoiceExercise,
  type TypingExercise,
  type WordBankExercise,
} from '../exercises/generators'
import Flashcard from '../exercises/Flashcard'
import MultipleChoice from '../exercises/MultipleChoice'
import Typing from '../exercises/Typing'
import WordBank from '../exercises/WordBank'
import Matching from '../exercises/Matching'
import GrammarReorder from '../exercises/GrammarReorder'
import GrammarCloze from '../exercises/GrammarCloze'
import GrammarChoice from '../exercises/GrammarChoice'
import SabiasQue from '../exercises/SabiasQue'
import type { Grammar, Note, Vocab } from '../content/content'

// Show a "¿Sabías que?" interstitial after every N exercises.
const INTERSTITIAL_EVERY = 4

const ROTATION: ExerciseKind[] = ['flashcard', 'multipleChoice', 'typing', 'wordBank', 'matching']

const KIND_LABELS: { kind: ExerciseKind; label: string }[] = [
  { kind: 'flashcard', label: 'Tarjetas' },
  { kind: 'multipleChoice', label: 'Opción múltiple' },
  { kind: 'typing', label: 'Escribir' },
  { kind: 'wordBank', label: 'Banco de palabras' },
  { kind: 'matching', label: 'Emparejar' },
]

const SCOPES: { id: ReviewScope; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Semana' },
  { id: 'total', label: 'Total' },
]

const SUB_MODES: { id: SubMode; label: string }[] = [
  { id: 'srs', label: 'Repaso SRS' },
  { id: 'periodo', label: 'Repasar periodo' },
]

type Exercise =
  | FlashcardExercise
  | MultipleChoiceExercise
  | TypingExercise
  | WordBankExercise
  | MatchingExercise
  | GrammarReorderExercise
  | GrammarClozeExercise
  | GrammarChoiceExercise

// Human label per exercise kind (header title), incl. the grammar kinds.
function labelForKind(kind: Exercise['kind']): string {
  switch (kind) {
    case 'grammarReorder':
      return 'Gramática · ordenar'
    case 'grammarCloze':
      return 'Gramática · completar'
    case 'grammarChoice':
      return 'Gramática · significado'
    default:
      return KIND_LABELS.find((k) => k.kind === kind)?.label ?? 'Práctica'
  }
}

interface CurrentExercise {
  exercise: Exercise
  si: SessionItem
  run: SessionItem[] // items consumed by this step (>1 only for matching)
  direction: Direction
}

// Resolve the exercise kind for an item with graceful fallbacks: non-vocab
// items always flashcard; word-bank needs authored example tokens (A2);
// multiple choice needs 3 same-class distractors; matching needs a >=2 run.
function resolveKind(
  si: SessionItem,
  preferred: ExerciseKind,
  pool: Vocab[],
  runLength: number,
): ExerciseKind {
  if (si.item.type !== 'vocab') return 'flashcard'
  let kind = preferred
  if (kind === 'matching' && runLength < 2) kind = 'multipleChoice'
  if (kind === 'wordBank' && !(si.item.example?.tokens && si.item.example.tokens.length > 0)) {
    kind = 'multipleChoice'
  }
  if (kind === 'multipleChoice' && pool.filter((v) => v.id !== si.item.id).length < 3) {
    kind = 'typing'
  }
  return kind
}

export default function Session() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { store } = useContent()
  const { ready, meta, srsByItem } = useProgress()

  const initialScope = (params.get('scope') ?? 'total') as ReviewScope
  const initialSubMode = (params.get('subMode') ?? 'srs') as SubMode
  const [scope, setScope] = useState<ReviewScope>(
    SCOPES.some((s) => s.id === initialScope) ? initialScope : 'total',
  )
  const [subMode, setSubMode] = useState<SubMode>(
    SUB_MODES.some((s) => s.id === initialSubMode) ? initialSubMode : 'srs',
  )

  // null = automatic rotation (D-01 default); a kind = manual pick
  const [manualKind, setManualKind] = useState<ExerciseKind | null>(null)
  const [queue, setQueue] = useState<SessionItem[] | null>(null)
  const [index, setIndex] = useState(0)
  // Rotation cursor: increments once per EXERCISE shown (not per item
  // consumed). Rotating on the queue index degenerates into matching-only:
  // a 5-item matching round advances the index by 5 ≡ 0 (mod ROTATION.length),
  // landing on 'matching' again (WR-02).
  const [step, setStep] = useState(0)
  // The step value at which the current "¿Sabías que?" interstitial was dismissed
  // (-1 = none). Prevents re-showing the same interstitial for the same step.
  const [interstitialStep, setInterstitialStep] = useState(-1)
  const [phase, setPhase] = useState<'answer' | 'feedback'>('answer')
  const [canCheck, setCanCheck] = useState(false)
  const checkFnRef = useRef<(() => boolean) | null>(null)

  const registerCheck = useCallback((fn: (() => boolean) | null) => {
    checkFnRef.current = fn
  }, [])
  const onReadyChange = useCallback((r: boolean) => setCanCheck(r), [])

  const start = useCallback(
    (kind: ExerciseKind | null) => {
      if (!store) return
      setManualKind(kind)
      // Reviews-before-new ordering + the SRS-05 daily new-card cap live in buildSession.
      let q = buildSession(store, srsByItem, scope, subMode, new Date(), meta ?? undefined)
      // Grammar-only practice (from the Gramática section): ?only=grammar
      if (params.get('only') === 'grammar') q = q.filter((si) => si.item.type === 'grammar')
      setQueue(q)
      setIndex(0)
      setStep(0)
      setInterstitialStep(-1)
      setPhase('answer')
      setCanCheck(false)
    },
    [store, srsByItem, scope, subMode, meta, params],
  )

  // "Continuar donde lo dejaste" (Home) links here with ?auto=1 to resume the
  // automatic hybrid session directly, skipping the picker (D-01). Fire once.
  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (autoStartedRef.current || queue !== null || !store || !ready) return
    if (params.get('auto') === '1') {
      autoStartedRef.current = true
      start(null)
    }
  }, [store, ready, params, queue, start])

  // The exercise instance is built ONCE per index (memo) — generators shuffle,
  // so building in render would reshuffle options mid-exercise.
  const current: CurrentExercise | null = useMemo(() => {
    if (!store || !queue || index >= queue.length) return null
    const si = queue[index]
    const pool = store.byClass.get(si.classId)?.vocab ?? []
    const direction: Direction = index % 2 === 0 ? 'JA_ES' : 'ES_JA'
    // Grammar items get their OWN exercises (reorder/cloze/choice, rotated) —
    // never the vocab flashcard shortcut. Kanji still falls through to flashcard.
    if (si.item.type === 'grammar') {
      const gk = GRAMMAR_ROTATION[step % GRAMMAR_ROTATION.length]
      const exercise = grammarExerciseFor(si.item as Grammar, [...store.grammarById.values()], gk)
      return { exercise, si, run: [si], direction }
    }
    // consecutive vocab run from here (candidate matching batch)
    const run: SessionItem[] = []
    for (let i = index; i < queue.length && run.length < 5; i++) {
      if (queue[i].item.type === 'vocab') run.push(queue[i])
      else break
    }
    const preferred = manualKind ?? ROTATION[step % ROTATION.length]
    const kind = resolveKind(si, preferred, pool, run.length)
    let exercise: Exercise
    switch (kind) {
      case 'matching':
        exercise = matching(
          run.map((r) => r.item as Vocab),
          direction,
        )
        break
      case 'wordBank':
        // resolveKind guarantees authored tokens exist; multipleChoice is the
        // defensive fallback (never in-app splitting).
        exercise = wordBank(si.item as Vocab, pool, direction) ?? multipleChoice(si.item as Vocab, pool, direction)
        break
      case 'multipleChoice':
        exercise = multipleChoice(si.item as Vocab, pool, direction)
        break
      case 'typing':
        exercise = typing(si.item as Vocab, pool, direction)
        break
      default:
        exercise = flashcard(si.item, pool, direction)
    }
    return { exercise, si, run: exercise.kind === 'matching' ? run : [si], direction }
  }, [store, queue, index, step, manualKind])

  // "¿Sabías que?" pool: grammar patterns + cultural notes from the classes in
  // this session's queue (notes are otherwise never surfaced during practice).
  const interstitialPool = useMemo(() => {
    if (!store || !queue) return [] as ({ grammar: Grammar } | { note: Note })[]
    const out: ({ grammar: Grammar } | { note: Note })[] = []
    for (const cid of [...new Set(queue.map((q) => q.classId))]) {
      const b = store.byClass.get(cid)
      if (!b) continue
      b.grammar.forEach((g) => out.push({ grammar: g }))
      b.notes.forEach((n) => out.push({ note: n }))
    }
    return out
  }, [store, queue])

  const advance = useCallback(
    (by: number) => {
      setIndex((i) => i + by)
      setStep((s) => s + 1) // one rotation step per exercise, regardless of items consumed
      setPhase('answer')
      setCanCheck(false)
      checkFnRef.current = null
    },
    [],
  )

  const onAction = () => {
    if (!current) {
      void navigate('/')
      return
    }
    if (phase === 'answer') {
      checkFnRef.current?.()
      setPhase('feedback')
    } else {
      advance(current.run.length)
    }
  }

  // ---- render ---------------------------------------------------------------

  if (!store || !ready) {
    return (
      <main>
        <p className="mt-12 text-center text-[14px] text-muted">Cargando tu contenido…</p>
      </main>
    )
  }

  // Launcher / picker (hybrid D-01: automatic default + manual type pick)
  if (queue === null) {
    return (
      <main className="pb-8">
        <header className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => void navigate('/')}
            className="flex h-11 w-11 items-center justify-center"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="flex-1 text-center text-[20px] font-bold">Práctica</h1>
          <span className="rounded-full bg-gold px-3 py-1 text-[14px] font-bold text-ink">
            {meta?.points ?? 0} pts
          </span>
        </header>

        <section className="mt-6">
          <h2 className="mb-2 text-[14px] font-bold text-muted">Ámbito</h2>
          <div className="flex gap-2">
            {SCOPES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScope(s.id)}
                className={`min-h-11 flex-1 rounded-full px-3 text-[14px] font-bold transition ${
                  scope === s.id ? 'bg-indigo text-white' : 'bg-white text-ink shadow-card'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            {SUB_MODES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSubMode(s.id)}
                className={`min-h-11 flex-1 rounded-full px-3 text-[14px] font-bold transition ${
                  subMode === s.id ? 'bg-indigo text-white' : 'bg-white text-ink shadow-card'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[13px] leading-normal text-muted">
            {subMode === 'srs'
              ? 'Repaso SRS: solo las tarjetas que la repetición espaciada marca para hoy (más las nuevas del día, hasta 10). Puede ser un puñado o ninguna si vas al día.'
              : 'Repasar periodo: todas las tarjetas del bloque elegido, tocaran hoy o no. Repaso intensivo.'}
          </p>
        </section>

        <section className="mt-8 flex flex-col gap-3">
          <Button onClick={() => start(null)}>Empezar · Automático</Button>
          <p className="text-center text-[13px] text-muted">o elige un tipo de ejercicio</p>
          <div className="grid grid-cols-2 gap-2">
            {KIND_LABELS.map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                onClick={() => start(kind)}
                className="min-h-12 rounded-2xl bg-white px-3 py-3 text-[14px] font-bold text-indigo shadow-card transition active:scale-[0.98]"
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      </main>
    )
  }

  // Empty queue: nothing due in this scope/sub-mode
  if (queue.length === 0) {
    return (
      <main>
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <h2 className="text-[20px] font-bold">¡Todo al día!</h2>
          <p className="text-[14px] text-muted">
            No tienes repasos pendientes hoy. Puedes repasar un periodo entero cuando quieras.
          </p>
        </div>
        <div className="mt-8">
          <Button onClick={() => setQueue(null)}>Terminar sesión</Button>
        </div>
      </main>
    )
  }

  // Session finished
  if (!current) {
    return (
      <main>
        <div className="mt-16">
          <Card tint="mint">
            <h2 className="text-[24px] font-extrabold">¡Bien!</h2>
            <p className="mt-2 text-[16px] leading-normal">
              Sesión completada: {queue.length} {queue.length === 1 ? 'ejercicio' : 'ejercicios'}.
            </p>
            <p className="mt-1 text-[14px] text-muted">{meta?.points ?? 0} pts acumulados</p>
          </Card>
        </div>
        <div className="mt-8">
          <Button onClick={() => void navigate('/')}>Terminar sesión</Button>
        </div>
      </main>
    )
  }

  const { exercise, si, run, direction } = current
  const kind = exercise.kind

  // Interstitial "¿Sabías que?" between exercises, every INTERSTITIAL_EVERY steps.
  // It does NOT consume the queue item at `index` — dismissing it just marks this
  // step as seen, then the real exercise for (index, step) renders.
  const interstitial =
    step > 0 &&
    step % INTERSTITIAL_EVERY === 0 &&
    interstitialStep !== step &&
    interstitialPool.length > 0
      ? interstitialPool[(step / INTERSTITIAL_EVERY - 1) % interstitialPool.length]
      : null

  // self-advancing bodies (own button, no Comprobar/Seguir bar)
  const frameless = kind === 'flashcard' || kind === 'matching' || interstitial !== null

  return (
    <main className="pb-28">
      <header className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Volver"
          onClick={() => void navigate('/')}
          className="flex h-11 w-11 items-center justify-center"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-[20px] font-bold">
          {interstitial ? 'Repaso' : labelForKind(kind)}
        </h1>
        <span className="rounded-full bg-gold px-3 py-1 text-[14px] font-bold text-ink">
          {meta?.points ?? 0} pts
        </span>
      </header>

      {/* numbered progress bar 1..N — indigo active (UI-SPEC) */}
      <div className="mt-4 flex items-center gap-1">
        {queue.map((q, i) => (
          <div
            key={`${q.item.id}-${i}`}
            className={`flex h-6 flex-1 items-center justify-center rounded-full text-[11px] font-bold ${
              i < index
                ? 'bg-indigo/30 text-white'
                : i === index
                  ? 'bg-indigo text-white'
                  : 'bg-lavender text-muted'
            }`}
          >
            {queue.length <= 12 ? i + 1 : ''}
          </div>
        ))}
      </div>

      {/* direction indicator (EXER-06) — sides swap, no separate screen.
          Hidden for grammar exercises and interstitials (direction n/a). */}
      {!interstitial && !kind.startsWith('grammar') && (
        <p className="mt-2 text-center text-[12px] font-bold text-muted">
          {direction === 'JA_ES' ? 'JA → ES' : 'ES → JA'}
        </p>
      )}

      <div className="mt-4">
        {interstitial && (
          <SabiasQue
            key={`int-${step}`}
            grammar={'grammar' in interstitial ? interstitial.grammar : undefined}
            note={'note' in interstitial ? interstitial.note : undefined}
            onNext={() => setInterstitialStep(step)}
          />
        )}
        {!interstitial && exercise.kind === 'flashcard' && (
          <Flashcard
            key={index}
            exercise={exercise}
            classId={si.classId}
            onNext={() => advance(1)}
          />
        )}
        {!interstitial && exercise.kind === 'multipleChoice' && (
          <MultipleChoice
            key={index}
            exercise={exercise}
            classId={si.classId}
            phase={phase}
            onReadyChange={onReadyChange}
            registerCheck={registerCheck}
          />
        )}
        {!interstitial && exercise.kind === 'typing' && (
          <Typing
            key={index}
            exercise={exercise}
            classId={si.classId}
            phase={phase}
            onReadyChange={onReadyChange}
            registerCheck={registerCheck}
          />
        )}
        {!interstitial && exercise.kind === 'wordBank' && (
          <WordBank
            key={index}
            exercise={exercise}
            classId={si.classId}
            phase={phase}
            onReadyChange={onReadyChange}
            registerCheck={registerCheck}
          />
        )}
        {!interstitial && exercise.kind === 'matching' && (
          <Matching
            key={index}
            exercise={exercise}
            classIdByItem={new Map(run.map((r) => [r.item.id, r.classId]))}
            onFinish={() => advance(run.length)}
          />
        )}
        {!interstitial && exercise.kind === 'grammarReorder' && (
          <GrammarReorder
            key={index}
            exercise={exercise}
            classId={si.classId}
            phase={phase}
            onReadyChange={onReadyChange}
            registerCheck={registerCheck}
          />
        )}
        {!interstitial && exercise.kind === 'grammarCloze' && (
          <GrammarCloze
            key={index}
            exercise={exercise}
            classId={si.classId}
            phase={phase}
            onReadyChange={onReadyChange}
            registerCheck={registerCheck}
          />
        )}
        {!interstitial && exercise.kind === 'grammarChoice' && (
          <GrammarChoice
            key={index}
            exercise={exercise}
            classId={si.classId}
            phase={phase}
            onReadyChange={onReadyChange}
            registerCheck={registerCheck}
          />
        )}
      </div>

      {/* bottom full-width 56px pill — replaces the bottom nav during a session.
          Flashcard/matching bodies self-advance, so the bar hides for them. */}
      {!frameless && (
        <div className="fixed inset-x-0 bottom-0 z-10 bg-bg px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <div className="mx-auto max-w-[480px]">
            <Button disabled={phase === 'answer' && !canCheck} onClick={onAction}>
              {phase === 'answer' ? 'Comprobar' : 'Seguir'}
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}

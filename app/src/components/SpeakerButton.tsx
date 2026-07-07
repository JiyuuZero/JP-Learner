// Speaker button (TTS-01/02) — speaks Japanese ON TAP only (never auto-play).
// Phase 2 fallback chain: pre-generated .m4a (audioKey in the manifest) ->
// Web Speech ja-JP -> HIDDEN (returns null — never disabled) when neither
// capability exists (UI-SPEC no-voice rule). speak() runs inside the tap
// handler itself, satisfying the iOS user-gesture requirement. Rendered as
// span[role=button] because some hosts are themselves <button> elements (the
// Flashcard reveal card) — nested native buttons are invalid HTML.
import type { KeyboardEvent, SyntheticEvent } from 'react'
import { Volume2 } from 'lucide-react'
import { useTts } from '../tts/TtsContext'

interface SpeakerButtonProps {
  text: string
  // Manifest key — item.id for the word, exampleKey(item.id) for its example
  // sentence; omitted for grammar/kanji -> Web Speech only.
  audioKey?: string
  // With a label ("Pronunciación") renders the bar variant (UI-SPEC flashcard);
  // without it, a plain 44px icon button.
  label?: string
  className?: string
}

export default function SpeakerButton({ text, audioKey, label, className = '' }: SpeakerButtonProps) {
  const { hasVoice, hasAudio, speak } = useTts()
  const canSpeak = (audioKey !== undefined && hasAudio(audioKey)) || hasVoice
  if (!canSpeak) return null // hide, never disable (TTS-02)

  const onActivate = (e: SyntheticEvent) => {
    e.stopPropagation() // don't flip the flashcard / open the row underneath
    speak(text, audioKey) // inside the tap gesture (iOS requirement, TTS-01)
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onActivate(e)
    }
  }

  if (label !== undefined) {
    return (
      <span
        role="button"
        tabIndex={0}
        aria-label={`${label}: escuchar en japonés`}
        onClick={onActivate}
        onKeyDown={onKeyDown}
        className={`mt-3 flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-[14px] font-bold text-indigo transition active:scale-[0.97] ${className}`}
      >
        <Volume2 size={18} strokeWidth={2} />
        {label}
      </span>
    )
  }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label="Escuchar en japonés"
      onClick={onActivate}
      onKeyDown={onKeyDown}
      className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center text-indigo transition active:scale-[0.95] ${className}`}
    >
      <Volume2 size={20} strokeWidth={2} />
    </span>
  )
}

// TTS context (TTS-01/02) — runs ja-JP voice detection once on mount and
// exposes { hasVoice, speak } to the whole app. SpeakerButton consumes this:
// hasVoice === false hides every speaker button (UI-SPEC no-voice rule).
// The default value is a safe no-op so nothing crashes outside the provider.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { initTTS, speakJa } from './tts'

export interface TtsContextValue {
  hasVoice: boolean
  speak: (text: string) => void
}

const TtsContext = createContext<TtsContextValue>({ hasVoice: false, speak: () => undefined })

export function useTts(): TtsContextValue {
  return useContext(TtsContext)
}

export function TtsProvider({ children }: { children: ReactNode }) {
  const [hasVoice, setHasVoice] = useState(false)

  useEffect(() => {
    initTTS(setHasVoice)
  }, [])

  // speak stays a stable identity; speakJa itself no-ops without a voice.
  const speak = useCallback((text: string) => speakJa(text), [])

  return <TtsContext.Provider value={{ hasVoice, speak }}>{children}</TtsContext.Provider>
}

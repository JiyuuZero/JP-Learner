// TTS context (TTS-01/02) — runs ja-JP voice detection once on mount, loads
// the pre-generated audio manifest (content/audio/index.json) alongside it
// (404/missing/HTML -> empty map, never an error), and exposes
// { hasVoice, audioReady, hasAudio, speak } to the whole app.
// speak(text, audioKey?) implements the Phase 2 fallback chain:
//   (1) pre-generated .m4a when audioKey is in the manifest,
//   (2) Web Speech ja-JP (speakJa no-ops without a voice — never a wrong voice),
//   (3) nothing — SpeakerButton hides itself when neither capability exists.
// The default value is a safe no-op so nothing crashes outside the provider.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { initTTS, speakJa } from './tts'
import { loadAudioManifest, playAudio, stopAudio, type AudioManifest } from './audio'

export interface TtsContextValue {
  hasVoice: boolean
  audioReady: boolean // manifest has >= 1 entry (drives the Perfil status line)
  hasAudio: (key: string) => boolean
  speak: (text: string, audioKey?: string) => void
}

const TtsContext = createContext<TtsContextValue>({
  hasVoice: false,
  audioReady: false,
  hasAudio: () => false,
  speak: () => undefined,
})

export function useTts(): TtsContextValue {
  return useContext(TtsContext)
}

export function TtsProvider({ children }: { children: ReactNode }) {
  const [hasVoice, setHasVoice] = useState(false)
  const [manifest, setManifest] = useState<AudioManifest>({})

  useEffect(() => {
    initTTS(setHasVoice)
  }, [])

  // Load the audio manifest once at boot (alongside content). It resolves to
  // {} on any failure — loadAudioManifest never rejects.
  useEffect(() => {
    let alive = true
    void loadAudioManifest().then((m) => {
      if (alive) setManifest(m)
    })
    return () => {
      alive = false
    }
  }, [])

  // Fallback chain (D-05): pre-generated audio first, else Web Speech.
  // speakJa already no-ops with no ja-JP voice, so the chain can never end in
  // a wrong voice (TTS-02). stopAudio() is the other half of the never-overlap
  // invariant: playAudio cancels Web Speech before playing a file, and here we
  // stop any playing file before speaking a Web Speech utterance.
  const speak = useCallback(
    (text: string, audioKey?: string) => {
      if (audioKey && playAudio(manifest, audioKey)) return
      stopAudio() // never speak Web Speech over a playing .m4a
      speakJa(text)
    },
    [manifest],
  )

  const hasAudio = useCallback((key: string) => key in manifest, [manifest])
  const audioReady = Object.keys(manifest).length > 0

  return (
    <TtsContext.Provider value={{ hasVoice, audioReady, hasAudio, speak }}>
      {children}
    </TtsContext.Provider>
  )
}

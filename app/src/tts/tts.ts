// Web Speech TTS wrapper (TTS-01/02) — native speechSynthesis, no library.
// Voices load ASYNC (getVoices() may return [] on first call); iOS requires a
// user gesture to speak; Android reports the JA voice lang as "ja_JP" with an
// underscore. When no ja-JP voice exists the app degrades gracefully: speakJa
// is a SILENT NO-OP and the speaker button is HIDDEN app-wide — we NEVER speak
// Japanese with a non-Japanese voice (teaches wrong pronunciation, T-06-04).
let jaVoice: SpeechSynthesisVoice | null = null

export function initTTS(onReady: (hasVoice: boolean) => void) {
  if (typeof speechSynthesis === 'undefined') {
    // No Web Speech API in this environment (very old browser / non-DOM env):
    // report "no voice" so every speaker button stays hidden.
    onReady(false)
    return
  }
  const pick = () => {
    const v = speechSynthesis.getVoices()
    jaVoice = v.find((x) => /ja[-_]JP/i.test(x.lang)) ?? null // Android uses ja_JP underscore
    onReady(!!jaVoice)
  }
  pick() // may return [] on first call
  speechSynthesis.addEventListener('voiceschanged', pick)
  // Poll a few times at ~250ms in case voiceschanged never fires (some WebViews).
  let polls = 0
  const timer = setInterval(() => {
    if (jaVoice !== null || ++polls >= 8) {
      clearInterval(timer)
      return
    }
    pick()
  }, 250)
}

// MUST be called inside a tap handler (iOS user-gesture requirement, TTS-01).
export function speakJa(text: string) {
  if (!jaVoice) return // graceful no-op — NEVER speak JA with a non-JA voice (TTS-02)
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  u.voice = jaVoice
  u.rate = 0.9
  speechSynthesis.cancel()
  speechSynthesis.speak(u)
}

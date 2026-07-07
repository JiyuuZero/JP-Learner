// Pre-generated pronunciation audio (Phase 2, TTS-01 delivery). Fallback
// chain: audio file -> Web Speech -> hidden. NEVER auto-play (tap handler
// only), NEVER a non-Japanese voice (TTS-02).
// The skill commits content/audio/<classId>/*.m4a plus the sidecar manifest
// content/audio/index.json (files: manifest key -> path relative to content/).
// Word key = item.id ; example key = `${item.id}:example`. A missing manifest
// is NOT an error: the app boots with an empty map and Web Speech behavior.
export type AudioManifest = Record<string, string>

const BASE = import.meta.env.BASE_URL // e.g. "/JP-Learner/" (store.ts pattern)

// Manifest key for an item's example sentence (the word itself uses item.id).
export function exampleKey(itemId: string): string {
  return `${itemId}:example`
}

// T-02-07 allowlist: only relative paths under audio/ ending in .m4a. The char
// class excludes "." so `..` traversal cannot appear; absolute/external URLs
// and wrong extensions never match.
const AUDIO_PATH_RE = /^audio\/[A-Za-z0-9_\-/]+\.m4a$/

// PURE (unit-tested). Validates the raw manifest document shape and returns
// its files map with every non-allowlisted entry dropped; anything malformed
// (HTML string, array, missing/misshaped files) degrades to an empty map.
export function parseAudioManifest(raw: unknown): AudioManifest {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const files = (raw as { files?: unknown }).files
  if (typeof files !== 'object' || files === null || Array.isArray(files)) return {}
  const out: AudioManifest = {}
  for (const [key, value] of Object.entries(files)) {
    if (typeof value === 'string' && AUDIO_PATH_RE.test(value)) out[key] = value
  }
  return out
}

// Loads content/audio/index.json at boot. Divergence from store.ts fetchJson
// (D-03): a 404 is NOT an error -> empty map. The GitHub Pages SPA fallback
// can also serve index.html with HTTP 200 (T-02-06), making res.json() throw
// a SyntaxError — every failure path (network, status, parse) resolves to {}
// so this promise NEVER rejects and the app always boots.
export async function loadAudioManifest(): Promise<AudioManifest> {
  try {
    const res = await fetch(`${BASE}content/audio/index.json`)
    if (!res.ok) return {}
    return parseAudioManifest(await res.json())
  } catch {
    return {}
  }
}

// Module-level singleton element (the `jaVoice` analog in tts.ts): at most one
// pronunciation audio exists at a time.
let current: HTMLAudioElement | null = null

// MUST be called inside a tap handler (iOS user-gesture requirement, TTS-01).
// Returns false when the key has no pre-generated audio — the caller falls
// back to Web Speech. A rejected play() (uncached file offline, autoplay
// policy) degrades SILENTLY: it never falls through to a wrong voice (TTS-02).
export function playAudio(manifest: AudioManifest, key: string): boolean {
  // Own-property lookup only: the manifest is a plain object parsed from
  // remote JSON, so `manifest[key]` alone would walk the prototype chain
  // (e.g. key "toString" resolving to a function) — WR-03.
  const path = Object.hasOwn(manifest, key) ? manifest[key] : undefined
  if (path === undefined) return false
  // Never overlap voices: cancel any Web Speech utterance and any playing file
  // (the speechSynthesis.cancel() analog for audio) before starting.
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  if (current) {
    current.pause()
    current.currentTime = 0
  }
  current = new Audio(`${BASE}content/${path}`)
  void current.play().catch(() => undefined)
  return true
}

// Pause + rewind whatever is playing (safe no-op when nothing is).
export function stopAudio(): void {
  if (current) {
    current.pause()
    current.currentTime = 0
  }
}

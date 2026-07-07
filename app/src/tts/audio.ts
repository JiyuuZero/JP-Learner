// Pre-generated pronunciation audio (Phase 2, TTS-01 delivery). Fallback
// chain: audio file -> Web Speech -> hidden. NEVER auto-play (tap handler
// only), NEVER a non-Japanese voice (TTS-02).
// RED-phase stub: exported signatures only, so audio.test.ts fails on
// behavior (thrown "not implemented"), not on a missing module.
export type AudioManifest = Record<string, string>

export function exampleKey(_itemId: string): string {
  throw new Error('not implemented')
}

export function parseAudioManifest(_raw: unknown): AudioManifest {
  throw new Error('not implemented')
}

export async function loadAudioManifest(): Promise<AudioManifest> {
  throw new Error('not implemented')
}

export function playAudio(_manifest: AudioManifest, _key: string): boolean {
  throw new Error('not implemented')
}

export function stopAudio(): void {
  throw new Error('not implemented')
}

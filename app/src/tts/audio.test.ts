// Pre-generated audio manifest tests (Phase 2 decision: skill-side Kyoko audio,
// TTS-01 delivery / TTS-02 fallback-chain invariants). Pure functions only:
// key derivation (word = item.id, example = `${item.id}:example`) and manifest
// parsing with the T-02-07 path allowlist (relative audio/*.m4a only) plus the
// T-02-06 degradation (HTML/malformed/misshaped documents -> empty map).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exampleKey, parseAudioManifest, playAudio, stopAudio } from './audio'

describe('exampleKey (audio manifest key derivation, Phase 2)', () => {
  it('derives the example-sentence key by appending :example to the item id', () => {
    expect(exampleKey('2026-04-14:vocab:tabemasu')).toBe('2026-04-14:vocab:tabemasu:example')
  })
})

describe('parseAudioManifest (manifest validation, T-02-06/T-02-07)', () => {
  const validFiles = {
    '2026-04-14:vocab:tabemasu': 'audio/2026-04-14/2026-04-14_vocab_tabemasu.m4a',
    '2026-04-14:vocab:tabemasu:example': 'audio/2026-04-14/2026-04-14_vocab_tabemasu_example.m4a',
  }

  it('returns exactly the files map of a valid manifest document', () => {
    const doc = {
      audioVersion: 1,
      generatedAt: '2026-07-07T09:00:00Z',
      files: validFiles,
      kanaHashes: { '2026-04-14:vocab:tabemasu': 'sha256-abc' },
    }
    expect(parseAudioManifest(doc)).toEqual(validFiles)
  })

  it('drops traversal, external-URL and wrong-extension entries while keeping valid ones', () => {
    const doc = {
      files: {
        traversal: '../../../etc/evil.m4a',
        external: 'https://evil.example/x.m4a',
        wrongExt: 'audio/2026-04-14/x.mp3',
        ok: 'audio/2026-04-14/2026-04-14_vocab_tabemasu.m4a',
      },
    }
    expect(parseAudioManifest(doc)).toEqual({
      ok: 'audio/2026-04-14/2026-04-14_vocab_tabemasu.m4a',
    })
  })

  it('drops non-string file values', () => {
    expect(parseAudioManifest({ files: { bad: 42, ok: 'audio/a/b.m4a' } })).toEqual({
      ok: 'audio/a/b.m4a',
    })
  })

  it('returns {} for null', () => {
    expect(parseAudioManifest(null)).toEqual({})
  })

  it('returns {} for an HTML string (GitHub Pages SPA fallback served as HTTP 200)', () => {
    expect(parseAudioManifest('<!doctype html><html><body>SPA</body></html>')).toEqual({})
  })

  it('returns {} when files is not an object', () => {
    expect(parseAudioManifest({ files: 'nope' })).toEqual({})
  })

  it('returns {} for an array document', () => {
    expect(parseAudioManifest([])).toEqual({})
  })
})

// Stub HTMLAudioElement: records instances so the never-overlap invariant
// (WR-01) is observable without a real media pipeline.
class FakeAudio {
  static instances: FakeAudio[] = []
  src: string
  paused = true
  currentTime = 0
  played = false
  constructor(src: string) {
    this.src = src
    FakeAudio.instances.push(this)
  }
  play(): Promise<void> {
    this.paused = false
    this.played = true
    return Promise.resolve()
  }
  pause(): void {
    this.paused = true
  }
}

describe('playAudio / stopAudio (never-overlap invariant, WR-01)', () => {
  const manifest = {
    'a:vocab:x': 'audio/a/a_vocab_x.m4a',
    'a:vocab:y': 'audio/a/a_vocab_y.m4a',
  }
  const cancel = vi.fn()

  beforeEach(() => {
    FakeAudio.instances = []
    cancel.mockClear()
    vi.stubGlobal('Audio', FakeAudio)
    vi.stubGlobal('speechSynthesis', { cancel })
  })
  afterEach(() => {
    stopAudio() // leave no module-level playing element behind
    vi.unstubAllGlobals()
  })

  it('returns false (and creates no element) for a key not in the manifest', () => {
    expect(playAudio(manifest, 'a:vocab:missing')).toBe(false)
    expect(FakeAudio.instances).toHaveLength(0)
  })

  it('plays a manifest hit and cancels any Web Speech utterance first', () => {
    expect(playAudio(manifest, 'a:vocab:x')).toBe(true)
    expect(FakeAudio.instances).toHaveLength(1)
    expect(FakeAudio.instances[0].played).toBe(true)
    expect(FakeAudio.instances[0].src).toContain('audio/a/a_vocab_x.m4a')
    expect(cancel).toHaveBeenCalled()
  })

  it('pauses + rewinds the previous file before starting the next (never overlap)', () => {
    playAudio(manifest, 'a:vocab:x')
    const first = FakeAudio.instances[0]
    first.currentTime = 1.5
    playAudio(manifest, 'a:vocab:y')
    expect(first.paused).toBe(true)
    expect(first.currentTime).toBe(0)
    expect(FakeAudio.instances).toHaveLength(2)
  })

  it('stopAudio pauses + rewinds the playing file (Web Speech fallback calls this)', () => {
    playAudio(manifest, 'a:vocab:x')
    const el = FakeAudio.instances[0]
    el.currentTime = 2
    stopAudio()
    expect(el.paused).toBe(true)
    expect(el.currentTime).toBe(0)
  })
})

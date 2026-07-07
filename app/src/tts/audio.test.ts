// Pre-generated audio manifest tests (Phase 2 decision: skill-side Kyoko audio,
// TTS-01 delivery / TTS-02 fallback-chain invariants). Pure functions only:
// key derivation (word = item.id, example = `${item.id}:example`) and manifest
// parsing with the T-02-07 path allowlist (relative audio/*.m4a only) plus the
// T-02-06 degradation (HTML/malformed/misshaped documents -> empty map).
import { describe, expect, it } from 'vitest'
import { exampleKey, parseAudioManifest } from './audio'

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

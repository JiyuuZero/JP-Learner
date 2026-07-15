// @vitest-environment jsdom
// ConjugationTable tests (Phase 6, DISP-01) — pure render over the schema's
// `conjugation` object. Rendered WITHOUT a TtsProvider: useTts's default is a
// safe no-op (hasVoice:false) so SpeakerButton hides itself — this also proves
// the no-voice degradation.
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import ConjugationTable from './ConjugationTable'
import type { Conjugation } from '../content/content'

const taberu: Conjugation = {
  group: 'ichidan',
  dictionary: { kana: 'たべる', romaji: 'taberu' },
  masu: { kana: 'たべます', romaji: 'tabemasu' },
  masen: { kana: 'たべません', romaji: 'tabemasen' },
  mashita: { kana: 'たべました', romaji: 'tabemashita' },
  masendeshita: { kana: 'たべませんでした', romaji: 'tabemasen deshita' },
}

const benkyousuru: Conjugation = {
  group: 'irregular',
  irregular: true,
  dictionary: { kana: 'べんきょうする', romaji: 'benkyō suru' },
  masu: { kana: 'べんきょうします', romaji: 'benkyō shimasu' },
  masen: { kana: 'べんきょうしません', romaji: 'benkyō shimasen' },
  mashita: { kana: 'べんきょうしました', romaji: 'benkyō shimashita' },
  masendeshita: { kana: 'べんきょうしませんでした', romaji: 'benkyō shimasen deshita' },
}

describe('ConjugationTable', () => {
  it('renders the 5 ES-labelled forms with kana + romaji for a regular ichidan verb', () => {
    const { container } = render(<ConjugationTable conjugation={taberu} />)
    const text = container.textContent ?? ''
    for (const label of [
      'Diccionario',
      'Presente (ます)',
      'Presente negativo (ません)',
      'Pasado (ました)',
      'Pasado negativo (ませんでした)',
    ]) {
      expect(text).toContain(label)
    }
    expect(text).toContain('たべます')
    expect(text).toContain('tabemasu')
    expect(text).toContain('たべませんでした')
    expect(text).toContain('Ichidan (grupo 2)')
    // regular verb → no irregular marker
    expect(text).not.toContain('Irregular')
  })

  it('marks an irregular verb', () => {
    const { container } = render(<ConjugationTable conjugation={benkyousuru} />)
    expect(container.textContent ?? '').toContain('Irregular')
  })

  it('renders a form without kanji (kana-only) without throwing and shows no ruby', () => {
    const { container } = render(<ConjugationTable conjugation={taberu} />)
    // ConjForm has no tokens → plain kana, never <ruby>
    expect(container.querySelectorAll('ruby')).toHaveLength(0)
    expect(container.textContent).toContain('たべる')
  })
})

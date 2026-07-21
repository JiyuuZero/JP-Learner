// Partículas — pure queue builder (skill step 7, Part D extra). Reuses the
// existing grammarCloze generator over ALL committed grammar examples whose
// authored `blank` token is a particle (は・を・の・と・も・から〜まで…), i.e.
// the fill-in-the-particle drill aggregated across every class. No new
// Japanese is authored here: sentences, blanks and options all come from the
// committed content + the generator's particle pool.
import { grammarCloze, shuffle, type GrammarClozeExercise } from '../../exercises/generators'
import type { Grammar } from '../../content/content'

// Particles the mode drills (superset of the generator's distractor pool).
export const PARTICLES = new Set([
  'は',
  'が',
  'を',
  'の',
  'に',
  'へ',
  'で',
  'と',
  'か',
  'も',
  'ね',
  'よ',
  'から',
  'まで',
])

// Build a round: shuffled cloze exercises whose ANSWER is a particle.
export function buildParticleQueue(items: Iterable<Grammar>, max = 10): GrammarClozeExercise[] {
  const out: GrammarClozeExercise[] = []
  for (const g of shuffle([...items])) {
    if (out.length >= max) break
    const ex = grammarCloze(g)
    if (ex && PARTICLES.has(ex.answer)) out.push(ex)
  }
  return out
}

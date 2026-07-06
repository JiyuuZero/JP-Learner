// skill/validate.mjs — SKILL-03: the producer-side contract gate. Refuse to write on ANY failure.
// Shape: ajv against the FROZEN content/schema/content.schema.json (the skill never redefines it).
// Semantics: the 3 cross-field renderability invariants + ID determinism, enforced on vocab
// items AND on any sentence (example / grammar example) that carries a tokens[] array.
// Mirrors app/src/content/validate.mjs (Plan 01) — same schema, same invariants, neither drifts.
import Ajv from 'ajv/dist/2020.js'; // draft 2020-12 build (the frozen schema's declared draft)
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';

const schemaUrl = new URL('../content/schema/content.schema.json', import.meta.url);
const schema = JSON.parse(readFileSync(schemaUrl, 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

/** Enforce the 3 renderability invariants on a tokens[] array against written/reading forms. */
function checkTokens(tokens, kanji, kana, where) {
  const surf = tokens.map((t) => t.surface).join('');
  const read = tokens.map((t) => t.reading).join('');
  if (surf !== kanji) throw new Error(`token surface != kanji: ${where}`); // invariant 1
  if (read !== kana) throw new Error(`token reading != kana: ${where}`); // invariant 2
  tokens.forEach((t) => {
    if (t.isKanji && !(t.kanji?.length)) throw new Error(`kanji token missing kanji[]: ${where}`); // invariant 3
  });
}

/** Enforce the invariants on any sentence (example / grammar example) that carries tokens[]. */
function checkSentence(sentence, where) {
  if (!sentence || !Array.isArray(sentence.tokens)) return;
  checkTokens(sentence.tokens, sentence.kanji, sentence.kana, where);
}

export function validateClass(doc) {
  if (!validate(doc)) throw new Error('schema: ' + ajv.errorsText(validate.errors));
  const seen = new Set();
  const check = (arr = [], type) =>
    arr.forEach((it) => {
      if (!it.id.startsWith(`${doc.classId}:${type}:`)) throw new Error(`bad id ${it.id}`);
      if (seen.has(it.id)) throw new Error(`dup id ${it.id}`);
      seen.add(it.id);
      if (type === 'vocab') {
        checkTokens(it.tokens, it.kanji, it.kana, it.id);
        checkSentence(it.example, `${it.id} example`);
      }
      if (type === 'grammar') {
        it.examples.forEach((ex, i) => checkSentence(ex, `${it.id} examples[${i}]`));
      }
    });
  check(doc.vocab, 'vocab');
  check(doc.grammar, 'grammar');
  check(doc.kanji, 'kanji');
  check(doc.notes, 'note');
  return true;
}

// CLI entry: node skill/validate.mjs <path-to-class.json>
if (process.argv[1] && process.argv[1].endsWith('validate.mjs')) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node skill/validate.mjs <class.json>');
    process.exit(1);
  }
  try {
    const doc = JSON.parse(readFileSync(file, 'utf8'));
    validateClass(doc);
    console.log(`VALID ${doc.classId}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

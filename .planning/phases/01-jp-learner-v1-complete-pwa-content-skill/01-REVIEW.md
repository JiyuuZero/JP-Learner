---
phase: 01-jp-learner-v1-complete-pwa-content-skill
reviewed: 2026-07-07T07:42:00Z
depth: standard
files_reviewed: 57
files_reviewed_list:
  - .github/workflows/deploy.yml
  - .gitignore
  - README.md
  - app/index.html
  - app/package.json
  - app/src/app.tsx
  - app/src/components/BottomNav.tsx
  - app/src/components/Button.tsx
  - app/src/components/Card.tsx
  - app/src/components/SpeakerButton.tsx
  - app/src/content/content.ts
  - app/src/content/context.ts
  - app/src/content/store.ts
  - app/src/content/validate.mjs
  - app/src/display/JapaneseText.tsx
  - app/src/display/ruby.test.tsx
  - app/src/display/ruby.tsx
  - app/src/exercises/Flashcard.tsx
  - app/src/exercises/Matching.tsx
  - app/src/exercises/MultipleChoice.tsx
  - app/src/exercises/Typing.tsx
  - app/src/exercises/WordBank.tsx
  - app/src/exercises/check.test.ts
  - app/src/exercises/check.ts
  - app/src/exercises/generators.test.ts
  - app/src/exercises/generators.ts
  - app/src/index.css
  - app/src/main.tsx
  - app/src/progress/ProgressContext.tsx
  - app/src/progress/backup.test.ts
  - app/src/progress/backup.ts
  - app/src/progress/day.test.ts
  - app/src/progress/day.ts
  - app/src/progress/db.ts
  - app/src/progress/gamification.ts
  - app/src/progress/kanji.ts
  - app/src/progress/session.ts
  - app/src/progress/srs.test.ts
  - app/src/progress/srs.ts
  - app/src/tts/TtsContext.tsx
  - app/src/tts/tts.ts
  - app/src/views/Glosario.tsx
  - app/src/views/Guardados.tsx
  - app/src/views/Home.tsx
  - app/src/views/Perfil.tsx
  - app/src/views/Session.tsx
  - app/tsconfig.app.json
  - app/vite.config.ts
  - app/vitest.config.ts
  - content/classes/2026-04-14.json
  - content/index.json
  - content/schema/content.schema.json
  - skill/SKILL.md
  - skill/commit-class.mjs
  - skill/package.json
  - skill/prompts/structure.md
  - skill/transcribe.sh
  - skill/validate.mjs
findings:
  critical: 0
  warning: 8
  info: 10
  total: 18
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-07-07T07:42:00Z
**Depth:** standard
**Files Reviewed:** 57
**Status:** issues_found

## Summary

Reviewed the full v1 implementation: PWA (React/TS/Tailwind/idb/ts-fsrs), content pipeline (schema, validators, sample class), and the skill (transcribe/structure/validate/commit). Verification performed during review: `tsc -b` clean, all 58 vitest tests pass, `content/index.json` contentHash matches the class file bytes, token renderability invariants hold on the sample class, and `--strict` type-checking produces 0 errors (though strict is not enabled — see WR-05).

The architecture is sound: fail-closed validation on both producer and consumer sides, ID-only progress references, no secrets, no injection surfaces (backup import is validated before any store mutation; commit-class uses `execFileSync` argument arrays, so the class label cannot inject shell commands; classId path components are schema-constrained to `YYYY-MM-DD(-n)`).

No critical (security/data-loss/crash) issues found. However, two behavioral bugs materially affect the app's core value — the answer checker accepts wrong answers for distinct word pairs (WR-01), and the automatic exercise rotation degenerates into matching-only after the first matching round (WR-02) — plus several robustness gaps around the progress/backup layer, whose export path is the only defense against iOS IndexedDB eviction.

## Warnings

### WR-01: Answer normalizer folds distinct words together — wrong answers graded as correct

**File:** `app/src/exercises/check.ts:24-25` (and its use in `isEsAnswerCorrect:36-42`)
**Issue:** The final normalization step `.replace(/(.)\1/g, '$1')` collapses ANY doubled character (vowels, kana, Spanish letters), not just romaji doubled consonants, and it is shared by both the JA and ES checkers. Verified false equivalences (all confirmed by executing the chain):
- Romaji: `biiru` (beer) ≡ `biru` (building); `obaasan` (grandmother) ≡ `obasan` (aunt) — long-vowel minimal pairs are exactly what a beginner must learn to distinguish.
- Kana: `こころ` ≡ `ころ`, `ちち` ≡ `ち` — this contradicts the file's own comment ("kana passes through"; it does not).
- Spanish (JA→ES direction): `perro` ≡ `pero`, `llamar` ≡ `lamar`.

A wrong answer graded `Good` corrupts the FSRS schedule for that item, undermining the SRS core value.
**Fix:** Restrict the doubled-character collapse to ASCII consonants and keep it out of the ES path:
```ts
// JA path only, consonants only (small っ tolerance):
.replace(/([bcdfghjklmnpqrstvwxyz])\1/g, '$1')
```
Use a separate, milder normalizer for `isEsAnswerCorrect` (lowercase + trim + punctuation strip + NFKC only — no romaji foldings, no doubling collapse, no dash removal). Add regression tests for `biiru≠biru` and `perro≠pero`.

### WR-02: Automatic rotation degenerates into matching-only after the first matching round

**File:** `app/src/views/Session.tsx:44,151,197` (`ROTATION`, `preferred = ROTATION[index % ROTATION.length]`, `advance(current.run.length)`)
**Issue:** The rotation index is the queue item index, `ROTATION.length` is 5, and a matching round consumes up to 5 items. When matching fires at `index ≡ 4 (mod 5)` and its run is exactly 5 (the common case in a vocab-heavy queue), `advance(5)` lands on the next index that is again `≡ 4 (mod 5)` → matching again, repeating until fewer than 2 consecutive vocab items remain. Example with a 20-vocab queue: flashcard, MC, typing, wordBank, then matching x4 rounds — the documented "simple rotation per item" (D-01) collapses.
**Fix:** Rotate on a step counter that increments once per exercise, independent of items consumed:
```ts
const [step, setStep] = useState(0)
const preferred = manualKind ?? ROTATION[step % ROTATION.length]
// in advance(): setStep((s) => s + 1)
```

### WR-03: `grade()` meta update is a non-atomic read-modify-write — concurrent grades lose points/new-card counts

**File:** `app/src/progress/ProgressContext.tsx:124-157`
**Issue:** `grade` does `await db.get('meta')` → mutate → `await putMeta(m)` across multiple awaits with no serialization. Matching fires up to 5 `void grade(...)` calls in rapid succession (one per matched pair, `Matching.tsx:31-37`); interleaved executions read the same `points`/`newCardsToday`/`streakCount` baseline and the last write wins, silently dropping increments. `newCardsToday` undercounting also weakens the SRS-05 daily cap.
**Fix:** Serialize grade executions through a promise chain (`queueRef.current = queueRef.current.then(doGrade)`), or perform the SRS put + meta read/update in a single `readwrite` IDB transaction.

### WR-04: `loadContent` never checks `response.ok`

**File:** `app/src/content/store.ts:39,51`
**Issue:** `await (await fetch(...)).json()` — `fetch` does not reject on HTTP errors. A 404/500 (e.g. an index entry pointing to a missing class file, or the GitHub Pages 404 fallback which serves the SPA's HTML) flows into `.json()` and surfaces as a cryptic `SyntaxError: Unexpected token '<'` in the retry UI, or worse could parse if a proxy returns JSON error bodies. This is the app's single boot path.
**Fix:**
```ts
const res = await fetch(`${BASE}content/index.json`)
if (!res.ok) throw new Error(`content/index.json: HTTP ${res.status}`)
```
(and the same for each class file fetch).

### WR-05: TypeScript `strict` mode is not enabled

**File:** `app/tsconfig.app.json:2-24`
**Issue:** No `"strict": true` (and no extends chain providing it) — `strictNullChecks`, `noImplicitAny`, etc. are all OFF. The Vite React-TS template ships with strict enabled, so this looks like an accidental omission. The stack decision explicitly leans on TS to "catch errors at author time" for the frozen schema contract; without strict, `Map.get()` results, `store` nullability, and `meta?` handling are unchecked. Verified that the codebase currently compiles clean under `--strict` (0 errors), so enabling it costs nothing today but prevents silent null-safety regressions tomorrow.
**Fix:** Add `"strict": true` to `compilerOptions`.

### WR-06: `commit-class.mjs` commits the entire staging area, not just the content files

**File:** `skill/commit-class.mjs:80-91`
**Issue:** After `git add <class> <index>`, the guard checks only whether *those paths* have staged changes, but `git('commit', '-m', ...)` commits **everything currently staged**. If the user had unrelated files staged before running the skill, they get silently swept into the `content(<classId>): ...` commit.
**Fix:** Commit with an explicit pathspec so only the two content files are included:
```js
git('commit', '-m', `content(${doc.classId}): add/update class ${doc.label}`, '--', classRel, indexRel)
```

### WR-07: Backup download may fail on iOS Safari — synchronous `revokeObjectURL` and detached anchor

**File:** `app/src/progress/backup.ts:54-62`
**Issue:** `URL.revokeObjectURL(url)` runs synchronously right after `a.click()`, and the anchor is never appended to the DOM. Both patterns are known to abort downloads on iOS/Safari — which is the primary platform AND the platform whose 7-day IndexedDB eviction makes this export the *only* progress backup (per this file's own header comment). A silently failed export followed by eviction is unrecoverable progress loss.
**Fix:**
```ts
document.body.appendChild(a)
a.click()
a.remove()
setTimeout(() => URL.revokeObjectURL(url), 10_000)
```

### WR-08: Import/export silently no-op when the DB is unavailable — Perfil reports false success

**File:** `app/src/progress/ProgressContext.tsx:159-179` (with `app/src/views/Perfil.tsx:42-52`)
**Issue:** If `openProgress()` failed at mount (the boot catch at line 99 deliberately continues with `ready=true` and no db), `importBackup` and `exportBackup` hit `if (!db) return` and resolve successfully. `Perfil.confirmImport` then shows "Progreso importado correctamente." even though nothing was written, and "Exportar progreso" does nothing with no feedback.
**Fix:** Throw from `importBackup`/`exportBackup` when `dbRef.current` is null (e.g. `throw new Error('Almacenamiento no disponible en este dispositivo.')`) so Perfil's existing catch surfaces it.

## Info

### IN-01: `isEsAnswerCorrect` 3-character containment is very permissive

**File:** `app/src/exercises/check.ts:41`
**Issue:** `a.length >= 3 && (b.includes(a) || a.includes(b))` accepts `mer` for "comer (cortés)". Combined with WR-01's foldings applied to Spanish text, substring matching gets even looser.
**Fix:** Require containment at word boundaries, or raise the minimum length relative to `b.length` (e.g. `a.length >= Math.min(4, b.length)` plus word-boundary check).

### IN-02: Normalization order: punctuation stripped before NFKC

**File:** `app/src/exercises/check.ts:9-10`
**Issue:** Full-width `．` `，` are only unified to ASCII by NFKC *after* the punctuation strip has run, so they survive normalization and break equality for IME users typing full-width punctuation.
**Fix:** Move `.normalize('NFKC')` before the punctuation-strip replace.

### IN-03: A backup file containing literal `null` is silently ignored

**File:** `app/src/views/Perfil.tsx:28,36,139`
**Issue:** `JSON.parse("null")` succeeds, `setPendingImport(null)` is a no-op sentinel collision — no confirm dialog, no error message. User gets zero feedback.
**Fix:** Wrap the pending value (`setPendingImport({ parsed })`) or treat non-object parses as an error in `onFilePicked`.

### IN-04: Imported card date strings are not validated as parseable dates

**File:** `app/src/progress/backup.ts:79,88`
**Issue:** `isStr(c.due)` accepts `"garbage"`; after import, `TypeConvert.card()` yields `Invalid Date`, so the item never comes due (silently disappears from SRS sessions). Not a crash, but a corrupt backup degrades quietly.
**Fix:** `!Number.isNaN(Date.parse(c.due))` for `due`/`last_review` (and `exportedAt`).

### IN-05: `voiceschanged` listener never removed; duplicated under StrictMode

**File:** `app/src/tts/tts.ts:22-31` (with `TtsContext.tsx:22-24`)
**Issue:** `initTTS` registers a permanent `voiceschanged` listener and an interval on every call, with no cleanup path; the provider's `useEffect` returns nothing. Dev StrictMode double-mount duplicates both (the intervals self-expire; the listeners do not). Harmless in production but a leak pattern.
**Fix:** Return a cleanup function from `initTTS` (remove listener, clear interval) and invoke it from the effect.

### IN-06: Flashcard heart toggle: Space keydown missing `preventDefault`

**File:** `app/src/exercises/Flashcard.tsx:90-95`
**Issue:** The `span[role=button]` heart calls `stopPropagation()` but not `preventDefault()` for Space/Enter, so pressing Space toggles the favorite AND scrolls the page. `SpeakerButton.tsx:27-32` does this correctly — inconsistent.
**Fix:** Add `e.preventDefault()` in the keydown handler.

### IN-07: Guardados renders grammar patterns without `lang="ja"` / `jp-text`

**File:** `app/src/views/Guardados.tsx:71`
**Issue:** `{g.pattern}` is rendered as a plain `<p>` while `Glosario.tsx:48` uses `lang="ja" className="jp-text"` for the same content — inconsistent CJK font stack and lang tagging (affects font selection and TTS/screen readers).
**Fix:** Add `lang="ja"` and `jp-text` to the pattern paragraph.

### IN-08: `createDefaultMeta` re-implements `localDayKey` inline

**File:** `app/src/progress/db.ts:84-87`
**Issue:** Duplicates the local-day formatting logic that lives in `day.ts` (`localDayKey`). Divergence risk if the rollover policy ever changes (the v2 4am-rollover note in day.ts would silently miss this copy).
**Fix:** `import { localDayKey } from './day'` and use it. (No import cycle: day.ts only imports the `ProgressMeta` type.)

### IN-09: `validate:content` npm script hardcodes the first class file

**File:** `app/package.json:15`
**Issue:** `node src/content/validate.mjs ../content/classes/2026-04-14.json` validates exactly one class forever; it goes stale with every class added. CI loops over all classes, but the local command silently under-validates.
**Fix:** Loop over `../content/classes/*.json` (small wrapper script or shell glob).

### IN-10: "Continuar donde lo dejaste" opens the launcher instead of starting the session

**File:** `app/src/views/Home.tsx:120-139` (with `Session.tsx:212`)
**Issue:** The dark card's copy promises resuming the automatic session, but `navigate('/session')` lands on the scope/mode picker (queue === null) requiring another tap on "Empezar · Automático". Copy/behavior mismatch for the D-01 resume affordance.
**Fix:** Either auto-start (e.g. `/session?autostart=1` that calls `start(null)` on mount) or soften the copy.

---

## Fix Results

**Fixed at:** 2026-07-07T10:07:00Z
**Scope:** Critical + Warning (0 Critical, 8 Warnings). Info findings intentionally NOT fixed.
**Verification after all fixes:** 65/65 vitest tests pass (7 new WR-01 regression tests), `tsc --noEmit -p tsconfig.app.json` clean under the newly enabled `strict`, `npm run build` (content sync + PWA) green.

| Finding | Status | Commit | Notes |
|---------|--------|--------|-------|
| WR-01 | fixed | `77a69ee` | Doubling collapse restricted to ASCII consonants (small-っ tolerance kept); long-vowel dash now EXPANDS to the doubled vowel (`ra-men` ≡ `raamen` ≠ `ramen`); ES checker uses a mild base normalizer (no foldings/collapse). Regression tests added: `biiru≠biru`, `obaasan≠obasan`, `こころ≠ころ`, `ちち≠ち`, `perro≠pero`, `bi-ru≡biiru`. Note: `lamar` vs `llamar` still matches — via the ≥3-char containment rule, which is IN-01 (out of scope), not the folding fixed here. |
| WR-02 | fixed | `0e798ce` | Rotation now uses a `step` counter incremented once per exercise shown (reset in `start`), decoupled from items consumed by matching. No new tests: the rotation lives in the Session view and no component-test harness exists; `buildSession` tests unaffected. |
| WR-03 | fixed | `d240c83` | `grade()` executions serialized through a promise chain (`gradeChainRef`); rejections still propagate to the caller while the chain self-heals. |
| WR-04 | fixed | `eab0e72` | `loadContent` fetches routed through a `fetchJson` helper that throws `"<path>: HTTP <status>"` on `!res.ok` for both index.json and every class file. |
| WR-05 | fixed | `5a2c146` | `"strict": true` added to `app/tsconfig.app.json`; codebase type-checks clean under strict as the review predicted. |
| WR-06 | fixed | `171772c` | `git commit` now passes an explicit `-- <classRel> <indexRel>` pathspec; pre-staged unrelated files are no longer swept in. |
| WR-07 | fixed | `f49fce3` | Anchor appended to `document.body` for the click, removed after, and `URL.revokeObjectURL` deferred 10s via `setTimeout`. |
| WR-08 | fixed | `0bf53e5` | `exportBackup`/`importBackup` throw `"Almacenamiento no disponible en este dispositivo."` when the DB never opened; `Perfil` export button gained a catch handler that surfaces the message (import already had one). |

_Fixed: 2026-07-07T10:07:00Z_
_Fixer: Claude (gsd-code-fixer)_

---

_Reviewed: 2026-07-07T07:42:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

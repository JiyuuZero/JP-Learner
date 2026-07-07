---
phase: 01-jp-learner-v1-complete-pwa-content-skill
verified: 2026-07-07T07:50:05Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
human_verification:
  - test: "New class appears without hard refresh (PWA-03 / SC1 freshness). After the next real class: run the skill (or hand-commit a second class JSON), let the Pages deploy finish, then simply refresh the already-loaded app (normal refresh, no cache clear)."
    expected: "The new class and its items appear in Glosario/Home without a manual hard refresh — NetworkFirst on /content/ JSON fetches the updated index.json + class file."
    why_human: "Requires committing real new content and observing live SW runtime-caching behavior against the deployed URL; cannot be simulated locally. Mechanism (NetworkFirst runtimeCaching on /content/, 3s timeout) is code-verified in app/vite.config.ts."
  - test: "On-device ja-JP TTS (TTS-01/02 / SC7). Install a Japanese (ja-JP) TTS voice on the Android device, reload the app, open a flashcard or Glosario item detail, tap the Pronunciación speaker button."
    expected: "Japanese is spoken with the ja-JP voice at rate 0.9, only on tap (never auto-play). On a device WITHOUT a ja-JP voice the speaker button stays hidden and nothing ever speaks with a non-Japanese voice."
    why_human: "Depends on OS voice inventory on the physical device; user has no ja-JP voice installed yet. Code paths (voice detection incl. ja_JP underscore, silent no-op, hidden button, Perfil status line) are build/grep-verified."
---

# Phase 1: JP-Learner v1 (complete PWA + content skill) Verification Report

**Phase Goal:** Deliver the entire JP-Learner product in one phase — an installable, offline PWA that consumes rigid-schema class content and drives effective SRS + active-recall practice, backed by durable local progress with export/import, plus the Claude skill that produces the content — so the user can convert each class into useful practice with minimal friction.
**Verified:** 2026-07-07T07:50:05Z
**Status:** human_needed (all automated checks pass; 2 on-device checks pending)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Installable & offline: install on mobile/desktop, fully offline after first load, new class appears on refresh, live GitHub Pages URL works | ✓ VERIFIED | `app/vite.config.ts`: `base: '/JP-Learner/'`, VitePWA manifest (standalone, 192/512 maskable icons), `registerType: 'autoUpdate'`, workbox NetworkFirst on `/content/` (cacheName content-json, 3s timeout), precached hashed assets. Build emits `dist/sw.js` + `dist/manifest.webmanifest` + `dist/content/`. `.github/workflows/deploy.yml` copies `404.html`, uploads `app/dist`, uses deploy-pages. Live deploy UP (run 28844094943; shell/manifest/sw/content all HTTP 200). User verified on device: load+dashboard, nested-route hard refresh, PWA install/standalone, offline session (checkpoint items 1-4 approved). Residual: new-class-freshness live behavior → human item 1 |
| 2 | Content is schema-driven and read-only: rigid schema, deterministic IDs, per-word AND per-kanji tokens[], generated TS types | ✓ VERIFIED | `content/schema/content.schema.json` (103 lines, draft 2020-12, `"const": 1`, exactly 8 `"additionalProperties": false`). Sample `2026-04-14.json`: 5 vocab / 1 grammar / 3 kanji / 2 notes; norikomu example carries 7 authored tokens whose surface/reading concat exactly equals sentence kanji/kana (node-verified). `app/src/content/content.ts`: 7 generated interfaces. `validate.mjs` enforces the 3 invariants + `bad id`/`dup id` (lines 21-40). `npm run validate:content` → `VALID 2026-04-14`. `store.ts` boot-fetches index + classes into 4 ID-keyed Maps + byClass (read-only) |
| 3 | Progress durable & portable: IndexedDB + migrations + persist(), verified export/import round-trip, by-ID only | ✓ VERIFIED | `db.ts`: `openDB<JPDB>('jp-learner', APP_VERSION)` with srs (byDue/byClass indexes) / learnedKanji / meta stores, additive upgrade, `requestPersistence()` (navigator.storage.persist, lines 78-80). `backup.ts`: backupVersion===1 fail-closed validation BEFORE clear (lines 115-128), transactional restore. `ProgressContext.tsx` wires persist-on-first-interaction (line 112) and export/import into Perfil (Exportar/Importar + destructive confirm "Esto reemplazará…"). SrsRecord stores itemId string refs only (PROG-04). 5 backup tests pass incl. byte-identical round-trip + reject-preserves-data (58/58 green) |
| 4 | Practice by scope with correct scheduling: one shared FSRS card, scope Hoy/Semana/Total, local-calendar days, new-card cap | ✓ VERIFIED | `srs.ts`: `gradeItem` rehydrates via `TypeConvert.card`, `scheduler.next()`, graduation-once trigger (tested). `session.ts`: `inScope` local-calendar (localDayKey/startOfLocalWeek), subMode 'srs'/'periodo', reviews-before-new, `NEW_CARDS_PER_DAY=10` cap fed by meta.newCardsToday/newCardsDay. `day.ts`: zero `getTime()` deltas (grep=0); bumpStreak tested across midnight/month/TZ. All 5 exercise components call the same `ProgressContext.grade` → `gradeItem` → one SrsRecord per itemId |
| 5 | Japanese renders in 3 modes incl. progressive Mode B | ✓ VERIFIED | `ruby.tsx renderTokens`: Mode A word-level romaji `<ruby>`+`<rp>`, Mode C surface-only, Mode B `(t.kanji ?? []).every(k => learned.has(k))` per-run substitution (line 49). 9 jsdom render tests pass (毎日 both-learned gate, 乗/込 independent ruby, り/む literal). `JapaneseText.tsx` consumes meta.displayMode/romajiVisible/learnedSet; kana fallback in Mode B without tokens. Perfil has A/B/C selector + romaji toggle → meta. Glosario item detail has per-kanji "Aprendido" star (markLearned/unmarkLearned); `kanji.ts` auto-learns on graduation with manual-suppression markers (line 41: manual always wins). Zero NLP libs (grep=0) |
| 6 | All 5 exercise types, bidirectional, on shared state | ✓ VERIFIED | Flashcard (4 grade pills Otra vez/Difícil/Bien/Fácil), MultipleChoice (pickDistractors same-class, line 63), Typing (`isAnswerCorrect` with `replace(/nn/g,'n')` + shi/si etc., 15 tests), WordBank (chips exclusively from authored `sentence.tokens[]`, `return null` without tokens — generators.ts line 113; norikomu test reconstructs 電車に乗り込む。), Matching (pair Good/Again). All 5 components grep-confirmed calling `grade(`. `Session.tsx` line 144: `direction = index % 2 === 0 ? 'JA_ES' : 'ES_JA'` + manual type pick (KIND_LABELS picker) over buildSession queue (line 132) |
| 7 | On-demand JA pronunciation that never blocks | ✓ VERIFIED | `tts.ts`: `initTTS` guards missing speechSynthesis, matches `/ja[-_]JP/i`, voiceschanged + 250ms×8 poll; `speakJa`: `if (!jaVoice) return` silent no-op (line 36), lang ja-JP, rate 0.9, tap-only. `SpeakerButton.tsx` line 21: `if (!hasVoice) return null` (hidden, never disabled). Wired into Flashcard + Glosario detail; no auto-play call sites. Perfil shows "Pronunciación no disponible en este dispositivo." status. Residual: real-voice on-device test → human item 2 |
| 8 | Light gamification in mobile-first indigo/pastel UI | ✓ VERIFIED | `gamification.ts`: `progressPercent` = Review-state / (vocab+grammar) with 0-guard and 100 cap; `addPoints` ignores delta<=0 (monotonic). Points +1 on correct in ProgressContext (never decrement). `Home.tsx`: "¡Hola!" greeting, streak "{n} días", points pill, progress ring, dark Continuar card, Hoy·Semana·Total × Repaso SRS/Repasar periodo launchers → `/session?scope=&subMode=` (line 67), Reto de hoy tiles. `BottomNav.tsx`: 4 items Inicio/Glosario/Guardados/Perfil, lucide icons. `index.css`: Tailwind v4 `@theme` with #5A5AE6 indigo + pastel tokens; no tailwind.config.js. Guardar heart → favorites (meta.favorites string[] ids) → Guardados view with un-save + "Sin nada guardado" empty state |
| 9 | Content skill produces valid content under a fixed contract | ✓ VERIFIED | `skill/transcribe.sh`: ffmpeg `-ar 16000 -ac 1 -c:a pcm_s16le` + `whisper-cli -m models/ggml-large-v3.bin -l auto -oj` (line 31), `--translate` only in a NEVER comment, `bash -n` clean. `skill/prompts/structure.md`: 7× tokens, 3× 乗り込む worked example, fallback + ID rules. `skill/validate.mjs`: exact mirror of app validator (same 5 error messages); ran live after `npm ci` → `VALID 2026-04-14`. `skill/commit-class.mjs`: validateClass FIRST (line 26), sha256- contentHash, idempotent index upsert, fixed message `content(<classId>): add/update class <label>` (line 90). `skill/SKILL.md` documents all 5 steps + large-v3 setup + human-in-the-loop. Hand-authored sample class exists and powers the app pre-skill |

**Score:** 9/9 truths verified (2 with residual on-device human checks)

### Required Artifacts

All 47 phase artifacts exist, are substantive, and are wired (spot table — full existence run logged during verification):

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `content/schema/content.schema.json` | Frozen skill↔app contract | ✓ VERIFIED | 103 lines, draft 2020-12, 8× additionalProperties:false, schemaVersion const 1 |
| `content/classes/2026-04-14.json` | Hand-authored sample class | ✓ VERIFIED | 322 lines; validates VALID; norikomu example tokens concat-proven |
| `app/src/content/content.ts` | Generated TS types | ✓ VERIFIED | 7 exported interfaces; imported by store.ts/session.ts/generators/kanji.ts |
| `app/src/content/store.ts` | ContentStore loadContent | ✓ VERIFIED + FLOWING | fetches BASE+content/index.json → class files → 4 ID Maps; consumed via ContentContext in app.tsx |
| `app/vite.config.ts` | base + PWA + NetworkFirst | ✓ VERIFIED | base /JP-Learner/, autoUpdate, NetworkFirst /content/, precache globPatterns |
| `app/src/progress/db.ts` | idb stores + migrations + persist | ✓ VERIFIED | 3 stores, byDue/byClass indexes, requestPersistence |
| `app/src/progress/srs.ts` | ts-fsrs wrapper | ✓ VERIFIED + WIRED | gradeItem + TypeConvert + graduatedToReview; called by ProgressContext.grade |
| `app/src/progress/backup.ts` | export/import round-trip | ✓ VERIFIED | fail-closed BackupValidationError before clear; wired to Perfil buttons |
| `app/src/progress/session.ts` | scope×subMode + cap | ✓ VERIFIED + WIRED | buildSession consumed by Session.tsx line 132 |
| `app/src/display/ruby.tsx` | renderTokens A/B/C | ✓ VERIFIED + WIRED | consumed by JapaneseText → Glosario/Guardados/4 exercises |
| `app/src/exercises/check.ts` | tolerant checker | ✓ VERIFIED + WIRED | isAnswerCorrect used in Typing.tsx line 42 |
| `app/src/exercises/generators.ts` | 5 generators + distractors + direction | ✓ VERIFIED + WIRED | consumed by Session.tsx exercise resolution |
| `app/src/exercises/{Flashcard,MultipleChoice,Typing,WordBank,Matching}.tsx` | 5 exercise bodies | ✓ VERIFIED + WIRED | all 5 call grade(); mounted by Session |
| `app/src/views/Session.tsx` | hybrid D-01 session frame | ✓ VERIFIED | 427 lines; buildSession, rotation+manual pick, Comprobar/Seguir, Terminar sesión |
| `app/src/views/{Home,Glosario,Guardados,Perfil}.tsx` | real views (no placeholders) | ✓ VERIFIED | Home 200 / Glosario 339 / Guardados 90 / Perfil 166 lines; all consume ProgressContext + ContentContext |
| `app/src/tts/tts.ts` + `TtsContext.tsx` + `SpeakerButton.tsx` | TTS-01/02 | ✓ VERIFIED + WIRED | TtsProvider in app.tsx provider tree; SpeakerButton in Flashcard + Glosario |
| `app/src/progress/gamification.ts` | progressPercent + addPoints | ✓ VERIFIED + WIRED | progressPercent imported by Home.tsx line 14 |
| `skill/{SKILL.md,transcribe.sh,validate.mjs,prompts/structure.md,commit-class.mjs,package.json}` | producer pipeline | ✓ VERIFIED | validator run live (VALID); commit convention + idempotent upsert in code |
| `.github/workflows/deploy.yml` | Pages deploy + 404 fallback | ✓ VERIFIED | deploy-pages@v4, upload path app/dist, cp 404.html, minimal permissions; run 28844094943 SUCCESS |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| content.ts | content.schema.json | json2ts gen:types script | ✓ WIRED | build script = `gen:types && copy:content && tsc -b && vite build` |
| validate.mjs (app + skill) | content.schema.json | ajv/dist/2020.js compile | ✓ WIRED | both print `VALID 2026-04-14` against the frozen schema |
| store.ts | public/content JSON | fetch(BASE_URL + 'content/…') | ✓ WIRED | Level-4: real fetch of index + class files; Glosario renders the 5 sample vocab |
| app.tsx | 5 views | HashRouter Routes | ✓ WIRED | routes /, /glosario, /guardados, /perfil, /session |
| exercises/*.tsx | shared FSRS card | ProgressContext.grade → gradeItem → db.put('srs') | ✓ WIRED | all 5 components grep-confirmed; grade also bumps streak/points/intake |
| Session.tsx | buildSession | queue build with scope/subMode | ✓ WIRED | line 132; params read from ?scope=&subMode= |
| Home.tsx | Session.tsx | navigate(`/session?scope=…&subMode=…`) | ✓ WIRED | line 67 |
| ruby.tsx | learnedSet + schema tokens | every(k => learned.has(k)) | ✓ WIRED | line 49; learnedSet flows from kanji.ts loadLearnedSet |
| Glosario heart | Guardados view | toggleFavorite → meta.favorites → favoriteSet | ✓ WIRED | Glosario line 35 writes; Guardados line 14 reads |
| SpeakerButton | tts.ts speakJa | onClick tap handler; hidden when !hasVoice | ✓ WIRED | TtsProvider in app.tsx lines 52-69 |
| commit-class.mjs | content/index.json + classes/ | validate-first write + upsert + git commit | ✓ WIRED | proof commit 0b6d8ad in history |
| deploy.yml | GitHub Pages | build → 404.html → upload/deploy-pages | ✓ WIRED | live URL serving app shell + content (HTTP 200) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| Glosario/Guardados rows | store.vocabById / byClass | loadContent() fetch of committed JSON | Yes (5 sample vocab load) | ✓ FLOWING |
| Home dashboard | meta.streakCount/points, srsByItem | IndexedDB via openProgress() | Yes (defaults created on first run, mutated by grade()) | ✓ FLOWING |
| Session queue | buildSession(store, srsByItem, …) | ContentStore + srs store | Yes | ✓ FLOWING |
| Mode B rendering | learnedSet | learnedKanji store (auto+manual) | Yes | ✓ FLOWING |
| Guardados | favoriteSet | meta.favorites (persisted ids) | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite | `cd app && npm test` | 58/58 pass (6 files: check 15, generators 12, day 13, srs 4, backup 5, ruby 9) | ✓ PASS |
| Typecheck | `npx tsc --noEmit -p tsconfig.app.json` | clean | ✓ PASS |
| Production build | `cd app && npm run build` | green; dist/sw.js + manifest + content/ + 10 precache entries | ✓ PASS |
| Content validation (app) | `npm run validate:content` | `VALID 2026-04-14` | ✓ PASS |
| Content validation (skill) | `cd skill && npm ci && node validate.mjs ../content/classes/2026-04-14.json` | `VALID 2026-04-14` | ✓ PASS |
| Shell syntax | `bash -n skill/transcribe.sh` | exit 0 | ✓ PASS |
| Token renderability invariant | node concat check on norikomu example tokens | surface===kanji, reading===kana, 7 chips | ✓ PASS |
| SUMMARY commit hashes | `git cat-file -t` on all 21 claimed hashes | all present | ✓ PASS |
| Live deploy | orchestrator-verified: run 28844094943, shell/manifest/sw/content HTTP 200 | UP | ✓ PASS |

### Requirements Coverage

All 43 phase requirement IDs are claimed by exactly the 6 plans and none are orphaned (union of plan frontmatter = the 43 ROADMAP IDs):

| Requirement group | Source Plan | Status | Evidence |
|-------------------|------------|--------|----------|
| CONT-01..06 | 01-01 (+CONT-06 in 01-02) | ✓ SATISFIED | frozen schema, deterministic IDs, kanji/kana/romaji/es/example, per-word+per-kanji tokens, grammar/notes, read-only store |
| PWA-01..03, UI-01, UI-02 | 01-02 | ✓ SATISFIED | manifest/install, SW offline, NetworkFirst content, indigo/pastel shell, 4-tab bottom nav (PWA-03 live freshness → human item 1) |
| SKILL-01..05 | 01-03 | ✓ SATISFIED | whisper.cpp large-v3 no-key, structure prompt, ajv gate, deterministic write+commit, fixed SKILL.md contract |
| PROG-01..05, SRS-01..05 | 01-04 | ✓ SATISFIED | idb persistence, export/import round-trip (tested), by-ID only, persist()+migrations, one FSRS card, grading, scopes, local-day math, new-card cap |
| DISP-01..04, EXER-01..06 | 01-05 (+UI-02 heart destination) | ✓ SATISFIED | A/B/C modes, native ruby, progressive Mode B, mark/unmark learned, 5 exercises bidirectional on shared card |
| TTS-01..02, GAM-01..03, UI-03, PWA-04 | 01-06 | ✓ SATISFIED | tap-only TTS + graceful no-voice (on-device → human item 2), streak/progress%/points, dashboard, live Pages deploy |

**Bookkeeping inconsistency (WARNING, non-blocking):** `.planning/REQUIREMENTS.md` still shows CONT-01..05 as `[ ]` Pending in both the checklist and the traceability table, while Plan 01's SUMMARY claims them completed and the codebase evidence confirms they are satisfied. Recommend flipping those 5 checkboxes/rows to Complete before milestone audit.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TODO/FIXME/HACK/placeholder-stub/empty-return patterns in app/src or skill/ | — | "placeholder" grep hits are HTML input `placeholder=` attributes only |
| app/src/exercises/check.ts | 12 | Aggressive normalization can fold distinct words (REVIEW WR-01) | ⚠️ Warning (advisory) | Tolerant checking is required by EXER-03; edge-case over-acceptance documented in 01-REVIEW.md, not a goal blocker |
| app/src/progress/ProgressContext.tsx | 124-157 | Non-atomic meta read-modify-write on concurrent grades (REVIEW WR-03) | ⚠️ Warning (advisory) | Single-user, sequential grading UI; loss window is theoretical. Tracked in 01-REVIEW.md |

01-REVIEW.md: 0 Critical / 8 Warning / 10 Info — all advisory; none invalidates a success criterion.

### Human Verification Required

#### 1. New class appears without hard refresh (SC1 / PWA-03 freshness)

**Test:** After the next real class, run the skill (or hand-commit a second class JSON) so the Pages deploy runs; then open the already-installed/loaded app and do a normal refresh.
**Expected:** The new class appears in Glosario/Home without a manual hard refresh or cache clear (NetworkFirst fetches fresh `/content/` JSON).
**Why human:** Needs real new content committed and live SW runtime behavior on the deployed URL; the caching config is code-verified but the end-to-end freshness can only be observed live.

#### 2. On-device TTS with a ja-JP voice (SC7 / TTS-01, TTS-02)

**Test:** Install a Japanese TTS voice on the Android device, reload the app, tap a Pronunciación speaker button on a flashcard or Glosario item detail.
**Expected:** Japanese is spoken with the ja-JP voice, only on tap. On a device without a ja-JP voice, the speaker button stays hidden and nothing speaks in a non-Japanese voice.
**Why human:** Depends on the physical device's OS voice inventory (currently none installed); code paths are unit/build-verified.

### Gaps Summary

No gaps. Every roadmap success criterion is backed by existing, substantive, wired, data-flowing code; 58/58 tests, typecheck, build, both content validators, and the live deploy all pass. The two remaining items are genuine on-device behaviors that cannot be verified programmatically and were explicitly recorded as pending at the 01-06 checkpoint — they gate final sign-off, not goal achievement. One bookkeeping fix recommended: mark CONT-01..05 Complete in REQUIREMENTS.md.

---

_Verified: 2026-07-07T07:50:05Z_
_Verifier: Claude (gsd-verifier)_

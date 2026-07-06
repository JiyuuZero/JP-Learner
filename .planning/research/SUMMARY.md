# Project Research Summary

**Project:** JP-Learner
**Domain:** Offline-first personal Japanese-learning PWA (SRS + active recall) fed by a local-Whisper Claude content-pipeline skill
**Researched:** 2026-07-06
**Confidence:** HIGH (app stack, storage split, SRS API, GitHub Pages, IndexedDB eviction, TTS constraints) / MEDIUM-HIGH (mixed ES/JA transcription) / MEDIUM (content schema is a design proposal, furigana edge cases)

## Executive Summary

This is a **two-halves, one-contract system**: a manual, local Claude skill (the *producer*) that transcribes code-switching Spanish/Japanese class audio with local Whisper and structures it into rigid-schema JSON, and a static, offline-first React PWA (the *consumer*) that renders that JSON as spaced-repetition practice. The two halves never talk over a network — the entire coupling is a **versioned JSON content schema checked into git**. Expert consensus across all four research dimensions converges on one spine: **freeze that schema first**. It carries not just vocab/grammar/notes but per-word *and* per-kanji reading segments, so the app is pure rendering — no in-app Japanese NLP, no morphological analyzer, no runtime furigana computation. Everything downstream (display modes, exercises, SRS, export) is a transform over that contract.

The recommended stack is the mainstream, well-documented 2026 choice and validates the user's presumed direction: **Vite 8 + React 19 + TypeScript 5.9 + Tailwind 4 (CSS-first) + IndexedDB via `idb` + `vite-plugin-pwa`**, with furigana as native `<ruby>`, TTS via the Web Speech API, and — the one deliberate upgrade over intuition — **FSRS via `ts-fsrs` rather than a hand-rolled SM-2**. All five exercise types share **one FSRS state per item** (vary the presentation, never the schedule). For the skill, use **`whisper.cpp` + `large-v3` with `--language auto`** on Apple Silicon. Critically, Whisper does *not* truly code-switch (it detects one language for the first ~30s and assumes the whole file); the disambiguation of mixed ES/JA lives in the **skill's Claude structuring step and human-in-the-loop verification**, never in the app or in Whisper alone.

The dominant risk is **silent data loss**, and it is a Core-Value guardrail, not a nice-to-have: iOS/WebKit evicts IndexedDB after 7 days without interaction — exactly the vacation/gap scenario SRS exists to survive — and the *only* backup for progress is the manual export/import file. So `navigator.storage.persist()`, a verified export/import round-trip, and versioned IndexedDB migrations **must ship in the first release**, not as follow-ups. The second risk is **scope ballooning inside the single Fable 5 phase**: the only genuinely high-cost feature is Mode B (progressive kanji), and its risk is *externalized to the schema* (per-kanji segments make substitution a pure data transform). If time runs short, the guardrail is explicit — **cut gamification polish and display-mode C before touching SRS correctness, content ingestion, or export/import.**

## Key Findings

### Recommended Stack

The presumed stack is validated with three refinements: skip React Router (use `HashRouter` or state-based views to sidestep GitHub Pages 404s entirely), use `ts-fsrs` for scheduling instead of hand-rolling SM-2, and keep *all* linguistic processing in the skill (no `kuromoji`/`kuroshiro` — that would ship a ~15MB dictionary for nothing). Furigana is native `<ruby>`; TTS is native Web Speech; there is no backend and no API key anywhere in the app. See `STACK.md` for verified versions and the full transcription toolchain.

**Core technologies:**
- **Vite 8 + React 19 + TypeScript 5.9**: static SPA build, ubiquitous well-trained patterns, and TS types *generated from the content schema* so app and skill can never silently drift. TS pinned to 5.9 (not 6.x) for lighter-model tooling stability.
- **Tailwind 4 (CSS-first, `@tailwindcss/vite`)**: matches the indigo/pastel Duolingo/Busuu mobile-first look. Note: v4 is `@theme`-in-CSS, *not* v3 `tailwind.config.js` — a lighter LLM will default to v3 patterns, so the roadmap must state this.
- **`idb` (IndexedDB) + `ts-fsrs` (FSRS scheduler)**: progress storage + spaced repetition. `ts-fsrs` is zero-dependency, TS-native, works with default params (no training needed for a single beginner).
- **`vite-plugin-pwa`**: installability + offline + service worker (Workbox). Verified to support Vite 8. Never hand-roll the SW.
- **`whisper.cpp` + `large-v3` (skill side, not app bundle)**: key-free, offline, Apple-Silicon-native transcription; `large-v3` markedly outperforms smaller models on multilingual/code-switched audio.

### Expected Features

Scope is already decided (5 exercise types, SRS, review-scope selector, 3 display modes, TTS, light gamification). Research categorizes each and specifies *how* it must work to make self-study of the user's own class content effective. The single test: *does self-study of the user's own class content fail without it?* Big-app features (leaderboards, XP, hearts, social) are noise for n=1 and are deliberately excluded. See `FEATURES.md`.

**Must have (table stakes — self-study fails without these):**
- FSRS scheduling with per-item state (`ts-fsrs`, defaults) — the engine
- Active-recall flashcards (produce -> reveal -> self-grade) — the pedagogical spine
- Fill-in / typing with tolerant answer checking — the strongest retrieval mode, the reason to build over a tap-app
- Review-scope selector (Today / This week / All) over class/date tags — directly serves Core Value
- Mode A furigana (romaji-over-kanji) rendering — content is unreadable to a beginner without it
- Local persistence + JSON export/import + `persist()` — the ONLY progress backup (see pitfalls)
- Offline installable PWA
- Japanese TTS on demand (enhancement, must never block)

**Should have (differentiators aligned with Core Value):**
- **Mode B progressive-kanji + per-user "learned kanji" set** — the *signature* feature; contingent on the skill's per-kanji segment schema
- Multiple choice / matching / sentence-building — variety + scaffolding (cheap given shared FSRS state)
- Sentence-context on card back (near-free from the data model), grammar cards in the same SRS flow
- Light gamification: daily streak + progress % + points (non-punishing only)

**Defer (v1.x / v2+):**
- Exercise-type auto-selection by maturity; per-class weakness dashboard (v1.x)
- FSRS parameter training (needs 1,000+ reviews); cross-device sync; push reminders (v2+)
- Explicit anti-features: in-app transcription, in-app furigana computation, hand-tuned SRS math, STT/pronunciation scoring, deck-builder UI, accounts/backend

### Architecture Approach

Two loosely-coupled halves meeting at one contract. **The single most important rule: content is read-only, immutable, and identified by stable deterministic IDs (`<classId>:<type>:<slug>`); progress is mutable, per-device, and references content by ID only — progress never embeds content.** This lets a class be re-processed or a typo fixed without corrupting SRS history. Display modes and exercise generation are **pure functions** over (content, progress, mode) — no component holds Japanese-parsing logic. See `ARCHITECTURE.md` for the proposed schema and storage shapes.

**Major components:**
1. **The content schema (`content.schema.json`)** — the skill<->app contract; single source of truth, generates the app's TS types. Carries `tokens[]` with per-kanji `{surface, reading, isKanji}` segments so all 3 display modes render without NLP. **This is the spine; freeze it first.**
2. **Skill (producer, never deployed)** — capture -> `whisper.cpp` transcribe -> Claude structuring (the real ES/JA disambiguator) -> `ajv` validate -> git-commit JSON. Enforces deterministic IDs and the renderability invariant.
3. **ContentStore (consumer, in-memory read-only)** — fetch index + class files, merge into lookup maps by ID.
4. **ProgressStore (IndexedDB, mutable)** — per-item FSRS `Card`, learned-kanji set, streak/points, export/import; split by concern with `appVersion` migrations from day one.
5. **Display + Exercise engines (pure)** — 3 modes / `<ruby>` and 5 exercise generators feeding one shared FSRS state per item.

### Critical Pitfalls

Top risks from `PITFALLS.md`, each with the bounded default that avoids the rabbit hole:

1. **iOS evicts IndexedDB after 7 days; export/import is the ONLY backup** — call `navigator.storage.persist()` on first interaction, make export a nagged first-class feature, version the backup, and *verify the round-trip* during the build. Highest-impact, unrecoverable if missed.
2. **Whisper doesn't code-switch** (one language per file, hallucinates on silence) — use `large-v3` + `--language auto`, push disambiguation into the Claude structuring step, and treat skill JSON as human-verified. The app never transcribes.
3. **Wrong furigana from computing readings in-app** — readings are *authoritative data in the schema*, pre-aligned per-kanji-run. Rendering a reading the app guessed teaches the user wrong kanji (worse than nothing).
4. **SRS day-boundary / timezone bugs** break streak and "Today/Week" counts — store UTC ISO, compare *local calendar dates* (never raw timestamp deltas), local-midnight boundary, cap daily new cards so gaps don't pile up a wall of reviews.
5. **GitHub Pages base-path + stale service worker** — set Vite `base: '/JP-Learner/'`, add 404.html SPA fallback (or HashRouter), and network-first the HTML *and content JSON* (cache-first only hashed assets) so a newly-committed class actually appears.

## Implications for Roadmap

**This project ships in a single implementation phase (Fable 5 constraint).** So "phases" below are best read as the **mandatory build order *within* that one phase**, ordered strictly by dependency so nothing is built against a moving target. The schema is step zero — it unblocks everything.

### Phase 1: Content Schema + Contract (the spine)
**Rationale:** Every consumer (display, exercises, SRS, progress) assumes this shape. It must be frozen before any UI work, or the whole build is against a moving target. This is the #1 anti-scope-balloon guardrail.
**Delivers:** `content.schema.json` (vocab/grammar/kanji/notes with stable IDs, class/date tags, per-word AND per-kanji `tokens[]` reading segments), generated TS types, and one hand-authored realistic class JSON so downstream work has data *before the skill exists*.
**Addresses:** Furigana Modes A/B/C source-of-truth; review-scope tags; the content/progress split.
**Avoids:** Wrong-furigana pitfall (readings are data, not computed); non-deterministic-ID pitfall; scope ballooning.

### Phase 2: App Shell + Deploy Skeleton
**Rationale:** GitHub Pages base-path and SW behavior break *silently* and only against the live URL — wiring them early de-risks the deploy story before features pile up.
**Delivers:** Vite + React + TS + Tailwind v4 scaffold, `vite-plugin-pwa`, HashRouter (or 404.html fallback), `base: '/JP-Learner/'`, install manifest, indigo/pastel mobile-first shell.
**Uses:** Vite 8 / React 19 / Tailwind 4 / vite-plugin-pwa from `STACK.md`.
**Implements:** ContentStore boot fetch skeleton.
**Avoids:** GitHub Pages base-path blank page; stale-SW pitfalls (network-first HTML + content JSON from the start).

### Phase 3: Persistence + SRS (the Core-Value guardrail)
**Rationale:** "If all else fails, this must work." Progress durability and correct scheduling are the irreplaceable core; they must ship *with* export/import and `persist()`, never after.
**Delivers:** IndexedDB stores via `idb` (srs / learnedKanji / meta) with `appVersion` migrations, `ts-fsrs` wrapper (one `Card` per item), export/import with a verified round-trip, `navigator.storage.persist()`, local-calendar day-boundary logic.
**Addresses:** FSRS engine, per-item state, review-scope selector, streak.
**Avoids:** iOS 7-day eviction; SRS timezone/off-by-one; DB-migration corruption.

### Phase 4: Display Modes + Exercise Engine
**Rationale:** Pure functions over the now-stable schema and progress stores. All five exercises feed *one* shared FSRS state — build the shared plumbing, then the presentations.
**Delivers:** `<ruby>` rendering for Modes A/B/C, learned-kanji substitution (Mode B), 5 exercise generators, review-scope-filtered due queue, tolerant typing checker.
**Addresses:** All 5 exercise types, 3 display modes, signature Mode B.
**Avoids:** Per-exercise-schedule anti-pattern; Mode-B-applies-globally UX pitfall.

### Phase 5: TTS + Gamification + Skill Pipeline + Deploy Hardening
**Rationale:** TTS and gamification are enhancement layers; the skill depends only on the schema (Phase 1) and can be built in parallel; deploy hardening verifies against the live URL.
**Delivers:** Web Speech `ja-JP` TTS with graceful no-voice fallback, streak/progress%/points UI, the `whisper.cpp` + Claude-structuring + `ajv`-validate skill, GitHub Actions deploy with 404.html copy.
**Uses:** whisper.cpp/large-v3 toolchain from `STACK.md`.
**Avoids:** Missing-TTS-voice silent break; blind-commit of bad transcripts.

### Phase Ordering Rationale
- **Schema before all consumers** — the top guardrail against building against a moving target (Pitfall 10); the schema is where the three complexity-exploders (code-switching, furigana, TTS scope) are neutralized by pushing work out of the app.
- **Deploy skeleton early** — GitHub Pages base-path/SW failures are invisible on localhost; wiring them before feature work avoids a late, silent break.
- **Persistence + SRS before UI polish** — this is the Core-Value guardrail; it is the irreplaceable data and must be correct and durable first.
- **Skill parallelizable** — depends only on the schema, never on the app; hand-authored JSON keeps the app unblocked.
- **Cut order if time-boxed:** gamification polish -> Mode C -> (never) SRS correctness / ingestion / export-import.

### Research Flags

Areas likely needing deeper attention during planning/execution (via `/gsd-research-phase` or focused spikes):
- **Content schema (Phase 1):** the per-kanji `tokens[]` representation is a *design proposal* (MEDIUM confidence). Validate the renderability invariant and okurigana handling (乗り込む) against a real vocab sample before freezing.
- **Skill / transcription (Phase 5):** exact ES/JA WER for `large-v3` on real mixed audio is unbenchmarked (MEDIUM). Spot-check a real class clip; the human-in-the-loop verification step is the safety net.
- **Mode B (Phase 4):** signature feature, HIGH cost — but risk is externalized to the schema. If per-kanji segments prove unreliable, the documented fallback is word-level ruby (coarser, correct).

Phases with standard, well-documented patterns (skip deep research):
- **App shell / deploy (Phase 2):** Vite + vite-plugin-pwa + GitHub Pages is well-trodden; the gotchas are already documented in STACK/PITFALLS.
- **Persistence + SRS (Phase 3):** `idb` and `ts-fsrs` are standard; the APIs are verified. Care is in *policy* (day boundary), not novelty.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified against npm 2026-07-06; vite-plugin-pwa Vite 8 peer support inspected directly; all mainstream. MEDIUM only on the TS 5.9-over-6.0 judgment call and exact ES/JA transcription quality. |
| Features | HIGH | FSRS/SM-2 benchmarks, exercise pedagogy, TTS constraints verified against multiple primary sources. MEDIUM on furigana-alignment implementation specifics. |
| Architecture | HIGH | ts-fsrs `Card` shape, storage split, GitHub Pages routing verified via Context7 + official docs. Content schema is a well-reasoned *design proposal* (MEDIUM), not external fact. |
| Pitfalls | HIGH | Whisper code-switching, IndexedDB 7-day eviction, Web Speech, GitHub Pages behaviors verified against MDN/WebKit/OpenAI. MEDIUM on SRS day-boundary specifics (implementation-dependent). |

**Overall confidence:** HIGH — the app half is on solid, verified ground; the two genuinely uncertain areas (content schema details, real-world ES/JA transcription quality) both have documented fallbacks and are de-risked by the human-in-the-loop skill design.

### Gaps to Address

- **Content schema per-kanji segment reliability:** The linchpin for Mode B and correct furigana. *Handle:* freeze schema in Phase 1 with the renderability invariant enforced by `validate.mjs`; validate against a real vocab sample including an okurigana compound before building consumers. Fallback: word-level ruby.
- **Real ES/JA transcription quality:** Sources agree on `large-v3` + `--language auto` but no exact WER for this exact mix. *Handle:* spot-check one real class recording early in the skill build; rely on the Claude structuring + human-verification step as the disambiguator; do NOT over-engineer VAD per-segment re-transcription in v1 (flag as possible v2 refinement).
- **SRS day-boundary policy:** Local-midnight is the bounded default but is an explicit *policy* choice. *Handle:* document it; test with a clock fast-forward across midnight and a timezone offset.
- **iOS `persist()` grant behavior:** `navigator.storage.persist()` is best-effort and improves materially only for installed PWAs. *Handle:* surface the returned boolean, nag export regardless, and verify the export->clear->import round-trip during the build.

## Sources

### Primary (HIGH confidence)
- Context7 `/open-spaced-repetition/ts-fsrs` — `Card` fields, `fsrs()`, `next()`, `Rating`, `createEmptyCard`
- Context7 `/vitejs/vite` — Vite 7/8 lines
- npm registry (`npm view`, 2026-07-06) — verified versions: vite 8.1.3, react 19.2.7, tailwindcss 4.3.2, vite-plugin-pwa 1.3.0 (+ peerDeps), idb 8.0.3, ts-fsrs 5.4.1
- MDN — Web Speech API (async `getVoices`/`voiceschanged`, offline synthesis), Storage API quotas & eviction
- WebKit bug #266559 / Apple Developer forums — iOS 7-day IndexedDB eviction
- OpenAI Whisper Discussion #49 — single-language-per-segment / code-switching limitation
- Simon Willison TIL — whisper.cpp brew install, model download, ffmpeg 16kHz, `--output-json`
- vite-pwa/vite-plugin-pwa Issue #923 — Vite 8 peer support
- rafgraph/spa-github-pages + community #64096 — GitHub Pages SPA routing / 404 fallback
- FSRS vs SM-2 benchmarks (diane.app, expertium.github.io, remnote) — retention accuracy, ~20-30% fewer reviews, Anki default since v23.10

### Secondary (MEDIUM confidence)
- ggml-org/whisper.cpp discussions — `-l auto`, `-oj`, large-v3-turbo tradeoffs
- HF whisper-large-v3 discussions #56/#71; WhisperX paper — VAD code-switching workaround, hallucination/model-size effect
- whispernotes.app / spokenly.app — large-v3 vs turbo WER, Apple-Silicon speed
- Tofugu / Migaku — active recall > multiple choice, sentence cards, one-fact-per-card
- W3C ruby / japanesewithanime / lorenzovainigli — `<ruby>`/`<rt>`/`<rp>`, okurigana + jukugo alignment difficulty
- AnkiWeb FAQ / repetrax — SM-2, review pile-up, timezone considerations
- Content schema, storage split, component boundaries, build order — architectural synthesis for this project (design proposal)

### Tertiary (LOW confidence)
- Exact ES/JA word-error-rate figures for `large-v3` on this specific class-audio mix — inferred from the size->multilingual-accuracy relationship; validate with a real clip during the skill build.

---
*Research completed: 2026-07-06*
*Ready for roadmap: yes*

# Phase 1: JP-Learner v1 (complete PWA + content skill) - Research

**Researched:** 2026-07-06
**Domain:** Offline-first personal Japanese-learning PWA (SRS + active recall) + local-Whisper Claude content skill, meeting at one frozen JSON contract
**Confidence:** HIGH (stack versions, ts-fsrs API, PWA/deploy, IndexedDB, TTS, `<ruby>`) / MEDIUM (per-kanji token okurigana representation — de-risked here by a validated sample + fallback / real ES-JA transcription WER)

> **Reading note for the planner.** This RESEARCH builds ON TOP of the already-detailed project research (`.planning/research/*`). It does NOT re-derive stack choices, pitfalls, or FSRS-vs-SM2 — those are settled and captured in CLAUDE.md. Instead it delivers the *phase/implementation-level* specifics: **a FROZEN `content.schema.json` v1** (the spine), the exact IndexedDB progress shapes wired to the verified `ts-fsrs` `Card`, the `<ruby>` render function for A/B/C, the 5 exercise engines as pure functions, the tolerant typing checker, the `vite-plugin-pwa` + GitHub Pages config, the skill contract, and the Web Speech TTS wrapper. Where the project research already nailed something, this doc points to it rather than repeating it.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (Hybrid session):** Practice session is **hybrid** — by default it starts in automatic mode (the app serves the queue of items due, varying the exercise type), AND the user can pick a specific exercise type whenever they want. (Clarifies EXER-01..06, SRS-02)
- **D-02 (Review scope × SRS queue — two co-existing sub-modes):** (a) **Repaso SRS** = what is due by the FSRS calendar; (b) **Repasar periodo** = the entire block of Hoy / Esta semana / Total even if not SRS-due (intensive review). The scope selector (Hoy/Semana/Total) applies to BOTH sub-modes. (Clarifies SRS-01..03)
- **D-03 (Learned-kanji marking — the Mode B engine):** **Automatic + manual.** A kanji/word auto-marks as learned when its FSRS card graduates to state `Review` (default ~2-3 consecutive Good/Easy — a configurable constant `LEARNED_THRESHOLD`), AND the user can additionally mark/unmark manually. This learned-kanji set feeds Mode B's gradual substitution. (Clarifies DISP-03/04)
- **D-04 (Glossary/library navigation):** **Two switchable views** — by **class** (list by date → vocab/grammar/notes of that class) and by **category** (vocabulary / grammar), with a global search. (Clarifies UI-02, CONT-06)
- **D-05 (Interface language):** UI in **Spanish** (user is a Spanish speaker); Japanese content renders per the active display mode (A/B/C).

### Claude's Discretion
- Exact value of `LEARNED_THRESHOLD`, typing-answer tolerance (romaji/kana variants, n/nn), number of items per automatic session, and micro-interactions/animations: planner/executor's call with sensible defaults.
- All technical architecture/pattern/performance decisions: planner's call (already guided by research/SUMMARY.md).

### Deferred Ideas (OUT OF SCOPE — do not build)
- Automatic exercise-type selection by item maturity (v2 — ADAPT-01)
- Per-class weakness panel (v2 — ADAPT-02)
- FSRS parameter training (v2 — ADAPT-03; needs 1,000+ reviews)
- Automatic cross-device sync (v2 — SYNC-01)
- Reminders / push notifications (v2 — SYNC-02)
- Per-segment VAD re-transcription for hard intra-sentence code-switching (v2 — TRANS-01)
</user_constraints>

<phase_requirements>
## Phase Requirements

All 37 v1 requirements ship in this single phase, along the mandatory internal build order (schema → shell+deploy → persistence+SRS → display+exercises → TTS+gamification+skill+hardening).

| ID | Description | Research Support (this doc §) |
|----|-------------|------------------------------|
| PWA-01 | Installable PWA (manifest) | §PWA & Deploy — manifest |
| PWA-02 | Fully offline after first load | §PWA & Deploy — SW precache |
| PWA-03 | New class appears on refresh (network-first HTML+JSON) | §PWA & Deploy — runtimeCaching NetworkFirst |
| PWA-04 | Published on GitHub Pages (base path + SPA fallback) | §PWA & Deploy — base + HashRouter + Actions |
| CONT-01 | Versioned `content.schema.json`, single contract, TS types generated | §Frozen Content Schema; §Standard Stack (json-schema-to-typescript) |
| CONT-02 | Stable deterministic ID `<classId>:<type>:<slug>` + class/date tags | §Frozen Content Schema — ID rules |
| CONT-03 | Vocab: kanji·kana·romaji·ES·example | §Frozen Content Schema — vocab |
| CONT-04 | Per-word AND per-kanji `tokens[]` reading segments | §Frozen Content Schema — tokens; §Sample class JSON |
| CONT-05 | Grammar (pattern+explanation+examples) + notes tagged | §Frozen Content Schema — grammar/notes |
| CONT-06 | Read-only load from repo JSON (index + per-class) | §Frozen Content Schema — file layout; §ContentStore |
| PROG-01 | SRS state + learned-kanji + streak/points persist in IndexedDB | §Progress Store Shape |
| PROG-02 | Export progress to JSON backup | §Export/Import — format + round-trip |
| PROG-03 | Import backup, restore complete state (round-trip verified) | §Export/Import |
| PROG-04 | Progress references content by ID only, never embeds | §Progress Store Shape — invariant |
| PROG-05 | `navigator.storage.persist()` + `appVersion` migrations | §Progress Store Shape — persist() + migrations |
| SRS-01 | One shared FSRS schedule per item, all exercise types | §FSRS Integration — one Card per item |
| SRS-02 | User grades recall → FSRS schedules next | §FSRS Integration — grade→next |
| SRS-03 | Practice by scope: Hoy / Semana / Total | §FSRS Integration — scope filter + D-02 sub-modes |
| SRS-04 | Local-calendar day boundaries (not timestamp deltas) | §Day-Boundary Helper |
| SRS-05 | Daily new-card intake capped | §FSRS Integration — new-card cap |
| DISP-01 | Switch display mode A/B/C in settings | §Ruby Rendering |
| DISP-02 | Furigana via native `<ruby>` from schema data | §Ruby Rendering |
| DISP-03 | Mode B: kana default → kanji-with-furigana as kanji learned | §Ruby Rendering — Mode B |
| DISP-04 | Mark kanji/words learned → updates learned set (Mode B driver) | §Progress Store; §Ruby Rendering — Mode B; D-03 |
| EXER-01 | Flashcards, active recall (show→reveal→self-grade) | §Exercise Engines — flashcard |
| EXER-02 | Multiple choice | §Exercise Engines — multipleChoice |
| EXER-03 | Fill-in/typing, tolerant checking (romaji/kana, n/nn) | §Exercise Engines — typing; §Tolerant Checker |
| EXER-04 | Sentence word-bank | §Exercise Engines — wordBank |
| EXER-05 | ES↔JA matching | §Exercise Engines — matching |
| EXER-06 | Bidirectional JA→ES and ES→JA | §Exercise Engines — direction |
| TTS-01 | On-demand Japanese TTS (button, never auto-play) | §Web Speech TTS |
| TTS-02 | Graceful degrade if no ja-JP voice | §Web Speech TTS — fallback |
| GAM-01 | Daily streak | §Progress Store — meta; §Day-Boundary Helper |
| GAM-02 | Global progress % | §Progress Store — deriving progress% |
| GAM-03 | Non-punitive points counter | §Progress Store — meta |
| UI-01/02/03 | Mobile-first indigo/pastel shell, bottom nav, dashboard | 01-UI-SPEC.md (design contract) |
| SKILL-01 | Local whisper.cpp large-v3, no API key | §The Skill — transcribe |
| SKILL-02 | Structure transcription into schema-valid JSON, disambiguate ES/JA | §The Skill — structure |
| SKILL-03 | Validate output against schema (ajv) before writing | §The Skill — validate.mjs |
| SKILL-04 | Write/commit JSON with deterministic IDs + class/date tags | §The Skill — deterministic IDs + commit |
| SKILL-05 | Runs the same way under a fixed documented contract | §The Skill — SKILL.md contract |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

CLAUDE.md mirrors PROJECT.md + STACK.md; there are no additional hard directives beyond what is already captured. The load-bearing directives the planner MUST honor:

- **No backend, no API keys in the app.** All AI (transcription + structuring) lives in the local skill. Enforce: the app bundle contains zero secrets, zero network calls except `fetch()` of same-origin content JSON.
- **Monorepo:** app (PWA) + skill (whisper.cpp + Claude structuring + ajv) in one repo; skill writes the JSON the app reads.
- **Content in versioned git JSON (git = backup); progress in IndexedDB with export/import.**
- **Tailwind v4 CSS-first (`@theme` in CSS + `@tailwindcss/vite`), NOT v3 `tailwind.config.js`.** A lighter model defaults to v3 — the plan must state v4 explicitly.
- **No in-app Japanese NLP** (no kuromoji/kuroshiro/wanakana). Readings are authoritative schema data. Computing them teaches wrong kanji.
- **No hand-rolled SRS math** (`ts-fsrs`) and **no hand-rolled service worker** (`vite-plugin-pwa`/Workbox).
- **Single phase, token-budgeted (Fable 5).** Prefer bounded defaults over theoretically-optimal solutions. Descope order if time-boxed: gamification → Mode C → (never) SRS correctness / content ingestion / export-import.
- **GSD workflow enforcement:** repo edits go through a GSD command (informational — does not affect this research).

## Summary

This phase ships two loosely-coupled halves that meet at one file contract. The single highest-leverage deliverable is **freezing `content.schema.json` v1 first** (§Frozen Content Schema below): it carries per-word AND per-kanji `tokens[]` reading segments so the app renders all three display modes with zero in-client Japanese analysis, and it uses deterministic IDs (`<classId>:<type>:<slug>`) so re-processing a class never orphans SRS history. Everything downstream — display modes, the 5 exercises, the SRS queue, export/import — is a pure transform over that contract plus the IndexedDB progress store.

The stack is settled and re-verified against npm on 2026-07-06 (§Standard Stack): Vite 8.1.3, React 19.2.7, TypeScript 5.9 (pinned, not 6.x), Tailwind 4.3.2 CSS-first, `idb` 8.0.3, `ts-fsrs` 5.4.1, `vite-plugin-pwa` 1.3.0, `lucide-react` 1.23.0. Two build-only tools are added by this phase that the project research did not pin: **`json-schema-to-typescript` 15.0.4** (generate `content.ts` types from the frozen schema) and **`ajv` 8.20.0 + `ajv-formats` 3.0.1** (validate skill output before commit). The `ts-fsrs` `Card` shape and the `next()`/`Rating`/`State` APIs were confirmed exactly via Context7 — critically, `TypeConvert.card()` rehydrates an ISO-serialized card back to a live `Card`, which is the mechanism that makes the export/import round-trip clean.

**Primary recommendation:** Author and freeze `content.schema.json` v1 exactly as specified in §Frozen Content Schema, hand-author the realistic sample class JSON in §Sample Class JSON (it already includes the okurigana compound 乗り込む and validates the per-kanji renderability invariant), generate TS types from it, and build every consumer against the frozen types. Use `HashRouter` (zero GitHub-Pages-404 config), the declarative `vite-plugin-pwa` `workbox.runtimeCaching` NetworkFirst strategy for content JSON + HTML, and one `ts-fsrs` `Card` per item shared across all exercises.

## Architectural Responsibility Map

The "tiers" here are the loosely-coupled halves + the layers inside the static PWA (there is no server). Mapping capabilities to the correct owner prevents the classic mistake of putting Japanese-analysis or scheduling logic in the wrong place.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Audio → transcript | Skill (producer, local) | — | Whisper runs on the Mac; never in the app (no keys, offline PWA). |
| ES/JA disambiguation, reading assignment, romaji | Skill (Claude structuring step) | — | The only reliable disambiguator; computing readings in-app teaches wrong kanji. |
| Schema validation before write | Skill (`validate.mjs`, ajv) | — | Contract enforced at the producer boundary, once, before git. |
| Content storage | Repo JSON (git) | Service Worker cache | Content is immutable, versioned; git is the backup. |
| Content loading + in-memory lookup | App / ContentStore (read-only) | — | Pure fetch + merge into `Map`s by ID; no mutation. |
| Furigana / display-mode rendering | App / Display layer (pure fn) | ContentStore (tokens) + ProgressStore (learned set) | Pure function of (tokens, mode, learnedSet). No NLP. |
| Scheduling (FSRS) | App / SRS wrapper over `ts-fsrs` | ProgressStore (IndexedDB) | One `Card` per item; scheduling is a pure library call. |
| Exercise generation | App / Exercise engines (pure fn) | ContentStore + SRS | Vary presentation, never the schedule. |
| Progress persistence, streak, points, learned set | App / ProgressStore (IndexedDB via `idb`) | Export/import file | Mutable, per-device; references content by ID only. |
| Backup / "sync" | App / Export-Import (JSON file) | — | The only progress backup; iOS evicts IndexedDB. |
| TTS pronunciation | App / TTS wrapper (Web Speech) | OS-installed ja-JP voice | Enhancement layer; must never block, never wrong-voice. |
| Routing | App / HashRouter (client-only) | — | Avoids GitHub Pages SPA-404 with zero server config. |
| Hosting / deploy | GitHub Pages (static) + GitHub Actions | — | Free static host; base path + SPA fallback required. |

## Standard Stack

### Core (verified against npm registry 2026-07-06)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite | 8.1.3 | Build / dev / static bundler | `[VERIFIED: npm view vite version]` De-facto React SPA build; zero-config static output for Pages. |
| react | 19.2.7 | UI | `[VERIFIED: npm]` Ubiquitous; function components + hooks only. |
| react-dom | 19.2.7 | DOM renderer | `[VERIFIED: npm]` Keep in lockstep with react. |
| typescript | 5.9.x (**pin, not 6.0.3**) | Types | `[VERIFIED: npm latest is 6.0.3]` STACK.md deliberately pins 5.9 for lighter-model tooling stability. Install `typescript@5.9`. |
| tailwindcss | 4.3.2 | Styling (CSS-first `@theme`) | `[VERIFIED: npm]` v4 requires the Vite plugin, NOT PostCSS. NO `tailwind.config.js`. |
| @tailwindcss/vite | 4.3.2 | Tailwind v4 Vite integration | `[VERIFIED: npm]` Must match tailwindcss major. |
| vite-plugin-pwa | 1.3.0 | PWA manifest + SW (Workbox) | `[VERIFIED: npm; peerDeps include vite ^8]` Never hand-roll the SW. |
| @vitejs/plugin-react | 6.0.3 | React fast-refresh / JSX | `[VERIFIED: npm]` Standard pairing with Vite 8. |
| idb | 8.0.3 | IndexedDB Promise wrapper | `[VERIFIED: npm]` Thin (~1KB); explicit `upgrade` migrations. |
| ts-fsrs | 5.4.1 | FSRS scheduler | `[VERIFIED: npm + Context7 /open-spaced-repetition/ts-fsrs]` Zero-dependency, TS-native; `Card` shape confirmed. |
| lucide-react | 1.23.0 | Icon set (bottom nav, controls) | `[VERIFIED: npm; latest 1.23.0 published 2026-07-01]` Tree-shakeable; matches the thin line-icon look. Named in 01-UI-SPEC.md. |

### Supporting — build-time only (NEW; added by this phase, not previously pinned)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| json-schema-to-typescript | 15.0.4 | Generate `content.ts` types FROM `content.schema.json` | `[VERIFIED: npm view]` Run once at schema-freeze and whenever schema changes. Wire as an npm script (`gen:types`). This is the mechanism that makes app types unable to drift from the contract (CONT-01). |
| ajv | 8.20.0 | JSON Schema validator | `[VERIFIED: npm]` Skill `validate.mjs` (SKILL-03). Draft 2020-12 supported. |
| ajv-formats | 3.0.1 | `date`/`date-time` format keywords for ajv | `[VERIFIED: npm]` Needed because the schema uses `format: "date"` on class dates. |
| react-router-dom | 7.18.1 | `HashRouter` only | `[VERIFIED: npm]` Optional — state-based view switching is a valid alternative. If a router is used, `HashRouter` sidesteps the Pages 404 entirely. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `idb` | Dexie 4.4 | Only if "due this week across all classes" cursor logic gets painful. More API surface = more for a lighter model. Start with `idb`. |
| `HashRouter` | `BrowserRouter` + `basename` + copy `index.html`→`404.html` | Clean URLs but more moving parts. HashRouter is the bounded default here. |
| React state/context | `zustand@5` | Only if global state (session/settings/streak) gets tangled. Do not start with it. |
| full `large-v3` | `large-v3-turbo` | Skill-side; use turbo only if the Mac is memory-constrained (<0.5pt WER cost). |

**Installation (app):**
```bash
npm create vite@latest jp-learner -- --template react-ts
npm install react@19 react-dom@19 idb@8 ts-fsrs@5 lucide-react@1
npm install -D typescript@5.9 @vitejs/plugin-react@6 tailwindcss@4 @tailwindcss/vite@4 vite-plugin-pwa@1
npm install -D json-schema-to-typescript@15 ajv@8 ajv-formats@3
# optional router:
npm install react-router-dom@7   # HashRouter only
```

**Version verification performed (npm registry, 2026-07-06):**
`vite=8.1.3`, `react=react-dom=19.2.7`, `typescript latest=6.0.3` (pin 5.9), `tailwindcss=@tailwindcss/vite=4.3.2`, `vite-plugin-pwa=1.3.0`, `@vitejs/plugin-react=6.0.3`, `idb=8.0.3`, `ts-fsrs=5.4.1`, `react-router-dom=7.18.1`, `ajv=8.20.0`, `ajv-formats=3.0.1`, `json-schema-to-typescript=15.0.4`, `lucide-react=1.23.0`. All `[VERIFIED: npm registry]`.

---

## Frozen Content Schema — `content.schema.json` v1 (THE SPINE — freeze before any consumer)

This is the single most important output of the research. Freeze it exactly, generate TS types from it, and build every consumer against those types. Design goals (from ARCHITECTURE.md, now made concrete): rigid, deterministic-ID'd, display-mode-aware, flat-lookup-friendly.

### File layout (CONT-06)

```
content/
├── schema/
│   └── content.schema.json      # THE contract (below). Single source of truth.
├── index.json                   # manifest: classes + contentVersion + per-class contentHash
└── classes/
    ├── 2026-04-14.json           # one file per class; classId = date (or date-slug)
    └── 2026-04-21.json
```

App copies/symlinks `content/` into `public/content/` at build so Pages serves it statically. `contentVersion` in `index.json` bumps on breaking schema changes; per-class `contentHash` (sha256 of the file) lets the SW/app detect a re-processed class and bust its cache entry.

### ID rules (CONT-02) — enforced by `validate.mjs`

- Every content item has `id` matching `^<classId>:<type>:<slug>$`, where:
  - `classId` = the class file's `classId` (the class date, `YYYY-MM-DD`, or `YYYY-MM-DD-<n>` if two classes share a day).
  - `type` ∈ `vocab | grammar | kanji | note`.
  - `slug` = deterministic, derived from the **kana reading** for vocab (romaji-safe: hepburn ASCII, lowercased, non-`[a-z0-9]` → `-`, collapsed, trimmed), from a pattern slug for grammar, the literal kanji char for kanji, and an ordinal for notes. Deterministic derivation is the linchpin: re-running the skill on the same class produces identical IDs, so SRS history stays attached (PROG-04).
  - On slug collision within a class, append `-2`, `-3`, … deterministically by document order.
- `tags[]` always includes the `classId`; `date` is present at class level and inherited.

### The renderability invariant (CONT-04) — enforced by `validate.mjs`

For every vocab item and every example/grammar-example that carries `tokens[]`:
- `tokens[].surface` concatenated === the item's `kanji` field (the full written form).
- `tokens[].reading` concatenated === the item's `kana` field (the full reading).
- Every token with `isKanji: true` MUST carry a non-empty `kanji` array (the individual kanji characters in that run) and a `reading`. Tokens with `isKanji: false` carry `surface === reading` (kana/okurigana) and MAY omit `kanji`.

This invariant is what makes Modes A/B/C pure rendering (§Ruby Rendering) with zero NLP. If a real class item cannot satisfy per-kanji segmentation reliably, the documented fallback is a single word-level token (`isKanji: true`, `kanji` = all kanji in the word, whole-word `reading`) — correct but coarser (Mode B can't half-substitute that word). This fallback is representable in the SAME schema, so it never requires a schema change.

### `content.schema.json` v1 (JSON Schema, draft 2020-12) — FROZEN

```jsonc
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://jp-learner/content.schema.json",
  "title": "JP-Learner class content",
  "type": "object",
  "required": ["schemaVersion", "classId", "date", "label"],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": { "const": 1 },
    "classId": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}(-\\d+)?$" },
    "date":    { "type": "string", "format": "date" },
    "label":   { "type": "string", "minLength": 1 },
    "vocab":   { "type": "array", "items": { "$ref": "#/$defs/vocab" },   "default": [] },
    "grammar": { "type": "array", "items": { "$ref": "#/$defs/grammar" }, "default": [] },
    "kanji":   { "type": "array", "items": { "$ref": "#/$defs/kanji" },   "default": [] },
    "notes":   { "type": "array", "items": { "$ref": "#/$defs/note" },    "default": [] }
  },
  "$defs": {
    "token": {
      "type": "object",
      "required": ["surface", "reading", "isKanji"],
      "additionalProperties": false,
      "properties": {
        "surface": { "type": "string", "minLength": 1 },
        "reading": { "type": "string", "minLength": 1 },
        "isKanji": { "type": "boolean" },
        "kanji":   { "type": "array", "items": { "type": "string", "minLength": 1, "maxLength": 1 } }
      }
    },
    "sentence": {
      "type": "object",
      "required": ["kanji", "kana", "romaji", "es"],
      "additionalProperties": false,
      "properties": {
        "kanji":  { "type": "string" },
        "kana":   { "type": "string" },
        "romaji": { "type": "string" },
        "es":     { "type": "string" },
        "tokens": { "type": "array", "items": { "$ref": "#/$defs/token" } }
      }
    },
    "vocab": {
      "type": "object",
      "required": ["id", "type", "kanji", "kana", "romaji", "es", "tokens", "tags"],
      "additionalProperties": false,
      "properties": {
        "id":     { "type": "string", "pattern": "^[^:]+:vocab:.+$" },
        "type":   { "const": "vocab" },
        "kanji":  { "type": "string", "minLength": 1 },
        "kana":   { "type": "string", "minLength": 1 },
        "romaji": { "type": "string", "minLength": 1 },
        "es":     { "type": "string", "minLength": 1 },
        "pos":    { "type": "string" },
        "tokens": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/token" } },
        "example":{ "$ref": "#/$defs/sentence" },
        "tags":   { "type": "array", "items": { "type": "string" }, "minItems": 1 }
      }
    },
    "grammar": {
      "type": "object",
      "required": ["id", "type", "pattern", "es", "examples", "tags"],
      "additionalProperties": false,
      "properties": {
        "id":       { "type": "string", "pattern": "^[^:]+:grammar:.+$" },
        "type":     { "const": "grammar" },
        "pattern":  { "type": "string", "minLength": 1 },
        "es":       { "type": "string", "minLength": 1 },
        "examples": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/sentence" } },
        "tags":     { "type": "array", "items": { "type": "string" }, "minItems": 1 }
      }
    },
    "kanji": {
      "type": "object",
      "required": ["id", "type", "char", "readings", "es", "seenIn"],
      "additionalProperties": false,
      "properties": {
        "id":       { "type": "string", "pattern": "^[^:]+:kanji:.+$" },
        "type":     { "const": "kanji" },
        "char":     { "type": "string", "minLength": 1, "maxLength": 1 },
        "readings": {
          "type": "object", "additionalProperties": false,
          "properties": {
            "on":  { "type": "array", "items": { "type": "string" } },
            "kun": { "type": "array", "items": { "type": "string" } }
          }
        },
        "es":     { "type": "string", "minLength": 1 },
        "seenIn": { "type": "array", "items": { "type": "string" } }
      }
    },
    "note": {
      "type": "object",
      "required": ["id", "type", "es", "tags"],
      "additionalProperties": false,
      "properties": {
        "id":   { "type": "string", "pattern": "^[^:]+:note:.+$" },
        "type": { "const": "note" },
        "es":   { "type": "string", "minLength": 1 },
        "tags": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
      }
    }
  }
}
```

**Notes on the frozen shape (differences vs the ARCHITECTURE.md proposal, all intentional):**
- `additionalProperties: false` everywhere → the skill's output is rigid (SKILL-05); an unexpected field is a validation failure, not silently accepted.
- `tokens[].kanji` is `array<single-char>` (the per-kanji list of the run) — this is what enables Mode B partial substitution. The ARCHITECTURE.md proposal already had `"kanji": ["食"]`; this freezes it as required-when-`isKanji`.
- `sentence.tokens` is **optional**. Example/grammar sentences render at word-or-sentence granularity; only vocab headwords must carry full per-kanji tokens (the renderability invariant is enforced only where `tokens` is present). This keeps the skill's job bounded — full per-kanji tokenization of every example sentence is expensive and not needed for the display modes on the headword.
- The three cross-field invariants (surface-concat, reading-concat, per-kanji arrays) are **NOT expressible in pure JSON Schema** — they are enforced imperatively in `validate.mjs` (§The Skill). JSON Schema handles shape; `validate.mjs` handles the semantic invariants + ID determinism.

### `index.json` (manifest) — FROZEN companion shape

```jsonc
{
  "contentVersion": 1,
  "generatedAt": "2026-07-06T10:00:00Z",
  "classes": [
    {
      "id": "2026-04-14",
      "date": "2026-04-14",
      "label": "Clase 1 — presentaciones y verbos -masu",
      "file": "classes/2026-04-14.json",
      "contentHash": "sha256-…",
      "counts": { "vocab": 6, "grammar": 1, "kanji": 3, "notes": 2 }
    }
  ]
}
```

### Generating TS types (CONT-01)

```bash
# npm script: "gen:types": "json2ts content/schema/content.schema.json > app/src/content/content.ts"
npx json-schema-to-typescript content/schema/content.schema.json --output app/src/content/content.ts
```
This produces `ClassContent`, `Vocab`, `Grammar`, `Kanji`, `Note`, `Token`, `Sentence` interfaces. The app imports ONLY these generated types for content; the skill validates against the SAME schema file. Neither can drift.

---

## Sample Class JSON (hand-authored, realistic beginner Japanese) — proves the token model

This is the one hand-authored class so the app is usable before the skill runs (Success Criterion 9). It deliberately includes **乗り込む** (okurigana compound: reading covers 乗 and 込 but NOT り/む) to prove per-kanji tokens, plus a jukugo compound (毎日), a single-kanji word, and a kana-only word. Author it at `content/classes/2026-04-14.json`.

```jsonc
{
  "schemaVersion": 1,
  "classId": "2026-04-14",
  "date": "2026-04-14",
  "label": "Clase 1 — presentaciones y verbos -masu",
  "vocab": [
    {
      "id": "2026-04-14:vocab:tabemasu",
      "type": "vocab",
      "kanji": "食べます", "kana": "たべます", "romaji": "tabemasu",
      "es": "comer (cortés)", "pos": "verbo",
      "tokens": [
        { "surface": "食",   "reading": "た",   "isKanji": true,  "kanji": ["食"] },
        { "surface": "べます","reading": "べます","isKanji": false }
      ],
      "example": {
        "kanji": "毎日ご飯を食べます。", "kana": "まいにちごはんをたべます。",
        "romaji": "Mainichi gohan o tabemasu.", "es": "Como arroz todos los días."
      },
      "tags": ["2026-04-14", "verbo", "-masu"]
    },
    {
      "id": "2026-04-14:vocab:norikomu",
      "type": "vocab",
      "kanji": "乗り込む", "kana": "のりこむ", "romaji": "norikomu",
      "es": "subir a bordo / abordar", "pos": "verbo",
      "tokens": [
        { "surface": "乗", "reading": "の", "isKanji": true,  "kanji": ["乗"] },
        { "surface": "り", "reading": "り", "isKanji": false },
        { "surface": "込", "reading": "こ", "isKanji": true,  "kanji": ["込"] },
        { "surface": "む", "reading": "む", "isKanji": false }
      ],
      "example": {
        "kanji": "電車に乗り込む。", "kana": "でんしゃにのりこむ。",
        "romaji": "Densha ni norikomu.", "es": "Subir al tren."
      },
      "tags": ["2026-04-14", "verbo"]
    },
    {
      "id": "2026-04-14:vocab:mainichi",
      "type": "vocab",
      "kanji": "毎日", "kana": "まいにち", "romaji": "mainichi",
      "es": "todos los días", "pos": "sustantivo",
      "tokens": [
        { "surface": "毎日", "reading": "まいにち", "isKanji": true, "kanji": ["毎", "日"] }
      ],
      "example": {
        "kanji": "毎日日本語を勉強します。", "kana": "まいにちにほんごをべんきょうします。",
        "romaji": "Mainichi nihongo o benkyou shimasu.", "es": "Estudio japonés todos los días."
      },
      "tags": ["2026-04-14", "tiempo"]
    },
    {
      "id": "2026-04-14:vocab:hon",
      "type": "vocab",
      "kanji": "本", "kana": "ほん", "romaji": "hon",
      "es": "libro", "pos": "sustantivo",
      "tokens": [
        { "surface": "本", "reading": "ほん", "isKanji": true, "kanji": ["本"] }
      ],
      "example": {
        "kanji": "本を読みます。", "kana": "ほんをよみます。",
        "romaji": "Hon o yomimasu.", "es": "Leo un libro."
      },
      "tags": ["2026-04-14", "sustantivo"]
    },
    {
      "id": "2026-04-14:vocab:arigatou",
      "type": "vocab",
      "kanji": "ありがとう", "kana": "ありがとう", "romaji": "arigatou",
      "es": "gracias", "pos": "expresión",
      "tokens": [
        { "surface": "ありがとう", "reading": "ありがとう", "isKanji": false }
      ],
      "example": {
        "kanji": "ありがとうございます。", "kana": "ありがとうございます。",
        "romaji": "Arigatou gozaimasu.", "es": "Muchas gracias."
      },
      "tags": ["2026-04-14", "expresión"]
    }
  ],
  "grammar": [
    {
      "id": "2026-04-14:grammar:masu-form",
      "type": "grammar",
      "pattern": "Verbo + ます",
      "es": "Forma cortés del presente/futuro. Se une a la raíz del verbo.",
      "examples": [
        { "kanji": "行きます", "kana": "いきます", "romaji": "ikimasu", "es": "voy / iré" },
        { "kanji": "飲みます", "kana": "のみます", "romaji": "nomimasu", "es": "bebo / beberé" }
      ],
      "tags": ["2026-04-14", "gramática", "-masu"]
    }
  ],
  "kanji": [
    { "id": "2026-04-14:kanji:食", "type": "kanji", "char": "食",
      "readings": { "on": ["ショク"], "kun": ["た.べる", "く.う"] },
      "es": "comer / comida", "seenIn": ["2026-04-14:vocab:tabemasu"] },
    { "id": "2026-04-14:kanji:乗", "type": "kanji", "char": "乗",
      "readings": { "on": ["ジョウ"], "kun": ["の.る", "の.せる"] },
      "es": "montar / subir", "seenIn": ["2026-04-14:vocab:norikomu"] },
    { "id": "2026-04-14:kanji:本", "type": "kanji", "char": "本",
      "readings": { "on": ["ホン"], "kun": ["もと"] },
      "es": "libro / origen", "seenIn": ["2026-04-14:vocab:hon"] }
  ],
  "notes": [
    { "id": "2026-04-14:note:1", "type": "note",
      "es": "ご en ご飯 es un prefijo honorífico; no cambia el significado, solo la cortesía.",
      "tags": ["2026-04-14"] },
    { "id": "2026-04-14:note:2", "type": "note",
      "es": "La partícula を marca el objeto directo del verbo.",
      "tags": ["2026-04-14"] }
  ]
}
```

**Renderability check (do this by hand before freezing — it passes):**
- `tabemasu`: `食`+`べます` = `食べます` === kanji ✓ ; `た`+`べます` = `たべます` === kana ✓.
- `norikomu`: `乗`+`り`+`込`+`む` = `乗り込む` ✓ ; `の`+`り`+`こ`+`む` = `のりこむ` ✓. Per-kanji tokens (乗→の, 込→こ) with okurigana り/む as kana tokens — the exact hard case, represented correctly.
- `mainichi`: single jukugo token `毎日`→`まいにち`, `kanji:["毎","日"]`. Mode B substitutes this word only when BOTH 毎 and 日 are learned (see fallback semantics in §Ruby Rendering).

---

## ContentStore (read-only, in-memory) — CONT-06

Boot flow: `fetch(BASE + 'content/index.json')` → for each class `fetch(BASE + class.file)` → merge into flat `Map`s. `BASE = import.meta.env.BASE_URL` (respects the Vite `base`, so it works under `/JP-Learner/`).

```typescript
// app/src/content/store.ts
import type { ClassContent, Vocab, Grammar, Kanji, Note } from './content'; // generated

export interface ContentIndex { contentVersion: number; generatedAt: string; classes: ClassMeta[]; }
export interface ClassMeta { id: string; date: string; label: string; file: string; contentHash: string; counts: Record<string, number>; }

export interface ContentStore {
  index: ContentIndex;
  classes: ClassMeta[];
  vocabById: Map<string, Vocab>;
  grammarById: Map<string, Grammar>;
  kanjiById: Map<string, Kanji>;
  noteById: Map<string, Note>;
  byClass: Map<string, { vocab: Vocab[]; grammar: Grammar[]; kanji: Kanji[]; notes: Note[] }>;
}

const BASE = import.meta.env.BASE_URL; // e.g. "/JP-Learner/"

export async function loadContent(): Promise<ContentStore> {
  const index: ContentIndex = await (await fetch(`${BASE}content/index.json`)).json();
  const store: ContentStore = {
    index, classes: index.classes,
    vocabById: new Map(), grammarById: new Map(), kanjiById: new Map(), noteById: new Map(),
    byClass: new Map(),
  };
  for (const c of index.classes) {
    const data: ClassContent = await (await fetch(`${BASE}${c.file}`)).json();
    const bucket = { vocab: data.vocab ?? [], grammar: data.grammar ?? [], kanji: data.kanji ?? [], notes: data.notes ?? [] };
    store.byClass.set(c.id, bucket);
    for (const v of bucket.vocab)   store.vocabById.set(v.id, v);
    for (const g of bucket.grammar) store.grammarById.set(g.id, g);
    for (const k of bucket.kanji)   store.kanjiById.set(k.id, k);
    for (const n of bucket.notes)   store.noteById.set(n.id, n);
  }
  return store;
}
```
`[VERIFIED: codebase greenfield — pattern from ARCHITECTURE.md]` For year-1 scale (1–30 classes) load-all-at-boot is trivial; lazy-load only becomes relevant at ~100+ classes.

---

## Progress Store Shape (IndexedDB via `idb`) — PROG-01..05

`ts-fsrs` `Card` shape confirmed exactly via Context7 `[CITED: github.com/open-spaced-repetition/ts-fsrs/_autodocs/4-types.md]`:

```typescript
interface Card {
  due: Date; stability: number; difficulty: number;
  elapsed_days: number; scheduled_days: number; learning_steps: number;
  reps: number; lapses: number; state: State; last_review?: Date;
}
// enum State { New=0, Learning=1, Review=2, Relearning=3 }
```

Serialize `Date` → ISO string for IndexedDB; rehydrate with `TypeConvert.card()` (below). Progress references content **by ID only** — never embeds content text (PROG-04, Anti-Pattern 1).

### Object stores (idb v8)

```typescript
// app/src/progress/db.ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export const APP_VERSION = 1; // == IndexedDB version; bump + migrate on shape change

interface SrsRecord {
  itemId: string;                                   // == content id, e.g. "2026-04-14:vocab:tabemasu"
  itemType: 'vocab' | 'grammar' | 'kanji';
  card: {                                           // ts-fsrs Card, dates as ISO strings
    due: string; stability: number; difficulty: number;
    elapsed_days: number; scheduled_days: number; learning_steps: number;
    reps: number; lapses: number; state: 0 | 1 | 2 | 3; last_review?: string;
  };
  classId: string;                                  // for review-scope filtering without a content join
}
interface LearnedKanji { char: string; learnedAt: string; source: 'auto' | 'manual'; } // D-03
interface ProgressMeta {                            // single record, key "singleton"
  key: 'singleton';
  streakCount: number; lastActiveDay: string;       // YYYY-MM-DD local
  points: number;
  displayMode: 'A' | 'B' | 'C';
  romajiVisible: boolean;                           // Mode A romaji toggle (UI-SPEC settings)
  newCardsToday: number; newCardsDay: string;       // YYYY-MM-DD, for the daily cap (SRS-05)
  appVersion: number;                               // schema version stamp for export/migration
}

interface JPDB extends DBSchema {
  srs:          { key: string; value: SrsRecord; indexes: { byDue: string; byClass: string } };
  learnedKanji: { key: string; value: LearnedKanji };
  meta:         { key: string; value: ProgressMeta };
}

export function openProgress(): Promise<IDBPDatabase<JPDB>> {
  return openDB<JPDB>('jp-learner', APP_VERSION, {
    upgrade(db, oldVersion /*, newVersion, tx */) {
      // MIGRATIONS ARE ADDITIVE + IDEMPOTENT. Never recreate stores that hold data.
      if (oldVersion < 1) {
        const srs = db.createObjectStore('srs', { keyPath: 'itemId' });
        srs.createIndex('byDue', 'card.due');
        srs.createIndex('byClass', 'classId');
        db.createObjectStore('learnedKanji', { keyPath: 'char' });
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      // if (oldVersion < 2) { /* future: transform existing records here */ }
    },
    blocked() { /* another tab holds an older version open — prompt reload */ },
    blocking() { /* this tab blocks a newer version — close/reload */ },
  });
}
```
`[VERIFIED: idb 8.0.3 API — openDB upgrade/blocked/blocking; DBSchema typing]` `[CITED: Pitfall 8 — explicit onupgradeneeded, handle blocked/versionchange]`

- **`byClass` index on `srs`** lets the review-scope filter run without joining ContentStore first — but the class/date boundary math still uses local-calendar comparison (§Day-Boundary Helper), not string sort alone.
- **`persist()` request (PROG-05):** call on first meaningful interaction, surface the boolean.
  ```typescript
  export async function requestPersistence(): Promise<boolean> {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return navigator.storage.persist(); // best-effort; materially better for installed PWAs
  }
  ```
  `[VERIFIED: MDN Storage API — persist()/persisted() return Promise<boolean>]` `[CITED: Pitfall 3 — iOS 7-day eviction]`

### Deriving progress % (GAM-02)

`% = count(srs where card.state === State.Review) / count(all reviewable content items)`. Simple, motivational, monotonic-ish. Reviewable universe = `vocabById.size + grammarById.size` (kanji cards optional). `[ASSUMED]` exact formula is discretionary; document whatever the executor picks.

### Points (GAM-03) — non-punitive

Points only ever increase: `+1` per correct answer, `+bonus` per session finished, `+milestone` per streak day. Never decrement, never gate. Store `points` in meta. `[ASSUMED]` exact values discretionary.

---

## Export / Import — PROG-02/03 (the ONLY progress backup)

**Backup format (FROZEN v1):**
```jsonc
{
  "backupVersion": 1,
  "appVersion": 1,               // == APP_VERSION at export time
  "exportedAt": "2026-07-06T21:00:00Z",
  "srs":          [ /* SrsRecord[] verbatim, ISO dates */ ],
  "learnedKanji": [ /* LearnedKanji[] */ ],
  "meta":         { /* ProgressMeta */ }
}
```

**Export** = read all three stores, assemble the object, `Blob` → download `jp-learner-backup-YYYY-MM-DD.json`.
**Import** = parse → **validate shape + `backupVersion`** (reject/upgrade unknown) → destructive-confirm (UI-SPEC copy) → clear stores → bulk `put` records. Never `dangerouslySetInnerHTML` any imported field (Security §).

**Round-trip verification (must be done during the build, not assumed — Pitfall 3):**
`export → clear all stores → import → assert stores byte-identical to pre-export`. In particular assert that a rehydrated card is a valid `ts-fsrs` `Card`:
```typescript
import { TypeConvert } from 'ts-fsrs';
const live = TypeConvert.card(rec.card); // ISO strings → Date, numeric state → State enum
// scheduler.next(live, new Date(), Rating.Good) must not throw
```
`[VERIFIED: Context7 ts-fsrs — TypeConvert.card() normalizes ISO/string inputs to a Card]` This is the exact mechanism that makes the round-trip clean: store ISO strings, rehydrate with `TypeConvert.card()` before any `scheduler.next()`.

---

## Day-Boundary Helper — SRS-04 (local calendar, never timestamp deltas)

Store every timestamp as UTC ISO; compare **local calendar dates**. Local midnight is the bounded default policy (Anki's 4am rollover is a nice-to-have, NOT built in v1). `[CITED: Pitfall 4]`

```typescript
// app/src/progress/day.ts
export const localDayKey = (d = new Date()): string => {          // "YYYY-MM-DD" in device TZ
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
export const startOfLocalDay = (d = new Date()): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const startOfLocalWeek = (d = new Date()): Date => {        // Monday-based week
  const s = startOfLocalDay(d); const dow = (s.getDay() + 6) % 7; s.setDate(s.getDate() - dow); return s;
};
// Streak: update on any review. If localDayKey(now) === lastActiveDay → no change.
// If it's exactly the next local day → streakCount++. If gap > 1 day → streakCount = 1.
export function bumpStreak(meta: ProgressMeta, now = new Date()): ProgressMeta {
  const today = localDayKey(now);
  if (meta.lastActiveDay === today) return meta;
  const yesterday = localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const streakCount = meta.lastActiveDay === yesterday ? meta.streakCount + 1 : 1;
  return { ...meta, streakCount, lastActiveDay: today };
}
```
**Test (Pitfall 4 verification):** fast-forward the clock across local midnight and across a timezone offset; assert "due today", "this week", and streak stay correct with no off-by-one.

---

## FSRS Integration (ts-fsrs) — SRS-01/02/03/05

**One `Card` per item, shared across all exercise types (SRS-01).** Vary the presentation, never the schedule (Anti-Pattern in FEATURES.md). Confirmed `next()` signature `[CITED: Context7 ts-fsrs 1-fsrs-scheduler.md]`: `next(card, now, grade): RecordLogItem` where `grade ∈ {Again=1, Hard=2, Good=3, Easy=4}` and the return is `{ card, log }`.

```typescript
// app/src/progress/srs.ts
import { fsrs, Rating, State, createEmptyCard, TypeConvert, type Grade } from 'ts-fsrs';

const scheduler = fsrs();   // FSRS-6 defaults: request_retention 0.9, enable_fuzz false,
                            // enable_short_term true, learning_steps ['1m','10m'], relearning ['10m']

export function gradeItem(rec: SrsRecord | undefined, itemId: string, itemType, classId: string, grade: Grade, now = new Date()) {
  const card = rec ? TypeConvert.card(rec.card) : createEmptyCard(now);
  const { card: next } = scheduler.next(card, now, grade);
  const graduatedToReview = card.state !== State.Review && next.state === State.Review; // D-03 auto-learn trigger
  return { record: serialize(itemId, itemType, classId, next), graduatedToReview };
}
```
`[VERIFIED: Context7 — generatorParameters defaults: request_retention 0.9, maximum_interval 36500, enable_fuzz false, enable_short_term true, learning_steps ['1m','10m'], relearning_steps ['10m'], w 21 weights]`

### Grade mapping per exercise (from FEATURES.md, made concrete)

| Exercise | Wrong | Correct | Notes |
|----------|-------|---------|-------|
| Flashcard (EXER-01) | user picks | user picks | Expose all 4 buttons (Otra vez/Difícil/Bien/Fácil = Again/Hard/Good/Easy). |
| Typing (EXER-03) | Again | Good | Optional: typo-tolerated-correct → Hard; instant correct → Easy (discretionary). |
| Multiple choice / word-bank / matching (EXER-02/04/05) | Again | Good | Coarse binary signal — acceptable. |

### D-03 auto-learn — the Mode B engine

`LEARNED_THRESHOLD` is discretionary, but the concrete mechanism is: **when `gradeItem` reports `graduatedToReview === true`** for a vocab/kanji item, auto-add its kanji to `learnedKanji` with `source: 'auto'`. With default `learning_steps ['1m','10m']`, a card graduates to `Review` after clearing both learning steps — i.e. ~2 consecutive Good/Easy same-session, which matches the "~2-3 aciertos consecutivos" in D-03. Manual toggle sets/removes `source: 'manual'`; a manually-removed kanji stays removed even if later auto-graduated (respect the user's explicit choice — a `suppressedAuto` flag or storing manual removals is discretionary). `[VERIFIED: ts-fsrs learning_steps semantics via Context7]`

### Review scope × sub-modes — SRS-03 + D-02 (the co-existing two sub-modes)

The scope selector (Hoy/Semana/Total) and the sub-mode selector (Repaso SRS / Repasar periodo) are **orthogonal** and combine into the session item list:

```typescript
// scope → the date window (local calendar) applied to CONTENT class dates
function inScope(classDate: string, scope: 'hoy'|'semana'|'total', now=new Date()): boolean {
  if (scope === 'total') return true;
  const cd = new Date(classDate + 'T00:00:00');
  if (scope === 'hoy')    return localDayKey(cd) === localDayKey(now);
  /* semana */            return cd >= startOfLocalWeek(now);
}

// sub-mode → whether SRS-due filtering is applied on top of scope
function buildSession(store, srsByItem, scope, subMode: 'srs'|'periodo', now=new Date()) {
  const items = allReviewableItems(store).filter(it => inScope(classDateOf(it), scope, now));
  if (subMode === 'periodo') return items;                        // Repasar periodo: everything in the block (D-02b)
  return items.filter(it => {                                     // Repaso SRS: only what's due (D-02a)
    const rec = srsByItem.get(it.id);
    if (!rec) return true;                                        // new (never seen) counts as due
    return TypeConvert.card(rec.card).due <= now;                 // due by FSRS calendar
  });
}
```
- **Reviews before new items** within a session; **cap new-card intake per day (SRS-05):** track `newCardsToday`/`newCardsDay` in meta, reset when `newCardsDay !== localDayKey(now)`, and stop admitting `state===New` items once the cap (~10, discretionary) is hit. This is what stops a post-vacation wall of cards.
- **Hybrid session (D-01):** automatic mode = `buildSession(...)` then the engine picks an exercise type per item (variety); manual mode = same item list, but the user forces one exercise type. Auto exercise-type-*by-maturity* is v2 (ADAPT-01) — v1 varies type by simple rotation/random, NOT by maturity.

---

## Ruby Rendering for Modes A/B/C — DISP-01/02/03/04

Native `<ruby>` only. `<rb>` is deprecated — base text goes directly inside `<ruby>`. Ruby is Baseline widely-available since 2015 (incl. iOS Safari). Include `<rp>` fallback parens. `[VERIFIED: MDN Web/HTML/Element/ruby]`

**Correct markup (single reading with fallback):** `<ruby>漢<rp>(</rp><rt>かん</rt><rp>)</rp></ruby>`

```typescript
// app/src/display/ruby.tsx
import type { Token } from '../content';
type Mode = 'A' | 'B' | 'C';
// romajiOf: per-run romaji for Mode A rt. Prefer skill-provided romaji at the word level;
// if only word-level romaji exists, Mode A rt may be applied at the WORD granularity (fallback).

export function renderTokens(tokens: Token[], mode: Mode, learned: Set<string>, romajiVisible: boolean) {
  return tokens.map((t, i) => {
    if (!t.isKanji) return <span key={i}>{t.surface}</span>;      // kana/okurigana: always literal
    const known = (t.kanji ?? []).every(k => learned.has(k));

    if (mode === 'C') return <span key={i}>{t.surface}</span>;    // kanji only, no rt

    if (mode === 'A') {                                           // kanji + romaji-over (kana over is also valid)
      if (!romajiVisible) return <span key={i}>{t.surface}</span>;
      return <ruby key={i}>{t.surface}<rp>(</rp><rt>{t.reading /* or romajiOf(t) */}</rt><rp>)</rp></ruby>;
    }

    // Mode B (progressive): learned kanji-run → show kanji + KANA furigana; unlearned → show plain KANA (hide kanji)
    return known
      ? <ruby key={i}>{t.surface}<rp>(</rp><rt>{t.reading}</rt><rp>)</rp></ruby>
      : <span key={i}>{t.reading}</span>;                         // not learned yet → kana only
  });
}
```

**Mode B substitution rule (DISP-03, driven by learned set from D-03):** a kanji *run* substitutes to kanji-with-kana-furigana only when **every** kanji char in that run's `kanji[]` is in the learned set; otherwise the whole run renders as its kana `reading`. So 毎日 surfaces as kanji only once BOTH 毎 and 日 are learned — before that it shows まいにち. This matches the "gradual substitution" intent and is a pure data transform.

**Word-level fallback (documented, same schema):** if a vocab item was authored with a single word-level token (per-kanji segmentation unreliable), Mode B can only substitute the whole word at once (all its kanji learned) — coarser but correct, never wrong readings. No schema change needed. `[CITED: FEATURES.md — Mode B fallback]`

**Mode A romaji source:** the `rt` in Mode A is ideally romaji. The frozen schema stores word-level `romaji`; per-token romaji is NOT stored. Bounded default: in Mode A, render `rt` = romaji at the **word** level (one `<ruby>` wrapping the whole word) rather than per-kanji, OR render `rt` = per-token kana. Both are correct; the UI-SPEC says "romaji over each reading segment" — the executor should apply word-level romaji ruby in Mode A to avoid needing per-kanji romaji the schema doesn't carry. `[ASSUMED: A1 — Mode A per-kanji-romaji granularity; word-level is the safe default]`

---

## Exercise Engines — EXER-01..06 (pure functions over ONE shared card)

All five are pure generators: input = `(items, contentStore, direction)`, output = an exercise instance; the *result* feeds `gradeItem` (§FSRS). Distractors always come from **same-class vocab** (plausible, never random) `[CITED: FEATURES.md]`. Direction (EXER-06) swaps prompt/answer sides; no separate screen — a header indicator.

```typescript
type Direction = 'JA_ES' | 'ES_JA';

// EXER-01 Flashcard: front = prompt (per direction), reveal = answer + example + TTS, then 4 self-grade buttons.
// EXER-02 Multiple choice: prompt + 4 options; correct = the item; 3 distractors sampled from same classId vocab.
// EXER-03 Typing: prompt + text input; check with isAnswerCorrect (below); wrong→Again, right→Good.
// EXER-04 Word-bank: JA sentence with gap(s) as slots + shuffled JA chips (correct tokens + 1-2 same-class distractors);
//         validate placed order === correct token order.
// EXER-05 Matching: N ES cards + N JA cards (N~5); tap-pair; correct pairs clear. Coarse Good/Again per pair.

interface Distractors { sameClass: Vocab[]; }
function pickDistractors(pool: Vocab[], exclude: string, n: number): Vocab[] { /* shuffle pool minus exclude, take n */ }
```

**Word-bank chips (EXER-04, the signature exercise):** split the example sentence into word chips. The frozen `sentence` optionally carries `tokens[]`; if absent, the skill/author can provide a chip breakdown, OR the app splits on particle/space boundaries the author encoded. Bounded default: author the signature exercise's source sentences with `tokens[]` present so chip order is authoritative — no in-app segmentation. `[ASSUMED: A2 — word-bank chip source; prefer authoring tokens on those sentences]`

### Tolerant typing checker — EXER-03 (romaji/kana variants, n/nn)

```typescript
// app/src/exercises/check.ts
export function isAnswerCorrect(input: string, accepted: string[]): boolean {
  const norm = (s: string) => s
    .trim().toLowerCase()
    .replace(/[。、.!?！？\s]/g, '')            // strip punctuation/space
    .normalize('NFKC')                          // full/half-width unify
    // romaji variant folding (only affects romaji input; kana passes through):
    .replace(/nn/g, 'n')                        // ん: n or nn
    .replace(/shi/g, 'si').replace(/chi/g, 'ti').replace(/tsu/g, 'tu')
    .replace(/fu/g, 'hu').replace(/ji/g, 'zi')
    .replace(/sha/g, 'sya').replace(/shu/g, 'syu').replace(/sho/g, 'syo')
    .replace(/cha/g, 'tya').replace(/chu/g, 'tyu').replace(/cho/g, 'tyo')
    .replace(/-|ー/g, '')                        // ignore long-vowel dash
    .replace(/(.)\1/g, '$1');                    // collapse doubled consonants (small っ tolerance)
  const target = accepted.map(norm);
  return target.includes(norm(input));
}
// accepted = [item.kana, item.romaji] (+ item.kanji for advanced). Direction ES_JA → accept kana/romaji;
// JA_ES → accept the es string (looser: substring/trim match on the ES translation).
```
`[CITED: FEATURES.md — accept shi/si, tsu/tu, n/nn, trim punctuation]` The exact tolerance set is discretionary (D-05 discretion); this is a sensible default. Note: kana input (via OS IME) already matches `item.kana` after NFKC; the romaji foldings only fire when the user typed romaji.

---

## PWA & Deploy — PWA-01/02/03/04

### vite.config.ts (the load-bearing config)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/JP-Learner/',                      // MUST match repo name (Pitfall 6). Drives BASE_URL, SW scope, manifest.
  plugins: [
    react(),
    tailwind(),                              // Tailwind v4 Vite plugin — NO postcss.config, NO tailwind.config.js
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'JP-Learner', short_name: 'JP-Learner',
        start_url: '.', scope: '.',          // relative → resolves under /JP-Learner/
        display: 'standalone', background_color: '#F5F5F8', theme_color: '#5A5AE6',
        icons: [ /* 192 + 512 png, maskable */ ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],   // precache hashed assets (cache-first)
        navigateFallback: 'index.html',                       // SPA shell
        runtimeCaching: [
          { // content JSON: NEW class must appear on refresh (PWA-03) → network-first
            urlPattern: ({ url }) => url.pathname.includes('/content/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'content-json', networkTimeoutSeconds: 3,
                       expiration: { maxEntries: 200 } },
          },
        ],
      },
    }),
  ],
});
```
`[VERIFIED: vite-plugin-pwa Context7 — NetworkFirst strategy, __WB_MANIFEST, navigateFallback]` `[CITED: Pitfall 7 — never cache-first HTML/JSON; cache-first only hashed assets]` The precache (globPatterns → hashed assets) is cache-first automatically; the `runtimeCaching` NetworkFirst rule covers content JSON. `registerType: 'autoUpdate'` + Workbox default `skipWaiting`/`clientsClaim` picks up new deploys.

### Tailwind v4 CSS-first (NO tailwind.config.js)

```css
/* app/src/index.css */
@import "tailwindcss";
@theme {
  --color-indigo: #5A5AE6;   --color-coral: #E46C60;   --color-gold: #EEC24E;
  --color-lavender: #E7E7FC; --color-mint: #CFF0E4;    --color-peach: #FCF0E7;  --color-softblue: #C6DAF2;
  --color-ink: #1A1A24;      --color-muted: #6B6B7B;   --color-surface: #FCFCFC; --color-bg: #F5F5F8;
  --color-dark: #30303C;
  --shadow-soft: 0 4px 16px rgba(48,48,60,0.08);
  --shadow-card: 0 2px 8px rgba(48,48,60,0.06);
  --font-display: "Nunito", system-ui, sans-serif;
}
```
`[CITED: STACK.md + 01-UI-SPEC.md — v4 @theme in CSS, tokens from UI-SPEC color/spacing]`

### Routing: HashRouter (zero Pages 404 config) — PWA-04

Use `HashRouter` from react-router-dom, OR plain state-based view switching (4 top-level views). HashRouter (`/#/glosario`) makes deep-link refresh work with no server rewrite. `[CITED: STACK.md / Pitfall 6 / Anti-Pattern 3]`

### GitHub Actions deploy — PWA-04

```yaml
# .github/workflows/deploy.yml (essentials)
# on: push to main
# 1. npm ci
# 2. npm run gen:types        # regenerate content.ts from schema (fails build if schema/types drift)
# 3. copy content/ -> app dist/content/ (or vite public/content already contains it)
# 4. npm run build
# 5. cp dist/index.html dist/404.html   # SPA fallback belt-and-suspenders even with HashRouter
# 6. actions/upload-pages-artifact + actions/deploy-pages
```
**Verify against the LIVE `/JP-Learner/` URL (Pitfall 6/7):** hard-refresh a nested route, install-to-home-screen, and confirm a newly-committed class JSON appears without a manual hard refresh. These fail silently on localhost.

---

## Web Speech TTS — TTS-01/02

Native `speechSynthesis`; no library. Voices load async; iOS requires a user gesture; degrade gracefully if no `ja-JP` voice. `[CITED: STACK.md TTS caveats + Pitfall 9]`

```typescript
// app/src/tts/tts.ts
let jaVoice: SpeechSynthesisVoice | null = null;
export function initTTS(onReady: (hasVoice: boolean) => void) {
  const pick = () => {
    const v = speechSynthesis.getVoices();
    jaVoice = v.find(x => /ja[-_]JP/i.test(x.lang)) ?? null;   // Android uses ja_JP underscore
    onReady(!!jaVoice);
  };
  pick();                                    // may return [] on first call
  speechSynthesis.addEventListener('voiceschanged', pick);
  // optional: poll a few times at ~250ms in case voiceschanged never fires
}
export function speakJa(text: string) {      // MUST be called inside a tap handler (iOS)
  if (!jaVoice) return;                       // graceful no-op — NEVER speak JA with a non-JA voice
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP'; u.voice = jaVoice; u.rate = 0.9;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
```
UI-SPEC: when `hasVoice === false`, **hide** (not disable) the speaker button app-wide. Never auto-play on card load. `[VERIFIED: MDN Web Speech API — getVoices async, voiceschanged]`

---

## The Skill — SKILL-01..05 (producer; never deployed to Pages)

Layout: `skill/SKILL.md`, `skill/transcribe.sh`, `skill/validate.mjs`, `skill/prompts/structure.md`. Audio in gitignored `audio-src/`. `[CITED: ARCHITECTURE.md structure]`

### 1. Transcribe (SKILL-01) — whisper.cpp large-v3, macOS, no key

Binary is **`whisper-cli`** (brew `whisper-cpp`). Flags confirmed: `-m` model, `-f` input WAV, `-l auto` (detects language from first ~30s), `-oj`/`--output-json`, `-of <prefix>` output prefix. JSON carries per-segment `detected_language`. `[VERIFIED: github.com/ggml-org/whisper.cpp README + issue #3603; WebSearch 2026-07-06]`

```bash
# skill/transcribe.sh
brew install whisper-cpp ffmpeg                                # one-time
sh "$(brew --prefix)/share/whisper-cpp/models/download-ggml-model.sh" large-v3   # or curl from HF ggerganov/whisper.cpp
ffmpeg -i "audio-src/$1" -ar 16000 -ac 1 -c:a pcm_s16le "audio-src/$1.wav"        # 16kHz mono 16-bit
whisper-cli -m models/ggml-large-v3.bin -f "audio-src/$1.wav" -l auto -oj -of "audio-src/$1"
# → audio-src/$1.json  (transcript + per-segment detected_language)  ; NEVER pass --translate
```
`[CITED: STACK.md pipeline; Simon Willison TIL]` Do NOT use tiny/base/small (garbles ES/JA). `large-v3-turbo` only if memory-constrained.

### 2. Structure (SKILL-02) — Claude reasoning is the ES/JA disambiguator

Whisper does NOT code-switch (one language per file — Pitfall 1). The Claude structuring step (reading the transcript + segment languages) is where ES explanation is separated from JA target items, kanji/kana/romaji are filled, per-word AND per-kanji `tokens[]` are built (satisfying the renderability invariant), and items are classified vocab/grammar/note. `prompts/structure.md` is the rigid, documented prompt referencing `content.schema.json`. Human-in-the-loop verification is the safety net (the user was in class). `[CITED: SUMMARY.md, Pitfalls 1/2]`

### 3. Validate (SKILL-03) — `validate.mjs` (ajv + imperative invariants)

```javascript
// skill/validate.mjs — refuse to write on any failure
import Ajv from 'ajv'; import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
const ajv = new Ajv({ allErrors: true, strict: false }); addFormats(ajv);
const schema = JSON.parse(readFileSync('content/schema/content.schema.json'));
const validate = ajv.compile(schema);

export function validateClass(doc) {
  if (!validate(doc)) throw new Error('schema: ' + ajv.errorsText(validate.errors));
  const seen = new Set();
  const check = (arr = [], type) => arr.forEach(it => {
    if (!it.id.startsWith(`${doc.classId}:${type}:`)) throw new Error(`bad id ${it.id}`);
    if (seen.has(it.id)) throw new Error(`dup id ${it.id}`); seen.add(it.id);
    if (type === 'vocab') {
      const surf = it.tokens.map(t => t.surface).join('');
      const read = it.tokens.map(t => t.reading).join('');
      if (surf !== it.kanji) throw new Error(`token surface != kanji: ${it.id}`);   // renderability invariant
      if (read !== it.kana)  throw new Error(`token reading != kana: ${it.id}`);
      it.tokens.forEach(t => { if (t.isKanji && !(t.kanji?.length)) throw new Error(`kanji token missing kanji[]: ${it.id}`); });
    }
  });
  check(doc.vocab, 'vocab'); check(doc.grammar, 'grammar'); check(doc.kanji, 'kanji'); check(doc.notes, 'note');
  return true;
}
```
`[VERIFIED: ajv 8.20.0 + ajv-formats 3.0.1; enforces the 3 cross-field invariants JSON Schema can't]`

### 4. Write + commit (SKILL-04) — deterministic IDs, class/date tags

`validate` passes → write `content/classes/<classId>.json` → compute sha256 → update `content/index.json` (`counts`, `contentHash`, `generatedAt`) → `git add` + `git commit` with a fixed message convention. Deterministic slug derivation (§ID rules) is enforced by the validator; re-running on the same class yields identical IDs (PROG-04). `[CITED: Anti-Pattern 2 — no random/index IDs]`

### 5. Fixed contract (SKILL-05)

`SKILL.md` documents the invariant sequence: capture → `transcribe.sh` → Claude structure per `prompts/structure.md` → `validate.mjs` → write+commit. Always the same steps, same order, same schema. The skill depends ONLY on the frozen schema (never on the app) — it can be built in parallel after schema freeze.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spaced-repetition math | SM-2 / custom scheduler | `ts-fsrs` (defaults) | Subtle interval bugs; `Card` shape + `next()` verified. |
| Service worker / offline cache | Manual SW | `vite-plugin-pwa` (Workbox) | Stale-cache blank screens; hashing handled. |
| IndexedDB access | Raw `indexedDB` | `idb` | Callback hell; explicit typed migrations. |
| Furigana readings | In-app reading computation / kuromoji | Schema `tokens[]` + native `<ruby>` | Wrong readings teach wrong kanji; ~15MB payload for nothing. |
| Romaji/kana conversion | wanakana/kuroshiro | Skill emits kanji/kana/romaji into JSON | Same — keep all JA processing in the skill. |
| Content type definitions | Hand-written TS interfaces | `json-schema-to-typescript` from the schema | Types cannot drift from the contract. |
| Card ISO→Date rehydration | Manual `new Date()` field mapping | `ts-fsrs` `TypeConvert.card()` | Handles state enum + date coercion; makes round-trip clean. |
| Date-diff scheduling/streak | Millisecond timestamp deltas | Local-calendar date comparison | Timezone/off-by-one streak & count bugs. |
| TTS engine | Any TTS lib | Native `speechSynthesis` + ja-JP voice | Offline OS voices; no payload. |
| SPA routing on Pages | BrowserRouter + rewrites | `HashRouter` (or state views) | Zero 404 config. |

**Key insight:** In this domain the "hard" subsystems (code-switching, furigana alignment, SRS math, offline caching) are ALL solved by pushing work either into the frozen schema (readings, IDs, tokens) or into a maintained library (`ts-fsrs`, `idb`, Workbox). The app itself is pure rendering + pure transforms. Every time a task feels like it needs Japanese analysis or scheduling math in the app, that's a signal it belongs in the skill/schema or a library.

## Architecture Patterns

### System Architecture Diagram

```
 CLASS AUDIO (ES/JA, gitignored)
      │
      ▼  [SKILL — local, on the Mac, no keys]
 transcribe.sh: ffmpeg 16kHz ─▶ whisper-cli large-v3 -l auto -oj ─▶ transcript.json (per-seg lang)
      │
      ▼  Claude structuring (prompts/structure.md) — THE ES/JA disambiguator; fills kanji/kana/romaji/tokens
      ▼  validate.mjs (ajv schema + ID determinism + renderability invariants)  ──FAIL──▶ refuse
      │ PASS
      ▼  write content/classes/<classId>.json + update index.json  ──git commit──▶
 ══════════════════ THE CONTRACT: content/*.json (versioned in git) ══════════════════
      │  GitHub Actions: gen:types → build → cp index.html 404.html → deploy-pages
      ▼
 GitHub Pages (static, /JP-Learner/)
      │  app boot: fetch(BASE+content/index.json) → fetch each class file
      ▼  [APP — static PWA, offline via SW: NetworkFirst content JSON, cache-first hashed assets]
 ContentStore (read-only Maps by ID)
      │                          │
      ▼                          ▼
 Display layer (pure)       Exercise engines (pure)
  renderTokens(A/B/C)        flashcard/MC/typing/wordbank/matching
      │  learnedKanji set        │  answer → Grade
      ▼                          ▼
 ProgressStore (IndexedDB via idb): srs (one ts-fsrs Card/item) · learnedKanji · meta(streak/points/mode)
      │  serialize ISO ⇄ TypeConvert.card()
      ▼
 Export/Import JSON file  ◀── the ONLY progress backup (iOS evicts IndexedDB @ 7 days)
```

### Recommended Project Structure

```
jp-learner/                         # monorepo root
├── content/
│   ├── schema/content.schema.json  # FROZEN contract (this doc)
│   ├── index.json                  # manifest
│   └── classes/2026-04-14.json      # hand-authored sample (this doc)
├── skill/
│   ├── SKILL.md · transcribe.sh · validate.mjs · prompts/structure.md
├── audio-src/                       # GITIGNORED
├── app/
│   ├── src/
│   │   ├── content/  loader.ts store.ts content.ts(GENERATED)
│   │   ├── progress/ db.ts srs.ts kanji.ts gamification.ts backup.ts day.ts
│   │   ├── display/  ruby.tsx modes.ts
│   │   ├── exercises/ flashcard.ts multipleChoice.ts typing.ts wordBank.ts matching.ts check.ts
│   │   ├── tts/ tts.ts
│   │   ├── views/ Home.tsx Session.tsx Glosario.tsx Guardados.tsx Perfil.tsx
│   │   ├── components/ (bottom nav, buttons, cards, chips — hand-rolled per UI-SPEC)
│   │   ├── app.tsx main.tsx index.css(@theme)
│   ├── public/manifest handled by vite-plugin-pwa; content copied/symlinked to public/content
│   └── vite.config.ts index.html
└── .github/workflows/deploy.yml
```

### Anti-Patterns to Avoid (from PITFALLS.md — verification hooks)

- **Embedding content in progress records** → store `itemId` only; join at read time.
- **Non-deterministic skill IDs** → deterministic `<classId>:<type>:<slug>`, enforced in `validate.mjs`.
- **Cache-first HTML/content JSON** → NetworkFirst those; cache-first only hashed assets.
- **Per-exercise schedules** → one shared `Card` per item.
- **Mode B applies globally** → substitute only per-learned-kanji-run.
- **Trusting Whisper whole-file auto-detect** → disambiguation lives in the Claude step + human verification.

## Common Pitfalls

All ten project pitfalls apply verbatim (`.planning/research/PITFALLS.md`). The phase-specific verification hooks:

### Pitfall: iOS evicts IndexedDB after 7 days (highest severity — Core-Value guardrail)
**Avoid:** ship `persist()` + export/import + verified round-trip IN THIS PHASE, not after. **Verify:** `export → clear → import` yields identical state and a rehydrated `Card` that `scheduler.next()` accepts.

### Pitfall: SRS day-boundary/timezone
**Avoid:** local-calendar comparison only (§Day-Boundary Helper). **Verify:** fast-forward clock across local midnight + TZ offset; streak/scope stay correct.

### Pitfall: GitHub Pages base path + stale SW
**Avoid:** `base: '/JP-Learner/'`, HashRouter, NetworkFirst content JSON, `cp index.html 404.html`. **Verify:** on the LIVE URL — nested-route hard refresh, install, new class appears without manual refresh.

### Pitfall: per-kanji token unreliability (Mode B linchpin)
**Avoid:** enforce renderability invariant in `validate.mjs`; word-level token fallback in the SAME schema. **Verify:** the 乗り込む sample renders correctly in A/B/C.

### Pitfall: missing ja-JP voice
**Avoid:** hide (not disable) speaker button when no voice; never wrong-voice. **Verify:** on a no-voice device the session works fully with no audio.

## Code Examples

The load-bearing snippets are inline above:
- Frozen `content.schema.json` and sample class JSON — §Frozen Content Schema / §Sample Class JSON
- `ts-fsrs` grade→next + auto-learn trigger — §FSRS Integration `[VERIFIED: Context7]`
- `idb` store + migrations + `persist()` — §Progress Store `[VERIFIED: idb 8 / MDN]`
- Export/import round-trip with `TypeConvert.card()` — §Export/Import `[VERIFIED: Context7]`
- `renderTokens` A/B/C — §Ruby Rendering `[VERIFIED: MDN ruby]`
- Tolerant typing checker — §Exercise Engines `[CITED: FEATURES.md]`
- `vite.config.ts` PWA + Tailwind v4 — §PWA & Deploy `[VERIFIED: Context7 vite-plugin-pwa]`
- `speakJa` TTS — §Web Speech TTS `[VERIFIED: MDN]`
- `validate.mjs` — §The Skill `[VERIFIED: ajv 8]`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SM-2 hand-rolled | FSRS via `ts-fsrs` (FSRS-6 defaults) | Anki default since v23.10 (2023) | ~20-30% fewer reviews; use defaults, no training. |
| Tailwind v3 `tailwind.config.js` | Tailwind v4 CSS-first `@theme` + `@tailwindcss/vite` | Tailwind v4 (2025) | No JS config; a lighter model must be told explicitly. |
| `<ruby><rb>…</rb>…` | Base text directly in `<ruby>` (`<rb>` deprecated) | HTML LS | Simpler markup; keep `<rp>` fallback. |
| Cloud STT (API key) | Local `whisper.cpp` large-v3 | — | Key-free, offline; binary is `whisper-cli`. |
| BrowserRouter + 404 hacks | HashRouter (or state views) | — | Zero Pages 404 config. |

**Deprecated/outdated:** `<rb>` element; Create React App; kuromoji/kuroshiro in-app; TypeScript 6.x (works, but pin 5.9 for tooling stability).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Mode A `rt` may render romaji at WORD granularity (schema stores word-level romaji, not per-token romaji) | Ruby Rendering | Low — per-token kana in Mode A is an equally-correct fallback; no wrong readings, only granularity. |
| A2 | Word-bank chip order comes from authored `sentence.tokens` (or an author-provided chip breakdown), not in-app segmentation | Exercise Engines | Low-Med — if not authored, EXER-04 needs a chip source; bounded default is to author tokens on signature sentences. Never do in-app JA segmentation. |
| A3 | `LEARNED_THRESHOLD` ≈ card graduating to `State.Review` (2 learning steps ['1m','10m']) matches D-03's "~2-3 aciertos" | FSRS Integration | Low — explicitly discretionary per D-03; graduation trigger is the concrete, defensible mechanism. |
| A4 | Real ES/JA `large-v3` transcription quality is "good enough for human-in-the-loop LLM reconstruction" | The Skill | Med — unbenchmarked for this exact mix; mitigated by human verification + spot-check a real clip early (SUMMARY.md flag). |
| A5 | progress% = items in `State.Review` / total reviewable items | Progress Store | Low — motivational metric only; exact formula discretionary. |

## Open Questions

1. **Per-kanji token reliability on real (non-sample) class data.**
   - Known: the sample (incl. 乗り込む) validates; the invariant is machine-enforced.
   - Unclear: whether the skill reliably produces per-kanji segments for every real word.
   - Recommendation: enforce the invariant in `validate.mjs`; when a word can't segment, emit a single word-level token (same schema) → Mode B substitutes that word all-or-nothing. No schema change, no wrong readings.

2. **Real ES/JA transcription WER (A4).**
   - Recommendation: spot-check one real class clip early in the skill build; the human-in-the-loop verification step is the safety net. Do NOT build VAD per-segment re-transcription in v1 (that's TRANS-01, v2).

3. **Exact repo/Pages base path.**
   - Known: `base` must match the repo name. This doc assumes `/JP-Learner/`.
   - Recommendation: confirm the actual GitHub repo name at scaffold time; if it differs, set `base` accordingly (and manifest scope stays relative `.`).

## Environment Availability

Skill-side only (the app has no external runtime deps beyond a browser). Not probed on this machine — these are the skill's requirements for the executor to verify on the target Mac.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ≥ 20 | Vite 8 build, `gen:types`, `validate.mjs` | verify at build | — | — (blocking for build) |
| whisper-cpp (brew) | SKILL-01 transcription | verify on Mac | — | none (core skill dep) |
| ffmpeg (brew) | SKILL-01 16kHz WAV conversion | verify on Mac | — | none |
| ggml-large-v3 model (~1.1–3GB) | SKILL-01 | download step | large-v3 | large-v3-turbo if memory-constrained |
| ja-JP TTS voice (OS) | TTS-01 | device-dependent | — | hide speaker button (TTS-02) — non-blocking |

**Missing deps with no fallback:** whisper-cpp + ffmpeg + Node — the executor must install these on the Mac before running the skill/build (documented in SKILL.md). The APP build needs only Node + npm.
**Missing deps with fallback:** ja-JP voice (graceful hide); large-v3 → turbo.

## Security Domain

`security_enforcement: true`, ASVS level 1. This is a static, no-backend, no-auth, single-user PWA — most ASVS categories are N/A. The real surface is untrusted JSON (skill output + imported backups) rendered in the DOM.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No accounts/backend. |
| V3 Session Management | no | No server sessions; local IndexedDB only. |
| V4 Access Control | no | Single-user, single-device; no shared resources. |
| V5 Input Validation | **yes** | ajv-validate skill output (`validate.mjs`); validate backup shape + `backupVersion` on import; reject/upgrade unknown versions. |
| V6 Cryptography | no | No secrets; `contentHash` is integrity, not security. Never store an API key (enforced constraint). |
| V7 Error Handling/Logging | minimal | No sensitive data to log; fail-closed on validation. |
| V14 Data Protection | light | Progress is local, non-sensitive; export downloads a plain JSON the user controls. |

### Known Threat Patterns for a static PWA rendering untrusted JSON

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via crafted content/backup JSON | Tampering | Render as text / `<ruby>` from structured fields ONLY. NEVER `dangerouslySetInnerHTML` on any content or imported field. React escapes text children by default — rely on that. `[CITED: PITFALLS.md security]` |
| Malicious/corrupt backup overwrites progress | Tampering | Validate shape + `backupVersion` before import; destructive-confirm dialog (UI-SPEC); clear→bulk-put only after validation passes. |
| API key leaking in public bundle | Info disclosure | No keys anywhere in the app (hard constraint). AI lives in the local skill. Verify the built bundle contains no secrets. |
| Supply-chain (build-time deps) | Tampering | `npm ci` with a committed lockfile; the pinned versions in §Standard Stack. |

## Sources

### Primary (HIGH confidence)
- Context7 `/open-spaced-repetition/ts-fsrs` — `Card` fields, `createEmptyCard`, `fsrs()`, `next()`/`repeat()`, `Rating`/`State`/`Grade` enums, `generatorParameters` defaults, `TypeConvert.card()`.
- Context7 `/vite-pwa/vite-plugin-pwa` + `/websites/vite-pwa-org_netlify_app` — NetworkFirst runtime caching, `__WB_MANIFEST`, navigateFallback, manifest config.
- npm registry (`npm view`, 2026-07-06) — all versions in §Standard Stack, incl. NEW: `json-schema-to-typescript@15.0.4`, `ajv@8.20.0`, `ajv-formats@3.0.1`, `lucide-react@1.23.0`.
- MDN — `<ruby>`/`<rt>`/`<rp>` (Baseline since 2015, `<rb>` deprecated), Web Speech API (async `getVoices`/`voiceschanged`), Storage API `persist()`/`persisted()`.
- github.com/ggml-org/whisper.cpp README + issue #3603 — `whisper-cli` binary, `-m`/`-f`/`-l auto`/`-oj`/`-of` flags, `download-ggml-model.sh large-v3`.

### Secondary (MEDIUM confidence)
- WebSearch (2026-07-06) — whisper.cpp `-l auto` 30s detection, JSON `detected_language` per segment, `-of` output prefix (multiple corroborating sources incl. whisper.cpp README/HF mirror).
- Project research `.planning/research/{SUMMARY,STACK,ARCHITECTURE,FEATURES,PITFALLS}.md` — the settled stack, storage split, pitfalls, exercise pedagogy, Mode B model (design proposals extended here).

### Tertiary (LOW confidence)
- Exact ES/JA WER for `large-v3` on this class-audio mix — inferred; validate with a real clip (A4).

## Metadata

**Confidence breakdown:**
- Frozen content schema: HIGH on shape/IDs/invariants (machine-enforced + validated sample incl. okurigana); MEDIUM on real-data per-kanji reliability (fallback in same schema).
- Standard stack: HIGH — every version re-verified against npm 2026-07-06; ts-fsrs/PWA APIs confirmed via Context7.
- Progress/SRS/export-import: HIGH — `Card` shape + `TypeConvert.card()` + `idb` migrations + `persist()` all verified.
- Ruby/display: HIGH — native `<ruby>`, `<rb>` deprecation, `<rp>` fallback confirmed via MDN.
- Exercises/tolerant checker: MEDIUM-HIGH — pure-function pattern solid; exact tolerance set discretionary.
- PWA/deploy: HIGH — NetworkFirst + base path + HashRouter + 404 fallback all verified/documented.
- TTS: HIGH — async voice load + iOS gesture + graceful fallback verified.
- Skill: MEDIUM-HIGH — `whisper-cli` flags verified; real transcription quality unbenchmarked (mitigated by human loop).

**Research date:** 2026-07-06
**Valid until:** ~2026-08-06 for versions (stable libs); schema/architecture guidance stable for the phase.

# Architecture Research

**Domain:** Offline-first personal PWA (language-learning / SRS) fed by a Claude Code content pipeline
**Researched:** 2026-07-06
**Confidence:** HIGH (stack, storage split, SRS API, GitHub Pages routing verified against Context7 + official sources; content schema is a design proposal, MEDIUM)

## Standard Architecture

The system is two loosely-coupled halves that meet at ONE contract: the content JSON. The skill is a **producer** (offline, manual, generates files into the repo). The app is a **consumer** (loads those files at runtime). They never talk over a network — the coupling is a versioned file format checked into git.

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│  PRODUCER — Claude Code skill (manual, on the user's Mac, NOT shipped)  │
├───────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐   ┌───────────────┐   ┌────────────────┐   ┌──────────┐  │
│  │ 1. Audio │──▶│ 2. Whisper     │──▶│ 3. Claude       │──▶│ 4. Write │  │
│  │  (ES/JA) │   │  local         │   │  structuring    │   │  + valid.│  │
│  │          │   │  (transcript)  │   │  (schema-bound) │   │  JSON    │  │
│  └──────────┘   └───────────────┘   └────────────────┘   └────┬─────┘  │
└───────────────────────────────────────────────────────────────┼────────┘
                                                                 │  git commit
                          ┌──────────────────────────────────────▼────────┐
                          │        THE CONTRACT (versioned in repo)        │
                          │  /content/classes/*.json  +  /content/index.json│
                          └──────────────────────────────────────┬────────┘
                                                                 │  fetch() at runtime
┌────────────────────────────────────────────────────────────────▼────────┐
│  CONSUMER — Static PWA (Vite + React + TS + Tailwind), GitHub Pages       │
├───────────────────────────────────────────────────────────────────────┤
│  UI LAYER   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│             │ Learn  │ │Exercise│ │ Review │ │Glossary│ │Progress│       │
│             │ view   │ │ engine │ │ (SRS)  │ │        │ │/streak │       │
│             └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘       │
├─────────────────┴──────────┴──────────┴──────────┴──────────┴───────────┤
│  DOMAIN LAYER  ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐   │
│                │ ContentStore │ │ SRS scheduler │ │ KanjiProgress /   │   │
│                │ (read-only,  │ │ (ts-fsrs wrap)│ │ display-mode logic│   │
│                │  in-memory)  │ │               │ │                   │   │
│                └──────┬───────┘ └──────┬───────┘ └─────────┬─────────┘   │
├───────────────────────┴────────────────┴──────────────────┴────────────┤
│  DATA LAYER   ┌─────────────────────┐        ┌────────────────────────┐  │
│               │ CONTENT (immutable)  │        │ PROGRESS (mutable)      │  │
│               │ fetched JSON + SW    │        │ IndexedDB (per device)  │  │
│               │ cache, keyed by hash │        │ + export/import JSON    │  │
│               └─────────────────────┘        └────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

**The single most important architectural rule:** content is *read-only, immutable, and identified by stable IDs*; progress is *mutable, per-device, and references content only by those IDs*. Progress never embeds content. This keeps the two data sources independently replaceable — re-processing a class or fixing a typo in the JSON must not corrupt the user's SRS history.

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Skill stage 1 — capture** | Accept a class audio file + a date/class label | Manual: user drops file in `/audio-src/` (gitignored), invokes skill |
| **Skill stage 2 — transcribe** | Local Whisper → raw transcript (code-switched ES/JA) | `whisper.cpp` or `faster-whisper`, `large-v3` model (best for code-switching), no `--language` lock so per-segment detection works |
| **Skill stage 3 — structure** | Turn transcript into schema-conformant content: vocab, grammar, notes; fill kanji/kana/romaji/ES/example | Claude reasoning against a rigid prompt + JSON Schema |
| **Skill stage 4 — emit + validate** | Write `content/classes/<id>.json`, update `content/index.json`, validate against schema before commit | Node/CLI script running `ajv` against the schema; refuse to write on validation failure |
| **ContentStore (app)** | Load index + class files, merge into flat lookup tables (`vocabById`, `grammarById`), expose read-only selectors | React context / Zustand store, loaded once at boot from `fetch()` |
| **SRS scheduler (app)** | Compute next due date/interval per item from a rating; own the FSRS `Card` state | Thin wrapper over `ts-fsrs` (`fsrs()`, `next()`, `Rating`) |
| **ProgressStore (app)** | Persist per-item SRS cards, learned-kanji set, streak, points; export/import | IndexedDB via `idb`, one store per concern |
| **KanjiProgress / display-mode** | Decide how each token renders (romaji-over / progressive furigana / kanji-only) based on learned set + selected mode | Pure function over `learnedKanji` set + token metadata + mode |
| **Exercise engine** | Generate the 5 exercise types from content + pick items by review scope | Pure generators: input = item list, output = exercise instances |
| **UI views** | Render, capture answers, dispatch ratings | React Router routes |

## Recommended Project Structure

```
jp-learner/                       # monorepo root
├── content/                      # THE CONTRACT — versioned JSON (git = backup)
│   ├── schema/
│   │   └── content.schema.json   # JSON Schema; single source of truth for the contract
│   ├── index.json                # manifest: list of classes + content version + checksums
│   └── classes/
│       ├── 2026-07-01.json       # one file per class (id = date or slug)
│       └── 2026-07-08.json
│
├── skill/                        # PRODUCER — Claude Code skill (not shipped to Pages)
│   ├── SKILL.md                  # skill definition / instructions
│   ├── prompts/structure.md      # the rigid structuring prompt (references the schema)
│   ├── transcribe.sh             # wraps local Whisper (whisper.cpp / faster-whisper)
│   └── validate.mjs              # ajv validation against content.schema.json before write
│
├── audio-src/                    # raw class audio — GITIGNORED (large, private)
│
├── app/                          # CONSUMER — the PWA (Vite root, or root if single-package)
│   ├── src/
│   │   ├── content/              # ContentStore: fetch + merge + selectors (read-only)
│   │   │   ├── loader.ts         # fetch index.json + class files
│   │   │   ├── store.ts          # in-memory lookup tables
│   │   │   └── types.ts          # TS types GENERATED from content.schema.json
│   │   ├── progress/             # ProgressStore: IndexedDB (mutable)
│   │   │   ├── db.ts             # idb schema + migrations
│   │   │   ├── srs.ts            # ts-fsrs wrapper (card state per item)
│   │   │   ├── kanji.ts          # learned-kanji set
│   │   │   ├── gamification.ts   # streak + points
│   │   │   └── backup.ts         # export / import JSON
│   │   ├── exercises/            # 5 exercise generators (pure)
│   │   ├── display/              # 3 Japanese display modes + <ruby> furigana logic
│   │   ├── tts/                  # Web Speech API wrapper (ja-JP voice)
│   │   ├── views/                # route components (Learn, Review, Glossary, Progress)
│   │   ├── app.tsx / router.tsx
│   │   └── main.tsx
│   ├── public/
│   │   ├── manifest.webmanifest  # PWA install manifest
│   │   └── content -> ../content # served copy of content (or copied at build time)
│   ├── vite.config.ts            # vite-plugin-pwa here
│   └── index.html
│
└── .github/workflows/deploy.yml  # build app + copy content + copy index.html→404.html
```

### Structure Rationale

- **`content/` at repo root, outside `app/`:** it is a shared artifact, produced by the skill and consumed by the app. Keeping it separate makes the producer/consumer boundary physical, not just conceptual. At build the app either symlinks or copies it into `public/content/` so Pages serves it statically.
- **Types generated from the schema (`content.schema.json` → `types.ts`):** the schema is the single source of truth. Generating TS types (e.g. `json-schema-to-typescript`) guarantees the app's types can never silently drift from what the skill emits. This is the mechanism that makes the contract *enforced*, not just documented.
- **`progress/` split by concern (srs / kanji / gamification / backup):** these have different lifecycles and different IndexedDB stores; keeping them separate keeps migrations and export/import simple.
- **`exercises/` and `display/` as pure functions:** they take content + progress as input and return renderable data. No I/O, trivially testable, and reusable across the 5 exercise types.
- **`skill/` never deploys:** GitHub Pages only serves `app/dist`. The skill and `audio-src/` stay local.

## The Content Schema — the skill↔app contract (MOST IMPORTANT OUTPUT)

Design goals: **rigid** (skill emits identical shape every time), **stable IDs** (progress references survive re-processing), **display-mode aware** (tokens carry enough to render all 3 modes), **flat-lookup friendly** (app merges files into `Map`s by ID).

### Design decisions baked into the schema

1. **Every content item has a stable, deterministic `id`.** Recommended: `<classId>:<type>:<slug>` where `slug` is derived from the Japanese kana (e.g. `2026-07-01:vocab:tabemasu`). Deterministic IDs mean re-running the skill on the same class produces the same IDs — the user's SRS progress stays attached. This is the linchpin of the content/progress split.
2. **Content version + per-class `contentHash`** in `index.json`, so the app can detect a class was re-processed and invalidate its cached copy (and optionally warn if an item disappeared).
3. **Vocabulary carries a `tokens[]` breakdown** (kanji vs kana runs) so display mode B (progressive furigana per-kanji) is renderable without re-parsing Japanese in the app. Each token that is a kanji run carries its reading — this is what feeds `<ruby>`.
4. **`kanji[]` list per class** enumerates the individual kanji introduced, so the "learned kanji" set has canonical entries to mark.
5. **ES = Spanish** everywhere (`es` field). Romaji stored, not computed, because the skill (with Claude) is more reliable than a client-side kana→romaji library for edge cases.

### `content.schema.json` (proposed, JSON-Schema-shaped, abbreviated)

```jsonc
// content/index.json
{
  "contentVersion": 1,              // bump on breaking schema changes
  "generatedAt": "2026-07-06T10:00:00Z",
  "classes": [
    {
      "id": "2026-07-01",           // classId; date or slug
      "date": "2026-07-01",
      "label": "Clase 3 — です/verbos -masu",
      "file": "classes/2026-07-01.json",
      "contentHash": "sha256-abc…", // changes if the class is re-processed
      "counts": { "vocab": 12, "grammar": 2, "kanji": 3, "notes": 4 }
    }
  ]
}
```

```jsonc
// content/classes/2026-07-01.json
{
  "schemaVersion": 1,
  "classId": "2026-07-01",
  "date": "2026-07-01",
  "label": "Clase 3 — です/verbos -masu",

  "vocab": [
    {
      "id": "2026-07-01:vocab:tabemasu",   // STABLE id (progress key)
      "type": "vocab",
      "kanji": "食べます",                   // full written form (may equal kana)
      "kana": "たべます",                    // full reading
      "romaji": "tabemasu",
      "es": "comer (cortés)",               // Spanish translation
      "pos": "verb",                        // optional part of speech
      "tokens": [                            // for display modes A/B/C + furigana
        { "surface": "食", "reading": "た", "isKanji": true,  "kanji": ["食"] },
        { "surface": "べます", "reading": "べます", "isKanji": false }
      ],
      "example": {
        "kanji": "毎日ご飯を食べます。",
        "kana": "まいにちごはんをたべます。",
        "romaji": "Mainichi gohan o tabemasu.",
        "es": "Como arroz todos los días."
      },
      "tags": ["2026-07-01", "verbo", "-masu"]
    }
  ],

  "grammar": [
    {
      "id": "2026-07-01:grammar:masu-form",
      "type": "grammar",
      "pattern": "Verbo + ます",
      "es": "Forma cortés del presente/futuro.",   // explanation in Spanish
      "examples": [
        { "kanji": "行きます", "kana": "いきます", "romaji": "ikimasu", "es": "voy / iré" }
      ],
      "tags": ["2026-07-01", "gramática"]
    }
  ],

  "kanji": [
    {
      "id": "2026-07-01:kanji:食",
      "type": "kanji",
      "char": "食",
      "readings": { "on": ["ショク"], "kun": ["た.べる"] },
      "es": "comer / comida",
      "seenIn": ["2026-07-01:vocab:tabemasu"]   // back-refs into vocab
    }
  ],

  "notes": [
    {
      "id": "2026-07-01:note:1",
      "type": "note",
      "es": "El profesor recalcó que ご es prefijo honorífico en ご飯.",
      "tags": ["2026-07-01"]
    }
  ]
}
```

**Contract guarantees the skill MUST uphold (enforced by `validate.mjs` before commit):**
- Every array item has `id` and `type`; `id` matches `^<classId>:<type>:.+$`.
- `vocab.tokens` concatenated `surface` equals `vocab.kanji`, and concatenated `reading` equals `vocab.kana` (renderability invariant for display modes).
- `es` present on every item (Spanish is the user's L1 and the anchor).
- All `kanji[].char` are single characters; `seenIn`/`seenIn`-style refs point to existing IDs.

## Progress state (mutable, IndexedDB) — mirrors the ts-fsrs `Card`

Progress references content by `id` only. The SRS card shape below is exactly the `ts-fsrs` `Card` (verified via Context7) plus the item reference — so `scheduler.next(card, now, rating)` can be called directly.

```typescript
// IndexedDB store: "srs" (keyPath: itemId)
interface SrsRecord {
  itemId: string;          // == content item id, e.g. "2026-07-01:vocab:tabemasu"
  itemType: 'vocab' | 'grammar' | 'kanji';
  card: {                  // ts-fsrs Card (createEmptyCard() shape)
    due: string;           // ISO — next review
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    learning_steps: number;
    state: 0 | 1 | 2 | 3;  // New | Learning | Review | Relearning
    last_review?: string;  // ISO
  };
}

// IndexedDB store: "learnedKanji" (keyPath: char)
interface LearnedKanji { char: string; learnedAt: string; }

// IndexedDB store: "meta" (single record)
interface ProgressMeta {
  streakCount: number;
  lastActiveDay: string;   // YYYY-MM-DD, for streak logic
  points: number;
  displayMode: 'A' | 'B' | 'C';
  appVersion: number;      // for progress-store migrations
}

// Export/import backup = JSON dump of {srs, learnedKanji, meta} + a schemaRef
```

**Why this split works:** deleting/re-fetching all content and rebuilding the in-memory ContentStore has zero effect on IndexedDB. If a re-processed class drops an item, its orphaned `SrsRecord` is simply skipped (lookup by `itemId` misses). Export/import moves progress between devices without touching content (which travels via git/Pages).

## Architectural Patterns

### Pattern 1: Producer/Consumer over a versioned file contract

**What:** The skill writes JSON files; the app reads them. The only shared knowledge is `content.schema.json`.
**When to use:** Whenever an offline AI/heavy step must not run inside the shipped app (no API keys in-app, deterministic output required) — exactly this project's constraint.
**Trade-offs:** (+) No backend, git = backup/history, app stays trivially static. (+) Producer can be rerun/versioned independently. (−) No live updates — user must re-run skill + redeploy. Acceptable: content only changes per class.

### Pattern 2: Immutable content by stable ID / mutable progress by reference

**What:** Content items are immutable and addressed by deterministic IDs; progress stores only IDs + SRS state.
**When to use:** Any app where user state must survive content edits/reprocessing.
**Trade-offs:** (+) Reprocessing a class never corrupts progress. (+) Independent backup strategies (git vs export JSON). (−) Requires disciplined, deterministic ID generation in the skill (the validate step enforces it).

**Example:**
```typescript
const card = srs.get(itemId)?.card ?? createEmptyCard();
const { card: next } = scheduler.next(card, new Date(), Rating.Good);
await srsStore.put({ itemId, itemType, card: serialize(next) });
```

### Pattern 3: Pure render/derivation functions for display + exercises

**What:** Display mode and exercise generation are pure functions of (content item, progress, mode). No component holds Japanese-parsing logic.
**When to use:** Multiple exercise types + multiple display modes over the same data.
**Trade-offs:** (+) Testable, reusable, mode B "progressive kanji" is just a filter over `learnedKanji`. (−) Requires the schema to pre-compute `tokens` (done above).

**Example (display mode B — furigana only for not-yet-learned kanji):**
```typescript
function renderTokens(tokens: Token[], mode: Mode, learned: Set<string>) {
  return tokens.map(t => {
    if (!t.isKanji) return { text: t.surface };
    const known = t.kanji!.every(k => learned.has(k));
    if (mode === 'C') return { text: t.surface };               // kanji only
    if (mode === 'A') return { text: t.surface, over: t.reading };// romaji/kana over
    return known ? { text: t.surface }                          // B: hide furigana once learned
                 : { ruby: t.surface, rt: t.reading };          // B: show furigana (kana)
  });
}
```

## Data Flow

### Content in (build/producer → app)

```
class audio ──▶ Whisper local ──▶ transcript ──▶ Claude (schema prompt)
                                                        │
                                                        ▼
                                        validate.mjs (ajv vs schema)
                                                        │  PASS
                                                        ▼
                            content/classes/*.json + index.json  ──git──▶ deploy
                                                        │
                     app boot: fetch(index.json) ──▶ fetch(each class file)
                                                        │
                            ContentStore merges ──▶ vocabById / grammarById / kanjiById (in memory)
```

### Progress out (runtime, stays on device)

```
User answers exercise
      ↓
Exercise engine → Rating (Again/Hard/Good/Easy)
      ↓
SRS wrapper: scheduler.next(card, now, rating)
      ↓
ProgressStore.put(SrsRecord)  →  IndexedDB
      ↓ (also)
Gamification: update streak/points ; Kanji "mark learned" → learnedKanji store
      ↓
Export backup → single JSON file  (import reverses this)
```

### Review scope selection (Today / Week / Total)

```
scope + now  →  filter SrsRecords where card.due <= boundary(scope)
             →  join with ContentStore by itemId  →  session item list
             →  exercise engine builds the session
```

### State management (app)

```
ContentStore (read-only, loaded once)  ─┐
ProgressStore (IndexedDB-backed)        ─┼─▶ selectors ─▶ React views
Meta (streak/points/mode)               ─┘        ▲
                        user action ────────────────┘ (dispatch → update store → persist)
```

Recommend Zustand (or React context + reducer) — light, no backend, fits a single-phase build. Content in a plain in-memory store; progress writes go through the IndexedDB wrapper so persistence is centralized.

## Suggested Build Order (single implementation phase)

Because this ships in one phase, order by dependency so nothing is built against a moving target. The schema comes first — it is the contract everything else assumes.

```
1. content.schema.json + example class JSON (hand-authored)   ← unblocks EVERYTHING
   └─ generate types.ts from it
2. App shell: Vite + React + TS + Tailwind + Router + vite-plugin-pwa + GH Pages 404 fallback
3. ContentStore: fetch index + classes, merge into lookup tables (uses #1 example data)
4. ProgressStore: IndexedDB (idb) stores + ts-fsrs SRS wrapper + export/import
5. Display layer: 3 modes + <ruby> furigana (pure, uses tokens from #1)
6. Exercise engine: 5 types + review-scope selector (uses #3 + #4)
7. Glossary + Progress/gamification views + TTS
8. Skill: transcribe.sh (Whisper) + structuring prompt + validate.mjs  ← can run in parallel after #1
9. Deploy workflow (build app, copy content, copy index.html→404.html)
```

**Key dependency notes:**
- **#1 blocks all app work.** Freeze the schema (even v1-minimal) before building consumers. Hand-author one realistic class JSON so #3–#7 have data before the skill exists.
- **#8 (skill) only depends on #1**, not on the app. It can be built alongside/after the schema. The app must never wait on the skill — that's the whole point of the file contract.
- **Progress migrations (#4)** need an `appVersion` from day one, or later IndexedDB schema changes break existing users.
- **404 fallback + base path (#2, #9)** are easy to forget and break routing on Pages silently — see anti-patterns.

## Scaling Considerations

Personal, single-user, single-device-primary app. "Scale" = number of classes/items, not users.

| Scale | Architecture adjustments |
|-------|--------------------------|
| ~1–30 classes (year 1) | Load all class JSON at boot; merge into in-memory maps. Trivial. |
| ~100+ classes | Lazy-load class files on demand via `index.json`; keep only recent + due items hot. `contentHash` lets SW cache per-file. |
| Many devices | Still no backend — export/import JSON is the sync story (v2 could add a git-gist or file-based sync). |

### Scaling priorities
1. **First "bottleneck": boot fetch of many class files.** Fix by lazy-loading from `index.json` rather than fetching all upfront.
2. **Second: IndexedDB size / migration.** Keep progress records tiny (IDs + FSRS card only, no content) — this is already handled by the split.

## Anti-Patterns

### Anti-Pattern 1: Embedding content inside progress records

**What people do:** Store the word text/translation alongside the SRS card in IndexedDB "for convenience."
**Why it's wrong:** Content and progress drift; re-processing a class or fixing a typo can't propagate, and duplicated data goes stale. Breaks the whole producer/consumer model.
**Do this instead:** Store only `itemId` in progress; join with ContentStore at read time.

### Anti-Pattern 2: Non-deterministic IDs from the skill

**What people do:** Let the skill assign random UUIDs or array-index IDs to items.
**Why it's wrong:** Re-running the skill on a corrected audio produces new IDs → all SRS history for that class orphaned.
**Do this instead:** Deterministic `<classId>:<type>:<kana-slug>` IDs; enforce uniqueness + format in `validate.mjs`.

### Anti-Pattern 3: BrowserRouter on GitHub Pages without a 404 fallback / wrong base

**What people do:** Deploy a `BrowserRouter` SPA to `user.github.io/jp-learner/` and hit 404 on deep links/refresh.
**Why it's wrong:** Pages serves per-path files; unknown paths 404 instead of booting the SPA.
**Do this instead:** Either `HashRouter` (simplest, zero server config — recommended here) OR `BrowserRouter` with `basename=/jp-learner` + copy `dist/index.html` → `dist/404.html` in the deploy step. Also set Vite `base: '/jp-learner/'`. Given "minimum friction," **HashRouter is the pragmatic default.**

### Anti-Pattern 4: Trusting Whisper's single-language auto-detect for code-switched audio

**What people do:** Run Whisper with one `--language` flag on ES/JA mixed audio.
**Why it's wrong:** Locking one language mangles the other; the class mixes Spanish explanation with Japanese examples.
**Do this instead:** Use `large-v3` (best multilingual/code-switching quality) and let per-segment detection run; then let Claude (stage 3) reconcile/segment ES vs JA when structuring. The skill's structuring step is where accuracy is recovered, not Whisper alone.

### Anti-Pattern 5: Caching content forever in the service worker

**What people do:** SW `CacheFirst` the content JSON with no invalidation.
**Why it's wrong:** After re-processing a class and redeploying, the app keeps serving stale content.
**Do this instead:** Cache app shell precache-style (vite-plugin-pwa handles hashing) but treat `index.json` as `NetworkFirst`/`StaleWhileRevalidate`, and key class-file caches by `contentHash` so a changed class busts its own entry.

## Integration Points

### External Services / tools

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Whisper (local) | CLI in skill (`whisper.cpp`/`faster-whisper`), file in → transcript out | `large-v3` for ES/JA code-switching; runs on user's Mac; no key |
| Claude Code skill | Manual invocation; reads transcript, writes JSON | Not part of app runtime; output validated before commit |
| Web Speech API (TTS) | In-app, `speechSynthesis` with `lang: 'ja-JP'` | Voice availability varies by browser/OS — feature-detect + graceful fallback |
| GitHub Pages | Static host for `app/dist` + `content/` | Set Vite `base`; HashRouter or 404 fallback; no server-side routing |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| skill ↔ app | Versioned JSON files (git) | The contract. `content.schema.json` + generated TS types enforce it |
| ContentStore ↔ ProgressStore | Reference by `itemId` only | Never merge/embed; join at read time |
| Exercise/Display ↔ stores | Pure functions consume store data | No I/O in generators; testable in isolation |
| App ↔ IndexedDB | Single `progress/db.ts` wrapper | Centralized migrations via `appVersion` |

## Sources

- ts-fsrs API (Card fields, `fsrs()`, `next()`, `Rating`, `createEmptyCard`) — Context7 `/open-spaced-repetition/ts-fsrs` (HIGH)
- FSRS vs SM-2 rationale — https://github.com/open-spaced-repetition/ts-fsrs , https://flica.app/article/fsrs-vs-sm2 (MEDIUM)
- GitHub Pages SPA routing / 404 fallback — https://github.com/orgs/community/discussions/64096 , https://dev.to/lico/handling-404-error-in-spa-deployed-on-github-pages-246p (MEDIUM)
- Whisper code-switching / large-v3 for multilingual — https://github.com/SYSTRAN/faster-whisper , https://github.com/openai/whisper/discussions/49 (MEDIUM)
- Content schema, storage split, component boundaries, build order — architectural synthesis for this project (MEDIUM; design proposal, not external fact)

---
*Architecture research for: offline-first language-learning PWA + Claude content pipeline*
*Researched: 2026-07-06*

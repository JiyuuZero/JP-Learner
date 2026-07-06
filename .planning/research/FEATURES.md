# Feature Research

**Domain:** Personal Japanese self-study PWA (SRS + active recall over own class content)
**Researched:** 2026-07-06
**Confidence:** HIGH (SRS algorithm, exercise pedagogy, TTS constraints verified against primary sources; MEDIUM on furigana-alignment implementation details)

> **Reading note:** v1 scope is already decided (5 exercise types, SRS engine, review-scope selector, 3 display modes, TTS, light gamification). This document does **not** re-litigate scope. It (a) categorizes each decided feature as table-stakes vs differentiator so requirements can be prioritized, (b) specifies *how each should work* to make self-study of class material actually effective, and (c) flags anti-features to deliberately keep out of v1. The single-phase, token-budgeted build constraint (Fable 5) is respected: recommendations favor libraries and simple logic over hand-rolled complexity.

---

## The one thing that must work

Per PROJECT.md Core Value: *"convert each class into useful practice material."* Every table-stakes call below is judged against a single test — **does self-study of the user's own class content fail without it?** Big-app features (leaderboards, social, lesson trees, hearts) are irrelevant here; they are noise for a single user drilling a fixed, personally-curated corpus.

---

## Feature Landscape

### Table Stakes (Self-study fails without these)

| Feature | Why Essential (for *this* user) | Complexity | Notes |
|---------|--------------------------------|------------|-------|
| **FSRS scheduling engine (per-item state)** | Small daily corpus + "learn kanji very slowly" means efficiency and correct forgetting-curve timing matter more than in a mass app. FSRS needs ~20-30% fewer reviews than SM-2 for the same retention. | MEDIUM | Use `ts-fsrs` (see SRS section). Zero-dependency, works with default params — no training needed. Do **not** hand-roll. |
| **Active-recall flashcards (produce-before-reveal)** | Recognition ("pick from a list") is proven weak for retention; the answer must be pulled from memory before reveal. This is the pedagogical spine of the app. | LOW | Front = prompt, tap to reveal, then self-grade Again/Hard/Good/Easy. The grade drives FSRS. |
| **Fill-in / typing exercise** | Typed production is the strongest retrieval mode and the reason to prefer this over pure tap-apps. | MEDIUM | Answer-checking needs tolerance (see Exercise Mechanics). Highest learning value of the 5 types. |
| **Review-scope selector (Today / This week / All-time)** | User attends classes that "go fast"; they need to drill *this week's* class, not the whole backlog, on demand. Directly serves Core Value. | LOW | A filter over the due-queue by content `class/date` tag, layered on top of FSRS due dates. See Dependency Notes — scope and SRS-due interact. |
| **Content tagged by class/date, browsable** | The corpus *is* the class history. Without per-class tagging, the review-scope selector and "study last class" are impossible. | LOW | Comes from the skill's JSON schema. App must index by tag on load. |
| **Furigana display (romaji + kana over kanji)** | Basic-level learner cannot read raw kanji yet; without readings the content is unusable. Mode A is the safe default. | MEDIUM | Use HTML `<ruby>`/`<rt>`. The skill must supply per-word readings; do not compute alignment in-app (see Progressive-Kanji section). |
| **Japanese TTS pronunciation** | Pronunciation cannot be self-checked from text alone; a basic learner needs to hear it. Works offline with installed voices. | LOW | Web Speech API `speechSynthesis`. Must fire inside a tap handler (iOS requirement). Pick a `ja-JP` voice; degrade gracefully if absent. |
| **Local persistence + JSON export/import** | No backend by design. Progress *must* survive reinstalls/device loss. Losing SRS state = losing all study history. | MEDIUM | IndexedDB for progress; manual export/import as the only "sync". Content JSON lives in git. |
| **Offline operation (installable PWA)** | Studying between classes, on mobile, without guaranteed connectivity. | MEDIUM | Service worker caches app shell + content JSON. TTS voices are OS-local. |
| **Daily streak** | The *only* gamification element with real behavioral evidence for a solo learner: consistency (10-15 min/day) beats long irregular sessions. Streak nudges the habit. | LOW | Count consecutive days with ≥1 review. Store last-review date. |

### Differentiators (Boost learning; align with Core Value)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Progressive-kanji display (Mode B)** | The signature feature. Learner marks kanji as "learned" and text gradually swaps kana → kanji-with-kana-furigana. Directly serves the stated "learn kanji very slowly, on purpose" goal — no other app gives this fine control tied to a personal corpus. | HIGH | Requires a per-user "learned kanji" set + per-word reading data from the skill. See dedicated section — this is the trickiest feature and where research effort should concentrate. |
| **Sentence-building with word bank** | Reinforces word order/particles using *this class's* sentences. Cheaper cognitively than typing but useful for grammar-shape practice. | MEDIUM | Present JA sentence with gaps + JA word chips (including 1-2 distractors). Note: this is recognition, not production — keep it as *reinforcement*, not the primary drill. |
| **Multiple choice** | Low-friction warm-up / re-entry for newly-added items before they graduate to typing. Good for the first exposure to a brand-new word. | LOW | Generate distractors from same-class vocab (plausible, not random). Weakest retention mode — position it as scaffolding, not the goal. |
| **Matching (ES ↔ JA pairs)** | Fast, satisfying batch review of a class's vocab set; good session opener. | LOW | Grid of ES cards + JA cards; tap-to-pair. Recognition-level; keep sessions short. |
| **Sentence-context cards** | Research is clear: sentence cards ("私は寿司を食べます") beat isolated-word cards for retention. The skill already produces example sentences — surface them on the flashcard back. | LOW | Show example sentence + TTS on card reveal. Nearly free given the data model. |
| **Grammar-point review cards** | Class content includes grammar patterns; letting them enter the same SRS/review flow (pattern → recall explanation/example) keeps grammar from being forgotten between classes. | MEDIUM | Model grammar as its own card type with its own SRS state; reuse the flashcard shell. |
| **"Study last class" one-tap shortcut** | Immediately after a class, the highest-value action is drilling exactly what was just taught. A shortcut removes all friction. | LOW | Preset of the review-scope selector to the most recent `class/date` tag. |
| **Per-item / per-class progress %** | Motivational and diagnostic: which class material is weak. More useful for a solo learner than a global points counter. | LOW | Derive from FSRS state (e.g., % of items in `Review` state with stability above threshold). |

### Anti-Features (Deliberately NOT built for v1)

| Feature | Why It Seems Appealing | Why Problematic Here | Do Instead |
|---------|------------------------|----------------------|------------|
| **Custom / hand-tuned SRS math or FSRS parameter training** | "Optimize scheduling for me." | Training needs ~1,000+ reviews to beat defaults; a single beginner won't have that data for a long time. Hand-rolling SM-2 is a known bug farm. Wastes the single-phase token budget. | Ship `ts-fsrs` with default parameters. Revisit training only if the user accumulates thousands of reviews (v2). |
| **In-app audio processing / Whisper / transcription** | "One app does everything." | Explicitly out of scope in PROJECT.md — belongs in the skill. Would require API keys/heavy compute the PWA can't carry. | Keep the pipeline: skill transcribes → writes JSON → app consumes. |
| **Auto-generating content / AI hints beyond class material** | "More practice items." | Violates Core Value ("app only expands with what was taught"). Adds hallucination risk and off-syllabus noise. | Corpus grows only via the skill from real classes. Generate distractors *from existing class vocab only*. |
| **Leaderboards, friends, social, XP levels, hearts/lives** | "Duolingo does it." | Single-user app. Social/competition mechanics are meaningless with n=1; hearts/lives actively punish practice (documented gamification-misuse harm). | Keep gamification to streak + progress % + a simple points counter. Nothing that gates or punishes study. |
| **Cloud sync / accounts / backend** | "Use on multiple devices." | Explicitly out of scope; adds auth, hosting, API-key surface the user rejected. | Manual JSON export/import. Content already syncs via git. |
| **Handwriting / stroke-order kanji input recognition** | "Real kanji practice." | High complexity (canvas + recognition model), out of scope for a review app, and the user learns kanji *reading* slowly, not writing, per stated goal. | Rely on typing (kana/romaji via OS IME) + progressive-kanji reading. |
| **In-app furigana alignment computation (kanji↔reading per-character)** | "Auto-furigana any text." | Alignment of readings to individual kanji in compound/okurigana words (乗り込む) is genuinely hard and error-prone. Doing it in-app burns budget and ships wrong readings. | The **skill** emits per-word `{surface, reading}` (and ideally per-kanji reading) in the JSON. App just renders `<ruby>`. |
| **Speech recognition / pronunciation scoring (STT)** | "Check my pronunciation." | Web Speech *recognition* support is inconsistent (esp. iOS) and scoring quality is poor. Only synthesis (TTS) is reliably offline. | TTS-only. User self-assesses against playback. |
| **Configurable multi-note / cloze-heavy cards, deck management UI** | "Power-user flexibility." | Adds config surface for a solo, fixed-corpus app. Cards come from a rigid skill schema; one fact per card is a *rule*, not an option. | Fixed card templates per content type. No deck-builder. |
| **Notifications / reminders infra** | "Keep the streak." | PWA push is fiddly cross-platform (iOS especially) and is scope creep for v1. | Streak visible on open; rely on habit + the streak counter. Consider later. |

---

## SRS: Algorithm Choice & Scheduling Specifics (CONCRETE)

**Recommendation: FSRS via the `ts-fsrs` library (v5.4.1), with default parameters. Do not use SM-2. Do not hand-roll.** — HIGH confidence.

### Why FSRS over SM-2

- FSRS is a memory model that predicts recall probability and targets a **desired retention** (e.g. 90%); SM-2 is a fixed ease-factor rule from 1987. Benchmarks: FSRS ≈ ±5% retention accuracy vs SM-2 ≈ ±16%, and ~20-30% fewer reviews for equal retention. Anki made FSRS its default in v23.10 (Nov 2023) — it is now the de-facto standard.
- The "small deck" caveat (FSRS ≈ SM-2 below ~1,000 reviews) argues only against *training custom parameters*, **not** against using FSRS itself. Default-parameter FSRS is strictly a better starting scheduler than SM-2 and needs no data. So: use FSRS defaults now, skip training.

### Why `ts-fsrs`

- Official Open Spaced Repetition TypeScript implementation. **Zero runtime dependencies**, ships ESM/CJS/UMD, runs in-browser — fits the no-backend/offline PWA perfectly. Ships an official Vite example (matches the chosen stack).
- Works out of the box: `fsrs()` with no config uses sane defaults; the optional `@open-spaced-repetition/binding` trainer is **not** needed for v1.

### Minimal API (verified against source)

```ts
import { createEmptyCard, fsrs, Rating, State } from 'ts-fsrs'

const scheduler = fsrs()                       // default params, ~90% target retention
const card = createEmptyCard()                 // new item
const now = new Date()
const { card: updated /*, log */ } = scheduler.next(card, now, Rating.Good)
// updated.due -> next review date; persist `updated` to IndexedDB
```

### Ratings (map exercise outcomes → FSRS ratings)

`Rating` enum: `Again = 1`, `Hard = 2`, `Good = 3`, `Easy = 4`.

- **Flashcard (self-grade):** expose all four buttons directly.
- **Typing / fill-in:** wrong → `Again`; correct → `Good`; (optional) correct-with-typo/slow → `Hard`; instantly correct → `Easy`.
- **Multiple choice / matching / sentence-building:** binary → wrong = `Again`, right = `Good`. (These are weaker signals; that's fine — treat as coarse.)

### Per-item state to persist (exact `Card` fields from ts-fsrs source)

Store one record per reviewable item, keyed by content id:

| Field | Type | Meaning |
|-------|------|---------|
| `due` | Date | Next review date — **drives the queue** |
| `stability` | number | Memory stability |
| `difficulty` | number | Item difficulty |
| `elapsed_days` | number | Days since last review |
| `scheduled_days` | number | Days until next review |
| `learning_steps` | number | Current (re)learning step |
| `reps` | number | Total reviews |
| `lapses` | number | Times forgotten |
| `state` | State enum | `New=0, Learning=1, Review=2, Relearning=3` |
| `last_review?` | Date | Last review date |

Serialize `Date` → ISO string for IndexedDB; rehydrate on load. This whole record is what export/import must round-trip.

### Session composition rules (for effective self-study)

- **Cap new items per day** (~10). Beginners who front-load new cards get buried in reviews later.
- **Due queue = FSRS-due items filtered by the review-scope tag.** Reviews always come before new items within a session.
- **One fact per card** — enforce in the data model (a kanji with 3 readings → 3 cards). This is a rule, not a setting.

---

## Progressive-Kanji Display Model (Mode B) — the hard part

The signature differentiator. Confidence MEDIUM on implementation; the *approach* below removes the risk.

### The three modes
- **Mode A (default, safest):** full kanji+kana with **romaji** furigana on top. Beginner-readable.
- **Mode B (progressive):** text renders in **kana** by default; each kanji the user has marked "learned" is swapped to **kanji with kana-furigana**. So the screen gradually shifts kana → kanji as the learner grows.
- **Mode C:** kanji only, no readings. Expert mode.

### How Mode B substitution should work

1. **Source of truth is per-word reading data from the skill, not runtime parsing.** The single hardest bug in Japanese furigana is aligning a reading to individual kanji inside okurigana/compound words (e.g. 乗り込む — reading covers 乗 and 込 but not り/む). **Do not solve this in the app.** Require the skill's JSON to emit, per word:
   ```json
   { "surface": "乗り込む", "reading": "のりこむ",
     "segments": [ {"text":"乗","reading":"の"}, {"text":"り"},
                   {"text":"込","reading":"こ"}, {"text":"む"} ] }
   ```
   With per-kanji segments provided, the app's job is pure rendering.
2. **"Learned kanji" is a per-user set** (store the kanji characters the user has marked learned in IndexedDB). It is *global to the user*, independent of any single word.
3. **Render logic per segment (Mode B):**
   - Segment is kana → render as-is.
   - Segment is a kanji **in** the learned set → render `<ruby>漢<rt>かな</rt></ruby>` (kanji + kana furigana).
   - Segment is a kanji **not** learned → render the reading as plain kana (no kanji shown).
   This yields text that is mostly kana with learned kanji surfacing progressively — exactly the stated goal.
4. **Marking a kanji learned:** provide a clear affordance (e.g. tap a kanji, or a per-kanji toggle in vocab detail). Marking is a deliberate, low-frequency action — matches "learns kanji very slowly, on purpose."
5. **Modes A and C are trivial given the same segment data:** A = always show kanji, `<rt>` = romaji; C = always show kanji, no `<rt>`.

### Dependency: this feature is only as good as the skill's schema
If the skill cannot reliably emit per-kanji segments, fall back to **word-level ruby** (`<ruby>乗り込む<rt>のりこむ</rt></ruby>`) — correct but coarser (whole-word readings, can't half-substitute a word). Flag this to the skill/schema design as a requirement. This coupling is the main project risk for Mode B.

---

## Exercise Mechanics (how each of the 5 should work)

Ordered by retention strength (strongest first). Design intent: **typing and flashcards are the engine; the other three are scaffolding/variety.**

1. **Flashcards + SRS (produce → reveal → self-grade).** Prompt shown (ES→JA or JA→ES, per direction setting). User recalls mentally, taps reveal, then grades Again/Hard/Good/Easy → FSRS. Show example sentence + TTS on reveal. *This is the core loop.*
2. **Fill-in / typing.** Show a sentence/prompt with a gap; user types the answer (kana via OS IME, or romaji). **Answer checking must tolerate valid variants:** normalize input, accept romaji variants (shi/si, tsu/tu), accept both `n`/`nn` for ん, and ignore trailing punctuation/whitespace. Trim to the target token. Wrong→`Again`, right→`Good`. Give immediate correct-answer feedback.
3. **Sentence-building (word bank).** JA sentence with gap(s) + JA word chips (correct words + 1-2 same-class distractors). Tap chips into slots. Reinforces particle/word-order shape. *Recognition-level — good for grammar shape, not a substitute for typing.* Right→`Good`, wrong→`Again`.
4. **Multiple choice.** Prompt + 4 options, **distractors drawn from same-class vocab** (plausible, never random). Best used as first-exposure warm-up for brand-new items before they graduate to typing.
5. **Matching (ES↔JA).** Small grid (e.g. 5 pairs), tap-to-connect, clears as matched. Fast batch review / session opener. Keep sets small.

**Exercise↔SRS integration:** every exercise result feeds the *same* per-item FSRS state (not separate schedules per exercise type). An item is "due" once; the app may vary *which* exercise type is used to review it (e.g. new items → MC/matching, mature items → typing). This keeps scheduling coherent.

---

## TTS Specifics (Web Speech API)

- Use `window.speechSynthesis` + `SpeechSynthesisUtterance`; set `utterance.lang = 'ja-JP'` and pick a Japanese voice from `getVoices()`.
- **iOS gotcha (verified):** `speak()` must be called inside a user-gesture handler (tap), or WebKit silently drops it. Never auto-play TTS on card load — bind it to a "listen" button.
- `getVoices()` populates asynchronously — listen for `voiceschanged`.
- Voice quality varies by device (e.g. "Kyoko Enhanced" on Apple, Google TTS on Android, both offline once installed). **Degrade gracefully:** if no `ja-JP` voice exists, hide/disable the button rather than error.
- Offline: synthesis works with locally installed voices — consistent with the offline-PWA requirement.

---

## Feature Dependencies

```
Skill JSON schema (per-word + per-kanji reading segments)
    └──requires──> Furigana rendering (Mode A/C)
    └──requires──> Progressive-kanji Mode B  <── requires ── "Learned kanji" set (IndexedDB)

ts-fsrs engine (per-item Card state, IndexedDB)
    └──drives──> Due queue
                    └──filtered by──> Review-scope selector (Today/Week/All)
                                          └──requires──> content class/date tags
    └──feeds from──> All 5 exercise types (shared per-item state)

IndexedDB progress store
    └──requires──> JSON export/import (only backup/"sync")
    └──requires──> Daily streak, progress %, points

Service worker (offline shell + content cache) ──enables──> PWA install / offline study

TTS (Web Speech) ──enhances──> Flashcards, fill-in (pronunciation on reveal)
```

### Dependency Notes

- **Mode B requires the skill's per-kanji segment data.** Without it, Mode B degrades to word-level ruby (no partial substitution). This is the top implementation risk — treat the schema field as a hard requirement on the skill.
- **Review-scope selector requires class/date tags** on every content item and layers *on top of* FSRS due dates (scope filters the due set; it does not replace SRS timing).
- **Export/import must round-trip the full FSRS `Card` record** (all fields above) or study history is silently lost — this is the highest-severity data pitfall.
- **All 5 exercises share one FSRS state per item** — do not create per-exercise schedules; vary exercise *presentation*, not the schedule.
- **TTS enhances but never blocks** — every feature must work with TTS absent (device may lack a `ja-JP` voice).

---

## MVP Definition

### Launch With (v1) — the single build phase

- [ ] **FSRS engine (`ts-fsrs`, defaults) + IndexedDB per-item state** — the scheduler; nothing works without it.
- [ ] **Flashcards with self-grade** — the core active-recall loop.
- [ ] **Fill-in / typing with tolerant checking** — strongest retrieval mode; the reason to build over a tap-app.
- [ ] **Multiple choice, matching, sentence-building** — variety + scaffolding (already scoped; low cost given shared state).
- [ ] **Review-scope selector (Today/Week/All) over class/date tags** — serves Core Value ("drill this class").
- [ ] **Mode A furigana (romaji-on-kanji) rendering** — content is unreadable to a beginner without it.
- [ ] **Mode B progressive-kanji + learned-kanji set** — the signature differentiator (contingent on skill schema; see risk).
- [ ] **Mode C kanji-only toggle** — trivial once A/B exist.
- [ ] **Japanese TTS on demand** — pronunciation self-check.
- [ ] **Offline PWA + JSON export/import** — no-backend persistence and data safety.
- [ ] **Streak + progress % + points** — light, non-punishing gamification.

### Add After Validation (v1.x)

- [ ] **Exercise-type auto-selection by maturity** (new→MC, mature→typing) — trigger: after using fixed types for a while, if manual selection feels tedious.
- [ ] **Grammar points in the SRS flow** — trigger: once vocab loop is proven and grammar backlog grows.
- [ ] **Per-class weakness/progress dashboard** — trigger: user wants to see which classes are weak.

### Future Consideration (v2+)

- [ ] **FSRS parameter training** (`@open-spaced-repetition/binding`) — trigger: user has 1,000+ reviews of history.
- [ ] **Cross-device sync** — deferred by design; only if export/import friction becomes real pain.
- [ ] **Study reminders / push** — deferred (cross-platform PWA-push complexity).

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|-----------|---------------------|----------|
| FSRS engine + per-item IndexedDB state | HIGH | MEDIUM | P1 |
| Active-recall flashcards | HIGH | LOW | P1 |
| Fill-in / typing (tolerant checking) | HIGH | MEDIUM | P1 |
| Review-scope selector (tag-filtered queue) | HIGH | LOW | P1 |
| Mode A furigana rendering | HIGH | MEDIUM | P1 |
| JSON export/import (data safety) | HIGH | MEDIUM | P1 |
| Offline PWA shell | HIGH | MEDIUM | P1 |
| Mode B progressive-kanji + learned set | HIGH | HIGH | P1 (signature; schema-dependent) |
| TTS on demand | MEDIUM | LOW | P1 |
| Multiple choice / matching / sentence-building | MEDIUM | LOW-MEDIUM | P1 (scoped) |
| Sentence-context on card back | MEDIUM | LOW | P1 (near-free) |
| Streak + progress % + points | MEDIUM | LOW | P1 |
| "Study last class" shortcut | MEDIUM | LOW | P2 |
| Grammar points in SRS | MEDIUM | MEDIUM | P2 |
| Exercise auto-selection by maturity | MEDIUM | MEDIUM | P2 |
| FSRS parameter training | LOW (until data exists) | HIGH | P3 |
| Cross-device sync | LOW | HIGH | P3 |

---

## Competitor Feature Analysis

| Feature | Anki | Duolingo/WaniKani | Our Approach |
|---------|------|-------------------|--------------|
| Scheduler | FSRS (default since v23.10) | Duolingo: half-life regression; WaniKani: SRS levels | FSRS via `ts-fsrs`, defaults, no training |
| Retrieval mode | Self-grade recall | Duolingo: heavy tap/word-bank (recognition) | Typing + self-grade as engine; tap-modes as scaffolding |
| Kanji readings | Static furigana / add-ons | WaniKani: level-gated | **Per-user learned-set progressive substitution (Mode B)** — our differentiator |
| Content source | User-authored decks | Fixed curriculum | User's own class recordings via skill (fixed rigid schema) |
| Gamification | Minimal | Streaks, XP, hearts, leagues | Streak + progress % + points only; no punishment/social |
| Sync | AnkiWeb backend | Cloud accounts | JSON export/import + git (no backend) |

---

## Sources

- FSRS vs SM-2 comparisons & benchmarks — https://www.diane.app/en/guides/fsrs-vs-sm2 , https://expertium.github.io/Benchmark.html , https://help.remnote.com/en/articles/9124137-the-fsrs-spaced-repetition-algorithm (HIGH: multiple sources agree; Anki-default fact widely corroborated)
- ts-fsrs library, API, and `Card`/`Rating`/`State` definitions — https://github.com/open-spaced-repetition/ts-fsrs and source `packages/fsrs/src/models.ts` (HIGH: read from source; v5.4.1, zero deps confirmed via `npm view`)
- Active recall / typing > multiple choice, sentence cards, one-fact-per-card, daily consistency — https://www.tofugu.com/japanese/spaced-repetition/ , https://migaku.com/blog/japanese/japanese-spaced-repetition (MEDIUM: multiple credible language-learning sources agree)
- Word-bank / tile exercises = pattern-matching not retrieval (limits) — https://www.clozemaster.com/blog/duolingo-alternatives-for-comprehensive-language-learning/ , https://arxiv.org/pdf/2203.16175 (gamification misuse) (MEDIUM)
- Furigana `<ruby>`/`<rt>`, per-kanji alignment difficulty (okurigana/compounds) — https://en.wikipedia.org/wiki/Furigana , https://www.lorenzovainigli.com/blog/how-to-add-furigana-html/ , https://dev.to/mathewthe2/python-text-parsing-project-furigana-inserter-for-anki-2jo (MEDIUM)
- Japanese romaji input variants & tolerant answer checking — https://dev.to/sendotltd/building-a-japanese-typing-game-that-accepts-every-valid-romaji-variant-g42 (MEDIUM)
- Web Speech API TTS support, iOS user-gesture rule, offline voices — https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API , https://www.kitsunewa.com/guides/japanese-voices , https://textintoaudio.com/browser-support (HIGH on iOS gesture rule / offline synthesis; corroborated)

---
*Feature research for: personal Japanese self-study PWA (SRS + own class content)*
*Researched: 2026-07-06*

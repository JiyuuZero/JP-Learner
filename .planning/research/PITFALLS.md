# Pitfalls Research

**Domain:** Personal Japanese-learning PWA (Vite + React + Tailwind + IndexedDB) fed by a local-Whisper Claude skill that transcribes code-switching ES/JA class audio into rigid-schema JSON. No backend, GitHub Pages hosting, single-phase build by a lighter model (Fable 5).
**Researched:** 2026-07-06
**Confidence:** HIGH on Whisper code-switching, IndexedDB eviction, Web Speech API, and GitHub Pages behaviors (verified against MDN, WebKit docs, OpenAI Whisper discussions, and multiple corroborating sources). MEDIUM on SRS day-boundary specifics and furigana edge cases (verified against community/algorithm sources but implementation-dependent).

> **Framing for a single-phase Fable 5 build:** The biggest meta-risk here is *scope ballooning inside one phase*. Every pitfall below includes a "bounded default" — the simplest correct choice that avoids the trap without opening a rabbit hole. When in doubt, the build should pick the bounded default and move on, not the theoretically optimal solution. The three areas that reliably explode complexity are (1) trying to make Whisper perfectly handle intra-sentence code-switching, (2) trying to auto-generate correct furigana readings from raw kanji, and (3) trying to make TTS work identically everywhere. All three are solved below by pushing work into the rigid skill schema rather than the app.

## Critical Pitfalls

### Pitfall 1: Whisper treats the whole clip as one language and mis-detects ES/JA code-switching

**What goes wrong:**
Whisper runs language detection on only the **first ~30 seconds** and then assumes the entire audio is that single language. In a class that is mostly Spanish with Japanese words/phrases sprinkled in, Whisper detects "Spanish" and then either romanizes Japanese phonetically into Spanish spelling ("arigato" instead of ありがとう), mangles the Japanese, or silently drops it. If a Japanese-heavy segment triggers "Japanese" detection, the surrounding Spanish gets transcribed as garbled kana. The output is unusable as source-of-truth vocabulary.

**Why it happens:**
Whisper was not designed for code-switching; it assumes one language per file. Developers pass the whole class recording in one call and trust the auto-detect. Intra-sentential switching ("la palabra ありがとう significa gracias") is the hardest case and no single Whisper call handles it well.

**How to avoid:**
Push the work into the **skill**, not the app, and never rely on a single whole-file auto-detect:
- **Segment first (VAD), then transcribe per chunk.** Pipeline: audio → voice-activity-detection split → transcribe each chunk → detect/assign language per chunk → merge. This is the documented community workaround.
- **Bounded default for this project:** Since the class is *known* to be mostly Spanish explaining Japanese, transcribe the whole thing in Spanish for the running narration, and treat Japanese terms as items the skill extracts and the **human confirms**. The skill's rigid schema should require kanji/kana/romaji fields that the user (who was in class) verifies — do not trust Whisper to produce correct kanji.
- **Use `large-v3`, not medium/small.** Smaller models hallucinate far more and mis-handle the minority language (Whisper-small produced ~5x more insertion errors than large-v3 in benchmarks). The user's Mac can run it.
- **On Apple Silicon, use `whisper.cpp` with Metal** (the natural engine on M-series Macs; ~10x real-time on large-v3, no Python dependency) rather than fighting a Python/CUDA setup. `faster-whisper` is the NVIDIA-only choice and is not the fit here.
- **Lower the language-detection confidence threshold** (community-tuned 60–80% range) if using per-segment detection.

**Warning signs:**
Japanese words appearing as Spanish-spelled phonetics; kana strings that don't parse as real words; Japanese entirely absent from transcript; the same wrong reading for a term across the file.

**Phase to address:**
The **skill / content-processing pipeline** part of the single phase. The app should treat skill JSON as trusted-and-human-verified; it must not attempt any transcription itself (explicitly out of scope per PROJECT.md).

---

### Pitfall 2: Whisper hallucinates phrases during silence and pauses (loops the same text)

**What goes wrong:**
On silence, breathing, background classroom noise, or low-energy audio, Whisper fabricates text — classically repeated phrases ("gracias", "thank you for watching", or a looping sentence) — and inserts fake vocabulary items into the JSON. In a classroom recording full of pauses, this pollutes the glossary with words that were never said.

**Why it happens:**
Whisper was trained on subtitled video and fills silence with high-probability training phrases. Long-form audio with pauses (a class) is a worst case. Smaller models loop more aggressively.

**How to avoid:**
- **Run VAD before Whisper** so silence never reaches the model (WhisperX-style cut-and-merge on external VAD boundaries, not decoded timestamp tokens, avoids the loops).
- **Tune `no_speech_threshold` and `condition_on_previous_text=False`** — disabling conditioning on previous text stops runaway loops where one hallucination seeds the next.
- **Use large-v3** (35% repetition vs 86% for small on masked audio).
- **Human-in-the-loop in the skill contract:** because the user attended the class, the skill's final step should present extracted items for confirmation rather than committing blindly. This is the ultimate safety net for a personal-use tool.

**Warning signs:**
Repeated identical lines; a phrase that appears far more often than plausible; vocabulary items with no relation to the class topic; suspiciously "complete" sentences during known quiet moments.

**Phase to address:**
Skill / content-processing pipeline. Verified by spot-checking a real class recording's JSON against memory of the class.

---

### Pitfall 3: iOS Safari evicts IndexedDB after 7 days — and export/import is the ONLY backup

**What goes wrong:**
On iOS/WebKit, an origin's script-created storage (IndexedDB + Cache API) is **deleted after 7 days without user interaction**. All progress — SRS state, streak, points, learned-kanji list — vanishes. Because there is no backend and content JSON lives in git, the *only* backup for **progress** is the manual export/import file. If the user doesn't open the app for a week (exactly the vacation/gap scenario SRS is meant to survive) or clears Safari data, everything is gone and unrecoverable.

**Why it happens:**
Developers assume IndexedDB is durable like a database. It is best-effort by default. The 7-day timer and "clear all origin data at once" behavior are WebKit-specific and easy to miss. Mobile-first + personal-use makes this the single highest-impact data-loss risk.

**How to avoid:**
- **Call `navigator.storage.persist()` on first meaningful interaction.** For an *installed* home-screen PWA this materially improves durability and quota (installed PWAs get browser-level quota, ~60% of disk). Persistent storage is only deleted by the user, not by the eviction timer. Check the boolean it returns and surface the result.
- **Make export/import a first-class, low-friction feature, and nudge it.** A single "Export backup" button that downloads JSON; a visible "last backup: N days ago" indicator; an in-app reminder after N sessions. Because it is the user's only backup, it must be trivially easy and hard to forget.
- **Auto-export opportunistically:** offer to download a backup after each study session or on a streak milestone, so the newest state is always one tap from disk.
- **Keep progress schema versioned** (see Pitfall 8) so an old exported backup can always be re-imported after a rebuild.
- **Verify import actually works** by round-tripping (export → clear → import → confirm identical) during the build, not assuming it does.

**Warning signs:**
"My streak reset"; progress gone after not using the app for a week; data lost after an iOS storage-pressure event; `navigator.storage.persisted()` returning `false`; users never having exported.

**Phase to address:**
The **persistence / progress-storage** part of the single phase — must ship *with* export/import and the persist() request, not as a follow-up. This is a Core-Value guardrail ("if all else fails, this must work").

---

### Pitfall 4: SRS day-boundary and timezone bugs corrupt "Hoy / Esta semana" and pile-ups

**What goes wrong:**
The review-scope selector (Today / This week / Total) and the "new today" count depend on what "a day" means. If day boundaries are computed in UTC while the user lives in a non-UTC timezone, cards flip to "due today" at the wrong local hour (e.g. 9am if UTC+9-ish, or the wrong side of midnight), the streak breaks even though the user studied "today", and weekly counts are off by a day. Comparing `Date` objects instead of calendar days causes a card due "in 1 day" to be shown twice or skipped (classic off-by-one). Timestamps stored inconsistently (some UTC, some local) make it unfixable later.

**Why it happens:**
`new Date()` and interval math tempt developers into comparing millisecond timestamps rather than local calendar days. The day boundary for "study today counts for the streak" is an app *policy* decision that is often left implicit. Timezone is invisible until the user travels or studies near midnight.

**How to avoid:**
- **Pick one storage convention and stick to it:** store every timestamp as UTC ISO string; derive "due today / this week" by comparing **local calendar dates** (year-month-day in the user's timezone), never raw timestamp deltas.
- **Define the day boundary explicitly.** Local midnight is the simple correct default; document it. (Anki uses a configurable "next day starts at 4am" rollover — a nice-to-have, not required for v1; the bounded default is local midnight.)
- **Interval math:** compute the next-due *date* by adding whole days to the local date, not by adding milliseconds to a timestamp — this avoids DST/off-by-one drift.
- **Use a well-tested SM-2 implementation as reference** rather than reinventing intervals (1 day → 6 days → interval × ease-factor is the canonical progression). Handle the "lapsed card" reset explicitly so failed cards don't get stuck in "low-interval hell".
- **Handle the pile-up gracefully:** after a gap, the app will surface all overdue cards at once. Cap the daily new-card intro and let reviews drain, so returning after a week isn't a wall of hundreds of cards.

**Warning signs:**
Streak breaks despite studying; "0 due today" when cards should be due; the same card reviewed twice in one session; counts differing by exactly one; behavior changing when the device clock crosses midnight or when travelling.

**Phase to address:**
The **SRS engine + review-scope** part of the single phase. Verify with a test that fast-forwards the clock across midnight and across a timezone offset.

---

### Pitfall 5: Furigana readings are wrong because they're computed from kanji instead of provided by the skill

**What goes wrong:**
The app needs kana readings over kanji (`<ruby>漢字<rt>かんじ</rt></ruby>`) and, for display mode B, must map furigana to the *right* characters (okurigana like 乗り込む needs furigana only over 乗 and 込, not over り/む). Kanji are ambiguous: 生 alone has many readings (せい/しょう/い/う/なま/き…); a naive per-character reading lookup produces wrong furigana and teaches the user incorrect readings — actively harmful for a learning tool. Group vs. per-character (mono/jukugo) ruby also causes readings to overlap or split incorrectly at line wraps.

**Why it happens:**
Developers try to auto-generate readings in the app (dictionary lookup, morphological analyzer like kuromoji, or worse, per-character guessing). Correct segmentation + reading assignment is genuinely hard and locale-heavy, and the "right" reading is word-specific, not character-specific.

**How to avoid:**
- **Make readings authoritative data in the skill's rigid JSON schema, per word/item.** Each glossary item stores kanji, its correct kana reading, and romaji — verified by the human who was in class. The app renders ruby from that data; it never derives readings.
- **Store furigana at the word/segment level with reading pre-aligned to the kanji run**, so the app can place `<rt>` over the correct base characters without doing okurigana analysis. Simplest correct representation: an array of `{base, reading}` pairs where kana-only parts have empty reading. This makes mode B's progressive substitution a pure data transform, not an NLP problem.
- **Include `<rp>` fallback parentheses** for the rare browser that doesn't support `<ruby>` (broadly supported now, but cheap insurance).
- **Bounded default:** do not integrate a morphological analyzer in v1. The class vocabulary is small and curated; hand-verified readings in JSON are both more correct and far simpler.

**Warning signs:**
Furigana that a Japanese reader would flag as wrong; the same kanji showing different readings inconsistently; furigana drifting over the wrong characters in compound verbs; readings appearing over okurigana kana.

**Phase to address:**
Split across the **skill schema** (produces readings) and the **Japanese-rendering component** (consumes them). The schema design is the critical piece — get the per-item reading representation right first.

---

### Pitfall 6: GitHub Pages base-path breaks the PWA (blank page, 404s, wrong service-worker scope)

**What goes wrong:**
GitHub Pages serves a project site from a **subpath** (`https://user.github.io/JP-Learner/`), not root. If Vite `base` isn't set to `/JP-Learner/`, all asset URLs, the manifest `start_url`/`scope`, and the service-worker registration path point at root → blank page, 404 assets, SW never registers or registers with the wrong scope, install prompt fails. Client-side SPA routing 404s on refresh/deep-link because GitHub Pages has no server rewrite to `index.html`.

**Why it happens:**
Everything works locally at `/` and on Vercel at root, so the subpath assumption is invisible until deploy. GitHub Pages' lack of SPA fallback and its subpath serving are classic gotchas.

**How to avoid:**
- **Set Vite `base: '/JP-Learner/'`** (matching the repo name) and derive router `basename`, manifest `scope`/`start_url`, and SW registration path from it — don't hardcode `/`.
- **Add the SPA 404 fallback:** copy `index.html` to `404.html` at build (GitHub Pages serves `404.html` for unknown paths), or use the well-known `spa-github-pages` redirect trick, so refresh/deep-link doesn't 404. Ensure the fallback only catches *routes*, not missing `.js`/`.css` (serving HTML under a `.js` URL causes MIME errors).
- **Test the actual production URL**, including a hard refresh on a nested route and an install, before declaring done.

**Warning signs:**
Blank white page on the deployed URL but works locally; 404s for `/assets/...`; SW "registration failed"; refreshing a sub-route → GitHub 404 page; install prompt never appears.

**Phase to address:**
The **build + deploy / PWA-shell** part of the single phase. Verified only against the live GitHub Pages URL.

---

### Pitfall 7: Stale service worker serves an old app after every deploy

**What goes wrong:**
A cache-first service worker serves the previously cached `index.html`, which references hashed JS chunks that no longer exist on the server → blank screen or broken app after each content/app update, requiring a manual hard refresh the user won't know to do. For this project it's worse: cached **content JSON** means a new class the skill just committed never shows up, silently defeating the whole "expand class by class" value.

**Why it happens:**
Naive SW caching treats HTML and JSON like immutable static assets. Cache-first on HTML/JSON means the browser never checks for updates.

**How to avoid:**
- **Never cache-first the HTML or the content JSON.** Use network-first (or stale-while-revalidate with an update prompt) for `index.html` and for content JSON so new classes appear; cache-first only for hashed, immutable JS/CSS/font assets.
- **Use a maintained SW generator** (`vite-plugin-pwa` / Workbox) with precache manifest + versioned hashed assets, and enable a clear update flow (`skipWaiting` + `clientsClaim`, or an "update available — reload" toast). Don't hand-roll the SW.
- **Add a visible app-version indicator** so stale state is diagnosable.

**Warning signs:**
New class committed by the skill doesn't appear in the app; blank screen after a deploy that a hard refresh fixes; users on an old UI; asset 404s in console for hashed chunks that no longer exist.

**Phase to address:**
The **PWA-shell / offline-caching** part of the single phase. Verify by deploying twice and confirming an updated content JSON and app shell load without a manual hard refresh.

---

### Pitfall 8: IndexedDB schema migration corrupts or drops progress

**What goes wrong:**
Changing the object-store shape (adding SRS fields, learned-kanji list, points) between versions without a proper `onupgradeneeded` migration throws `VersionError`, blocks on other open tabs (`versionchange`), or silently loses records. Because progress is the irreplaceable data, a botched migration = lost streak/history with no server to recover from.

**Why it happens:**
IndexedDB versioning is verbose and easy to get wrong; developers bump the version and assume the browser migrates data (it doesn't — you must write the migration). Multiple open PWA windows create `versionchange`/blocked deadlocks.

**How to avoid:**
- **Version the DB from day one and write explicit `onupgradeneeded` migrations** that transform existing records rather than recreating stores. Use a thin wrapper (`idb`/Dexie) rather than raw IndexedDB to make migrations survivable.
- **Version-stamp the exported backup JSON** so import can upgrade an old backup to the current schema — this doubles as migration insurance.
- **Handle `versionchange` and `blocked`** (close the old connection / prompt reload) so a second open tab doesn't deadlock the upgrade.
- **Keep the schema minimal and additive** in a single-phase build; avoid speculative fields.

**Warning signs:**
`VersionError` / `blocked` in console; progress reset after an app update; import failing on an older backup; records missing new fields.

**Phase to address:**
The **persistence** part of the single phase, co-designed with export/import (Pitfall 3).

---

### Pitfall 9: No Japanese TTS voice on the device and the feature silently breaks

**What goes wrong:**
`speechSynthesis.getVoices()` returns **empty on first call** (async init) and unreliably fires `voiceschanged`, so a naive "grab ja-JP voice on load" gets nothing and TTS silently does nothing. Worse, some devices/OSes have **no Japanese voice installed at all** (varies by iOS/Android version and installed language packs) — the pronunciation button appears to work but produces silence or reads Japanese with an English/Spanish voice (gibberish). Android also uses `ja_JP` (underscore) on some versions instead of `ja-JP`.

**Why it happens:**
Voice availability is platform- and settings-dependent, not guaranteed by the API. `getVoices()` timing and the flaky `voiceschanged` event trip up nearly every first implementation.

**How to avoid:**
- **Load voices with retry:** poll `getVoices()` on an interval (e.g. every ~250ms up to a limit) and also listen for `voiceschanged`; match with a `/ja[-_]JP/i` regex to cover the Android underscore quirk.
- **Detect absence and degrade gracefully:** if no ja voice exists, hide/disable the speak button with a tooltip (or show romaji-only) rather than reading Japanese with a wrong-language voice. Never speak Japanese text through a non-Japanese voice.
- **Set `utterance.lang = 'ja-JP'`** explicitly and pick a matched voice, not the default.
- **Treat TTS as an enhancement, not core.** Per Core Value, learning must work with zero audio; TTS failing must never block a study session.

**Warning signs:**
Speak button does nothing on first load but works after a delay; Japanese read in a Spanish/English accent (gibberish); silence on certain phones; works on desktop Chrome, fails on iPhone.

**Phase to address:**
The **TTS / pronunciation** part of the single phase, built as an optional layer with an explicit no-voice fallback path.

---

### Pitfall 10: Scope balloons inside the single Fable 5 phase

**What goes wrong:**
A lighter model building everything in one pass tends to over-engineer the hard sub-systems: perfecting Whisper code-switching, wiring a morphological analyzer for furigana, building a configurable SRS with fuzz/rollover/leech handling, cross-browser TTS voice pickers, and a full offline sync story. Each is individually reasonable and collectively unshippable in one phase — the build stalls or ships half-broken subsystems.

**Why it happens:**
Each domain has a "correct" deep solution that's tempting; without explicit bounds a single-phase build chases all of them. Token/time budget (Fable 5) makes this fatal.

**How to avoid:**
- **Enforce the bounded defaults above** as the plan of record: skill produces human-verified readings + language separation (no in-app NLP/ASR); canonical SM-2 with local-midnight day boundary (no fuzz/rollover config); `vite-plugin-pwa` (no hand-rolled SW); ja-voice-with-graceful-fallback (no voice picker); export/import + `persist()` (no sync).
- **Sequence within the phase by data contract first:** lock the skill's rigid JSON schema (glossary item shape incl. per-word readings, grammar, class/date tags, progress schema) before UI, so every consumer builds against a stable, correct contract. The schema is the spine; everything downstream is a transform.
- **Cut differentiators before table stakes:** if time is short, drop gamification polish and display-mode C before touching SRS correctness, content ingestion, or export/import (the Core Value guardrail).

**Warning signs:**
Build touching kuromoji/morphological analysis, VAD tuning loops, SW written by hand, TTS voice-selection UI, or any "sync" work; schema still changing while UI is being built; effort concentrated on gamification while SRS/export unfinished.

**Phase to address:**
Applies to the whole single phase — this is the ordering/guardrail pitfall the roadmap must encode.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Trust Whisper whole-file auto-detect (skip VAD/per-chunk) | Faster skill; less code | Wrong/absent Japanese in source-of-truth JSON | **Never** — corrupts the data the whole app depends on |
| Derive furigana readings in-app (per-char or analyzer) | No reading data in schema | Wrong readings teach mistakes; mode B logic gets NLP-hard | **Never** for readings; analyzer only if class vocab ever grows huge (not v1) |
| Compare raw timestamps for "due today" | Trivial to write | Timezone/off-by-one streak & count bugs | **Never** — use local calendar dates |
| Hand-roll the service worker | Full control | Stale-cache blank screens, missed new classes | **Never** — use vite-plugin-pwa/Workbox |
| Ship without `navigator.storage.persist()` | One less call | 7-day eviction wipes progress | Only if export nag is aggressive AND user warned |
| Skip DB migration, bump version | Ship a schema change fast | Lost progress on update | Only pre-first-real-use (no data to lose yet) |
| TTS reads Japanese via any available voice | Button "works" everywhere | Gibberish; teaches wrong pronunciation | **Never** — require ja voice or disable |
| Hardcode `base: '/'` | Works locally | Blank page on GitHub Pages | Only if hosting later moves to root domain |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Local Whisper (skill) | One call, auto-detect, medium/small model | VAD split → per-chunk → large-v3 via whisper.cpp/Metal on the Mac; human-verified output |
| Whisper output → JSON | Commit transcription blind | Rigid schema with required kanji/kana/romaji fields the user confirms |
| Web Speech API (TTS) | Read voices synchronously on load; assume ja exists | Poll + `voiceschanged`; `/ja[-_]JP/i` match; disable if absent |
| GitHub Pages (host) | Assume root path + SPA server rewrite | Vite `base` = repo name; `404.html` fallback; test live URL |
| Service worker | Cache-first HTML/JSON | Network-first for HTML + content JSON; cache-first only hashed assets |
| IndexedDB | Bump version, expect auto-migrate | Explicit `onupgradeneeded`; `idb`/Dexie; handle `blocked`/`versionchange` |
| `<ruby>`/`<rt>` | Per-character readings; no fallback | Pre-aligned `{base, reading}` pairs from schema; include `<rp>` |

## Performance Traps

Personal single-user tool: scale is tiny (dozens→low-hundreds of classes, a few thousand items lifetime). Real "performance" risks are correctness/UX, not throughput.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all content JSON into memory on every route | Slow startup as classes accumulate | Load per-class/lazily; index by class/date | Hundreds of classes (years of use) |
| Re-rendering full deck on each SRS answer | Jank on mobile | Update only the answered item's state | Thousands of items |
| Whisper on CPU / wrong engine | Multi-x-realtime transcription, painful iteration | whisper.cpp + Metal on Apple Silicon | Any long class recording |
| Bundling all fonts (full CJK webfont) | Multi-MB download, slow first load offline | Rely on system JP fonts; subset only if custom font truly needed | First load / slow connection |

## Security Mistakes

Personal, no-backend, no-auth app — classic web-security surface is minimal. Domain-specific concerns:

| Mistake | Risk | Prevention |
|---------|------|------------|
| Putting an API key in the app to call an AI service | Key leaks in public GitHub Pages bundle | None needed — AI lives in the local skill; app has no keys (per PROJECT.md, enforce it) |
| Rendering skill/imported JSON as HTML unsanitized | XSS via crafted content/backup | Render as text/`<ruby>` from structured fields; never `dangerouslySetInnerHTML` raw content |
| Importing a backup without validation | Corrupt/malicious JSON breaks or overwrites progress | Validate shape + version on import; confirm before overwriting existing progress |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Progressive-kanji (mode B) applies globally, not per-learned-kanji | User sees kanji they haven't learned; defeats the slow-learning intent | Substitute kanji only for characters explicitly marked learned; everything else stays kana + furigana |
| Silent TTS failure | User taps speak, nothing happens, no explanation | Disable with tooltip when no ja voice; never fake it with wrong voice |
| Review pile-up after a gap | Hundreds of cards after a week away, discouraging | Cap daily new cards; let reviews drain; reassure user |
| No visible backup status | User assumes data is safe, loses it | "Last backup N days ago" + easy export; nag after sessions |
| Wrong furigana | User memorizes incorrect reading (worse than no help) | Only human-verified readings from schema |
| Streak resets from timezone bug | Demotivating, feels broken | Local-calendar day boundary, tested across midnight |

## "Looks Done But Isn't" Checklist

- [ ] **Whisper code-switching:** Verify a *real* mixed ES/JA class clip yields correct Japanese (kanji/kana), not Spanish-phonetic mangling, and no hallucinated items during pauses.
- [ ] **Progress durability:** `navigator.storage.persist()` requested and returns `true` when installed; export → clear storage → import round-trips to identical state.
- [ ] **SRS day boundary:** Fast-forward clock across local midnight and across a timezone offset — "due today", "this week", and streak stay correct; no off-by-one.
- [ ] **GitHub Pages deploy:** Hard-refresh on a nested route and install-to-home-screen both work on the live `/JP-Learner/` URL, not just localhost.
- [ ] **Service worker freshness:** Deploy an updated content JSON (new class) and confirm it appears without a manual hard refresh.
- [ ] **Furigana:** A Japanese reader confirms readings; okurigana (e.g. 乗り込む) has furigana only over kanji; mode B shows only learned kanji.
- [ ] **TTS fallback:** On a device with no ja voice, the app degrades gracefully (button disabled/hidden), never reads Japanese with a non-JP voice.
- [ ] **DB migration:** Adding a field and bumping version preserves existing progress; second open tab doesn't deadlock.
- [ ] **Offline:** After install + one online load, a full study session works airplane-mode.
- [ ] **Import validation:** A malformed/old backup is rejected or safely upgraded, not silently corrupting current data.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| IndexedDB evicted / cache cleared | LOW *if* a recent export exists; HIGH otherwise (unrecoverable) | Import latest backup JSON. Prevention (persist + nag) is everything — no server recovery exists |
| Bad Whisper output committed | LOW | Re-run skill on the clip with per-chunk/large-v3; fix human-verified fields; re-commit JSON (git history intact) |
| Wrong furigana readings shipped | LOW | Correct the reading in the JSON item and redeploy — data-only fix |
| Stale SW serving old app | LOW | Ship update flow (skipWaiting/reload toast); user reload picks up fix; add version indicator |
| Broken DB migration | MEDIUM–HIGH | Restore from exported backup; write corrected `onupgradeneeded`; if no backup, data lost |
| GitHub Pages base-path blank page | LOW | Set Vite `base` + `404.html`, redeploy |
| SRS timezone/off-by-one bug | MEDIUM | Fix to local-calendar logic; re-derive due dates from stored UTC timestamps (recompute, don't reset) |

## Pitfall-to-Phase Mapping

Single-phase build — "Prevention area" = the sub-system within the phase responsible.

| Pitfall | Prevention Area | Verification |
|---------|-----------------|--------------|
| 1. Code-switching mis-detection | Skill / content pipeline | Real mixed clip → correct JA in JSON |
| 2. Silence hallucination | Skill / content pipeline | No fabricated/looped items vs. class memory |
| 3. iOS 7-day eviction (only backup) | Persistence + export/import | persist()=true; export→clear→import round-trip |
| 4. SRS day-boundary/timezone | SRS engine + review scope | Clock fast-forward across midnight & TZ offset |
| 5. Wrong furigana readings | Skill schema + JA-render component | JP-reader review; okurigana + mode B correct |
| 6. GitHub Pages base path | Build/deploy + PWA shell | Live URL: nested-route refresh + install |
| 7. Stale service worker | PWA shell / caching | New class JSON appears without hard refresh |
| 8. DB migration corruption | Persistence | Field add + version bump preserves data |
| 9. Missing Japanese TTS voice | TTS layer | No-ja-voice device degrades gracefully |
| 10. Scope ballooning | Whole-phase ordering/guardrails | Schema locked before UI; bounded defaults used; Core-Value features finished before polish |

## Sources

- OpenAI Whisper — code-switching / multi-language limitation (first-30s single-language assumption) and per-segment VAD workaround: https://github.com/openai/whisper/discussions/49 ; https://github.com/openai/whisper/discussions/2009 ; https://github.com/openai/whisper/discussions/2391
- Whisper hallucination on silence, `condition_on_previous_text`, VAD mitigation, model-size effect: https://dev.to/nareshipme/whisper-hallucination-on-silence-why-your-transcript-loops-the-same-phrase-2pg4 ; https://github.com/openai/whisper/discussions/679 ; WhisperX paper https://arxiv.org/pdf/2303.00747
- Whisper model sizes & engine choice (large-v3 accuracy; whisper.cpp+Metal on Apple Silicon vs faster-whisper on NVIDIA): https://openwhispr.com/blog/whisper-model-sizes-explained ; https://codersera.com/blog/faster-whisper-vs-whisper-cpp-speech-to-text-2026/ ; https://modal.com/blog/choosing-whisper-variants
- IndexedDB eviction, best-effort vs persistent, `navigator.storage.persist()`, installed-PWA quota, 7-day WebKit deletion: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria ; https://bugs.webkit.org/show_bug.cgi?id=266559 ; https://developer.apple.com/forums/thread/730023
- SM-2 algorithm, review pile-up / "low-interval hell", timezone considerations: https://faqs.ankiweb.net/what-spaced-repetition-algorithm ; https://www.repetrax.com/blog/sm2-algorithm-explained ; https://dev.to/umangsinha12/how-spaced-repetition-actually-works-the-sm-2-algorithm-1ge3
- Web Speech API TTS: async getVoices/voiceschanged, per-platform voice availability, Android `ja_JP` underscore quirk, retry pattern: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API ; https://talkrapp.com/speechSynthesis.html ; https://github.com/HadrienGardeur/web-speech-recommended-voices
- Furigana `<ruby>`/`<rt>`/`<rp>`, okurigana + jukugo ruby, reading ambiguity: https://www.w3.org/International/questions/qa-ruby ; https://www.japanesewithanime.com/2016/11/furigana.html
- PWA on GitHub Pages: base-path/subpath, SPA 404 fallback, stale service worker after deploy: https://devactivity.com/posts/apps-tools/unlocking-spa-deployment-solving-github-pages-404s-for-enhanced-engineering-productivity/ ; https://github.com/vite-pwa/vite-plugin-pwa/issues/33 ; https://dev.to/crisiscoresystems/service-workers-that-dont-surprise-you-deterministic-caching-for-offline-first-pwas-5480

---
*Pitfalls research for: personal Japanese-learning PWA fed by a local-Whisper Claude skill*
*Researched: 2026-07-06*

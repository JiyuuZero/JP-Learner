# Stack Research

**Domain:** Personal Japanese-learning PWA (no backend, static hosting) + local Claude skill for mixed ES/JA audio transcription
**Researched:** 2026-07-06
**Confidence:** HIGH (app stack verified against npm + official docs), MEDIUM-HIGH (transcription toolchain)

## Executive Recommendation

The presumed direction is **validated**: Vite + React + TypeScript + Tailwind + IndexedDB + `vite-plugin-pwa`, furigana via native `<ruby>`, TTS via Web Speech API. Every piece is the mainstream, well-documented 2026 choice and nothing here adds disproportionate complexity for a single-phase build by a lighter model.

Three refinements the roadmap should adopt:

1. **Skip React Router. Use `HashRouter` or plain state-based view switching.** For a mobile-first app with a fixed bottom nav and ~4-5 views, a router is optional. If a router is wanted, `HashRouter` sidesteps the entire GitHub Pages 404/SPA-fallback problem with zero config. This is the single biggest friction reducer for a lighter LLM.
2. **For the SRS engine, use `ts-fsrs`** (modern, actively maintained FSRS-4.5/6 algorithm) rather than hand-rolling SM-2. It is a tiny, dependency-free, TypeScript-native library that produces exactly the per-item scheduling state the project needs.
3. **Local transcription: `whisper.cpp` via Homebrew + `large-v3` model, invoked with `--language auto` and `--output-json`.** The mixed ES/JA "code-switching" requirement is the one genuinely hard part — see the dedicated section below. The larger model materially outperforms smaller ones on language mixing, and the skill runs offline/one-shot so speed is a non-issue.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Vite** | 8.1.x | Build tool / dev server / static bundler | De-facto standard for React SPAs in 2026. Zero-config static output ideal for GitHub Pages. Fast, minimal boilerplate — good for a lighter LLM. |
| **React** | 19.2.x | UI library | Ubiquitous, best-documented option; the model has seen enormous training signal for React patterns → fewer mistakes. Function components + hooks only. |
| **TypeScript** | 5.9.x | Type safety | Catches errors at author time, self-documents the rigid content JSON schema (shared types between skill output and app input). Pin to 5.9 for maximum tooling stability. |
| **Tailwind CSS** | 4.1.x | Styling | Utility-first fits the mobile-first, card-based Duolingo/Busuu look. v4 uses the Vite plugin `@tailwindcss/vite` (no PostCSS config). Indigo/purple + pastel palette maps directly to Tailwind color tokens. |
| **vite-plugin-pwa** | 1.3.x | PWA (manifest + service worker + offline) | Zero-config PWA layer over Workbox. Handles installability, offline caching, and update prompts. **Explicitly supports Vite 8** in peerDependencies (verified). |

> **TypeScript version note:** npm `latest` is 6.0.3, but 5.9.x is the broadly-adopted, tooling-stable line as of mid-2026. Recommend **`typescript@5.9`** to avoid edge-case friction with a lighter model. This is the one place I deliberately do NOT pick the newest tag. Confidence: MEDIUM (judgment call, not a correctness issue — 6.x also works).

> **Tailwind v4 gotcha:** v4 is CSS-first (`@import "tailwindcss";` + `@theme` in CSS), not the v3 `tailwind.config.js` JS-object style. A lighter LLM may default to v3 patterns from training data. The roadmap should explicitly state "Tailwind v4, CSS-first config, `@tailwindcss/vite` plugin." Confidence: HIGH.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **idb** | 8.0.x | IndexedDB Promise wrapper | Progress storage + export/import. Thin (~1KB), just promisifies the native API. **Recommended default** — the data model is simple (a few object stores: items, srs-state, settings, streak). |
| **Dexie** | 4.4.x | Higher-level IndexedDB ORM | Alternative to `idb` if querying/indexing grows complex (e.g. "all items due this week across all classes"). More API surface = more for the model to learn. Use only if `idb` queries feel painful. |
| **ts-fsrs** | 5.4.x | Spaced-repetition scheduler (FSRS) | The SRS engine. Pure-function `Card` state in/out; store the returned card state per item in IndexedDB. Modern successor to SM-2, dependency-free, TS-native. |
| **@tailwindcss/vite** | 4.1.x | Tailwind v4 Vite integration | Required with Tailwind v4 (replaces PostCSS setup). Install alongside `tailwindcss`. |
| **workbox-window** | 7.4.x | SW registration / update UX | Pulled in transitively by `vite-plugin-pwa`; only add directly if you want a custom "new version available" prompt. Usually not needed — use plugin's `registerType: 'autoUpdate'`. |

**Deliberately NOT recommended as libraries (do it natively / in the skill instead):**

- **Furigana:** use native HTML `<ruby><rb>漢字</rb><rt>かんじ</rt></ruby>`. No library. The three display modes (romaji-over / progressive-kanji-furigana / kanji-only) are pure rendering logic over the content JSON. Confidence: HIGH.
- **Romaji/kana conversion (`wanakana`, `kuroshiro`, `kuromoji`):** NOT needed in the app. The Claude skill emits kanji, kana, romaji, and furigana readings directly into the JSON schema. Adding a JA morphological tokenizer (kuromoji ships a ~15MB dictionary) to a static PWA would be a large, pointless payload. Keep all linguistic processing in the skill's LLM step. Confidence: HIGH — this is a key simplification.
- **TTS:** use the native **Web Speech API `SpeechSynthesis`** with a `ja-JP` voice. No library. See caveats below.
- **State management (Redux/Zustand):** not needed for v1. React `useState`/`useReducer` + a couple of context providers cover streak, settings, and current-session state. `zustand@5` is a fine lightweight escape hatch if global state gets unwieldy, but do not start with it.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **@vitejs/plugin-react** | React fast-refresh + JSX transform | v6.x. Standard Vite React plugin. |
| **ffmpeg** (skill side) | Convert class audio (m4a/mp3) → 16kHz mono WAV | `whisper.cpp` requires 16-bit 16kHz WAV input. Install via `brew install ffmpeg`. Part of the skill, not the app. |
| **GitHub Actions** | Build + deploy to GitHub Pages | Use `actions/deploy-pages`. Build `dist/`, publish. Set Vite `base: '/<repo-name>/'` for project pages. |
| **ESLint + Prettier** | Lint/format | Optional for a one-phase personal project; include only if it doesn't cost the lighter model tokens/friction. Vite's React template scaffolds a basic ESLint config. |

## Local Transcription Toolchain (Mixed ES/JA Audio) — CONCRETE RECOMMENDATION

This is the highest-risk, most-researched part. The skill must transcribe class recordings that **code-switch between Spanish and Japanese** (teacher explains Japanese grammar/vocab in Spanish), with **no API key, running locally on macOS**.

### The core problem
Whisper (all implementations) **detects one language for the first ~30s and assumes the whole file is that language**. It was not designed for code-switching. This is a documented architectural limitation, not a bug. (Confidence: HIGH — confirmed across OpenAI Whisper discussions and HF model card discussions.) So a naive `-l es` run will mangle the Japanese, and `-l ja` will mangle the Spanish.

### Recommended tool: whisper.cpp
| Choice | Recommendation | Why |
|--------|----------------|-----|
| **Tool** | **`whisper.cpp`** (`brew install whisper-cpp`, binary `whisper-cli` / `whisper-cpp`) | Truly key-free, offline, native Apple-Silicon (Metal/CoreML) acceleration, single binary, dead-simple CLI, emits clean JSON with per-segment timestamps + detected language. Easiest to invoke from a skill via a shell command. Confidence: HIGH. |
| **Model** | **`ggml-large-v3`** (download the GGML file; `q5_0` quant ~1.1GB is a good size/quality balance, or full f16 if disk allows) | Larger models are markedly better at multilingual + language-mixed audio and at Japanese specifically. The skill is a one-shot offline batch job, so `large-v3`'s slower speed is irrelevant. Do **not** use `tiny`/`base`/`small` for ES/JA mixing — accuracy drops sharply. Confidence: HIGH (size→multilingual-accuracy relationship), MEDIUM (exact ES/JA WER figures). |
| **Turbo variant** | `large-v3-turbo` is a valid fallback if disk/RAM constrained | ~5-8x faster on Apple Silicon, WER within ~0.4pts of large-v3 on average. For a batch skill, prefer full `large-v3` for max fidelity; turbo is fine if the Mac is memory-limited. Confidence: MEDIUM. |
| **Language flag** | **`--language auto`** (a.k.a. `-l auto`) and do NOT pass `--translate` | Lets whisper.cpp auto-detect. With `--output-json` you get per-segment detected-language info, which the skill can use downstream. Confidence: MEDIUM-HIGH. |

### Recommended skill pipeline (invoked as shell commands from the Claude skill)
```bash
# 1. Normalize audio to whisper.cpp's required format
ffmpeg -i clase-YYYY-MM-DD.m4a -ar 16000 -ac 1 -c:a pcm_s16le clase.wav

# 2. Transcribe with auto language detection + JSON output
whisper-cpp -m ggml-large-v3-q5_0.bin -f clase.wav \
  --language auto --output-json --max-len 0 -otxt

# 3. The Claude skill (LLM step) reads the JSON transcript and
#    STRUCTURES it into the rigid content schema:
#    - separates Spanish explanation from Japanese target items
#    - fills kanji / kana / romaji / ES-translation / example sentence
#    - tags by class date, classifies vocab vs grammar vs notes
```

**Key architectural point for the roadmap:** the transcription quality only needs to be "good enough for a human-in-the-loop LLM to reconstruct the lesson." Whisper's per-segment mixing imperfections are acceptable because the **Claude skill's LLM reasoning step is the real disambiguator** — it uses Spanish context to correctly render the Japanese items, fills readings/romaji, and enforces the schema. Do not over-engineer VAD-based per-segment re-transcription in v1; it adds large complexity for marginal gain. Flag as a possible v2 refinement if transcripts prove too noisy. Confidence: MEDIUM (this is the pragmatic call given the human+LLM loop).

### Transcription alternatives considered
| Recommended | Alternative | When to use alternative |
|-------------|-------------|-------------------------|
| whisper.cpp (CLI) | **faster-whisper** (Python, CTranslate2) | If the skill is comfortable in a Python venv and wants word-level timestamps + built-in VAD (Silero) for segment-per-language chunking. More setup (pip, torch/MPS) = more friction for a one-phase build. Better if you later want the VAD workaround. Confidence: MEDIUM. |
| whisper.cpp (CLI) | **openai-whisper** (reference Python) | Simplest Python install but slowest; no Metal path as good as whisper.cpp. Only if already in a Python workflow. |
| whisper.cpp (CLI) | **MacWhisper** (GUI app) | Great for humans, but it is a GUI — not scriptable from a headless skill. Use only for manual spot-checks, not the automated pipeline. |
| whisper.cpp (CLI) | **SenseVoice** | Faster/better punctuation on pure CJK, but weaker for the Spanish half and less standard tooling. Not worth it for mixed ES/JA. |

## Web Speech API (TTS) — Caveats the Roadmap Must Encode

Native `SpeechSynthesis` with a `ja-JP` voice is correct (no library, no key), but it is quirky. The implementation phase MUST handle:

1. **`getVoices()` returns `[]` on first call.** Voices load async. Listen for the `voiceschanged` event AND poll once, then pick the first `ja-JP` (or `/ja[-_]JP/` regex — some Android use `ja_JP`). Confidence: HIGH.
2. **iOS Safari: `speak()` only fires inside a user-gesture handler** (tap/click). Never auto-speak on render; always behind a button tap. WebKit silently drops otherwise. Confidence: HIGH.
3. **Voice availability is device-dependent.** iOS ships "Kyoko" (ja-JP); Android depends on the installed Google/Samsung TTS engine. Gracefully degrade (hide the speak button if no ja-JP voice found). Confidence: HIGH.
4. Tabs losing focus can throttle/stop synthesis. Keep utterances short (word/sentence level). Confidence: MEDIUM.

## Routing & GitHub Pages Deployment

| Concern | Recommendation | Why |
|---------|----------------|-----|
| Routing | **`HashRouter`** (react-router-dom 7.x) **or no router** (state-based view switch) | GitHub Pages does not do SPA fallback natively; a deep link to `/practice` 404s on refresh. HashRouter (`/#/practice`) avoids this entirely with zero config — critical for a low-friction one-phase build. Confidence: HIGH. |
| Vite `base` | `base: '/<repo-name>/'` in `vite.config.ts` (project pages) | Assets resolve correctly under `username.github.io/repo-name/`. If using a custom domain or user-pages repo, `base: '/'`. Confidence: HIGH. |
| SW scope | Ensure `vite-plugin-pwa` respects the same `base` | Service worker and manifest paths must be under the repo subpath. Plugin handles this when `base` is set. Confidence: MEDIUM-HIGH. |
| Deploy | GitHub Actions → `actions/deploy-pages` | Standard static deploy of `dist/`. Confidence: HIGH. |

## Installation

```bash
# Scaffold (React + TS)
npm create vite@latest jp-learner -- --template react-ts

# Core runtime
npm install react@19 react-dom@19

# Tailwind v4 (CSS-first) + Vite plugin
npm install -D tailwindcss@4 @tailwindcss/vite@4

# PWA
npm install -D vite-plugin-pwa@1

# Data + SRS
npm install idb@8 ts-fsrs@5

# Optional router (only if not doing state-based views)
npm install react-router-dom@7   # use HashRouter

# Dev
npm install -D typescript@5.9 @vitejs/plugin-react@6

# --- Skill side (NOT part of the app bundle) ---
brew install whisper-cpp ffmpeg
# then download a model, e.g.:
curl -L -o ggml-large-v3-q5_0.bin \
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-q5_0.bin?download=true'
```

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Create React App** | Deprecated/unmaintained; slow; not recommended by React team | Vite |
| **Next.js / Remix / any SSR framework** | Needs a server or complex static-export config; overkill for a no-backend static PWA; more concepts for the lighter LLM | Plain Vite SPA |
| **Tailwind v3 config style** | v4 is CSS-first; mixing v3 `tailwind.config.js` object patterns with v4 causes silent breakage | Tailwind v4 `@theme` in CSS + `@tailwindcss/vite` |
| **kuromoji / kuroshiro in the app** | ~15MB JA dictionary payload; furigana/romaji already produced by the skill | Skill emits readings into JSON; render with `<ruby>` |
| **BrowserRouter on GitHub Pages (without 404 hack)** | Deep-link refresh 404s | HashRouter, or the 404.html redirect hack if clean URLs are essential |
| **Raw `indexedDB` API** | Verbose, callback-based, error-prone for a lighter model | `idb` (or Dexie) |
| **Hand-rolled SM-2 SRS** | Easy to get scheduling math subtly wrong; more code to maintain | `ts-fsrs` |
| **A backend / any API key in the app** | Explicitly out of scope; breaks the offline + free-hosting model | Content JSON in repo + IndexedDB progress + skill does all AI |
| **Cloud Whisper API / OpenAI transcription** | Requires an API key; violates the key-free constraint | Local `whisper.cpp` |
| **`tiny`/`base`/`small` Whisper models for ES/JA** | Poor on multilingual + language-mixing; garbles code-switched audio | `large-v3` (or `large-v3-turbo` if constrained) |

## Stack Patterns by Variant

**If the content query needs (e.g. "due this week across all classes") get complex:**
- Swap `idb` → `Dexie 4` for indexed queries and a friendlier API.
- Because Dexie's `.where()` indexing beats hand-written cursor logic.

**If the Mac running the skill is memory-constrained (≤8GB) or transcription is too slow:**
- Use `ggml-large-v3-turbo` instead of full `large-v3`.
- Because it's ~5-8x faster with <0.5pt WER loss; acceptable for the LLM-in-the-loop workflow.

**If Whisper transcripts prove too noisy on intra-sentence ES/JA switches (v2):**
- Move to `faster-whisper` (Python) with Silero VAD → per-segment language detect → per-segment transcribe.
- Because VAD-based segmentation is the documented (if imperfect) code-switching workaround. Explicitly a v2 concern, not v1.

**If global UI state (streak, settings, active session) becomes tangled:**
- Add `zustand@5` (single small store).
- Because it's minimal and avoids prop-drilling without Redux ceremony. Not needed at start.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| vite@8 | vite-plugin-pwa@1.3 | peerDeps include `^8.0.0` — **verified directly from npm**. HIGH confidence. |
| vite@8 | @vitejs/plugin-react@6 | Current pairing. |
| tailwindcss@4 | @tailwindcss/vite@4 | Must match major; both v4. v4 requires the Vite plugin, not PostCSS. |
| react@19 | react-dom@19 / @types/react@19 | Keep all three on 19.x. |
| whisper-cpp (brew) | ggml-large-v3 model | Model file downloaded separately from HF ggerganov/whisper.cpp; requires 16kHz 16-bit mono WAV input (use ffmpeg). |
| idb@8 | modern browsers | Native IndexedDB is universally supported incl. iOS Safari (PWA target). |

## Confidence Summary

| Area | Confidence | Basis |
|------|------------|-------|
| Core app stack (Vite/React/TS/Tailwind) | HIGH | Versions verified against npm 2026-07-06; mainstream, well-documented |
| vite-plugin-pwa + Vite 8 | HIGH | peerDependencies inspected directly (`^8.0.0` present) |
| IndexedDB via idb, SRS via ts-fsrs | HIGH | Standard choices, versions verified |
| Furigana `<ruby>` / TTS Web Speech API | HIGH | Native web platform; caveats documented from MDN/community |
| whisper.cpp as the tool | HIGH | Key-free, offline, scriptable, Apple-Silicon native |
| large-v3 as best model for ES/JA mixing | MEDIUM-HIGH | Size→multilingual-accuracy well-established; exact ES/JA WER not benchmarked in sources |
| `--language auto` handling code-switching acceptably | MEDIUM | Documented workaround; real-world quality depends on audio + rescued by LLM step |
| TypeScript 5.9 over 6.0 recommendation | MEDIUM | Judgment call for lighter-LLM stability, not a correctness constraint |

## Sources

- npm registry (`npm view`) — verified current versions of vite (8.1.3), react (19.2.7), tailwindcss (4.3.2), vite-plugin-pwa (1.3.0 + peerDeps), idb (8.0.3), dexie (4.4.4), ts-fsrs (5.4.1), react-router-dom (7.18.1), typescript (6.0.3), @vitejs/plugin-react (6.0.3) — 2026-07-06. HIGH.
- Context7 `/vitejs/vite` — confirmed Vite 7/8 lines. HIGH.
- vite-pwa/vite-plugin-pwa Issue #923 + release notes — Vite 8 peer support added in 1.x. HIGH.
- Simon Willison TIL (til.simonwillison.net/macos/whisper-cpp) — whisper.cpp brew install, model download, ffmpeg 16kHz conversion, `--output-json`. HIGH.
- ggml-org/whisper.cpp GitHub + discussions — `-l auto`, `-oj`, large-v3-turbo, model download. MEDIUM-HIGH.
- OpenAI whisper Discussion #49 + HF whisper-large-v3 discussions #56/#71 — single-language-per-segment limitation, code-switching workarounds (VAD segmentation). MEDIUM-HIGH.
- whispernotes.app / spokenly.app / convertaudiototext.com — large-v3 vs turbo WER (~0.4pt) and Apple-Silicon speed. MEDIUM.
- MDN Web Speech API + HadrienGardeur/web-speech-recommended-voices + manu.ninja — voiceschanged async load, iOS user-gesture requirement, ja-JP voice caveats. HIGH.
- rafgraph/spa-github-pages + community discussion #64096 — GitHub Pages SPA routing (HashRouter vs 404.html hack). HIGH.

---
*Stack research for: Personal Japanese-learning PWA + local ES/JA transcription skill*
*Researched: 2026-07-06*

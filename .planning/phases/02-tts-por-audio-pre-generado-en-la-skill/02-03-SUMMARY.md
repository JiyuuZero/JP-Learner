---
phase: 02-tts-por-audio-pre-generado-en-la-skill
plan: 03
subsystem: infra
tags: [pwa, workbox, vite, service-worker, cachefirst, m4a, github-pages]

# Dependency graph
requires:
  - phase: 02-tts-por-audio-pre-generado-en-la-skill (plan 01)
    provides: "10 committed Kyoko .m4a + content/audio/index.json sidecar manifest for sample class 2026-04-14 (canonical content/audio/)"
  - phase: 02-tts-por-audio-pre-generado-en-la-skill (plan 02)
    provides: "app-side fallback chain (audio file -> Web Speech) consuming the manifest; SpeakerButton audioKey wiring; Perfil three-state status"
  - phase: 01-jp-learner-v1-complete-pwa-content-skill
    provides: "sync-content.mjs rm-then-copy build step, vite-plugin-pwa config with /content/ NetworkFirst runtimeCaching, GitHub Pages deploy workflow"
provides:
  - "app/scripts/sync-content.mjs copies canonical content/audio/ into app/public/content/audio/ at build (existsSync-guarded — build survives repos with no audio yet)"
  - "app/vite.config.ts: CacheFirst 'content-audio' runtime cache for /content/audio/*.m4a inserted FIRST in runtimeCaching (Workbox first-match), maxEntries 300 / maxAgeSeconds 30d (T-02-11)"
  - "globPatterns untouched — no .m4a in SW precache (T-02-12); audio/index.json falls through to the NetworkFirst /content/ rule"
  - "Deployed build serving the 10 sample .m4a on GitHub Pages; phase-closing human verification APPROVED on a device without any ja-JP voice"
affects: [future content phases (audio ships automatically with every deploy), skill audio generation (no app change needed for new classes)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Workbox runtimeCaching rule ordering: specific binary rule (CacheFirst .m4a) BEFORE generic path rule (NetworkFirst /content/) — first match wins"
    - "existsSync-guarded optional sidecar copy in sync-content (content dirs that may not exist yet never break the build)"
    - "immutable-per-content binaries CacheFirst with bounded expiration; their JSON manifest NetworkFirst — freshness via the map, cheapness via the blobs"

key-files:
  created: []
  modified:
    - app/scripts/sync-content.mjs
    - app/vite.config.ts

key-decisions:
  - "Audio expiration bounds set to maxEntries 300 / 30 days (T-02-11): regenerated audio keeps the same non-hashed path, so staleness is bounded rather than eliminated — accepted residual for a personal app"
  - "No .m4a in globPatterns (T-02-12): audio enters the SW cache only on first tap, never at SW install"
  - "Skipped requirements mark-complete: TTS-01/TTS-02 already [x] Complete from Phase 1 in shared REQUIREMENTS.md (same call as plans 02-01/02-02)"

patterns-established:
  - "Cache-policy split for generated media: binary CacheFirst (rule first), manifest NetworkFirst (rule later) — reuse for any future pre-generated asset type"

requirements-completed: [TTS-01, TTS-02]

# Metrics
duration: ~10 min execution + human checkpoint (deploy + on-device verification)
completed: 2026-07-07
---

# Phase 02 Plan 03: Build/cache delivery + audible verification Summary

**npm run build now ships content/audio (10 Kyoko .m4a + manifest) in dist and the SW caches .m4a CacheFirst ahead of the generic /content/ NetworkFirst rule — verified audible on a real Android with NO ja-JP voice installed, closing the phase goal: pronunciation no longer depends on device voices**

## Performance

- **Duration:** ~10 min execution (Task 1) + human checkpoint (Pages deploy + on-device listening)
- **Started:** 2026-07-07 (Task 1 by prior executor)
- **Task 1 committed:** 2026-07-07T09:47:53Z
- **Checkpoint approved:** 2026-07-07 (~09:55Z, live GitHub Pages build)
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- `app/scripts/sync-content.mjs` (D-08): appends an `existsSync`-guarded recursive `cpSync` of `content/audio/` -> `app/public/content/audio/` after the classes copy. Without this, the script's own rm-rf of `app/public/content/` would DELETE the audio on every build — audio would vanish from every deploy. Guard means repos/branches without generated audio still build clean.
- `app/vite.config.ts` (D-06): new `content-audio` CacheFirst runtime-caching rule for `/content/audio/*.m4a`, inserted as the FIRST element of `runtimeCaching` — the pre-existing generic `/content/` NetworkFirst rule also matches audio paths and Workbox takes the first match. `audio/index.json` does not end in `.m4a`, so the manifest falls through and stays NetworkFirst (new audio appears on refresh). Expiration `maxEntries: 300, maxAgeSeconds: 30d` bounds staleness (T-02-11). `globPatterns` byte-unchanged — zero audio in the precache (T-02-12).
- Build verified: `npm run build` green (73/73 tests remained green); `dist/content/audio/2026-04-14/` contains exactly 10 `.m4a` + `dist/content/audio/index.json`; `dist/sw.js` compiles the `content-audio` rule and precaches zero audio URLs.
- Deployed and verified live: Pages run 28857242894 SUCCESS; `content/audio/index.json` -> 200 `application/json`; `content/audio/2026-04-14/2026-04-14_vocab_tabemasu.m4a` -> 200 `audio/mp4` (5311 bytes).

## Task Commits

1. **Task 1: sync-content copies audio + CacheFirst .m4a runtime cache rule, verified by build** - `b814ae2` (feat) — executed in a worktree by the prior executor, merged to main via `6faf537`
2. **Task 2: Hear the pre-generated Kyoko audio in the browser (checkpoint:human-verify)** - no commit (verification only) — APPROVED

## Files Created/Modified

- `app/scripts/sync-content.mjs` - existsSync-guarded copy of canonical content/audio into app/public at build time
- `app/vite.config.ts` - content-audio CacheFirst runtime cache (first in runtimeCaching), globPatterns untouched

## Checkpoint Verification Results (phase-closing)

Verified by the user on the deployed GitHub Pages build, on an **Android device WITHOUT any ja-JP voice installed** — the exact device class this phase exists for:

- Word audio for 食べます audible (Kyoko .m4a, not a device voice — the device has none)
- Example sentence plays a DISTINCT, longer clip (word vs example use separate files)
- Perfil shows exactly: "Audio de pronunciación incluido con el contenido de clase."
- No auto-play observed anywhere — playback only on tap (TTS-02 invariant preserved)

**Outcome: APPROVED.** The original problem is demonstrably solved: pronunciation plays from committed static files, independent of device voices.

## Decisions Made

- Kept the plan-specified 30-day/300-entry expiration on the audio cache as the accepted T-02-11 residual: re-recorded audio at the same path can be up to 30 days stale, which is fine for a personal app where kana edits are rare and re-processing is human-driven.
- Skipped `requirements mark-complete` for TTS-01/TTS-02 — both already `[x]` Complete (Phase 1) in the shared REQUIREMENTS.md; re-marking would be no-op churn on an orchestrator-owned artifact (same decision as plans 02-01 and 02-02).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None — both must-have artifacts are fully wired to real data (canonical audio dir, live manifest).

## Threat Flags

None — the new surface (SW cache -> app serving unvalidated cached .m4a; build pipeline -> dist copy) is exactly the plan's threat register (T-02-11 mitigated with bounded expiration + residual accepted; T-02-12 mitigated by keeping globPatterns audio-free).

## Authentication Gates

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 02 is COMPLETE: skill generates audio (02-01), app plays it with Web Speech fallback (02-02), build/SW deliver and cache it, and playback is human-verified on a voiceless device (02-03).
- New classes need zero app changes: the skill writes .m4a + manifest entries into canonical content/audio/, sync-content copies them at build, the NetworkFirst manifest surfaces them on refresh, and CacheFirst picks up each binary on first tap.
- Worktree note: STATE.md/ROADMAP.md untouched per single-writer contract; orchestrator owns post-wave sync.

## Self-Check: PASSED

- Both key files verified on main: `grep -c "existsSync(audioSrc)" app/scripts/sync-content.mjs` = 1; first runtimeCaching handler in app/vite.config.ts is `'CacheFirst'`; `content-audio` present once; globPatterns line byte-identical to Phase 1
- Task 1 commit `b814ae2` verified in git log (merged via `6faf537`)
- Live deploy probes: manifest 200 application/json; sample .m4a 200 audio/mp4 (5311 bytes); Pages run 28857242894 SUCCESS
- Human checkpoint APPROVED (Android without ja-JP voice)

---
*Phase: 02-tts-por-audio-pre-generado-en-la-skill*
*Completed: 2026-07-07*

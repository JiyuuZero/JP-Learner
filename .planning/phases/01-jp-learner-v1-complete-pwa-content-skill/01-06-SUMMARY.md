---
phase: 01-jp-learner-v1-complete-pwa-content-skill
plan: 06
subsystem: ui
tags: [tts, web-speech, speechsynthesis, gamification, react, github-actions, github-pages, pwa, deploy]

# Dependency graph
requires:
  - phase: 01-02 (PWA shell)
    provides: vite base '/JP-Learner/', vite-plugin-pwa autoUpdate + NetworkFirst content JSON, HashRouter shell
  - phase: 01-04 (progress store)
    provides: ProgressContext, ProgressMeta (streakCount/points/lastActiveDay), day.ts bumpStreak, SrsRecord
  - phase: 01-05 (display + exercises + session)
    provides: Session with {scope, subMode} params, Flashcard/Glosario speaker slots, hybrid session frame
provides:
  - Web Speech ja-JP TTS wrapper (initTTS voice detection incl. Android ja_JP underscore + voiceschanged + poll; speakJa tap-only, silent no-op without voice)
  - TtsContext provider + SpeakerButton (hidden — not disabled — when no ja-JP voice)
  - Gamification derivations: progressPercent (Review-state / reviewable universe), addPoints (monotonic, never decrements)
  - Home dashboard: greeting + points pill + streak + progress % + Continuar card + Hoy/Semana/Total x Repaso SRS/Repasar periodo launchers + Reto de hoy tiles
  - GitHub Actions Pages deploy (gen:types -> copy:content -> build -> 404.html fallback -> upload/deploy-pages), live at https://jiyuuzero.github.io/JP-Learner/
affects: [verification, v2-adaptive, deploy-maintenance]

# Tech tracking
tech-stack:
  added: []  # native Web Speech API + official GitHub actions only; no new npm dependencies
  patterns:
    - "TTS: module-level jaVoice singleton + context provider exposing {hasVoice, speak}; speaker UI hidden app-wide when hasVoice===false"
    - "Deploy: build chain gen:types -> copy:content -> tsc -b -> vite build; content copied from repo root into app/public/content at build time"
    - "Points are monotonic: addPoints ignores zero/negative deltas so no caller can ever reduce them"

key-files:
  created:
    - app/src/tts/tts.ts
    - app/src/tts/TtsContext.tsx
    - app/src/components/SpeakerButton.tsx
    - app/src/progress/gamification.ts
    - .github/workflows/deploy.yml
    - README.md
  modified:
    - app/src/views/Home.tsx
    - app/src/exercises/Flashcard.tsx
    - app/src/views/Glosario.tsx
    - app/src/views/Perfil.tsx
    - app/src/app.tsx
    - app/package.json
  deleted:
    - app/src/display/SpeakerSlot.tsx  # Plan 05 null stub, superseded by SpeakerButton at every mount point

key-decisions:
  - "SpeakerSlot.tsx (Plan 05's null stub) deleted after every mount point was replaced with SpeakerButton"
  - "Build chain is gen:types -> copy:content -> tsc -b -> vite build; old prebuild hook folded into explicit copy:content step"
  - "configure-pages keeps enablement: true even though GITHUB_TOKEN cannot CREATE a Pages site on a user repo — harmless once the site exists, self-documents intent"
  - "Repo remote uses a fine-grained PAT scoped to the single repo (Contents+Workflows RW), configured only in this repo's origin URL"

patterns-established:
  - "TTS gating: hasVoice===false hides (never disables) all speaker UI; speakJa is a silent no-op — a non-Japanese voice is never used (T-06-04)"
  - "Live-URL verification is the acceptance gate for deploy changes; localhost cannot exercise base-path/SW/404 behavior"

requirements-completed: [TTS-01, TTS-02, GAM-01, GAM-02, GAM-03, UI-03, PWA-04]

# Metrics
duration: 3h 48m (≈30 min execution + checkpoint wait for live deploy verification)
completed: 2026-07-07
---

# Phase 01 Plan 06: TTS + Gamification + GitHub Pages Deploy Summary

**On-demand ja-JP Web Speech TTS with hidden-button no-voice fallback, non-punitive gamification (streak/points/progress %) on the Home dashboard with Continuar + scope launchers, and a verified live GitHub Pages deploy at https://jiyuuzero.github.io/JP-Learner/**

## Performance

- **Duration:** 3h 48m wall clock (Tasks 1-2 ≈ 30 min; remainder was the Task 3 live-deploy human-verify checkpoint: Pages enablement + user verification)
- **Started:** 2026-07-07T01:59:17Z (first task commit)
- **Completed:** 2026-07-07T05:47:26Z (checkpoint resolved, finalization)
- **Tasks:** 3/3 (2 auto + 1 human-verify checkpoint, resolved "approved" with 2 items pending)
- **Files modified:** 13 (6 created, 6 modified, 1 deleted)

## Accomplishments

- **TTS (TTS-01/02):** `initTTS(onReady)` detects a ja-JP voice (matches `/ja[-_]JP/i` for Android's `ja_JP` underscore), listens to `voiceschanged`, and polls ~250ms up to 8x for WebViews that never fire the event. `speakJa(text)` runs only inside tap handlers (iOS gesture requirement), sets `lang='ja-JP'`, `rate=0.9`, cancel-then-speak — and returns early as a silent no-op if no ja-JP voice exists (never a wrong voice). `TtsContext` exposes `{hasVoice, speak}`; `SpeakerButton` renders `null` (hidden, not disabled) when `hasVoice===false`. Wired into Flashcard's Pronunciación bar and Glosario item detail; never auto-plays.
- **Gamification (GAM-01/02/03):** `progressPercent` = count of non-kanji SRS records in FSRS `Review` state / (vocabById.size + grammarById.size), with divide-by-zero guard and 100% cap. `addPoints` ignores zero/negative deltas — points only ever increase. Streak reuses Plan 04's local-calendar `bumpStreak` (SRS-04 day semantics).
- **Home dashboard (UI-03):** greeting "¡Hola!" + avatar + golden points pill, flame streak ("{n} días"), indigo global progress indicator, dark #30303C "Continuar donde lo dejaste" card launching the automatic hybrid session (D-01), Hoy·Semana·Total segmented control + Repaso SRS / Repasar periodo sub-modes navigating to Session with `{scope, subMode}` (D-02), and "Reto de hoy" pastel tiles.
- **Deploy (PWA-04):** `.github/workflows/deploy.yml` — push-to-main + workflow_dispatch, minimal permissions (`pages: write`, `id-token: write`, `contents: read`), concurrency group `pages`, node 20, `npm ci` → `npm run build` (gen:types → copy:content → vite build) → `cp dist/index.html dist/404.html` → upload-pages-artifact(`app/dist`) → deploy-pages. README documents monorepo layout, local dev, deploy flow, `/JP-Learner/` base path, and the skill workflow.

## Task Commits

Each task was committed atomically:

1. **Task 1: TTS wrapper + SpeakerButton + gamification + Home dashboard** - `3ae41e8` (feat)
2. **Task 2: GitHub Actions deploy + 404 fallback + content-copy build + README** - `f376387` (feat)
3. **Task 3: checkpoint resolution (orchestrator-side deploy fixes)** - `bf209be` (fix: configure-pages `enablement: true`), `6fff9b3` (chore: empty commit to re-trigger after manual Pages enable)

Tasks 1-2 were merged to main via worktree merge commit `ed32ffe`.

## Files Created/Modified

- `app/src/tts/tts.ts` - Web Speech wrapper: `initTTS` (voice detect + voiceschanged + poll) and `speakJa` (tap-only, silent no-op without ja-JP voice)
- `app/src/tts/TtsContext.tsx` - Provider calling initTTS on mount; exposes `{hasVoice, speak}`
- `app/src/components/SpeakerButton.tsx` - Tap-to-speak button (lucide volume-2); renders null when no voice
- `app/src/progress/gamification.ts` - `progressPercent` + monotonic `addPoints`
- `app/src/views/Home.tsx` - Full dashboard per UI-SPEC (greeting, streak, points, progress %, Continuar, scope/sub-mode launchers, Reto de hoy)
- `app/src/exercises/Flashcard.tsx` / `app/src/views/Glosario.tsx` - Speaker slots replaced with `<SpeakerButton>`
- `app/src/views/Perfil.tsx` - TTS availability status line (deviation, see below)
- `app/src/app.tsx` - TtsContext wired into provider tree
- `app/package.json` - `copy:content` script; build = `gen:types && copy:content && tsc -b && vite build`
- `.github/workflows/deploy.yml` - Pages build + deploy with 404 SPA fallback
- `README.md` - Monorepo layout, local dev, deploy, base path, skill pointer
- `app/src/display/SpeakerSlot.tsx` - DELETED (Plan 05 null stub superseded)

## Decisions Made

- **SpeakerSlot.tsx deleted:** Plan 05's null stub was removed once every mount point used `SpeakerButton` directly — no dangling placeholder component.
- **Build chain made explicit:** `gen:types → copy:content → tsc -b → vite build`; the old `prebuild` hook was folded into the explicit `copy:content` step so CI and local builds run the identical chain.
- **`enablement: true` kept in configure-pages:** it cannot create the Pages site with the default GITHUB_TOKEN on a user repo, but it is harmless once the site exists and documents intent for repo transfers.
- **Repo access via fine-grained PAT:** scoped to the single `JiyuuZero/JP-Learner` repo (Contents + Workflows RW), configured only in this repo's origin URL — no global credential.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Perfil gained the TTS availability status line**
- **Found during:** Task 1 (TTS wiring)
- **Issue:** UI-SPEC §4 / TTS-02 requires a "Pronunciación no disponible en este dispositivo." status surface; the 01-05 SUMMARY deferred it to Plan 06 but it was absent from this plan's file list
- **Fix:** Added the TTS availability status line to `app/src/views/Perfil.tsx`, driven by `TtsContext.hasVoice`
- **Files modified:** app/src/views/Perfil.tsx
- **Verification:** Build + typecheck pass; line renders based on hasVoice
- **Committed in:** `3ae41e8` (Task 1 commit)

**2. [Rule 2 - Missing Critical] initTTS guards missing speechSynthesis**
- **Found during:** Task 1 (TTS wrapper)
- **Issue:** In environments without the Web Speech API (very old browsers / non-DOM), referencing `speechSynthesis` would crash the provider on mount
- **Fix:** `initTTS` checks `typeof speechSynthesis === 'undefined'` and reports `onReady(false)` (no-voice) instead of crashing — all speaker UI stays hidden
- **Files modified:** app/src/tts/tts.ts
- **Verification:** Build + typecheck pass; guard is first statement of initTTS
- **Committed in:** `3ae41e8` (Task 1 commit)

### Checkpoint-resolution fixes (orchestrator-side, Task 3)

**3. [Rule 3 - Blocking] First deploy run failed: Pages site did not exist**
- **Issue:** The repo had no git remote initially. The user designated `https://github.com/JiyuuZero/JP-Learner` (access via fine-grained PAT in origin URL only). The first Actions run failed at `actions/configure-pages@v5` because the Pages site had never been created.
- **Fix attempt 1:** Commit `bf209be` added `enablement: true` to configure-pages — still failed with "Create Pages site failed. Error: Resource not accessible by integration": the default GITHUB_TOKEN cannot CREATE a Pages site on a user repo. `enablement: true` was kept anyway (harmless once the site exists).
- **Resolution:** The user enabled Settings → Pages → Source: GitHub Actions manually; empty commit `6fff9b3` re-triggered the workflow; run 28844094943 completed SUCCESS (build ✓ deploy ✓).
- **Files modified:** .github/workflows/deploy.yml
- **Committed in:** `bf209be`, `6fff9b3`

---

**Total deviations:** 3 (2 auto-fixed Rule 2 during Task 1; 1 Rule 3 blocking resolved during checkpoint with one manual user step)
**Impact on plan:** All fixes necessary for correctness (no-crash TTS init, spec-required status line) and for the deploy to exist at all. No scope creep.

## Checkpoint Results (Task 3: live-URL human-verify)

**User response: "approved"** — with two items explicitly pending (see below).

Live URL: **https://jiyuuzero.github.io/JP-Learner/**

### Verified — automated (orchestrator)

| Check | Result |
|-------|--------|
| App shell | HTTP 200 |
| `manifest.webmanifest` | HTTP 200 |
| `sw.js` | HTTP 200 |
| `content/index.json` | HTTP 200 |
| `content/classes/2026-04-14.json` | HTTP 200 |
| Unknown path | Serves app-shell HTML via 404.html fallback (HTTP status 404 with app content — correct GitHub Pages SPA fallback semantics) |

### Verified — human (user, on device)

| Checkpoint item | Result |
|-----------------|--------|
| 1. App loads (Home dashboard: greeting/streak/points/Continuar) | PASS |
| 2. Hard refresh on nested route `#/glosario` | PASS |
| 3. PWA install + standalone launch | PASS |
| 4. Offline practice session after one online load | PASS |

### PENDING — not yet verified (recorded, NOT claimed complete)

| Checkpoint item | Status | Reason |
|-----------------|--------|--------|
| 5. New class appears without hard refresh (NetworkFirst content JSON, PWA-03 freshness) | **PENDING** | User deferred to their next real class — no new class content to commit yet |
| 6. On-device TTS: ja-JP voice speaks Japanese / no-voice devices hide speaker buttons | **PENDING** | User has no ja-JP voice installed on their Android device yet. TTS code paths are unit/build-verified but NOT device-verified |

TTS-02 is marked complete in REQUIREMENTS.md with an explicit note that on-device verification is pending.

## Issues Encountered

- GITHUB_TOKEN cannot create a Pages site on a user repo even with `enablement: true` — one-time manual enable (Settings → Pages → Source: GitHub Actions) was required before the first deploy could succeed. Documented above; not recurring.

## User Setup Required

None beyond what was completed during the checkpoint: GitHub Pages source is enabled and the fine-grained PAT is configured in this repo's origin URL. Two at-home verifications remain for the user (items 5 and 6 above) — no code changes expected.

## Next Phase Readiness

- **Phase 1 is complete: all 6 plans have SUMMARYs.** The full JP-Learner v1 product is shippable and live at https://jiyuuzero.github.io/JP-Learner/.
- All 43 v1 requirements are implemented; 41 fully verified. Two live-behavior checks remain pending on the user's side: NetworkFirst new-class freshness (item 5, verifiable at the next real class) and on-device ja-JP TTS (item 6, once a ja-JP voice is installed). If either fails, plan a follow-up fix — the code paths are in place and build-verified.
- Suggested next step: `/gsd-verify-work 1` for phase verification, then milestone completion.

## Self-Check: PASSED

- All 6 created files exist on disk (tts.ts, TtsContext.tsx, SpeakerButton.tsx, gamification.ts, deploy.yml, README.md); `app/src/display/SpeakerSlot.tsx` confirmed deleted.
- Commits `3ae41e8`, `f376387`, `bf209be`, `6fff9b3` all present in history (`git log --all --grep="01-06"` + merge `ed32ffe`).
- REQUIREMENTS.md: 7 plan requirements marked complete (TTS-01, TTS-02, GAM-01, GAM-02, GAM-03, UI-03, PWA-04); TTS-02 annotated as pending on-device verification.

---
*Phase: 01-jp-learner-v1-complete-pwa-content-skill*
*Completed: 2026-07-07*

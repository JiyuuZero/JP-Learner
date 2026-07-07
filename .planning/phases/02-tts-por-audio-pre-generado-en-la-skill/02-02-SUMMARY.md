---
phase: 02-tts-por-audio-pre-generado-en-la-skill
plan: 02
subsystem: ui
tags: [tts, react, html-audio, web-speech, manifest, vitest]

# Dependency graph
requires:
  - phase: 02-tts-por-audio-pre-generado-en-la-skill (plan 01)
    provides: "content/audio/index.json manifest contract (files: key->path, word=item.id, example=`${item.id}:example`) + 10 committed .m4a for sample class 2026-04-14"
  - phase: 01-jp-learner-v1-complete-pwa-content-skill
    provides: "tts.ts Web Speech wrapper (speakJa silent no-op), TtsContext provider, SpeakerButton hide-never-disable, store.ts BASE_URL fetch pattern"
provides:
  - "app/src/tts/audio.ts: exampleKey, parseAudioManifest (T-02-07 allowlist), loadAudioManifest (never rejects — 404/HTML-200/network -> {}), singleton playAudio/stopAudio"
  - "TtsContext extended: speak(text, audioKey?) fallback chain audio -> Web Speech, audioReady + hasAudio(key), manifest loaded once at boot"
  - "SpeakerButton audioKey prop with chain-aware hide condition (audio for THIS item OR ja-JP voice)"
  - "Flashcard/Glosario callsites pass distinct manifest keys (id vs id:example, vocab only); Perfil three-state combined status"
affects: [02-03 (sync-content audio copy + PWA runtime caching of .m4a — the live human checkpoint)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "fallback chain in context speak(): pre-generated audio first, Web Speech tail (speakJa no-ops -> never a wrong voice)"
    - "manifest fetch that never rejects: !res.ok -> {}, try/catch around fetch+json for the GitHub Pages HTML-as-200 SPA fallback"
    - "path allowlist regex on manifest values before URL construction (/^audio\\/[A-Za-z0-9_\\-/]+\\.m4a$/)"
    - "module-singleton HTMLAudioElement mirroring the jaVoice singleton in tts.ts"

key-files:
  created:
    - app/src/tts/audio.ts
    - app/src/tts/audio.test.ts
  modified:
    - app/src/tts/TtsContext.tsx
    - app/src/components/SpeakerButton.tsx
    - app/src/exercises/Flashcard.tsx
    - app/src/views/Glosario.tsx
    - app/src/views/Perfil.tsx

key-decisions:
  - "loadAudioManifest wraps the ENTIRE fetch (not just res.json()) in try/catch so the boot promise can never reject — offline/network failure also degrades to an empty map"
  - "TDD RED commit includes a throwing signatures-only stub of audio.ts so tests fail on behavior (not module-not-found)"
  - "Skipped requirements mark-complete: TTS-01/TTS-02 already [x] Complete from Phase 1 in shared REQUIREMENTS.md (same call as plan 02-01 — no no-op churn on orchestrator artifact)"

patterns-established:
  - "audioKey prop convention: item.id for the word, exampleKey(item.id) for its example, undefined for grammar/kanji (Web Speech only, D-04)"
  - "Perfil three-state pronunciation status strings are the Plan 03 checkpoint contract (exact D-05 strings)"

requirements-completed: [TTS-01, TTS-02]

# Metrics
duration: 8 min
completed: 2026-07-07
---

# Phase 02 Plan 02: App-side audio playback fallback chain Summary

**SpeakerButton now plays skill-generated Kyoko .m4a via a boot-loaded, allowlist-validated audio manifest, falling back to Web Speech ja-JP and hiding only when neither exists — TTS-02 invariants (never wrong voice, never auto-play, hide-never-disable) preserved verbatim**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-07T09:34:29Z
- **Completed:** 2026-07-07T09:41:56Z
- **Tasks:** 2 (Task 1 TDD: RED + GREEN)
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments

- `app/src/tts/audio.ts` (80 lines): `exampleKey` (`${itemId}:example`), pure `parseAudioManifest` with the T-02-07 path allowlist (drops `..` traversal, external URLs, non-.m4a, non-string values; malformed documents -> `{}`), `loadAudioManifest` that never rejects (D-03: 404 is not an error; T-02-06: GitHub Pages SPA fallback serving HTML with HTTP 200 caught via try/catch), and singleton `playAudio`/`stopAudio` (speechSynthesis.cancel() + pause/rewind before each play; rejected `play()` degrades silently).
- `app/src/tts/audio.test.ts` (8 tests, vitest): 1 for exampleKey + 7 for parseAudioManifest — full suite 73/73 green.
- `TtsContext` loads the manifest once at boot and exposes `speak(text, audioKey?)` implementing the D-05 chain (audio file -> speakJa; speakJa already no-ops without a ja-JP voice so the chain can never end in a wrong voice), plus `audioReady`/`hasAudio(key)`. `tts.ts` byte-untouched.
- `SpeakerButton` gained the optional `audioKey` prop; hide condition is now chain-aware (`hasAudio(audioKey) || hasVoice`), both render variants/aria-labels/classNames unchanged, playback still only inside the tap gesture.
- Callsites wired: Flashcard word (x2) + example pass `item.id` / `exampleKey(item.id)` for vocab only (kanji/grammar -> undefined, Web Speech per D-04); Glosario detail modal passes both keys; Matching/MultipleChoice/Typing/WordBank/Guardados/Session untouched. Perfil shows the three-state combined status with the exact D-05 strings.

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD RED): failing tests for key derivation + manifest parsing** - `40f10ca` (test)
2. **Task 1 (TDD GREEN): audio.ts implementation + TtsContext chain** - `507f793` (feat) — no REFACTOR commit needed (implementation minimal on first pass)
3. **Task 2: SpeakerButton audioKey + callsites + Perfil status** - `0616462` (feat)

## Files Created/Modified

- `app/src/tts/audio.ts` - manifest parse/load (fail-safe), singleton HTMLAudioElement playback
- `app/src/tts/audio.test.ts` - pure-function suite (T-02-06/T-02-07 cases)
- `app/src/tts/TtsContext.tsx` - manifest boot load, speak(text, audioKey?) chain, audioReady/hasAudio
- `app/src/components/SpeakerButton.tsx` - audioKey prop, chain-aware hide condition
- `app/src/exercises/Flashcard.tsx` - vocab-only audioKey on word (front/back) + example speakers
- `app/src/views/Glosario.tsx` - detail modal word + example audioKeys
- `app/src/views/Perfil.tsx` - three-state pronunciation status (audio incluido / voz del sistema / no disponible)

## Decisions Made

- `loadAudioManifest` wraps the whole fetch in try/catch (plan asked only for `res.json()`): a network rejection while offline would otherwise reject the boot promise inside the provider effect. Superset of the plan's requirement, satisfies the "app boots with no error" must-have truth.
- TDD RED commit ships a throwing signatures-only stub of `audio.ts` so the 8 tests fail on behavior ("not implemented") rather than a missing-module transform error.
- Skipped `requirements mark-complete` for TTS-01/TTS-02 — both already `[x]` Complete (Phase 1) in the shared REQUIREMENTS.md; re-marking would be no-op churn on an orchestrator-owned artifact (same decision as plan 02-01).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None — the empty-map returns in `audio.ts` are the specified fail-safe behavior (D-03/T-02-06), not placeholders; all callsites are wired to real manifest data.

## Threat Flags

None — all security-relevant surface introduced (manifest fetch, manifest-value URL construction, tap-gated playback) is covered by the plan's threat register (T-02-06..T-02-09) with mitigations implemented and unit-tested.

## Authentication Gates

None.

## TDD Gate Compliance

- RED gate: `40f10ca` `test(02-02): ...` — 8/8 tests failed on thrown "not implemented" (right reason, not imports)
- GREEN gate: `507f793` `feat(02-02): ...` — 8/8 pass, full suite 73/73
- REFACTOR: skipped (no cleanup needed; tests green on first implementation)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-03 (wave 3) can now: extend `sync-content.mjs` to copy `content/audio/` (this plan verified the served URL shape live by copying manually into the gitignored `app/public/content/audio/`), add the CacheFirst .m4a runtime-caching rule, and run the human checkpoint (Glosario -> 食べます -> Pronunciación fetches `content/audio/2026-04-14/2026-04-14_vocab_tabemasu.m4a` — verified returning 200 audio/mp4 on the dev server).
- Missing-manifest degradation verified against the real dev-server failure mode: Vite (like GitHub Pages) serves the SPA HTML fallback with HTTP 200 for the absent JSON — exactly the T-02-06 path handled by try/catch + shape validation.
- Worktree note: STATE.md/ROADMAP.md untouched per single-writer contract; orchestrator owns post-wave sync.

## Self-Check: PASSED

- All 7 key files verified present on disk (audio.ts 80 lines, audio.test.ts 66 lines, TtsContext, SpeakerButton, Flashcard, Glosario, Perfil)
- All 3 commits verified in git log (40f10ca, 507f793, 0616462)
- Plan-level verification: `npm run test` 73/73 green; `npx tsc -b` + `npm run lint` exit 0; live dev-server spot check (manifest 200 application/json with 10 entries; exact playAudio URL 200 audio/mp4 5311 bytes); missing-manifest -> HTML-200 handled; no file deletions across plan commits; working tree clean; `app/src/tts/tts.ts` diff empty

---
*Phase: 02-tts-por-audio-pre-generado-en-la-skill*
*Completed: 2026-07-07*

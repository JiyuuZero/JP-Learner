---
phase: 02-tts-por-audio-pre-generado-en-la-skill
verified: 2026-07-07T10:11:35Z
status: passed
score: 14/14 must-haves verified
overrides_applied: 0
---

# Phase 2: TTS por audio pre-generado en la skill — Verification Report

**Phase Goal:** Sustituir la dependencia de voces del dispositivo: la skill genera audio japonés localmente (say -v Kyoko) por ítem y lo committea como ficheros estáticos; la app lo reproduce (offline, idéntico en todos los dispositivos) con Web Speech como fallback, sin romper el schema congelado (manifiesto sidecar). Además, el contrato de la skill se extiende a entrada flexible (multi-audio por clase, texto complementario/standalone autoritativo) sin cambios de schema.
**Verified:** 2026-07-07T10:11:35Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | generate-audio on sample class produces exactly 10 .m4a (5 words + 5 examples) under content/audio/2026-04-14/ | ✓ VERIFIED | `ls` lists exactly the 10 expected filenames; commit `147b458` contains exactly those 10 + manifest, nothing else |
| 2   | Re-run with unchanged kana regenerates nothing and rewrites no manifest bytes | ✓ VERIFIED | Ran twice live: both print `AUDIO 2026-04-14 generated=0 skipped=10 deleted=0`; `git status --porcelain content/` empty after both runs (zero byte churn) |
| 3   | content/audio/index.json maps every word key and example key to an existing path | ✓ VERIFIED | Programmatic check: 10/10 expected keys present, 0 broken paths, kanaHash of たべます recomputed and matches manifest |
| 4   | commit-class commits .m4a + audio manifest with explicit pathspec, never sweeping unrelated files | ✓ VERIFIED | commit-class.mjs:50-52 existsSync-guarded `audioPaths`, :88 add, :91-92 diff --cached, :101 `git commit ... '--', classRel, indexRel, ...audioPaths`; commit `147b458` = exactly 11 paths all under content/audio/; live re-run prints `NO CHANGES 2026-04-14` |
| 5   | SKILL.md documents six-step pipeline incl. audio generation, multi-audio merge, text-only input; schema and validator untouched | ✓ VERIFIED | SKILL.md: "The 6 steps (invariant sequence)", "### 5. Generate audio", "### 6. Write + commit", "Run once per audio file", "A class may be created from text only"; structure.md: "one or more whisper.cpp JSON transcripts", "AUTHORITATIVE over the transcript", dedupe rule (§6); `git log 3616237^..HEAD -- content/schema/ skill/validate.mjs` empty; `node skill/validate.mjs` prints `VALID 2026-04-14` |
| 6   | Tapping the speaker on an item with pre-generated audio plays the .m4a (not Web Speech) | ✓ VERIFIED | speak() (TtsContext.tsx:55-61) tries `playAudio(manifest, audioKey)` first and returns on success; SpeakerButton.tsx:30 `speak(text, audioKey)` inside tap handler; human checkpoint heard Kyoko clips on an Android with NO ja-JP voice (orchestrator-confirmed) |
| 7   | Item without audio but with ja-JP voice falls back to Web Speech exactly as before | ✓ VERIFIED | playAudio returns false when key absent (audio.ts:59-61) → speakJa(text); app/src/tts/tts.ts untouched since Phase 1 (last commit `3ae41e8`) |
| 8   | With neither audio nor voice the button stays hidden (never disabled), never a non-JA voice | ✓ VERIFIED | SpeakerButton.tsx:25-26 `canSpeak = (audioKey !== undefined && hasAudio(audioKey)) \|\| hasVoice; if (!canSpeak) return null`; chain tail speakJa is a silent no-op without ja-JP voice |
| 9   | Missing manifest (404 or HTML-as-200) → app boots with empty audio map, no error | ✓ VERIFIED | loadAudioManifest (audio.ts:41-49): try/catch around whole fetch, `!res.ok → {}`; parseAudioManifest shape+allowlist validation covered by 8 vitest tests incl. HTML-string and array cases; suite 73/73 green |
| 10  | Perfil reflects the combined pronunciation state (three-state) | ✓ VERIFIED | Perfil.tsx:112-116 exact D-05 strings ("Audio de pronunciación incluido…" / "Voz japonesa disponible…" / "Pronunciación no disponible…") driven by `audioReady`/`hasVoice` from useTts; string confirmed exact on device at checkpoint |
| 11  | npm run build copies content/audio into dist; built app serves the 10 sample .m4a | ✓ VERIFIED | Ran `npm run build` live: `dist/content/audio/2026-04-14/` has 10 .m4a + `dist/content/audio/index.json`; live deploy probes 200 application/json + 200 audio/mp4 (orchestrator-confirmed, Pages run 28857242894) |
| 12  | .m4a requests hit CacheFirst listed BEFORE the generic /content/ NetworkFirst rule | ✓ VERIFIED | vite.config.ts:31-44 audio rule is runtimeCaching[0]; compiled dist/sw.js: `content-audio` at idx 1548 < `content-json` at idx 1735, CacheFirst before NetworkFirst |
| 13  | audio/index.json stays NetworkFirst; .m4a NOT in SW precache | ✓ VERIFIED | Audio rule predicate requires `.endsWith('.m4a')` so the manifest falls through to NetworkFirst; `grep -c 'content/audio/2026-04-14' dist/sw.js` = 0; globPatterns unchanged (`js,css,html,woff2,png,svg`); precache = 10 entries, 346 KiB, no audio |
| 14  | User has heard the pre-generated Kyoko audio via the speaker button (tap only) | ✓ VERIFIED | Blocking human checkpoint APPROVED on an Android WITHOUT ja-JP voice: word + distinct example clips audible, Perfil string exact, no auto-play (orchestrator-verified fact, documented in 02-03-SUMMARY.md) |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `skill/generate-audio.mjs` | say -v Kyoko → ffmpeg M4A, manifest upsert, orphan deletion, public copy (min 80 lines) | ✓ VERIFIED | 173 lines; validateClass import+call, Kyoko preflight, classId + filename allowlist guards, kana via temp file (`say -f`), execFileSync arg arrays only (no execSync), kanaHash skip, orphan+manifest pruning, sorted-key deterministic write, public copy |
| `content/audio/index.json` | sidecar manifest with audioVersion, files, kanaHashes | ✓ VERIFIED | audioVersion 1, 10 files entries, 10 kanaHashes, keys sorted; committed in `147b458` |
| `content/audio/2026-04-14/*.m4a` | 10 committed sample audio files | ✓ VERIFIED | All 10 present, committed; ffprobe: every file mono (ch=1), durations 0.29s–2.42s (all > 0.2s) |
| `skill/commit-class.mjs` | audio pathspec extension | ✓ VERIFIED | audioPaths used in add/diff/commit, existsSync-guarded, explicit `--` pathspec |
| `skill/SKILL.md` | 6-step contract with "### 5. Generate audio" + flexible input | ✓ VERIFIED | All required anchors present; no stale "five steps" framing; Kyoko one-time-setup check added |
| `skill/prompts/structure.md` | multi-transcript merge + authoritative user text | ✓ VERIFIED | "one or more whisper.cpp JSON transcripts", "Read the sources", authoritative-text rule, dedupe rule, 3-command pipeline order (validate → generate-audio → commit-class) |
| `app/src/tts/audio.ts` | exampleKey, parseAudioManifest, loadAudioManifest, playAudio, stopAudio (min 40 lines) | ✓ VERIFIED | 81 lines; all 5 exports present with exact signatures; T-02-07 allowlist regex; BASE_URL playback URL |
| `app/src/tts/audio.test.ts` | pure-function tests (min 25 lines) | ✓ VERIFIED | 67 lines, 8 tests (1 exampleKey + 7 parseAudioManifest); part of the 73/73 green suite |
| `app/src/tts/TtsContext.tsx` | manifest state + speak(text, audioKey?) with audioReady | ✓ VERIFIED | Extended interface, boot-load effect, chain speak, hasAudio, audioReady; provider mounted in app.tsx:52 |
| `app/src/components/SpeakerButton.tsx` | audioKey prop + chain-aware hide | ✓ VERIFIED | audioKey optional prop, hide-never-disable comment preserved, both render variants intact |
| `app/scripts/sync-content.mjs` | guarded audio copy at build | ✓ VERIFIED | `existsSync(audioSrc)`-guarded recursive cpSync after classes copy; survives its own rm-rf (proven by live build) |
| `app/vite.config.ts` | content-audio CacheFirst rule first in runtimeCaching | ✓ VERIFIED | Rule is array element 0; maxEntries 300 / 30d expiration; globPatterns byte-unchanged |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| generate-audio.mjs | validate.mjs | `import { validateClass }` fail-closed first | ✓ WIRED | audio.ts... generate-audio.mjs:12 import, :43 call before any generation |
| generate-audio.mjs | say / ffmpeg | execFileSync arg arrays (no shell) | ✓ WIRED | `execFileSync('say', ...)` ×2 (:52 preflight, :108 generation), `execFileSync('ffmpeg', ...)` :111; zero execSync |
| commit-class.mjs | content/audio | explicit git pathspec | ✓ WIRED | audioPaths in add (:88), diff --cached (:91-92), commit `--` pathspec (:101) |
| SpeakerButton.tsx | TtsContext.tsx | `useTts().speak(text, audioKey)` in tap handler | ✓ WIRED | :24 destructure, :30 exact call inside onActivate |
| TtsContext.tsx | audio.ts | loadAudioManifest on mount + playAudio in speak | ✓ WIRED | :12 import, :44 boot effect, :57 chain call |
| Flashcard.tsx | audio.ts | exampleKey(item.id) for example speaker | ✓ WIRED | :9 import, :149 example callsite; word keys at :112/:130 (vocab-only) |
| Glosario.tsx | audio.ts | item.id + exampleKey(item.id) | ✓ WIRED | :103 word, :116 example |
| audio.ts | /content/audio/*.m4a | `new Audio(BASE + 'content/' + path)` | ✓ WIRED | :10 `import.meta.env.BASE_URL`, :69 URL construction; paths resolve to real committed files |
| sync-content.mjs | app/public/content/audio | existsSync-guarded cpSync | ✓ WIRED | :18-19; dist output proves the copy survives the rm-rf |
| vite.config.ts | sw.js runtime caching | runtimeCaching[0] = .m4a CacheFirst | ✓ WIRED | Compiled into dist/sw.js with content-audio before content-json |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| TtsContext.tsx | `manifest` state | loadAudioManifest → fetch content/audio/index.json | Yes — committed manifest with 10 real entries pointing to 10 real committed .m4a | ✓ FLOWING |
| SpeakerButton.tsx | `audioKey` prop | Flashcard/Glosario callsites pass real item.id / exampleKey(item.id) | Yes — IDs from real class JSON match manifest keys 1:1 | ✓ FLOWING |
| Perfil.tsx | `audioReady` | `Object.keys(manifest).length > 0` from boot-loaded manifest | Yes — true on any device once manifest loads (verified live: exact string shown on device) | ✓ FLOWING |
| playAudio URL | `manifest[key]` | allowlist-validated manifest values | Yes — live deploy probe returned 200 audio/mp4 (5311 bytes) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Idempotent regeneration | `node skill/generate-audio.mjs content/classes/2026-04-14.json` ×2 | `AUDIO 2026-04-14 generated=0 skipped=10 deleted=0` both runs; content/ byte-clean | ✓ PASS |
| Manifest integrity | node script: expected keys vs manifest vs disk + kanaHash recompute | 10/10 keys, 0 broken paths, hash match | ✓ PASS |
| commit-class idempotence | `node skill/commit-class.mjs content/classes/2026-04-14.json` | `NO CHANGES 2026-04-14 (already up to date)`, exit 0, no commit created | ✓ PASS |
| Validator intact | `node skill/validate.mjs content/classes/2026-04-14.json` | `VALID 2026-04-14` | ✓ PASS |
| Audio format | ffprobe all 10 files | mono (ch=1), durations 0.29–2.42s, all > 0.2s | ✓ PASS |
| App test suite | `npm test` (app/) | 73/73 passed (7 files) incl. 8 new audio tests | ✓ PASS |
| Typecheck | `npx tsc -b` (app/) | exit 0 | ✓ PASS |
| Production build | `npm run build` (app/) | Green; dist has 10 .m4a + audio manifest; sw.js compiles content-audio rule; 0 precached audio URLs; precache 10 entries / 346 KiB | ✓ PASS |
| SW rule order | index scan of dist/sw.js | content-audio (1548) before content-json (1735); CacheFirst before NetworkFirst | ✓ PASS |
| Claimed commits exist | git log for 3616237, cc33639, 147b458, 6b20340, 40f10ca, 507f793, 0616462, b814ae2, 6faf537 | All 9 present with matching messages | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| TTS-01 | 02-01, 02-02, 02-03 | Pronunciación japonesa a demanda (botón, nunca auto-play) — strengthened: pre-generated audio, device-independent | ✓ SATISFIED | Playback tap-only (onActivate handler); checkpoint confirmed no auto-play; still `[x]` Complete / Phase 1 in traceability (no re-mark, as instructed) |
| TTS-02 | 02-02, 02-03 | TTS degrada con gracia sin voz ja-JP (nunca voz no japonesa) — strengthened: audio works even with zero voices | ✓ SATISFIED | Chain ends in speakJa no-op; hide-never-disable preserved; generation-side Kyoko preflight mirrors the invariant; traceability row intact |
| SKILL-02 | 02-01 | Skill estructura transcripción en JSON válido — strengthened: multi-transcript merge + authoritative user text | ✓ SATISFIED | structure.md extended (N transcripts, text-only, dedupe rule) with zero schema/validator changes; traceability row intact |
| SKILL-05 | 02-01 | Contrato fijo y documentado — strengthened: invariant 6-step sequence | ✓ SATISFIED | SKILL.md 6-step contract with audio step; human-in-the-loop mandatory in every input mode; traceability row intact |

No orphaned requirements: REQUIREMENTS.md maps no IDs to "Phase 2" (all four IDs are pre-existing v1 requirements correctly left as Phase 1 / Complete — the phase brief explicitly required no re-marking).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | No TODO/FIXME/stub/placeholder patterns in any phase-modified file | — | Grep hits were false positives (Spanish word "todo" in Perfil copy; HTML `placeholder` attribute on the Glosario search input) |

Advisory context: 02-REVIEW.md recorded 0 Critical / 5 Warning / 6 Info findings (e.g. WR-01 Web Speech does not stop a playing .m4a in the reverse direction; WR-02 non-injective key→filename edge case; IN-01 playAudio returns true before playback outcome is known). None contradicts a must-have truth; all are committed as advisory follow-ups.

### Human Verification Required

None outstanding. The phase's single human-dependent truth (audible Kyoko playback, tap-only, on a device without ja-JP voices) was executed as Plan 03's blocking checkpoint and APPROVED during the phase on the deployed GitHub Pages build (Android without any ja-JP voice), confirmed by the orchestrator.

### Gaps Summary

No gaps. All 14 must-have truths across the 3 plans are verified against the actual codebase: the skill generates fail-closed, idempotent Kyoko audio committed via explicit pathspec; the app implements the audio → Web Speech → hidden fallback chain with the manifest loaded fail-safe at boot; the build ships audio in dist with CacheFirst .m4a caching ahead of the generic NetworkFirst rule and zero precache bloat; the frozen schema and validator are untouched since Phase 1; the skill contract now covers multi-audio and authoritative text input as documentation-only changes. The originating problem (no ja-JP voice on the user's Android) is closed by an approved on-device human checkpoint.

---

_Verified: 2026-07-07T10:11:35Z_
_Verifier: Claude (gsd-verifier)_

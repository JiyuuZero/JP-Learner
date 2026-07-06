# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-06)

**Core value:** Practicar de forma efectiva (repetición espaciada + recuerdo activo) exactamente el contenido dado en clase, con la mínima fricción para expandirlo clase a clase.
**Current focus:** Phase 1 — JP-Learner v1 (complete PWA + content skill)

## Current Position

Phase: 1 of 1 (JP-Learner v1 — complete PWA + content skill)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-07-06 — Roadmap created (single-phase milestone, 37/37 requirements mapped)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: — min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 0 | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Single phase, execution in Fable 5 — hard constraint (time + token budget); overrides coarse 3-5 default.
- Schema-first build order: freeze `content.schema.json` before any consumer (top anti-scope-balloon guardrail).
- Persistence + SRS is the Core-Value guardrail: export/import + `persist()` + migrations ship in the first release, never after.
- No in-app Japanese NLP: readings are authoritative schema data (per-word + per-kanji `tokens[]`); computing them teaches wrong kanji.
- Stack: Vite 8 + React 19 + TS 5.9 + Tailwind 4 (CSS-first) + `idb` + `ts-fsrs` + `vite-plugin-pwa`; skill uses `whisper.cpp` large-v3.

### Pending Todos

None yet.

### Blockers/Concerns

Research flags to watch during planning/execution:
- Per-kanji `tokens[]` reliability (Mode B linchpin) — validate against a real vocab sample incl. okurigana before freezing schema; fallback = word-level ruby.
- Real ES/JA transcription quality (large-v3) unbenchmarked — spot-check a real class clip; human-in-the-loop verification is the safety net.
- SRS local-midnight day-boundary is a policy choice — test with clock fast-forward across midnight + timezone offset.
- iOS evicts IndexedDB after 7 days without interaction — `persist()` + verified export/import round-trip must ship in v1.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-07-06 22:40
Stopped at: ROADMAP.md and STATE.md created; REQUIREMENTS.md traceability updated (37/37 mapped to Phase 1).
Resume file: None

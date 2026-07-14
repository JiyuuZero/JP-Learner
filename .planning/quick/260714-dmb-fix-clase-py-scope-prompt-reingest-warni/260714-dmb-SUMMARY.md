---
quick_id: 260714-dmb
slug: fix-clase-py-scope-prompt-reingest-warni
status: complete
date: 2026-07-14
---

# Summary — Scope clase.py to this run's files

## What changed (`clase.py`)

- `intake()` now returns `copiados` (files added this invocation).
- New helpers:
  - `_fecha_en_nombre(nombre)` — first valid ISO date embedded in a filename.
  - `fuentes_de_ejecucion(copiados, pending)` → `(audios_run, notas_run)`: this
    run's new audios (copiados ∪ pending, minus `.wav` intermediates) and notes.
  - `transcripts_de(audios)` → the `<name>.json` transcripts for those audios.
  - `transcripts_para_prompt(audios_run, notas_run, transcripts_all,
    note_files_all, fecha)` → this run's transcripts+notes; **fallback** when
    nothing new was added = transcripts/notes whose filename date == `fecha`
    (relaunch on an already-transcribed class). Never the whole cache.
- `avisos_reingesta` docstring clarified; both call sites now pass ONLY this run's
  added files.
- CLI `main`: accumulates `copiados` from `intake`; scopes warning + prompt; prints
  "Nada nuevo que procesar para la clase {fecha}" instead of dumping the cache.
- GUI `procesar_en_hilo`: same scoping (inits `copiados = []`, uses
  `fuentes_de_ejecucion` / `transcripts_para_prompt`).

## Why

The user drops only the NEW class each session; `audio-src/` caches prior ones.
Before, `discover()` returned every cached transcript, so (a) Claude was handed all
past classes to reprocess and (b) the re-ingest warning fired every run. Now both are
scoped to what was actually added this run.

## Verification

`scratchpad/test_scope.py` — 10/10 checks pass:
- drop only the new 07-13 audio → prompt lists ONLY the new transcript, NO false warning;
- re-adding a committed prior class's audio → warning DOES fire;
- empty re-run → date-fallback picks only the fecha-matching transcript, not the cache;
- text-only class → note carried, no transcripts.
Plus `ast.parse` syntax check.

## Notes

Fix landed on top of pre-existing uncommitted `clase.py` work (the re-ingest guard
itself + an unrelated GUI calendar picker), all uncommitted since 2026-07-12. Commit
strategy confirmed with the user before committing.

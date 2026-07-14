---
quick_id: 260714-dmb
slug: fix-clase-py-scope-prompt-reingest-warni
description: "Fix clase.py: scope structuring prompt + re-ingest warning to the files added in the current run, not the whole audio-src/ cache"
status: in-progress
date: 2026-07-14
---

# Quick Task 260714-dmb — Scope clase.py to this run's files

## Problem

`clase.py` enumerates the WHOLE `audio-src/` cache every run:
- `discover()` returns `transcripts = sorted(AUDIO_SRC.glob("*.json"))` (all cached transcripts).
- `build_prompt` lists all of them → Claude is handed every past class to reprocess.
- `avisos_reingesta` is called with every cached transcript's name → "Ya hay una clase
  procesada para el día X" fires on EVERY run.

`audio-src/` intentionally caches past audio; the user only drops the NEW class each time.
The tool must scope to what was added THIS run.

## Approach (single file: `clase.py`)

1. `intake()` returns `copiados` (the files actually added this invocation; from
   `copiar_a_audio_src`).
2. New helper `fuentes_de_ejecucion(copiados, pending)` → `(audios_run, notas_run)`:
   the new audios (copiados audios ∪ pending = not-yet-transcribed) and notes added
   this run; excludes ffmpeg `.wav` intermediates.
3. New helper `transcripts_de(audios)` → the `<name>.json` transcripts for those audios.
4. New helper `transcripts_para_prompt(audios_run, notas_run, transcripts_all,
   note_files_all, fecha)` → this run's transcripts+notes; **fallback** when nothing
   new was added (legit relaunch on an already-transcribed class): transcripts/notes
   whose filename-embedded date == `fecha`. NEVER the whole cache.
5. Scope `avisos_reingesta` to `audios_run + notas_run` names only (CLI `main` + GUI
   `procesar_en_hilo`).
6. Both flows build the prompt from the scoped transcripts; if nothing scoped and no
   inline notes → "nada nuevo que procesar" instead of dumping the cache.

## Verify

- Simulate `audio-src/` with cached old-class transcripts + one new-dated file; assert
  the built prompt lists ONLY the new transcript and `avisos_reingesta` returns [] (no
  false warning).
- Assert the warning DOES fire when a file dated like a committed prior class is among
  THIS run's added files.
- `python3 -c "import ast; ast.parse(open('clase.py').read())"` (syntax) + import smoke.

## Commit note

`clase.py` carries ~272 lines of pre-existing uncommitted work (the re-ingest guard
itself + an unrelated GUI calendar picker). Surface commit strategy to the user before
committing — do not silently bundle unrelated work into a misleading message.

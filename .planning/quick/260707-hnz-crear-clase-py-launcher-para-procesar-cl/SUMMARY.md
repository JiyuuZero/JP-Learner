---
phase: quick
plan: 01
subsystem: skill
tags: [python, launcher, whisper, claude-cli, cli, tkinter, gui, applescript, ux]

# Dependency graph
requires:
  - phase: 01-jp-learner-v1-complete-pwa-content-skill
    provides: "skill/transcribe.sh (contrato de transcripción local), skill/SKILL.md (contrato de 6 pasos), skill/validate.mjs, skill/commit-class.mjs"
  - phase: 02-tts-por-audio-pre-generado-en-la-skill
    provides: "skill/generate-audio.mjs (paso 5 del prompt: audio TTS + re-commit)"
provides:
  - "clase.py CLI: preflight ES, intake drag & drop al terminal (posicional + interactivo con shlex), discovery incremental, transcripción local streaming, prompt de estructuración, os.execvp claude interactivo"
  - "clase.py --gui: ventana tkinter (ficheros, apuntes, fecha, modelo, log en vivo) que procesa en hilo y abre la sesión de claude sola en Terminal.app vía osascript (prompt por fichero)"
  - "Procesar Clase.app (doble clic → GUI), regenerable con skill/make-app.sh; el bundle está gitignorado"
  - "models/ y Procesar Clase.app/ en .gitignore (el modelo whisper de ~3GB nunca puede acabar en git)"
  - "SKILL.md documenta clase.py (terminal drag & drop y doble clic) como entrada recomendada"
affects: [skill, content-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Launcher stdlib-only en la raíz del repo con os.chdir(Path(__file__).parent) para ser ejecutable desde cualquier cwd"
    - "subprocess.run/Popen con ARRAY de argumentos + os.execvp — filenames y prompt son DATOS, jamás shell=True"
    - "Discovery incremental por convención de nombres: <audio>.json = transcript, <audio>.wav con stem-de-audio = intermedio"
    - "GUI: widgets leídos en el hilo principal, trabajo en threading.Thread, marshaling a UI vía root.after"
    - "AppleScript sin datos: el prompt viaja por fichero temporal; solo ruta validada y modelo whitelisted entran al script"

key-files:
  created: [clase.py, skill/make-app.sh]
  modified: [.gitignore, skill/SKILL.md]

key-decisions:
  - "Claude se lanza SIEMPRE interactivo (CLI: os.execvp; GUI: Terminal.app vía osascript) — la revisión humana del paso 3 de SKILL.md es obligatoria, jamás headless"
  - "Transcripción ANTES de lanzar Claude reutilizando skill/transcribe.sh tal cual, sin reimplementar ffmpeg/whisper"
  - "Orden del prompt fijado por el usuario: estructurar → revisión humana → validate → commit → audio TTS → re-commit → push"
  - "Intake fail-closed: cualquier ruta inválida aborta sin copiar nada; dedupe por contenido (filecmp) y sufijo numérico en colisiones"
  - "Procesar Clase.app es artefacto de build local (gitignorado); se commitea solo skill/make-app.sh que lo regenera"

patterns-established:
  - "Preflight fail-fast en castellano: acumula TODOS los fallos y los imprime juntos con hint de arreglo por dependencia"
  - "Edge cases sin fricción: audio-src/ vacío → prompt de arrastre (EOF = salida limpia exit 0); todo-ya-transcrito → input() [S/n]"

requirements-completed: [LR-1, LR-2, LR-3, LR-4, LR-5]

# Metrics
duration: 17min
completed: 2026-07-07
---

# Quick Task 01: clase.py launcher Summary

**Launcher stdlib-only con tres entradas — CLI de un comando con drag & drop al terminal, GUI tkinter y app de doble clic — que transcribe la clase en local (incremental, streaming) y deja al usuario dentro de una sesión interactiva de Claude con el prompt de estructuración de SKILL.md ya cargado**

## Performance

- **Duration:** 17 min
- **Started:** 2026-07-07T10:48:27Z
- **Completed:** 2026-07-07T11:05:13Z
- **Tasks:** 5 (2 del plan + 3 extensiones de alcance pedidas por el usuario)
- **Files modified:** 4

## Accomplishments

- clase.py CLI (LR-1..LR-4): preflight ES con hints → intake drag & drop (args posicionales y prompt interactivo parseado con shlex; fail-closed, dedupe por contenido, sufijo numérico en colisiones) → discovery incremental → transcripción local vía skill/transcribe.sh (streaming, aborta con mensaje claro) → prompt de estructuración (SKILL.md desde el paso 3, multi-transcript merge, notas autoritativas, revisión humana obligatoria, validate→commit→audio→re-commit→push) → os.execvp claude SIEMPRE interactivo
- clase.py --gui: ventana tkinter con lista de ficheros (filedialog multi-select + quitar selección + drop best-effort), apuntes, fecha, modelo (opus/sonnet/haiku) y log en vivo; procesa en un hilo y abre la sesión de claude sola en Terminal.app vía osascript — el prompt viaja por audio-src/.prompt.txt (gitignorado), jamás interpolado en AppleScript
- Procesar Clase.app generada con osacompile (doble clic → GUI, cero terminal manual); bundle gitignorado, regenerable con `sh skill/make-app.sh` (helper committeado)
- .gitignore: `models/` (el modelo whisper real de 2.9GB dejó de ser committeable — git check-ignore pasa) y `Procesar Clase.app/`
- SKILL.md: sección "## Ejecutar la skill con clase.py" (drag & drop al terminal + doble clic) — los 6 pasos numerados intactos (gate `^### [1-6]\.` = 6)

## Task Commits

Each task was committed atomically:

1. **Task 1: Crear clase.py — launcher completo (LR-1..LR-4)** - `77708f1` (feat)
2. **Task 2: models/ al .gitignore + sección de uso en SKILL.md (LR-5)** - `b70f3c1` (chore)
3. **Task 3 (extensión): drag & drop intake** - `e7e707a` (feat)
4. **Task 4 (extensión): GUI tkinter** - `eefefb2` (feat)
5. **Task 5 (extensión): app de doble clic** - `0e660d8` (feat)

## Files Created/Modified

- `clase.py` - Launcher (CLI + GUI): preflight → intake → discovery incremental → transcripción → prompt → claude interactivo
- `skill/make-app.sh` - Regenera "Procesar Clase.app" vía osacompile (do shell script → python3 clase.py --gui)
- `.gitignore` - `models/` y `Procesar Clase.app/` (artefactos locales jamás en git)
- `skill/SKILL.md` - Sección "## Ejecutar la skill con clase.py" (terminal drag & drop y doble clic; 6 pasos intactos)

## Decisions Made

- Claude siempre interactivo: CLI vía os.execvp; GUI abriendo Terminal.app (la revisión humana necesita TTY) — headless prohibido
- Prompt con "N grabaciones" literal según la plantilla exacta del plan (solo se rellenan listas y placeholders)
- El launcher reutiliza skill/transcribe.sh tal cual (array de argumentos, sin shell=True) — cero reimplementación de ffmpeg/whisper (T-quick-01)
- GUI thread-safety: los widgets se leen en el hilo principal antes de lanzar el worker; el log/errores vuelven vía root.after
- Drop nativo en la GUI es best-effort (tkinterdnd2 si está instalado; bind Tk>=9 si no): el hint solo se muestra si el registro funciona; los botones siempre están

## Deviations from Plan

### Scope extensions (user-requested via coordinator)

**1. Drag & drop intake (Task 3, `e7e707a`)** — args posicionales + intake interactivo con shlex; fail-closed con errores ES; EOF en stdin tratado como entrada vacía (preserva el gate hermético original exit 0).

**2. GUI tkinter (Task 4, `eefefb2`)** — `--gui` aditivo, CLI intacta; intake/preflight refactorizados en helpers compartidos no-exiting (`clasificar_rutas`, `copiar_a_audio_src`, `preflight_fallos`).

**3. App de doble clic (Task 5, `0e660d8`)** — skill/make-app.sh + bundle gitignorado + docs.

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] EOFError sin manejar en input()**
- **Found during:** Task 3 (intake interactivo)
- **Issue:** con stdin cerrado (test hermético, pipes) `input()` lanzaba traceback en vez de salir limpio
- **Fix:** EOF = entrada vacía en el prompt de arrastre (exit 0) y = "n" en el prompt [S/n] (no se lanza una sesión interactiva sin TTY)
- **Files modified:** clase.py
- **Verification:** test hermético A (audio-src vacío, stdin /dev/null) exit 0 con "Nada que procesar"
- **Committed in:** e7e707a

**2. [Rule 1 - Bug] Orden de log incorrecto con stdout en pipe**
- **Found during:** Task 3 (test C)
- **Issue:** las cabeceras "=== Transcribiendo ===" aparecían tras el output del subproceso por el block-buffering de Python
- **Fix:** sys.stdout.flush() antes de cada subprocess.run en transcribe_pending
- **Files modified:** clase.py
- **Verification:** re-run del suite hermético
- **Committed in:** e7e707a

---

**Total deviations:** 3 scope extensions (coordinator-directed) + 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** las extensiones amplían la entrada (drag & drop, GUI, doble clic) sin tocar el contrato de la skill ni los gates del plan original — todos siguen pasando.

## Verification Results

1. `python3 clase.py --help` exit 0 con `--modelo`/`--notas`/`--fecha`/`--gui` y menciona "arrastra" — PASS
2. Test hermético A (stubs en PATH, audio-src/ vacío, stdin EOF): exit 0, "Nada que procesar", claude NO invocado — PASS
3. Test hermético B: `python3 clase.py /tmp/no-existe.m4a` exit 1 con error claro en castellano — PASS
4. Test hermético C: dos rutas entrecomilladas (con espacios) por stdin → ambas copiadas a audio-src/ y flujo completo hasta claude (stub) — PASS
5. Greps: `os.execvp`>=1, `shell=True`=0, patrón headless=0, `transcribe.sh`>=1, `ffmpeg -`=0, `shlex`>=1, `tkinter`>=1, `osascript`>=1 — PASS
6. `git check-ignore` de models/ggml-large-v3.bin y de "Procesar Clase.app" — PASS
7. SKILL.md: sección única "## Ejecutar la skill con clase.py" y 6 pasos numerados intactos — PASS
8. GUI smoke (CLASE_GUI_SMOKE=1): abre y cierra limpio, exit 0 — PASS
9. Unit test del AppleScript (osascript monkeypatched): el prompt NUNCA entra al script (viaja por audio-src/.prompt.txt), modelo inválido rechazado con ValueError — PASS
10. osadecompile del .app: `do shell script "cd '<repo>' && '/opt/homebrew/bin/python3' clase.py --gui >/dev/null 2>&1 &"` — PASS

## Human-Verify Notes

- **Drop nativo en la GUI:** tkinterdnd2 no está instalado y el bind `<<Drop:File>>` de Tk 9 es best-effort — no verificable sin un arrastre real. Si no funciona, la GUI degrada a "Añadir ficheros…" (siempre operativo). Verificar arrastrando un fichero a la lista.
- **Apertura de Terminal.app:** el osascript real (permiso de Automatización de macOS incluido) no se ejecutó en los tests (stubbed); primera ejecución real puede pedir permiso "controlar Terminal".
- **Flujo end-to-end real** (audio real → whisper → sesión Claude) pendiente de la primera clase nueva.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: automation | clase.py (abrir_claude_en_terminal) | Nueva superficie no contemplada en el threat model del plan: osascript controla Terminal.app. Mitigado: el prompt viaja por fichero (jamás interpolado en AppleScript), modelo validado por whitelist/regex, ruta del repo validada (rechaza `"` y `\\`). |
| threat_flag: build-artifact | skill/make-app.sh | osacompile embebe la ruta absoluta del repo en el .app; el bundle está gitignorado y se regenera en local, no sale de la máquina. |

## Issues Encountered

None

## User Setup Required

None - no external service configuration required. (Primera apertura de la GUI vía .app puede pedir el permiso de Automatización de macOS para controlar Terminal.)

## Next Phase Readiness

- El pipeline de clase completo tiene ahora tres entradas: `python3 clase.py` (con drag & drop al terminal), `python3 clase.py --gui` y doble clic en Procesar Clase.app
- Pendiente de validación real: primera clase nueva procesada end-to-end con el launcher (ver Human-Verify Notes)

## Self-Check: PASSED

- FOUND: clase.py (compila, todos los gates)
- FOUND: skill/make-app.sh
- FOUND: .gitignore (models/ + Procesar Clase.app/)
- FOUND: skill/SKILL.md (sección launcher, 6 pasos intactos)
- FOUND: commits 77708f1, b70f3c1, e7e707a, eefefb2, 0e660d8

---
*Phase: quick*
*Completed: 2026-07-07*

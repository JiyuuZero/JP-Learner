---
phase: quick
plan: 01
type: execute
autonomous: true
files_modified: [clase.py, .gitignore, skill/SKILL.md]
requirements: [LR-1, LR-2, LR-3, LR-4, LR-5]
must_haves:
  truths:
    - "Con un audio nuevo en audio-src/, `python3 clase.py` lo transcribe en local (streaming visible) y deja al usuario DENTRO de una sesión interactiva de Claude con el prompt de estructuración ya cargado — un solo comando"
    - "Re-ejecutar clase.py NO re-transcribe audios que ya tienen su <nombre>.json (incremental); con transcripts existentes y nada nuevo, ofrece lanzar Claude igualmente"
    - "Con audio-src/ vacío (sin audio, sin notas), clase.py imprime un estado amistoso con instrucciones de uso y NO lanza Claude (exit 0)"
    - "El modelo whisper de ~3GB (models/) nunca puede acabar en git"
    - "Preflight en castellano con hint de arreglo para cada dependencia ausente (ffmpeg, whisper-cli, modelo, claude, audio-src/)"
  artifacts:
    - path: "clase.py"
      provides: "Launcher: preflight -> discovery incremental -> transcripción local -> prompt de estructuración -> os.execvp claude interactivo"
      min_lines: 120
      contains: "execvp"
    - path: ".gitignore"
      provides: "Exclusión del modelo whisper"
      contains: "models/"
    - path: "skill/SKILL.md"
      provides: "Sección '## Ejecutar la skill con clase.py' apuntando al launcher como entrada recomendada (los 6 pasos numerados intactos)"
      contains: "clase.py"
  key_links:
    - from: "clase.py"
      to: "skill/transcribe.sh"
      via: "subprocess.run con ARRAY de argumentos (reutiliza el contrato existente, no reimplementa ffmpeg/whisper)"
      pattern: "transcribe\\.sh"
    - from: "clase.py"
      to: "claude CLI"
      via: "os.execvp — reemplaza el proceso Python, sesión interactiva, jamás -p"
      pattern: "os\\.execvp"
    - from: "clase.py (prompt)"
      to: "skill/SKILL.md"
      via: "el prompt ordena leer SKILL.md y seguir el contrato desde el paso 3"
      pattern: "SKILL\\.md"
---

<objective>
Crear `clase.py` en la raíz del repo: mini-launcher Python (stdlib only) que convierte "he grabado la clase de hoy" en "estoy en una sesión de Claude estructurando el contenido" con un solo comando. Transcribe en local ANTES de lanzar Claude (ahorra tiempo de sesión), es incremental (no re-transcribe), y lanza Claude SIEMPRE interactivo porque la revisión humana del paso 3 de SKILL.md es obligatoria. Además: `models/` al `.gitignore` y una sección breve en skill/SKILL.md documentando el launcher.

Purpose: mínima fricción para expandir el contenido clase a clase — el Core Value del proyecto.
Output: `clase.py`, `.gitignore` actualizado, `skill/SKILL.md` con sección de uso.
</objective>

<context>
@CLAUDE.md
@skill/SKILL.md
@skill/transcribe.sh
@.gitignore

<interfaces>
Contrato de skill/transcribe.sh (reutilizar tal cual, NUNCA reimplementar):
```
sh skill/transcribe.sh <filename>   # <filename> = nombre de fichero (SIN ruta) bajo audio-src/
# escribe: audio-src/<filename>.wav  (intermedio ffmpeg 16kHz — NO es un audio fuente)
#          audio-src/<filename>.json (transcript whisper con detected_language por segmento)
# requiere: ffmpeg y whisper-cli en PATH, models/ggml-large-v3.bin relativo a la raíz del repo
# set -eu: exit != 0 en cualquier fallo
```

Convenciones de descubrimiento derivadas:
- Transcript de `clase.m4a` = `audio-src/clase.m4a.json` (el nombre completo + `.json`).
- Intermedio de `clase.m4a` = `audio-src/clase.m4a.wav` → un `.wav` cuyo *stem* termina en
  otra extensión de audio es un intermedio y NUNCA un audio fuente pendiente.
- Cualquier `*.json` en audio-src/ es un transcript whisper (convención del skill).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Crear clase.py — launcher completo (LR-1..LR-4)</name>
  <files>clase.py</files>
  <read_first>skill/SKILL.md (contrato de 6 pasos + revisión humana obligatoria), skill/transcribe.sh (contrato de transcripción)</read_first>
  <action>
Crear `clase.py` en la raíz del repo. Python 3 stdlib only (`argparse`, `os`, `sys`, `shutil`, `subprocess`, `pathlib`, `datetime`). Shebang `#!/usr/bin/env python3`. Todos los mensajes de usuario en castellano. Estructura con estas funciones y este flujo en `main()` (per LR-3, orden a→e):

**0. Setup:** `os.chdir(Path(__file__).resolve().parent)` como primera línea de main (todas las rutas relativas a la raíz del repo, ejecutable desde cualquier cwd). Constantes: `AUDIO_SRC = Path("audio-src")`, `AUDIO_EXTS = {".m4a", ".mp3", ".wav", ".aac", ".ogg"}` (comparación case-insensitive vía `.lower()`), `MODEL = Path("models/ggml-large-v3.bin")`.

**1. `parse_args()`** — ANTES del preflight (para que `--help` funcione siempre):
- `--modelo`, default `"opus"`, help "modelo para claude --model (se pasa tal cual)" (per LR-3e)
- `--notas`, default `None`, help "notas inline de la clase (texto, autoritativo sobre Whisper)" (per LR-3b)
- `--fecha`, default `datetime.date.today().isoformat()`, help "fecha de la clase YYYY-MM-DD" (per LR-3d)

**2. `preflight()`** (per LR-3a) — acumula TODOS los fallos y los imprime juntos con hint de arreglo, luego `sys.exit(1)` si hay alguno:
- `shutil.which("ffmpeg")` → hint: `brew install ffmpeg`
- `shutil.which("whisper-cli")` → hint: `brew install whisper-cpp`
- `MODEL.exists()` → hint: `sh "$(brew --prefix)/share/whisper-cpp/models/download-ggml-model.sh" large-v3 models`
- `shutil.which("claude")` → hint: instalar Claude Code (https://claude.com/claude-code)
- `AUDIO_SRC.is_dir()` → hint: `mkdir audio-src` y colocar ahí los audios de clase

**3. `discover()`** (per LR-3b) — devuelve `(pending, transcripts, note_files)`:
- `pending`: ficheros en audio-src/ con sufijo en AUDIO_EXTS, EXCLUYENDO los intermedios de transcribe.sh (un `.wav` cuyo `Path(f).stem` tenga a su vez sufijo en AUDIO_EXTS, p.ej. `clase.m4a.wav`), y EXCLUYENDO los que ya tienen transcript: `(AUDIO_SRC / (f.name + ".json")).exists()` → incremental en re-runs.
- `transcripts`: `sorted(AUDIO_SRC.glob("*.json"))` (todos: previos + los que se generen ahora; una clase puede tener N grabaciones y un run abortado deja transcripts válidos).
- `note_files`: `sorted(*.txt y *.md en audio-src/)`.

**4. Edge case "nada que hacer"** (per LR-4): si `pending`, `transcripts` y notas (ficheros + `--notas`) están TODOS vacíos → imprimir mensaje amistoso que empiece por `Nada que procesar` + instrucciones de uso (dejar audios m4a/mp3/wav/aac/ogg y notas .txt/.md en audio-src/ y ejecutar `python3 clase.py`) y `sys.exit(0)`. NO lanzar Claude.

**5. `transcribe_pending(pending)`** (per LR-3c): por cada audio, imprimir cabecera de progreso y ejecutar `subprocess.run(["sh", "skill/transcribe.sh", f.name], check=False)` — ARRAY de argumentos, JAMÁS `shell=True`, JAMÁS reimplementar ffmpeg/whisper (T-quick-01). stdout/stderr heredados (sin capture) → el usuario ve el streaming de whisper en tiempo real. Si `returncode != 0` → mensaje claro en castellano indicando QUÉ fichero falló y abortar con `sys.exit(1)` (per LR-3c). Tras transcribir, re-ejecutar discover() para refrescar la lista de transcripts.

**6. Edge case "todo ya transcrito"** (per LR-4): si `pending` estaba vacío pero hay `transcripts` → listar los transcripts encontrados y ofrecer: `input("¿Lanzar Claude con estos transcripts? [S/n] ")`; si la respuesta empieza por "n" (case-insensitive) → despedirse y `sys.exit(0)`. En el flujo normal (se acaba de transcribir algo, o solo hay notas) NO se pregunta: se lanza directo.

**7. `build_prompt(transcripts, note_files, notas_inline, fecha)`** (per LR-3d) — string en castellano con exactamente este contenido (rellenar las listas):

```
Procesa una clase de japonés para JP-Learner siguiendo EXACTAMENTE el contrato de skill/SKILL.md.

Lee primero skill/SKILL.md completo. Los pasos 1 (Capture) y 2 (Transcribe) YA están hechos: los transcripts de Whisper listados abajo ya existen en disco. Empieza en el paso 3 (Structure) y sigue el contrato hasta el final. No saltes, reordenes ni improvises pasos.

Fecha de la clase: {fecha}

Transcripts de Whisper (léelos TODOS — son N grabaciones de la MISMA clase y se fusionan en UN único JSON de clase, dedupe por slug determinista):
{lista "- audio-src/<nombre>.json" o "(ninguno — clase solo de texto)"}

Notas del usuario (AUTORITATIVAS sobre Whisper en cualquier conflicto — léelas):
{lista "- audio-src/<nombre>" o "(ninguna)"}
Notas inline del usuario:
{texto de --notas o "(ninguna)"}

Pasos obligatorios, en este orden:
1. Estructurar (paso 3 de SKILL.md): produce UN candidate JSON fusionado de la clase.
2. REVISIÓN HUMANA OBLIGATORIA: muéstrame el candidate JSON y espera mis correcciones ANTES de validar. Mis correcciones son autoritativas. No continúes sin mi aprobación explícita.
3. Validar: node skill/validate.mjs <candidate.json> (fail-closed; no escribas nada hasta que pase).
4. Commit: node skill/commit-class.mjs <candidate.json>
5. Audio TTS: node skill/generate-audio.mjs <candidate.json> y después RE-ejecuta node skill/commit-class.mjs <candidate.json> para que el commit incluya el audio generado.
6. git push
```

(Nota: el orden validar→commit→audio→re-commit→push es el especificado por el usuario en LR-3d — commit-class re-valida fail-closed y stagea content/audio/ cuando existe, así que el re-commit del paso 5 recoge el audio.)

**8. `launch_claude(prompt, modelo)`** (per LR-3e): imprimir "Lanzando Claude (modelo {modelo})..." y `os.execvp("claude", ["claude", "--model", modelo, prompt])` — reemplaza el proceso Python, el usuario aterriza directamente en la sesión interactiva. PROHIBIDO `-p`/headless (la revisión humana del paso 2 del prompt es obligatoria) y PROHIBIDO `shell=True`/string de shell (el prompt es DATO, no shell — T-quick-01).
  </action>
  <verify>
    <automated>cd /Users/pol/Documents/Other/JP-Learner && python3 clase.py --help >/tmp/h.txt 2>&1 && grep -q -- --modelo /tmp/h.txt && grep -q -- --notas /tmp/h.txt && grep -q -- --fecha /tmp/h.txt && echo HELP-OK</automated>
  </verify>
  <acceptance_criteria>
- `python3 clase.py --help` exit 0 y muestra `--modelo`, `--notas`, `--fecha`.
- `python3 -m py_compile clase.py` exit 0.
- `grep -c "os.execvp" clase.py` >= 1 (lanzamiento interactivo por reemplazo de proceso).
- `grep -c "shell=True" clase.py` = 0 y `grep -cE '\-p\b.*claude|claude.*" -p"' clase.py` = 0 (nunca shell strings, nunca headless).
- `grep -c "transcribe.sh" clase.py` >= 1 y `grep -c "ffmpeg -" clase.py` = 0 (reutiliza el contrato, no reimplementa ffmpeg).
- Test hermético de audio-src/ vacío (no requiere modelo real ni toca claude de verdad):
  ```sh
  cd /Users/pol/Documents/Other/JP-Learner
  S=$(mktemp -d); for b in ffmpeg whisper-cli claude; do printf '#!/bin/sh\ntouch "%s/$0.ran"\nexit 0\n' "$S" > "$S/$b"; chmod +x "$S/$b"; done
  FAKE_MODEL=0; [ -f models/ggml-large-v3.bin ] || { mkdir -p models; touch models/ggml-large-v3.bin; FAKE_MODEL=1; }
  mkdir -p audio-src
  PATH="$S:$PATH" python3 clase.py > "$S/out.txt" 2>&1; echo "exit=$?"        # esperado: exit=0
  grep -q "Nada que procesar" "$S/out.txt" && echo MSG-OK                      # esperado: MSG-OK
  ls "$S"/*claude.ran 2>/dev/null && echo "FAIL: lanzó claude" || echo NO-LAUNCH-OK
  [ "$FAKE_MODEL" = 1 ] && rm models/ggml-large-v3.bin; rm -rf "$S"
  ```
  Esperado: exit=0, MSG-OK, NO-LAUNCH-OK.
  </acceptance_criteria>
  <done>Un solo `python3 clase.py` lleva de audio-en-disco a sesión interactiva de Claude con transcripts listos; re-runs incrementales; audio-src/ vacío produce mensaje amistoso sin lanzar Claude.</done>
</task>

<task type="auto">
  <name>Task 2: models/ al .gitignore + sección de uso en SKILL.md (LR-5)</name>
  <files>.gitignore, skill/SKILL.md</files>
  <read_first>.gitignore, skill/SKILL.md (secciones "One-time setup" y "The 6 steps" — NO tocar los 6 pasos numerados)</read_first>
  <action>
1. `.gitignore`: añadir bajo el bloque de audio (tras la línea `audio-src/`) un nuevo bloque:
   ```
   # Whisper model (~3GB, downloaded locally — never committed)
   models/
   ```
2. `skill/SKILL.md`: insertar ENTRE la sección `## One-time setup` y `## The 6 steps (invariant sequence)` una sección corta (3-5 líneas) titulada exactamente `## Ejecutar la skill con clase.py` que diga: la forma recomendada de procesar una clase es dejar los audios (m4a/mp3/wav/aac/ogg) y notas opcionales (.txt/.md) en `audio-src/` y ejecutar `python3 clase.py` desde la raíz del repo — hace el preflight, transcribe en local lo pendiente (incremental) y lanza Claude interactivo con el contrato desde el paso 3; flags opcionales `--fecha YYYY-MM-DD`, `--notas "texto"`, `--modelo <m>`. Docs-only: NO alterar el texto de los 6 pasos numerados ni su numeración.
  </action>
  <verify>
    <automated>cd /Users/pol/Documents/Other/JP-Learner && [ "$(grep -c '^models/$' .gitignore)" = 1 ] && grep -q '## Ejecutar la skill con clase.py' skill/SKILL.md && [ "$(grep -cE '^### [1-6]\.' skill/SKILL.md)" = 6 ] && git check-ignore -q models/ggml-large-v3.bin && echo GITIGNORE-DOCS-OK</automated>
  </verify>
  <acceptance_criteria>
- `grep -c "^models/$" .gitignore` = 1.
- `git check-ignore -q models/ggml-large-v3.bin` exit 0 (el modelo de 3GB es inignorable de facto).
- `grep -c "## Ejecutar la skill con clase.py" skill/SKILL.md` = 1.
- `grep -cE "^### [1-6]\." skill/SKILL.md` = 6 (los 6 pasos numerados intactos).
  </acceptance_criteria>
  <done>models/ ignorado por git; SKILL.md documenta clase.py como entrada recomendada sin alterar el contrato de 6 pasos.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| audio-src/ filenames → subprocess | Nombres de fichero controlados por el usuario (potencialmente con espacios, `;`, `$`, `-` inicial) cruzan hacia sh/ffmpeg/whisper |
| notas (.txt/.md/--notas) → prompt de Claude | Texto libre del usuario acaba dentro del prompt de una sesión de agente |
| audio de clase → disco local | Grabaciones de voz personales; el modelo whisper de 3GB podría acabar en git |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | Tampering/EoP | clase.py subprocess + execvp | mitigate | SIEMPRE arrays de argumentos (`subprocess.run([...])`, `os.execvp("claude", [...])`), jamás `shell=True` ni concatenación en strings de shell; el prompt y los filenames son DATOS. Gate: `grep -c "shell=True" clase.py` = 0 |
| T-quick-02 | Tampering | transcribe.sh args | accept | transcribe.sh prefija `audio-src/$1` y usa `-f`/`-i` con el path como valor, por lo que un filename con `-` inicial no se parsea como flag; máquina personal mono-usuario, los ficheros los pone el propio usuario |
| T-quick-03 | Spoofing (prompt injection) | notas del usuario dentro del prompt | accept | Contenido escrito por el propio usuario en su máquina; la sesión de Claude es interactiva con revisión humana obligatoria antes de validar/commitear — el humano es el gate |
| T-quick-04 | Information Disclosure | models/ y audio-src/ en git | mitigate | `models/` añadido a .gitignore (Task 2); `audio-src/` ya está ignorado — ni el audio de clase ni el modelo salen de la máquina. Gate: `git check-ignore models/ggml-large-v3.bin` exit 0 |
| T-quick-05 | DoS | preflight ausente → fallo críptico a mitad de transcripción | mitigate | Preflight fail-fast en castellano con hint de arreglo por dependencia antes de tocar nada (Task 1, paso 2) |
</threat_model>

<verification>
1. `python3 clase.py --help` exit 0 con `--modelo`/`--notas`/`--fecha`.
2. Test hermético (stubs en PATH + modelo fake) con audio-src/ vacío: exit 0, mensaje "Nada que procesar", claude NO invocado.
3. `grep -c "os.execvp" clase.py` >= 1; `grep -c "shell=True" clase.py` = 0.
4. `git check-ignore -q models/ggml-large-v3.bin` exit 0.
5. `grep -cE "^### [1-6]\." skill/SKILL.md` = 6 y sección `## Ejecutar la skill con clase.py` presente.
</verification>

<success_criteria>
- LR-1: clase.py en raíz, stdlib only, corre con `python3 clase.py`.
- LR-2: cero argumentos obligatorios; drop-files-and-run.
- LR-3: preflight ES con hints → discovery incremental → transcripción local streaming vía skill/transcribe.sh → prompt de estructuración (SKILL.md desde paso 3, multi-transcript merge, notas autoritativas, revisión humana, validate→commit→audio→re-commit→push, --fecha) → `os.execvp` claude interactivo con `--modelo` (default opus).
- LR-4: audio-src vacío → mensaje amistoso sin lanzar Claude; todo-ya-transcrito → ofrece lanzar con los transcripts existentes.
- LR-5: `models/` en .gitignore; SKILL.md con sección de uso, 6 pasos intactos.
</success_criteria>

<output>
After completion, create `.planning/quick/260707-hnz-crear-clase-py-launcher-para-procesar-cl/SUMMARY.md`
</output>

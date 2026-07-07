#!/usr/bin/env python3
"""clase.py — launcher de la skill de contenido de JP-Learner.

Convierte "he grabado la clase de hoy" en "estoy en una sesión de Claude
estructurando el contenido" con un solo comando:

    python3 clase.py

Flujo: preflight -> discovery incremental -> transcripción local (streaming
visible) -> prompt de estructuración -> os.execvp de claude en sesión
SIEMPRE interactiva (la revisión humana del paso 3 de skill/SKILL.md es
obligatoria; jamás headless).

Solo stdlib. Todas las rutas son relativas a la raíz del repo (el script
hace chdir a su propio directorio, así que funciona desde cualquier cwd).
"""

import argparse
import datetime
import os
import shutil
import subprocess
import sys
from pathlib import Path

AUDIO_SRC = Path("audio-src")
AUDIO_EXTS = {".m4a", ".mp3", ".wav", ".aac", ".ogg"}
MODEL = Path("models/ggml-large-v3.bin")


def parse_args():
    """Parsea flags ANTES del preflight para que --help funcione siempre."""
    parser = argparse.ArgumentParser(
        description=(
            "Procesa la clase de japonés de hoy: transcribe en local los audios "
            "pendientes de audio-src/ (incremental) y lanza Claude interactivo "
            "con el prompt de estructuración de skill/SKILL.md."
        ),
    )
    parser.add_argument(
        "--modelo",
        default="opus",
        help="modelo para claude --model (se pasa tal cual)",
    )
    parser.add_argument(
        "--notas",
        default=None,
        help="notas inline de la clase (texto, autoritativo sobre Whisper)",
    )
    parser.add_argument(
        "--fecha",
        default=datetime.date.today().isoformat(),
        help="fecha de la clase YYYY-MM-DD",
    )
    return parser.parse_args()


def preflight():
    """Comprueba TODAS las dependencias; imprime los fallos juntos con su hint de arreglo."""
    fallos = []
    if shutil.which("ffmpeg") is None:
        fallos.append(("falta ffmpeg", "brew install ffmpeg"))
    if shutil.which("whisper-cli") is None:
        fallos.append(("falta whisper-cli", "brew install whisper-cpp"))
    if not MODEL.exists():
        fallos.append((
            f"falta el modelo Whisper ({MODEL})",
            'sh "$(brew --prefix)/share/whisper-cpp/models/download-ggml-model.sh" large-v3 models',
        ))
    if shutil.which("claude") is None:
        fallos.append((
            "falta el CLI de claude",
            "instala Claude Code: https://claude.com/claude-code",
        ))
    if not AUDIO_SRC.is_dir():
        fallos.append((
            f"falta el directorio {AUDIO_SRC}/",
            "mkdir audio-src   # y coloca ahí los audios de clase",
        ))
    if fallos:
        print("Preflight fallido — arregla esto antes de continuar:\n")
        for problema, hint in fallos:
            print(f"  ✗ {problema}")
            print(f"    → {hint}")
        sys.exit(1)


def discover():
    """Devuelve (pending, transcripts, note_files) de audio-src/ — incremental.

    - pending: audios fuente SIN transcript todavía. Excluye los intermedios de
      transcribe.sh: un .wav cuyo stem termina a su vez en extensión de audio
      (p. ej. clase.m4a.wav) es un intermedio ffmpeg, NUNCA un audio fuente.
    - transcripts: todos los *.json de audio-src/ (convención de la skill:
      cualquier .json ahí es un transcript de Whisper — previos y nuevos).
    - note_files: notas del usuario (*.txt / *.md).
    """
    pending = []
    for f in sorted(AUDIO_SRC.iterdir()):
        if not f.is_file() or f.suffix.lower() not in AUDIO_EXTS:
            continue
        if f.suffix.lower() == ".wav" and Path(f.stem).suffix.lower() in AUDIO_EXTS:
            continue  # intermedio de transcribe.sh (clase.m4a.wav)
        if (AUDIO_SRC / (f.name + ".json")).exists():
            continue  # ya transcrito — no se re-transcribe en re-runs
        pending.append(f)
    transcripts = sorted(AUDIO_SRC.glob("*.json"))
    note_files = sorted(
        f
        for f in AUDIO_SRC.iterdir()
        if f.is_file() and f.suffix.lower() in {".txt", ".md"}
    )
    return pending, transcripts, note_files


def transcribe_pending(pending):
    """Transcribe cada audio pendiente vía skill/transcribe.sh (streaming visible).

    Reutiliza el contrato existente de la skill — NUNCA reimplementa la llamada
    a ffmpeg/whisper. Argumentos SIEMPRE como array: los nombres de fichero son
    datos, no shell.
    """
    total = len(pending)
    for i, f in enumerate(pending, start=1):
        print(f"\n=== Transcribiendo ({i}/{total}): {f.name} ===\n")
        resultado = subprocess.run(["sh", "skill/transcribe.sh", f.name], check=False)
        if resultado.returncode != 0:
            print(
                f"\nError: la transcripción de '{f.name}' falló "
                f"(exit {resultado.returncode}). Revisa la salida de arriba, "
                "corrige el problema y vuelve a ejecutar python3 clase.py — "
                "los transcripts ya generados se conservan (no se re-transcribe)."
            )
            sys.exit(1)
    print(f"\nTranscripción completada: {total} audio(s).")


def build_prompt(transcripts, note_files, notas_inline, fecha):
    """Construye el prompt de estructuración (contrato de skill/SKILL.md desde el paso 3)."""
    if transcripts:
        lista_transcripts = "\n".join(f"- {t}" for t in transcripts)
    else:
        lista_transcripts = "(ninguno — clase solo de texto)"
    if note_files:
        lista_notas = "\n".join(f"- {n}" for n in note_files)
    else:
        lista_notas = "(ninguna)"
    notas = notas_inline if notas_inline else "(ninguna)"
    return f"""Procesa una clase de japonés para JP-Learner siguiendo EXACTAMENTE el contrato de skill/SKILL.md.

Lee primero skill/SKILL.md completo. Los pasos 1 (Capture) y 2 (Transcribe) YA están hechos: los transcripts de Whisper listados abajo ya existen en disco. Empieza en el paso 3 (Structure) y sigue el contrato hasta el final. No saltes, reordenes ni improvises pasos.

Fecha de la clase: {fecha}

Transcripts de Whisper (léelos TODOS — son N grabaciones de la MISMA clase y se fusionan en UN único JSON de clase, dedupe por slug determinista):
{lista_transcripts}

Notas del usuario (AUTORITATIVAS sobre Whisper en cualquier conflicto — léelas):
{lista_notas}
Notas inline del usuario:
{notas}

Pasos obligatorios, en este orden:
1. Estructurar (paso 3 de SKILL.md): produce UN candidate JSON fusionado de la clase.
2. REVISIÓN HUMANA OBLIGATORIA: muéstrame el candidate JSON y espera mis correcciones ANTES de validar. Mis correcciones son autoritativas. No continúes sin mi aprobación explícita.
3. Validar: node skill/validate.mjs <candidate.json> (fail-closed; no escribas nada hasta que pase).
4. Commit: node skill/commit-class.mjs <candidate.json>
5. Audio TTS: node skill/generate-audio.mjs <candidate.json> y después RE-ejecuta node skill/commit-class.mjs <candidate.json> para que el commit incluya el audio generado.
6. git push"""


def launch_claude(prompt, modelo):
    """Lanza claude en sesión interactiva reemplazando el proceso Python.

    El prompt viaja como ARGUMENTO (dato, nunca string de shell) y la sesión
    es SIEMPRE interactiva: la revisión humana obligatoria del contrato no
    puede ocurrir en modo headless.
    """
    print(f"\nLanzando Claude (modelo {modelo})...")
    sys.stdout.flush()
    os.execvp("claude", ["claude", "--model", modelo, prompt])


def main():
    os.chdir(Path(__file__).resolve().parent)
    args = parse_args()
    preflight()

    pending, transcripts, note_files = discover()
    hay_notas = bool(note_files) or bool(args.notas)

    if not pending and not transcripts and not hay_notas:
        print("Nada que procesar en audio-src/.")
        print()
        print("Cómo usar:")
        print("  1. Deja los audios de la clase (m4a/mp3/wav/aac/ogg) en audio-src/,")
        print("     y opcionalmente notas de la clase en ficheros .txt o .md.")
        print("  2. Ejecuta: python3 clase.py")
        print('     Flags opcionales: --fecha YYYY-MM-DD, --notas "texto", --modelo <m>')
        sys.exit(0)

    if pending:
        print(f"Audios pendientes de transcribir: {len(pending)}")
        for f in pending:
            print(f"  - {f.name}")
        transcribe_pending(pending)
        pending, transcripts, note_files = discover()  # refresca los transcripts nuevos
    elif transcripts:
        print("No hay audios nuevos que transcribir. Transcripts existentes:")
        for t in transcripts:
            print(f"  - {t}")
        respuesta = input("¿Lanzar Claude con estos transcripts? [S/n] ")
        if respuesta.strip().lower().startswith("n"):
            print("De acuerdo, no lanzo nada. ¡Hasta la próxima clase!")
            sys.exit(0)

    prompt = build_prompt(transcripts, note_files, args.notas, args.fecha)
    launch_claude(prompt, args.modelo)


if __name__ == "__main__":
    main()

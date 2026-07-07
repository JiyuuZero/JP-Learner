#!/usr/bin/env python3
"""clase.py — launcher de la skill de contenido de JP-Learner.

Convierte "he grabado la clase de hoy" en "estoy en una sesión de Claude
estructurando el contenido" con un solo comando:

    python3 clase.py            # CLI (admite arrastrar ficheros al terminal)
    python3 clase.py --gui      # interfaz gráfica (o doble clic en Procesar Clase.app)

Drag & drop: arrastra los audios y notas a la ventana del terminal (macOS pega
sus rutas ya escapadas) — bien como argumentos tras `python3 clase.py `, bien
en el prompt interactivo — y el launcher los copia a audio-src/.

Flujo: preflight -> intake (drag & drop) -> discovery incremental ->
transcripción local (streaming visible) -> prompt de estructuración ->
sesión de claude SIEMPRE interactiva (la revisión humana del paso 3 de
skill/SKILL.md es obligatoria; jamás headless). En CLI vía os.execvp; en GUI
abriendo Terminal.app automáticamente.

Solo stdlib. Todas las rutas son relativas a la raíz del repo (el script
hace chdir a su propio directorio, así que funciona desde cualquier cwd).
"""

import argparse
import datetime
import filecmp
import os
import re
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

AUDIO_SRC = Path("audio-src")
AUDIO_EXTS = {".m4a", ".mp3", ".wav", ".aac", ".ogg"}
NOTE_EXTS = {".txt", ".md"}
MODEL = Path("models/ggml-large-v3.bin")
MODELOS_GUI = ("opus", "sonnet", "haiku")


def parse_args():
    """Parsea flags ANTES del preflight para que --help funcione siempre."""
    parser = argparse.ArgumentParser(
        description=(
            "Procesa la clase de japonés de hoy: copia a audio-src/ los ficheros "
            "indicados (o arrastrados), transcribe en local los audios pendientes "
            "(incremental) y lanza Claude interactivo con el prompt de "
            "estructuración de skill/SKILL.md."
        ),
        epilog=(
            "Truco: arrastra los ficheros a la ventana del terminal — tanto\n"
            "después de `python3 clase.py ` en la línea de comandos como en el\n"
            "prompt interactivo — y macOS pega sus rutas ya escapadas.\n"
            "Sin terminal: `python3 clase.py --gui` o doble clic en Procesar Clase.app."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "ficheros",
        nargs="*",
        metavar="FICHERO",
        help=(
            "ficheros de la clase a copiar a audio-src/ (audio m4a/mp3/wav/aac/ogg "
            "o notas .txt/.md); admite arrastrarlos sobre el terminal"
        ),
    )
    parser.add_argument(
        "--gui",
        action="store_true",
        help="abre la interfaz gráfica (añadir ficheros, apuntes, procesar)",
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


def preflight_fallos():
    """Comprueba TODAS las dependencias; devuelve [(problema, hint), ...] sin efectos."""
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
    return fallos


def preflight():
    """CLI: imprime los fallos juntos con su hint de arreglo y sale si hay alguno."""
    fallos = preflight_fallos()
    if fallos:
        print("Preflight fallido — arregla esto antes de continuar:\n")
        for problema, hint in fallos:
            print(f"  ✗ {problema}")
            print(f"    → {hint}")
        sys.exit(1)


def _destino_libre(nombre):
    """Primer destino libre en audio-src/ con sufijo numérico: clase.m4a -> clase-2.m4a."""
    base = Path(nombre)
    n = 2
    while True:
        candidato = AUDIO_SRC / f"{base.stem}-{n}{base.suffix}"
        if not candidato.exists():
            return candidato
        n += 1


def clasificar_rutas(rutas):
    """Separa rutas del usuario en (ficheros válidos, errores) sin efectos."""
    errores = []
    ficheros = []
    for ruta in rutas:
        p = Path(ruta).expanduser()
        if not p.is_file():
            errores.append(f"no existe o no es un fichero: {ruta}")
        elif p.suffix.lower() not in AUDIO_EXTS | NOTE_EXTS:
            errores.append(
                f"extensión no reconocida ({p.suffix or 'sin extensión'}): {ruta} "
                "— se aceptan audios m4a/mp3/wav/aac/ogg y notas .txt/.md"
            )
        else:
            ficheros.append(p)
    return ficheros, errores


def copiar_a_audio_src(ficheros):
    """Copia los ficheros a audio-src/ y devuelve los destinos realmente copiados.

    Mismo nombre con contenido idéntico -> se omite en silencio; con contenido
    distinto -> se desambigua con sufijo numérico.
    """
    AUDIO_SRC.mkdir(exist_ok=True)
    copiados = []
    for p in ficheros:
        destino = AUDIO_SRC / p.name
        if destino.exists():
            if filecmp.cmp(p, destino, shallow=False):
                continue  # contenido idéntico — omitir en silencio
            destino = _destino_libre(p.name)
        shutil.copy2(p, destino)
        copiados.append(destino)
    return copiados


def intake(rutas):
    """CLI: valida y copia a audio-src/ los ficheros indicados/arrastrados.

    Fail-closed: si alguna ruta es inválida no se copia NADA y se sale con
    error claro en castellano.
    """
    ficheros, errores = clasificar_rutas(rutas)
    if errores:
        print("Error en los ficheros indicados — no se ha copiado nada:\n")
        for e in errores:
            print(f"  ✗ {e}")
        sys.exit(1)
    for destino in copiar_a_audio_src(ficheros):
        print(f"  + {destino}")


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
        if f.is_file() and f.suffix.lower() in NOTE_EXTS
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
        sys.stdout.flush()  # que la cabecera preceda al streaming del subproceso
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
    """CLI: lanza claude en sesión interactiva reemplazando el proceso Python.

    El prompt viaja como ARGUMENTO (dato, nunca string de shell) y la sesión
    es SIEMPRE interactiva: la revisión humana obligatoria del contrato no
    puede ocurrir en modo headless.
    """
    print(f"\nLanzando Claude (modelo {modelo})...")
    sys.stdout.flush()
    os.execvp("claude", ["claude", "--model", modelo, prompt])


def abrir_claude_en_terminal(modelo, prompt):
    """GUI: abre Terminal.app con la sesión interactiva de claude (necesita TTY).

    El prompt viaja por FICHERO (audio-src/.prompt.txt, gitignorado con el
    directorio) y JAMÁS se interpola en el AppleScript; en el script solo
    entran la ruta del repo (validada) y el modelo (whitelist/regex).
    Devuelve True si osascript terminó bien.
    """
    if not re.fullmatch(r"[A-Za-z0-9._:-]+", modelo):
        raise ValueError(f"nombre de modelo no válido: {modelo!r}")
    repo = os.getcwd()
    if '"' in repo or "\\" in repo:
        raise ValueError("la ruta del repo contiene caracteres no soportados para AppleScript")
    AUDIO_SRC.mkdir(exist_ok=True)
    (AUDIO_SRC / ".prompt.txt").write_text(prompt, encoding="utf-8")
    orden = (
        f"cd {shlex.quote(repo)} && "
        f'claude --model {modelo} \\"$(cat audio-src/.prompt.txt)\\"'
    )
    script = (
        'tell application "Terminal"\n'
        "  activate\n"
        f'  do script "{orden}"\n'
        "end tell"
    )
    resultado = subprocess.run(["osascript", "-e", script], check=False)
    return resultado.returncode == 0


def run_gui(args):
    """Interfaz gráfica (tkinter, stdlib): añadir/arrastrar ficheros, apuntes,
    fecha y modelo; procesa en un hilo (la UI no se congela) y abre la sesión
    interactiva de claude en Terminal.app automáticamente."""
    try:
        import tkinter as tk
        from tkinter import filedialog, messagebox, ttk
    except Exception as exc:  # tkinter no disponible en este python3
        print(f"No se ha podido cargar tkinter ({exc}).")
        print("Usa el modo CLI: python3 clase.py [ficheros...] — o arrastra ficheros al terminal.")
        sys.exit(1)
    import threading

    staged = []  # rutas elegidas/arrastradas; se copian a audio-src/ al Procesar

    dnd_activo = False
    try:
        from tkinterdnd2 import DND_FILES, TkinterDnD  # opcional, si está instalado
        root = TkinterDnD.Tk()
        dnd_activo = True
    except Exception:
        root = tk.Tk()
    root.title("JP-Learner — Procesar clase")
    root.geometry("580x660")

    # a. Lista de ficheros + botones
    tk.Label(
        root,
        text="Ficheros de la clase (audio m4a/mp3/wav/aac/ogg y notas .txt/.md):",
        anchor="w",
    ).pack(fill="x", padx=10, pady=(10, 2))
    lista = tk.Listbox(root, selectmode="extended", height=7)
    lista.pack(fill="x", padx=10)
    hint = tk.Label(root, text="", anchor="w", fg="#666666")
    hint.pack(fill="x", padx=10)

    def anadir_rutas(rutas):
        ficheros, errores = clasificar_rutas(rutas)
        if errores:
            messagebox.showerror("Ficheros no válidos", "\n".join(errores))
        for p in ficheros:
            if str(p) not in staged:
                staged.append(str(p))
                lista.insert("end", str(p))

    def anadir_dialogo():
        rutas = filedialog.askopenfilenames(
            title="Añadir ficheros de la clase",
            filetypes=[
                ("Clase (audio y notas)", "*.m4a *.mp3 *.wav *.aac *.ogg *.txt *.md"),
                ("Todos los ficheros", "*"),
            ],
        )
        if rutas:
            anadir_rutas(list(rutas))

    def quitar_seleccion():
        for idx in reversed(lista.curselection()):
            staged.pop(idx)
            lista.delete(idx)

    fila_botones = tk.Frame(root)
    fila_botones.pack(fill="x", padx=10, pady=4)
    tk.Button(fila_botones, text="Añadir ficheros…", command=anadir_dialogo).pack(side="left")
    tk.Button(fila_botones, text="Quitar selección", command=quitar_seleccion).pack(side="left", padx=6)

    # b. Drop de ficheros best-effort (tkinterdnd2 si existe; si no, Tk >= 9 nativo)
    def _al_soltar(data):
        try:
            rutas = list(root.tk.splitlist(data))
        except Exception:
            rutas = [data]
        anadir_rutas(rutas)

    if dnd_activo:
        try:
            lista.drop_target_register(DND_FILES)
            lista.dnd_bind("<<Drop>>", lambda e: _al_soltar(e.data))
        except Exception:
            dnd_activo = False
    if not dnd_activo:
        try:
            tk_mayor = int(str(root.tk.call("info", "patchlevel")).split(".")[0])
            if tk_mayor >= 9:
                lista.bind("<<Drop:File>>", lambda e: _al_soltar(e.data))
                dnd_activo = True
        except Exception:
            dnd_activo = False
    if dnd_activo:
        hint.config(text="Arrastra ficheros aquí o usa Añadir ficheros…")

    # c. Apuntes de la clase
    tk.Label(root, text="Apuntes de la clase (opcional):", anchor="w").pack(
        fill="x", padx=10, pady=(8, 2)
    )
    apuntes = tk.Text(root, height=5)
    apuntes.pack(fill="x", padx=10)

    # d. Fecha + modelo
    fila = tk.Frame(root)
    fila.pack(fill="x", padx=10, pady=8)
    tk.Label(fila, text="Fecha:").pack(side="left")
    fecha_var = tk.StringVar(value=args.fecha)
    tk.Entry(fila, textvariable=fecha_var, width=12).pack(side="left", padx=(4, 16))
    tk.Label(fila, text="Modelo:").pack(side="left")
    modelo_var = tk.StringVar(value=args.modelo if args.modelo in MODELOS_GUI else "opus")
    ttk.Combobox(
        fila, textvariable=modelo_var, values=MODELOS_GUI, state="readonly", width=10
    ).pack(side="left", padx=4)

    # e. Procesar + log
    boton = tk.Button(root, text="Procesar clase", font=("", 14, "bold"))
    boton.pack(fill="x", padx=10, pady=(4, 6))
    log = tk.Text(root, height=12, state="disabled", bg="#111111", fg="#dddddd")
    log.pack(fill="both", expand=True, padx=10, pady=(0, 10))

    def log_linea(texto):
        def _append():
            log.config(state="normal")
            log.insert("end", texto + "\n")
            log.see("end")
            log.config(state="disabled")

        root.after(0, _append)

    def error_ui(titulo, mensaje):
        root.after(0, lambda: messagebox.showerror(titulo, mensaje))

    def habilitar_boton():
        root.after(0, lambda: boton.config(state="normal"))

    def procesar_en_hilo(datos):
        try:
            fallos = preflight_fallos()
            if fallos:
                detalle = "\n\n".join(f"{p}\n  → {h}" for p, h in fallos)
                error_ui("Preflight fallido", "Arregla esto antes de continuar:\n\n" + detalle)
                return
            ficheros, errores = clasificar_rutas(datos["staged"])
            if errores:
                error_ui("Ficheros no válidos", "\n".join(errores))
                return
            if ficheros:
                log_linea(f"Copiando {len(ficheros)} fichero(s) a audio-src/…")
                for destino in copiar_a_audio_src(ficheros):
                    log_linea(f"  + {destino}")
            pending, transcripts, note_files = discover()
            if not pending and not transcripts and not note_files and not datos["notas"]:
                log_linea("Nada que procesar: añade audios o apuntes y vuelve a pulsar Procesar clase.")
                return
            total = len(pending)
            for i, f in enumerate(pending, start=1):
                log_linea(f"=== Transcribiendo ({i}/{total}): {f.name} ===")
                proceso = subprocess.Popen(
                    ["sh", "skill/transcribe.sh", f.name],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                )
                for linea in proceso.stdout:
                    log_linea(linea.rstrip())
                if proceso.wait() != 0:
                    error_ui(
                        "Transcripción fallida",
                        f"La transcripción de '{f.name}' falló (exit {proceso.returncode}). "
                        "Los transcripts ya generados se conservan (no se re-transcribe).",
                    )
                    return
            pending, transcripts, note_files = discover()
            prompt = build_prompt(transcripts, note_files, datos["notas"], datos["fecha"])
            if abrir_claude_en_terminal(datos["modelo"], prompt):
                log_linea("Sesión de Claude abierta en Terminal — revisa allí el contenido antes de commitear.")
            else:
                error_ui("Claude", "No se pudo abrir la sesión de Claude en Terminal (osascript falló).")
        except Exception as exc:
            error_ui("Error", str(exc))
        finally:
            habilitar_boton()

    def al_pulsar_procesar():
        boton.config(state="disabled")
        datos = {  # leer widgets AQUÍ (hilo principal): tkinter no es thread-safe
            "staged": list(staged),
            "notas": apuntes.get("1.0", "end").strip() or args.notas,
            "fecha": fecha_var.get().strip() or args.fecha,
            "modelo": modelo_var.get().strip() or "opus",
        }
        threading.Thread(target=procesar_en_hilo, args=(datos,), daemon=True).start()

    boton.config(command=al_pulsar_procesar)

    if os.environ.get("CLASE_GUI_SMOKE"):  # test humo: abrir y cerrar limpio
        root.after(300, root.destroy)
    root.mainloop()


def _imprimir_uso():
    print("Cómo usar:")
    print("  1. Ejecuta: python3 clase.py")
    print("     y arrastra a la ventana del terminal los audios de la clase")
    print("     (m4a/mp3/wav/aac/ogg) y las notas (.txt/.md) — o pásalos como")
    print("     argumentos, o déjalos tú directamente en audio-src/.")
    print('  2. Flags opcionales: --gui, --fecha YYYY-MM-DD, --notas "texto", --modelo <m>')


def main():
    os.chdir(Path(__file__).resolve().parent)
    args = parse_args()
    if args.gui:
        run_gui(args)
        return
    if args.ficheros:
        AUDIO_SRC.mkdir(exist_ok=True)  # el intake crea el directorio si falta
    preflight()
    if args.ficheros:
        intake(args.ficheros)

    pending, transcripts, note_files = discover()
    hay_notas = bool(note_files) or bool(args.notas)

    if not pending and not transcripts and not hay_notas:
        print("Nada que procesar en audio-src/.")
        print()
        try:
            print(
                "Arrastra aquí los audios y apuntes de la clase (o escribe rutas) "
                "y pulsa Enter — o Enter en vacío para salir:"
            )
            linea = input("> ")
        except EOFError:
            linea = ""
        try:
            rutas = shlex.split(linea)  # maneja espacios escapados y comillas del drag
        except ValueError as exc:
            print(f"No he podido interpretar las rutas ({exc}). Vuelve a intentarlo.")
            sys.exit(1)
        if not rutas:
            _imprimir_uso()
            sys.exit(0)
        intake(rutas)
        pending, transcripts, note_files = discover()
        hay_notas = bool(note_files) or bool(args.notas)

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
        try:
            respuesta = input("¿Lanzar Claude con estos transcripts? [S/n] ")
        except EOFError:
            respuesta = "n"  # sin stdin interactivo no se lanza una sesión interactiva
        if respuesta.strip().lower().startswith("n"):
            print("De acuerdo, no lanzo nada. ¡Hasta la próxima clase!")
            sys.exit(0)

    prompt = build_prompt(transcripts, note_files, args.notas, args.fecha)
    launch_claude(prompt, args.modelo)


if __name__ == "__main__":
    main()

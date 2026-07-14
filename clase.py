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
import calendar
import datetime
import filecmp
import hashlib
import json
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


def augmentar_path():
    """Añade al PATH las ubicaciones típicas de binarios en macOS.

    Una app lanzada desde Finder o la GUI (doble clic en Procesar Clase.app)
    hereda un PATH mínimo que NO incluye /opt/homebrew/bin ni ~/.local/bin
    (donde vive `claude`), así que shutil.which() no encontraría ffmpeg,
    whisper-cli ni claude aunque estén instalados. Esto lo corrige para el
    preflight y para los subprocess (transcribe.sh -> ffmpeg/whisper-cli).
    """
    home = Path.home()
    extra = [
        "/opt/homebrew/bin",
        "/opt/homebrew/sbin",
        "/usr/local/bin",
        str(home / ".local" / "bin"),
    ]
    # nvm: bin de cada versión de node instalada (claude/npm globals viven ahí)
    nvm = home / ".nvm" / "versions" / "node"
    if nvm.is_dir():
        for d in sorted(nvm.iterdir(), reverse=True):
            extra.append(str(d / "bin"))
    actual = os.environ.get("PATH", "").split(os.pathsep)
    # Las rutas del usuario van primero; las extra se añaden si existen y faltan.
    combinado = actual + [
        d for d in extra if d not in actual and Path(d).is_dir()
    ]
    os.environ["PATH"] = os.pathsep.join(combinado)


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


def _hash_audio(p):
    """sha256 del contenido de un fichero (para detectar el mismo audio dos veces)."""
    h = hashlib.sha256()
    with open(p, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _audios_en_audio_src():
    """Audios fuente ya presentes en audio-src/ (excluye intermedios .wav de ffmpeg)."""
    for f in sorted(AUDIO_SRC.iterdir()):
        if not f.is_file() or f.suffix.lower() not in AUDIO_EXTS:
            continue
        if f.suffix.lower() == ".wav" and Path(f.stem).suffix.lower() in AUDIO_EXTS:
            continue  # intermedio de transcribe.sh (clase.m4a.wav)
        yield f


def copiar_a_audio_src(ficheros):
    """Copia los ficheros a audio-src/; devuelve (copiados, duplicados).

    - Mismo nombre con contenido idéntico -> se omite en silencio.
    - Mismo CONTENIDO que un audio ya presente (aunque tenga otro nombre, p. ej.
      el mismo audio arrastrado dos veces) -> se omite y se anota en `duplicados`
      como (nombre_arrastrado, nombre_ya_presente).
    - Mismo nombre con contenido distinto -> se desambigua con sufijo numérico.
    """
    AUDIO_SRC.mkdir(exist_ok=True)
    # Huella de los audios ya presentes para cazar el mismo audio re-arrastrado.
    vistos = {_hash_audio(f): f.name for f in _audios_en_audio_src()}
    copiados, duplicados = [], []
    for p in ficheros:
        es_audio = p.suffix.lower() in AUDIO_EXTS
        if es_audio:
            digest = _hash_audio(p)
            if digest in vistos:
                duplicados.append((p.name, vistos[digest]))
                continue  # contenido idéntico a uno ya presente — omitir
        destino = AUDIO_SRC / p.name
        if destino.exists():
            if filecmp.cmp(p, destino, shallow=False):
                continue  # contenido idéntico bajo el mismo nombre — omitir
            destino = _destino_libre(p.name)
        shutil.copy2(p, destino)
        copiados.append(destino)
        if es_audio:
            vistos[digest] = destino.name
    return copiados, duplicados


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
    copiados, duplicados = copiar_a_audio_src(ficheros)
    for nombre, presente in duplicados:
        print(f"  = {nombre} (idéntico a {presente} ya presente — omitido)")
    for destino in copiados:
        print(f"  + {destino}")
    return copiados


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


FECHA_RE = re.compile(r"\d{4}-\d{2}-\d{2}")


def _fechas_en_nombres(nombres):
    """Fechas ISO válidas embebidas en una lista de nombres de fichero."""
    fechas = set()
    for n in nombres:
        for m in FECHA_RE.findall(n):
            try:
                datetime.date.fromisoformat(m)
            except ValueError:
                continue  # dígitos con forma de fecha pero no una fecha real
            fechas.add(m)
    return fechas


def _clases_commiteadas():
    """classIds ya presentes en content/index.json (vacío si no existe/ilegible)."""
    idx = Path("content/index.json")
    if not idx.exists():
        return set()
    try:
        data = json.loads(idx.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return set()
    return {c.get("id") for c in data.get("classes", []) if c.get("id")}


def _fecha_en_nombre(nombre):
    """Primera fecha ISO válida embebida en un nombre de fichero, o None."""
    for m in FECHA_RE.findall(nombre):
        try:
            datetime.date.fromisoformat(m)
        except ValueError:
            continue
        return m
    return None


def fuentes_de_ejecucion(copiados, pending):
    """Ficheros de la clase que se procesa AHORA — NO toda la caché de audio-src/.

    El usuario solo aporta la clase NUEVA cada vez; `audio-src/` acumula las
    anteriores como caché. Devuelve (audios_run, notas_run):

    - audios_run: audios aportados en esta invocación (`copiados`) más los que
      siguen SIN transcript (`pending`, = los nuevos de esta ejecución). Excluye
      los intermedios .wav de transcribe.sh.
    - notas_run: notas (.txt/.md) aportadas en esta invocación.

    Los transcripts se derivan por nombre con `transcripts_de` tras transcribir.
    """
    audios, vistos = [], set()
    for f in list(copiados) + list(pending):
        s = f.suffix.lower()
        if s not in AUDIO_EXTS or f.name in vistos:
            continue
        if s == ".wav" and Path(f.stem).suffix.lower() in AUDIO_EXTS:
            continue  # intermedio ffmpeg (clase.m4a.wav)
        audios.append(f)
        vistos.add(f.name)
    notas = [f for f in copiados if f.suffix.lower() in NOTE_EXTS]
    return audios, notas


def transcripts_de(audios):
    """Transcripts .json de una lista de audios (convención skill: <audio>.json)."""
    out = []
    for a in audios:
        t = AUDIO_SRC / (a.name + ".json")
        if t.exists():
            out.append(t)
    return sorted(out)


def transcripts_para_prompt(audios_run, notas_run, transcripts_all, note_files_all, fecha):
    """(transcripts, notas) que alimentan la clase — SIN volcar toda la caché.

    - Preferente: lo aportado en ESTA ejecución (audios/notas nuevos).
    - Fallback (no se aportó nada nuevo — p. ej. re-lanzar Claude sobre una clase
      ya transcrita): los transcripts/notas cuya fecha embebida en el nombre
      coincide con `fecha`. Nunca devuelve todos los transcripts cacheados.
    """
    ts = transcripts_de(audios_run)
    notas = list(notas_run)
    if not ts and not notas:
        ts = sorted(t for t in transcripts_all if _fecha_en_nombre(t.name) == fecha)
        notas = sorted(n for n in note_files_all if _fecha_en_nombre(n.name) == fecha)
    return sorted(ts), sorted(notas)


def avisos_reingesta(fuentes, fecha):
    """Avisos deterministas de posible re-procesado — sin efectos, solo texto.

    `fuentes` = nombres de los ficheros AÑADIDOS EN ESTA EJECUCIÓN (audios/notas),
    NO la caché entera. Cruza las fechas embebidas en esos nombres con las clases
    ya commiteadas para cazar, ANTES de transcribir, el error de arrastrar audio
    de una clase anterior (los ficheros de clase se llaman p. ej. 2026-07-08_...):

    - un fichero fechado como una clase YA procesada, pero distinta a la de hoy
      -> probablemente audio antiguo re-arrastrado;
    - la fecha de hoy ya existe como clase -> re-procesarla la reemplaza.
    """
    avisos = []
    commit = _clases_commiteadas()
    fechas = _fechas_en_nombres(fuentes)
    for d in sorted(d for d in fechas if d != fecha and d in commit):
        avisos.append(
            f"Hay ficheros fechados {d} y ya tienes una clase «{d}» procesada. "
            f"¿Seguro que no estás reusando audio de una clase anterior? "
            f"(esta clase es {fecha})"
        )
    if fecha in commit:
        avisos.append(
            f"Ya existe una clase «{fecha}»: procesarla otra vez la REEMPLAZA "
            f"(mismos IDs — conserva tu progreso SRS)."
        )
    return avisos


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


def _asegurar_tkinterdnd2():
    """Garantiza `tkinterdnd2` para el drag & drop de la GUI; lo instala si falta.

    El Tk que trae Python (9.x aqua en macOS) NO tiene drag & drop nativo, así que
    el D&D de la ventana depende de `tkinterdnd2` (trae su propia librería tkdnd,
    compatible con Tk 9). Se auto-instala una sola vez con el mismo intérprete;
    prueba primero pip normal y luego `--break-system-packages` (Homebrew/PEP 668).
    Devuelve True si el módulo queda importable.
    """
    import importlib

    try:
        importlib.import_module("tkinterdnd2")
        return True
    except ModuleNotFoundError:
        pass
    print("Instalando tkinterdnd2 (drag & drop, una sola vez)…")
    for extra in ([], ["--break-system-packages"]):
        try:
            subprocess.run(
                [sys.executable, "-m", "pip", "install", "--quiet", *extra, "tkinterdnd2"],
                check=True,
            )
        except Exception:
            continue
        importlib.invalidate_caches()
        try:
            importlib.import_module("tkinterdnd2")
            return True
        except ModuleNotFoundError:
            continue
    print("  (no se pudo instalar; la GUI seguirá con «Añadir ficheros…»)")
    return False


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
    _asegurar_tkinterdnd2()  # instala tkinterdnd2 si falta (D&D de la ventana)
    try:
        from tkinterdnd2 import DND_FILES, TkinterDnD  # trae tkdnd (compat. Tk 9)
        root = TkinterDnD.Tk()
        dnd_activo = True
    except Exception:
        root = tk.Tk()
    root.title("JP-Learner — Procesar clase")
    root.geometry("620x720")
    root.minsize(560, 640)

    # --- Paleta (a juego con el icono y el theme-color de la app) ---
    BG = "#EEF0FB"        # lavanda muy claro (fondo)
    CARD = "#FFFFFF"      # tarjetas / campos
    INK = "#1E1B4B"       # texto índigo oscuro
    MUTED = "#6B7280"     # texto secundario
    ACCENT = "#5A5AE6"    # índigo de marca
    ACCENT_DK = "#4744C9"
    BORDER = "#D6D9F0"
    base_font = "SF Pro Text" if sys.platform == "darwin" else ""

    root.configure(bg=BG)

    style = ttk.Style()
    try:
        style.theme_use("clam")  # 'aqua' ignora colores; 'clam' permite tematizar
    except Exception:
        pass
    style.configure(
        "Accent.TButton", background=ACCENT, foreground="white",
        font=(base_font, 14, "bold"), padding=(14, 12), borderwidth=0, focuscolor=ACCENT,
    )
    style.map(
        "Accent.TButton",
        background=[("pressed", ACCENT_DK), ("active", ACCENT_DK), ("disabled", "#B9BAE6")],
        foreground=[("disabled", "#EEF0FB")],
    )
    style.configure(
        "Ghost.TButton", background=CARD, foreground=INK,
        font=(base_font, 12), padding=(12, 7), borderwidth=1, relief="flat",
    )
    style.map(
        "Ghost.TButton",
        background=[("active", "#E5E7FB"), ("pressed", "#DADCF7")],
        bordercolor=[("!disabled", BORDER)],
    )
    style.configure(
        "Clase.TCombobox", fieldbackground=CARD, background=CARD,
        bordercolor=BORDER, arrowcolor=ACCENT, padding=4,
    )

    # Imágenes del icono (dock/ventana + cabecera); se conservan como refs en root.
    _icon_dir = Path(__file__).resolve().parent / "skill" / "clase-icon.png"
    if _icon_dir.exists():
        try:
            root._icono = tk.PhotoImage(file=str(_icon_dir))
            root.iconphoto(True, root._icono.subsample(8))   # ~128px dock/ventana
            root._icono_hdr = root._icono.subsample(19)        # ~54px cabecera
        except Exception:
            root._icono_hdr = None
    else:
        root._icono_hdr = None

    # --- Cabecera índigo con icono + título ---
    header = tk.Frame(root, bg=ACCENT)
    header.pack(fill="x")
    hbox = tk.Frame(header, bg=ACCENT)
    hbox.pack(padx=18, pady=16, anchor="w", fill="x")
    if root._icono_hdr is not None:
        tk.Label(hbox, image=root._icono_hdr, bg=ACCENT).pack(side="left", padx=(0, 12))
    htext = tk.Frame(hbox, bg=ACCENT)
    htext.pack(side="left", anchor="w")
    tk.Label(
        htext, text="JP-Learner", bg=ACCENT, fg="white",
        font=(base_font, 20, "bold"), anchor="w",
    ).pack(anchor="w")
    tk.Label(
        htext, text="Procesa la clase de hoy en un solo paso", bg=ACCENT,
        fg="#DFE0FB", font=(base_font, 12), anchor="w",
    ).pack(anchor="w")

    # --- Cuerpo ---
    body = tk.Frame(root, bg=BG)
    body.pack(fill="both", expand=True, padx=18, pady=16)

    def _seccion(texto, pady=(0, 4)):
        tk.Label(
            body, text=texto, bg=BG, fg=INK, anchor="w",
            font=(base_font, 12, "bold"),
        ).pack(fill="x", pady=pady)

    # a. Lista de ficheros + botones
    _seccion("Ficheros de la clase")
    tk.Label(
        body, text="Audio m4a/mp3/wav/aac/ogg y notas .txt/.md",
        bg=BG, fg=MUTED, anchor="w", font=(base_font, 11),
    ).pack(fill="x", pady=(0, 6))
    lista = tk.Listbox(
        body, selectmode="extended", height=6, bg=CARD, fg=INK,
        relief="flat", highlightthickness=1, highlightbackground=BORDER,
        highlightcolor=ACCENT, selectbackground=ACCENT, selectforeground="white",
        activestyle="none", borderwidth=0,
    )
    lista.pack(fill="x", ipady=4)
    hint = tk.Label(body, text="", anchor="w", bg=BG, fg=MUTED, font=(base_font, 11))
    hint.pack(fill="x", pady=(4, 0))

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

    fila_botones = tk.Frame(body, bg=BG)
    fila_botones.pack(fill="x", pady=8)
    ttk.Button(
        fila_botones, text="Añadir ficheros…", style="Ghost.TButton",
        command=anadir_dialogo,
    ).pack(side="left")
    ttk.Button(
        fila_botones, text="Quitar selección", style="Ghost.TButton",
        command=quitar_seleccion,
    ).pack(side="left", padx=8)

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
            # Algunos builds de Tk 9 exponen drop nativo; SÓLO fiarse si el comando
            # de registro existe de verdad (el Tk 9 aqua de stock NO lo trae, y sin
            # esta comprobación el hint prometía un D&D que nunca disparaba).
            if root.tk.eval("info commands tk_dropTarget"):
                lista.bind("<<Drop:File>>", lambda e: _al_soltar(e.data))
                dnd_activo = True
        except Exception:
            dnd_activo = False
    hint.config(
        text="Arrastra ficheros aquí o usa «Añadir ficheros…»"
        if dnd_activo else "Usa «Añadir ficheros…» para elegir los de la clase"
    )

    # c. Apuntes de la clase
    _seccion("Apuntes de la clase (opcional)", pady=(14, 4))
    apuntes = tk.Text(
        body, height=4, bg=CARD, fg=INK, relief="flat", highlightthickness=1,
        highlightbackground=BORDER, highlightcolor=ACCENT, borderwidth=0,
        padx=8, pady=6, font=(base_font, 12), insertbackground=INK, wrap="word",
    )
    apuntes.pack(fill="x")

    # d. Fecha (calendario emergente) + modelo
    fila = tk.Frame(body, bg=BG)
    fila.pack(fill="x", pady=14)
    tk.Label(fila, text="Fecha", bg=BG, fg=INK, font=(base_font, 12)).pack(side="left")
    fecha_var = tk.StringVar(value=args.fecha)

    def _fecha_actual():
        """La fecha elegida como date (hoy si el texto guardado no es ISO válido)."""
        try:
            return datetime.date.fromisoformat(fecha_var.get().strip())
        except ValueError:
            return datetime.date.today()

    # El "campo" de fecha es una etiqueta clicable que abre el calendario
    # (en macOS los tk.Button ignoran los colores del tema aqua; las Label no).
    campo_fecha = tk.Label(
        fila, textvariable=fecha_var, width=12, bg=CARD, fg=INK, anchor="w",
        padx=8, font=(base_font, 12), cursor="hand2",
        highlightthickness=1, highlightbackground=BORDER, highlightcolor=ACCENT,
    )
    campo_fecha.pack(side="left", padx=(8, 6), ipady=4)
    icono_cal = tk.Label(
        fila, text="📅", bg=BG, fg=ACCENT, font=(base_font, 14), cursor="hand2",
    )
    icono_cal.pack(side="left", padx=(0, 20))

    MESES = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
        "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ]
    DIAS = ["L", "M", "X", "J", "V", "S", "D"]

    def abrir_calendario(_evt=None):
        pop = tk.Toplevel(root)
        pop.title("Elegir fecha")
        pop.configure(bg=CARD)
        pop.transient(root)
        pop.resizable(False, False)
        pop.geometry(
            f"+{campo_fecha.winfo_rootx()}"
            f"+{campo_fecha.winfo_rooty() + campo_fecha.winfo_height() + 4}"
        )
        estado = {"ver": _fecha_actual().replace(day=1)}  # primer día del mes visible

        cab = tk.Frame(pop, bg=ACCENT)
        cab.pack(fill="x")
        lbl_mes = tk.Label(cab, bg=ACCENT, fg="white", font=(base_font, 12, "bold"))
        rejilla = tk.Frame(pop, bg=CARD)
        rejilla.pack(padx=8, pady=8)

        def elegir(d):
            fecha_var.set(d.isoformat())
            pop.destroy()

        def mover(delta):
            ver = estado["ver"]
            m = ver.month - 1 + delta
            estado["ver"] = datetime.date(ver.year + m // 12, m % 12 + 1, 1)
            redibujar()

        def redibujar():
            for w in rejilla.winfo_children():
                w.destroy()
            ver = estado["ver"]
            lbl_mes.config(text=f"{MESES[ver.month - 1]} {ver.year}")
            for i, d in enumerate(DIAS):
                tk.Label(
                    rejilla, text=d, bg=CARD, fg=MUTED, width=3,
                    font=(base_font, 10, "bold"),
                ).grid(row=0, column=i, pady=(0, 2))
            hoy = datetime.date.today()
            sel = _fecha_actual()
            semanas = calendar.Calendar(firstweekday=0).monthdatescalendar(
                ver.year, ver.month
            )
            for r, semana in enumerate(semanas, start=1):
                for c, dia in enumerate(semana):
                    if dia == sel:
                        bg, fg = ACCENT, "white"
                    elif dia == hoy:
                        bg, fg = "#E5E7FB", ACCENT
                    else:
                        bg = CARD
                        fg = "#B9BAE6" if dia.month != ver.month else INK
                    cel = tk.Label(
                        rejilla, text=str(dia.day), width=3, bg=bg, fg=fg,
                        font=(base_font, 11), cursor="hand2", padx=2, pady=2,
                    )
                    cel.grid(row=r, column=c, padx=1, pady=1)
                    cel.bind("<Button-1>", lambda e, d=dia: elegir(d))

        flecha = dict(
            bg=ACCENT, fg="white", font=(base_font, 15, "bold"), cursor="hand2"
        )
        izq = tk.Label(cab, text="‹", **flecha)
        izq.pack(side="left", padx=(10, 0), pady=6)
        izq.bind("<Button-1>", lambda e: mover(-1))
        lbl_mes.pack(side="left", expand=True, pady=6)
        der = tk.Label(cab, text="›", **flecha)
        der.pack(side="right", padx=(0, 10), pady=6)
        der.bind("<Button-1>", lambda e: mover(1))

        pie = tk.Label(
            pop, text="Hoy", bg=CARD, fg=ACCENT, font=(base_font, 11, "bold"),
            cursor="hand2",
        )
        pie.pack(pady=(0, 8))
        pie.bind("<Button-1>", lambda e: elegir(datetime.date.today()))

        redibujar()
        pop.bind("<Escape>", lambda e: pop.destroy())
        pop.focus_set()

    campo_fecha.bind("<Button-1>", abrir_calendario)
    icono_cal.bind("<Button-1>", abrir_calendario)

    tk.Label(fila, text="Modelo", bg=BG, fg=INK, font=(base_font, 12)).pack(side="left")
    modelo_var = tk.StringVar(value=args.modelo if args.modelo in MODELOS_GUI else "opus")
    ttk.Combobox(
        fila, textvariable=modelo_var, values=MODELOS_GUI, state="readonly",
        width=10, style="Clase.TCombobox",
    ).pack(side="left", padx=8)

    # e. Procesar + log
    boton = ttk.Button(body, text="Procesar clase", style="Accent.TButton")
    boton.pack(fill="x", pady=(4, 10))
    tk.Label(
        body, text="Registro", bg=BG, fg=MUTED, anchor="w", font=(base_font, 11),
    ).pack(fill="x", pady=(0, 4))
    log = tk.Text(
        body, height=9, state="disabled", bg="#1E1B4B", fg="#E5E7FB",
        relief="flat", highlightthickness=0, borderwidth=0, padx=10, pady=8,
        font=("SF Mono" if sys.platform == "darwin" else "monospace", 11), wrap="word",
    )
    log.pack(fill="both", expand=True)

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

    def preguntar_si_no(titulo, mensaje):
        """askyesno desde el hilo de trabajo: pregunta en el hilo de UI y espera.

        tkinter no es thread-safe, así que el diálogo se crea con root.after y el
        hilo de procesado se bloquea en el Event hasta que el usuario responde.
        """
        caja = {}
        listo = threading.Event()

        def _preguntar():
            caja["v"] = messagebox.askyesno(titulo, mensaje)
            listo.set()

        root.after(0, _preguntar)
        listo.wait()
        return caja.get("v", False)

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
            copiados = []  # ficheros aportados en ESTA ejecución (ancla del alcance)
            if ficheros:
                log_linea(f"Copiando {len(ficheros)} fichero(s) a audio-src/…")
                copiados, duplicados = copiar_a_audio_src(ficheros)
                for nombre, presente in duplicados:
                    log_linea(f"  = {nombre} idéntico a {presente} — omitido")
                for destino in copiados:
                    log_linea(f"  + {destino}")
            pending, transcripts, note_files = discover()
            if not pending and not transcripts and not note_files and not datos["notas"]:
                log_linea("Nada que procesar: añade audios o apuntes y vuelve a pulsar Procesar clase.")
                return
            # Alcance: SOLO los ficheros de esta ejecución, no la caché de audio-src/.
            audios_run, notas_run = fuentes_de_ejecucion(copiados, pending)
            # Guardia de re-procesado ANTES de transcribir: solo mira lo aportado
            # AHORA, no las clases ya cacheadas (revisión humana — el usuario decide).
            avisos = avisos_reingesta(
                [f.name for f in audios_run] + [n.name for n in notas_run],
                datos["fecha"],
            )
            if avisos:
                cuerpo = "\n\n".join(f"• {a}" for a in avisos)
                if not preguntar_si_no(
                    "Posible re-procesado",
                    cuerpo + "\n\n¿Continuar de todas formas?",
                ):
                    log_linea("Cancelado: revisa los ficheros de audio-src/ y vuelve a pulsar Procesar clase.")
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
            # Transcripts/notas de la clase de esta ejecución (fallback por fecha para
            # re-lanzar sobre una clase ya transcrita) — nunca toda la caché.
            ts_run, notas_prompt = transcripts_para_prompt(
                audios_run, notas_run, transcripts, note_files, datos["fecha"]
            )
            if not ts_run and not notas_prompt and not datos["notas"]:
                log_linea(
                    f"Nada nuevo que procesar para la clase {datos['fecha']}. "
                    "Añade el audio/apuntes de la clase nueva (los anteriores quedan "
                    "en caché, no se reprocesan)."
                )
                return
            prompt = build_prompt(ts_run, notas_prompt, datos["notas"], datos["fecha"])
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
        root.after(150, abrir_calendario)  # ejercita el calendario (redibujar)
        root.after(400, root.destroy)
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
    augmentar_path()  # imprescindible cuando se lanza desde Finder/GUI (PATH mínimo)
    args = parse_args()
    if args.gui:
        run_gui(args)
        return
    if args.ficheros:
        AUDIO_SRC.mkdir(exist_ok=True)  # el intake crea el directorio si falta
    preflight()
    copiados = []  # ficheros aportados en ESTA ejecución (ancla del alcance)
    if args.ficheros:
        copiados += intake(args.ficheros) or []

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
        copiados += intake(rutas) or []
        pending, transcripts, note_files = discover()
        hay_notas = bool(note_files) or bool(args.notas)

    # Alcance: SOLO los ficheros de esta ejecución, no la caché entera de audio-src/.
    audios_run, notas_run = fuentes_de_ejecucion(copiados, pending)

    # Guardia de re-procesado ANTES de transcribir: caza el arrastrar audio de una
    # clase anterior — solo mira lo aportado AHORA, no las clases ya cacheadas.
    avisos = avisos_reingesta(
        [f.name for f in audios_run] + [n.name for n in notas_run],
        args.fecha,
    )
    if avisos:
        print("\n⚠️  Aviso antes de estructurar:")
        for a in avisos:
            print(f"  - {a}")
        try:
            respuesta = input("¿Continuar de todas formas? [s/N] ")
        except EOFError:
            respuesta = "n"  # sin stdin interactivo, no seguimos a ciegas
        if not respuesta.strip().lower().startswith("s"):
            print("Cancelado. Revisa los ficheros de audio-src/ y vuelve a intentarlo.")
            sys.exit(0)

    if pending:
        print(f"Audios pendientes de transcribir: {len(pending)}")
        for f in pending:
            print(f"  - {f.name}")
        transcribe_pending(pending)
        pending, transcripts, note_files = discover()  # refresca los transcripts nuevos

    # Transcripts/notas que alimentan la clase de esta ejecución (con fallback por
    # fecha para re-lanzar sobre una clase ya transcrita) — nunca toda la caché.
    ts_run, notas_prompt = transcripts_para_prompt(
        audios_run, notas_run, transcripts, note_files, args.fecha
    )
    if not ts_run and not notas_prompt and not args.notas:
        print(
            f"\nNada nuevo que procesar para la clase {args.fecha}.\n"
            "Arrastra el audio/apuntes de la clase nueva (audio-src/ conserva los "
            "anteriores como caché, no se reprocesan)."
        )
        sys.exit(0)

    print("\nTranscripts de esta clase:")
    for t in ts_run:
        print(f"  - {t}")
    if not ts_run:
        print("  (ninguno — clase solo de texto)")

    prompt = build_prompt(ts_run, notas_prompt, args.notas, args.fecha)
    launch_claude(prompt, args.modelo)


if __name__ == "__main__":
    main()

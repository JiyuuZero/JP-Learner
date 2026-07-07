#!/bin/sh
# skill/make-app.sh — regenera "Procesar Clase.app" en la raíz del repo.
#
# El .app es un artefacto de build LOCAL (gitignorado — nunca se commitea):
# ejecútame una vez tras clonar. Doble clic en el .app abre la GUI de clase.py
# (python3 clase.py --gui) sin abrir un terminal a mano.
#
# Uso:  sh skill/make-app.sh

set -eu

cd "$(dirname "$0")/.."
REPO="$(pwd)"

command -v osacompile >/dev/null 2>&1 || {
  echo "osacompile no disponible (se requiere macOS)" >&2
  exit 1
}

PY="/opt/homebrew/bin/python3"
[ -x "$PY" ] || PY="$(command -v python3)"

case "$REPO$PY" in
  *"'"*) echo "ruta con comilla simple no soportada: $REPO / $PY" >&2; exit 1 ;;
esac

rm -rf "Procesar Clase.app"
osacompile -o "Procesar Clase.app" \
  -e "do shell script \"cd '$REPO' && '$PY' clase.py --gui >/dev/null 2>&1 &\""

echo "creada: $REPO/Procesar Clase.app (doble clic para abrir la GUI)"

#!/bin/sh
# skill/make-app.sh — regenera "Procesar Clase.app" en la raíz del repo, con icono.
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

# 1. Compilar la app (lanza la GUI en segundo plano al abrirla).
rm -rf "Procesar Clase.app"
osacompile -o "Procesar Clase.app" \
  -e "do shell script \"cd '$REPO' && '$PY' clase.py --gui >/dev/null 2>&1 &\""

# 2. Icono: genera el PNG maestro si falta y conviértelo a .icns (herramientas
#    nativas de macOS: sips + iconutil). Sustituye el applet.icns por defecto,
#    al que ya apunta el Info.plist (CFBundleIconFile = applet).
ICON_PNG="skill/clase-icon.png"
[ -f "$ICON_PNG" ] || "$PY" skill/make-icon.py

if command -v sips >/dev/null 2>&1 && command -v iconutil >/dev/null 2>&1; then
  ICONSET="$(mktemp -d)/clase.iconset"
  mkdir -p "$ICONSET"
  for spec in \
    "16:icon_16x16" "32:icon_16x16@2x" \
    "32:icon_32x32" "64:icon_32x32@2x" \
    "128:icon_128x128" "256:icon_128x128@2x" \
    "256:icon_256x256" "512:icon_256x256@2x" \
    "512:icon_512x512" "1024:icon_512x512@2x"; do
    px="${spec%%:*}"; name="${spec##*:}"
    sips -z "$px" "$px" "$ICON_PNG" --out "$ICONSET/$name.png" >/dev/null
  done
  iconutil -c icns "$ICONSET" -o "Procesar Clase.app/Contents/Resources/applet.icns"
  rm -rf "$(dirname "$ICONSET")"
  touch "Procesar Clase.app"   # refresca la caché de icono de Finder
  echo "icono aplicado (torii índigo)"
else
  echo "aviso: sips/iconutil no disponibles — la app usará el icono por defecto" >&2
fi

echo "creada: $REPO/Procesar Clase.app (doble clic para abrir la GUI)"

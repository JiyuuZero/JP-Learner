#!/usr/bin/env python3
"""Genera skill/clase-icon.png (1024x1024) — el icono de JP-Learner.

Torii blanco sobre un degradado índigo con esquinas redondeadas estilo macOS,
a juego con el theme-color de la app (#5A5AE6). Pure stdlib (zlib + struct),
render a 2x con downsample para anti-aliasing. Ejecútalo con:  python3 skill/make-icon.py
"""
import struct
import zlib
from pathlib import Path

W = 1024          # tamaño final
S = 2             # supersampling (render a 2x, luego media 2x2 -> bordes suaves)
WS = W * S

# --- Paleta (a juego con app/index.html theme-color) ---
TOP = (99, 102, 241)      # índigo claro (arriba)
BOT = (67, 56, 202)       # índigo profundo (abajo)
TORII = (255, 255, 255)   # torii blanco
SHADOW = (30, 27, 75)     # sombra fría bajo el torii

MARGIN = 88 * S           # margen del squircle
RADIUS = 210 * S          # radio de esquina
SH_DX, SH_DY = 7 * S, 11 * S  # desplazamiento de la sombra


def _rounded(x, y, x0, y0, x1, y1, r):
    """¿Está (x,y) dentro del rectángulo redondeado [x0,x1]x[y0,y1] con radio r?"""
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = x0 + r if x < x0 + r else (x1 - r if x > x1 - r else x)
    cy = y0 + r if y < y0 + r else (y1 - r if y > y1 - r else y)
    dx, dy = x - cx, y - cy
    return dx * dx + dy * dy <= r * r


# Rectángulos del torii en coordenadas 1x (canvas 1024). Kasagi (dintel superior),
# shimaki (viga fina), nuki (segunda viga), gakuzuka (tablilla central) y 2 pilares.
_TORII_1X = [
    (296, 300, 728, 352),   # kasagi
    (312, 352, 712, 370),   # shimaki
    (344, 440, 680, 488),   # nuki
    (497, 370, 527, 440),   # gakuzuka
    (360, 352, 404, 744),   # pilar izquierdo
    (620, 352, 664, 744),   # pilar derecho
]
_TORII = [tuple(v * S for v in r) for r in _TORII_1X]


def _in_torii(x, y):
    for x0, y0, x1, y1 in _TORII:
        if x0 <= x <= x1 and y0 <= y <= y1:
            return True
    return False


def _render_supersampled():
    buf = bytearray(WS * WS * 4)
    span = float(WS - 1)
    for y in range(WS):
        t = y / span
        br = int(TOP[0] + (BOT[0] - TOP[0]) * t)
        bg = int(TOP[1] + (BOT[1] - TOP[1]) * t)
        bb = int(TOP[2] + (BOT[2] - TOP[2]) * t)
        row = y * WS * 4
        for x in range(WS):
            i = row + x * 4
            if not _rounded(x, y, MARGIN, MARGIN, WS - MARGIN, WS - MARGIN, RADIUS):
                continue  # fuera del squircle -> transparente
            if _in_torii(x, y):
                r, g, b = TORII
            elif _in_torii(x - SH_DX, y - SH_DY):
                # sombra suave del torii mezclada con el fondo
                r = (br + SHADOW[0]) // 2
                g = (bg + SHADOW[1]) // 2
                b = (bb + SHADOW[2]) // 2
            else:
                r, g, b = br, bg, bb
            buf[i] = r
            buf[i + 1] = g
            buf[i + 2] = b
            buf[i + 3] = 255
    return buf


def _downsample(src):
    """Media 2x2 (RGBA) -> anti-aliasing en bordes del squircle."""
    out = bytearray(W * W * 4)
    for y in range(W):
        for x in range(W):
            acc = [0, 0, 0, 0]
            for dy in (0, 1):
                for dx in (0, 1):
                    si = ((y * S + dy) * WS + (x * S + dx)) * 4
                    for c in range(4):
                        acc[c] += src[si + c]
            oi = (y * W + x) * 4
            for c in range(4):
                out[oi + c] = acc[c] // 4
    return out


def _write_png(path, rgba, w, h):
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    raw = bytearray()
    stride = w * 4
    for y in range(h):
        raw.append(0)  # filtro None
        raw.extend(rgba[y * stride:(y + 1) * stride])
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    Path(path).write_bytes(png)


def main():
    out = Path(__file__).resolve().parent / "clase-icon.png"
    print("Renderizando icono (torii sobre índigo)…")
    big = _render_supersampled()
    small = _downsample(big)
    _write_png(out, small, W, W)
    print(f"creado: {out}")


if __name__ == "__main__":
    main()

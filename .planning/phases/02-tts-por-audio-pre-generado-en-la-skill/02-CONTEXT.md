---
phase: 02-tts-por-audio-pre-generado-en-la-skill
created: 2026-07-07
source: user decision in session (investigación de alternativas TTS + AskUserQuestion)
status: locked
---

# Phase 2 Context — TTS por audio pre-generado en la skill

## Problema

El TTS actual (Web Speech API) depende de que el dispositivo tenga una voz ja-JP instalada. El usuario no quiere depender de instalar datos de voz en cada dispositivo. Alternativas de TTS neuronal en navegador (Kokoro, Piper) descartadas: 80–300 MB de modelo en móvil y el G2P japonés requiere servidor — rompe las constraints (sin backend, payload mínimo).

## Decisión (LOCKED — elegida por el usuario)

**Audio pre-generado en la skill.** La skill, al procesar cada clase en el Mac del usuario, genera un fichero de audio por ítem japonés con la voz japonesa integrada de macOS (`say -v Kyoko`), lo convierte a un formato web comprimido, y lo committea junto al JSON de contenido. La app reproduce esos ficheros estáticos.

## Decisiones de diseño (LOCKED)

1. **Generador**: `say -v Kyoko` (macOS, local, cero instalación). El texto de entrada es el campo kana del ítem (lectura fonética — evita errores de lectura de kanji). Conversión con `afconvert` o `ffmpeg` (ya requerido por la skill) a **AAC/M4A mono** de bitrate bajo (~32-48 kbps) — soportado nativamente por Safari/Chrome/Firefox.
2. **Layout de ficheros (sidecar, schema INTACTO)**: `content/audio/<classId>/<itemId-slug>.m4a`, donde el nombre deriva determinísticamente del ID del ítem (los `:` del ID se sustituyen por `_` para compatibilidad de filesystem). El schema congelado `content.schema.json` NO se toca.
3. **Manifiesto**: `content/audio/index.json` — mapa `itemId → ruta relativa`, regenerado idempotentemente por la skill (mismo patrón que `content/index.json`). La app lo carga en boot junto al contenido (si 404 → mapa vacío, sin error).
4. **Qué se genera**: audio para cada ítem de vocabulario (kana de la palabra) y cada frase de ejemplo con tokens (kana de la frase). Gramática y notas: no (v2 si hace falta).
5. **App — cadena de fallback en SpeakerButton/tts.ts**: (1) si existe audio pre-generado para el ítem → reproducir `<audio>`; (2) si no, Web Speech con voz ja-JP como hasta ahora; (3) si nada → botón oculto + estado en Perfil (comportamiento actual). TTS-02 se conserva: nunca voz incorrecta, nunca auto-play.
6. **Offline**: los `.m4a` bajo `/content/audio/` entran en la misma estrategia de cache que el contenido JSON (runtime cache — NetworkFirst o CacheFirst con expiración; decidir en planning cuál conviene para binarios, sin inflar el precache del SW con audio).
7. **Sample class**: generar y commitear el audio de la clase de muestra `2026-04-14` en esta fase, para que el nuevo sistema sea verificable en vivo de inmediato (el usuario no tiene voz ja-JP en su Android — ese era el problema original).
8. **Build/deploy**: `sync-content` / `copy:content` debe copiar también `content/audio/` a `app/public/content/audio/` (misma fuente canónica única).
9. **Skill contract**: `skill/SKILL.md` gana un paso fijo de generación de audio (idempotente: solo genera ficheros que faltan o cuyo texto kana cambió; borra huérfanos). El commit de clase incluye los audios con pathspec explícito.

## Restricciones heredadas (siguen vigentes)

- Sin backend, sin API keys, GitHub Pages estático, mobile-first.
- `content/` es la única fuente de verdad; `app/public/content/` es generado y gitignored.
- El contrato skill↔app es fijo y documentado.

## Out of scope

- VOICEVOX u otra voz de mayor calidad (posible mejora futura de la skill; la interfaz por ficheros no cambiaría).
- Audio para gramática/notas.
- Controles de velocidad/pitch en la app.

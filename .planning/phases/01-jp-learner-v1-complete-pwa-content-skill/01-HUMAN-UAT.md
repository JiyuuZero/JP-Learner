---
status: partial
phase: 01-jp-learner-v1-complete-pwa-content-skill
source: [01-VERIFICATION.md]
started: 2026-07-07T07:53:02Z
updated: 2026-07-07T07:53:02Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Una clase nueva aparece sin hard-refresh (NetworkFirst, PWA-03)
expected: Tras commitear una segunda clase real (vía skill o a mano) y dejar correr el deploy de Pages, un refresh normal de la app instalada muestra la clase nueva sin necesidad de hard-refresh ni reinstalación. La config NetworkFirst para `/content/` está verificada en código; falta la comprobación en vivo con contenido real.
result: [pending]

### 2. TTS en dispositivo con voz ja-JP (TTS-01/02)
expected: Con una voz japonesa instalada en Android (Ajustes → Salida de texto a voz → instalar datos de voz japonés, y reabrir la PWA), tocar un botón de Pronunciación (flashcard o detalle de Glosario) habla japonés con voz ja-JP. En un dispositivo sin voz ja-JP los botones quedan ocultos y Perfil muestra "Pronunciación no disponible en este dispositivo." — nunca habla con una voz incorrecta. Los code paths están verificados por tests/build; falta la comprobación en dispositivo.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

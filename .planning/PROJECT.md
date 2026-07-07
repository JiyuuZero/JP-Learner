# JP-Learner

## What This Is

App personal (PWA) para consolidar y practicar lo que el usuario aprende en sus clases presenciales de japonés (nivel básico). El contenido se genera a partir de los audios de clase — mezcla de castellano y japonés — mediante una **skill de Claude** que transcribe con Whisper en local y estructura el material bajo un esquema rígido; la app consume ese contenido para practicar con ejercicios tipo Duolingo. Mobile-first, uso personal, sin backend.

## Core Value

Practicar de forma efectiva (repetición espaciada + recuerdo activo) **exactamente** el contenido dado en clase, con la mínima fricción para expandirlo clase a clase. Si todo lo demás falla, esto debe funcionar: convertir cada clase en material de práctica útil.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

Validated in Phase 1: JP-Learner v1 (2026-07-07) — deployed live at https://jiyuuzero.github.io/JP-Learner/

- [x] App PWA instalable en móvil y abrible en web, funcional offline
- [x] Skill/agente de Claude que procesa el audio de clase (ES/JA) → contenido JSON con esquema rígido y repetible
- [x] Transcripción local con Whisper (sin API key), capaz de discriminar castellano y japonés
- [x] Glosario de vocabulario: kanji · kana · romaji · traducción ES · frase de ejemplo, etiquetado por clase/fecha
- [x] Contenido de gramática (patrón + explicación + ejemplos) y notas de clase, etiquetados por clase/fecha
- [x] 5 tipos de ejercicio: flashcards+SRS, opción múltiple, rellenar/escribir, completar frase con banco de palabras, emparejar ES↔JA
- [x] Motor de repetición espaciada (SRS) con estado por ítem
- [x] Selector de ámbito de repaso: Hoy / Esta semana / Total
- [x] 3 modos de visualización del japonés (A: kana+kanji con romaji encima · B: kana con kanji progresivo y furigana kana · C: solo kanji), con sustitución paulatina de kanji aprendidos en el modo B
- [x] Pronunciación incluida con el contenido: audio pre-generado por la skill (say -v Kyoko) reproducido en la app, con Web Speech como fallback — verificado audiblemente en dispositivo sin voz ja-JP (Fase 2, 2026-07-07)
- [x] Progreso local en IndexedDB + exportar/importar backup JSON
- [x] Gamificación ligera: racha diaria, % de progreso y contador de puntos
- [x] UI índigo/morado + acentos pastel, mobile-first, siguiendo las referencias de `references/`
- [x] Publicación de la PWA en GitHub Pages

### Active

<!-- Current scope. Building toward these. -->

(Nada — v1 + Fase 2 (audio TTS pre-generado + entrada flexible de la skill) completas; el siguiente milestone definirá el nuevo scope)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Sincronización automática entre dispositivos — sin backend en v1; se cubre con export/import (posible v2)
- Backend/servidor propio y API keys dentro de la app — evitado expresamente por el usuario
- App nativa (App Store / Play Store) — la PWA ya cubre app + web
- Procesar audio dentro de la app — el procesamiento IA vive en la skill (evita API keys y garantiza formato rígido)
- Generar contenido fuera de clase — la app solo se expande con lo dado en clase

## Context

- Usuario con nivel básico de japonés, apuntado a clases presenciales que van rápido; necesita consolidar y practicar entre clases.
- Fuentes de contenido: audios de clase (mezcla castellano/japonés) y, opcionalmente, audios propios explicando lo dado.
- Aprende kanji **muy despacio** y a propósito: el modo B de visualización introduce kanji de forma gradual según lo que marca como aprendido.
- Referencias de UI: 4 imágenes en `references/` (estilo Duolingo/Busuu, índigo + pastel, mobile-first, barra de navegación inferior, tarjetas redondeadas, gamificación ligera).
- Investigación inicial (2026-07): SRS + recuerdo activo como método base; Whisper local para ES/JA (mejor con modelo grande por el code-switching); PWA + datos en JSON como enfoque sin backend.

## Constraints

- **Tech stack**: PWA con Vite + React + Tailwind + IndexedDB — estándar, mantenible, escalable, sin backend.
- **Arquitectura**: monorepo con la app y la skill juntas; la skill escribe los JSON de contenido que la app lee.
- **Sin backend / sin API keys en la app** — todo el procesamiento IA ocurre en la skill de Claude que ejecuta el usuario.
- **Datos**: contenido en ficheros JSON versionados en git (git = backup); progreso en IndexedDB con export/import a fichero.
- **Transcripción**: Whisper en local (sin key), maneja mezcla castellano/japonés.
- **Alcance de ejecución**: **una sola fase**, optimizado en tokens (se ejecutará en **Fable 5**), directo de implementar.
- **Hosting**: GitHub Pages (gratis, estático).
- **Plataforma**: mobile-first (móvil como dispositivo principal); también escritorio vía navegador.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Datos: JSON en repo (contenido) + IndexedDB con export/import (progreso) | Sin backend, git como backup, funciona offline | — Pending |
| Transcripción con Whisper local | Sin API key, corre en el Mac del usuario, soporta ES/JA | — Pending |
| Procesamiento IA en una skill separada, no en la app | Evita API keys en la app; contrato de salida rígido y repetible | — Pending |
| Form factor: PWA | Un solo código = app + web, instalable, offline | — Pending |
| Color base índigo/morado + acentos pastel | 3 de las 4 referencias; look Duolingo/Busuu | — Pending |
| Stack Vite + React + Tailwind + IndexedDB | Estándar, mantenible y escalable sin ser complejo | — Pending |
| 3 modos de visualización con kanji progresivo (`<ruby>` para furigana) | El usuario aprende kanji muy despacio y quiere control fino | — Pending |
| Una sola fase, ejecución en Fable 5 | Restricción de tiempo y presupuesto de tokens del usuario | — Pending |
| Monorepo app + skill | Mantiene contrato de datos y app juntos; simple para una fase | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-06 after initialization*

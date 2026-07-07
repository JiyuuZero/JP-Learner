# Requirements: JP-Learner

**Defined:** 2026-07-06
**Core Value:** Practicar de forma efectiva (repetición espaciada + recuerdo activo) exactamente el contenido dado en clase, con la mínima fricción para expandirlo clase a clase.

## v1 Requirements

Requisitos para la primera versión. Se implementan en una sola fase (restricción del usuario), siguiendo el orden de construcción del research (esquema → shell → persistencia/SRS → display/ejercicios → TTS/gamificación/skill).

### App PWA y despliegue (PWA)

- [x] **PWA-01**: El usuario puede instalar la app en móvil y escritorio desde el navegador (PWA instalable con manifest)
- [x] **PWA-02**: El usuario puede usar la app completamente offline tras la primera carga (service worker cachea app + contenido)
- [x] **PWA-03**: El contenido de una clase recién añadida aparece tras refrescar (network-first para HTML y JSON de contenido; cache-first solo para assets con hash)
- [x] **PWA-04**: La app está publicada y accesible en una URL pública de GitHub Pages (base path configurado y fallback SPA vía 404.html o HashRouter)

### Esquema de contenido y contrato (CONT)

- [ ] **CONT-01**: El contenido se define con un esquema JSON versionado (`content.schema.json`) que es el único contrato skill↔app, con tipos TypeScript generados desde él
- [ ] **CONT-02**: Cada ítem de contenido tiene un ID estable y determinista (`<classId>:<type>:<slug>`) y está etiquetado con su clase y fecha
- [ ] **CONT-03**: Los ítems de vocabulario incluyen kanji, kana, romaji, traducción al español y una frase de ejemplo
- [ ] **CONT-04**: Los ítems de vocabulario incluyen segmentos de lectura por palabra y por kanji (`tokens[]`) para que la app renderice los 3 modos sin ningún análisis de japonés en cliente
- [ ] **CONT-05**: El esquema representa puntos de gramática (patrón + explicación + ejemplos) y notas de clase, etiquetados por clase/fecha
- [x] **CONT-06**: La app carga el contenido desde JSON en el repo (índice + ficheros por clase) en modo solo lectura

### Progreso y persistencia (PROG)

- [x] **PROG-01**: El progreso del usuario (estado SRS, set de kanji aprendidos, racha/puntos) persiste en local entre sesiones en IndexedDB
- [x] **PROG-02**: El usuario puede exportar todo su progreso a un fichero JSON de backup
- [x] **PROG-03**: El usuario puede importar un fichero de backup y restaurar el estado completo (round-trip verificado)
- [x] **PROG-04**: El progreso referencia el contenido solo por ID y nunca lo embebe, de modo que reprocesar una clase no corrompe el historial
- [x] **PROG-05**: La app solicita almacenamiento persistente (`navigator.storage.persist()`) y versiona el store con migraciones (`appVersion`)

### Repetición espaciada (SRS)

- [x] **SRS-01**: Cada ítem tiene un único estado de programación FSRS (vía `ts-fsrs`), compartido por todos los tipos de ejercicio
- [x] **SRS-02**: El usuario califica su recuerdo y FSRS programa el siguiente repaso
- [x] **SRS-03**: El usuario puede practicar por ámbito de repaso: Hoy (lo nuevo del día), Esta semana, o Total
- [x] **SRS-04**: "Hoy/Esta semana" y la racha usan límites de día por calendario local (no restas de timestamp)
- [x] **SRS-05**: La entrada diaria de tarjetas nuevas está limitada para que las pausas no generen un backlog inabarcable

### Visualización del japonés (DISP)

- [x] **DISP-01**: El usuario puede cambiar el modo de visualización del japonés en ajustes: (A) kana+kanji con furigana romaji, (B) kanji progresivo, (C) solo kanji
- [x] **DISP-02**: La furigana se renderiza con `<ruby>` nativo a partir de los datos del esquema
- [x] **DISP-03**: En el Modo B, las palabras salen por defecto en kana y pasan a kanji-con-furigana-kana a medida que el usuario marca sus kanji como aprendidos (sustitución paulatina)
- [x] **DISP-04**: El usuario puede marcar kanji/palabras como aprendidos, actualizando el set de kanji aprendidos que alimenta el Modo B

### Ejercicios (EXER)

- [x] **EXER-01**: Flashcards con recuerdo activo (muestra → revela → autoevalúa), alimentando el estado SRS compartido
- [x] **EXER-02**: Preguntas de opción múltiple
- [x] **EXER-03**: Rellenar/escribir con comprobación tolerante de respuesta (variantes romaji/kana, n/nn)
- [x] **EXER-04**: Completar la frase con banco de palabras (frase en japonés con huecos + fichas de palabras japonesas)
- [x] **EXER-05**: Emparejar parejas español↔japonés
- [x] **EXER-06**: Los ejercicios pueden practicarse en ambos sentidos (JA→ES y ES→JA)

### Pronunciación (TTS)

- [x] **TTS-01**: El usuario puede oír la pronunciación japonesa a demanda vía Web Speech API (botón, nunca auto-play)
- [x] **TTS-02**: El TTS degrada con gracia si no hay voz `ja-JP` (nunca bloquea ni usa una voz no japonesa)
  - *Nota: implementado y verificado en build/unit; la verificación en dispositivo real queda pendiente (el usuario aún no tiene voz ja-JP instalada en su Android — checkpoint 01-06 Task 3, item 6).*

### Gamificación ligera (GAM)

- [x] **GAM-01**: La app muestra una racha diaria
- [x] **GAM-02**: La app muestra el % de progreso global
- [x] **GAM-03**: La app muestra un contador de puntos (no punitivo)

### Interfaz y diseño (UI)

- [x] **UI-01**: UI mobile-first en el estilo índigo/morado + pastel de las referencias (tarjetas redondeadas, barra inferior, pantallas de ejercicio con progreso arriba y botón grande abajo)
- [x] **UI-02**: Barra de navegación inferior (Inicio · Glosario/Biblioteca · Guardados · Perfil/Ajustes)
- [x] **UI-03**: Dashboard de inicio con saludo, racha/puntos y accesos a "continuar" y a practicar por ámbito (Hoy/Semana/Total)

### Skill / pipeline de contenido (SKILL)

- [x] **SKILL-01**: Una skill de Claude Code transcribe el audio de clase en local con whisper.cpp (large-v3), sin API key
- [x] **SKILL-02**: La skill estructura la transcripción en JSON válido según el esquema, desambiguando la mezcla ES/JA en su paso de razonamiento LLM
- [x] **SKILL-03**: La skill valida su salida contra `content.schema.json` (ajv) antes de escribir
- [x] **SKILL-04**: La skill escribe/comitea el JSON de contenido con IDs deterministas y tags de clase/fecha, siguiendo un proceso rígido y repetible
- [x] **SKILL-05**: La skill se ejecuta siempre igual bajo un contrato fijo y documentado

## v2 Requirements

Diferidos a futuras versiones. Reconocidos pero fuera del roadmap actual.

### Aprendizaje adaptativo

- **ADAPT-01**: Selección automática del tipo de ejercicio según la madurez del ítem
- **ADAPT-02**: Panel de puntos débiles por clase
- **ADAPT-03**: Entrenamiento de parámetros FSRS (requiere 1.000+ repasos)

### Sincronización y avisos

- **SYNC-01**: Sincronización automática del progreso entre dispositivos
- **SYNC-02**: Recordatorios / notificaciones push de repaso

### Transcripción avanzada

- **TRANS-01**: Re-transcripción por segmentos con VAD para code-switching intra-frase más difícil

## Out of Scope

Excluido explícitamente. Documentado para evitar scope creep.

| Feature | Reason |
|---------|--------|
| Transcripción o generación de contenido dentro de la app | Vive en la skill; evita API keys en la app y garantiza formato rígido |
| Cálculo de furigana / analizador morfológico de japonés en cliente | Las lecturas son datos autoritativos del esquema; calcularlas enseñaría kanji incorrectos |
| Backend / cuentas de usuario | App personal de un solo usuario; sin servidor por diseño |
| App nativa (App Store / Play Store) | La PWA ya cubre app + web instalable |
| Social / rankings / vidas (hearts) / economía XP | Sin sentido para n=1 y puede ser punitivo |
| STT / puntuación de pronunciación | Fuera del alcance de v1 |
| Constructor de mazos (deck-builder) | El contenido llega solo desde clase vía skill |

## Descope lever (si falta tiempo en la fase)

Orden de recorte explícito, de menos a más crítico: **gamificación (GAM-*) → Modo C (parte de DISP-01) → (nunca) corrección del SRS, ingesta de contenido ni export/import.** La persistencia (PROG-02/03/05) y la corrección del SRS son guardarraíles del Core Value y no se recortan.

## Traceability

Qué fase cubre qué requisitos. Todos los v1 se implementan en **una sola fase** (restricción dura del usuario: tiempo limitado + ejecución autónoma en Fable 5 de una vez). El orden de construcción del research (esquema → shell → persistencia/SRS → display/ejercicios → TTS/gamificación/skill) es el orden interno de esa fase (planes/olas en `/gsd-plan-phase`), no fases separadas.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PWA-01 | Phase 1 | Complete |
| PWA-02 | Phase 1 | Complete |
| PWA-03 | Phase 1 | Complete |
| PWA-04 | Phase 1 | Complete |
| CONT-01 | Phase 1 | Pending |
| CONT-02 | Phase 1 | Pending |
| CONT-03 | Phase 1 | Pending |
| CONT-04 | Phase 1 | Pending |
| CONT-05 | Phase 1 | Pending |
| CONT-06 | Phase 1 | Complete |
| PROG-01 | Phase 1 | Complete |
| PROG-02 | Phase 1 | Complete |
| PROG-03 | Phase 1 | Complete |
| PROG-04 | Phase 1 | Complete |
| PROG-05 | Phase 1 | Complete |
| SRS-01 | Phase 1 | Complete |
| SRS-02 | Phase 1 | Complete |
| SRS-03 | Phase 1 | Complete |
| SRS-04 | Phase 1 | Complete |
| SRS-05 | Phase 1 | Complete |
| DISP-01 | Phase 1 | Complete |
| DISP-02 | Phase 1 | Complete |
| DISP-03 | Phase 1 | Complete |
| DISP-04 | Phase 1 | Complete |
| EXER-01 | Phase 1 | Complete |
| EXER-02 | Phase 1 | Complete |
| EXER-03 | Phase 1 | Complete |
| EXER-04 | Phase 1 | Complete |
| EXER-05 | Phase 1 | Complete |
| EXER-06 | Phase 1 | Complete |
| TTS-01 | Phase 1 | Complete |
| TTS-02 | Phase 1 | Complete |
| GAM-01 | Phase 1 | Complete |
| GAM-02 | Phase 1 | Complete |
| GAM-03 | Phase 1 | Complete |
| UI-01 | Phase 1 | Complete |
| UI-02 | Phase 1 | Complete |
| UI-03 | Phase 1 | Complete |
| SKILL-01 | Phase 1 | Complete |
| SKILL-02 | Phase 1 | Complete |
| SKILL-03 | Phase 1 | Complete |
| SKILL-04 | Phase 1 | Complete |
| SKILL-05 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 43 total
- Mapped to phases: 43 (all → Phase 1) ✓
- Unmapped: 0

---
*Requirements defined: 2026-07-06*
*Last updated: 2026-07-06 after roadmap creation (single-phase mapping)*

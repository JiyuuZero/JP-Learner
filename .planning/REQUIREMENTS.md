# Requirements: JP-Learner

**Defined:** 2026-07-06
**Core Value:** Practicar de forma efectiva (repetición espaciada + recuerdo activo) exactamente el contenido dado en clase, con la mínima fricción para expandirlo clase a clase.

## v1 Requirements

Requisitos para la primera versión. Se implementan en una sola fase (restricción del usuario), siguiendo el orden de construcción del research (esquema → shell → persistencia/SRS → display/ejercicios → TTS/gamificación/skill).

### App PWA y despliegue (PWA)

- [ ] **PWA-01**: El usuario puede instalar la app en móvil y escritorio desde el navegador (PWA instalable con manifest)
- [ ] **PWA-02**: El usuario puede usar la app completamente offline tras la primera carga (service worker cachea app + contenido)
- [ ] **PWA-03**: El contenido de una clase recién añadida aparece tras refrescar (network-first para HTML y JSON de contenido; cache-first solo para assets con hash)
- [ ] **PWA-04**: La app está publicada y accesible en una URL pública de GitHub Pages (base path configurado y fallback SPA vía 404.html o HashRouter)

### Esquema de contenido y contrato (CONT)

- [ ] **CONT-01**: El contenido se define con un esquema JSON versionado (`content.schema.json`) que es el único contrato skill↔app, con tipos TypeScript generados desde él
- [ ] **CONT-02**: Cada ítem de contenido tiene un ID estable y determinista (`<classId>:<type>:<slug>`) y está etiquetado con su clase y fecha
- [ ] **CONT-03**: Los ítems de vocabulario incluyen kanji, kana, romaji, traducción al español y una frase de ejemplo
- [ ] **CONT-04**: Los ítems de vocabulario incluyen segmentos de lectura por palabra y por kanji (`tokens[]`) para que la app renderice los 3 modos sin ningún análisis de japonés en cliente
- [ ] **CONT-05**: El esquema representa puntos de gramática (patrón + explicación + ejemplos) y notas de clase, etiquetados por clase/fecha
- [ ] **CONT-06**: La app carga el contenido desde JSON en el repo (índice + ficheros por clase) en modo solo lectura

### Progreso y persistencia (PROG)

- [ ] **PROG-01**: El progreso del usuario (estado SRS, set de kanji aprendidos, racha/puntos) persiste en local entre sesiones en IndexedDB
- [ ] **PROG-02**: El usuario puede exportar todo su progreso a un fichero JSON de backup
- [ ] **PROG-03**: El usuario puede importar un fichero de backup y restaurar el estado completo (round-trip verificado)
- [ ] **PROG-04**: El progreso referencia el contenido solo por ID y nunca lo embebe, de modo que reprocesar una clase no corrompe el historial
- [ ] **PROG-05**: La app solicita almacenamiento persistente (`navigator.storage.persist()`) y versiona el store con migraciones (`appVersion`)

### Repetición espaciada (SRS)

- [ ] **SRS-01**: Cada ítem tiene un único estado de programación FSRS (vía `ts-fsrs`), compartido por todos los tipos de ejercicio
- [ ] **SRS-02**: El usuario califica su recuerdo y FSRS programa el siguiente repaso
- [ ] **SRS-03**: El usuario puede practicar por ámbito de repaso: Hoy (lo nuevo del día), Esta semana, o Total
- [ ] **SRS-04**: "Hoy/Esta semana" y la racha usan límites de día por calendario local (no restas de timestamp)
- [ ] **SRS-05**: La entrada diaria de tarjetas nuevas está limitada para que las pausas no generen un backlog inabarcable

### Visualización del japonés (DISP)

- [ ] **DISP-01**: El usuario puede cambiar el modo de visualización del japonés en ajustes: (A) kana+kanji con furigana romaji, (B) kanji progresivo, (C) solo kanji
- [ ] **DISP-02**: La furigana se renderiza con `<ruby>` nativo a partir de los datos del esquema
- [ ] **DISP-03**: En el Modo B, las palabras salen por defecto en kana y pasan a kanji-con-furigana-kana a medida que el usuario marca sus kanji como aprendidos (sustitución paulatina)
- [ ] **DISP-04**: El usuario puede marcar kanji/palabras como aprendidos, actualizando el set de kanji aprendidos que alimenta el Modo B

### Ejercicios (EXER)

- [ ] **EXER-01**: Flashcards con recuerdo activo (muestra → revela → autoevalúa), alimentando el estado SRS compartido
- [ ] **EXER-02**: Preguntas de opción múltiple
- [ ] **EXER-03**: Rellenar/escribir con comprobación tolerante de respuesta (variantes romaji/kana, n/nn)
- [ ] **EXER-04**: Completar la frase con banco de palabras (frase en japonés con huecos + fichas de palabras japonesas)
- [ ] **EXER-05**: Emparejar parejas español↔japonés
- [ ] **EXER-06**: Los ejercicios pueden practicarse en ambos sentidos (JA→ES y ES→JA)

### Pronunciación (TTS)

- [ ] **TTS-01**: El usuario puede oír la pronunciación japonesa a demanda vía Web Speech API (botón, nunca auto-play)
- [ ] **TTS-02**: El TTS degrada con gracia si no hay voz `ja-JP` (nunca bloquea ni usa una voz no japonesa)

### Gamificación ligera (GAM)

- [ ] **GAM-01**: La app muestra una racha diaria
- [ ] **GAM-02**: La app muestra el % de progreso global
- [ ] **GAM-03**: La app muestra un contador de puntos (no punitivo)

### Interfaz y diseño (UI)

- [ ] **UI-01**: UI mobile-first en el estilo índigo/morado + pastel de las referencias (tarjetas redondeadas, barra inferior, pantallas de ejercicio con progreso arriba y botón grande abajo)
- [ ] **UI-02**: Barra de navegación inferior (Inicio · Glosario/Biblioteca · Guardados · Perfil/Ajustes)
- [ ] **UI-03**: Dashboard de inicio con saludo, racha/puntos y accesos a "continuar" y a practicar por ámbito (Hoy/Semana/Total)

### Skill / pipeline de contenido (SKILL)

- [ ] **SKILL-01**: Una skill de Claude Code transcribe el audio de clase en local con whisper.cpp (large-v3), sin API key
- [ ] **SKILL-02**: La skill estructura la transcripción en JSON válido según el esquema, desambiguando la mezcla ES/JA en su paso de razonamiento LLM
- [ ] **SKILL-03**: La skill valida su salida contra `content.schema.json` (ajv) antes de escribir
- [ ] **SKILL-04**: La skill escribe/comitea el JSON de contenido con IDs deterministas y tags de clase/fecha, siguiendo un proceso rígido y repetible
- [ ] **SKILL-05**: La skill se ejecuta siempre igual bajo un contrato fijo y documentado

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
| PWA-01 | Phase 1 | Pending |
| PWA-02 | Phase 1 | Pending |
| PWA-03 | Phase 1 | Pending |
| PWA-04 | Phase 1 | Pending |
| CONT-01 | Phase 1 | Pending |
| CONT-02 | Phase 1 | Pending |
| CONT-03 | Phase 1 | Pending |
| CONT-04 | Phase 1 | Pending |
| CONT-05 | Phase 1 | Pending |
| CONT-06 | Phase 1 | Pending |
| PROG-01 | Phase 1 | Pending |
| PROG-02 | Phase 1 | Pending |
| PROG-03 | Phase 1 | Pending |
| PROG-04 | Phase 1 | Pending |
| PROG-05 | Phase 1 | Pending |
| SRS-01 | Phase 1 | Pending |
| SRS-02 | Phase 1 | Pending |
| SRS-03 | Phase 1 | Pending |
| SRS-04 | Phase 1 | Pending |
| SRS-05 | Phase 1 | Pending |
| DISP-01 | Phase 1 | Pending |
| DISP-02 | Phase 1 | Pending |
| DISP-03 | Phase 1 | Pending |
| DISP-04 | Phase 1 | Pending |
| EXER-01 | Phase 1 | Pending |
| EXER-02 | Phase 1 | Pending |
| EXER-03 | Phase 1 | Pending |
| EXER-04 | Phase 1 | Pending |
| EXER-05 | Phase 1 | Pending |
| EXER-06 | Phase 1 | Pending |
| TTS-01 | Phase 1 | Pending |
| TTS-02 | Phase 1 | Pending |
| GAM-01 | Phase 1 | Pending |
| GAM-02 | Phase 1 | Pending |
| GAM-03 | Phase 1 | Pending |
| UI-01 | Phase 1 | Pending |
| UI-02 | Phase 1 | Pending |
| UI-03 | Phase 1 | Pending |
| SKILL-01 | Phase 1 | Pending |
| SKILL-02 | Phase 1 | Pending |
| SKILL-03 | Phase 1 | Pending |
| SKILL-04 | Phase 1 | Pending |
| SKILL-05 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37 (all → Phase 1) ✓
- Unmapped: 0

---
*Requirements defined: 2026-07-06*
*Last updated: 2026-07-06 after roadmap creation (single-phase mapping)*

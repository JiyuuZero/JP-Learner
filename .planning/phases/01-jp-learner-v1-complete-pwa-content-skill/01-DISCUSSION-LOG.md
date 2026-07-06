# Phase 1: JP-Learner v1 (complete PWA + content skill) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-06
**Phase:** 1-JP-Learner v1 (complete PWA + content skill)
**Areas discussed:** Composición de sesión, Ámbito×SRS, Marcado de kanji aprendido, Navegación del glosario

---

## Composición de la sesión de práctica

| Option | Description | Selected |
|--------|-------------|----------|
| Auto por SRS, mezcla tipos | La app sirve la cola de ítems que tocan, variando el tipo automáticamente | |
| Yo elijo tipo + ámbito | El usuario elige tipo de ejercicio y ámbito y practica solo eso | |
| Ambos: auto por defecto + elegir | Automático por defecto, con opción de elegir tipo concreto | ✓ |

**User's choice:** Ambos: auto por defecto + elegir
**Notes:** Sesión híbrida — arranque automático sin fricción, con override manual de tipo.

---

## Ámbito de repaso × cola SRS

| Option | Description | Selected |
|--------|-------------|----------|
| Ámbito filtra, SRS ordena dentro | El ámbito elige qué entra y SRS prioriza | |
| Ámbito repasa todo el periodo (ignora due) | Repaso intensivo del bloque aunque no toque | |
| Ambos como sub-modos | Botón 'repaso SRS' + botón 'repasar todo el periodo' | ✓ |

**User's choice:** Ambos como sub-modos
**Notes:** Repaso SRS (lo que toca) y repaso de periodo (Hoy/Semana/Total intensivo) conviven.

---

## Marcado de kanji "aprendido" (motor del Modo B)

| Option | Description | Selected |
|--------|-------------|----------|
| Auto tras X aciertos + manual | Se marca solo al acertar consistentemente, más override manual | ✓ |
| Solo manual | El usuario decide explícitamente | |
| Solo automático | La app lo gestiona sin intervención | |

**User's choice:** Auto tras X aciertos + manual
**Notes:** Auto-marca al graduar la tarjeta FSRS a `Review` (~2-3 aciertos, constante `LEARNED_THRESHOLD`), con marcar/desmarcar manual.

---

## Navegación del glosario / biblioteca

| Option | Description | Selected |
|--------|-------------|----------|
| Por clase + buscador | Lista de clases por fecha, entras y ves su contenido | |
| Por categoría + filtro de clase | Agrupado por tipo, con filtro por clase | |
| Ambas vistas conmutables | Alternas entre por clase y por categoría | ✓ |

**User's choice:** Ambas vistas conmutables
**Notes:** Dos vistas conmutables (clase / categoría) + buscador global.

## Claude's Discretion

- Valor exacto de `LEARNED_THRESHOLD`, tolerancia de typing, tamaño de sesión automática, micro-interacciones.
- Todas las decisiones de arquitectura/patrones/rendimiento (guiadas por research/SUMMARY.md).

## Deferred Ideas

- ADAPT-01/02/03, SYNC-01/02, TRANS-01 (ya recogidos como v2 en REQUIREMENTS.md).

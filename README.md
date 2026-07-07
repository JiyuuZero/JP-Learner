# JP-Learner

App personal (PWA) para consolidar y practicar lo aprendido en clases presenciales de
japonés. El contenido se genera a partir de los audios de clase (mezcla castellano/japonés)
mediante una skill de Claude que transcribe con Whisper en local y estructura el material
bajo un esquema rígido; la app lo consume para practicar con ejercicios tipo Duolingo
(SRS + recuerdo activo). Mobile-first, sin backend, sin API keys.

## Estructura del monorepo

```
content/    Fuente canónica del contenido (JSON versionado en git = backup)
  schema/     content.schema.json (CONGELADO, v1) — el contrato skill -> app
  classes/    Un JSON por clase (los escribe la skill)
  index.json  Manifiesto de clases
skill/      Skill de Claude: transcripción (whisper.cpp) + estructuración + validación
app/        La PWA (Vite 8 + React 19 + TypeScript 5.9 + Tailwind 4)
```

La skill **escribe** `content/`; la app **lee** `content/` (se copia a `app/public/content/`
en cada build — esa copia está gitignorada, la fuente de verdad es `content/`).

## Desarrollo local

```bash
cd app
npm install
npm run sync:content   # copia content/ -> public/content/ (también corre en cada build)
npm run dev            # http://localhost:5173/JP-Learner/
```

Otros comandos útiles (desde `app/`):

- `npm test` — suite de vitest (SRS, backup round-trip, modos de visualización, ejercicios)
- `npm run build` — `gen:types` (regenera tipos del esquema congelado) → `copy:content` → `tsc` → `vite build`
- `npm run validate:content` — valida una clase contra el esquema + invariantes de renderizado
- `npm run preview` — sirve `dist/` en local bajo `/JP-Learner/`

## Deploy (GitHub Pages)

Cada push a `main` dispara `.github/workflows/deploy.yml`:

1. `npm ci` + validación de todos los JSON de clase contra el esquema congelado
2. `npm run build` (regenera tipos, copia contenido, empaqueta con base `/JP-Learner/`)
3. `cp dist/index.html dist/404.html` (fallback SPA, cinturón y tirantes con HashRouter)
4. `actions/upload-pages-artifact` + `actions/deploy-pages`

La app queda publicada en `https://<usuario>.github.io/JP-Learner/`.

> Requisito único de configuración: en el repo, **Settings → Pages → Source: GitHub Actions**.

### Nota sobre el base path

El nombre del repo está cableado como base path `/JP-Learner/`. Si el repo se llama de otra
forma, cambia `base: '/JP-Learner/'` en `app/vite.config.ts` (controla `BASE_URL`, el scope
del service worker y el manifest). Para un dominio propio o un repo `usuario.github.io`,
usa `base: '/'`.

## Añadir una clase nueva

El flujo completo (audio → transcripción local con whisper.cpp → estructuración →
validación → commit) está documentado en [`skill/SKILL.md`](skill/SKILL.md). En corto:
la skill escribe `content/classes/<fecha>.json`, actualiza `content/index.json`, valida
contra el esquema y commitea. Al hacer push, el deploy publica la clase y la app la
muestra al refrescar (el contenido JSON se sirve con estrategia NetworkFirst).

## Progreso del usuario

El progreso (SRS, kanji aprendidos, racha, puntos) vive **solo** en IndexedDB del
dispositivo. Copias de seguridad: Perfil → **Exportar progreso** / **Importar progreso**
(fichero JSON). No hay sincronización entre dispositivos en v1.

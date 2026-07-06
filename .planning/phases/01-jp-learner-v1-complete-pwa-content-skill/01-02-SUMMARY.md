---
phase: 01-jp-learner-v1-complete-pwa-content-skill
plan: 02
subsystem: ui
tags: [vite, react, typescript, tailwind, vite-plugin-pwa, react-router, lucide-react, pwa]

# Dependency graph
requires:
  - phase: 01-01
    provides: "frozen content.schema.json v1, generated content.ts types (JPLearnerClassContent alias ClassContent), content/index.json + sample class"
provides:
  - "Installable offline PWA shell: Vite 8 + React 19 + TS 5.9.3 + Tailwind 4 CSS-first, base '/JP-Learner/', vite-plugin-pwa autoUpdate (NetworkFirst for /content/ JSON, precached hashed assets)"
  - "app/src/content/store.ts — loadContent(): ContentStore with vocabById/grammarById/kanjiById/noteById Maps + byClass buckets (CONT-06)"
  - "app/src/content/context.ts — ContentContext + useContent() hook exposing {store, loading, error, reload} to all views"
  - "Component primitives: Button (56px indigo pill / secondary border), Card (rounded-3xl shadow-soft, tint lavender/mint/peach/softblue/dark, large/compact padding), BottomNav (fixed 64px+safe-area, active indigo pill w/ label)"
  - "HashRouter shell: / (Home) · /glosario · /guardados · /perfil, error state with Reintentar, skeleton loading state"
  - "Tailwind v4 @theme tokens: indigo/coral/gold/lavender/mint/peach/softblue/ink/muted/surface/bg/dark + shadow-soft/card + font-display Nunito"
  - "192/512 maskable PWA icons (indigo, white JP) + manifest (lang es, standalone, theme #5A5AE6)"
affects: [01-04, 01-05, 01-06, exercises, display-modes, persistence-ui, dashboard]

# Tech tracking
tech-stack:
  added: [tailwindcss@4.3, "@tailwindcss/vite@4.3", vite-plugin-pwa@1.3, react-router-dom@7, lucide-react@1, idb@8, ts-fsrs@5, "typescript pinned ~5.9.0 (5.9.3)"]
  patterns:
    - "Tailwind v4 CSS-first: all design tokens in @theme in index.css; NO tailwind.config.js"
    - "Content fetch: BASE_URL + 'content/' + ClassMeta.file (file paths in index.json are relative to the content/ root)"
    - "Views consume content via useContent() from ContentContext — never fetch directly"
    - "SW strategy: precache hashed assets cache-first (globPatterns), /content/ JSON NetworkFirst (3s timeout) so new classes appear on refresh"

key-files:
  created:
    - app/src/content/store.ts
    - app/src/content/context.ts
    - app/src/components/Button.tsx
    - app/src/components/Card.tsx
    - app/src/components/BottomNav.tsx
    - app/src/views/Home.tsx
    - app/src/views/Glosario.tsx
    - app/src/views/Guardados.tsx
    - app/src/views/Perfil.tsx
    - app/src/app.tsx
    - app/public/content/index.json
    - app/public/content/classes/2026-04-14.json
    - app/public/pwa-192x192.png
    - app/public/pwa-512x512.png
  modified:
    - app/vite.config.ts
    - app/src/index.css
    - app/index.html
    - app/src/main.tsx
    - app/package.json
    - app/tsconfig.app.json

key-decisions:
  - "ClassMeta.file is resolved as BASE_URL + 'content/' + file — the RESEARCH verbatim `${BASE}${c.file}` would 404 because index.json stores paths relative to the content/ root"
  - "ContentContext lives in app/src/content/context.ts (not inside app.tsx) so views import it without a circular app.tsx↔views dependency"
  - "tsconfig.app.json types gains 'vite-plugin-pwa/client' for the virtual:pwa-register module types"
  - "Scaffold demo files (App.tsx/App.css/assets/icons.svg) removed when the shell replaced them — icons.svg would otherwise ship in the SW precache"

patterns-established:
  - "Shell layout: content column mx-auto max-w-[480px] px-4 pb-24 (clears the 64px nav); BottomNav rendered outside Routes so it persists across views"
  - "Copywriting contract enforced verbatim from 01-UI-SPEC (Aún no hay clases / Cargando tu contenido… / No se pudo cargar el contenido + Reintentar)"
  - "Content renders ONLY as React text children — dangerouslySetInnerHTML banned (grep-gated, T-02-01)"

requirements-completed: [PWA-01, PWA-02, PWA-03, CONT-06, UI-01, UI-02]

# Metrics
duration: 10min
completed: 2026-07-06
---

# Phase 1 Plan 02: PWA Shell & ContentStore Summary

**Installable offline PWA shell (Vite 8 + Tailwind 4 @theme + vite-plugin-pwa NetworkFirst content caching, base /JP-Learner/) with HashRouter 4-tab indigo/pastel bottom nav and a boot-fetching ContentStore serving the 5 frozen sample vocab items**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-06T22:14:45Z
- **Completed:** 2026-07-06T22:24:27Z
- **Tasks:** 2
- **Files modified:** 27 (13 created, 8 modified, 6 scaffold-demo removals)

## Accomplishments

- `vite.config.ts`: `base: '/JP-Learner/'`, Tailwind v4 Vite plugin (no PostCSS/no v3 config), VitePWA `registerType: 'autoUpdate'` with manifest (lang es, standalone, 192+512 maskable icons, theme `#5A5AE6`) and workbox NetworkFirst (`cacheName: 'content-json'`, 3s network timeout) on any `/content/` path; hashed assets precached cache-first via globPatterns.
- `index.css`: Tailwind v4 CSS-first `@theme` with the full UI-SPEC token set (7 palette colors, 5 neutrals, 2 shadows, Nunito font-display).
- ContentStore (`store.ts`): `loadContent()` fetches `BASE_URL + content/index.json`, then each class file, merging into 4 ID-keyed Maps + `byClass` buckets. Verified end-to-end against `vite preview`: all 5 sample vocab (食べます / 乗り込む / 毎日 / 本 / ありがとう) load through the exact boot path.
- Shell: HashRouter with 4 routes, `ContentContext` provider with `{store, loading, error, reload}`, skeleton loading state, error state per copywriting contract, fixed BottomNav (active = filled indigo pill + white icon + label; inactive = thin muted line icon).
- TypeScript pinned to 5.9.3 (`~5.9.0`, scaffold had 6.x); `tsc --noEmit` and `npm run build` both green; dist emits `index.html`, `sw.js`, `manifest.webmanifest`.
- PWA icons generated with a dependency-free Node PNG encoder (zlib IDAT + manual chunks/CRC): solid indigo square with blocky white "JP", 192+512, maskable-safe centering.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install stack, vite.config.ts (PWA+base+Tailwind v4), index.css @theme** - `c088d6b` (feat)
2. **Task 2: ContentStore + HashRouter shell + bottom nav + 4 views** - `8968ef2` (feat)

## Files Created/Modified

- `app/vite.config.ts` - base path, Tailwind v4 plugin, VitePWA manifest + workbox NetworkFirst on /content/
- `app/src/index.css` - Tailwind v4 `@import "tailwindcss"` + `@theme` tokens + minimal body base styles
- `app/index.html` - lang="es", JP-Learner title, Nunito preconnect+link, theme-color meta
- `app/src/content/store.ts` - `loadContent()` / `ContentStore` / `ContentIndex` / `ClassMeta` exports
- `app/src/content/context.ts` - `ContentContext` + `useContent()` hook
- `app/src/components/Button.tsx` - primary 56px indigo pill / secondary white+indigo border variants
- `app/src/components/Card.tsx` - rounded-3xl shadow-soft, tint + padding props
- `app/src/components/BottomNav.tsx` - fixed 64px+safe-area bar, NavLink active pill, lucide icons
- `app/src/views/{Home,Glosario,Guardados,Perfil}.tsx` - 4 routed views; Glosario lists vocab (kanji/romaji/es) with empty state
- `app/src/app.tsx` - HashRouter shell, content boot load, ContentContext provider, error state
- `app/src/main.tsx` - `registerSW({ immediate: true })` via virtual:pwa-register
- `app/public/content/` - Plan-01 frozen content copied for static serving (build-time copy script is Plan 06)
- `app/public/pwa-{192x192,512x512}.png` - maskable install icons
- `app/package.json` / `app/tsconfig.app.json` - pinned deps; `vite-plugin-pwa/client` types

## Decisions Made

- **Class file URL resolution**: `ClassMeta.file` ("classes/2026-04-14.json") is relative to the content root, so store.ts fetches `${BASE}content/${c.file}` (matches the plan's key_link `BASE_URL + 'content/...'` pattern).
- **ContentContext in its own module** (`content/context.ts`): avoids a circular import (app.tsx imports views, views would import app.tsx for the context). Not in the plan's file list but required by the plan's own instruction to create the context.
- **Removed scaffold demo files** (App.tsx→app.tsx rewrite, App.css, assets/hero+react+vite, public/icons.svg): dead demo weight; icons.svg in public/ would have been precached by the SW.
- **Icon generation**: one-off dependency-free Node script (PNG chunks + zlib) run from scratchpad; only the PNGs are committed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RESEARCH-verbatim store fetch path would 404 on class files**
- **Found during:** Task 2 (store.ts)
- **Issue:** 01-RESEARCH.md §ContentStore fetches `${BASE}${c.file}`, but Plan-01's frozen `index.json` stores `file` relative to the content root (`classes/2026-04-14.json`), yielding `/JP-Learner/classes/...` (404) instead of `/JP-Learner/content/classes/...`.
- **Fix:** store.ts fetches `${BASE}content/${c.file}`. No change to the frozen index.json/schema.
- **Files modified:** app/src/content/store.ts
- **Verification:** node fetch simulation against `vite preview` loads all 5 vocab items via the exact store code path.
- **Committed in:** 8968ef2 (Task 2 commit)

**2. [Rule 2 - Missing critical] PWA manifest lang defaulted to "en"**
- **Found during:** Task 2 (manifest inspection during preview verification)
- **Issue:** vite-plugin-pwa emits `"lang":"en"` by default; the entire UI is Spanish (D-05) — install metadata should match.
- **Fix:** Added `lang: 'es'` to the VitePWA manifest options.
- **Files modified:** app/vite.config.ts
- **Verification:** `dist/manifest.webmanifest` contains `"lang":"es"`.
- **Committed in:** 8968ef2 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Deviation 1 was required for the ContentStore to work at all against the frozen Plan-01 manifest. No scope creep; frozen contract untouched.

## Issues Encountered

- Task 2's initial commit captured only the renames/deletions because a single failing pathspec (`App.css`, already staged as deleted) aborted the whole `git add`. Fixed immediately by staging the remaining files and amending the same commit (own branch, own just-created commit) → final hash `8968ef2`. Working tree verified clean against HEAD afterwards.

## Known Stubs

All intentional per the plan ("placeholder views — real content in later plans"):

| Stub | File | Resolves in |
|------|------|-------------|
| Home shows only greeting + class/word count (no dashboard, streak, continue card) | app/src/views/Home.tsx | Plan 06 |
| Glosario renders vocab as plain text (no `<ruby>`/display modes, no search/grouping) | app/src/views/Glosario.tsx | Plan 05 |
| Guardados placeholder body (no saved items — needs persistence) | app/src/views/Guardados.tsx | Plan 04+ |
| Perfil placeholder body (no settings/export/import) | app/src/views/Perfil.tsx | Plan 04+ |

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: external-fetch | app/index.html | Plan-mandated Nunito Google Fonts `<link>` is an external network fetch (fonts.googleapis.com/gstatic). No secrets/params; degrades to system-ui offline. Slightly widens T-02-04's "zero network calls except same-origin content JSON" — Plan 06 hardening may want to self-host the woff2 (already in SW globPatterns). |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Every downstream UI plan mounts inside this shell: add routes in `app/src/app.tsx`, read content via `useContent()`, style with the `@theme` tokens.
- SW + base path verified against `vite preview` under `/JP-Learner/`; live-URL install/offline verification and GitHub Actions deploy are Plan 06.
- `app/public/content/` is a manual copy of `content/` for now — Plan 06 finalizes the build-time copy script (regenerate the copy if Plan 03's skill emits new classes before then).

---
*Phase: 01-jp-learner-v1-complete-pwa-content-skill*
*Completed: 2026-07-06*

## Self-Check: PASSED

- All 17 key files exist on disk (`[ -f ]` verified)
- Task commits c088d6b and 8968ef2 present in git log
- All 23 acceptance criteria re-run PASS (11 Task 1 + 12 Task 2)
- Plan-level verification: build emits dist/index.html + sw.js + manifest.webmanifest under base /JP-Learner/; manifest references 192+512 icons; NetworkFirst targets /content/; store boot path loads 5/5 vocab against vite preview

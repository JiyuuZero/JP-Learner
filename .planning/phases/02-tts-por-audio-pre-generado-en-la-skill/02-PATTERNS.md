# Phase 02: TTS por audio pre-generado en la skill - Pattern Map

**Mapped:** 2026-07-07
**Files analyzed:** 15 new/modified files
**Analogs found:** 13 / 15 (2 partial — no true analog for `<audio>` playback and `say`/`afconvert` invocation)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `skill/generate-audio.mjs` (NEW, name TBD) | script (skill CLI) | batch file-I/O | `skill/commit-class.mjs` | exact |
| `content/audio/index.json` (NEW, generated) | config/manifest | — (data artifact) | `content/index.json` | exact |
| `content/audio/2026-04-14/*.m4a` (NEW, generated) | binary asset | — (data artifact) | none (first binaries in content/) | no-analog |
| `skill/SKILL.md` (MOD: nuevo paso fijo) | doc/contract | — | itself (step 5 section) | exact (self) |
| `skill/commit-class.mjs` (MOD: pathspec de audio en commit) | script (skill CLI) | batch file-I/O | itself | exact (self) |
| `app/src/tts/tts.ts` (MOD: fallback chain + audio playback) | utility (module singleton) | event-driven (tap → play) | itself | exact (self) |
| `app/src/tts/TtsContext.tsx` (MOD: manifest load + capability state) | provider/context | request-response (boot fetch) | itself + `app/src/content/store.ts` | exact |
| `app/src/components/SpeakerButton.tsx` (MOD: itemId/audioKey prop) | component | event-driven | itself | exact (self) |
| `app/scripts/sync-content.mjs` (MOD: copiar audio/) | script (build) | file-I/O | itself | exact (self) |
| `app/vite.config.ts` (MOD: runtimeCaching para .m4a) | config | — | itself (content-json rule) | exact (self) |
| `app/src/exercises/Flashcard.tsx` (MOD: pasar audio key) | component | event-driven | itself (SpeakerButton callsites) | exact (self) |
| `app/src/views/Glosario.tsx` (MOD: pasar audio key) | component | event-driven | itself (SpeakerButton callsites) | exact (self) |
| `app/src/views/Perfil.tsx` (MOD posible: línea de estado TTS) | component | request-response | itself (líneas 103-114) | exact (self) |
| Pure-function test para slug/path (NEW, ej. `audioPath.test.ts`) | test | — | `app/src/exercises/check.test.ts` | role-match |
| `app/src/tts/audio.ts` (NEW opcional, si no se pliega en tts.ts) | utility | event-driven + fetch | `app/src/tts/tts.ts` + `store.ts` fetchJson | role-match |

**Nota clave para el planner:** los callsites actuales de SpeakerButton pasan solo `text` (kana). Para la ruta de audio, el botón necesita además la **clave del manifiesto** (itemId para la palabra; una clave derivada distinta para la frase de ejemplo — el manifiesto mapea `itemId → ruta`, decisión 3). Los IDs tienen forma `<classId>:<type>:<slug>` (validado en `skill/validate.mjs:39`); el filename sustituye `:` por `_` (decisión 2): `2026-04-14:vocab:tabemasu` → `2026-04-14/2026-04-14_vocab_tabemasu.m4a` (esquema exacto de nombre a decidir en planning, pero determinístico desde el ID).

## Pattern Assignments

### `skill/generate-audio.mjs` (script, batch file-I/O)

**Analog:** `skill/commit-class.mjs` — es EL patrón a copiar: header-comment con contrato, validate-first, escritura idempotente byte-compare, upsert de manifiesto, copia a `app/public/content/`, commit con pathspec explícito.

**Header + imports** (`skill/commit-class.mjs:1-20`):
```js
// skill/commit-class.mjs — SKILL-04: validate -> write -> update manifest -> git commit.
// Fail-closed: validateClass runs FIRST; nothing is written on any validation failure.
// Idempotent: re-processing a class REPLACES its index entry (never duplicates) ...
import { validateClass } from './validate.mjs';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url)); // repo root (skill/..)

const candidatePath = process.argv[2];
if (!candidatePath) {
  console.error('usage: node skill/commit-class.mjs <candidate-class.json>');
  process.exit(1);
}
```

**Escritura idempotente — comparar bytes antes de escribir** (`skill/commit-class.mjs:36-38`):
```js
const classBytes = JSON.stringify(doc, null, 2) + '\n';
const prevBytes = existsSync(classAbs) ? readFileSync(classAbs, 'utf8') : null;
if (prevBytes !== classBytes) writeFileSync(classAbs, classBytes);
```
Para el audio, el equivalente de "texto kana cambió" (decisión 9) puede seguir el patrón hash de la línea 41: `'sha256-' + createHash('sha256').update(...).digest('hex')` — guardar el hash del kana en el manifiesto y regenerar solo si difiere. Borrado de huérfanos: iterar el dir `content/audio/<classId>/` y eliminar ficheros sin entrada.

**Upsert de manifiesto — solo tocar generatedAt en cambio real** (`skill/commit-class.mjs:43-70`):
```js
const index = existsSync(indexAbs)
  ? JSON.parse(readFileSync(indexAbs, 'utf8'))
  : { contentVersion: 1, generatedAt: '', classes: [] };
// ... build entry ...
const at = index.classes.findIndex((c) => c.id === doc.classId);
const entryChanged = at < 0 || JSON.stringify(index.classes[at]) !== JSON.stringify(entry);
if (entryChanged) {
  if (at >= 0) index.classes[at] = entry;
  else index.classes.push(entry);
  index.contentVersion = 1;
  index.generatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); // refreshed only on real change
  writeFileSync(indexAbs, JSON.stringify(index, null, 2) + '\n');
}
```

**Copia a public/ para servir en local** (`skill/commit-class.mjs:72-77`):
```js
const pubDir = join(ROOT, 'app/public/content');
mkdirSync(join(pubDir, 'classes'), { recursive: true });
copyFileSync(classAbs, join(pubDir, `classes/${doc.classId}.json`));
copyFileSync(indexAbs, join(pubDir, 'index.json'));
```

**Invocación de herramientas externas** (`skill/commit-class.mjs:80` — mismo patrón para `say` y `afconvert`/`ffmpeg`):
```js
const git = (...args) => execFileSync('git', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
```
Referencia de conversión de audio en shell existente (`skill/transcribe.sh:28`): `ffmpeg -y -i "audio-src/$1" -ar 16000 -ac 1 -c:a pcm_s16le "audio-src/$1.wav"` — flags `-y` (overwrite) y salida explícita; el paso de audio hará el equivalente `say -v Kyoko -o tmp.aiff` → `afconvert`/`ffmpeg` a AAC/M4A mono 32-48 kbps.

---

### `skill/commit-class.mjs` (MOD — commit incluye audio)

**Patrón de commit con pathspec explícito a extender** (`skill/commit-class.mjs:79-96`):
```js
git('add', classRel, indexRel);
let staged = true;
try {
  git('diff', '--cached', '--quiet', '--', classRel, indexRel);
  staged = false; // exit 0 -> nothing staged for these paths
} catch {
  staged = true; // non-zero exit -> staged changes exist
}
if (staged) {
  // Explicit pathspec: commit ONLY the two content files ...
  git('commit', '-m', `content(${doc.classId}): add/update class ${doc.label}`, '--', classRel, indexRel);
  console.log(`COMMITTED ${doc.classId} (${contentHash})`);
} else {
  console.log(`NO CHANGES ${doc.classId} (already up to date)`);
}
```
Extender la lista de pathspecs con `content/audio/<classId>` y `content/audio/index.json` (decisión 9). `.gitignore` raíz ya ignora `app/public/content/` completo, así que las copias públicas de audio quedan ignoradas sin cambios.

---

### `content/audio/index.json` (NEW manifest)

**Analog:** `content/index.json` (fichero completo, 19 líneas):
```json
{
  "contentVersion": 1,
  "generatedAt": "2026-07-06T22:20:21Z",
  "classes": [
    {
      "id": "2026-04-14",
      "file": "classes/2026-04-14.json",
      "contentHash": "sha256-0a1cd5...",
      ...
    }
  ]
}
```
Mismo estilo: `generatedAt` ISO sin milisegundos, rutas relativas a `content/`, pretty-print 2 espacios + newline final. El de audio será mapa `itemId → ruta relativa` (decisión 3) en vez de array; conservar envoltorio con versión/generatedAt para el mismo tratamiento idempotente.

---

### `skill/SKILL.md` (MOD — nuevo paso fijo)

**Analog:** su propia sección de paso 5 (`skill/SKILL.md:65-79`). Estilo a replicar para el paso de audio:
```markdown
### 5. Write + commit — `node skill/commit-class.mjs <candidate.json>`

Re-validates (fail-closed), then:

- writes `content/classes/<classId>.json` (canonical pretty-print),
- updates `content/index.json` (upsert by classId — re-processing REPLACES the entry, ...
- `git add` + `git commit -m "content(<classId>): add/update class <label>"` (fixed
  message convention; skips the commit when nothing changed).
```
Ojo con el framing de líneas 1-6: "It always runs the SAME five steps, in the SAME order" — al añadir el paso hay que actualizar el conteo ("five steps" → nuevo número) y el título `## The 5 steps (invariant sequence)` (línea 23). El setup one-time (líneas 12-21) es donde documentar requisitos nuevos si los hay (`say`/`afconvert` vienen con macOS; ffmpeg ya está).

---

### `app/src/tts/tts.ts` (MOD — cadena de fallback)

**Analog:** él mismo. Patrón module-singleton con degradación silenciosa:

**Estado módulo + init con callback** (`app/src/tts/tts.ts:7-32`):
```ts
let jaVoice: SpeechSynthesisVoice | null = null

export function initTTS(onReady: (hasVoice: boolean) => void) {
  if (typeof speechSynthesis === 'undefined') {
    onReady(false)
    return
  }
  const pick = () => {
    const v = speechSynthesis.getVoices()
    jaVoice = v.find((x) => /ja[-_]JP/i.test(x.lang)) ?? null // Android uses ja_JP underscore
    onReady(!!jaVoice)
  }
  pick() // may return [] on first call
  speechSynthesis.addEventListener('voiceschanged', pick)
  // Poll a few times at ~250ms in case voiceschanged never fires (some WebViews).
  ...
}
```

**No-op silencioso — nunca voz incorrecta (TTS-02)** (`app/src/tts/tts.ts:35-43`):
```ts
export function speakJa(text: string) {
  if (!jaVoice) return // graceful no-op — NEVER speak JA with a non-JA voice (TTS-02)
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  u.voice = jaVoice
  u.rate = 0.9
  speechSynthesis.cancel()
  speechSynthesis.speak(u)
}
```
La ruta audio-file sigue la misma forma: singleton `HTMLAudioElement` a nivel de módulo (análogo a `jaVoice`), `cancel()` previo análogo (pausar/rebobinar el audio en curso antes de reproducir otro), y reproducción SOLO dentro del tap handler. **No hay analog de `<audio>` en el codebase** — usar `new Audio(BASE + ruta)` nativo; el patrón `BASE = import.meta.env.BASE_URL` viene de `store.ts:36`.

---

### `app/src/tts/TtsContext.tsx` (MOD — carga de manifiesto + capacidad)

**Analog A — él mismo** (fichero completo, 30 líneas): contexto con default seguro no-op + init una vez en mount:
```tsx
const TtsContext = createContext<TtsContextValue>({ hasVoice: false, speak: () => undefined })

export function TtsProvider({ children }: { children: ReactNode }) {
  const [hasVoice, setHasVoice] = useState(false)
  useEffect(() => {
    initTTS(setHasVoice)
  }, [])
  const speak = useCallback((text: string) => speakJa(text), [])
  return <TtsContext.Provider value={{ hasVoice, speak }}>{children}</TtsContext.Provider>
}
```

**Analog B — fetch del manifiesto:** `app/src/content/store.ts:36-47`:
```ts
const BASE = import.meta.env.BASE_URL // e.g. "/JP-Learner/"

// fetch() resolves on HTTP errors; without this check a 404 (e.g. the GitHub
// Pages SPA fallback serving HTML) would surface as a cryptic JSON SyntaxError.
async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return (await res.json()) as T
}

export async function loadContent(): Promise<ContentStore> {
  const index = await fetchJson<ContentIndex>('content/index.json')
  ...
```
**Diferencia crítica (decisión 3):** para `content/audio/index.json` un 404 NO es error — devuelve mapa vacío (`if (!res.ok) return {}`), a diferencia del throw de store.ts. El comentario de la trampa GitHub-Pages-fallback-HTML (líneas 38-39) aplica igual: el 404 de Pages puede devolver HTML con status 200 vía SPA fallback — el planner debe validar content-type o capturar el SyntaxError del `.json()` y degradar a mapa vacío.

---

### `app/src/components/SpeakerButton.tsx` (MOD — prop de clave de audio)

**Analog:** él mismo. Patrones a conservar intactos:

**Hide-never-disable + tap-gesture** (`app/src/components/SpeakerButton.tsx:19-32`):
```tsx
export default function SpeakerButton({ text, label, className = '' }: SpeakerButtonProps) {
  const { hasVoice, speak } = useTts()
  if (!hasVoice) return null // hide, never disable (TTS-02)

  const onActivate = (e: SyntheticEvent) => {
    e.stopPropagation() // don't flip the flashcard / open the row underneath
    speak(text) // inside the tap gesture (iOS requirement, TTS-01)
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onActivate(e)
    }
  }
```
Cambios: la condición de ocultar pasa a ser "ni audio para ESTE ítem ni voz ja-JP" (decisión 5) — necesita prop nueva (ej. `audioKey?: string`) y que el contexto exponga la consulta al manifiesto. Mantener: `span[role=button]` (línea 4-6 explica por qué: hosts que ya son `<button>` — Flashcard), `stopPropagation`, las dos variantes (bar con label líneas 34-48, icono 44px líneas 50-61), `aria-label` en castellano.

---

### `app/scripts/sync-content.mjs` (MOD — copiar audio/)

**Analog:** él mismo (fichero completo, 16 líneas):
```js
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const canonical = join(appRoot, '..', 'content');
const dest = join(appRoot, 'public', 'content');

rmSync(dest, { recursive: true, force: true });
mkdirSync(join(dest, 'classes'), { recursive: true });
cpSync(join(canonical, 'index.json'), join(dest, 'index.json'));
cpSync(join(canonical, 'classes'), join(dest, 'classes'), { recursive: true });
```
Añadir un `cpSync(join(canonical, 'audio'), join(dest, 'audio'), { recursive: true })` condicionado a `existsSync` (el dir audio puede no existir en repos recién clonados antes de correr la skill... en este repo existirá, pero el guard es barato). Wiring ya existente en `app/package.json:8-10`: `"sync:content": "node scripts/sync-content.mjs"`, y `build` lo ejecuta vía `copy:content`.

---

### `app/vite.config.ts` (MOD — cache de audio)

**Analog:** su propia regla de runtimeCaching (`app/vite.config.ts:27-41`):
```ts
workbox: {
  globPatterns: ['**/*.{js,css,html,woff2,png,svg}'], // precache hashed assets (cache-first)
  navigateFallback: 'index.html', // SPA shell
  runtimeCaching: [
    {
      // content JSON: a NEW class must appear on refresh (PWA-03) → network-first
      urlPattern: ({ url }) => url.pathname.includes('/content/'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'content-json',
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 200 },
      },
    },
  ],
},
```
Puntos para el planner (decisión 6): (a) NO añadir `m4a` a `globPatterns` — el precache inflaría el SW con binarios; (b) la regla actual `url.pathname.includes('/content/')` YA matchea `/content/audio/...` — si se quiere CacheFirst para los .m4a (binarios inmutables, la ruta cambia si cambia el kana… en realidad la ruta NO lleva hash, cuidado), hay que añadir una regla MÁS ESPECÍFICA ANTES (Workbox evalúa en orden) con `url.pathname.includes('/content/audio/')` y `handler: 'CacheFirst'` + `expiration: { maxEntries: N, maxAgeSeconds: ... }`; el manifiesto `audio/index.json` en cambio conviene que siga NetworkFirst (regla genérica de `/content/` ya lo cubre si la regla de audio matchea solo `.m4a`).

---

### `app/src/exercises/Flashcard.tsx` y `app/src/views/Glosario.tsx` (MOD — callsites)

**Callsites actuales exactos:**

`app/src/exercises/Flashcard.tsx:53-57` — derivación del texto hablado:
```tsx
function jaSpeechText(item: FlashcardExercise['item']): string {
  if (item.type === 'vocab') return item.kana
  if (item.type === 'kanji') return item.char
  return item.pattern
}
```
`app/src/exercises/Flashcard.tsx:106,118,130`:
```tsx
{front && <SpeakerButton text={jaSpeechText(item)} label="Pronunciación" />}
...
{!front && <SpeakerButton text={jaSpeechText(item)} label="Pronunciación" />}
...
{example && <SpeakerButton text={example.kana} />}
```
`app/src/views/Glosario.tsx:102,115`:
```tsx
<SpeakerButton text={item.kana} label="Pronunciación" />
...
<SpeakerButton text={item.example.kana} />
```
Cambio: añadir la clave del manifiesto en cada callsite. Solo vocab (palabra) y example tienen audio (decisión 4) — grammar/kanji/notes pasan sin clave y caen a Web Speech. El botón de example necesita clave distinta de la del ítem (el manifiesto debe distinguir palabra vs frase del mismo itemId — decisión del planner cómo: sufijo tipo `<itemId>:example` o segundo mapa).

**Ningún otro consumidor:** grep confirma que Matching/MultipleChoice/Typing/WordBank/Guardados/Session NO usan SpeakerButton — no tocar.

`app/src/views/Perfil.tsx:103-114` — línea de estado que la decisión 5 conserva:
```tsx
{/* TTS status (TTS-02, UI-SPEC §4): with no ja-JP voice the speaker
    buttons are hidden app-wide; this line explains why. */}
<p className="text-[14px] text-muted">
  {hasVoice
    ? 'Voz japonesa disponible en este dispositivo.'
    : 'Pronunciación no disponible en este dispositivo.'}
</p>
```
Con audio pre-generado, `hasVoice === false` ya no implica "sin pronunciación" — el mensaje debe reflejar el estado combinado (audio disponible / voz del sistema / nada).

---

### Test de función pura (slug/ruta de audio) (NEW)

**Analog:** `app/src/exercises/check.test.ts:1-10` — estilo vitest del proyecto:
```ts
// Tolerant typing checker tests (EXER-03) — romaji/kana variants, n/nn,
// punctuation/space stripping, NFKC width unification, long-vowel dash.
import { describe, expect, it } from 'vitest'
import { isAnswerCorrect, isEsAnswerCorrect } from './check'

describe('isAnswerCorrect (tolerant typing checker, EXER-03)', () => {
  it('accepts an exact romaji match', () => {
    expect(isAnswerCorrect('tabemasu', ['たべます', 'tabemasu'])).toBe(true)
  })
```
Convenciones: header-comment con ID de requisito, `describe` que nombra la función y el requisito, `it` en frases concretas, casos de regresión comentados (ver check.test.ts:57-60). Runner: `npm run test` → `vitest run` (app/package.json:12). La función determinística ID→filename (`:` → `_`) es la candidata natural; si vive en la skill (.mjs) y en la app, el test de app cubre la copia de app.

## Shared Patterns

### Header-comment con contrato y requirement-ID
**Source:** todos los ficheros (ej. `skill/commit-class.mjs:1-4`, `app/src/tts/tts.ts:1-6`)
**Apply to:** todo fichero nuevo o modificado
Cada fichero abre con un bloque de comentario que nombra el requisito (SKILL-04, TTS-01/02, CONT-06...) y el invariante clave en una frase ("Fail-closed: ...", "we NEVER speak Japanese with a non-Japanese voice"). Los nuevos ficheros de esta fase deben citar la decisión de fase (ej. "audio pre-generado, fallback chain: audio → Web Speech → hidden").

### Degradación silenciosa, ocultar nunca deshabilitar
**Source:** `app/src/tts/tts.ts:36`, `app/src/components/SpeakerButton.tsx:21`
**Apply to:** toda la cadena de fallback de audio
```ts
if (!jaVoice) return // graceful no-op
if (!hasVoice) return null // hide, never disable (TTS-02)
```
Regla TTS-02 intacta: nunca voz incorrecta, nunca auto-play, botón oculto (no disabled) cuando no hay capacidad.

### Fetch con BASE_URL + check response.ok
**Source:** `app/src/content/store.ts:36-44`
**Apply to:** carga del manifiesto de audio y construcción de URLs de .m4a
`const BASE = import.meta.env.BASE_URL` + template `${BASE}content/...`. Para el manifiesto de audio: 404 → mapa vacío (decisión 3), no throw.

### Escritura idempotente + generatedAt solo en cambio real
**Source:** `skill/commit-class.mjs:36-38, 62-70`
**Apply to:** generador de audio y manifiesto de audio
Comparar bytes/entrada previa antes de escribir; re-ejecutar la skill sin cambios produce `NO CHANGES` y ningún commit.

### Commit git con pathspec explícito y guard de staged
**Source:** `skill/commit-class.mjs:79-96`
**Apply to:** commit de audios y manifiesto
`git add <paths>` → `git diff --cached --quiet -- <paths>` como detector → `git commit -m "content(<classId>): ..." -- <paths>`. Nunca barrer staging ajeno.

### Wrapper execFileSync para herramientas externas
**Source:** `skill/commit-class.mjs:80`
**Apply to:** invocación de `say`, `afconvert`/`ffmpeg`
`execFileSync(tool, args, { cwd: ROOT, stdio: [...] })` — sin shell interpolation (args como array).

### Context provider con default no-op seguro
**Source:** `app/src/tts/TtsContext.tsx:13`, montaje en `app/src/app.tsx:50-53` (ContentContext → ProgressProvider → TtsProvider → HashRouter)
**Apply to:** extensión de TtsContext
`createContext<TtsContextValue>({ hasVoice: false, speak: () => undefined })` — nada crashea fuera del provider. TtsProvider ya está montado en app.tsx; no hay que tocar el árbol.

## No Analog Found

| File/Concern | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Reproducción `<audio>`/HTMLAudioElement | utility | event-driven | No existe reproducción de audio en la app; usar `new Audio(url)` nativo dentro del patrón singleton de `tts.ts` (analog estructural, no de API) |
| Invocación `say -v Kyoko` + `afconvert` | script | batch | Primera generación de audio en la skill; el analog más cercano es la invocación ffmpeg de `skill/transcribe.sh:28` y el wrapper execFileSync de `commit-class.mjs:80` |
| Binarios .m4a en `content/` | asset | — | `content/` hoy solo contiene JSON; sin implicación de patrón — git los trata como binarios sin más |

## Metadata

**Analog search scope:** `app/src/**`, `app/scripts/**`, `skill/**`, `content/**`, `app/vite.config.ts`, `app/package.json`, `.gitignore`
**Files scanned:** 25 (leídos en detalle: 16)
**Pattern extraction date:** 2026-07-07

**Datos verificados útiles para el planner:**
- IDs de ítem: `<classId>:<type>:<slug>` (p.ej. `2026-04-14:vocab:tabemasu`), validados en `skill/validate.mjs:39`; slug hepburn desde kana.
- La clase de muestra `content/classes/2026-04-14.json` tiene 5 vocab, todos con `example.kana` → 10 ficheros .m4a a generar en esta fase (palabra + frase por ítem).
- El schema (`content/schema/content.schema.json`, $defs: token/sentence/vocab/grammar/kanji/note) permanece INTACTO (decisión 2) — el manifiesto es sidecar.
- `.gitignore` raíz ya cubre `app/public/content/` entero: las copias públicas de audio quedan ignoradas sin cambio alguno; `content/audio/` SÍ se commitea (canónico).
- La regla runtimeCaching existente (`url.pathname.includes('/content/')`, NetworkFirst) ya matchea las rutas de audio — una regla CacheFirst para .m4a debe ir ANTES en el array para ganar.

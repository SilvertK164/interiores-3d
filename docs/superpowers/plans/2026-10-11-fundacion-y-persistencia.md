# Fundación y persistencia — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para ejecutar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que una persona pueda registrarse, crear un proyecto, editar un espacio en el editor 2D/3D de Pascal y volver a abrirlo desde cualquier navegador, con sus datos aislados de los demás, desplegado en Vercel y con la evidencia de proceso que evalúa el curso.

**Arquitectura:** monorepo pnpm. `apps/web` (Next 16 + `<Editor>` de Pascal) habla con Supabase Auth para la sesión y con `apps/api` (Fastify) para los datos; la API reenvía el JWT de la persona a Supabase Postgres, donde RLS protege cada fila. El contrato (`packages/contract`, zod, y `apps/api/openapi.yaml`) se escribe antes que las rutas. Solo `apps/web/src/editor/` conoce a Pascal.

**Tecnologías:** Node 22, pnpm 11.2.2, TypeScript 5.9.3, Next 16.4.0, React 19.3.0, Tailwind 4.3.3, Pascal `@pascal-app/*` 1.0.3, Fastify 5.12.5, zod 4.5.4, Supabase (Postgres + Auth + RLS), Vitest 5.0.3, Biome 2.5.15, Playwright 1.64.0.

**Spec:** [`docs/superpowers/specs/2026-10-11-fundacion-y-persistencia-design.md`](../specs/2026-10-11-fundacion-y-persistencia-design.md) (aprobado el 2026-10-11). Este plan lo implementa; leer ambos.

## Global Constraints

Valen para todas las tareas (copiadas del spec y de `CLAUDE.md`):

- Versiones **exactas** (sin `^` ni `~`) para todo lo que se instala. Pascal: `@pascal-app/{core,viewer,nodes,editor}` **1.0.3**; `three 0.186.1`; R3F 9.8.1; drei 10.7.9.
- **`zod` exacto `4.5.4`** en todo el repo: es la única versión que cumple el rango `>=4.5.4 <4.6` que exige Pascal.
- Todo texto de interfaz y todo mensaje de error de la API en **castellano neutro, tuteo** ("tú"). Los errores tienen la forma `{ "error": { "code", "message" } }`.
- **`404` y nunca `403`** para proyectos ajenos o con id mal formado. `204` sin cuerpo. Sin verbos en las rutas. Rutas de negocio bajo `/v1`; `GET /health` fuera de `/v1`.
- Escena: **5 MB máximo** serializados → `413`. `PUT` de escena exige `If-Match: <version>` (`428` si falta, `409` si es vieja).
- La API usa el **JWT de la persona** (RLS vigente). `service_role` solo en pruebas; nunca en `apps/web` ni en el código de la API.
- Cada tabla nueva se crea con **RLS y su política en la misma migración**.
- Solo `apps/web/src/editor/` importa `@pascal-app/*`, `three` o `@react-three/*` desde archivos `.ts`/`.tsx`. Se verifica con un test.
- Archivos de código de menos de 300 líneas. Commits `tipo(área): descripción` en castellano.
- Nunca se commitean claves ni `.env*` (salvo `.env.example`). Nunca se pega una clave en el chat.
- TDD: el primer test de cada unidad se ve **en rojo** (se pega la salida real en el PR) antes de implementar.
- Un único comando de verdad: `pnpm verify`. Si una prueba no puede correr (falta Supabase `dev`), **falla visible**, no se saltea.

## Review Focus

Entradas y condiciones que el spec implica pero que ninguna tarea probaría por sí sola; cada línea tiene su prueba en la tarea indicada.

1. **Id de proyecto mal formado** (`/v1/projects/abc`): debe responder `404`, no `500` por el error de cast a `uuid` de Postgres. → Tarea 3.
2. **Sesión vencida durante el autoguardado** (`401` en el `PUT`): no se pierde el trabajo local, no se reintenta en bucle y se avisa. → Tarea 4 (guardador) y Tarea 5 (aviso).
3. **`If-Match` raro** (`"3"` con comillas, `W/"3"`, `0`, `abc`, vacío): las dos primeras formas valen; el resto es `422`. → Tarea 3.
4. **El token no aparece en los logs** aunque el pedido falle o traiga un cuerpo enorme. → Tarea 3.
5. **Grafo vacío** (`nodes: {}`) y proyecto recién creado: la API lo acepta y el editor arranca con su escena por defecto (`onLoad` devuelve `null`), sin guardar un grafo vacío encima de uno poblado. → Tareas 1 y 4.

## Desviaciones del spec (verificadas el 2026-10-11)

Se detectaron al preparar el plan; no cambian los criterios de éxito. Se anotan también en `docs/decisiones.md` (Tarea 0).

| Spec | Qué encontramos | Qué hace el plan |
|---|---|---|
| §7: "el adaptador pasa el grafo por la función de migraciones que exporta `@pascal-app/core`" | `healSceneNodes` y `migrateVerticalSceneNodes` **no** se exportan desde `@pascal-app/core`; `useScene` las ejecuta solo al cargar una escena (`applySceneSnapshot`). | El adaptador **no** llama migraciones; valida el envelope y entrega el grafo. Pascal migra por dentro. |
| §8: "autoguardado con debounce de 2 s" | `<Editor>` ya trae autoguardado con debounce de **1 s** (`use-auto-save.ts`) y llama a `onSave`. | Nuestro `createSceneSaver` agrega un debounce de **2 s**, un solo guardado en vuelo y reintentos; `onSave` devuelve una promesa que se resuelve cuando se guardó. |
| §8: "assets estáticos se copian a `apps/web/public/`" y §9: el catálogo "sigue apuntando al bucket de Pascal" | El repo MIT de Pascal trae **144 carpetas de muebles** con `model.glb` en `apps/editor/public/items` (4,6 MB). De los 111 ítems de `CATALOG_ITEMS`, **100** existen ahí; los otros 11 (`cabinet`, que ahora es nodo nativo, y 10 con id generado: Kallax, Aeron, Camaro, etc.) solo están en su bucket. | Se vendorean los assets y los 100 ítems locales desde el repo MIT (commit fijo) y el catálogo se **autoaloja**; se descartan los 11. Desaparece la dependencia del bucket de Pascal. |

## Estructura de archivos

```
package.json, pnpm-workspace.yaml, tsconfig.base.json, biome.json, .nvmrc, .gitignore, .env.example
CLAUDE.md                        (ya existe; se amplía)
.claude/settings.json, rules/*.md, skills/verificar-cambio/SKILL.md
.mcp.json
.github/pull_request_template.md, workflows/ci.yml
docs/decisiones.md, bitacora.md, pascal-notes.md
tests/boundaries.test.ts, vitest.config.ts       (verifica D8)
packages/contract/                src/{scene,projects,errors,index}.ts + test/
apps/api/                         openapi.yaml, src/{index,build-app,config,auth,errors,store,supabase-store}.ts,
                                  src/routes/{health,projects,scene}.ts, test/**
supabase/                         config.toml, migrations/*_001_*.sql, tests/ (RLS)
apps/web/                         app/, src/editor/, src/lib/, scripts/vendor-pascal-assets.mjs, e2e/
```

---

### Tarea 0: Repo, harness y prerrequisitos

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `biome.json`, `.nvmrc`, `.env.example`, `vitest.config.ts`
- Create: `.claude/settings.json`, `.claude/rules/{datos-y-rls,apis-de-terceros,contrato-primero,mensajes-en-castellano}.md`, `.claude/skills/verificar-cambio/SKILL.md`, `.mcp.json`
- Create: `.github/pull_request_template.md`, `.github/workflows/ci.yml`
- Create: `docs/decisiones.md`, `docs/bitacora.md`
- Modify: `.gitignore`, `CLAUDE.md`

**Interfaces:**
- Produces: scripts raíz `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm verify`; workspace `apps/*`, `packages/*`, `supabase/tests`; `tsconfig.base.json` (NodeNext) que extienden los demás paquetes.

- [ ] **Paso 1: Prerrequisitos manuales (los hacen las personas, no el agente)**

Marcar cada casilla antes de seguir; el agente no puede crear cuentas ni pegar claves.

- [ ] Crear el repo público nuevo en GitHub (sin README ni licencia) e invitar a la otra persona como colaboradora.
- [ ] Crear el proyecto Supabase `dev` (y `prod` si la cuenta lo permite; si no, un solo proyecto y los datos de prueba llevan prefijo `rls-`). En **Authentication → Providers → Email** desactivar "Confirm email" en `dev`.
- [ ] Crear la cuenta Vercel con permiso para dos proyectos.
- [ ] Instalar la CLI de Supabase **fuera del repo** (la dependencia npm `supabase` no instala su binario en Windows con pnpm 11): `scoop install supabase` (Windows) o `brew install supabase/tap/supabase`. Comprobar con `supabase --version`.
- [ ] En `dev`, copiar *Project URL*, *anon key* y *service_role key* a un archivo local `.env.test` (ver Paso 3). Nunca al chat ni al repo.
- [ ] En GitHub → Settings → Secrets → Actions: crear `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (de `dev`).

- [ ] **Paso 2: Conectar el remoto y crear la rama**

```bash
git remote add origin https://github.com/<usuario>/<repo>.git
git push -u origin main
git switch -c feature/t0-harness
```
Esperado: `main` publicado con el spec y el plan en el historial; rama nueva creada.

- [ ] **Paso 3: Archivos raíz**

Create `package.json`:

```json
{
  "name": "interiores",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.2.2",
  "engines": { "node": ">=22.13" },
  "scripts": {
    "lint": "biome lint .",
    "format": "biome format --write .",
    "typecheck": "pnpm -r --if-present typecheck",
    "test": "pnpm -r --if-present test && vitest run",
    "build": "pnpm -r --if-present build",
    "verify": "pnpm lint && pnpm build && pnpm typecheck && pnpm test"
  },
  "devDependencies": {
    "@biomejs/biome": "2.5.15",
    "@types/node": "22.20.5",
    "typescript": "5.9.3",
    "vitest": "5.0.3"
  }
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*
  - packages/*
  - supabase/tests
allowBuilds:
  esbuild: true
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

Create `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.15/schema.json",
  "files": {
    "includes": ["**", "!!**/node_modules", "!!**/dist", "!!**/.next", "!!apps/web/public", "!**/*.css", "!docs", "!design", "!supabase/.temp", "!pnpm-lock.yaml"]
  },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "asNeeded" } },
  "linter": { "enabled": true }
}
```

Nota: `!!` (doble signo) saca las carpetas pesadas también del indexado de Biome; con un solo `!` `biome` recorre `node_modules` y `public/` y tarda minutos. `pnpm lint` revisa reglas; el formato se aplica con `pnpm format` (no bloquea `verify`).

Create `.nvmrc`:

```
22
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({ test: { include: ['tests/**/*.test.ts'] } })
```

Create `.env.example`:

```bash
# Copia a .env.test (pruebas) o a apps/api/.env y apps/web/.env.local (desarrollo). NUNCA subas los reales.
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon key de dev>
# Solo para pruebas contra dev (crear y borrar usuarios de prueba). No va a Vercel.
SUPABASE_SERVICE_ROLE_KEY=<service_role key de dev>
# apps/api
CORS_ORIGINS=http://localhost:3000
PORT=3001
# apps/web
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key de dev>
NEXT_PUBLIC_API_URL=http://localhost:3001
# Para el MCP de Supabase (solo lectura)
SUPABASE_DEV_PROJECT_REF=<project-ref>
```

Modify `.gitignore` (agregar al final):

```
# Playwright
apps/web/e2e/.auth/
playwright-report/
test-results/
```

- [ ] **Paso 4: Harness de Claude Code**

Create `.claude/settings.json`:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(pnpm verify)",
      "Bash(pnpm test*)",
      "Bash(pnpm lint*)",
      "Bash(pnpm typecheck*)",
      "Bash(pnpm build*)",
      "Bash(pnpm --filter *)",
      "Bash(git status*)",
      "Bash(git diff*)",
      "Bash(git log*)",
      "Bash(git add*)",
      "Bash(git commit*)",
      "Bash(git switch*)"
    ],
    "ask": [
      "Bash(git push*)",
      "Bash(pnpm add*)",
      "Bash(supabase db push*)",
      "Bash(supabase link*)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.local)",
      "Read(./.env.test)",
      "Read(./**/.env)",
      "Read(./**/.env.local)",
      "Read(./**/.env.test)",
      "Read(./supabase/.temp/**)",
      "Bash(git push --force*)",
      "Bash(git reset --hard*)",
      "Bash(supabase db reset*)"
    ]
  },
  "enabledPlugins": { "superpowers@superpowers-marketplace": true },
  "enabledMcpjsonServers": ["playwright", "supabase"]
}
```

Create `.mcp.json`:

```json
{
  "mcpServers": {
    "playwright": { "command": "npx", "args": ["@playwright/mcp@0.0.83"] },
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=${SUPABASE_DEV_PROJECT_REF}&read_only=true"
    }
  }
}
```

Create `.claude/rules/datos-y-rls.md`:

```markdown
---
paths:
  - "supabase/**"
  - "apps/api/src/supabase-store.ts"
---

# Datos y RLS

- Toda tabla nueva se crea con `enable row level security` y sus políticas **en la misma migración**.
- Sin política para `anon`; se hace `revoke all ... from anon`.
- Las migraciones las aplica una sola persona (`supabase db push`); el resto las propone por PR.
- `service_role` solo existe en pruebas (`.env.test`). Nunca en `apps/web` ni en `apps/api/src`.
- Una prueba de RLS usa dos usuarios reales de `dev`; no se mockea la base.
```

Create `.claude/rules/apis-de-terceros.md`:

```markdown
---
paths:
  - "apps/web/src/editor/**"
---

# APIs de terceros (Pascal)

- Pascal no está en el material del curso: **no inventes nombres**. Antes de usar un export, búscalo en `node_modules/@pascal-app/*` y anótalo en `docs/pascal-notes.md`.
- Versiones exactas (`1.0.3`). Si una API cambia, se registra en `docs/bitacora.md`.
- Este directorio es el único que importa `@pascal-app/*`, `three` y `@react-three/*`.
```

Create `.claude/rules/contrato-primero.md`:

```markdown
---
paths:
  - "apps/api/**"
  - "packages/contract/**"
---

# Contrato primero

- `apps/api/openapi.yaml` se actualiza **antes** que el código de la ruta; el test de contrato compara rutas del código y del yaml.
- `404` y nunca `403` para recursos ajenos. Errores con `{ error: { code, message } }` en castellano.
- Los esquemas de `packages/contract` y el yaml coinciden (hay un test que lo comprueba).
```

Create `.claude/rules/mensajes-en-castellano.md`:

```markdown
---
paths:
  - "apps/**"
---

# Mensajes en castellano

- Todo texto visible y todo mensaje de error: castellano neutro, tuteo ("tú").
- Los mensajes de error se traducen en una sola capa: `apps/web/src/lib/api/errors.ts` (web) y `apps/api/src/errors.ts` (API).
- Sin lenguaje técnico en pantalla: "ambiente" y no "zona"; "versión" y no "etag".
```

Create `.claude/skills/verificar-cambio/SKILL.md`:

```markdown
---
name: verificar-cambio
description: Úsala antes de decir que una tarea terminó o de abrir un PR en este repo. Obliga a correr pnpm verify y a pegar la salida real.
---

# Verificar un cambio

1. Corre `pnpm verify` desde la raíz y espera a que termine.
2. Si falla, **no** digas que terminó: arregla la causa o informa la falla con la salida literal.
3. Pega en el PR las últimas líneas de la salida (suites y pruebas pasadas).
4. Confirma que el primer test de la tarea se vio en rojo antes del verde (pega ese fragmento).
5. Si tocaste el editor, comprueba `git grep -l "@pascal-app/" -- '*.ts' '*.tsx'`: solo debe listar `apps/web/src/editor/`.
```

- [ ] **Paso 5: Plantilla de PR, CI y docs vivas**

Create `.github/pull_request_template.md`:

```markdown
## Qué cambia
<!-- Una o dos frases. -->

## Por qué
<!-- Enlaza la tarea del plan y el criterio de éxito del spec que cubre. -->

## Cómo lo verifiqué
<!-- Pega la salida real de `pnpm verify` y, si aplica, el fragmento del test en rojo. -->

## Riesgos
<!-- Qué podría romperse y cómo se detecta. -->

## Lista de control
- [ ] El primer test se vio en rojo antes del verde
- [ ] `pnpm verify` en verde
- [ ] Docs actualizadas (`docs/ESTADO.md`, `docs/bitacora.md` si hubo una alucinación o una sorpresa)
- [ ] Revisión cruzada de la otra persona
```

Create `.github/workflows/ci.yml`:

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
jobs:
  verify:
    runs-on: ubuntu-latest
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      NEXT_PUBLIC_API_URL: http://localhost:3001
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm verify
```

Create `docs/decisiones.md`:

```markdown
# Decisiones de diseño

Las decisiones D1–D10 con sus alternativas están en el
[spec 1](superpowers/specs/2026-10-11-fundacion-y-persistencia-design.md#3-decisiones-insumo-directo-de-qué-decidí-yo-del-readme).
Aquí se anotan las que se toman después, con fecha.

## 2026-10-11 — Desviaciones al preparar el plan
- **Migraciones de escena:** `healSceneNodes` y `migrateVerticalSceneNodes` no se exportan desde `@pascal-app/core`; `useScene` las corre al cargar. El adaptador solo valida el envelope.
- **Autoguardado:** Pascal ya hace debounce de 1 s; nuestro `createSceneSaver` agrega 2 s, un solo guardado en vuelo y reintentos.
- **Catálogo autoalojado:** 100 de los 111 ítems existen con `model.glb` dentro del repo MIT de Pascal (commit `86f8e833904f7b6b3358bb1505feb82d801ad9ad`); se vendorean y se descartan 11 (nodo `cabinet` nativo e ítems con id generado de procedencia dudosa).
```

Create `docs/bitacora.md`:

```markdown
# Bitácora de proceso

Registro de sorpresas, alucinaciones del agente y correcciones. Una línea por hecho, con fecha.

- 2026-10-11 — Se creyó que el catálogo de Pascal dependía de su bucket; el repo MIT trae 100 de los 111 modelos. Se verificó listando `apps/editor/public/items`.
- 2026-10-11 — Se creyó que `scene-migrations` se podía llamar desde `@pascal-app/core`; no se exporta. Se verificó en `core/dist/index.d.ts`.
- 2026-10-11 — `pnpm 11` aborta con `ERR_PNPM_IGNORED_BUILDS` si no se declara `allowBuilds` para `esbuild`.
```

Modify `CLAUDE.md`: reemplazar la línea "Todavía **no hay código de producto**…" por:

```markdown
- Plan vigente: `docs/superpowers/plans/2026-10-11-fundacion-y-persistencia.md`. Comando único: `pnpm verify`. Reglas por zona en `.claude/rules/` y en cada `apps/*/CLAUDE.md`.
```

- [ ] **Paso 6: Instalar y verificar el esqueleto**

Run: `pnpm install`
Expected: instala sin `ERR_PNPM_IGNORED_BUILDS` y crea `pnpm-lock.yaml`.

Run: `pnpm verify`
Expected: PASS (no hay paquetes aún; `lint` revisa los JSON y `vitest run` sin tests termina con "No test files found" — si Vitest sale con código 1 por no encontrar tests, agregar `"passWithNoTests": true` dentro de `test` en `vitest.config.ts` y repetir).

- [ ] **Paso 7: Commit y PR**

```bash
git add -A
git commit -m "chore(harness): monorepo pnpm, reglas de Claude Code, CI y plantilla de PR"
git push -u origin feature/t0-harness
```
Abrir el PR con la plantilla; la otra persona revisa y hace *squash and merge* a `main`.

---

### Tarea 1: Contrato primero (zod + OpenAPI)

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `packages/contract/{package.json,tsconfig.json,tsconfig.build.json}`
- Create: `packages/contract/src/{scene,projects,errors,index}.ts`
- Create: `packages/contract/test/{scene,projects}.test.ts`
- Create: `apps/api/{package.json,tsconfig.json,openapi.yaml}`
- Create: `apps/api/test/openapi.test.ts`

**Interfaces:**
- Produces (`@interiores/contract`): `SceneEnvelopeSchema`, `SceneGraphSchema`, `emptyEnvelope()`, `isEmptyGraph(graph)`, `SCENE_MAX_BYTES`, `SCHEMA_VERSION`, `PASCAL_CORE_VERSION`; `CreateProjectBodySchema`, `UpdateProjectBodySchema`, `ProjectSummarySchema`, `ProjectCreatedSchema`, `ProjectDetailSchema`, `SceneSavedSchema`, `ProjectKindSchema`; `ErrorBodySchema`, `ERROR_CODES`; los tipos `SceneEnvelope`, `SceneGraph`, `ProjectSummary`, `ProjectCreated`, `ProjectDetail`, `CreateProjectBody`, `UpdateProjectBody`, `SceneSaved`, `ProjectKind`, `ErrorBody`.
- Produces: `apps/api/openapi.yaml` (6 rutas del spec + `/health`).

- [ ] **Paso 1: Rama y esqueleto del paquete de contrato**

```bash
git switch main && git pull && git switch -c feature/t1-contrato
```

Create `packages/contract/package.json`:

```json
{
  "name": "@interiores/contract",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": { "zod": "4.5.4" },
  "devDependencies": {
    "@types/node": "22.20.5",
    "typescript": "5.9.3",
    "vitest": "5.0.3"
  }
}
```

Create `packages/contract/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true, "types": ["node"] },
  "include": ["src", "test"]
}
```

Create `packages/contract/tsconfig.build.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "declaration": true, "noEmit": false },
  "include": ["src"]
}
```

- [ ] **Paso 2: Escribir los tests en rojo**

Create `packages/contract/test/scene.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { SCENE_MAX_BYTES, SceneEnvelopeSchema, emptyEnvelope, isEmptyGraph } from '../src/index.js'

describe('SceneEnvelope', () => {
  it('acepta la escena vacía que crea la API', () => {
    expect(SceneEnvelopeSchema.safeParse(emptyEnvelope()).success).toBe(true)
  })

  it('rechaza un schemaVersion que no es el actual', () => {
    const bad = { ...emptyEnvelope(), schemaVersion: 2 }
    expect(SceneEnvelopeSchema.safeParse(bad).success).toBe(false)
  })

  it('rechaza un grafo sin nodes ni rootNodeIds', () => {
    const bad = { ...emptyEnvelope(), graph: {} }
    expect(SceneEnvelopeSchema.safeParse(bad).success).toBe(false)
  })

  it('conserva campos desconocidos del grafo de Pascal', () => {
    const env = emptyEnvelope()
    const withExtra = { ...env, graph: { ...env.graph, futuro: { a: 1 } } }
    const parsed = SceneEnvelopeSchema.parse(withExtra)
    expect((parsed.graph as Record<string, unknown>).futuro).toEqual({ a: 1 })
  })

  it('reconoce una escena vacía y una con contenido', () => {
    expect(isEmptyGraph(emptyEnvelope().graph)).toBe(true)
    expect(isEmptyGraph({ nodes: { wall_1: {} }, rootNodeIds: ['wall_1'] })).toBe(false)
  })

  it('el límite de escena es de 5 MB', () => {
    expect(SCENE_MAX_BYTES).toBe(5 * 1024 * 1024)
  })
})
```

Create `packages/contract/test/projects.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CreateProjectBodySchema, UpdateProjectBodySchema } from '../src/index.js'

describe('CreateProjectBody', () => {
  it('recorta espacios del nombre', () => {
    expect(CreateProjectBodySchema.parse({ name: '  Casa Alvear  ' }).name).toBe('Casa Alvear')
  })

  it('rechaza nombre vacío o de más de 80 caracteres', () => {
    expect(CreateProjectBodySchema.safeParse({ name: '   ' }).success).toBe(false)
    expect(CreateProjectBodySchema.safeParse({ name: 'a'.repeat(81) }).success).toBe(false)
    expect(CreateProjectBodySchema.safeParse({ name: 'a'.repeat(80) }).success).toBe(true)
  })

  it('solo admite vivienda o comercio como tipo', () => {
    expect(CreateProjectBodySchema.safeParse({ name: 'x', kind: 'oficina' }).success).toBe(false)
    expect(CreateProjectBodySchema.safeParse({ name: 'x', kind: 'comercio' }).success).toBe(true)
  })
})

describe('UpdateProjectBody', () => {
  it('exige al menos un campo', () => {
    expect(UpdateProjectBodySchema.safeParse({}).success).toBe(false)
    expect(UpdateProjectBodySchema.safeParse({ name: 'Nuevo' }).success).toBe(true)
  })

  it('permite quitar el tipo con null', () => {
    expect(UpdateProjectBodySchema.safeParse({ kind: null }).success).toBe(true)
  })
})
```

- [ ] **Paso 3: Ver los tests fallar**

Run: `pnpm install && pnpm --filter @interiores/contract test`
Expected: FAIL — `Failed to resolve import "../src/index.js"` en las dos suites. **Pegar esta salida en el PR** (evidencia del rojo).

- [ ] **Paso 4: Implementar el contrato**

Create `packages/contract/src/scene.ts`:

```ts
import { z } from 'zod'

export const SCHEMA_VERSION = 1
export const SCENE_MAX_BYTES = 5 * 1024 * 1024
export const PASCAL_CORE_VERSION = '1.0.3'

export const SceneGraphSchema = z.looseObject({
  nodes: z.record(z.string(), z.unknown()),
  rootNodeIds: z.array(z.string()),
  collections: z.record(z.string(), z.unknown()).optional(),
  materials: z.record(z.string(), z.unknown()).optional(),
  installedPlugins: z.array(z.string()).optional(),
})

export const SceneEnvelopeSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  pascal: z.object({ core: z.string().min(1) }),
  graph: SceneGraphSchema,
})

export type SceneGraph = z.infer<typeof SceneGraphSchema>
export type SceneEnvelope = z.infer<typeof SceneEnvelopeSchema>

export function emptyEnvelope(): SceneEnvelope {
  return {
    schemaVersion: SCHEMA_VERSION,
    pascal: { core: PASCAL_CORE_VERSION },
    graph: { nodes: {}, rootNodeIds: [], collections: {}, materials: {}, installedPlugins: [] },
  }
}

export function isEmptyGraph(graph: SceneGraph): boolean {
  return graph.rootNodeIds.length === 0 && Object.keys(graph.nodes).length === 0
}
```

Create `packages/contract/src/projects.ts`:

```ts
import { z } from 'zod'
import { SceneEnvelopeSchema } from './scene.js'

export const ProjectKindSchema = z.enum(['vivienda', 'comercio'])
export const ProjectNameSchema = z.string().trim().min(1).max(80)

export const CreateProjectBodySchema = z.object({
  name: ProjectNameSchema,
  kind: ProjectKindSchema.optional(),
})

export const UpdateProjectBodySchema = z
  .object({
    name: ProjectNameSchema.optional(),
    kind: ProjectKindSchema.nullable().optional(),
  })
  .refine((b) => b.name !== undefined || b.kind !== undefined, {
    message: 'Indica al menos un campo para actualizar',
  })

export const ProjectSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  kind: ProjectKindSchema.nullable(),
  updatedAt: z.iso.datetime({ offset: true }),
})

export const ProjectCreatedSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  kind: ProjectKindSchema.nullable(),
  version: z.literal(1),
})

export const ProjectDetailSchema = ProjectSummarySchema.extend({
  scene: SceneEnvelopeSchema,
  version: z.number().int().min(1),
})

export const SceneSavedSchema = z.object({ version: z.number().int().min(1) })

export type ProjectKind = z.infer<typeof ProjectKindSchema>
export type CreateProjectBody = z.infer<typeof CreateProjectBodySchema>
export type UpdateProjectBody = z.infer<typeof UpdateProjectBodySchema>
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>
export type ProjectCreated = z.infer<typeof ProjectCreatedSchema>
export type ProjectDetail = z.infer<typeof ProjectDetailSchema>
export type SceneSaved = z.infer<typeof SceneSavedSchema>
```

Create `packages/contract/src/errors.ts`:

```ts
import { z } from 'zod'

export const ErrorBodySchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
})
export type ErrorBody = z.infer<typeof ErrorBodySchema>

export const ERROR_CODES = {
  unauthorized: 'no_autenticado',
  notFound: 'no_encontrado',
  invalid: 'datos_invalidos',
  conflict: 'version_desactualizada',
  tooLarge: 'escena_demasiado_grande',
  preconditionRequired: 'falta_if_match',
  internal: 'error_interno',
} as const
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
```

Create `packages/contract/src/index.ts`:

```ts
export * from './errors.js'
export * from './projects.js'
export * from './scene.js'
```

- [ ] **Paso 5: Ver los tests pasar y compilar el paquete**

Run: `pnpm --filter @interiores/contract test && pnpm --filter @interiores/contract build`
Expected: PASS (2 suites, 11 tests) y se crea `packages/contract/dist/index.js`.

- [ ] **Paso 6: Escribir el test del contrato OpenAPI en rojo**

Create `apps/api/package.json`:

```json
{
  "name": "@interiores/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch --env-file=.env src/index.ts",
    "build": "pnpm --filter @interiores/contract build && tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json",
    "test": "pnpm --filter @interiores/contract build && vitest run"
  },
  "dependencies": {
    "@fastify/cors": "11.3.1",
    "@interiores/contract": "workspace:*",
    "@supabase/supabase-js": "2.117.3",
    "fastify": "5.12.5",
    "zod": "4.5.4"
  },
  "devDependencies": {
    "@seriousme/openapi-schema-validator": "2.11.0",
    "@types/node": "22.20.5",
    "tsx": "4.23.15",
    "typescript": "5.9.3",
    "vitest": "5.0.3",
    "yaml": "2.9.1"
  }
}
```

Create `apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true, "types": ["node"] },
  "include": ["src", "test"]
}
```

Create `apps/api/test/openapi.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  CreateProjectBodySchema,
  ErrorBodySchema,
  ProjectCreatedSchema,
  ProjectDetailSchema,
  ProjectSummarySchema,
  SceneEnvelopeSchema,
  SceneSavedSchema,
  UpdateProjectBodySchema,
} from '@interiores/contract'
import { Validator } from '@seriousme/openapi-schema-validator'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { z } from 'zod'

// biome-ignore lint/suspicious/noExplicitAny: el yaml se recorre dinámicamente
const spec = parse(readFileSync(fileURLToPath(new URL('../openapi.yaml', import.meta.url)), 'utf8')) as Record<string, any>

describe('openapi.yaml', () => {
  it('es un documento OpenAPI 3.1 válido', async () => {
    const result = await new Validator().validate(spec)
    expect(result.valid, JSON.stringify(result.errors)).toBe(true)
    expect(spec.openapi).toBe('3.1.0')
  })

  it('declara las rutas del spec con sus códigos de respuesta', () => {
    const codes = (path: string, method: string) =>
      Object.keys(spec.paths[path][method].responses).sort()
    expect(codes('/v1/projects', 'get')).toEqual(['200', '401'])
    expect(codes('/v1/projects', 'post')).toEqual(['201', '401', '422'])
    expect(codes('/v1/projects/{id}', 'get')).toEqual(['200', '401', '404'])
    expect(codes('/v1/projects/{id}', 'patch')).toEqual(['200', '401', '404', '422'])
    expect(codes('/v1/projects/{id}', 'delete')).toEqual(['204', '401', '404'])
    expect(codes('/v1/projects/{id}/scene', 'put')).toEqual(['200', '401', '404', '409', '413', '422', '428'])
    expect(spec.paths['/health'].get.security).toEqual([])
  })

  const pairs: [string, z.ZodType][] = [
    ['CreateProjectBody', CreateProjectBodySchema],
    ['UpdateProjectBody', UpdateProjectBodySchema],
    ['ProjectSummary', ProjectSummarySchema],
    ['ProjectCreated', ProjectCreatedSchema],
    ['ProjectDetail', ProjectDetailSchema],
    ['SceneEnvelope', SceneEnvelopeSchema],
    ['SceneSaved', SceneSavedSchema],
    ['ErrorBody', ErrorBodySchema],
  ]

  it.each(pairs)('%s coincide con su esquema zod (propiedades y obligatorias)', (name, schema) => {
    const fromZod = z.toJSONSchema(schema, { io: 'input' }) as { properties?: object; required?: string[] }
    const fromYaml = spec.components.schemas[name] as { properties?: object; required?: string[] }
    expect(Object.keys(fromYaml.properties ?? {}).sort()).toEqual(Object.keys(fromZod.properties ?? {}).sort())
    expect([...(fromYaml.required ?? [])].sort()).toEqual([...(fromZod.required ?? [])].sort())
  })
})
```

- [ ] **Paso 7: Ver el test fallar**

Run: `pnpm install && pnpm --filter @interiores/api test`
Expected: FAIL — `ENOENT: no such file or directory, open '.../apps/api/openapi.yaml'`. Pegar en el PR.

- [ ] **Paso 8: Escribir `openapi.yaml` (el contrato, antes que cualquier ruta)**

Create `apps/api/openapi.yaml`:

```yaml
openapi: 3.1.0
info:
  title: API de Interiores
  version: 1.0.0
  description: >-
    API del diseñador de interiores 2D/3D. Todas las rutas de /v1 exigen un token
    de Supabase Auth (Bearer). Todos los errores usan ErrorBody con mensajes en castellano.
servers:
  - url: http://localhost:3001
    description: Desarrollo local
security:
  - bearerAuth: []
paths:
  /health:
    get:
      operationId: getHealth
      summary: Estado del servicio
      security: []
      responses:
        '200':
          description: El servicio responde
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Health'
  /v1/projects:
    get:
      operationId: listProjects
      summary: Lista los proyectos de la persona, el más reciente primero
      responses:
        '200':
          description: Lista de proyectos
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ProjectSummary'
        '401':
          $ref: '#/components/responses/Unauthorized'
    post:
      operationId: createProject
      summary: Crea un proyecto con su escena vacía
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProjectBody'
      responses:
        '201':
          description: Proyecto creado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectCreated'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '422':
          $ref: '#/components/responses/ValidationError'
  /v1/projects/{id}:
    parameters:
      - $ref: '#/components/parameters/ProjectId'
    get:
      operationId: getProject
      summary: Devuelve el proyecto con su escena
      responses:
        '200':
          description: Proyecto
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectDetail'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
    patch:
      operationId: updateProject
      summary: Cambia el nombre o el tipo del proyecto
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateProjectBody'
      responses:
        '200':
          description: Proyecto actualizado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectSummary'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
        '422':
          $ref: '#/components/responses/ValidationError'
    delete:
      operationId: deleteProject
      summary: Elimina el proyecto y su escena
      responses:
        '204':
          description: Eliminado, sin cuerpo
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
  /v1/projects/{id}/scene:
    parameters:
      - $ref: '#/components/parameters/ProjectId'
    put:
      operationId: saveScene
      summary: Guarda la escena completa (bloqueo optimista por versión)
      parameters:
        - $ref: '#/components/parameters/IfMatch'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SceneEnvelope'
      responses:
        '200':
          description: Escena guardada
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SceneSaved'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          $ref: '#/components/responses/Conflict'
        '413':
          $ref: '#/components/responses/TooLarge'
        '422':
          $ref: '#/components/responses/ValidationError'
        '428':
          $ref: '#/components/responses/PreconditionRequired'
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
  parameters:
    ProjectId:
      name: id
      in: path
      required: true
      schema:
        type: string
        format: uuid
    IfMatch:
      name: If-Match
      in: header
      required: true
      description: Versión de la escena que la persona tiene cargada
      schema:
        type: integer
        minimum: 1
  responses:
    Unauthorized:
      description: Falta la sesión o venció
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorBody'
    NotFound:
      description: No existe o no es de esta persona (nunca se responde 403)
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorBody'
    ValidationError:
      description: Los datos enviados no cumplen el contrato
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorBody'
    Conflict:
      description: La versión enviada ya no es la vigente
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorBody'
    TooLarge:
      description: La escena supera los 5 MB
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorBody'
    PreconditionRequired:
      description: Falta el encabezado If-Match
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorBody'
  schemas:
    Health:
      type: object
      required: [status]
      properties:
        status:
          type: string
          const: ok
    ProjectKind:
      type: string
      enum: [vivienda, comercio]
    ProjectSummary:
      type: object
      required: [id, name, kind, updatedAt]
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        kind:
          oneOf:
            - $ref: '#/components/schemas/ProjectKind'
            - type: 'null'
        updatedAt: { type: string, format: date-time }
    ProjectCreated:
      type: object
      required: [id, name, kind, version]
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        kind:
          oneOf:
            - $ref: '#/components/schemas/ProjectKind'
            - type: 'null'
        version: { type: integer, const: 1 }
    ProjectDetail:
      type: object
      required: [id, name, kind, updatedAt, scene, version]
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        kind:
          oneOf:
            - $ref: '#/components/schemas/ProjectKind'
            - type: 'null'
        updatedAt: { type: string, format: date-time }
        scene:
          $ref: '#/components/schemas/SceneEnvelope'
        version: { type: integer, minimum: 1 }
    CreateProjectBody:
      type: object
      required: [name]
      properties:
        name: { type: string, minLength: 1, maxLength: 80 }
        kind:
          $ref: '#/components/schemas/ProjectKind'
    UpdateProjectBody:
      type: object
      minProperties: 1
      properties:
        name: { type: string, minLength: 1, maxLength: 80 }
        kind:
          oneOf:
            - $ref: '#/components/schemas/ProjectKind'
            - type: 'null'
    SceneEnvelope:
      type: object
      required: [schemaVersion, pascal, graph]
      properties:
        schemaVersion: { type: integer, const: 1 }
        pascal:
          type: object
          required: [core]
          properties:
            core: { type: string }
        graph:
          type: object
          description: Grafo de escena de Pascal; la API no interpreta los nodos
          required: [nodes, rootNodeIds]
          additionalProperties: true
          properties:
            nodes: { type: object, additionalProperties: true }
            rootNodeIds: { type: array, items: { type: string } }
            collections: { type: object, additionalProperties: true }
            materials: { type: object, additionalProperties: true }
            installedPlugins: { type: array, items: { type: string } }
    SceneSaved:
      type: object
      required: [version]
      properties:
        version: { type: integer, minimum: 1 }
    ErrorBody:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code: { type: string }
            message: { type: string }
```

- [ ] **Paso 9: Ver el test pasar**

Run: `pnpm --filter @interiores/api test`
Expected: PASS (1 suite, 11 tests: validez 3.1, rutas y 8 coincidencias zod↔yaml).

- [ ] **Paso 10: Verificar todo y commit**

Run: `pnpm verify`
Expected: PASS.

```bash
git add -A
git commit -m "feat(contrato): esquemas zod y openapi.yaml antes de las rutas"
git push -u origin feature/t1-contrato
```
PR con la salida de los dos rojos y de `pnpm verify`.

---

### Tarea 2: Supabase — migración 001 y pruebas de RLS

**Responsable sugerido:** Victoria (dueña de migraciones, decisión D7). Revisa: Silvert.

**Files:**
- Create: `supabase/config.toml` (por `supabase init`)
- Create: `supabase/migrations/20261011120000_001_projects_and_scenes.sql`
- Create: `supabase/tests/{package.json,tsconfig.json,vitest.config.ts}`
- Create: `supabase/tests/support/env.ts`, `supabase/tests/rls.test.ts`
- Create: `supabase/CLAUDE.md`

**Interfaces:**
- Consumes: variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` de `.env.test`.
- Produces: tablas `public.projects(id, owner_id, name, kind, created_at, updated_at)` y `public.project_scenes(project_id, scene, schema_version, version, updated_at)` con RLS; helpers de prueba `readEnv()`, `createTestUser()`, `deleteTestUser()` (se duplican, a propósito, en la Tarea 3).

- [ ] **Paso 1: Rama, init y paquete de pruebas**

```bash
git switch main && git pull && git switch -c feature/t2-supabase
supabase init
```
Esperado: se crea `supabase/config.toml`. Decir **No** si pregunta por configurar VS Code o IntelliJ.

Create `supabase/tests/package.json`:

```json
{
  "name": "@interiores/supabase-tests",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": { "@supabase/supabase-js": "2.117.3" },
  "devDependencies": {
    "@types/node": "22.20.5",
    "typescript": "5.9.3",
    "vitest": "5.0.3"
  }
}
```

Create `supabase/tests/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true, "types": ["node"] },
  "include": ["."]
}
```

Create `supabase/tests/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({ test: { testTimeout: 30_000, hookTimeout: 60_000 } })
```

Create `supabase/CLAUDE.md`:

```markdown
# supabase/

Migraciones SQL (única fuente del esquema) y pruebas de RLS contra el proyecto `dev`.
Reglas en `.claude/rules/datos-y-rls.md`. Las migraciones las aplica **una sola persona**:
`supabase link --project-ref <ref>` y luego `supabase db push` (o pegar el SQL en el editor SQL del panel).
Las pruebas necesitan `.env.test` en la raíz (ver `.env.example`); sin él **fallan a propósito**.
```

- [ ] **Paso 2: Escribir las pruebas de RLS en rojo**

Create `supabase/tests/support/env.ts`:

```ts
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { type SupabaseClient, createClient } from '@supabase/supabase-js'

export type Env = { url: string; anonKey: string; serviceKey: string }

export function readEnv(): Env {
  try {
    process.loadEnvFile(fileURLToPath(new URL('../../../.env.test', import.meta.url)))
  } catch {
    // sin .env.test: se usan las variables del proceso (CI)
  }
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey } = process.env
  const missing = Object.entries({ SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey })
    .filter(([, v]) => !v)
    .map(([k]) => k)
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables para las pruebas contra Supabase dev: ${missing.join(', ')}. Copia .env.example a .env.test y complétalo.`,
    )
  }
  return { url: url as string, anonKey: anonKey as string, serviceKey: serviceKey as string }
}

export const plainClient = (url: string, key: string): SupabaseClient =>
  createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

export type TestUser = { id: string; email: string; client: SupabaseClient }

export async function createTestUser(env: Env, admin: SupabaseClient, label: string): Promise<TestUser> {
  const email = `rls-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
  const password = randomUUID()
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error || !created.data.user) throw new Error(`No se pudo crear el usuario de prueba: ${created.error?.message}`)
  const client = plainClient(env.url, env.anonKey)
  const signIn = await client.auth.signInWithPassword({ email, password })
  if (signIn.error) throw new Error(`No se pudo iniciar sesión con el usuario de prueba: ${signIn.error.message}`)
  return { id: created.data.user.id, email, client }
}

export async function deleteTestUser(admin: SupabaseClient, user: TestUser | undefined): Promise<void> {
  if (user) await admin.auth.admin.deleteUser(user.id)
}
```

Create `supabase/tests/rls.test.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type TestUser, createTestUser, deleteTestUser, plainClient, readEnv } from './support/env.js'

const env = readEnv()
const admin = plainClient(env.url, env.serviceKey)
let a: TestUser
let b: TestUser
let projectA: string

const emptyScene = { schemaVersion: 1, pascal: { core: '1.0.3' }, graph: { nodes: {}, rootNodeIds: [] } }

async function makeProject(user: TestUser, name: string): Promise<string> {
  const { data, error } = await user.client.from('projects').insert({ owner_id: user.id, name }).select('id').single()
  expect(error).toBeNull()
  return (data as { id: string }).id
}

beforeAll(async () => {
  a = await createTestUser(env, admin, 'a')
  b = await createTestUser(env, admin, 'b')
  projectA = await makeProject(a, 'Casa de A')
  const scene = await a.client.from('project_scenes').insert({ project_id: projectA, scene: emptyScene, schema_version: 1 })
  expect(scene.error).toBeNull()
})

afterAll(async () => {
  await deleteTestUser(admin, a)
  await deleteTestUser(admin, b)
})

describe('RLS de projects', () => {
  it('A ve su proyecto y B no ve nada', async () => {
    const mine = await a.client.from('projects').select('id')
    expect(mine.data?.map((r) => r.id)).toContain(projectA)
    const theirs = await b.client.from('projects').select('id')
    expect(theirs.error).toBeNull()
    expect(theirs.data).toEqual([])
  })

  it('B no puede modificar ni borrar el proyecto de A (0 filas afectadas)', async () => {
    const upd = await b.client.from('projects').update({ name: 'hackeado' }).eq('id', projectA).select('id')
    expect(upd.data).toEqual([])
    const del = await b.client.from('projects').delete().eq('id', projectA).select('id')
    expect(del.data).toEqual([])
    const still = await a.client.from('projects').select('name').eq('id', projectA).single()
    expect(still.data?.name).toBe('Casa de A')
  })

  it('B no puede crear un proyecto a nombre de A', async () => {
    const { error } = await b.client.from('projects').insert({ owner_id: a.id, name: 'intruso' })
    expect(error?.code).toBe('42501')
  })

  it('sin sesión (anon) no se puede leer la tabla', async () => {
    const anon: SupabaseClient = plainClient(env.url, env.anonKey)
    const { error } = await anon.from('projects').select('id')
    expect(error?.code).toBe('42501')
  })

  it('rechaza nombres vacíos, de más de 80 caracteres y tipos inválidos', async () => {
    const empty = await a.client.from('projects').insert({ owner_id: a.id, name: '' })
    expect(empty.error?.code).toBe('23514')
    const long = await a.client.from('projects').insert({ owner_id: a.id, name: 'x'.repeat(81) })
    expect(long.error?.code).toBe('23514')
    const kind = await a.client.from('projects').insert({ owner_id: a.id, name: 'ok', kind: 'oficina' })
    expect(kind.error?.code).toBe('23514')
  })
})

describe('RLS de project_scenes', () => {
  it('B no lee la escena de A', async () => {
    const { data, error } = await b.client.from('project_scenes').select('project_id')
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('B no puede crear una escena en un proyecto de A', async () => {
    const other = await makeProject(a, 'Otro de A')
    const { error } = await b.client.from('project_scenes').insert({ project_id: other, scene: emptyScene, schema_version: 1 })
    expect(error?.code).toBe('42501')
  })

  it('B no puede modificar la escena de A', async () => {
    const upd = await b.client.from('project_scenes').update({ version: 99 }).eq('project_id', projectA).select('project_id')
    expect(upd.data).toEqual([])
  })

  it('actualizar la escena sube la versión y el updated_at del proyecto', async () => {
    const before = await a.client.from('projects').select('updated_at').eq('id', projectA).single()
    await new Promise((r) => setTimeout(r, 25))
    const upd = await a.client.from('project_scenes').update({ scene: emptyScene, version: 2 }).eq('project_id', projectA).eq('version', 1).select('version')
    expect(upd.data).toEqual([{ version: 2 }])
    const after = await a.client.from('projects').select('updated_at').eq('id', projectA).single()
    expect(new Date(after.data?.updated_at).getTime()).toBeGreaterThan(new Date(before.data?.updated_at).getTime())
  })

  it('el bloqueo optimista: una segunda actualización con la versión vieja afecta 0 filas', async () => {
    const stale = await a.client.from('project_scenes').update({ scene: emptyScene, version: 2 }).eq('project_id', projectA).eq('version', 1).select('version')
    expect(stale.data).toEqual([])
  })

  it('borrar el proyecto borra su escena (cascada)', async () => {
    const id = await makeProject(a, 'Para borrar')
    await a.client.from('project_scenes').insert({ project_id: id, scene: emptyScene, schema_version: 1 })
    const del = await a.client.from('projects').delete().eq('id', id).select('id')
    expect(del.data).toEqual([{ id }])
    const left = await admin.from('project_scenes').select('project_id').eq('project_id', id)
    expect(left.data).toEqual([])
  })
})
```

- [ ] **Paso 3: Ver las pruebas fallar**

Run: `pnpm install && pnpm --filter @interiores/supabase-tests test`
Expected: FAIL. Si falta `.env.test`: `Faltan variables para las pruebas contra Supabase dev: ...` (falla visible, es lo esperado). Con `.env.test` completo: FAIL con `42P01`/`relation "public.projects" does not exist` o `Could not find the table 'public.projects'`. Pegar la salida en el PR.

- [ ] **Paso 4: Escribir la migración (tablas, RLS y políticas en el mismo archivo)**

Create `supabase/migrations/20261011120000_001_projects_and_scenes.sql`:

```sql
-- Migración 001: proyectos y escenas con RLS (spec 1, sección 5).

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text check (kind in ('vivienda', 'comercio')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_updated_idx on public.projects (owner_id, updated_at desc);

create table public.project_scenes (
  project_id uuid primary key references public.projects (id) on delete cascade,
  scene jsonb not null,
  schema_version int not null,
  version int not null default 1,
  updated_at timestamptz not null default now()
);

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

create trigger project_scenes_set_updated_at before update on public.project_scenes
  for each row execute function public.set_updated_at();

-- Guardar la escena también "toca" el proyecto, para ordenar la lista por actividad.
create function public.touch_project_from_scene() returns trigger
language plpgsql as $$
begin
  update public.projects set updated_at = now() where id = new.project_id;
  return new;
end $$;

create trigger project_scenes_touch_project after update on public.project_scenes
  for each row execute function public.touch_project_from_scene();

alter table public.projects enable row level security;
alter table public.project_scenes enable row level security;

revoke all on public.projects from anon;
revoke all on public.project_scenes from anon;

create policy projects_select_own on public.projects for select to authenticated
  using (owner_id = (select auth.uid()));
create policy projects_insert_own on public.projects for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy projects_update_own on public.projects for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy projects_delete_own on public.projects for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy scenes_select_own on public.project_scenes for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy scenes_insert_own on public.project_scenes for insert to authenticated
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy scenes_update_own on public.project_scenes for update to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy scenes_delete_own on public.project_scenes for delete to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
```

- [ ] **Paso 5: Aplicar la migración a `dev` (solo la dueña de migraciones)**

```bash
supabase link --project-ref <ref-de-dev>
supabase db push
```
Esperado: `Applying migration 20261011120000_001_projects_and_scenes.sql... Finished supabase db push.` Alternativa sin CLI: pegar el SQL en *SQL Editor* del panel y ejecutarlo.

- [ ] **Paso 6: Ver las pruebas pasar**

Run: `pnpm --filter @interiores/supabase-tests test`
Expected: PASS (11 pruebas en `rls.test.ts`). Si `anon` no devuelve `42501`, confirmar que el `revoke` se aplicó; no relajar la prueba.

- [ ] **Paso 7: Verificar y commit**

Run: `pnpm verify`
Expected: PASS.

```bash
git add -A
git commit -m "feat(datos): migración 001 de proyectos y escenas con RLS y pruebas con dos usuarios"
git push -u origin feature/t2-supabase
```

---

### Tarea 3: API Fastify

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/api/src/{config,auth,errors,store,build-app,index,supabase-store}.ts`
- Create: `apps/api/src/routes/{health,projects,scene}.ts`
- Create: `apps/api/test/support/memory-store.ts`
- Create: `apps/api/test/{config,auth,routes,contract}.test.ts`
- Create: `apps/api/test/integration/store.integration.test.ts`
- Create: `apps/api/CLAUDE.md`

**Interfaces:**
- Consumes: `@interiores/contract` (Tarea 1); tablas de la Tarea 2.
- Produces:
  - `type Ctx = { userId: string; token: string }`
  - `interface ProjectStore { list(ctx): Promise<ProjectSummary[]>; create(ctx, input: CreateProjectBody): Promise<ProjectCreated>; get(ctx, id: string): Promise<ProjectDetail | null>; update(ctx, id: string, patch: UpdateProjectBody): Promise<ProjectSummary | null>; remove(ctx, id: string): Promise<boolean>; saveScene(ctx, id: string, scene: SceneEnvelope, expectedVersion: number): Promise<SaveSceneResult> }`
  - `type SaveSceneResult = { kind: 'ok'; version: number } | { kind: 'not_found' } | { kind: 'conflict' }`
  - `type AuthVerifier = (token: string) => Promise<AuthUser | null>`, `AuthUser = { id: string; token: string }`
  - `buildApp(deps: { auth: AuthVerifier; store: ProjectStore; corsOrigins?: string[] }, options?: { logger?: FastifyServerOptions['logger']; onRoute?: (r: { method: string; url: string }) => void }): FastifyInstance`
  - `createSupabaseStore(url: string, anonKey: string): ProjectStore`, `supabaseAuthVerifier(url: string, anonKey: string): AuthVerifier`, `loadConfig(env): Config`.

- [ ] **Paso 1: Rama y archivo de zona**

```bash
git switch main && git pull && git switch -c feature/t3-api
```

Create `apps/api/CLAUDE.md`:

```markdown
# apps/api/

Fastify (TypeScript). Reglas en `.claude/rules/contrato-primero.md`.
- El punto de entrada para Vercel es `src/index.ts` (llama a `listen`). La fábrica `src/build-app.ts` se usa en las pruebas con `app.inject`. **No crear** `src/app.ts` ni `src/server.ts`: Vercel los tomaría como entrada.
- Si cambias una ruta, cambia primero `openapi.yaml`; `test/contract.test.ts` compara ambos.
- La API reenvía el JWT de la persona a Supabase: RLS decide qué ve cada quien.
```

- [ ] **Paso 2: Tests de configuración y autenticación en rojo**

Create `apps/api/test/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config.js'

describe('loadConfig', () => {
  const base = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' }

  it('falla de forma visible si faltan variables obligatorias', () => {
    expect(() => loadConfig({})).toThrow('SUPABASE_URL, SUPABASE_ANON_KEY')
  })

  it('usa valores por defecto y separa los orígenes CORS', () => {
    const cfg = loadConfig({ ...base, CORS_ORIGINS: 'http://a.com, http://b.com ' })
    expect(cfg.port).toBe(3001)
    expect(cfg.corsOrigins).toEqual(['http://a.com', 'http://b.com'])
    expect(cfg.logLevel).toBe('info')
  })

  it('sin CORS_ORIGINS no habilita ningún origen', () => {
    expect(loadConfig(base).corsOrigins).toEqual([])
  })
})
```

Create `apps/api/test/auth.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { bearerToken } from '../src/auth.js'

describe('bearerToken', () => {
  it('extrae el token de un encabezado Bearer', () => {
    expect(bearerToken('Bearer abc.def')).toBe('abc.def')
    expect(bearerToken('bearer abc')).toBe('abc')
  })

  it('devuelve null con encabezados ausentes o mal formados', () => {
    expect(bearerToken(undefined)).toBeNull()
    expect(bearerToken('')).toBeNull()
    expect(bearerToken('Basic abc')).toBeNull()
    expect(bearerToken('Bearer')).toBeNull()
    expect(bearerToken('Bearer a b')).toBeNull()
  })
})
```

- [ ] **Paso 3: Ver fallar y luego implementar config y auth**

Run: `pnpm --filter @interiores/api test -- config auth`
Expected: FAIL — `Failed to resolve import "../src/config.js"` y `"../src/auth.js"`. Pegar en el PR.

Create `apps/api/src/config.ts`:

```ts
export type Config = {
  supabaseUrl: string
  supabaseAnonKey: string
  corsOrigins: string[]
  port: number
  logLevel: string
}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'].filter((k) => !env[k])
  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`)
  }
  return {
    supabaseUrl: env.SUPABASE_URL as string,
    supabaseAnonKey: env.SUPABASE_ANON_KEY as string,
    corsOrigins: (env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    port: Number(env.PORT ?? 3001),
    logLevel: env.LOG_LEVEL ?? 'info',
  }
}
```

Create `apps/api/src/auth.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

export type AuthUser = { id: string; token: string }
export type AuthVerifier = (token: string) => Promise<AuthUser | null>

export function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? '')
  return match ? (match[1] as string) : null
}

export function supabaseAuthVerifier(url: string, anonKey: string): AuthVerifier {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  return async (token) => {
    const { data, error } = await client.auth.getUser(token)
    if (error || !data.user) return null
    return { id: data.user.id, token }
  }
}
```

Run: `pnpm --filter @interiores/api test -- config auth`
Expected: PASS (2 suites, 5 tests).

- [ ] **Paso 4: Tipos de dominio, errores y almacén en memoria para las pruebas**

Create `apps/api/src/errors.ts`:

```ts
import { ERROR_CODES, type ErrorBody } from '@interiores/contract'

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export const errors = {
  unauthorized: () => new AppError(401, ERROR_CODES.unauthorized, 'Tu sesión no es válida o venció. Vuelve a ingresar.'),
  notFound: () => new AppError(404, ERROR_CODES.notFound, 'No encontramos ese proyecto.'),
  invalid: (detail: string) => new AppError(422, ERROR_CODES.invalid, `Los datos enviados no son válidos: ${detail}.`),
  conflict: () =>
    new AppError(
      409,
      ERROR_CODES.conflict,
      'El proyecto cambió desde que lo abriste. Recarga la versión del servidor o sigue editando sin guardar.',
    ),
  tooLarge: () => new AppError(413, ERROR_CODES.tooLarge, 'La escena supera el límite de 5 MB.'),
  preconditionRequired: () =>
    new AppError(428, ERROR_CODES.preconditionRequired, 'Falta el encabezado If-Match con la versión que tienes abierta.'),
}

export function errorBody(code: string, message: string): ErrorBody {
  return { error: { code, message } }
}
```

Create `apps/api/src/store.ts`:

```ts
import type {
  CreateProjectBody,
  ProjectCreated,
  ProjectDetail,
  ProjectSummary,
  SceneEnvelope,
  UpdateProjectBody,
} from '@interiores/contract'

export type Ctx = { userId: string; token: string }
export type SaveSceneResult = { kind: 'ok'; version: number } | { kind: 'not_found' } | { kind: 'conflict' }

export interface ProjectStore {
  list(ctx: Ctx): Promise<ProjectSummary[]>
  create(ctx: Ctx, input: CreateProjectBody): Promise<ProjectCreated>
  get(ctx: Ctx, id: string): Promise<ProjectDetail | null>
  update(ctx: Ctx, id: string, patch: UpdateProjectBody): Promise<ProjectSummary | null>
  remove(ctx: Ctx, id: string): Promise<boolean>
  saveScene(ctx: Ctx, id: string, scene: SceneEnvelope, expectedVersion: number): Promise<SaveSceneResult>
}
```

Create `apps/api/test/support/memory-store.ts`:

```ts
import { randomUUID } from 'node:crypto'
import { type ProjectDetail, type SceneEnvelope, emptyEnvelope } from '@interiores/contract'
import type { Ctx, ProjectStore } from '../../src/store.js'

type Row = { id: string; ownerId: string; name: string; kind: 'vivienda' | 'comercio' | null; updatedAt: string; scene: SceneEnvelope; version: number }

/** Réplica en memoria de las reglas de dueño y de versión que aplican RLS y la API real. */
export function createMemoryStore(): ProjectStore & { tick(): void } {
  const rows = new Map<string, Row>()
  let clock = Date.parse('2026-10-11T12:00:00Z')
  const now = () => new Date(clock).toISOString()
  const mine = (ctx: Ctx, id: string) => {
    const row = rows.get(id)
    return row && row.ownerId === ctx.userId ? row : undefined
  }
  const summary = (r: Row) => ({ id: r.id, name: r.name, kind: r.kind, updatedAt: r.updatedAt })

  return {
    tick: () => {
      clock += 60_000
    },
    async list(ctx) {
      return [...rows.values()]
        .filter((r) => r.ownerId === ctx.userId)
        .sort((x, y) => y.updatedAt.localeCompare(x.updatedAt))
        .map(summary)
    },
    async create(ctx, input) {
      clock += 1000
      const row: Row = { id: randomUUID(), ownerId: ctx.userId, name: input.name, kind: input.kind ?? null, updatedAt: now(), scene: emptyEnvelope(), version: 1 }
      rows.set(row.id, row)
      return { id: row.id, name: row.name, kind: row.kind, version: 1 }
    },
    async get(ctx, id) {
      const r = mine(ctx, id)
      return r ? ({ ...summary(r), scene: r.scene, version: r.version } satisfies ProjectDetail) : null
    },
    async update(ctx, id, patch) {
      const r = mine(ctx, id)
      if (!r) return null
      if (patch.name !== undefined) r.name = patch.name
      if (patch.kind !== undefined) r.kind = patch.kind
      clock += 1000
      r.updatedAt = now()
      return summary(r)
    },
    async remove(ctx, id) {
      return mine(ctx, id) ? rows.delete(id) : false
    },
    async saveScene(ctx, id, scene, expectedVersion) {
      const r = mine(ctx, id)
      if (!r) return { kind: 'not_found' }
      if (r.version !== expectedVersion) return { kind: 'conflict' }
      r.scene = scene
      r.version += 1
      clock += 1000
      r.updatedAt = now()
      return { kind: 'ok', version: r.version }
    },
  }
}
```

- [ ] **Paso 5: Escribir los tests de rutas en rojo**

Create `apps/api/test/routes.test.ts`:

```ts
import { Writable } from 'node:stream'
import { SCENE_MAX_BYTES, emptyEnvelope } from '@interiores/contract'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AuthVerifier } from '../src/auth.js'
import { LOGGER_REDACT, buildApp } from '../src/build-app.js'
import { createMemoryStore } from './support/memory-store.js'

const auth: AuthVerifier = async (token) => {
  if (token === 'token-a') return { id: 'user-a', token }
  if (token === 'token-b') return { id: 'user-b', token }
  return null
}
const headersA = { authorization: 'Bearer token-a' }
const headersB = { authorization: 'Bearer token-b' }

let store = createMemoryStore()
let app = buildApp({ auth, store })
beforeEach(() => {
  store = createMemoryStore()
  app = buildApp({ auth, store })
})

async function createProject(headers = headersA, payload: object = { name: 'Casa Alvear', kind: 'vivienda' }) {
  const res = await app.inject({ method: 'POST', url: '/v1/projects', headers, payload })
  return res.json() as { id: string; name: string; kind: string | null; version: number }
}

describe('GET /health', () => {
  it('responde ok sin autenticación', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })
})

describe('autenticación', () => {
  const routes: [string, string][] = [
    ['GET', '/v1/projects'],
    ['POST', '/v1/projects'],
    ['GET', '/v1/projects/0b0e8d9c-6a40-4d6e-9a3c-1f2f6a0f1b11'],
    ['PATCH', '/v1/projects/0b0e8d9c-6a40-4d6e-9a3c-1f2f6a0f1b11'],
    ['DELETE', '/v1/projects/0b0e8d9c-6a40-4d6e-9a3c-1f2f6a0f1b11'],
    ['PUT', '/v1/projects/0b0e8d9c-6a40-4d6e-9a3c-1f2f6a0f1b11/scene'],
  ]

  it.each(routes)('%s %s sin token responde 401 con el cuerpo de error en castellano', async (method, url) => {
    const res = await app.inject({ method: method as 'GET', url })
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('no_autenticado')
    expect(res.json().error.message).toMatch(/sesión/)
  })

  it('un token inválido responde 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/projects', headers: { authorization: 'Bearer falso' } })
    expect(res.statusCode).toBe(401)
  })
})

describe('proyectos', () => {
  it('POST crea el proyecto con 201 y version 1', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/projects', headers: headersA, payload: { name: '  Local Centro  ', kind: 'comercio' } })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ name: 'Local Centro', kind: 'comercio', version: 1 })
  })

  it('POST con nombre vacío responde 422 en castellano', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/projects', headers: headersA, payload: { name: '   ' } })
    expect(res.statusCode).toBe(422)
    expect(res.json().error.code).toBe('datos_invalidos')
    expect(res.json().error.message).toMatch(/no son válidos/)
  })

  it('POST con JSON roto responde 422, no 500', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/projects', headers: { ...headersA, 'content-type': 'application/json' }, payload: '{"name":' })
    expect(res.statusCode).toBe(422)
  })

  it('GET lista solo los proyectos propios, el más reciente primero', async () => {
    const first = await createProject()
    store.tick()
    const second = await createProject(headersA, { name: 'Segundo' })
    await createProject(headersB, { name: 'De B' })
    const res = await app.inject({ method: 'GET', url: '/v1/projects', headers: headersA })
    expect(res.statusCode).toBe(200)
    expect(res.json().map((p: { id: string }) => p.id)).toEqual([second.id, first.id])
  })

  it('GET por id devuelve la escena vacía y la versión', async () => {
    const p = await createProject()
    const res = await app.inject({ method: 'GET', url: `/v1/projects/${p.id}`, headers: headersA })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: p.id, version: 1, scene: emptyEnvelope() })
  })

  it('GET del proyecto de otra persona responde 404, nunca 403', async () => {
    const p = await createProject()
    const res = await app.inject({ method: 'GET', url: `/v1/projects/${p.id}`, headers: headersB })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('no_encontrado')
  })

  it('un id mal formado responde 404 y no 500', async () => {
    for (const id of ['abc', '123', 'no-es-un-uuid']) {
      const res = await app.inject({ method: 'GET', url: `/v1/projects/${id}`, headers: headersA })
      expect(res.statusCode, id).toBe(404)
    }
  })

  it('PATCH cambia el nombre y devuelve el resumen', async () => {
    const p = await createProject()
    const res = await app.inject({ method: 'PATCH', url: `/v1/projects/${p.id}`, headers: headersA, payload: { name: 'Renombrado' } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: p.id, name: 'Renombrado' })
  })

  it('PATCH sin campos responde 422 y ajeno responde 404', async () => {
    const p = await createProject()
    const empty = await app.inject({ method: 'PATCH', url: `/v1/projects/${p.id}`, headers: headersA, payload: {} })
    expect(empty.statusCode).toBe(422)
    const other = await app.inject({ method: 'PATCH', url: `/v1/projects/${p.id}`, headers: headersB, payload: { name: 'x' } })
    expect(other.statusCode).toBe(404)
  })

  it('DELETE responde 204 sin cuerpo y luego 404', async () => {
    const p = await createProject()
    const res = await app.inject({ method: 'DELETE', url: `/v1/projects/${p.id}`, headers: headersA })
    expect(res.statusCode).toBe(204)
    expect(res.body).toBe('')
    const again = await app.inject({ method: 'DELETE', url: `/v1/projects/${p.id}`, headers: headersA })
    expect(again.statusCode).toBe(404)
  })
})

describe('PUT /v1/projects/:id/scene', () => {
  const put = (id: string, headers: Record<string, string>, payload: unknown) =>
    app.inject({ method: 'PUT', url: `/v1/projects/${id}/scene`, headers, payload: payload as object })

  it('sin If-Match responde 428', async () => {
    const p = await createProject()
    const res = await put(p.id, headersA, emptyEnvelope())
    expect(res.statusCode).toBe(428)
    expect(res.json().error.code).toBe('falta_if_match')
  })

  it('guarda y devuelve la nueva versión; una versión vieja responde 409', async () => {
    const p = await createProject()
    const ok = await put(p.id, { ...headersA, 'if-match': '1' }, emptyEnvelope())
    expect(ok.statusCode).toBe(200)
    expect(ok.json()).toEqual({ version: 2 })
    const stale = await put(p.id, { ...headersA, 'if-match': '1' }, emptyEnvelope())
    expect(stale.statusCode).toBe(409)
    expect(stale.json().error.code).toBe('version_desactualizada')
  })

  it('acepta If-Match con comillas o validador débil y rechaza el resto con 422', async () => {
    const p = await createProject()
    expect((await put(p.id, { ...headersA, 'if-match': '"1"' }, emptyEnvelope())).statusCode).toBe(200)
    expect((await put(p.id, { ...headersA, 'if-match': 'W/"2"' }, emptyEnvelope())).statusCode).toBe(200)
    for (const bad of ['0', 'abc', '-1', '1.5', '""']) {
      const res = await put(p.id, { ...headersA, 'if-match': bad }, emptyEnvelope())
      expect(res.statusCode, bad).toBe(422)
    }
  })

  it('un envelope inválido responde 422', async () => {
    const p = await createProject()
    const res = await put(p.id, { ...headersA, 'if-match': '1' }, { schemaVersion: 1, graph: {} })
    expect(res.statusCode).toBe(422)
  })

  it('acepta un grafo vacío (la escena de un proyecto nuevo)', async () => {
    const p = await createProject()
    const res = await put(p.id, { ...headersA, 'if-match': '1' }, emptyEnvelope())
    expect(res.statusCode).toBe(200)
  })

  it('de otra persona responde 404', async () => {
    const p = await createProject()
    const res = await put(p.id, { ...headersB, 'if-match': '1' }, emptyEnvelope())
    expect(res.statusCode).toBe(404)
  })

  it('una escena mayor de 5 MB responde 413 con mensaje en castellano', async () => {
    const p = await createProject()
    const big = { ...emptyEnvelope(), graph: { nodes: { x: 'a'.repeat(SCENE_MAX_BYTES + 10) }, rootNodeIds: [] } }
    const res = await put(p.id, { ...headersA, 'if-match': '1', 'content-type': 'application/json' }, JSON.stringify(big))
    expect(res.statusCode).toBe(413)
    expect(res.json().error.code).toBe('escena_demasiado_grande')
  })
})

describe('registros (logs)', () => {
  it('el token nunca aparece en los logs, ni siquiera cuando el pedido falla', async () => {
    const lines: string[] = []
    const stream = new Writable({
      write(chunk, _enc, cb) {
        lines.push(chunk.toString())
        cb()
      },
    })
    const logged = buildApp({ auth, store: createMemoryStore() }, { logger: { level: 'trace', stream, redact: LOGGER_REDACT } })
    await logged.inject({ method: 'GET', url: '/v1/projects', headers: { authorization: 'Bearer secreto-123' } })
    await logged.inject({ method: 'GET', url: '/v1/projects', headers: headersA })
    await logged.inject({ method: 'POST', url: '/v1/projects', headers: { ...headersA, 'content-type': 'application/json' }, payload: '{' })
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.join('')).not.toContain('secreto-123')
    expect(lines.join('')).not.toContain('token-a')
  })
})
```

Create `apps/api/test/contract.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { buildApp } from '../src/build-app.js'
import { createMemoryStore } from './support/memory-store.js'

const normalize = (url: string) => url.replace(/:([A-Za-z]+)/g, '{$1}')

const spec = parse(readFileSync(fileURLToPath(new URL('../openapi.yaml', import.meta.url)), 'utf8')) as {
  paths: Record<string, Record<string, unknown>>
}

const registered = new Set<string>()
const app = buildApp({ auth: async () => null, store: createMemoryStore() }, { onRoute: (r) => registered.add(`${r.method} ${normalize(r.url)}`) })
// Fastify carga los plugins de forma diferida: las rutas recién se registran en ready().
await app.ready()

const fromYaml = new Set<string>()
for (const [path, item] of Object.entries(spec.paths)) {
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    if (item[method]) fromYaml.add(`${method.toUpperCase()} ${path}`)
  }
}
const real = new Set([...registered].filter((r) => !r.startsWith('HEAD ') && !r.startsWith('OPTIONS ')))

describe('contrato OpenAPI ↔ rutas registradas', () => {
  it('el registro de rutas no está vacío (las 6 de negocio y /health)', () => {
    expect(real.size).toBe(7)
  })

  it('toda ruta del código está en el yaml', () => {
    expect([...real].filter((r) => !fromYaml.has(r))).toEqual([])
  })

  it('toda ruta del yaml existe en el código', () => {
    expect([...fromYaml].filter((r) => !real.has(r))).toEqual([])
  })
})
```

- [ ] **Paso 6: Ver los tests fallar**

Run: `pnpm --filter @interiores/api test -- routes contract`
Expected: FAIL — `Failed to resolve import "../src/build-app.js"`. Pegar la salida en el PR.

- [ ] **Paso 7: Implementar rutas y fábrica de la aplicación**

Create `apps/api/src/routes/health.ts`:

```ts
import type { FastifyPluginAsync } from 'fastify'

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({ status: 'ok' }))
}
```

Create `apps/api/src/routes/projects.ts`:

```ts
import { CreateProjectBodySchema, UpdateProjectBodySchema } from '@interiores/contract'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { errors } from '../errors.js'
import type { Ctx, ProjectStore } from '../store.js'

const IdParams = z.object({ id: z.uuid() })

export function ctxOf(req: FastifyRequest): Ctx {
  return { userId: req.user.id, token: req.user.token }
}

/** Un id que no es uuid se trata como inexistente: 404, nunca un 500 del cast de Postgres. */
export function parseId(params: unknown): string {
  const parsed = IdParams.safeParse(params)
  if (!parsed.success) throw errors.notFound()
  return parsed.data.id
}

export function parseBody<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => i.path.join('.') || 'cuerpo'))]
    throw errors.invalid(`revisa ${fields.join(', ')}`)
  }
  return parsed.data
}

export const projectRoutes = (store: ProjectStore): FastifyPluginAsync => async (app) => {
  app.get('/projects', async (req) => store.list(ctxOf(req)))

  app.post('/projects', async (req, reply) => {
    const body = parseBody(CreateProjectBodySchema, req.body)
    const created = await store.create(ctxOf(req), body)
    return reply.status(201).send(created)
  })

  app.get('/projects/:id', async (req) => {
    const project = await store.get(ctxOf(req), parseId(req.params))
    if (!project) throw errors.notFound()
    return project
  })

  app.patch('/projects/:id', async (req) => {
    const id = parseId(req.params)
    const patch = parseBody(UpdateProjectBodySchema, req.body)
    const updated = await store.update(ctxOf(req), id, patch)
    if (!updated) throw errors.notFound()
    return updated
  })

  app.delete('/projects/:id', async (req, reply) => {
    const removed = await store.remove(ctxOf(req), parseId(req.params))
    if (!removed) throw errors.notFound()
    return reply.status(204).send()
  })
}
```

Create `apps/api/src/routes/scene.ts`:

```ts
import { SceneEnvelopeSchema } from '@interiores/contract'
import type { FastifyPluginAsync } from 'fastify'
import { errors } from '../errors.js'
import type { ProjectStore } from '../store.js'
import { ctxOf, parseBody, parseId } from './projects.js'

/** Acepta `3`, `"3"` y `W/"3"`; todo lo demás (0, abc, -1, 1.5, vacío) es un 422. */
export function parseIfMatch(raw: string | string[]): number {
  const value = (Array.isArray(raw) ? raw[0] : raw) ?? ''
  const cleaned = value.trim().replace(/^W\//, '').replace(/^"(.*)"$/, '$1')
  if (!/^[1-9]\d*$/.test(cleaned)) throw errors.invalid('If-Match debe ser el número de versión')
  return Number(cleaned)
}

export const sceneRoutes = (store: ProjectStore): FastifyPluginAsync => async (app) => {
  app.put('/projects/:id/scene', async (req) => {
    const id = parseId(req.params)
    const raw = req.headers['if-match']
    if (raw === undefined) throw errors.preconditionRequired()
    const expected = parseIfMatch(raw)
    const envelope = parseBody(SceneEnvelopeSchema, req.body)
    const result = await store.saveScene(ctxOf(req), id, envelope, expected)
    if (result.kind === 'not_found') throw errors.notFound()
    if (result.kind === 'conflict') throw errors.conflict()
    return { version: result.version }
  })
}
```

Create `apps/api/src/build-app.ts`:

```ts
import cors from '@fastify/cors'
import { ERROR_CODES, SCENE_MAX_BYTES } from '@interiores/contract'
import Fastify, { type FastifyServerOptions } from 'fastify'
import { type AuthUser, type AuthVerifier, bearerToken } from './auth.js'
import { AppError, errorBody, errors } from './errors.js'
import { healthRoutes } from './routes/health.js'
import { projectRoutes } from './routes/projects.js'
import { sceneRoutes } from './routes/scene.js'
import type { ProjectStore } from './store.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser
  }
}

export type Deps = { auth: AuthVerifier; store: ProjectStore; corsOrigins?: string[] }
export type BuildOptions = {
  logger?: FastifyServerOptions['logger']
  onRoute?: (route: { method: string; url: string }) => void
}

export const LOGGER_REDACT = ['req.headers.authorization', 'headers.authorization']

export function buildApp(deps: Deps, options: BuildOptions = {}) {
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: SCENE_MAX_BYTES })

  app.addHook('onRoute', (route) => {
    for (const method of [route.method].flat()) options.onRoute?.({ method, url: route.url })
  })

  app.register(cors, {
    origin: deps.corsOrigins && deps.corsOrigins.length > 0 ? deps.corsOrigins : false,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'If-Match'],
  })

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) return reply.status(err.status).send(errorBody(err.code, err.message))
    const code = (err as { code?: string }).code
    if (code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      const e = errors.tooLarge()
      return reply.status(e.status).send(errorBody(e.code, e.message))
    }
    const status = (err as { statusCode?: number }).statusCode
    if (status && status >= 400 && status < 500) {
      const e = errors.invalid('el cuerpo no es un JSON válido')
      return reply.status(e.status).send(errorBody(e.code, e.message))
    }
    req.log.error({ err }, 'error no controlado')
    return reply.status(500).send(errorBody(ERROR_CODES.internal, 'Ocurrió un error inesperado. Inténtalo de nuevo.'))
  })

  app.setNotFoundHandler((_req, reply) =>
    reply.status(404).send(errorBody(ERROR_CODES.notFound, 'No encontramos esa dirección.')),
  )

  app.decorateRequest('user', undefined as unknown as AuthUser)
  app.register(healthRoutes)
  app.register(
    async (v1) => {
      v1.addHook('onRequest', async (req) => {
        const token = bearerToken(req.headers.authorization)
        const user = token ? await deps.auth(token) : null
        if (!user) throw errors.unauthorized()
        req.user = user
      })
      v1.register(projectRoutes(deps.store))
      v1.register(sceneRoutes(deps.store))
    },
    { prefix: '/v1' },
  )

  return app
}
```

Run: `pnpm --filter @interiores/api test`
Expected: PASS (suites config, auth, openapi, routes, contract). Si una prueba de `routes` falla por detalle de Fastify (por ejemplo el 422 por JSON roto), arreglar el código, no relajar la prueba.

- [ ] **Paso 8: Almacén real sobre Supabase y punto de entrada**

Create `apps/api/src/supabase-store.ts`:

```ts
import {
  type ProjectDetail,
  type ProjectKind,
  type ProjectSummary,
  type SceneEnvelope,
  SceneEnvelopeSchema,
  emptyEnvelope,
} from '@interiores/contract'
import { createClient } from '@supabase/supabase-js'
import type { Ctx, ProjectStore } from './store.js'

type ProjectRow = { id: string; name: string; kind: ProjectKind | null; updated_at: string }

const toSummary = (r: ProjectRow): ProjectSummary => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  updatedAt: new Date(r.updated_at).toISOString(),
})

/** Un cliente por pedido, con el JWT de la persona: RLS decide qué filas existen para ella. */
export function createSupabaseStore(url: string, anonKey: string): ProjectStore {
  const forUser = (ctx: Ctx) =>
    createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${ctx.token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
  const COLUMNS = 'id,name,kind,updated_at'

  return {
    async list(ctx) {
      const { data, error } = await forUser(ctx).from('projects').select(COLUMNS).order('updated_at', { ascending: false })
      if (error) throw error
      return (data as ProjectRow[]).map(toSummary)
    },

    async create(ctx, input) {
      const db = forUser(ctx)
      const inserted = await db
        .from('projects')
        .insert({ owner_id: ctx.userId, name: input.name, kind: input.kind ?? null })
        .select(COLUMNS)
        .single()
      if (inserted.error) throw inserted.error
      const row = inserted.data as ProjectRow
      const scene = await db.from('project_scenes').insert({ project_id: row.id, scene: emptyEnvelope(), schema_version: 1 })
      if (scene.error) {
        await db.from('projects').delete().eq('id', row.id)
        throw scene.error
      }
      return { id: row.id, name: row.name, kind: row.kind, version: 1 }
    },

    async get(ctx, id): Promise<ProjectDetail | null> {
      const db = forUser(ctx)
      const project = await db.from('projects').select(COLUMNS).eq('id', id).maybeSingle()
      if (project.error) throw project.error
      if (!project.data) return null
      const scene = await db.from('project_scenes').select('scene,version').eq('project_id', id).maybeSingle()
      if (scene.error) throw scene.error
      if (!scene.data) return null
      return {
        ...toSummary(project.data as ProjectRow),
        scene: SceneEnvelopeSchema.parse(scene.data.scene),
        version: scene.data.version as number,
      }
    },

    async update(ctx, id, patch) {
      const values: Record<string, unknown> = {}
      if (patch.name !== undefined) values.name = patch.name
      if (patch.kind !== undefined) values.kind = patch.kind
      const { data, error } = await forUser(ctx).from('projects').update(values).eq('id', id).select(COLUMNS).maybeSingle()
      if (error) throw error
      return data ? toSummary(data as ProjectRow) : null
    },

    async remove(ctx, id) {
      const { data, error } = await forUser(ctx).from('projects').delete().eq('id', id).select('id')
      if (error) throw error
      return (data ?? []).length > 0
    },

    async saveScene(ctx, id, scene: SceneEnvelope, expectedVersion) {
      const db = forUser(ctx)
      const current = await db.from('project_scenes').select('version').eq('project_id', id).maybeSingle()
      if (current.error) throw current.error
      if (!current.data) return { kind: 'not_found' }
      if (current.data.version !== expectedVersion) return { kind: 'conflict' }
      const updated = await db
        .from('project_scenes')
        .update({ scene, schema_version: scene.schemaVersion, version: expectedVersion + 1 })
        .eq('project_id', id)
        .eq('version', expectedVersion)
        .select('version')
      if (updated.error) throw updated.error
      if ((updated.data ?? []).length === 0) return { kind: 'conflict' }
      return { kind: 'ok', version: expectedVersion + 1 }
    },
  }
}
```

Create `apps/api/src/index.ts`:

```ts
import { supabaseAuthVerifier } from './auth.js'
import { LOGGER_REDACT, buildApp } from './build-app.js'
import { loadConfig } from './config.js'
import { createSupabaseStore } from './supabase-store.js'

const config = loadConfig(process.env)

const app = buildApp(
  {
    auth: supabaseAuthVerifier(config.supabaseUrl, config.supabaseAnonKey),
    store: createSupabaseStore(config.supabaseUrl, config.supabaseAnonKey),
    corsOrigins: config.corsOrigins,
  },
  { logger: { level: config.logLevel, redact: LOGGER_REDACT } },
)

await app.listen({ port: config.port, host: '0.0.0.0' })
```

- [ ] **Paso 9: Prueba de integración del almacén real (contra `dev`)**

Create `apps/api/test/integration/store.integration.test.ts`:

```ts
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { emptyEnvelope } from '@interiores/contract'
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createSupabaseStore } from '../../src/supabase-store.js'
import type { Ctx } from '../../src/store.js'

try {
  process.loadEnvFile(fileURLToPath(new URL('../../../../.env.test', import.meta.url)))
} catch {
  // sin .env.test: variables del proceso (CI)
}
const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: service } = process.env
if (!url || !anon || !service) {
  throw new Error('Faltan SUPABASE_URL, SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY para la prueba de integración. Copia .env.example a .env.test.')
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(url, service, opts)
const store = createSupabaseStore(url, anon)
const created: string[] = []

async function newCtx(label: string): Promise<Ctx> {
  const email = `rls-api-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`
  const password = randomUUID()
  const made = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (made.error || !made.data.user) throw new Error(made.error?.message)
  created.push(made.data.user.id)
  const client = createClient(url as string, anon as string, opts)
  const session = await client.auth.signInWithPassword({ email, password })
  if (session.error || !session.data.session) throw new Error(session.error?.message)
  return { userId: made.data.user.id, token: session.data.session.access_token }
}

let a: Ctx
let b: Ctx
beforeAll(async () => {
  a = await newCtx('a')
  b = await newCtx('b')
})
afterAll(async () => {
  for (const id of created) await admin.auth.admin.deleteUser(id)
})

describe('createSupabaseStore contra Supabase dev', () => {
  it('crea, lista, lee, guarda con versión y borra', async () => {
    const project = await store.create(a, { name: 'Integración', kind: 'vivienda' })
    expect(project.version).toBe(1)
    expect((await store.list(a)).map((p) => p.id)).toContain(project.id)
    const detail = await store.get(a, project.id)
    expect(detail?.scene).toEqual(emptyEnvelope())

    const ok = await store.saveScene(a, project.id, emptyEnvelope(), 1)
    expect(ok).toEqual({ kind: 'ok', version: 2 })
    expect(await store.saveScene(a, project.id, emptyEnvelope(), 1)).toEqual({ kind: 'conflict' })

    expect(await store.remove(a, project.id)).toBe(true)
    expect(await store.get(a, project.id)).toBeNull()
  })

  it('otra persona no ve ni toca el proyecto (null / false / not_found)', async () => {
    const project = await store.create(a, { name: 'Privado' })
    expect(await store.get(b, project.id)).toBeNull()
    expect(await store.update(b, project.id, { name: 'robado' })).toBeNull()
    expect(await store.remove(b, project.id)).toBe(false)
    expect(await store.saveScene(b, project.id, emptyEnvelope(), 1)).toEqual({ kind: 'not_found' })
    expect((await store.list(b)).map((p) => p.id)).not.toContain(project.id)
  })
})
```

Run: `pnpm --filter @interiores/api test`
Expected: PASS (incluye `store.integration.test.ts`). Sin `.env.test` esta suite **falla a propósito** con el mensaje de variables faltantes.

- [ ] **Paso 10: Verificar, probar a mano y commit**

Run: `pnpm verify`
Expected: PASS.

Prueba manual (opcional, con `apps/api/.env` copiado de `.env.example`): `pnpm --filter @interiores/api dev` y `curl http://localhost:3001/health` → `{"status":"ok"}`; `curl -i http://localhost:3001/v1/projects` → `401` con cuerpo en castellano.

```bash
git add -A
git commit -m "feat(api): rutas /v1 de proyectos y escena con bloqueo optimista, errores en castellano y pruebas"
git push -u origin feature/t3-api
```

---

### Tarea 4: Web — cliente de API, guardador y adaptador del editor

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/{package.json,tsconfig.json,next.config.mjs,postcss.config.mjs,vitest.config.ts,CLAUDE.md,.gitignore}`
- Create: `apps/web/scripts/{vendor-pascal-assets,typecheck}.mjs`
- Create: `apps/web/app/{layout.tsx,globals.css,elevation.css}`, `apps/web/public/**` (vendoreado)
- Create: `apps/web/src/lib/api/{client,errors}.ts`, `apps/web/src/lib/supabase/browser.ts`
- Create: `apps/web/src/editor/{scene-saver,adapter,catalog}.ts`
- Create: `apps/web/src/editor/local-items.json` (generado)
- Create: `apps/web/test/{client,errors,scene-saver,adapter,catalog}.test.ts`
- Create: `tests/boundaries.test.ts`
- Create: `docs/pascal-notes.md`

**Interfaces:**
- Consumes: `@interiores/contract`; rutas de la Tarea 3.
- Produces:
  - `class ApiError extends Error { status: number; code: string }`; `createApiClient({ baseUrl, getToken, fetchImpl? }): ApiClient` con `listProjects()`, `createProject(body)`, `getProject(id)`, `updateProject(id, patch)`, `deleteProject(id)`, `saveScene(id, envelope, version)`.
  - `friendlyMessage(err: unknown): string` (castellano).
  - `createSceneSaver<T>(deps): SceneSaver<T>` con `save(payload): Promise<void>`, `flushNow(payload?): Promise<void>`, `status`, `version`.
  - `toEnvelope(graph)`, `fromEnvelope(envelope): SceneGraph | null`.
  - `localizeCatalogItem(item, manifest): item | null`.

- [ ] **Paso 1: Rama, paquete y configuración de Next**

```bash
git switch main && git pull && git switch -c feature/t4-web-editor
```

Create `apps/web/package.json`:

```json
{
  "name": "@interiores/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --port 3000",
    "prebuild": "pnpm --filter @interiores/contract build && node scripts/vendor-pascal-assets.mjs --check",
    "build": "next build",
    "start": "next start",
    "typecheck": "node scripts/typecheck.mjs",
    "test": "vitest run",
    "assets:vendor": "node scripts/vendor-pascal-assets.mjs",
    "e2e": "playwright test",
    "e2e:login": "node e2e/save-auth.mjs"
  },
  "dependencies": {
    "@interiores/contract": "workspace:*",
    "@pascal-app/core": "1.0.3",
    "@pascal-app/editor": "1.0.3",
    "@pascal-app/nodes": "1.0.3",
    "@pascal-app/viewer": "1.0.3",
    "@react-three/drei": "10.7.9",
    "@react-three/fiber": "9.8.1",
    "@supabase/supabase-js": "2.117.3",
    "lucide-react": "1.55.0",
    "next": "16.4.0",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "three": "0.186.1",
    "tw-animate-css": "1.4.0",
    "zod": "4.5.4",
    "zustand": "5.0.15"
  },
  "devDependencies": {
    "@playwright/test": "1.64.0",
    "@tailwindcss/postcss": "4.3.3",
    "@types/node": "22.20.5",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "postcss": "8.5.29",
    "tailwindcss": "4.3.3",
    "typescript": "5.9.3",
    "vitest": "5.0.3"
  }
}
```

Create `apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] },
    "types": ["node"]
  },
  "include": ["next-env.d.ts", "src", "app", "test", "e2e"],
  "exclude": ["node_modules"]
}
```

Create `apps/web/next.config.mjs`:

```js
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pascal publica su editor como TypeScript sin compilar: Next debe transpilarlo.
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ['three', '@pascal-app/viewer', '@pascal-app/core', '@pascal-app/editor', '@pascal-app/nodes'],
  env: {
    // Pascal arma las URLs de sus assets con esta base; si queda vacía usa editor.pascal.app.
    NEXT_PUBLIC_ASSETS_CDN_URL:
      process.env.NEXT_PUBLIC_ASSETS_CDN_URL ?? (vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000'),
  },
}

export default nextConfig
```

Create `apps/web/postcss.config.mjs`:

```js
export default { plugins: { '@tailwindcss/postcss': {} } }
```

Create `apps/web/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({ test: { include: ['test/**/*.test.ts'], environment: 'node' } })
```

Create `apps/web/.gitignore`:

```
.next/
next-env.d.ts
```

Create `apps/web/CLAUDE.md`:

```markdown
# apps/web/

Next 16 (App Router) + editor de Pascal. Reglas en `.claude/rules/apis-de-terceros.md` y `mensajes-en-castellano.md`.
- **Solo `src/editor/`** importa `@pascal-app/*`, `three` y `@react-three/*`. Las páginas (`app/`) importan el editor por `next/dynamic` con `ssr: false`.
- Los assets de Pascal están vendoreados en `public/` desde el repo MIT de Pascal (`pnpm --filter @interiores/web assets:vendor`). No editarlos a mano.
- Lógica pura (guardador, adaptador, catálogo, cliente de API) lleva pruebas en `test/`; los componentes de React se verifican con Playwright (`e2e/`).
- Cualquier nombre de la API de Pascal se confirma antes en `node_modules` y se anota en `docs/pascal-notes.md`.
```

- [ ] **Paso 2: Vendorear los assets de Pascal (repo MIT, commit fijo)**

Create `apps/web/scripts/vendor-pascal-assets.mjs`:

```js
// Copia los assets estáticos y el catálogo local de muebles desde el repo MIT de Pascal.
// Uso: node scripts/vendor-pascal-assets.mjs            (descarga y copia)
//      node scripts/vendor-pascal-assets.mjs --check    (solo verifica que estén)
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const COMMIT = '86f8e833904f7b6b3358bb1505feb82d801ad9ad'
const REPO = 'https://github.com/pascalorg/editor.git'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const REQUIRED = ['material', 'icons', 'hdri', 'fonts', 'audios', 'items/sofa/model.glb', 'pascal-LICENSE.txt']

if (process.argv.includes('--check')) {
  const missing = REQUIRED.filter((p) => !existsSync(join(pub, p)))
  if (missing.length > 0) {
    console.error(`Faltan assets de Pascal en public/: ${missing.join(', ')}. Ejecuta: pnpm --filter @interiores/web assets:vendor`)
    process.exit(1)
  }
  process.exit(0)
}

const tmp = mkdtempSync(join(tmpdir(), 'pascal-'))
try {
  const git = (...args) => execFileSync('git', args, { cwd: tmp, stdio: 'inherit' })
  git('init', '-q')
  git('remote', 'add', 'origin', REPO)
  git('fetch', '--depth', '1', 'origin', COMMIT)
  git('checkout', '-q', 'FETCH_HEAD')

  mkdirSync(pub, { recursive: true })
  for (const dir of ['material', 'icons', 'hdri', 'fonts', 'audios', 'items']) {
    cpSync(join(tmp, 'apps/editor/public', dir), join(pub, dir), { recursive: true })
  }
  cpSync(join(tmp, 'LICENSE'), join(pub, 'pascal-LICENSE.txt'))
  cpSync(join(tmp, 'styles/elevation.css'), join(root, 'app/elevation.css'))

  const manifest = {}
  for (const id of readdirSync(join(pub, 'items'))) {
    manifest[id] = readdirSync(join(pub, 'items', id)).sort()
  }
  mkdirSync(join(root, 'src/editor'), { recursive: true })
  writeFileSync(join(root, 'src/editor/local-items.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`Listo: ${Object.keys(manifest).length} muebles locales de Pascal @ ${COMMIT.slice(0, 7)}`)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
```

Run: `pnpm install && pnpm --filter @interiores/web assets:vendor`
Expected: `Listo: 144 muebles locales de Pascal @ 86f8e83` y se crean `public/{material,icons,hdri,fonts,audios,items}`, `public/pascal-LICENSE.txt`, `app/elevation.css` y `src/editor/local-items.json`.

Run: `pnpm --filter @interiores/web exec node scripts/vendor-pascal-assets.mjs --check; echo $?`
Expected: `0`.

Create `apps/web/scripts/typecheck.mjs`:

```js
// Pascal publica TypeScript sin compilar y su código tiene errores de tipos propios.
// Aquí solo fallan los errores de NUESTROS archivos; los de node_modules se cuentan y se ignoran.
import { spawnSync } from 'node:child_process'

const run = spawnSync('pnpm', ['exec', 'tsc', '--noEmit', '--pretty', 'false'], { encoding: 'utf8', shell: true })
const errors = `${run.stdout}${run.stderr}`.split('
').filter((l) => /\(\d+,\d+\): error TS\d+/.test(l))
const own = errors.filter((l) => !l.includes('node_modules'))

if (own.length > 0) {
  console.error(own.join('
'))
  console.error(`
${own.length} error(es) de tipos en archivos propios.`)
  process.exit(1)
}
console.log(`Tipos OK (se ignoraron ${errors.length} error(es) internos de Pascal en node_modules).`)
```

- [ ] **Paso 3: CSS y layout raíz**

Create `apps/web/app/globals.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "./elevation.css";
@source "../node_modules/@pascal-app/editor/src";
@source "../node_modules/@pascal-app/nodes/dist";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 0.625rem;
  --background: oklch(0.998 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(0.998 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(0.998 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
}

html,
body {
  margin: 0;
  height: 100%;
  background: var(--background);
  color: var(--foreground);
}
```

Create `apps/web/app/layout.tsx`:

```tsx
import './globals.css'

export const metadata = { title: 'Interiores' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Paso 4: Tests del cliente de API y de los mensajes en rojo**

Create `apps/web/test/errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ApiError } from '../src/lib/api/client.js'
import { friendlyMessage } from '../src/lib/api/errors.js'

describe('friendlyMessage', () => {
  it('traduce cada estado a castellano llano', () => {
    expect(friendlyMessage(new ApiError(401, 'no_autenticado', 'x'))).toMatch(/sesión/i)
    expect(friendlyMessage(new ApiError(404, 'no_encontrado', 'x'))).toMatch(/no encontramos/i)
    expect(friendlyMessage(new ApiError(409, 'version_desactualizada', 'x'))).toMatch(/otra pestaña|más nueva/i)
    expect(friendlyMessage(new ApiError(413, 'escena_demasiado_grande', 'x'))).toMatch(/5 MB/)
    expect(friendlyMessage(new ApiError(0, 'sin_conexion', 'x'))).toMatch(/conexión/i)
  })

  it('para un 422 usa el mensaje que ya viene de la API en castellano', () => {
    expect(friendlyMessage(new ApiError(422, 'datos_invalidos', 'Los datos enviados no son válidos: revisa name.'))).toBe(
      'Los datos enviados no son válidos: revisa name.',
    )
  })

  it('un error desconocido no filtra detalles técnicos', () => {
    expect(friendlyMessage(new Error('TypeError: x is undefined'))).toBe('Algo salió mal. Inténtalo de nuevo.')
    expect(friendlyMessage(new ApiError(500, 'error_interno', 'boom'))).toBe('Algo salió mal. Inténtalo de nuevo.')
  })
})
```

Create `apps/web/test/client.test.ts`:

```ts
import { emptyEnvelope } from '@interiores/contract'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, createApiClient } from '../src/lib/api/client.js'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const ID = '0b0e8d9c-6a40-4d6e-9a3c-1f2f6a0f1b11'

function clientWith(fetchImpl: typeof fetch, token: string | null = 'tok') {
  return createApiClient({ baseUrl: 'http://api.test', getToken: async () => token, fetchImpl })
}

describe('createApiClient', () => {
  it('envía el Bearer y valida la respuesta contra el contrato', async () => {
    const fetchImpl = vi.fn(async () =>
      json(200, [{ id: ID, name: 'Casa', kind: null, updatedAt: '2026-10-11T12:00:00.000Z' }]),
    )
    const list = await clientWith(fetchImpl as unknown as typeof fetch).listProjects()
    expect(list[0]?.name).toBe('Casa')
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://api.test/v1/projects')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  it('saveScene manda If-Match con la versión y el envelope', async () => {
    const fetchImpl = vi.fn(async () => json(200, { version: 3 }))
    const res = await clientWith(fetchImpl as unknown as typeof fetch).saveScene(ID, emptyEnvelope(), 2)
    expect(res).toEqual({ version: 3 })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`http://api.test/v1/projects/${ID}/scene`)
    expect(init.method).toBe('PUT')
    expect((init.headers as Record<string, string>)['If-Match']).toBe('2')
  })

  it('convierte el cuerpo de error de la API en ApiError', async () => {
    const fetchImpl = vi.fn(async () => json(409, { error: { code: 'version_desactualizada', message: 'El proyecto cambió.' } }))
    await expect(clientWith(fetchImpl as unknown as typeof fetch).saveScene(ID, emptyEnvelope(), 1)).rejects.toMatchObject({
      status: 409,
      code: 'version_desactualizada',
    })
  })

  it('un 204 no tiene cuerpo', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }))
    await expect(clientWith(fetchImpl as unknown as typeof fetch).deleteProject(ID)).resolves.toBeUndefined()
  })

  it('sin sesión lanza 401 antes de llamar a la red', async () => {
    const fetchImpl = vi.fn()
    const client = clientWith(fetchImpl as unknown as typeof fetch, null)
    await expect(client.listProjects()).rejects.toMatchObject({ status: 401 })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('un fallo de red se vuelve ApiError con estado 0', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    const err = await clientWith(fetchImpl as unknown as typeof fetch).listProjects().catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(0)
  })
})
```

- [ ] **Paso 5: Ver fallar e implementar cliente y mensajes**

Run: `pnpm install && pnpm --filter @interiores/web test`
Expected: FAIL — `Failed to resolve import "../src/lib/api/client.js"`. Pegar en el PR.

Create `apps/web/src/lib/api/client.ts`:

```ts
import {
  type CreateProjectBody,
  CreateProjectBodySchema,
  ErrorBodySchema,
  type ProjectCreated,
  ProjectCreatedSchema,
  type ProjectDetail,
  ProjectDetailSchema,
  type ProjectSummary,
  ProjectSummarySchema,
  type SceneEnvelope,
  type SceneSaved,
  SceneSavedSchema,
  type UpdateProjectBody,
} from '@interiores/contract'
import { z } from 'zod'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export type ApiClientOptions = {
  baseUrl: string
  getToken: () => Promise<string | null>
  fetchImpl?: typeof fetch
}

export function createApiClient(opts: ApiClientOptions) {
  const doFetch = opts.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args))

  async function request<T>(
    method: string,
    path: string,
    schema: z.ZodType<T> | null,
    extra: { body?: unknown; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const token = await opts.getToken()
    if (!token) throw new ApiError(401, 'no_autenticado', 'No hay sesión iniciada.')
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, ...extra.headers }
    if (extra.body !== undefined) headers['Content-Type'] = 'application/json'
    let res: Response
    try {
      res = await doFetch(`${opts.baseUrl}${path}`, {
        method,
        headers,
        body: extra.body === undefined ? undefined : JSON.stringify(extra.body),
      })
    } catch {
      throw new ApiError(0, 'sin_conexion', 'No hay conexión con el servidor.')
    }
    if (!res.ok) {
      const parsed = ErrorBodySchema.safeParse(await res.json().catch(() => null))
      throw parsed.success
        ? new ApiError(res.status, parsed.data.error.code, parsed.data.error.message)
        : new ApiError(res.status, 'error_desconocido', `Error ${res.status}`)
    }
    if (res.status === 204 || schema === null) return undefined as T
    return schema.parse(await res.json())
  }

  return {
    listProjects: (): Promise<ProjectSummary[]> => request('GET', '/v1/projects', z.array(ProjectSummarySchema)),
    createProject: (body: CreateProjectBody): Promise<ProjectCreated> =>
      request('POST', '/v1/projects', ProjectCreatedSchema, { body: CreateProjectBodySchema.parse(body) }),
    getProject: (id: string): Promise<ProjectDetail> => request('GET', `/v1/projects/${id}`, ProjectDetailSchema),
    updateProject: (id: string, patch: UpdateProjectBody): Promise<ProjectSummary> =>
      request('PATCH', `/v1/projects/${id}`, ProjectSummarySchema, { body: patch }),
    deleteProject: (id: string): Promise<void> => request('DELETE', `/v1/projects/${id}`, null),
    saveScene: (id: string, scene: SceneEnvelope, version: number): Promise<SceneSaved> =>
      request('PUT', `/v1/projects/${id}/scene`, SceneSavedSchema, {
        body: scene,
        headers: { 'If-Match': String(version) },
      }),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
```

Create `apps/web/src/lib/api/errors.ts`:

```ts
import { ApiError } from './client'

/** Única capa que traduce errores técnicos a mensajes para personas. */
export function friendlyMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Algo salió mal. Inténtalo de nuevo.'
  switch (err.status) {
    case 0:
      return 'No hay conexión. Revisa tu internet; tus cambios siguen en esta pantalla.'
    case 401:
      return 'Tu sesión venció. Vuelve a ingresar para seguir guardando.'
    case 404:
      return 'No encontramos ese proyecto.'
    case 409:
      return 'Este proyecto cambió desde otra pestaña y tiene una versión más nueva.'
    case 413:
      return 'La escena supera el límite de 5 MB y no se puede guardar.'
    case 422:
      return err.message
    default:
      return 'Algo salió mal. Inténtalo de nuevo.'
  }
}
```

Run: `pnpm --filter @interiores/web test`
Expected: PASS (2 suites, 9 pruebas).

- [ ] **Paso 6: Tests del guardador (debounce, un solo vuelo, 409 y 401) en rojo**

Create `apps/web/test/scene-saver.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type SaveOutcome, type SaverStatus, createSceneSaver } from '../src/editor/scene-saver.js'

type Payload = { n: number }
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup(outcomes: SaveOutcome[] | ((p: Payload, v: number) => Promise<SaveOutcome>), initialVersion = 1) {
  const calls: { payload: Payload; version: number }[] = []
  const statuses: SaverStatus[] = []
  let i = 0
  const put = async (payload: Payload, version: number): Promise<SaveOutcome> => {
    calls.push({ payload, version })
    if (typeof outcomes === 'function') return outcomes(payload, version)
    return outcomes[Math.min(i++, outcomes.length - 1)] as SaveOutcome
  }
  const saver = createSceneSaver<Payload>({
    put,
    initialVersion,
    debounceMs: 2000,
    retryDelaysMs: [2000, 5000],
    onStatus: (s) => statuses.push(s),
  })
  return { saver, calls, statuses }
}

describe('createSceneSaver', () => {
  it('junta guardados rápidos en uno solo con la última escena tras 2 s', async () => {
    const { saver, calls } = setup([{ kind: 'ok', version: 2 }])
    saver.save({ n: 1 })
    await vi.advanceTimersByTimeAsync(1500)
    saver.save({ n: 2 })
    await vi.advanceTimersByTimeAsync(1500)
    expect(calls).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(600)
    expect(calls).toEqual([{ payload: { n: 2 }, version: 1 }])
  })

  it('la promesa de save() se resuelve cuando se guardó', async () => {
    const { saver } = setup([{ kind: 'ok', version: 2 }])
    let done = false
    const p = saver.save({ n: 1 }).then(() => {
      done = true
    })
    await vi.advanceTimersByTimeAsync(1999)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(10)
    await p
    expect(done).toBe(true)
  })

  it('nunca hay dos guardados en vuelo: lo que se edita durante uno viaja después con la versión nueva', async () => {
    let release: (o: SaveOutcome) => void = () => {}
    const outcomes = [new Promise<SaveOutcome>((r) => { release = r }), Promise.resolve<SaveOutcome>({ kind: 'ok', version: 3 })]
    let k = 0
    const { saver, calls } = setup(async () => outcomes[k++] as Promise<SaveOutcome>)
    saver.save({ n: 1 })
    await vi.advanceTimersByTimeAsync(2000)
    expect(calls).toHaveLength(1)
    saver.save({ n: 2 })
    await vi.advanceTimersByTimeAsync(2500)
    expect(calls).toHaveLength(1)
    release({ kind: 'ok', version: 2 })
    await vi.advanceTimersByTimeAsync(10)
    await vi.advanceTimersByTimeAsync(2500)
    expect(calls).toEqual([
      { payload: { n: 1 }, version: 1 },
      { payload: { n: 2 }, version: 2 },
    ])
  })

  it('un 409 detiene el autoguardado y conserva lo local', async () => {
    const { saver, calls, statuses } = setup([{ kind: 'conflict' }])
    saver.save({ n: 1 })
    await vi.advanceTimersByTimeAsync(2000)
    expect(statuses.at(-1)).toBe('conflict')
    saver.save({ n: 2 })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(calls).toHaveLength(1)
    expect(saver.status).toBe('conflict')
  })

  it('un 401 (sesión vencida) detiene el autoguardado sin reintentar en bucle', async () => {
    const { saver, calls, statuses } = setup([{ kind: 'unauthorized' }])
    saver.save({ n: 1 })
    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(calls).toHaveLength(1)
    expect(statuses.at(-1)).toBe('unauthorized')
  })

  it('reintenta con espera creciente tras un error y se recupera', async () => {
    const { saver, calls, statuses } = setup([
      { kind: 'error', message: 'sin red' },
      { kind: 'error', message: 'sin red' },
      { kind: 'ok', version: 2 },
    ])
    saver.save({ n: 1 }).catch(() => {})
    await vi.advanceTimersByTimeAsync(2000)
    expect(calls).toHaveLength(1)
    expect(statuses.at(-1)).toBe('error')
    await vi.advanceTimersByTimeAsync(2000)
    expect(calls).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(5000)
    expect(calls).toHaveLength(3)
    expect(statuses.at(-1)).toBe('saved')
    expect(saver.version).toBe(2)
  })

  it('flushNow guarda de inmediato (por ejemplo al cerrar la pestaña)', async () => {
    const { saver, calls } = setup([{ kind: 'ok', version: 2 }])
    await saver.flushNow({ n: 7 })
    expect(calls).toEqual([{ payload: { n: 7 }, version: 1 }])
  })
})
```

- [ ] **Paso 7: Ver fallar e implementar el guardador**

Run: `pnpm --filter @interiores/web test -- scene-saver`
Expected: FAIL — `Failed to resolve import "../src/editor/scene-saver.js"`. Pegar en el PR.

Create `apps/web/src/editor/scene-saver.ts`:

```ts
export type SaveOutcome =
  | { kind: 'ok'; version: number }
  | { kind: 'conflict' }
  | { kind: 'unauthorized' }
  | { kind: 'error'; message: string }

export type SaverStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'conflict' | 'unauthorized' | 'error'

export type SceneSaverDeps<T> = {
  put: (payload: T, expectedVersion: number) => Promise<SaveOutcome>
  initialVersion: number
  debounceMs?: number
  retryDelaysMs?: number[]
  onStatus?: (status: SaverStatus) => void
}

export type SceneSaver<T> = {
  save(payload: T): Promise<void>
  flushNow(payload?: T): Promise<void>
  readonly status: SaverStatus
  readonly version: number
}

type Waiter = { resolve: () => void; reject: (e: Error) => void }

/**
 * Autoguardado con debounce, un solo guardado en vuelo, reintentos y pausa ante 409/401.
 * `save()` devuelve una promesa que se resuelve cuando la escena quedó guardada (o el guardador
 * quedó en pausa), para que `<Editor>` muestre un estado de guardado verdadero.
 */
export function createSceneSaver<T>(deps: SceneSaverDeps<T>): SceneSaver<T> {
  const debounceMs = deps.debounceMs ?? 2000
  const retryDelays = deps.retryDelaysMs ?? [2000, 5000, 15000]
  let version = deps.initialVersion
  let status: SaverStatus = 'idle'
  let latest: { payload: T } | null = null
  let dirty = false
  let inFlight = false
  let paused = false
  let attempt = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let waiters: Waiter[] = []

  const setStatus = (s: SaverStatus) => {
    status = s
    deps.onStatus?.(s)
  }
  const settle = (error?: Error) => {
    const current = waiters
    waiters = []
    for (const w of current) error ? w.reject(error) : w.resolve()
  }
  const schedule = (ms: number) => {
    clearTimeout(timer)
    timer = setTimeout(() => void flush(), ms)
  }

  async function flush(): Promise<void> {
    clearTimeout(timer)
    if (paused || !dirty || !latest) return settle()
    if (inFlight) return
    inFlight = true
    const sent = latest
    const sentWaiters = waiters
    waiters = []
    setStatus('saving')
    const outcome = await deps.put(sent.payload, version)
    inFlight = false
    if (outcome.kind === 'ok') {
      version = outcome.version
      attempt = 0
      if (latest === sent) dirty = false
      setStatus(dirty ? 'pending' : 'saved')
      for (const w of sentWaiters) w.resolve()
      if (dirty) schedule(debounceMs)
      return
    }
    if (outcome.kind === 'conflict' || outcome.kind === 'unauthorized') {
      paused = true
      setStatus(outcome.kind)
      for (const w of [...sentWaiters, ...waiters.splice(0)]) w.resolve()
      return
    }
    setStatus('error')
    for (const w of sentWaiters) w.reject(new Error(outcome.message))
    const delay = retryDelays[Math.min(attempt, retryDelays.length - 1)] as number
    attempt += 1
    schedule(delay)
  }

  return {
    save(payload) {
      latest = { payload }
      dirty = true
      if (paused) return Promise.resolve()
      if (status !== 'error') setStatus('pending')
      return new Promise<void>((resolve, reject) => {
        waiters.push({ resolve, reject })
        if (status !== 'error') schedule(debounceMs)
      })
    },
    async flushNow(payload) {
      if (payload !== undefined) {
        latest = { payload }
        dirty = true
      }
      await flush()
    },
    get status() {
      return status
    },
    get version() {
      return version
    },
  }
}
```

Run: `pnpm --filter @interiores/web test -- scene-saver`
Expected: PASS (7 pruebas). Si una prueba de temporizadores falla por un detalle de orden de promesas, ajustar la implementación (no los tiempos del spec: 2 s de debounce).

- [ ] **Paso 8: Tests del adaptador y del catálogo local en rojo**

Create `apps/web/test/adapter.test.ts`:

```ts
import { emptyEnvelope } from '@interiores/contract'
import { describe, expect, it } from 'vitest'
import { fromEnvelope, toEnvelope } from '../src/editor/adapter.js'

describe('adapter de escena', () => {
  it('toEnvelope envuelve el grafo con el contrato vigente', () => {
    const graph = { nodes: { wall_1: { type: 'wall' } }, rootNodeIds: ['wall_1'] }
    expect(toEnvelope(graph)).toEqual({ schemaVersion: 1, pascal: { core: '1.0.3' }, graph })
  })

  it('fromEnvelope devuelve null para una escena vacía, para que el editor use la suya', () => {
    expect(fromEnvelope(emptyEnvelope())).toBeNull()
  })

  it('fromEnvelope devuelve el grafo cuando hay contenido', () => {
    const env = { ...emptyEnvelope(), graph: { nodes: { a: {} }, rootNodeIds: ['a'] } }
    expect(fromEnvelope(env)).toEqual({ nodes: { a: {} }, rootNodeIds: ['a'] })
  })

  it('fromEnvelope lanza un error en castellano si el envelope no es válido', () => {
    expect(() => fromEnvelope({ schemaVersion: 9 })).toThrow('La escena guardada no tiene el formato esperado')
  })
})
```

Create `apps/web/test/catalog.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { localizeCatalogItem } from '../src/editor/catalog.js'
import manifest from '../src/editor/local-items.json' with { type: 'json' }

const BUCKET = 'https://byrpxoiotywskoojsrzd.supabase.co/storage/v1/object/public/items/system'

const sofa = {
  id: 'sofa',
  category: 'furniture',
  name: 'Sofa',
  src: `${BUCKET}/sofa/model.glb`,
  thumbnail: `${BUCKET}/sofa/thumbnail.png`,
  floorPlanUrl: `${BUCKET}/sofa/floor-plan.png`,
  dimensions: [2, 1, 1] as [number, number, number],
}

const cactus = {
  ...sofa,
  id: 'cactus',
  src: `${BUCKET}/cactus/model.glb`,
  thumbnail: `${BUCKET}/cactus/thumbnail.png`,
  floorPlanUrl: `${BUCKET}/cactus/floor-plan.png`,
}

describe('localizeCatalogItem', () => {
  it('apunta modelo, miniatura y plano 2D a los archivos propios (el sofá trae su floor-plan.svg)', () => {
    const local = localizeCatalogItem(sofa, manifest)
    expect(local?.src).toBe('/items/sofa/model.glb')
    expect(local?.thumbnail).toBe('/items/sofa/thumbnail.webp')
    expect(local?.floorPlanUrl).toBe('/items/sofa/floor-plan.svg')
    expect(local?.dimensions).toEqual([2, 1, 1])
  })

  it('quita floorPlanUrl cuando no existe el archivo local (el cactus no lo trae)', () => {
    expect(localizeCatalogItem(cactus, manifest)?.floorPlanUrl).toBeUndefined()
  })

  it('descarta los ítems que no tienen modelo local', () => {
    expect(localizeCatalogItem({ ...sofa, id: 'ikea-kallax-1x4-moa2y49n' }, manifest)).toBeNull()
  })

  it('sin tocar los de otro origen', () => {
    const external = { ...sofa, src: 'https://ejemplo.com/otro.glb' }
    expect(localizeCatalogItem(external, manifest)).toBeNull()
  })
})

describe('catálogo de Pascal 1.0.3 vs. assets vendoreados', () => {
  const source = readFileSync(
    fileURLToPath(
      new URL('../node_modules/@pascal-app/editor/src/components/ui/item-catalog/catalog-items.tsx', import.meta.url),
    ),
    'utf8',
  )
  const ids = [...source.matchAll(/\n {4}id: '([^']+)'/g)].map((m) => m[1] as string)

  it('el catálogo oficial tiene 111 ítems', () => {
    expect(ids).toHaveLength(111)
  })

  it('exactamente 100 ítems tienen modelo y miniatura locales', () => {
    const local = ids.filter((id) => (manifest as Record<string, string[]>)[id]?.includes('model.glb'))
    expect(local).toHaveLength(100)
  })
})
```

- [ ] **Paso 9: Ver fallar e implementar adaptador y catálogo**

Run: `pnpm --filter @interiores/web test -- adapter catalog`
Expected: FAIL — no se resuelven `adapter.js` ni `catalog.js`. Pegar en el PR.

Create `apps/web/src/editor/adapter.ts`:

```ts
import {
  PASCAL_CORE_VERSION,
  SCHEMA_VERSION,
  SceneEnvelopeSchema,
  type SceneEnvelope,
  type SceneGraph,
  isEmptyGraph,
} from '@interiores/contract'

export function toEnvelope(graph: SceneGraph): SceneEnvelope {
  return { schemaVersion: SCHEMA_VERSION, pascal: { core: PASCAL_CORE_VERSION }, graph }
}

/** `null` = escena vacía: el editor arranca con su escena por defecto. Pascal migra escenas viejas al cargarlas. */
export function fromEnvelope(envelope: unknown): SceneGraph | null {
  const parsed = SceneEnvelopeSchema.safeParse(envelope)
  if (!parsed.success) throw new Error('La escena guardada no tiene el formato esperado.')
  return isEmptyGraph(parsed.data.graph) ? null : parsed.data.graph
}
```

Create `apps/web/src/editor/catalog.ts`:

```ts
const BUCKET_PREFIX = 'https://byrpxoiotywskoojsrzd.supabase.co/storage/v1/object/public/items/system/'

export type LocalItemsManifest = Record<string, string[]>

type CatalogLike = { id: string; src: string; thumbnail?: string; floorPlanUrl?: string }

/**
 * Reescribe un ítem del catálogo de Pascal para servirlo desde `public/items/<id>/`.
 * Devuelve `null` si el ítem no tiene modelo local (los 11 que solo viven en el bucket de Pascal).
 */
export function localizeCatalogItem<T extends CatalogLike>(item: T, manifest: LocalItemsManifest): T | null {
  const files = manifest[item.id]
  if (!files?.includes('model.glb') || !item.src.startsWith(BUCKET_PREFIX)) return null
  const base = `/items/${item.id}`
  return {
    ...item,
    src: `${base}/model.glb`,
    thumbnail: files.includes('thumbnail.webp') ? `${base}/thumbnail.webp` : undefined,
    floorPlanUrl: files.includes('floor-plan.svg') ? `${base}/floor-plan.svg` : undefined,
  }
}
```

Run: `pnpm --filter @interiores/web test`
Expected: PASS (5 suites).

- [ ] **Paso 10: Cliente Supabase del navegador y el test de fronteras (D8)**

Create `apps/web/src/lib/supabase/browser.ts`:

```ts
import { type SupabaseClient, createClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

/** Un solo cliente por pestaña; la sesión vive en localStorage. */
export function supabaseBrowser(): SupabaseClient {
  client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  )
  return client
}
```

Create `tests/boundaries.test.ts`:

```ts
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('fronteras del editor (decisión D8)', () => {
  it('solo apps/web/src/editor/ importa Pascal, three o R3F desde archivos .ts/.tsx', () => {
    let out = ''
    try {
      out = execFileSync(
        'git',
        ['grep', '-l', '-E', "@pascal-app/|from 'three'|@react-three/", '--', '*.ts', '*.tsx', ':!tests/boundaries.test.ts'],
        { encoding: 'utf8' },
      )
    } catch (e) {
      // git grep sale con 1 cuando no hay coincidencias
      if ((e as { status?: number }).status !== 1) throw e
    }
    const offenders = out.split('\n').filter((f) => f && !f.startsWith('apps/web/src/editor/'))
    expect(offenders).toEqual([])
  })
})
```

Run: `git add -A && pnpm test`
Expected: PASS (`git grep` solo mira archivos rastreados, por eso el `git add` previo).

- [ ] **Paso 11: Notas verificadas de Pascal**

Create `docs/pascal-notes.md`:

```markdown
# Notas verificadas de Pascal 1.0.3

Todo lo de aquí se comprobó leyendo `node_modules/@pascal-app/*` el 2026-10-11. Si usas algo que no está aquí, **verifícalo primero** y agrégalo.

| Qué | Dónde se verificó | Nota |
|---|---|---|
| `<Editor layoutVersion="v2" projectId onLoad onSave onSaveStatusChange guardAgainstSceneWipe sidebarTabs>` | `editor/src/components/editor/index.tsx` (`EditorProps`) | `onLoad: () => Promise<SceneGraph \| null>`; `onSave(scene, { keepalive? })`. |
| Autoguardado propio con debounce de 1 s | `editor/src/hooks/use-auto-save.ts` | Nuestro `createSceneSaver` agrega 2 s y un solo vuelo. |
| `SaveStatus = 'idle' \| 'pending' \| 'saving' \| 'saved' \| 'paused' \| 'error'` | mismo archivo | Exportado desde `@pascal-app/editor`. |
| `SceneGraph = { nodes, rootNodeIds, collections?, materials?, installedPlugins? }` | `editor/src/lib/scene.ts` | Es lo que entrega `onSave`. |
| Migraciones (`healSceneNodes`, `migrateVerticalSceneNodes`) | `core/dist/store/use-scene.js` | **No** se exportan; `useScene` las corre al cargar. |
| `loadPlugin(builtinPlugin)` antes de montar | spike del 2026-10-11 | Sin él el registro de nodos queda vacío. |
| `useScene.getState().createNode(node, parentId)` y `WallNode.parse({ start, end })` | `core/dist/store/use-scene.d.ts`, `schema/nodes/wall.js` | Lo usa el gancho de pruebas E2E. |
| `CATALOG_ITEMS` (111) y `ItemsPanel` | `editor/src/components/ui/item-catalog/catalog-items.tsx` | 100 con modelo local; ver `src/editor/catalog.ts`. |
| URLs de assets: `ASSETS_CDN_URL + ruta` | `viewer/dist/lib/asset-url.js` | Si la variable está vacía usa `editor.pascal.app`; por eso `next.config.mjs` la fija. |
| Licencia | `LICENSE` del repo y de cada paquete: MIT, Pascal Group Inc. | Copia en `public/pascal-LICENSE.txt`. |
```

- [ ] **Paso 12: Verificar y commit**

Run: `pnpm verify`
Expected: PASS. `pnpm --filter @interiores/web typecheck` imprime `Tipos OK (se ignoraron 5 error(es) internos de Pascal en node_modules)`: son errores del código fuente de Pascal (tipos faltantes de `pdfkit`, `howler`, `blob-stream`), no nuestros; cualquier error en un archivo propio hace fallar el comando.

```bash
git add -A
git commit -m "feat(web): cliente de API, guardador con debounce, adaptador y catálogo autoalojado de Pascal"
git push -u origin feature/t4-web-editor
```

---

### Tarea 5: Web — sesión, proyectos y el editor montado

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/lib/{use-session.ts,api/instance.ts}`
- Create: `apps/web/src/editor/{ProjectEditor.tsx,SaveBanner.tsx,e2e-hooks.ts}`
- Create: `apps/web/app/{page.tsx,login/page.tsx,proyectos/page.tsx,proyectos/[id]/page.tsx}`

**Interfaces:**
- Consumes: `createApiClient`, `friendlyMessage`, `createSceneSaver`, `toEnvelope`, `fromEnvelope`, `localizeCatalogItem`, `supabaseBrowser` (Tarea 4).
- Produces: rutas `/login`, `/proyectos`, `/proyectos/[id]`; en `window.__e2e` (solo con `NEXT_PUBLIC_E2E=1`): `wallCount(): number`, `addWall(): void`.

Esta tarea es de interfaz mínima y funcional; el shell visual final llega con su propio spec. Se verifica con Playwright en la Tarea 7.

- [ ] **Paso 1: Rama, sesión y cliente de API compartido**

```bash
git switch main && git pull && git switch -c feature/t5-sesion-y-editor
```

Create `apps/web/src/lib/api/instance.ts`:

```ts
import { supabaseBrowser } from '../supabase/browser'
import { createApiClient } from './client'

export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL as string,
  getToken: async () => (await supabaseBrowser().auth.getSession()).data.session?.access_token ?? null,
})
```

Create `apps/web/src/lib/use-session.ts`:

```ts
'use client'

import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from './supabase/browser'

export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = supabaseBrowser()
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  return { session, loading }
}
```

- [ ] **Paso 2: Páginas de acceso y de proyectos**

Create `apps/web/app/page.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSession } from '@/lib/use-session'

export default function Home() {
  const router = useRouter()
  const { session, loading } = useSession()
  useEffect(() => {
    if (!loading) router.replace(session ? '/proyectos' : '/login')
  }, [loading, session, router])
  return <p className="p-6 text-muted-foreground">Cargando…</p>
}
```

Create `apps/web/app/login/page.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(mode: 'login' | 'register', e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const auth = supabaseBrowser().auth
    const { data, error } =
      mode === 'login' ? await auth.signInWithPassword({ email, password }) : await auth.signUp({ email, password })
    setBusy(false)
    if (error) {
      setMessage(mode === 'login' ? 'Correo o contraseña incorrectos.' : 'No pudimos crear tu cuenta. Revisa el correo y usa al menos 6 caracteres.')
      return
    }
    if (!data.session) {
      setMessage('Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve a ingresar.')
      return
    }
    router.replace('/proyectos')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Ingresa a tus proyectos</h1>
      <form className="flex flex-col gap-3" onSubmit={(e) => submit('login', e)}>
        <label className="flex flex-col gap-1 text-sm">
          Correo
          <input className="rounded-md bg-secondary px-3 py-2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Contraseña
          <input className="rounded-md bg-secondary px-3 py-2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {message && <p role="status" className="text-sm text-destructive">{message}</p>}
        <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground disabled:opacity-60" disabled={busy} type="submit">
          Ingresar
        </button>
        <button className="rounded-md bg-secondary px-3 py-2 disabled:opacity-60" disabled={busy} type="button" onClick={(e) => submit('register', e)}>
          Crear cuenta
        </button>
      </form>
    </main>
  )
}
```

Create `apps/web/app/proyectos/page.tsx`:

```tsx
'use client'

import type { ProjectSummary } from '@interiores/contract'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { api } from '@/lib/api/instance'
import { friendlyMessage } from '@/lib/api/errors'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { useSession } from '@/lib/use-session'

export default function ProjectsPage() {
  const router = useRouter()
  const { session, loading } = useSession()
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'vivienda' | 'comercio'>('vivienda')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!session) return router.replace('/login')
    api.listProjects().then(setProjects, (e) => setError(friendlyMessage(e)))
  }, [loading, session, router])

  async function create(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const created = await api.createProject({ name, kind })
      router.push(`/proyectos/${created.id}`)
    } catch (err) {
      setError(friendlyMessage(err))
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mis proyectos</h1>
        <button className="text-sm underline" onClick={() => supabaseBrowser().auth.signOut().then(() => router.replace('/login'))} type="button">
          Salir
        </button>
      </header>
      <form className="flex flex-wrap items-end gap-3" onSubmit={create}>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Nombre del proyecto
          <input className="rounded-md bg-secondary px-3 py-2" maxLength={80} required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tipo
          <select className="rounded-md bg-secondary px-3 py-2" value={kind} onChange={(e) => setKind(e.target.value as 'vivienda' | 'comercio')}>
            <option value="vivienda">Vivienda</option>
            <option value="comercio">Comercio</option>
          </select>
        </label>
        <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" type="submit">
          Crear proyecto
        </button>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {projects === null ? (
        <p className="text-muted-foreground">Cargando tus proyectos…</p>
      ) : projects.length === 0 ? (
        <p className="text-muted-foreground">Aún no tienes proyectos. Crea el primero arriba.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3" href={`/proyectos/${p.id}`}>
                <span className="font-medium">{p.name}</span>
                <span className="text-sm text-muted-foreground">{p.kind ?? 'sin tipo'}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

- [ ] **Paso 3: Aviso de guardado y editor montado**

Create `apps/web/src/editor/SaveBanner.tsx`:

```tsx
'use client'

import type { SaverStatus } from './scene-saver'

type Props = { status: SaverStatus; onKeepEditing: () => void; dismissed: boolean }

/** Estado de guardado siempre visible; en conflicto o sesión vencida explica qué hacer sin perder lo local. */
export function SaveBanner({ status, onKeepEditing, dismissed }: Props) {
  if (status === 'conflict' && !dismissed) {
    return (
      <div role="alert" className="absolute left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col gap-2 rounded-xl bg-white p-4 shadow-lg">
        <p className="text-sm font-medium">Este proyecto cambió desde otra pestaña y tiene una versión más nueva.</p>
        <p className="text-sm text-muted-foreground">Tu trabajo local sigue aquí. Elige qué hacer:</p>
        <div className="flex gap-2">
          <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={() => window.location.reload()} type="button">
            Recargar la versión del servidor
          </button>
          <button className="rounded-md bg-secondary px-3 py-2 text-sm" onClick={onKeepEditing} type="button">
            Seguir editando sin guardar
          </button>
        </div>
      </div>
    )
  }
  if (status === 'unauthorized') {
    return (
      <div role="alert" className="absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl bg-white p-4 text-sm shadow-lg">
        Tu sesión venció. Tu trabajo local sigue aquí: <a className="underline" href="/login" rel="noreferrer" target="_blank">ingresa de nuevo en otra pestaña</a> y vuelve.
      </div>
    )
  }
  const label: Record<string, string> = {
    pending: 'Cambios sin guardar…',
    saving: 'Guardando…',
    saved: 'Guardado',
    error: 'No pudimos guardar. Reintentando…',
    conflict: 'Sin guardar (versión desactualizada)',
  }
  const text = label[status]
  if (!text) return null
  return (
    <p role="status" className="absolute right-4 top-4 z-50 rounded-full bg-white/90 px-3 py-1 text-xs shadow">
      {text}
    </p>
  )
}
```

Create `apps/web/src/editor/e2e-hooks.ts`:

```ts
import { WallNode, useScene } from '@pascal-app/core'

type SceneNode = { id: string; type: string }

/** Solo para Playwright: lee y modifica la escena sin depender de píxeles. */
export function installE2eHooks(): void {
  const nodes = () => Object.values(useScene.getState().nodes) as SceneNode[]
  ;(window as unknown as { __e2e: unknown }).__e2e = {
    wallCount: () => nodes().filter((n) => n.type === 'wall').length,
    addWall: () => {
      const level = nodes().find((n) => n.type === 'level')
      if (!level) throw new Error('No hay nivel donde agregar el muro')
      useScene.getState().createNode(WallNode.parse({ start: [0, 0], end: [4, 0] }), level.id as never)
    },
  }
}
```

Create `apps/web/src/editor/ProjectEditor.tsx`:

```tsx
'use client'

import { loadPlugin } from '@pascal-app/core'
import { CATALOG_ITEMS, Editor, ItemsPanel, type SceneGraph } from '@pascal-app/editor'
import { builtinPlugin } from '@pascal-app/nodes'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api/instance'
import { ApiError } from '@/lib/api/client'
import { friendlyMessage } from '@/lib/api/errors'
import { fromEnvelope, toEnvelope } from './adapter'
import { type LocalItemsManifest, localizeCatalogItem } from './catalog'
import { installE2eHooks } from './e2e-hooks'
import manifest from './local-items.json'
import { SaveBanner } from './SaveBanner'
import { type SaveOutcome, type SaverStatus, type SceneSaver, createSceneSaver } from './scene-saver'

let pluginReady: Promise<unknown> | null = null
const ensurePlugin = () => {
  pluginReady ??= Promise.resolve(loadPlugin(builtinPlugin))
  return pluginReady
}

type Phase = { kind: 'loading' } | { kind: 'ready'; graph: SceneGraph | null; name: string } | { kind: 'error'; message: string }

export default function ProjectEditor({ projectId }: { projectId: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [status, setStatus] = useState<SaverStatus>('idle')
  const [dismissed, setDismissed] = useState(false)
  const saver = useRef<SceneSaver<SceneGraph> | null>(null)

  const items = useMemo(
    () => CATALOG_ITEMS.flatMap((i) => localizeCatalogItem(i, manifest as LocalItemsManifest) ?? []),
    [],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await ensurePlugin()
        const project = await api.getProject(projectId)
        if (cancelled) return
        saver.current = createSceneSaver<SceneGraph>({
          initialVersion: project.version,
          onStatus: setStatus,
          put: async (graph, version): Promise<SaveOutcome> => {
            try {
              const res = await api.saveScene(projectId, toEnvelope(graph), version)
              return { kind: 'ok', version: res.version }
            } catch (err) {
              if (err instanceof ApiError && err.status === 409) return { kind: 'conflict' }
              if (err instanceof ApiError && err.status === 401) return { kind: 'unauthorized' }
              return { kind: 'error', message: friendlyMessage(err) }
            }
          },
        })
        setPhase({ kind: 'ready', graph: fromEnvelope(project.scene), name: project.name })
        if (process.env.NEXT_PUBLIC_E2E === '1') installE2eHooks()
      } catch (err) {
        if (!cancelled) setPhase({ kind: 'error', message: friendlyMessage(err) })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (phase.kind === 'loading') return <p className="p-6 text-muted-foreground">Abriendo tu proyecto…</p>
  if (phase.kind === 'error') return <p role="alert" className="p-6 text-destructive">{phase.message}</p>

  return (
    <div className="relative h-screen w-screen">
      <SaveBanner dismissed={dismissed} onKeepEditing={() => setDismissed(true)} status={status} />
      <Editor
        guardAgainstSceneWipe
        layoutVersion="v2"
        onLoad={async () => phase.graph}
        onSave={async (scene, options) => {
          const s = saver.current
          if (!s) return
          if (options?.keepalive) await s.flushNow(scene)
          else await s.save(scene)
        }}
        projectId={projectId}
        sidebarTabs={[
          {
            id: 'items',
            label: 'Muebles',
            icon: <span style={{ fontSize: 20 }}>🛋️</span>,
            component: () => <ItemsPanel items={items} showSourceFilter={false} showTagFilters={false} />,
          },
        ]}
      />
    </div>
  )
}
```

Create `apps/web/app/proyectos/[id]/page.tsx`:

```tsx
'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { use, useEffect } from 'react'
import { useSession } from '@/lib/use-session'

// El editor usa WebGPU y el DOM: nunca se renderiza en el servidor.
const ProjectEditor = dynamic(() => import('@/editor/ProjectEditor'), {
  ssr: false,
  loading: () => <p className="p-6 text-muted-foreground">Cargando el editor…</p>,
})

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { session, loading } = useSession()
  useEffect(() => {
    if (!loading && !session) router.replace('/login')
  }, [loading, session, router])
  if (loading || !session) return <p className="p-6 text-muted-foreground">Cargando…</p>
  return <ProjectEditor projectId={id} />
}
```

- [ ] **Paso 4: Compilar, probar a mano y commit**

Run: `pnpm verify`
Expected: PASS (incluye `next build`). Si `next build` falla por un tipo de la API de Pascal que no existe (por ejemplo la forma de `sidebarTabs` o de `ItemsPanel`), **no inventar**: abrir el tipo en `node_modules/@pascal-app/editor/src`, corregir el uso y anotar la corrección en `docs/bitacora.md`.

Prueba manual con `apps/api/.env` y `apps/web/.env.local` (copiados de `.env.example`, con claves de `dev`):

```bash
pnpm --filter @interiores/api dev      # en una terminal
pnpm --filter @interiores/web dev      # en otra
```
Abrir `http://localhost:3000`: crear cuenta, crear un proyecto, ver el editor y el estado "Guardado" en la esquina tras dibujar un muro. La URL del editor y su contenido deben sobrevivir a recargar.

```bash
git add -A
git commit -m "feat(web): acceso, lista de proyectos y editor de Pascal con autoguardado y aviso de conflicto"
git push -u origin feature/t5-sesion-y-editor
```

---

### Tarea 6: Despliegue en Vercel

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Modify: `docs/ESTADO.md` (URLs de despliegue)

**Interfaces:**
- Consumes: el repo en GitHub con las tareas 0–5 en `main`.
- Produces: dos proyectos de Vercel (`web` y `api`) con URLs públicas; `GET <api>/health` responde `{"status":"ok"}`.

- [ ] **Paso 1: Crear el proyecto `api` en Vercel (manual)**

En Vercel → *Add New → Project* → importar el repo:
- **Root Directory:** `apps/api`. Activar *Include source files outside of the Root Directory* (viene activado por defecto).
- **Framework Preset:** Fastify (se detecta por `src/index.ts`; si no, *Other*).
- **Build Command:** `pnpm --filter @interiores/contract build` (el paquete compartido debe estar compilado antes de empaquetar la función).
- **Environment Variables** (Production y Preview): `SUPABASE_URL`, `SUPABASE_ANON_KEY` (los de `prod`, o los de `dev` si no hay `prod`), `CORS_ORIGINS` = `http://localhost:3000` por ahora. **No** cargar `SUPABASE_SERVICE_ROLE_KEY`.

Deploy y esperar a que termine.

- [ ] **Paso 2: Verificar la API desplegada**

Run: `curl -i https://<url-api>.vercel.app/health`
Expected: `HTTP/2 200` y `{"status":"ok"}`.

Run: `curl -i https://<url-api>.vercel.app/v1/projects`
Expected: `HTTP/2 401` con `{"error":{"code":"no_autenticado","message":"Tu sesión no es válida o venció. Vuelve a ingresar."}}`.

Si el deploy falla con `Cannot find module '@interiores/contract'` o con un error de resolución del paquete del workspace: el paquete compartido no quedó empaquetado. Confirmar que el *Build Command* corre antes del empaquetado y que *Include source files outside of the Root Directory* está activo; anotar la causa y la solución en `docs/bitacora.md`.

- [ ] **Paso 3: Crear el proyecto `web` en Vercel (manual)**

*Add New → Project* con el mismo repo:
- **Root Directory:** `apps/web`. **Framework Preset:** Next.js.
- **Environment Variables** (Production y Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` = `https://<url-api>.vercel.app`.
- No hace falta `NEXT_PUBLIC_ASSETS_CDN_URL`: `next.config.mjs` usa `VERCEL_PROJECT_PRODUCTION_URL`.

Deploy y esperar a que termine (el `prebuild` compila el contrato y verifica los assets vendoreados).

- [ ] **Paso 4: Cerrar el círculo de CORS**

En el proyecto `api` de Vercel cambiar `CORS_ORIGINS` a `https://<url-web>.vercel.app` (puedes separar varios con coma, p. ej. el dominio de producción y `http://localhost:3000`) y **redeployar** la API.

Run: `curl -i -X OPTIONS https://<url-api>.vercel.app/v1/projects -H "Origin: https://<url-web>.vercel.app" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: authorization"`
Expected: `HTTP/2 204` con `access-control-allow-origin: https://<url-web>.vercel.app`.

- [ ] **Paso 5: Probar el recorrido en la URL desplegada (criterio de éxito 2 y 3)**

En `https://<url-web>.vercel.app`: crear una cuenta, crear un proyecto, dibujar un muro, esperar "Guardado", recargar la página. Expected: el muro sigue ahí. Si Supabase `prod` tiene "Confirm email" activado, la cuenta nueva exige confirmar el correo: es el riesgo declarado en D6; decidir y anotarlo en `docs/decisiones.md`.

- [ ] **Paso 6: Registrar y commit**

Modify `docs/ESTADO.md`: en "Hecho" agregar las dos URLs y la fecha. Luego:

```bash
git switch -c feature/t6-despliegue
git add docs/ESTADO.md docs/bitacora.md docs/decisiones.md
git commit -m "docs(deploy): URLs de Vercel para web y api y decisión sobre confirmación de correo"
git push -u origin feature/t6-despliegue
```

---

### Tarea 7: Verificación de extremo a extremo y README

**Responsable sugerido:** ambas (la misma persona no revisa lo que escribió). 

**Files:**
- Create: `apps/web/playwright.config.ts`, `apps/web/e2e/{save-auth.mjs,persistence.spec.ts}`
- Modify: `apps/web/.env.local` (solo local, `NEXT_PUBLIC_E2E=1`)
- Create: `README.md`

**Interfaces:**
- Consumes: todo lo anterior; `window.__e2e` (Tarea 5).
- Produces: `pnpm --filter @interiores/web e2e` (criterios de éxito 3 y 5 sobre un navegador real) y el README del informe.

- [ ] **Paso 1: Rama y configuración de Playwright**

```bash
git switch main && git pull && git switch -c feature/t7-verificacion
pnpm --filter @interiores/web exec playwright install chromium
```

Create `apps/web/playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    storageState: 'e2e/.auth/state.json',
    trace: 'retain-on-failure',
  },
})
```

Create `apps/web/e2e/save-auth.mjs`:

```js
// El inicio de sesión real lo hace una persona a mano: se guarda la sesión para las pruebas.
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const base = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
mkdirSync('e2e/.auth', { recursive: true })
const browser = await chromium.launch({ headless: false })
const context = await browser.newContext()
const page = await context.newPage()
await page.goto(`${base}/login`)
console.log('Ingresa con una cuenta de PRUEBA en la ventana abierta; se guarda al llegar a /proyectos.')
await page.waitForURL('**/proyectos', { timeout: 300_000 })
await context.storageState({ path: 'e2e/.auth/state.json' })
await browser.close()
console.log('Sesión guardada en e2e/.auth/state.json (ignorado por git).')
```

- [ ] **Paso 2: Escribir la prueba E2E (en rojo hasta que haya sesión y gancho)**

Create `apps/web/e2e/persistence.spec.ts`:

```ts
import { type Page, expect, test } from '@playwright/test'

const wallCount = (page: Page) => page.evaluate(() => (window as unknown as { __e2e: { wallCount(): number } }).__e2e.wallCount())
const addWall = (page: Page) => page.evaluate(() => (window as unknown as { __e2e: { addWall(): void } }).__e2e.addWall())

async function openNewProject(page: Page, name: string): Promise<string> {
  await page.goto('/proyectos')
  await page.getByLabel('Nombre del proyecto').fill(name)
  await page.getByRole('button', { name: 'Crear proyecto' }).click()
  await page.waitForURL(/\/proyectos\/[0-9a-f-]{36}$/)
  await page.waitForFunction(() => Boolean((window as unknown as { __e2e?: unknown }).__e2e))
  return page.url()
}

test('un muro dibujado sobrevive a recargar (criterio 3)', async ({ page }) => {
  const url = await openNewProject(page, `E2E persistencia ${Date.now()}`)
  const before = await wallCount(page)
  await addWall(page)
  await expect(page.getByRole('status')).toHaveText('Guardado', { timeout: 20_000 })
  await page.goto(url)
  await page.waitForFunction(() => Boolean((window as unknown as { __e2e?: unknown }).__e2e))
  expect(await wallCount(page)).toBe(before + 1)
})

test('dos pestañas: la segunda en guardar recibe 409 y no pierde su trabajo (criterio 5)', async ({ browser, page }) => {
  const url = await openNewProject(page, `E2E conflicto ${Date.now()}`)
  const second = await (await browser.newContext({ storageState: 'e2e/.auth/state.json' })).newPage()
  await second.goto(url)
  await second.waitForFunction(() => Boolean((window as unknown as { __e2e?: unknown }).__e2e))

  await addWall(page)
  await expect(page.getByRole('status')).toHaveText('Guardado', { timeout: 20_000 })

  const localBefore = await wallCount(second)
  await addWall(second)
  await expect(second.getByRole('alert')).toContainText('versión más nueva', { timeout: 30_000 })
  expect(await wallCount(second)).toBe(localBefore + 1)
})
```

- [ ] **Paso 3: Ver la prueba fallar y luego pasar**

Run: `pnpm --filter @interiores/web e2e`
Expected: FAIL — `browserContext.newContext: Failed to read storage state from e2e/.auth/state.json` (aún no hay sesión guardada). Pegar en el PR.

Preparar el entorno de prueba:
1. En `apps/web/.env.local` agregar `NEXT_PUBLIC_E2E=1` (solo local; **no** en Vercel).
2. Levantar `pnpm --filter @interiores/api dev` y `pnpm --filter @interiores/web dev`.
3. Una persona corre `pnpm --filter @interiores/web e2e:login` y se registra o ingresa con una **cuenta de prueba** en la ventana que se abre.

Run: `pnpm --filter @interiores/web e2e`
Expected: PASS (2 pruebas). Si `addWall` falla porque `useScene.getState().createNode` rechaza el nodo, abrir `node_modules/@pascal-app/core/dist/store/use-scene.d.ts`, corregir `e2e-hooks.ts` según la firma real y anotarlo en `docs/bitacora.md`.

- [ ] **Paso 4: Criterio 4 (otra cuenta no ve el proyecto) a mano sobre la URL desplegada**

Con una segunda cuenta, abrir la URL `/proyectos/<id>` de un proyecto de la primera. Expected: el editor muestra "No encontramos ese proyecto." (la API devolvió `404`). Anotar el resultado en el PR junto con la salida de `pnpm --filter @interiores/supabase-tests test`.

- [ ] **Paso 5: README del informe**

Create `README.md`:

```markdown
# Interiores — diseñador de interiores 2D y 3D

TP final de IISAIA (FIUBA) de **Silvert Quispe** y **Victoria Villalba**. Diseña viviendas y comercios en un editor 2D/3D, guarda cada proyecto en tu cuenta y lo vuelve a abrir desde cualquier navegador.

- **Web:** <URL de Vercel de `web`> · **API:** <URL de Vercel de `api`>/health
- **Estado y decisiones vivas:** [`docs/ESTADO.md`](docs/ESTADO.md)

## Cómo correrlo

```bash
pnpm install
cp .env.example .env.test            # claves de Supabase *dev* (nunca al repo)
pnpm verify                          # lint + build + tipos + pruebas (incluye RLS contra dev)
pnpm --filter @interiores/api dev    # http://localhost:3001
pnpm --filter @interiores/web dev    # http://localhost:3000
```

## Arquitectura

`apps/web` (Next 16 + editor de Pascal) → `apps/api` (Fastify, `openapi.yaml`) → Supabase (Auth + Postgres con RLS). Solo `apps/web/src/editor/` conoce a Pascal. Detalle en el [spec 1](docs/superpowers/specs/2026-10-11-fundacion-y-persistencia-design.md) y el [plan](docs/superpowers/plans/2026-10-11-fundacion-y-persistencia.md).

## Qué decidí yo

Las decisiones D1–D10 con sus alternativas descartadas están en el spec (sección 3). Las más defendibles:

1. **API propia en Fastify con contrato primero** en vez de Route Handlers: backend visible, `openapi.yaml` verificado contra el código.
2. **RLS como segunda barrera:** la API reenvía el JWT de la persona; `service_role` solo existe en pruebas.
3. **Bloqueo optimista (`If-Match` → `409`)** en vez de "la última escritura gana".
4. **Pascal como base**, aislado en una carpeta, con plan B (`core` + `viewer`).
5. **Catálogo autoalojado** desde el repo MIT de Pascal (100 muebles) para no depender de su bucket.

## Cómo gestioné el contexto

- `CLAUDE.md` raíz y por zona, y reglas con `paths:` en `.claude/rules/` para que cada carpeta cargue solo lo suyo.
- Un agente por tema independiente con informe en archivo y resumen corto; la documentación consolidada vive en `docs/ESTADO.md`.
- Pascal no está en el material del curso: toda API usada se verificó en `node_modules` y quedó en [`docs/pascal-notes.md`](docs/pascal-notes.md).

## Qué salió mal

Ver [`docs/bitacora.md`](docs/bitacora.md): alucinaciones del agente (migraciones de Pascal, dependencia del bucket), el `ERR_PNPM_IGNORED_BUILDS` de pnpm 11 y lo que descubrimos al desplegar.

## Licencias de terceros

Pascal Editor (MIT, © Pascal Group Inc.): código vía npm y assets copiados de su repo en `apps/web/public/` (ver `public/pascal-LICENSE.txt`).
```

Reemplazar `<URL de Vercel de web>` y `<URL de Vercel de api>` por las URLs reales de la Tarea 6.

- [ ] **Paso 6: Verificación final y PR**

Run: `pnpm verify`
Expected: PASS. Revisar uno por uno los **7 criterios de éxito del spec** y pegar la evidencia en el PR:

| # | Criterio | Evidencia |
|---|---|---|
| 1 | `pnpm install && pnpm verify` en verde desde un clon limpio | salida de `pnpm verify` en un clon nuevo |
| 2 | Registro e ingreso en la URL de Vercel | Tarea 6, paso 5 |
| 3 | El muro sobrevive a recargar | `persistence.spec.ts` (1.ª prueba) |
| 4 | Otra cuenta recibe 404 y RLS lo demuestra | Paso 4 + `rls.test.ts` + `routes.test.ts` |
| 5 | Dos pestañas → 409 sin perder lo local | `persistence.spec.ts` (2.ª prueba) |
| 6 | `openapi.yaml` válido y contrato = rutas | `openapi.test.ts` + `contract.test.ts` |
| 7 | Spec y plan commiteados, `.claude/` real, rojo antes del verde | historial de git y PRs |

```bash
git add -A
git commit -m "test(e2e): persistencia y conflicto en navegador real; docs(readme): informe del TP"
git push -u origin feature/t7-verificacion
```

---

## Autorrevisión del plan

**Cobertura del spec.** §1 criterios 1–7 → Tarea 7 (tabla). §3 D1 (Pascal versiones exactas) → Tareas 4/5; D2 (Fastify + openapi) → 1 y 3; D3 (`project_scenes jsonb`) → 2; D4 (`If-Match` → 409) → 2, 3, 4; D5 (JWT + RLS) → 3; D6 (email + contraseña) → 0 (paso 1) y 5; D7 (migraciones en git, una persona) → 2; D8 (aislamiento del editor) → `tests/boundaries.test.ts` (4); D9 (5 MB → 413) → 1 y 3; D10 (`dev`/`prod`) → 0 y 6. §4 arquitectura → estructura de archivos; §5 modelo → 2; §6 tabla de API → 1 y 3; §7 envelope → 1 y 4 (con la desviación de migraciones); §8 integración del editor → 4 y 5 (plugin, `onLoad`/`onSave`, debounce, 409/401, `guardAgainstSceneWipe`, assets propios, `ItemsPanel`); §9 riesgos → `docs/pascal-notes.md` y bitácora (4), WebGPU en la máquina de demo (**pendiente humano**, fuera de este plan: probar en la máquina del Demo Day); §10 pruebas → 1 a 3 y 7; §11 dependencias manuales → Tarea 0, paso 1.

**Marcadores de relleno.** No quedan "TBD" ni "implementar luego". Los únicos valores que no se pueden conocer antes de ejecutar son los de cuentas externas (`<usuario>/<repo>`, `<ref-de-dev>`, URLs de Vercel) y se piden explícitamente a las personas.

**Consistencia de tipos.** `Ctx`, `ProjectStore`, `SaveSceneResult` (Tarea 3) coinciden con el almacén en memoria y el de Supabase; `SaveOutcome`/`SaverStatus` (Tarea 4) coinciden con `ProjectEditor` y `SaveBanner` (Tarea 5); `friendlyMessage`, `ApiError`, `createApiClient` se importan con los mismos nombres; `ERROR_CODES` y los mensajes en castellano de la API coinciden con lo que esperan las pruebas.

**Review Focus.** (1) id mal formado → `routes.test.ts` "un id mal formado responde 404"; (2) sesión vencida → `scene-saver.test.ts` (401 sin bucle) + `SaveBanner`; (3) `If-Match` raro → `routes.test.ts`; (4) token fuera de los logs → `routes.test.ts` "registros"; (5) grafo vacío → `routes.test.ts`, `contract/scene.test.ts` y `adapter.test.ts`.

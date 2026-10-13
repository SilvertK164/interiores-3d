# Nube: Supabase y Vercel

> **Estado (2026-10-11): preparado, sin cuentas y sin probar.** El repositorio ya trae todo lo que no depende de cuentas: `pnpm db:env:cloud`, los `vercel.json` de la web y de la API, y la función `apps/api/api/index.ts`. **El despliegue en Vercel NO se probó**: esta guía se armó con la documentación de Vercel y de Supabase del 2026-10-11 y con pruebas automáticas (el manejador de la API se prueba con petición y respuesta simuladas). Tu primer despliegue es la prueba real: si algo falla, mira [Si algo falla](#9-si-algo-falla) y anota qué pasó en esta guía. **Novedad (2026-10-13):** la API también atiende el análisis de fotos (`POST /v1/analyze-room`, con Gemini): suma la migración 004 (paso 2), las variables `GEMINI_API_KEY` y `VISION_MODEL` (paso 5) y la [sección 11](#11-análisis-de-fotos-muebles-desde-una-foto-y-laboratorio) con el aviso de privacidad; tampoco se probó con Gemini real.

| Proyecto en la nube | Para qué | Quién lo usa |
|---|---|---|
| Supabase `dev` | Trabajar **sin Docker** | Todo el equipo, con `pnpm db:env:cloud` (paso 4) |
| Supabase `prod` + Vercel (web y API) | La demo | Se despliega desde `main` (pasos 5 a 8) |

Las pruebas de RLS y las E2E de Playwright **no corren contra la nube**: crean usuarios con la clave de servicio, que solo existe en la base local (`.claude/rules/datos-y-rls.md`).

## 1. Crear los proyectos de Supabase (Silvert, una vez)

1. En https://supabase.com/dashboard crea dos proyectos, `interiores-dev` e `interiores-prod`. Elige una región cercana a quienes la van a usar; las funciones de Vercel corren por defecto en una sola región (`iad1`, Washington D. C.), que se puede cambiar.
2. Guarda la **contraseña de la base de datos** de cada uno en tu gestor de contraseñas. La CLI la pide en el paso 2; no va en el repo ni en el chat.
3. Anota el **project ref** de cada uno: es el tramo final de la URL del panel (`https://supabase.com/dashboard/project/<ref>`).
4. En **Project Settings → API Keys** (o en el diálogo **Connect**) están los dos valores que usa la app: la **Project URL** (`https://<ref>.supabase.co`) y la clave **pública** (`sb_publishable_…`; la `anon`, un JWT, es el formato anterior y también sirve). Nunca copies la clave secreta ni la `service_role` a un archivo del repo ni a Vercel: `pnpm db:env:cloud` se niega a usarlas.

## 2. Aplicar las migraciones (una sola persona)

```powershell
npx --yes supabase@2.120.0 login
npx --yes supabase@2.120.0 link --project-ref <ref-de-dev>
npx --yes supabase@2.120.0 db push
```

- `login` abre el navegador. `link` y `db push` pueden pedir la contraseña de la base: **la escribe la persona en su terminal**; nunca va en un archivo ni en el chat. (`pnpm supabase …` es el mismo comando, atajo de `package.json`.)
- Para `prod`, repite `link` y `db push` con su ref cuando vayas a desplegar (paso 6). `link` queda guardado en `supabase/.temp/` (git lo ignora): antes de cada `db push` confirma a qué proyecto estás enlazado.
- Comprueba con `npx --yes supabase@2.120.0 migration list` (hoy hay cuatro migraciones en `supabase/migrations/`) y mirando las tablas en el **Table Editor** del panel.
- **Migración 003 (`20261012120000_003_limits.sql`): aplícala a `madori-dev` y a producción ANTES de desplegar la API con el límite de 4 MB.** Añade los límites de la base (escena de 4 MiB como máximo y con la forma del contrato, nombre de proyecto de 1 a 80 caracteres sin caracteres de control, tope de 50 proyectos por persona). Es la misma `db push`; las restricciones se crean `NOT VALID` y se validan solas si las filas existentes las cumplen (si no, la CLI muestra un NOTICE y quedan activas solo para filas nuevas). Después de aplicarla, comprueba en el SQL Editor: `select conname, convalidated from pg_constraint where conname in ('project_scenes_scene_size','project_scenes_scene_shape','projects_name_clean');`.
- **Migración 004 (`20261013120000_004_analysis_usage.sql`): aplícala a `madori-dev` y a producción ANTES de desplegar la API con el análisis de fotos.** Crea `analysis_usage` (un intento por fila, con RLS: cada persona solo inserta y lee lo suyo, sin `update` ni `delete`) y un disparador que rechaza el intento 11 de la última hora con un mensaje en castellano; la API lo responde con un 429. Si la tabla no existe, el análisis responde un error inesperado (500) **sin llamar a Gemini**: es a propósito, sin registro de intentos no hay análisis. Se aplicó solo a la base local; la nube la aplica una sola persona con el mismo `db push`. Después, en el SQL Editor: `select tgname from pg_trigger where tgname = 'analysis_usage_enforce_limit';` (una fila) y `select relrowsecurity from pg_class where relname = 'analysis_usage';` (`true`).
- Nada de editar tablas a mano en el panel: todo cambio de esquema es una migración nueva, por PR, y la aplica una sola persona.

## 3. Ajustes de Auth (en el panel de cada proyecto)

| Ajuste | `dev` | `prod` |
|---|---|---|
| Authentication → Sign In / Providers → Email → **Confirm email** | Desactivado (igual que la base local: `enable_confirmations = false`) | Decisión tuya; si lo activas, configura un SMTP propio («Custom SMTP») |
| Authentication → **URL Configuration** → Site URL | `http://localhost:3000` (el valor por defecto) | La URL de producción de la web (paso 6) |
| URL Configuration → Redirect URLs | `http://localhost:3000/**` | La URL de la web + `/**` |

Por qué desactivar la confirmación en `dev`: el servicio de correo integrado de Supabase es solo para pruebas, envía únicamente a miembros del equipo de la organización y tiene un tope por hora muy bajo (su documentación decía 2 por hora el 2026-10-11; **revisa los límites vigentes**). La app crea cuentas con correo y contraseña y no usa enlaces mágicos ni OAuth, pero **«¿Olvidaste tu contraseña?» sí depende de Site URL y Redirect URLs** (2026-10-13): la web llama `resetPasswordForEmail` con `redirectTo` = `<origen de la web>/nueva-contrasena` y, si esa URL no está permitida, Supabase manda el enlace a Site URL en vez de a esa página.

**Recuperar la contraseña** (Authentication → URL Configuration): la Redirect URL `https://madori-web-opal.vercel.app/**` ya cubre `/nueva-contrasena`; en `dev` (local) `http://localhost:3000/**`. No hay que agregar nada más. El correo sale del **SMTP por defecto de Supabase**, que tiene un límite bajo de correos por hora para todo el proyecto (el aviso en pantalla es «Pediste varios enlaces seguidos…»): para que lo usen más personas hace falta un **SMTP propio** (Authentication → Emails → SMTP Settings, «Custom SMTP»). Prueba manual pendiente contra Supabase real: pedir el enlace, abrirlo, crear la contraseña y reabrirlo para ver «El enlace venció o ya se usó».

## 4. Trabajar sin Docker (Victoria y colaboradores)

**Silvert**, una vez: pasa a cada colaboradora, por un canal privado (mensaje directo o un gestor de contraseñas compartido; **nunca** el repo, un issue, un PR ni el chat de GitHub), estos dos valores del proyecto `dev`:

```
SUPABASE_URL=https://<ref-de-dev>.supabase.co
SUPABASE_ANON_KEY=<clave pública del proyecto dev>
```

La clave pública está pensada para ir en el navegador (no es la `service_role`), pero igual no se publica: identifica el proyecto y permite crear cuentas en él. No compartas la contraseña de la base, tu token de la CLI ni ninguna clave secreta.

**Quien trabaja sin Docker** (PowerShell, desde la carpeta del repositorio):

```powershell
pnpm install
Copy-Item .env.cloud.example .env.cloud     # reemplaza los dos valores en .env.cloud (git lo ignora)
pnpm db:env:cloud                           # escribe apps/api/.env y apps/web/.env.local
pnpm --filter @interiores/api dev           # terminal 2: http://localhost:3001
pnpm --filter @interiores/web dev           # terminal 3: http://localhost:3000
```

También puedes definir las dos variables solo en esa terminal (`$env:SUPABASE_URL = '…'; $env:SUPABASE_ANON_KEY = '…'`) y correr `pnpm db:env:cloud`: el entorno tiene prioridad sobre `.env.cloud`. El comando acepta además los nombres de la web (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) y `SUPABASE_PUBLISHABLE_KEY`; valida la URL (`https://…supabase.co`) y la clave (`sb_publishable_…` o un JWT `anon`), se niega a escribir si recibe una clave secreta o `service_role`, y nunca imprime claves. Escribe solo la API y la web, no `.env.test`.

Qué cambia sin Docker:

- **No corren** las pruebas de RLS y de integración de la API ni las E2E de Playwright, a propósito. `pnpm verify` completo necesita la base local; la CI de GitHub lo corre con Supabase local en cada PR. Sí corren `pnpm lint`, `pnpm build`, `pnpm typecheck` y las pruebas de la web (`pnpm --filter @interiores/web test`).
- `pnpm db:seed` se niega a crear las cuentas de prueba en la nube: usa «Crear cuenta» en `/login`.
- Para volver a la base local: `pnpm db:start` y `pnpm db:env` (reescribe esos mismos archivos).

## 5. Vercel: dos proyectos desde el mismo repositorio (sin probar)

La rama de producción de Vercel es `main` y hoy **`main` no tiene `apps/`** (el código sigue en ramas de PR; el PR #1 está abierto). Haz el merge antes de importar, o cambia la rama de producción en los ajustes de cada proyecto.

En https://vercel.com/new importa `SilvertK164/interiores-3d` **dos veces**, una por proyecto (así lo describe la documentación de monorepos de Vercel):

| Ajuste | Proyecto web | Proyecto API |
|---|---|---|
| Nombre sugerido | `interiores-web` | `interiores-api` |
| Root Directory | `apps/web` | `apps/api` |
| Framework Preset | Next.js (se detecta) | Other (lo fija `apps/api/vercel.json` con `framework: null`) |
| Install y Build Command | Los de `apps/web/vercel.json`; no los cambies en el panel | Los de `apps/api/vercel.json` |
| Include source files outside of the Root Directory in the Build Step | Activado (viene así en proyectos nuevos) | Activado: la API necesita `packages/contract` |
| Node.js Version (Settings → Build and Deployment) | 22.x, como `.nvmrc` y la CI | 22.x |

Qué hacen los `vercel.json`: instalan solo ese paquete y sus dependencias del workspace (`pnpm install --frozen-lockfile --filter <paquete>...`; pnpm encuentra la raíz del workspace solo, no hace falta `cd ../..`) y compilan `packages/contract` antes. La API es **una sola función** (`apps/api/api/index.ts`) a la que `rewrites` manda todas las rutas; reutiliza `buildApp` igual que `src/index.ts`, que sigue siendo el arranque local. `apps/api/public/.gitkeep` evita que Vercel sirva como archivos estáticos el código de la API.

**Variables de entorno** (Settings → Environment Variables, marcadas para **Production**; solo nombres, nunca valores en el repo):

Proyecto web:

| Variable | Valor y de dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL del Supabase `prod` (paso 1) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública del mismo proyecto (paso 1) |
| `NEXT_PUBLIC_API_URL` | URL de producción del proyecto API en Vercel (`https://….vercel.app`), sin barra final |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` (obligatoria, ver abajo) |
| `NEXT_PUBLIC_ASSETS_CDN_URL` | Opcional: si falta, `next.config.mjs` usa la URL de producción de Vercel |

Proyecto API:

| Variable | Valor y de dónde sale |
|---|---|
| `SUPABASE_URL` | Project URL del Supabase `prod` |
| `SUPABASE_ANON_KEY` | Clave pública del mismo proyecto |
| `CORS_ORIGINS` | URL de producción de la web (varias, separadas por coma), sin barra final; vacía = ningún origen permitido |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` (obligatoria, ver abajo) |
| `LOG_LEVEL` | Opcional (`info` por defecto) |
| `GEMINI_API_KEY` | Clave de la API de Gemini (Google AI Studio) para «Muebles desde una foto». **Solo en este proyecto**, marcada como **Sensible** (Sensitive) y para **Production**. Opcional: sin ella la API arranca y el análisis responde 503 («no está disponible por ahora») |
| `VISION_MODEL` | Opcional: modelo de visión de Gemini. Por defecto `gemini-3.5-flash`; si Google lo retira o quieres otro, cámbialo aquí y redespliega |

- Todo `NEXT_PUBLIC_*` se incrusta al **compilar** la web: si lo cambias, hay que desplegar de nuevo.
- `ENABLE_EXPERIMENTAL_COREPACK=1` hace que Vercel use el pnpm de `packageManager` (pnpm 11). Según su documentación, con un comando de instalación propio y sin Corepack usaría la versión más vieja de pnpm que tiene, y pnpm 11 ni figura entre las versiones que lista como soportadas.
- No pongas en Vercel la clave `service_role` ni ninguna clave secreta de Supabase (solo existen en pruebas locales), ni `NEXT_PUBLIC_E2E` (gancho de Playwright), ni `PORT`. **La única clave secreta que sí va en Vercel es `GEMINI_API_KEY`, en el proyecto API** (nunca en la web: lo que lleva `NEXT_PUBLIC_` se publica en el navegador). La clave de Gemini no se escribe en el repositorio, en un chat ni en un registro; si se filtra, se revoca en Google AI Studio y se crea otra.

## 6. Orden de despliegue

1. **Migración** al Supabase `prod` (paso 2 con su ref) y sus ajustes de Auth (paso 3).
2. **API**: importa el proyecto, carga sus variables **sin** `CORS_ORIGINS` (queda cerrada) y despliega. Anota su URL de producción y abre `https://<api>/health`.
3. **Web**: carga sus variables con `NEXT_PUBLIC_API_URL` = la URL de la API y despliega. Anota su URL.
4. **Cierra el círculo**: en la API pon `CORS_ORIGINS` = la URL de la web y **redespliega** la API (las variables nuevas solo valen para despliegues nuevos). En Supabase `prod`, pon esa URL en Site URL y Redirect URLs.

Son dos pasadas porque la web necesita la URL de la API para compilar y la API necesita la de la web para CORS.

## 7. CORS y `NEXT_PUBLIC_API_URL`

- El único ajuste de CORS es `CORS_ORIGINS` en la API. Valor por defecto: vacío, o sea que **no se permite ningún origen**. Cada origen es esquema + dominio, sin ruta (el código quita las barras finales de más). Se permiten los métodos y encabezados que usa la web (`Authorization`, `Content-Type`, `If-Match`).
- `NEXT_PUBLIC_API_URL` también va sin barra final: la web pega la ruta tal cual y una barra de más produce `//v1/…`.
- Usa siempre las URL de **producción** (`….vercel.app` del proyecto o un dominio propio). Cada vista previa de Vercel tiene otra URL y puede estar protegida por Vercel (Deployment Protection), así que sus llamadas a la API fallarían por CORS. Esta guía no configura vistas previas.
- Si CORS está mal, la consola del navegador dice «blocked by CORS policy».

## 8. Lista de verificación posterior

1. `https://<api>/health` responde `{"status":"ok"}`.
2. La web abre `/login`.
3. **Crear cuenta** con un correo y una contraseña de 6 caracteres o más (si activaste la confirmación en `prod`, confirma el correo).
4. En `/proyectos`: **Nuevo proyecto** → elige una **plantilla** → se abre el editor con la escena armada.
5. Mueve o agrega un mueble, espera el autoguardado y **recarga** (F5): el proyecto y el cambio siguen ahí.
6. Con una segunda cuenta, el proyecto de la primera no aparece (RLS), y en el **Table Editor** de Supabase `prod` ves la fila del proyecto.
7. **Análisis de fotos** (con `GEMINI_API_KEY` cargada y la migración 004 aplicada): en un proyecto, **Más → Muebles desde una foto** con una foto **no sensible** → aparece la lista de muebles y se agregan. En el **Table Editor**, `analysis_usage` tiene una fila por cada análisis. A los 10 análisis en una hora, el siguiente muestra «Llegaste al límite de 10 análisis por hora».

## 9. Si algo falla

| Síntoma | Qué revisar |
|---|---|
| El build falla al instalar (pnpm, lockfile) | Que el proyecto tenga `ENABLE_EXPERIMENTAL_COREPACK=1` y redespliega. |
| API: «No Output Directory named "public" found» | Que `apps/api/public/.gitkeep` esté en el repositorio. |
| API: error 500 o `FUNCTION_INVOCATION_FAILED` | Los registros (Logs) del despliegue: la línea `[api] no se pudo arrancar:` dice qué variable falta; si no aparece, es un error de compilación o de importación del TypeScript. |
| API: una página 404 de Vercel en vez del JSON en castellano | Que Root Directory sea `apps/api` y que el rewrite a `/api` esté aplicado. |
| La web no llega a la API | `NEXT_PUBLIC_API_URL` (¿sin barra final? ¿redesplegaste la web después de cambiarla?) y `CORS_ORIGINS`. |
| Falla crear cuentas en `prod` | La confirmación de correo con el servicio integrado (paso 3). |
| Error 413 al guardar una escena grande | El límite de cuerpo de Vercel (paso 10). |
| El análisis de fotos dice «no está disponible por ahora» (503) | Que `GEMINI_API_KEY` exista en el proyecto **API** para Production y que se haya redesplegado después de cargarla. |
| El análisis dice «No pudimos analizar la foto» (502) | Los registros de la función: la línea `análisis de foto: el proveedor no entregó un resultado válido` trae un `reason` corto (`http_403:PERMISSION_DENIED` = clave mala o sin permiso, `http_429:RESOURCE_EXHAUSTED` = cuota agotada, `http_404…` = `VISION_MODEL` no existe, `timeout`, `empty`, `truncated`…). Nunca registra la foto ni lo que contestó Google. |
| El análisis responde un error inesperado (500) y no hay filas en `analysis_usage` | Que la migración 004 esté aplicada en ese Supabase (paso 2). |

**Plan B para la API (no probado):** Vercel documenta Fastify con detección automática del archivo `src/index.ts`, que ya llama a `listen`. Si la función de `api/` no arranca, quita `framework`, `outputDirectory` y `rewrites` de `apps/api/vercel.json` (deja `installCommand` y `buildCommand`), elige el preset Fastify del proyecto y borra `apps/api/api/` (y ajusta `tests/vercel-config.test.ts`).

## 10. Límites y riesgos conocidos

- **Planes y cuotas:** no los afirmamos acá. **Revisa los límites vigentes** de Supabase y de Vercel (qué pasa con proyectos inactivos, correos, ancho de banda, funciones) antes de depender de ellos para la demo.
- **Tamaño del cuerpo:** Vercel rechaza peticiones de más de 4,5 MB a una función (`413 FUNCTION_PAYLOAD_TOO_LARGE`, documentación de Vercel del 2026-10-11) y nuestra API y la base admiten escenas de hasta 4 MiB (`SCENE_MAX_BYTES`, bajado desde 5 MiB el 2026-10-12 para quedar por debajo del tope de Vercel). Las plantillas pesan unos 120 KB.
- **Análisis de fotos:** su petición es la más grande de la API. Con una foto de 3 MiB (el tope, decodificada) y un catálogo de 64 KB, el JSON pesa unos 4,26 MB y entra bajo los 4,5 MB de Vercel (`ANALYZE_BODY_MAX_BYTES` del contrato); la web reduce la foto antes de enviarla, así que en la práctica son cientos de KB. La función puede durar hasta 30 s (`functions.maxDuration` de `apps/api/vercel.json`) y la espera a Gemini corta a los 25 s. **Revisa los límites de duración vigentes de tu plan de Vercel.**
- **Sin pruebas reales:** nada de lo que depende de las cuentas (Auth, `db push`, Vercel) se ejecutó todavía, ni el análisis de fotos contra Gemini real (solo con la respuesta de Google simulada).

## 11. Análisis de fotos («Muebles desde una foto» y `/escena-desde-foto`)

Desde el 2026-10-13 el análisis ya no necesita el servicio TP3 local ni su dirección: la web manda la foto a `POST /v1/analyze-room` de nuestra API (con la sesión de la persona) y la API llama a Gemini. El backend de TP3 queda como referencia del Laboratorio de Victoria (`lab/README.md`).

- **Camino de una foto:** el navegador la reduce (lado mayor ≤ 1600 px, JPEG) y la envía en base64 dentro de un JSON; la API comprueba que de verdad sea JPEG, PNG o WebP, se la manda a Gemini junto con la lista de piezas del catálogo y devuelve qué piezas hay y dónde. La API **no guarda la foto** ni la registra: solo vive en memoria durante la petición, y los registros nunca llevan la foto, el texto que se le envía a Gemini ni la clave.
- **Aviso de privacidad (la interfaz lo muestra junto al campo de la foto):** la foto sale de nuestra API hacia Google. **En el nivel gratuito de la API de Gemini, Google puede usar el contenido que se le envía para mejorar sus productos** (así lo indicaban sus términos el 2026-10-13: **revisa los vigentes** antes de la demo). Conviene evitar fotos privadas o con personas. Si se usa un plan de pago de Google las condiciones son otras; es una decisión de quien administra la clave.
- **Tope por persona:** 10 análisis por hora (migración 004). Cuenta cada pedido que llega a Gemini, aunque Gemini falle; los pedidos inválidos y el 503 no cuentan. El tope lo aplica la base con un disparador, así que dos pedidos simultáneos no lo pasan a la vez.
- **Cuota compartida:** cada cuenta tiene su tope, pero la cuota de Google es de la clave y se reparte entre todas las cuentas, y crear cuentas es libre. Si se agota, el análisis responde «No pudimos analizar la foto…» (el registro dice `http_429:RESOURCE_EXHAUSTED`). Mira la cuota vigente en Google AI Studio antes de la demo.
- **Probarlo en local:** agrega `GEMINI_API_KEY=<tu clave>` a `apps/api/.env` (git lo ignora) o defínela solo en la terminal de la API (`$env:GEMINI_API_KEY = '…'` en PowerShell, antes de `pnpm --filter @interiores/api dev`; el entorno tiene prioridad sobre el archivo). Ojo: `pnpm db:env` y `pnpm db:env:cloud` reescriben `apps/api/.env` sin esa línea. La migración 004 tiene que estar aplicada en la base local (`npx --yes supabase@2.120.0 migration up`). Las pruebas automáticas no llaman a Google: simulan su respuesta.

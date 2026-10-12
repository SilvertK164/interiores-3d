# Revisión de seguridad previa al despliegue

> Fecha: 2026-10-12 · Rama `feature/editor-shell` · Alcance: API, RLS, web, secretos, dependencias, laboratorio.
> Método: lectura de código y migraciones, `pnpm audit --prod`, barrido de patrones en todo el historial de git, pruebas unitarias. **No** se tocó la nube, no se crearon cuentas, no se corrió Playwright ni se levantaron servidores.

## Resumen

| Severidad | Cantidad | Estado |
|---|---|---|
| Crítico | 0 | Sin hallazgos |
| Importante | 4 | 1 arreglado (cabeceras), 3 pendientes (panel o decisión) |
| Menor | 9 | Pendientes o aceptados |

## Hallazgos

### Importante

**I-1. Faltaban cabeceras de seguridad en la web y en la API** — ARREGLADO (commit `fix(seguridad): cabeceras de seguridad...`).
`apps/web/next.config.mjs` no tenía `headers()` y `apps/api/src/build-app.ts` no ponía ninguna. Ahora:
- Web (`apps/web/security-headers.mjs`, aplicado en `next.config.mjs`): `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy` (cámara, micrófono, geolocalización, pagos, USB cerrados) siempre; en producción además `Strict-Transport-Security` y una CSP **obligatoria** mínima (`frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'`).
- La CSP **completa** va en `Content-Security-Policy-Report-Only` (ver abajo): no se pudo probar el editor en navegador, y una CSP estricta mal calibrada rompería Pascal. Plan: desplegar, abrir el editor, mirar la consola; si no hay avisos «Content Security Policy», renombrar la cabecera en `security-headers.mjs` a `Content-Security-Policy`.
- API: `nosniff`, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Frame-Options`, HSTS y `default-src 'none'` en todas las respuestas (también 401, 404 y errores).
- Pruebas: `apps/web/test/security-headers.test.ts`, `apps/api/test/security-headers.test.ts` (vistas en rojo antes).

CSP completa propuesta, con lo que Pascal necesita de verdad (leído en `node_modules/@pascal-app`):

| Directiva | Valor | Por qué |
|---|---|---|
| `script-src` | `'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net` | Next inyecta scripts en línea al hidratar (un nonce obligaría a renderizado dinámico de todo); WebAssembly de manifold y Draco; `import()` de respaldo de `manifold-3d` desde jsdelivr. No hace falta `'unsafe-eval'` |
| `worker-src` | `'self' blob:` | Draco y manifold crean workers desde blob |
| `connect-src` | `'self' blob: data:` + origen de `NEXT_PUBLIC_API_URL`, de `NEXT_PUBLIC_SUPABASE_URL`, `https://byrpxoiotywskoojsrzd.supabase.co`, `https://cdn.jsdelivr.net`, `https://www.gstatic.com`, y el origen de `NEXT_PUBLIC_LAB_PHOTO_URL` o `http://localhost:8000` | Decodificador Draco (gstatic), transcodificador basis y manifold (jsdelivr), bucket de muebles de Pascal, API y Auth |
| `img-src` | `'self' data: blob:` + bucket de Pascal | GLB/texturas decodificadas a blob, miniaturas |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind, estilos en línea de R3F/Pascal |
| `font-src` | `'self' data:` | `next/font/google` se descarga al compilar y se sirve desde el dominio propio: no hace falta fonts.gstatic.com |
| `media-src` | `'self' blob: data:` | Audios locales |
| `frame-src` | `'none'` | Sin iframes |

Efecto en el laboratorio: en producción la página `/laboratorio` solo podrá hablar con `localhost:8000` o con la URL fijada al compilar (`NEXT_PUBLIC_LAB_PHOTO_URL`); otra URL escrita a mano se bloqueará (es lo deseado, ver M-6).

**I-2. Registro abierto sin CAPTCHA, contraseña mínima de 6 y sin tope por persona** — PENDIENTE (panel + decisión).
`supabase/config.toml` (local): `enable_signup = true`, `minimum_password_length = 6`, `enable_confirmations = false`. Cualquiera puede crear cuentas ilimitadas y cada cuenta puede crear proyectos ilimitados con escenas de hasta 5 MB (`apps/api/src/supabase-store.ts:38`, sin cuota). Riesgo real: abuso de almacenamiento y de la cuota gratuita de Supabase. Ver lista de comprobación (CAPTCHA, longitud, límites de tasa). Recomendación de código futura: migración 003 con un trigger que limite proyectos por dueño (por ejemplo 50) y un `check (pg_column_size(scene) <= 5242880)` en `project_scenes`; no se hizo porque no se puede probar sin la base local y toca una base ya migrada.

**I-3. Las validaciones de la API se pueden saltar yendo directo a PostgREST** — PENDIENTE (diseño).
La clave pública (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) más el JWT de la persona permiten `POST https://<ref>.supabase.co/rest/v1/project_scenes` sin pasar por la API. RLS impide tocar lo ajeno (bien), pero la persona puede guardar escenas sin pasar por zod, sin tope de 5 MB y con `version` arbitraria. Solo afecta a su propio proyecto, así que el efecto es abuso de espacio (se une a I-2) y escenas que luego la API se negaría a leer: `supabase-store.ts:65` hace `SceneEnvelopeSchema.parse` y lanzaría 500 en `GET /v1/projects/:id` de ese proyecto. Mitigación: el `check` de tamaño y de `schema_version` en la migración 003 (arriba).

**I-4. Límite de cuerpo de Vercel (4,5 MB) menor que el de la API (5 MB)** — RIESGO BAJO EN LA PRÁCTICA, pendiente decidir.
`packages/contract/src/scene.ts:79` (`SCENE_MAX_BYTES = 5 MiB`) y `docs/nube.md` §10. Medición: las plantillas más grandes pesan unos 120 KB (`apps/web/public/templates/cafe.json`), o sea 40 veces menos que el límite; una escena real de 4,5 MB es improbable. Qué hacer: (a) bajar `SCENE_MAX_BYTES` a 4 MiB (tocar contrato, `openapi.yaml`, mensajes «5 MB» en `errors.ts` de API y web y sus pruebas), o (b) dejarlo y medir escenas reales. Recomiendo (a) antes de la demo si hay tiempo; si no, queda documentado y el 413 de Vercel no tiene el cuerpo JSON de la API (la web mostrará «Error 413», no el mensaje en castellano).

### Menor

- **M-1. Verificación del JWT delegada a Supabase** (`apps/api/src/auth.ts:14`): `client.auth.getUser(token)` valida firma, algoritmo, expiración, emisor y revocación en el servidor de Auth; no hay verificación local ni JWKS. Correcto y simple; costo: una ida y vuelta por petición y la cuota de Auth. Si se necesita rendimiento, pasar a `jose` con JWKS (`/auth/v1/.well-known/jwks.json`) y comprobar `iss`, `aud=authenticated`, `exp`.
- **M-2. 401/404/403 bien resueltos**: sin token o con token inválido, 401 (`build-app.ts` gancho `/v1`); id no uuid, proyecto ajeno o inexistente, 404 siempre (`projects.ts:162`, `:189`, `:197`, `:203`; `scene.ts:229`); nunca 403. RLS devuelve 0 filas a quien no es dueño. Sin IDOR hallado. La API usa un cliente por petición con el JWT de la persona (`supabase-store.ts:24`). `If-Match` obligatorio (428), entero positivo (422), y la actualización lleva `.eq('version', esperada)`, así que dos guardados concurrentes no pisan (`supabase-store.ts:91-98`).
- **M-3. `service_role` solo en pruebas y scripts locales**: `scripts/seed-users.mjs`, `supabase/tests/support/env.ts`, `apps/api/test/integration/`, `apps/web/e2e/support/user.ts`. Ningún uso en `apps/api/src`, `apps/web/src` ni `app/`. `scripts/lib/cloud-env.mjs:59-65` rechaza claves secretas.
- **M-4. Nombre de proyecto**: 1 a 80 caracteres con `trim` (contrato y `check` de la base) pero acepta caracteres de control y saltos de línea. React escapa al mostrar, no hay `dangerouslySetInnerHTML` ni `innerHTML` en `apps/web/src`, `app/` ni en los parches; sin XSS hallado. Mejora opcional: rechazar `\p{Cc}` en `ProjectNameSchema`.
- **M-5. JSON muy anidado**: una carga de 5 MB de `[` anidados se rechazó con 422 en ~1,1 s de CPU (medido con `app.inject`); no revienta la pila, pero un usuario autenticado puede gastar ~1 s de función por petición. Sin límite de tasa en la API (`@fastify/rate-limit` no está; en funciones sin estado un limitador en memoria casi no sirve). Mitigación real: límites de tasa de Vercel (Firewall) y de Supabase.
- **M-6. Laboratorio**: `app/laboratorio/page.tsx:24,83-86` y `lib/lab/analyze-room.ts:56` envían la **foto** a la URL escrita por la persona (guardada en `localStorage`, `lab:tp3-url`). No se envía el JWT ni nada de Supabase, solo la foto y el ancho. No es SSRF (el `fetch` sale del navegador de la propia persona, no de un servidor nuestro). Riesgo: que alguien la engañe para pegar una URL ajena, o XSS que cambie la URL guardada. Sin aviso en pantalla de que la foto va a esa dirección: **recomendado** agregar una línea bajo el campo («La foto se envía a esta dirección»). La CSP de producción limita el destino. `lab:tp3` acepta CORS solo de `http://localhost:3000` por defecto (`scripts/lib/lab-tp3.mjs:10`) y escucha en `127.0.0.1`; `pnpm lab:setup` clona el repositorio de Victoria sin fijar commit (`lab-tp3.mjs:7`) e instala sus dependencias de Python: confianza en un tercero, solo en local.
- **M-7. Rewrite al CDN de Pascal** (`next.config.mjs`, `/material/:path*` en `fallback`): el destino es fijo (`editor.pascal.app`), el path no puede cambiar el host; solo se usa si el archivo local no existe. Es un proxy de lectura de un dominio fijo: sin SSRF. Riesgo de cadena de suministro: si ese CDN cambiara una textura, se sirve desde nuestro dominio. Alternativa: vendorear las cuatro texturas que faltan. El script de assets fija el commit de Pascal (`apps/web/scripts/vendor-pascal-assets.mjs:14`, SHA completo): bien.
- **M-8. Escenas con URLs ajenas**: el esquema de Pascal acepta cualquier `https:` en `item.asset.src` (`@pascal-app/core` `asset-url.js`); la API guarda JSON suelto (`z.looseObject`). Una escena manipulada por su dueño puede hacer que su propio navegador pida URLs externas. No hay compartir proyectos, así que solo se ataca a sí mismo; si algún día se comparten, hay que validar orígenes (variable `PASCAL_ALLOWED_ASSET_ORIGINS`) y la CSP ya lo frena.
- **M-9. Funciones de trigger en `public`** (`set_updated_at`, `touch_project_from_scene`): no son `SECURITY DEFINER` (corren con los permisos de quien actualiza, bajo RLS), así que no escalan privilegios. `PUBLIC` conserva `EXECUTE` por defecto; son inofensivas y de tipo `trigger` (no invocables por RPC). Opcional: `revoke execute ... from public`.

### Revisado sin hallazgos

- **RLS** (`supabase/migrations/…001…sql:46-69`): `enable row level security` en las dos tablas; políticas select/insert/update/delete para `authenticated` en ambas, `with check` en insert y update; `to authenticated` y `(select auth.uid())` (eficiente); `revoke all … from anon`; sin tablas sin RLS; sin `SECURITY DEFINER`. `owner_id` no se puede reasignar (el `with check` del update lo impide). `template_id` (migración 002) tiene `check` de patrón y hereda las políticas por fila; `kind` tiene `check` de valores. Pruebas (`supabase/tests/rls.test.ts`, 12 casos): lectura cruzada, update/delete cruzado con 0 filas, insert a nombre ajeno, anon sin lectura, checks de nombre/kind/template_id, escena ajena, bloqueo optimista, cascada. Faltaría un caso: anon con `insert`/`update` (cubierto por el `revoke`, pero no probado) y que B no pueda mover una escena a otro `project_id`.
- **Open redirect**: `apps/web/src/lib/safe-next.ts` solo admite rutas con una barra, sin `\`, `//`, esquemas, controles ni decodificaciones que lo conviertan; todo `next` pasa por `safeNext` (`LoginScreen.tsx:63`). Con pruebas.
- **CORS de la API** (`build-app.ts`): lista exacta desde `CORS_ORIGINS`; vacía = ningún origen; nunca `*`; no usa cookies (token en `Authorization`), así que no hay credenciales de ambiente.
- **Secretos e historial**: no existe ningún `.env`, clave ni archivo sospechoso en todo el historial (`git log --all --name-only`: solo `.env.example`, `.env.cloud.example`, `lab/.env.example`). Barrido de `sb_secret_`, JWT `eyJ…`, `AIza…`, `sk-…`, `ghp_…` en todos los commits: solo aparecen el texto de las reglas de rechazo y una clave inventada en `tests/cloud-env.test.ts`. `.gitignore` cubre `.env`, `.env.*`, `lab/.env.local`, `supabase/.temp/`. `NEXT_PUBLIC_*` usados: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (pública por diseño), `API_URL`, `ASSETS_CDN_URL`, `LAB_PHOTO_URL`, `E2E` (gancho de pruebas; **no** ponerlo en Vercel, ya está en `docs/nube.md`). La carpeta `.superpowers/` está sin versionar y sin ignorar (sin claves dentro, pero conviene añadirla a `.gitignore`).
- **Logs**: `LOGGER_REDACT` oculta `req.headers.authorization` (`build-app.ts:41`); el error no controlado se registra con `req.log.error({ err })` sin cuerpo ni cabeceras.
- **Dependencias**: `pnpm audit --prod` → «No known vulnerabilities found» (0 críticas, 0 altas, 0 moderadas, 0 bajas). Los tres parches propios (`patches/@pascal-app__editor`, `@pascal-app__viewer`, `@react-three__drei`) son cambios de interfaz y de desmontaje de React (revisado el de drei: no añade red ni evaluación de código). `pnpm-workspace.yaml` solo permite scripts de instalación de `esbuild`: sin `postinstall` ajenos.
- **Cuerpo y entrada**: `bodyLimit` 5 MiB (`build-app.ts`), 413 con mensaje propio, JSON inválido → 422, id no uuid → 404, nombres/kind/templateId validados con zod en el contrato y de nuevo en la base. Las consultas usan el cliente de Supabase (parametrizado); no hay SQL armado a mano.

## Lista de comprobación para Silvert

### Panel de Supabase (proyecto `madori-dev` y, antes de desplegar, el de producción)

- [ ] **Authentication → Providers → Email → Confirm email**: activar en producción (con SMTP propio, ver `docs/nube.md` §3) o dejar documentado por qué no.
- [ ] **Password**: longitud mínima 8 o más (la local y la nube vienen en 6) y, si el plan lo permite, bloquear contraseñas filtradas («Leaked password protection»).
- [ ] **Attack Protection → CAPTCHA** (Turnstile o hCaptcha) activado para registro e ingreso; si se activa, la web tiene que enviar el token (hoy no lo envía: es trabajo de código).
- [ ] **Rate limits** (Authentication → Rate Limits): revisar inicios de sesión, registros y correos por hora; bajarlos si la demo no los necesita altos.
- [ ] **Sign-ups**: si en la demo solo entrará gente conocida, desactivar «Allow new users to sign up» después de crear las cuentas.
- [ ] **URL Configuration**: Site URL = URL de producción de la web; Redirect URLs solo esa URL con `/**`. Quitar `localhost` del proyecto de producción.
- [ ] **Anonymous sign-ins**: desactivados.
- [ ] **JWT**: tiempo de vida 3600 s o menos; Settings → API: confirmar que la clave `service_role` / `sb_secret_` no está en ningún lado (Vercel, repo, chat).
- [ ] **Table Editor / Database → Tables**: `projects` y `project_scenes` con **RLS enabled** y las 8 políticas; **Advisors → Security** sin avisos (ejecutar el «Security Advisor»).
- [ ] **Database → Network restrictions / SSL enforcement**: activar «Enforce SSL».
- [ ] **Settings → API → Exposed schemas**: solo `public`; sin `graphql_public` si no se usa.
- [ ] **Backups / Pausa de proyectos inactivos**: revisar el plan vigente.

### Panel de Vercel

- [ ] Variables de entorno **solo** las de `docs/nube.md` §5; ninguna `service_role`, `sb_secret_`, `NEXT_PUBLIC_E2E` ni claves de Gemini.
- [ ] **Deployment Protection** (vistas previas): activada; la CSP completa se prueba en una vista previa.
- [ ] **Firewall / Rate limiting** de Vercel sobre el proyecto API (`/v1/*`): regla de tasa por IP; es la única defensa contra abuso de las funciones.
- [ ] Tras el primer despliegue: abrir `https://<web>/login` con las herramientas del navegador, pestaña Consola y Red, y revisar avisos «Content Security Policy»; si no hay, cambiar `Content-Security-Policy-Report-Only` por `Content-Security-Policy` en `apps/web/security-headers.mjs`. Comprobar con `curl -I` las cabeceras de la web y de la API.
- [ ] Confirmar que `CORS_ORIGINS` de la API lleva solo la URL de producción de la web.
- [ ] Dominio propio (si lo hay): HTTPS forzado y HSTS (ya enviado por las cabeceras).

## Lo que NO se pudo verificar sin la nube

- Que RLS esté realmente activo y las 8 políticas aplicadas en `madori-dev` y producción (solo se leyeron las migraciones; las pruebas de RLS necesitan Docker y la base local, y no se corrieron aquí).
- Los ajustes reales de Auth (confirmación, longitud de contraseña, CAPTCHA, límites de tasa, Site URL): lo que dice `config.toml` es la base local, no la nube.
- Que la API en Vercel acepte, devuelva y mantenga las cabeceras nuevas, y el comportamiento del límite de 4,5 MB (`FUNCTION_PAYLOAD_TOO_LARGE`).
- Que la CSP completa no bloquee nada del editor (por eso va en modo informe): se calibró leyendo el código de Pascal, no probando en navegador.
- El CDN de Pascal (`editor.pascal.app`) y los hosts de jsdelivr/gstatic: no se hicieron peticiones de red.

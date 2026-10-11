# Decisiones de diseño

Las decisiones D1–D10 con sus alternativas están en el
[spec 1](superpowers/specs/2026-10-11-fundacion-y-persistencia-design.md#3-decisiones-insumo-directo-de-qué-decidí-yo-del-readme).
Aquí se anotan las que se toman después, con fecha.

## 2026-10-11 — Desviaciones al preparar el plan
- **Migraciones de escena:** `healSceneNodes` y `migrateVerticalSceneNodes` no se exportan desde `@pascal-app/core`; `useScene` las corre al cargar. El adaptador solo valida el envelope.
- **Autoguardado:** Pascal ya hace debounce de 1 s; nuestro `createSceneSaver` agrega 2 s, un solo guardado en vuelo y reintentos.
- **Catálogo autoalojado:** 100 de los 111 ítems existen con `model.glb` dentro del repo MIT de Pascal (commit `86f8e833904f7b6b3358bb1505feb82d801ad9ad`); se vendorean y se descartan 11 (nodo `cabinet` nativo e ítems con id generado de procedencia dudosa).

## 2026-10-11 — Rulings de la ejecución del plan (spec 1)
Decisiones que tomó quien ejecutó el plan donde el plan o el spec no alcanzaban. Cada una dice qué cuesta si estuvo mal.

- - Ruling: Supabase LOCAL primero (pedido del equipo): T2 y las pruebas de RLS/integración usan `supabase start` (Docker) por `npx --yes supabase@2.120.0`, con `.env.test` generado por `scripts/local-env.mjs` desde `supabase status -o env`; el despliegue en la nube (T6) queda diferido hasta que haya proyecto Supabase y Vercel — costo si se equivoca: ajustar variables al migrar.
- - Ruling: CI levanta Supabase local en el runner (Docker de ubuntu) en vez de usar secretos de un proyecto dev — evita exponer claves y no depende de la nube.
- - Ruling: una sola rama `feature/fundacion-persistencia` con los commits de cada tarea y UN PR al final (no un PR por tarea) — ejecución inline por una sola persona; la fusión a main queda para el equipo.
- - Ruling: sin git worktree; se trabaja en la carpeta del proyecto sobre rama de feature (ruta de Windows ya larga; un worktree anidado arriesga el límite de 260 caracteres con pnpm).
- - Ruling: repositorio `SilvertK164/interiores-3d`, público, con `main` publicado. Invitar a Victoria como colaboradora queda pendiente de su usuario de GitHub.
- - Ruling: se agrega `.gitattributes` (`* text=auto eol=lf`) para evitar finales de línea CRLF en Windows (Biome, scripts y yaml).
- - Ruling: `.claude/settings.json` deja `git push` permitido (el equipo pidió que haga push/pull) y mantiene denegados los push forzados.
- test de fronteras (D8) busca solo imports reales (`from '…'` / `import('…')`), no cualquier mención del texto `@pascal-app/` — catalog.test.ts nombra la ruta del paquete como cadena y daba un falso positivo; el regex original del plan era demasiado amplio — costo si se equivoca: un import raro (p. ej. `require`) no se detectaría.
- apps/web/tsconfig.json usa `types: ["node","react","react-dom"]` (el plan solo traía node) — sin eso layout.tsx no encuentra el espacio de nombres React/JSX hasta que otra página importe react — costo: ninguno.
- scripts/typecheck.mjs del plan tenía saltos de línea literales por un error de escape al insertarlo; se corrigió el script y el plan.
- la prueba E2E crea la cuenta de PRUEBA por la API admin de Supabase LOCAL (contraseña aleatoria nunca guardada) e inicia sesión por la interfaz con un proyecto `setup` de Playwright, en vez del login manual del plan — solo corre contra localhost (el setup rechaza URLs que no sean locales); en la nube el login seguirá siendo manual — costo si se equivoca: ninguno, no hay secretos guardados.
- `playwright.config.ts` levanta o reutiliza la API y la web (`webServer`) y lanza Chromium con `--enable-unsafe-webgpu --use-angle=swiftshader`; el editor corre con el renderizador de respaldo WebGL (aviso de Pascal "No WebGPU device"); es suficiente para leer el estado de la escena — costo: no valida WebGPU real (queda para la máquina del Demo Day).
- ProjectEditor usa callbacks estables (`useCallback`+`useRef`) para `onLoad`/`onSave` y `useMemo` para `sidebarTabs` — el E2E mostró que un `onLoad` nuevo en cada render hacía recargar la escena y borraba lo editado (RED: trace "walls 1 -> 0 at unloadScene" y prueba de conflicto fallando; GREEN: 4/4 E2E). Corrige también la Tarea 5 del plan.
- catálogo autoalojado y 11 ítems descartados — desviación declarada del plan, no incumple el spec — costo si se equivoca: reponer ítems desde el bucket.
- typescript.ignoreBuildErrors en next.config.mjs — mitigado por scripts/typecheck.mjs dentro de pnpm verify; si el build de Vercel debe validar tipos se decide en la Tarea 6 — costo: un error de tipos podría llegar a un deploy.
- "Seguir editando sin guardar" deja el guardador en pausa (conflicto) sin reintento posterior — coincide con el spec §8; decisión de producto — costo: hay que recargar para volver a guardar.
- un getUser por pedido (latencia, Supabase Auth como dependencia dura) — decisión D5 del spec — costo: latencia por pedido.
- reintentos cada 15 s sin fin ante errores de red genuinos — el spec pide "espera creciente y aviso persistente" — costo: tráfico en caídas largas.
- acceso directo del usuario a sus propias filas por PostgREST (sin pasar por If-Match) — por diseño bajo D5; solo sus datos — costo: puede saltarse el bloqueo optimista sobre lo suyo.

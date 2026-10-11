# Spec 1 — Fundación y persistencia

**Proyecto:** diseñador de interiores 2D + 3D para viviendas y comercios (TP final de IISAIA, FIUBA).
**Fecha:** 2026-10-11 · **Estado:** borrador para revisión del equipo · **Idioma:** español (decisión nuestra; el curso no lo exige).
**Antecedentes:** [`docs/analisis-clases.md`](../../analisis-clases.md) (reglas del curso, mapa clase → proyecto, stack) y el spike del 2026-10-11 (el editor de Pascal monta desde npm en una app Next 16 y `next build` pasa).

## 1. Objetivo

Que una persona pueda **registrarse, crear un proyecto, editar un espacio en el editor 2D/3D de Pascal y volver a abrirlo** desde cualquier navegador, con sus datos protegidos de las demás personas, desplegado en Vercel, y con la evidencia de proceso que el curso evalúa.

Este spec cubre los slices **1 (Fundación)** y **2 (Persistencia)** del diseño aprobado. Los slices de shell visual, presets, catálogo propio, subida de muebles, compartir y modos de recorrido tienen su propio spec (ver §11).

### Criterios de éxito (verificables)
1. `pnpm install && pnpm verify` termina en verde desde un clon limpio (`verify` = lint + typecheck + tests + build).
2. Registro e inicio de sesión funcionan en la URL desplegada en Vercel.
3. Crear un proyecto, dibujar un muro en el editor y recargar la página: **el muro sigue ahí**.
4. Una segunda cuenta **no puede leer ni modificar** ese proyecto (la API responde `404`, y el test de RLS lo demuestra).
5. Dos pestañas editando el mismo proyecto: la segunda en guardar recibe `409` y la interfaz lo explica sin perder el trabajo local.
6. `openapi.yaml` valida contra el estándar OpenAPI 3.1 y un test comprueba que cada ruta registrada en la API existe en el contrato (y al revés).
7. Hay evidencia en disco antes del código: este spec y el plan commiteados, `.claude/` con configuración real y un primer test visto en **rojo** antes de pasar a verde.

## 2. Qué NO hace este spec

Sin shell visual propio (se usa el layout v2 de Pascal tal cual), sin presets, sin catálogo propio ni subida de muebles (el catálogo sigue apuntando al bucket público de Pascal, una dependencia externa declarada en §9), sin compartir por link, sin modos Recorrer/Caminar/Estilos, sin login con Google (queda como mejora), sin colaboración en tiempo real, sin exportación IFC/GLB.

## 3. Decisiones (insumo directo de "Qué decidí yo" del README)

| # | Pregunta | Decisión | Alternativas descartadas | Razón / costo asumido |
|---|---|---|---|---|
| D1 | ¿Quién provee el editor? | Paquetes npm `@pascal-app/{core,viewer,nodes,editor}` **1.0.3**, versiones exactas, sobre `three 0.186`, R3F 9, drei 10 | Editor propio con R3F + Konva; solo `core`+`viewer` | En 2 días el editor propio no llega a muros con aberturas, materiales y catálogo. Costo: dependemos de una API joven que el curso no cubre. Plan B: híbrido (`core`+`viewer`). |
| D2 | ¿Dónde vive la lógica de servidor? | **API propia en Fastify** (`apps/api`) con `openapi.yaml` | Route Handlers de Next; FastAPI | Backend genuino y visible para el corrector automático y para la defensa; contrato compartido con zod. Costo: segundo deploy en Vercel. |
| D3 | ¿Cómo se guarda la escena? | Una fila `project_scenes` con `scene jsonb` envuelta en `{schemaVersion, pascal, graph}` | Normalizar nodos en tablas | El grafo se lee y escribe siempre completo (criterio de la clase 05 de la semana 03). Costo: no se consulta "todos los muros de la base" (no lo necesitamos). |
| D4 | ¿Cómo se evitan sobrescrituras? | Bloqueo optimista con `version` entera e `If-Match` → `409` | Última escritura gana; bloqueo pesimista | Dos pestañas o dos personas reales editando; barato y explicable. |
| D5 | ¿Quién escribe en la base? | La API usa el **JWT de la persona** (RLS vigente) para todo lo que sea de su propiedad; `service_role` queda reservado a slices posteriores (firmar subidas, compartir) | `service_role` en todo | Defensa en profundidad: aunque haya un bug en la API, RLS contiene el daño. |
| D6 | ¿Cómo se autentica la gente? | Supabase Auth con **email + contraseña** | Google OAuth, magic link | Sin configuración externa que bloquee el primer día. El curso no cubre auth: es decisión propia y se documenta así. La confirmación por email se **desactiva** en `dev` para poder correr tests; en `prod` se decide antes del Demo Day (desactivada = cuentas con emails no verificados, riesgo declarado). |
| D7 | ¿Cómo se evoluciona el esquema? | Migraciones SQL en `supabase/migrations/`, aplicadas por una sola persona (dueña de migraciones) | Cambios desde el panel; migraciones por MCP | El historial queda en git (evidencia) y el MCP de Supabase queda en solo lectura. |
| D8 | ¿Dónde se aísla el editor? | Solo `apps/web/src/editor/` importa `@pascal-app/*`, `three` y R3F; el editor no conoce Supabase ni la API: recibe y entrega un grafo por un adaptador | Importar Pascal desde cualquier componente | Gestión de contexto (clase 04) y reemplazabilidad (plan B). Se verifica con `git grep`. |
| D9 | ¿Qué límite de tamaño tiene una escena? | **5 MB** serializados; por encima, `413` | Sin límite | Protege la base y los tiempos; valor a recalibrar con una escena real grande. |
| D10 | ¿Dónde corre cada cosa? | Dos proyectos de Supabase: `dev` (desarrollo, tests, MCP) y `prod` (deploy). Si la cuenta no permite dos, un solo proyecto con datos de prueba prefijados `test+` y limpieza al terminar | Un solo proyecto sin separación | Los tests de RLS crean y borran usuarios; no deben tocar datos reales. |

## 4. Arquitectura

```
apps/web          Next 16 (App Router) + <Editor> de Pascal
                  src/editor/    ← único lugar que importa @pascal-app/*, three, R3F
                  src/lib/api/   cliente tipado generado desde openapi.yaml
apps/api          Fastify (TypeScript) — rutas bajo /v1, valida con zod, reenvía el JWT
packages/contract esquemas zod: SceneEnvelope, ProjectDTO, ErrorBody → generan openapi.yaml
supabase/         migrations/, seed.sql, tests/ (RLS)
docs/             superpowers/{specs,plans}, planes/, decisiones.md, bitacora.md, analisis-clases/
.claude/          settings.json, rules/, skills/, agents/, commands/
.mcp.json         playwright (versión fija) + supabase (solo lectura, proyecto dev)
```

Flujo de datos: *navegador → `apps/web` (sesión Supabase) → `apps/api` (valida contrato, usa el JWT) → Supabase Postgres (RLS)*. El navegador **no** habla con las tablas directamente: solo con Supabase Auth y con la API.

## 5. Modelo de datos (migración 001)

- `projects(id uuid pk, owner_id uuid → auth.users, name text not null (1–80), kind text null check in ('vivienda','comercio'), created_at, updated_at)`.
- `project_scenes(project_id uuid pk → projects on delete cascade, scene jsonb not null, schema_version int not null, version int not null default 1, updated_at)`. Separada de `projects` para que listar proyectos nunca traiga el jsonb.
- Índice en `projects(owner_id, updated_at desc)`.
- **RLS activado en ambas tablas.** Políticas: `select/insert/update/delete` solo si `owner_id = auth.uid()` (para `project_scenes`, a través de su proyecto). Sin política para `anon`.
- Trigger `updated_at` en ambas tablas.

Cada tabla nueva se crea con RLS y política en la **misma** migración (regla `datos-y-rls.md`).

## 6. Contrato de la API (`/v1`)

| Método | Ruta | Éxito | Errores |
|---|---|---|---|
| `GET` | `/projects` | `200` lista `[{id,name,kind,updatedAt}]` ordenada por `updatedAt desc` | `401` |
| `POST` | `/projects` | `201` `{id,name,kind,version:1}`; body `{name, kind?}`; crea también la escena vacía | `401`, `422` |
| `GET` | `/projects/{id}` | `200` `{id,name,kind,updatedAt,scene,version}` | `401`, `404` |
| `PATCH` | `/projects/{id}` | `200` proyecto; body `{name?, kind?}` | `401`, `404`, `422` |
| `DELETE` | `/projects/{id}` | `204` sin cuerpo | `401`, `404` |
| `PUT` | `/projects/{id}/scene` | `200` `{version}`; header `If-Match: <version>`; body `SceneEnvelope` | `401`, `404`, `409` versión vieja, `428` falta `If-Match`, `413` > 5 MB, `422` esquema |

Reglas heredadas de la clase (semana 03): el recurso va en el path y nunca se repite en el body; **`404` y no `403`** para proyectos ajenos (no revelar existencia); `204` sin cuerpo; sin verbos en las rutas; `PUT` de escena idempotente por versión. Todo error usa `{ "error": { "code": "...", "message": "..." } }` con mensajes en castellano. `GET /health` queda fuera de `/v1` para el chequeo de despliegue.

**Contrato primero:** la primera tarea del plan escribe `openapi.yaml` y lo commitea **antes** de implementar una sola ruta.

## 7. Contrato de la escena

`SceneEnvelope = { schemaVersion: 1, pascal: { core: "1.0.3" }, graph: <SceneGraph de Pascal> }`.

- Pascal entrega el grafo en `onSave` como `{ nodes, rootNodeIds, collections, materials, installedPlugins }` (verificado en el spike). La API **no interpreta** los nodos: valida la forma del envelope, el tamaño y `schemaVersion`.
- Al cargar, el adaptador pasa el grafo por la función de migraciones que exporta `@pascal-app/core` (`scene-migrations`) para que escenas viejas sigan abriendo si cambia la versión de Pascal.
- `schemaVersion` es **nuestro** número de contrato: si cambiamos la forma del envelope, subimos el número y escribimos la migración en la misma tarea.

## 8. Integración del editor (`apps/web/src/editor/`)

- Antes de montar `<Editor>` se carga `builtinPlugin` con `loadPlugin` una sola vez (el registro queda vacío si no).
- `onLoad` → `GET /projects/{id}`; `onSave` → `PUT /projects/{id}/scene` con `If-Match`. **Autoguardado con debounce de 2 s**, un solo guardado en vuelo.
- Ante `409`: se conserva el estado local, se muestra un aviso en castellano y se ofrece "Recargar la versión del servidor" o "Seguir editando sin guardar". Ante cualquier otro error: reintento con espera creciente y aviso persistente (mensajes traducidos en una única capa, `src/lib/api/errors.ts`).
- Se usa la protección contra borrado accidental de escena que expone el editor (`guardAgainstSceneWipe`).
- Los assets estáticos (texturas `.ktx2`, íconos, sonidos, HDRI, fuentes) se copian a `apps/web/public/` y `NEXT_PUBLIC_ASSETS_CDN_URL` apunta al propio dominio. La CSS de elevación de Pascal se vendorea en `apps/web/app/`.
- **Pestañas del panel lateral:** el editor solo trae lo que la app anfitriona le pasa en `sidebarTabs`. En este spec se monta `ItemsPanel` (export oficial); *Build* y *Paint* son código de la app de Pascal y se incorporan en el spec de shell.

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| La API de Pascal no está en el material del curso: alta probabilidad de que el agente invente nombres | Primera tarea: `docs/pascal-notes.md` con lo verificado en `node_modules`; regla `apis-de-terceros.md`; bitácora de alucinaciones; versiones exactas. |
| El catálogo de 111 muebles se pide al bucket público de Pascal | Dependencia declarada y temporal hasta el spec de catálogo; si cae, el editor sigue funcionando sin muebles. |
| WebGPU ausente o inestable en la máquina del Demo Day | Probar en la máquina de demo desde el slice 2; capturas y video de respaldo. |
| El corrector automático solo reconoce backend por el manifiesto | `apps/api` declara `fastify` por una razón real (servidor propio con contrato). Se documenta en el README. |
| Conflictos de migraciones entre dos personas | Una sola persona aplica migraciones; el resto las propone por PR. |
| Historia concentrada en 48 h | Commits chicos y reales desde la hora 0; el primer commit del repo contiene este spec. |
| Tests de RLS tocando datos reales | Proyecto `dev` separado o usuarios con prefijo `test+` y limpieza (D10). |

## 10. Estrategia de pruebas

- **Dominio puro** (`packages/contract`): `vitest`, TDD estricto — se ve el rojo antes del verde.
- **RLS:** pruebas de integración contra el proyecto `dev` con dos usuarios de prueba (A no ve ni toca lo de B; sin sesión no ve nada). No se mockea la base: un mock de RLS no demuestra nada.
- **API:** `vitest` con inyección de Fastify (`app.inject`) para forma de respuestas y códigos; un test de contrato compara rutas registradas contra `openapi.yaml`.
- **Editor 3D:** no se testea con píxeles. Verificación en navegador real (Playwright) leyendo el **estado** de la escena (cantidad de muros) tras guardar y recargar; el login real se hace a mano.
- Un único comando de verdad: `pnpm verify`. Si una prueba no puede correr (p. ej. falta el proyecto `dev`), **falla visible**, no se saltea en silencio.

## 11. Dependencias y trabajo posterior

**Lo que el equipo debe crear a mano** (no se puede automatizar): repo público nuevo en GitHub con la otra persona como colaboradora; proyecto Supabase `dev` (y `prod` si es posible); cuenta Vercel con permiso para dos proyectos (`web` y `api`). Variables en `.env*` (ignorado por git), nunca en el repo.

**Specs siguientes** (uno por slice, cada uno con su plan y PR): 2) shell visual y auth, 3) presets y catálogo autoalojado, 4) subida de muebles y compartir, 5) modos Recorrer/Caminar/Estilos. El slice 5 es lo primero que se recorta si el tiempo aprieta (congelar al 70 %).

## 12. Preguntas abiertas para el docente

1. ¿Está confirmada la modalidad de a dos y cómo se atribuye lo individual?
2. ¿Se acepta Fastify + Supabase como backend y es obligatorio entregar `openapi.yaml` en el final?
3. ¿Cómo se evalúa la apropiación cuando se apoya el editor en una librería de terceros con licencia MIT?
4. ¿Fecha y formato del Demo Day: despliegue o ejecución local?
5. ¿Dónde se espera `.claude/` y `docs/superpowers/`, y cómo se entrega el link si el repo es nuevo y no el paraguas?

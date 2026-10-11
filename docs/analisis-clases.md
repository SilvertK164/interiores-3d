# Análisis de las clases aplicado al TP final — síntesis

> Fecha: 2026-10-11. Fuente: repo del curso `FIUBA-Posgrado-Inteligencia-Artificial/IISAIA` (semanas 00 a 08, `programa.md`, `.claude/skills/grading/`).
> Los 5 informes completos (≈ 500 KB) están en [`docs/analisis-clases/`](analisis-clases/): A (sem. 00–01), B (02–03), C (04), D (05), E (06).
> Convención de etiquetas: **[curso]** está en el material · **[verificado]** lo comprobamos nosotros (código, npm, docs oficiales) · **[inferencia]** lo proponen los agentes de análisis y hay que validarlo.

## 0. Decisiones tomadas (2026-10-11)

- **Backend visible:** opción **B** — `apps/api` en Fastify (TypeScript) dentro del workspace pnpm, con `openapi.yaml` y contrato compartido en zod.
- **Alcance objetivo:** niveles **0 a 3** (evidencia y harness, núcleo, producto, diferencial). Congelar features al 70 % del tiempo; si algo se traba, el nivel 3 es lo primero que se recorta.
- **Enfoque del editor:** Pascal Editor como base (spike validado), con plan B híbrido (solo `core` + `viewer`).
- **Extras aprobados (2026-10-11):** plano en **PDF con escala gráfica y cajetín** y **render realista con IA** (captura del editor → API → galería por proyecto, con cuota por usuario). **Fuera de alcance:** exportar DXF y exportar IFC; quedan documentados como trabajo futuro con sus razones en [`investigacion-renders-exportaciones-diseno.md`](investigacion-renders-exportaciones-diseno.md). El proveedor de render se elige con una comparativa que incluye el material de Victoria.
- **Clave de la API de render:** modelo **BYOK** (cada persona conecta la suya, con guía en la interfaz, almacenamiento seguro y documentación). Diseño en [`seguridad-claves-byok.md`](seguridad-claves-byok.md). Solo se comparan proveedores con **nivel gratuito**.
- **Diseño de la interfaz:** en **Pencil** (`design/interiores.pen`, estilo propio, responsivo), como primera tarea del spec de shell visual.

## 1. Reglas del juego (qué exige el curso)

| Tema | Qué dice | Fuente |
|---|---|---|
| Modalidad | Grupos de **2 o 3**, `tp-final/` en el repo de un integrante, **defensa conjunta**. `programa.md` y la semana 00 todavía dicen "individual": manda la nota del 2026-09-23. Confirmar con el docente. | [curso] `semanas/04/source_material/14-trabajo-final.md` |
| Qué se evalúa | Que puedan **explicar, corregir y extender** el producto (*apropiación*). "Que funcione no alcanza". | [curso] `semanas/00/.../02-como-se-aprueba.md` |
| Informe | El `README.md` es el informe: *Qué decidí yo*, *Cómo gestioné el contexto*, *Qué salió mal*, cómo ejecutar. `programa.md` agrega: especificación inicial, prompts principales, fragmentos clave del código generado y observaciones arquitectónicas. | [curso] ejemplo `semanas/00/source_material/apellido-iisaia/tp-final/README.md`, `programa.md` |
| Evidencia | Spec y plan **en disco**, historial de commits, ramas y PRs. "El historial no se puede fabricar la noche anterior." Repo **público**. | [curso] semanas 00 y 05 |
| Flujo | brainstorming → spec → writing-plans → rama `feature/*` → subagent-driven (o Native) → TDD → code review → verification → finishing → PR. | [curso] `semanas/05/source_material/15-bajada-al-tp-final.md` |
| Demo Day | Última clase: MVP/app funcionando + defensa del proceso. Rúbrica formal **no publicada**. | [curso] `programa.md`, semana 08 |
| Cómo corrige el docente | Skill de grading de la cohorte anterior: completitud + evidencia, **no** calidad de código. Base 9; +1 por evidencia de superpowers. Es una *sugerencia* que el docente confirma. | [verificado] `.claude/skills/grading/rubric.md`, `scripts/grading_lib.py` |

### Riesgo concreto del corrector (verificado leyendo el código)
- **Backend:** solo se detecta si `package.json`/`pyproject.toml`/`requirements.txt` contiene `fastapi`, `flask`, `django`, `uvicorn`, `express` o `fastify`. `next` y `react` cuentan **solo como frontend**. Un Next + Supabase puro sugiere "final incompleto: −2" (un agente simuló 7,0 en vez de 9,0).
- **Superpowers:** busca `.claude/skills/` no vacío y `docs/superpowers/` **en la raíz del repo**, o un `.md` que mencione `brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven` o `superpowers`. No lee mensajes de commit.
- Exige un `CLAUDE.md` y que el final tenga frontend + backend. No exige `openapi.yaml` (la rúbrica actual no lo descuenta).

## 2. Qué rescatar de cada clase y dónde vive en nuestro repo

| Clase | Qué rescatamos | Dónde se materializa |
|---|---|---|
| **00–01** Modelo + TP de referencia | Patrón de README-informe; `prompts.md` sin editar; protocolo anti-alucinación para librerías que el modelo no conoce (Pascal, R3F, Supabase): versiones exactas, tipos instalados como fuente de verdad, bitácora de alucinaciones. | `README.md`, `prompts.md`, `docs/bitacora.md`, regla `apis-de-terceros.md` |
| **02** Frontend | UI = f(estado) con 3 estados (servidor / escena / shell); puente de tokens CSS → canvas 3D (el canvas no hereda CSS); contrato de componente; 4 patrones de prompt; ciclo Architect → Prompt → Review → Test con revisión cruzada. | `apps/web/src/shell/`, `theme3d.ts`, `prompts.md` |
| **03** Backend, datos, contratos | Endpoint = contrato de 5 piezas (method, path, entrada, salida, códigos). `openapi.yaml` dictado **antes** de implementar. Relacional vs documento: tablas para entidades con relaciones, `jsonb` para lo que siempre se lee junto (la escena). Errores en castellano con mapa error → HTTP; 404 y no 403 para ajenos bajo RLS; 409 por versión. | `openapi.yaml`, `supabase/migrations/`, `docs/decisiones.md` |
| **04** Harness | `CLAUDE.md` raíz + uno por zona; reglas con `paths:`; `settings.json` con deny/ask/allow; 2–3 skills propias; sub-agents de aislamiento (`explorador-pascal`); plan mode → `docs/planes/`; estrategia de contexto (`/checkpoint`, `/clear`, `/compact`); catálogo de modos de falla. **Decisión de arquitectura como gestión de contexto:** solo `apps/web/src/editor/` importa `@pascal-app/*`, `three` y R3F; el editor no conoce Supabase. | `.claude/`, `CLAUDE.md`, `docs/planes/` |
| **05** Flujo spec-driven | Protocolo con compuertas para dos personas; superpowers en scope *project*; GitHub Flow (ramas cortas, commits en español `tipo(área): …`, PR por slice, revisión cruzada, merge commit); TDD en dominio puro y RLS; verificación con salida pegada. | `docs/superpowers/specs|plans/`, PR template, CI |
| **06** MCP | Pregunta cero ("¿el host ya lo hace?"). Mínimo: **Playwright MCP** (versión fija) y **Supabase MCP en solo lectura** (migraciones como archivos en git). Spike de **Pascal MCP**. Descartados con razón: Vercel MCP, context7, GitHub MCP, filesystem/git/fetch, Blender. | `.mcp.json`, `settings.json`, README "MCP" |
| **07–08** | Carpetas casi vacías (placeholders: "Calidad/Seguridad/Testing" y "Demo Day"). Lo transversal se toma de `programa.md`: testing, seguridad y apropiación. | tests RLS, revisión de seguridad |

**Hueco importante:** el curso no tiene clase de autenticación ni de RLS. Supabase Auth y las políticas de acceso son decisión 100 % nuestra y hay que defenderlas como tal.

## 3. Stack propuesto

| Capa | Elección | Por qué / qué clase cubre |
|---|---|---|
| Gestor | **pnpm** workspace | Pedido del curso/equipo; comparte contratos entre front y API. |
| Front | **Next 16.4 + React 19.3 + TypeScript + Tailwind 4**, shell propio | [verificado] `<Editor>` monta desde npm y `next build` pasa. Semana 02. |
| Editor 2D/3D | **`@pascal-app/{core,viewer,nodes,editor}` 1.0.3** + `three 0.186` + R3F 9 + drei 10 | [verificado] materiales PBR (68), 111 muebles, vista 2D/3D, `onLoad`/`onSave`. Aporte nuestro = capa de persistencia, presets y shell. |
| Datos | **Supabase Postgres**: tablas relacionales + `scene jsonb`; **RLS**; migraciones en `supabase/migrations/` | Semana 03 (modelo de datos) + decisión propia (RLS). |
| Archivos | **Supabase Storage**: GLB, miniaturas, planos guía | Hueco del OSS de Pascal: no trae subida de ítems de usuario. |
| Backend | **Decisión abierta** (ver §4) | Semana 03 (contrato) + riesgo del corrector. |
| Deploy | **Vercel** con preview por PR | Evidencia de proceso. |
| Tests | `vitest` en dominio puro y RLS; Playwright MCP leyendo el *estado* de la escena | Semana 05 (TDD) y 06. |
| Harness | `.claude/` versionado + superpowers (scope project) | Semanas 04–05. |

**Dependencias externas de Pascal [verificado]:** los 111 muebles de `CATALOG_ITEMS` se piden al bucket de Supabase de Pascal y los assets por defecto a `editor.pascal.app`. Hay que **autoalojar** (se puede: `ItemsPanel` acepta `items` propios y `NEXT_PUBLIC_ASSETS_CDN_URL`). La licencia por asset (GLB, texturas) no está explicitada: el repo es MIT, pero conviene confirmarlo.

## 4. Backend visible: decisión pendiente

| Opción | Qué es | A favor | En contra |
|---|---|---|---|
| **A** Route Handlers de Next + `openapi.yaml` + Supabase/RLS | API en `apps/web/app/api/**` | Un solo deploy, el más barato. | **Invisible para el detector** (sugeriría −2); hay que explicarlo y preguntarlo al docente. |
| **B** `apps/api` en **Fastify (TypeScript)** dentro del workspace | API real que valida escenas, firma subidas, crea links públicos con `service_role` | Contrato código ↔ yaml con zod, backend genuino y detectable, Vercel lo soporta [verificado]. | Segundo deploy, CORS/rewrite, más piezas en 2 días. |
| **C** FastAPI | Espeja el curso | Solo vale si hay un caso real de Python (exportar IFC/DXF/PDF). | Dos lenguajes. |

Criterio de honestidad: no agregar una dependencia solo para que matchee el *substring*. Debe haber un caso real: validar el esquema/versión de la escena, tamaño y formato de GLB subidos, y generar tokens de compartir con secretos que no pueden vivir en el cliente.

## 5. Posibilidades y alcance (estimación para 2 personas / 2 días)

| Nivel | Contenido | Estado |
|---|---|---|
| **0 — Evidencia** | Repo público, `CLAUDE.md`, `.claude/` con settings/rules/1–2 skills, superpowers project scope, spec(s) y plan(es) commiteados antes del código, `openapi.yaml`, README esqueleto, bitácora. | **No negociable** |
| **1 — Núcleo** | App Next + Editor de Pascal, auth (Supabase), guardar/abrir proyectos con RLS, deploy en Vercel, endpoints de proyectos, tests RLS. | Imprescindible |
| **2 — Producto** | Presets de vivienda y comercio, catálogo autoalojado, shell propio (selector de proyecto, chips de ambientes, dock de modos), panel de materiales/pintura. | Muy probable |
| **3 — Diferencial** | Plano PDF con escala y cajetín, render realista con IA, link público para compartir, modos Recorrer/Caminar/Estilos (el editor exporta `FirstPersonControls` y temas de escena), subida de muebles GLB a Storage. Orden sugerido por valor/costo; el último se recorta primero. | Si el núcleo está verde |
| **4 — Extra** | MCP propio de presets, Pascal MCP para fabricar presets, comentarios. | Solo si sobra tiempo |

Ritmo de referencia [curso/inferencia]: una tarea con subagentes toma ≈ 8 min y ≈ 250 k tokens; un plan de 5–6 tareas, 1–1,5 h. Hay que **congelar features al 70 % del tiempo** y dejar el resto para README, capturas y ensayo de defensa.

Fuera de alcance, para declarar en el README: colaboración en tiempo real, exportación IFC/GLB, comentarios sobre la escena, apps móviles.

## 6. Protocolo de trabajo de a dos [inferencia de la semana 05, adaptada]

1. Setup a mano (~1,5 h): repo público + colaborador, `.gitignore`, superpowers `--scope project`, `CLAUDE.md`, `settings.json`, PR template, rama principal protegida.
2. Un ciclo por *slice vertical* y por dueño (no repartir tareas dentro de un mismo plan). Contratos primero (esquema de escena versionado, interfaz de persistencia, `openapi.yaml`).
3. Compuertas: spec aprobada → plan aprobado por la otra persona → implementación → review final → verificación con salida real → revisión cruzada humana ("qué entendí") → merge commit.
4. Una sola persona es dueña de las migraciones. Ramas cortas, `git merge origin/main`, commits en español uno por tarea.
5. Ensayo de defensa cruzada: cada integrante debe poder explicar la parte del otro.

## 7. Riesgos principales

1. **Detector de backend** (§1 y §4).
2. **Pascal no está en el material del curso**: máxima fuente de alucinación. Antes de escribir reglas sobre su API, explorar y escribir `docs/pascal-notes.md`.
3. **WebGPU** del equipo donde se demuestre (el navegador del panel lo tenía; no está garantizado en otra máquina).
4. **Assets de Pascal** alojados por terceros y con licencia por asset sin explicitar.
5. **Historia concentrada en 48 h**: se compensa con commits reales e incrementales, no con maquillaje.
6. **Conectores de la sesión** (correo, Drive, tareas) combinados con Playwright o la base forman un camino de exfiltración: apagarlos mientras se trabaja en el TP.
7. **Pascal MCP en Windows** sin probar (la documentación habla de macOS): spike corto o descartar con razón.

## 8. Preguntas para el docente (las más importantes)

1. ¿Está confirmada la modalidad de a dos? ¿En qué repo va `tp-final/` y cómo se atribuye lo individual?
2. ¿Next + Supabase cuenta como "backend" para la rúbrica? ¿Se espera `openapi.yaml` en el final?
3. ¿Se acepta apoyarse en un editor de terceros (Pascal, MIT) y cómo se evalúa la apropiación en ese caso?
4. ¿MVP (programa) o app final? ¿Fecha y formato del Demo Day (¿deploy o local?, ¿cambios en vivo?)?
5. ¿Existe rúbrica formal y hitos intermedios?
6. ¿`.claude/` y `docs/superpowers/` van en la raíz del repo o dentro de `tp-final/`?
7. ¿Se esperan `.mcp.json` y hooks?
8. ¿Son aceptables spec y plan en inglés tal como los genera superpowers?

## 9. Próximo paso

Cerrar dos decisiones (backend visible y nivel de alcance), escribir el **spec de fundación** en `docs/superpowers/specs/`, pedir la revisión del equipo y recién entonces el plan. Nada de scaffolding antes de aprobar el spec.

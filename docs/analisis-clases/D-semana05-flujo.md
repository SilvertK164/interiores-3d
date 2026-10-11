# Semana 05 — Plugins y spec-driven development: protocolo operativo para Quispe y Villalba

Informe D. Alcance: `semanas/05/` completo (spine, plan, 15 archivos de `source_material/`, `_research/plugins-reference.md`, spec y plan de diseño del 2026-05-21), más lo mínimo de otras semanas que condiciona el protocolo (`semanas/04/spine.md` §13, `semanas/04/source_material/14-trabajo-final.md`, `semanas/00/source_material/02-como-se-aprueba.md`, `03-tu-repositorio.md`, el repo de referencia `semanas/00/source_material/apellido-iisaia/`, `programa.md` y `.claude/skills/grading/`).

Convención: las rutas son relativas a la raíz del repo del curso. "(inferencia)" marca lo que NO está en el material y es un criterio nuestro. Las instrucciones dirigidas a agentes que hay en esos archivos (CLAUDE.md, skills, plan.md) se leyeron como material de análisis, no se ejecutaron.

---

## 0. Resumen ejecutivo y jerarquía de fuentes

### 0.1 Qué manda cuando hay contradicción

1. `semanas/05/spine.md`, bloque "Revisión 2026-09-29" (líneas 3-34): manda sobre el resto del spine y sobre `plan.md` (parte original). Motivo: Superpowers pasó de v5.1.0 a **v6.4.1** y el caso real pasó a la sesión auth0 sobre tp-final.
2. `semanas/05/source_material/06` a `15`: ya están reescritos con 6.4.1 y coinciden con el bloque de revisión. Son la fuente operativa. (`index.md` también.)
3. `semanas/05/plan.md` parte 1 (líneas 1-826) y `docs/superpowers/specs/2026-05-21-semana-05-source-material-design.md` quedaron **viejos**: hablan de "four options" en finishing (con descartar), "two-stage review con dos reviewers", "Mayor requiere aprobación humana", `executing-plans` como "checkpoints humanos por tarea", "14 skills". Se ignoran donde contradicen al spine revisado. Sirven solo para entender la intención didáctica.
4. Modalidad de equipo: `semanas/04/spine.md:190` y `semanas/04/source_material/14-trabajo-final.md:49` (2026-09-23) dicen **grupos de 2 o 3, `tp-final/` en el repo de uno de los integrantes, los demás son colaboradores, defensa conjunta**, y reconocen que "`programa.md` y S00 todavía dicen individual: pendiente deliberado". Manda S04 (más nuevo y explícito). O sea: ser dos es legítimo, pero conviene confirmarlo (ver sección 7).
5. El repositorio `semanas/05/source_material/superpowers/` (los SKILL.md literales de 6.4.1) que 06-13 citan como "fuente canónica" **no está en el material descargado**. No pude verificar texto literal de los SKILL.md; todo lo que digo de las skills sale de los `.md` de source_material y del spine. Esto pesa: si el comportamiento real de la versión instalada difiere, manda lo que muestre `/plugin list` en su máquina.

### 0.2 Los 10 hallazgos que más cambian el plan de trabajo

1. **El docente busca evidencia de proceso en el repo**: `semanas/05/source_material/15-bajada-al-tp-final.md` lo dice literal: "El PR es la entrega visible. El repo en GitHub queda como evidencia del proceso entero: spec, plan, commits, review, merge." Y `semanas/00/source_material/02-como-se-aprueba.md`: "el historial no se puede fabricar la noche anterior".
2. **Riesgo propio de un sprint de 2 días**: todo el historial va a quedar concentrado en 48 h. Se compensa con historial *incremental y honesto* (spec -> plan -> test -> código, commits chicos, PRs reales), no con maquillaje. Ver 7 (pregunta al docente) y 2.10.
3. **El grader automático** (`.claude/skills/grading/scripts/grading_lib.py`, `_superpowers_signals`) cuenta tres señales: `.claude/skills/` no vacío, directorio `docs/superpowers/`, y cualquier `.md` que contenga `brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven` o `superpowers` (una mención alcanza, y no recorre `.git`, `node_modules`, `.venv`, `venv`, `__pycache__`, `dist`, `build`, `.next`, `.cache`). **No lee mensajes de commit**, aunque `rubric.md` diga "menciones ... en prompts o commits": eso lo mira el docente a mano. La skill grading solo *propone* nota; el docente confirma.
4. **Riesgo de detección de backend** (hallazgo propio, importante): `detect_repo` considera "backend" solo si un `package.json`/`requirements.txt`/`pyproject.toml` contiene `fastapi`, `flask`, `django`, `uvicorn`, `express` o `fastify`. Un proyecto Next.js + Supabase **no matchea** ninguno. Consecuencia automática: "-2 final incompleto (falta frontend o backend)" y se pierde el +1 de superpowers (que exige backend encontrado). Frontend sí matchea (`react`/`next` en `package.json`, o archivos `.tsx`). Es una heurística y el docente confirma, pero hay que decirlo explícito en el README y preguntárselo (sección 7). No recomiendo agregar dependencias de relleno para engañar al detector.
5. **Instalar Superpowers en scope `user` (el default) no deja ninguna huella en el repo.** Para que quede evidencia y el colaborador lo tenga: `--scope project` (escribe `enabledPlugins` en `.claude/settings.json`, `_research/plugins-reference.md:788`). La evidencia real que sí detecta el grader es `docs/superpowers/` y las menciones en `.md`.
6. **Hard gate de brainstorming**: "Nunca implementar nada — ni un esqueleto del proyecto, ni un archivo vacío — antes de que vos hayas aprobado el diseño" (`06-brainstorming.md`, "El punto crítico"). Implica: el `create-next-app` va como Tarea 1 del primer plan, no antes del spec. Lo que sí se puede hacer antes, a mano, es la config del repo y del harness (no es código de producto), más *spikes* descartables.
7. **Brainstorming clasifica**: spike / bounded / architectural (`06-...`, "Tres caminos según el tamaño"). La integración con Pascal Editor es una pregunta de factibilidad: perfecta para un *spike* inicial. Los features chicos van como *bounded* (diseño corto en el chat, sin archivo). Solo lo *architectural* deja spec en disco. Por eso conviene que haya varios specs *architectural* chicos, no uno gigante.
8. **Aprobar la idea no es aprobar el plan**: `07-writing-plans.md` ("Estructura del plan y handoff"): hay una segunda compuerta, vos revisás el plan guardado antes de que corra nada. Y la skill ofrece dos modos (Subagent-driven / Native) y recomienda uno.
9. **Los "rulings" del coordinador** (decisiones que toma solo ante ambigüedades y te muestra al final, `09-subagent-driven-development.md`) son un riesgo directo para la "apropiación": son decisiones de diseño que el agente tomó por vos. Hay que leerlas, aceptarlas o revertirlas y copiarlas a la bitácora ("Qué decidí yo").
10. **Para dos personas, el curso solo enseña la versión solitaria de GitHub Flow** (`08-github-flow.md`: checkout main, pull, branch, push, PR; "sin stash/rebase/cherry-pick"; sin worktrees). Todo lo de revisión cruzada, protección de `main`, CODEOWNERS, reparto y merge es extensión nuestra (inferencia), coherente con el material pero no dictada por él.

---

## 1. Análisis por clase (semana 05)

Leyenda de traslado al stack: **[=]** se traslada tal cual, **[~]** se adapta, **[x]** no aplica. El material de referencia usa FastAPI + SQLite + HTML/JS vanilla + pytest + uv; nosotros Next/React + Vercel + Supabase + pnpm + Pascal Editor.

### 1.1 `01-de-piezas-a-paquetes.md` + `02-plugins-que-son.md` + `03-plugins-distribucion.md` (Parte 1: plugins)

**1. Qué enseña**
- Pregunta inversa: las siete piezas del runtime de S04 (CLAUDE.md, rules, settings.json, permisos, skills, sub-agents, slash commands) no siempre las escribís vos; hay quien ya las empaquetó (`01`).
- Tres dolores sin formato común: **descubrimiento**, **bajada**, **mantenimiento** (sin versión: "una foto inmóvil") (`01`).
- Definición literal de la doc: plugin = "directorio autocontenido de componentes"; adentro puede haber skills, agents, hooks, monitors, themes y commands; no está obligado a traer todos (`02`).
- Anatomía: `.claude-plugin/plugin.json` (opcional, solo `name` obligatorio), `skills/`, `agents/`, `hooks/hooks.json`, `commands/`; binarios en `bin/` (`02`). Detalles extra en `_research/plugins-reference.md:697-761`: `.mcp.json`, `.lsp.json`, `settings.json` del plugin (solo claves `agent` y `subagentStatusLine`), `output-styles/`.
- Versionado: `version` en `plugin.json` fija la versión (hay que *subirla* para que lleguen updates); si se omite, cae al SHA del commit y cada commit es versión nueva (`02`; `_research:1094-1116`).
- Marketplaces: registro consultable (como npm o la store de VS Code). Oficial `claude-plugins-official` pre-registrado; comunitarios con `/plugin marketplace add <usuario>/<repo>` (`03`).
- Ciclo de vida: `/plugin install <plugin>@<marketplace>`, `update`, `uninstall` (`--keep-data`), `list`. Scopes: `user` (default, `~/.claude/settings.json`), `project` (`.claude/settings.json`, versionado, compartido), `local` (`.claude/settings.local.json`, gitignored). La doc define cuatro (con `managed`), el curso usa tres (`03`; `_research:354-363`).
- Cache real en disco: `~/.claude/plugins/cache/<marketplace>/<plugin>/` (`03`); el cache se copia, los plugins no pueden referenciar fuera de su carpeta (`_research:658-691`).
- Otros harnesses (nota agregada 2026-09-29): el estándar compartido es `SKILL.md`; Codex tiene el mismo modelo carpeta+manifest; OpenCode usa módulos JS/TS declarados en `opencode.json` (`02`, `03`, `spine.md:11-14`).

**2. Qué hacer en nuestro TP**
- [=] Decidir y documentar: *usamos un plugin de terceros (Superpowers) en vez de escribir nuestro propio flujo*. Una línea en el README, sección "Flujo de trabajo".
- [=] Instalar Superpowers con `--scope project` y commitear `.claude/settings.json` (ver 2.2). Gitignorear `.claude/settings.local.json` (el repo de referencia lo hace: `apellido-iisaia/tp-final/.gitignore`).
- [=] Mostrar en README (o en una captura en `docs/evidencia/`) la salida de `/plugin list` y, opcional, `claude plugin details superpowers` (lista componentes y costo proyectado de tokens "always-on": sirve como dato concreto para "gestión de contexto"; está en `_research:929-978`, no en las clases).
- [x] Crear/publicar un plugin propio o un marketplace: el spec de diseño lo deja explícitamente fuera de alcance ("Crear plugins propios — fuera de alcance", `docs/superpowers/specs/2026-05-21-...design.md`, sección Out of scope). Ver decisión en 2.8: **`.claude/` versionado alcanza y es lo que pide el checklist de S04**.
- [~] Nuestras skills propias van en `.claude/skills/<nombre>/SKILL.md`: es el mismo formato que usaría un plugin, así que quedan portables.

**3. Evidencia a producir**: sección README "Flujo de trabajo" con (a) versión de Superpowers instalada (output de `/plugin list`), (b) `.claude/settings.json` commiteado con `enabledPlugins`, (c) decisión "no empaquetamos nuestro harness como plugin, por qué" (defendible: harness específico de este proyecto, S05 lo pone fuera de alcance). El curso valora la *decisión explicada*, no el plugin.

**4. Trampas**
- "Clono el repo y copio carpetas": pierde versión y trazabilidad (`01`). Evitar: instalar por comando y anotar versión.
- Componentes dentro de `.claude-plugin/` (solo va `plugin.json`) (`_research:1067-1082`). Solo aplica si algún día empaquetan.
- Un `CLAUDE.md` en la raíz de un plugin **no se carga** como contexto del proyecto (`_research:744`); las instrucciones se entregan por skills. No cometer el error de pensar que Superpowers "trae" instrucciones al CLAUDE.md nuestro.
- Si ponen `version` fija y no la suben, no llegan updates (`_research:1112-1114`). No relevante salvo que actualicen Superpowers a mitad de proyecto: **no actualizar durante los 2 días** (inferencia; el comportamiento descripto en estas clases es el de 6.4.1).

**5. Ambigüedades**: `commands/` vs `skills/` (la doc de referencia dice usar `skills/` para plugins nuevos, `_research:752`; el curso enseña ambos). La nota de OpenCode 2.0 ("sin doc, no se enseña") queda deliberadamente sin cubrir.

### 1.2 `04-superpowers-que-es.md`

**1. Qué enseña**
- Superpowers = "metodología completa de desarrollo de software para tu coding agent, construida sobre skills componibles" (las dos mitades: formato plugin de §02 + metodología nueva).
- Problema: el agente tipea antes de saber qué construís; el desfasaje se descubre tarde (veinte mensajes, archivos, commits). "Detectarlo en palabras es barato. En código ya escrito es caro."
- Happy-path (mapa de toda la parte 3): brainstorming -> writing-plans -> (GitHub Flow: branch + PR) -> subagent-driven-development -> test-driven-development -> requesting-code-review -> verification-before-completion -> finishing-a-development-branch.
- Las skills se invocan solas cuando aplican; "vos describís lo que querés construir".
- Cuatro principios: TDD, systematic over ad-hoc, complexity reduction, evidence over claims.
- Lo que NO hace: no decide qué construir, no reemplaza tu criterio arquitectónico, no funciona en piloto automático (si abandonás la sesión se frena).

**2. Qué hacer**: [=] aceptar la regla de oro: el flujo es obligatorio también para lo "simple" (regla del 1%, `06`). [~] Pegar el mapa del happy-path en el CLAUDE.md del proyecto como "flujo de trabajo obligatorio" (snippet en 3.5). Asignar tiempo humano: el flujo se traba si nadie contesta.

**3. Evidencia**: el README tiene que mostrar *qué skills usaron realmente* y en qué orden, con links a spec/plan/PR (no solo listar el mapa).

**4. Trampas**: creer que "automatiza todo" (la clase insiste en lo contrario); usarlo en piloto automático con dos personas distraídas.

**5. Ambigüedades**: ninguna relevante. (Observación: `using-superpowers` es la 15ª skill y no la nombra ni §14; la cuenta 7 happy-path + 6 de §14 + `executing-plans` + `using-superpowers` = 15 cierra con la nota "El plugin trae 15 skills", `spine.md:23`. Inferencia.)

### 1.3 `05-instalar-superpowers.md`

**1. Qué enseña**
- Comando único: `/plugin install superpowers@claude-plugins-official` (oficial pre-registrado; no hace falta `marketplace add`; sin reiniciar).
- Verificar con `/plugin list` (versión esperada **6.4.1**, `spine.md:24`; formato esperado `superpowers v6.4.1 claude-plugins-official enabled`, `plan.md:895`).
- Plan B: marketplace comunitario `obra/superpowers-marketplace` (`/plugin marketplace add obra/superpowers-marketplace` + `/plugin install superpowers@superpowers-marketplace`); si las skills no aparecen, `/reload-plugins`.
- **Windows**: desde 6.2 el hook de inicio corre con Git Bash; si no está, Claude Code avisa y pide instalarlo; sin eso "las skills existen pero el flujo no arranca solo".
- En otros harnesses: Codex (`/plugins`, buscar "superpowers"), OpenCode (`"plugin": ["superpowers@git+https://github.com/obra/superpowers.git"]`, `#v6.4.1` para fijar versión).
- Cache con versión: `~/.claude/plugins/cache/claude-plugins-official/superpowers/<versión>/skills/<nombre>/SKILL.md` (`14`).

**2. Qué hacer**
- Cada uno en su máquina: instalar y verificar. Persona que crea el repo: `/plugin install superpowers@claude-plugins-official --scope project` **dentro del repo**, y commitear `.claude/settings.json`. La otra persona, al clonar y abrir Claude Code en el repo, verifica con `/plugin list` (y si no está, instala igual con `--scope project`; (inferencia) puede que Claude Code pida confirmar el plugin habilitado por el proyecto).
- Si están en Windows: instalar Git for Windows (Git Bash) *antes*, y probar que arranca la skill con un pedido trivial.
- Anotar la versión realmente instalada. Si el marketplace ofrece una más nueva que 6.4.1, el comportamiento de menús/skills puede diferir de lo que dicen estas clases (inferencia): mantener la que se instaló y no actualizar en el sprint.

**3. Evidencia**: captura/pegado del `/plugin list` en `docs/evidencia/` o README; `.claude/settings.json` con `enabledPlugins` en git; primera sesión de brainstorming ya cuenta como prueba de que cargó.

**4. Trampas**: skills que no cargan -> `/reload-plugins`; Git Bash faltante en Windows; instalar en `user` y que el colaborador no lo tenga.

**5. Ambigüedades**: el plan original dice "14 skills" (`plan.md:329`), el source dice "quince" (`05`), manda "quince". `05` dice que el menú de instalación "no requiere reiniciar", pero para skills nuevas en sesión ya abierta puede hacer falta `/reload-plugins` (el propio `05` lo documenta como Plan B).

### 1.4 `06-brainstorming.md`

**1. Qué enseña**
- Convierte una idea cruda en un diseño aprobado por diálogo: primero **para qué y para quién**, te devuelve lo que entendió para que lo corrijas, **clasifica en voz alta** (spike / bounded / architectural), explora restricciones y criterios de éxito, propone 2-3 approaches con trade-offs y recién después arma el diseño (`06`, "Qué hace"; spine rev).
- Regla del 1% del frontmatter: cualquier pedido que pueda implicar construir/cambiar algo la activa (incluye "triviales"). No se activa para leer, explicar, debug ni correcciones mecánicas.
- Tres caminos (desde v6.3): *spike* = prueba descartable; *bounded* = diseño corto en el chat sin archivo; *architectural* = spec escrito en disco. "Lo que escala es la ceremonia, no la aprobación."
- **Punto crítico**: una pregunta por vez, multiple choice cuando se puede, **nunca implementar nada antes de la aprobación** (vale en los tres caminos).
- Artefacto: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`, commiteado; las skills siguientes lo leen de ahí, no de la conversación. Cambiar el rumbo = editar ese archivo y volver a correr el flujo.
- **Spec Self-Review** interno antes de pedirte revisión: placeholders (TBD/TODO), contradicciones, scope (¿un spec o cinco?), ambigüedades; lo arregla solo. "Vos nunca deberías leer un TBD en tu propio spec."
- Caso real auth0: *Classification: architectural* dicho en voz alta; primera pregunta por el propósito; 3 preguntas de alcance; 2 approaches (A: login en servidor con cookie, B: SDK en browser + JWT) con recomendación; diseño en 3 secciones aprobadas una por una; el usuario sumó pytest a mitad de camino; spec commiteado y la skill marcó "lo que difiere de lo charlado" (`spine.md:28`).
- Anti-patrones: "esto es muy simple", varias preguntas juntas, invocar implementación (incluida writing-plans) antes de aprobar.

**2. Qué hacer en nuestro TP**
- **Antes de abrir la sesión**: las decisiones no delegables son nuestras (`15`: qué construir, si la arquitectura es correcta, si sirve a un usuario real). Escribir cada uno 10 líneas ("para quién, para qué, qué NO entra, restricciones: Next, Vercel, Supabase, Pascal, 2 días") y juntarlas. Esas respuestas son las primeras que dará quien conduzca la sesión.
- **Spike primero** (inferencia, aprovechando la clasificación): "¿se puede embeber `@pascal-app/*` en Next (App Router, client component, probablemente `dynamic(..., { ssr: false })`) y guardar/cargar su escena?" Rama `spike/pascal-embed`, código descartable, conclusión en `docs/spikes/pascal-embed.md` (qué hace Pascal, qué escribimos nosotros, riesgos). No se mergea el código; se mergea el documento. TDD admite "prototipos descartables" como excepción con confirmación explícita (`10`).
- **Spec fundacional (architectural)** con *los dos presentes*: conduce una persona (driver), la otra valida en voz alta y lee el archivo. Pedirle a la skill que **descomponga** si el alcance es "cinco proyectos" (fundación, editor, persistencia/proyectos, presets, polish): sale 1 spec de fundación + una lista de slices, cada slice tendrá su spec/plan propio.
- Idioma: pedir specs y planes **en español** (el repo de referencia los dejó en inglés "tal como los generó el agente", `apellido-iisaia/tp-final/README.md`, sección "Cómo gestioné el contexto"; es aceptable, pero para defender conviene poder leerlos sin esfuerzo). Dejarlo escrito en CLAUDE.md.
- Features chicos (cambiar un botón, un campo): camino *bounded*, diseño corto en el chat; **no** crean archivo, así que no cuentan como evidencia: agrupar lo evidenciable en 3-5 specs reales.
- Traslado: [=] regla de una pregunta, aprobación previa, spec en disco, self-review; [~] el contenido del spec (UI 2D/3D, Supabase, RLS) no figura en el ejemplo FastAPI; [x] nada.

**3. Evidencia**
- `docs/superpowers/specs/YYYY-MM-DD-<tema>-design.md` por cada slice architectural, **commiteado antes** del primer commit de código de esa branch.
- `docs/prompts.md` (inferencia, inspirado en `tp1/prompts.md` y `tp2/prompts.md` "sin editar, defectos incluidos"): el pedido inicial textual de cada sesión de brainstorming y las respuestas clave. `programa.md` pide en el README "prompts principales".
- En el README, "Qué decidí yo": cada approach descartado con su motivo (como `tp-final/README.md` de referencia: "Consideré otros dos caminos...").

**4. Trampas**
- Scaffold antes del spec: viola el hard gate. Usar la Tarea 1 del plan para `create-next-app`.
- Dos personas contestando distinto en la misma sesión: una sola voz por sesión, la otra comenta en el PR del spec.
- Aceptar el approach "recomendado" sin discutir: la clase lo marca como la decisión que *no* se delega.
- Spec gigante que mezcla todo (el propio self-review lo caza como scope).

**5. Ambigüedades**: el plan original habla de "Spec Self-Review" como escaneo + arreglo sin pedir input; el caso real muestra que además "marca lo que difiere de lo charlado" (rev. 6.4.1), no está en el source de `06` salvo en el caso real. La skill puede cambiar su mensaje por versión; usar lo que muestre la sesión.

### 1.5 `07-writing-plans.md` (+ spec-driven development)

**1. Qué enseña**
- **Marco spec-driven**: el spec separa QUÉ/POR QUÉ (humano) del CÓMO (agente). Regla de dirección: si cambia el spec cambia el plan; si cambia el plan cambia el código; **nunca al revés**. "El código no le dicta nada al spec." Si una entrada está mal, se sube al paso anterior, no se compensa hacia adelante.
- Cadena: brainstorming (spec) -> writing-plans (plan) -> subagent-driven/Native (código); cada skill ve el artefacto previo como contrato cerrado.
- writing-plans: plan markdown con tareas chicas, paths exactos, **código completo en cada step**, comandos de verificación y commits cada pocos pasos; asume que el ejecutor no conoce el codebase.
- Tamaño (rev.): **steps** de 2-5 min; la **tarea** tiene el tamaño de su propio ciclo de test (spine rev; `07`).
- Estructura 6.4.1: encabezado `Spec:` (puntero), **Global Constraints** (reglas que atan a todas las tareas, copiadas del spec), **Review Focus** (hasta 5 casos borde que el spec implica y ninguna tarea testea, cada uno clavado a un test), por tarea **Interfaces** (qué consume de las anteriores y qué produce).
- Plan Self-Review (4 chequeos): spec coverage, placeholder scan, type consistency (`clearLayers()` no puede volverse `clearFullLayers()`), Review Focus. Se arregla inline, sin segunda vuelta.
- **Vos revisás el plan guardado**: "aprobar la idea no es aprobar el plan". La skill ofrece dos modos de ejecución (Subagent-driven: más completo y caro; Native: más barato) y **recomienda uno con una razón** (caso auth0: recomendó Native, "3 tareas dependientes y el plan trae el código"; el usuario eligió Subagent-driven).
- Anti-patrones: TBD/TODO/"implement later" = falla del plan; "add appropriate error handling" sin código; "similar to Task N" sin repetir el código.
- Meta-revelación: la clase misma se hizo con esta cadena (`docs/superpowers/specs/2026-05-21-...` y `plans/2026-05-21-...`).

**2. Qué hacer**
- Un plan **por slice**, no uno gigante: la tarea de un plan depende de la anterior, así que un solo plan serializa a dos personas. Dos personas = dos planes en paralelo (ver 2.5).
- Revisar el plan *antes* de ejecutar: la persona que **no** condujo la sesión lo lee entero (10-15 min) y lo aprueba (comentario en el PR draft). Chequeo humano de: ¿cada requisito del spec tiene tarea?, ¿cada tarea tiene comando de verificación y salida esperada?, ¿hay Review Focus real (RLS, sesión vencida, WebGL perdido)?
- Pedir en cada tarea **criterio de aceptación** explícito (`15` dice "con criterios de aceptación por tarea", pero `07` no los lista como campo: lo agregamos nosotros, inferencia).
- Elegir modo por plan: Native para ≤3-4 tareas dependientes (fundación, un módulo chico); Subagent-driven para planes de 5+ tareas o con partes independientes. Usar la recomendación de la skill y anotar la razón en la bitácora.
- Traslado: pytest -> vitest/Playwright, `uv run` -> `pnpm`; `conftest.py` con DB temporal -> variable de entorno de Supabase de test.

**3. Evidencia**: `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` commiteado junto al spec (mismo PR); plan con checkboxes tildados por la ejecución (el plan de referencia `apellido-iisaia/tp-final/docs/superpowers/plans/2026-09-29-tp-final-auth0.md` es el modelo: Goal/Architecture/Tech Stack/Spec/Global Constraints/Review Focus/Tasks con Files, Interfaces, Steps con RED esperado y commit). No editar el plan "para sincronizarlo" después: el repo de referencia lo deja **congelado** y explica las diferencias en el README ("El plan y lo construido no coinciden del todo..."), práctica valorada (`CLAUDE.md` de referencia: "docs/superpowers/... quedan como los generó superpowers").

**4. Trampas**: plan con "TBD"; plan con tareas gigantes ("implementar el editor"); un solo plan de 20 tareas (el coordinador acumula contexto: en el caso real creció 132,6k -> 175,7k tokens en 3 tareas + review final, `09`; extrapolar a 10+ tareas es inferencia); olvidar la compuerta del plan (aprobar el spec y dejar correr).

**5. Ambigüedades**: "tareas de 2-5 min" (plan viejo) vs "steps de 2-5 min, tarea = su ciclo de test" (rev.): manda la rev. `15` habla de "criterios de aceptación por tarea" que `07` no define como sección: ver 2.4 y plantilla 3.2.

### 1.6 `08-github-flow.md`

**1. Qué enseña**
- Refresher: **commit** = foto (QUÉ, QUIÉN, CUÁNDO, POR QUÉ); commits chicos, "uno por idea cerrada"; "si no se puede describir en una sola oración corta, son dos commits". **Branch** = línea paralela (`feature/<descripcion>`). **PR** = propuesta de merge, "no es un comando, es un evento en GitHub", contrato visible.
- Flujo: antes de la sesión `git checkout main` -> `git pull` -> `git checkout -b feature/<descripcion>`; durante el trabajo Superpowers **commitea por tarea** (en SDD y en Native; revisás los commits entre tareas); al terminar `git push -u origin feature/<descripcion>` (`-u` conecta la rama; sin él el `git push` pelado siguiente falla); en la UI de GitHub abrís el PR con título y descripción claros.
- Por qué encaja: aislamiento por sesión, PR = contrato revisable, `main` estable, sin stash/rebase/cherry-pick.
- `using-git-worktrees` existe, **no se usa** en el curso (fricción cognitiva).
- Caso real: `feature/auth0-login`, un commit por tarea (spec, plan, tests, backend, frontend, fix), cierre con merge local a `main` + push.

**2. Qué hacer**: ver protocolo 2.4 completo. En corto: [=] flujo base y `-u`; [~] para dos personas (protección de `main`, revisión cruzada, CODEOWNERS, merge commit sin squash, `git merge main` en vez de rebase); [x] worktrees (cada persona tiene su clon).

**3. Evidencia**: PRs reales con descripción narrativa, commits atómicos con mensaje que explica el "por qué" (el repo de referencia: "Los mensajes explican por qué se hizo el cambio, porque es lo único que queda cuando la conversación ya no está"), historial en el que se ve *spec -> plan -> test -> código*.

**4. Trampas**: commitear directo a `main`; una branch eterna; un commit "feat: todo"; squash que aplana el historial (se pierde la evidencia por tarea); olvidar `-u`; que Superpowers cree un worktree propio (ver 2.4 y CLAUDE.md snippet).

**5. Ambigüedades**: el caso real **mergea local y pushea sin PR** (`13`, caso real); el curso dice en el mismo `13` que en GitHub Flow lo correcto es PR "casi siempre". Para el TP manda el PR (`15`: "finishing te ofrece abrir el PR. Lo abrís"). Contradicción menor: el plan viejo dice `git push origin feature/...` (sin `-u`), el source `08` (más nuevo) dice `-u`.

### 1.7 `09-subagent-driven-development.md`

**1. Qué enseña**
- **Un subagent fresco por tarea**: contexto limpio, sin decisiones tácitas ni "context rot"; recibe el texto completo de la tarea + el contexto necesario, implementa, testea, commitea, devuelve resumen. "Fresh subagent o no arranca."
- Entre tareas, **un reviewer** (desde v6.0; antes dos) con **dos veredictos en la misma pasada**: spec compliance (¿hizo lo pedido, de más, de menos?; marca aparte lo que no puede verificar desde el diff) y code quality (dead code, shortcuts, sobre-ingeniería). Hallazgos con archivo y línea. Reviewer de solo lectura; el coordinador no puede decirle qué ignorar.
- Al final: **review de toda la rama con el modelo más capaz**. Cada dispatch nombra su modelo (mecánico -> barato; review final -> más capaz).
- Fixes: vuelven al mismo implementer (rondas 1-3) con re-review acotada; rondas 4-5 a implementer fresco con modelo más capaz; a la quinta corta.
- El coordinador **no te frena por cada ambigüedad**: decide, la registra como **ruling** (qué decidió, por qué, cuánto cuesta si se equivocó) y te muestra la lista al final. Solo frena ante lo destructivo/irreversible, sensible de seguridad, con efectos fuera de tu máquina (merge, push) o un plan tan roto que todo camino es adivinar.
- Alternativa: `executing-plans` = **modo Native** desde v6.4: la misma sesión implementa todo sin pausas, una sola review al final con el modelo más capaz; más barato y rápido, resigna la review independiente por tarea. "Con pocas tareas muy dependientes, Native alcanza; con un plan largo, subagent-driven."
- Datos reales del caso auth0 (`plan.md:943-948`, `09`): 9 dispatches, ~758k tokens y ~25 min en total (3 tareas + review final + 1 fix + re-review): T1 haiku 62k/3m47s -> review sonnet 80k/1m42s; T2 sonnet 120k/5m51s -> review 102k/2m56s; T3 haiku 58k/2m05s -> review 72k/1m46s; review final opus 98k/2m17s; fix sonnet 87k/3m11s; re-review 79k/1m37s. Coordinador 132,6k -> 175,7k.
- Anti-patrones: reusar el subagent; saltear el review; intervenir demasiado pronto.

**2. Qué hacer**
- Presupuestar: orden de magnitud **~8 min y ~250k tokens por tarea todo incluido** en un repo chico (inferencia: calculada de los datos de arriba; nuestro repo Next+3D será más pesado). Un plan de 5-6 tareas = ~1 h a 1,5 h de reloj. No es "gratis": planificar el consumo de cuota de las dos cuentas (desconocido, ver preguntas).
- Los rulings: al final de cada ejecución, **leer el listado**, y por cada uno: aceptar (anotar en `docs/bitacora.md` como "ruling aceptado") o revertir (nueva tarea). Los que toquen arquitectura (modelo de datos, esquema RLS, formato de escena) los resolvemos nosotros *antes* (poner la decisión en el spec).
- Lo que un subagent no puede hacer: hablar con vos. En el caso real el coordinador resolvió: "la verificación en navegador la corro con vos, no con un subagent". En nuestro TP: toda verificación visual del editor 2D/3D queda como paso "con humano" del plan.
- Mantener los planes ≤ 6-8 tareas (coordinador cargado) (inferencia).
- [=] todo el concepto; [~] elegir modelos según costo (no sabemos la cuota); [x] nada.

**3. Evidencia**: en el PR, la lista de tareas con modelo/duración si el reporte final la trae, el reporte "Rulings I made", y qué decidimos sobre cada uno; el diff muestra un commit por tarea.

**4. Trampas**: dejar que SDD arme un `.worktrees/` propio (el curso no lo usa; ver 2.4); creer que el review de la skill reemplaza la revisión humana cruzada (no: ven cosas distintas); interrumpir en el medio de una tarea.

**5. Ambigüedades**: el plan viejo y el spec de diseño hablan de "two-stage review" con dos reviewers: **obsoleto** (manda rev.). `09` dice que el implementer también "commitea" (consistente con `08`).

### 1.8 `10-test-driven-development.md`

**1. Qué enseña**
- RED -> GREEN -> REFACTOR en cada feature o bugfix. Regla de hierro: código de producción escrito antes de su test **se borra y se reescribe**; no se "adapta" ni se "guarda como referencia".
- Se activa en cualquier feature, bugfix o cambio de comportamiento; "agregar un endpoint" arranca con test del endpoint; un bug arranca con un test que lo reproduce y **falla por la razón correcta**.
- **Excepciones** (con confirmación explícita): prototipos descartables, código generado, archivos de configuración.
- **Verde = toda la suite del proyecto** (desde v6.4), no el archivo de la tarea; cada falla se reporta por nombre aunque no la hayas causado (dato: con una tarea que nombraba un solo archivo, el agente corría solo ese en 11 de 12 casos). La referencia de buenos tests pasó a llamarse `writing-good-tests.md` (antes `testing-anti-patterns.md`).
- Vale en los dos modos; en Native TDD es el único control por tarea hasta la review final.
- Anti-patrones: código primero y test después (valida lo que el código hace, no la intención); tests que pasan en RED; tests con mocks de todo.
- Casos reales: T1 fija el API existente (11 passed); T2 RED `ModuleNotFoundError: backend.auth` -> 31 passed; T3 RED 2 failed -> 33 passed; fix final RED 2 failed -> 34 passed, 0 warnings.

**2. Qué hacer: qué testear en una app con editor 3D + Supabase** (esto es inferencia aplicada; el curso da el principio, no la tabla). Detalle en 2.6. Resumen:
- **TDD estricto** (vitest, node): lógica de dominio pura (geometría 2D/3D, unidades, snapping, cálculo de áreas, aplicar un preset, validación/versionado del JSON de escena con zod, migraciones de esquema de escena, reducers/stores) y **RLS** (usuario A no lee/escribe lo de B; anónimo no ve nada).
- **TDD + mock solo en el borde**: Route Handlers/Server Actions con validación; adapters del repositorio de proyectos.
- **Componentes** (Testing Library): paneles, selector de presets, listado de proyectos, estados loading/error/vacío. **No** montar R3F/WebGL en jsdom.
- **Verificación en navegador, no TDD** (Playwright MCP exploratorio + 2-3 specs de `@playwright/test` de regresión): que el canvas renderice, que se pueda colocar un objeto y guardar/recargar, leyendo el **estado** de la escena desde un hook de debug (`window.__scene`), como hizo el repo de referencia ("leyó el estado de cada escena desde el navegador (posición de la pieza, largo de la snake, puntaje)").
- **No testear**: pixeles del render 3D (screenshot diff), internals de Pascal, el SDK de Supabase, componentes shadcn, tipos generados, config.
- Definir **un solo comando de verde**: `pnpm verify` (= lint + typecheck + `pnpm test` + build), porque "verde = toda la suite". Los tests que necesitan Supabase real (`test:rls`) deben fallar o *avisar visible* si no pueden correr (no skip silencioso).

**3. Evidencia**: en cada PR, el RED real (salida pegada o el commit `test:` previo) y el GREEN de la suite completa; al menos dos módulos de dominio con RED visible en el historial (`test(...)` -> `feat(...)`) (inferencia: hacerlo en 2-3 módulos clave, no en todos).

**4. Trampas**: "ya funciona" sin RED; mockear Supabase entero (el test nunca fallaría si la RLS está mal: el anti-patrón de "mocks de todo"); testear solo el archivo de la tarea y dejar un test roto al lado; intentar TDD sobre visuales 3D (tiempo perdido); tests flaky de WebGL.

**5. Ambigüedades**: las excepciones piden "confirmación explícita" pero no dice cómo. Propuesta: declararlas en el plan por tarea ("Excepción TDD confirmada: verificación visual en navegador") y en CLAUDE.md (inferencia).

### 1.9 `11-requesting-code-review.md`

**1. Qué enseña**
- Review estructurado contra el plan, antes de claimar listo o mergear; **reviewer = agente separado** (solo recibe diff + spec, sin tu historial -> sin sesgo del autor).
- Output: **strengths** + issues por severidad: **Critical** (bloquea, se arregla ya), **Important** (se arregla antes de seguir, no se degrada a Minor para no atrasar), **Minor** (se anota; la review final decide qué queda para después). (Rev. 2026-09-29: ya no es "Mayor requiere aprobación humana".)
- Desde v6.4: lo que el spec no dice se juzga **por lo que esperaría un usuario razonable** ("un crash con una entrada que nadie nombró no pasa como menor porque el spec no lo pedía"); lista **Declined to judge** con lo que decidió no evaluar, para que lo decidas vos.
- La review final de rama ya viene incluida en SDD y en Native; la skill sirve sola antes de mergear algo grande.
- Cuándo: tras TDD verde, antes de finishing; antes de mergear features que tocan más de un par de archivos; o cuando estás trabado.
- Encuentra lo que los tests no: dead code, desfasaje spec-código, ergonomía de API, archivos que crecieron demasiado, invariantes implícitos rotos. "Los tests verifican comportamiento; el review verifica diseño."
- Caso real: review final (opus): 0 Critical; 1 **Important** (logout vuelve a `/` -> redirige a login -> Google re-loguea en silencio; "un usuario razonable espera terminar deslogueado"); 6 Minor ("ninguno bloquea el merge"); Declined to judge: deploy/HTTPS, mostrar el nombre, logout por GET. La prueba en navegador lo confirmó -> página pública `/logged-out`; los 33 tests pasaban.

**2. Qué hacer**
- Doble review por PR: (a) la del agente (viene incluida en la ejecución; pegar el resumen de severidades en el PR) y (b) la **review cruzada humana** de la otra persona (hace falta: el agente no ve intención ni producto). Son complementarias.
- Triage obligatorio y visible: Critical/Important -> corregidos antes del PR; Minor -> issues `follow-up` en GitHub (así quedan "registrados como follow-up", `15`); **Declined to judge** -> lo decidimos nosotros y lo anotamos (esperable en nuestro caso: seguridad de RLS en producción, rendimiento WebGL, accesibilidad del canvas, HTTPS/deploy).
- [=] todo; [~] el reviewer humano debe escribir en el PR "qué entendí que hace esto" (inferencia: transfiere conocimiento y sirve para la defensa conjunta).

**3. Evidencia**: sección "Review final del agente" en la descripción del PR (counts por severidad + qué se hizo con cada Important/Declined) y comentarios de la persona revisora en el PR.

**4. Trampas**: saltearlo "porque pasan los tests"; degradar Important a Minor; pedirlo antes de verde; **confundir la review del agente con la cruzada** y no hacer la humana.

**5. Ambigüedades**: `15` usa un vocabulario más viejo ("críticos... nice-to-have como follow-up"); manda `11` + spine rev (Critical/Important/Minor/Declined to judge).

### 1.10 `12-verification-before-completion.md`

**1. Qué enseña**
- Antes de afirmar que algo está listo/arreglado/pasa: **correr los verification commands del plan y citar el output en la misma afirmación**. "Si no corriste el comando en este turno, no podés afirmar que pasa." La forma correcta: "los tests pasan: [salida pegada]".
- Cuándo: antes del commit "feature listo", antes del PR, antes de cerrar la tarea, antes de decir "ya está", y antes de `requesting-code-review`.
- Si no podés correrlo (infra ausente, dependencia externa, requiere ojo humano): decirlo explícito "no pude verificar X porque Y"; no asumir, no minimizar, no extrapolar desde un check parcial.
- Fue promovida del resto del cinturón al happy-path: "distingue trabajo terminado de trabajo probablemente terminado". Cierra el ciclo spec-driven: el plan dijo qué verificar, ahora se verifica.
- "Compilar es la barrera más baja del éxito. Tu trabajo es verificar comportamiento, no sintaxis"; unit tests no son end-to-end.
- Tres momentos reales (auth0): (1) el brief de la T3 traía un commit "Verificado en el navegador con login real de Google"; el commit real dice "**Próximo paso: verificar en el navegador**", porque todavía no había pasado (el reviewer lo marcó como acierto); (2) la re-review aclara que el bug se confirmó arreglado "solo vía TestClient, no en un navegador real"; (3) cierre: `uv run pytest` -> 34 passed, no warnings + recorrido real en navegador (login, sesión expirada -> vuelve a login, logout -> "Cerraste sesión").

**2. Qué hacer**
- Definir en el plan, por tarea, **comando + salida esperada** (`pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm test:rls`, y paso de navegador con qué se mira).
- Pegar las salidas en la descripción del PR (sección "Verificación").
- Honestidad en commits: no escribir "verificado en navegador" hasta que pase; usar el patrón "Próximo paso: ..." del caso real.
- Para el editor 3D: la verificación visual es *humana o Playwright MCP con humano al lado*; adjuntar captura/GIF al PR.
- [=] todo; [~] comandos de Next/pnpm/Supabase en vez de pytest.

**3. Evidencia**: bloque "Verificación" en cada PR con salida real; sección README "Cómo verificamos" con el listado de comandos y qué cubre cada uno y qué **no** (honestidad sobre lo no verificado: p. ej. "login real de Google lo hace la persona en el navegador", como el repo de referencia).

**4. Trampas**: "debería pasar"; "el feature anda" tras tests unitarios; tests verdes que corrieron contra mocks mientras la RLS real está mal; correr solo `pnpm test` y no `pnpm build` (Next rompe en build por SSR de componentes 3D, inferencia); verificar contra localhost y no contra el preview de Vercel.

**5. Ambigüedades**: ninguna. (Nota: el skill obliga a la cita en "la misma afirmación"; en un PR con 10 comandos esto se vuelve largo: usar un bloque `<details>` o un archivo, siempre con la salida real.)

### 1.11 `13-finishing-a-development-branch.md`

**1. Qué enseña**
- Cuando todo está implementado y verificado, estructura el cierre. **Tres opciones** (desde v6.2): 1) merge a la base local, 2) **push + abrir PR** (lo más frecuente, default en GitHub Flow; con la herramienta de tu forge, no solo `gh`), 3) dejar la branch como está para retomar. **Descartar ya no está en el menú**: solo a pedido explícito y confirmando tipeando `discard`.
- Primero corre **la suite entera** sobre el resultado (si falla, frena y no muestra menú), detecta el tipo de workspace (repo normal, worktree con branch propia, detached HEAD externo) y muestra el menú que corresponde.
- Orden del cleanup: mergear primero, verificar tests sobre el resultado mergeado, después remover worktree (solo los que creó Superpowers en `.worktrees/`; si `git worktree remove` se niega por cambios sin commitear, frena y pregunta), recién al final borrar la branch local.
- Punto crítico: **no quedarse en estado intermedio** ("después decido" = deuda silenciosa).
- Anti-patrones: mergear directo a `main` algo que amerita revisión; dejar la branch viva sin razón; olvidar el cleanup.
- Caso real: 34 passed; menú de 3; eligió merge local + push -> fast-forward, 34 passed en `main` antes del push, branch borrada, chequeo de que `.env` no estaba en ningún commit (repo público).

**2. Qué hacer**
- Siempre opción **2** (PR): es la entrega visible y habilita la revisión cruzada. Requisito práctico: `gh` autenticado (`gh auth login`) o crear el PR a mano en la UI de GitHub tras el push (inferencia: `13` dice "con la herramienta de tu forge").
- Si abrimos **PR draft temprano** (recomendado, 2.4), al llegar a finishing ya existe el PR: elegir opción 2 y pedirle que *actualice la descripción / lo marque ready* en vez de crear otro (riesgo de PR duplicado: verificar, inferencia).
- Después del merge del PR (lo hace la persona autora tras aprobación y CI verde): `git checkout main && git pull && git branch -d feature/...` y `git push origin --delete feature/...` (o el botón de GitHub "Delete branch").
- **Chequeo de secretos** antes de pushear (repo público): `git log -p --all -S "SUPABASE_SERVICE_ROLE" | head` y confirmar que `.env*` no está trackeado (`git ls-files | grep -i env`). Copia directa del chequeo del caso real.

**3. Evidencia**: PR mergeado (commit de merge visible), branch borrada, `main` verde; el menú de 3 opciones y la elección (captura o pegado) en el PR o la bitácora.

**4. Trampas**: mergear local a `main` "porque es más rápido" (rompe protección de `main` y la evidencia del PR); dejar ramas muertas; permiso `deny Bash(git push *)` heredado del repo de referencia, que **bloquearía** la opción 2 (ver snippet de settings en 3.6: usar `ask` para push y `deny` solo para force-push y push a `main`).

**5. Ambigüedades**: el caso real termina con merge local (opción 1) mientras el resto del material recomienda PR; resolver a favor de PR para el TP. `spine.md` rev. pide que `13` diga "tres opciones": ya coincide.

### 1.12 `14-resto-del-cinturon.md`

**1. Qué enseña** (nombra, no desarrolla): `systematic-debugging` (root cause en 4 fases cuando algo falla, en vez de adivinar); `dispatching-parallel-agents` (varios subagents en paralelo para tareas independientes); `writing-skills` (crear/editar skills propias); `receiving-code-review` (cómo responder feedback sin ceder por reflejo ni defender a ciegas); `executing-plans` (modo Native, ya en §9); `using-git-worktrees` (no se usa); `diagnosing-superpowers` (nueva en v6.4: cuando una sesión salió mal lee los transcripts en disco y reporta con evidencia `path:line`, puede armar el issue para los mantenedores). Se activan solas por su trigger en el frontmatter; el archivo `.../superpowers/<versión>/skills/<nombre>/SKILL.md` es "prosa, no magia".

**2. Qué hacer**: tabla de decisión en 2.7 (usar / no usar). Resumen: usar `systematic-debugging` cuando nos trabemos (editor 3D, RLS), `receiving-code-review` al contestar la review de la pareja, `writing-skills` si necesitamos escribir la skill propia que exige el checklist; **no** `using-git-worktrees`; `dispatching-parallel-agents` solo con tareas realmente independientes (riesgo de conflictos); `diagnosing-superpowers` solo si una sesión se descontrola (y su reporte es excelente material para "Qué salió mal").

**3. Evidencia**: si usamos `systematic-debugging` en un bug real, narrarlo en "Qué salió mal" (como el repo de referencia: causa raíz, cómo se halló, qué se cambió).

**4. Trampas**: invocar paralelismo sobre archivos compartidos; olvidar que estas skills se activan solas y sorprenderse.

**5. Ambigüedades**: `plan.md` original dice "seis skills" sin `diagnosing-superpowers`; el source ya dice siete entradas (con `executing-plans` marcada "no va en el slide"). Manda el source.

### 1.13 `15-bajada-al-tp-final.md`

**1. Qué enseña**
- El TP se construye con **exactamente el mismo flujo**, sin modo especial. Secuencia: brainstorming (spec en disco) -> writing-plans (tareas chicas "con criterios de aceptación por tarea", también al disco) -> `git checkout -b feature/<descripcion>` -> SDD (un review por tarea) o Native (si el plan es corto) -> TDD (rojo antes que verde) -> requesting-code-review (críticos en el momento, nice-to-have como follow-up) -> verification-before-completion (comando + output citado) -> finishing (abrís el PR) -> **"El PR es la entrega visible. El repo en GitHub queda como evidencia del proceso entero: spec, plan, commits, review, merge."**
- Lo que el flujo **no** hace: qué construir, si la decisión arquitectónica es correcta, si sirve a un usuario real. "El plugin acelera la ejecución y disciplina el proceso. No decide por vos qué entregar."
- Bridge a S06: refactor + debugging asistidos sobre lo construido.

**2. Qué hacer**: esto *es* el protocolo de la sección 2 de este informe.

**3. Evidencia**: la lista de arriba en repo + README.

**4. Trampas**: asumir que el flujo "construye el proyecto solo".

**5. Ambigüedades**: `15` y S04 §13 piden criterios de evaluación "alineados con el Demo Day": especificación, gestión de contexto, detección y corrección de la deriva, evidencia del flujo en el repo (`semanas/04/spine.md:192-196`); la rúbrica formal "se entrega en otro momento" (`14-trabajo-final.md`): no está en el material. Pedirla (sección 7).

---

## 2. Protocolo operativo para dos personas y ~2 días

### 2.1 Principios

1. **Los QUÉ y los POR QUÉ son nuestros**; el agente propone el CÓMO (`15`). Cualquier decisión de diseño que el agente tome sola (rulings) se revisa y se anota.
2. **Todo lo que se evalúa queda como archivo + commit**, en orden cronológico real: spec -> plan -> tests -> código -> PR.
3. **Un slice = una branch = un spec/plan = un PR**, revisado por la otra persona.
4. **`main` siempre verde y siempre mergeado por PR.**
5. **Cada persona debe poder defender cada PR** (defensa conjunta): la revisión cruzada es también transferencia de conocimiento.
6. No se miente en commits ni PRs: "verificado" solo con salida pegada.

### 2.2 Setup inicial (≈1,5 h, juntos; todo a mano, sin código de producto)

Hacer esto **antes** del primer brainstorming. Nada de esto es código de producto, por lo tanto no viola el hard gate de brainstorming.

1. Repo público en GitHub (uno de los dos; el otro como **collaborator con write**). Estructura: la que acuerden con el docente (ver pregunta 2): el curso espera `tp-final/` dentro del repo del integrante (`semanas/04/spine.md:190`). Abrir Claude Code **desde la carpeta que será la raíz del proyecto** (en el repo de referencia es `tp-final/`) para que `.claude/` y `docs/superpowers/` queden ahí.
2. Config de git: cada uno con su `user.name`/`user.email` reales (los dos autores tienen que aparecer en `git shortlog -sne`).
3. `.gitignore`: `.env*` (menos `.env.example`), `.claude/settings.local.json`, `.worktrees/`, `node_modules`, `.next`, `.vercel`, `supabase/.temp`.
4. Instalar Superpowers `--scope project` y verificar (1.3). Windows: Git Bash.
5. Harness mínimo versionado (S04): `CLAUDE.md` (con el snippet de 3.5), `.claude/settings.json` (3.6), al menos **una skill propia** en `.claude/skills/<nombre>/SKILL.md` (checklist S04 §13.3; también cuenta para el grader). Idea para la skill: "agregar-preset" (equivalente a `agregar-juego` del repo de referencia: pasos en orden, verificación en navegador) o "migracion-supabase". Un sub-agent solo-lectura "explorador" si se justifica (referencia: `.claude/agents/explorador.md`). Un comando `/pre-entrega` copiado en espíritu de `.claude/commands/pre-entrega.md` (chequea git status, README vs cambios, `pnpm verify`).
6. `.github/`: `pull_request_template.md` (3.3), `CODEOWNERS` (3.7), workflow `ci.yml` (3.8).
7. Protección de `main` (Settings -> Branches): requiere PR, 1 aprobación, status check `verify`, sin force-push, incluir administradores; **deshabilitar "squash merging"**; dejar "merge commit" (o "rebase and merge") y "auto-delete head branches". (inferencia: configuración estándar de GitHub, el curso solo enseña el PR; deshabilitar squash protege el historial por tarea, que es la evidencia.)
8. Proyectos externos: Supabase (proyecto dev + eventualmente uno de test), Vercel enlazado al repo (preview por PR: sirve como evidencia y para revisar). Secretos solo en `.env.local` y en Vercel/GitHub secrets; **repo público**: `SERVICE_ROLE` jamás en el cliente ni en git.
9. `docs/bitacora.md` creada (3.9) y `docs/prompts.md` (opcional).
10. Un primer commit directo `chore: configuración del repo y del harness` en `main` (único commit directo permitido, antes de activar la protección) o via PR #0.
11. **Spike** (30-45 min, rama `spike/pascal-embed`, descartable): ¿Pascal en Next? Resultado en `docs/spikes/pascal-embed.md`. Se mergea el doc, no el código. (Aclarar en CLAUDE.md que el código del spike no se reutiliza sin plan.)

### 2.3 El flujo paso a paso, con compuertas

Cada fila = una etapa. "Compuerta" = punto donde una persona detiene el flujo. Los artefactos de la columna 3 son los que busca el docente.

| # | Etapa | Artefacto / evidencia | Compuerta (quién aprueba) | Tiempo orientativo |
|---|-------|----------------------|---------------------------|--------------------|
| 0 | Pre-brainstorming: cada uno escribe 10 líneas (para quién, para qué, qué NO, restricciones) | `docs/prompts.md` (pedido inicial textual) | Ambos | 15 min por slice |
| 1 | `brainstorming` (conduce uno). Clasificación en voz alta. Spike si hay duda de factibilidad | `docs/superpowers/specs/YYYY-MM-DD-<tema>-design.md` | **G1**: la persona que no condujo lee el spec y lo aprueba (comentario en PR draft o en voz alta + registro en bitácora) | 40-60 min el fundacional; 20-30 min un slice |
| 2 | `writing-plans`; revisión humana del plan; elección Native/SDD y por qué | `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` | **G2**: aprobar el plan guardado (distinto de aprobar el spec) | 20-30 min |
| 3 | Rama: `git checkout main && git pull && git checkout -b feature/<descripcion>`; commit del spec y del plan como **primeros** commits de la rama; `git push -u origin`; **PR en draft** | Commits `docs(spec): ...`, `docs(plan): ...`; PR draft con el spec/plan en "Files changed" | La otra persona puede comentar spec/plan ya en el PR | 5 min |
| 4 | Ejecución: Subagent-driven o Native. TDD por tarea (RED visible). Un commit por tarea. Humano disponible para pasos de navegador | Commits por tarea; checkboxes del plan tildados | **G3**: si el coordinador frena (destructivo/irreversible/push/merge) | variable (ver 2.10) |
| 5 | Review final del agente incluida; triage Critical/Important/Minor/Declined; arreglos y re-review | Resumen de severidades en el PR; issues `follow-up` para los Minor | **G4**: leer los **rulings** y los Declined to judge; aceptar o revertir | 15-25 min |
| 6 | `verification-before-completion`: `pnpm verify` + pasos de navegador + `test:rls` si tocó políticas | Bloque "Verificación" con salida real | Quien autora (honestidad: "no pude verificar X porque Y") | 10-15 min |
| 7 | `finishing-a-development-branch` -> opción 2 (push + PR): PR a "ready" con descripción completa | PR con plantilla completa, preview de Vercel, captura/GIF | — | 5-10 min |
| 8 | **Revisión cruzada humana** (otra persona): lee diff + abre el preview + corre lo clave; deja comentarios; escribe "qué entendí" | Comentarios y aprobación en GitHub | **G5**: aprobación + CI verde | 15-25 min (SLA 1 h) |
| 9 | Merge por la persona autora con **merge commit** (sin squash); borrar branch; `git pull` en `main`; cierre del item en bitácora | Commit de merge; branch borrada | — | 5 min |
| 10 | Si algo salió mal (bug raro, deriva del agente): `systematic-debugging` y registrar en bitácora "Qué salió mal" | Entrada en `docs/bitacora.md` | — | on demand |

Regla de oro: **nunca saltear 1, 2, 5, 6 ni 8**; son las que dan la evidencia y sostienen la defensa.

### 2.4 GitHub Flow para dos personas

**Ramas**
- `main` protegida. Ramas cortas: `feature/<descripcion-corta>` (la convención del curso), más `fix/<...>` y `docs/<...>` (inferencia, extensión natural). Ejemplos: `feature/fundacion-next-supabase`, `feature/editor-escena-persistencia`, `feature/presets-viviendas-comercios`.
- Una persona no tiene más de **2 ramas abiertas** y ninguna debería vivir más de ~4-6 h (en un sprint de 2 días, una rama de 1 día ya es "larga").
- **Sin worktrees** (`08`): cada persona tiene su clon. Y como la skill de finishing sabe limpiar `.worktrees/` creados por Superpowers (`13`), lo prevenimos: `.worktrees/` en `.gitignore` y una línea en CLAUDE.md "Trabajá en la branch actual; no crees worktrees" (inferencia sobre cómo se comporta 6.4.1: si en su sesión no los crea, mejor).
- Antes de cada bloque de trabajo y antes de abrir/actualizar el PR: `git fetch && git merge origin/main` dentro de la rama (no rebase: el curso evita rebase; el merge conserva la historia tal cual pasó).

**Commits**
- Formato: `tipo(área): descripción en minúscula, imperativo breve` en español; cuerpo con el **por qué** cuando no es obvio. Tipos: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`. Áreas sugeridas: `editor`, `presets`, `db`, `rls`, `auth`, `ui`, `ci`, `harness`. (Base: el repo de referencia usa `tipo: descripción en minúscula`, y el plan de la clase `tipo(s05 §N): ...`.)
- **Tamaño**: uno por tarea del plan (lo que Superpowers hace solo) y, a mano, "uno por idea cerrada"; si no se describe en una oración corta son dos (`08`). Un commit = algo que se puede abrir y probar (referencia: "Un commit por pieza que funciona").
- Orden en cada rama: `docs(spec)` -> `docs(plan)` -> (`test(...)` rojo opcional) -> `feat(...)` -> `docs(readme/claude)` actualizando documentación **en el mismo commit que el código que describe** (convención del plan de referencia, Global Constraints).
- Los commits que hace Claude llevan `Co-Authored-By` (así se ve en el plan de referencia); dejarlo: es evidencia honesta de uso de IA.
- Nada de `--amend`/rebase interactivo/`push --force` sobre ramas ya compartidas. Nada de commits "wip" masivos.
- Nunca commitear `.env*`, `service_role`, llaves, `node_modules`.

**Pull requests**
- Abrir como **draft** apenas se pushea el plan (paso 3 del flujo): el PR es un "contrato visible" desde el comienzo y la otra persona ve el spec/plan en "Files changed". Marcar "Ready" tras finishing.
- Un PR = un plan = un tema. Diff ideal < 400-500 líneas fuera de lockfile/generados (inferencia); si es más, dividir el plan.
- Plantilla de descripción (3.3): qué/por qué, links a spec/plan, decisiones y rulings, **verificación con salida real**, review del agente, capturas, riesgos, checklist, "qué entendí" de quien revisa.
- **Revisión cruzada**: el PR de A lo aprueba B y viceversa. CODEOWNERS asigna como owner del código de A a B, así GitHub pide la review automáticamente (inferencia). GitHub no permite aprobar el propio PR, lo cual hace cumplir la regla.
- SLA de revisión: responder en ≤ 1 h en horario de trabajo; mientras tanto la persona autora avanza en otra rama.
- Tipos de comentario sugeridos: `bloqueante`, `sugerencia`, `pregunta`. Lo `bloqueante` se arregla antes del merge; las `sugerencias` no resueltas pasan a issue `follow-up`.
- Merge: lo hace quien autora, con **merge commit**, luego de aprobación + `verify` verde. Se borra la rama.

**Conflictos y puntos calientes**
- `pnpm-lock.yaml`: **nunca resolverlo a mano**. Resolver `package.json`, luego `pnpm install` y commitear el lock regenerado (inferencia, práctica estándar). Una sola persona toca dependencias por vez: avisar en el chat antes de `pnpm add`.
- `supabase/migrations/*`: los nombres llevan timestamp; si los dos crean migraciones, el orden puede cruzarse. Regla: **una persona dueña de migraciones** (B); A pide cambios de esquema por PR o por issue. Después de cada merge de una migración: regenerar tipos (`supabase gen types ...`) y commitear.
- `CLAUDE.md`, `README.md`, `docs/bitacora.md`: edits chicos y frecuentes; cada quien agrega **su** sección (`## Bitácora — Quispe` / `## Bitácora — Villalba`) para no pisarse.
- `src/app/layout.tsx`, `components/ui/*`, `tailwind`/`globals.css`: "zona compartida": avisar antes de tocar.
- `docs/superpowers/*`: nunca editar a mano un spec/plan viejo después de ejecutado (queda congelado como lo generó Superpowers); los cambios van en un spec/plan nuevo o en el README como diferencias.

### 2.5 Cómo repartir el trabajo sin pisarse

- **Dividir por slice vertical y por dueño, no por tareas dentro de un mismo plan.** SDD ejecuta tareas en serie y cada una depende de la anterior; dos personas sobre el mismo plan se bloquean.
- **Contratos primero** (en la PR de fundación): tipo `SceneDocument` + esquema zod versionado (`schemaVersion`), interfaz `ProjectRepository` (con implementación en memoria/localStorage para desarrollar sin backend y otra con Supabase), tipos generados de la base. Con eso, el trabajo del editor y el de persistencia son independientes.
- Reparto sugerido (inferencia, solo ilustrativo; el alcance real sale del brainstorming):

| Slice | Dueño | Contenido | Tests principales |
|-------|-------|-----------|-------------------|
| S0 Fundación (juntos; conduce quien tenga Supabase) | A+B | Next + TS + pnpm, vitest/Playwright, `pnpm verify`, Supabase proyecto, Auth, esquema base + RLS, deploy Vercel, CI | RLS (anónimo/otro usuario), build |
| S1 Editor | A | Embeber Pascal, estado de escena, serialización a `SceneDocument`, 2D/3D, herramientas | dominio puro (serialización, unidades, snapping), Playwright (canvas + estado) |
| S2 Proyectos y persistencia | B | Login/registro UI, CRUD de proyectos, guardar/cargar escena, autosave, Storage, estados loading/error/vacío | RLS, handlers con zod, componentes |
| S3 Presets (vivienda/comercio) | A | Presets como datos tipados + función `applyPreset` + selector UI | **TDD fuerte** (lógica pura) |
| S4 Pulido y entrega | A+B | Exportar, responsive, a11y básica, errores, README, bitácora | e2e del flujo completo |

- Orden: S0 -> (S1 || S2) -> S3 -> S4. S3 depende de S1 (formato de escena): por eso `SceneDocument` va en S0.
- **Dos sesiones de Claude Code en paralelo** (una por persona, cada una en su clon y su rama): ya estamos en el supuesto de que la ejecución corre sola entre compuertas, entonces mientras una ejecuta un plan la otra hace brainstorming del siguiente slice o revisa un PR.
- **Ritmo de sincronización**: 10 min al empezar, a mitad y al cerrar cada bloque: quién tiene qué rama abierta, qué dependencias se tocan, qué PR espera review. Un hilo de chat con "estoy tocando X".
- **Rotación de driver** en brainstorming: cada slice lo conduce quien lo va a ejecutar; el otro valida (así ambos entienden todo).

### 2.6 Estrategia de testing para este stack (qué sí, qué no, con qué)

Principio del curso: TDD para feature/bugfix/cambio de comportamiento; excepciones con confirmación explícita (descartables, generado, config); "verde" = la suite entera; evitar mocks de todo. Aplicación (inferencia, extiende lo que el repo de referencia hizo con pytest + Playwright MCP):

| Capa | Herramienta | ¿TDD? | Qué cubrir | Qué NO |
|------|-------------|-------|-----------|--------|
| Dominio puro (geometría, unidades, snapping, áreas, presets, serialización/versionado de escena con zod, reducers) | vitest (node) | **Sí, estricto** | tabla de casos + bordes (cero, negativos, unidades mezcladas, esquema viejo -> migra) | clases de Pascal |
| Políticas RLS y storage | vitest + `@supabase/supabase-js` contra un proyecto de test o `supabase start` (Docker); alternativa pgTAP con `supabase test db` | **Sí** | anónimo: nada; usuario A: solo lo suyo; A no puede leer/editar/borrar lo de B; insert con `owner_id` ajeno falla; bucket restringido | no mockear Supabase en estos tests |
| Route Handlers / Server Actions | vitest, mock **solo** del borde de red | Sí | validación zod, status codes, 401 sin sesión, mensajes de error en español | repetir la lógica de Supabase |
| Componentes React no-3D | vitest + Testing Library (jsdom) | Sí (selectivo) | selector de presets, lista de proyectos, estados loading/error/vacío | internals de shadcn |
| Editor 3D/2D (render, interacción) | Playwright MCP (exploratorio con humano) + 2-3 specs `@playwright/test` | **No TDD** (verificación) | canvas presente, sin errores en consola, colocar objeto -> guardar -> recargar -> persiste; leer **estado** vía hook de debug, no píxeles | screenshot diffs, performance fina, `@react-three/test-renderer` (solo si sobra tiempo) |
| Login con proveedor (Google) | Manual por una persona | No | recorrido real | automatizarlo (el repo de referencia tampoco: "lo hace la persona en el navegador") |
| e2e con usuario de prueba | Playwright + usuario email/password sembrado | Parcial | flujo principal | OAuth |

Comandos (todos en `package.json`): `pnpm lint`, `pnpm typecheck`, `pnpm test` (unit+componentes, siempre corre), `pnpm test:rls` (necesita variables de Supabase de test; si faltan **falla con mensaje claro**, no skip mudo), `pnpm test:e2e`, `pnpm build`, **`pnpm verify`** = lint + typecheck + test + build. CI corre `verify`; `test:rls` y `test:e2e` se corren localmente y se pegan en el PR cuando el PR toca políticas/migraciones/editor (en CI requerirían secretos/Docker; evaluar solo si sobra tiempo).

Cómo hacer visible el TDD sin mucho costo: en las tareas de dominio y RLS pedir el commit del test rojo antes del verde (2-3 módulos), y en el resto confiar en que el plan trae "Expected: RED ... GREEN" y la salida va al PR.

### 2.7 Skills de Superpowers: cuáles usar y cuáles no (proyecto de 2 días)

| Skill | Qué hace (según el curso) | Veredicto | Cómo |
|-------|---------------------------|-----------|------|
| using-superpowers | Meta: establece cómo se descubren/invocan skills (15ª skill, no nombrada en `14`) | Automática | No hacer nada; se carga al arrancar |
| brainstorming | Idea -> diseño aprobado + spec | **Usar siempre** | Una vez por slice (architectural) o bounded para menores; spike para factibilidad |
| writing-plans | Spec -> plan en disco | **Usar siempre** | Un plan por slice; revisión humana (G2) |
| subagent-driven-development | Un subagent fresco por tarea + reviewer + review final | **Usar** para planes de 5+ tareas o con partes independientes | Mirar rulings; planes ≤ 6-8 tareas |
| executing-plans (Native) | La sesión implementa todo; una review final | **Usar** para planes cortos/dependientes (fundación, módulos chicos) | Más barato/rápido; TDD es el control por tarea |
| test-driven-development | RED-GREEN-REFACTOR | **Usar** con el alcance de 2.6 | Declarar excepciones en el plan |
| requesting-code-review | Review por agente separado | **Usar** (incluida en la ejecución; sola solo antes de merges grandes) | + review cruzada humana |
| verification-before-completion | Comando + salida antes de claimar | **Usar siempre** | `pnpm verify` + navegador |
| finishing-a-development-branch | Menú de 3 opciones + cleanup | **Usar**, opción 2 | `gh` autenticado |
| receiving-code-review | Cómo responder feedback sin ceder por reflejo ni defender a ciegas | Útil | Al procesar comentarios de la pareja/agente |
| systematic-debugging | Root cause en 4 fases | **Usar cuando nos trabemos** | Bugs de 3D, RLS, hidratación; narrar en "Qué salió mal" |
| writing-skills | Escribir skills propias | Opcional | Para la skill propia obligatoria si queremos que la verifique el flujo; es corto hacerla a mano |
| dispatching-parallel-agents | Subagents en paralelo para tareas independientes | **Evitar por defecto** | Solo si hay 3-4 tareas sin archivos compartidos (p. ej. tests de módulos no relacionados); cuidado con conflictos |
| using-git-worktrees | Worktrees por branch | **No** | El curso lo excluye; dos clones alcanzan |
| diagnosing-superpowers | Lee transcripts de una sesión que salió mal | Solo ante una sesión rota | Su reporte `path:line` es evidencia para "Qué salió mal" |

### 2.8 Plugins: ¿empaquetar nuestro harness como plugin o alcanza `.claude/` versionado?

**Recomendación: alcanza `.claude/` versionado; no empaquetar.** Razones, todas del material:
- El checklist de S04 §13.3 pide la configuración del agente **versionada en el repo** (`.claude/`): CLAUDE.md/AGENTS.md, instrucciones por tema, settings con permisos, al menos una skill propia, un sub-agent si se justifica, plan mode durante el desarrollo (`semanas/04/spine.md:192`). Eso es exactamente `.claude/`, y es lo que ve el grader (`.claude/skills/` no vacío).
- Crear plugins propios está **fuera de alcance** (`docs/superpowers/specs/2026-05-21-...design.md`, Out of scope).
- Lo que más valor tiene en un plugin (distribuir y versionar entre proyectos) no aplica: es un harness de un solo proyecto con dos personas que comparten un repo.
- Limitaciones del plugin que dañarían nuestro caso: el `CLAUDE.md` de un plugin no se carga como contexto (`_research:744`); el `settings.json` de un plugin solo admite `agent` y `subagentStatusLine` (no permisos) (`_research:761`); versión fija = hay que subirla para que lleguen cambios (`_research:1112`).
- Lo que sí se hace: **usar** un plugin (Superpowers) con scope `project`, y escribir en el README la decisión "no empaquetamos, por qué". Eso es defendible y demuestra que entendieron §§1-3.
- Si sobrara tiempo (no lo recomiendo): `.claude-plugin/plugin.json` mínimo con las skills propias para mostrar el formato; no aporta evidencia que el grader o el docente pidan.

### 2.9 Mapa evidencia <-> qué busca el docente <-> señal del grader

| Lo que se evalúa (Demo Day / `programa.md` / `semanas/04/spine.md:192-196`) | Artefacto en el repo | Señal automática (`grading_lib.py`) |
|--------------------------------------------------------|----------------------|--------------------------------------|
| Especificación previa al código | `docs/superpowers/specs/*.md` commiteados antes del código; `docs/prompts.md` | `docs/superpowers/` existe; `.md` con "brainstorming"/"superpowers" |
| Plan en disco | `docs/superpowers/plans/*.md` | idem |
| Gestión de contexto | CLAUDE.md raíz + por área, rules, un plan por slice, subagents frescos; `claude plugin details superpowers` (costo always-on); sección README "Cómo gestionamos el contexto" | `CLAUDE.md` encontrado |
| Detección/corrección de la deriva | Review Focus, review final (Important), rulings revisados, honestidad en verificación, bitácora "Qué salió mal" | (manual) |
| Evidencia del flujo (commits, branches, PR) | Historial incremental, ramas `feature/*`, PRs con review cruzada | (manual; **no** escanea git) |
| Configuración del agente versionada | `.claude/settings.json`, `.claude/skills/<propia>/SKILL.md`, agents, commands | `.claude/skills/` no vacío |
| Frontend / backend | `package.json` con `react`/`next`; backend: ver riesgo | frontend sí; **backend: no detectado con Next+Supabase** salvo `express/fastify/...` |
| README como informe | Secciones: Cómo se ejecuta · Arquitectura (con diagrama y modelo de datos) · **Qué decidimos nosotros** · **Cómo gestionamos el contexto** · Flujo de trabajo (Superpowers+GitHub Flow, links a spec/plan/PR) · **Qué salió mal** · Quién hizo qué | "Los que más pesan al corregir" según `semanas/00/source_material/apellido-iisaia/README.md`: Decisiones que tomé yo y Qué salió mal |

Aclaración: no hacer *keyword stuffing*. La rúbrica es "evidencia de un feature hecho con superpowers" y el docente confirma; menciones reales y trazables (links al spec/plan/PR) valen más que repetir las palabras.

### 2.10 Cronograma de 2 días y qué se puede comprimir sin perder evidencia

Supuesto: dos personas, ~8-10 h útiles por día (ajustar). Regla: **congelar features al 70% del tiempo total**; el último 30% es integración, hardening, README y ensayo de defensa.

| Bloque | Contenido | Quién | Duración |
|-------|-----------|-------|----------|
| D1-1 | Setup (2.2) + spike Pascal | ambos | 1,5-2 h |
| D1-2 | Brainstorming fundacional -> spec -> plan -> PR draft (G1, G2) | conduce 1, valida 2 | 1,5-2 h |
| D1-3 | Ejecutar S0 (Native probable). Mientras: la otra persona hace brainstorming del slice propio en su clon | 1 ejecuta; 2 brainstorming | 2-3 h |
| D1-4 | Merge S0 (review cruzada) | ambos | 30-45 min |
| D1-5 | Planes de S1 y S2 en paralelo; ejecución | A en S1, B en S2 | resto del día 1 y mañana del día 2 |
| D2-1 | Merge S1 y S2 (cruzado); integración; e2e del flujo | ambos | 2 h |
| D2-2 | S3 presets (TDD fuerte) + S4 pulido | A (S3), B (S4) | 3-4 h |
| D2-3 | **Congelamiento**: README, bitácora -> "Qué salió mal", sync de CLAUDE.md, deploy a producción, chequeo de secretos, `/pre-entrega`, ensayo de defensa cruzada | ambos | 2-3 h |

**Qué se puede comprimir** (con su evidencia preservada):
- Brainstorming de features chicos -> camino *bounded* (diseño corto en el chat), sin archivo. Evidencia ya cubierta por los 3-5 specs architectural.
- Brainstorming del spec fundacional: aunque la skill pregunte "una por vez", *traer el pre-brainstorming escrito* acorta; no se saltea.
- Ejecución: Native en lugar de SDD para planes cortos (más barato/rápido; la review final sigue ahí).
- Review: la review final del agente (incluida) + la cruzada humana; no pedir `requesting-code-review` aparte salvo en PRs grandes.
- TDD: RED/GREEN estricto solo en dominio y RLS; el resto, verificación (con comando + salida).
- finishing: siempre opción 2, sin deliberar.
- Documentación: README se arma a partir de la bitácora que se fue llenando (5 min por entrada al momento) en vez de reconstruir al final.

**Qué NO se puede comprimir** (perderías la evidencia o la defensa): spec y plan en disco commiteados *antes* del código; compuertas G1/G2; un PR por slice con revisión cruzada; verificación con salida pegada; review final con triage; bitácora de rulings/decisiones; historial real.

### 2.11 Riesgos de tiempo y de proceso

1. **Pascal Editor desconocido** (no hay material del curso sobre él): el spike es obligatorio; si la integración no es limpia en 45 min, redefinir alcance antes del spec. (inferencia: no se pudo verificar API/licencia.)
2. **Cuota/costo de Claude** con dos sesiones y SDD: ~250k tokens por tarea estimados (1.7); elegir Native cuando se pueda; pausa si hay límites.
3. **Subagents no pueden verificar visualmente el 3D**: reservar tiempo humano.
4. **Docker para `supabase start` en Windows**: puede comerse una hora; alternativa: proyecto Supabase de test en la nube con usuarios sembrados (inferencia).
5. **Historial concentrado en 48 h** (hallazgo 2): preguntar al docente si hay repositorio previo/historia aceptable; no reescribir historia, no backdatear.
6. **Detección de backend** (hallazgo 4).
7. **Rulings sin revisar** = pérdida de apropiación en la defensa.
8. **Planes grandes** = coordinador con contexto saturado y bloqueo entre personas.
9. **Alcance "app final, no MVP" vs programa**: `programa.md` semana 8 dice "Exposición del MVP funcional" y la consigna de idea (S04 §6.9) pide "problema, usuarios, MVP y stack". Una app completa 2D+3D con presets, auth, storage, deploy en 2 días es agresiva; definir en el spec fundacional un **núcleo defendible** + extras ordenados por prioridad (lo que no entre queda como "fuera de alcance" explícito, no como TODO).
10. **Actualizaciones de Superpowers a mitad de sprint** cambian menús/comportamiento: fijar versión.

---

## 3. Plantillas breves

### 3.1 Spec (`docs/superpowers/specs/YYYY-MM-DD-<tema>-design.md`)

Lo genera brainstorming; usarla como *checklist de qué debe contener cuando lo revisemos* (o como guía de lo que pedirle). Sin "TBD".

```markdown
# <Tema> — Diseño
Fecha · Autores · Clasificación: architectural · Slice: S<n> · Estado: aprobado por <A> y <B> (fecha)

## Propósito
Para quién es y para qué sirve (2-4 líneas). Qué problema resuelve y cómo sabemos que lo resuelve.

## Alcance
Entra: ...   |   NO entra (decisión explícita): ...

## Decisiones (lo que decidimos nosotros)
| Decisión | Alternativas consideradas | Por qué esta |
Ej.: presets como JSON versionado en repo vs. tabla en Supabase.

## Arquitectura
Capas y responsabilidades (UI / editor Pascal / dominio / repositorio / Supabase). Qué hace Pascal y qué escribimos nosotros. Diagrama simple.

## Modelo de datos y contratos
Tablas y RLS (quién lee/escribe qué). `SceneDocument` (campos, `schemaVersion`). Interfaces entre slices.

## Restricciones globales (se copian al plan)
Stack, estilo, límites (archivos < N líneas), idioma, "loading y error visibles en todo lo async", sin secretos en git.

## Criterios de aceptación (verificables)
Lista numerada; cada una con cómo se verifica (test/comando/paso de navegador).

## Casos borde y riesgos
Los que ya sabemos que van a morder (RLS, sesión vencida, escena vieja, WebGL perdido...). Alimentan el Review Focus del plan.

## Preguntas abiertas
(debe quedar vacío al aprobar)
```

### 3.2 Plan (`docs/superpowers/plans/YYYY-MM-DD-<feature>.md`)

Basada en el plan de referencia real (`apellido-iisaia/tp-final/docs/superpowers/plans/2026-09-29-tp-final-auth0.md`) más el campo de aceptación que pide `15`.

```markdown
# <Feature> — Implementation Plan
> For agentic workers: REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans. Steps con checkbox.

**Goal:** una oración.
**Architecture:** 2-3 oraciones.
**Tech Stack:** Next (App Router) · React · TypeScript · Supabase · @pascal-app/* · vitest · Playwright · pnpm.
**Spec:** `docs/superpowers/specs/<archivo>.md`
Rama: `feature/<descripcion>` (ya creada, spec commiteado). Dueño: <A>. Revisa: <B>. Modo: Native | Subagent-driven (razón).

## Global Constraints  (copiadas del spec)
## Review Focus  (≤5; cada caso borde apunta al test/paso que lo fija)

### Task N: <título> (del tamaño de su ciclo de test)
**Criterio de aceptación:** observable, 1-3 líneas.
**Files:** Create / Modify / Test (paths exactos)
**Interfaces:** consume <X de Task M> · produce <Y para Task K>
- [ ] Step 1: escribir el test que falla (código completo)
- [ ] Step 2: correr `pnpm test <archivo>`; **Expected RED:** <mensaje exacto>
- [ ] Step 3: implementar (código completo)
- [ ] Step 4: correr **la suite entera** `pnpm test`; **Expected:** N passed
- [ ] Step 5 (si aplica, con humano): paso de navegador: qué abrir, qué ver
- [ ] Step 6: commit `tipo(área): ...` (+ actualizar README/CLAUDE.md en el mismo commit)

## Self-review: spec coverage · placeholders · consistencia de tipos · Review Focus
```

### 3.3 Descripción de PR (`.github/pull_request_template.md`)

```markdown
## Qué y por qué
(2-4 líneas, para alguien que no vio la sesión)

## Spec y plan
- Spec: docs/superpowers/specs/...   - Plan: docs/superpowers/plans/...   - Modo: Native/SDD

## Cambios (una línea por tarea del plan)

## Decisiones y rulings
- Decidimos nosotros: ...
- El agente decidió (ruling) y lo aceptamos / cambiamos: ...

## Verificación (salida real pegada; si no se pudo, decir "no pude verificar X porque Y")
- `pnpm verify`: <salida>
- `pnpm test:rls` (si toca políticas): <salida>
- Navegador (preview de Vercel / local): pasos + captura o GIF

## Review final del agente
Critical: n · Important: n (qué se hizo) · Minor: n (issues #) · Declined to judge: <lista y nuestra decisión>

## Riesgos / follow-ups

## Checklist
- [ ] verify verde  - [ ] sin secretos  - [ ] README/CLAUDE.md actualizados  - [ ] migraciones probadas  - [ ] bitácora actualizada

## Para quien revisa
Antes de aprobar, escribí en tus palabras qué hace este PR y qué te quedó en duda.
```

### 3.4 Entrada de bitácora (`docs/bitacora.md`)

```markdown
### YYYY-MM-DD HH:MM — <Quispe|Villalba> — <decisión | ruling | salió mal>
Contexto: ... · Qué pasó/decidimos: ... · Por qué / alternativa descartada: ... · Cómo se detectó (si salió mal): ... · Cambio hecho: commit/PR #...
```
(Esta bitácora alimenta las secciones "Qué decidimos nosotros" y "Qué salió mal" del README, las que "más pesan al corregir".)

### 3.5 Snippet para `CLAUDE.md` (flujo obligatorio)

```markdown
## Flujo de trabajo (obligatorio)
- Todo trabajo creativo arranca con `brainstorming` (superpowers). No se escribe código de producto antes de que el spec esté aprobado por las dos personas.
- Specs en `docs/superpowers/specs/`, planes en `docs/superpowers/plans/`, **en español**, commiteados antes de implementar. No editarlos después de ejecutados.
- Nunca commitear en `main`. Una rama `feature/<descripcion>` por plan. No crees worktrees; trabajá en la rama actual.
- Verde = `pnpm verify` completo (lint + typecheck + test + build). No afirmes que algo funciona sin pegar la salida del comando.
- TDD en dominio y RLS; en UI 3D la verificación es en navegador (excepción confirmada).
- Commits en español: `tipo(área): descripción`, uno por tarea del plan, con el por qué en el cuerpo si no es obvio.
- Al terminar: `finishing-a-development-branch` -> opción 2 (push + PR). El PR usa la plantilla de `.github/`.
- Decisiones que el agente tome por su cuenta (rulings) se anotan en `docs/bitacora.md`.
```

### 3.6 `.claude/settings.json` (permisos compatibles con el flujo)

Idea (inferencia: combina S04 permisos con el hecho de que finishing opción 2 hace push):

```json
{
  "permissions": {
    "allow": ["Bash(pnpm install)", "Bash(pnpm test*)", "Bash(pnpm lint)", "Bash(pnpm typecheck)", "Bash(pnpm build)", "Bash(pnpm verify)", "Bash(git status*)", "Bash(git diff*)", "Bash(git log*)", "Bash(git add*)", "Bash(git commit*)", "Bash(git switch*)", "Bash(git merge origin/main)"],
    "ask":   ["Bash(pnpm add*)", "Bash(git push *)", "Bash(gh pr *)"],
    "deny":  ["Bash(git push --force*)", "Bash(git push * main)", "Bash(rm -rf *)", "Read(./.env*)"]
  },
  "enabledPlugins": { "superpowers@claude-plugins-official": true }
}
```
(`enabledPlugins` lo escribe `/plugin install --scope project`; el formato exacto de la clave es inferencia.) El repo de referencia tenía `deny: Bash(git push *)`, que bloquearía la opción 2 de finishing; acá se baja a `ask`.

### 3.7 `.github/CODEOWNERS` (revisión cruzada automática)

```
# El dueño es quien REVISA, no quien escribe
/src/editor/      @villalba-gh
/src/presets/     @villalba-gh
/supabase/        @quispe-gh
/src/lib/supabase/ @quispe-gh
/src/app/api/     @quispe-gh
/docs/            @quispe-gh @villalba-gh
```
(Usuarios de GitHub reales a completar. Inferencia: así GitHub pide review a la otra persona por defecto.)

### 3.8 `.github/workflows/ci.yml`

Pasos: checkout, `pnpm/action-setup`, `actions/setup-node` con cache pnpm, `pnpm install --frozen-lockfile`, `pnpm verify` (con variables dummy para el build). Marcarlo como status check requerido. (Inferencia: estándar.)

### 3.9 Skeleton de README del TP final (informe)

Tomado del README de referencia (`apellido-iisaia/tp-final/README.md`) y de `programa.md` (MODALIDAD DE EVALUACIÓN): **Qué es y cómo se ejecuta** (variables `.env.example`, Supabase, Vercel, comandos) · **Arquitectura** (capas, modelo de datos, RLS, contratos, qué hace Pascal y qué escribimos) · **Qué decidimos nosotros** (alternativas y motivos) · **Cómo gestionamos el contexto** (CLAUDE.md por área, rules, un plan por slice, subagents) · **Flujo de trabajo** (Superpowers 6.4.1 + GitHub Flow: tabla de slices con links a spec, plan, PR; reparto entre integrantes) · **Cómo verificamos** (comandos y límites) · **Qué salió mal y cómo lo corregimos** · **Quién hizo qué**.

---

## 4. Criterios de calidad por etapa (checklists de revisión)

**Un buen spec** (de `06`, self-review): propósito y destinatario claros; clasificación explícita; alternativas con trade-offs y recomendación; alcance y "no entra"; criterios de éxito verificables; restricciones globales; casos borde; *sin* TBD/TODO, *sin* contradicciones, *un solo* proyecto (scope), sin frases ambiguas; commiteado; aprobado por quien no lo condujo. Señal de alarma: si hay que leer la conversación para entenderlo, no sirve como contrato.

**Un buen plan** (de `07`): `Spec:` apuntando al archivo; Global Constraints copiadas; Review Focus con ≤5 casos borde cada uno atado a un test/paso; tareas del tamaño de su ciclo de test; steps de 2-5 min con paths exactos y **código completo**; comando y salida esperada (RED y GREEN) en cada tarea; Interfaces entre tareas; commit por tarea; criterio de aceptación por tarea (de `15`); nombres consistentes entre tareas; sin "similar a Task N". Señal de alarma: un subagent fresco no podría ejecutar la tarea sin preguntar.

**Una buena ejecución**: commit por tarea; RED visto; suite entera verde (cada falla nombrada, aunque no sea nuestra); humano disponible para pasos visuales; rulings leídos.

**Un buen PR** (de `08`, `13`, `15` y el repo de referencia): título claro; historia en la descripción (qué, por qué, decisiones); link a spec/plan; commits atómicos con "por qué"; salida de verificación real; resumen de la review (severidades y qué se hizo); capturas del editor; riesgos; CI verde; revisado por la otra persona; mergeado con commit de merge.

**Una buena verificación** (de `12`): comando exacto + salida pegada en la misma afirmación; end-to-end, no solo unit; si no se pudo, "no pude verificar X porque Y"; los commits no afirman lo que aún no pasó ("Próximo paso: verificar en el navegador").

**Una buena review** (de `11`): contra el plan/spec; issues con archivo y línea; severidad honesta; usuario razonable para lo no especificado; Declined to judge explícito y decidido por nosotros; Critical/Important cerrados antes de seguir; Minor registrados como follow-up.

---

## 5. Ambigüedades, contradicciones y cosas desactualizadas (consolidado)

1. **Individual vs grupos**: `programa.md` y `semanas/00/source_material/02-como-se-aprueba.md` ("no hay grupos en ninguna de las entregas, tampoco en la última") vs `semanas/04/spine.md:190` y `14-trabajo-final.md:49` (grupos de 2-3). Manda S04 (2026-09-23), que además admite que lo otro está "pendiente deliberado". Confirmar con el docente y cómo se asigna autoría.
2. **Estructura del repo**: S00 `03-tu-repositorio.md` (un repo con `tp1/`, `tp2/`, `tp-final/`, README índice) vs S04 ("`tp-final/` en el repo de uno de los integrantes"). El grader evalúa la carpeta del alumno completa (`detect_repo` recorre todo el repo, ignorando solo carpetas listadas), pero **hay que saber dónde poner `.claude/` y `docs/superpowers/`** (en el repo de referencia, dentro de `tp-final/`).
3. **MVP vs "app final"**: `programa.md` semana 8 "MVP funcional"; S04 §6.9 "MVP y stack". Nuestro alcance es mayor.
4. **Referencia FastAPI/SQLite/vanilla vs nuestro stack**: todo el material es agnóstico salvo ejemplos; el grader solo reconoce `fastapi/flask/django/uvicorn/express/fastify` como backend.
5. **Material viejo vs revisado**: `plan.md` parte 1 y spec de diseño del 2026-05-21 (cuatro opciones de finishing, two-stage review con dos reviewers, `executing-plans` con checkpoints humanos, "Mayor requiere aprobación humana", 14 skills, path de cache sin versión) contra spine rev. y `06`-`15` actuales. Manda lo nuevo.
6. **Caso real: merge local sin PR** (`13`) vs "el PR es la entrega" (`15`). Para el TP: PR.
7. **`15` vs `07`**: `15` pide "criterios de aceptación por tarea"; `07` no los define como campo. Los agregamos.
8. **Vocabulario de severidades** en `15` ("críticos / nice-to-have") vs `11` (Critical/Important/Minor/Declined to judge). Manda `11`.
9. **Fuente canónica ausente**: no está `semanas/05/source_material/superpowers/`; los SKILL.md literales y el README de 6.4.1 no se pudieron leer. El comportamiento exacto de la versión instalada manda sobre este informe.
10. **`diagnosing-superpowers` y `using-superpowers`**: la primera se describe en `14`; la segunda no se describe en ninguna clase (solo aparece como fuente en el spec de diseño). (Inferencia sobre qué hace.)
11. **El repo de referencia enlaza un spec que no está** (`docs/superpowers/specs/2026-09-29-tp-final-auth0-design.md`; el directorio está vacío en el material descargado). Para el grader basta que `docs/superpowers/` exista; para nosotros: que `specs/` y `plans/` tengan contenido real.
12. **`rubric.md` dice "menciones ... en prompts o commits"**; el código solo mira `.md`. Los commits los lee el docente.
13. **Nombre/versionado**: spine dice `/plugin install ...` por slash; la doc de referencia también expone `claude plugin install` por CLI (`_research:769`). Son equivalentes; usar la que funcione.

---

## 6. Top 10: lo que NO puede faltar en nuestro repo (de estas clases)

1. **Specs `architectural` en `docs/superpowers/specs/`** (fundación + 3-4 slices), commiteados *antes* del código de su rama, aprobados por la persona que no condujo. (Señal grader + "especificación previa").
2. **Planes en `docs/superpowers/plans/`** con `Spec:`, Global Constraints, Review Focus, tareas con criterio de aceptación, comando y salida esperada, commit por tarea; aprobados (G2) y congelados tras ejecutarse.
3. **Superpowers instalado con `--scope project`** y `.claude/settings.json` commiteado, versión anotada, `/plugin list` mostrado; README "Flujo de trabajo" con skills realmente usadas y links a spec/plan/PR.
4. **Harness `.claude/` completo**: `CLAUDE.md` (con flujo obligatorio), settings con permisos compatibles con finishing (push en `ask`), **al menos una skill propia**, `.claude/skills/` no vacío, `.gitignore` de `settings.local.json`.
5. **GitHub Flow real de a dos**: `main` protegida, ramas `feature/*`, un PR por slice con descripción narrativa, **revisión cruzada visible**, **merge commit sin squash**, ramas borradas, ambos autores en el historial.
6. **Historial incremental y honesto** desde la primera hora: spec -> plan -> test -> código, commits chicos en español con el "por qué"; sin commits masivos ni historia fabricada.
7. **TDD con RED visible** en dominio y RLS, `pnpm verify` como único "verde" (suite entera), y salida pegada en los PRs.
8. **Verificación con evidencia** (comando + salida, navegador/preview con captura) y honestidad sobre lo no verificado ("no pude verificar X porque Y"); chequeo de secretos antes de cada push (repo público).
9. **README-informe** con las secciones que más pesan: *Qué decidimos nosotros* y *Qué salió mal y cómo lo corregimos*, alimentadas por `docs/bitacora.md` (rulings revisados incluidos), más *Cómo gestionamos el contexto* y *Quién hizo qué*.
10. **Apropiación demostrable**: cada integrante puede defender cada PR (review con "qué entendí"), decisiones de arquitectura propias documentadas, rulings del agente auditados, ensayo de defensa cruzada antes del Demo Day.

---

## 7. Preguntas abiertas para el docente

1. **Modalidad**: ¿confirman grupos de 2 (S04 §13) pese a que `programa.md`/S00 dicen individual? ¿Se evalúa la autoría por persona (commits/PRs de cada uno) o solo el resultado conjunto?
2. **Estructura del repo**: ¿`tp-final/` dentro de un repo con `tp1/`, `tp2/` (como `apellido-iisaia`), o un repo propio del TP? ¿Dónde deben vivir `.claude/` y `docs/superpowers/`: raíz del repo o dentro de `tp-final/`? ¿Hace falta que el otro integrante figure como collaborator?
3. **Backend**: ¿Route Handlers/Server Actions de Next + Supabase (Postgres, Auth, Storage, RLS) cuenta como "backend"? El detector automático solo reconoce `fastapi/flask/django/uvicorn/express/fastify`; ¿lo sabe y lo corrige a mano? ¿Se acepta un stack distinto del de referencia (FastAPI + SQLite + vanilla)?
4. **Alcance**: `programa.md` habla de "MVP funcional" para el Demo Day; ¿el nivel esperado es MVP o la app completa que queremos? ¿Qué pesa más: alcance o proceso defendible?
5. **Rúbrica formal** (S04: "se entrega en otro momento"): ¿pesos de especificación, contexto, deriva, evidencia del flujo? ¿Mínimo de PRs/specs esperado?
6. **Historia concentrada en 2 días**: S00 advierte que "el historial no se puede fabricar la noche anterior". ¿Hay problema en que el TP final se construya en un sprint corto sobre el repo existente, siempre que el historial sea incremental y real? ¿Cuál es la fecha de entrega y de Demo Day?
7. **Idioma** de spec/plan/PR (el repo de referencia los deja en inglés tal cual los genera el agente): ¿se acepta español?
8. **Evidencia de uso de Superpowers**: ¿alcanza con `docs/superpowers/` + README + PRs, o piden las transcripciones/capturas de sesión? ¿Cuenta el bonus de superpowers (rubric: +1) si el backend no se detecta (el cálculo exige "final fe/be/CLAUDE.md completo")?
9. **Cuota de IA**: ¿hay créditos/cuenta compartida? SDD consume ~250k tokens/tarea en el caso de la clase (estimación derivada); ¿se espera SDD o se acepta Native?
10. **Pascal Editor**: ¿hay restricciones de licencia/uso, o material adicional sobre sus paquetes (`@pascal-app/*`)? No hay nada en el curso.
11. **Superpowers**: ¿se fija 6.4.1 o se acepta la versión vigente al instalar? ¿Falta el directorio `semanas/05/source_material/superpowers/` en la copia de material que tenemos?

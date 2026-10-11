# Informe A — Semana 00, Semana 01 y programa.md (IISAIA, TP Final de Quispe y Villalba)

Fecha del análisis: 2026-10-11. Fuente: `iisaia-course` (solo lectura). Idioma: español rioplatense.

**Leyenda de rutas** (todas relativas a la raíz de `iisaia-course`):

- `[REF]` = `semanas/00/source_material/apellido-iisaia`
- `[TPF]` = `semanas/00/source_material/apellido-iisaia/tp-final`
- `(inferencia)` = no está en el material del curso; es deducción mía o conocimiento general que hay que verificar.

---

## 0. Hallazgos críticos (leer primero)

1. **Contradicción sobre equipos (resuelta por fecha, pero a confirmar con el docente).** `programa.md` ("3 trabajos prácticos de carácter individual"), `semanas/00/source_material/02-como-se-aprueba.md` ("no hay grupos en ninguna de las entregas, tampoco en la última") y las notas del orador de `semanas/00/slides/index.html` ("Las tres son individuales, incluida la última") dicen **individual**. Pero `semanas/04/source_material/14-trabajo-final.md`, en su nota "Estado (2026-09-23)", dice: *"Equipos: definido el 2026-09-23 — grupos de 2 o 3, `tp-final/` en el repo de uno de los integrantes y defensa conjunta."* Manda la nota de la semana 04: es posterior, está fechada y es explícita sobre el TP Final. Consecuencia para ustedes: `tp-final/` vive en el repo de **uno** de los dos, y el argumento de 02-como-se-aprueba ("en un grupo cada uno cubre el hueco del otro") pasa a ser el **riesgo principal de la defensa**: los dos tienen que poder explicar *todo* (ver sección 6).
2. **Qué se corrige realmente (rúbrica heredada de la cohorte anterior).** `.claude/skills/grading/rubric.md` + `docs/superpowers/specs/2026-06-22-grading-skill-design.md` + `.claude/skills/grading/scripts/grading_lib.py` muestran que la corrección de la cohorte 04–06/2026 era *"completitud y evidencia, no calidad de código"*, "deliberadamente subjetiva e indulgente": base 9/10 si hay Bad UI + final completo (**frontend + backend + CLAUDE.md**) + presentó el final en clase; 10/10 si además hay evidencia de un feature hecho con superpowers (`.claude/skills/`, `docs/superpowers/`, menciones a `brainstorming`/`writing-plans`/`executing-plans`/`subagent-driven` en `.md`); −0,5 si no presentó la idea en clase; OpenAPI no descuenta. **No sé si aplica igual a esta cohorte** (la consigna formal dice "se entrega en otro momento"), pero es la mejor evidencia disponible de qué mira el docente. Implicancia: el producto rico (2D+3D) importa menos que **la evidencia de proceso y la capacidad de defenderlo**.
3. **Riesgo concreto de detección de "backend" con Next.js + Supabase (inferencia sobre `grading_lib.py`).** El detector busca "backend" solo si `package.json`/`pyproject.toml`/`requirements.txt` contienen `fastapi, flask, django, uvicorn, express, fastify`; el frontend si hay `react, vue, vite, next, svelte, angular` o archivos `.jsx/.tsx/.vue`. Un proyecto Next + Supabase sería detectado como "frontend" y **no como backend** → el script sugeriría "final incompleto (−2)". El docente confirma a mano, así que no es fatal, pero conviene hacer el backend **muy visible** en el README y en el árbol de carpetas (`supabase/`, `src/app/api/` o `server/`) y preguntarle si Route Handlers + Supabase cuentan como backend (pregunta abierta #2).
4. **El programa exige 8 cosas en el README y la referencia no cumple literalmente una de ellas.** `programa.md` (MODALIDAD DE EVALUACIÓN) lista: especificación inicial, prompts principales, manejo de contexto y corrección de desvíos del modelo, decisiones de arquitectura, **fragmentos clave del código generado**, instrucciones para ejecutar, **observaciones arquitectónicas**. El `[TPF]/README.md` cubre casi todo pero no tiene una sección literal de "fragmentos clave" ni de "observaciones arquitectónicas" (las equivalentes son contratos en bloques de código y el párrafo del "acoplamiento que conviene tener presente"). **Agreguen esas dos secciones con esos nombres** (plantilla en la sección 6).
5. **El `tp-final` de referencia NO tiene `prompts.md`** (sí lo tienen `tp1/` y `tp2/`). Su "registro de proceso" es: plan congelado (`docs/plan.md`) + spec y plan de superpowers + historial de commits + sección "Cómo gestioné el contexto". Como `programa.md` pide "prompts principales" en el README, conviene igual incluir un `prompts.md` (o sección) en el final (inferencia: bajo costo, cumple el texto literal del programa).
6. **Trampa del material:** en `[TPF]/docs/superpowers/specs/` la carpeta aparece **vacía** en el checkout local porque el repo del curso usa *sparse checkout* (el archivo `2026-09-29-tp-final-auth0-design.md` está trackeado pero marcado `S`/skip-worktree). Lo leí desde el objeto git (`git cat-file`, solo lectura). El README de la referencia sí lo enlaza. No es un faltante real.
7. **Pascal Editor / `@pascal-app/*` no aparece en el material del curso.** No puedo verificar su API. Es exactamente el caso que la clase 1 advierte (librería poco frecuente o posterior al cutoff → el modelo inventa con aplomo). Ver sección 7.
8. **Cronograma de evidencia.** `02-como-se-aprueba.md`: *"el historial no se puede fabricar la noche anterior. Un repositorio con un único commit que dice 'entrega final' no tiene proceso que mostrar."* Con 2 días, la disciplina de commits/branches/PRs desde la hora 0 es parte de la entrega, no un extra.
9. **La entrega se mide en el repo público.** Si el repo es privado "no se puede corregir" (`03-tu-repositorio.md`). Con Supabase: nunca commitear `SUPABASE_SERVICE_ROLE_KEY` ni `.env*` (la referencia lo resuelve con `.gitignore` + `.env.example` + falla de arranque con nombre de la variable faltante).

---

## 1. Qué leí (cobertura)

- Semana 00 completa: `semanas/00/source_material/{index,01-que-es-este-curso,02-como-se-aprueba,03-tu-repositorio}.md`, `semanas/00/spine.md`, `semanas/00/plan.md`, notas del orador de `semanas/00/slides/index.html`.
- Referencia completa `[REF]`: `README.md`; `tp1/{README,prompts}.md` (+ `index.html` solo su existencia/tamaño); `tp2/{README,prompts}.md`, `openapi.yaml`; `tp-final/`: `README.md`, `CLAUDE.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md`, `.claude/{settings.json,settings.local.json.example,rules/*,skills/agregar-juego/SKILL.md,agents/explorador.md,commands/*}`, `docs/plan.md`, `docs/superpowers/plans/2026-09-29-tp-final-auth0.md`, spec del login (leído por `git cat-file`), `tests/*`, `.env.example`, `.gitignore`, `pyproject.toml`, backend `*.py`, JS de frontend clave (`api.js`, `game-page.js`, `score-panel.js`, `common.js`).
- Semana 01: los 9 `source_material/*.md` + `index.md`, el inicio de `transcript.txt` (excluido a propósito), y las notas del orador de `semanas/01/slides/index.html` y `cambalache.md` (porque **no existen `spine.md` ni `plan.md` para la semana 01**; las slides son lo único "as-built").
- `programa.md` completo.
- Cruces (solo para contrastar, no son mi asignación): `semanas/04/source_material/14-trabajo-final.md`, `semanas/05/source_material/15-bajada-al-tp-final.md`, notas "Estado" de `semanas/04/source_material/08-rules.md` y `09-settings-json.md`, `semanas/08/source_material/index.md`, `.claude/skills/grading/*`.

---

## 2. SEMANA 00 — Presentación del curso

### 2.0 Cómo está armado el bloque y qué manda

- `semanas/00/plan.md` dice "Estado: ejecutado": el deck as-built tiene **5 slides** (portada, promesa, arco en tres movimientos, cómo se aprueba, "esta semana"), ~10 minutos, sin demos. `semanas/00/spine.md` es la descripción canónica.
- Contradicciones menores internas: `semanas/00/source_material/index.md` dice "~15 minutos" y "termina con un pase a la clase 1"; `spine.md`/`plan.md` dicen ~10 min. Manda `spine.md`/`plan.md` (as-built, `plan.md` lo declara). `spine.md` dice "Densidad: cuatro slides" y después suma 3+1+1=5: error menor, manda el "5" de `plan.md`.
- El bloque **no es una clase**: es el segmento "Introducción al curso" de la fila 1 de `programa.md`.
- Dato que solo está en las notas del orador (`semanas/00/slides/index.html`): **TP1 sale en la clase 2, TP2 en la clase 3, la consigna del TP Final en la clase 5 (ahí mismo se expone la idea y se recibe devolución de alcance) y se defiende en la clase 8**; "los criterios de cada entrega se detallan junto con su consigna".

### 2.1 `01-que-es-este-curso.md`

**1. Qué enseña**
- Promesa: en 8 semanas terminás una app con interfaz, servidor y datos que persisten, y **no escribís la mayor parte del código**; la presentás y tenés que explicar cómo la construiste.
- El trabajo "se corrió de lugar": lo difícil ya no es la sintaxis sino decidir qué se construye, con qué estructura, y detectar cuándo lo que vuelve está mal.
- No es curso de programación ni de "trucos de prompt" (envejecen cada seis meses); es un curso de **dirigir**. Rol con nombre: **supervisor** ("la IA implementa; vos decidís qué se construye y verificás que se haya construido bien").
- Arco en tres movimientos: (1) entender la herramienta (clase 1: predicción del siguiente token, estocástica, alucinaciones, ventana de contexto), (2) aprender a nombrar (clases 2–3: vocabulario de frontend/backend; "sin vocabulario el único movimiento es aceptar todo o rechazar todo"), (3) dirigir un agente (clase 4 en adelante: loop, memoria, configuración, flujo de trabajo, conexión a sistemas externos). Clase 8 = presentás y contás cómo lo dirigiste.
- Resultado esperado: poder abrir un proyecto que no escribiste, entender su estructura, pedir un cambio concreto y darte cuenta de si lo que volvió sirve. "Las herramientas van a cambiar; el criterio para dirigirlas, no."

**2. Qué hacer en NUESTRO TP**
- Asumir el rol explícito: **supervisores**, no tipeadores. En el README, abrir con una declaración del rol y del reparto (quién dirigió qué).
- Hacer visible el vocabulario: nombrar capas, contratos, componentes, estados y eventos en spec, CLAUDE.md y README (frontend: estructura/estado/eventos; backend: recursos, endpoints, status codes, datos). Aplica tal cual.
- "Contrato" es la pieza que más se traslada: documentar **contratos** (editor ↔ persistencia; cliente ↔ servidor; formato de presets) con ejemplos de payload, igual que `[TPF]/README.md` ("Contrato entre la interfaz y el servidor").

**3. Evidencia**: sección "Qué decidimos nosotros" y "Cómo gestionamos el contexto" (ver sección 6). El curso valora que se vea **vocabulario preciso** en prompts y decisiones.

**4. Trampas**: las dos reacciones equivocadas ante "no escribís el código": alivio ("no hay nada que aprender") y desconfianza. Anti-patrón implícito: aceptar/rechazar en bloque.

**5. Ambigüedades**: ninguna relevante; pero "la aplicación funcionando" aquí es genérica: el dominio (diseñador de interiores) no figura en el material; hay que validarlo con el docente (pregunta #5).

### 2.2 `02-como-se-aprueba.md`

**1. Qué enseña**
- Tres entregas "todas individuales", en un repo público; la 3.ª = TP Final, defendida en Demo Day (clase 8). **(Superado para el TP Final por la nota del 2026-09-23 de la semana 04: grupos de 2 o 3.)**
- Argumento de por qué individual: "en un grupo esa responsabilidad se diluye… cada uno cubre el hueco del otro. Individual, no hay dónde esconderse".
- **"Que funcione no alcanza."** Se evalúa si podés contar el proceso: cómo especificaste *antes* de que se escribiera código; qué decisiones de arquitectura tomaste *vos* (endpoints, estructura de datos, contrato) en vez de aceptar el default del modelo; cómo detectaste una desviación y qué hiciste.
- Término técnico: **apropiación** = que el producto sea tuyo aunque el agente haya escrito la mayoría del código; se mide en **explicar, corregir y extender**, no en líneas tipeadas.
- El README es el informe: qué te propusiste construir, prompts principales, cómo manejaste el contexto cuando el proyecto creció, qué salió mal y cómo lo corregiste, instrucciones de ejecución.
- Desde la clase 6: el repo también conserva evidencia: **spec y plan como archivos en disco, historial de commits, branches, pull requests**, "como subproducto de trabajar bien".
- "El historial no se puede fabricar la noche anterior."

**2. Qué hacer en NUESTRO TP**
- Arrancar con **spec en disco antes del primer código** (`brainstorming` → `docs/superpowers/specs/…-design.md`) y **plan en disco** (`writing-plans` → `docs/superpowers/plans/…md`). Aplica tal cual.
- Trabajar con GitHub Flow desde el primer día: rama `feature/<descripcion>` → PRs con descripción → merge. Un PR por pieza funcional (ver 3.12).
- Reservar, **mientras desarrollan** (no al final), un registro de "desvíos del agente" (inferencia: `docs/bitacora.md` con fecha, síntoma, causa, corrección) para alimentar "Qué salió mal" con casos reales. La referencia dice explícitamente en `[TPF]/docs/plan.md`: *"Qué salió mal se escribe con los desvíos que aparezcan de verdad… Si no aparece ninguno que valga la pena, te aviso en vez de inventarlo."* → **no se inventan fallos**.
- Como son 2 personas: definir ya quién es el autor visible de cada PR y que **el otro lo revise** (evidencia de revisión cruzada = evidencia de que ambos entienden todo).

**3. Evidencia**: README-informe + spec/plan + commits/branches/PRs. Valor para el curso: alto en "decisiones propias" y "qué salió mal"; ver sección 4 (señales).

**4. Trampas**: repo con un único commit; repo privado; README que solo documenta uso (no proceso); decisiones sin alternativas; "Qué salió mal" inventado o genérico.

**5. Ambigüedades**: individual vs. grupo (hallazgo 1). También: "los detalles de cada consigna se comunican cuando corresponde" → la rúbrica formal del TP Final no está en el material de la semana 00 (`semanas/04/.../14-trabajo-final.md`: "Rúbrica formal… se entregan en otro momento").

### 2.3 `03-tu-repositorio.md`

**1. Qué enseña**
- **Un solo repo público para 8 semanas** (no uno por entrega); nombre libre pero entendible. Estructura: `apellido-iisaia/{README.md, tp1/, tp2/, tp-final/}`; cada carpeta con su `README.md` = informe de esa entrega; el README raíz = índice (quién sos, qué hay en cada carpeta, links).
- Razón de fondo: el historial continuo **es** la evidencia; en un repo único se ve si commiteás seguido o de golpe, si los mensajes describen algo, y cómo evolucionó tu forma de trabajar entre la semana 2 y la 8. Además: un solo link, mandado una sola vez a enzo.tng@gmail.com.
- Las carpetas se crean cuando llega cada entrega (no vacías por adelantado).
- Git/GitHub "en serio" se ve en la clase 6; por ahora crear el repo desde la web.

**2. Qué hacer en NUESTRO TP**
- Definir **en cuál de los dos repos** va `tp-final/` (nota 2026-09-23) y que el otro integrante lo enlace desde su README raíz (inferencia). El link de ese repo es el que corrige el docente.
- Mantener la estructura de referencia: `tp-final/README.md` (informe) + `tp-final/CLAUDE.md` + `tp-final/.claude/` + `tp-final/docs/` + código. Correr Claude Code **desde `tp-final/`** (la referencia pone `.claude/` ahí; inferencia: la configuración de proyecto se carga desde el directorio de arranque).
- Vercel: configurar **Root Directory = `tp-final`** (inferencia, es un ajuste de Vercel) y documentarlo en "Cómo se ejecuta/Deploy".
- Actualizar el README raíz (índice) agregando la fila del TP Final y los dos autores.

**3. Evidencia**: README raíz con tabla de entregas (ver `[REF]/README.md`) y link a `tp-final/`.

**4. Trampas**: repos sueltos por entrega; repo privado; crear el repo "la noche antes".

**5. Ambigüedades**: ninguna técnica; con equipos, falta definir dónde viven TP1/TP2 de cada uno (son individuales). No es asunto de ustedes para el TP Final.

---

## 3. EL TP FINAL DE REFERENCIA — anatomía completa de un TP "bien resuelto"

> El `tp-final` de referencia es "Plataforma de juegos" (Tetris y Snake con ranking): FastAPI + SQLite + HTML/JS vanilla + Phaser, con login Auth0. Aquí extraigo el **patrón**, no el dominio.

### 3.1 Estructura de carpetas

```
apellido-iisaia/
├── README.md                 índice: quién sos + tabla de entregas
├── tp1/  README.md  prompts.md  index.html
├── tp2/  README.md  prompts.md  openapi.yaml
└── tp-final/
    ├── README.md             INFORME (≈15 KB): ejecución, arquitectura, decisiones, contexto, fallos
    ├── CLAUDE.md             memoria raíz (≈7.7 KB)
    ├── .claude/
    │   ├── settings.json            (versionado) modelo + permisos
    │   ├── settings.local.json.example   (versionado) override local (model, MCP Playwright)
    │   ├── rules/{api-y-datos.md, escenas-de-juego.md}
    │   ├── skills/agregar-juego/SKILL.md
    │   ├── agents/explorador.md
    │   └── commands/{explicar.md, pre-entrega.md}
    ├── backend/  {CLAUDE.md, main.py, auth.py, db.py, models.py, schemas.py, routes.py}
    ├── frontend/ {CLAUDE.md, index.html, game.html, css/, js/…}
    ├── tests/    {conftest.py, test_scores.py, test_auth.py}
    ├── docs/
    │   ├── plan.md                         plan original CONGELADO
    │   └── superpowers/{specs/…-design.md, plans/…md}   spec y plan de una feature (login)
    ├── .env.example  .gitignore  pyproject.toml  uv.lock
```

Límites de tamaño declarados y cumplidos: **archivos < 300 líneas, funciones < 50** (los JS miden 34–205 líneas; `auth.py` 105). Cuando uno se pasó (`score-panel.js`) se partió "antes de seguir" y el README lo cuenta.

### 3.2 `tp-final/README.md` — contenido y redacción de cada sección

Orden real: **título + párrafo de qué es y stack** → **Cómo se ejecuta** → **Arquitectura** (árbol comentado; tabla de endpoints con *todos* los status codes por fila; Datos; Contrato interfaz↔servidor con payload real; Contrato juegos↔página) → **Qué decidí yo** → **Cómo gestioné el contexto** → **Qué salió mal**.

- **Cómo se ejecuta**: requisitos (versiones, herramienta, internet por CDN, cuenta Auth0), pasos de configuración externa numerados (dashboard de Auth0), `.env.example` → `.env`, un comando para generar el secreto, qué pasa si falta una variable ("el servidor no arranca y dice cuál"), comandos, URL, trampa del puerto ocupado (`[WinError 10013]`) con la solución, cómo resetear datos, cómo correr tests y **qué simulan** ("Usan una base temporal y un Auth0 simulado, así que no tocan `scores.db` ni necesitan el `.env`"). Es operativo, no marketing.
- **Arquitectura**: no es solo un árbol; cada archivo lleva una línea de responsabilidad. La tabla de endpoints es `Method | Path | Respuestas` con códigos *y la condición* ("`422` nombre vacío o de más de 20 caracteres, o puntaje negativo"). Incluye el **criterio de desempate** del ranking. Datos: dos tablas con campos. Los contratos se muestran con JSON real.
- **Qué decidí yo** (11 entradas; ver patrón de redacción abajo).
- **Cómo gestioné el contexto** (7 párrafos): (1) modo plan: el agente leyó el repo y los informes previos y le hizo **cuatro preguntas** (stack frontend, identificación del jugador, endpoints, qué hacer con el README) → el plan sin editar está en `docs/plan.md` y fue la referencia de estructura, status codes y orden de commits; (2) **un commit por pieza que funciona** (backend, home, Snake, Tetris, ranking), con mensajes que explican *por qué*, "porque es lo único que queda cuando la conversación ya no está"; (3) límites de 300/50 líneas → con archivos chicos "alcanza con cargar el que hace falta" ("para arreglar Tetris no necesité tener la API en contexto, gracias al contrato de `gameover`"); (4) configuración del agente versionada (permisos, skill, sub-agent, 2 comandos) y la división "CLAUDE.md describen / rules prescriben"; (5) verificación con **MCP de Playwright** (jugó, leyó el estado de cada escena desde el navegador, guardó puntajes, cortó el servidor para ver errores); (6) **plan y construido no coinciden del todo** → se deja el plan como estaba y las diferencias se explican en el README (`finish.js`→`common.js`, `score-panel.js` salió después); (7) para el login usó **superpowers**: preguntas de a una hasta cerrar el diseño → **spec** → **plan de implementación con código de cada tarea** → ejecutado por **sub-agents (uno implementa, otro revisa cada tarea)**; y cierra con una aclaración honesta: "Los dos documentos están en inglés, tal como los generó el agente, y describen lo planeado. La página `/logged-out` no figura porque salió después, probando en el navegador."
- **Qué salió mal** (5 entradas): ver patrón abajo.

#### Patrón de redacción de "Qué decidí yo" (copiable)

Cada entrada = **una oración en negrita con la decisión** + 2–5 oraciones con: *qué alternativas se consideraron* → *por qué se eligió* → *qué costo se acepta*. Ejemplos textuales del patrón:
- "**Phaser para el loop y el teclado, con reglas propias.** Consideré otros dos caminos. Uno era… el otro era… Con Phaser… Es más código que con juegos ya hechos, pero lo puedo leer entero y explicar." → criterio explícito: *poder explicarlo*.
- "**Sin paso de build.** … El costo es que sin internet los juegos no cargan. En ese caso la página lo avisa en vez de quedar en blanco." → costo + mitigación.
- "**El login vive en el servidor, no en el navegador.** Auth0 tiene un SDK para… Lo descarté porque…" → la alternativa descartada se nombra.
- "**404 si el juego no existe, no una lista vacía.** Pedir el ranking de `pong` y recibir `[]` sugiere que `pong` existe… Son dos situaciones distintas." → decisión de contrato con razonamiento semántico (idéntico en `tp2/README.md`).
- "**La base dice qué juegos existen y el frontend dice cómo se juegan.** … es un acoplamiento que conviene tener presente." → reconoce deuda/acoplamiento conocido.
- Decisiones **revertidas** también se narran: "Tests para la API. Antes verificaba todo jugando en el navegador. Con el login… sumé tests con pytest" (revirtió la decisión original "sin pytest" del plan congelado).

#### Patrón de redacción de "Qué salió mal" (copiable)

Cada entrada = **síntoma en una oración (en negrita)** → **cómo se detectó** (y por qué las pruebas previas no lo vieron) → **causa raíz** (en código fuente de la librería / en el plan / en el entorno) → **dónde se corrigió** (archivo y función) → **lección** (que además queda codificada en CLAUDE.md/rule/test). Los cinco casos:
1. **Tetris movía la pieza de más** (2 flechas = 3 casillas): la prueba con pausas de 100 ms lo escondía; se detectó **contando llamadas a `move` con pulsaciones sin pausa** (5 llamadas para 2 teclas); causa en el **código fuente de Phaser** (re-despacha la cola de eventos del frame); arreglo `onKeys` con `WeakSet` en `common.js`. Lección: "probar con pausas esconde el bug".
2. **La fecha volvía sin zona horaria**: `POST` daba 201 y el ranking se veía bien; se vio **leyendo el JSON crudo con curl**; SQLite no guarda zona; arreglo en `to_score_out`. Lección: "leé la respuesta cruda".
3. **El arreglo que parecía no andar**: en Windows el reload de `fastapi dev` dejó un **worker huérfano** sirviendo código viejo; diagnóstico con **`netstat`**. Lección: "antes de volver a tocar código, confirmá qué proceso responde".
4. **Snake arrancaba sola**: **el hueco estaba en el plan, no en el código** (nunca decía cuándo empieza la partida; el agente hizo "lo más literal"). Lección: ante un comportamiento raro, revisá si la especificación lo definía.
5. **Cerrar sesión no cerraba nada**: los tests pasaban porque simulaban Auth0 y Google; se vio **probando en el navegador**; se creó `/logged-out` pública. Lección: los mocks no reemplazan la verificación real.

Todos terminan en una **regla operativa** que reaparece en `CLAUDE.md` ("Trampas ya pagadas") y/o en `.claude/rules/`.

### 3.3 `[REF]/README.md` raíz, `tp1/` y `tp2/` (patrón de informes más chicos)

- **README raíz**: `# Apellido, Nombre` + una línea de qué es + **tabla `Entrega | Carpeta | Estado`** con links + párrafo "cómo se usa esta estructura". Explicita qué pesa más al corregir: *"las secciones que más pesan al corregir son **Decisiones que tomé yo** y **Qué salió mal y cómo lo corregí**. La primera muestra qué eligió la persona en lugar de aceptar el default del modelo; la segunda, que se leyó el resultado en vez de darlo por bueno. El `prompts.md` va **sin editar, defectos incluidos**: el registro sirve como registro solo si es fiel."* (Esta es la declaración más directa del criterio de corrección que hay en todo el material.)
- **tp1/tp2 README**: `Cómo se ejecuta/se lee` → `Qué me propuse construir` → `Decisiones que tomé yo` (5 entradas con alternativa y criterio: "DOM en vez de canvas… para poder ver el estado en el DOM"; "cuatro filas… 1/16, 4/16… con seis filas… demasiado lento para mostrarlo en clase") → `Qué salió mal y cómo lo corregí` → `Prompts` (qué prompts pesaron).
  - El "qué salió mal" de **tp1**: el resultado salió bien **y el prompt igual estaba mal** (contradicción interna "cuatro filas" vs "la sexta" + referencia huérfana); "las dos ambigüedades salieron a mi favor, y ahí está el problema: juzgando por el resultado me quedo con que el prompt estaba bien escrito". Lección: releer el prompt cruzando secciones antes de mandarlo.
  - El de **tp2**: el modelo copió la confusión del prompt (`project_id` en el body y en el path): "el problema no era el yaml: era el prompt". Lección: *el path identifica, el body transporta contenido nuevo*.
  - Moraleja corregible: **la causa raíz suele estar en la especificación del humano**, y el informe lo dice.
- **`prompts.md` (formato)**: título + una línea de contexto ("Tres prompts en una sola conversación de Gemini Canvas"); por cada prompt: `## N — nombre`, **el prompt completo en bloque de código**, y tres mini-secciones: **Qué intentaba lograr**, **Por qué está escrito así** (decisiones de redacción: p. ej. nombrar la "ida y dos vueltas" de un estado; reglas defensivas) y **Qué devolvió / Qué hice con eso**. Cierra con "**Conversación completa**": cuántas conversaciones, si se reinició el hilo, tamaño del artefacto final.
- **`openapi.yaml` (tp2)**: OpenAPI 3.1, 3 paths/5 endpoints, `components/schemas` con `Input` separado de salida (`TaskInput` vs `Task`), `404` en listas anidadas, `204` en DELETE, `required` solo donde corresponde. (Solo TP2; ver 9 y 10 sobre si el final lo necesita.)

### 3.4 CLAUDE.md jerárquicos

Tres niveles: `tp-final/CLAUDE.md` (raíz, panorama), `backend/CLAUDE.md`, `frontend/CLAUDE.md`. Principios visibles:
- **Raíz = panorama + índice.** Secciones: *Qué es este proyecto* → *Comandos* (con puertos alternativos, cómo se prueban los tests y qué NO se automatiza) → *Dónde seguir leyendo* (tabla `Archivo | Qué cubre` que apunta a los CLAUDE.md hijos y a las rules) + tabla de las piezas de configuración del agente → *Arquitectura* (con "Los dos contratos que sostienen el diseño" y "Agregar un juego toca dos lados") → ***Trampas ya pagadas*** (los 4 bugs del README convertidos en reglas: qué pasó, qué hacer) → *Convenciones* (300/50 líneas, idioma, formato de commit `tipo: descripción en minúscula`, "un commit por pieza que funciona").
- **Hijos = "cómo funciona" localmente** y se cargan al trabajar en esa carpeta ("se carga solo al trabajar ahí"). El backend explica *arranque y seed*, *recorrido de un request* (4 pasos numerados con el nombre de cada función), *capas* (tabla archivo→qué es), *cambiar el esquema*, *probar* (pytest/curl). El frontend explica *sin build*, *las dos páginas*, *quién llama a quién* (diagrama ASCII), *ids del DOM*, *errores*, *CSS*, *games/*.
- **División nítida**: *"Los CLAUDE.md describen cómo funciona el código; las reglas dicen qué hacer y qué no."* (frase en el CLAUDE.md raíz y repetida al inicio de cada hijo).
- Estilo: densidad alta, afirmaciones **con consecuencia** ("el mount en `/` atrapa todo lo que se registre después… un endpoint nuevo… devolvería `index.html` en vez de JSON, sin error visible"), negritas en lo que rompe en silencio, rutas y nombres de función exactos.
- Primera línea del raíz: el boilerplate de `/init` ("This file provides guidance to Claude Code…") seguido del contenido en español. **Ojo:** el párrafo "Vive dentro del repo del curso… es material de referencia que leen los alumnos" es meta-contenido de *esta* referencia; no copiarlo.
- Regla de mantenimiento: "Si un cambio invalida una decisión o un bug narrado [en el README], hay que actualizar esa sección **en el mismo commit**" (README y CLAUDE.md se actualizan en el mismo commit que el código que describen; está también en las *Global Constraints* del plan de superpowers).

### 3.5 Rules (`.claude/rules/`)

- `api-y-datos.md` (**sin frontmatter ⇒ se carga siempre**, costo de contexto igual a CLAUDE.md; confirmado por `semanas/04/source_material/08-rules.md`): contrato de endpoints (slug en path, `created_at` lo pone el servidor, 404 vs lista vacía, status codes en uso), fechas (con el *porqué*: "Este bug no rompe nada visible… Sólo se ve leyendo la respuesta cruda"), capas (no devolver el modelo de tabla; `SessionDep`; registrar routers antes del mount), migraciones.
- `escenas-de-juego.md` (**con `paths: ["frontend/js/games/**/*.js", "frontend/js/game-page.js"]` ⇒ solo se carga al tocar esos archivos**, costo cero hasta entonces) con `description` en frontmatter. Contenido: "La escena no conoce la API", "El teclado va por `onKeys()`" (con snippet **correcto**), "Al terminar la partida", "Forma de una escena nueva" (incluye "Definir explícitamente **cuándo arranca** la partida" — la lección de Snake convertida en regla).
- Patrón: cada regla viene con **el porqué y el síntoma de violarla**; los snippets muestran el uso correcto; las reglas son **normativas** ("nunca", "siempre") mientras que CLAUDE.md es descriptivo.

### 3.6 Skill (`.claude/skills/agregar-juego/SKILL.md`)

- Frontmatter: `name` + `description` empezando con **"Use when…"** (en inglés, aunque el cuerpo está en español) que dice *cuándo* usarla y *qué cubre*.
- Cuerpo: intro con **por qué importa el orden** ("si la escena se escribe antes que el seed… el ranking devuelve 404"); referencia a la rule obligatoria ("no se repiten en este archivo"); **fases numeradas** (1 Definir → 2 Seed backend → 3 Escena → 4 Conectar página → 5 **Verificar jugando**), cada una con acciones y qué NO hacer ("**No** toques `scores.db` a mano ni escribas un script de migración"); la fase 5 enumera pasos de verificación observables con Playwright y una **condición de fin** ("Recién cuando los cuatro pasos salen bien, el juego está agregado"); cierra con **Anti-patterns** (4 viñetas con su consecuencia).
- Propósito pedagógico: la skill es un **procedimiento repetible de un cambio recurrente**; el agente la invoca solo cuando coincide con la descripción.

### 3.7 Sub-agent (`.claude/agents/explorador.md`)

- Frontmatter: `name`, `description` ("Use when a question needs reading several files across the backend and the frontend…. Reads and searches only; never edits."), `tools: [Read, Grep, Glob]` (**solo lectura por construcción**: no tiene Edit/Write/Bash).
- Cuerpo: rol ("Sos un explorador… leer y responder, no editar"), cómo trabajar (empezar por los CLAUDE.md y rules "te ahorran lecturas"; seguir el recorrido real del dato; **citar archivo y símbolo**), cómo responder (resumen ≤10 líneas + lista de archivos con una línea cada uno), **honestidad**: "Si algo no está en el código, decilo. No completes con lo que sería razonable." y "Nunca propongas un cambio salvo que te lo pidan". → Es *exactamente* la mitigación de alucinaciones de la clase 1 aplicada a un sub-agent (contexto aislado + citas + permiso de decir "no sé").

### 3.8 Slash commands (`.claude/commands/`)

- `explicar.md`: frontmatter `description`, `argument-hint: <ruta/al/archivo>`, `disable-model-invocation: true` (solo lo dispara la persona); usa `$1`; pide ≤5 líneas (qué hace, quién lo llama/a quién llama, qué convención respetar); "No propongas cambios ni edites nada"; si falta la ruta, la pide.
- `pre-entrega.md`: checklist de 5 puntos con **diagnóstico antes de arreglar** ("No arregles nada todavía"): `git status`/`diff --stat`; README es el informe y si algún cambio invalidó una decisión narrada hay que decir qué sección actualizar; **avisar si `docs/plan.md` aparece modificado**; tests sin warnings y app levanta; CLAUDE.md/rules siguen describiendo el código; cierra con lista corta priorizada.
- Distinción del curso: "Dos comandos, que son **atajos y no procedimientos**" (los procedimientos van en skills).

### 3.9 Permisos y configuración

`[TPF]/.claude/settings.json` (versionado): `"model": "sonnet"`; `permissions.allow`: `Bash(uv sync)`, `Bash(uv run fastapi dev backend/main.py*)`, `Edit(./backend/**)`, `Edit(./frontend/**)`, `Edit(./README.md)`, `WebFetch(domain:docs.phaser.io)`, `WebFetch(domain:fastapi.tiangolo.com)`; `deny`: `Read(./scores.db)`, `Edit(./docs/plan.md)`, `Bash(rm -rf *)`, `Bash(git push *)`; `ask`: `Bash(uv add *)`, `Bash(uv remove *)`; `"attribution": { "pr": "" }`; `"cleanupPeriodDays": 30`.
- Lectura de diseño: **allow** = lo que el agente hace todo el día en este proyecto (incluye **dominios de documentación oficial de las dos librerías clave**: la mitigación de alucinaciones por herramienta); **deny** = proteger lo congelado (`docs/plan.md`), los datos (`scores.db`) y lo irreversible (`rm -rf`, `git push`); **ask** = cambios de dependencias.
- `.claude/settings.local.json.example` (versionado; el real está en `.gitignore`): `{"model": "haiku", "enabledMcpjsonServers": ["playwright"]}` → demuestra **precedencia** (proyecto=sonnet, local=haiku) y habilita el MCP de Playwright por persona. **Detalle:** el `[TPF]` no trae `.mcp.json`; el `.mcp.json` que declara `playwright` (`npx @playwright/mcp@latest`) está en la **raíz del repo del curso**. En un repo de alumno hay que crear el `.mcp.json` propio (ambigüedad #9).
- `.gitignore`: `*.db`, `.env`, `.venv/`, `__pycache__/`, `.claude/settings.local.json`. `.env.example` solo con nombres de variables.
- **Stale:** `semanas/04/source_material/09-settings-json.md` dice que el `settings.json` del tp-final "no tiene `env` (el proyecto no usa variables de entorno)", pero el README/CLAUDE.md actuales exigen `.env` con 4 variables de Auth0. Manda el código/README del `[TPF]` (más reciente: 2026-09-29).

### 3.10 `docs/plan.md` y `docs/superpowers/`

- **`docs/plan.md` = plan de modo plan, congelado a propósito.** Estructura: *Context* (qué se hace y por qué + decisiones ya tomadas), *Estructura* (árbol), *Backend* (modelo, endpoints en tabla, validaciones), *Frontend* (por archivo, incluyendo estados vacío/cargando/error), *README (informe completo)* (qué debe contener cada sección y de dónde sale), *Git* (**branch + un commit por pieza con mensaje previsto**), *Verificación* (curl esperados + e2e con Playwright + estados de error). Está escrito en segunda persona por el agente ("Decisiones que ya tomaste"). Se **deniega su edición** en `settings.json` y se usa `/pre-entrega` para vigilarlo. Las diferencias plan↔construido se explican en el README ("Dejé el plan como estaba y las diferencias quedan explicadas acá").
- **Superpowers (feature de login):** spec `docs/superpowers/specs/2026-09-29-tp-final-auth0-design.md` (en inglés; tabla "Decisions (agreed in brainstorming)" pregunta→decisión; secciones por componente; "Out of scope"; tests; verificación de browser; "Docs (same commit as the code they describe)"; "Git: branch `feature/auth0-login`… commits en español, uno por pieza") y plan `docs/superpowers/plans/2026-09-29-tp-final-auth0.md` con: encabezado ("REQUIRED SUB-SKILL: superpowers:subagent-driven-development…"), **Goal / Architecture / Tech Stack / Spec**, **Global Constraints** (p. ej. "`docs/plan.md` is frozen: never edit it", "Docs… are updated in the same commit as the code they describe", "No `pytest-playwright`, no test-only login bypass in app code"), **Review Focus** (5 riesgos, cada uno "pinned" a un test concreto), y **Tasks 1–3** con `Files` (Create/Modify), `Interfaces` (Consumes/Produces), pasos con checkbox en ciclo **TDD** ("Run to verify it fails" → "Expected: …" → implementar → "verify it passes"), el código completo de cada paso, el texto exacto de los cambios de docs y el `git commit -m "tipo: …"` con trailer `Co-Authored-By`. Task 3 incluye una verificación con el humano ("needs the human") y un criterio de parada ("If any step fails, stop and use superpowers:systematic-debugging. Don't patch blindly").
- Dos formas de trabajar documentadas en el mismo repo: **modo plan** (base) y **superpowers** (feature) — y el README dice cuál se usó para qué. Eso es lo que activa la señal "+1 feature con superpowers" de la rúbrica.

### 3.11 Tests

- `pytest` + `TestClient`; `conftest.py` fija `DATABASE_URL` (base temporal) y variables falsas de Auth0 **antes de importar la app**; fixtures `client` (anónimo) y `user_client` (pasa por `/callback`); `fake_auth0` autouse monkeypatchea las dos llamadas a Auth0; `empty_scores` autouse limpia.
- **Los tests pinean contratos**, no implementación: lista de juegos, `201` con fecha UTC, ranking con desempate, `limit`, `404` con el *detail* exacto, `422` parametrizados (`""`, `"   "`, 21 chars, −1), `limit` fuera de rango; auth: anónimo→`302 /login` en páginas/estáticos/`/docs`, `401` en API, `POST` anónimo no guarda, `/login` con `connection=google-oauth2`, `/callback` con error→`400`, `/logout`, **variable de entorno faltante/vacía frena el arranque** (parametrizado sobre `REQUIRED_VARS`).
- Lo que **no** automatizan y por qué: el login real con Google ("lo hace la persona en el navegador") y los juegos (se verifican con Playwright MCP leyendo el estado de la escena desde el DOM).

### 3.12 Git/commits (convenciones visibles)

- Rama por feature (`feature/tp-final-plataforma-juegos`, `feature/auth0-login`), **un commit por pieza que funciona** (se puede abrir y probar), mensajes en español `tipo: descripción en minúscula` (`feat:`, `test:`, `docs:`), el cuerpo explica *por qué*; trailer `Co-Authored-By: Claude …` (la atribución de commits queda; solo `attribution.pr` está vacío). "Docs en el mismo commit que el código". Los commits de un plan previsto se listan **antes** de implementar (en `docs/plan.md`, sección *Git*).
- Merge de rama = "Próximo paso: merge a main" (el plan de superpowers termina en el cierre de rama; el flujo completo con PR está en `semanas/05/source_material/15-bajada-al-tp-final.md`).

### 3.13 Qué muestra el código en sí (señales sin leer prosa)

- Capas con responsabilidad única y nombres de función que reaparecen en los CLAUDE.md (`find_game`, `to_score_out`, `SessionDep`, `onKeys`, `finishGame`, `createScorePanel`).
- Validación **en los tipos** (`StringConstraints`, `Field(ge=0)`, `Query(ge=1, le=50)`), no en `if`s → los 422 salen solos.
- Comentarios que explican *por qué* y no *qué* (orden de middlewares; WeakSet de teclas; SQLite sin zona horaria).
- Manejo de error en cada capa (UI con estados cargando/vacío/error + "Reintentar"; `api.js` traduce red/HTTP a castellano; `401` redirige a login).
- Versiones **pinneadas** (Phaser `3.90.0` por CDN) y chequeo defensivo (`typeof Phaser === "undefined"` → mensaje en vez de pantalla en blanco).

---

## 4. OJO DE CORRECTOR — señales concretas de "apropiación"

Ordenadas de mayor a menor peso según el propio curso (`[REF]/README.md`: "las secciones que más pesan al corregir son *Decisiones que tomé yo* y *Qué salió mal*"), más lo que mira mecánicamente la rúbrica heredada.

**A. Señales textuales (README/CLAUDE.md)**
1. **Decisiones con alternativa nombrada, criterio y costo** (no "usé X porque es popular"). Criterio explícito de apropiación: "lo puedo leer entero y explicar".
2. **Decisiones revertidas y narradas** (nickname → Auth0; "sin tests" → pytest) con el motivo. Demuestra que el plan no se siguió a ciegas.
3. **Fallos con causa raíz verificada en la fuente** (código de la librería, JSON crudo, `netstat`), indicando **por qué la verificación previa no lo detectó** (pausas entre teclas; mocks de Auth0).
4. **Fallos que son del plan/spec, no del código** ("el hueco estaba en el plan"; "el problema era el prompt"). Es la señal más fuerte de que entienden la dirección vs. la ejecución.
5. **Lecciones convertidas en artefactos** (regla en `.claude/rules/`, sección "Trampas ya pagadas", test de regresión). Cierra el ciclo detectar→corregir→prevenir.
6. **Honestidad sobre el desajuste plan↔construido** y sobre acoplamientos conocidos.
7. **Contratos explícitos con payload real** y razones semánticas (404 vs `[]`, server pone `created_at`, juego en el path).
8. **Prompts sin editar** (`prompts.md`) con "qué intentaba lograr / por qué está escrito así / qué devolvió / qué hice".
9. **Documentación sincronizada con el código** (mismo commit) y límites de tamaño aplicados (y qué se hizo al pasarlos).

**B. Señales en el repositorio (evidencia de proceso, `02-como-se-aprueba.md` + `15-bajada-al-tp-final.md`)**
10. Spec y plan **en disco** y anteriores al código (fechas de commit); `docs/plan.md` intacto.
11. Historial continuo: muchos commits chicos, un commit por pieza funcional, mensajes que explican el porqué; ramas y PRs con revisión; el PR como "entrega visible".
12. Configuración de agente **versionada y específica del proyecto** (permisos con sentido, skill con un procedimiento real del dominio, sub-agent de solo lectura, comandos cortos). La rúbrica heredada pide `CLAUDE.md` y premia `.claude/skills/` + `docs/superpowers/`.
13. Evidencia de verificación real (output de tests citado; capturas/Playwright).

**C. Señales que el docente puede probar en vivo en el Demo Day (inferencia basada en el criterio "explicar, corregir y extender")**
14. Que cada integrante pueda **explicar cualquier archivo** (la referencia incluye `/explicar` justamente), **hacer un cambio pequeño en vivo** (p. ej. un preset nuevo, un campo nuevo en un contrato) guiando al agente, y **detectar si lo que volvió sirve**.

**Anti-señales (lo que baja credibilidad):** README = manual de uso; decisiones sin alternativas; "Qué salió mal" genérico o sin causa raíz; prompts "limpiados"; un solo commit; `.claude/` copiado de la referencia sin adaptar al dominio; CLAUDE.md genérico de `/init` sin trampas; spec/plan que no coinciden con lo construido y no lo reconocen.

---

## 5. TRADUCCIÓN AL STACK NUESTRO (Next/React + Vercel + Supabase + pnpm + Pascal Editor)

Referencia: FastAPI + SQLite + HTML/JS vanilla + `uv`. Clasificación: **[T] se traslada tal cual**, **[A] hay que adaptar**, **[X] no aplica**.

| Concepto de la referencia | Clase | Traducción a nuestro proyecto |
|---|---|---|
| Un repo público, carpeta `tp-final/`, README informe, README raíz índice | [T] | `tp-final/` en el repo de uno de ustedes (nota 2026-09-23); Vercel con Root Directory `tp-final` (inferencia). |
| `CLAUDE.md` raíz + hijos que describen; `.claude/rules` que prescriben | [T] | Raíz `CLAUDE.md` (panorama, comandos pnpm, trampas), `src/…/editor/CLAUDE.md` (editor 2D/3D), `supabase/CLAUDE.md` (esquema, RLS, migraciones). Rules path-scoped. |
| Capas backend (db→models→schemas→routes→auth→main) | [A] | `supabase/migrations/*.sql` (tablas+RLS) → tipos generados (`supabase gen types`, inferencia) → esquemas de validación (zod) → Route Handlers/Server Actions → `middleware.ts` de sesión → layout. Mantener la regla "schema de entrada ≠ fila de tabla" (no devolver filas crudas; no aceptar `user_id` del cliente). |
| "`created_at` lo pone el servidor, nunca el cliente" | [T→A] | Defaults en la DB (`now()`, `default auth.uid()`), y policies `WITH CHECK (user_id = auth.uid())` (inferencia). Documentar como decisión propia. |
| "404 si no existe, no lista vacía" | [A] **con trampa** | Con **RLS**, lo que no es tuyo "no existe" para vos (0 filas). Hay que decidir y documentar 401/403/404 y cómo se mapea el error de `.single()`; test con dos usuarios (inferencia). |
| "Un solo proceso sirve API y frontend, sin CORS" | [T] | Next full-stack same-origin; documentarlo como decisión. |
| Orden de `include_router` antes de `mount("/")` | [A] | Análogo: `middleware.ts` `matcher`, rutas protegidas vs públicas, refresco de sesión de Supabase (`@supabase/ssr`, inferencia). La lección: **un guard mal ordenado falla en silencio**; dejar test. |
| `SessionMiddleware` + `require_login` (302 páginas, 401 API) | [T→A] | Mismo contrato con Supabase Auth (cookies SSR). `/login`, `/auth/callback`, `/logout` públicas; API → 401 JSON; páginas → redirect. Leccion "cerrar sesión no cerraba nada": después de `signOut`, ir a una página **pública** (no reentrar en un login automático por OAuth). |
| Auth0: URLs permitidas exactas (`127.0.0.1` ≠ `localhost`) | [A] | Supabase Auth → *Redirect URLs*: agregar `http://localhost:3000/**` y el dominio de Vercel (y previews). Misma trampa: el match es exacto. (inferencia) |
| `.env.example` + falla de arranque que nombra la variable faltante + test | [T] | `src/env.ts` validado con zod que lanza con el nombre; `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (públicas) y `SUPABASE_SERVICE_ROLE_KEY` (**solo servidor, jamás en el repo**). Test `variable_faltante_frena_el_arranque`. |
| Sin Alembic: "borrá scores.db" para cambiar esquema | [X] | **No aplica.** Usar migraciones del CLI de Supabase versionadas en `supabase/migrations/`; reglas: no editar migraciones ya aplicadas; seed idempotente (`on conflict do nothing`) para presets. Documentar cómo resetear local (`supabase db reset`, inferencia). |
| Seed idempotente por slug (`seed_games`) | [T] | `supabase/seed.sql` de presets (viviendas/comercios) idempotente. |
| Tests con base temporal y auth simulada, antes de importar la app | [A] | Vitest/Jest para lógica pura (geometría, serialización de escena, validadores de presets) + tests de RLS (pgTAP vía `supabase test db` o integración con dos usuarios; inferencia) + Playwright para el flujo. Conservar la regla "sin atajo de login solo para tests dentro del código de la app". |
| Verificación con MCP de Playwright leyendo estado desde el DOM | [A] | Para WebGL/canvas hay que **exponer el estado de la escena** (p. ej. `window.__editor` solo en dev) y combinar con capturas; ver riesgo de WebGL headless (inferencia). La captura de pantalla es evidencia y además aprovecha que el modelo es multimodal (clase 1, archivo 09). |
| Skill `agregar-juego` | [A] | `agregar-preset` (vivienda/comercio: slug, nombre, plano base, mobiliario → seed → registro en el catálogo → verificar en 2D y 3D). Misma anatomía en fases y anti-patterns. |
| Sub-agent `explorador` (solo lectura, cita archivo y símbolo) | [T] | Idéntico + instrucción de **no responder de memoria sobre la API de `@pascal-app/*`/three/R3F: leer `node_modules` y los tipos**. |
| `/explicar`, `/pre-entrega` | [T] | `/pre-entrega` con `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, estado de migraciones, `.env` no trackeado, README al día, plan congelado, PR abierto, preview de Vercel. |
| `settings.json` con allow/deny/ask | [A] | allow `Bash(pnpm *)` acotado, `Edit(./src/**)`; deny `Read(./.env*)`, `Edit(./docs/plan.md)`, `Bash(rm -rf *)`; ask `Bash(pnpm add *)`, `git push`, `supabase db reset/push`. WebFetch a docs oficiales de las librerías **que más pueden alucinar**. (Esqueleto en sección 6.) |
| Versiones pinneadas (Phaser 3.90.0 por CDN) | [A] | `pnpm add -E` (versiones exactas) para `@pascal-app/*`, `three`, `@react-three/fiber`, `next`, `@supabase/*`; `packageManager` y `engines` en `package.json`; lockfile commiteado. (`.mcp.json` del curso usa `@playwright/mcp@latest`; para nosotros mejor pinnear.) |
| Decisión "Sin paso de build" | [X] | No aplica (Next compila). Lo que **sí** se traslada es el *formato* de la decisión: stack y librería base justificados con alternativas (p. ej. Pascal Editor vs R3F/three directo; Next vs Vite) y costo. |
| Orphan worker en Windows (`fastapi dev`) | [A] | Vuestra máquina es Windows: aplica el diagnóstico `netstat -ano | findstr :3000` ante "el arreglo no anda" con `next dev` (inferencia). |
| `docs/plan.md` congelado + deny de edición | [T] | Mismo mecanismo. |
| Contrato "las escenas no conocen la API; solo emiten `gameover`" | [A] | **Análogo clave:** el editor 2D/3D no conoce Supabase; un único módulo (`persistence`) serializa/deserializa la escena (formato versionado) y es el único que escribe. Permite tocar el editor sin cargar el backend en contexto (misma ventaja de contexto que cita la referencia). |
| Acoplamiento "la base dice qué existe, el frontend dice cómo se juega" | [A] | Presets en DB (datos) ↔ renderers/definiciones en código: documentar como "acoplamiento conocido" si existe. |
| `openapi.yaml` (TP2) | [A/opcional] | Para el final no hay requisito visible en el material (la rúbrica heredada no descuenta). Si hay Route Handlers propios, documentar el contrato (tabla de endpoints en README alcanza, como en `[TPF]`). Preguntar (pregunta #8). |
| Deploy | [X en la referencia] | La referencia solo corre local. Vercel suma documentación: variables en el dashboard, Redirect URLs, previews por PR (evidencia), región de Supabase, límites. |

### 5.1 Reparto "Architect → Prompter → Reviewer → Tester" (Unidad 2, `programa.md`)

El ciclo se aplica entre dos personas rotando roles por feature (inferencia): quien *decide/arquitecta* no es quien *revisa el PR*. Deja evidencia natural (PR con autor y revisor).

---

## 6. PLANTILLAS REUTILIZABLES

### 6.1 Esqueleto del README-informe de `tp-final/` (adaptado a nuestro proyecto)

Reglas de estilo extraídas de la referencia: primera persona (acá: "nosotros"), concreto, **sin marketing ni emojis**, cada afirmación verificable (archivo/función/comando), tablas para contratos, **todo código de ejemplo real**. Longitud de referencia ≈ 15 KB.

````markdown
# Trabajo Práctico Final — <Nombre>: diseñador de interiores 2D + 3D para viviendas y comercios

<2–4 líneas: qué es, para quién, qué incluye (editor 2D y 3D sincronizados, presets de vivienda/comercio, guardado de proyectos, login), stack en una línea.>
Autores: <Quispe, …> y <Villalba, …> · Repo con el historial: <url> · Deploy: <url de Vercel> · Fecha de entrega: <…>

## Cómo se ejecuta
Requisitos: Node <x>, pnpm <x>, cuenta de Supabase (o Supabase CLI local), cuenta de Vercel (solo para deploy).
1. Supabase (una sola vez): crear proyecto / `supabase start`; aplicar `supabase/migrations`; cargar `supabase/seed.sql`; activar proveedor de login <…>; cargar Redirect URLs (`http://localhost:3000/**` y el dominio de Vercel).
2. `cp .env.example .env.local` y completar. Variables públicas vs **solo servidor** (`SUPABASE_SERVICE_ROLE_KEY` nunca va al navegador ni al repo). Si falta alguna, la app no arranca y dice cuál.
3. `pnpm install` → `pnpm dev` → http://localhost:3000
4. Verificación: `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:rls` · `pnpm build`. Qué simulan los tests y qué NO cubren.
5. Deploy en Vercel: Root Directory `tp-final`, variables de entorno, previews por PR.
Problemas conocidos de entorno (puerto 3000 ocupado en Windows: cómo diagnosticar, WebGL, etc.).

## Qué construimos
- Hecho (lista corta y verificable) / **Fuera de alcance a propósito** (y por qué).
- **Qué es de terceros y qué es nuestro:** tabla `Pieza | De quién es | Qué tocamos nosotros` (Pascal Editor `@pascal-app/*` + versión exacta; three/R3F; Supabase; lo nuestro: presets, persistencia, auth, UI de …).

## Arquitectura
Árbol comentado (una línea de responsabilidad por carpeta/archivo). Dónde está el **backend** (`supabase/`, `src/app/api/…`) y dónde el frontend.
Diagrama: navegador (editor 2D/3D) ↔ módulo de persistencia ↔ Route Handlers/Server Actions ↔ Supabase (Auth, Postgres+RLS, Storage).
### Datos
Tablas/campos/relaciones; tabla de **RLS** (`Tabla | Quién lee | Quién escribe | Policy`).
### Endpoints / acciones
| Method | Path | Respuestas (todas, con su condición) |
### Contratos
1. Editor ↔ persistencia (formato de escena serializado y **versionado**; ejemplo JSON real).
2. Cliente ↔ servidor (payload y respuesta reales; qué NO viaja en el body).
3. Formato de preset (esquema + ejemplo).

## Qué decidimos nosotros
(10–14 entradas. Cada una: **decisión en negrita** → alternativas consideradas → por qué → costo que aceptamos.)
Sugeridas: Pascal Editor vs three/R3F directo · modelo de escena (qué guarda el editor y qué se deriva) · 2D y 3D como vistas de **una** fuente de verdad · formato/versionado de la escena · presets como datos · RLS vs chequeos en código · qué hace el servidor y qué el cliente · 401/403/404 con RLS · Next (App Router) vs otras · Supabase Storage para imágenes · estrategia de tests · pnpm/versiones exactas · qué dejamos fuera.
Incluir al menos **una decisión revertida** si ocurrió.

## Cómo gestionamos el contexto
Spec (`docs/superpowers/specs/…`) → plan (`…/plans/…`) → ejecución; modo plan; qué preguntas nos hizo el agente en brainstorming y qué respondimos;
CLAUDE.md jerárquicos + rules path-scoped + skill + sub-agent + comandos + permisos (por qué cada uno);
límites de tamaño de archivo y qué hicimos cuando se pasaron; commits por pieza; PR por feature;
qué hicimos cuando el contexto se llenó (`/compact`, `/clear`, sesión nueva) y qué le pasó al agente;
diferencias plan ↔ construido (el plan se dejó congelado; acá se explican).

## Cómo trabajamos con las limitaciones del modelo (clase 1)
Tabla: `Limitación (clase 1) | Riesgo concreto en este proyecto | Qué hicimos | Evidencia (archivo/commit)`
(alucinación de APIs de Pascal/three/R3F/Supabase · cutoff de conocimiento/versiones · estocasticidad · ventana de contexto · aritmética/geometría "de cabeza" · razonamiento sin tokens para pensar · "listo, funciona" sin verificar). Ver sección 7.4 de este informe.

## Qué salió mal
(4–6 casos REALES. Cada uno: **síntoma** → cómo se detectó y qué verificación previa no lo vio → causa raíz (librería/spec/entorno) → corrección (archivo y función) → lección codificada (rule/CLAUDE.md/test).)
Incluir ≥1 caso de **alucinación o deriva del agente** y ≥1 caso donde **el hueco estaba en nuestra especificación**.

## Prompts y registro del proceso
Enlace a `prompts.md` (sin editar, defectos incluidos). 3–5 prompts clave: qué intentábamos lograr / por qué está escrito así / qué devolvió / qué hicimos.
Índice de evidencia: spec, plan, PRs clave, commits clave, capturas, `.claude/`.

## Fragmentos clave del código generado
(3–5 fragmentos cortos con ruta y explicación línea a línea de por qué está así: p. ej. la función de serialización de escena, una policy RLS, el guard de sesión.) Qué corregimos del código que generó el agente.

## Observaciones arquitectónicas
Acoplamientos conocidos, deuda técnica, qué cambiaríamos con más tiempo, qué escala y qué no.

## División del trabajo y apropiación
Tabla `Área | Quién la dirigió | Quién la revisó (PR) | Quién puede defenderla`. Declaración de que ambos podemos explicar cualquier parte; qué área se leyó cruzada.

## Limitaciones conocidas y próximos pasos
````

### 6.2 Esqueletos de la configuración del agente (propuestos, inferencia salvo donde se indica)

**`tp-final/CLAUDE.md`** (secciones copiadas de la referencia): `# CLAUDE.md` → *Qué es este proyecto* (+ regla "README es el informe; si un cambio invalida una decisión narrada, se actualiza en el mismo commit"; `docs/plan.md` congelado) → *Comandos* (`pnpm install/dev/test/lint/typecheck/build`, supabase local, qué NO se automatiza) → *Dónde seguir leyendo* (tabla a los CLAUDE.md hijos y rules) → *Arquitectura* ("los contratos que sostienen el diseño": editor↔persistencia; cliente↔servidor) → ***Trampas ya pagadas*** (empezar con las de librerías: ver 7.3) → *Convenciones* (300/50 líneas, idioma, `tipo: descripción`, un commit por pieza funcional, versión de Node/pnpm, fecha de hoy y **versiones exactas** de Pascal/three/R3F/Next/Supabase para que el agente no asuma las de su entrenamiento).

**`.claude/rules/`**: `apis-de-terceros.md` (sin `paths`: **antes de usar una API de Pascal/three/R3F/Supabase, verificar que existe leyendo tipos/código en `node_modules` o la doc oficial; citar archivo y símbolo; si no se puede verificar, decirlo; nunca inventar props**) · `editor-3d.md` (con `paths: ["src/**/editor/**", …]`: el editor no importa Supabase; unidades y ejes; geometría en funciones puras testeadas) · `supabase-y-datos.md` (con `paths: ["supabase/**", "src/**/lib/supabase/**"]`: RLS siempre; nunca `service_role` en cliente; migraciones inmutables; el cliente no manda `user_id`).

**`.claude/skills/agregar-preset/SKILL.md`**: `description` "Use when adding a new interior preset…"; fases (definir slug/tipo/ambientes → seed → datos validados → registrar en catálogo → verificar en 2D y 3D con Playwright); condición de fin; anti-patterns.

**`.claude/agents/explorador.md`**: `tools: [Read, Grep, Glob]`; "citá archivo y símbolo; si no está en el código/tipos, decilo; no completes con lo razonable".

**`.claude/commands/{explicar,pre-entrega}.md`**: como en 3.8.

**`.claude/settings.json`** (esqueleto):

```json
{
  "model": "sonnet",
  "permissions": {
    "allow": [
      "Bash(pnpm install)", "Bash(pnpm dev*)", "Bash(pnpm test*)", "Bash(pnpm lint*)",
      "Bash(pnpm typecheck*)", "Bash(pnpm build*)",
      "Edit(./src/**)", "Edit(./supabase/**)", "Edit(./README.md)", "Edit(./CLAUDE.md)",
      "WebFetch(domain:nextjs.org)", "WebFetch(domain:supabase.com)", "WebFetch(domain:threejs.org)",
      "WebFetch(domain:r3f.docs.pmnd.rs)"
    ],
    "deny": [
      "Read(./.env)", "Read(./.env.local)", "Edit(./docs/plan.md)", "Bash(rm -rf *)"
    ],
    "ask": [
      "Bash(pnpm add *)", "Bash(pnpm remove *)", "Bash(git push *)",
      "Bash(supabase db reset*)", "Bash(supabase db push*)"
    ]
  }
}
```
Notas: (a) la referencia **deniega** `git push`; para trabajar con PRs conviene `ask` (inferencia); (b) `Read(./.env.*)` también bloquearía `.env.example`; afinar (inferencia); (c) agregar el dominio de la documentación **de Pascal Editor** una vez que lo identifiquen; (d) `.claude/settings.local.json` real en `.gitignore`, solo el `.example` versionado; (e) `.mcp.json` propio con Playwright (pinnear versión), y `enabledMcpjsonServers` en el local.

---

## 7. SEMANA 01 — Funcionamiento de LLMs (Karpathy, "Deep Dive into LLMs like ChatGPT")

**Fuente y estado.** `semanas/01/source_material/*.md` (9 archivos + `index.md`) son notas del video de ~3 h 31 en **inglés** (transcripción editada con títulos en español); `transcript.txt` excluido. **No hay `spine.md` ni `plan.md` de la semana 01**: lo que se dictó está en `semanas/01/slides/index.html` (en español, con notas del orador). **Las slides cubren menos que el source_material:** no tienen RLHF/reward model/adversarial examples, ni el "queso suizo" (9.11 vs 9.9), ni mensaje de sistema/autoidentidad, ni multimodalidad/agentes/test-time training/recursos, ni la conclusión "sé responsable del producto". `programa.md` Unidad 1 sí lista RLHF y "límites cognitivos". Criterio de qué manda: para **qué se dictó** manda `slides/` (as-built); para **qué conceptos deberían conocer** (programa) mandan `programa.md` + `source_material`. En ambos casos la implicancia para el TP es la misma.

### 7.1 Por archivo (formato resumido: qué enseña → qué hacer en NUESTRO TP)

**01 Introducción y datos de pre-entrenamiento** (`01-introduccion-y-datos-de-preentrenamiento.md`)
- Enseña: pipeline de pre-entrenamiento; Common Crawl (2,7 mil millones de páginas desde 2007); filtros de FineWeb (URL, extracción de texto, idioma >65 %, dedup, PII) → ~44 TB/15 T tokens (slides: se descarta ~93 %); **decisiones de curación = sesgos** (si filtrás el español, el modelo es peor en español); el modelo aprende a "imitar la textura del texto de internet".
- Hacer: asumir que **lo frecuente en internet está mejor representado que lo raro** (React/Next/Supabase básico ≫ Pascal Editor, APIs recientes). Registrar en README qué piezas son "raras" para el modelo y reforzarlas con documentación en contexto. Inferencia: prompts técnicos en español funcionan, pero conviene dejar identificadores y términos de API en inglés exacto.
- Evidencia: fila en la tabla "limitaciones del modelo" (ver 7.4).
- Trampa: creer que el modelo "sabe" la librería porque sabe React.

**02 Tokenización** (`02-tokenizacion.md`)
- Enseña: texto→bytes UTF-8→**BPE** (pares frecuentes se fusionan; vocab ~100 k; GPT-4 = 100.277); la longitud de secuencia es "un recurso finito y precioso"; el tokenizer es sensible a mayúsculas/espacios (`hello world`=2 tokens, `Hello World`=3); slides: el español consume más tokens que el inglés.
- Hacer: presupuesto de contexto consciente: archivos chicos (<300 líneas, como la referencia), no pegar documentación entera sino lo relevante, JSON de escenas/presets compactos. No delegar tareas **de caracteres** (contar, deletrear, comparar strings largos, hashes, rutas) al modelo: que ejecute un comando.
- Trampa: costo/contexto de adjuntar escenas 3D grandes.

**03 Entrenamiento de redes neuronales** (`03-entrenamiento-de-redes-neuronales.md`)
- Enseña: se predice el siguiente token dentro de una **ventana** (4 k–16 k en el ejemplo; hoy cientos de miles); el modelo da una **distribución de probabilidad** sobre ~100 k tokens; parámetros = "perillas"; **Transformer sin memoria ("stateless")**; **inferencia** = muestrear de la distribución ("tirar una moneda cargada"): *"estos sistemas son estocásticos… remixes de los datos"*.
- Hacer: **no tratar un resultado exitoso como reproducible.** Fijar lo importante en archivos (spec, plan, CLAUDE.md, tests) y no en la conversación; si algo "salió bien una vez", hay que **pinnearlo con un test** y un commit. Registrar modelo y fecha en el README (el comportamiento cambia entre modelos/versiones; inferencia). Cada turno reenvía **todo** el contexto: un contexto sucio contamina todas las respuestas siguientes (lo retoma la semana 04).
- Nota: el material **no menciona `temperature`/`top-p`**; es una inferencia que "la moneda" es controlable.

**04 Cómputo y modelos base** (`04-computo-y-modelos-base.md`)
- Enseña: entrenar es caro y se hace una vez (GPT-2: $40 k en 2019 → ~$600 hoy); luego solo **inferencia con parámetros congelados**; un **modelo base** es un "simulador de documentos de internet" (no un asistente); los parámetros son una **compresión con pérdida ("zip lossy")**: *"recuerdo vago"*, más fiel para lo frecuente (Wikipedia, ~10 épocas → regurgitación) y poco fiable para lo raro; con prefijos "del futuro" el modelo **alucina universos paralelos** (Pence/Vance, DeSantis); **cutoff** (slides: Llama 3.1 = diciembre 2023); **few-shot / in-context learning** (la secuencia dentro del contexto "enseña" el patrón).
- Hacer: (a) **cutoff ⇒ versiones**: todo lo posterior (Next/React/Supabase/Pascal nuevos) puede no existir para el modelo → **declarar versiones exactas en CLAUDE.md** y pinnear dependencias; (b) **few-shot aplicado**: indicar en CLAUDE.md/rules "usá `X.tsx` como modelo para componentes nuevos" (el agente imita el patrón que ve); (c) *regurgitación* ⇒ el modelo puede reproducir código con licencia ajena (inferencia: revisar licencias, especialmente al combinar con Pascal Editor).
- Trampa: darle al agente la fecha/versión por supuestas.

**05 Post-entrenamiento: SFT** (`05-post-entrenamiento-supervised-fine-tuning.md`)
- Enseña: el asistente sale de **continuar el entrenamiento con conversaciones** escritas por **etiquetadores humanos** que siguen instrucciones ("helpful, truthful, harmless"; hoy mucho dato sintético); protocolo de conversación con **tokens especiales** (`im_start`…); **"no hablás con una IA mágica sino con una simulación de un etiquetador promedio, experto del tema"**; el *system message* oculto también va en el contexto.
- Hacer: entender que los **defaults del agente** (stack, nombres, estructura, estilo de UI) son "la respuesta promedio del labeler" ⇒ **toda decisión que queremos defender como propia debe estar explícita en la spec** (el curso lo pide: "qué decisiones tomaste vos… en vez de aceptar lo primero que el modelo eligió por defecto"). CLAUDE.md/rules = el "system message" de nuestro proyecto (se inyecta como tokens en el contexto).
- Trampa: aceptar el primer esquema de DB/estructura de carpetas que proponga el agente.

**06 Alucinaciones y uso de herramientas** (`06-alucinaciones-y-uso-de-herramientas.md`) — *el archivo más importante para este TP*
- Enseña: **por qué alucina**: en los datos de SFT las preguntas "¿quién es X?" se responden **siempre con aplomo y con la respuesta**, el modelo imita ese estilo aunque "internamente" sepa que no sabe (Orson Kovats); **mitigación 1**: enseñarle a decir "no sé" (procedimiento de Meta: interrogar al modelo 3 veces; si no sabe, agregar "no recuerdo"); **mitigación 2**: **herramientas** (tokens especiales `search_start/end`; el sistema pausa, busca, **pega el texto en la ventana de contexto**); **parámetros = recuerdo vago (lo leído hace un mes); ventana de contexto = memoria de trabajo**; *"siempre funciona mejor si se lo das: pegá el capítulo"* (slides: demo con la letra de Cambalache; *"tomarse el trabajo de poner el contexto correcto en el prompt es uno de los hábitos más rentables de un usuario competente"*; tool use = *"devuelve texto que se vuelve contexto"*: Python, APIs, PDFs).
- Hacer (concreto): ver **protocolo anti-alucinación** en 7.3. Resumen: no pedir APIs de Pascal/three/R3F/Supabase "de memoria"; poner en contexto el README/tipos/código fuente de la versión instalada; permitir WebFetch a la doc oficial; **exigir cita de archivo y símbolo**; autorizar y exigir "no lo sé / no está en el código"; verificar con `typecheck`/tests/ejecución real.
- Evidencia: sección "Cómo trabajamos con las limitaciones" + al menos un caso real de alucinación en "Qué salió mal".

**07 Limitaciones cognitivas y tokens para pensar** (`07-limitaciones-cognitivas-y-tokens-para-pensar.md`)
- Enseña: el modelo "no tiene yo persistente: se reinicia en cada conversación"; su autoidentidad es una alucinación o un mensaje de sistema; **cómputo finito por token (~100 capas) ⇒ hay que repartir el razonamiento en muchos tokens** (la respuesta "es 3 porque…" es mala: justificación post hoc; la que desarrolla pasos intermedios es buena); **aritmética mental no confiable ⇒ "usá código"** (el intérprete es el que calcula; yo inspecciono el código); **conteo y deletreo fallan** porque ve tokens, no caracteres (strawberry); **"queso suizo"**: brillante en olimpíadas y falla en 9.11 vs 9.9: *"usalo como herramienta, no lo dejes correr suelto y copiar-pegar el resultado"*.
- Hacer: (a) **geometría y unidades** (áreas en m², conversión cm/m, intersecciones de muros, snapping, orientación de ejes, transformaciones 2D↔3D) **en funciones puras con tests**, no "de cabeza" ni dentro de un componente; pedir al agente que **ejecute** el cálculo y muestre intermedios; (b) pedir **plan/pasos antes del código** (modo plan; spec→plan: "tokens para pensar" a nivel de proceso); (c) no pedirle "la respuesta" de problemas con muchas restricciones sin cadena de pasos; (d) **verificar con ejecución real**, no con la afirmación del modelo ("los tests pasan" requiere output pegado: `15-bajada-al-tp-final.md`).
- Trampa: delegar contabilidad (cuántos elementos, qué línea) a la memoria del modelo.

**08 RL y modelos de razonamiento** (`08-reinforcement-learning-y-modelos-de-razonamiento.md`)
- Enseña: analogía escolar (exposición=pre-training; ejercicio resuelto=SFT; **ejercicio de práctica con clave de respuestas=RL**); SFT no puede descubrir las secuencias de tokens que *al modelo* le funcionan; **RL**: miles de intentos, se refuerza lo que llega a la respuesta correcta; **DeepSeek R1**: aparece *chain of thought* largo ("wait wait… let me re-evaluate"); **modelos de "thinking"** (o1/o3/R1) vs modelos SFT (GPT-4o); AlphaGo/Move 37; **RLHF**: *reward model* que simula preferencias humanas, **gameable** (adversarial examples: "the the the…" puntúa 1.0), por eso solo se corre unos cientos de pasos: *"RLHF no es RL de verdad"*; **dominios verificables vs no verificables**.
- Hacer: (a) **el código es un dominio verificable** ⇒ el "verificador" somos nosotros: tests, `typecheck`, `build`, Playwright. Diseñar el proyecto para que **todo cambio tenga un verificador automático** (TDD "rojo antes de verde": `15-bajada-al-tp-final.md`); (b) usar **modelos/esfuerzo de razonamiento más alto** para arquitectura y debugging difícil, y más barato para mecánico (la referencia usa `sonnet` en proyecto y `haiku` local; efecto de "effort" es inferencia); (c) **sesgo de aprobación (inferencia desde RLHF)**: los modelos afinados con preferencia humana tienden a decir "listo, funciona" → no confiar en autoinforme; revisar `git diff` de **tests** (un agente puede "ganarle" al verificador editando el test o especializando el caso).
- Trampa: creer que un modelo de razonamiento no alucina ("Even with RL models they're going to suffer from some of these issues", archivo 09).

**09 Futuro, recursos y conclusión** (`09-futuro-recursos-y-conclusion.md`)
- Enseña: resumen de las tres etapas; **"no confíes del todo, revisá su trabajo y sé responsable del producto"**; multimodalidad (imágenes/audio también son tokens); **agentes** y "ratio humano-agente" ⇒ el humano pasa a **supervisor**; *test-time training* ausente ⇒ **la ventana de contexto es un recurso finito y precioso**; recursos (LM Arena —"un poco gameado"—, AI News, X, Together, Hyperbolic, LM Studio).
- Hacer: (a) citar en el README esta posición ("ser responsables del producto") como el marco del reparto de roles; (b) **aprovechar la multimodalidad**: capturas de pantalla del editor 2D/3D como entrada/evidencia de verificación visual (inferencia, coherente con "an image is just a sequence of tokens"); (c) puente a la semana 04: contexto finito ⇒ CLAUDE.md/rules/sub-agents/plan mode.
- Nota: LM Arena y otros recursos son contextuales (2025); no hacen falta para el TP.

### 7.2 Mapa conceptual: de la clase 1 a cómo dirigimos al agente

| Concepto de la clase 1 | Consecuencia práctica en este proyecto |
|---|---|
| Tokens/BPE; el contexto es finito | Archivos chicos, contexto curado, no pegar docs enteras; delegar conteo/strings a comandos. |
| Estocástico (moneda cargada) | Un éxito no es reproducible: pinnear con tests/commits; spec y plan en disco; registrar modelo+fecha. |
| Transformer stateless / sin memoria entre sesiones | Todo lo que importa vive en archivos (CLAUDE.md, spec, plan, rules); cada sesión nueva arranca de cero. |
| Parámetros = recuerdo vago; contexto = memoria de trabajo | **Poner la fuente de verdad en el contexto** (tipos, README, código de `node_modules`, docs oficiales por WebFetch/MCP). |
| Cutoff de conocimiento | Declarar y pinnear versiones; desconfiar de APIs recientes/poco frecuentes (Pascal). |
| SFT = labeler promedio | Los defaults son "promedio": las decisiones que queremos defender se escriben en la spec. |
| Alucinación = aplomo aprendido | Exigir citas de archivo/símbolo y permitir "no lo sé"; verificar con ejecución. |
| Tokens para pensar | Plan antes de código; pasos intermedios; geometría con código y tests. |
| Aritmética/conteo/deletreo fallan; queso suizo | "Usá código" para todo cálculo; revisar resultados; no copiar y pegar a ciegas. |
| RL en dominios verificables | Hacer verificable cada cambio (tests, typecheck, build, Playwright); revisar que el agente no manipule el verificador. |
| Tool use = texto que se vuelve contexto | MCP/WebFetch/Playwright son fuentes de contexto: elegir cuáles y por qué (semana 07). |
| Humano = supervisor, "sé responsable del producto" | Rol y reparto explícitos; revisión cruzada. |

### 7.3 Protocolo anti-alucinación para APIs de terceros (propuesta, inferencia aplicada del material)

1. **Registrar versiones exactas** (`pnpm add -E`; lockfile; versiones en CLAUDE.md con fecha) y **por qué el modelo no puede conocerlas**.
2. **Fuente de verdad en orden de preferencia:** (a) tipos/código en `node_modules/@pascal-app/*/…` (declaraciones `.d.ts`, `README`, ejemplos del paquete), (b) README/docs oficiales **de esa versión** (WebFetch allowlist o MCP), (c) ejemplos ya funcionando en nuestro repo, (d) recién después, memoria del modelo.
3. **Regla de citas:** toda afirmación del agente sobre una API de terceros lleva `archivo:símbolo` (como el `explorador`); sin cita = no se usa.
4. **Permiso explícito de no saber:** "si no podés verificar que existe, decilo y proponé cómo verificarlo; no completes con lo razonable" (copiado del `explorador.md`).
5. **Verificación mecánica:** `pnpm typecheck` + test + ejecución real (Playwright/captura) antes de dar algo por hecho; las props inventadas suelen romper el typecheck, pero **no** lo hacen si el tipo es `any`/`unknown`: prohibir `any` en bordes con librerías (inferencia).
6. **Capa de adaptación:** encerrar cada librería de terceros detrás de un módulo nuestro (como "las escenas no conocen la API"): si la API cambia o fue inventada, el daño queda acotado y el agente carga menos contexto.
7. **Registrar cada alucinación detectada** (bitácora) con síntoma → cómo se vio → corrección → regla nueva en `apis-de-terceros.md`. Es material directo para "Qué salió mal" y para "deriva del agente" (Demo Day).
8. Riesgos esperables (inferencia): rutas/imports de paquetes que no existen, props con nombre plausible, mezcla de versiones de R3F/drei (v8 vs v9), hooks de `@supabase/ssr` vs `auth-helpers` ya deprecado, App Router vs Pages Router, `cookies()` síncrono vs asíncrono según versión de Next, coordenadas Y-up de three.js, unidades.

### 7.4 Qué advertencias registrar en el README (sección propuesta "Cómo trabajamos con las limitaciones del modelo")

| Limitación (clase 1, archivo) | Riesgo en nuestro proyecto | Qué hacemos | Evidencia a linkear |
|---|---|---|---|
| Alucinación con aplomo (06) | API inventada de Pascal/three/Supabase | Protocolo 7.3; citas; typecheck | `.claude/rules/apis-de-terceros.md`, caso en "Qué salió mal" |
| Cutoff y recuerdo vago (04, slides) | Versiones nuevas; APIs cambiadas | Versiones exactas; docs en contexto | `package.json`, `CLAUDE.md` |
| Estocasticidad (03) | "Anduvo una vez" | Tests; commits chicos; spec/plan en disco | Tests, historial |
| Contexto finito / sin memoria (03, 06, 09) | El agente olvida/deriva | CLAUDE.md jerárquico; sub-agent explorador; `/clear` entre tareas | `.claude/` |
| Un token = cómputo fijo (07) | Errores en cálculo/geometría | Funciones puras + tests; "usá código" | tests de geometría |
| Aritmética/conteo/deletreo (07) | Conversión de unidades, contar elementos | Ejecutar, no estimar | scripts/tests |
| Aprobación fácil / RLHF gameable (08) | "Listo" sin verificar; tests manipulados | `verification-before-completion`; revisar diff de tests | `/pre-entrega`, PRs |
| Defaults = labeler promedio (05) | Arquitectura "por defecto" | Decisiones explícitas en spec; sección "Qué decidimos" | spec, README |
| Queso suizo (07, 09) | Fallos aleatorios en lo "fácil" | Revisión cruzada; Playwright | PRs con revisor |

---

## 8. `programa.md` — qué se exige

**Objetivos (5):** (1) intuición de LLMs: tokenización, estocasticidad, pre/post-training, RLHF, causas de alucinaciones y límites del razonamiento; (2) estructura del software (frontend/backend/APIs/datos), **contratos OpenAPI**, git y GitHub Flow; (3) operar entornos agénticos: loop *pensar→actuar→observar*, **ventana de contexto como recurso**, configurar el runtime (memoria, reglas, permisos, skills, sub-agentes, modo plan); (4) extender/integrar: plugins, **spec-driven development**, **MCP**; (5) pensamiento computacional: descomponer en **especificaciones y planes verificables**; rol de **supervisor arquitectónico** sobre código "funcional, robusto, seguro y alineado con las mejores prácticas".

**Contenidos mínimos:** LLMs y arquitecturas agénticas · patrones de diseño y arquitectura web · ingeniería de prompts, contexto y *harness* · desarrollo agéntico y flujos autónomos · **robustez, verificación y calidad de código**.

**Unidades (6) y cierre:** 1 LLMs · 2 frontend (trío web; single-file; 4 patrones de prompt; ciclo **Architect→Prompter→Reviewer→Tester**) · 3 backend/datos/contratos (HTTP, REST, SQL/NoSQL, lectura de 4xx/5xx/logs, OpenAPI) · 4 desarrollo agéntico y runtime (CLAUDE.md jerárquico, rules, settings.json, **permisos allow/deny/ask**, skills y slash commands, sub-agentes, modo plan) · 5 plugins y **spec-driven development** (flujo: diseño por preguntas, planes ejecutables, sub-agentes, **TDD**, revisión de código, **verificación con evidencia**, cierre de rama; git y GitHub Flow; *calidad, testing y verificación son transversales en la Unidad 5*) · 6 MCP (N×M→N+M, host/cliente/servidor, primitives, Stdio vs Streamable HTTP, scopes, riesgos). **Cierre:** consigna del TP final, **exposición temprana de la idea (clase 5) con devolución de alcance y viabilidad**, **defensa del proceso en el Demo Day: "cómo se especificó qué construir, cómo se gestionó el contexto al crecer el proyecto y cómo se detectó y corrigió la deriva del agente"**; apropiación = "explicar, corregir y extender el código generado, para evitar el síndrome de la caja negra y garantizar mantenimiento y escalabilidad".

**Modalidad de evaluación (literal en lo que importa):** "3 trabajos prácticos de carácter individual, entregados mediante un único repositorio público de GitHub… con una carpeta por entrega. El README.md… funcionará como informe… deberá contener el registro del proceso de desarrollo asistido (**especificación inicial, prompts principales, manejo de contexto y corrección de desvíos del modelo**), **las decisiones de arquitectura tomadas por el estudiante, fragmentos clave del código generado, instrucciones para ejecutar el proyecto y observaciones arquitectónicas**. A partir de la Unidad 5 se espera además que el repositorio conserve la **evidencia del proceso: especificación y plan en disco, historial de commits, ramas y pull requests**. El tercer trabajo práctico tiene carácter de TP Final y debe ser expuesto en la última clase (Demo Day)."

**Demo Day (semana 8):** *"Exposición del MVP funcional. Defensa del proceso: especificación, gestión de contexto, detección y corrección de la deriva del agente, y evidencia del flujo de trabajo en el repositorio. Apropiación tecnológica: comprensión estructural y lógica del código para evitar la 'caja negra', garantizando mantenimiento y escalabilidad."* **No hay rúbrica formal ni formato (duración, slides, demo en vivo vs deploy) en el material**; `semanas/08/source_material/index.md` es un stub (con restos de terminología vieja: "ciclo de vibe coding"; palabra que el propio `semanas/00/plan.md` prohíbe en los decks), y `14-trabajo-final.md` dice "rúbrica formal… se entrega en otro momento".

**Modalidad de cursada:** 8 clases de 3 h; demos en vivo en terminal compartida desde la Unidad 4; "detectar alucinaciones y deriva del agente" se menciona explícitamente como objeto de análisis.

**Bibliografía a la que apelar en README (cita fácil):** [1] Karpathy *Deep Dive into LLMs like ChatGPT*; [2] docs de Claude Code (memoria, settings, permisos, sub-agentes, skills, plugins); [3] superpowers (github.com/obra/superpowers); [4] modelcontextprotocol.io; [5] OpenAPI.

---

## 9. Trampas y anti-patrones que advierten estas clases (y cómo evitarlas)

| Trampa (fuente) | Cómo evitarla en nuestro proyecto |
|---|---|
| "Que funcione no alcanza"; caja negra (02, programa) | Defensa por diseño: cada integrante explica cualquier archivo; `/explicar`; revisión cruzada. |
| Repo con 1 commit / historial fabricado (02) | Commits chicos desde la hora 0; rama+PR por feature; spec/plan **antes** del código. |
| Repo privado (03) | Público desde el día 1; secretos fuera (`.env*` en `.gitignore`). |
| Aceptar el default del modelo (02, 05) | "Qué decidimos" con alternativas; spec con decisiones explícitas. |
| Prompt con contradicciones/referencias huérfanas (tp1) | Releer spec/prompt cruzando secciones antes de ejecutar; `brainstorming` por preguntas de a una. |
| Copiar contexto equivocado al body (tp2: "el path identifica, el body transporta") | Contratos sin duplicar datos (id de proyecto en path o en body, no en ambos). |
| Probar de forma que **esconde** el bug (Tetris: pausas) | Casos límite y ráfagas; contar llamadas; leer respuestas crudas. |
| Mocks que dan falsa seguridad (logout) | Verificación real en navegador/deploy además de tests; documentar qué simulan los tests. |
| Bug invisible porque "todo anda" (fecha sin zona) | Leer JSON/DB crudos; tests de contrato. |
| Perseguir el código cuando el problema es el entorno (worker huérfano) | Verificar qué proceso responde antes de re-editar. |
| Hueco en la spec, no en el código (Snake) | Spec con estados iniciales/finales y comportamientos de arranque; revisar la spec ante conducta rara. |
| Plan que "se sincroniza" a mano y pierde evidencia | Congelar plan (deny en settings) y explicar diferencias en README. |
| README que describe el diseño original, no el real | `/pre-entrega`; actualizar README/CLAUDE.md **en el mismo commit**. |
| Orden de middlewares/montajes que falla en silencio | Tests de acceso (anónimo/logueado), `matcher` documentado. |
| Alucinación de APIs/versiones (clase 1) | Protocolo 7.3. |
| Cálculo "de cabeza" (clase 1) | Funciones puras + tests; "usá código". |
| Autoinforme optimista del agente (RLHF) | Output real de verificación pegado en PR; revisar diff de tests. |
| Alcance excesivo en 2 días | Vertical slice completa (editor→persistencia→deploy) antes de amplitud; lo no hecho, listado como "fuera de alcance". La corrección heredada pesa completitud mínima + evidencia (hallazgo 2). |
| Archivos enormes (contexto) | <300 líneas / <50 por función; separar apenas se pase (la referencia lo hizo). |

---

## 10. Ambigüedades, contradicciones y desactualizaciones (con criterio de cuál manda)

| # | Tema | Fuentes en conflicto | Qué manda y por qué |
|---|---|---|---|
| 1 | **Individual vs grupo** en TP Final | `programa.md`, `semanas/00/.../02-como-se-aprueba.md`, slides S00 ("incluida la última") vs `semanas/04/.../14-trabajo-final.md` (nota 2026-09-23: grupos de 2 o 3, `tp-final/` en el repo de uno, defensa conjunta) | Manda semana 04: fechada, posterior y específica del TP Final. **Confirmar con el docente** (cómo se evalúa lo individual; el argumento anti-"hueco del otro" sigue vigente). |
| 2 | **"MVP funcional" vs app final** | `programa.md` (semana 8: "MVP funcional") y `semanas/08/source_material/index.md` vs `02-como-se-aprueba.md` ("aplicación completa, con interfaz, servidor y datos") | No son excluyentes: el mínimo exigido es app funcional completa (frontend+backend+datos); más alcance es opcional. Priorizar vertical slice. |
| 3 | **Duración/estructura del bloque S00** | `semanas/00/source_material/index.md` (~15 min) vs `spine.md`/`plan.md` (~10 min, 5 slides) | Manda `plan.md` (as-built). Irrelevante para el TP. |
| 4 | **Slides S01 vs source_material S01 vs programa** | Slides sin RLHF/queso suizo/agentes; source y programa sí | Para el TP no cambia la lección. No hay `spine/plan` S01. |
| 5 | **`settings.json` "sin env"** | `semanas/04/.../09-settings-json.md` vs `[TPF]` (usa `.env` de Auth0) | Manda `[TPF]` (2026-09-29). |
| 6 | **Rúbrica** | `.claude/skills/grading/*` (cohorte 04–06/2026: "no juzga calidad") vs "rúbrica formal se entrega después" | Usarla como mejor evidencia, no como regla segura. |
| 7 | **"Qué se entrega como prompts en el final"** | `programa.md` pide prompts principales; `[TPF]` no tiene `prompts.md` | Incluir `prompts.md` igual (cumple el texto literal; bajo costo). |
| 8 | **OpenAPI en el final** | TP2 lo exige; la rúbrica heredada no descuenta; `semanas/04/rules` demo menciona "regenerar openapi.yaml" | Opcional; tabla de endpoints en README alcanza. Preguntar. |
| 9 | **MCP de Playwright en el `tp-final`** | `settings.local.json.example` habilita `playwright` pero el `[TPF]` no trae `.mcp.json`; el del curso está en la raíz del repo del curso | Crear `.mcp.json` propio; alinear con lo que enseña semana 07. |
| 10 | **Spec de superpowers en inglés** | `[TPF]/README` ("tal como los generó el agente") | Aceptable; documentar el idioma. |
| 11 | **Spec "faltante"** | `docs/superpowers/specs/` vacío en el checkout | Es *sparse checkout*; el archivo existe en git (leído con `git cat-file`). |
| 12 | **`git push` denegado en la referencia** | `settings.json` deny `git push *` | Para PRs conviene `ask` (inferencia). |
| 13 | **Pascal Editor** | Ausente del material | Sin fuente; tratar como alto riesgo; preguntar al docente si usar una base de terceros afecta la evaluación de "lo propio". |

---

## 11. TOP 10 — Cosas de estas clases que NO pueden faltar en nuestro repo

1. **Repo público, historial continuo desde la hora 0**: ramas `feature/*`, un commit por pieza funcional con mensajes `tipo: descripción` que explican el porqué, y **PRs** (con revisión cruzada) — `02-como-se-aprueba.md`, `15-bajada-al-tp-final.md`.
2. **`tp-final/README.md` como informe** con las secciones de la plantilla 6.1: Cómo se ejecuta · Arquitectura (contratos con payload real) · **Qué decidimos nosotros** · **Cómo gestionamos el contexto** · **Qué salió mal** (reales) · **Fragmentos clave** · **Observaciones arquitectónicas** (los dos últimos exigidos literalmente por `programa.md`).
3. **Spec y plan en disco, anteriores al código** (`docs/superpowers/specs/…` y `plans/…`, generados con `brainstorming`/`writing-plans`) + `docs/plan.md` congelado si hacen una pasada en modo plan; README explica las diferencias plan↔construido. (Rúbrica: señal de superpowers = +1.)
4. **`CLAUDE.md` raíz + hijos (editor, supabase) con "Trampas ya pagadas"** — requisito explícito de la rúbrica heredada (−1 si falta) y pieza central de la gestión de contexto.
5. **`.claude/` versionado y propio del dominio**: `settings.json` (allow/deny/ask con sentido: deny `.env*`, plan congelado; allow de docs oficiales), `settings.local.json.example`, `.mcp.json` (Playwright), rules path-scoped, **skill `agregar-preset`**, sub-agent `explorador` (solo lectura, cita archivo:símbolo), `/explicar` y `/pre-entrega`.
6. **Decisiones propias con alternativa y costo**, incluyendo qué es de **Pascal Editor** y qué es nuestro, el contrato **editor↔persistencia** (formato de escena versionado), el modelo de datos + **RLS**, y 401/403/404.
7. **Protocolo anti-alucinación de APIs de terceros** (versiones exactas, tipos/`node_modules` como fuente de verdad, citas, capa de adaptación, regla en `apis-de-terceros.md`) y **al menos un caso real de alucinación/deriva documentado** — es lo que `programa.md` pide defender ("cómo se detectó y corrigió la deriva del agente").
8. **Verificación real y automática**: tests que pinean contratos (geometría/serialización/validadores, RLS con dos usuarios, guard de sesión, variables de entorno), Playwright con capturas del 2D/3D, output de verificación citado en cada PR; deploy en Vercel con preview por PR. Documentar qué simulan los tests (lección del logout).
9. **Seguridad de repo público**: `.env*` ignorado, `.env.example` con nombres, `service_role` solo en servidor, falla de arranque que nombra la variable faltante (con test).
10. **Defensa de a dos**: tabla "División del trabajo y apropiación" + revisión cruzada de PRs + ensayo del Demo Day donde cada uno explica el *otro* tramo y hace un cambio pequeño en vivo (p. ej. agregar un preset con la skill). Registro de desvíos (`docs/bitacora.md`) alimentado durante el desarrollo, no reconstruido al final.

---

## 12. Preguntas abiertas para el docente

1. **Equipos:** ¿se confirma que el TP Final es de a 2 (nota del 2026-09-23)? ¿En el repo de cuál de los dos va `tp-final/`? ¿Cómo se evalúa lo individual (commits/PRs por persona, defensa por persona)? ¿Cada uno debe seguir teniendo su repo personal para TP1/TP2?
2. **Qué cuenta como "backend":** con Next.js + Supabase (Route Handlers/Server Actions + Postgres/RLS/Auth, sin servidor propio tipo FastAPI/Express), ¿se considera "frontend + backend"? ¿Hace falta una carpeta/servicio de backend explícito?
3. **Rúbrica formal y peso:** ¿se mantiene el esquema de la cohorte anterior (completitud + evidencia; `CLAUDE.md` obligatorio; bonus por superpowers)? ¿Qué peso tiene el README vs el producto vs el Demo Day?
4. **Demo Day:** fecha, duración, formato (¿demo en vivo local, en el deploy de Vercel o grabada?), ¿slides?, ¿se evalúa explicar y modificar código en vivo?
5. **Alcance/dominio:** ¿el diseñador de interiores 2D+3D con presets de viviendas y comercios es aceptable en alcance? "MVP funcional" (programa) vs "aplicación final": ¿qué mínimo esperan? ¿Ya pasó la fecha de exponer la idea (clase 5) y hay que hacer algo si no se presentó?
6. **Base de terceros (Pascal Editor, `@pascal-app/*`):** ¿es válido apoyarse en un editor existente? ¿Cómo se evalúa "apropiación" cuando gran parte del editor no es nuestro? ¿Hay que acotar y declarar qué es propio?
7. **Stack/deploy:** ¿se exige/valora el deploy en Vercel o alcanza con correr local? ¿Se puede usar un proyecto de Supabase cloud con repo público (claves anon visibles; service_role fuera)?
8. **Artefactos de contrato:** ¿se espera `openapi.yaml` en el TP Final o alcanza la tabla de endpoints del README?
9. **Prompts:** ¿se espera un `prompts.md` en el final (la referencia no lo trae)? ¿Alcanza con spec+plan+commits como registro?
10. **Superpowers y evidencia:** ¿spec/plan en inglés (como los genera el agente) son aceptables? ¿Se espera ver PRs mergeados (GitHub Flow completo) o alcanza con ramas+commits?
11. **MCP/herramientas:** ¿hay expectativa sobre qué MCP usar en el TP (Playwright, Supabase MCP, etc.) y en qué scope (`.mcp.json` de proyecto)?
12. **Calendario real:** con ~2 días, ¿hay hitos intermedios o entregas parciales? (la nota de la semana 04 dice "se comunica por separado").

---

## Apéndice — Checklist de pre-entrega derivado de `/pre-entrega` (para correr antes de entregar)

- [ ] `git status` limpio; `.env*` sin trackear; `settings.local.json` ignorado.
- [ ] README: todas las secciones de 6.1; ninguna decisión narrada quedó obsoleta; "Qué salió mal" real; tablas de contratos al día.
- [ ] `docs/plan.md` sin modificar; spec/plan en `docs/superpowers/`.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` sin warnings; output pegado en el último PR.
- [ ] Deploy de Vercel arriba; login real probado por una persona; Redirect URLs correctas.
- [ ] CLAUDE.md/rules/skill/sub-agent describen el código como quedó.
- [ ] Cada integrante puede explicar cualquier carpeta; ensayo de cambio en vivo hecho.

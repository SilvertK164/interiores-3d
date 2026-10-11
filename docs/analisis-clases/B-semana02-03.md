# Informe B — Semana 02 (frontend) y Semana 03 (backend, datos y contratos)

Proyecto: diseñador de interiores 2D+3D (Next/React + Vercel + Supabase + pnpm + Pascal Editor).
Alcance: `semanas/02/**` y `semanas/03/**` del repo del curso, más la lectura de la rúbrica (`.claude/skills/grading/`) y de los ejemplos resueltos (`semanas/00/source_material/apellido-iisaia/`) cuando hicieron falta para contrastar.

---

## 0. Cómo leer este informe

**Rutas.** Todas relativas a la raíz del repo del curso (`iisaia-course/`). Ejemplo: `semanas/03/source_material/05-datos-relaciones-vs-documentos.md`.

**Qué manda cuando hay contradicción** (se repite en cada caso puntual, y se consolida en §6):

1. `semanas/NN/spine.md` y `plan.md` son la descripción canónica de lo que se dictó. El `plan.md` de la semana 02 dice explícitamente que fue "alineado contra `slides/index.html` tal como existe hoy". Mandan sobre los `source_material/*.md`.
2. `source_material/*.md` es el contenido explicado. Manda sobre `programa.md`, que es el programa oficial pero más viejo y más genérico.
3. Para equipos: `semanas/04/source_material/14-trabajo-final.md` (nota "Estado (2026-09-23)": grupos de 2 o 3, `tp-final/` en el repo de uno de los integrantes, defensa conjunta) manda sobre `semanas/00/source_material/02-como-se-aprueba.md` ("los tres son individuales").
4. Para la corrección: lo que ejecuta `grading_lib.py` manda sobre `rubric.md`, y `rubric.md` manda sobre el diseño anterior `docs/superpowers/specs/2026-06-22-grading-skill-design.md`.

**Marcas.** "(inferencia)" = lo deduje yo, no está en el material. "(verificar)" = depende de versión/producto externo (Supabase, Vercel, Pascal) y no lo pude comprobar en esta sesión.

**Qué se traslada.** El material de referencia usa FastAPI + SQLite + HTML/JS vanilla. En cada clase marco con **[TAL CUAL]**, **[ADAPTAR]** o **[NO APLICA]** qué conceptos pasan a Next/React + Supabase.

**Experimento hecho.** Copié `grading_lib.py` fuera del repo del curso y corrí `detect_repo` sobre repos de juguete (Next+Supabase solo, + Fastify, + Hono, + FastAPI, etc.). Resultados en §4. No se tocó nada dentro de `iisaia-course`.

---

## 1. Resumen ejecutivo

- **Semana 02** enseña vocabulario para *dirigir* a la IA (no para escribir sintaxis): cinco capas (estructura, estilo, comportamiento, estado, empaque), cuatro patrones de prompt (P1 describir artefacto, P2 iterar sobre estado, P3 arreglar layout, P4 tematizar) y el ciclo Architect → Prompt → Review → Test. El latido de la clase: "vago es lotería, específico es determinismo".
- **Semana 03** es el espejo en el servidor: HTTP, REST, endpoint como **contrato de cinco piezas** (method, path, schema-in, schema-out, códigos), datos (relacional por defecto, documento cuando el patrón lo pide), errores (4xx = cliente, 5xx = servidor, logs y stack traces como evidencia), y **OpenAPI** como contrato hecho archivo. El TP2 es "dictale a una IA el `openapi.yaml` de tu dominio".
- **Para nuestro proyecto lo más rentable** de estas dos semanas es: (1) un `openapi.yaml` de nuestra propia API dictado *antes* de implementar; (2) justificar el modelo de datos con los criterios de `05-datos-relaciones-vs-documentos.md` (relacional por defecto + `jsonb` para la escena porque "siempre se lee todo junto"); (3) escribir los **estados** (shell, escena, servidor) con transiciones de ida *y vuelta* antes de pedir UI; (4) un README con "Qué decidí yo" y "Qué salió mal" apoyados en evidencia leída (respuesta cruda, logs), porque eso es lo que más pesa al corregir.
- **Riesgo grande y concreto:** el detector de la rúbrica (`grading_lib.py`) solo reconoce backend si en algún `package.json`/`requirements.txt`/`pyproject.toml` aparece `fastapi, flask, django, uvicorn, express` o `fastify`. Un repo "Next + Supabase" da frontend=sí, backend=no, y la nota sugerida baja 2 puntos ("final incompleto"). Lo confirmé con una simulación (§4). El docente confirma la nota, pero conviene no depender de eso: hay que tener un backend **genuino y visible** (propuestas en §4.3).
- **Hallazgo de desactualización:** las clases 02, 03 y 06 de la semana 03 mandan la autenticación y los 401/403 a "semana 7", pero el programa oficial pone MCP en la semana 7 y `semanas/07/source_material/index.md` es un placeholder. **No hay clase de auth en el material**: las decisiones de Supabase Auth/RLS son enteramente nuestras y hay que documentarlas como tales.

---

# PARTE I — SEMANA 02: ARQUITECTURA FRONTEND

Fuentes: `semanas/02/spine.md`, `semanas/02/plan.md`, `semanas/02/source_material/{index,01..07}.md`, `demo.html`.

**Hilo conductor** (`spine.md`): ser supervisor arquitectónico exige vocabulario; cada sección de anatomía (§2–§5) cierra con un slide "Cómo le pedís X a una IA" (prompt vago vs con vocabulario). Decisiones transversales del `plan.md`: sin JS propio en el deck, `demo.html` se abre en pestaña nueva, el cierre "vago vs específico" siempre es lo último de cada sección. **Dato de proceso:** la actividad de cierre (TP1) es individual, un `index.html`, una conversación de Gemini Canvas; entregable `tp1/{index.html,prompts.md,README.md}`.

---

## 2.1 Clase 01 — Frontend y el supervisor arquitectónico
Archivo: `semanas/02/source_material/01-frontend-y-el-supervisor.md`

### 1. Qué enseña
- **Frontend** = la capa con la que trata una persona: recibe lo que hace (click, tipeo) y devuelve algo visible. Cuatro tipos: web, móvil, escritorio, terminal. Se trabaja web "porque no hace falta instalarlo".
- **Un frontend no muestra todo lo que el sistema puede hacer: muestra lo que alguien decidió que se puede hacer y en qué orden.** "Cada botón que existe, y cada botón que no existe, son decisiones."
- **Tesis:** si la IA escribe el código, "el cuello de botella ya no es la sintaxis, es la decisión". El rol es **supervisor arquitectónico**: la IA es el equipo de implementación, vos dirigís.
- **Tres cosas que se mueven al delegar la sintaxis:** (1) la velocidad de iteración explota, y con ella las malas decisiones ("más basura en menos tiempo"); (2) el costo de especificar mal sube: "la IA no hace lo que querías; hace exactamente lo que pediste" (ejemplo: "centrado" puede ser flex, grid o `margin: 0 auto`); (3) leer pesa más que escribir (el 80/20 se invierte; cada respuesta es un texto a auditar).
- **Vocabulario técnico** = "saber cómo se llaman las cosas" para pedir con precisión.
- **Anatomía en cinco capas** (el roadmap de toda la clase): estructura (HTML), estilo (CSS), comportamiento (JS), estado, empaque (single-file).
- **Qué NO es la clase:** no enseña HTML/CSS/JS de producción; enseña a nombrar para dirigir y a leer la respuesta sin "tragarse un error".

### 2. Qué hacer en NUESTRO TP
- **[TAL CUAL]** Rol y tesis: declararlo en el README (sección "Cómo trabajamos") y en el `CLAUDE.md` raíz como regla: "el agente implementa; las decisiones de arquitectura las dictamos nosotros y quedan por escrito (spec/plan) antes del código".
- **[TAL CUAL]** Las cinco capas como mapa mental para el shell; ver tabla de traducción en §2.9.
- **Acción verificable:** crear `docs/decisiones-ui.md` (o sección del README) con la tabla "qué se ve, qué NO se ve, en qué orden" del shell: selector de proyecto, chips de ambientes, dock de modos, panel de propiedades/catálogo. La clase dice que cada botón presente/ausente es una decisión; ahí la volvemos explícita (inferencia: la clase no pide ese archivo, pero es la forma de volver defendible la idea).
- **[ADAPTAR]** "Frontend web" de la clase = HTML/DOM. En nuestro caso el 3D es un `<canvas>` (WebGL) que NO es HTML semántico: el vocabulario de la clase aplica al **shell** (React/DOM) y no al interior del canvas. Hay que decirlo en el README para que no parezca que ignoramos la semana 02.
- **[NO APLICA]** Los otros tipos de frontend (móvil/escritorio/terminal).

### 3. Evidencia/documentación
- README: sección "Decisiones que tomé yo" con ≥ 3 decisiones de UI/estado que NO fueron el default del modelo. `semanas/02/source_material/07-actividad-practica.md` lo dice sin vueltas: "si está vacía, quiere decir que aceptaste lo primero que salió".
- `prompts.md` (o `docs/prompts.md`) con los prompts de dirección, no solo los de código.

### 4. Trampas
- Aceptar decisiones que no tomaste (el ejemplo de "centrado" ambiguo). En nuestro caso: que el agente decida solo si el dock de modos es `<div>` con `onClick`, dónde vive el modo activo, o cómo se persiste la selección.
- Iterar rápido sin leer: "producís más basura en menos tiempo".

### 5. Ambigüedades
- La clase 07 de esta semana y `programa.md` discrepan sobre si la actividad es individual o grupal (ver §6). El `spine.md` y la clase 07 mandan: individual (TP1). Para el TP final manda la nota del 2026-09-23 de `semanas/04/source_material/14-trabajo-final.md`: grupos de 2–3.

---

## 2.2 Clase 02 — Estructura: HTML como sustantivos
Archivo: `semanas/02/source_material/02-estructura-html.md`

### 1. Qué enseña
- **HTML semántico** = usar la etiqueta que dice qué *es* cada bloque, no qué *parece*. El HTML se trata de nombrar, no de que "se vea bien".
- Lo leen muchos lectores y casi ninguno es humano: navegadores, lectores de pantalla, buscadores, IAs, el desarrollador de dentro de seis meses.
- **`<div>` no significa nada.** `<header>` vs `<div class="header">` se ven igual, pero el **outline del documento** solo existe con semántica.
- **Siete contenedores estructurales:** `header`, `main` (único por documento), `section` (bloque temático con título), `article` (unidad autocontenida: post, tarjeta, comentario), `nav`, `footer`, `aside`.
- **Contenido:** `h1–h6` (un `h1` por página), `p`, `ul/ol/li`, `a href`, `img alt` (siempre texto alternativo).
- **Interacción:** `button`, `input` (según `type`), `form`, `label` ("sin label no hay accesibilidad").
- **El mal hábito: "div soup".** Pasa por el camino fácil, y "cuando un LLM genera código sin instrucciones precisas" es el resultado por defecto.
- **Prompt con vocabulario:** darle al modelo el *outline* ("`<header>` con `<nav>`…; `<main>` con `<section>` + `<form>`…") para que solo rellene.

### 2. Qué hacer en NUESTRO TP
- **[ADAPTAR]** En React/JSX todo esto sigue valiendo: el JSX compila a HTML real. Reglas concretas para el `CLAUDE.md` de `frontend` (o `app/`) y para los prompts P1:
  - Shell: `<header>` (logo + selector de proyecto), `<nav aria-label="Ambientes">` para los chips, `<main>` contiene el área del canvas, `<aside>` para propiedades/catálogo, dock de modos como `<nav aria-label="Modos">` o `role="toolbar"` (inferencia: la clase no entra en ARIA, pero la semántica que pide encaja).
  - Cada tarjeta de proyecto = `<article>`; la lista = `<section>` con `<h2>`; los chips = lista de `<button>` con `aria-pressed` (no `<div onClick>`); formularios con `<form>`, `<label>` + `<input>`.
  - El canvas: `<canvas>` no es semántico; darle `aria-label` y, si se puede, una lista alternativa de ambientes (los chips ya cumplen ese rol) (inferencia).
- **Acción verificable:** regla en `.claude/rules/ui.md` con `paths: ["app/**/*.tsx","components/**/*.tsx"]` (mecanismo de la semana 04 `08-rules.md`; otro analista lo cubre): "no usar `<div>` clickeable; usar los 7 contenedores y los 4 elementos de interacción; imágenes con `alt`; inputs con `label`".
- **Acción verificable:** lint de a11y (inferencia: `eslint-plugin-jsx-a11y` viene en la config de Next) y una prueba rápida con Playwright que chequee roles/nombres accesibles de los chips y del dock.
- **[NO APLICA]** El toggle "semántico ↔ sopa de divs" de `demo.html` es didáctico; no hay que replicarlo.

### 3. Evidencia/documentación
- README → "Decisiones": por qué esos elementos para el shell (una línea por pieza).
- `prompts.md`: al menos un prompt P1 donde se vea el *outline* con etiquetas nombradas (como el de contacto de la clase).

### 4. Trampas
- LLMs que devuelven `div` + Tailwind por defecto. Antídoto: nombrar etiquetas en el prompt.
- Sin `label` ni `alt` → inaccesible (se nota al probar con teclado).
- Quedarse con "se ve igual, entonces está bien": la clase insiste en que el navegador/lector de pantalla ve otra cosa.

### 5. Ambigüedades
- El título del apartado dice "Los doce sustantivos que importan", pero la lista suma 7 contenedores + 5 de contenido + 4 de interacción; el `spine.md` solo se queda con "las siete etiquetas estructurales". Detalle menor; manda el spine.

---

## 2.3 Clase 03 — Estilo: cuatro primitivas de CSS
Archivo: `semanas/02/source_material/03-estilo-css.md`

### 1. Qué enseña
- **Cuatro primitivas alcanzan para dirigir:** modelo de caja, layout, tipografía/color, variables CSS. "El resto se delega."
- **Modelo de caja:** content → padding → border → margin. "Dale más aire" es ambiguo; "16px de padding interno al `<button>`" no.
- **Layout:** **Flexbox** = una dimensión (`flex-direction`, `justify-content`, `align-items`, `gap`); **Grid** = dos dimensiones (`grid-template-columns`, `gap`). Nombrar *flex* o *grid* evita que la IA improvise con `inline-block`/floats.
- **Tipografía y color:** `font-family` (una sans para todo, o pareja heading serif + body sans); paleta mínima de cuatro tonos (fondo, texto, acento, acento 2). "Que se vea moderno" → genérico; hex concretos → exacto: "la diferencia entre dirigir y rezar".
- **Variables CSS (custom properties) en `:root`:** "una variable es un punto de entrada" que el LLM modifica sin reescribir todo; "cambiá el acento a verde" = una línea (si no hay variables, hay que reemplazar veinte ocurrencias a mano con riesgo de romper algo). Es "el patrón que querés que tu código tenga siempre".
- `demo.html` implementa esto: `:root` con tokens (`--color-bg`, `--space-*`, `--radius`, `--font-*`, `--transition`) y un "combo" donde un preset cambia todas las variables locales a la vez (`style.setProperty`).

### 2. Qué hacer en NUESTRO TP
- **[TAL CUAL]** Variables CSS como contrato de tema. Acción verificable: un único archivo de tokens (`app/globals.css` o `styles/tokens.css`) con `:root { --color-bg, --color-surface, --color-text, --color-muted, --color-accent, --space-xs..xl, --radius, --font-body, --font-mono, --transition }` y un bloque `[data-theme="dark"]`. Prohibido en `.claude/rules/ui.md`: colores/espacios hardcodeados en componentes.
- **[ADAPTAR]** Si usamos Tailwind v4, los tokens se declaran con `@theme` y terminan siendo variables CSS (verificar sintaxis de la versión instalada). La idea de la clase (cambiar una variable cambia todo) se mantiene; lo que cambia es que en JSX aparecen clases utilitarias. Regla: las utilidades referencian tokens (`bg-[--color-surface]` o tokens del `@theme`), no hex sueltos.
- **[ADAPTAR — punto crítico para 3D]** **El canvas no hereda CSS.** Los materiales/colores de three.js (fondo del viewport, grilla 2D, color de selección/hover, colores de zonas) no leen `var(--color-accent)` solos. Hay que tener un módulo `theme3d.ts` que lea los tokens con `getComputedStyle(document.documentElement)` y se vuelva a calcular al cambiar el tema. El ejemplo resuelto del curso tiene exactamente esta trampa (`semanas/00/source_material/apellido-iisaia/tp-final/frontend/CLAUDE.md`, sección CSS: "Los colores de los juegos no salen de acá… porque Phaser dibuja en canvas") — la solución del curso fue aceptarlo y documentarlo; la nuestra puede ser el puente.
- **[TAL CUAL]** Layout: grid para el marco de la app (header / sidebar / canvas / dock) y flex para filas de chips y barras. Nombrarlo en P3. Cuidado con `min-height: 0`/`min-width: 0` en hijos de grid/flex que contienen el canvas (si no, el canvas no se achica) (inferencia).
- **[TAL CUAL]** Chequeo AA de contraste en P4 (la clase lo hace explícito: "asegurate que el contraste… sea AA-accesible").
- **Acción verificable:** theme switcher mínimo (claro/oscuro) como en `demo.html` §2 "Primitiva 4", persistido (inferencia) y que a la vez repinte el canvas.

### 3. Evidencia/documentación
- README → "Decisiones": paleta/tokens elegidos y por qué; cómo se resolvió el puente CSS↔3D.
- Captura de pantalla de dos temas (inferencia: sirve para el Demo Day).

### 4. Trampas
- "Hacelo más lindo" / "moderno": el modelo inventa. Antídoto: hex, escala de espacios, familias de fuente.
- Hex incrustados por todos lados: cambiar el tema deja de ser una línea.
- Inventar clases utilitarias de Tailwind que no existen (revisar en Review).

### 5. Ambigüedades
- `demo.html` numera sus secciones 1–5 (Estructura, Estilo, Estado, DOM, Single-file) y las clases 02–05 dicen "§2 Estilo", "§3 Estado": numeración distinta pero el contenido coincide. Sin impacto.

---

## 2.4 Clase 04 — Estado, DOM y eventos: el triángulo dinámico
Archivo: `semanas/02/source_material/04-estado-y-comportamiento.md`

### 1. Qué enseña
- **Estado** = el dato que la página recuerda (contador, items, modo oscuro, usuario logueado, pestaña activa). Vive en variables JS, no en la pantalla. Persistirlo "es otro problema".
- **DOM** = el HTML vivo (árbol de nodos). **Mutación del DOM** = cambiarlo en vivo. **Render** = el dibujo.
- **Evento** = lo que hace el usuario; **listener** (suscripción) vs **handler** (función que responde).
- **Ciclo evento → listener → estado → mutación de DOM → render** (cinco pasos).
- **"El estado es la verdad; el DOM es el reflejo. Si te olvidás de actualizar uno de los dos, la pantalla miente."**
- **"Estado" es la palabra mágica:** sin nombrarla, la IA toma tres atajos malos: guardar el dato en un atributo del DOM (frágil), una variable global flotante (difícil de extender), o mezclar el dato con su representación (explota con una segunda vista del mismo dato).
- Prompt con vocabulario: "Agregá un estado `count` (número, inicial 0). Mostralo en un `<span id="count">`. Cuando se haga click en `<button id="inc">`, registrá un listener que incremente `count` y actualice el `<span>`."
- `demo.html` repite el ciclo tres veces (contador, todo, event log) y muestra el estado en pantalla (`count = N`, `items = [...]`) al lado del DOM.

### 2. Qué hacer en NUESTRO TP
- **[ADAPTAR]** En React "el DOM es el reflejo" se vuelve `UI = f(estado)`: el estado vive en un store (el del editor + uno del shell) y los componentes lo reflejan. El ciclo del curso se traduce así (inferencia, y marcar en el README que es un mapeo nuestro):
  - evento = `onClick` del chip / `pointerdown` sobre un mesh de R3F / tecla;
  - listener+handler = el prop del componente que llama a una **acción del store**;
  - estado = store;
  - "mutación de DOM" = commit de React **y** mutación del grafo de three.js (dos reflejos del mismo estado);
  - render = React + el loop de R3F.
- **[ADAPTAR — el insight más valioso de la semana 02 para nosotros]** Las tres "tentaciones" que la clase nombra tienen gemelas en 3D/React:
  - *guardar el dato en el DOM* → guardar la verdad en `Object3D.userData`/posición de un mesh/`useRef` en lugar de en el grafo de escena;
  - *variable global flotante* → módulo con `let currentMode`;
  - *mezclar dato con representación* → mezclar el grafo JSON que se guarda con datos derivados de render (geometrías calculadas, materiales, handles de selección). Regla: **el grafo de escena es lo único que se persiste; lo derivado se recalcula.**
- **Acción verificable (spec antes de código):** tabla de estados en `docs/specs/estado-ui.md` con columnas *nombre · dueño · tipo · valor inicial · transiciones (ida y vuelta) · qué refleja*. Primer borrador en §2.9.
- **Acción verificable:** nombrar el **estado en cada prompt de UI** (P1/P2): "Agregá `activeRoomId: string | null` al store del shell…".
- **Acción verificable (opcional, inferencia):** panel de debug dev-only que muestra el estado crudo junto a la UI, al estilo `count = N` de `demo.html`, útil para la defensa ("el estado es la verdad; esto es el reflejo").
- **[NO APLICA]** Listeners con `addEventListener`/MutationObserver a mano. En React se usan props y efectos.

### 3. Evidencia/documentación
- `docs/specs/estado-ui.md` + referencia en README.
- En `prompts.md`: al menos un prompt P2 con la vuelta explícita (ver 2.6).

### 4. Trampas
- Estado duplicado (el modo en el store y en un `useState` local: la pantalla miente).
- Persistir sin decidir (la clase avisa que es "otro problema"): decidir qué va a URL (`?mode=3d`, `/proyectos/[id]`), qué a `localStorage` (tema), qué al servidor (escena).
- Efectos (`useEffect`) usados como parche para sincronizar dos fuentes de verdad (inferencia).

### 5. Ambigüedades
- La clase usa vanilla JS; no hay una sola línea de React ni de componentes. El `semanas/03/spine.md` dice que el "átomo dictable" del frontend de la semana 02 es "un componente con sus props y su estado", pero **esa idea no aparece como tal en el material de la semana 02** (ver §6). Para nosotros: definirlo (contrato de componente, §2.9).

---

## 2.5 Clase 05 — Empaque: single-file vs multi-archivo
Archivo: `semanas/02/source_material/05-single-file-platform.md` (+ `spine.md` §5 y `plan.md` Task 5, que son más completos: incluyen la analogía npm/pip y el bundler)

### 1. Qué enseña
- **Empaque es una decisión, no un default.** Single-file (HTML+CSS+JS inline) y multi-archivo (manifiesto, registro, `node_modules`, bundler, build) son dos estrategias con costos opuestos (`spine.md` §5).
- **Tres ventajas del single-file con una IA:** (1) cabe en la ventana de contexto (el LLM gratuito no ve doce archivos y "empieza a inventar"); (2) deploy por copy-paste; (3) cero toolchain.
- **Cuándo se rompe** (cuatro tarjetas en el plan): más de mil líneas, equipo con merges, **dependencias pesadas (cita textual del material: "un motor 3D")**, y backend.
- **Cadena estándar de la industria**, explicada con `pip` como puente: `package.json`≈`requirements.txt`, registro npm≈PyPI, `npm install`≈`pip install`, `node_modules`≈`site-packages`, y el **bundler** como la única pieza sin equivalente (aplasta todo a lo que el navegador entiende).
- El texto cierra: "Para un proyecto que crezca —**el trabajo final entre ellos**— vas a terminar en multi-archivo, y justamente por eso conviene conocer las dos estrategias."

### 2. Qué hacer en NUESTRO TP
- **[NO APLICA]** Single-file como formato del TP final. La propia clase lo descarta para nosotros por las cuatro razones a la vez: más de mil líneas, equipo de dos, motor 3D (Pascal/three.js/R3F) y backend.
- **[TAL CUAL — para la defensa]** Documentar la decisión de empaque con el vocabulario de la clase en el README ("Decisiones que tomé yo"): "multi-archivo con Next.js, `package.json` + `pnpm-lock.yaml` (manifiesto + lockfile), registro npm, `node_modules`, bundler (el de Next), artefacto servido por Vercel". Mostrar que sabemos qué línea de `package.json` produce qué carpeta (es lo que pide el slide del plan).
- **[ADAPTAR]** El argumento "cabe en el contexto" ya no es sobre un chat gratuito sino sobre Claude Code (que lee archivos solo), pero **la gestión de contexto sigue siendo el problema** (se trabaja en semana 04). Traslación práctica (inferencia): archivos chicos (el ejemplo resuelto del curso fija "archivos < 300 líneas, funciones < 50"; ver `semanas/00/source_material/apellido-iisaia/tp-final/CLAUDE.md`, "Convenciones"), un `CLAUDE.md` por mitad, y contratos entre piezas para poder tocar una sin cargar la otra.
- **[ADAPTAR]** "Deploy por copy-paste" → Vercel conectado a GitHub (previews por PR). Variables de entorno de Supabase en Vercel; la clave pública (anon/publishable) puede ir al navegador, la `service_role`/secret **nunca** con prefijo `NEXT_PUBLIC_` (inferencia; es una trampa clásica y calza con "las reglas que no se pueden saltear" de la clase 01 de la semana 03).
- **Acción verificable:** `.env.example` (el ejemplo resuelto lo tiene) y `.gitignore` con `.env*`.
- **Acción verificable:** pnpm fijado (`"packageManager": "pnpm@x.y.z"` en `package.json`) y `pnpm-lock.yaml` commiteado.

### 3. Evidencia/documentación
- README → "Decisiones": la decisión de empaque, con la cadena manifiesto→registro→instalación→bundler→artefacto en una frase.
- Árbol de carpetas anotado (como el del README del ejemplo resuelto).

### 4. Trampas
- Tomar el single-file como dogma (la clase misma lo pone como "formato de esta clase, no del curso").
- El modelo instala dependencias de más (aparece como "dependencia externa escondida" en el checklist de Review de la clase 07).

### 5. Ambigüedades / desactualizado
- `05-single-file-platform.md` dice "la próxima clase introduce… (semana 3 cubre el *single-file server*)". **Falso respecto de lo que se dictó**: `semanas/03/source_material/01-backend-y-el-supervisor.md` aclara que no se enseña FastAPI ni se implementa nada, y `09-trabajo-practico-2.md` dice "no hay servidor, no hay base de datos". Manda semana 03.
- El `.md` del source es más corto que `spine.md`/`plan.md` (que agregan multi-archivo y npm). Mandan spine/plan.

---

## 2.6 Clase 06 — Cuatro patrones de prompt para construir UI
Archivo: `semanas/02/source_material/06-patrones-de-prompt-ui.md`

### 1. Qué enseña
- **Cambio de mentalidad:** "no estás escribiendo código, estás *encargando* código". Un compañero adivina y repregunta; la IA hace exactamente lo que decís: "la calidad de tu pedido es el techo de la calidad del resultado".
- **Patrón de prompt** = plantilla reusable con el vocabulario incrustado. Cuatro patrones cubren ~80% del trabajo UI, en el orden natural de un proyecto chico:
  - **P1 Describir el artefacto** (primer prompt): `Construí un [artefacto]. Estructura: … Estilo: … Comportamiento: [estados, eventos]. Constraints: …`
  - **P2 Iterar sobre el estado:** `Agregale al [artefacto] un estado [nombre] que […]. Cuando [condición]: [efecto en estado] y [efecto en DOM]. Cuando [condición de retorno]: [restablecer].` **Hay que nombrar la vuelta, no solo la ida**; si no, la IA "inventa mal" la salida del estado.
  - **P3 Arreglar el layout:** `El [contenedor] está mal acomodado. Hacelo un [flex container | grid] con [parámetros]. [Espaciado y alineación].`
  - **P4 Tematizar y pulir:** convertir a variables CSS, definir tokens en `:root`, reemplazar hardcodeados, chequear contraste AA.
- Un solo ejemplo corriendo (Pomodoro) y una demo en vivo (dice roller) con los cuatro prompts listos para copiar.
- **Moraleja recurrente: vago = lotería, específico = determinismo.**

### 2. Qué hacer en NUESTRO TP
- **[TAL CUAL]** Los cuatro patrones sirven tal cual para dirigir al agente en UI; cambian los *constraints* y el vocabulario. Plantillas adaptadas (usables en `prompts.md` y como snippets):

**P1 adaptado — describir el componente/pantalla**
```
Construí [pantalla/componente] del diseñador de interiores.
Estructura: [elementos semánticos y jerarquía: header/nav/main/aside/article/form…].
Estilo: solo tokens de `tokens.css` (--color-*, --space-*, --radius); sin hex ni px sueltos.
Estado: [nombre: tipo, valor inicial, dueño (store del shell | store del editor | URL | servidor)].
Eventos: [evento → acción del store → qué cambia en UI y en el canvas].
Contrato: props [tipadas], emite [callbacks], NO conoce [la API / el editor].
Constraints: Next App Router, TypeScript estricto, Tailwind + tokens, sin dependencias nuevas
(preguntá antes), no tocar node_modules ni paquetes @pascal-app/*, archivo < 300 líneas.
```
**P2 adaptado — iterar sobre el estado (ida y vuelta)**
```
Agregale al [shell] un estado `mode` ('plan2d' | 'view3d' | 'walk') en el store del shell.
Cuando se elige un modo en el dock: `mode = <elegido>`, el dock marca el botón activo
(aria-pressed) y el canvas [cambia a cámara ortográfica | perspectiva]; se conserva [selección, cámara].
Cuando se presiona Esc estando en 'walk': `mode = 'view3d'`, se restaura la cámara guardada.
Dos reglas: mientras `saveStatus === 'saving'` el cambio de modo no descarta cambios sin guardar;
el estado del modo NO se duplica en estado local de componentes.
```
**P3 adaptado — layout**
```
El marco de la app está mal acomodado. Hacelo un grid de tres filas (header auto / main 1fr /
dock auto) y dos columnas en main (canvas 1fr / aside 320px); en <768px el aside pasa a
drawer. El contenedor del canvas necesita `min-height: 0`; el canvas ocupa el 100% sin scroll de página.
```
**P4 adaptado — tokens y tema**
```
Convertí el styling a tokens en `:root` y `[data-theme="dark"]`: --color-bg, --color-surface,
--color-text, --color-muted, --color-accent, --space-*, --radius, --font-*. Reemplazá todo valor
hardcodeado. Exponé `theme3d.ts` que lee los tokens y colorea grilla/selección/fondo del canvas,
y se actualiza al cambiar `data-theme`. Verificá contraste AA entre bg/text y accent/bg.
```
- **[TAL CUAL]** "Nombrar la vuelta" en P2: para cada modo/selección/panel, escribir cómo se sale (Esc, click de nuevo, botón cerrar) y qué se restaura. Es el defecto más probable en un editor (se entra a "caminar" y no se sale).
- **[ADAPTAR]** El ejemplo corriendo de la clase (Pomodoro) se reemplaza por **nuestro shell**: P1 (marco + selector de proyecto) → P2 (modo y ambiente activo) → P3 (layout responsive) → P4 (tokens/tema). Esa secuencia es una buena columna vertebral para `prompts.md`.
- **Acción verificable:** `docs/prompts.md` con cada prompt marcado con su patrón (P1–P4), "Qué buscaba / Qué devolvió / Qué hice con eso" (formato de `semanas/00/source_material/apellido-iisaia/tp1/prompts.md`).

### 3. Evidencia/documentación
- `prompts.md` etiquetado por patrón. Valoración del curso: en `semanas/00/.../README.md` del ejemplo resuelto, "el `prompts.md` va sin editar, defectos incluidos: el registro sirve como registro solo si es fiel".

### 4. Trampas
- Plantillas P2 que solo dicen la ida (la clase lo remarca).
- Pegar el prompt de la clase sin adaptar los constraints (pide "un solo archivo HTML, vanilla JS": si lo copiás tal cual, el agente puede intentar eso).
- **Alucinación de la API de `@pascal-app/*`** (inferencia, riesgo específico nuestro): una librería chica y reciente es el caso donde el modelo inventa props/hooks. Mitigación: pedir que lea los `.d.ts`/código instalado antes de usar un símbolo; checklist de Review (2.7).

### 5. Ambigüedades
- Ninguna interna. Nota: la clase asume una conversación de un chat; en Claude Code hay múltiples sesiones y el "registro de prompts" requiere decidir qué se guarda (spec/plan en disco cuentan como prompts "maduros"). Ver Preguntas abiertas.

---

## 2.7 Clase 07 — Actividad práctica: bad UI y el ciclo Architect → Prompt → Review → Test
Archivo: `semanas/02/source_material/07-actividad-practica.md`

### 1. Qué enseña
- **Cuatro tareas del ciclo que "tienen que pasar siempre":** **Architect** (una vez al principio: descompone y escribe el primer prompt con P1; re-entra si cambia el alcance grande) y el loop **Prompt → Review → Test**.
- **Review** = leer cada respuesta antes de aceptarla; busca cuatro cosas: APIs alucinadas, lógica que no hace lo pedido, dependencias externas escondidas (un `import` o script de CDN que el constraint no permite), regresiones.
- **Test** = correrlo y romperlo a propósito (clicks rápidos, inputs vacíos, valores extremos); "no alcanza con el camino feliz".
- Trabajando solo las cuatro son tuyas y **el sombrero incómodo es Review** (auditar un prompt que escribiste vos treinta segundos antes); saltearlo es el desvío más común y "aparece recién cuando ya construiste tres cosas encima".
- Entregable `tp1/{index.html,prompts.md,README.md}`; README = qué me propuse, **decisiones propias**, **qué salió mal y cómo lo corregí**; "esa sección de decisiones propias es la que más pesa al corregir".
- La *bad UI* es un pretexto para dominar el ciclo evento-estado-DOM. "Si rompe, no cuenta como bad UI, cuenta como bug."

### 2. Qué hacer en NUESTRO TP
- **[TAL CUAL]** El ciclo como disciplina de trabajo, mapeado a las herramientas de las semanas 05/06 (otro analista las cubre; acá solo el cruce):
  - Architect ↔ brainstorming + spec + plan (superpowers) y el `openapi.yaml` + modelo de datos dictados antes de implementar;
  - Prompt ↔ P1–P4 (UI) y bloque de contrato (API);
  - Review ↔ code-review / sub-agente revisor; checklist de la clase;
  - Test ↔ Playwright MCP (el ejemplo resuelto verificó con Playwright; `semanas/00/.../tp-final/CLAUDE.md`, "Comandos") + pruebas de la API.
- **[ADAPTAR — ventaja de ser dos]** El problema "auditar el prompt propio" se mitiga con **revisión cruzada**: quien escribió el prompt no es quien hace Review (inferencia; la clase habla de trabajo individual, pero si el TP final es en dupla se puede repartir). **Pero** la evaluación es de apropiación conjunta (defensa de ambos): cada uno tiene que poder explicar todo. Proponer rotación de roles por feature y registrar quién fue Architect/Reviewer en el commit/PR (inferencia).
- **Acción verificable — checklist de Review adaptado** (en `.claude/rules/review.md` o `docs/checklists/review.md`):
  1. ¿Algún símbolo/props/hook de `@pascal-app/*`, drei, R3F o Supabase que no exista? (abrir el `.d.ts`).
  2. ¿Hace lo que pedimos o "lo literal"? (ej.: arrancar un modo sin salida).
  3. ¿Se instaló algo que no pedimos? (`git diff package.json pnpm-lock.yaml`).
  4. ¿Rompió lo que ya andaba? (suite + Playwright de humo).
- **Acción verificable — checklist de Test destructivo:** proyecto vacío; escena enorme; cambiar de modo rápido; guardar sin conexión; sesión vencida a mitad de edición; proyecto ajeno (RLS); JSON de escena viejo/corrupto; viewport móvil; WebGL no disponible.
- **[NO APLICA]** "Una sola conversación de Gemini Canvas", "un solo `index.html`", "sin presentación en clase".

### 3. Evidencia/documentación
- README: "Qué salió mal y cómo lo corregí" con un caso real de Review/Test (como en `apellido-iisaia/tp1/README.md`: el modelo acertó pero el prompt estaba mal; "el resultado salió bien y el prompt igual estaba mal").
- `prompts.md` con la anotación por prompt.
- Commits/PRs por pieza que se puede abrir y probar (patrón del ejemplo resuelto) — la evidencia de proceso se pide desde la clase 6 (`semanas/00/source_material/02-como-se-aprueba.md`).

### 4. Trampas
- Saltear Review; Test solo del camino feliz; evaluar por el resultado y no por el prompt ("las dos ambigüedades salieron a mi favor, y ahí está el problema", README del TP1 de referencia).
- Que "ser dos" diluya la responsabilidad: la propia clase 00 explica por qué el TP era individual ("cuando el proyecto se defiende cada uno cubre el hueco del otro").

### 5. Ambigüedades
- Nombres del ciclo: `programa.md` dice "Architect → **Prompter** → **Reviewer** → **Tester**" y habla de "construcción **grupal**"; la clase 07 y el `spine.md` dicen "Architect → **Prompt** → **Review** → **Test**" y "individual". Mandan 07 y `spine.md` (son más recientes y describen lo dictado); las cuatro tareas son las mismas.

---

## 2.8 `demo.html` — "Frontend Showroom"
Archivo: `semanas/02/source_material/demo.html` (1279 líneas, un solo archivo)

### 1. Qué enseña
- Artefacto de enseñanza y referencia: la página "se enseña a sí misma". Secciones colapsables: estructura (toggle semántico/div soup + "Ver código"), estilo (box model, flex, grid, tipografía, theme switcher de una variable, "todo junto" con presets de variables), estado (contador, todo, event log mostrando estado en pantalla), DOM (árbol vivo generado con `MutationObserver`), single-file (modal que muestra el propio código fuente).
- Buenas prácticas visibles: tokens en `:root`; `hidden` como atributo para mostrar/ocultar; `setActiveAmong()` para grupos de botones (estado visual coherente); separar `paint()` del estado (`state` objeto + `paint()` repinta).

### 2. Qué hacer
- **[TAL CUAL]** Usarlo como **referencia de tokens** (copiar la escala de variables `--color-*`, `--space-*`, `--radius`, `--transition`) y de patrón "preset = objeto de variables aplicado con `setProperty`" para el cambio de tema.
- **[TAL CUAL]** El patrón `state` + `paint()` es la versión vanilla de "UI = f(estado)": útil para explicar en la defensa por qué usamos un store.
- **[NO APLICA]** Copiar su estructura (es vanilla y de una página).

### 3–5. Evidencia / trampas / ambigüedades
- Ninguna acción documental propia; citarlo en el README como origen del esquema de tokens si lo usamos.
- Detalle técnico (inferencia): el modal "ver código fuente" hace `fetch(location.href)`, que falla en `file://` (el propio código lo maneja). Irrelevante para nosotros.

---

## 2.9 Síntesis: cómo se traduce "estado, eventos, componentes, tematización" a NUESTRO shell

> Todo este apartado es propuesta mía (inferencia) apoyada en 2.2–2.6. Los nombres de estado son tentativos; la estructura interna de `@pascal-app/*` hay que verificarla por separado (no la leí).

**Regla organizadora:** hay **tres tipos de estado** y cada uno tiene dueño distinto. Mezclarlos es el equivalente del "mezclar el dato con su representación" de la clase 04.

| Estado | Dueño | Tipo | Valor inicial | Transiciones (ida / **vuelta**) | Se refleja en |
|---|---|---|---|---|---|
| `projects` (lista) | servidor (API); caché en cliente | `Project[]` | cargando | fetch / reintentar si falla | tarjetas `<article>` del selector |
| `activeProjectId` | URL (`/proyectos/[id]`) | uuid \| null | null | abrir proyecto / **volver a la lista** | ruta + título |
| `scene` (grafo) | store del editor | grafo JSON versionado | cargada de la API | editar → *dirty* → guardar (PUT) / **error: conservar dirty y ofrecer reintento** | canvas |
| `activeRoomId` (chip) | store del shell | id \| null | null | click chip → seleccionar + enfocar cámara / **click de nuevo o Esc → deseleccionar** | chip `aria-pressed` + resaltado 3D |
| `mode` (dock) | store del shell (+ `?mode=` en URL, opcional) | `'plan2d' \| 'view3d' \| …` | `'view3d'` | elegir modo / **definir qué se restaura al salir de cada uno** | dock + cámara |
| `theme` | store del shell + localStorage | `'light' \| 'dark'` | `prefers-color-scheme` | alternar | variables CSS **y** colores del canvas |
| `saveStatus` | store del shell | `'idle'\|'saving'\|'saved'\|'error'` | `'idle'` | guardar / reintentar | indicador en header |

**Contrato de componente (el "átomo dictable" de la semana 03 para el frontend).** Plantilla (inferencia, calcada del bloque de contrato de la clase 04 de la semana 03):
```
Componente: RoomChips
Props:      rooms {id,name,areaM2}[]; activeId string|null; onSelect(id|null)
Estado:     ninguno interno (controlado por el store)
Eventos:    click chip -> onSelect(id) ; click chip activo o Esc -> onSelect(null)
Estados visibles: vacío ("Todavía no hay ambientes") / cargando / normal
A11y:       <nav aria-label="Ambientes"><ul><li><button aria-pressed>
Estilo:     solo tokens
No sabe:    nada de la API ni del editor
```
Esto replica el principio del ejemplo resuelto (**"las escenas no conocen la API"**, `apellido-iisaia/tp-final/CLAUDE.md`): el shell no conoce el editor y el editor no conoce la API; se hablan por un adaptador (`EditorAdapter`) con contrato escrito. Beneficio explícito en el ejemplo: "se puede tocar un juego sin cargar el backend en contexto".

**Chips de ambientes:** estado `activeRoomId` + derivado `rooms = f(scene)` (no duplicar). Semántica: lista de botones con `aria-pressed`. Prompt tipo P2 con la vuelta (Esc/click de nuevo).
**Dock de modos:** matriz de transiciones (qué modo puede ir a cuál y qué estado se preserva: cámara, selección, herramienta). Es una tabla de 3×3 que cabe en el spec y evita "modo sin salida".
**Selector de proyecto:** estados de carga/vacío/error (+ "Reintentar") como en el patrón del ejemplo resuelto (`<p class="status">` + botón "Reintentar", `frontend/CLAUDE.md`).
**Estilos/tematización:** tokens + `theme3d.ts` (puente al canvas).

**Qué patrón usar para qué (mini-guía):**

| Necesito… | Patrón | Nota |
|---|---|---|
| Crear selector de proyecto / marco del editor desde cero | P1 | incluir contrato de componente y estados con dueño |
| Agregar modo, selección o guardado | P2 | **ida y vuelta** + qué se restaura |
| Arreglar el marco/responsive | P3 | nombrar grid/flex, `min-height: 0`, breakpoint |
| Cambiar paleta/tema, unificar espaciado | P4 | tokens + puente 3D + AA |

---

# PARTE II — SEMANA 03: ARQUITECTURA BACKEND, DATOS Y CONTRATOS

Fuentes: `semanas/03/spine.md`, `semanas/03/plan.md`, `semanas/03/source_material/{index,01..09}.md`, `semanas/03/slides/backend-flow.js` (animación de la anatomía de una request).

**Hilo conductor** (`spine.md`): espejo de la semana 02. Mismo rol (supervisor arquitectónico), mismo mecanismo (vocabulario → especificación → código auditable), terreno nuevo (servidor). **Las seis piezas** (spine/plan, que mandan): HTTP → REST → Endpoints → Datos → Errores → OpenAPI. Cada sección cierra con "vago vs específico" y los **tres ejes**: determinismo (nunca total con LLMs, pero el espacio de variación cae), iteración (cambiás una pieza nombrada), auditoría (leés el código contra el contrato que escribiste).

---

## 3.1 Clase 01 — Backend y el supervisor arquitectónico
Archivo: `semanas/03/source_material/01-backend-y-el-supervisor.md`

### 1. Qué enseña
- **Backend** = la parte que el usuario no ve: ejecuta la lógica, guarda el estado y **hace cumplir las reglas**. "Backend no quiere decir servidor web": **cuatro formas** (servidor web, proceso programado, worker de cola, **embebido**: sin red ni servidor, vive dentro de la aplicación).
- Lo que las cuatro comparten: **custodian los datos y ejecutan reglas que nadie puede saltear desde afuera.** "Una regla que vive en el frontend se esquiva abriendo las herramientas del navegador; una que vive en el backend, no."
- Se trabaja sobre el servidor web porque es la forma más común y "la única que obliga a definir un **contrato explícito** con quien le habla".
- **Tres cosas que se mueven al pasar al servidor:** (1) **persistencia** (un bug escribe datos malos que se quedan y se multiplican por usuario → "supervisar antes de ejecutar, no después"); (2) **contratos reales** (frontend y backend son dos programas; la IA puede inventar un endpoint que el front no sabe consumir o devolver un campo con otro nombre); (3) **leer la respuesta** (status codes, JSON, logs): "le estás creyendo a la IA en lugar de creerle a la máquina".
- Mapa de la clase (seis piezas) y el espejo: "El rol no cambia. Cambia el terreno."
- Qué NO es la clase: no enseña FastAPI, ni Python de producción, ni SQL serio.
- `backend-flow.js`: la request atraviesa HTTP → REST → Endpoints → Datos → rama Errores (5xx) / Response (2xx) → cliente.

### 2. Qué hacer en NUESTRO TP
- **[TAL CUAL]** Escribir en el README (sección "Arquitectura") qué es *nuestro* backend con el vocabulario de la clase. Supabase no se queda afuera por no ser "servidor web": cae en la definición general (custodia de datos + reglas inevadibles: RLS, constraints, Auth). Pero atención a la consecuencia en la corrección: ver §4.
- **Acción verificable — inventario de "reglas que no se pueden saltear"** (`docs/reglas-de-negocio.md`, inferencia): tabla *regla → dónde se hace cumplir → cómo se prueba*. Ejemplos candidatos: "un usuario solo ve/edita sus proyectos" (RLS + test), "`owner_id` y `created_at` los pone el servidor/DB, nunca el cliente" (DEFAULT `auth.uid()`), "la escena se valida contra el esquema versionado antes de persistirse" (zod en la API), "los presets y el catálogo son de solo lectura para usuarios" (RLS). Cualquier regla que figure solo en el frontend es UX, no seguridad.
- **[ADAPTAR]** "Servidor web que obliga a un contrato explícito": con supabase-js desde el navegador *no hay endpoints que dictaste*; el contrato es esquema + RLS. Es una razón para tener, además, una API propia delgada (ver §3.10(b)).
- **[TAL CUAL]** Leer la respuesta cruda: cuando el agente diga "ya funciona", mirar la pestaña Network y el JSON (en el ejemplo resuelto, el bug de la fecha sin zona "daba `201` y se veía bien en el ranking; solo se notaba mirando el JSON").
- **[NO APLICA]** Procesos programados / workers (salvo que usemos algo tipo cron para limpieza; no hace falta).

### 3. Evidencia/documentación
- README → "Arquitectura" con diagrama de capas (UI → API/contrato → Postgres con RLS), y la tabla de reglas.
- Capturas o texto de una respuesta cruda leída (para "Qué salió mal").

### 4. Trampas
- Confiar en validaciones del cliente como si fueran reglas.
- Dejar que la IA decida el contrato (los "contratos" se rompen cuando alguien cambia un nombre de campo sin avisar).
- (Inferencia) `service_role` de Supabase en el navegador o en una variable `NEXT_PUBLIC_`: anula toda RLS.

### 5. Ambigüedades
- El `.md` lista como pieza 6 "Salto al stack local — por qué el navegador ya no alcanza", pero `spine.md`/`plan.md`/`backend-flow.js` (comentario: "Salto al stack local is intentionally NOT in this diagram") fijan la sexta pieza = **OpenAPI**. Manda spine/plan.

---

## 3.2 Clase 02 — Cliente, servidor y HTTP
Archivo: `semanas/03/source_material/02-cliente-servidor-y-http.md`

### 1. Qué enseña
- **Cliente y servidor son roles, no programas**: un iPhone, otro servidor, un `curl`, la página de la semana 02. "El servidor no manda cosas porque sí; espera que le pregunten."
- **HTTP** = protocolo de pedido/respuesta. **Request**: method + URL + headers + body opcional. **Response**: status code + headers + body. Par concreto `GET /projects/4 HTTP/1.1` → `200 OK` + JSON.
- **Cinco methods**: GET (leer, sin efectos), POST (crear), PUT (reemplazar entero), PATCH (modificar parte), DELETE (borrar). "El repertorio fijo de operaciones que pedís", no acciones libres.
- **Status codes por familia:** 2xx (200 OK, 201 creado, 204 sin contenido), 4xx = "vos, cliente, te equivocaste" (400 mal pedido, 404 no existe; 401/403 "los vemos en semana 7"), 5xx = "yo, servidor, me caí" (500, 503).
- **Regla diagnóstica:** "Si arranca con 4, mirá tu pedido. Si arranca con 5, mirá los logs del servidor."
- **Qué debe poder el supervisor:** especificar el method, **predecir** el status code y **leer** la respuesta para confirmar.
- Vago vs específico: `hacé un endpoint para guardar tareas` vs `POST /tasks` con body, `201` / `400`, JSON.

### 2. Qué hacer en NUESTRO TP
- **[TAL CUAL]** Todo el vocabulario. Acción verificable: tabla "Endpoints" en el README con columnas *method · path · respuestas* (formato exacto del ejemplo resuelto, `apellido-iisaia/tp-final/README.md` §Endpoints, con una fila por status posible).
- **[ADAPTAR]** supabase-js oculta el HTTP: bajo el capó son requests a PostgREST (`/rest/v1/<tabla>?...`) y a Auth (`/auth/v1/...`) (conocimiento general; verificar en DevTools). Acción: que ambos integrantes sepan mostrar en DevTools qué request genera "listar mis proyectos" y qué status devuelve.
- **[TAL CUAL]** Mapeo explícito de methods a nuestras operaciones: crear proyecto = `POST`; guardar la escena completa = `PUT` (reemplazo, idempotente); renombrar = `PATCH`; borrar = `DELETE` → `204`.
- **Acción verificable:** que el contrato diga el status de cada caso (por qué `201` y no `200`, por qué `204` sin cuerpo en DELETE) — decisión que el ejemplo TP2 resuelto defiende ("si el recurso ya no existe, mandarlo de vuelta es describir algo que no está").
- **[NO APLICA]** Los "cinco methods" no incluyen HEAD/OPTIONS; no hace falta tocarlos (CORS preflight aparece solo si separamos API en otro origen: ver §3.10(b)).

### 3. Evidencia/documentación
- Tabla de endpoints en README; `openapi.yaml`.
- Una captura de DevTools Network o un `curl -i` en la sección "Cómo verifiqué".

### 4. Trampas
- Buscar el bug en el lado equivocado ("la forma más rápida de perder media hora").
- Dejar que la IA elija 200 para todo.
- (Inferencia) Con RLS, un `UPDATE`/`DELETE` sobre una fila ajena suele devolver 0 filas **sin error** en PostgREST: el cliente cree que funcionó. Hay que pedir la fila de vuelta (`.select()`) y mapear "0 filas" a `404` (ver §3.10(c)). Es el tipo de caso donde "predecir el status code" evita un bug silencioso.

### 5. Ambigüedades
- "Los vemos en semana 7" (401/403): no existe esa clase (ver §6). Para nosotros: decisión propia documentada.
- `backend-flow.js` muestra `200 OK` en el éxito de un `POST` aunque su texto dice "status 201". Cosmético; usar `201`.

---

## 3.3 Clase 03 — REST como estilo
Archivo: `semanas/03/source_material/03-rest-como-estilo.md`

### 1. Qué enseña
- Hook: `DELETE /projects/4/tasks/17` vs `POST /borrar-tarea?id=17&proyecto=4` — "las dos son HTTP válido; una sola es REST".
- **HTTP es el cómo (transporte); REST es el qué (convención de uso).** Alternativas existen (GraphQL: una sola path; RPC: funciones con nombre) pero REST domina.
- **Todo es un recurso.** Las URLs nombran recursos, no acciones. **Colección** (`/projects`), **item** (`/projects/4`), **anidado** (`/projects/4/tasks/17`). "El method dice qué hacer; la URL dice sobre qué."
- **Cuatro reglas:** (1) **plural** (`/users`, no `/user`); (2) **jerarquía cuando hay relación** — anidar si la pertenencia es *estructural*; si el recurso puede vivir solo, plano + filtro por query (`/tasks?project=4`); (3) **idempotencia** (GET, DELETE, PUT sí; POST no) → consecuencia: si falló y no sabés si llegó, reintentás sin miedo solo si es idempotente; (4) **stateless** (cada request lleva todo; por eso aparecen los tokens; permite escalar horizontalmente).
- Cómo cambia el prompt: de "hacé un endpoint para borrar tareas" a `/projects/{id}/tasks/{taskId}` con DELETE y GET → "sin haberlo nombrado, ya estás dictando contrato".

### 2. Qué hacer en NUESTRO TP
- **[TAL CUAL]** Aplicar las cuatro reglas al diseño de rutas. **Propuesta (inferencia) de recursos de nuestra API**, para validar con la regla "anidar si es estructural / plano si vive solo":

| Method | Path | Idempotente | Regla que aplica |
|---|---|---|---|
| GET | `/api/projects` | sí | colección en plural; "mis proyectos" lo da la sesión, no un param |
| POST | `/api/projects` (body `{name, kind, presetId?}`) | no | crear desde preset es **crear un proyecto con un dato más**, no un verbo en la URL (nada de `/crear-desde-preset`) |
| GET/PATCH/DELETE | `/api/projects/{projectId}` | GET/DELETE sí | item |
| GET/PUT | `/api/projects/{projectId}/scene` | PUT sí | **sub-recurso singleton**: la escena solo existe dentro del proyecto (anidar); se guarda **entera** → PUT |
| GET | `/api/presets?kind=&q=` | sí | los presets **viven solos** → plano + query |
| GET | `/api/catalog/items?category=&q=&page=` | sí | idem catálogo |

- **[TAL CUAL]** **Idempotencia aplicada:** guardar la escena con `PUT` hace que reintentar un guardado fallido sea seguro; crear proyecto (`POST`) no lo es → decidir y documentar si se usa clave de idempotencia o si se acepta el riesgo (inferencia). Es una decisión de defensa muy concreta.
- **[ADAPTAR]** **Stateless con Supabase Auth:** cada request lleva el JWT de la sesión (cookie vía `@supabase/ssr` o header `Authorization`); el servidor no guarda sesión en memoria. Es el "por qué van a aparecer tokens" de la clase; como la clase no lo desarrolla, hay que explicarlo nosotros.
- **[NO APLICA]** GraphQL/RPC (se mencionan como alternativas; no hace falta).

### 3. Evidencia/documentación
- README → "Decisiones": por qué anidamos `scene` y no `presets`; por qué `PUT` para la escena; por qué `presetId` va en el body.
- `openapi.yaml` con `parameters` de path reutilizados.

### 4. Trampas
- Verbos en la URL (`/guardar-escena`, `/duplicar-proyecto`): reformular como recurso (`POST /projects` con `presetId` / `POST /projects/{id}/duplicates` si hace falta duplicar).
- Mezclar singular y plural: "se vuelve impredecible para quien la consume, incluida la IA que le genera el cliente".
- Anidar de más cuando la relación es opcional.
- Asumir que reintentar un `POST` es inofensivo.

### 5. Ambigüedades
- La clase presenta REST como "la convención"; Supabase/PostgREST **es** REST (recursos = tablas, filtros por query, verbos HTTP), pero con convenciones propias (`?select=`, `?col=eq.valor`). La clase no lo contempla; si lo usamos directo, hay que decir en el README que seguimos la convención PostgREST ahí y la nuestra en la API propia.

---

## 3.4 Clase 04 — Paths, controllers y el contrato (el clímax)
Archivo: `semanas/03/source_material/04-rutas-controladores-y-contratos.md`

### 1. Qué enseña
- Problema: "hacé un endpoint para crear una tarea" → trescientas líneas con **diez decisiones inventadas** (campos requeridos, fecha mal formateada, forma de la respuesta, código de éxito, qué pasa si el proyecto no existe). "Un contrato saca esas decisiones de la imaginación del modelo."
- **Un endpoint son cinco piezas:** **method** (qué hace), **path** (sobre qué recurso), **schema de entrada**, **schema de salida**, **códigos posibles** (con la condición de cada uno). "Si vos no las dictás, las toma la IA, y las toma sin avisarte."
- **Path / query / body:** el path **identifica**, la query **ajusta el pedido** (filtrar, paginar, ordenar), el body **transporta el contenido nuevo**. (Nota: el `.md` dice "la query *modifica*", pero `plan.md` pide evitar "modifica" porque choca con PATCH; la fórmula vigente es "ajusta el pedido".)
- **Controller** = la función que atiende la promesa del path. "Vos no escribís controllers: los **especificás**." La unidad mínima que se le entrega a la IA es un **bloque de contrato**:
```
POST /projects/{id}/tasks
  entrada (body): title string, requerido ; due_date fecha ISO, opcional
  salida 201: { id, title, due_date|null, project_id }
  salida 400: { error: "title es requerido" }
  salida 404: { error: "no se encontró el proyecto {id}" }
```
- **"Átomo dictable":** el equivalente backend de "un componente con sus props y su estado bien definidos". Pieza chica, bordes claros, que se pega a la IA sin aclarar nada más. Iteración: "mover un 400 a 422" = tocar una línea y regenerar esa pieza.

### 2. Qué hacer en NUESTRO TP
- **[TAL CUAL — el punto más importante de la semana 03]** Escribir un **bloque de contrato por endpoint** (en `docs/specs/api.md` y/o directamente en `openapi.yaml`) *antes* de implementar. Ejemplo para nuestra operación estrella (inferencia; es solo una ilustración del formato):
```
PUT /api/projects/{projectId}/scene
  entrada (body): { schemaVersion int, version int (la que cargó el cliente), scene objeto grafo }
  salida 200: { version int, updatedAt ISO }
  salida 404: { error: { code: "PROJECT_NOT_FOUND", message: "No se encontró el proyecto {projectId}." } }
  salida 409: { error: { code: "VERSION_CONFLICT", message: "El proyecto cambió desde que lo abriste." } }
  salida 413: escena demasiado grande
  salida 422: la escena no cumple el esquema de schemaVersion
  salida 401: sin sesión
```
- **[TAL CUAL]** **Regla path/body (la que el TP2 de referencia aprendió a la mala):** un dato que ya viaja en el path **no vuelve a viajar en el body** (`projectId` en el path, no en el body), y los campos que decide el servidor (`id`, `owner_id`, `createdAt`, `updatedAt`, `version`) no están en el schema de entrada. En el ejemplo resuelto: "El juego va en el path y no se repite en el body… habría que decidir cuál gana" y "`created_at` lo pone el servidor".
- **[ADAPTAR]** **Controller = route handler.** En Next App Router, `app/api/projects/[projectId]/scene/route.ts` exporta funciones llamadas `GET`, `PUT`: el **nombre del export ES el method** y la **carpeta ES el path** (`[projectId]` ≈ `{projectId}`). Es el equivalente directo de `@router.put(...)` de FastAPI (verificar convención de la versión de Next instalada). La estructura de carpetas queda legible como tabla de rutas.
- **[ADAPTAR]** Capas del ejemplo resuelto (`db → models → schemas → routes`, "la separación modelo/schema no es ceremonia", `backend/CLAUDE.md`) → nuestras capas: *cliente Supabase/DB → tipos generados → schemas zod (Input/Output separados) → route handlers*. `ScoreInput` (sin `game`/`created_at`) ≈ `ProjectInput` (sin `ownerId`/`createdAt`).
- **Acción verificable:** una skill o `CLAUDE.md` con el procedimiento "agregar endpoint": confirmar method+path → schemas zod → handler → test (happy path + error esperado) → regenerar/actualizar `openapi.yaml` (mismo procedimiento que la skill demo de `semanas/04/source_material/11-skills-y-slash-commands.md`).
- **[NO APLICA]** Pseudocódigo del bloque como formato final: es el paso previo al `openapi.yaml` (clase 07).

### 3. Evidencia/documentación
- `docs/specs/api.md` (bloques) y/o `openapi.yaml`; README → tabla de endpoints + "Contrato entre la interfaz y el servidor" con un ejemplo request/response (como el del ejemplo resuelto).
- `prompts.md`: el prompt que dictó los bloques.

### 4. Trampas
- Contrato vago → decisiones silenciosas ("cada una es una bifurcación… que vos vas a descubrir cuando algo se rompa").
- Mismo dato por dos vías (path y body).
- Devolver el modelo de tabla directamente (filtra campos internos).
- Heredar nombres de parámetro distintos entre endpoints (`{id}` vs `{projectId}`): en la demo en vivo se mezclan; el TP2 resuelto usa `{projectId}`. Elegir uno y fijarlo.

### 5. Ambigüedades
- Typo en el `.md` ("La **path** o **path**") y "query modifica" vs "ajusta" (ver arriba). Sin impacto.
- La clase 06 (errores) menciona 400 **o** 422 sin elegir, y esta clase usa "mover un 400 a 422" como ejemplo de iteración: es una **decisión de contrato** que nos toca tomar y justificar (el TP2 resuelto usó 400; el TP final resuelto usó 422 por FastAPI).

---

## 3.5 Clase 05 — Datos: relaciones vs documentos
Archivo: `semanas/03/source_material/05-datos-relaciones-vs-documentos.md`

### 1. Qué enseña
- Hook: la to-do list de la clase pasada vivía en una variable JS; al refrescar, todo se perdía: "la página nunca tuvo memoria. El servidor es lo que le da memoria".
- **Tres razones para una base de datos (y no un archivo de texto):** (1) **persistencia** (sobrevive reinicios, despliegues, sesiones); (2) **eficiencia de consulta** (índices, planes de ejecución: filtrar/ordenar/combinar sigue siendo barato a escala); (3) **integridad** (no puede existir una tarea con `project_id = 99` si no existe el proyecto; dos escrituras simultáneas no dejan datos inconsistentes). "La base de datos es el lugar donde esas reglas se hacen cumplir, no un detalle del código de aplicación."
- **Relacional (SQL):** tablas, filas, columnas con tipo, **schema** (forma fija), **foreign keys**, **JOIN**.
- **Documento (NoSQL):** documentos JSON anidados en **colecciones**, sin schema rígido; "las tareas viven adentro del proyecto. No hay foreign key, no hay JOIN". Ejemplos: MongoDB, DynamoDB.
- **Trade-off (textual):** "anidar es cómodo cuando **siempre leés 'todo de un proyecto' junto**. Es pésimo cuando las tareas también necesitan **vivir solas**, cuando **otra entidad las referencia**, o cuando querés **filtrarlas globalmente**."
- **Cómo elegir:** *Relacional* cuando hay relaciones claras entre entidades y querés integridad (facturación, inventario). *Documento* cuando el dato es "**jerárquico, de schema flexible, optimizado para acceso por documento**" (perfiles con muchos campos opcionales, logs, eventos). **Regla pragmática del curso: "la mayoría de las apps arrancan relacional. Ir a document tiene sentido cuando el patrón de datos lo pide."**
- **SQLite como entry point** (cero configuración, un archivo); "en producción real probablemente uses Postgres, pero las decisiones de modelado, las foreign keys, los tipos de columna y los JOINs son las mismas".
- Vago vs específico: `guardá tareas y proyectos en una base` vs "modelá dos tablas relacionales en SQLite: projects(…), tasks(… FOREIGN KEY …); generá las migraciones y un seed con dos proyectos y cinco tareas".

### 2. Qué hacer en NUESTRO TP — (a) criterios para decidir el modelo de datos
**Cómo lo justifica el material.** La clase presenta una disyuntiva binaria y da criterios de decisión; los criterios de *cada* lado se aplican a *partes distintas* de nuestro modelo, que es exactamente lo que queremos defender:

| Dato | Criterio del curso que aplica | Decisión |
|---|---|---|
| usuarios/perfiles, proyectos, presets, catálogo | "relaciones claras entre entidades + integridad"; viven solos; se filtran globalmente (catálogo por categoría, presets por tipo, proyectos por dueño); los referencian otras entidades | **tablas relacionales** con FKs, NOT NULL, CHECK, índices y RLS |
| **escena 3D** (grafo de nodos) | "jerárquico, de schema flexible, optimizado para acceso por documento" + "**siempre leés todo de un proyecto junto**": el editor la carga y la guarda **entera**, nunca consulta una pared suelta | **columna `jsonb`** (documento dentro de Postgres) |
| items del catálogo referenciados desde la escena | el contra-criterio de la clase: "otra entidad las referencia / necesitan vivir solas" | **referenciarlos por id** (`catalogItemId`) en el grafo, **no** embeberlos; decidir y documentar si el precio se *congela* en la escena (desnormalización deliberada) o se resuelve contra el catálogo (inferencia) |

- **Por qué no una DB de documentos entera:** (i) la regla pragmática ("arrancan relacionales"); (ii) necesitamos propiedad/permisos/FK (proyectos de un dueño, presets compartidos); (iii) Postgres da `jsonb` y cubre el caso documento sin otro motor. **Ojo:** el material **no menciona `jsonb` ni híbridos**; la justificación híbrida es extensión nuestra construida con *los criterios* de la clase. Hay que decirlo así en la defensa: "aplicamos el criterio de la clase por entidad, no por proyecto".
- **Por qué no todo relacional (nodo por fila):** el contra-ejemplo del propio material funciona al revés: normalizar el grafo en miles de filas haría que cada guardado/carga sea un JOIN gigante para algo que siempre se usa junto (criterio 2 de la clase, eficiencia).
- **Cuándo el híbrido duele (decirlo antes de que lo pregunten):** (1) consultas globales sobre contenido de la escena ("¿qué proyectos usan este item?") → hace falta una tabla derivada (`project_items`) mantenida al guardar o un índice GIN sobre `jsonb` (inferencia); (2) **versionado del esquema** de la escena (el editor evoluciona): columna `schema_version` + función de migración; (3) **escrituras concurrentes** sobre un documento entero (integridad, razón 3 de la clase): `version` para control optimista y `409` en conflicto; (4) tamaño.
- **Propuesta de modelo (inferencia, para discutir; nombres tentativos):**
```
profiles(id uuid PK -> auth.users, display_name, created_at)
projects(id uuid PK, owner_id uuid NOT NULL -> profiles, name text NOT NULL,
         kind text CHECK (kind IN ('vivienda','comercio')),
         preset_id uuid NULL -> presets, created_at, updated_at)
project_scenes(project_id uuid PK -> projects ON DELETE CASCADE,
         schema_version int NOT NULL, version int NOT NULL DEFAULT 1,
         scene jsonb NOT NULL, updated_at)           -- 1:1, separada para que listar proyectos no arrastre el jsonb
presets(id uuid PK, slug unique, name, kind, description, schema_version, scene jsonb NOT NULL)
catalog_items(id uuid PK, sku unique, category, name, width/depth/height, price numeric, model_url)
```
RLS: `projects`/`project_scenes` solo del dueño; `presets`/`catalog_items` lectura para autenticados, escritura solo `service_role`.
- **[TAL CUAL] "Vago vs específico" de datos:** dictar el DDL, **migraciones y seed** (la clase pide "generá las migraciones y un seed"). En Supabase: `supabase/migrations/*.sql` + `supabase/seed.sql` + las policies RLS como parte del mismo contrato (verificar herramientas CLI instaladas).
- **[ADAPTAR]** SQLite → Postgres (Supabase): la clase dice que las decisiones de modelado son las mismas. Lo que **no** se traslada: "un archivo en tu disco", `create_all` del ejemplo resuelto (que "no migra") → nosotros necesitamos migraciones versionadas. Y la regla del ejemplo "borrá `scores.db`" **no** vale en un Postgres compartido.
- **Acción verificable:** `docs/modelo-de-datos.md` con (1) la tabla de criterios de arriba, (2) el DDL, (3) la lista de "cuándo duele el híbrido" y nuestras mitigaciones.

### 3. Evidencia/documentación
- README → sección "Datos" (el ejemplo resuelto: "Dos tablas. `Game` tiene…") + "Decisiones": **por qué jsonb para la escena**, citando los criterios de la clase.
- `supabase/migrations` + seed en el repo (evidencia de que el esquema es nuestro).

### 4. Trampas
- Elegir documento "porque es flexible" (la clase da el default relacional).
- Anidar lo que necesita vivir solo (presets, catálogo).
- Persistir datos derivados de render dentro del jsonb (mezclar dato con representación; ver 2.4).
- `select *` en listas que arrastran el jsonb de cada proyecto.
- Sin `schema_version` ni migración: el primer cambio del editor invalida las escenas guardadas.

### 5. Ambigüedades
- La clase no cubre `jsonb`, RLS ni migraciones reales; todo eso es extrapolación (marcado). El *criterio* sí es del curso.

---

## 3.6 Clase 06 — Errores y observabilidad
Archivo: `semanas/03/source_material/06-errores-y-observabilidad.md`

### 1. Qué enseña
- Hook: un `500 Internal Server Error` y dos reacciones: copiar "no funciona" y rezar, o abrir la terminal, encontrar la línea y mandarle *eso* a la IA con el handler. "La diferencia… es vocabulario: saber qué mirar y qué pedazo de evidencia pegar."
- **Los errores tienen dueño:** 4xx = cliente (404, 400/422, 401/403 diferidos), 5xx = servidor (bug, DB caída, caso sin manejar). **Leer el primer dígito antes de tocar nada.**
- **Logs:** líneas que el servidor escribe por cada request/error/respuesta; en local en la terminal, en producción en un sistema de agregación. Anatomía de tres líneas: (1) request entrante (method, path, body), (2) error interno (qué y por qué), (3) status de salida + duración.
- **Stack trace:** cadena de llamadas; **no se lee linealmente**; la línea que importa es "la primera que menciona código tuyo, no del framework". "El síntoma grita al final; la causa vive en la primera línea de código que escribiste vos (o que la IA escribió por vos)."
- **Cómo contárselo a la IA:** prompt malo (`no funciona, dame fix`) vs bueno (method+path+código devuelto+línea de log+archivo:línea+handler+pregunta). "Sin esa evidencia el modelo adivina; con ella, razona." Pedir **entender la causa antes del parche**, y plantear hipótesis.
- **Observabilidad** = logs, métricas, traces (paraguas); la clase se queda con logs.

### 2. Qué hacer en NUESTRO TP — (c) errores y observabilidad aplicables
- **[TAL CUAL]** Regla diagnóstica y formato de prompt con evidencia. Acción verificable: plantilla en `docs/debug-con-evidencia.md` y usarla en los prompts de corrección (queda en `prompts.md` como prueba de que "se leyó el resultado en vez de darlo por bueno").
- **[ADAPTAR]** **Contrato de errores único** (propuesta; inferencia): cuerpo `{ "error": { "code": "…", "message": "…en castellano…", "requestId": "…" } }`, definido una sola vez en `openapi.yaml` (`components/schemas/Error` + `components/responses`). La clase muestra `{ error: "title es requerido" }`; el ejemplo resuelto usa el `{"detail": …}` de FastAPI con mensajes en castellano ("Tenés que iniciar sesión."). Elegir uno y fijarlo es una decisión nuestra.
- **Mapa de errores → HTTP → mensaje de UI** (castellano rioplatense; inferencia):

| Situación | HTTP | Mensaje al usuario |
|---|---|---|
| nombre vacío / escena inválida (zod) | 422 (o 400, ver 3.4) | "El nombre del proyecto es obligatorio." |
| sin sesión / token vencido | 401 | "Tu sesión venció. Volvé a iniciar sesión." |
| proyecto inexistente **o ajeno** (RLS) | 404 | "No encontramos ese proyecto." |
| conflicto de versión al guardar | 409 | "Este proyecto cambió desde que lo abriste. Recargá para ver los cambios." |
| escena demasiado grande | 413 | "La escena es demasiado grande para guardarla." |
| error interno | 500 | "Algo salió mal de nuestro lado. Probá de nuevo en un momento." (+ `requestId`) |
| sin red | — | "No pudimos conectarnos. Revisá tu conexión." + botón **Reintentar** |

  Decisión de seguridad a documentar: devolver **404 y no 403** para proyectos ajenos (no revelar existencia). Es el mismo estilo de decisión que el TP2 resuelto ("404 en el GET de tareas, no lista vacía").
- **[ADAPTAR]** **Una sola capa de traducción en el cliente**, igual que `api.js`/`describeError` del ejemplo (`frontend/CLAUDE.md`, "Errores": "el resto del frontend solo muestra `error.message`"). Con supabase-js, que **devuelve `{ data, error }` en lugar de lanzar**, esa capa es todavía más importante (si no, los errores se ignoran en silencio) (inferencia). Cada error de PostgREST/Postgres lleva `code`, `message`, `details`, `hint`; mapearlos (p. ej. violación de unicidad → 409; sin permisos/RLS → 401/403/404 según decisión) (verificar códigos).
- **[ADAPTAR]** **Logs de tres líneas por request** en route handlers / API: una línea JSON `{ts, level, method, path, status, ms, userId?, requestId}` y, ante error, una con `message` y `stack`; **nunca** tokens ni datos personales. Dónde se leen: terminal en local; en producción *Runtime Logs* de Vercel y *Logs* de Supabase (API/Postgres/Auth) (verificar nombres de pantallas). **Acción verificable:** una sección del README "Cómo diagnosticamos un 500" con un incidente real: request, log, stack, prompt con evidencia, parche.
- **[ADAPTAR]** **Stack traces en bundles de Next:** el trace puede apuntar a código transpilado; hay que mirar la primera línea con path de nuestro repo (`app/api/...`) y activar source maps en dev (inferencia).
- **[ADAPTAR — específico 3D]** Errores que no pasan por HTTP: fallo de carga de assets/modelos, WebGL no disponible, `webglcontextlost`, excepciones dentro de `<Canvas>` (que no burbujean como errores de React normales). Acción: `ErrorBoundary` alrededor del canvas + mensaje en castellano + "Reintentar" (inferencia).
- **[TAL CUAL]** Observabilidad "paraguas": mencionarla en el README con humildad ("nos quedamos en logs; métricas/traces quedan fuera del alcance"), igual que la clase.

### 3. Evidencia/documentación
- README → "Qué salió mal": al menos un incidente narrado con el **formato de la clase** (síntoma, log, causa en la primera línea nuestra, arreglo). El ejemplo resuelto narra cuatro así (Tetris, fecha sin zona, reload huérfano en Windows, logout).
- Capturas/trozos de log (sin secretos).

### 4. Trampas
- "no funciona, dame fix".
- Leer el stack trace solo por la última línea o por la primera de framework.
- Filtrar secretos/PII en logs; exponer stack al cliente.
- Mensajes de error técnicos (en inglés) que llegan al usuario.
- Tragarse el `{error}` de supabase-js.

### 5. Ambigüedades
- 400 vs 422 sin criterio único (ver 3.4).
- "401/403 → semana 7": inexistente (ver §6).

---

## 3.7 Clase 07 — OpenAPI: el contrato escrito
Archivo: `semanas/03/source_material/07-openapi-el-contrato-escrito.md`

### 1. Qué enseña
- **OpenAPI 3.1** = el estándar para describir una API REST de punta a punta. "Si ya escribiste el bloque del §4, ya pensaste en OpenAPI sin saberlo."
- **Mapeo uno a uno** de las cinco piezas: method → key HTTP (`get/post/delete`) bajo `paths`; path → key de `paths` con `{id}`; schema-in → `requestBody`; cada schema-out → entrada de `responses` indexada por código (`'201'`, `'400'`, `'404'`); "los errores son responses como cualquier otro: 400 y 404 no son adornos, son contrato".
- **Por qué un archivo y no un prompt (tres razones):** (1) **menos ambigüedad** (`type`, `format: date`, `required`… fijan lo que el modelo inventaba cada vez); (2) **codegen real** (Swagger UI con "Try it", cliente TypeScript, mocks, tests de contrato desde el mismo yaml); (3) **durabilidad** (vive en el repo, se versiona, se revisa en PR; editar una línea en vez de redictar el contexto).
- El espejo se cierra: el átomo dictable ahora **tiene archivo**; "la próxima clase lo agarramos y se lo damos a una IA local para que escriba la implementación".

### 2. Qué hacer en NUESTRO TP — (b) y (d)
- **[TAL CUAL]** Tener un `openapi.yaml` (3.1.x) de **nuestra API**, en el repo (la rúbrica lo detecta por nombre `openapi.(yaml|yml|json)` en cualquier carpeta no ignorada, o cualquier yaml que contenga `openapi:`; hoy "se registra pero no descuenta": `rubric.md`).
- **[TAL CUAL]** Beneficios 2 y 3 de la clase como argumentos de defensa: lo usamos de verdad si (i) generamos el **cliente TypeScript** o los tipos desde el yaml (`openapi-typescript` o equivalente, inferencia), (ii) lo renderizamos en Swagger UI/Scalar/Redoc en `/api/docs` o lo pegamos en `editor.swagger.io` como en la demo (el README de TP2 resuelto tiene "Cómo se lee"), (iii) lo versionamos y lo exigimos en cada PR que toque endpoints.
- **[ADAPTAR] Contract-first vs code-first.** La semana 03 enseña **contract-first** (dictás el yaml, después implementás). La semana 04 muestra lo contrario en su repo demo: una regla `api.md` que dice "al tocar un endpoint regenerá `openapi.yaml` con `uv run python scripts/export_openapi.py` y commitealo en el mismo PR" (`semanas/04/source_material/07-CLAUDE-md.md`, `08-rules.md`) — o sea, el yaml se **genera desde el código** (FastAPI). Para nosotros: (1) dictar el yaml primero (contract-first, es el movimiento que evalúa TP2); (2) mantenerlo sincronizado con **un único origen de verdad en código** — schemas zod usados para validar *y* para generar el yaml (p. ej. `@asteasolutions/zod-to-openapi`, `fastify-type-provider-zod` + `@fastify/swagger`; inferencia, verificar versiones); (3) regla `.claude/rules/api.md` con `paths: ["app/api/**","apps/api/**"]` que obligue a actualizarlo; (4) un test de contrato que falle si respuesta e yaml divergen.
- **[ADAPTAR]** **¿Y lo que habla directo con Supabase?** PostgREST publica su propio documento OpenAPI (verificar versión del formato y si el proyecto lo expone con la clave pública). **No lo escribimos a mano ni lo mezclamos con el nuestro**: el contrato de acceso directo a datos = migraciones + tipos generados (`supabase gen types typescript`, verificar CLI) + políticas RLS + una tabla de permisos en `docs/modelo-de-datos.md`.
- **Mini-checklist de calidad del yaml** (derivada de la clase y del TP2 resuelto): separar `XInput` y `X` (el de salida tiene `id`, `createdAt`…); `required` explícito; `format: date`/`date-time`; `$ref` a `components/schemas`; parámetros de path con el mismo nombre en todos lados; **todos** los códigos posibles documentados; `204` sin `content`; `Error` común; `description` en español.
- **Acción verificable:** validar en `editor.swagger.io` (como recomienda la consigna: "si abre sin errores, es válido; si se queja, dice en qué línea") o con un linter en CI (inferencia).

### 3. Evidencia/documentación
- `openapi.yaml` + sección README "Cómo se lee" (`editor.swagger.io`, o `/api/docs` si lo servimos).
- `prompts.md`: el prompt que dictó el yaml y las iteraciones ("agregá DELETE…", "sacá `project_id` del body").

### 4. Trampas
- Yaml que se queda viejo y miente (el contrato muere al no versionarse con el código).
- Documentar solo los 200 y olvidar los errores.
- Copiar un yaml generado sin leerlo (el TP2 resuelto: el error de `project_id` duplicado "no lo vi al leer la respuesta del prompt 1").
- Mezclar el documento de PostgREST con el nuestro.

### 5. Ambigüedades / desactualizado
- El texto cita **`nullable`** entre las keys que "fijan" decisiones. En **OpenAPI 3.1** `nullable` no existe (era de 3.0); se escribe `type: ["string", "null"]`. Como la clase afirma estar en 3.1, es una imprecisión: usar la forma 3.1 (inferencia técnica, verificable en la especificación oficial: `programa.md`, bibliografía [5]).
- La demo usa `{id}` y `{taskId}`, el TP2 resuelto `{projectId}`/`{taskId}`: elegir convención.

---

## 3.8 Clase 08 — Demo en vivo: el modelo escribe el `openapi.yaml`
Archivo: `semanas/03/source_material/08-demo-en-vivo.md`

### 1. Qué enseña
- Guion de cierre: se dicta el contrato del §4 (projects/tasks) a un chat de IA, se lee el yaml endpoint por endpoint mapeando a las cinco piezas, se pide **un endpoint más** (`DELETE /projects/{id}`), se pega en `editor.swagger.io` (Swagger UI + "Try it out"), se edita a mano.
- **Cinco cosas visibles:** tres methods (GET/POST/DELETE), jerarquía de recursos en el path, al menos un error documentado (400/404), schemas tipados (`type`, `required`, `format`), iteración en vivo sin reescribir todo.
- **Prompt inicial** (modelo de plantilla): "Necesito un openapi.yaml (3.1) para una API de …" + bloque `recursos:` (`Project {id,name}`, `Task {id,title,due_date?,project_id}`) + bloque `endpoints:` con códigos.
- Mensajes: "Esto no lo escribimos; lo dictamos." / "El contrato es editable; no es un prompt de un solo tiro." / "El contrato es un archivo: lo editás vos también, no sólo la IA."
- **Qué NO se intenta:** implementación, DB real, deploy, tests. Si la IA ofrece generar el servidor, "el profesor lo corta".
- **Plan B:** pedir el yaml "completo en un solo bloque de código"; si falla el chat o el editor, cualquier otro sirve.

### 2. Qué hacer en NUESTRO TP
- **[TAL CUAL]** Reproducir el movimiento para *nuestro* dominio: prompt inicial con `recursos:` y `endpoints:` (plantilla en Anexo A.2) → leer el yaml endpoint por endpoint (Review) → iterar con prompts cortos → validar en el editor → commitear. Es la mitad documental del "Architect".
- **[ADAPTAR]** Después del contrato, **sí implementamos** (la semana 04 lo hace). Orden recomendado (inferencia): contrato → migraciones+RLS → schemas zod desde el contrato → handlers → UI contra el contrato (cliente tipado).
- **Acción verificable:** guardar el prompt de la demo adaptado y sus respuestas relevantes en `prompts.md`. Fidelidad del registro: "va sin editar, defectos incluidos".
- **[NO APLICA]** "Cualquier chat de IA", "no hay implementación" (en el TP final sí).

### 3. Evidencia/documentación
- `prompts.md` con el prompt inicial del contrato y las iteraciones; captura del Swagger UI renderizado de nuestro yaml (útil para el Demo Day).

### 4. Trampas
- Dejar que la IA pase a implementar sin haber leído el contrato.
- Aceptar el yaml completo sin mapearlo a las cinco piezas (el TP2 resuelto se salvó recién en la segunda lectura).

### 5. Ambigüedades
- Ninguna. Nota: el `plan.md` pide cerrar la clase con el "bridge a semana 4" que se movió a §9.

---

## 3.9 Clase 09 — Trabajo Práctico 2
Archivo: `semanas/03/source_material/09-trabajo-practico-2.md` (+ ejemplo resuelto `semanas/00/source_material/apellido-iisaia/tp2/{openapi.yaml,prompts.md,README.md}`)

### 1. Qué enseña / qué pide
- Dominio libre con **dos recursos que se relacionan** (si no, "la jerarquía no tiene dónde aparecer"). **No hay que implementar nada.**
- **Cuatro requisitos del yaml:** tres methods (GET, POST, DELETE) como mínimo; jerarquía en el path; al menos una respuesta de error (400 o 404); schemas tipados (`type`, `required`, `format`).
- Individual; **una sola conversación de IA**; herramienta libre.
- Entregable `tp2/{openapi.yaml,prompts.md,README.md}`. "**Las dos últimas secciones del README son las que más pesan al corregir. Qué decidiste vos** (anidaste en vez de filtrar, `404` y no `400`, qué dejaste opcional) y **Qué salió mal**."
- El ejemplo resuelto: 5 endpoints/3 paths, **tres prompts**, decisiones tomadas (anidar por pertenencia estructural; schemas Input/Output separados; `204` sin cuerpo; `404` y no `[]`; `due_date` opcional, `title` requerido) y un error propio explicado (`project_id` en el body y en el path, "vino del prompt, no del modelo").
- El yaml "no muere en la entrega: es la entrada de la semana 4".

### 2. Qué hacer en NUESTRO TP — (d) qué reciclar como base documental
**Reciclar (en este orden de rentabilidad):**
1. **La plantilla del README de TP2** como esqueleto de la sección "API" del README final: *Cómo se lee* / *Qué me propuse construir* / *Decisiones que tomé yo* / *Qué salió mal y cómo lo corregí* / *Prompts*.
2. **El `openapi.yaml` de cada integrante del TP2** como semilla estilística y de componentes (`Error`, paginación, `ProjectInput`/`Project`). Importante: **no tengo los TP2 de Quispe ni Villalba** (no están en el material); si sus dominios se parecen (colecciones + items), copiar `components/schemas` y la forma de `paths`; si no, usar el ejemplo del curso solo como referencia de forma. El docente aclara: está "para mostrar la forma y el nivel de detalle esperado, no para que lo copien".
3. **Las decisiones ya pagadas** como reglas en `CLAUDE.md`/`.claude/rules/api.md`: (a) un dato del path no se repite en el body; (b) `404` en vez de lista vacía para recursos padre inexistentes; (c) `204` sin cuerpo en DELETE; (d) los campos que decide el servidor no están en el schema de entrada; (e) schemas Input y Output separados.
4. **El `prompts.md` de TP2** como formato (prompt, "Qué buscaba", "Qué devolvió", "Qué hice con eso") para el log de prompts del contrato.
5. **Lo nuevo respecto del TP2** (lo que el TP final exige y TP2 no): implementación, errores reales con logs, auth, datos persistentes, el vínculo yaml ↔ código (tests de contrato / codegen).
- **Nombre y ubicación:** `openapi.yaml` en `tp-final/` (raíz del proyecto) o `tp-final/docs/openapi.yaml`; cualquiera es detectable. Evitar carpetas `build/`, `dist/` (ignoradas por el detector).
- **Acción verificable:** commit "docs: contrato inicial de la API (openapi.yaml)" **anterior** a los commits de implementación; esa secuencia en el historial es evidencia de "cómo especificaste qué construir, antes de que se escribiera código" (`semanas/00/source_material/02-como-se-aprueba.md`).

### 3. Evidencia/documentación
- README (sección "Contrato") + `openapi.yaml` + `prompts.md`. Ver Top 10.

### 4. Trampas
- Copiar el ejemplo.
- Contrato "completo" sin leerlo (el error de `project_id`).
- Documentar el contrato una sola vez y dejar que diverja.

### 5. Ambigüedades
- El TP2 es **individual** y de una conversación; el TP final es de grupos de 2–3 (nota del 2026-09-23). Para nuestro contrato final no rige el límite de "una conversación".

---

## 3.10 Síntesis para NUESTRO proyecto (preguntas (a)–(d) del encargo)

### (a) Modelo de datos — ver 3.5
Resumen: **relacional por entidad** (usuarios, proyectos, presets, catálogo) por integridad/consultas globales/vida propia; **`jsonb` solo para la escena** porque es jerárquica, flexible y "siempre se lee todo junto"; referencias por id al catálogo; `schema_version` + `version` (control optimista). Todo justificado con criterios literales de `05-datos-relaciones-vs-documentos.md`; la parte `jsonb`/híbrido es extensión nuestra.

### (b) Contrato cliente-servidor con Supabase
**¿Hace falta un backend propio visible?** Respuesta en cuatro puntos:
1. **Consigna y programa lo piden:** `semanas/04/source_material/14-trabajo-final.md`: "Un producto con frontend y backend. Algo que corre en un servidor… El backend requiere que dictés endpoints, contratos, modelos de datos". `programa.md`, objetivo 2: "Formalización de contratos mediante OpenAPI".
2. **Supabase-only es defendible en concepto** (la clase 01 dice que backend ≠ servidor web y que lo esencial es custodiar datos y reglas) pero **débil** como evidencia de "endpoints que dictaste" y **no pasa el detector** (ver §4).
3. **Recomendación:** una **API propia delgada** (route handlers de Next *o* un servicio aparte; ver opciones en §4.3) para las operaciones con reglas de negocio, con **contrato dictado** y `openapi.yaml`; supabase-js directo para lo trivial y de solo lectura (catálogo/presets) y para Auth. Regla de costura (inferencia): *el navegador no escribe tablas de dominio directamente; las escrituras pasan por la API, que reenvía el JWT del usuario para que la RLS siga vigente y usa `service_role` solo para operaciones de sistema (instanciar preset, exportar)*.
4. **¿Qué contrato en cada frontera?**

| Frontera | Quién habla con quién | Contrato | Artefacto | Cómo se verifica |
|---|---|---|---|---|
| UI → API propia | navegador → route handlers/servicio | bloques de contrato de 5 piezas | `openapi.yaml` + schemas zod | tests de contrato + Swagger UI |
| UI → Supabase directo (Auth, lecturas simples) | navegador → PostgREST/Auth | esquema + RLS + tipos | migraciones + `supabase gen types` + tabla de permisos | tests de políticas con usuarios A/B (inferencia) |
| Editor ↔ persistencia | editor → grafo JSON | esquema de escena versionado | `SceneV{n}` zod + `schema_version` | validación en la API |
| Shell ↔ editor (`@pascal-app/*`) | componentes → adaptador | `EditorAdapter` (interfaz TS) | `lib/editor/adapter.ts` | tipos + test del adaptador |
| API → Postgres | handlers → DB | consultas con el JWT del usuario | RLS + migraciones | tests de integración |

**Cómo se adapta el `openapi.yaml`:** describe *solo* lo que dictamos (`/api/...`); lleva `securitySchemes: bearerAuth` (JWT de Supabase); `components/schemas`: `Project`, `ProjectInput`, `Scene`, `SceneInput`, `Preset`, `CatalogItem`, `Error`. La parte PostgREST **se cita, no se copia**.

### (c) Errores y observabilidad — ver 3.6
Resumen: contrato único de errores (castellano), mapa de status justificado (404 por RLS, 409 por versión, 422/400 elegido), capa única de traducción en cliente (que además se traga el `{error}` de supabase-js si no existe), logs de tres líneas por request y un incidente real narrado en el README con el formato de la clase.

### (d) Qué reciclar de TP2 — ver 3.9
Resumen: esqueleto del README del TP2, forma del yaml, reglas ya pagadas (path≠body, 404≠`[]`, 204, Input≠Output), y el formato de `prompts.md`; el commit del contrato **antes** de implementar es la evidencia.

---

# PARTE III — LA RÚBRICA: CÓMO "VE" EL CORRECTOR EL FRONTEND Y EL BACKEND

Fuente: `.claude/skills/grading/scripts/grading_lib.py` (`detect_repo`, `_FRONT_FRAMEWORKS`, `_BACK_FRAMEWORKS`, `_framework_signal`, `suggest_grade`), `rubric.md`, `SKILL.md`, `detect.py`, `test_grading_lib.py`, `docs/superpowers/specs/2026-06-22-grading-skill-design.md`.

## 4.1 Qué hace exactamente el detector
- `_walk` recorre el repo salteando `.git, node_modules, .venv, venv, __pycache__, dist, build, .next, .cache`.
- **frontend** = *cualquier* archivo `.jsx/.tsx/.vue`, **o** un `package.json`/`requirements.txt`/`pyproject.toml` cuyo texto (en minúsculas) contenga la subcadena `react`, `vue`, `vite`, `next`, `svelte` o `angular`.
- **backend** = **solo** un `package.json`/`requirements.txt`/`pyproject.toml` cuyo texto contenga `fastapi`, `flask`, `django`, `uvicorn`, `express` o `fastify`. **No hay extensiones de archivo que cuenten** (`extra_ext=set()`).
- **Bad UI** = cualquier archivo llamado `index.html` en cualquier carpeta no ignorada. **OpenAPI** = `openapi.(yaml|yml|json)` o un `.yaml/.yml` que contenga `openapi:`. **CLAUDE.md** = cualquier archivo llamado `claude.md`.
- **Nota sugerida:** `final.found = frontend OR backend`. Base 9; −1 sin Bad UI; −1 sin CLAUDE.md; **−2 si no están frontend *y* backend**; −2 si no presentó el final; −0,5 sin idea; +1 por señales de superpowers solo si el núcleo está completo (nota: el código **no** exige OpenAPI para el bonus, aunque `rubric.md` lo lista; manda el código). La skill "sugiere; el docente confirma" (`SKILL.md`, Fase 5) y marca "⚠ revisar" los finales incompletos.

## 4.2 Simulación (copia de `grading_lib.py` fuera del repo del curso; presento_final=True, presento_idea=True)

| Layout hipotético | frontend | backend | nota sugerida |
|---|---|---|---|
| A. Next + Supabase + R3F, route handlers en `app/api/` | `package.json: react` | **no detectado** | **7,0** (base 9, −2 "final incompleto") |
| B. A + `apps/api/package.json` con `fastify` | sí | `package.json: fastify` | 9,0 |
| C. A + **Hono** (`hono`, `@hono/zod-openapi`) | sí | **no detectado** (`hono` no está en la lista) | **7,0** |
| D. A + `api/pyproject.toml` con `fastapi` | sí | `pyproject.toml: fastapi` | 9,0 |
| E. A + solo `@types/express` en devDependencies | sí | **detectado (falso positivo por subcadena)** | 9,0 — *no es una vía legítima, solo muestra la fragilidad* |
| F. B/D pero **sin ningún `index.html`** en el repo | sí | sí | 8,0 (−1 Bad UI) |
| G. Servicio backend dentro de una carpeta `build/` | sí | **no detectado** (carpeta ignorada) | 7,0 |

Conclusiones: (1) Next + Supabase **no cuenta como backend** para el script; (2) el detector es de subcadenas sobre manifiestos, no entiende arquitectura; (3) hay efectos colaterales a cuidar (`index.html`, carpeta `build`/`dist`, `CLAUDE.md`).

## 4.3 Cómo hacer visible un backend genuino sin forzarlo (propuestas — inferencia)

**Test de genuinidad** (tres preguntas; con una sí alcanza):
1. ¿Hay una **regla/operación que no puede vivir en el cliente**? (validar y versionar la escena antes de persistirla; instanciar un preset copiando y re-identificando nodos; límites/cuotas; presupuesto/lista de materiales calculado en servidor para que no se falsifique; exportar plano/PDF/DXF/IFC.)
2. ¿Necesita **secretos o `service_role`** que no pueden estar en el navegador?
3. ¿Se beneficia de un **contrato HTTP explícito que dictamos nosotros** (y que el front consume con un cliente generado)?

**Opciones** (de menor a mayor costo; elegir por ingeniería, no por el detector):

| Opción | Qué es | Pro | Contra | Detector |
|---|---|---|---|---|
| **A. Route handlers de Next + RLS** | API dentro de Next (`app/api/**/route.ts`) | mínimo costo, un deploy, sin CORS | invisible para el script (**−2 sugerido**); hay que defenderlo a mano | no |
| **B. Servicio propio en TypeScript: `apps/api` (Fastify)** dentro de un workspace pnpm | API real, `@fastify/swagger` genera el yaml y Swagger UI desde los schemas, comparte tipos zod con el front en `packages/contract` | misma lengua y toolchain (pnpm), contrato-código sincronizados, cumple la rúbrica de forma natural | segundo deploy (Vercel Functions / otro host), CORS o rewrite, más piezas en 2 días (verificar soporte de Fastify en Vercel) | sí (`fastify`) |
| **C. Servicio Python con FastAPI en `api/` o `apps/api`** | espejo de la referencia del curso (`/docs`, `export_openapi.py`, regla `api.md`) | el material de las semanas 03–04 está en FastAPI; agentes lo escriben muy bien; si hay export IFC/DXF/PDF hay librerías Python naturales | dos lenguajes y dos toolchains (pnpm + uv); tipos TS solo vía codegen desde el yaml (que es justamente la tesis de la clase 07) | sí (`fastapi` en `pyproject.toml`) |
| D. Edge Functions de Supabase (Deno) | lógica en Supabase | cerca de la DB | no detectado; menos alineado con el material | no |

- **Recomendación (inferencia):** **B** si ambos manejan TypeScript y el objetivo es cumplir con poco riesgo; **C** solo si hay un caso de dominio real para Python (exportaciones) o si prefieren replicar el stack del curso. **No** hacer: agregar una dependencia solo para satisfacer el substring (opción E), ni inventar un servicio vacío.
- **Qué va a la API y qué no** (para que no sea decorativa): ver regla de costura en 3.10(b). Todo lo que sea CRUD de dominio con regla (escena, proyecto desde preset, exportar) pasa por la API; Auth y lecturas triviales, por supabase-js.
- **Visibilidad para humanos (independiente del script):** carpeta con nombre explícito (`apps/api` o `backend/`), `CLAUDE.md` dentro, README "Arquitectura" con diagrama, tabla de endpoints, `openapi.yaml` y Swagger UI en `/docs`. En la defensa: apoyarse en la definición de backend de la clase 01 (cuatro formas; RLS/constraints/Auth también son backend).
- **Precauciones de estructura** que dependen del detector (aunque no del código): mantener la estructura "un repo, una carpeta por entrega" (`tp1/`, `tp2/`, `tp-final/`; `semanas/00/source_material/03-tu-repositorio.md`) para que `index.html` de TP1 siga contando; no nombrar carpetas `build/` ni `dist/` para código fuente; `CLAUDE.md` en la raíz (cualquiera sirve, pero la raíz es obvio); las señales de superpowers por directorio solo se buscan en `<raíz>/.claude/skills` y `<raíz>/docs/superpowers` (no en `tp-final/` anidado) — si el repo es "umbrella", poner `docs/superpowers/` en la raíz o mencionar `brainstorming`/`writing-plans` en algún `.md` (el escaneo de texto sí es recursivo).
- **Riesgo de dupla (inferencia sobre `build_roster`/`detect.py`):** el detector evalúa **por alumno** sobre las carpetas/repos asociados a su email. Si `tp-final/` vive en el repo de uno solo, el otro integrante podría figurar con "sin proyecto final" (nota piso ~4) hasta que el docente lo corrija a mano. Mitigación a consultar: ¿ambos mandan el link por mail? ¿se les asocia el mismo repo? (ver Preguntas abiertas).

---

# PARTE IV — CONTRADICCIONES, DESACTUALIZACIONES Y CAMBIOS (consolidado)

| # | Tema | Qué dice A | Qué dice B | Manda | Por qué |
|---|---|---|---|---|---|
| 1 | Equipo del TP final | `semanas/00/source_material/02-como-se-aprueba.md`: tres TPs individuales, "tampoco en la última" | `semanas/04/source_material/14-trabajo-final.md` (nota 2026-09-23): grupos de 2–3, `tp-final/` en el repo de uno, defensa conjunta | **semana 04** | nota "Estado" posterior que el propio archivo marca como vigente; `grading_lib.parse_presentations` ya contempla duplas con `+` |
| 2 | Modalidad de la actividad de la semana 02 | `programa.md`: "construcción **grupal**" | `07-actividad-practica.md` y `spine.md`: **individual** | **07/spine** | describen lo dictado |
| 3 | Nombre de los roles del ciclo | `programa.md`: Architect → Prompter → Reviewer → Tester | 07/spine: Architect → Prompt → Review → Test | **07/spine** | mismas cuatro tareas; el segundo es lo dictado |
| 4 | "Semana 3 cubre el single-file server" | `semanas/02/.../05-single-file-platform.md` | semana 03 no implementa nada (`01`, `08`, `09`) | **semana 03** | lo dictado |
| 5 | Sexta pieza de la anatomía backend | `03/01…`: "Salto al stack local" | `03/spine.md`, `plan.md`, `backend-flow.js`: OpenAPI | **spine/plan** | canónicos |
| 6 | Query param | `03/04…`: "modifica una lectura" | `plan.md` Task 4: evitar "modifica" (choca con PATCH) → "ajusta el pedido" | **plan** | decisión de redacción explícita |
| 7 | `nullable` | `03/07…` | OpenAPI 3.1 no tiene `nullable` (`type: ["string","null"]`) | **la especificación 3.1** (inferencia técnica; la clase dice 3.1) | verificar en spec.openapis.org |
| 8 | Auth y 401/403 "semana 7" | `03/02, 03, 06`, `plan.md` | `programa.md` pone MCP en semana 7; `semanas/07/source_material/index.md` es placeholder "Calidad, Seguridad y Testing" | **no hay clase de auth** | el material dice "semana 7" pero no existe contenido; las decisiones de Supabase Auth/RLS son nuestras |
| 9 | Éxito de `POST` en `backend-flow.js` | texto: "status 201" | código: `200 OK` | **201** (contrato de §4) | cosmético, no copiar |
| 10 | Rúbrica: OpenAPI | spec de grading 2026-06-22: −1 si falta | `rubric.md`: "no descuenta" | **`rubric.md`** | posterior; "relevancia no aclarada en clase" |
| 11 | Rúbrica: bonus superpowers | `rubric.md`: núcleo incluye OpenAPI | `suggest_grade`: `core_complete` no exige OpenAPI | **el código** | es lo que se ejecuta; igual conviene tener OpenAPI |
| 12 | Objetivo del Demo Day | `programa.md` S8: "exposición del **MVP** funcional" | encargo: app final, no MVP | ambos | el MVP es el piso del programa; el alcance mayor es riesgo de scope nuestro |
| 13 | "Átomo dictable" del frontend | `03/04…`/`spine` S3: "componente con props y estado" de la semana 02 | semana 02 no enseña componentes (es vanilla) | — (hueco) | lo definimos nosotros (contrato de componente, §2.9) |
| 14 | 400 vs 422 | `03/06`: "400 o 422"; `03/04`: "mover un 400 a 422" | TP2 resuelto: 400; TP final resuelto: 422 | **decisión nuestra** | documentar |
| 15 | Conversación única | TP1/TP2: una sola conversación | TP final con Claude Code: múltiples sesiones | — | decidir qué evidencia reemplaza (spec/plan/PRs) |
| 16 | Título "doce sustantivos" | `02-estructura-html.md` | lista > doce; spine: siete estructurales | **spine** | detalle |

---

# TOP 10 — Lo que NO puede faltar en nuestro repo (de las semanas 02 y 03)

1. **`openapi.yaml` (3.1) de nuestra API, dictado ANTES de implementar**, con las cinco piezas por endpoint, schemas `Input`/`Output` separados, todos los códigos (incl. errores) y un `Error` común; validado en Swagger y mantenido sincronizado (regla `.claude/rules/api.md` + tests de contrato). Commit del contrato anterior al código.
2. **Un backend genuino y visible**: servicio/API con responsabilidades reales (reglas que no se pueden saltear), con `fastify`/`fastapi` (o equivalente detectable) en su manifiesto **por razones de ingeniería**, y documentado en el README. Evitar el escenario "solo Next + Supabase" (−2 sugerido).
3. **Modelo de datos justificado con los criterios de la clase 05**: relacional por defecto + `jsonb` solo para la escena ("siempre se lee todo junto"); `schema_version` + `version`; migraciones, seed y RLS versionados en `supabase/`; documento `docs/modelo-de-datos.md`.
4. **README = informe** con las secciones que el curso pesa más: **"Qué decidí yo"** (empaque multi-archivo, 3D, datos jsonb, 404 vs 403, PUT de escena, 400/422…) y **"Qué salió mal y cómo lo corregí"** con evidencia leída (respuesta cruda, log, stack), más un **mapa de apropiación** (qué es nuestro vs qué es `@pascal-app/*`).
5. **Tabla de estados del shell y contratos de componente** (estado con dueño, valor inicial y transiciones de **ida y vuelta**), escrita antes de pedir UI; el grafo de escena como única verdad persistida.
6. **`prompts.md` etiquetado por patrón (P1–P4 adaptados) y por rol del ciclo** (Architect/Prompt/Review/Test) con "qué buscaba / qué devolvió / qué hice", sin editar defectos; revisión cruzada entre los dos integrantes.
7. **Tokens de diseño (variables CSS) + puente al canvas (`theme3d.ts`)**, HTML semántico y a11y del shell (`header/nav/main/aside/article/form`, `button aria-pressed`, `label`, `alt`).
8. **Manejo de errores completo**: contrato de errores en castellano, capa única de traducción en el cliente (sin tragar `{error}` de supabase-js), logs de tres líneas por request y un incidente real narrado con el formato "síntoma → log → causa en nuestra primera línea → arreglo".
9. **Reglas de contrato ya pagadas por el curso** convertidas en `CLAUDE.md`/rules: dato del path no se repite en el body; campos del servidor fuera del schema de entrada; `404` en vez de lista vacía / `404` en vez de `403` por RLS; `204` sin cuerpo; sin verbos en URLs; idempotencia decidida (`PUT` de escena) y plural/anidación coherentes.
10. **Estructura de repo y evidencia de proceso compatibles con la corrección**: umbrella `tp1/ tp2/ tp-final/` (con `tp1/index.html`), `CLAUDE.md` raíz y por mitad, spec y plan en disco (`docs/superpowers/` en la raíz), commits por pieza que se puede abrir y probar, branches y PRs, `.env.example`, sin carpetas `build/`/`dist/` para código, lockfile pnpm commiteado.

---

# PREGUNTAS ABIERTAS PARA EL DOCENTE

1. **Backend y rúbrica:** ¿una app Next.js con route handlers + Supabase (Postgres/RLS/Auth) cuenta como "backend" en la corrección, o se espera un servicio de servidor propio (FastAPI/Express/Fastify)? (El script solo reconoce estos por manifiesto.)
2. **OpenAPI en el final:** ¿se espera un `openapi.yaml` de la API final? (`rubric.md` dice que hoy no descuenta, pero la consigna de la semana 04 habla de contratos.) ¿Se acepta que el yaml se genere desde el código (zod / FastAPI) y se commitee?
3. **Dupla:** el material de la semana 00 dice individual y la semana 04 dice grupos de 2–3 (2026-09-23). ¿Cómo se corrige a cada integrante cuando `tp-final/` está en el repo de uno solo? ¿Los dos mandan el link por mail? ¿Cada uno defiende todo?
4. **Alcance:** `programa.md` habla de "MVP funcional" en el Demo Day; nuestra meta es una app más completa. ¿Se evalúa por completitud de producto o por apropiación del recorte presentado?
5. **Autenticación/autorización:** la semana 03 manda 401/403 y tokens a "semana 7", pero esa semana es MCP. ¿Habrá material de auth? ¿Se acepta Supabase Auth + RLS como solución (en lugar de Auth0 del ejemplo)?
6. **Librería de terceros grande (Pascal Editor):** ¿cómo se evalúa la apropiación cuando el motor de edición es externo? ¿Qué nivel de explicación se espera del código de `@pascal-app/*` vs del shell, datos y contrato propios?
7. **Lenguajes/stack:** ¿se acepta un proyecto con TypeScript + Python (si optamos por FastAPI para exportaciones)? ¿Se acepta pnpm monorepo?
8. **Registro de prompts en Claude Code:** sin "una sola conversación", ¿qué cuenta como `prompts.md` (prompts curados + specs/plans en disco + PRs)? ¿Hay que exportar transcripciones?
9. **Bonus superpowers:** el detector busca `<raíz>/.claude/skills` y `<raíz>/docs/superpowers`. ¿Vale tenerlos dentro de `tp-final/` si el repo es umbrella?
10. **Rúbrica formal y fechas:** la semana 04 dice que la rúbrica y el calendario "se entregan en otro momento". ¿Hay versión actual? ¿Hay entregas parciales?
11. **Archivos pedidos en el README:** `programa.md` enumera "fragmentos clave del código generado" y "observaciones arquitectónicas" además de las secciones del ejemplo resuelto. ¿Son obligatorias?

---

# ANEXOS (plantillas listas para usar)

## A.1 Bloque de contrato (formato de la clase 04)
```
<METHOD> <path>
  parámetros de path/query: [...]
  entrada (body): campo tipo, requerido|opcional ...
  salida <código éxito>: { forma exacta }
  salida <código error>: { error: { code, message } }   # una línea por cada caso previsto
  idempotente: sí|no   ·   auth: requerida|pública   ·   campos que decide el servidor: [...]
```

## A.2 Prompt inicial del contrato (formato de la demo 08, adaptado)
```
Necesito un openapi.yaml (3.1) para la API del diseñador de interiores.

recursos:
  Project  { id, name, kind (vivienda|comercio), presetId?, createdAt, updatedAt }
  Scene    { schemaVersion, version, scene (objeto), updatedAt }
  Preset   { id, slug, name, kind, description }
  CatalogItem { id, sku, category, name, price }

endpoints:
  GET    /api/projects                          -> 200 lista / 401
  POST   /api/projects                          -> 201 / 401 / 404 si presetId no existe / 422
  GET    /api/projects/{projectId}              -> 200 / 401 / 404
  PATCH  /api/projects/{projectId}              -> 200 / 401 / 404 / 422
  DELETE /api/projects/{projectId}              -> 204 / 401 / 404
  GET    /api/projects/{projectId}/scene        -> 200 / 401 / 404
  PUT    /api/projects/{projectId}/scene        -> 200 / 401 / 404 / 409 / 413 / 422
  GET    /api/presets?kind=&q=                  -> 200
  GET    /api/catalog/items?category=&q=&page=  -> 200

Reglas: los schemas de entrada y salida son distintos (el servidor genera id, ownerId, createdAt,
updatedAt, version); projectId viaja solo en el path; todas las respuestas de error usan el
schema Error { error: { code, message, requestId } }; mensajes en castellano; securitySchemes bearerAuth.
```

## A.3 Checklist de Review del yaml (lo que se busca al "leer endpoint por endpoint")
`paths` → clave del method → `parameters` → `requestBody` → `responses` ↔ method, path, schema-in, schema-out, errores. Preguntas: ¿hay un dato en path y body? ¿hay algún código sin documentar? ¿Input y Output separados? ¿`format` donde corresponde? ¿nombre de parámetro consistente (`projectId`)? ¿`204` sin `content`?

## A.4 Plantilla de prompt de depuración con evidencia (clase 06)
```
<METHOD> <path> devuelve <código>.
Log relevante:
  <línea de error>  en <archivo:línea de NUESTRO código>
Handler actual:
  <código>
Request que mandé: <body>
¿Por qué falla? Quiero entender la causa antes del parche; planteá hipótesis y decime cuál descartás y por qué.
```

## A.5 Cuatro "reglas de oro" para pegar en `CLAUDE.md` (de estas dos semanas)
- Antes de escribir código, el contrato (spec + `openapi.yaml` + modelo de datos) está escrito y commiteado.
- Un dato que viaja en el path no viaja en el body; los campos del servidor no están en los schemas de entrada.
- El estado tiene dueño y se nombra; el grafo de escena es la única verdad persistida; lo derivado se recalcula.
- Nada de colores/espacios hardcodeados: tokens; el canvas lee los tokens vía `theme3d.ts`.

---

## Archivos del curso en los que me baso (todos leídos completos)
- Semana 02: `semanas/02/spine.md`, `semanas/02/plan.md`, `semanas/02/source_material/{index,01-frontend-y-el-supervisor,02-estructura-html,03-estilo-css,04-estado-y-comportamiento,05-single-file-platform,06-patrones-de-prompt-ui,07-actividad-practica}.md`, `semanas/02/source_material/demo.html`.
- Semana 03: `semanas/03/spine.md`, `semanas/03/plan.md`, `semanas/03/source_material/{index,01-backend-y-el-supervisor,02-cliente-servidor-y-http,03-rest-como-estilo,04-rutas-controladores-y-contratos,05-datos-relaciones-vs-documentos,06-errores-y-observabilidad,07-openapi-el-contrato-escrito,08-demo-en-vivo,09-trabajo-practico-2}.md`, `semanas/03/slides/backend-flow.js`.
- Contraste: `programa.md`, `semanas/00/source_material/{index,02-como-se-aprueba,03-tu-repositorio}.md`, `semanas/00/source_material/apellido-iisaia/{README.md,tp1/*,tp2/*,tp-final/README.md,tp-final/CLAUDE.md,tp-final/backend/CLAUDE.md,tp-final/frontend/CLAUDE.md,tp-final/.claude/rules/api-y-datos.md}`, `semanas/04/source_material/14-trabajo-final.md` (+ menciones de `openapi.yaml` en `07-CLAUDE-md.md`, `08-rules.md`, `11-skills-y-slash-commands.md`), `semanas/07/source_material/index.md`.
- Rúbrica: `.claude/skills/grading/{SKILL.md,rubric.md}`, `.claude/skills/grading/scripts/{grading_lib.py,detect.py,build_roster.py,test_grading_lib.py}`, `docs/superpowers/specs/2026-06-22-grading-skill-design.md`.

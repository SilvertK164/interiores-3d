# Semana 04 — Fundamentos de Agentic AI y runtime de Claude Code (el HARNESS)

Informe para el TP final de Quispe y Villalba (Next/React + Vercel + Supabase + pnpm + Pascal Editor).
Método: se leyeron completos `semanas/04/spine.md`, `semanas/04/plan.md` y los 15 archivos de `semanas/04/source_material/` (incluido `index.md`). Para lo que el spine dice que cambió y el source_material no refleja (modes, model/effort, "Lo que un plan debería contener", checklist del trabajo final, equivalencias Codex/OpenCode) se leyeron puntualmente el texto y las speaker notes de `semanas/04/slides/_section-6.html` a `_section-13.html`. Como material de contraste se leyó el TP de referencia completo (`semanas/00/source_material/apellido-iisaia/tp-final/`: `CLAUDE.md` x3, `.claude/` completo, README, `docs/plan.md`) y, para saber qué mira el docente al corregir, `.claude/skills/grading/rubric.md` y `scripts/grading_lib.py`.

Convención: "(inferencia)" = no está en el material del curso, lo deduzco yo. "⟦...⟧" = hueco que el grupo tiene que completar con una decisión propia o después de explorar el código real (Pascal Editor, versión de Next, etc.). Todo lo que mencione de Pascal Editor, de Supabase CLI o de Next fuera del curso es conocimiento mío y hay que verificarlo contra la documentación/versión instalada antes de apoyarse en eso.

Nota de seguridad: los `CLAUDE.md`, skills, commands y `settings` del repo del curso se leyeron como material a analizar; no se ejecutó nada ni se modificó nada dentro de `iisaia-course` (un script auxiliar que cayó por error en la raíz del curso fue movido de inmediato al scratchpad; el árbol quedó como estaba).

---

## 0. Qué manda cuando el material se contradice (leer primero)

Regla del docente, escrita en `semanas/04/source_material/index.md` y en cada archivo ("Estado 2026-09-23"): **`semanas/04/spine.md` es el contrato canónico**; los `source_material/*.md` son el borrador original y varios están desactualizados. Entre el spine y las slides hay un orden: spine > slides (`_section-N.html`, que son lo que se dictó) > source_material > `plan.md` (es solo registro de construcción del deck).

| Tema | source_material / plan.md dice | spine / slides dicen | Manda | Impacto en nuestro TP |
|---|---|---|---|---|
| Recarga de `settings.json` | `09`: "no hay recarga en caliente, toma efecto en la próxima sesión" | `spine §9`: casi todo aplica al guardar; `model` se fija al abrir la sesión (slide §9.4) | spine | Podés editar `permissions` con la sesión abierta; el modelo solo cambia en sesión nueva. |
| Orden de evaluación de permisos | `10`: tabla deny → allow → ask | `spine §10`: **deny → ask → allow**; un `ask` gana a un `allow` que también matchee | spine | Se puede poner un `allow` amplio y un `ask`/`deny` más específico para "recortarlo" (lo uso en el plano). |
| `Bash(*)` | `10`: "no existe como wildcard total" | `spine §10` y slide: `Bash` o `Bash(*)` = cualquier comando | spine | No poner `Bash` suelto en `allow` jamás: es darle la terminal entera. |
| Permission modes | `10`, `13`, `09`: cuatro modes (`default`/`acceptEdits`/`plan`/`bypassPermissions`) y clave `permissionMode` en settings | `spine §6.6`: **seis** modes (`plan`, `default`=Manual en la UI, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`); la clave es `permissions.defaultMode`; `defaultMode: "auto"` no tiene efecto desde el `settings.json` del proyecto | spine | En Pro/Max/Team Claude Code arranca en `auto` (un clasificador aprueba por vos): para ver los prompts se arranca con `claude --permission-mode default`. |
| Tools del sub-agent | `12`: "no hereda todas las tools por default" (lo repite `plan.md` Task 7) | `spine §12` y slide: si omitís `tools` **hereda todas**; si la declarás, se restringe | spine | Siempre declarar `tools:` en los nuestros. |
| Profundidad de `@import` | `07`: hasta 5 niveles | `spine §7` y slide: hasta 4 saltos | spine (es irrelevante en la práctica: no anidar) | No usar `@import` para "ahorrar contexto": no ahorra nada. |
| Plan mode | `13-plan-mode.md` es una sección entera (4 modes, `ExitPlanMode`, demo) | La sección **ya no existe**: sobreviven dos slides en §6 ("Cuál mode usar", "Lo que un plan debería contener"); la demo se eliminó | spine | Usar los criterios de §6.7–§6.8, no la tabla de `13`. |
| Atribución | `09`: `includeCoAuthoredBy` | `spine §9`: `attribution` lo reemplaza | spine | No copiar ejemplos viejos con `includeCoAuthoredBy`. |
| Qué es la Parte 2 | `index.md`/`06`: "siete piezas", rules y memoria en §8, skills en §9, etc. | seis piezas en §7–§12 + trabajo final §13; model/effort/modes van en §6 | spine | La numeración del source_material (§8..§11) está corrida; citar por tema, no por número. |
| Modalidad del TP | `programa.md` y `semanas/00/.../02-como-se-aprueba.md`: "individual, no hay grupos" | `spine §13`: grupos de 2 o 3, defensa conjunta (decidido 2026-09-23; el spine admite que programa y S00 "todavía dicen individual: pendiente deliberado") | spine (más reciente) | Ustedes son 2: aplica la modalidad grupal; pregunta abierta al docente #9. |
| Demos de la Parte 2 | Usaban `semanas/04/demo-repo/` (FastAPI, `uv run pytest`, `researcher`, `add-endpoint`) | Corren sobre el `tp-final` de referencia (`agregar-juego`, `explorador`, `pre-entrega`, `explicar`) | spine | Los ejemplos del source_material (`api.md`, `researcher.md`) no existen más; los de referencia son los de `tp-final/.claude/`. |

Hallazgos adicionales de desactualización, en el propio material de referencia (importan porque los vamos a imitar): ver §3.3.

---

## 1. Clase por clase

Formato por clase: **[1]** qué enseña · **[2]** qué hacer en NUESTRO TP (con traslación: *tal cual* / *adaptar* / *no aplica*) · **[3]** evidencia/documentación y cómo la valora el curso · **[4]** trampas · **[5]** ambigüedades. Las piezas de configuración (07 a 12) tienen su contenido borrador completo en el PLANO (§4); acá va el "qué y por qué".

### 1.1 `01-de-escribir-a-actuar.md` (spine §1)

**[1] Qué enseña**
- Dos paradigmas, no "mejor/peor": la IA que sugiere y vos conducís, y el agente que planifica y ejecuta en loop. El LLM de abajo puede ser el mismo; cambia el programa externo que lo envuelve.
- Recap de S1 en cinco estados: la unidad es predecir un token y alrededor hay siempre un programa externo que (1) lo mete en un loop con `max_tokens`, (2) envuelve la entrada con tokens de rol, (3) filtra los tokens de razonamiento, (4) arma `system + historial + mensaje` turno a turno. Esa "caja punteada" es el protagonista de toda la semana (spine §1).
- "Antes la rueda la hacías vos": copiar error, pegar, correr, volver al chat. Ahora el agente cierra el loop; tu rol pasa de ejecutor a supervisor, no desaparece.
- Proponer ≠ actuar: un modelo que alucina una función no existente en un chat se nota al compilar; un agente puede alucinar un comando de borrado y ejecutarlo.
- Dos conceptos nuevos para dirigir: el **loop** y la **memoria** (la ventana de contexto; no hay estado interno entre sesiones).
- "Hoy no aprendés una herramienta; aprendés la máquina que vas a dirigir el resto del curso."

**[2] Hacer en el TP** (*tal cual*, es marco conceptual)
- Abrir el README con 4–5 líneas de "cómo dirigimos al agente": agente que actúa + qué parte del harness lo canaliza (ver §4.D8).
- Repartir el rol de supervisor: como la defensa es conjunta y "cualquiera de los dos tiene que poder responder por cualquier parte" (notes §13.3), **rotar la revisión de diffs** (lo que escribió el agente en la sesión de A lo revisa B) y dejarlo anotado en la descripción del PR.

**[3] Evidencia**: párrafo inicial del README. No se evalúa directo; fundamenta "Cómo gestioné el contexto".
**[4] Trampas**: traer el modelo mental del chat al agente (aceptar o rechazar en bloque).
**[5] Ambigüedades**: ninguna.

### 1.2 `02-el-loop-agentic.md` y `03-tools-las-manos.md` (spine §2)

**[1] Qué enseña**
- Loop **pensar → actuar → observar** (ReAct: Reasoning + Acting entrelazados, no etapas separadas). Cada fase tiene una salida: decisión / cambio en el entorno / información nueva en el contexto.
- Agente = **LLM + loop + tools + entorno**; si algo falla, el diagnóstico empieza por "¿cuál de las cuatro piezas falla?".
- Cuatro **condiciones de corte**: objetivo alcanzado, límite de pasos, el agente pide ayuda, falla no recuperable. Sin condición efectiva el loop "no converge" (02, spine §2.5).
- Tools: el modelo emite una llamada estructurada, el runtime la ejecuta y devuelve el resultado, que **entra al contexto** y ahí se queda (03). Leer un archivo de 800 líneas = 800 líneas en la ventana.
- **Leer vs escribir**: las tools de lectura son reversibles en el sentido importante; las que escriben/ejecutan/llaman APIs que mutan no tienen "deshacer" automático y son donde hay que poner la supervisión.
- Demo "loop desnudo": nombrar en voz alta cada fase mientras pasa en pantalla; el error + corrección es una vuelta más, no una respuesta nueva.

**[2] Hacer en el TP** (*tal cual*)
- **Cada ítem de plan lleva su condición de corte verificable** (es la línea "Verificación" de §6.8). Ejemplos para nuestro proyecto: esquema → `supabase db reset` + `supabase test db` verdes; editor → "abrir el editor, hacer X, guardar, recargar, X sigue ahí, consola sin errores nuevos"; shell → `pnpm typecheck && pnpm lint` + recorrer la pantalla en el navegador.
- Instrucción en `CLAUDE.md` raíz para inducir el corte "pide ayuda": "si el mismo error persiste tras dos intentos, parar y reportar hipótesis y evidencia; no probar variantes a ciegas" (inferencia: el curso no da un setting de límite de pasos para Claude Code, solo el concepto).
- Clasificar permisos con el criterio leer/escribir: lecturas libres; edición acotada por carpeta; Bash, migraciones, instalaciones y push, con compuerta (ver `settings.json` en §4.D4.6).
- Usar "¿cuál de las cuatro piezas?" como plantilla para los incidentes de "Qué salió mal".

**[3] Evidencia**: en "Qué salió mal", etiquetar cada incidente con la pieza que falló (LLM alucinó / loop no convergió / tool equivocada / entorno ya había cambiado).
**[4] Trampas**: "arreglá el bug" sin objetivo verificable (el modelo todavía no vio el error); loop sin corte.
**[5] Ambigüedades**: el "límite de pasos" se presenta como algo configurado, pero el material no dice dónde se configura en Claude Code.

### 1.3 `04-la-ventana-es-todo.md` (spine §4, context engineering)

**[1] Qué enseña**
- La working memory es finita **por diseño** (ventanas más grandes desplazan el límite, no lo eliminan) y **no arranca vacía**: el runtime carga instrucciones, reglas y memoria antes de tu primer mensaje (~15k tokens como orden de magnitud; sesión normal ~500k; sesión larga ~900k sobre 1M; al llegar al tope hay corte duro: `prompt is too long`, la sesión no sigue).
- **Context rot**: la instrucción sigue en la ventana pero su señal se diluye ("no uses dependencias externas" → el agente hace `uv add requests pandas sqlalchemy`). Cuatro síntomas: contradice una restricción explícita; repite trabajo hecho; respuestas genéricas; "no recuerda" algo que está ahí. "No es que el modelo falló: la ventana trabaja contra vos."
- **Costo**: cada vuelta reenvía la ventana entera; con cache el prefijo cacheado sale ~40 veces más barato, pero solo mientras el principio del contexto no cambie ("lo estable primero, lo que cambia al final").
- **Compactar** (resumen denso: lo que no entró se pierde) vs **resetear** (ventana limpia con solo lo necesario). Ninguna es mejor en abstracto; las dos reescriben el contexto, así que la vuelta siguiente se paga sin cache.
- Principio que el docente repite: **"lo que vive en un archivo persiste; lo que dijiste al pasar, no"** (demo del `LISTO`: la instrucción dicha en el chat muere en `/compact`, el CLAUDE.md se re-inyecta).
- Adelanto de tres estrategias: **siempre cargado / condicional / autocurado** → CLAUDE.md / rules con `paths:` (y skills) / auto memory.
- Tesis: quien dirige bien no escribe el mejor prompt; mantiene la ventana enfocada.

**[2] Hacer en el TP** (*tal cual*)
- Ejecutar `/context` apenas montado el harness y guardar captura (línea base). Meta propia (inferencia): que CLAUDE.md raíz + rules siempre-cargadas no pasen de ~4–5k tokens; un archivo de 300 líneas ronda 1.5–2.5k tokens (04).
- Clasificar cada pieza nuestra en las tres estrategias y escribirlo en el README (tabla en §4.D8).
- Hacer **un experimento propio de 10 minutos** del demo del `LISTO`, pero con una restricción real del proyecto (p. ej. "no importar `@pascal-app/*` fuera de `src/editor/`"): plantarla solo en el chat, trabajar un rato, ver si se rompe, `/compact`, comprobar que la que está en CLAUDE.md sobrevive. Es la mejor evidencia posible de "gestión del contexto" porque la defensa pregunta justamente eso.
- Mantener archivos chicos (la referencia: <300 líneas por archivo, <50 por función) para que alcance con cargar uno solo.
- Salidas enormes (build de Next, stack traces de three/R3F, listados de `node_modules`) no entran al contexto crudas: filtrar (`| tail -40`) o delegar a sub-agent (ver §4.D6).

**[3] Evidencia**: capturas de `/context` (arranque / después de leer un archivo que activa una rule / después de delegar). Sección README "Cómo gestioné el contexto". El docente en el Demo Day pregunta literalmente "qué persististe y qué aislaste" (slide §13).
**[4] Trampas**: instrucciones críticas solo en el chat; asumir que una ventana de 1M es gratis; pegar logs de 2000 líneas; seguir una sesión "podrida" en vez de `/clear`.
**[5] Ambigüedades**: los números son "órdenes de magnitud, no fórmulas" (notas §4); los precios del deck son de "Fable 5.1", no del modelo que usemos nosotros; el source_material habla de ventanas de ~200k, el deck de 1M. Para nosotros importa la mecánica, no el número.

### 1.4 `05-cuando-el-agente-falla.md` + spine §3 y §5 (modos de falla y harness engineering)

**[1] Qué enseña**
- Cuatro **modos de falla** nuevos: **loop infinito** (no converge), **deriva de objetivo** (arranca en A y a la décima iteración está en D; desde adentro del loop no parece un error), **alucinar tools o resultados** (afirma haber corrido un comando que no corrió; lee una salida y reporta otra), **envenenar su propio contexto** (un log de 2000 líneas entra sin procesar y de ahí en adelante razona desde ruido). Más el **context rot** de §4.
- El supervisor **mira durante, no al final**: "revisión al final no es supervisión: es auditoría". "No le creás a la IA, creale a la máquina": mirá la evidencia (¿cambió el archivo que dice haber editado? ¿corre el test que dice haber pasado?).
- Spine §3: **tres ingenierías anidadas** `prompt ⊂ context ⊂ harness` (una interacción / una sesión / múltiples sesiones).
- Spine §5: harness = el arnés del caballo; "no cometas errores" no funciona, se diseña el entorno. **Ocho dimensiones**, cada una un archivo o parámetro: instrucciones persistentes · skills y comandos · tools (incluye servidores externos) · permisos (la única "barrera dura") · modelo · effort · hooks (scripts del runtime; "la única dimensión que no depende de que el modelo quiera colaborar") · sub-agentes.
- Importante: el spine aclara que el deck **ya no tiene una sección dedicada** a los 4 modos; el espíritu sobrevive repartido (§3.2 "gran poder, gran responsabilidad", §6.8 define deriva, §13.4 la usa como criterio). Para armar nuestra checklist usamos el source `05` + §6.8.

**[2] Hacer en el TP** (*tal cual* para los conceptos; *adaptar* la checklist al stack)
- Tabla "8 dimensiones → archivo nuestro" (en §4.D8) como sección del README.
- La **checklist de supervisión** de §4.D7 (señales y comandos concretos para editor 3D y esquema).
- Dos dimensiones quedan sin pieza en la Parte 2 del curso (servidores externos/MCP y hooks, "tema de las clases que siguen"): ver MCP y hook opcional en §4.D4.6 y §4.D4.10, marcados como más allá de S04.
- Registrar **al menos 3 incidentes reales** en "Qué salió mal", cada uno etiquetado con el modo de falla (la referencia cuenta 5 con detalle técnico: `onKeys`, fecha sin zona, worker huérfano en Windows, Snake que arrancaba sola, logout).

**[3] Evidencia**: README "Qué salió mal" (el índice de `apellido-iisaia/README.md` dice que, junto con "Decisiones que tomé yo", **son las secciones que más pesan al corregir**) + sección "Trampas ya pagadas" del CLAUDE.md raíz.
**[4] Trampas**: auditar al final; creerle al resumen del agente; confiar en que "no cometas errores" en un prompt alcanza.
**[5] Ambigüedades**: el slide dice que permisos son "la única barrera dura de las ocho", pero el mismo deck dice que los hooks no dependen de la colaboración del modelo (también son duros). No es contradicción grave: ambos son runtime, no texto.

### 1.5 `06-claude-code-es-el-loop.md` + spine §6 + `13-plan-mode.md` (qué es Claude Code, model/effort/modes, plan)

**[1] Qué enseña**
- Claude Code = el loop con nombre propio: CLI, sesión interactiva, tools `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash`, `WebFetch`. **`Grep` y `Glob` aparecen así en Windows**; en macOS, Linux y WSL no vienen por defecto y Claude busca con `grep`/`find` vía `Bash` (slide §6.2, spine §6). Nosotros estamos en Windows nativo (inferencia por el entorno): nos afecta a los `tools:` de los sub-agents (ver riesgo en §4.D4.8).
- Al ejecutar `claude`: lee CLAUDE.md + rules siempre-cargadas, lee settings, carga **índice** de skills/sub-agents (solo nombre + descripción) y el índice de memoria. "Todo esto ya ocupa la ventana antes de la primera tecla."
- Sesión: `/compact`, `/clear`; `claude --continue` retoma la última, `--resume` elige; `/exit`/Ctrl+D guardan. Entre sesiones persiste lo que vive en archivos = el harness. Varias terminales sobre el mismo repo editan los mismos archivos; para ramas en paralelo hace falta `git worktree` o un clon (notes §6.4).
- **Model y effort**: `/model`, `/effort`, `--model`, `--effort`, `model` y `effortLevel` en settings; niveles `low · medium · high · xhigh · max`, default `high`. Más effort = más tokens de razonamiento que ocupan ventana y se cobran como salida. Criterio de las notas: el más capaz para diseñar o depurar lo difícil, uno barato para lo mecánico; "para un cambio trivial, poner el máximo es tirar plata".
- **Dial de modes** (seis; ver tabla §0): `plan`, `default` (se llama **Manual** en la UI), `acceptEdits`, `auto` (segundo modelo revisa cada acción; es el arranque por defecto en Pro/Max/Team), `dontAsk`, `bypassPermissions`. `Shift+Tab` cicla `default → acceptEdits → plan`; la barra de estado muestra el mode (`⏸ plan mode on`, `⏵⏵ accept edits on`); `dontAsk` solo con `--permission-mode` o `defaultMode`.
- **Cuál mode usar (§6.7)**: "la pregunta no es qué tan rápido quiero ir, es qué tan caro es un error". `plan` para tareas grandes/multi-archivo o cuando no sabés si entendió; `default`/Manual para lo sensible; `acceptEdits` para iterar sobre código que revisás con tests rápidos; `auto` para tareas largas y reversibles; `dontAsk`/`bypass` solo CI y contenedores/VMs descartables.
- **Plan mode no es sandbox**: frena la edición, **no la ejecución**; mientras planifica puede correr comandos, y al aprobar pasás a otro mode. Aprobar el plan fija el rumbo, no firma cada acción: los permisos siguen aplicando.
- **Qué debe contener un plan (§6.8)**: Objetivo / Archivos / Pasos / Verificación. Sin archivos explícitos no sabés qué se va a tocar; sin verificación no sabés cómo te enterás; "un plan que dice 'correr los tests' en un repo sin tests es un plan que nadie leyó". Tres opciones de aprobación: *Yes, and use auto mode* / *Yes, manually approve edits* / *No, keep planning* (la que usás para corregir).
- Equivalencias: Codex (`AGENTS.md`, `config.toml`, `/new`, `/plan`, dos ejes `--sandbox` y `--ask-for-approval`), OpenCode (`AGENTS.md` con fallback a `CLAUDE.md`, `opencode.json`, `plan` es un agente que deja `bash` abierto).

**[2] Hacer en el TP**
- *Tal cual*: política de modes por tarea (tabla en §4.D5); arrancar siempre con `claude --permission-mode default` (o `plan`) para ver los prompts; plan mode para toda tarea que toque esquema, adaptador del editor o >2 archivos.
- *Adaptar*: el plan de ejemplo del deck usa "mostrar el mejor puntaje en la home" con verificación jugando; el nuestro usa verificación **usando el editor** (§4.D5, plantilla).
- Dejar el plan de cada tarea grande en un archivo versionado (`docs/planes/NN-nombre.md`): es la forma de que "plan mode durante el desarrollo (se ve en el proceso, no en un archivo)" (slide §13.3) **se vea** en el repo.
- Fijar model en `settings.json` (`sonnet`), un override local barato (`haiku`) para trabajo mecánico y subir effort solo para diseño de RLS y del adaptador del editor (matriz en §4.D6).
- Si alguno del grupo usa Codex u OpenCode (inferencia): OpenCode lee `CLAUDE.md` y `.claude/skills/`; Codex necesita `AGENTS.md`. Mantener una sola fuente de verdad en CLAUDE.md.

**[3] Evidencia**: capturas de la barra de estado en `plan`; los archivos `docs/planes/*.md`; commits que referencian el plan; README "Cómo gestioné el contexto" (la referencia dice: "Antes de escribir código trabajé en modo plan… el plan está sin editar en docs/plan.md").
**[4] Trampas**: elegir el mode por velocidad ("saco los prompts y listo"); creer que plan mode protege contra `Bash`; aprobar planes sin Archivos o sin Verificación.
**[5] Ambigüedades/desactualizado**: `13-plan-mode.md` describe cuatro modes y `permissionMode`; está superado (ver §0). `06` cierra con una lista "Lo que viene" con numeración vieja (§8 rules y auto memory, §9 skills, §10 sub-agents, §11 plan mode): ignorar. El deck no dice qué effort usar para plan mode en Claude Code (Codex tiene `plan_mode_reasoning_effort`; Claude Code no tiene equivalente documentado en el material).

### 1.6 `07-CLAUDE-md.md` (spine §7)

**[1] Qué enseña**
- Archivos Markdown leídos al arrancar, **texto tuyo que entra a la ventana como mensaje después del system prompt** (no es el system prompt). **Siempre cuesta contexto**, sirva o no para la tarea.
- Cuatro niveles que se **concatenan, no se pisan**: managed (admin) → user `~/.claude/CLAUDE.md` → proyecto (`./CLAUDE.md` o `./.claude/CLAUDE.md`) → local `./CLAUDE.local.md` (al `.gitignore`). Camina desde el CWD hacia arriba juntando el CLAUDE.md de cada ancestro; **los de subdirectorios debajo del CWD cargan bajo demanda** cuando Claude lee archivos de ahí.
- `@import` no ahorra tokens (solo organiza); comentarios HTML `<!-- -->` se descartan antes de entrar; guía <200 líneas por archivo (más largo, baja la adherencia).
- **Auto memory**: la escribe Claude (no vos) en `~/.claude/projects/<proyecto>/memory/` con `MEMORY.md` como índice (se cargan las primeras 200 líneas o 25 KB; los archivos por tema, bajo demanda). Es texto plano, lo auditás con `/memory` y lo editás a mano.
- Extracto del CLAUDE.md de referencia: **Comandos** (incluida la línea que evita que el agente invente cosas), **Dónde seguir leyendo** (tabla hacia CLAUDE.md de subcarpetas y rules), **Trampas ya pagadas**.
- Equivalencias: AGENTS.md en Codex/OpenCode; OpenCode cae a CLAUDE.md; memoria automática: Claude sí, Codex sí pero apagada, OpenCode no. "Si un proyecto tiene que funcionar con varias herramientas, lo que importa va en el archivo de instrucciones, no en la memoria."
- Contradicciones entre niveles fallan en silencio (ambas entran).

**[2] Hacer en el TP** (*tal cual*; contenido en §4.D4.2 a §4.D4.4)
- CLAUDE.md raíz (panorama, comandos, dónde seguir leyendo, contratos, zonas de solo lectura, trampas ya pagadas, convenciones) + `apps/web/CLAUDE.md` + `supabase/CLAUDE.md`. Los de subcarpeta describen **cómo funciona**; las rules dicen **qué hacer y qué no** (separación explícita en la referencia).
- **Lanzar `claude` siempre desde la raíz del repo** (donde está `.claude/`). El curso dice que se cargan los CLAUDE.md de los directorios ancestros hasta el CWD y que los de subcarpetas debajo del CWD cargan bajo demanda; no dice cómo detecta el "proyecto" para `.claude/settings.json`. Para que todos vean lo mismo (y las demos de `/context` den lo mismo), arrancar siempre desde la misma carpeta (inferencia).
- **Lo crítico va en el CLAUDE.md raíz, aunque se repita**: como los de subcarpeta y las rules `paths:` solo entran al *leer* un archivo de esa zona (ver §1.7), los invariantes de mayor riesgo (RLS en toda tabla, no editar migraciones aplicadas, `service_role` nunca en cliente, verificar usando el editor) tienen que estar en lo siempre cargado.
- "Trampas ya pagadas" arranca **vacía** y se llena con cada incidente real (fecha + commit): alimenta "Qué salió mal".
- Copiar la regla meta de la referencia: "el README es el informe; si un cambio invalida una decisión narrada, actualizá esa sección en el mismo commit" y "el plan original está congelado".
- Auto memory: no es evidencia (vive fuera del repo, en cada máquina). Auditarla con `/memory` antes del Demo Day y pasar al CLAUDE.md todo lo compartido.

**[3] Evidencia**: los tres CLAUDE.md versionados (el grader busca un archivo llamado `claude.md` en cualquier parte del repo: falta de CLAUDE.md = −1, ver `.claude/skills/grading/rubric.md`); capturas de `/context` (CLAUDE.md y rules siempre-on figuran con sus tokens; los de `apps/web` y `supabase` **no** figuran hasta leer un archivo de esas carpetas) y de `/memory`.
**[4] Trampas**: CLAUDE.md monolítico de 500 líneas; instrucciones contradictorias entre user y proyecto (ojo: el `~/.claude/CLAUDE.md` personal de cada integrante también entra: revisen que no pise convenciones del proyecto, p. ej. idioma); creer que `@import` ahorra; meter secretos o paths absolutos de tu máquina en el proyecto (eso va a `CLAUDE.local.md`).
**[5] Ambigüedades**: el extracto de CLAUDE.md que muestran las slides (§7.8) dice "No hay suite de tests", pero el `CLAUDE.md` actual del tp-final ya describe pytest + Auth0 (cambió el 2026-09-29, después del spine). El deck refleja la versión anterior; ver §3.3.

### 1.7 `08-rules.md` (spine §8)

**[1] Qué enseña**
- `.claude/rules/*.md`: un archivo por tema. **Sin frontmatter** = se carga al arranque y cuesta lo mismo que CLAUDE.md (ventaja solo organizativa). **Con `paths:`** (globs) = path-scoped: entra **solo cuando Claude lee un archivo que matchea**; costo cero hasta entonces.
- Ubicaciones: `~/.claude/rules/` (usuario) y `.claude/rules/` (proyecto), descubrimiento recursivo; **las subcarpetas son organización, no condición** (`rules/backend/x.md` sin `paths:` se carga igual al arrancar).
- Globs: `**/*.py`, `src/**/*`, `*.md` (solo raíz), `backend/**/*.{py,yaml}` (llaves).
- Trigger: leer/editar/escribir un archivo que matchea; **no** listar el directorio ni correr un comando de shell cuyo output toque esos archivos (source 08) / "la activa que el agente *lea* un archivo que matchea, no que el path se nombre" (spine). Spine y slide dicen "lee"; el source dice "Read, Edit o Write". Tomar la lectura más estricta.
- Equivalencias: es **la única pieza sin equivalente directo**: Codex aproxima con `AGENTS.md` por carpeta (por directorio, decidido al arrancar), OpenCode con `instructions` (los globs eligen qué cargar, no cuándo: entran todos al arrancar). "El concepto es portable; la forma por glob es de Claude Code."
- Las dos rules de la referencia: `api-y-datos.md` (sin frontmatter) y `escenas-de-juego.md` (con `paths:` y `description:`), con "la escena no conoce la API" y "el teclado va por `onKeys()`" **solo** ahí (no en CLAUDE.md).
- `~/.claude/rules/` se carga antes que `.claude/rules/`; no es `.cursorrules`.

**[2] Hacer en el TP** (*tal cual*; *adaptar* los temas; contenido en §4.D4.5)
- Mínimo cinco rules: dos siempre-on **cortas** (contrato de datos y API; seguridad/secretos si cabe) y tres path-scoped (esquema/RLS/Storage; editor Pascal/three; shell UI) más una de "solo lectura/generados" (ver plano).
- **Una skill debe leer explícitamente la rule al empezar** (la skill de referencia dice "Antes de empezar, leé `.claude/rules/escenas-de-juego.md`"): esto cubre el hueco de una tarea que *crea* un archivo nuevo que nunca se leyó (p. ej. una migración nueva), donde la rule path-scoped podría no entrar. Es una inferencia mía sobre el trigger, sustentada en la ambigüedad Read vs Write de arriba.
- Hacer la **demo de tres pasos sobre nuestro repo** (`/context` sin leer nada → después de leer un archivo que no matchea → después de leer uno que sí) y guardar las tres capturas (§4.D8).
- Los globs deben ser **verificados**: un glob mal escrito falla en silencio (la rule nunca entra y nadie se entera). Probar cada `paths:` con la demo.

**[3] Evidencia**: `.claude/rules/*.md` + capturas de `/context` por rule + una línea en el README por rule que diga qué incidente o decisión la justifica (la referencia: `onKeys` está documentada en "Qué salió mal").
**[4] Trampas**: creer que subcarpeta = condicional; rule sin `paths:` que debería tenerlo (gasta contexto siempre); globs sin comillas en YAML; esperar que la rule entre por nombrar el path en el prompt; duplicar la rule en CLAUDE.md (se paga dos veces).
**[5] Ambigüedades**: ningún dato sobre qué pasa si una rule declara `paths:` que matchea muchos archivos o sobre cuánto "pesa" cargar varias a la vez; el source habla de una "recursión" de directorios pero no de límites.

### 1.8 `09-settings-json.md` (spine §9)

**[1] Qué enseña**
- `settings.json` **configura el runtime, no al agente**: "CLAUDE.md dice cómo comportarse; settings.json dice cómo ejecutar a Claude"; una regla de runtime es determinística ("no se ignora ni se reinterpreta").
- Cinco niveles, de mayor a menor precedencia: managed → línea de comandos → `.claude/settings.local.json` (gitignored) → `.claude/settings.json` (proyecto) → `~/.claude/settings.json` (usuario). **Escalares: gana el más alto. Listas de `permissions`: se suman** (un allow en tu local no borra un deny del proyecto).
- Campos típicos: `model` (alias `sonnet`/`opus`/`haiku`), `env`, `permissions` (con `defaultMode`), `hooks`, `attribution` (reemplaza `includeCoAuthoredBy`), `cleanupPeriodDays` (días de transcripts locales).
- Recarga en caliente salvo `model` (sesión nueva; verificar con `/status`). `defaultMode: "auto"` no tiene efecto desde el settings del proyecto.
- **MCP no va en settings**: va en `.mcp.json` en la raíz.
- El `settings.json` de referencia: `model: sonnet`, `permissions` (7 allow / 4 deny / 2 ask), `attribution: { "pr": "" }`, `cleanupPeriodDays: 30` y **ausencia deliberada de `env`** ("un campo que no aplica no se pone por las dudas: cada línea tiene que estar por una razón").
- `.local.json` siempre al `.gitignore` (un token commiteado se rota); el repo trae `settings.local.json.example` (`model: haiku`, `enabledMcpjsonServers: ["playwright"]`) que cada uno copia.
- Equivalencias: Codex `config.toml` (el de proyecto solo carga si marcás el repo como confiable), OpenCode `opencode.json` (JSON con comentarios, `{env:VAR}`, `{file:ruta}`).

**[2] Hacer en el TP** (*tal cual*, contenido en §4.D4.6)
- `.claude/settings.json` con permisos **pensados para este proyecto** (no copiados: lo exige el checklist §13.3) y `settings.local.json.example` + `.gitignore`.
- **Sin `env`** en el settings versionado. Las claves de Supabase viven en `apps/web/.env.local` (Next) y en Vercel; nunca en `settings.json`.
- `cleanupPeriodDays`: subirlo (p. ej. 90, inferencia) para que los transcripts de sesiones sobrevivan hasta el Demo Day: son la prueba de la deriva que detectaron.
- `.mcp.json` propio en la raíz si usamos Playwright (la referencia depende del `.mcp.json` de la raíz del repo del curso; el `tp-final/` suelto no lo trae, ver §3.3).
- Documentar en README **por qué** cada `allow`/`deny`/`ask` (la referencia lo hace en una línea por regla: "los deny cuentan una decisión").

**[3] Evidencia**: `.claude/settings.json` versionado, `.gitignore` con `.claude/settings.local.json`, captura de `/status` mostrando que el local pisa el model (demo de §9).
**[4] Trampas**: commitear el `.local.json` con un token; pisar vs sumar (confundir escalares con listas); poner `env` por costumbre; poner secretos en `env`; asumir que MCP se configura acá; usar ejemplos viejos con `includeCoAuthoredBy`/`permissionMode`.
**[5] Ambigüedades**: el deck dice "si cambiás permissions con la sesión abierta, aplica sin reiniciar" pero el source dice lo contrario (manda el spine, ver §0).

### 1.9 `10-permisos.md` (spine §10; "la equivalencia más importante de la Parte 2")

**[1] Qué enseña**
- Reglas del **runtime** evaluadas **antes de cada tool call**; si bloquean, la tool no corre decida lo que decida el modelo. "Actúa sobre el loop, no sobre el contexto": los permisos no entran a la ventana.
- Tres listas `allow` / `deny` / `ask`; orden **deny → ask → allow**, la primera coincidencia decide, la especificidad no importa; si no matchea nada decide el mode (en Manual, pregunta; las lecturas no piden permiso).
- Sintaxis `Tool(pattern)`: comando exacto `Bash(uv sync)`; `Bash(git push *)` (espacio + `*`: matchea `git push origin main` y también `git push` a secas); `Bash`/`Bash(*)` = todo; glob de path `Edit(./backend/**)`; archivo `Read(./.env)`; dominio `WebFetch(domain:...)`.
- Se cambian en vivo con `/permissions` (elegís en qué archivo se guarda), con "Yes, and don't ask again" (escribe en **`.local`**, tu excepción personal) o editando el JSON.
- Límites (spine, sin slide pero en notas/demo): **un `deny` cubre una tool y un patrón, no una intención** (si Claude no puede `Edit`, puede intentar `sed -i` por Bash: aparece un prompt, y hay que decir que no); los wildcards no atraviesan `&&` ni `;`; `Bash(rm -rf *)` no frena `/bin/rm` ni `sh -c`.
- El bloque de la referencia: allow = levantar app, editar `backend/` `frontend/` y README, dos dominios de doc; deny = `scores.db`, `docs/plan.md` (plan congelado), `rm -rf`, `git push`; ask = `uv add`/`uv remove`. **`git commit` no está en ninguna lista a propósito** (se usa en la demo). Los deny "cuentan una decisión".
- Equivalencias: en Claude Code `deny` gana siempre; en OpenCode **gana la última regla que matchea** (`"rm *": "deny", "*": "allow"` deja pasar `rm -rf`); en Codex son tres sistemas (sandbox, `approval_policy`, `.rules`). "Nunca copies una config de permisos de una herramienta a otra sin leer cómo evalúa."
- El source dice que "managed" fija un techo que nadie levanta: irrelevante para nosotros.

**[2] Hacer en el TP** (*adaptar* de uv/FastAPI a pnpm/Supabase/Vercel/git; contenido real en §4.D4.6)
- Diseñar por **capas de riesgo** y explicarlo: lecturas libres; edición libre en `apps/web/src/**`; edición **con compuerta (`ask`)** en migraciones, `.claude/` y `CLAUDE.md`; dependencias (`pnpm add/remove/update/dlx`) con `ask`; `deny` en secretos, archivos generados/vendor, `pnpm-lock.yaml` a mano, deploy a producción, `supabase db push`/`reset --linked`, `git push --force`, borrado masivo y edición de settings por el propio agente.
- Aprovechar el orden deny→ask→allow: `allow` amplio de edición + `ask` específico en migraciones (no se puede distinguir "archivo nuevo" de "archivo existente" con una regla de path; el `ask` obliga a mirar cada migración antes de que entre al disco).
- **El deny no es frontera de seguridad**: complementar con (a) branch protection en GitHub (la compuerta dura real), (b) pgTAP/tests, (c) revisión de diff, (d) `.gitignore`. Decirlo en la defensa: es exactamente el matiz que el docente marca.
- Demo propia de tres pasos (prompt → "don't ask again" escribe en local → deny local le gana a un allow del proyecto) con capturas.
- `Bash(*)`/`Bash` jamás en `allow`; sin `bypassPermissions` en la máquina real.

**[3] Evidencia**: `settings.json` + tabla "regla → decisión → riesgo que cubre" en el README + captura de un bloqueo real por `deny`.
**[4] Trampas**: `Bash` suelto; deny que se saltea con Bash (sed/python/cat); copiar permisos de otra herramienta; olvidar que ask le gana a allow; poner patrones demasiado angostos y vivir aceptando prompts (fatiga de permisos) hasta que alguien elige `bypass`.
**[5] Ambigüedades**: la nota de §10.9 del source (matriz de modes) se movió; el material nunca explica cómo matchean los patrones de `Read(...)` con `.env.*` vs `.env.example`: probar en la demo qué bloquea exactamente (inferencia: un `deny Read(./.env.*)` bloquearía también `.env.example`).

### 1.10 `11-skills-y-slash-commands.md` (spine §11)

**[1] Qué enseña**
- Un mismo mecanismo, dos formas: **skill** (directorio con `SKILL.md`: procedimiento completo, fases, anti-patterns, archivos de soporte; Claude puede cargarla solo por relevancia de la `description`) y **command** (un archivo en `.claude/commands/`: atajo corto que disparás vos). Ambos crean `/nombre`; el nombre sale del directorio/archivo (`name:` es etiqueta); si se llaman igual, **gana la skill**.
- Dónde: `.claude/skills/<n>/SKILL.md`, `~/.claude/skills/...`, `.claude/commands/<n>.md`, `~/.claude/commands/...`, y vía plugins.
- Al arranque entra **solo el índice** (nombre + `description`); el cuerpo entra a la **misma** ventana al invocarla: "la skill difiere la carga; no aísla" (el sub-agent sí aísla). Con 5 skills pagás 5 descripciones cortas siempre.
- `description` con la convención **"Use when X"**: es el contrato de activación; una descripción vaga activa mal.
- `explicar.md` (15 líneas, `$1`, `argument-hint`, **`disable-model-invocation: true`**): solo lo disparás vos y su descripción **no** entra al contexto (al revés que la skill). Criterio: "si querés que el agente lo elija, skill; si es un atajo tuyo, y más si tiene efectos que querés controlar, comando".
- La skill de referencia `agregar-juego`: frontmatter, cinco fases ordenadas (definir → seed → escena → conectar página → verificar jugando con Playwright), **anti-patterns** al final, y la regla "antes de empezar, leé la rule". "Eso convierte 'esperar que Claude se acuerde' en 'tenerlo escrito'."
- **Una skill no es una garantía**: el modelo la sigue con mucha más consistencia y vos tenés contra qué auditar; el enforcement determinístico vive en permisos.
- `/memory`, `/context`, `/permissions` son built-ins sin archivo.
- Equivalencias: la pieza donde más convergieron: mismo `SKILL.md` en los tres; Codex `.agents/skills/` con `$nombre`, OpenCode `.opencode/skills/` y además lee `.claude/skills/`.
- Del deck (§5, notas): "si un flujo lo repetís tres veces, lo escribís una y de ahí en adelante sale igual siempre".

**[2] Hacer en el TP** (*tal cual*; contenido en §4.D4.7 y §4.D4.9)
- **Qué merece skill** en nuestro proyecto (criterio: procedimiento con orden que importa, repetible, con verificación): (1) `nueva-migracion-con-rls` (alto riesgo, repetible), (2) `agregar-preset` (núcleo del dominio), (3) `agregar-mueble-al-catalogo` (opcional si el catálogo propio es parte del alcance). Lo que no: skills genéricas ("hacer componentes React").
- **Escribir cada skill después de hacer la tarea a mano una o dos veces** (inferencia, apoyada en la regla "tres veces"): la skill captura el orden que *funcionó* y los anti-patterns que *pagaron*. Con 2 días, orden: primera migración a mano con el agente → skill; primer preset → skill.
- Commands: `/pre-entrega`, `/explicar`, y dos propios que implementan la supervisión del curso: `/deriva` (diff vs plan) y `/checkpoint` (nota de sesión antes de `/clear`). Los dos con `disable-model-invocation: true`.
- Las `description` de las skills en inglés ("Use when ...") y el cuerpo en castellano, como la referencia.
- Demo propia: `/context` muestra la skill en el índice → pedido en prosa la activa → misma tarea en una copia sin la skill (para el README, "contraste parcial": las rules siguen cubriendo parte pero el orden se improvisa).

**[3] Evidencia**: `.claude/skills/*/SKILL.md` (el grader marca `.claude/skills/` como señal de superpowers/bonus si está en la raíz del repo; ver pregunta #1), `.claude/commands/*.md`, y la captura "con vs sin skill".
**[4] Trampas**: skill que repite lo que ya dice la rule (la referencia: "las reglas de ahí no se repiten en este archivo"); `description` vaga; skills enormes (se pagan enteras al invocarse); creer que una skill garantiza el orden; olvidar que gana la skill sobre el command del mismo nombre.
**[5] Ambigüedades**: el `plan.md`/source dicen que "Claude ejecuta las fases en orden, no saltea ni reordena" (garantía); el spine corrige: "una skill no es una garantía". Manda el spine.

### 1.11 `12-sub-agents.md` (spine §12)

**[1] Qué enseña**
- Instancia **separada del mismo loop con su propia ventana de contexto**. Al padre le vuelve solo el resultado (ni razonamiento, ni archivos leídos, ni pasos); el transcript queda en disco. "No es otra IA."
- Archivos `.claude/agents/<nombre>.md` (proyecto), `~/.claude/agents/` (usuario), plugins y built-in (`Explore`, `Plan`, `general-purpose`). Frontmatter: `name`, `description` (el padre la lee para delegar solo), `tools` (si se omite hereda todas; si se declara, restringe), `model` opcional (default: el del padre). El cuerpo es el system prompt.
- Se invoca por la tool `Agent`, a pedido tuyo ("usá el sub-agent explorador") o por su cuenta si la tarea matchea la `description`.
- **El motivo principal es proteger el contexto del padre; paralelizar es el beneficio secundario.** "Delegar no exime de supervisar": el padre ve solo el resumen, hay que juzgar si es coherente.
- `explorador` de referencia: `tools: Read, Grep, Glob`; cuerpo: empezá por los CLAUDE.md y rules, seguí el recorrido real del dato, **citá archivo y símbolo en cada afirmación**, resumen ≤10 líneas, "si algo no está en el código, decilo", "nunca propongas un cambio salvo que te lo pidan".
- Demo: misma pregunta inline vs delegada con `/context` antes y después (el delta es chico en repos chicos; "lo que importa es de qué lado quedan").
- Equivalencias: Codex `.codex/agents/*.toml` (modelo, effort y sandbox propios), OpenCode `.opencode/agents/*.md` con `@nombre` y sesiones hijas visibles mientras trabajan (ataca "delegar no exime de supervisar").

**[2] Hacer en el TP** (*tal cual*; contenido en §4.D4.8)
- `explorador-pascal` (el caso de manual: leer una dependencia grande que ensucia el contexto), `explorador` (preguntas que cruzan `apps/web` ↔ `supabase`) y, opcional, `revisor-rls`. El curso pide "un sub-agent si la complejidad lo justifica; si no, no hace falta inventarlo": el justificativo nuestro es **Pascal Editor**.
- Medir el delta de `/context` inline vs delegado con una pregunta real nuestra ("¿cómo se serializa una escena en Pascal y cómo la guardamos en Postgres?") y poner las dos capturas en el README.
- **Riesgo técnico a probar el primer día** (inferencia, ver §4.D4.8): `Grep`/`Glob` suelen respetar `.gitignore` y no seguir symlinks; con `pnpm`, `node_modules/@pascal-app/*` es un symlink hacia `node_modules/.pnpm/...` y `node_modules` está en `.gitignore`. Si el explorador devuelve vacío, el problema es la herramienta, no que "no exista".
- Supervisar siempre: pedir citas `paquete/archivo:símbolo` y comprobarlas con `pnpm typecheck` (una API inventada no compila).

**[3] Evidencia**: `.claude/agents/*.md`, capturas inline vs delegado, y una línea en el README sobre por qué *este* sub-agent y no más.
**[4] Trampas**: sub-agent sin `tools:` (hereda todo, incluido `Bash`/`Edit`); creer su resumen sin verificar; delegar ediciones; inventar sub-agents para "cumplir".
**[5] Ambigüedades**: `Grep`/`Glob` no existen por defecto en macOS/Linux/WSL (spine §6): si un integrante trabaja en WSL, `tools: [Read, Grep, Glob]` queda cojo. El docente no aclara qué hacer; mi sugerencia es probar y, si hace falta, agregar un `Bash` acotado por permisos.

### 1.12 `14-trabajo-final.md` (spine §13, checklist y criterios)

**[1] Qué enseña**
- Modelo + rol + runtime (+ flujo/MCP de las clases 6–7) se usan **a la vez**. "El trabajo final no examina sintaxis: examina si sabés dirigir." **Apropiación = poder explicar, corregir y extender** lo que el agente escribió; se mide en eso, no en líneas tipeadas.
- Qué se entrega (`tp-final/`): producto (interfaz + servidor + datos que persisten; **stack libre**), README como informe (cómo se ejecuta, arquitectura, decisiones propias, gestión del contexto, qué salió mal), **evidencia del proceso** (spec y plan en disco, commits, branches, PRs) y **configuración del agente versionada**.
- **Checklist §13.3 (por concepto)**: instrucciones del proyecto con folder map y convenciones; instrucciones por tema con scope por path si la herramienta lo permite; config del runtime con permisos **pensados para el proyecto**; **al menos una skill propia**; un sub-agent **si se justifica**; plan mode durante el desarrollo ("se ve en el proceso, no en un archivo"). "Se versiona con el código y se explica en la defensa."
- **Cuatro criterios del Demo Day** (conjunta, se evalúa al grupo): **Especificación** (cómo se definió qué construir antes de que el agente escribiera código), **Gestión del contexto** (qué se persistió y qué se aisló), **Deriva** (dónde se desvió, cómo se detectó y corrigió), **Evidencia** (el flujo visible en el repo).
- Grupos de 2 o 3: la carpeta vive en el repo de uno y los demás son colaboradores (para que los commits de todos queden en el historial).
- Exposición de la idea (6 min: problema, usuarios, MVP, stack) con devolución sobre alcance y viabilidad antes de implementar.
- "El historial no se puede fabricar la noche anterior" (S00).

**[2] Hacer en el TP**
- Mapear cada ítem del checklist a un archivo y a un párrafo del README (§4.D8). Es la tabla que se proyecta en la defensa.
- Alcance: ustedes quieren "la app final, no un MVP". El material usa "MVP" en la exposición de la idea y `programa.md` (semana 8) dice "Exposición del MVP funcional" en el Demo Day. Con ~2 días, recomiendo (inferencia) definir la entrega como **cortes verticales completos y defendibles** (auth → proyecto → editor → persistir → presets) antes que muchas funciones a medias: lo que se evalúa es poder explicar/corregir/extender.
- Commits chicos, uno por pieza que funciona, en ramas y PRs, desde el primer commit del harness. El primer commit del repo debería ser el harness (CLAUDE.md + settings + rules): demuestra "gestión del contexto" antes del código.
- Especificación: spec y plan como archivos (el flujo superpowers de S06 los genera en `docs/superpowers/specs|plans/`; la referencia los guarda en español/inglés "tal como los generó el agente").

**[3] Evidencia**: README completo con las cuatro secciones, spec/plan en disco, historial de ramas/PRs, `.claude/` versionado. El `rubric.md` suma +1 (tope 10, solo si el núcleo está completo) si hay `.claude/skills/`, `docs/superpowers/` o menciones a brainstorming/writing-plans/executing-plans/superpowers en `.md` — y penaliza −1 sin CLAUDE.md.
**[4] Trampas**: repo con un único commit; configuración "de decoración" que no podés explicar; permisos copiados; no poder justificar por qué existe cada pieza.
**[5] Ambigüedades**: ver §5 y preguntas al docente (dónde va `.claude/`, si Next+Supabase cuenta como backend, MVP vs app final).

---

## 2. Traslación de FastAPI + SQLite + vanilla (referencia) a Next + Supabase + pnpm + Pascal (nuestro)

| Concepto del material | Veredicto | Cómo queda en nuestro repo |
|---|---|---|
| Loop, tools, ventana finita, modos de falla, tres ingenierías | **Tal cual** | Marco conceptual del README y de la checklist (§4.D7). |
| CLAUDE.md jerárquico + "Dónde seguir leyendo" + "Trampas ya pagadas" | **Tal cual** (cambia el contenido) | Raíz + `apps/web/` + `supabase/`. |
| Rules sin/con `paths:` | **Tal cual** (cambian los globs) | Globs sobre `supabase/**`, `apps/web/src/editor/**`, etc. |
| Settings en cascada, `.local` al gitignore, sin `env` | **Tal cual** | `.claude/settings.json` + `.example`; `env` ausente. |
| Permisos deny→ask→allow, `Tool(pattern)` | **Tal cual la semántica; adaptar los patrones** | `uv ...` → `pnpm ...`, `supabase ...`, `vercel ...`, `gh ...`, `git ...`. |
| Skill con fases + anti-patterns + "leé la rule antes" | **Tal cual** | Tres skills de dominio (§4.D4.7). |
| Command de un archivo (`explicar`, `pre-entrega`) | **Adaptar el contenido** | Se agregan `/deriva` y `/checkpoint`. |
| Sub-agent de solo lectura con citas | **Tal cual; agregar uno para Pascal** | `explorador` + `explorador-pascal`. |
| Verificación "jugando" con MCP de Playwright leyendo el estado de la escena | **Adaptar** | Verificar **usando el editor**; leer el estado de la escena desde el store, no solo capturas (el canvas 3D no se "lee" bien con screenshots; técnica de la referencia). Riesgo: WebGL/WebGPU en navegador headless (inferencia). |
| "Sin paso de build, ES modules, Phaser por CDN" | **No aplica** | Next hace build; el análogo de "un archivo nuevo no se registra en ningún lado" no existe. |
| "El mount `StaticFiles` en `/` va último" / orden de middlewares | **No aplica literal** | Análogo (inferencia): orden y alcance del middleware/proxy de Next para refrescar la sesión de Supabase y proteger rutas. Dejarlo documentado en `apps/web/CLAUDE.md`. |
| "`create_tables()` no migra; borrá `scores.db`" | **No aplica** (es lo opuesto) | En Supabase **las migraciones son la verdad**: no se borra la base, se agrega una migración; `supabase db reset` recrea la local desde migraciones + seed. |
| `Read(./scores.db)` en deny | **Adaptar** | El análogo son los secretos (`.env.local`) y, si se usa, un dump o `supabase/.temp`. |
| `docs/plan.md` congelado con deny | **Adaptar con cuidado** | Congelar el plan **original** (`docs/plan.md`); no bloquear `docs/superpowers/**` mientras superpowers tilda checkboxes del plan al ejecutar (inferencia). |
| "Fechas sin zona" (SQLite naive) | **No aplica**, pero hay análogo | Postgres `timestamptz` resuelve la zona; el análogo de "bug invisible que da 201 y se ve bien" es RLS permisiva o `jsonb` de escena versionado sin migrar (se ve OK y está mal). |
| "Reload huérfano en Windows (netstat)" | **Probable análogo** (inferencia) | Next dev en :3000 puede dejar un proceso vivo en Windows; antes de "el arreglo no anda", `netstat -ano | findstr :3000`. Confirmarlo si pasa y anotarlo en trampas. |
| "Las escenas no conocen la API" (contrato que permite tocar un juego sin cargar el backend) | **Tal cual como principio** | "El editor no conoce Supabase; el shell no conoce `@pascal-app`": adaptador `editor/api.ts` + `lib/persistence/` (§4.D4.2). |
| `uv`, `pytest`, FastAPI `/docs` | **No aplica** | `pnpm`, `pnpm typecheck/lint/build`, `supabase test db` (pgTAP). |
| Equivalencias Codex/OpenCode | **Informativo** | Solo si algún integrante usa otro harness. |
| Hooks y MCP | **Fuera de S04** (clases 6–7) | Se dejan previstos y marcados (§4.D4.6, §4.D4.10). |

---

## 3. Cómo materializa la referencia lo que enseña la clase (y qué prácticas valora el docente)

Referencia: `semanas/00/source_material/apellido-iisaia/tp-final/`. Es "material de referencia que leen los alumnos" (su propio `CLAUDE.md` lo dice).

### 3.1 Qué hay y cómo se corresponde con la clase

| Pieza de la clase | En la referencia | Qué demuestra |
|---|---|---|
| CLAUDE.md raíz (86 líneas) | `CLAUDE.md`: qué es, **Comandos**, **Dónde seguir leyendo** (tabla), tabla de las piezas `.claude/`, **Arquitectura** con "los dos contratos que sostienen el diseño", **Trampas ya pagadas**, **Convenciones** | Es un panorama + puntero, no un volcado. Incluye la regla meta "el README es el informe… docs/plan.md está congelado; no lo sincronices". |
| CLAUDE.md por carpeta | `backend/CLAUDE.md` (arranque, recorrido de un request, capas, cambiar esquema, probar) y `frontend/CLAUDE.md` (por qué no hay build, quién llama a quién, ids del DOM, errores, CSS, `games/`) | "Los CLAUDE.md describen cómo funciona; las reglas dicen qué hacer y qué no." Cargan bajo demanda: se puede tocar un juego sin cargar el backend. |
| Rule sin frontmatter | `api-y-datos.md` (contrato, fechas, capas, migraciones) | Decisiones que valen para todo el proyecto en pocas líneas. |
| Rule path-scoped | `escenas-de-juego.md` con `description:` y `paths:` (`frontend/js/games/**/*.js`, `game-page.js`) | Condicional por glob; la regla `onKeys()` vive solo ahí. |
| Settings | `.claude/settings.json` (`model`, 7/4/2 de permisos, `attribution.pr`, `cleanupPeriodDays`), `settings.local.json.example`, `.gitignore` con `.claude/settings.local.json` | Permisos con razón; sin `env`; local pisa proyecto. |
| Skill | `agregar-juego/SKILL.md`: 5 fases, anti-patterns, "leé la rule", verificación en navegador | Procedimiento con orden y verificación real. |
| Commands | `explicar.md` (`$1`, `disable-model-invocation`) y `pre-entrega.md` (checklist de entrega) | Atajos, no procedimientos. |
| Sub-agent | `explorador.md` (`Read, Grep, Glob`, cita archivo+símbolo, ≤10 líneas, "si no está, decilo") | Aislamiento de contexto + disciplina de evidencia. |
| Plan en disco | `docs/plan.md` (congelado, con deny) + README que explica las diferencias plan vs construido | "Plan mode" visible en el repo. |
| Superpowers | `docs/superpowers/plans/2026-09-29-tp-final-auth0.md` (+ spec): README: "preguntas de a una… plan con el código de cada tarea… sub-agents implementaban y otro revisaba" | El bonus +1 del rubric. |
| README como informe | "Qué decidí yo" (11 decisiones con alternativas descartadas), "Cómo gestioné el contexto", "Qué salió mal" (5 incidentes con causa raíz y detección) | Es lo que "más pesa al corregir" (índice de `apellido-iisaia/README.md`). |

### 3.2 Prácticas que el docente valora (extraídas de la referencia + material)

1. **Cada línea de configuración tiene una razón** y se puede decir en una frase (ausencia deliberada de `env`; `git commit` ausente de las listas a propósito; deny que "cuentan una decisión").
2. **Contratos de diseño escritos y repetidos donde corresponde**: "las escenas no conocen la API", "el juego va en el path", "la base dice qué existe, el frontend cómo se juega". Permiten **tocar una mitad sin cargar la otra** (gestión de contexto como consecuencia de la arquitectura).
3. **Trampas ya pagadas en el CLAUDE.md**: cada bug caro termina escrito donde el agente lo lee, no solo en el README.
4. **Verificación real, no declarada**: "no dar por hecho que anda porque la página no muestra errores"; "leé la respuesta cruda"; el plan sin tests no puede decir "correr los tests".
5. **Plan congelado + diferencias explicadas** en el README (el plan no se "arregla" para que coincida).
6. **Un commit por pieza que funciona** con mensaje que explica el porqué.
7. **Límites de tamaño** (300 líneas / 50 por función) justificados como gestión de contexto.
8. **Config versionada junto al código** y `settings.local` fuera del repo con `.example`.
9. **Skills con anti-patterns** y que remiten a las rules en vez de duplicarlas.
10. **Sub-agent mínimo y de solo lectura** que cita evidencia.
11. **Honestidad del informe**: los defectos se dejan ("el `prompts.md` va sin editar, defectos incluidos").
12. El registro de **decisiones con alternativas** ("consideré otros dos caminos…") demuestra apropiación.

### 3.3 Brechas y desactualizaciones de la propia referencia (no copiarlas)

- **El `settings.json` actual no deniega `.env`**, pese a que el proyecto ya usa Auth0 con `.env` (`AUTH0_CLIENT_SECRET`, `SESSION_SECRET`): su deny cubre `scores.db` y `docs/plan.md`. El demo-repo viejo sí tenía `Read(./.env)`. Nosotros: denegar secretos siempre.
- **`uv run pytest` no está en `allow`** aunque `CLAUDE.md` y la skill dicen "primero `uv run pytest`": cada corrida pedirá permiso. Nosotros: poner en `allow` los comandos que el CLAUDE.md manda correr.
- **Playwright**: `settings.local.json.example` habilita `enabledMcpjsonServers: ["playwright"]`, pero el `tp-final/` no trae `.mcp.json`; el que existe está en la raíz del repo del curso. Un `tp-final` copiado afuera (como en las demos, `~/tp-final-demo`) no tendría el servidor. Nosotros: `.mcp.json` propio.
- **Las slides y el spine hablan del repo antes de Auth0/pytest** ("este proyecto no tiene tests", "no usa variables de entorno", `uv run pytest` ausente): el repo cambió el 2026-09-29. Cuidado al comparar la clase con lo que ven en el repo hoy.
- **La referencia se creó con `docs/plan.md` y "sin superpowers" para el grueso**; el flujo superpowers solo se usó para Auth0 (README: "El login con Auth0 lo trabajé distinto, con las skills de superpowers"). Es decir: el bonus se logra con **un feature** hecho con el flujo completo, no con todo el proyecto.
- **No hay hooks ni `.mcp.json` ni `AGENTS.md`** en la referencia: el docente no los exige en el checklist §13.3.
- **El `.gitignore` del repo del curso ignora `.claude/*`** salvo `commands/` y dos skills (decisión del repo del curso, no de la referencia): **no** copiarlo; si ignoran `.claude/` completo, el grader no ve `.claude/skills/` y el docente no ve su harness.

---

## 4. PLANO DEL HARNESS para nuestro repositorio

Todo lo de esta sección es **borrador copiable**: los archivos tienen contenido real, con `⟦...⟧` donde la decisión o el dato es de ustedes. Cada pieza lleva: **qué es · dónde vive · cuándo se carga · contenido · cómo se demuestra en el README**. Las decisiones de diseño (monorepo o no, Route Handlers o llamadas directas a Supabase, idioma) las toman ustedes y las anotan en "Qué decidí yo": el docente valora justamente que no sean el default del agente.

### D1. Principios de diseño (por qué el plano tiene esta forma)

1. **Lo crítico va en lo siempre cargado; lo específico, en lo condicional.** CLAUDE.md raíz (≤120 líneas) y un par de rules sin `paths:` cargan siempre; el resto entra solo al leer archivos de su zona. Meta: arranque de sesión chico (la clase cita ~15k tokens como orden de magnitud).
2. **Instrucción ≠ barrera.** Lo que no puede romperse (secretos, lockfile, archivos generados, producción) va en `permissions.deny`/`ask` (runtime, determinístico); el CLAUDE.md/rules explican el *porqué*. Pero un `deny` cubre una tool y un patrón, no una intención: se complementa con branch protection, tests pgTAP y revisión de diff.
3. **La arquitectura es gestión de contexto.** Copiamos el principio de la referencia ("las escenas no conocen la API"): el **editor no conoce Supabase** y el **shell no conoce `@pascal-app`**. Así se puede tocar una mitad sin cargar la otra en la ventana (inferencia aplicada a nuestro stack; es una decisión nuestra y se defiende).
4. **Las piezas se escriben después de sufrir el problema una vez**, salvo el mínimo (CLAUDE.md, settings, deny de secretos), que va primero. Las skills salen de una tarea hecha a mano; las trampas, de incidentes reales.
5. **Todo cambio al harness pasa por una persona**: `Edit(./.claude/**)` y `Edit(./**/CLAUDE.md)` en `ask`, y el agente no puede tocar `settings*.json` (deny). El harness es parte de la evidencia y de la apropiación.
6. **Cada pieza tiene una frase de justificación y una captura** (la defensa pregunta "por qué está cada cosa").
7. **Una fuente de verdad.** Si algo está en una rule, no se repite en CLAUDE.md ni en la skill (se paga dos veces); la skill dice "leé la rule".
8. **Verificación real por tipo de tarea** (compila ≠ funciona): esquema → `db reset` + `test db`; editor → usarlo; shell → recorrerlo.

### D2. Árbol de archivos

Supuesto (decisión suya, anotarla): monorepo liviano con `apps/web` (Next: shell + editor + Route Handlers) y `supabase/` ("paquete de datos"). Si prefieren un único Next en la raíz, reemplazar `apps/web/` por `./` en todo lo que sigue y no crear `pnpm-workspace.yaml`. Si el "backend" fuera un servicio aparte (p. ej. `apps/api`), sumar su `CLAUDE.md` (ver pregunta #2 por el detector de "backend").

```
tp-final/                         <- desde acá se lanza `claude` (donde vive `.claude/`)
├── CLAUDE.md                     panorama + comandos + no negociables + zonas read-only + trampas
├── README.md                     el INFORME (decisiones / contexto / qué salió mal / cómo se corre)
├── .gitignore                    incluye .claude/settings.local.json, CLAUDE.local.md, .env*, .next, supabase/.temp
├── .env.example                  nombres de variables, sin valores
├── .mcp.json                     (opcional, S07) playwright
├── pnpm-workspace.yaml           (solo si hay >1 package.json)
├── .claude/
│   ├── settings.json             modelo + permisos pensados para este proyecto
│   ├── settings.local.json.example
│   ├── rules/
│   │   ├── contrato-datos.md        (siempre) contrato de datos y API
│   │   ├── datos-y-rls.md           (paths) supabase/**, lib/supabase, lib/persistence
│   │   ├── editor-pascal-three.md   (paths) apps/web/src/editor/**
│   │   ├── shell-ui.md              (paths) apps/web/src/app|components/**
│   │   └── solo-lectura-y-generados.md (paths) types generados, vendor, models
│   ├── skills/
│   │   ├── nueva-migracion-con-rls/SKILL.md
│   │   ├── agregar-preset/SKILL.md
│   │   └── agregar-mueble-al-catalogo/SKILL.md      (si el catálogo propio entra en el alcance)
│   ├── agents/
│   │   ├── explorador.md            cruza apps/web <-> supabase (solo lectura)
│   │   ├── explorador-pascal.md     lee @pascal-app/* y three/R3F (solo lectura)
│   │   └── revisor-rls.md           (opcional) auditoría de migraciones
│   └── commands/
│       ├── pre-entrega.md
│       ├── explicar.md
│       ├── deriva.md
│       └── checkpoint.md
├── apps/web/
│   ├── CLAUDE.md                 estructura, server vs client, flujo de guardado, auth, env
│   ├── .env.local                (no versionado)
│   └── src/ {app, components, editor/{api.ts,...}, lib/{supabase,persistence}, types/database.ts}
├── supabase/
│   ├── CLAUDE.md                 modelo, matriz de policies, migraciones, seed, storage, tests
│   ├── migrations/  seed.sql  tests/  config.toml
└── docs/
    ├── plan.md                   plan ORIGINAL (se congela: deny)
    ├── planes/NN-<tarea>.md      plan por tarea grande (salida de plan mode)  ← evidencia de plan mode
    ├── decisiones.md             ADR-lite: decisión, alternativas, por qué
    ├── pascal-notes.md           lo verificado de Pascal en la versión instalada
    ├── sesiones/AAAA-MM-DD-*.md  salida de /checkpoint
    ├── prompts.md                prompts principales, sin editar
    └── superpowers/{specs,plans}/ salida del flujo spec-driven (S06)
```

### D3. Orden de montaje para 2 días (el harness primero, y en capas)

| Cuándo | Qué | Por qué en ese orden |
|---|---|---|
| H0 (≤60 min) | Repo + `.gitignore` + `.env.example` + CLAUDE.md raíz (corto) + `settings.json` con **deny de secretos/generados/producción** + `settings.local.json.example`. **Primer commit = el harness** (`chore: configuración inicial del agente`). | Cubre el checklist base y deja evidencia de que el contexto se gestionó antes del código. |
| H0–H2 | Brainstorming/spec y plan (flujo spec-driven, S06) → `docs/superpowers/` y `docs/plan.md`; commit. **Recién después** congelar `docs/plan.md` agregando el deny (commit aparte: es evidencia del congelamiento). | Especificación antes del código (criterio 1 del Demo Day). |
| H2–H4 | Instalar `@pascal-app/*`; **exploración supervisada** (explorador-pascal o a mano) → `docs/pascal-notes.md`; recién ahí escribir `editor-pascal-three.md` y `apps/web/CLAUDE.md`. | No escribir reglas sobre una API que no verificamos (riesgo de alucinación). |
| H4–H8 | Primera migración con RLS **a mano con el agente**, en plan mode → después escribir la skill `nueva-migracion-con-rls` y `datos-y-rls.md` con lo aprendido; `supabase/CLAUDE.md`. | Las skills salen de la primera pasada real. |
| H8–H20 | Features en cortes verticales; cada incidente → una línea en "Trampas ya pagadas" y una entrada en "Qué salió mal". Skill `agregar-preset` tras el primer preset. | La evidencia se produce sola. |
| H20–H30 | `/pre-entrega`, auditoría de `/memory`, correr las 6 demos de la clase sobre nuestro repo y guardar capturas (§4.D8), README final. | Es lo que se defiende. |

### D4.1 `.gitignore` y `.env.example`

**Qué es / dónde / cuándo**: archivos de la raíz. No son del agente, pero sostienen el harness (un `.local` commiteado con un token "se rota").

```gitignore
# harness: versionar todo .claude/ EXCEPTO lo local de cada persona
.claude/settings.local.json
CLAUDE.local.md

# secretos y entornos
.env
.env*.local
apps/web/.env*.local
!.env.example

# artefactos
node_modules/
.next/
.vercel/
supabase/.temp/
supabase/.branches/
*.log
```

```bash
# .env.example  (solo nombres; los valores van en apps/web/.env.local y en Vercel)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# SOLO servidor / scripts locales. Nunca NEXT_PUBLIC_*. Nunca en el cliente.
SUPABASE_SERVICE_ROLE_KEY=
```

**README**: una línea en "Cómo se ejecuta" ("copiar `.env.example` a `apps/web/.env.local`") y en "Decisiones": por qué `.claude/` se versiona completo salvo lo local.

### D4.2 `CLAUDE.md` raíz

**Qué es**: texto nuestro que entra a la ventana antes del primer mensaje (siempre cuesta contexto; <200 líneas, apuntamos a ~110). **Dónde**: `./CLAUDE.md`. **Cuándo**: cada sesión lanzada desde esta carpeta (y desde subcarpetas, como ancestro). **Contenido** (borrador):

````markdown
# CLAUDE.md

Guía para Claude Code en este repositorio. Describe **cómo funciona** el proyecto; qué hacer y qué no está en `.claude/rules/`.

## Qué es este proyecto

Diseñador de interiores 2D + 3D para viviendas y comercios, con presets (ambientes de partida que se cargan y se editan). Next.js (App Router) + React; el editor se apoya en Pascal Editor (`@pascal-app/*`) sobre three.js / React Three Fiber; Supabase para Postgres, Auth y Storage (todo con RLS); deploy en Vercel; pnpm.

Es el trabajo final de IISAIA (FIUBA). **El README no es documentación de uso: es el informe** ("Qué decidimos nosotros", "Cómo gestionamos el contexto", "Qué salió mal"). Si un cambio invalida una decisión o un incidente narrado ahí, se actualiza esa sección **en el mismo commit**.

`docs/plan.md` es el plan original **congelado a propósito**; las diferencias con lo construido están explicadas en el README. No lo actualices para "sincronizarlo". `docs/superpowers/` queda como lo generó el flujo.

## Comandos

```bash
pnpm install                    # dependencias (el lockfile lo escribe pnpm, nunca a mano)
pnpm dev                        # Next en :3000 (lo levanta la persona en otra terminal)
pnpm typecheck                  # tsc --noEmit
pnpm lint
pnpm build                      # antes de abrir un PR
supabase start                  # Postgres + Auth + Storage locales (requiere Docker)
supabase db reset               # recrea la base LOCAL: migraciones + seed
supabase migration new <desc>   # migración nueva (las aplicadas no se editan)
supabase gen types typescript --local > apps/web/src/types/database.ts
supabase test db                # tests pgTAP, incluido "toda tabla de public tiene RLS"
```

- Variables en `apps/web/.env.local` (copiar de `.env.example`). Sin ellas la app no arranca.
- ⟦Ajustar a los scripts reales del `package.json`.⟧

## No negociables (valen en cualquier carpeta)

1. Toda tabla de `public` tiene RLS habilitada **en la misma migración** que la crea.
2. Una migración ya aplicada o mergeada **no se edita**: se agrega otra.
3. `SUPABASE_SERVICE_ROLE_KEY` solo existe en código de servidor y scripts locales: nunca en el cliente ni en `NEXT_PUBLIC_*`.
4. Solo `apps/web/src/editor/` importa `@pascal-app/*`, `three` y `@react-three/*`.
5. Una tarea de datos o de editor **no está terminada hasta verificarla usándola** (ver "Verificar"), no hasta que compila.
6. Si el mismo error persiste tras dos intentos, **parar y reportar** hipótesis y evidencia; no probar variantes a ciegas.
7. No agregues dependencias ni toques `.claude/` o `CLAUDE.md` sin que lo pidan: se piden con `pnpm add` (pide permiso) y se proponen en el chat.

## Dónde seguir leyendo

Este archivo es el panorama. El detalle de cada zona vive al lado del código y **se carga solo al leer archivos de esa zona**:

| Archivo | Qué cubre |
|---|---|
| `apps/web/CLAUDE.md` | estructura de la app, shell vs editor, cómo viaja un proyecto al guardar, auth, variables |
| `supabase/CLAUDE.md` | tablas, matriz de policies, buckets, flujo de migraciones, cómo probar RLS |
| `docs/pascal-notes.md` | lo que **verificamos** de Pascal Editor en la versión instalada |
| `docs/decisiones.md` | decisiones con alternativas descartadas |
| `.claude/rules/contrato-datos.md` | (siempre) contrato de datos y API |
| `.claude/rules/datos-y-rls.md` | esquema, RLS, migraciones, Storage, seed |
| `.claude/rules/editor-pascal-three.md` | límites del editor, Client Components, ciclo de vida de three |
| `.claude/rules/shell-ui.md` | server vs client, estados de carga/error/vacío |

Los `CLAUDE.md` describen cómo funciona; las reglas dicen qué hacer y qué no. Configuración del agente versionada: `.claude/settings.json` (modelo y permisos), skills `nueva-migracion-con-rls` y `agregar-preset`, sub-agents `explorador` y `explorador-pascal` (solo lectura), comandos `/pre-entrega`, `/explicar <archivo>`, `/deriva` y `/checkpoint`.

## Arquitectura (tres contratos)

```
navegador ─> shell (apps/web/src/app, components) ─> editor/api.ts ─> @pascal-app/* + three/R3F
                    │
                    └─> lib/persistence ─> Route Handlers (apps/web/src/app/api) ─> Supabase (RLS)
```

1. **El editor no conoce Supabase y el shell no conoce `@pascal-app`.** El único puente es `editor/api.ts` (⟦loadScene, serializeScene, applyPreset, onChange; nombres tentativos⟧). Así se puede tocar el editor sin cargar la capa de datos y viceversa.
2. **La escena se guarda como `jsonb` + `schema_version`.** `owner_id` lo fija la base (`default auth.uid()`), nunca el cliente.
3. **La seguridad vive en la base** (RLS), no en la UI: ocultar un botón no protege nada.

## No se toca (zonas de solo lectura)

| Path | Por qué | Cómo se cambia |
|---|---|---|
| `node_modules/`, `.next/` | dependencias y artefactos | `pnpm add/remove` (pide permiso) |
| `pnpm-lock.yaml` | lo escribe pnpm | `pnpm install` |
| `apps/web/src/types/database.ts` | generado desde la base | `supabase gen types ...` |
| migraciones ya aplicadas | historial inmutable | una migración nueva (skill `nueva-migracion-con-rls`) |
| `apps/web/public/vendor/**`, `public/models/**` ⟦si existen⟧ | assets de terceros | skill `agregar-mueble-al-catalogo` |
| `.env*.local` | secretos | la persona, a mano |
| `docs/plan.md` | plan original congelado | no se cambia |

## Verificar (qué significa "terminado")

- Código: `pnpm typecheck && pnpm lint`; `pnpm build` antes del PR.
- Datos: `supabase db reset` y `supabase test db` en verde.
- Editor: abrir el editor en el navegador, hacer la acción, guardar, **recargar** y comprobar que sigue; consola del navegador sin errores nuevos. Leer el estado de la escena desde el store, no solo mirar la captura.
- Lo que no pudiste correr, decilo. No lo des por pasado.

## Trampas ya pagadas

⟦Empieza vacío. Una línea por incidente real: **Título.** qué pasó, cómo se detectó, qué hacer. (fecha, commit). Cada línea alimenta "Qué salió mal" del README.⟧

## Convenciones

- Todo en español: UI, comentarios, mensajes de error de cara al usuario y commits (`tipo: descripción en minúscula`). ⟦decisión de idioma: anotarla⟧
- Archivos por debajo de 300 líneas y funciones por debajo de 50; si un archivo se pasa, se parte antes de seguir.
- Un commit por pieza que funciona y se puede abrir y probar. Ramas `feat/<tema>`; PR a `main` con: plan, verificación hecha y quién lo revisó.
- Server Components por defecto; `'use client'` solo donde hace falta (el editor siempre).
- TypeScript estricto; sin `any` sin comentario que lo justifique.
- Decisiones de arquitectura o de datos que no estén en el plan: **preguntá** antes de implementarlas; las que se tomen van a `docs/decisiones.md`.
- No guardes decisiones de arquitectura en la memoria automática: van a `docs/decisiones.md` (la memoria es de cada máquina y no es evidencia).
````

**README ("Cómo gestioné el contexto")**: una frase por bloque: por qué hay "no negociables" en la raíz (lo crítico se carga siempre), por qué las zonas read-only están también en `deny`, y cuál fue la primera "trampa pagada".

### D4.3 `apps/web/CLAUDE.md`

**Dónde**: `apps/web/CLAUDE.md`. **Cuándo**: **bajo demanda**, al leer un archivo de `apps/web/` (no figura en `/context` al arrancar). **Contenido** (borrador; los `⟦⟧` se completan tras explorar Pascal y fijar la versión de Next):

````markdown
# CLAUDE.md — apps/web

Next.js (App Router) + React. Contiene el shell (páginas, paneles, formularios), el editor 2D/3D y los Route Handlers que hacen de backend HTTP. Describe **cómo funciona**; las reglas: `../../.claude/rules/` (`shell-ui.md`, `editor-pascal-three.md`, `contrato-datos.md`).

## Estructura

| Path | Qué es |
|---|---|
| `src/app/` | rutas: ⟦/, /login, /proyectos, /proyectos/[id] (editor), /presets⟧ |
| `src/app/api/` | Route Handlers: **único** punto HTTP hacia la base desde el cliente |
| `src/components/` | shell: navegación, galería de presets, listados, formularios (sin three/Pascal) |
| `src/editor/` | **único** lugar que importa `@pascal-app/*`, `three`, `@react-three/*`; `api.ts` es el puente |
| `src/lib/supabase/` | `client.ts` (navegador, anon key), `server.ts` (server, cookies), ⟦middleware/proxy según versión de Next⟧ |
| `src/lib/persistence/` | guardar/cargar proyectos y presets (habla con los Route Handlers) |
| `src/types/database.ts` | **generado** (`supabase gen types`): no se edita |

## Server vs Client

Páginas y listados son Server Components. El editor es un Client Component cargado con `next/dynamic` y `ssr: false` (three/R3F necesitan `window`/WebGL). Un hook de R3F fuera de `<Canvas>` rompe en silencio: ver la rule del editor.

## Cómo viaja un proyecto

1. El usuario edita: el estado vive en el store de ⟦Pascal / nuestro wrapper⟧.
2. "Guardar": `editor/api.ts › serializeScene()` → `lib/persistence › saveProject()` → `POST/PUT /api/projects` → Supabase (`projects.scene` jsonb + `schema_version`).
3. "Abrir": `GET /api/projects/[id]` → `editor/api.ts › loadScene(json)`. Si `schema_version` es viejo, se migra **antes** de cargar (⟦función de migración de escena⟧).
4. RLS decide quién ve qué; el handler nunca "filtra por owner" como única defensa.

## Auth

⟦Supabase Auth con `@supabase/ssr`: cookie de sesión, refresco en middleware/proxy (según versión de Next); rutas protegidas: ...⟧. El `owner_id` nunca viaja en el body.

## Variables de entorno

| Variable | Dónde | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente y servidor | públicas por diseño; la seguridad es RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo** servidor / scripts locales | si aparece en el bundle del cliente, es un incidente |

## Probar

`pnpm typecheck && pnpm lint`. El editor se verifica **usándolo** (ver CLAUDE.md raíz, "Verificar"). ⟦Si se instala Playwright MCP: `window.__scene` solo en dev para leer el estado.⟧

## Detalles que ya costaron

⟦Se llena con incidentes reales: SSR/`window`, `three` duplicado (`pnpm why three`), WebGL/WebGPU en headless, proceso huérfano en :3000 en Windows (`netstat -ano | findstr :3000`).⟧
````

**README**: en "Arquitectura" y en "Decisiones": por qué Route Handlers (backend explícito) y por qué el puente `editor/api.ts`.

### D4.4 `supabase/CLAUDE.md` (el "paquete de datos")

**Cuándo**: bajo demanda, al leer cualquier archivo de `supabase/`. **Contenido** (borrador; el modelo es una propuesta: lo deciden ustedes y lo anotan en `docs/decisiones.md`):

````markdown
# CLAUDE.md — supabase

Postgres + Auth + Storage. El esquema y las policies viven **solo** en `supabase/migrations/`. Describe **cómo funciona**; las reglas: `../.claude/rules/datos-y-rls.md`.

## Modelo ⟦propuesta, ajustar⟧

| Tabla | Para qué | Dueño |
|---|---|---|
| `projects` | un proyecto de diseño: `kind` (`vivienda`/`comercio`), `scene` jsonb, `schema_version` | `owner_id` (= `auth.uid()` por default) |
| `presets` | plantillas de ambiente: `slug` único, `kind`, `scene` jsonb, `is_public` | `owner_id` nullable (null = preset del sistema, cargado por seed) |
| `catalog_items` | muebles/objetos: dimensiones en metros, `model_path` (Storage), `thumbnail_path` | solo lectura para usuarios; escritura por seed/admin |

## Matriz de acceso (RLS)

| Recurso | anon | authenticated | Escribe |
|---|---|---|---|
| `projects` | nada | solo filas propias (select/insert/update/delete) | el dueño |
| `presets` | nada ⟦o lectura pública si hay landing⟧ | select de `is_public` o propios; CRUD solo de propios | dueño; los del sistema solo por seed |
| `catalog_items` | nada | select | seed / `service_role` desde script local |
| Storage `project-assets` | nada | solo bajo su carpeta `<uid>/...` | el dueño |
| Storage `catalog` | lectura pública | lectura | script local con `service_role` |

## Migraciones: flujo

`supabase migration new <desc>` → escribir SQL (tabla + `enable row level security` + policies + índices en la **misma** migración) → `supabase db reset` → `supabase test db` → `supabase gen types ...` → actualizar esta matriz. Una migración mergeada o aplicada en el proyecto remoto **no se edita**. A producción las aplica una persona (`supabase db push` está denegado para el agente).

## Seed

`supabase/seed.sql` idempotente (`insert ... on conflict (slug) do update`). Los presets del sistema se cargan acá; el slug no se renombra una vez publicado.

## Probar

`supabase test db` corre `supabase/tests/*.sql` (pgTAP). Hay que mantener: (1) toda tabla de `public` tiene RLS, (2) A no ve ni modifica filas de B, (3) `anon` no ve nada privado, (4) un insert con `owner_id` ajeno falla.

## Detalles que ya costaron

⟦Se llena con incidentes reales (p. ej. policy que dejaba leer todo, migración editada después de aplicada).⟧
````

**README**: tabla matriz de acceso copiada + la anécdota del primer hallazgo de RLS ("Qué salió mal").

### D4.5 `.claude/rules/` (cinco rules: dos "tipos" de carga a propósito)

**Qué es**: archivos `.md` por tema; sin `paths:` cargan siempre (cuestan como CLAUDE.md), con `paths:` solo cuando Claude **lee** un archivo que matchea. **Dónde**: `.claude/rules/`. **Decisión de carga** (para el README): solo `contrato-datos.md` es siempre-on, porque son decisiones que valen para todo el proyecto y cuestan pocas líneas (igual que `api-y-datos.md` en la referencia); las otras cuatro son condicionales porque solo importan cuando se toca su zona. **Cómo se prueba** (obligatorio, es la demo de §8): `/context` antes de leer nada, después de leer un archivo que no matchea, después de leer uno que sí; capturar las tres. Si una rule no aparece, el glob está mal. Hay que **citar las rules desde las skills** ("leé la rule") para cubrir tareas que crean archivos nuevos sin leer ninguno de la zona.

#### `.claude/rules/contrato-datos.md` (sin frontmatter: siempre cargada)

````markdown
# Contrato de datos y API

## Qué se guarda y cómo
- La escena de un proyecto o preset se guarda **tal como la serializa `editor/api.ts`**, en `scene jsonb`, siempre junto a `schema_version int`. Estado de UI (paneles, cámara) no va dentro de `scene`.
- Al abrir una escena con `schema_version` viejo se migra **antes** de cargarla en el editor; nunca se carga "a ver qué pasa".

## Qué decide el servidor y qué el cliente
- `owner_id`, `created_at` y `updated_at` los pone la base. El cliente no los manda y los Route Handlers no los aceptan en el body (si llegan, se ignoran o se rechaza con 422).
- El `slug` de un preset viaja en la URL, no en el body.

## Status codes en uso
- `201` al crear · `200` al leer o actualizar · `204` al borrar.
- `401` sin sesión.
- `404` si el recurso no existe **o no es del usuario** (con RLS son indistinguibles; no revelar existencia).
- `422` validación (Zod): nombre vacío o de más de 80 caracteres, `kind` inválido, `scene` que no pasa el schema.
- `[]` significa "existe y no hay nada"; un recurso inexistente es `404`, no una lista vacía.

## Validación y tipos
- Se valida en el borde (Zod en cada Route Handler). Los tipos de entrada y salida de la API se declaran aparte de `types/database.ts`: no se devuelve una fila cruda de tabla.
- Fechas: `timestamptz` en UTC; ISO 8601 con `Z` en las respuestas.

## Errores
- Los mensajes de cara al usuario van en castellano y se traducen en **un solo lugar** (`lib/persistence/errors.ts`); el resto de la UI muestra `error.message`.
````

#### `.claude/rules/datos-y-rls.md` (path-scoped)

````markdown
---
description: Reglas para esquema, migraciones, policies RLS, seeds, Storage y acceso a Supabase. Aplicar al tocar supabase/ o apps/web/src/lib/supabase y lib/persistence.
paths:
  - "supabase/migrations/**/*.sql"
  - "supabase/seed.sql"
  - "supabase/tests/**/*.sql"
  - "apps/web/src/lib/supabase/**/*.ts"
  - "apps/web/src/lib/persistence/**/*.ts"
---

# Datos, RLS y migraciones

## Migraciones
- Un cambio lógico = una migración nueva (`supabase migration new`). **Nunca** se edita una migración mergeada o aplicada: si hay un error, otra migración que lo corrige. `git diff --name-status` sobre `supabase/migrations/` debe mostrar solo archivos nuevos (`A`), nunca `M`.
- snake_case; tablas en plural; claves foráneas `<entidad>_id`.
- La migración que crea una tabla **también** habilita RLS (`alter table ... enable row level security`) y crea sus policies. Una tabla sin RLS no se mergea.

## Policies
- Una policy por operación (`select`, `insert`, `update`, `delete`) y por rol (`to authenticated` / `to anon`). Evitar `for all`.
- `auth.uid()` siempre envuelto: `(select auth.uid())`, para que se evalúe una vez por consulta y no por fila.
- `insert` y `update` llevan `with check`; `update` lleva además `using`.
- Índice sobre toda columna que aparezca en una policy (`owner_id`).
- `using (true)` solo en lecturas **deliberadamente públicas** (presets del sistema, catálogo) y con un comentario SQL que diga por qué.
- El dueño no lo decide el cliente: `owner_id uuid not null default auth.uid()` y el `with check` lo valida.

## Storage
- Un bucket por finalidad. Policies sobre `storage.objects` filtrando por `bucket_id` y por carpeta del usuario: `(storage.foldername(name))[1] = (select auth.uid())::text`.
- `catalog` es de lectura pública; solo se escribe desde scripts locales con `service_role`.

## Claves y clientes
- El navegador usa solo la anon key. `service_role` no aparece en `apps/web/src` salvo en código server-only marcado con `import 'server-only'`, y jamás en `NEXT_PUBLIC_*`. Chequeo: `git grep -n service_role -- apps/web/src`.
- El editor no importa `supabase-js`.

## Tipos y seed
- Después de cada migración: `supabase gen types typescript --local > apps/web/src/types/database.ts` (archivo generado, no se edita).
- Seeds idempotentes (`on conflict (slug) do update`). El slug de un preset del sistema no se renombra una vez publicado.

## Tests
- Cada tabla nueva suma casos en `supabase/tests/`: el dueño ve lo suyo, otro usuario no ve nada, `anon` no ve nada privado, un `insert` con `owner_id` ajeno falla.
````

#### `.claude/rules/editor-pascal-three.md` (path-scoped al editor)

````markdown
---
description: Reglas para escribir o modificar el editor 2D/3D (Pascal Editor, three.js, React Three Fiber). Aplicar al tocar apps/web/src/editor/.
paths:
  - "apps/web/src/editor/**/*.ts"
  - "apps/web/src/editor/**/*.tsx"
---

# Editor 2D/3D

## Límites
- Este directorio es el **único** que importa `@pascal-app/*`, `three` y `@react-three/*`. El resto de la app usa `editor/api.ts`. Si el shell necesita algo nuevo, se agrega a `api.ts`; no se importa Pascal desde afuera.
- El editor no importa `lib/persistence` ni `lib/supabase` y no hace `fetch`. Hacia afuera solo sale por `api.ts` (`serializeScene()`, `onChange(cb)`); los datos entran por `loadScene()` y `applyPreset()`.

## Pascal es de solo lectura
- `node_modules/@pascal-app/*` no se edita, no se parchea y no se copia. Si falta una capacidad: extender por la API pública o registrar la limitación en `docs/decisiones.md`.
- **Antes de usar una API de Pascal, verificarla**: `docs/pascal-notes.md` o delegar a `explorador-pascal`, y citar `paquete/ruta:símbolo`. Si no está en los `.d.ts` o en el código de la versión instalada, **no existe**: no se infiere de memoria ni de otra versión.
- Todo uso nuevo se valida con `pnpm typecheck`. Una API inventada no compila; si hay que forzarla con `any` para que compile, es una alarma, no una solución.

## Next + React
- Todo componente que use three/R3F es Client Component (`'use client'`) y se importa con `next/dynamic(..., { ssr: false })`.
- Los hooks de R3F (`useFrame`, `useThree`) solo dentro de `<Canvas>`.
- Una sola copia de `three` en el árbol: `pnpm why three` debe mostrar una versión. Si aparecen dos, es un problema de dependencias, no de código.

## Ciclo de vida y estado
- Nada de `new THREE.X()`, geometrías o materiales creados en cada render o frame: se crean en `useMemo` o fuera del componente; lo que se crea a mano se libera (`dispose`).
- No se duplica estado: la fuente de verdad de la escena es ⟦el store de Pascal⟧; nuestros componentes la leen y escriben por `api.ts`.
- Serializar y cargar **solo** por `serializeScene()` / `loadScene()` (son quienes manejan `schema_version`).

## Pruebas manuales en cada cambio
- Agregar, mover, deshacer/rehacer, guardar, recargar. ⟦Completar tras explorar Pascal.⟧
````

#### `.claude/rules/shell-ui.md` (path-scoped al shell)

````markdown
---
description: Reglas para páginas, componentes de shell, formularios y paneles (todo lo que no es el editor). Aplicar al tocar apps/web/src/app o src/components.
paths:
  - "apps/web/src/app/**/*.tsx"
  - "apps/web/src/components/**/*.tsx"
---

# Shell de la app

- Server Components por defecto. `'use client'` solo para interactividad (formularios, paneles). Si el componente necesita three o Pascal, **no va acá**: va por `src/editor/`.
- El shell no importa `@pascal-app/*`, `three` ni `@react-three/*`: usa `editor/api.ts` o recibe props.
- Datos: desde Server Components con `lib/supabase/server.ts` o desde el cliente con `lib/persistence`. Nada de `fetch` manual a URLs de Supabase.
- Todo lo async muestra tres estados: cargando, vacío y error (con "Reintentar"). El texto del error es `error.message`, ya traducido.
- Formularios: se valida en el cliente por UX y de nuevo en el Route Handler (Zod). La validación del cliente no es seguridad.
- Estilos: ⟦sistema decidido (Tailwind, tokens)⟧; se usan los tokens, no valores sueltos. Textos en castellano.
- Accesibilidad mínima: `label` en cada input, foco visible, los botones son `button`.
- Archivos de menos de 300 líneas; un componente que crece se parte por responsabilidad (lista, tarjeta, formulario).
- Rutas protegidas: ⟦cómo se protegen⟧. Los permisos nunca se deciden solo ocultando UI.
````

#### `.claude/rules/solo-lectura-y-generados.md` (path-scoped)

````markdown
---
description: Archivos generados o de terceros que no se editan a mano. Aplicar al leer types generados, el lockfile o assets vendor.
paths:
  - "apps/web/src/types/database.ts"
  - "apps/web/public/vendor/**"
  - "apps/web/public/models/**"
  - "pnpm-lock.yaml"
---

# Solo lectura y generados

Estos archivos están en `permissions.deny` para edición. Esto explica el porqué y qué hacer.

| Archivo | Por qué | Qué hacer |
|---|---|---|
| `types/database.ts` | generado desde la base | `supabase gen types typescript --local > ...` tras una migración |
| `pnpm-lock.yaml` | lo mantiene pnpm | `pnpm install` / `add` / `remove` |
| `public/vendor/**` | código o assets de terceros, con licencia | reemplazar la versión completa; nunca editar a mano |
| `public/models/**` | modelos del catálogo | skill `agregar-mueble-al-catalogo` |

Si un bloqueo de permisos te frena, **no lo rodees** con `sed`, `python` ni redirecciones desde Bash: pará y decí qué necesitás.
````

**README ("Cómo gestioné el contexto")**: tabla `rule → carga (siempre/condicional) → incidente o decisión que la justifica → captura de /context`. Es lo que contesta "¿por qué esta rule tiene `paths:` y esa no?".

### D4.6 `.claude/settings.json`, `settings.local.json.example`, `.mcp.json`

**Qué es**: configuración **del runtime** (no instrucciones al agente), aplicada sin interpretación. **Dónde**: `.claude/settings.json` (versionado, nivel proyecto), `.claude/settings.local.json` (por persona, gitignored, copiado del `.example`), `~/.claude/settings.json` (usuario). **Cuándo**: al arrancar; las listas de `permissions` se suman entre niveles; recarga en caliente salvo `model`. **Propuesta** (permisos por capas de riesgo; **ninguna regla está copiada de la referencia sin repensarla**):

```json
{
  "model": "sonnet",
  "permissions": {
    "allow": [
      "Bash(pnpm install)",
      "Bash(pnpm install --frozen-lockfile)",
      "Bash(pnpm typecheck *)",
      "Bash(pnpm lint *)",
      "Bash(pnpm build *)",
      "Bash(pnpm test *)",
      "Bash(pnpm why *)",
      "Bash(pnpm list *)",
      "Bash(supabase start)",
      "Bash(supabase stop)",
      "Bash(supabase status *)",
      "Bash(supabase migration new *)",
      "Bash(supabase migration list *)",
      "Bash(supabase db reset)",
      "Bash(supabase db lint *)",
      "Bash(supabase test db *)",
      "Bash(supabase gen types *)",
      "Bash(git status *)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git show *)",
      "Bash(git grep *)",
      "Bash(git switch -c *)",
      "Bash(git add *)",
      "Bash(gh pr view *)",
      "Bash(gh pr list *)",
      "Bash(gh pr diff *)",
      "Edit(./apps/web/src/**)",
      "Edit(./apps/web/public/**)",
      "Edit(./supabase/**)",
      "Edit(./docs/**)",
      "Edit(./README.md)",
      "WebFetch(domain:supabase.com)",
      "WebFetch(domain:nextjs.org)",
      "WebFetch(domain:threejs.org)",
      "WebFetch(domain:docs.pmnd.rs)",
      "WebFetch(domain:pnpm.io)",
      "WebFetch(domain:github.com)",
      "WebFetch(domain:raw.githubusercontent.com)"
    ],
    "ask": [
      "Bash(pnpm add *)",
      "Bash(pnpm remove *)",
      "Bash(pnpm update *)",
      "Bash(pnpm up *)",
      "Bash(pnpm dlx *)",
      "Bash(npx *)",
      "Bash(supabase functions *)",
      "Bash(git push *)",
      "Bash(git reset *)",
      "Bash(git restore *)",
      "Bash(git checkout *)",
      "Bash(gh pr create *)",
      "Edit(./supabase/migrations/**)",
      "Edit(./.claude/**)",
      "Edit(./CLAUDE.md)",
      "Edit(./apps/web/CLAUDE.md)",
      "Edit(./supabase/CLAUDE.md)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.local)",
      "Read(./apps/web/.env.local)",
      "Read(./apps/web/.env.*.local)",
      "Read(./supabase/.env)",
      "Bash(cat *.env*)",
      "Bash(type *.env*)",
      "Edit(./.claude/settings.json)",
      "Edit(./.claude/settings.local.json)",
      "Edit(./pnpm-lock.yaml)",
      "Edit(./apps/web/src/types/database.ts)",
      "Edit(./apps/web/public/vendor/**)",
      "Edit(./apps/web/public/models/**)",
      "Edit(./node_modules/**)",
      "Edit(./apps/web/.next/**)",
      "Edit(./docs/plan.md)",
      "Bash(rm -rf *)",
      "Bash(git reset --hard *)",
      "Bash(git push *--force*)",
      "Bash(git push -f *)",
      "Bash(supabase db push *)",
      "Bash(supabase db reset *--linked*)",
      "Bash(supabase *--db-url*)",
      "Bash(supabase secrets *)",
      "Bash(supabase link *)",
      "Bash(supabase projects *)",
      "Bash(vercel *)",
      "Bash(npx vercel *)",
      "Bash(pnpm dlx vercel *)",
      "Bash(gh pr merge *)",
      "Bash(gh secret *)",
      "Bash(gh repo delete *)"
    ]
  },
  "cleanupPeriodDays": 90
}
```

**Por qué cada bloque (esto es lo que se escribe en el README, una línea por grupo)**
- `allow` = lo que corre sin preguntar porque es lectura, verificación o edición acotada a `src/` y datos. `git commit` **no** está en ninguna lista a propósito (como en la referencia): cada commit lo mira una persona y cada uno decide en su `.local` ("Yes, and don't ask again"). El dev server lo levanta la persona en otra terminal.
- `ask` = decisiones que cambian el proyecto: dependencias (`pnpm add/remove/update/dlx`; `npx` ejecuta código remoto), `git push`/`reset`/`restore`/`checkout`, abrir PRs, y **cada edición de migraciones, de `.claude/` y de los CLAUDE.md** (un `Edit(path)` no distingue archivo nuevo de existente: el `ask` obliga a mirar cada migración antes de que entre al disco). Como `ask` se evalúa antes que `allow`, el `Edit(./supabase/**)` amplio convive con el `ask` de migraciones.
- `deny` = secretos, archivos generados/vendor, plan congelado, el propio settings (el agente no puede aflojar sus permisos con `Edit`), producción (`vercel *`, `supabase db push`, `reset --linked`, `--db-url`, `secrets`, merge de PRs: "publicar lo decido yo", se despliega por la integración Git de Vercel) y destrucción (`rm -rf`, `reset --hard`, force push).
- `cleanupPeriodDays: 90`: los transcripts son la prueba de la deriva detectada; el valor por defecto podría borrarlos antes del Demo Day (inferencia: confirmar el default con `/config` o la doc).
- **Sin `env`**: no hay variables de entorno que el agente necesite; las claves viven en `apps/web/.env.local` y en Vercel. **Sin `attribution`**: decisión a documentar (dejar la línea de coautoría en los commits es evidencia de proceso; la referencia vacía solo la de PR).
- **Orden de montaje**: escribir primero el `settings.json` sin los dos `Edit(./.claude/settings*.json)` ni `Edit(./docs/plan.md)`; agregarlos al final del setup y al congelar el plan, en commits separados.

**Límites que hay que decir en voz alta (el docente los marca)**: (1) un `deny` cubre una tool y un patrón, no una intención: `Edit` bloqueado no impide `sed -i`/`python` por Bash (aparece un prompt: se responde que no); `Read(./.env.local)` no frena un `cat` salvo las dos reglas parciales de `Bash(cat/type ...)`, que son defensa en profundidad y no frontera. (2) Los wildcards no atraviesan `&&` ni `;`, y `Bash(rm -rf *)` no frena `/bin/rm` ni `sh -c`. (3) En Windows Claude Code puede tener además una tool **PowerShell** distinta de Bash (inferencia: en esta misma sesión existe): las reglas `Bash(...)` no la cubren; verificar con `/permissions` y replicar los denies críticos con su sintaxis. (4) `deny` real = **branch protection en GitHub** (PR obligatorio, sin push a `main`), RLS y tests; no confiar solo en el harness. (5) `permissions.defaultMode: "auto"` no tiene efecto desde el settings del proyecto: arrancar con `claude --permission-mode default` (o `plan`).

**`.claude/settings.local.json.example`** (cada persona lo copia a `settings.local.json`, que está en `.gitignore`):

```json
{
  "model": "haiku",
  "enabledMcpjsonServers": ["playwright"]
}
```

**`.mcp.json`** (raíz; **opcional y más allá de S04**: MCP se ve en S07; el curso dice que MCP **no** se configura en `settings.json`):

```json
{
  "mcpServers": {
    "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] }
  }
}
```

- Fijar la versión de `@playwright/mcp` en vez de `@latest` (inferencia: reproducibilidad).
- Riesgo (inferencia): un editor three/Pascal puede requerir WebGL/WebGPU; el navegador headless de Playwright puede no tenerlo. Primer día: probar que el canvas renderiza en Playwright; si no, la verificación pasa a ser manual + lectura del store.
- Un servidor MCP de Supabase **no** entra en el harness base: ejecuta SQL sobre una base real. Si lo usan (S07), solo contra el proyecto de desarrollo, en modo solo lectura y scoped a un proyecto (inferencia: verificar las opciones en la doc del servidor MCP de Supabase antes de habilitarlo).

**README**: tabla "regla → riesgo que cubre → decisión" + captura de un `deny` disparado + captura de `/status` con el `local` pisando el `model`.

### D4.7 Skills (procedimientos repetibles con verificación)

**Qué es**: directorio con `SKILL.md` (frontmatter + fases + anti-patterns). **Dónde**: `.claude/skills/<nombre>/SKILL.md`. **Cuándo se carga**: al arranque entra **solo** nombre + `description` (visible en `/context`); el cuerpo entra a la misma ventana cuando se la invoca (`/nombre`) o cuando Claude juzga que el pedido matchea la `description`. **Criterio para elegir qué merece skill**: orden de pasos que importa + se repite ≥2–3 veces + tiene verificación real + el error de saltearse un paso es caro. Las tres candidatas, por riesgo/valor:

| Skill | Por qué merece skill | Prioridad (2 días) |
|---|---|---|
| `nueva-migracion-con-rls` | cada tabla/policy nueva repite el mismo ritual y el error (tabla sin RLS, migración editada) es caro y silencioso | **Alta**: hacerla después de la primera migración a mano |
| `agregar-preset` | es el núcleo del dominio (viviendas/comercios); toca editor + datos + galería en un orden fijo | **Alta**: después del primer preset |
| `agregar-mueble-al-catalogo` | solo si el catálogo propio (GLB + Storage + metadatos) está en el alcance | Media/opcional |

Convenciones tomadas de la referencia: `description` en inglés con **"Use when …"** (contrato de activación) y cuerpo en castellano; primera instrucción "leé la rule" (no se repite su contenido); fases numeradas; verificación real; anti-patterns al final. Probarlas con la demo de §11 (índice en `/context` → pedido en prosa → misma tarea en una copia sin la skill).

#### `.claude/skills/nueva-migracion-con-rls/SKILL.md`

````markdown
---
name: nueva-migracion-con-rls
description: Use when adding or changing a table, column, policy, index, function or Storage bucket in the Supabase database. Covers creating a NEW migration (never editing an applied one), RLS policies per operation, pgTAP tests, regenerating TypeScript types and updating supabase/CLAUDE.md.
---

# Nueva migración con RLS

El orden importa: una tabla creada sin RLS y mergeada es un agujero que "funciona" y no da ningún error. La verificación es probar el acceso como otro usuario, no leer el SQL.

Antes de empezar, leé `.claude/rules/datos-y-rls.md` y `supabase/CLAUDE.md`. Las reglas de ahí no se repiten en este archivo y son obligatorias.

## Fase 1 · Definir el cambio con la persona
Preguntá, o proponé y confirmá: qué tabla o columna; **quién es el dueño** de la fila; y para cada operación (select, insert, update, delete) quién puede (anon, authenticated, solo `service_role`). Escribila como una frase por operación. No sigas sin esa matriz: la policy sale de ahí, no de la intuición del SQL.

## Fase 2 · Crear la migración
`supabase migration new <descripcion_snake_case>`. Un archivo por cambio lógico. **Nunca** edites una migración existente: si hay que corregir, otra migración. Chequeo: `git status` muestra el archivo nuevo, ninguna migración modificada.

## Fase 3 · Escribir el SQL, en este orden
1. `create table` (con `owner_id uuid not null default auth.uid()` si hay dueño, `created_at`/`updated_at` `timestamptz`).
2. `alter table ... enable row level security;` — **en la misma migración**.
3. Una policy por operación y rol, con `(select auth.uid())` y `with check` donde corresponde.
4. Índices sobre las columnas que usan las policies.
5. Comentario SQL en cada `using (true)` explicando por qué es público.

## Fase 4 · Probar
`supabase db reset` (recrea la base local con migraciones + seed) y `supabase test db`. Agregá o actualizá el test en `supabase/tests/`: el dueño ve lo suyo, otro usuario no ve nada, `anon` no ve nada privado, un `insert` con `owner_id` ajeno falla. Si algún caso no falla cuando debería, la policy está mal: no sigas.

## Fase 5 · Tipos y documentación
`supabase gen types typescript --local > apps/web/src/types/database.ts`, después `pnpm typecheck`. Actualizá la matriz de `supabase/CLAUDE.md`. Si cambió el contrato de la API, la rule `contrato-datos.md`.

## Fase 6 · Verificar en la app
Con la app levantada (la levanta la persona), recorrer la pantalla que usa la tabla con **dos usuarios distintos**: cada uno ve solo lo suyo. Recargar. Reportá qué verificaste y qué no pudiste correr.

## Anti-patterns
- **Tabla sin RLS** o con RLS habilitada pero sin policies (deniega todo y "se ve vacío": parece un bug de UI).
- **`using (true)` sin comentario**, o `for all`.
- **`auth.uid()` sin envolver** en `(select ...)`.
- **Editar una migración ya aplicada** "porque es chica".
- **Confiar en que el cliente manda `owner_id`**.
- **Dar por hecho que anda porque `db reset` no tira errores**: sin el test de otro usuario, no probaste nada.
- **Usar `service_role` en código de cliente** para "que funcione".
````

#### `.claude/skills/agregar-preset/SKILL.md`

````markdown
---
name: agregar-preset
description: Use when adding a new preset (a ready-made room or space layout for vivienda or comercio) — defining it, building the scene in the editor, validating the scene JSON, seeding it and showing it in the gallery. Covers the order of the steps and the verification in the browser.
---

# Agregar un preset

Un preset toca las dos mitades (editor y datos). El orden importa: si se siembra antes de validar la escena, la galería muestra un preset que no abre.

Antes de empezar, leé `.claude/rules/editor-pascal-three.md`, `.claude/rules/datos-y-rls.md` y `docs/pascal-notes.md`. Las reglas de ahí no se repiten en este archivo y son obligatorias.

## Fase 1 · Definir el preset
Preguntá, o proponé y confirmá: **slug** (minúsculas, sin espacios; aparece en el seed, la galería y la URL), **nombre**, `kind` (`vivienda` o `comercio`), descripción de una línea y qué ambientes incluye. No sigas sin esos datos: renombrar el slug después es caro.

## Fase 2 · Armar la escena en el editor
Se construye **en el editor** y se exporta con `serializeScene()` a `supabase/seed/presets/<slug>.json`. No se escribe el JSON a mano. Si el editor no puede producir algo, se anota en `docs/decisiones.md`; no se inventa.

## Fase 3 · Validar
Validá el JSON contra ⟦el schema de escena (Pascal o `editor/schema.ts`)⟧ y comprobá `schema_version`. Cargalo con `loadScene()` y confirmá que renderiza en 2D y en 3D. Sin esto no se avanza.

## Fase 4 · Seed
Agregá la fila al seed idempotente (`on conflict (slug) do update`) con `owner_id` null e `is_public` true. Es un dato, no una migración. `supabase db reset` y `supabase test db`.

## Fase 5 · Miniatura
Generá la miniatura desde el editor ⟦cómo⟧ y subila al bucket ⟦nombre⟧; guardá la ruta, no la URL.

## Fase 6 · Verificar usando la app
1. La galería lista el preset con nombre y miniatura.
2. Abrirlo: se ve en 3D y en 2D, con dimensiones plausibles.
3. "Usar este preset" crea un **proyecto copia** del usuario; el preset del sistema no cambia.
4. Editar, guardar, recargar: el cambio persiste en el proyecto.
5. Como usuario normal, intentar modificar el preset del sistema por la API: tiene que fallar (RLS).

## Anti-patterns
- **Escribir coordenadas a mano** sin pasar por el editor ni validar.
- **Sembrar antes de validar.**
- **Que "usar preset" referencie** al preset en vez de copiarlo (editar el proyecto cambiaría el preset).
- **Renombrar el slug** a mitad de camino.
- **Dar por hecho que anda porque la galería lo lista**: hay que abrirlo y recargar.
````

#### `.claude/skills/agregar-mueble-al-catalogo/SKILL.md` (opcional; esqueleto)

````markdown
---
name: agregar-mueble-al-catalogo
description: Use when adding a new furniture or object model (GLB) to the catalog — preparing the asset, uploading it to Storage, registering its metadata and verifying it places correctly in the editor.
---

# Agregar un mueble al catálogo

Antes de empezar, leé `.claude/rules/datos-y-rls.md` y `.claude/rules/solo-lectura-y-generados.md`.

## Fase 1 · Definir
slug, nombre, categoría, **dimensiones reales en metros**, fuente y **licencia** del modelo. Sin licencia no entra.
## Fase 2 · Preparar el asset
GLB con origen en la base del objeto, escala en metros, orientación consistente, peso razonable ⟦umbral⟧. No se edita a mano nada de `public/models/` ni `public/vendor/`.
## Fase 3 · Subir y registrar
Subir a Storage (bucket `catalog`) con un script local (`service_role` fuera de `apps/web/src`); insertar la fila de `catalog_items` por seed (idempotente) con las rutas, no las URLs.
## Fase 4 · Verificar usando la app
Colocarlo en el editor: escala correcta contra una medida conocida (p. ej. una puerta de 0,9 m), apoya en el piso, rota, deshacer/rehacer, guardar y recargar.

## Anti-patterns
- Modelos sin licencia o sin escala conocida · binarios enormes al repo · URLs absolutas en la base · "se ve bien" sin comparar contra una medida.
````

**README**: cada skill con (a) el incidente que la originó, (b) captura de `/context` con la skill en el índice, (c) la comparación "con vs sin skill" (qué fases aparecen y cuáles no). Una frase honesta: "la skill no garantiza el orden: lo auditamos contra las fases; lo determinístico está en permisos y tests".

### D4.8 Sub-agents (aislar contexto: el motivo principal; paralelizar es secundario)

**Qué es**: instancia separada del mismo loop con su **propia ventana**; al padre vuelve solo el resultado. **Dónde**: `.claude/agents/<nombre>.md`. **Cuándo**: no se carga, se **invoca** (por pedido o por match con la `description`) vía la tool `Agent`. **Criterio** (de la clase): lo que ensucia mucho el contexto (explorar un repo grande) y de solo lectura. **Siempre declarar `tools:`** (si se omite, hereda todas, incluido `Edit`/`Bash`). Justificación para el README: el único caso fuerte es **Pascal Editor** (muchas lecturas en `node_modules`); "si no, no hace falta inventarlo".

#### `.claude/agents/explorador-pascal.md`

````markdown
---
name: explorador-pascal
description: Use when a question needs reading the code, type definitions or docs of the Pascal Editor packages (@pascal-app/*) or of three.js / React Three Fiber in node_modules — how to create or update a node, which events or store state exist, how a scene is serialized. Reads and searches only; never edits.
tools:
  - Read
  - Grep
  - Glob
---

Sos un explorador de solo lectura de las dependencias del editor 2D/3D. Tu trabajo es leer y responder, no editar.

Cómo trabajar:

- Empezá por `docs/pascal-notes.md` si existe, y por el `package.json` (`version`, `exports`, `types`) y el README de cada paquete `@pascal-app/*` instalado.
- Buscá en los `.d.ts` y en el código fuente de la **versión instalada**. Con pnpm, `node_modules/@pascal-app/<pkg>` es un symlink a `node_modules/.pnpm/...`: si una búsqueda no devuelve nada, probá la ruta real bajo `.pnpm` y decilo explícitamente.
- Citá `paquete/ruta:símbolo` en **cada** afirmación, con la versión.

Cómo responder:

- Un resumen de hasta quince líneas que conteste exactamente lo que se preguntó, y después los archivos que leíste con una línea cada uno.
- Terminá con "No pude confirmar:" y la lista de lo que no encontraste.
- Si una API no existe en la versión instalada, decí "no existe en <versión>". **No completes con lo que sería razonable ni con lo que recordás de otras versiones.**

Nunca propongas un cambio salvo que te lo pidan: quien te invocó decide qué hacer con lo que encontraste.
````

**Riesgos a probar el primer día (inferencia, no están en el curso)**: (a) `Grep` y `Glob` suelen respetar `.gitignore` y no seguir symlinks; con pnpm y `node_modules` ignorado puede devolver vacío → probar "listá los exports de `@pascal-app/<pkg>`"; si falla, alternativas: darle `Bash` y limitarlo con permisos (`Bash(ls *)`, `Bash(cat node_modules/...)`), o volcar una vez `.d.ts` y README a `docs/vendor/pascal/` (archivos nuestros, que sí ve), o clonar el repo de Pascal fuera del proyecto y sumarlo como directorio adicional (`/add-dir`, no está en el curso). (b) En macOS/Linux/WSL `Grep`/`Glob` no son tools por defecto (spine §6): el `tools:` quedaría cojo. (c) Los `.d.ts` no cuentan el comportamiento: el explorador trae citas, **no** verdad; se valida con `pnpm typecheck` y usándolo.

#### `.claude/agents/explorador.md` (el de la referencia, adaptado)

````markdown
---
name: explorador
description: Use when a question needs reading several files across apps/web and supabase to answer — how a feature works end to end (p. ej. cómo viaja un proyecto guardado desde el editor hasta Postgres), where something is defined, why two parts are connected. Reads and searches only; never edits.
tools:
  - Read
  - Grep
  - Glob
---

Sos un explorador de este repositorio. Tu trabajo es leer y responder, no editar.

El proyecto tiene dos mitades que se tocan en pocos lugares: una app Next con un editor 2D/3D sobre Pascal Editor y una base Supabase con RLS. Los tres contratos que sostienen el diseño están en el `CLAUDE.md` de la raíz.

Cómo trabajar:

- Empezá por los `CLAUDE.md` (raíz, `apps/web/`, `supabase/`) y las rules de `.claude/rules/`: describen el código y te ahorran lecturas.
- Seguí el recorrido real del dato en el código, no lo que suponés que hace.
- Citá archivo y símbolo en cada afirmación: `apps/web/src/lib/persistence/projects.ts:saveProject`.

Cómo responder:

- Un resumen de hasta diez líneas que conteste exactamente lo que se preguntó; después, los archivos que mirás y qué aporta cada uno, en una línea por archivo.
- Si algo no está en el código, decilo. No completes con lo que sería razonable.

Nunca propongas un cambio salvo que te lo pidan.
````

#### `.claude/agents/revisor-rls.md` (opcional, solo si sobra tiempo)

````markdown
---
name: revisor-rls
description: Use when a new or changed migration needs an independent security review before merging — missing RLS, overly permissive policies, wrong ownership checks, secrets in the client. Reads only; returns findings with severity.
tools:
  - Read
  - Grep
  - Glob
---

Sos un revisor de seguridad de migraciones de Supabase. Leé la migración indicada, `supabase/CLAUDE.md` y `.claude/rules/datos-y-rls.md`.

Para cada tabla nueva o modificada verificá: RLS habilitada en la misma migración; una policy por operación y rol; `(select auth.uid())`; `with check` en insert/update; `using (true)` justificado; índices en columnas de policies; ningún `service_role` en `apps/web/src`.

Respondé una tabla `severidad | archivo:línea | problema | arreglo sugerido` y, al final, "No pude verificar:" con lo que no se puede ver leyendo (hay que probarlo con `supabase test db`). No edites nada.
````

Aviso para el README: el revisor **no es enforcement** (otro LLM leyendo SQL); el control real son los tests pgTAP. "Delegar no exime de supervisar".

**Medición para el README (demo de §12)**: la misma pregunta inline vs delegada, `/context` antes/después en cada caso; con una pregunta nuestra ("¿cómo se serializa la escena en Pascal y dónde la guardamos?"). El delta es chico si el repo es chico: lo que importa es **de qué lado quedó** lo leído.

### D4.9 Slash commands (atajos, no procedimientos)

**Qué es**: un archivo en `.claude/commands/` que crea `/nombre`; el cuerpo entra al invocarlo. Con `disable-model-invocation: true` solo lo dispara una persona y su descripción **no** entra al contexto (costo cero hasta tipearlo). Criterio: "si querés que el agente lo elija, skill; si es un atajo tuyo, y más si tiene efectos que querés controlar, comando".

#### `.claude/commands/pre-entrega.md` (adaptado de la referencia)

````markdown
---
description: Revisa que el TP esté en condiciones de entregarse antes de commitear o abrir el PR
disable-model-invocation: true
---

Revisá el estado del trabajo y reportá, punto por punto, qué está listo y qué falta. No arregles nada todavía: primero el diagnóstico.

1. `git status` y `git diff --stat`: qué cambió y qué quedó sin commitear. Rama actual y commits sin PR.
2. El `README.md` es el informe. Si algún cambio invalidó una decisión narrada en "Qué decidimos nosotros", "Cómo gestionamos el contexto" o "Qué salió mal", decime qué sección hay que actualizar y con qué.
3. `docs/plan.md` está congelado a propósito: avisá si aparece modificado respecto de `main`.
4. `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan. `supabase db reset` y `supabase test db` pasan.
5. Seguridad: `git grep -n service_role -- apps/web/src` (solo server-only), ninguna variable `NEXT_PUBLIC_*` con un secreto, `git ls-files | grep -E "\.env"` no lista nada salvo `.env.example`, `git diff --name-status main -- supabase/migrations` sin ninguna `M`.
6. Los `CLAUDE.md`, las rules y `docs/pascal-notes.md` siguen describiendo el código como quedó; las "Trampas ya pagadas" incluyen los incidentes recientes.
7. Evidencia: spec y plan en disco, `docs/planes/`, commits chicos con mensaje que explica el porqué, ramas y PRs, capturas de `/context`.
8. Lo que requiere a una persona: variables en Vercel, proyecto Supabase remoto con las migraciones aplicadas, branch protection.

Cerrá con una lista corta de lo que falta antes de entregar, en orden de importancia.
````

#### `.claude/commands/explicar.md`

````markdown
---
description: Explica en cinco líneas qué hace un archivo del proyecto y quién lo llama
argument-hint: <ruta/al/archivo>
disable-model-invocation: true
---

Leé `$1` y explicame, en no más de cinco líneas:

- qué hace,
- quién lo llama y a quién llama él,
- qué convención o contrato del proyecto hay que respetar si lo toco (si es del editor, qué paquetes `@pascal-app/*` usa).

No propongas cambios ni edites nada.

Si no recibiste una ruta, pedímela antes de responder.
````

#### `.claude/commands/deriva.md` (implementa el criterio "Deriva" del Demo Day)

````markdown
---
description: Compara el trabajo hecho contra el plan de la tarea y marca todo lo que se salió del plan
argument-hint: [ruta/al/plan.md]
disable-model-invocation: true
---

Compará el diff actual (`git diff --stat` y `git diff --name-status` contra la rama base) con el plan de la tarea: `$1`, o si no recibiste ruta, el plan más reciente de `docs/planes/`.

Devolveme una tabla `archivo tocado | ¿está en "Archivos" del plan? | motivo` y después, aparte:

- dependencias nuevas en `package.json` o `pnpm-lock.yaml` que no estaban en el plan,
- migraciones **modificadas** (M) en lugar de nuevas (A),
- cambios en `.claude/`, `CLAUDE.md` o `docs/plan.md`,
- archivos fuera de `apps/web/src`, `supabase/` y `docs/`,
- lo que el plan pedía y todavía no está,
- si la "Verificación" del plan se corrió de verdad o solo se declaró.

No arregles nada ni reviertas nada: el diagnóstico es para que yo decida.
````

#### `.claude/commands/checkpoint.md` (persistir antes de `/clear`)

````markdown
---
description: Guarda una nota de sesión en docs/sesiones/ para poder hacer /clear sin perder el hilo
disable-model-invocation: true
---

Escribí `docs/sesiones/<fecha-hora>.md` con, sin editar código:

1. Objetivo de la sesión y plan que se seguía (ruta).
2. Qué se hizo: archivos tocados y por qué.
3. Decisiones tomadas (y las alternativas descartadas) que no estén ya en `docs/decisiones.md`.
4. Qué falló o sorprendió (candidato a "Trampas ya pagadas" y a "Qué salió mal").
5. Qué falta y cómo retomar: el primer comando o archivo.

Máximo una página. Después decime si conviene `/clear` o `/compact` y por qué.
````

**README**: el historial de `docs/sesiones/` es evidencia de "qué se persistió para que el agente no perdiera el hilo entre sesiones" (criterio 2 del Demo Day).

### D4.10 Hook opcional (dimensión 7 del harness; **fuera de lo dictado en S04**)

El deck nombra los hooks como "la única dimensión que no depende de que el modelo quiera colaborar… ahí viven los tests y linters automáticos" y los deja para clases siguientes. Una única propuesta chica (inferencia: verificar la sintaxis contra la doc de hooks de Claude Code antes de usarla):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "pnpm -s typecheck" }]
      }
    ]
  }
}
```

Trade-off: corre en cada edición (lento en proyectos grandes) y su salida entra al contexto si falla (puede envenenarlo). Alternativa más barata: no usar hook y exigir `pnpm typecheck` en la "Verificación" de cada plan. Recomendación: **no** montarlo en los 2 días salvo que sobre tiempo; mencionarlo en el README como dimensión no usada y por qué.

### D5. Modos de permiso y plan mode en nuestro proyecto

**Cómo se arranca**: `claude --permission-mode default` (o `plan`). En Pro/Max/Team el arranque por defecto es `auto` (un clasificador aprueba por vos) y tapa los prompts de permiso: está bien para tareas largas y reversibles, pero entonces la demo de "deny/ask" no se ve y la supervisión baja. `Shift+Tab` cicla `default → acceptEdits → plan`; la barra muestra `⏸ plan mode on` / `⏵⏵ accept edits on`.

| Tarea | Mode | Por qué (criterio: costo del error) |
|---|---|---|
| Diseño de tablas/RLS, primer contacto con Pascal, cualquier cambio en `editor/api.ts`, ≥3 archivos | **plan** | un loop mal orientado que ya escribió 20 archivos cuesta mucho más que leer un plan |
| Migraciones, auth, `lib/persistence`, Route Handlers | **default (Manual)** | datos y seguridad: querés ver cada acción; además hay `ask` en migraciones |
| Iterar el shell (componentes, estilos) con `pnpm typecheck`/`lint` rápidos | **acceptEdits** | tests/typecheck rápidos detectan regresión; no auto-acepta Bash |
| Seeds repetitivos, scaffolding de componentes, en una rama y con commit previo | **auto** (si lo tienen) | tarea larga y reversible |
| `dontAsk`, `bypassPermissions` | **nunca en la máquina con el repo real** | solo CI/contenedor descartable (la clase lo dice literal) |

Recordatorios de la clase: plan mode **no es sandbox** (frena la edición, no la ejecución: puede correr comandos mientras planifica, p. ej. `supabase db reset`); aprobar el plan **no firma cada acción** (los permisos siguen); y el mode no reemplaza a `permissions`.

**Plantilla de plan** (`docs/planes/_plantilla.md`, la información que §6.8 pide; el agente no va a usar estos títulos exactos, pero la información tiene que estar):

```markdown
# Plan: <tarea>

Objetivo: <una frase; si no coincide con lo que pediste, el agente entendió mal: frená acá>

Archivos (los únicos que se tocan):
  - <path> (qué cambia)
No se toca: <paths, p. ej. supabase/migrations existentes, apps/web/src/editor si es tarea de shell>

Pasos:
  [ ] 1. ...
  [ ] 2. ...

Verificación (cómo nos enteramos de que salió bien; real, no "correr los tests" si no existen):
  - ...

Riesgos / decisiones abiertas: ...
```

**Ejemplo con nuestro dominio** (para mostrar en el README):

```markdown
# Plan: guardar y recargar un proyecto del editor

Objetivo: el usuario edita una escena, guarda, recarga la página y la escena sigue igual; solo ve sus proyectos.
Archivos:
  - supabase/migrations/<ts>_projects.sql (tabla + RLS + policies)
  - supabase/tests/projects_rls.sql (A no ve lo de B, anon nada)
  - apps/web/src/app/api/projects/route.ts y [id]/route.ts (Zod, status codes del contrato)
  - apps/web/src/lib/persistence/projects.ts
  - apps/web/src/editor/api.ts (serializeScene / loadScene)
No se toca: migraciones existentes, @pascal-app/* en node_modules, estilos del shell
Pasos: [ ] migración + test (skill nueva-migracion-con-rls)  [ ] types  [ ] handlers  [ ] persistence  [ ] api.ts  [ ] botón guardar en el shell
Verificación: dos usuarios; A guarda, recarga y ve su escena; B no la ve; round-trip serializeScene(loadScene(x)) == x; consola sin errores; supabase test db en verde
```

**Qué mirar al leer un plan** (si falta uno, no aprobar): ¿el Objetivo es el que pedí? ¿los Archivos son explícitos y no mezclan editor, shell y datos sin razón? ¿el orden es el correcto (migración antes que UI)? ¿la Verificación existe en este repo? Opciones al aprobar: *Yes, and use auto mode* / *Yes, manually approve edits* / *No, keep planning* (la que sirve para corregir). Guardar el plan aprobado en `docs/planes/NN-<tarea>.md` y commitearlo con el código: **ese archivo es la evidencia de "plan mode durante el desarrollo"**.

**README**: capturas de la barra en `plan`, 2–3 planes reales y un caso donde el plan estaba mal y se corrigió **antes** de escribir código (es la mejor historia de "deriva").

### D6. Estrategia de gestión de contexto

Base conceptual (clase 04 y §6): la sesión **no arranca vacía** (CLAUDE.md + rules siempre-on + índices de skills/sub-agents + índice de memoria), cada vuelta reenvía todo, `/compact` y `/clear` reescriben el contexto (la vuelta siguiente se paga sin cache), y **lo que vive en un archivo persiste; lo dicho al pasar no**.

| Situación | Qué hacer | Fundamento |
|---|---|---|
| Arranque de sesión | `/context` si es la primera vez o si algo parece raro; ver qué entró | lo cargado cuesta siempre |
| Terminaste una pieza que funciona (commit) | `/checkpoint` → `/clear` | una sesión = un ítem del plan; las piezas chicas "se pueden tocar sin cargar lo demás" |
| Mismo hilo, historial largo, lo importante ya está en archivos | `/compact` (pedirle foco: plan, decisiones, archivos tocados, errores abiertos; inferencia: Claude Code acepta instrucciones tras `/compact`, verificar con `/help`) | compactar = seguir sobre un resumen: lo que no entró, se pierde |
| Cambio de tarea (de editor a datos, p. ej.) | `/clear` y cargar solo lo necesario (el plan nuevo) | resetear = tabla rasa deliberada |
| Aparecen síntomas de context rot (contradice una restricción, repite trabajo, respuestas genéricas, "no recuerda" algo del arranque) | `/checkpoint` → `/clear`; reforzar en CLAUDE.md/rule si la restricción importa | "la ventana trabaja contra vos" |
| Una salida enorme entró (log de `pnpm build`, stack trace de three/R3F, listado de `node_modules`) | `/clear`; la próxima vez filtrar (`| tail -40`) o correrlo vos y pegar lo relevante | contexto envenenado |
| Hay que leer muchos archivos que no vas a necesitar después (Pascal, "cómo funciona X de punta a punta") | **delegar** a `explorador-pascal` / `explorador` y pedir citas | protege el contexto del padre |
| Hay que decidir, editar o supervisar paso a paso | **no** delegar | "delegar no exime de supervisar" |
| Decisión de arquitectura | a `docs/decisiones.md` en el momento | lo dicho en el chat no sobrevive |
| Hallazgo sobre Pascal | a `docs/pascal-notes.md` con cita | evita re-explorar y re-alucinar |

**Memoria automática vs CLAUDE.md**: CLAUDE.md es lo **nuestro**, versionado y compartido (los dos integrantes lo comparten); la auto memory la escribe Claude, vive en `~/.claude/projects/<proyecto>/memory/` **de cada máquina** (cada uno tiene la suya, puede divergir y no es evidencia). Reglas: (1) todo lo compartido y crítico va a CLAUDE.md/rules/docs; (2) auditar `/memory` y abrir `MEMORY.md` una vez por día; borrar lo que sea falso (gente "debuggea comportamientos que vienen de un archivo que nunca abrió"); (3) el `~/.claude/CLAUDE.md` y las rules de usuario de cada integrante **también** entran: que no contradigan las del proyecto (idioma, estilo).

**Dos personas, un repo**: dos sesiones sobre el mismo árbol de trabajo editan los mismos archivos (notas §6.4). Cada integrante en su rama/clon (o `git worktree`), PRs chicos, y rotación de revisión. La lanzada de `claude` siempre desde la raíz del repo.

**Modelo y effort** (criterio de la clase: el más capaz para diseñar/depurar lo difícil, barato para lo mecánico; effort alto en lo trivial "es tirar plata"; el effort ocupa ventana y se cobra como salida). Matriz propuesta (inferencia; ajustar a lo que su plan permita):

| Tarea | model | effort | mode |
|---|---|---|---|
| Diseñar matriz de acceso/RLS, primer plan de integración con Pascal, depurar un bug difícil del editor | el más capaz disponible | `high`–`xhigh` | plan |
| Implementar según un plan aprobado (handlers, shell, persistence) | `sonnet` (default del proyecto) | `medium`–`high` | default/acceptEdits |
| Mecánico (renombres, seeds repetitivos, textos) | `haiku` en `settings.local.json` | `low` | acceptEdits |
| Exploración (sub-agents) | hereda del padre (opcional `model:` más chico) | `medium` | solo lectura |

**Cache** (por qué importa): lo estable va primero; editar CLAUDE.md o reordenar lo que carga al arranque en medio de una sesión cambia el prefijo y esa vuelta se paga completa. No es una razón para no actualizar el CLAUDE.md, sí para hacerlo entre sesiones, en un commit.

**README ("Cómo gestionamos el contexto")**: ver §4.D8.

### D7. Modos de falla del agente y checklist de supervisión específica

De la clase (05, §4, §6.8): **loop infinito**, **deriva de objetivo**, **alucinar tools o resultados**, **envenenar el propio contexto**, más **context rot**. Principio: **mirar durante, no al final** ("revisión al final no es supervisión: es auditoría"); "creale a la máquina": mirá la evidencia. Traducidos a nuestro stack (las filas de editor/RLS/secretos son aplicación mía de esos modos al stack: inferencia):

| # | Modo de falla (clase) | Cómo se ve en nuestro proyecto | Cómo detectarlo (señal / comando) | Qué hacer |
|---|---|---|---|---|
| 1 | **Deriva** | Arregla un bug del editor y "de paso" refactoriza `api.ts`, cambia el store, mueve carpetas, sube versión de `three`/Pascal, agrega una dependencia o toca una migración vieja | `git diff --stat`; `/deriva`; `git diff -- package.json pnpm-lock.yaml`; `git diff --name-status -- supabase/migrations` (cualquier `M`); archivos fuera del plan | `Esc`; no aceptar; re-plan en plan mode; revertir lo no pedido (lo decide una persona) |
| 2 | **Alucinar API** (variante de "alucinar tools") | Importa un hook/prop/función de Pascal o de three que no existe en la versión instalada; "según la documentación…" sin cita | `pnpm typecheck` (una API inventada no compila); pedir cita `paquete/ruta:símbolo`; `git grep -nE "as any\|as unknown as\|@ts-ignore\|@ts-expect-error" -- apps/web/src/editor` | `explorador-pascal`; registrar en `docs/pascal-notes.md`; si apareció un `any` para "hacer que compile", es alarma |
| 3 | **Alucinar resultados** | "Corrí `supabase test db` y pasó", "RLS verificada", "probé en el navegador" sin haber corrido ni abierto nada | exigir la **salida cruda**; correrlo vos; mirar en el transcript si hubo tool call real | no creer el resumen; repetir el comando; anotar el caso en "Qué salió mal" |
| 4 | **RLS que parece correcta** | tabla nueva sin RLS; RLS sin policies (todo "se ve vacío" y parece bug de UI); `using (true)`; falta `with check`; autorización basada en `user_metadata` editable por el usuario | `supabase test db` (incluye "toda tabla de `public` tiene RLS"); consulta `select tablename from pg_tables where schemaname='public' and not rowsecurity;`; probar con dos usuarios; `revisor-rls` (solo como segunda lectura) | policy nueva en migración nueva; test que reproduzca el agujero primero |
| 5 | **Fuga de secretos** | `service_role` o claves en el cliente o en `NEXT_PUBLIC_*`; `.env.local` commiteado; el agente lee `.env` | `git grep -n service_role -- apps/web/src`; `git grep -n "NEXT_PUBLIC_" -- apps/web`; `git ls-files \| grep -E "\.env"`; deny disparado | rotar la clave si se commiteó (un token commiteado se rota); no "rodear" el deny |
| 6 | **Violación de límites** | Pascal importado en el shell; `fetch`/Supabase dentro del editor; estado duplicado entre store de Pascal y el nuestro | `git grep -nE "from '(@pascal-app\|three\|@react-three)" -- apps/web/src ':!apps/web/src/editor'` debe dar vacío; `git grep -nE "lib/(supabase\|persistence)" -- apps/web/src/editor` debe dar vacío | revertir; recordar el contrato; si pasa dos veces, subir la regla a CLAUDE.md raíz (ya está) |
| 7 | **Envenenar el contexto** | un `pnpm build` o stack trace de R3F de cientos de líneas, o un listado de `node_modules`, entra crudo y la sesión empieza a ignorar convenciones | `/context`; los cuatro síntomas (contradice, repite, genérico, "no recuerda") | `/checkpoint` → `/clear`; la próxima, filtrar salida o delegar |
| 8 | **Context rot** | a mitad de sesión rompe "no importar Pascal afuera de `editor/`" aunque está en CLAUDE.md | el mismo `git grep` de #6 | `/clear`; no confiar en lo dicho en el chat (el experimento del `LISTO`) |
| 9 | **Loop sin convergencia** | reintenta `pnpm build`, reinstala `node_modules`, alterna dos fixes, cambia la versión de `three` | el mismo error tras 2–3 vueltas en el transcript; el diff oscila | `Esc`; exigir hipótesis + evidencia; `/clear` con la tarea re-especificada y un objetivo más chico; ver si es un proceso huérfano en :3000 (`netstat -ano \| findstr :3000`, inferencia) |
| 10 | **Edición de "no se toca"** | intenta editar `database.ts`, lockfile, vendor/models, migraciones aplicadas; si lo bloquea el `deny`, intenta `sed`/`python` por Bash | aparece un prompt de Bash inesperado: **responder no** | usar el procedimiento correcto (regenerar, `pnpm`, skill) |
| 11 | **Verificación declarada, no hecha (3D)** | "se ve bien" por un screenshot del canvas (puede estar negro o ser WebGL deshabilitado en headless) | leer el estado de la escena desde el store; **round-trip** `serializeScene(loadScene(x))` igual a `x`; consola del navegador | ampliar la "Verificación" del plan; si no se puede automatizar, verificación manual escrita |
| 12 | **Pérdida de datos de escena** | guarda sin `schema_version`; `loadScene` sin migrar una escena vieja; guardar estado de UI dentro de `scene` | recargar y comparar; revisar `scene` jsonb en la base | volver al contrato de `contrato-datos.md` |

**Checklist de supervisión (imprimible), por momento**

- **Antes de dar la orden**: ¿hay plan en plan mode con Objetivo/Archivos/Pasos/Verificación? ¿la Verificación existe en este repo? ¿en qué zona cae la tarea (qué rule va a entrar)? ¿qué mode y qué effort? ¿`/context` razonable? ¿ya es otra tarea (entonces `/clear`)?
- **Mientras corre** (mirás la pantalla: ¿en qué fase está pensar/actuar/observar?): interrumpir (`Esc`) si toca archivos que no están en el plan; si aparece un prompt de Bash que rodea un `deny`; si pide una dependencia nueva; si repite el mismo error tres veces; si afirma haber corrido algo que no viste correr.
- **Antes de aceptar la pieza**: `git diff --stat` + `/deriva`; `pnpm typecheck && pnpm lint`; la verificación **real** de su zona (abajo); el diff de las zonas críticas **leído línea por línea por la otra persona** (`supabase/migrations`, `editor/api.ts`, `lib/persistence`, handlers); ninguna `M` en migraciones; sin dependencias nuevas no pedidas.
- **Al cerrar**: commit chico con mensaje que explique el porqué → `/checkpoint` → `/clear` → agregar la trampa a CLAUDE.md y el incidente a "Qué salió mal" (con el modo de falla etiquetado).

**Rituales por zona**

- **Editor 3D**: (1) `git diff --stat -- apps/web/src/editor` y nada fuera; (2) los dos `git grep` de límites vacíos; (3) `pnpm why three` con una sola versión; (4) agregar, mover, deshacer/rehacer, guardar, **recargar**; (5) round-trip de serialización; (6) consola del navegador sin errores nuevos (SSR/`window`, hooks fuera de `<Canvas>`, WebGL); (7) cualquier `any`/`@ts-ignore` nuevo se explica en el PR.
- **Esquema / RLS**: (1) `git diff --name-status -- supabase/migrations` solo `A`; (2) la migración crea tabla + RLS + policies juntas; (3) `supabase db reset` y `supabase test db` verdes; (4) los dos usuarios; (5) `git grep -n service_role -- apps/web/src`; (6) `database.ts` regenerado y commiteado; (7) matriz de `supabase/CLAUDE.md` actualizada.
- **Shell UI**: (1) `pnpm typecheck && pnpm lint`; (2) tres estados (cargando/vacío/error); (3) `'use client'` justificado; (4) sin imports de Pascal; (5) la validación vive también en el handler; (6) recorrer la pantalla en el navegador.

**README ("Qué salió mal")**: formato de la referencia: *qué pasó · cómo se detectó (la evidencia concreta) · causa raíz · corrección · qué se cambió en el harness* (una línea nueva en trampas, una regla, un `deny`). Etiquetar con el modo de falla #1–#12. Ya con 3–5 incidentes bien contados y una línea de harness que cambió por cada uno, la defensa de "Deriva" está resuelta.

### D8. Evidencia y documentación: cómo se demuestra y cómo la valora el curso

Lo que el docente mira (spine §13, rubric, índice de `apellido-iisaia`): los cuatro criterios (Especificación · Gestión del contexto · Deriva · Evidencia), el checklist §13.3, y que el README sea honesto y defendible; las secciones "Decisiones que tomé yo" y "Qué salió mal" son las que más pesan. El grader automático busca un `CLAUDE.md` en cualquier parte (−1 si falta), `.claude/skills/` y `docs/superpowers/` en la raíz del repo y menciones a brainstorming/writing-plans/executing-plans/superpowers en los `.md` (+1 con el núcleo completo).

**Esqueleto de la sección "Cómo gestionamos el contexto"** (calco de la estructura de la referencia, con enlaces a archivos):

1. **Plan antes de código**: modo plan en cada tarea grande; plan original congelado en `docs/plan.md`; planes por tarea en `docs/planes/`; diferencias plan vs construido explicadas (no se edita el plan).
2. **Commits por pieza que funciona**, con mensaje que explica el porqué, en ramas y PRs; el primer commit es el harness.
3. **Arquitectura que aísla**: editor ↔ shell ↔ datos con puentes únicos; archivos <300 líneas: "para arreglar el editor no necesité la capa de datos en contexto".
4. **Configuración del agente versionada** (tabla de más abajo).
5. **Qué persistimos y qué aislamos**: CLAUDE.md/rules/decisiones/pascal-notes (persiste); sub-agents (aísla); `/checkpoint` + `/clear` (resetea); `/compact` (resume); auditoría de `/memory`.
6. **Verificación**: cómo verificamos el editor y la base (dos usuarios, round-trip, pgTAP, Playwright si funcionó).
7. **Deriva detectada y corregida**: remite a "Qué salió mal".

**Tabla de las 8 dimensiones del harness → nuestro archivo → justificación (la que se proyecta en la defensa)**

| Dimensión (spine §5) | Nuestro archivo | Una frase de por qué |
|---|---|---|
| Instrucciones persistentes | `CLAUDE.md`, `apps/web/CLAUDE.md`, `supabase/CLAUDE.md`, `.claude/rules/*` | lo crítico siempre cargado; lo específico condicional |
| Skills y comandos | `.claude/skills/*`, `.claude/commands/*` | procedimientos repetibles con verificación; atajos para supervisión |
| Tools (incl. servidores externos) | tools nativas; `.mcp.json` (opcional) | MCP no se configura en settings |
| Permisos | `.claude/settings.json` | barrera dura: secretos, generados, producción |
| Modelo | `model` en settings + local | mismo modelo para todos; override barato por persona |
| Effort | `/effort` por tarea (matriz) | no gastar effort alto en lo mecánico |
| Hooks | ⟦no usados / typecheck opcional⟧ | decisión explícita |
| Sub-agentes | `.claude/agents/*` | aislar la exploración de Pascal |

**Las 6 demos de la clase, replicadas sobre nuestro repo (cada una produce una captura para el README)**

| Demo de la clase | Qué hacer en nuestro repo | Qué prueba |
|---|---|---|
| §7 `/context` + `/memory` | abrir en la raíz, `/context`, `/memory`, abrir `MEMORY.md` | CLAUDE.md y la rule siempre-on están en la ventana antes del primer mensaje; auto memory es otra cosa |
| §8 rules por path | `/context` → "leé `supabase/migrations/...`" → `/context` (entra `datos-y-rls.md`) | costo cero hasta que importa; que el glob funciona |
| §9 niveles de settings | copiar `.example` a `.local`; `/status` muestra `haiku`; borrar; vuelve `sonnet`; `git status` no ve el local | el local pisa al proyecto y no viaja |
| §10 permisos | "commiteá los cambios" → prompt → "don't ask again" escribe en local; agregar un `deny Edit(./apps/web/src/editor/**)` local y pedir un cambio en el editor → bloqueado aunque el proyecto lo permita; si intenta `sed`, responder no | deny > allow; deny cubre patrón, no intención |
| §11 skills | `/context` (skill en el índice) → pedido en prosa "quiero agregar una tabla `rooms`" → recorre las fases → misma tarea en una copia sin la skill | índice vs cuerpo; "una skill no es una garantía" |
| §12 sub-agents | misma pregunta sobre Pascal inline vs `explorador-pascal`, `/context` antes y después | el contexto del padre no crece |

**Preguntas de defensa que conviene saber contestar (cualquiera de los dos)**: ¿Qué cargó el runtime antes de tu primer mensaje y cuánto pesa? ¿Por qué esa rule tiene `paths:` y aquella no? ¿Qué pasa con una instrucción dicha en el chat tras `/compact`? ¿Por qué `deny` y no una línea en CLAUDE.md? ¿Qué no cubre ese `deny`? ¿Por qué `ask` y no `allow` en migraciones? ¿Qué diferencia hay entre skill y sub-agent en cuanto a contexto? ¿Qué hace plan mode y qué no? ¿Cuándo el agente derivó, cómo lo notaron, qué cambiaron en el harness? ¿Cómo sabés que el editor guarda bien? ¿Qué parte de Pascal no entendiste y cómo lo resolvieron? ¿Qué decisión de arquitectura tomó el agente por default y cuál tomaron ustedes?

### D9. Versión mínima si el tiempo se acaba (≈90 minutos, en este orden)

1. `.gitignore` + `.env.example` + CLAUDE.md raíz (con "No negociables", "No se toca", "Verificar") + `settings.json` con deny de secretos/generados/producción y `ask` en migraciones y dependencias + `settings.local.json.example`. **Commit.**
2. `supabase/CLAUDE.md` y la rule `datos-y-rls.md` (path-scoped), con su demo de `/context`.
3. `explorador-pascal` (probar el riesgo de symlink/`.gitignore`) y `docs/pascal-notes.md`.
4. Una skill: `nueva-migracion-con-rls` (después de la primera migración real).
5. `/pre-entrega` y `/deriva`.
6. `docs/planes/` con el primer plan real; `docs/sesiones/` con el primer checkpoint.
7. Capturas de las demos y la tabla "dimensión → archivo" en el README.
Lo que se recorta primero: `revisor-rls`, `agregar-mueble-al-catalogo`, hook, `.mcp.json`, `shell-ui.md`. Lo que **no** se recorta: CLAUDE.md, settings con deny, una rule probada, una skill, un sub-agent justificado, plan en disco, incidentes reales en el README.

---

## 5. Ambigüedades, contradicciones y riesgos sin resolver (además de la tabla de §0)

1. **¿Next + Supabase cuenta como "backend"?** El grader automático (`.claude/skills/grading/scripts/grading_lib.py`) detecta backend solo si `package.json`/`requirements.txt`/`pyproject.toml` contienen `fastapi`, `flask`, `django`, `uvicorn`, `express` o `fastify`; y frontend con `react`, `vue`, `vite`, `next`, `svelte`, `angular`. Un Next con Route Handlers + Supabase no matchea ningún backend y la nota **sugerida** diría "final incompleto (−2)". Es solo una sugerencia que el docente confirma, pero conviene: (a) declarar explícitamente en README y CLAUDE.md que el backend son los Route Handlers y Supabase/Postgres/RLS; (b) preguntarlo (pregunta #2). Es un riesgo de forma, no de fondo; no cambiar la arquitectura por esto sin hablar con el docente.
2. **¿Dónde vive `.claude/`?** El curso dice "adentro de `tp-final/`" y la referencia lo hace así. El grader mira `.claude/skills/` y `docs/superpowers/` en la **raíz del repo del alumno** (pero busca `claude.md` y términos en `.md` en todo el árbol). Si el repo del grupo es `…/apellido-iisaia/` con `tp-final/` adentro, esas dos señales de bonus no dispararían por ruta (sí por menciones en `.md`). Mitigación: mencionar explícitamente brainstorming/writing-plans/executing-plans/superpowers en README y en `docs/`.
3. **Material vs repo de referencia hoy**: spine, slides y source_material describen el tp-final antes de Auth0 y pytest (2026-09-29). Ver §3.3.
4. **`plan.md` está desactualizado a propósito** ("se conserva como registro"): ignorar sus Tasks (5 preguntas, 7 piezas, `researcher`, `add-endpoint`).
5. **Hooks y MCP**: están en las ocho dimensiones pero "quedan para las clases siguientes"; el checklist §13.3 no los pide. No se sabe si el docente espera verlos en el TP (S06–S07). Marcados como opcionales.
6. **Plan mode como evidencia**: "se ve en el proceso, no en un archivo" no dice **qué** artefacto cuenta. Mi propuesta (planes en `docs/planes/`, capturas) es inferencia.
7. **Memoria automática como evidencia**: vive fuera del repo; no queda claro si hay que mostrarla. Mi propuesta: auditarla y mostrar `MEMORY.md` en la defensa; no depender de ella.
8. **Modalidad**: individual en `programa.md` y S00; grupal en spine §13 (pendiente deliberado). Ustedes son dos: seguir la modalidad grupal y confirmarla.
9. **"MVP" vs "app final"**: la exposición de la idea pide MVP; el Demo Day (programa, semana 8) dice "exposición del MVP funcional"; ustedes quieren la app final. Riesgo de alcance en 2 días; ver §1.12.
10. **`Grep`/`Glob` según SO**: spine §6 dice que en macOS/Linux/WSL no son tools por defecto; el `tools:` de los sub-agents de referencia los nombra igual. En Windows nativo existen. Si alguien del grupo trabaja en WSL, probar.
11. **Cuenta de la ventana y el modelo**: los números del deck (1M tokens, precios de "Fable 5.1", ~15k de arranque) son órdenes de magnitud del docente, no del modelo que usemos nosotros.
12. **Pascal Editor**: todo lo que dije sobre su estructura es hipótesis a verificar (el curso no lo cubre). Es la mayor fuente de riesgo de alucinación del proyecto y por eso el plano pone la exploración supervisada antes de escribir reglas.
13. **Idioma**: la referencia usa castellano en código de UI, comentarios y commits, y deja en inglés lo que generó superpowers. El curso no lo exige; decidir y documentar.
14. **Una skill y un command con el mismo nombre**: gana la skill; si crean `/pre-entrega` como command y como skill, el command queda tapado.
15. **Equivalencias Codex/OpenCode**: los datos son de `learn.chatgpt.com/docs` y `opencode.ai/docs` a septiembre de 2026 según el spine; si alguien usa otro harness, revisar la semántica de permisos antes de copiar (OpenCode: gana la **última** regla que matchea).

---

## 6. Top 10: cosas de estas clases que NO pueden faltar en nuestro repo

1. **`CLAUDE.md` raíz + uno por zona (`apps/web/`, `supabase/`)**, <200 líneas c/u, con comandos, "no negociables", "dónde seguir leyendo", zonas de solo lectura y "trampas ya pagadas" (vacía al principio, se llena con incidentes reales). Sin CLAUDE.md el grader descuenta −1 y no cumplís el checklist §13.3.
2. **`.claude/settings.json` con permisos pensados para este proyecto**: `deny` en secretos/generados/producción/destrucción, `ask` en dependencias y migraciones, `allow` acotado; `settings.local.json.example`; `.gitignore` con el `.local` y sin ignorar el resto de `.claude/`. Sin `env`. Cada regla con su razón.
3. **El primer commit es el harness, y spec + plan están en disco antes del código** (`docs/superpowers/`, `docs/plan.md` congelado con deny). Es el criterio "Especificación" y "Evidencia".
4. **Rules path-scoped probadas con `/context`** (datos/RLS y editor, y quizá shell) más un contrato siempre-on corto; capturas de la rule que aparece solo al leer un archivo que matchea.
5. **Al menos una skill propia real, con fases, anti-patterns y "leé la rule"**: `nueva-migracion-con-rls` y `agregar-preset`, escritas después de la primera pasada a mano; demostrada con y sin skill.
6. **Un sub-agent de solo lectura justificado (`explorador-pascal`)** con `tools:` declarado y citas obligatorias, con la medición inline vs delegado; y la prueba del primer día de que Grep/Glob ven `node_modules` bajo pnpm.
7. **Plan mode visible en el repo**: política de modes por tarea, arranque con `--permission-mode default`/`plan`, y `docs/planes/*.md` aprobados y commiteados (Objetivo/Archivos/Pasos/Verificación real).
8. **Estrategia de contexto escrita y practicada**: una sesión = una pieza; `/checkpoint` → `/clear`; `/compact` con foco; delegar lecturas masivas; decisiones y hallazgos a archivos (`decisiones.md`, `pascal-notes.md`); auditoría de `/memory`; sección "Cómo gestionamos el contexto" en el README.
9. **Checklist de supervisión aplicada y al menos 3 incidentes reales** en "Qué salió mal", cada uno con modo de falla, evidencia de detección, causa raíz, corrección y qué cambió en el harness (la deriva detectada y corregida es el criterio 3 del Demo Day).
10. **Evidencia lista para la defensa de ambos**: capturas de las 6 demos replicadas, tabla "dimensión → archivo → por qué", commits chicos por pieza con PRs y revisión cruzada (la defensa es conjunta y "cualquiera de los dos tiene que poder responder por cualquier parte"), y la verificación real del editor (dos usuarios, round-trip, recarga).

---

## 7. Preguntas abiertas para el docente

1. ¿`.claude/` y los CLAUDE.md deben vivir dentro de `tp-final/` (como la referencia) o en la raíz del repo del grupo? (El script de grading mira la raíz para `.claude/skills/` y `docs/superpowers/`.)
2. En un stack Next + Supabase (Route Handlers, Postgres, RLS, Storage), ¿se considera "backend" para el criterio "frontend + backend"? ¿Prefieren ver un servicio aparte?
3. Con Pascal Editor como base de terceros: ¿cómo se evalúa la apropiación del editor? ¿Alcanza con entender y defender la capa de integración (puente, persistencia, presets) y la exploración documentada del paquete?
4. ¿Se esperan hooks y/o `.mcp.json` en la configuración del TP o alcanza con las seis piezas del checklist §13.3? ¿Cuenta como "al menos una skill propia" una skill que remite a rules (como la de referencia)?
5. ¿Qué artefacto cuenta como evidencia de "plan mode durante el desarrollo"? (¿planes en `docs/planes/`, capturas de la barra de estado, transcripts?)
6. ¿Se espera mostrar la memoria automática (`MEMORY.md`) en la defensa o solo saber auditarla?
7. ¿Cuántos sub-agents/skills se consideran razonables para un grupo de dos? ¿Penaliza tener de más sin justificación?
8. Alcance: ¿se evalúa "MVP funcional" o "app final"? Con ~2 días, ¿prefieren pocos cortes verticales completos o más funciones parciales?
9. Modalidad: `programa.md` y la clase 0 dicen individual; la clase 4 dice grupos de 2 o 3. ¿Está confirmada la grupal y cómo se reparte la nota/defensa?
10. ¿`attribution` (coautoría en commits/PR) tiene alguna expectativa? ¿Es mejor dejarla visible como evidencia?
11. ¿Se puede arrancar Claude Code en `auto` en los TP o esperan ver prompts de permiso (modo Manual) como en las demos?
12. ¿El idioma del CLAUDE.md, rules y commits es libre? ¿Y el del README?
13. ¿Quieren que `docs/plan.md` quede congelado también cuando el flujo superpowers genera `docs/superpowers/plans/`, o alcanza con congelar uno de los dos?

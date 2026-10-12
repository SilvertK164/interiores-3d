# Shell del editor (Madori) — Plan de implementación

> **Para quien ejecute el plan:** REQUIRED SUB-SKILL: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementarlo tarea por tarea. Los pasos usan casillas `- [ ]` para llevar el avance.

**Goal:** Que el editor se vea y se maneje como el resto de Madori (claro, en castellano y con el diseño aprobado en Pencil): barra superior, modos Ver y Editar, vistas 2D, 3D y Ambas, dock de herramientas, paneles de niveles, muebles y materiales, propiedades por tipo, panel Vista 3D con Recorrer, teclado y accesibilidad. Pascal sigue siendo el motor del lienzo.

**Architecture:** Tema por CSS más un parche mínimo de `@pascal-app/editor` (una propiedad `chrome` que oculta su interfaz) y un **shell de React propio** (`apps/web/src/editor/shell/`) montado como hermano de `<Editor>`. El shell habla con Pascal **solo** por un puente con inyección de dependencias (`shell/bridge/`; `src/editor/pascal-bridge.ts` es el único enlace real), así que casi todo se prueba con dobles y sin navegador. `shell/ui/` es presentacional (sin Pascal) y sale de la maqueta aprobada.

**Tech Stack:** Next 16 (App Router) y React 19; Tailwind v4; `@pascal-app/{editor,core,viewer,nodes}` 1.0.3 con `pnpm patch`; `three` 0.186 (solo en `src/editor/dev/`); `lucide-react`; Vitest (marcado estático, sin jsdom); Playwright contra la base local; Biome; pnpm 11.2.2.

**Spec:** `docs/superpowers/specs/2026-10-11-editor-shell-design.md` (spec 3). El plan argumenta desde el spec: léelos juntos. Los criterios de éxito se citan como "criterio N" y las decisiones como D1 a D10.

## Global Constraints

Cada tarea cumple, además de lo suyo, todo lo que sigue:

- **Frontera con Pascal:** solo `apps/web/src/editor/` importa `@pascal-app/*`, `three` y `@react-three/*`; `shell/` y `shell/ui/` usan tipos propios (`shell-boundaries.test.ts` lo vigila). Las páginas importan el editor por `next/dynamic` con `ssr: false`.
- **Pascal fijado en 1.0.3** (versión exacta, `patchedDependencies` en `pnpm-workspace.yaml`); versiones exactas en toda dependencia nueva. La única dependencia que agrega este plan es `@types/three` 0.186.0 (devDependency exacta de `apps/web`, solo tipos; Tarea 7f).
- **Castellano neutro con tuteo** ("tú") en todo texto de interfaz, sin lenguaje técnico en pantalla. Los textos de usuario son **nodos de React**, nunca HTML. Medidas en metros con coma (`0,90 m`) y superficies como `15,2 m²`.
- **Íconos solo de `lucide-react`, nunca emojis** (`.claude/rules/iconos-sin-emojis.md`): el ícono decorativo lleva `aria-hidden`; el botón que solo tiene ícono lleva `aria-label` en castellano.
- **Archivos de menos de 300 líneas**, la lógica pura separada de los componentes.
- **Sin fondos oscuros:** ningún panel, barra ni dock con luminancia menor a 0,6 aunque Pascal ponga `body.dark` al montar; vidrio claro con blur, sin degradados ni bordes. **Botones activos en Noche `#0B1F4D` con texto blanco** (D8); el Cobalto queda para las acciones primarias.
- **Paleta Madori:** Noche `#0B1F4D`, Cobalto `#1F5FE0`, Sol `#FFB02E`, Alba `#DCE6FF`, Cielo `#CFE0FF`, Crema `#FFF4E2`.
- **Capas:** el shell es un contenedor `pointer-events-none` en `z-40`, por debajo de los diálogos de Pascal (`z-50`) y de su cargador (`z-60`); cada pieza flotante recibe sus clics.
- **Accesibilidad básica (criterio 12):** el dock es `role="toolbar"` con botones `aria-pressed`, objetivos táctiles de al menos **44 px**, foco visible y movimiento reducido respetado.
- **D4:** Compartir, Renderizar, Exportar plano y Subir mi mueble son solo botones **deshabilitados con "Pronto"**.
- **Ctrl+S se mantiene** (el guardado es automático); la paleta Ctrl+K sigue en inglés y queda fuera.
- **TDD:** cada tarea escribe primero la prueba y la ve fallar. Las pruebas en navegador usan la base local y los ganchos `window.__e2e` (solo con `NEXT_PUBLIC_E2E=1`), con esperas tolerantes (`toBeVisible({ timeout: 15_000 })`).
- **Commits** `tipo(área): descripción`, en castellano, **sin líneas de atribución**, con rutas explícitas (`git commit -m "…" -- <rutas>`); nunca `git add -A` ni `commit -a`. Sin `push`.

## Review Focus

Entradas que el spec insinúa y que ninguna prueba obvia cubriría; cada una tiene su prueba en la tarea que es dueña del código:

1. **Teclas globales de Pascal con el foco en uno de nuestros botones o listas** (Supr, Retroceso, letras de herramienta, Espacio, y Ctrl+Z en Ver): no deben borrar, armar herramientas ni deshacer a escondidas; dentro de un campo de texto el teclado es del campo. → Tareas **11a** (`shell-key-guard`), **11b** (`shell-key-trap`) y **11c** (`teclas.spec.ts`).
2. **Estado que Pascal restaura al abrir** (un proyecto en blanco abre con la herramienta de muro armada; recargar estando en Ver; pasar a Ver con una herramienta armada): el shell **lee** el estado real, Ver desarma y bloquea, Editar no rearma, y recargar siempre abre en Editar. → Tareas **4b** (`shell-bridge-mode`), **4f** (`modos.spec.ts`) y **5f** (`dock.spec.ts`).
3. **Escena sin ambientes, sin edificio, o con plantas sin nombre o con el nombre en inglés de Pascal:** el panel no se rompe, invita a dibujar un ambiente y muestra "Planta baja", "Planta 1" y "Sótano 1" sin cambiar el dato guardado. → Tareas **6a** (`shell-names`), **6b** (`shell-bridge-levels`) y **6d** (`shell-levels-panel`, `niveles.spec.ts`).
4. **El elemento elegido desaparece con el panel de propiedades abierto** (se borra por otro camino o con Deshacer): el panel se cierra sin errores. → Tareas **9e** y **9f** (`shell-bridge-edit`), **9g** (`shell-properties-panel`) y **9h** (`propiedades.spec.ts`).
5. **Doble clic en Duplicar, y Borrar con hijos o con Cancelar:** una sola copia; Borrar de un muro con una puerta pide confirmación, Cancelar no borra nada y confirmar borra las dos cosas en **un** paso del historial. → Tareas **9f** y **9h** (`propiedades.spec.ts`).

---

## Cómo ejecutar este plan

**Rama:** `feature/interfaz-laboratorio` (donde vive el spec). Cada tarea termina en uno o dos commits y **la rama no se fusiona antes de la Tarea 12b**: entre la 4f y la 9g el editor mezcla piezas nuevas con huecos.

**Antes de empezar (una sola vez):**

```bash
git branch --show-current   # feature/interfaz-laboratorio
pnpm db:start && pnpm db:env   # Supabase local; apps/web/.env.local trae NEXT_PUBLIC_E2E=1
pnpm --filter @interiores/web exec vitest run && pnpm --filter @interiores/web typecheck && pnpm lint
```
Esperado: todo en verde. Biome ya muestra unos avisos de archivos que este plan no toca; "sin errores nuevos" quiere decir que no sube el número.

**Fin de línea.** Este equipo trabaja en Windows y varios archivos que el plan edita están en el disco con CRLF (el índice de git guarda LF, así que no hay diferencia que comitear). Las ediciones del plan buscan texto de varias líneas y **no encuentran nada si el archivo tiene CRLF**. Antes de empezar, pásalos a LF:

```bash
sed -i 's/\r$//' apps/web/src/editor/ProjectEditor.tsx apps/web/src/editor/e2e-hooks.ts apps/web/app/elevation.css apps/web/test/support/asset-ids.ts apps/web/package.json docs/ESTADO.md apps/web/CLAUDE.md docs/pascal-notes.md
git status --short   # no debe listar esos archivos como modificados
```
Si más adelante una edición dice que no encuentra su texto, mira `git ls-files --eol <archivo>`: si muestra `w/crlf`, corre el mismo `sed` sobre ese archivo.

**Cómo leer los bloques de código:**

- **`Create ruta:`** seguido de un bloque de código crea ese archivo con ese contenido exacto (si añade «ya existe: reemplázalo entero», lo sobrescribe).
- **`Modify ruta:`** seguido de un bloque `diff` cambia un archivo que ya existe. Cada `@@` abre un cambio: las líneas que empiezan con un espacio son **contexto** (están igual en el archivo), las que empiezan con `-` se borran y las que empiezan con `+` se agregan. El contexto más las líneas con `-` aparecen **exactamente una vez** en el archivo; si no lo encuentras una sola vez, no adivines: mira el archivo y ajusta el ancla.
- **`Run:`** es el comando y **`Expected:`** lo que debes ver; si ves otra cosa, no sigas: la tarea tiene su explicación debajo.
- El código de cada tarea se aplicó en este orden sobre una copia del repo y los comandos de pruebas unitarias, tipos y lint dieron lo que dice cada tarea (ver "Revisión final", al final). Lo que corre en navegador, el spike y las miniaturas no se pudieron correr al escribir el plan: ahí manda lo que mida cada tarea.

**Comandos** (desde la raíz del repo):

| Para | Comando |
|---|---|
| Pruebas unitarias de lo que tocas | `pnpm --filter @interiores/web exec vitest run <parte-del-nombre>` (todas las del shell: `shell-`) |
| Tipos | `pnpm --filter @interiores/web typecheck` (ignora los errores internos de Pascal en `node_modules`) |
| Lint | `pnpm lint` |
| Pruebas en navegador | `pnpm --filter @interiores/web e2e e2e/<archivo>.spec.ts` (Playwright levanta la API y la web si no están corriendo) |
| Todo | `pnpm verify` (lint, build, tipos y pruebas) y `pnpm --filter @interiores/web e2e` |

## Mapa de archivos

```
apps/web/
  app/editor-shell.css, globals.css, elevation.css   tema claro de Madori y piezas flotantes            (1a, 2a)
  app/dev/miniaturas/                                escenario de captura de las miniaturas             (7f, 7g)
  src/editor/
    pascal-bridge.ts                                 único enlace real con los almacenes de Pascal      (2b, 4e)
    chrome.ts, e2e-hooks.ts, ProjectEditor.tsx       parche `chrome`, ganchos de prueba, montaje        (3b, 4f)
    dev/                                             encuadre y escenario de captura (usa three)        (7f)
    shell/bridge/                                    el puente: tipos propios, núcleo, modo, selectores,
                                                     herramientas, niveles, catálogo, materiales,
                                                     edición y vista                                     (4a a 10a)
    shell/ui/                                        piezas presentacionales (sin Pascal)               (1b a 1i, 8d, 11d)
    shell/*.tsx                                      piezas conectadas: EditorShell, barra, dock, paneles (4d a 10c)
    shell/*-model.ts, key-*.ts, decisions.ts         lógica pura: dock, muebles, materiales, propiedades,
                                                     vista, teclas y decisiones del spike               (0c a 11b)
  src/lib/                                           catalog-es, material-es, editor-names, format, cx   (1a a 8a)
  test/                                              shell-*.test.ts(x) y test/support/ (dobles)        (todas)
  e2e/                                               *.spec.ts y e2e/support/                           (3b a 12b)
  scripts/                                           item-thumbnails.mjs, capture-editor.mjs            (7f, 12b)
scripts/pascal-chrome-patch.mjs, patches/            el parche mínimo de Pascal y su regeneración        (3a)
docs/                                                pascal-notes.md, ESTADO.md, design/implementado/   (0a a 12b)
```

## Tareas

| Serie | Qué entrega |
|---|---|
| **0a a 0c** | Verificación previa en navegador: el parche de pnpm, Recorrer, cámara y estilo de la Vista 3D, colocar un mueble, la herramienta de ambientes y el historial. Fija `DECISIONS` con rama de respaldo para cada resultado. |
| **1a a 1i** | La maqueta aprobada pasa al producto como piezas presentacionales (`shell/ui/`), con pruebas de marcado: base visual, selector, insignia, chip de guardado y "Pronto", barra superior, dock y menú, panel de plantas, catálogo de muebles, ficha de propiedades y controles de Vista 3D. La maqueta queda hasta la 12a. |
| **2a a 2b** | Tema claro de Madori (tokens, sombras, escena `studio`, metros, tipografía) y su prueba de luminancia. |
| **3a a 3b** | El parche mínimo `chrome` de Pascal, su prueba y el paso de CI; el editor sin su interfaz y la guarda en navegador. |
| **4a a 4f** | El puente (tipos, núcleo, Ver y Editar en solo lectura, vista, historial, selectores), el proveedor y `useShell`, las piezas conectadas y el shell dentro de `ProjectEditor` con sus pruebas en navegador. |
| **5a a 5f** | El dock: la tabla 4.3 hecha código, armar herramientas, el menú Más, los menús conectados y la prueba de que cada botón deja a Pascal como pide el spec. |
| **6a a 6d** | Plantas y ambientes: nombres en castellano, superficies, elegir y agregar planta, el panel conectado. |
| **7a a 7g** | Catálogo de muebles en castellano, modelo del panel, colocar un mueble, quitar la barra lateral de Pascal y las 144 miniaturas con fondo transparente. |
| **8a a 8e** | Materiales: los 114 nombres en castellano, el modelo del panel, pintar por el puente, el panel y su montaje en el dock con pruebas en navegador. |
| **9a a 9h** | Propiedades de muro, ambiente, puerta, ventana y mueble: los modelos (9a a 9d), editar, duplicar y borrar por el puente (9e y 9f), el panel (9g) y sus pruebas en navegador (9h). |
| **10a a 10c** | Vista 3D: muros, niveles, cámara, estilo, girar, vista superior y Recorrer. |
| **11a a 11e** | Teclado y accesibilidad: qué teclas de Pascal se frenan, el oyente, las flechas del dock y las pruebas en navegador. |
| **12a a 12b** | Barrido de castellano, se quita la maqueta, capturas, documentación y verificación final. |

Las series dependen unas de otras en el orden en que están (comparten `globals.css`, `ProjectEditor.tsx` y el puente): ejecútalas **en orden**.

## Resultados del spike

Los llena la Tarea 0 (la 0a mide el parche; la 0b y la 0c, el resto). Las tareas siguientes leen solo `apps/web/src/editor/shell/decisions.ts`; esta tabla es el registro con fecha de lo que se midió.

<!-- spike-resultados -->
| Experimento | Resultado | Fecha |
|---|---|---|
| (a) Parche | Funciona (patch en pnpm-workspace.yaml) | 2026-10-12 |
| (b) Recorrer | Funciona: `primera_persona=true puntero_bloqueado=CANVAS`, `sale_con_esc=true` (ventana real, medido por el usuario) | 2026-10-12 |
| (c) Cámara y estilo de la Vista 3D | Funciona: `ortografica=true perspectiva=true estilo_distinto=true errores=0` | 2026-10-12 |
| (d) Colocar un mueble desde `structure` | Funciona: `fase=structure muebles 0 -> 1`; desde `furnish`: `muebles 0 -> 1` | 2026-10-12 |
| (e) Herramienta de ambientes | Funciona: `ambientes=1` con `zoneId` | 2026-10-12 |
| (f) Historial | Pascal: `inicio` sin deshacer ni rehacer, tras el muro `canUndo=true`, tras deshacer `canRedo=true` | 2026-10-12 |
<!-- /spike-resultados -->

## Desviaciones y decisiones frente al spec

Cada fila dice qué hace el plan de distinto o de más que el spec, y por qué. Las decisiones por defecto del spec (D6, D7, D8 y el contenido del menú Más) se adoptan tal como están salvo donde el spike diga otra cosa.

| Tema | El spec dice | El plan hace, y por qué | Tarea |
|---|---|---|---|
| Parche de Pascal | §4.1: parchar cuatro archivos (`action-menu`, `panel-manager`, `floating-level-selector`, `helper-manager`) | Un solo archivo (`components/editor/index.tsx`), donde se montan los cuatro: el mismo efecto con un solo bloque que reaplicar si Pascal se actualiza | 3a |
| Ver = solo lectura | §4.2: `setReadOnly` o su préstamo | El **préstamo** (`acquireSceneReadOnlyLease`, con cuenta de referencias) y no `isVersionPreviewMode`, que además pausaría el autoguardado; Ver vacía y bloquea la selección y siempre se abre en Editar al recargar | 4b |
| Teclas en Ver | §4.5: los paneles frenan las teclas con el foco en ellos | Además, **en Ver** se frenan las que modifican aunque el foco esté en el lienzo, porque el Ctrl+Z de Pascal deshace la escena sin mirar el solo lectura; nada se frena durante el recorrido | 11a, 11b |
| Superficie de un ambiente | §4.4: `deriveZoneQuantityReport(...).footprintArea` y `formatAreaLabel` | La misma fórmula del polígono (`shoelaceArea`), sin la detección de recintos que `deriveZoneQuantityReport` corre antes (sería caro en cada cambio de la escena), y un formato propio (`15,2 m²`) porque `formatAreaLabel` devuelve `15.2m²` | 6b, 7b |
| Nombres de planta y de ambiente | D10: se muestran en castellano sin cambiar el dato | Igual, y se traducen también `Zone N`; la traducción vive en `levelDisplayName` y `zoneDisplayName` (el dato guardado no se toca) | 6a |
| Comercio | §4.4: "la pestaña Comercio es una categoría más" | Un **filtro transversal** (las 33 piezas de comercio, que además quedan en su categoría del hogar): así no hay dos lugares donde buscar una silla | 7b |
| Menú Más | Pregunta abierta 4 | Eliminar elementos, Cuadrícula (50, 25, 10 y 5 cm), Ajuste de muros y de muebles, Atajos de teclado y "Próximamente" con Compartir, Renderizar y Exportar plano deshabilitados con "Pronto" | 5c, 5d |
| Color personalizado (diseño 17) | No lo menciona | Visible pero **deshabilitado con "Pronto"**: Pascal lo resuelve con un panel en inglés que no se reemplaza aquí | 8d |
| Tipo de puerta | §4.4: campos desde los esquemas del nodo | Solo los tipos que Pascal cambia sin reescribir los paneles de la hoja (batiente, doble y francesa; otro tipo se muestra deshabilitado); las ventanas ofrecen sus seis tipos | 9c |
| Miniaturas | §4.1: script más página de desarrollo | Se fotografían en el navegador (`canvas.toDataURL('image/webp')`, 256 × 256), sin librerías de imagen, y se agrega `@types/three` 0.186.0 como única dependencia (solo tipos). Las 2 que no tenían miniatura (`shower`, `tub`) también quedan | 7f, 7g |
| Vista 3D | §4.2: Muros y Niveles | Las mismas opciones, con Cámara y Estilo solo si el spike las confirma (D7); el panel no ofrece `translucent` ni `manual` | 10a, 10b |
---

### Task 0a: Parche de prueba (`pnpm patch`) y notas de Pascal verificadas

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create (descartables, fuera del repo): el worktree `../madori-spike-parche` y la carpeta de edición `../madori-spike-parche-edit`.
- Modify: `docs/pascal-notes.md` (filas nuevas al final) y este plan (la fila (a) de "Resultados del spike").
- Test: ninguno propio; la verificación es `pnpm install --frozen-lockfile` **en limpio** dentro del worktree.

**Interfaces:**
- Consumes: pnpm `11.2.2` (campo `packageManager` del `package.json` raíz) y `pnpm-workspace.yaml`.
- Produces: el resultado (a), que la Tarea 0b convierte en `DECISIONS.chromeStrategy: 'patch' | 'css'`, y las filas verificadas de `docs/pascal-notes.md` que usan todas las tareas siguientes.

El objetivo es comprobar la **mecánica** del parche (no su contenido) antes de depender de ella: que `pnpm patch` y `pnpm patch-commit` funcionan con pnpm 11 en este repo, que el parche vive en `pnpm-workspace.yaml` y que `pnpm install --frozen-lockfile` (lo que corre la CI) lo vuelve a aplicar desde cero.

- [ ] **Paso 1: Aislar el experimento en un worktree descartable**

```bash
git worktree add ../madori-spike-parche -b spike/parche-pascal
cd ../madori-spike-parche
pnpm install --frozen-lockfile
git status --short
```
Expected: la instalación termina bien y `git status --short` no imprime nada (el lockfile no cambia).

- [ ] **Paso 2: Abrir el paquete para editarlo**

```bash
pnpm patch @pascal-app/editor@1.0.3 --edit-dir ../madori-spike-parche-edit
```
Expected: imprime `You can now edit the package at:` seguido de la ruta `…/madori-spike-parche-edit`.

- [ ] **Paso 3: Marcar el paquete y confirmar el parche**

```bash
node -e "const fs=require('fs');const f='../madori-spike-parche-edit/src/components/editor/index.tsx';fs.writeFileSync(f,'// madori-spike-patch\n'+fs.readFileSync(f,'utf8'))"
pnpm patch-commit ../madori-spike-parche-edit
git status --short
grep -n "patchedDependencies" -A2 pnpm-workspace.yaml
```
Expected: `git status` lista `patches/@pascal-app__editor@1.0.3.patch` (nuevo) y cambios en `pnpm-workspace.yaml` y `pnpm-lock.yaml`; el `grep` muestra `'@pascal-app/editor@1.0.3': patches/@pascal-app__editor@1.0.3.patch`.

- [ ] **Paso 4: Reinstalar desde cero, como la CI**

```bash
rm -rf node_modules apps/web/node_modules apps/api/node_modules packages/contract/node_modules
pnpm install --frozen-lockfile
head -1 apps/web/node_modules/@pascal-app/editor/src/components/editor/index.tsx
```
Expected: la instalación termina bien y la última línea imprime `// madori-spike-patch`.

- [ ] **Paso 5: Decidir según lo que viste**

| Resultado | Decisión (`DECISIONS.chromeStrategy`) |
|---|---|
| Pasos 3 y 4 funcionan y `patchedDependencies` quedó en `pnpm-workspace.yaml` (**camino probable**) | `'patch'`: las Tareas 3a y 3b siguen tal cual están escritas. |
| Funcionan, pero pnpm escribió `patchedDependencies` en otro archivo (por ejemplo `package.json`, clave `pnpm`) | `'patch'`: la Tarea 3a usa ese archivo en lugar de `pnpm-workspace.yaml` (solo cambian la ruta en `test/pascal-patch.test.ts` y el Paso del lockfile). |
| `patch-commit` falla, el parche no se reaplica o `--frozen-lockfile` rechaza el lockfile | `'css'`: la Tarea 3b ejecuta el **Respaldo** (CSS que oculta los cuatro bloques por sus clases, válido mientras Pascal siga en 1.0.3). Anota el mensaje de error exacto en el resultado. |

- [ ] **Paso 6: Limpiar (no queda nada del experimento en el repo)**

```bash
cd ../PF\ -\ Quispe\ Villalba
git worktree remove --force ../madori-spike-parche
git branch -D spike/parche-pascal
rm -rf ../madori-spike-parche-edit
git status --short
```
Expected: `git worktree list` muestra solo el árbol principal; `git status --short` no muestra archivos del experimento.

- [ ] **Paso 7: Anotar en `docs/pascal-notes.md` lo verificado al escribir este plan**

Cada fila cita archivo y símbolo; las usan las tareas 4 a 11. (`>>` agrega al final; la tabla ya termina en una fila.)

```bash
cat >> docs/pascal-notes.md <<'EOF'
| **Arranque del editor** (2026-10-11): el almacén persiste `phase`, `toolMode`, `mode`, `tool`, `structureLayer`, `catalogCategory`, `isFloorplanOpen` y `viewMode` (por defecto `site`, `select`, sin herramienta, `3d`). `applySceneGraphToEditor` limpia el historial y después `syncEditorSelectionFromCurrentScene` decide: **un nivel vacío arranca en `structure` + `build` + herramienta `wall` ya armada**; con contenido restaura lo guardado y la selección de `pascal-editor-selection:<proyecto>` | `editor/src/store/use-editor.tsx` (`DEFAULT_PERSISTED_EDITOR_UI_STATE`), `editor/src/lib/scene.ts` (`syncEditorSelectionFromCurrentScene`) | El dock propio nunca supone "Seleccionar" al abrir: lee el estado real. Pasar a Ver con la herramienta de muro armada es el caso normal de un proyecto en blanco. |
| **`armToolMode` y las fases**: `build` + `zone` pasa a `structure`/`zones`; cualquier `build` desde `site` pasa a `structure`; desde `furnish` **no** cambia la fase. `ToolManager` resuelve `stair` y `zone` solo dentro de `tools.structure`; el resto (`wall`, `door`, `window`, `slab`, `ceiling`, `column`, `item`, `cabinet`, `shelf`, `measurement`) sale del registro y funciona en cualquier fase | `editor/src/store/use-editor.tsx` (`armToolMode`), `editor/src/components/tools/tool-manager.tsx` (`tools`) | Para escalera y ambiente el dock llama `setPhase('structure')` antes de armar. |
| **`cancelActiveTool()`** (exportada): emite `tool:cancel` y, si nadie lo consumió, vuelve a `select`. **Teclado**: `window` escucha `keydown` en burbuja (más Ctrl+G en captura) y `document` escucha WASD y Espacio; ignora `INPUT`, `TEXTAREA` y `contentEditable`, **no** `SELECT` ni botones; `Escape` cancela, `Delete` y `Backspace` borran la selección, `b` `z` `f` `m` `p` `x` `g` `v` `1` `2` `3` arman fases y herramientas aunque la escena esté en solo lectura | `editor/src/hooks/use-keyboard.ts` | Un campo de texto nuestro está a salvo; un botón, una lista o la nada enfocada, no. |
| **Aviso de cámara en inglés** (`ViewerCanvasControlsHint`, `absolute top-14 left-1/2 z-40`): `useCameraHintFocus.getState().focus([])` lo oculta (lista vacía = nada); `focus(null)` lo devuelve | `editor/src/store/use-camera-hint-focus.ts`, `editor/src/components/editor/index.tsx` | Sin esto se ve debajo de nuestra barra superior. |
| **Cámara**: `emitter.emit('camera-controls:orbit-cw' o 'orbit-ccw' o 'top-view')` (los botones de Pascal hacen exactamente eso; en 2D solo no hay vista superior). **Recorrer**: `flushSync(() => useEditor.getState().setFirstPersonMode(true))` y enseguida `canvas.requestPointerLock()` sobre `[data-pascal-viewer-3d] canvas` con `tabIndex = -1` y `focus({ preventScroll: true })`; el helper de Pascal no se exporta, se copia. `useViewer.setCameraMode('perspective' o 'orthographic')` cambia la cámara real y `subscribeCameraPose` publica `projection`; `useViewer.setShading('solid' o 'rendered')` | `editor/src/components/ui/action-menu/camera-actions.tsx`, `editor/src/components/viewer-overlay.tsx`, `editor/src/lib/walkthrough-pointer-lock.ts`, `editor/src/store/camera-pose-store.ts`, `viewer/dist/lib/materials.d.ts` | El pedido de puntero bloqueado necesita un gesto real de la persona (un clic). |
| **Editar campos**: `commitParametricNodeFields(id, patch)` aplica `derive` y `reconcile` del registro y llama `updateNodes`; `updateNodes` no hace nada en solo lectura y **sanea** valores inválidos en lugar de lanzar. Puerta: al cambiar el alto Pascal fija `position[1] = alto / 2` y escala `handleHeight` (`Math.min(Math.max(h * nuevo / viejo, 0.5), Math.max(0.5, nuevo - 0.1))`); cambiar de tipo reescribe segmentos y medidas (`getDoorTypeUpdates`, no exportada). Ventana: cambiar de tipo = `{ windowType, openingShape: 'rectangle' si el tipo no admite forma, sill: false en bay y bow }`. Muro: `thickness ?? 0.1`; `height` ausente = sigue al nivel; largo = escalar `end` desde `start` (y `curveOffset`) por el cociente | `editor/src/lib/parametric-node-update.ts`, `core/dist/store/actions/node-actions.js`, `nodes/dist/door/panel.js`, `nodes/dist/door/door-math.js`, `nodes/dist/window/panel.js`, `nodes/dist/wall/length-patch.js`, `nodes/dist/wall/panel-model.js` | Los límites de Pascal son: puerta ancho ≥ 0,5 y alto ≥ 1; ventana ≥ 0,3; muro grosor ≥ 0,05 y alto ≥ 0,1. |
| **Duplicar y borrar**: `collectSubtree(nodes, id)` y `cloneNodesInto(nodes, { rootId, parentId?, position? })` (ambas de `@pascal-app/core`) clonan con ids nuevos y reenlazan `parentId` y `children`, pero **no** `wallId`; se insertan con `createNodes([{ node, parentId }])` y `runAsSingleSceneHistoryStep(useScene, fn)` las junta en un solo paso de deshacer. `deleteNode` borra también a los hijos y puede fusionar muros alineados | `core/dist/registry/subtree.js`, `core/dist/store/history-control.d.ts`, `core/dist/store/actions/node-actions.js` | Al duplicar un muro con aberturas hay que reapuntar `wallId` de los clones con el `idMap`. |
| **Herramienta de ambientes**: nombra `Zone N` (inglés), color `#3b82f6`, comitea con `runAsSingleSceneHistoryStep` y deja seleccionado el ambiente (`setSelection({ zoneId })`). La tool escucha `grid:move`, `grid:click` y `grid:double-click` del `emitter` | `editor/src/components/tools/zone/zone-tool.tsx` | Los nombres en inglés se traducen solo al mostrarlos (`zoneDisplayName`). |
| **Niveles**: `getDefaultLevelName` devuelve `Ground Floor`, `Floor N` o `Basement N`; `getLevelDisplayName(level)` = `level.name \|\| getDefaultLevelName(level.level)`; `DEFAULT_LEVEL_HEIGHT` = 2,5 y ambos salen de `@pascal-app/core` | `core/dist/lib/level-name.js`, `core/dist/services/level-height.d.ts` | El nombre guardado no se toca (D10). |
| **`formatAreaLabel(m2, 'metric')`** devuelve `15.2m²` (punto decimal y sin espacio) | `editor/src/lib/measurements.ts` | La interfaz usa un formato propio con coma y espacio (`15,2 m²`), como la maqueta. |
| **Materiales**: `MATERIAL_CATALOG` tiene 114 entradas (`id`, `label` en inglés, `category`, `previewThumbnailUrl?`, `previewColor?`) en 12 categorías pobladas (colors, wood, stone, brick, tile, concrete, metal, fabric, leather, roofing, ground, glass); `useMaterialCatalogModel(preset, onSelect)` devuelve `availableCategories`, `selectedCategory`, `setSelectedCategory` (**selecciona el primer material de la categoría**), `catalogItems` y `select(id)`; `useMaterialPaintPanelModel()` suma `paintEraser`, `setPaintEraser`, `canResetSelection`, `resetSelection`, `selectMaterial` | `core/dist/material-library.d.ts`, `editor/src/lib/material-catalog-model.ts`, `editor/src/lib/material-paint-panel-model.ts` | Los 114 nombres se traducen en `src/lib/material-es.ts`. |
| **Medir**: la secuencia exacta es `setPhase('structure')`, `setStructureLayer('elements')`, `setLastMeasurementKind(kind)`, `setToolDefaults('measurement', { kind })`, `setMode('build')`, `setTool('measurement')`. **Ajuste por contexto**: `wall` admite grid, lines, angles y off (por defecto grid); `item` admite lines, grid y off (por defecto lines); `gridSnapStep` admite 0.5, 0.25, 0.1 y 0.05 | `editor/src/components/ui/action-menu/measurement-control.tsx`, `editor/src/lib/snapping-mode.ts` | `lines` es la causa de las guías moradas al mover muebles. |
| **Tema**: `useViewer.setSceneTheme('studio')` es la apariencia `light` (el plano 2D decide `isDark` con `getSceneTheme(sceneTheme).appearance`); las clases `font-barlow` de Pascal no tienen fuente definida en nuestro `@theme` | `viewer/dist/lib/scene-themes.js`, `editor/src/components/editor/floorplan-panel.tsx` | Se define `--font-barlow` en `globals.css`. |
| **Modelos 3D locales**: 98 de los 144 `model.glb` usan `KHR_draco_mesh_compression` (Pascal los decodifica con el decodificador de `gstatic.com`, ya requerido por el editor); las miniaturas actuales son 512 × 512 VP8 **sin canal alfa** | `public/items/*/model.glb`, `public/items/*/thumbnail.webp`, `nodes/dist/item/renderer.js` | Las miniaturas nuevas se codifican en el navegador (`canvas.toDataURL('image/webp')`). |
EOF
```
Expected: `tail -c 300 docs/pascal-notes.md` termina en una fila de tabla y `git diff --stat docs/pascal-notes.md` muestra solo líneas agregadas.

- [ ] **Paso 8: Anotar el resultado (a) en este plan y hacer commit**

Reemplaza en este archivo la fila `| (a) Parche … |` de la tabla de "Resultados del spike" por lo que mediste (formato: `| (a) Parche | Funciona (patch en pnpm-workspace.yaml) | 2026-10-11 |`).

```bash
git add docs/pascal-notes.md docs/superpowers/plans/2026-10-11-editor-shell.md
git commit -m "docs(pascal): notas verificadas para el shell del editor y resultado del parche de prueba" -- docs/pascal-notes.md docs/superpowers/plans/2026-10-11-editor-shell.md
```
Expected: un commit con dos archivos.
---

### Task 0b: Spike de Pascal en el navegador (Recorrer, Vista 3D, mueble, ambiente e historial)

**Responsable sugerido:** Silvert (el spike de Recorrer necesita una ventana real). Revisa: Victoria.

**Files:**
- Create (descartables, no se commitean): `apps/web/src/editor/spike-hooks.ts`, `apps/web/e2e/spike/shell-spike.spec.ts`.
- Modify (descartable): `apps/web/src/editor/ProjectEditor.tsx` (instala los ganchos del spike).
- Resultado: `apps/web/test-results/spike.log` (siete líneas `SPIKE …`; `test-results/` ya está en `.gitignore`).

**Interfaces:**
- Consumes: ganchos `window.__e2e` (`counts`, `ready`, `addWall`) de `src/editor/e2e-hooks.ts`; `createProjectViaUi` de `e2e/support/projects.ts`; `docs/pascal-notes.md` (los nombres de la API de Pascal que usa el spike están verificados ahí).
- Produces: el log del spike, que la **Tarea 0c** convierte en `DECISIONS` (`apps/web/src/editor/shell/decisions.ts`), que leen las Tareas 3a, 3b, 4e, 5a, 7c y 10b.

Cada experimento termina con una **decisión con rama explícita** (Tarea 0c): el código de las tareas siguientes ya trae las dos ramas y solo lee `DECISIONS`, así que nada se "decide después". Esta tarea **no deja nada en el repo**: mide y anota.

- [ ] **Paso 1: Escribir los ganchos descartables del spike**

Create `apps/web/src/editor/spike-hooks.ts`:

```ts
import { emitter } from '@pascal-app/core'
import {
  activateCatalogItem,
  armToolMode,
  CATALOG_ITEMS,
  getHistoryCommandState,
  runUndo,
  subscribeCameraPose,
  useEditor,
  useViewer,
} from '@pascal-app/editor'
import { flushSync } from 'react-dom'
import { localizeCatalog } from './catalog-assets'

type Phase = 'site' | 'structure' | 'furnish'

/** SOLO PARA LA TAREA 0 (se borra al terminar): lee y mueve Pascal desde Playwright. */
export function installSpikeHooks(): void {
  let projection: string | null = null
  subscribeCameraPose((pose) => {
    projection = pose.projection
  })
  const requestLock = () => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-pascal-viewer-3d] canvas')
    if (!canvas) return
    if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = -1
    canvas.focus({ preventScroll: true })
    const result = canvas.requestPointerLock() as unknown as Promise<void> | undefined
    result?.catch?.(() => undefined)
  }
  ;(window as unknown as { __spike: unknown }).__spike = {
    projection: () => projection,
    setCameraMode: (mode: 'perspective' | 'orthographic') => useViewer.getState().setCameraMode(mode),
    setShading: (shading: 'solid' | 'rendered') => useViewer.getState().setShading(shading),
    topView: () => emitter.emit('camera-controls:top-view'),
    startWalkthrough: () => {
      flushSync(() => useEditor.getState().setFirstPersonMode(true))
      requestLock()
    },
    firstPerson: () => useEditor.getState().isFirstPersonMode,
    pointerLocked: () => document.pointerLockElement?.tagName ?? null,
    armSelect: () => armToolMode({ mode: 'select' }),
    setPhase: (phase: Phase) => useEditor.getState().setPhase(phase),
    placeItem: (id: string) => {
      const item = localizeCatalog(CATALOG_ITEMS).find((i) => i.id === id)
      if (!item) throw new Error(`No hay un ítem local con id ${id}`)
      activateCatalogItem(item)
    },
    armZone: () => armToolMode({ mode: 'build', tool: 'zone' }),
    history: () => {
      const h = getHistoryCommandState()
      return { canUndo: h.canUndo, canRedo: h.canRedo }
    },
    undo: () => runUndo().kind,
    selection: () => {
      const s = useViewer.getState().selection
      return { zoneId: s.zoneId, selectedIds: [...s.selectedIds] }
    },
  }
}
```

Modify `apps/web/src/editor/ProjectEditor.tsx`:

```diff
@@
 import { installE2eHooks } from './e2e-hooks'
+import { installSpikeHooks } from './spike-hooks'
@@
-        if (process.env.NEXT_PUBLIC_E2E === '1') installE2eHooks()
+        if (process.env.NEXT_PUBLIC_E2E === '1') {
+          installE2eHooks()
+          installSpikeHooks()
+        }
```


- [ ] **Paso 2: Escribir el spike (un resultado por experimento, en `test-results/spike.log`)**

Create `apps/web/e2e/spike/shell-spike.spec.ts`:

```ts
import { appendFileSync, mkdirSync } from 'node:fs'
import { type Page, expect, test } from '@playwright/test'
import { counts } from '../support/editor'
import { createProjectViaUi } from '../support/projects'

const ARGS = ['--enable-unsafe-webgpu', '--use-angle=swiftshader', '--enable-features=Vulkan']

type Spike = {
  projection(): string | null
  setCameraMode(mode: 'perspective' | 'orthographic'): void
  setShading(shading: 'solid' | 'rendered'): void
  topView(): void
  startWalkthrough(): void
  firstPerson(): boolean
  pointerLocked(): string | null
  armSelect(): void
  setPhase(phase: 'site' | 'structure' | 'furnish'): void
  placeItem(id: string): void
  armZone(): void
  history(): { canUndo: boolean; canRedo: boolean }
  undo(): string
  selection(): { zoneId: string | null; selectedIds: string[] }
}
type E2e = { addWall(): void }

const spike = <K extends keyof Spike>(page: Page, name: K, ...args: Parameters<Spike[K]>) =>
  page.evaluate(
    ([n, a]) => (window as unknown as { __spike: Record<string, (...x: unknown[]) => unknown> }).__spike[n as string]?.(...(a as unknown[])),
    [name, args] as [string, unknown[]],
  ) as Promise<ReturnType<Spike[K]>>

const addWall = (page: Page) => page.evaluate(() => (window as unknown as { __e2e: E2e }).__e2e.addWall())
const blank = (page: Page) => createProjectViaUi(page, { name: `Spike ${Date.now()}`, template: null })
const log = (line: string) => {
  mkdirSync('test-results', { recursive: true })
  appendFileSync('test-results/spike.log', `${line}\n`)
}
const canvasCenter = async (page: Page) => {
  const box = await page.locator('[data-pascal-viewer-3d] canvas').first().boundingBox()
  if (!box) throw new Error('No hay lienzo 3D')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test.describe('spike b (con ventana: se corre aparte)', () => {
  test.use({ launchOptions: { headless: false, args: ARGS } })

  test('spike b: Recorrer = primera persona y puntero bloqueado', async ({ page }) => {
    await blank(page)
    await page.evaluate(() => {
      const button = document.createElement('button')
      button.id = 'spike-recorrer'
      button.textContent = 'recorrer'
      button.style.cssText = 'position:fixed;top:8px;left:8px;z-index:99999;padding:8px'
      button.onclick = () => (window as unknown as { __spike: { startWalkthrough(): void } }).__spike.startWalkthrough()
      document.body.appendChild(button)
    })
    await page.locator('#spike-recorrer').click()
    await expect.poll(() => spike(page, 'firstPerson'), { timeout: 15_000 }).toBe(true)
    await page.waitForTimeout(1000)
    log(`SPIKE b: primera_persona=true puntero_bloqueado=${await spike(page, 'pointerLocked')}`)
    await page.keyboard.press('Escape')
    const exited = await expect.poll(() => spike(page, 'firstPerson'), { timeout: 10_000 }).toBe(false).then(() => true, () => false)
    log(`SPIKE b: sale_con_esc=${exited}`)
  })
})

test('spike c: cámara ortográfica y estilo sólido o realista', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
  await blank(page)
  await addWall(page)
  await spike(page, 'setCameraMode', 'orthographic')
  await spike(page, 'topView')
  const ortho = await expect.poll(() => spike(page, 'projection'), { timeout: 15_000 }).toBe('orthographic').then(() => true, () => false)
  await spike(page, 'setCameraMode', 'perspective')
  await spike(page, 'topView')
  const persp = await expect.poll(() => spike(page, 'projection'), { timeout: 15_000 }).toBe('perspective').then(() => true, () => false)
  await spike(page, 'setShading', 'rendered')
  await page.waitForTimeout(1500)
  const rendered = await page.screenshot()
  await spike(page, 'setShading', 'solid')
  await page.waitForTimeout(1500)
  const solid = await page.screenshot()
  log(`SPIKE c: ortografica=${ortho} perspectiva=${persp} estilo_distinto=${!rendered.equals(solid)} errores=${errors.length}`)
})

test('spike d: colocar un mueble desde structure y desde furnish', async ({ page }) => {
  await blank(page)
  for (const phase of ['structure', 'furnish'] as const) {
    await spike(page, 'armSelect')
    await spike(page, 'setPhase', phase)
    const before = (await counts(page)).item ?? 0
    await spike(page, 'placeItem', 'sofa')
    const { x, y } = await canvasCenter(page)
    await page.mouse.move(x, y)
    await page.mouse.move(x + 6, y + 6)
    await page.mouse.click(x + 6, y + 6)
    await page.waitForTimeout(1500)
    log(`SPIKE d: fase=${phase} muebles ${before} -> ${(await counts(page)).item ?? 0}`)
  }
})

test('spike e: la herramienta de ambientes dibuja y selecciona el ambiente', async ({ page }) => {
  await blank(page)
  await addWall(page)
  await spike(page, 'topView')
  await page.waitForTimeout(1500)
  await spike(page, 'armZone')
  const c = await canvasCenter(page)
  for (const [dx, dy] of [[-90, -60], [90, -60], [90, 60], [-90, 60]] as const) {
    await page.mouse.move(c.x + dx, c.y + dy)
    await page.mouse.click(c.x + dx, c.y + dy)
  }
  await page.mouse.dblclick(c.x - 90, c.y + 60)
  await page.waitForTimeout(1500)
  log(`SPIKE e: ambientes=${(await counts(page)).zone ?? 0} seleccion=${JSON.stringify(await spike(page, 'selection'))}`)
})

test('spike f: lectura del historial', async ({ page }) => {
  await blank(page)
  const inicio = await spike(page, 'history')
  await addWall(page)
  const trasMuro = await spike(page, 'history')
  const resultado = await spike(page, 'undo')
  const trasDeshacer = await spike(page, 'history')
  log(`SPIKE f: inicio=${JSON.stringify(inicio)} trasMuro=${JSON.stringify(trasMuro)} undo=${resultado} trasDeshacer=${JSON.stringify(trasDeshacer)}`)
})
```

Run: `pnpm --filter @interiores/web typecheck`
Expected: `Tipos OK (se ignoraron N error(es) internos de Pascal en node_modules).` Si lista errores de `spike-hooks.ts` o de `shell-spike.spec.ts`, corrígelos antes de seguir.


- [ ] **Paso 3: Correr los experimentos (Supabase local arriba: `pnpm db:start && pnpm db:env`)**

```bash
rm -f apps/web/test-results/spike.log
pnpm --filter @interiores/web e2e e2e/spike/shell-spike.spec.ts -g "spike [cdef]"
pnpm --filter @interiores/web e2e e2e/spike/shell-spike.spec.ts -g "spike b" --headed
cat apps/web/test-results/spike.log
```
Expected: cinco líneas `SPIKE b` (dos), `SPIKE c`, `SPIKE d` (dos: `fase=structure` y `fase=furnish`), `SPIKE e` y `SPIKE f`. Cada prueba pasa aunque el resultado sea negativo (solo registran). Si una falla por otra causa (por ejemplo el lienzo no carga), arréglala y vuelve a correr: un resultado negativo por un fallo del arnés no vale.


- [ ] **Paso 4: Dejar el resultado por escrito (no hay commit)**

Copia las siete líneas del log al bloque entre `<!-- spike-resultados -->` y `<!-- /spike-resultados -->` de este plan, con la fecha y quién lo corrió. La Tarea 0c las lee de ahí.

Run: `git status --short`
Expected: aparecen `apps/web/src/editor/ProjectEditor.tsx` (modificado), `apps/web/src/editor/spike-hooks.ts` y `apps/web/e2e/spike/` (sin seguimiento) además del plan. **No los agregues**: se borran en la Tarea 0c.

---

### Task 0c: Decisiones medidas (`decisions.ts`) y limpieza del spike

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/shell/decisions.ts`, `apps/web/test/decisions.test.ts`
- Modify: `apps/web/src/editor/ProjectEditor.tsx` (quita los ganchos del spike), `docs/pascal-notes.md` y este plan (sección "Resultados del spike")
- Delete: `apps/web/src/editor/spike-hooks.ts`, `apps/web/e2e/spike/shell-spike.spec.ts`
- Test: `apps/web/test/decisions.test.ts`

**Interfaces:**
- Consumes: `apps/web/test-results/spike.log` (Tarea 0b).
- Produces: `DECISIONS` (`apps/web/src/editor/shell/decisions.ts`), que leen las Tareas 3a, 3b, 4e, 5a, 7c y 10b:
  `type Decisions = { chromeStrategy: 'patch' | 'css'; walkthrough: boolean; cameraControl: boolean; styleControl: boolean; furnishPhaseBeforeItem: boolean; zoneTool: boolean; historySource: 'pascal' | 'temporal' }`.
  `chromeStrategy` viene de la Tarea 0a (el parche de `pnpm patch`); el resto, del spike de la 0b.

- [ ] **Paso 1: Traducir cada línea del log a una decisión (con rama)**

| Línea del log | Si ves… | Entonces | Dónde se usa |
|---|---|---|---|
| `SPIKE b` | `primera_persona=true puntero_bloqueado=CANVAS` y `sale_con_esc=true` | `walkthrough: true` (camino probable) | Tarea 10b: la barra muestra **Recorrer** |
| | `puntero_bloqueado=null` o `sale_con_esc=false` | `walkthrough: false` | Tarea 10b: **Recorrer se oculta** (D7) |
| `SPIKE c` | `ortografica=true perspectiva=true` | `cameraControl: true` (probable) | Tarea 10b: grupo **Cámara** visible |
| | alguna `false` | `cameraControl: false` | grupo Cámara oculto |
| | `estilo_distinto=true errores=0` | `styleControl: true` (probable) | grupo **Estilo** visible |
| | `estilo_distinto=false` o `errores>0` | `styleControl: false` | grupo Estilo oculto |
| `SPIKE d` | `fase=structure muebles 0 -> 1` | informativo: colocar desde `structure` funciona; igual se pasa a `furnish` (más seguro) | Tarea 7c: `furnishPhaseBeforeItem: true` salvo que `fase=furnish` **también** falle |
| | `fase=structure muebles 0 -> 0` | confirma el riesgo del spec: `furnishPhaseBeforeItem: true` | |
| | `fase=furnish muebles 0 -> 0` | el arnés no puede colocar muebles con el ratón: se anota; no cambia ninguna decisión: las pruebas en navegador de las Tareas 7e y 9h no colocan muebles con el ratón (la de 7e comprueba el estado de Pascal al elegir la tarjeta y la de 9h arma la escena con el gancho `addItem`) | |
| `SPIKE e` | `ambientes=1` y `zoneId` con valor | `zoneTool: true` (probable) | Tarea 5a: **Ambiente** en el menú Estructura |
| | `ambientes=0` | `zoneTool: false` | Tarea 5a: el menú no ofrece Ambiente |
| `SPIKE f` | `inicio={canUndo:false,canRedo:false}`, `trasMuro.canUndo=true`, `trasDeshacer={canUndo:false,canRedo:true}` | `historySource: 'pascal'` (probable) | Tarea 4e |
| | cualquier otra cosa | `historySource: 'temporal'` | Tarea 4e: lee `useScene.temporal` |

- [ ] **Paso 2: Escribir la prueba de `decisions.ts` (rojo)**

Create `apps/web/test/decisions.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { DECISIONS } from '../src/editor/shell/decisions'

describe('decisiones del spike de la Tarea 0', () => {
  it('cada decisión está fijada con un valor admitido', () => {
    expect(['patch', 'css']).toContain(DECISIONS.chromeStrategy)
    expect(['pascal', 'temporal']).toContain(DECISIONS.historySource)
    for (const key of ['walkthrough', 'cameraControl', 'styleControl', 'furnishPhaseBeforeItem', 'zoneTool'] as const) {
      expect(typeof DECISIONS[key], key).toBe('boolean')
    }
  })
})
```




Run: `pnpm --filter @interiores/web exec vitest run decisions`
Expected: FAIL — `Error: Cannot find module '../src/editor/shell/decisions'`.

- [ ] **Paso 3: Escribir `decisions.ts` con lo medido**

Los valores de abajo son los del camino probable; cámbialos según la tabla del Paso 1 (cada propiedad documenta qué hace la otra rama).

Create `apps/web/src/editor/shell/decisions.ts`:

```ts
/** Resultados del spike de la Tarea 0 (ver "Resultados del spike" del plan y docs/pascal-notes.md). Las tareas leen solo este archivo. */
export type Decisions = {
  /** (a) 'patch' = parche de `pnpm patch`; 'css' = respaldo: CSS que oculta los bloques de Pascal por sus clases (Tarea 3b). */
  chromeStrategy: 'patch' | 'css'
  /** (b) true = Recorrer (primera persona con puntero bloqueado) funciona; false = el botón se oculta. */
  walkthrough: boolean
  /** (c) Cámara perspectiva/isométrica en Vista 3D: false = el grupo se oculta (D7). */
  cameraControl: boolean
  /** (c) Estilo sólido/realista en Vista 3D: false = el grupo se oculta (D7). */
  styleControl: boolean
  /** (d) true = antes de colocar un mueble se pasa a la fase `furnish`. */
  furnishPhaseBeforeItem: boolean
  /** (e) false = el menú Estructura no ofrece Ambiente. */
  zoneTool: boolean
  /** (f) 'temporal' = el historial se lee de `useScene.temporal` en lugar de `getHistoryCommandState`. */
  historySource: 'pascal' | 'temporal'
}

export const DECISIONS: Decisions = {
  chromeStrategy: 'patch',
  walkthrough: true,
  cameraControl: true,
  styleControl: true,
  furnishPhaseBeforeItem: true,
  zoneTool: true,
  historySource: 'pascal',
}
```

Run: `pnpm --filter @interiores/web exec vitest run decisions`
Expected: PASS (1 prueba).

- [ ] **Paso 4: Borrar todo el material descartable del spike**

Modify `apps/web/src/editor/ProjectEditor.tsx`:

```diff
@@
 import { installE2eHooks } from './e2e-hooks'
-import { installSpikeHooks } from './spike-hooks'
@@
-        if (process.env.NEXT_PUBLIC_E2E === '1') {
-          installE2eHooks()
-          installSpikeHooks()
-        }
+        if (process.env.NEXT_PUBLIC_E2E === '1') installE2eHooks()
```


```bash
rm -f apps/web/src/editor/spike-hooks.ts apps/web/e2e/spike/shell-spike.spec.ts
rmdir apps/web/e2e/spike
git status --short
```
Expected: `git status --short` lista solo `decisions.ts` y `decisions.test.ts` como archivos nuevos (más lo que ya estuviera sin commitear, como `apps/web/app/editor-prueba/`).

- [ ] **Paso 5: Anotar los resultados y hacer commit**

1. En este plan, reemplaza el bloque entre `<!-- spike-resultados -->` y `<!-- /spike-resultados -->` por la tabla con lo medido (una fila por experimento: resultado y fecha).
2. Agrega a `docs/pascal-notes.md` una fila por resultado (formato de la tabla: qué, dónde se verificó, nota). Ejemplo:

```bash
cat >> docs/pascal-notes.md <<'EOF'
| **Spike del shell** (2026-10-11, navegador real): Recorrer = ver `test-results/spike.log` línea `SPIKE b`; cámara ortográfica y estilo = línea `SPIKE c`; colocar mueble por fase = `SPIKE d`; herramienta de ambientes = `SPIKE e`; historial = `SPIKE f` | `apps/web/e2e/spike/` (borrado) | Los valores quedan fijados en `apps/web/src/editor/shell/decisions.ts`. |
EOF
```
Sustituye la fila de ejemplo por los valores reales antes de commitear.

```bash
git add apps/web/src/editor/shell/decisions.ts apps/web/test/decisions.test.ts docs/pascal-notes.md docs/superpowers/plans/2026-10-11-editor-shell.md
git commit -m "feat(editor): decisiones del spike de Pascal (Recorrer, Vista 3D, mueble, ambiente e historial)" -- apps/web/src/editor/shell/decisions.ts apps/web/test/decisions.test.ts docs/pascal-notes.md docs/superpowers/plans/2026-10-11-editor-shell.md
```
Expected: un commit con cuatro archivos; `git status --short` ya no muestra `spike`.

---

### Task 1a: Base visual del shell (`cx`, CSS propio, pruebas `.tsx` y frontera con Pascal)

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/lib/cx.ts`, `apps/web/app/editor-shell.css`
- Modify: `apps/web/vitest.config.ts` (las pruebas de componentes se escriben en `.tsx`), `apps/web/app/globals.css` (importa el CSS del shell)
- Test: `apps/web/test/cx.test.ts`, `apps/web/test/shell-boundaries.test.ts`

**Interfaces:**
- Consumes: los tokens de `app/app-shell.css` (`ink`, `brand`, `ok`, `sun-ink`, `danger-*`, utilidades `glass` y `focus-ring`; son globales) y la fuente `--font-dm`, que `applyEditorTheme` (Tarea 2b) deja en `<body>` para los portales también.
- Produces:
  - `cx(...parts: (string | false | null | undefined)[]): string` en `@/lib/cx`.
  - Clases CSS globales (`app/editor-shell.css`, importado desde `globals.css`): `editor-shell`, `shell-float`, `shell-hit`, `shell-scroll`, `shell-soon`, `shell-tip`, `shell-chip-loader`.
  - La prueba `shell-boundaries`: ningún archivo de `src/editor/shell/` importa Pascal, `three` ni R3F (solo `src/editor/pascal-bridge.ts` lo hace). Vigila todas las tareas siguientes.

La maqueta (`app/editor-prueba/ui.tsx` y `maqueta.css`) se **conserva** hasta la Tarea 12a: de aquí en adelante la serie 1 promueve su código al producto, pieza por pieza, con tres cambios: nombres de clase `shell-*` (sin el prefijo `mq-`), selector **controlado** (`onChange`) y un sexto estado del chip de guardado, "Sin guardar" (rechazo del servidor o sesión vencida: la maqueta solo traía cinco). Las piezas de la serie 1 son **presentacionales**: reciben datos y funciones por props, no leen Pascal ni el puente.

- [ ] **Paso 1: Permitir pruebas `.tsx`**

Modify `apps/web/vitest.config.ts`:

```diff
@@
-  test: { include: ['test/**/*.test.ts'], environment: 'node' },
+  test: { include: ['test/**/*.test.{ts,tsx}'], environment: 'node' },
```


- [ ] **Paso 2: Escribir las pruebas (rojo)**

Create `apps/web/test/cx.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { cx } from '../src/lib/cx'

describe('cx', () => {
  it('une las clases y descarta falsos, nulos, indefinidos y vacíos', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b')
    expect(cx()).toBe('')
  })
})
```

Create `apps/web/test/shell-boundaries.test.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../src/editor/shell/', import.meta.url))
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : [],
  )
const PASCAL = /(?:from|import\()\s*'(?:@pascal-app\/|three['/]|@react-three\/)/

describe('frontera del shell con Pascal', () => {
  it('ningún archivo de src/editor/shell importa Pascal, three ni R3F (solo src/editor/pascal-bridge.ts lo hace)', () => {
    const offenders = walk(root).filter((file) => PASCAL.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run cx shell-boundaries`
Expected: FAIL — `Error: Cannot find module '../src/lib/cx'`; `shell-boundaries` ya pasa (todavía no hay archivos que lo violen).

- [ ] **Paso 3: Escribir `cx` y el CSS del shell**

Create `apps/web/src/lib/cx.ts`:

```ts
/** Une nombres de clase: descarta lo que no sea texto (falso, nulo, indefinido o vacío). */
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')
```

Create `apps/web/app/editor-shell.css`:

```css
/*
 * Aspecto propio del shell del editor (barra, dock y paneles flotantes sobre el lienzo de Pascal).
 * Va sin capa, así que gana a las utilidades de Tailwind donde hace falta. Las fuentes llegan por las variables
 * de next/font que `applyEditorTheme` pone en <body> (portales incluidos).
 */
.editor-shell {
  font-family: var(--font-dm), ui-sans-serif, system-ui, sans-serif;
  color: var(--color-ink);
  -webkit-font-smoothing: antialiased;
}

/* Todo lo que flota: vidrio firme para leerse sobre el plano o el 3D, con sombra de dos capas. El contenedor del shell no
   recibe clics (deja pasar el lienzo): cada pieza flotante sí. */
.shell-float {
  pointer-events: auto;
  background: rgb(255 255 255 / 0.84);
  box-shadow:
    0 1px 2px rgb(11 31 77 / 0.06),
    0 14px 36px rgb(11 31 77 / 0.12);
}
@media (prefers-reduced-transparency: reduce) {
  .shell-float {
    background: rgb(255 255 255 / 0.97);
  }
}

/* El Loader compacto dentro de un chip: más pequeño y con el peso del texto del chip. */
.shell-chip-loader .madori-loader--inline .madori-loader__win {
  height: 22px;
}
.shell-chip-loader .madori-loader__label {
  color: inherit;
  font-size: 13px;
  font-weight: 600;
}

/* Sin `outline-color` en las transiciones: el anillo de foco aparece ya en cobalto, sin un destello oscuro. */
.editor-shell button,
.editor-shell li {
  transition-property: background-color, color, box-shadow, transform, opacity;
}

/* Objetivo táctil de 44 px aunque el chip se vea más bajo. */
.shell-hit {
  position: relative;
}
.shell-hit::after {
  content: '';
  position: absolute;
  inset: -5px 0;
}

/* Desplazamiento fino dentro de un panel. */
.shell-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(11 31 77 / 0.22) transparent;
  overscroll-behavior: contain;
}

/* Etiqueta emergente de "Pronto": aparece con el cursor o con el foco del teclado. */
.shell-soon .shell-tip {
  opacity: 0;
  transform: translateY(4px);
  transition:
    opacity 150ms ease-out,
    transform 150ms ease-out;
  pointer-events: none;
}
.shell-soon:hover .shell-tip,
.shell-soon:focus-visible .shell-tip {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .editor-shell *,
  .editor-shell *::before,
  .editor-shell *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
```

Modify `apps/web/app/globals.css`:

```diff
@@
 @import "./app-shell.css";
+@import "./editor-shell.css";
```


- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run cx shell-boundaries`
Expected: PASS (2 archivos, 2 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/vitest.config.ts apps/web/app/globals.css apps/web/app/editor-shell.css apps/web/src/lib/cx.ts apps/web/test/cx.test.ts apps/web/test/shell-boundaries.test.ts
git commit -m "feat(editor): base visual del shell (cx, CSS propio) y prueba de frontera con Pascal" -- apps/web/vitest.config.ts apps/web/app/globals.css apps/web/app/editor-shell.css apps/web/src/lib/cx.ts apps/web/test/cx.test.ts apps/web/test/shell-boundaries.test.ts
```

---

### Task 1b: Selector, insignia y filas de opciones (primitivas, 1 de 2)

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/ui/primitives.tsx`
- Test: `apps/web/test/shell-primitives.test.tsx`

**Interfaces:**
- Consumes: `cx` (`@/lib/cx`) y las clases `shell-float`, `shell-hit` de `editor-shell.css` (Tarea 1a); `lucide-react` 1.55.0.
- Produces (`src/editor/shell/ui/primitives.tsx`):
  - `FLOAT: string` (`'glass shell-float'`: todo lo que flota sobre el lienzo) y `SIDE_PANEL: string` (el marco de los paneles que se abren a la izquierda, entre la barra superior y el dock: Muebles y Materiales).
  - `SegButton(props: { icon: LucideIcon; label: string; active: boolean; onClick?: () => void })`, `type SegItem<T extends string> = { id: T; icon: LucideIcon; label: string }`, `Segmented<T extends string>(props: { label: string; items: readonly SegItem<T>[]; value: T | null; onChange?: (id: T) => void; className?: string })`: el selector de píldoras (Ver | Editar, 2D | 3D | Ambas), un grupo (`fieldset`) con leyenda para lectores de pantalla y botones `aria-pressed`.
  - `Badge(props: { children: ReactNode; className?: string })`: la insignia ámbar suave "Pronto" (texto en tinta oscura, nunca en Sol).
  - `ChipRow(props: { title: string; chips: readonly { value: string; label: string }[]; active: string; onPick: (value: string) => void })`: fila de opciones de las que una está activa (Muros: Completos | Cortados | Bajos; categorías de muebles y materiales). `active` vacío = ninguna.
  - `IconTile(props: { icon: LucideIcon; className?: string })`: cuadro de ícono redondeado de los encabezados de panel.

`ChipRow` es **una sola pieza**: la usan el panel de Vista 3D (Tarea 1i), el catálogo de muebles (1g), el menú Más (5c) y el panel de materiales (8d). Por eso vive aquí y no dentro de ningún panel.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-primitives.test.tsx`:

```tsx
import { readFileSync } from 'node:fs'
import { Eye, PenLine } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Badge, ChipRow, FLOAT, Segmented } from '../src/editor/shell/ui/primitives'

const css = readFileSync(new URL('../app/editor-shell.css', import.meta.url), 'utf8')
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const MODES = [
  { id: 'ver', icon: Eye, label: 'Ver' },
  { id: 'editar', icon: PenLine, label: 'Editar' },
] as const

describe('Segmented', () => {
  const markup = renderToStaticMarkup(
    <Segmented label="Modo del editor" items={MODES} value="editar" onChange={() => {}} />,
  )

  it('es un grupo con leyenda para lectores de pantalla y un botón por opción', () => {
    expect(markup).toContain('<legend class="sr-only">Modo del editor</legend>')
    expect(markup.match(/<button /g)).toHaveLength(2)
  })

  it('marca con aria-pressed solo la opción elegida, en azul noche con texto blanco', () => {
    const buttons = [...markup.matchAll(/<button[^>]*aria-pressed="(true|false)"[^>]*class="([^"]*)"[^>]*>(.*?)<\/button>/g)]
    expect(buttons.map((m) => [m[1], textOf(m[3] ?? '')])).toEqual([
      ['false', 'Ver'],
      ['true', 'Editar'],
    ])
    expect(buttons[1]?.[2]).toContain('bg-ink text-white')
    expect(buttons[0]?.[2]).not.toContain('bg-ink text-white')
  })

  it('sin valor (null) no deja ninguna opción activa', () => {
    const none = renderToStaticMarkup(<Segmented label="Vista" items={MODES} value={null} />)
    expect(none).not.toContain('aria-pressed="true"')
  })
})

describe('ChipRow', () => {
  const CHIPS = [
    { value: 'up', label: 'Completos' },
    { value: 'cutaway', label: 'Cortados' },
  ]
  const render = (active: string) => renderToStaticMarkup(<ChipRow title="Muros" chips={CHIPS} active={active} onPick={() => {}} />)

  it('es un grupo con leyenda para lectores de pantalla y un botón por opción', () => {
    const markup = render('cutaway')
    expect(markup).toContain('<legend class="sr-only">Muros</legend>')
    expect(textOf(markup)).toBe('MurosCompletosCortados')
  })

  it('marca con aria-pressed solo la opción activa, en azul noche con texto blanco; con un valor que no existe no marca ninguna', () => {
    const markup = render('cutaway')
    expect([...markup.matchAll(/aria-pressed="(true|false)"/g)].map((m) => m[1])).toEqual(['false', 'true'])
    expect(markup).toContain('bg-ink text-white')
    expect(render('')).not.toContain('aria-pressed="true"')
  })
})

describe('Badge y estilos', () => {
  it('la insignia lleva tinta oscura sobre ámbar suave, nunca el Sol como texto', () => {
    const markup = renderToStaticMarkup(<Badge>Pronto</Badge>)
    expect(markup).toContain('text-sun-ink')
    expect(markup).not.toContain('text-sun ')
  })

  it('todo lo que flota usa la clase de vidrio y sombra del shell', () => {
    expect(FLOAT).toBe('glass shell-float')
    expect(css).toMatch(/\.shell-float\s*\{[^}]*box-shadow/)
    expect(css).toMatch(/\.shell-hit::after/)
  })

  it('el CSS del shell respeta "reducir movimiento" y "reducir transparencia"', () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{[^@]*\.editor-shell \*[^}]*transition: none !important/)
    expect(css).toMatch(/prefers-reduced-transparency: reduce\)\s*\{\s*\.shell-float/)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-primitives`
Expected: FAIL — `Error: Cannot find module '../src/editor/shell/ui/primitives'`.

- [ ] **Paso 2: Escribir las primitivas**

Create `apps/web/src/editor/shell/ui/primitives.tsx`:

```tsx
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

/** Todo lo que flota sobre el lienzo: vidrio, sombra de dos capas y clics solo dentro de la pieza (`editor-shell.css`). */
export const FLOAT = 'glass shell-float'

/** Marco de los paneles que se abren a la izquierda (Muebles, Materiales): entre la barra superior y el dock. */
export const SIDE_PANEL = 'absolute bottom-[96px] left-5 top-[88px] z-10 flex w-[356px] flex-col rounded-[26px] p-4'

/** Botón de píldora dentro de un selector: activo en azul noche con texto blanco, inactivo en vidrio. */
export function SegButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon
  label: string
  active: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'focus-ring inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-[15px] font-medium transition-colors duration-150 ease-out',
        active ? 'bg-ink text-white' : 'text-ink hover:bg-ink/6',
      )}
    >
      <Icon aria-hidden="true" className="size-[18px]" strokeWidth={2} />
      {label}
    </button>
  )
}

export type SegItem<T extends string> = { id: T; icon: LucideIcon; label: string }

/** Selector de píldoras (Ver | Editar, 2D | 3D | Ambas). `value` nulo = ninguna activa. */
export function Segmented<T extends string>({
  label,
  items,
  value,
  onChange,
  className,
}: {
  label: string
  items: readonly SegItem<T>[]
  value: T | null
  onChange?: (id: T) => void
  className?: string
}) {
  return (
    <fieldset
      className={cx(FLOAT, 'm-0 flex h-14 min-w-0 items-center gap-1 rounded-full border-0 p-1.5', className)}
    >
      <legend className="sr-only">{label}</legend>
      {items.map((it) => (
        <SegButton
          key={it.id}
          icon={it.icon}
          label={it.label}
          active={it.id === value}
          onClick={() => onChange?.(it.id)}
        />
      ))}
    </fieldset>
  )
}

/** Insignia ámbar suave: "Pronto". El texto va en tinta oscura, nunca en Sol. */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex h-5 shrink-0 items-center rounded-full bg-[#FFE7B8] px-2 text-[11px] font-semibold leading-none text-sun-ink',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Fila de opciones de las que una está activa: grupo con leyenda para lectores de pantalla y botones `aria-pressed`. */
export function ChipRow({
  title,
  chips,
  active,
  onPick,
}: {
  title: string
  chips: readonly { value: string; label: string }[]
  active: string
  onPick: (value: string) => void
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-wrap gap-x-2 gap-y-2.5 border-0 p-0">
      <legend className="sr-only">{title}</legend>
      {chips.map((c) => {
        const on = c.value === active
        return (
          <button
            key={c.value}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(c.value)}
            className={cx(
              'focus-ring shell-hit h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150 ease-out',
              on
                ? 'bg-ink text-white'
                : 'bg-white/80 text-ink shadow-[inset_0_0_0_1px_rgb(11_31_77/0.08)] hover:bg-white',
            )}
          >
            {c.label}
          </button>
        )
      })}
    </fieldset>
  )
}

/** Cuadro de ícono redondeado (encabezados de panel). */
export function IconTile({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid size-11 shrink-0 place-items-center rounded-[14px] bg-ink/6 text-ink',
        className,
      )}
    >
      <Icon className="size-[22px]" strokeWidth={1.9} />
    </span>
  )
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-primitives shell-boundaries`
Expected: PASS (`shell-primitives`: 8 pruebas: Segmented 3, ChipRow 2, Badge y estilos 3; `shell-boundaries`: 1).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/ui/primitives.tsx apps/web/test/shell-primitives.test.tsx
git commit -m "feat(editor): selector, insignia y filas de opciones del shell" -- apps/web/src/editor/shell/ui/primitives.tsx apps/web/test/shell-primitives.test.tsx
```

---

### Task 1c: Chip de guardado y botón "Pronto" (primitivas, 2 de 2)

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/ui/status.tsx`
- Test: `apps/web/test/shell-status.test.tsx`

**Interfaces:**
- Consumes: `Badge`, `FLOAT` de `./primitives` (Tarea 1b); `cx`; `Loader` (`@/components/Loader`, ya existe: ventana compacta con `inline` y `label`); la clase `shell-chip-loader` y la etiqueta emergente `shell-soon` / `shell-tip` de `editor-shell.css` (1a); tokens `ok`, `ok-dot`, `sun-ink`, `danger-*` de `app/app-shell.css`.
- Produces (`src/editor/shell/ui/status.tsx`):
  - `type SaveState = 'guardado' | 'guardando' | 'sin-cambios' | 'sin-conexion' | 'conflicto' | 'sin-guardar'` y `SaveChip(props: { state: SaveState })`: color + ícono + texto, nunca solo color; con `data-testid="save-status"` y `role="status"`.
  - `SoonButton(props: { icon: LucideIcon; label: string; tone?: 'glass' | 'primary'; className?: string })`: botón deshabilitado con la insignia "Pronto". Como un botón deshabilitado no recibe el foco, su contenedor sí (`tabIndex={0}`) y apunta con `aria-describedby` a la etiqueta "Llega en una próxima versión", que aparece con el cursor o con el foco del teclado.

Los seis estados del chip son los cinco de la maqueta más **"Sin guardar"** (rechazo del servidor o sesión vencida); cómo se traduce el estado real del guardador a estos seis lo hace `saveStateOf` (Tarea 4a).

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-status.test.tsx`:

```tsx
import { Share2 } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SaveChip, type SaveState, SoonButton } from '../src/editor/shell/ui/status'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const NO_EMOJI = /\p{Extended_Pictographic}/u

describe('SaveChip', () => {
  const LABELS: Record<SaveState, string> = {
    guardado: 'Guardado',
    guardando: 'Guardando…',
    'sin-cambios': 'Sin cambios',
    'sin-conexion': 'Sin conexión',
    conflicto: 'Conflicto con otra pestaña',
    'sin-guardar': 'Sin guardar',
  }

  it.each(Object.entries(LABELS))('el estado %s dice "%s", con color e ícono y no solo color', (state, label) => {
    const markup = renderToStaticMarkup(<SaveChip state={state as SaveState} />)
    expect(textOf(markup)).toBe(label)
    expect(markup).toContain('data-testid="save-status"')
    expect(markup).toContain('role="status"')
    if (state !== 'guardando') expect(markup).toContain('<svg')
    expect(markup).not.toMatch(NO_EMOJI)
  })
})

describe('SoonButton', () => {
  const markup = renderToStaticMarkup(<SoonButton icon={Share2} label="Compartir" />)

  it('es un botón deshabilitado con la insignia "Pronto" y su etiqueta', () => {
    expect(markup).toMatch(/<button[^>]*disabled/)
    expect(textOf(markup)).toBe('CompartirProntoLlega en una próxima versión')
    expect(markup).toContain('role="tooltip"')
  })

  it('su contenedor recibe el foco del teclado y apunta a la etiqueta (el botón deshabilitado no puede)', () => {
    const id = /aria-describedby="([^"]+)"/.exec(markup)?.[1]
    expect(id).toBeTruthy()
    expect(markup).toContain('tabindex="0"')
    expect(markup).toContain(`id="${id}"`)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-status`
Expected: FAIL — `Error: Cannot find module '../src/editor/shell/ui/status'`.

- [ ] **Paso 2: Escribir el chip y el botón "Pronto"**

Create `apps/web/src/editor/shell/ui/status.tsx`:

```tsx
import { Check, type LucideIcon, TriangleAlert, WifiOff } from 'lucide-react'
import { type ReactNode, useId } from 'react'
import { Loader } from '@/components/Loader'
import { cx } from '@/lib/cx'
import { Badge, FLOAT } from './primitives'

export type SaveState =
  | 'guardado'
  | 'guardando'
  | 'sin-cambios'
  | 'sin-conexion'
  | 'conflicto'
  | 'sin-guardar'

const CHIP =
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap'

function Chip({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span data-testid="save-status" role="status" className={cx(CHIP, tone)}>
      {children}
    </span>
  )
}

/** Chip de estado de guardado: color + ícono + texto, nunca solo color. */
export function SaveChip({ state }: { state: SaveState }) {
  switch (state) {
    case 'guardado':
      return (
        <Chip tone="bg-[#E1F5EB] text-ok">
          <span className="grid size-4 place-items-center rounded-full bg-ok-dot" aria-hidden="true">
            <Check className="size-3 text-white" strokeWidth={3.5} />
          </span>
          Guardado
        </Chip>
      )
    case 'guardando':
      return (
        <Chip tone="shell-chip-loader bg-ink/6 py-0 pl-2 text-ink">
          <Loader size="sm" inline label="Guardando…" />
        </Chip>
      )
    case 'sin-cambios':
      return (
        <Chip tone="bg-ink/6 text-ink-muted">
          <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
          Sin cambios
        </Chip>
      )
    case 'sin-conexion':
      return (
        <Chip tone="bg-[#FFF1D6] text-sun-ink">
          <WifiOff aria-hidden="true" className="size-4" strokeWidth={2.25} />
          Sin conexión
        </Chip>
      )
    case 'conflicto':
      return (
        <Chip tone="bg-danger-wash text-danger-ink">
          <TriangleAlert aria-hidden="true" className="size-4" strokeWidth={2.25} />
          Conflicto con otra pestaña
        </Chip>
      )
    case 'sin-guardar':
      return (
        <Chip tone="bg-danger-wash text-danger-ink">
          <TriangleAlert aria-hidden="true" className="size-4" strokeWidth={2.25} />
          Sin guardar
        </Chip>
      )
  }
}

/** Botón deshabilitado con insignia "Pronto" y la etiqueta "Llega en una próxima versión" (cursor o foco del teclado). */
export function SoonButton({
  icon: Icon,
  label,
  tone = 'glass',
  className,
}: {
  icon: LucideIcon
  label: string
  tone?: 'glass' | 'primary'
  className?: string
}) {
  const tipId = useId()
  return (
    <span
      className={cx('shell-soon relative inline-flex', className)}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: el contenedor recibe el foco porque el botón deshabilitado no puede.
      tabIndex={0}
      aria-describedby={tipId}
    >
      <button
        type="button"
        disabled
        className={cx(
          'pointer-events-none inline-flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-semibold',
          tone === 'glass' ? cx(FLOAT, 'text-ink/45') : 'bg-sky text-ink/55',
        )}
      >
        <Icon aria-hidden="true" className="size-[18px]" strokeWidth={2} />
        {label}
      </button>
      <Badge className="absolute -right-2 -top-2.5 shadow-[0_1px_2px_rgb(11_31_77/0.12)]">Pronto</Badge>
      <span
        id={tipId}
        role="tooltip"
        className="shell-tip absolute bottom-full right-0 z-30 mb-5 whitespace-nowrap rounded-xl bg-white px-3 py-2 text-[13px] font-medium text-ink shadow-[0_1px_2px_rgb(11_31_77/0.08),0_10px_28px_rgb(11_31_77/0.16)]"
      >
        Llega en una próxima versión
      </span>
    </span>
  )
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-status shell-primitives shell-boundaries`
Expected: PASS (`shell-status`: 8 pruebas: los seis estados y dos del botón).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/ui/status.tsx apps/web/test/shell-status.test.tsx
git commit -m "feat(editor): chip de guardado de seis estados y botón Pronto del shell" -- apps/web/src/editor/shell/ui/status.tsx apps/web/test/shell-status.test.tsx
```

---

### Task 1d: Barra superior y deshacer/rehacer (presentacionales)

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/ui/TopBar.tsx`, `apps/web/src/editor/shell/ui/UndoRedo.tsx`
- Test: `apps/web/test/shell-topbar.test.tsx`

**Interfaces:**
- Consumes: `FLOAT` de `./primitives` (Tarea 1b); `SaveChip`, `SaveState` de `./status` (1c); `cx`.
- Produces:
  - `TopBar(props: { name: string; saveState: SaveState; onBack: () => void; backBusy?: boolean; center: ReactNode; right: ReactNode })` (`src/editor/shell/ui/TopBar.tsx`): volver + nombre del proyecto (`<h1>`) + chip de guardado a la izquierda, `center` (el selector Ver | Editar) y `right` (la vista 2D | 3D | Ambas y Deshacer/Rehacer). El contenedor deja pasar los clics al lienzo; mientras vuelve, el botón queda ocupado y deshabilitado.
  - `UndoRedo(props: { canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void; className?: string })` (`src/editor/shell/ui/UndoRedo.tsx`): un grupo "Historial" con dos botones con nombre accesible; cada uno se deshabilita solo cuando no hay nada que deshacer o rehacer.

La maqueta (`TopBar.tsx`) solo dibujaba un estado fijo; aquí el botón de volver, el nombre y el chip reciben su estado por props, y las dos piezas de los costados (`center`, `right`) las arma el shell conectado (Tarea 4c).

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-topbar.test.tsx`:

```tsx
import { Eye } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Segmented } from '../src/editor/shell/ui/primitives'
import { TopBar } from '../src/editor/shell/ui/TopBar'
import { UndoRedo } from '../src/editor/shell/ui/UndoRedo'

const NO_EMOJI = /\p{Extended_Pictographic}/u
const noop = () => {}

describe('UndoRedo', () => {
  it('sin historial ambos botones quedan deshabilitados y con nombre accesible', () => {
    const markup = renderToStaticMarkup(<UndoRedo canUndo={false} canRedo={false} onUndo={noop} onRedo={noop} />)
    expect(markup).toContain('aria-label="Deshacer"')
    expect(markup).toContain('aria-label="Rehacer"')
    expect(markup.match(/disabled=""/g)).toHaveLength(2)
  })

  it('con algo que deshacer solo Rehacer sigue deshabilitado', () => {
    const markup = renderToStaticMarkup(<UndoRedo canUndo canRedo={false} onUndo={noop} onRedo={noop} />)
    expect(markup.match(/disabled=""/g)).toHaveLength(1)
    expect(/aria-label="Rehacer"[^>]*disabled=""|disabled=""[^>]*aria-label="Rehacer"/.test(markup)).toBe(true)
  })
})

describe('TopBar', () => {
  const render = (backBusy?: boolean) =>
    renderToStaticMarkup(
      <TopBar
        name="Loft Palermo"
        saveState="guardado"
        onBack={noop}
        backBusy={backBusy}
        center={<Segmented label="Modo del editor" items={[{ id: 'ver', icon: Eye, label: 'Ver' }]} value="ver" />}
        right={<span>vista</span>}
      />,
    )

  it('muestra volver, el nombre del proyecto como título, el chip de guardado y las dos piezas', () => {
    const markup = render()
    expect(markup).toContain('aria-label="Volver a mis proyectos"')
    expect(markup).toMatch(/<h1[^>]*>Loft Palermo<\/h1>/)
    expect(markup).toContain('data-testid="save-status"')
    expect(markup).toContain('Modo del editor')
    expect(markup).toContain('<span>vista</span>')
  })

  it('mientras vuelve, el botón queda ocupado y deshabilitado (sin doble clic)', () => {
    expect(render(true)).toMatch(/aria-busy="true"/)
    expect(render(true)).toMatch(/disabled=""/)
    expect(render()).not.toContain('aria-busy')
  })

  it('no usa emojis', () => {
    expect(render()).not.toMatch(NO_EMOJI)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-topbar`
Expected: FAIL — `Error: Cannot find module '../src/editor/shell/ui/TopBar'`.

- [ ] **Paso 2: Escribir la barra superior**

Create `apps/web/src/editor/shell/ui/TopBar.tsx`:

```tsx
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { FLOAT } from './primitives'
import { SaveChip, type SaveState } from './status'

/** Barra superior: volver + nombre + guardado | modo (centro) | vista (derecha). El contenedor deja pasar los clics al lienzo. */
export function TopBar({
  name,
  saveState,
  onBack,
  backBusy,
  center,
  right,
}: {
  name: string
  saveState: SaveState
  onBack: () => void
  backBusy?: boolean
  center: ReactNode
  right: ReactNode
}) {
  return (
    <header className="pointer-events-none absolute inset-x-5 top-5 z-20 grid grid-cols-[1fr_auto_1fr] items-start">
      <div
        className={cx(
          FLOAT,
          'flex h-14 w-fit max-w-full items-center gap-3 justify-self-start rounded-full py-1.5 pl-1.5 pr-4',
        )}
      >
        <button
          type="button"
          aria-label="Volver a mis proyectos"
          aria-busy={backBusy || undefined}
          disabled={backBusy}
          onClick={onBack}
          className="focus-ring grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink transition-colors duration-150 ease-out hover:bg-ink/6 disabled:cursor-wait disabled:opacity-60"
        >
          <ArrowLeft aria-hidden="true" className="size-5" strokeWidth={2} />
        </button>
        <h1 className="min-w-0 truncate font-display text-[17px] font-semibold leading-none">{name}</h1>
        <SaveChip state={saveState} />
      </div>
      <div className="justify-self-center">{center}</div>
      <div className="justify-self-end">{right}</div>
    </header>
  )
}
```

- [ ] **Paso 3: Escribir deshacer/rehacer**

Create `apps/web/src/editor/shell/ui/UndoRedo.tsx`:

```tsx
import { Redo2, Undo2 } from 'lucide-react'
import { cx } from '@/lib/cx'
import { FLOAT } from './primitives'

/** Deshacer y Rehacer. Cada uno se deshabilita solo cuando no hay nada que deshacer o rehacer. */
export function UndoRedo({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  className,
}: {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  className?: string
}) {
  const base =
    'focus-ring grid size-11 cursor-pointer place-items-center rounded-full text-ink transition-colors duration-150 ease-out hover:bg-ink/6 disabled:cursor-not-allowed disabled:text-ink/30 disabled:hover:bg-transparent'
  return (
    <fieldset className={cx(FLOAT, 'm-0 flex h-14 min-w-0 items-center gap-1 rounded-full border-0 p-1.5', className)}>
      <legend className="sr-only">Historial</legend>
      <button type="button" aria-label="Deshacer" disabled={!canUndo} onClick={onUndo} className={base}>
        <Undo2 aria-hidden="true" className="size-5" strokeWidth={2} />
      </button>
      <button type="button" aria-label="Rehacer" disabled={!canRedo} onClick={onRedo} className={base}>
        <Redo2 aria-hidden="true" className="size-5" strokeWidth={2} />
      </button>
    </fieldset>
  )
}
```

- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-topbar shell-boundaries`
Expected: PASS (`shell-topbar`: 5 pruebas: UndoRedo 2 y TopBar 3).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/ui/TopBar.tsx apps/web/src/editor/shell/ui/UndoRedo.tsx apps/web/test/shell-topbar.test.tsx
git commit -m "feat(editor): barra superior y deshacer/rehacer del shell" -- apps/web/src/editor/shell/ui/TopBar.tsx apps/web/src/editor/shell/ui/UndoRedo.tsx apps/web/test/shell-topbar.test.tsx
```

---

### Task 1e: Dock de herramientas y menú emergente (presentacionales)

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/ui/Dock.tsx`
- Test: `apps/web/test/shell-dock-ui.test.tsx`

**Interfaces:**
- Consumes: `FLOAT` de `./primitives` (Tarea 1b); `cx`; `lucide-react` 1.55.0.
- Produces (`src/editor/shell/ui/Dock.tsx`):
  - `type DockButton = { id: string; label: string; icon: LucideIcon; menu?: boolean; popup?: 'menu' | 'dialog' }` (`popup` por omisión es `menu`: lo que anuncia `aria-haspopup`).
  - `Dock(props: { items: readonly DockButton[]; active: string | null; openMenu: string | null; onSelect: (id: string) => void; menus?: Partial<Record<string, ReactNode>>; className?: string })`: una barra de herramientas (`role="toolbar"`, nombre "Herramientas de edición") con un botón por herramienta, de 64 × 84 px, ícono y etiqueta debajo, `aria-pressed` en el activo (azul noche con texto blanco) y `data-dock="<id>"`; el menú abierto sale **sobre su propio botón**.
  - `type MenuEntry = { id: string; label: string; icon: LucideIcon; active?: boolean; disabled?: boolean }`.
  - `ToolMenu(props: { title: string; entries: readonly MenuEntry[]; onPick: (id: string) => void; onClose: () => void })`: lleva `role="menu"`; al abrirse enfoca la primera entrada; flechas, Inicio y Fin mueven el foco; `Escape` llama `onClose` (y no deja pasar la tecla).

La maqueta (`Dock.tsx`) solo dibujaba un estado fijo y anclaba los menús a un valor fijo (`left-[78px]`); aquí cada botón recibe su estado y su acción, y los menús (Estructura, Aberturas, Medir) se anclan **sobre su propio botón**. Qué botones hay y qué hace cada uno en Pascal lo define `dock-model.ts` (Tarea 5a); esta pieza solo dibuja lo que le pasan.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-dock-ui.test.tsx`:

```tsx
import { Blocks, BrickWall, MousePointer2, Ruler } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Dock, ToolMenu } from '../src/editor/shell/ui/Dock'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => {}
const ITEMS = [
  { id: 'select', label: 'Seleccionar', icon: MousePointer2 },
  { id: 'structure', label: 'Estructura', icon: Blocks, menu: true },
  { id: 'measure', label: 'Medir', icon: Ruler, menu: true },
] as const
const ENTRIES = [
  { id: 'wall', label: 'Muro', icon: BrickWall, active: true },
  { id: 'slab', label: 'Piso', icon: BrickWall, disabled: true },
] as const


describe('Dock', () => {
  const render = (active: string | null, openMenu: string | null) =>
    renderToStaticMarkup(
      <Dock
        items={ITEMS}
        active={active}
        openMenu={openMenu}
        onSelect={noop}
        menus={{ structure: <ToolMenu title="Estructura" entries={ENTRIES} onPick={noop} onClose={noop} /> }}
      />,
    )

  it('es una barra de herramientas con nombre y un botón por herramienta, con su etiqueta visible', () => {
    const markup = render('select', null)
    expect(markup).toContain('role="toolbar"')
    expect(markup).toContain('aria-label="Herramientas de edición"')
    expect(textOf(markup)).toBe('SeleccionarEstructuraMedir')
    expect(markup.match(/<button /g)).toHaveLength(3)
  })

  it('marca con aria-pressed solo el botón activo, que se ve en azul noche con texto blanco', () => {
    const markup = render('structure', null)
    const pressed = [...markup.matchAll(/aria-pressed="(true|false)"/g)].map((m) => m[1])
    expect(pressed).toEqual(['false', 'true', 'false'])
    expect(markup).toContain('bg-ink text-white')
  })

  it('cada botón mide al menos 44 px (64 × 84)', () => {
    expect(render(null, null)).toContain('h-16 w-[84px]')
  })

  it('los botones con menú anuncian menu y su estado; los demás no', () => {
    const closed = render('select', null)
    expect(closed.match(/aria-haspopup="menu"/g)).toHaveLength(2)
    expect(closed.match(/aria-expanded="false"/g)).toHaveLength(2)
    expect(closed).not.toContain('role="menu"')
    const open = render('structure', 'structure')
    expect(open).toContain('aria-expanded="true"')
    expect(open).toContain('role="menu"')
  })
})

describe('ToolMenu', () => {
  const markup = renderToStaticMarkup(<ToolMenu title="Estructura" entries={ENTRIES} onPick={noop} onClose={noop} />)

  it('es un menú con nombre y una entrada por herramienta', () => {
    expect(markup).toContain('role="menu"')
    expect(markup).toContain('aria-label="Estructura"')
    expect(markup.match(/role="menuitem"/g)).toHaveLength(2)
  })

  it('la entrada activa lo indica con aria-current y la deshabilitada no se puede usar', () => {
    expect(markup.match(/aria-current="true"/g)).toHaveLength(1)
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*role="menuitem"|<button[^>]*role="menuitem"[^>]*disabled=""/)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-dock-ui`
Expected: FAIL — `Error: Cannot find module '../src/editor/shell/ui/Dock'`.

- [ ] **Paso 2: Escribir el dock y el menú**

Create `apps/web/src/editor/shell/ui/Dock.tsx`:

```tsx
import type { LucideIcon } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useEffect, useRef } from 'react'
import { cx } from '@/lib/cx'
import { FLOAT } from './primitives'

export type DockButton = { id: string; label: string; icon: LucideIcon; menu?: boolean; popup?: 'menu' | 'dialog' }

/** Barra de herramientas del modo Editar: botones de ≥ 44 px con ícono y etiqueta debajo; el menú abierto sale sobre su botón. */
export function Dock({
  items,
  active,
  openMenu,
  onSelect,
  menus,
  className,
}: {
  items: readonly DockButton[]
  active: string | null
  openMenu: string | null
  onSelect: (id: string) => void
  menus?: Partial<Record<string, ReactNode>>
  className?: string
}) {
  return (
    <div className={className}>
      <div
        role="toolbar"
        aria-label="Herramientas de edición"
        className={cx(FLOAT, 'flex items-center gap-1 rounded-[28px] p-2')}
      >
        {items.map((it) => {
          const on = it.id === active
          const open = openMenu === it.id
          return (
            <div key={it.id} className="relative">
              {open && menus?.[it.id]}
              <button
                type="button"
                data-dock={it.id}
                aria-pressed={on}
                aria-haspopup={it.menu ? (it.popup ?? 'menu') : undefined}
                aria-expanded={it.menu ? open : undefined}
                onClick={() => onSelect(it.id)}
                className={cx(
                  'focus-ring flex h-16 w-[84px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[20px] text-[12.5px] font-medium transition-colors duration-150 ease-out',
                  on ? 'bg-ink text-white' : 'text-ink hover:bg-ink/6',
                )}
              >
                <it.icon aria-hidden="true" className="size-[22px]" strokeWidth={1.9} />
                {it.label}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export type MenuEntry = { id: string; label: string; icon: LucideIcon; active?: boolean; disabled?: boolean }

const ITEM = '[role="menuitem"]:not(:disabled)'

/** Menú emergente sobre un botón del dock: enfoca la primera entrada al abrirse, flechas/Inicio/Fin mueven el foco y Esc lo cierra. */
export function ToolMenu({
  title,
  entries,
  onPick,
  onClose,
}: {
  title: string
  entries: readonly MenuEntry[]
  onPick: (id: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(ITEM)?.focus()
  }, [])
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      return onClose()
    }
    const buttons = [...(ref.current?.querySelectorAll<HTMLElement>(ITEM) ?? [])]
    const at = buttons.indexOf(document.activeElement as HTMLElement)
    const next =
      event.key === 'ArrowDown' ? at + 1 : event.key === 'ArrowUp' ? at - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : null
    if (next === null || buttons.length === 0) return
    event.preventDefault()
    buttons[(next + buttons.length) % buttons.length]?.focus()
  }
  return (
    <div
      ref={ref}
      role="menu"
      aria-label={title}
      onKeyDown={onKeyDown}
      className={cx(FLOAT, 'absolute bottom-full left-1/2 z-20 mb-3 w-[236px] -translate-x-1/2 rounded-[24px] p-2.5')}
    >
      <p className="px-2.5 pb-1.5 pt-1 text-xs font-semibold text-ink-muted">{title}</p>
      {entries.map((e) => (
        <button
          key={e.id}
          type="button"
          role="menuitem"
          disabled={e.disabled}
          aria-current={e.active ? 'true' : undefined}
          onClick={() => onPick(e.id)}
          className={cx(
            'focus-ring flex h-11 w-full cursor-pointer items-center gap-3 rounded-[14px] px-2.5 text-left text-[15px] transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-45',
            e.active ? 'bg-brand-wash font-semibold text-ink' : 'text-ink hover:bg-ink/5',
          )}
        >
          <e.icon
            aria-hidden="true"
            className={cx('size-5 shrink-0', e.active ? 'text-brand' : 'text-ink-muted')}
            strokeWidth={1.9}
          />
          {e.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-dock-ui shell-boundaries`
Expected: PASS (`shell-dock-ui`: 6 pruebas: Dock 4 y ToolMenu 2).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/ui/Dock.tsx apps/web/test/shell-dock-ui.test.tsx
git commit -m "feat(editor): dock de herramientas y menú emergente del shell" -- apps/web/src/editor/shell/ui/Dock.tsx apps/web/test/shell-dock-ui.test.tsx
```

---

### Task 1f: Panel de plantas y ambientes (presentacional)

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/ui/LevelPanel.tsx`
- Test: `apps/web/test/shell-level-panel.test.tsx`

**Interfaces:**
- Consumes: `FLOAT` de `./primitives` (Tarea 1b); `cx`.
- Produces (`src/editor/shell/ui/LevelPanel.tsx`):
  - `type LevelOption = { id: string; name: string }`, `type ZoneRow = { id: string; name: string; area: string }`.
  - `LevelPicker(props: { levels: readonly LevelOption[]; activeId: string | null; open: boolean; onToggle: () => void; onPick: (id: string) => void; onAdd: () => void; adding?: boolean; canAdd?: boolean })`: el botón muestra la planta activa ("Elige una planta" si no hay ninguna activa, "Sin plantas" si no hay plantas); abierto lista todas (la activa con `aria-current`) y ofrece "Agregar planta" (`canAdd` es `true` por omisión; en Ver no se agregan plantas; mientras `adding` el botón queda ocupado y deshabilitado).
  - `ZoneList(props: { zones: readonly ZoneRow[]; selectedId: string | null; onPick: (id: string) => void; disabled?: boolean })`: cada ambiente con su superficie ya formateada (`"15,2 m²"`); `disabled`: en Ver los ambientes se listan pero no se eligen; con la lista vacía muestra la invitación "Todavía no hay ambientes. Marca uno con Estructura › Ambiente."
  - `LevelPanel(props: { picker: ComponentProps<typeof LevelPicker>; zones: ComponentProps<typeof ZoneList> })`: `<aside aria-label="Nivel y ambientes">`.

De la maqueta (`LevelPanel.tsx`) se quitan los íconos por tipo de ambiente (un ambiente no tiene tipo: todos llevan el mismo) y los datos de ejemplo. Los nombres de planta ("Planta baja") y el cálculo de los m² los resuelve la Tarea 6a; esta pieza muestra lo que recibe.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-level-panel.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LevelPanel, LevelPicker, ZoneList } from '../src/editor/shell/ui/LevelPanel'

const NO_EMOJI = /\p{Extended_Pictographic}/u
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => {}
const LEVELS = [
  { id: 'l0', name: 'Planta baja' },
  { id: 'l1', name: 'Planta 1' },
]

describe('LevelPicker', () => {
  const render = (open: boolean, activeId: string | null = 'l0', adding = false) =>
    renderToStaticMarkup(
      <LevelPicker levels={LEVELS} activeId={activeId} open={open} onToggle={noop} onPick={noop} onAdd={noop} adding={adding} />,
    )

  it('cerrado muestra solo la planta activa', () => {
    const markup = render(false)
    expect(textOf(markup)).toBe('Planta baja')
    expect(markup).toContain('aria-expanded="false"')
  })

  it('abierto lista las plantas (la activa con aria-current) y ofrece agregar una', () => {
    const markup = render(true, 'l1')
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('aria-label="Plantas"')
    expect(markup.match(/aria-current="true"/g)).toHaveLength(1)
    expect(textOf(markup)).toContain('Agregar planta')
    expect(markup).toMatch(/Planta 1<\/span>/)
  })

  it('mientras se crea una planta el botón queda ocupado y sin doble clic', () => {
    const markup = render(true, 'l0', true)
    expect(markup).toMatch(/<button[^>]*aria-busy="true"[^>]*disabled=""|<button[^>]*disabled=""[^>]*aria-busy="true"/)
  })

  it('sin la opción de agregar (modo Ver) no ofrece crear plantas', () => {
    const markup = renderToStaticMarkup(
      <LevelPicker levels={LEVELS} activeId="l0" open onToggle={noop} onPick={noop} onAdd={noop} canAdd={false} />,
    )
    expect(textOf(markup)).not.toContain('Agregar planta')
    expect(textOf(markup)).toContain('Planta 1')
  })

  it('con plantas pero ninguna activa pide elegir una', () => {
    const markup = renderToStaticMarkup(
      <LevelPicker levels={LEVELS} activeId={null} open={false} onToggle={noop} onPick={noop} onAdd={noop} />,
    )
    expect(textOf(markup)).toBe('Elige una planta')
  })

  it('sin plantas dice "Sin plantas" en lugar de quedar en blanco', () => {
    const markup = renderToStaticMarkup(
      <LevelPicker levels={[]} activeId={null} open={false} onToggle={noop} onPick={noop} onAdd={noop} />,
    )
    expect(textOf(markup)).toBe('Sin plantas')
  })
})

describe('ZoneList y LevelPanel', () => {
  const ZONES = [
    { id: 'z1', name: 'Sala de estar', area: '15,2 m²' },
    { id: 'z2', name: 'Cocina', area: '4,8 m²' },
  ]

  it('cada ambiente muestra su superficie y el elegido queda marcado', () => {
    const markup = renderToStaticMarkup(<ZoneList zones={ZONES} selectedId="z2" onPick={noop} />)
    expect(textOf(markup)).toBe('Sala de estar15,2 m²Cocina4,8 m²')
    expect([...markup.matchAll(/aria-pressed="(true|false)"/g)].map((m) => m[1])).toEqual(['false', 'true'])
  })

  it('en Ver los ambientes se listan pero no se pueden elegir', () => {
    const markup = renderToStaticMarkup(<ZoneList zones={ZONES} selectedId={null} onPick={noop} disabled />)
    expect(markup.match(/disabled=""/g)).toHaveLength(2)
  })

  it('sin ambientes invita a dibujar uno, en castellano', () => {
    const markup = renderToStaticMarkup(<ZoneList zones={[]} selectedId={null} onPick={noop} />)
    expect(textOf(markup)).toBe('Todavía no hay ambientes. Marca uno con Estructura › Ambiente.')
  })

  it('el panel junta el selector y la lista bajo el título "Ambientes"', () => {
    const markup = renderToStaticMarkup(
      <LevelPanel
        picker={{ levels: LEVELS, activeId: 'l0', open: false, onToggle: noop, onPick: noop, onAdd: noop }}
        zones={{ zones: ZONES, selectedId: null, onPick: noop }}
      />,
    )
    expect(markup).toContain('aria-label="Nivel y ambientes"')
    expect(markup).toMatch(/<h2[^>]*>Ambientes<\/h2>/)
    expect(markup).not.toMatch(NO_EMOJI)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-level-panel`
Expected: FAIL — `Error: Cannot find module '../src/editor/shell/ui/LevelPanel'`.

- [ ] **Paso 2: Escribir el panel de plantas y ambientes**

Create `apps/web/src/editor/shell/ui/LevelPanel.tsx`:

```tsx
import { ChevronDown, Layers, Plus, SquareDashed } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cx } from '@/lib/cx'
import { FLOAT } from './primitives'

export type LevelOption = { id: string; name: string }
export type ZoneRow = { id: string; name: string; area: string }

/** Selector de planta: el botón muestra la activa; abierto lista todas y deja agregar una más. */
export function LevelPicker({
  levels,
  activeId,
  open,
  onToggle,
  onPick,
  onAdd,
  adding,
  canAdd = true,
}: {
  levels: readonly LevelOption[]
  activeId: string | null
  open: boolean
  onToggle: () => void
  onPick: (id: string) => void
  onAdd: () => void
  adding?: boolean
  canAdd?: boolean
}) {
  const active = levels.find((l) => l.id === activeId)
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="focus-ring flex h-12 w-full cursor-pointer items-center gap-2.5 rounded-2xl bg-ink/5 px-3.5 text-[15px] font-semibold text-ink transition-colors duration-150 ease-out hover:bg-ink/8"
      >
        <Layers aria-hidden="true" className="size-[18px] text-ink-muted" strokeWidth={2} />
        <span className="flex-1 truncate text-left">{active?.name ?? (levels.length > 0 ? 'Elige una planta' : 'Sin plantas')}</span>
        <ChevronDown
          aria-hidden="true"
          className={cx('size-[18px] text-ink-muted transition-transform', open && 'rotate-180')}
          strokeWidth={2}
        />
      </button>
      {open && (
        <div className={cx(FLOAT, 'absolute inset-x-0 top-full z-20 mt-2 rounded-2xl p-1.5')}>
          <ul aria-label="Plantas" className="flex flex-col gap-0.5">
            {levels.map((l) => {
              const on = l.id === activeId
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    aria-current={on ? 'true' : undefined}
                    onClick={() => onPick(l.id)}
                    className={cx(
                      'focus-ring flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-[15px] transition-colors duration-150 ease-out',
                      on ? 'bg-brand-wash font-semibold text-ink' : 'text-ink hover:bg-ink/5',
                    )}
                  >
                    <Layers
                      aria-hidden="true"
                      className={cx('size-[18px]', on ? 'text-brand' : 'text-ink-muted')}
                    />
                    <span className="flex-1 truncate">{l.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          {canAdd && (
            <button
              type="button"
              aria-busy={adding || undefined}
              disabled={adding}
              onClick={onAdd}
              className="focus-ring mt-1 flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-[15px] font-medium text-brand transition-colors duration-150 ease-out hover:bg-brand-wash disabled:cursor-wait disabled:opacity-60"
            >
              <Plus aria-hidden="true" className="size-[18px]" strokeWidth={2.25} />
              Agregar planta
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Ambientes de la planta con su superficie; el elegido queda marcado. */
export function ZoneList({
  zones,
  selectedId,
  onPick,
  disabled,
}: {
  zones: readonly ZoneRow[]
  selectedId: string | null
  onPick: (id: string) => void
  disabled?: boolean
}) {
  if (zones.length === 0) {
    return (
      <p className="px-1.5 pb-1 pt-0.5 text-[13px] leading-snug text-ink-muted">
        Todavía no hay ambientes. Marca uno con Estructura › Ambiente.
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {zones.map((z) => {
        const on = z.id === selectedId
        return (
          <li key={z.id}>
            <button
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onPick(z.id)}
              className={cx(
                'focus-ring flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 text-[15px] transition-colors duration-150 ease-out disabled:cursor-default',
                on ? 'bg-brand-wash font-semibold text-ink' : 'text-ink hover:bg-ink/5',
              )}
            >
              <SquareDashed
                aria-hidden="true"
                className={cx('size-[19px] shrink-0', on ? 'text-brand' : 'text-ink-muted')}
                strokeWidth={1.9}
              />
              <span className="min-w-0 flex-1 truncate text-left">{z.name}</span>
              <span className="whitespace-nowrap text-[13px] font-medium tabular-nums text-ink-muted">{z.area}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Panel izquierdo del modo Editar y del modo Ver: planta activa + ambientes con sus m². */
export function LevelPanel({
  picker,
  zones,
}: {
  picker: ComponentProps<typeof LevelPicker>
  zones: ComponentProps<typeof ZoneList>
}) {
  return (
    <aside
      aria-label="Nivel y ambientes"
      className={cx(FLOAT, 'absolute left-5 top-[88px] z-10 w-[268px] rounded-[26px] p-3.5')}
    >
      <LevelPicker {...picker} />
      <h2 className="px-1.5 pb-1.5 pt-4 text-xs font-semibold text-ink-muted">Ambientes</h2>
      <ZoneList {...zones} />
    </aside>
  )
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-level-panel shell-boundaries`
Expected: PASS (`shell-level-panel`: 10 pruebas: LevelPicker 6, ZoneList y LevelPanel 4).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/ui/LevelPanel.tsx apps/web/test/shell-level-panel.test.tsx
git commit -m "feat(editor): panel de plantas y ambientes del shell" -- apps/web/src/editor/shell/ui/LevelPanel.tsx apps/web/test/shell-level-panel.test.tsx
```

---

### Task 1g: Catálogo de muebles (presentacional)

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/ui/FurnitureCatalog.tsx`
- Test: `apps/web/test/shell-furniture-catalog.test.tsx`

**Interfaces:**
- Consumes: `Badge`, `ChipRow`, `FLOAT`, `SIDE_PANEL` de `./primitives` (Tarea 1b); `cx`.
- Produces (`src/editor/shell/ui/FurnitureCatalog.tsx`):
  - `type CatalogChip = { id: string; label: string }`, `type CatalogCard = { id: string; name: string; size: string; thumbnail: string; selected: boolean }`.
  - `FurnitureCatalog(props: { query: string; onQuery: (query: string) => void; chips: readonly CatalogChip[]; chip: string; onChip: (id: string) => void; cards: readonly CatalogCard[]; onPick: (id: string) => void })`: `<aside aria-label="Muebles">` con buscador con etiqueta, las categorías (una `ChipRow`), el botón "Subir mi mueble" deshabilitado con "Pronto" (D4) y la grilla de tarjetas (miniatura, nombre y medidas ya formateadas); la tarjeta del mueble que se está colocando lleva `aria-pressed`; sin resultados lo dice en castellano.

De la maqueta (`FurniturePanel.tsx`) se quitan el filtro SVG `#mq-alpha` (las miniaturas nuevas ya son transparentes, Tarea 7g) y los datos de ejemplo; las categorías usan la `ChipRow` común en lugar de botones propios y el marco es `SIDE_PANEL`, el mismo del panel de materiales. Qué muebles hay, sus nombres en castellano y cómo se filtran lo resuelven las Tareas 7a a 7d.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-furniture-catalog.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FurnitureCatalog } from '../src/editor/shell/ui/FurnitureCatalog'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => {}

describe('FurnitureCatalog', () => {
  const CHIPS = [
    { id: 'todos', label: 'Todos' },
    { id: 'estar', label: 'Estar' },
  ]
  const CARDS = [
    { id: 'sofa', name: 'Sofá', size: '2,06 × 1,01 m', thumbnail: '/items/sofa/thumbnail.webp', selected: false },
    { id: 'cactus', name: 'Cactus', size: '0,34 × 0,27 m', thumbnail: '/items/cactus/thumbnail.webp', selected: true },
  ]
  const render = (cards = CARDS, query = '') =>
    renderToStaticMarkup(
      <FurnitureCatalog query={query} onQuery={noop} chips={CHIPS} chip="estar" onChip={noop} cards={cards} onPick={noop} />,
    )

  it('tiene título, buscador con etiqueta, categorías y el botón "Subir mi mueble" deshabilitado con "Pronto"', () => {
    const markup = render()
    expect(markup).toContain('aria-label="Muebles"')
    expect(markup).toContain('type="search"')
    expect(markup).toContain('Buscar muebles')
    expect(markup).toContain('placeholder="Buscar sofá, cama, mesa…"')
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*Subir mi mueble[\s\S]*Pronto/)
  })

  it('las categorías marcan la elegida y cada tarjeta muestra miniatura, nombre y medidas', () => {
    const markup = render()
    const chips = [...markup.matchAll(/aria-pressed="(true|false)"[^>]*>([^<]+)<\/button>/g)]
    expect(chips.map((m) => [m[1], m[2]])).toEqual([['false', 'Todos'], ['true', 'Estar']])
    expect(markup).toContain('src="/items/sofa/thumbnail.webp"')
    expect(markup).toContain('2,06 × 1,01 m')
    expect(markup.match(/<li>/g)).toHaveLength(2)
  })

  it('la tarjeta del mueble que se está colocando queda marcada', () => {
    const markup = render()
    expect(markup.match(/<li><button[^>]*aria-pressed="true"/g)).toHaveLength(1)
  })

  it('sin resultados lo dice y no dibuja una lista vacía', () => {
    const markup = render([], 'zzz')
    expect(textOf(markup)).toContain('No encontramos muebles con ese nombre.')
    expect(markup).not.toContain('<li>')
    expect(markup).toContain('value="zzz"')
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-furniture-catalog`
Expected: FAIL — `Error: Cannot find module '../src/editor/shell/ui/FurnitureCatalog'`.

- [ ] **Paso 2: Escribir el catálogo de muebles**

Create `apps/web/src/editor/shell/ui/FurnitureCatalog.tsx`:

```tsx
import { Search, Upload } from 'lucide-react'
import { cx } from '@/lib/cx'
import { Badge, ChipRow, FLOAT, SIDE_PANEL } from './primitives'

export type CatalogChip = { id: string; label: string }
export type CatalogCard = {
  id: string
  name: string
  size: string
  thumbnail: string
  selected: boolean
}

function Card({ card, onPick }: { card: CatalogCard; onPick: (id: string) => void }) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={card.selected}
        onClick={() => onPick(card.id)}
        className={cx(
          'focus-ring group flex w-full cursor-pointer flex-col gap-2 rounded-[20px] bg-white p-2 text-left transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5',
          card.selected
            ? 'shadow-[0_0_0_2px_#0B1F4D]'
            : 'shadow-[0_1px_2px_rgb(11_31_77/0.06)] hover:shadow-[0_1px_2px_rgb(11_31_77/0.06),0_8px_20px_rgb(11_31_77/0.1)]',
        )}
      >
        <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-[14px] bg-[#F1F5FC]">
          {/* biome-ignore lint/performance/noImgElement: miniaturas propias de 512 px, ya optimizadas (webp con fondo transparente) */}
          <img
            src={card.thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 size-full object-contain p-1.5"
          />
        </span>
        <span className="px-1 pb-1">
          <span className="block text-[14px] font-semibold leading-tight text-ink">{card.name}</span>
          <span className="block text-[12px] tabular-nums leading-tight text-ink-muted">{card.size}</span>
        </span>
      </button>
    </li>
  )
}

/** Panel izquierdo del modo Muebles: búsqueda, categorías, "Subir mi mueble" (Pronto) y la grilla de tarjetas. */
export function FurnitureCatalog({
  query,
  onQuery,
  chips,
  chip,
  onChip,
  cards,
  onPick,
}: {
  query: string
  onQuery: (query: string) => void
  chips: readonly CatalogChip[]
  chip: string
  onChip: (id: string) => void
  cards: readonly CatalogCard[]
  onPick: (id: string) => void
}) {
  return (
    <aside aria-label="Muebles" className={cx(FLOAT, SIDE_PANEL)}>
      <h2 className="font-display text-[22px] font-semibold leading-none">Muebles</h2>
      <label className="relative mt-3.5 block">
        <span className="sr-only">Buscar muebles</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Buscar sofá, cama, mesa…"
          className="focus-ring h-11 w-full rounded-[14px] bg-ink/5 pl-10 pr-3 text-[14px] text-ink outline-none placeholder:text-ink-muted"
        />
      </label>
      <div className="mt-3">
        <ChipRow title="Categorías" chips={chips.map((c) => ({ value: c.id, label: c.label }))} active={chip} onPick={onChip} />
      </div>
      <div className="relative mt-3.5">
        <button
          type="button"
          disabled
          className="flex h-11 w-full items-center gap-2.5 rounded-[14px] bg-ink/5 px-3.5 text-[14px] font-semibold text-ink/45"
        >
          <Upload aria-hidden="true" className="size-[18px]" strokeWidth={2} />
          Subir mi mueble
          <Badge className="ml-auto">Pronto</Badge>
        </button>
      </div>
      {cards.length === 0 ? (
        <p className="mt-4 text-[14px] text-ink-muted">No encontramos muebles con ese nombre.</p>
      ) : (
        <ul className="shell-scroll mt-3.5 grid min-h-0 flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto pb-1 pr-0.5">
          {cards.map((card) => (
            <Card key={card.id} card={card} onPick={onPick} />
          ))}
        </ul>
      )}
    </aside>
  )
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-furniture-catalog shell-primitives shell-boundaries`
Expected: PASS (`shell-furniture-catalog`: 4 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/ui/FurnitureCatalog.tsx apps/web/test/shell-furniture-catalog.test.tsx
git commit -m "feat(editor): catálogo de muebles del shell (presentacional)" -- apps/web/src/editor/shell/ui/FurnitureCatalog.tsx apps/web/test/shell-furniture-catalog.test.tsx
```

---

### Task 1h: Ficha de propiedades (presentacional)

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/ui/PropertiesCard.tsx`
- Test: `apps/web/test/shell-properties-card.test.tsx`

**Interfaces:**
- Consumes: `FLOAT`, `IconTile` de `./primitives` (Tarea 1b); `cx`; `lucide-react` 1.55.0.
- Produces (`src/editor/shell/ui/PropertiesCard.tsx`):
  - `type FieldOption = { value: string; label: string; disabled?: boolean }`.
  - `type FieldView = { kind: 'number' | 'text'; id: string; label: string; value: string } | { kind: 'select'; id: string; label: string; value: string; options: readonly FieldOption[] } | { kind: 'swatch'; id: string; label: string; value: string; options: readonly (FieldOption & { color: string })[] } | { kind: 'readonly'; id: string; label: string; value: string }`.
  - `PropertiesCard(props: { title: string; subtitle?: string; icon: LucideIcon; fields: readonly FieldView[]; onCommit: (fieldId: string, raw: string) => void; onClose: () => void; onDuplicate?: () => void; onDelete: () => void; confirmMessage?: string | null; onConfirmDelete: () => void; onCancelDelete: () => void })`: `<aside aria-label="Propiedades">`; los campos de texto y número confirman al salir del campo o con Enter (Esc descarta); el valor ya llega formateado (`"0,90 m"`); el tipo es un `<select>` nativo, operable con teclado, de 44 px de alto; los colores son un grupo de botones con nombre; Duplicar solo aparece si se pasa `onDuplicate`; con `confirmMessage` las acciones se reemplazan por el aviso con Cancelar y Borrar.

De la maqueta (`PropertiesPanel.tsx`) se quitan los valores fijos y el campo de lista falso. Qué campos tiene cada tipo de elemento, sus límites y cómo se escriben los metros lo resuelven las Tareas 9a a 9d; esta pieza solo dibuja lo que recibe.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-properties-card.test.tsx`:

```tsx
import { DoorOpen } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PropertiesCard } from '../src/editor/shell/ui/PropertiesCard'

const NO_EMOJI = /\p{Extended_Pictographic}/u
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => {}
const FIELDS = [
  { kind: 'select', id: 'doorType', label: 'Tipo', value: 'hinged', options: [{ value: 'hinged', label: 'Batiente' }, { value: 'double', label: 'Doble' }] },
  { kind: 'number', id: 'width', label: 'Ancho', value: '0,90 m' },
  { kind: 'text', id: 'name', label: 'Nombre', value: 'Puerta 1' },
  { kind: 'swatch', id: 'color', label: 'Color', value: '#1F5FE0', options: [{ value: '#1F5FE0', label: 'Cobalto', color: '#1F5FE0' }, { value: '#FFB02E', label: 'Sol', color: '#FFB02E' }] },
  { kind: 'readonly', id: 'area', label: 'Superficie', value: '15,2 m²' },
] as const

const render = (extra: Partial<Parameters<typeof PropertiesCard>[0]> = {}) =>
  renderToStaticMarkup(
    <PropertiesCard
      title="Puerta"
      subtitle="Batiente de 1 hoja"
      icon={DoorOpen}
      fields={FIELDS}
      onCommit={noop}
      onClose={noop}
      onDelete={noop}
      onConfirmDelete={noop}
      onCancelDelete={noop}
      {...extra}
    />,
  )


describe('PropertiesCard', () => {
  it('muestra el título, el subtítulo y un botón de cerrar con nombre', () => {
    const markup = render()
    expect(markup).toMatch(/<h2[^>]*>Puerta<\/h2>/)
    expect(markup).toContain('Batiente de 1 hoja')
    expect(markup).toContain('aria-label="Cerrar propiedades"')
    expect(markup).toContain('aria-label="Propiedades"')
  })

  it('cada campo tiene su etiqueta asociada por id y el valor ya formateado', () => {
    const markup = render()
    for (const id of ['doorType', 'width', 'name', 'area']) {
      expect(markup, id).toContain(`for="prop-${id}"`)
      expect(markup, id).toContain(`id="prop-${id}"`)
    }
    expect(markup).toContain('value="0,90 m"')
    expect(markup).toContain('inputMode="decimal"')
    expect(markup).toMatch(/<option value="hinged" selected="">Batiente<\/option>|<option selected="" value="hinged">Batiente<\/option>/)
  })

  it('los colores son un grupo de botones con nombre y el elegido marcado', () => {
    const markup = render()
    expect(markup).toMatch(/<legend[^>]*>Color<\/legend>/)
    const swatches = [...markup.matchAll(/<button[^>]*aria-label="(Cobalto|Sol)"[^>]*>/g)]
    expect(swatches.map((m) => [m[1], /aria-pressed="true"/.test(m[0])])).toEqual([['Cobalto', true], ['Sol', false]])
  })

  it('Duplicar solo aparece si se pasa onDuplicate; Borrar siempre', () => {
    expect(textOf(render())).not.toContain('Duplicar')
    expect(textOf(render({ onDuplicate: noop }))).toContain('Duplicar')
    expect(textOf(render())).toContain('Borrar')
  })

  it('al confirmar el borrado reemplaza las acciones por el aviso con Cancelar y Borrar', () => {
    const markup = render({ onDuplicate: noop, confirmMessage: 'Este muro tiene 2 aberturas que también se borrarán.' })
    expect(markup).toContain('role="alert"')
    expect(textOf(markup)).toContain('Este muro tiene 2 aberturas que también se borrarán.')
    expect(textOf(markup)).toContain('Cancelar')
    expect(textOf(markup)).not.toContain('Duplicar')
  })

  it('no usa emojis', () => {
    expect(render({ onDuplicate: noop })).not.toMatch(NO_EMOJI)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-properties-card`
Expected: FAIL — `Error: Cannot find module '../src/editor/shell/ui/PropertiesCard'`.

- [ ] **Paso 2: Escribir la ficha de propiedades**

Create `apps/web/src/editor/shell/ui/PropertiesCard.tsx`:

```tsx
import { Copy, type LucideIcon, Trash2, X } from 'lucide-react'
import { cx } from '@/lib/cx'
import { FLOAT, IconTile } from './primitives'

export type FieldOption = { value: string; label: string; disabled?: boolean }
export type FieldView =
  | { kind: 'number' | 'text'; id: string; label: string; value: string }
  | { kind: 'select'; id: string; label: string; value: string; options: readonly FieldOption[] }
  | {
      kind: 'swatch'
      id: string
      label: string
      value: string
      options: readonly (FieldOption & { color: string })[]
    }
  | { kind: 'readonly'; id: string; label: string; value: string }

const CONTROL =
  'focus-ring h-11 w-[156px] rounded-[14px] bg-ink/5 px-3.5 text-[14px] font-medium text-ink outline-none transition-colors duration-150 ease-out hover:bg-ink/8'

function FieldRow({ field, onCommit }: { field: FieldView; onCommit: (id: string, raw: string) => void }) {
  const id = `prop-${field.id}`
  if (field.kind === 'swatch') {
    return (
      <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0 py-1">
        <legend className="mb-1 text-[14px] text-ink-muted">{field.label}</legend>
        <div className="flex gap-1">
          {field.options.map((o) => {
            const on = o.value === field.value
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                aria-label={o.label}
                onClick={() => onCommit(field.id, o.value)}
                className="focus-ring grid size-11 cursor-pointer place-items-center rounded-full"
              >
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: o.color }}
                  className={cx('size-7 rounded-full', on ? 'ring-2 ring-ink ring-offset-2' : 'ring-1 ring-ink/15')}
                />
              </button>
            )
          })}
        </div>
      </fieldset>
    )
  }
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <label htmlFor={id} className="text-[14px] text-ink-muted">
        {field.label}
      </label>
      {field.kind === 'select' && (
        <select
          id={id}
          value={field.value}
          onChange={(event) => onCommit(field.id, event.target.value)}
          className={cx(CONTROL, 'cursor-pointer')}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {(field.kind === 'number' || field.kind === 'text') && (
        <input
          key={`${field.id}:${field.value}`}
          id={id}
          type="text"
          inputMode={field.kind === 'number' ? 'decimal' : 'text'}
          defaultValue={field.value}
          autoComplete="off"
          spellCheck={false}
          onBlur={(event) => {
            if (event.currentTarget.value !== field.value) onCommit(field.id, event.currentTarget.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') event.currentTarget.value = field.value
            if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur()
          }}
          className={cx(CONTROL, field.kind === 'number' && 'tabular-nums')}
        />
      )}
      {field.kind === 'readonly' && (
        <output id={id} className="w-[156px] px-3.5 text-[14px] font-medium tabular-nums text-ink">
          {field.value}
        </output>
      )}
    </div>
  )
}

/** Ficha de propiedades del elemento elegido: campos, Duplicar (si aplica) y Borrar con confirmación opcional. */
export function PropertiesCard({
  title,
  subtitle,
  icon,
  fields,
  onCommit,
  onClose,
  onDuplicate,
  onDelete,
  confirmMessage,
  onConfirmDelete,
  onCancelDelete,
}: {
  title: string
  subtitle?: string
  icon: LucideIcon
  fields: readonly FieldView[]
  onCommit: (fieldId: string, raw: string) => void
  onClose: () => void
  onDuplicate?: () => void
  onDelete: () => void
  confirmMessage?: string | null
  onConfirmDelete: () => void
  onCancelDelete: () => void
}) {
  const BUTTON =
    'focus-ring inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-colors duration-150 ease-out'
  return (
    <aside
      aria-label="Propiedades"
      className={cx(
        FLOAT,
        'shell-scroll absolute right-5 top-[88px] z-10 max-h-[calc(100dvh-200px)] w-[316px] overflow-y-auto rounded-[26px] p-4',
      )}
    >
      <div className="flex items-center gap-3">
        <IconTile icon={icon} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[19px] font-semibold leading-tight">{title}</h2>
          {subtitle && <p className="truncate text-[13px] leading-tight text-ink-muted">{subtitle}</p>}
        </div>
        <button
          type="button"
          aria-label="Cerrar propiedades"
          onClick={onClose}
          className="focus-ring grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink-muted transition-colors duration-150 ease-out hover:bg-ink/6 hover:text-ink"
        >
          <X aria-hidden="true" className="size-5" strokeWidth={2} />
        </button>
      </div>
      <div className="flex flex-col gap-1.5 pb-4 pt-3.5">
        {fields.map((f) => (
          <FieldRow key={f.id} field={f} onCommit={onCommit} />
        ))}
      </div>
      {confirmMessage ? (
        <div role="alert" className="rounded-[18px] bg-danger-wash p-3">
          <p className="text-[14px] font-medium leading-snug text-danger-ink">{confirmMessage}</p>
          <div className="mt-2.5 flex gap-2.5">
            <button type="button" onClick={onCancelDelete} className={cx(BUTTON, 'bg-white text-ink hover:bg-ink/6')}>
              Cancelar
            </button>
            <button type="button" onClick={onConfirmDelete} className={cx(BUTTON, 'bg-danger text-white hover:opacity-90')}>
              Borrar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2.5">
          {onDuplicate && (
            <button type="button" onClick={onDuplicate} className={cx(BUTTON, 'bg-ink/6 text-ink hover:bg-ink/10')}>
              <Copy aria-hidden="true" className="size-[17px]" strokeWidth={2} />
              Duplicar
            </button>
          )}
          <button type="button" onClick={onDelete} className={cx(BUTTON, 'bg-danger-wash text-danger-ink hover:bg-[#fbdcdc]')}>
            <Trash2 aria-hidden="true" className="size-[17px]" strokeWidth={2} />
            Borrar
          </button>
        </div>
      )}
    </aside>
  )
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-properties-card shell-boundaries`
Expected: PASS (`shell-properties-card`: 6 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/ui/PropertiesCard.tsx apps/web/test/shell-properties-card.test.tsx
git commit -m "feat(editor): ficha de propiedades del shell (presentacional)" -- apps/web/src/editor/shell/ui/PropertiesCard.tsx apps/web/test/shell-properties-card.test.tsx
```

---

### Task 1i: Controles de Vista 3D (presentacionales)

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/ui/ViewControls.tsx`
- Test: `apps/web/test/shell-view-controls.test.tsx`

**Interfaces:**
- Consumes: `ChipRow`, `FLOAT` de `./primitives` (Tarea 1b); `SoonButton` de `./status` (1c); `cx`; `lucide-react` 1.55.0.
- Produces (`src/editor/shell/ui/ViewControls.tsx`):
  - `type ChipGroup = { id: string; title: string; chips: readonly { value: string; label: string }[]; active: string }` y `ViewPanel(props: { groups: readonly ChipGroup[]; onPick: (groupId: string, value: string) => void })`: `<aside aria-label="Vista 3D">` con un grupo de opciones por tema (Muros, Niveles y, si Pascal lo permite, Cámara y Estilo), cada uno con su `ChipRow`.
  - `type ViewAction = { id: string; label: string; icon: LucideIcon }` y `ViewBar(props: { actions: readonly ViewAction[]; onAction: (id: string) => void })`: la barra flotante inferior del modo Ver (`role="toolbar"`, nombre "Cámara"), botones de 64 × 100 px.
  - `ShareRender()`: "Compartir" y "Renderizar" como `SoonButton`, deshabilitados con "Pronto" (criterio 11 del spec).

De la maqueta (`View3DPanels.tsx`) se quitan los valores fijos y el marcado "a confirmar" de Cámara y Estilo (decisión D7: según el spike de la Tarea 0b esos grupos se muestran o se ocultan, nunca "a confirmar"). Qué grupos hay y qué hace cada opción en Pascal lo resuelven las Tareas 10a a 10c.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-view-controls.test.tsx`:

```tsx
import { Footprints, RotateCcw } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ShareRender, ViewBar, ViewPanel } from '../src/editor/shell/ui/ViewControls'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => {}

describe('controles de Vista 3D', () => {
  it('el panel muestra un grupo de opciones por tema, con la activa marcada', () => {
    const markup = renderToStaticMarkup(
      <ViewPanel
        groups={[{ id: 'walls', title: 'Muros', chips: [{ value: 'up', label: 'Completos' }, { value: 'cutaway', label: 'Cortados' }], active: 'cutaway' }]}
        onPick={noop}
      />,
    )
    expect(markup).toContain('aria-label="Vista 3D"')
    expect(textOf(markup)).toBe('Vista 3DMurosMurosCompletosCortados')
    expect([...markup.matchAll(/aria-pressed="(true|false)"/g)].map((m) => m[1])).toEqual(['false', 'true'])
  })

  it('la barra de cámara es una barra de herramientas con un botón por acción', () => {
    const markup = renderToStaticMarkup(
      <ViewBar actions={[{ id: 'orbit-left', label: 'Girar izq.', icon: RotateCcw }, { id: 'walk', label: 'Recorrer', icon: Footprints }]} onAction={noop} />,
    )
    expect(markup).toContain('role="toolbar"')
    expect(markup).toContain('aria-label="Cámara"')
    expect(textOf(markup)).toBe('Girar izq.Recorrer')
    expect(markup).toContain('h-16 w-[100px]')
  })

  it('Compartir y Renderizar se ven deshabilitados con "Pronto"', () => {
    const markup = renderToStaticMarkup(<ShareRender />)
    expect(markup.match(/<button[^>]*disabled=""/g)).toHaveLength(2)
    expect(textOf(markup)).toContain('Compartir')
    expect(textOf(markup)).toContain('Renderizar')
    expect(markup.match(/Pronto/g)).toHaveLength(2)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-view-controls`
Expected: FAIL — `Error: Cannot find module '../src/editor/shell/ui/ViewControls'`.

- [ ] **Paso 2: Escribir los controles de Vista 3D**

Create `apps/web/src/editor/shell/ui/ViewControls.tsx`:

```tsx
import { Share2, Sparkles, type LucideIcon } from 'lucide-react'
import { cx } from '@/lib/cx'
import { ChipRow, FLOAT } from './primitives'
import { SoonButton } from './status'

export type ChipGroup = {
  id: string
  title: string
  chips: readonly { value: string; label: string }[]
  active: string
}


/** Panel derecho del modo Ver: un grupo de opciones por tema (Muros, Niveles y, si Pascal lo permite, Cámara y Estilo). */
export function ViewPanel({
  groups,
  onPick,
}: {
  groups: readonly ChipGroup[]
  onPick: (groupId: string, value: string) => void
}) {
  return (
    <aside
      aria-label="Vista 3D"
      className={cx(FLOAT, 'absolute right-5 top-[88px] z-10 w-[316px] rounded-[26px] p-4')}
    >
      <h2 className="font-display text-[19px] font-semibold leading-none">Vista 3D</h2>
      <div className="mt-3.5 flex flex-col gap-3">
        {groups.map((g) => (
          <section key={g.id}>
            <h3 className="mb-2 text-[13px] font-semibold text-ink-muted">{g.title}</h3>
            <ChipRow title={g.title} chips={g.chips} active={g.active} onPick={(value) => onPick(g.id, value)} />
          </section>
        ))}
      </div>
    </aside>
  )
}

export type ViewAction = { id: string; label: string; icon: LucideIcon }

/** Barra flotante inferior del modo Ver: girar, vista superior y recorrer. */
export function ViewBar({
  actions,
  onAction,
}: {
  actions: readonly ViewAction[]
  onAction: (id: string) => void
}) {
  return (
    <div
      role="toolbar"
      aria-label="Cámara"
      className={cx(
        FLOAT,
        'absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-[28px] p-2',
      )}
    >
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onAction(a.id)}
          className="focus-ring flex h-16 w-[100px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[20px] text-[12.5px] font-medium text-ink transition-colors duration-150 ease-out hover:bg-ink/6"
        >
          <a.icon aria-hidden="true" className="size-[22px]" strokeWidth={1.9} />
          {a.label}
        </button>
      ))}
    </div>
  )
}

/** Compartir y Renderizar: visibles pero deshabilitados, con "Pronto". */
export function ShareRender() {
  return (
    <div className="absolute bottom-6 right-5 z-10 flex items-center gap-3">
      <SoonButton icon={Share2} label="Compartir" />
      <SoonButton icon={Sparkles} label="Renderizar" tone="primary" />
    </div>
  )
}
```

Esta pieza ya no define `ChipRow`: `ViewPanel` usa la de `./primitives` (Tarea 1b), importada arriba con `FLOAT`.

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-view-controls shell-boundaries`
Expected: PASS (`shell-view-controls`: 3 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/ui/ViewControls.tsx apps/web/test/shell-view-controls.test.tsx
git commit -m "feat(editor): controles de Vista 3D del shell (presentacionales)" -- apps/web/src/editor/shell/ui/ViewControls.tsx apps/web/test/shell-view-controls.test.tsx
```

---

### Task 2a: Tema claro de Madori (1 de 2): luminancia y contraste, tokens y sombras

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/e2e/support/theme.ts`
- Modify: `apps/web/app/globals.css`, `apps/web/app/elevation.css`
- Test: `apps/web/test/theme-luminance.test.ts`, `apps/web/test/theme.test.ts`

**Interfaces:**
- Consumes: los 24 tokens de `:root` de shadcn de `globals.css` y las sombras de `elevation.css` (los que Pascal lee para sus diálogos, el plano 2D y el cargador).
- Produces:
  - `luminanceOf(css: string): number | null` y `contrastRatio(a: string, b: string): number | null` en `e2e/support/theme.ts` (aceptan `#rrggbb`, `rgb()`, `rgba()`, `color(srgb …)`, `oklab()` y `oklch()`; lo translúcido se mezcla con negro: es el peor caso para "no hay fondos oscuros"). Las usan las pruebas unitarias de esta tarea y la prueba en navegador de la 2b (criterio 9 del spec).
  - Los tokens de `:root` en hexadecimal con la paleta Madori (Noche `#0B1F4D` como tinta, Cobalto `#1F5FE0` como acción primaria, Alba `#DCE6FF` como fondo suave, `#EEF2F8` como lienzo), `--radius` de 0,75 rem, la variable `--font-barlow` (las clases `font-barlow` de Pascal pasan a usar DM Sans) y el bloque `.dark` de las sombras apagado.

Lo que Pascal sigue pintando lee esos tokens. Pascal pone la clase `dark` en `<body>` y en la raíz de su layout, así que las variantes `dark:` no se pueden apagar: **se pintan los tokens en claro** y se anula el bloque `.dark` de las sombras (que dibujaba bordes blancos internos). Aplicar la escena `studio`, la unidad métrica y las fuentes en `<body>` es la Tarea 2b.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/theme-luminance.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { contrastRatio, luminanceOf } from '../e2e/support/theme'

describe('luminanceOf', () => {
  it('entiende hexadecimal, rgb, rgba, color(srgb) y oklch', () => {
    expect(luminanceOf('#ffffff')).toBeCloseTo(1, 3)
    expect(luminanceOf('#000000')).toBe(0)
    expect(luminanceOf('rgb(255, 255, 255)')).toBeCloseTo(1, 3)
    expect(luminanceOf('color(srgb 1 1 1)')).toBeCloseTo(1, 3)
    expect(luminanceOf('oklch(0.998 0 0)')).toBeGreaterThan(0.98)
    expect(luminanceOf('rgb(11, 31, 77)')).toBeLessThan(0.03)
  })

  it('mezcla lo translúcido con negro (peor caso) y descarta lo transparente', () => {
    const half = luminanceOf('rgba(255, 255, 255, 0.5)') ?? 0
    expect(half).toBeGreaterThan(0.15)
    expect(half).toBeLessThan(0.3)
    expect(luminanceOf('rgba(0, 0, 0, 0)')).toBeNull()
    expect(luminanceOf('transparent')).toBeNull()
  })

  it('un panel oscuro translúcido sigue contando como oscuro', () => {
    expect(luminanceOf('rgba(10, 14, 27, 0.95)') ?? 1).toBeLessThan(0.02)
  })
})

describe('contrastRatio', () => {
  it('Noche sobre blanco pasa 7:1 y blanco sobre blanco es 1:1', () => {
    expect(contrastRatio('#0b1f4d', '#ffffff') ?? 0).toBeGreaterThan(14)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })
})
```

Create `apps/web/test/theme.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrastRatio, luminanceOf } from '../e2e/support/theme'

const globals = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
const elevation = readFileSync(new URL('../app/elevation.css', import.meta.url), 'utf8')
const rootBlock = /:root\s*\{([^}]*)\}/.exec(globals)?.[1] ?? ''
const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(rootBlock)?.[1]

const SURFACES = ['background', 'card', 'popover', 'sidebar', 'secondary', 'muted', 'accent']
const TEXTS = ['foreground', 'card-foreground', 'popover-foreground', 'sidebar-foreground', 'secondary-foreground', 'accent-foreground', 'sidebar-accent-foreground']
const ALL = [...SURFACES, ...TEXTS, 'primary', 'primary-foreground', 'destructive', 'border', 'input', 'ring', 'sidebar-border', 'sidebar-accent', 'muted-foreground']

describe('tema claro de Madori (los 24 tokens de :root)', () => {
  it('cada token de color está definido en hexadecimal y --radius es de 0,75 rem o más', () => {
    for (const name of ALL) expect(token(name), name).toBeDefined()
    const radius = Number(/--radius:\s*([\d.]+)rem/.exec(rootBlock)?.[1])
    expect(radius).toBeGreaterThanOrEqual(0.75)
  })

  it('ninguna superficie es oscura y todo texto es oscuro sobre ellas (nada de fondos oscuros)', () => {
    for (const name of SURFACES) expect(luminanceOf(token(name) ?? '') ?? -1, name).toBeGreaterThan(0.6)
    for (const name of TEXTS) expect(luminanceOf(token(name) ?? '') ?? 2, name).toBeLessThan(0.05)
  })

  it('el texto pasa 7:1 sobre el fondo y el gris de apoyo pasa 4,5:1 sobre el fondo del lienzo', () => {
    expect(contrastRatio(token('foreground') ?? '', token('background') ?? '') ?? 0).toBeGreaterThanOrEqual(7)
    expect(contrastRatio(token('muted-foreground') ?? '', token('muted') ?? '') ?? 0).toBeGreaterThanOrEqual(4.5)
  })

  it('la acción primaria es el Cobalto con texto blanco y el foco usa el mismo Cobalto', () => {
    expect(token('primary')?.toLowerCase()).toBe('#1f5fe0')
    expect(token('primary-foreground')?.toLowerCase()).toBe('#ffffff')
    expect(token('ring')?.toLowerCase()).toBe('#1f5fe0')
  })
})

describe('lo que Pascal sigue usando', () => {
  it('define la fuente de las clases font-barlow con la de la interfaz (DM Sans)', () => {
    expect(globals).toMatch(/@theme inline\s*\{[^}]*--font-barlow:\s*var\(--font-dm\)/)
  })

  it('el bloque .dark de las sombras ya no pinta bordes blancos internos', () => {
    expect(elevation).not.toMatch(/^\.dark\s*\{/m)
    expect(elevation).toContain('Madori no tiene modo oscuro')
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run theme`
Expected: FAIL — `theme-luminance`: `Cannot find module '../e2e/support/theme'`; `theme` también falla por la misma importación.

- [ ] **Paso 2: Escribir los ayudantes de luminancia y contraste**

Create `apps/web/e2e/support/theme.ts`:

```ts
const channel = (value: number) => {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminance = (r: number, g: number, b: number) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const alphaOf = (raw: string | undefined) => (raw === undefined ? 1 : raw.endsWith('%') ? Number.parseFloat(raw) / 100 : Number.parseFloat(raw))

/**
 * Luminancia relativa (0 = negro, 1 = blanco) de un color CSS. Lo translúcido se mezcla con negro: es el peor caso para
 * afirmar "este fondo no es oscuro". `null` si el color es del todo transparente o no se entiende.
 */
export function luminanceOf(css: string): number | null {
  const text = css.trim().toLowerCase()
  const hex = /^#([0-9a-f]{6})$/.exec(text)
  if (hex) {
    const n = Number.parseInt(hex[1] ?? '', 16)
    return luminance((n >> 16) & 255, (n >> 8) & 255, n & 255)
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(text)
  if (rgb) {
    const alpha = alphaOf(rgb[4])
    if (alpha === 0) return null
    return luminance(Number(rgb[1]) * alpha, Number(rgb[2]) * alpha, Number(rgb[3]) * alpha)
  }
  const srgb = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(text)
  if (srgb) {
    const alpha = alphaOf(srgb[4])
    if (alpha === 0) return null
    return luminance(Number(srgb[1]) * 255 * alpha, Number(srgb[2]) * 255 * alpha, Number(srgb[3]) * 255 * alpha)
  }
  const ok = /^ok(?:lab|lch)\(\s*([\d.]+%?)[^/)]*(?:\/\s*([\d.]+%?))?\s*\)$/.exec(text)
  if (ok) {
    const alpha = alphaOf(ok[2])
    if (alpha === 0) return null
    const lightness = alphaOf(ok[1])
    return lightness ** 3 * alpha
  }
  return null
}

/** Relación de contraste WCAG entre dos colores (1 a 21); `null` si alguno no se entiende. */
export function contrastRatio(a: string, b: string): number | null {
  const la = luminanceOf(a)
  const lb = luminanceOf(b)
  if (la === null || lb === null) return null
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
```

Run: `pnpm --filter @interiores/web exec vitest run theme-luminance`
Expected: `theme-luminance` PASS (4 pruebas); `theme` FAIL en sus 6 pruebas, por ejemplo `AssertionError: background: expected undefined to be defined` (los tokens actuales son `oklch(...)` en gris neutro, no hexadecimales de la paleta) y `expected '@import "tailwindcss"…' not to match /^\.dark\s*\{/m`.

- [ ] **Paso 3: Pintar los tokens en claro, definir la fuente de Pascal y apagar el bloque `.dark`**

Modify `apps/web/app/globals.css`:

```diff
@@
-:root {
-  --radius: 0.625rem;
-  --background: oklch(0.998 0 0);
-  --foreground: oklch(0.145 0 0);
-  --card: oklch(0.998 0 0);
-  --card-foreground: oklch(0.145 0 0);
-  --popover: oklch(0.998 0 0);
-  --popover-foreground: oklch(0.145 0 0);
-  --primary: oklch(0.205 0 0);
-  --primary-foreground: oklch(0.985 0 0);
-  --secondary: oklch(0.97 0 0);
-  --secondary-foreground: oklch(0.205 0 0);
-  --muted: oklch(0.97 0 0);
-  --muted-foreground: oklch(0.556 0 0);
-  --accent: oklch(0.97 0 0);
-  --accent-foreground: oklch(0.205 0 0);
-  --destructive: oklch(0.577 0.245 27.325);
-  --border: oklch(0.922 0 0);
-  --input: oklch(0.922 0 0);
-  --ring: oklch(0.708 0 0);
-  --sidebar: oklch(0.985 0 0);
-  --sidebar-foreground: oklch(0.145 0 0);
-  --sidebar-border: oklch(0.922 0 0);
-  --sidebar-accent: oklch(0.97 0 0);
-  --sidebar-accent-foreground: oklch(0.205 0 0);
+/*
+ * Tokens de shadcn que Pascal usa para lo que el shell no reemplaza (diálogos, plano 2D, cargador): paleta Madori en claro.
+ * Noche #0B1F4D como tinta, Cobalto #1F5FE0 como acción primaria, Alba #DCE6FF como fondo suave y #EEF2F8 como lienzo.
+ * Pascal pone `dark` en <body>: no hay variantes oscuras que activar porque estos tokens no cambian con esa clase.
+ */
+:root {
+  --radius: 0.75rem;
+  --background: #ffffff;
+  --foreground: #0b1f4d;
+  --card: #ffffff;
+  --card-foreground: #0b1f4d;
+  --popover: #ffffff;
+  --popover-foreground: #0b1f4d;
+  --primary: #1f5fe0;
+  --primary-foreground: #ffffff;
+  --secondary: #dce6ff;
+  --secondary-foreground: #0b1f4d;
+  --muted: #eef2f8;
+  --muted-foreground: #5b6578;
+  --accent: #dce6ff;
+  --accent-foreground: #0b1f4d;
+  --destructive: #b42318;
+  --border: #d3dcee;
+  --input: #d3dcee;
+  --ring: #1f5fe0;
+  --sidebar: #eef2f8;
+  --sidebar-foreground: #0b1f4d;
+  --sidebar-border: #d3dcee;
+  --sidebar-accent: #dce6ff;
+  --sidebar-accent-foreground: #0b1f4d;
 }
@@
   --radius-xl: calc(var(--radius) + 4px);
+  /* Las clases `font-barlow` de Pascal usan la tipografía de la interfaz (DM Sans); la variable la pone `applyEditorTheme` en <body>. */
+  --font-barlow: var(--font-dm), ui-sans-serif, system-ui, sans-serif;
 }
```


Modify `apps/web/app/elevation.css`:

```diff
@@
-.dark {
+/* Madori no tiene modo oscuro (Pascal pone `dark` en <body> y en su raíz): este bloque, que pintaba bordes blancos internos,
+   queda inactivo y las sombras claras de :root valen siempre. */
+:root.madori-sin-modo-oscuro {
   --shadow-color: rgba(0, 0, 0, 0.18);
```


- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run theme app-shell-fonts`
Expected: PASS (`theme`: 6 pruebas; `theme-luminance`: 4; `app-shell-fonts`: 2 sigue verde porque `AppShell.tsx` conserva `variable: '--font-dm'`).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/app/globals.css apps/web/app/elevation.css apps/web/e2e/support/theme.ts apps/web/test/theme.test.ts apps/web/test/theme-luminance.test.ts
git commit -m "feat(editor): tokens claros de Madori para lo que Pascal sigue pintando y ayudantes de luminancia" -- apps/web/app/globals.css apps/web/app/elevation.css apps/web/e2e/support/theme.ts apps/web/test/theme.test.ts apps/web/test/theme-luminance.test.ts
```

---

### Task 2b: Tema claro de Madori (2 de 2): escena studio, metros y tipografía al montar el editor

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/pascal-bridge.ts` (por ahora solo `applyEditorTheme`; la Tarea 4e lo amplía al puente completo), `apps/web/e2e/tema.spec.ts`
- Modify: `apps/web/src/components/AppShell.tsx`, `apps/web/src/editor/ProjectEditor.tsx`, `apps/web/src/editor/e2e-hooks.ts`
- Test: `apps/web/e2e/tema.spec.ts`

**Interfaces:**
- Consumes: `useViewer` de `@pascal-app/editor` (`setSceneTheme(id)`, `setUnit('metric' | 'imperial')`; `viewer/dist/store/use-viewer.d.ts`); el tema `studio` (`appearance: 'light'`, `viewer/dist/lib/scene-themes.js`); las variables de `next/font` de `AppShell`; `luminanceOf` (Tarea 2a).
- Produces:
  - `appFontClasses: string` exportado por `@/components/AppShell` (las clases con `--font-dm`, `--font-bricolage` y `--font-fraunces`).
  - `applyEditorTheme(): () => void` en `src/editor/pascal-bridge.ts`: fija la escena `studio` y la unidad métrica, pone las clases de fuente en `<body>` (los portales de Pascal cuelgan de ahí) y devuelve la función que las quita.
  - Gancho `window.__e2e.theme(): { sceneTheme: string; unit: string }`.

Esta tarea cierra el criterio 9 del spec: aunque Pascal ponga `body.dark` al montar, ningún panel, barra o dock tiene fondo oscuro. El shell propio (barra, dock, paneles) se monta recién en la Tarea 4d; hasta entonces la prueba mira lo que Pascal dibuja (el `body`, la raíz de su layout y su dock, mientras exista).

- [ ] **Paso 1: Escribir la prueba en navegador (rojo)**

Create `apps/web/e2e/tema.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { createProjectViaUi } from './support/projects'
import { luminanceOf } from './support/theme'

type Hooks = { theme(): { sceneTheme: string; unit: string } }

test('el editor es claro aunque Pascal ponga body.dark, con escena studio, metros y la tipografía de Madori', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E tema ${Date.now()}`, template: null })
  // Pascal pone `dark` en <body> y en la raíz de su layout al montar: el tema no puede depender de que no lo haga.
  await expect(page.locator('body')).toHaveClass(/\bdark\b/)

  const surfaces = await page.evaluate(() => {
    const dock = document.querySelector('[data-guide-target="mode-select"]')?.closest('.fixed') ?? null
    const pick = (name: string, el: Element | null) => (el ? [{ name, color: getComputedStyle(el).backgroundColor }] : [])
    return [
      ...pick('body', document.body),
      ...pick('raíz del layout de Pascal', document.querySelector('div.dark.flex')),
      ...pick('dock de Pascal (si está)', dock),
    ]
  })
  expect(surfaces.length).toBeGreaterThanOrEqual(2)
  for (const { name, color } of surfaces) {
    expect(luminanceOf(color) ?? 1, `${name}: ${color}`).toBeGreaterThanOrEqual(0.6)
  }

  const shadows = await page.evaluate(() => ({
    root: getComputedStyle(document.documentElement).getPropertyValue('--shadow-color').trim(),
    dark: getComputedStyle(document.querySelector('div.dark.flex') as Element).getPropertyValue('--shadow-color').trim(),
  }))
  expect(shadows.dark).toBe(shadows.root)

  const theme = await page.evaluate(() => (window as unknown as { __e2e: Hooks }).__e2e.theme())
  expect(theme).toEqual({ sceneTheme: 'studio', unit: 'metric' })

  const font = await page.evaluate(() => {
    const probe = document.createElement('span')
    probe.className = 'font-barlow'
    document.body.appendChild(probe)
    const family = getComputedStyle(probe).fontFamily
    probe.remove()
    return family
  })
  expect(font).toContain('DM_Sans')
})
```


Run (Supabase local arriba: `pnpm db:start && pnpm db:env`): `pnpm --filter @interiores/web e2e e2e/tema.spec.ts`
Expected: FAIL — `TypeError: window.__e2e.theme is not a function`: los fondos y las sombras ya salen bien (Tarea 2a), pero el gancho que lee la escena y la unidad todavía no existe.

- [ ] **Paso 2: Exportar las clases de fuente y aplicar el tema al montar el editor**

Modify `apps/web/src/components/AppShell.tsx`:

```diff
@@
+/** Clases con las variables de fuente (DM Sans, Bricolage y Fraunces) para quien las necesite fuera de `.app-shell`, como el editor. */
+export const appFontClasses = `${dmSans.variable} ${bricolage.variable} ${fraunces.variable}`
+
 export function AppShell({
@@
-      className={`app-shell ${dmSans.variable} ${bricolage.variable} ${fraunces.variable} ${className}`}
+      className={`app-shell ${appFontClasses} ${className}`}
```


Create `apps/web/src/editor/pascal-bridge.ts`:

```ts
import { useViewer } from '@pascal-app/editor'
import { appFontClasses } from '@/components/AppShell'

/**
 * Único lugar de `src/editor` que toca los almacenes de Pascal para el shell (`src/editor/shell/` usa tipos propios y una
 * prueba lo vigila). Tareas 2a y 2b: tema. La Tarea 4e lo amplía con el puente completo.
 */

/** Escena `studio` (apariencia clara), metros, y las fuentes de la interfaz en <body>, donde cuelgan los portales de Pascal. */
export function applyEditorTheme(): () => void {
  const viewer = useViewer.getState()
  viewer.setSceneTheme('studio')
  viewer.setUnit('metric')
  const classes = appFontClasses.split(' ')
  document.body.classList.add(...classes)
  return () => document.body.classList.remove(...classes)
}
```

Modify `apps/web/src/editor/ProjectEditor.tsx`:

```diff
@@
 import { installE2eHooks } from './e2e-hooks'
+import { applyEditorTheme } from './pascal-bridge'
@@
+  // Tema claro de Madori: escena `studio`, metros y la tipografía en <body> (los portales de Pascal cuelgan de ahí).
+  useEffect(() => applyEditorTheme(), [])
+
   const sidebarTabs = useMemo(
```


Modify `apps/web/src/editor/e2e-hooks.ts`:

```diff
@@
     wallCount: () => nodes().filter((n) => n.type === 'wall').length,
+    theme: () => ({ sceneTheme: useViewer.getState().sceneTheme, unit: useViewer.getState().unit }),
```


- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run theme app-shell-fonts`
Expected: PASS (siguen verdes `theme`: 6 pruebas; `theme-luminance`: 4 y `app-shell-fonts`: 2).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Prueba en navegador real**

Run: `pnpm --filter @interiores/web e2e e2e/tema.spec.ts`
Expected: PASS. Si falla en `font-barlow` con `DM_Sans` ausente, abre la página, inspecciona `<body class>` y confirma que `applyEditorTheme` corrió; si `luminanceOf` es menor a 0,6 en la raíz de Pascal, otro token sigue oscuro: revisa `getComputedStyle` de ese elemento y corrige el token, no el umbral.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/components/AppShell.tsx apps/web/src/editor/pascal-bridge.ts apps/web/src/editor/ProjectEditor.tsx apps/web/src/editor/e2e-hooks.ts apps/web/e2e/tema.spec.ts
git commit -m "feat(editor): escena studio, metros y tipografía de Madori al montar el editor, con prueba de que ningún fondo es oscuro" -- apps/web/src/components/AppShell.tsx apps/web/src/editor/pascal-bridge.ts apps/web/src/editor/ProjectEditor.tsx apps/web/src/editor/e2e-hooks.ts apps/web/e2e/tema.spec.ts
```

---

### Task 3a: Parche mínimo de Pascal (1 de 2): la propiedad `chrome`, su prueba y el paso de CI

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `scripts/pascal-chrome-patch.mjs`, `patches/@pascal-app__editor@1.0.3.patch` (lo genera `pnpm patch-commit`), `apps/web/test/pascal-patch.test.ts`
- Modify: `pnpm-workspace.yaml` y `pnpm-lock.yaml` (los escribe pnpm), `.github/workflows/ci.yml`, `docs/pascal-notes.md`
- Test: `apps/web/test/pascal-patch.test.ts` (unitaria, corre en `pnpm verify` y en la CI)

**Interfaces:**
- Consumes: `DECISIONS.chromeStrategy` (Tarea 0c) y el resultado de la 0a (cómo registró pnpm el parche). Con `'patch'` (camino probable) se sigue esta tarea; con `'css'` se hace solo el **Respaldo** de la Tarea 3b y esta se omite.
- Produces:
  - Propiedad `chrome?: EditorChrome` del `<Editor>` de Pascal, con `type EditorChrome = { dock?: boolean; inspector?: boolean; helpers?: boolean; levelSelector?: boolean }` (todo visible por omisión), y los atributos `data-pascal-dock`, `data-pascal-inspector`, `data-pascal-helpers` y `data-pascal-level-selector` en el envoltorio de cada bloque.
  - El parche registrado en `patchedDependencies` de `pnpm-workspace.yaml`, que `pnpm install` aplica solo en cualquier clon limpio y en la CI.
  - `node scripts/pascal-chrome-patch.mjs <carpeta>`: reaplica los cambios sobre una carpeta abierta con `pnpm patch` (sirve hoy y el día que se actualice Pascal).

**Una desviación del spec (la registra "Desviaciones" del plan):** el spec §4.1 habla de parchar cuatro archivos (`action-menu`, `panel-manager`, `floating-level-selector`, `helper-manager`). Los cuatro se montan en un solo lugar, `components/editor/index.tsx`; condicionarlos y marcarlos **allí** deja **un solo archivo** parchado (un bloque que reaplicar si algún día se actualiza Pascal) con el mismo efecto.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/pascal-patch.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const fromRoot = (path: string) => fileURLToPath(new URL(`../../../${path}`, import.meta.url))
const editorIndex = fileURLToPath(
  new URL('../node_modules/@pascal-app/editor/src/components/editor/index.tsx', import.meta.url),
)
const PATCH_FILE = 'patches/@pascal-app__editor@1.0.3.patch'
const ATTRIBUTES = ['data-pascal-dock', 'data-pascal-inspector', 'data-pascal-helpers', 'data-pascal-level-selector']
const FLAGS = ['dock', 'inspector', 'helpers', 'levelSelector']

describe('parche de @pascal-app/editor (propiedad chrome)', () => {
  it('Pascal sigue fijado en 1.0.3 y el parche está registrado en pnpm-workspace.yaml', () => {
    const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'))
    expect(pkg.dependencies['@pascal-app/editor']).toBe('1.0.3')
    const workspace = readFileSync(fromRoot('pnpm-workspace.yaml'), 'utf8')
    expect(workspace).toMatch(
      /patchedDependencies:\s*\n\s+'?@pascal-app\/editor@1\.0\.3'?:\s*patches\/@pascal-app__editor@1\.0\.3\.patch/,
    )
    expect(existsSync(fromRoot(PATCH_FILE))).toBe(true)
  })

  it('el paquete instalado trae el parche: la propiedad y los cuatro atributos estables', () => {
    const source = readFileSync(editorIndex, 'utf8')
    expect(source).toContain('chrome?: EditorChrome')
    for (const attribute of ATTRIBUTES) expect(source, attribute).toContain(attribute)
    for (const flag of FLAGS) expect(source, flag).toContain(`chrome.${flag} !== false`)
  })

  it('el archivo del parche guarda esos mismos cambios (si node_modules se regenera, vuelven)', () => {
    const patch = readFileSync(fromRoot(PATCH_FILE), 'utf8')
    expect(patch).toContain('src/components/editor/index.tsx')
    for (const attribute of ATTRIBUTES) expect(patch, attribute).toMatch(new RegExp(`^\\+.*${attribute}`, 'm'))
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run pascal-patch`
Expected: FAIL — `expected '' to match /patchedDependencies:…/` (el archivo `pnpm-workspace.yaml` aún no declara el parche) y los otros dos fallan porque `chrome?: EditorChrome` no está en el paquete instalado.

- [ ] **Paso 2: Escribir el script que aplica el parche (sirve hoy y cuando se actualice Pascal)**

Create `scripts/pascal-chrome-patch.mjs`:

```js
// Aplica el parche `chrome` de Madori sobre @pascal-app/editor 1.0.3 (un solo archivo: components/editor/index.tsx).
// Uso: pnpm patch @pascal-app/editor@1.0.3 --edit-dir ../pascal-editor-edit
//      node scripts/pascal-chrome-patch.mjs ../pascal-editor-edit
//      pnpm patch-commit ../pascal-editor-edit
// Falla (y no escribe nada) si algún ancla ya no aparece exactamente una vez: señal de que Pascal cambió.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir) {
  console.error('Uso: node scripts/pascal-chrome-patch.mjs <carpeta abierta con pnpm patch>')
  process.exit(1)
}

const EDITS = [
  [
    `export interface EditorProps {
  // Layout version — 'v1' (default) or 'v2' (navbar + two-column)
  layoutVersion?: 'v1' | 'v2'
`,
    `/** Parche de Madori: qué chrome propio de Pascal se dibuja en el layout v2 (todo visible por omisión). */
export type EditorChrome = {
  dock?: boolean
  inspector?: boolean
  helpers?: boolean
  levelSelector?: boolean
}

export interface EditorProps {
  // Layout version — 'v1' (default) or 'v2' (navbar + two-column)
  layoutVersion?: 'v1' | 'v2'
  /** Parche de Madori: oculta el dock, el inspector, los ayudantes o el selector de nivel de Pascal (v2). */
  chrome?: EditorChrome
`,
  ],
  [
    `  layoutVersion = 'v1',
  appMenuButton,
`,
    `  layoutVersion = 'v1',
  chrome = {},
  appMenuButton,
`,
  ],
  [
    `                  {!(isCaptureMode || stageOverlay) && <FloatingLevelSelector />}
                  {!(isVersionPreviewMode || isCaptureMode || isStudioMode) && (
                    <div className="pointer-events-auto">
                      <ActionMenu />
                    </div>
                  )}
                  {!(isVersionPreviewMode || isCaptureMode || isStudioMode) && (
                    <div className="pointer-events-auto">
                      <PanelManager
                        inspectorFooter={inspectorFooter}
                        multiSelectionFooter={multiSelectionFooter}
                      />
                    </div>
                  )}
                  {!isCaptureMode && (
                    <div className="pointer-events-auto">
                      <HelperManager />
                    </div>
                  )}
`,
    `                  {chrome.levelSelector !== false && !(isCaptureMode || stageOverlay) && (
                    <div data-pascal-level-selector>
                      <FloatingLevelSelector />
                    </div>
                  )}
                  {chrome.dock !== false && !(isVersionPreviewMode || isCaptureMode || isStudioMode) && (
                    <div className="pointer-events-auto" data-pascal-dock>
                      <ActionMenu />
                    </div>
                  )}
                  {chrome.inspector !== false && !(isVersionPreviewMode || isCaptureMode || isStudioMode) && (
                    <div className="pointer-events-auto" data-pascal-inspector>
                      <PanelManager
                        inspectorFooter={inspectorFooter}
                        multiSelectionFooter={multiSelectionFooter}
                      />
                    </div>
                  )}
                  {chrome.helpers !== false && !isCaptureMode && (
                    <div className="pointer-events-auto" data-pascal-helpers>
                      <HelperManager />
                    </div>
                  )}
`,
  ],
]

const file = join(dir, 'src/components/editor/index.tsx')
let text = readFileSync(file, 'utf8')
for (const [from, to] of EDITS) {
  if (text.split(from).length !== 2) {
    console.error(`El ancla no aparece exactamente una vez (¿cambió Pascal?):\n${from.split('\n')[0]}`)
    process.exit(1)
  }
  text = text.replace(from, () => to)
}
writeFileSync(file, text)
console.log('Parche chrome aplicado a', file)
```

- [ ] **Paso 3: Generar el parche con pnpm y reinstalar**

```bash
pnpm patch @pascal-app/editor@1.0.3 --edit-dir ../pascal-editor-edit
node scripts/pascal-chrome-patch.mjs ../pascal-editor-edit
pnpm patch-commit ../pascal-editor-edit
rm -rf ../pascal-editor-edit
pnpm install --frozen-lockfile
git status --short
```
Expected: `Parche chrome aplicado a …/src/components/editor/index.tsx`; `git status` muestra `patches/@pascal-app__editor@1.0.3.patch` (nuevo), `pnpm-workspace.yaml` y `pnpm-lock.yaml` modificados; el `pnpm install --frozen-lockfile` final termina sin cambiar nada más. Si pnpm escribió `patchedDependencies` en otro archivo (resultado (a) de la Tarea 0a), la prueba del Paso 1 se ajusta a esa ruta.

Borra la caché de compilación para que Next no use el paquete sin parchar: `rm -rf apps/web/.next`.

Run: `pnpm --filter @interiores/web exec vitest run pascal-patch`
Expected: PASS (3 pruebas).

- [ ] **Paso 4: Paso de CI (que un `pnpm install` sin el parche rompa antes de llegar a las pruebas)**

Modify `.github/workflows/ci.yml`:

```diff
@@
       - run: pnpm install --frozen-lockfile
+      - name: El parche de Pascal quedó aplicado
+        run: pnpm --filter @interiores/web exec vitest run pascal-patch
```


- [ ] **Paso 5: Anotar el cambio en las notas, verificar y hacer commit**

```bash
cat >> docs/pascal-notes.md <<'EOF'
| **Parche de Madori a `@pascal-app/editor` 1.0.3** (2026-10-11): `patches/@pascal-app__editor@1.0.3.patch`, registrado en `patchedDependencies` de `pnpm-workspace.yaml`, agrega al `<Editor>` la propiedad `chrome` (`dock`, `inspector`, `helpers`, `levelSelector`; todo visible por omisión) y los atributos `data-pascal-dock`, `data-pascal-inspector`, `data-pascal-helpers`, `data-pascal-level-selector` en los envoltorios que ya había en `components/editor/index.tsx`; los cuatro componentes no se tocan | `scripts/pascal-chrome-patch.mjs`, `apps/web/test/pascal-patch.test.ts`, `apps/web/e2e/pascal-chrome.spec.ts` | Para actualizar Pascal: `pnpm patch` de la versión nueva, `node scripts/pascal-chrome-patch.mjs <carpeta>` (falla si un ancla cambió) y `pnpm patch-commit`. |
EOF
```

Run: `pnpm --filter @interiores/web exec vitest run pascal-patch && pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: PASS (3 pruebas), `Tipos OK …` y Biome sin errores nuevos.

```bash
git add scripts/pascal-chrome-patch.mjs patches/@pascal-app__editor@1.0.3.patch pnpm-workspace.yaml pnpm-lock.yaml apps/web/test/pascal-patch.test.ts .github/workflows/ci.yml docs/pascal-notes.md
git commit -m "feat(editor): parche mínimo de Pascal (propiedad chrome) con su prueba y un paso de CI que lo vigila" -- scripts/pascal-chrome-patch.mjs patches/@pascal-app__editor@1.0.3.patch pnpm-workspace.yaml pnpm-lock.yaml apps/web/test/pascal-patch.test.ts .github/workflows/ci.yml docs/pascal-notes.md
```

---

### Task 3b: Parche mínimo de Pascal (2 de 2): ocultar su chrome desde `ProjectEditor` y la guarda en navegador

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/chrome.ts`, `apps/web/e2e/support/hooks.ts`, `apps/web/e2e/pascal-chrome.spec.ts`
- Modify: `apps/web/src/editor/ProjectEditor.tsx`, `apps/web/src/editor/e2e-hooks.ts` (se reescribe entero: ahora exporta `E2eApi`)
- Test: `apps/web/e2e/pascal-chrome.spec.ts` (navegador real)

**Interfaces:**
- Consumes: la propiedad `chrome` del `<Editor>` y los atributos `data-pascal-*` (Tarea 3a); `createProjectViaUi` de `e2e/support/projects.ts`; `theme()` de los ganchos (Tarea 2b).
- Produces:
  - `type PascalChrome = { dock?: boolean; inspector?: boolean; helpers?: boolean; levelSelector?: boolean }` y `HIDDEN_CHROME` en `apps/web/src/editor/chrome.ts`.
  - `createE2eHooks(options?: { setChrome?: (chrome: PascalChrome) => void })`, `type E2eApi = ReturnType<typeof createE2eHooks>` y `installE2eHooks(options?)` en `e2e-hooks.ts`; los ganchos nuevos `setChrome`, `selectFirstWall(): string | null` y `armWall(): void`.
  - `hook(page, name, ...args)` en `e2e/support/hooks.ts`: llama a un gancho de `window.__e2e` con sus tipos (lo usan todas las pruebas en navegador siguientes).
  - La **guarda** (criterio 10 del spec): una prueba comprueba que el dock, el inspector, los ayudantes y el selector de nivel de Pascal **no existen en pantalla**; si una actualización rompe el parche, falla. No es vacua: tiene un control que enciende las cuatro piezas y comprueba que los selectores sí las encuentran.

- [ ] **Paso 1: Escribir la guarda en navegador (control + ausencia) (rojo)**

Create `apps/web/e2e/pascal-chrome.spec.ts`:

```ts
import { type Page, expect, test } from '@playwright/test'
import { hook } from './support/hooks'
import { createProjectViaUi } from './support/projects'

const PIECES = ['dock', 'inspector', 'helpers', 'level-selector'] as const
/** Dos fotogramas: deja que React pinte lo que el estado acaba de pedir. */
const settle = (page: Page) =>
  page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))))

/** Cuántos elementos de cada pieza de Pascal hay en pantalla: por el atributo del parche y por los ganchos NATIVOS de Pascal. */
const found = (page: Page) =>
  page.evaluate((pieces) => {
    const count = (selector: string) => document.querySelectorAll(selector).length
    return {
      porAtributo: Object.fromEntries(pieces.map((p) => [p, count(`[data-pascal-${p}]`)])),
      // Ganchos propios de Pascal (sin parche): el dock es `mode-select` y el selector de nivel `level-add`/`level-ground`.
      nativos: count('[data-guide-target="mode-select"], [data-guide-target="level-add"], [data-guide-target="level-ground"]'),
      // Clases del inspector flotante y de los ayudantes en Pascal 1.0.3.
      porClases: count('[data-viewer-bounds] .fixed.top-20.right-4, [data-viewer-bounds] .fixed.top-1\\/2.right-4'),
    }
  }, PIECES)

test('el dock, el inspector, los ayudantes y el selector de nivel de Pascal no existen en pantalla (y la guarda no es vacua)', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E parche ${Date.now()}`, template: null })
  await hook(page, 'addWall')
  await hook(page, 'selectFirstWall') // con un muro elegido, el inspector de Pascal sería visible
  await hook(page, 'armWall') // con la herramienta de muro armada, sus ayudantes serían visibles
  await settle(page)

  // Guarda: con el parche aplicado no hay nada de Pascal, ni por atributo ni por sus ganchos nativos ni por clases.
  const hidden = await found(page)
  expect(hidden.porAtributo).toEqual({ dock: 0, inspector: 0, helpers: 0, 'level-selector': 0 })
  expect(hidden.nativos).toBe(0)
  expect(hidden.porClases).toBe(0)

  // Control: al pedir el chrome de Pascal los selectores sí encuentran las cuatro piezas (así el cero de arriba significa algo).
  await hook(page, 'setChrome', { dock: true, inspector: true, helpers: true, levelSelector: true })
  await expect.poll(async () => (await found(page)).porAtributo, { timeout: 15_000 }).toEqual({
    dock: 1,
    inspector: 1,
    helpers: 1,
    'level-selector': 1,
  })
  const shown = await found(page)
  expect(shown.nativos).toBeGreaterThan(0)
  expect(shown.porClases).toBeGreaterThan(0)

  // Y vuelve a ocultarse.
  await hook(page, 'setChrome', { dock: false, inspector: false, helpers: false, levelSelector: false })
  await settle(page)
  expect((await found(page)).porAtributo).toEqual({ dock: 0, inspector: 0, helpers: 0, 'level-selector': 0 })
})
```


Run (Supabase local arriba: `pnpm db:start && pnpm db:env`): `pnpm --filter @interiores/web e2e e2e/pascal-chrome.spec.ts`
Expected: FAIL — `Error: Cannot find module './support/hooks'` (todavía no existe el ayudante que llama a los ganchos).

- [ ] **Paso 2: `chrome.ts`, los ganchos tipados y el uso en `ProjectEditor`**

Create `apps/web/src/editor/chrome.ts`:

```ts
/** Qué chrome propio de Pascal se dibuja (propiedad `chrome` que agrega el parche; todo visible por omisión). */
export type PascalChrome = {
  dock?: boolean
  inspector?: boolean
  helpers?: boolean
  levelSelector?: boolean
}

/** Madori dibuja su propio dock, inspector, ayudantes y selector de nivel: los de Pascal no se muestran. */
export const HIDDEN_CHROME: Readonly<PascalChrome> = {
  dock: false,
  inspector: false,
  helpers: false,
  levelSelector: false,
}
```

Create `apps/web/src/editor/e2e-hooks.ts` (ya existe: reemplázalo entero con esto):

```ts
import { WallNode, useScene } from '@pascal-app/core'
import { armToolMode } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import type { PascalChrome } from './chrome'

type SceneNode = { id: string; type: string }
type E2eOptions = { setChrome?: (chrome: PascalChrome) => void }

/** Solo para Playwright: lee y modifica la escena sin depender de píxeles. */
export function createE2eHooks(options: E2eOptions = {}) {
  const nodes = () => Object.values(useScene.getState().nodes) as SceneNode[]
  return {
    ready: () => nodes().some((n) => n.type === 'level'),
    counts: () => {
      const total: Record<string, number> = {}
      for (const n of nodes()) total[n.type] = (total[n.type] ?? 0) + 1
      return total
    },
    /** Solo para las capturas de las plantillas: 'up' | 'cutaway' | 'down' | 'translucent'. */
    setWallMode: (mode: string) => useViewer.getState().setWallMode(mode as never),
    wallCount: () => nodes().filter((n) => n.type === 'wall').length,
    theme: () => ({ sceneTheme: useViewer.getState().sceneTheme, unit: useViewer.getState().unit }),
    addWall: () => {
      const level = nodes().find((n) => n.type === 'level')
      if (!level) throw new Error('No hay nivel donde agregar el muro')
      useScene.getState().createNode(WallNode.parse({ start: [0, 0], end: [4, 0] }), level.id as never)
    },
    /** Muestra u oculta el chrome de Pascal (la prueba de guarda lo enciende para comprobar que sus selectores existen). */
    setChrome: (chrome: PascalChrome) => options.setChrome?.(chrome),
    /** Selecciona el primer muro y devuelve su id (`null` si no hay). */
    selectFirstWall: () => {
      const wall = nodes().find((n) => n.type === 'wall')
      if (!wall) return null
      useViewer.getState().setSelection({ selectedIds: [wall.id] as never })
      return wall.id
    },
    armWall: () => armToolMode({ mode: 'build', tool: 'wall' }),
  }
}

export type E2eApi = ReturnType<typeof createE2eHooks>

export function installE2eHooks(options?: E2eOptions): void {
  ;(window as unknown as { __e2e: E2eApi }).__e2e = createE2eHooks(options)
}
```

Create `apps/web/e2e/support/hooks.ts`:

```ts
import type { Page } from '@playwright/test'
import type { E2eApi } from '../../src/editor/e2e-hooks'

/** Llama a un gancho de `window.__e2e` con sus tipos (existe solo con NEXT_PUBLIC_E2E=1). */
export const hook = <K extends keyof E2eApi>(page: Page, name: K, ...args: Parameters<E2eApi[K]>) =>
  page.evaluate(
    ([n, a]) => (window as unknown as { __e2e: Record<string, (...x: unknown[]) => unknown> }).__e2e[n as string]?.(...(a as unknown[])),
    [name, args] as [string, unknown[]],
  ) as Promise<Awaited<ReturnType<E2eApi[K]>>>
```

Modify `apps/web/src/editor/ProjectEditor.tsx`:

```diff
@@
+import { HIDDEN_CHROME, type PascalChrome } from './chrome'
 import { installE2eHooks } from './e2e-hooks'
@@
   const [dismissed, setDismissed] = useState(false)
+  // Madori dibuja su propio dock, inspector, ayudantes y selector de nivel; los de Pascal quedan ocultos (parche `chrome`).
+  const [chrome, setChrome] = useState<PascalChrome>(HIDDEN_CHROME)
@@
-        if (process.env.NEXT_PUBLIC_E2E === '1') installE2eHooks()
+        if (process.env.NEXT_PUBLIC_E2E === '1') installE2eHooks({ setChrome })
@@
       <Editor
+        chrome={chrome}
         guardAgainstSceneWipe
```


- [ ] **Paso 3: Probar en navegador con el paquete parchado**

Borra la caché de compilación para que Next no use el paquete sin parchar: `rm -rf apps/web/.next`, y reinicia el servidor de desarrollo.

Run: `pnpm --filter @interiores/web e2e e2e/pascal-chrome.spec.ts`
Expected: PASS. Si falla en el control (`porAtributo` no llega a 1 por pieza), el paquete que Next carga no trae el parche: repite `pnpm install --frozen-lockfile` y borra `apps/web/.next`.

- [ ] **Paso 4: Verificar todo y hacer commit**

Run: `pnpm verify`
Expected: PASS.

```bash
git add apps/web/src/editor/chrome.ts apps/web/src/editor/e2e-hooks.ts apps/web/src/editor/ProjectEditor.tsx apps/web/e2e/support/hooks.ts apps/web/e2e/pascal-chrome.spec.ts
git commit -m "feat(editor): oculta el dock, el inspector, los ayudantes y el selector de nivel de Pascal, con guarda en navegador" -- apps/web/src/editor/chrome.ts apps/web/src/editor/e2e-hooks.ts apps/web/src/editor/ProjectEditor.tsx apps/web/e2e/support/hooks.ts apps/web/e2e/pascal-chrome.spec.ts
```

#### Respaldo (solo si `DECISIONS.chromeStrategy` es `'css'`): ocultar por clases, sin parche

Mismo resultado visible, pero válido **solo mientras Pascal siga en 1.0.3** (usa las clases que hoy dibujan esos bloques). Se omiten los Pasos 2, 3 y 6 y se cambia el Paso 4 así: no se pasa `chrome` al `<Editor>` (la propiedad no existe sin parche) y el contenedor lleva la clase que oculta los bloques.

Create `apps/web/app/pascal-chrome-fallback.css`:

```css
/* Respaldo del parche de Pascal: oculta por sus clases el dock, el inspector, los ayudantes y el selector de nivel (solo Pascal 1.0.3). */
.hide-pascal-chrome [data-viewer-bounds] .fixed.bottom-6,
.hide-pascal-chrome [data-viewer-bounds] .fixed.top-20.right-4,
.hide-pascal-chrome [data-viewer-bounds] .fixed.top-1\/2.right-4,
.hide-pascal-chrome [data-viewer-bounds] .absolute.top-14.left-3 {
  display: none !important;
}
```

En `ProjectEditor.tsx`: `import '../../app/pascal-chrome-fallback.css'` (o impórtalo desde `app/globals.css` con `@import "./pascal-chrome-fallback.css";`) y `<div className="hide-pascal-chrome relative h-screen w-screen">` en lugar de la clase actual. La prueba `pascal-patch.test.ts` se reemplaza por una que lea `pascal-chrome-fallback.css` y compruebe sus cuatro selectores; `e2e/pascal-chrome.spec.ts` conserva solo la parte de ausencia (sin el control, porque no hay atributos): `porClases` y `nativos` deben ser 0.

---

### Task 4a: Puente con Pascal (1 de 3): tipos propios, núcleo y dobles de prueba

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/shell/bridge/types.ts`, `core.ts`, `index.ts` (todos en `apps/web/src/editor/shell/bridge/`), `apps/web/test/support/fake-deps.ts` (dobles reutilizables por todas las tareas siguientes)
- Test: `apps/web/test/shell-bridge-core.test.ts`

**Interfaces:**
- Consumes: nada (el puente se escribe con tipos propios).
- Produces (`shell/bridge/types.ts`; ninguno importa Pascal): `Phase = 'site' | 'structure' | 'furnish'`, `EditorMode = 'select' | 'edit' | 'delete' | 'build' | 'material-paint' | 'terrain-sculpt'`, `ViewMode = '2d' | '3d' | 'split'`, `StoreLike<S> = { getState(): S; subscribe(listener: () => void): () => void }`, `EditorLike`, `SelectionLike`, `ViewerLike`, `SceneNodeLike`, `SceneLike`, `HistoryState = { canUndo: boolean; canRedo: boolean }`, `BridgeSnapshot = { editor: EditorLike; viewer: ViewerLike; scene: SceneLike; history: HistoryState }`. Cada tarea siguiente agrega sus miembros arriba de las líneas `// @@editor-like`, `// @@viewer-like` y `// @@scene-like`.
- Produces (`shell/bridge/core.ts`): `type HistoryPort = { read(): HistoryState; subscribe(listener: () => void): () => void; undo(): void; redo(): void }`, `type CoreDeps = { editor: StoreLike<EditorLike>; viewer: StoreLike<ViewerLike>; scene: StoreLike<SceneLike>; history: HistoryPort; applyTheme(): () => void; hideCameraHint(): () => void }` y `createCoreSlice(deps)` con `subscribe(listener): () => void`, `snapshot(): BridgeSnapshot` y `mountDefaults(): () => void`.
- Produces (`shell/bridge/index.ts`): `type BridgeDeps = CoreDeps` (cada tarea siguiente le suma su porción), `createBridge(deps: BridgeDeps)` y `type ShellBridge = ReturnType<typeof createBridge>`; los cortes `// @@slices` marcan dónde se suman las porciones.
- Produces (`test/support/fake-deps.ts`): `createFakeStore<S extends object>(initial: S)` (`getState`, `setState`, `subscribe`) y `createFakeDeps()` → `{ deps: BridgeDeps; editor; viewer; scene; history; undoTheme; showHint; snapshot }` (`snapshot()` devuelve el estado crudo, igual que `bridge.snapshot()`), con los dobles empezando como un proyecto en blanco recién abierto.

**Por qué este diseño.** `src/editor/shell/` nunca importa Pascal (lo vigila `shell-boundaries.test.ts`): recibe **almacenes con la forma mínima** (`StoreLike`) y la Tarea 4e los enchufa con los reales (`useEditor`, `useViewer`, `useScene`). Así el modo Ver, el historial y el resto se prueban con dobles, sin navegador. Las tareas 4b a 10 agregan cada una su porción (`mode.ts`, `tools.ts`, `levels.ts`, …) con el mismo molde: tipos propios + dependencias inyectadas + selectores puros. El doble de los almacenes empieza como lo que Pascal hace con un nivel vacío: fase `structure` y herramienta de muro **ya armada**; el shell lee ese estado, nunca lo supone.

- [ ] **Paso 1: Escribir los dobles y la prueba del núcleo (rojo)**

Create `apps/web/test/support/fake-deps.ts`:

```ts
import { vi } from 'vitest'
import type { BridgeDeps } from '../../src/editor/shell/bridge'
import type { EditorLike, EditorMode, HistoryState, SceneLike, ViewerLike } from '../../src/editor/shell/bridge/types'

export function createFakeStore<S extends object>(initial: S) {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    getState: () => state,
    setState(partial: Partial<S>) {
      state = { ...state, ...partial }
      for (const listener of [...listeners]) listener()
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/**
 * Dobles de los almacenes de Pascal con la forma que pide `BridgeDeps`. Empiezan como un proyecto en blanco recién abierto
 * (fase `structure`, herramienta de muro ya armada: lo que Pascal hace con un nivel vacío) y cada acción cambia el estado
 * como lo haría Pascal.
 */
export function createFakeDeps() {
  const editor = createFakeStore<EditorLike>({
    phase: 'structure',
    mode: 'build',
    tool: 'wall',
    viewMode: '3d',
    isFirstPersonMode: false,
    armToolMode: vi.fn((next: { mode: EditorMode; tool?: string }) => editor.setState({ mode: next.mode, tool: next.tool ?? null })),
    setPhase: vi.fn((phase: EditorLike['phase']) => editor.setState({ phase })),
    setViewMode: vi.fn((viewMode: EditorLike['viewMode']) => editor.setState({ viewMode })),
    setFirstPersonMode: vi.fn((enabled: boolean) => editor.setState({ isFirstPersonMode: enabled })),
    // @@fake-editor
  })
  const viewer = createFakeStore<ViewerLike>({
    selection: { buildingId: 'building_1', levelId: 'level_1', zoneId: null, selectedIds: [] },
    setSelection: vi.fn((update: Partial<ViewerLike['selection']>) =>
      viewer.setState({ selection: { ...viewer.getState().selection, ...update } }),
    ),
    // @@fake-viewer
  })
  const scene = createFakeStore<SceneLike>({ readOnly: false, nodes: {} })
  const historyListeners = new Set<() => void>()
  let historyState: HistoryState = { canUndo: false, canRedo: false }
  const history = {
    read: () => historyState,
    subscribe(listener: () => void) {
      historyListeners.add(listener)
      return () => {
        historyListeners.delete(listener)
      }
    },
    undo: vi.fn(),
    redo: vi.fn(),
    set(next: HistoryState) {
      historyState = next
      for (const listener of [...historyListeners]) listener()
    },
  }
  const undoTheme = vi.fn()
  const showHint = vi.fn()
  const deps = {
    editor,
    viewer,
    scene,
    history,
    applyTheme: vi.fn(() => undoTheme),
    hideCameraHint: vi.fn(() => showHint),
    // @@fake-deps
  } satisfies BridgeDeps
  /** Estado crudo de los cuatro orígenes (lo que entrega `bridge.snapshot()`): los selectores puros se prueban con esto. */
  const snapshot = () => ({
    editor: editor.getState(),
    viewer: viewer.getState(),
    scene: scene.getState(),
    history: history.read(),
  })
  return { deps, editor, viewer, scene, history, undoTheme, showHint, snapshot }
}
```

Create `apps/web/test/shell-bridge-core.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { createFakeDeps } from './support/fake-deps'

const setup = () => {
  const fake = createFakeDeps()
  return { ...fake, bridge: createBridge(fake.deps) }
}

describe('núcleo del puente', () => {
  it('snapshot entrega el estado crudo de los cuatro orígenes', () => {
    const { bridge } = setup()
    const snapshot = bridge.snapshot()
    expect(snapshot.editor).toMatchObject({ phase: 'structure', mode: 'build', tool: 'wall', viewMode: '3d' })
    expect(snapshot.scene).toMatchObject({ readOnly: false })
    expect(snapshot.history).toEqual({ canUndo: false, canRedo: false })
    expect(snapshot.viewer.selection.selectedIds).toEqual([])
  })

  it('subscribe avisa cuando cambia el editor, el visor, la escena o el historial, y deja de avisar al cancelar', () => {
    const { bridge, editor, viewer, scene, history } = setup()
    const listener = vi.fn()
    const stop = bridge.subscribe(listener)
    editor.setState({ viewMode: '2d' })
    viewer.setState({ selection: { buildingId: null, levelId: null, zoneId: null, selectedIds: [] } })
    scene.setState({ readOnly: true })
    history.set({ canUndo: true, canRedo: false })
    expect(listener).toHaveBeenCalledTimes(4)
    stop()
    editor.setState({ viewMode: '3d' })
    expect(listener).toHaveBeenCalledTimes(4)
  })

  it('mountDefaults aplica el tema y oculta el aviso de cámara, y su cierre los devuelve', () => {
    const { bridge, deps, undoTheme, showHint } = setup()
    const stop = bridge.mountDefaults()
    expect(deps.applyTheme).toHaveBeenCalledTimes(1)
    expect(deps.hideCameraHint).toHaveBeenCalledTimes(1)
    stop()
    expect(showHint).toHaveBeenCalledTimes(1)
    expect(undoTheme).toHaveBeenCalledTimes(1)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-core`
Expected: FAIL — `Cannot find module '../src/editor/shell/bridge'`.

- [ ] **Paso 2: Escribir los tipos propios**

Create `apps/web/src/editor/shell/bridge/types.ts`:

```ts
/**
 * Lo mínimo que el shell lee y llama de Pascal, con tipos propios: nada de `src/editor/shell` ni de sus pruebas importa Pascal.
 * `src/editor/pascal-bridge.ts` enchufa los almacenes reales (TypeScript comprueba que tengan esta forma).
 * Cada tarea agrega sus miembros arriba de las líneas `// @@…`.
 */
export type Phase = 'site' | 'structure' | 'furnish'
export type EditorMode = 'select' | 'edit' | 'delete' | 'build' | 'material-paint' | 'terrain-sculpt'
export type ViewMode = '2d' | '3d' | 'split'

export type StoreLike<S> = { getState(): S; subscribe(listener: () => void): () => void }

/** `useEditor` de Pascal (editor/src/store/use-editor.tsx). */
export type EditorLike = {
  phase: Phase
  mode: EditorMode
  tool: string | null
  viewMode: ViewMode
  isFirstPersonMode: boolean
  armToolMode(next: { mode: EditorMode; tool?: string }): void
  setPhase(phase: Phase): void
  setViewMode(mode: ViewMode): void
  setFirstPersonMode(enabled: boolean): void
  // @@editor-like
}

export type SelectionLike = {
  buildingId: string | null
  levelId: string | null
  zoneId: string | null
  selectedIds: readonly string[]
}

/** `useViewer` de Pascal (viewer/dist/store/use-viewer.d.ts). */
export type ViewerLike = {
  selection: SelectionLike
  setSelection(update: Partial<{ buildingId: string | null; levelId: string | null; zoneId: string | null; selectedIds: string[] }>): void
  // @@viewer-like
}

export type SceneNodeLike = { id: string; type: string; parentId?: string | null; children?: readonly string[] }

/** `useScene` de Pascal (core/dist/store/use-scene.d.ts). */
export type SceneLike = {
  readOnly: boolean
  nodes: Readonly<Record<string, SceneNodeLike>>
  // @@scene-like
}

export type HistoryState = { canUndo: boolean; canRedo: boolean }

/** Estado crudo que leen los selectores puros (`selectors.ts`). */
export type BridgeSnapshot = { editor: EditorLike; viewer: ViewerLike; scene: SceneLike; history: HistoryState }
```

- [ ] **Paso 3: Escribir el núcleo y el ensamblado**

Create `apps/web/src/editor/shell/bridge/core.ts`:

```ts
import type { BridgeSnapshot, EditorLike, HistoryState, SceneLike, StoreLike, ViewerLike } from './types'

export type HistoryPort = {
  read(): HistoryState
  subscribe(listener: () => void): () => void
  undo(): void
  redo(): void
}

export type CoreDeps = {
  editor: StoreLike<EditorLike>
  viewer: StoreLike<ViewerLike>
  scene: StoreLike<SceneLike>
  history: HistoryPort
  /** Escena `studio`, metros y fuentes de la interfaz en <body>; devuelve cómo deshacerlo. */
  applyTheme(): () => void
  /** Oculta el aviso de cámara en inglés de Pascal; devuelve cómo volver a mostrarlo. */
  hideCameraHint(): () => void
}

export function createCoreSlice(deps: CoreDeps) {
  return {
    /** Avisa cuando cambia cualquiera de los cuatro orígenes (editor, visor, escena o historial). */
    subscribe(listener: () => void): () => void {
      const stops = [
        deps.editor.subscribe(listener),
        deps.viewer.subscribe(listener),
        deps.scene.subscribe(listener),
        deps.history.subscribe(listener),
      ]
      return () => {
        for (const stop of stops) stop()
      }
    },
    /** Estado crudo actual: los selectores puros (`selectors.ts`) lo transforman. */
    snapshot(): BridgeSnapshot {
      return {
        editor: deps.editor.getState(),
        viewer: deps.viewer.getState(),
        scene: deps.scene.getState(),
        history: deps.history.read(),
      }
    },
    /** Al montar el shell: tema claro y sin el aviso de cámara de Pascal. Devuelve la función que lo deshace. */
    mountDefaults(): () => void {
      const undoTheme = deps.applyTheme()
      const showHint = deps.hideCameraHint()
      return () => {
        showHint()
        undoTheme()
      }
    },
  }
}
```

Create `apps/web/src/editor/shell/bridge/index.ts`:

```ts
import { type CoreDeps, createCoreSlice } from './core'

export type BridgeDeps = CoreDeps

/** El puente: todo lo que el shell sabe hacer con Pascal, con dependencias inyectadas (los dobles de las pruebas o los almacenes reales). */
export function createBridge(deps: BridgeDeps) {
  return {
    ...createCoreSlice(deps),
    // @@slices
  }
}

export type ShellBridge = ReturnType<typeof createBridge>
```

- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-core shell-boundaries`
Expected: PASS (`shell-bridge-core`: 3 pruebas; `shell-boundaries`: 1).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/bridge apps/web/test/support/fake-deps.ts apps/web/test/shell-bridge-core.test.ts
git commit -m "feat(editor): núcleo del puente con Pascal (tipos propios, suscripción, lectura del estado y dobles de prueba)" -- apps/web/src/editor/shell/bridge apps/web/test/support/fake-deps.ts apps/web/test/shell-bridge-core.test.ts
```

---

### Task 4b: Puente con Pascal (2 de 3): modo Ver/Editar en solo lectura, vista, historial y selectores puros

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/shell/bridge/mode.ts`, `apps/web/src/editor/shell/bridge/selectors.ts`
- Modify: `apps/web/src/editor/shell/bridge/index.ts`, `apps/web/test/support/fake-deps.ts`
- Test: `apps/web/test/shell-selectors.test.ts`, `apps/web/test/shell-bridge-mode.test.ts`

**Interfaces:**
- Consumes: `CoreDeps`, `createCoreSlice` (4a); `createFakeDeps` (4a); `ViewMode` y `BridgeSnapshot` de `shell/bridge/types`.
- Produces (`shell/bridge/mode.ts`): `type ModeDeps = { acquireReadOnly(): () => void; cancelActiveTool(): void }` (en `pascal-bridge.ts`: `acquireSceneReadOnlyLease` y `cancelActiveTool` de Pascal) y `createModeSlice(deps)` con `setMode(mode: 'ver' | 'editar'): void`, `setView(view: ViewMode): void`, `undo(): void`, `redo(): void` y `dispose(): void`. `BridgeDeps = CoreDeps & ModeDeps`.
- Produces (`shell/bridge/selectors.ts`): `type ShellState = { mode: 'ver' | 'editar'; view: ViewMode; canUndo: boolean; canRedo: boolean; firstPerson: boolean; phase: Phase; editorMode: EditorMode; tool: string | null }` y `selectShellState(snapshot: BridgeSnapshot): ShellState`.

**Ver = solo lectura de Pascal (D3).** Se usa el préstamo de solo lectura (`acquireSceneReadOnlyLease`, con cuenta de referencias) y **no** `isVersionPreviewMode`, que además pausaría el autoguardado: un cambio hecho justo antes de pasar a Ver se perdería al recargar. Como Pascal sigue dibujando asas al elegir algo, Ver mantiene la selección vacía mientras dure. Pascal restaura fase, herramienta y selección desde `localStorage` y abre un proyecto en blanco con la herramienta de muro armada: por eso `setMode('ver')` primero desarma la herramienta (`cancelActiveTool`) y arma Seleccionar, y `selectShellState` **lee** lo que Pascal tiene en lugar de suponerlo. Ver nunca se restaura al recargar: se abre siempre en Editar.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-selectors.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { selectShellState } from '../src/editor/shell/bridge/selectors'
import { createFakeDeps } from './support/fake-deps'

describe('selectShellState', () => {
  it('lee el estado real de Pascal: un proyecto en blanco abre en Editar con la herramienta de muro ya armada', () => {
    const state = selectShellState(createFakeDeps().snapshot())
    expect(state).toEqual({
      mode: 'editar',
      view: '3d',
      canUndo: false,
      canRedo: false,
      firstPerson: false,
      phase: 'structure',
      editorMode: 'build',
      tool: 'wall',
    })
  })

  it('el modo es Ver exactamente cuando la escena está en solo lectura', () => {
    const fake = createFakeDeps()
    fake.scene.setState({ readOnly: true })
    expect(selectShellState(fake.snapshot()).mode).toBe('ver')
  })

  it('refleja vista, historial y recorrido', () => {
    const fake = createFakeDeps()
    fake.editor.setState({ viewMode: 'split', isFirstPersonMode: true })
    fake.history.set({ canUndo: true, canRedo: false })
    expect(selectShellState(fake.snapshot())).toMatchObject({ view: 'split', firstPerson: true, canUndo: true, canRedo: false })
  })
})
```

Create `apps/web/test/shell-bridge-mode.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { selectShellState } from '../src/editor/shell/bridge/selectors'
import { createFakeDeps } from './support/fake-deps'

const setup = () => {
  const fake = createFakeDeps()
  const bridge = createBridge(fake.deps)
  return { ...fake, bridge, state: () => selectShellState(bridge.snapshot()) }
}

describe('modo Ver / Editar', () => {
  it('pasar a Ver con una herramienta armada (el caso normal de un proyecto en blanco) la desarma y bloquea la escena', () => {
    const { bridge, state, deps } = setup()
    expect(state()).toMatchObject({ mode: 'editar', editorMode: 'build', tool: 'wall' })
    bridge.setMode('ver')
    expect(deps.cancelActiveTool).toHaveBeenCalledTimes(1)
    expect(state()).toMatchObject({ mode: 'ver', editorMode: 'select', tool: null })
  })

  it('Ver limpia la selección que hubiera y la sigue limpiando mientras dure', () => {
    const { bridge, viewer } = setup()
    viewer.setState({ selection: { ...viewer.getState().selection, selectedIds: ['wall_1'] } })
    bridge.setMode('ver')
    expect(viewer.getState().selection.selectedIds).toEqual([])
    viewer.getState().setSelection({ selectedIds: ['door_1'] })
    expect(viewer.getState().selection.selectedIds).toEqual([])
    viewer.getState().setSelection({ zoneId: 'zone_1' })
    expect(viewer.getState().selection.zoneId).toBeNull()
  })

  it('pedir Ver dos veces toma una sola vez el solo lectura (un doble clic no deja la escena bloqueada)', () => {
    const { bridge, deps, scene } = setup()
    bridge.setMode('ver')
    bridge.setMode('ver')
    expect(deps.acquireReadOnly).toHaveBeenCalledTimes(1)
    bridge.setMode('editar')
    expect(scene.getState().readOnly).toBe(false)
  })

  it('volver a Editar suelta el bloqueo, deja de limpiar la selección y NO rearma la herramienta anterior', () => {
    const { bridge, state, viewer } = setup()
    bridge.setMode('ver')
    bridge.setMode('editar')
    expect(state()).toMatchObject({ mode: 'editar', editorMode: 'select', tool: null })
    viewer.getState().setSelection({ selectedIds: ['wall_1'] })
    expect(viewer.getState().selection.selectedIds).toEqual(['wall_1'])
  })

  it('Editar sin haber pasado por Ver no hace nada (por ejemplo al recargar: se abre siempre en Editar)', () => {
    const { bridge, deps, state } = setup()
    bridge.setMode('editar')
    expect(deps.acquireReadOnly).not.toHaveBeenCalled()
    expect(state().mode).toBe('editar')
  })

  it('dispose suelta el bloqueo aunque se haya quedado en Ver', () => {
    const { bridge, scene } = setup()
    bridge.setMode('ver')
    bridge.dispose()
    expect(scene.getState().readOnly).toBe(false)
  })
})

describe('vista e historial', () => {
  it('setView cambia la vista de Pascal', () => {
    const { bridge, state } = setup()
    bridge.setView('split')
    expect(state().view).toBe('split')
    bridge.setView('2d')
    expect(state().view).toBe('2d')
  })

  it('undo y redo llaman al historial de Pascal', () => {
    const { bridge, history } = setup()
    bridge.undo()
    bridge.redo()
    expect(history.undo).toHaveBeenCalledTimes(1)
    expect(history.redo).toHaveBeenCalledTimes(1)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-selectors shell-bridge-mode`
Expected: FAIL — `Cannot find module '../src/editor/shell/bridge/selectors'` en los dos archivos de prueba (`shell-bridge-mode` también importa los selectores).

- [ ] **Paso 2: Escribir el modo y los selectores**

Create `apps/web/src/editor/shell/bridge/mode.ts`:

```ts
import type { CoreDeps } from './core'
import type { ViewMode } from './types'

export type ModeDeps = {
  /** `acquireSceneReadOnlyLease` de Pascal (core): solo lectura con cuenta de referencias; devuelve cómo soltarlo. */
  acquireReadOnly(): () => void
  /** `cancelActiveTool` de Pascal (editor): cancela el borrador en curso (un muro a medias) y vuelve a Seleccionar. */
  cancelActiveTool(): void
}

/**
 * Ver = solo lectura de Pascal (D3). Se usa el préstamo de solo lectura y NO `isVersionPreviewMode`, que además pausaría
 * el autoguardado: un cambio hecho justo antes de pasar a Ver se perdería al recargar. Como Pascal sigue dibujando asas
 * al elegir algo, Ver mantiene la selección vacía.
 */
export function createModeSlice(deps: CoreDeps & ModeDeps) {
  let lease: (() => void) | null = null
  let stopGuard: (() => void) | null = null
  const clearSelection = () => deps.viewer.getState().setSelection({ selectedIds: [], zoneId: null })
  const leaveView = () => {
    stopGuard?.()
    stopGuard = null
    lease?.()
    lease = null
  }
  return {
    setMode(mode: 'ver' | 'editar'): void {
      if (mode === 'editar') {
        leaveView()
        return
      }
      if (lease) return
      deps.cancelActiveTool()
      deps.editor.getState().armToolMode({ mode: 'select' })
      clearSelection()
      lease = deps.acquireReadOnly()
      stopGuard = deps.viewer.subscribe(() => {
        const { selection } = deps.viewer.getState()
        if (selection.selectedIds.length > 0 || selection.zoneId) clearSelection()
      })
    },
    setView(view: ViewMode): void {
      deps.editor.getState().setViewMode(view)
    },
    undo(): void {
      deps.history.undo()
    },
    redo(): void {
      deps.history.redo()
    },
    /** Suelta el solo lectura (al desmontar el shell). */
    dispose: leaveView,
  }
}
```

Create `apps/web/src/editor/shell/bridge/selectors.ts`:

```ts
import type { BridgeSnapshot, EditorMode, Phase, ViewMode } from './types'

export type ShellState = {
  mode: 'ver' | 'editar'
  view: ViewMode
  canUndo: boolean
  canRedo: boolean
  firstPerson: boolean
  phase: Phase
  editorMode: EditorMode
  tool: string | null
}

/** Lo que muestran la barra y el dock, leído del estado real de Pascal: nunca se supone (Pascal restaura fase y herramienta). */
export function selectShellState(s: BridgeSnapshot): ShellState {
  return {
    mode: s.scene.readOnly ? 'ver' : 'editar',
    view: s.editor.viewMode,
    canUndo: s.history.canUndo,
    canRedo: s.history.canRedo,
    firstPerson: s.editor.isFirstPersonMode,
    phase: s.editor.phase,
    editorMode: s.editor.mode,
    tool: s.editor.tool,
  }
}
```

- [ ] **Paso 3: Sumar el modo al ensamblado y a los dobles**

Modify `apps/web/src/editor/shell/bridge/index.ts`:

```diff
@@
 import { type CoreDeps, createCoreSlice } from './core'
+import { type ModeDeps, createModeSlice } from './mode'
@@
-export type BridgeDeps = CoreDeps
+export type BridgeDeps = CoreDeps & ModeDeps
@@
     ...createCoreSlice(deps),
+    ...createModeSlice(deps),
     // @@slices
```


Modify `apps/web/test/support/fake-deps.ts`:

```diff
@@
+    acquireReadOnly: vi.fn(() => {
+      scene.setState({ readOnly: true })
+      return () => scene.setState({ readOnly: false })
+    }),
+    cancelActiveTool: vi.fn(),
     // @@fake-deps
```


- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-selectors shell-bridge-mode shell-bridge-core shell-boundaries`
Expected: PASS (`shell-selectors`: 3; `shell-bridge-mode`: 8; `shell-bridge-core`: 3; `shell-boundaries`: 1).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/bridge apps/web/test/support/fake-deps.ts apps/web/test/shell-selectors.test.ts apps/web/test/shell-bridge-mode.test.ts
git commit -m "feat(editor): modo Ver/Editar en solo lectura, vista, historial y selectores puros del puente" -- apps/web/src/editor/shell/bridge apps/web/test/support/fake-deps.ts apps/web/test/shell-selectors.test.ts apps/web/test/shell-bridge-mode.test.ts
```

---

### Task 4c: Puente con Pascal (3 de 3): proveedor, `useShell`, igualdad por valor y estado de guardado

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/shell/equal.ts`, `apps/web/src/editor/shell/save-state.ts`, `apps/web/src/editor/shell/use-bridge.tsx`
- Test: `apps/web/test/shell-equal.test.ts`, `apps/web/test/shell-save-state.test.ts`, `apps/web/test/shell-use-bridge.test.tsx`

**Interfaces:**
- Consumes: `createBridge`, `ShellBridge` (4a, 4b); `BridgeSnapshot` de `shell/bridge/types`; `SaverStatus` (type) de `src/editor/scene-saver.ts`; `SaveState` de `./ui/status` (1c); `createFakeDeps` (4a).
- Produces:
  - `deepEqual(a: unknown, b: unknown): boolean` (`shell/equal.ts`): igualdad por valor de datos simples; estabiliza lo que devuelven los selectores.
  - `saveStateOf(status: SaverStatus): SaveState` (`shell/save-state.ts`): del estado del guardador (`idle`, `pending`, `saving`, `saved`, `error`, `conflict`, `unauthorized`, `rejected`) al chip de la barra. Un rechazo del servidor y la sesión vencida muestran "Sin guardar": el aviso de `SaveBanner` explica qué hacer sin perder lo local.
  - `BridgeProvider({ bridge, children })`, `useBridge(): ShellBridge` (lanza "Falta <BridgeProvider>…" sin proveedor) y `useShell<T>(select: (snapshot: BridgeSnapshot) => T, equals?: (a: T, b: T) => boolean): T` en `shell/use-bridge.tsx` (`useSyncExternalStore` con el resultado estabilizado por valor).

**Por qué `useShell` estabiliza por valor.** Pascal avisa en **cada** cambio de su escena (por ejemplo al arrastrar un muro) y los selectores arman listas nuevas cada vez; si cada aviso repintara todo el shell, arrastrar un muro lo haría parpadear. `useShell` solo vuelve a pintar si el resultado cambió **de valor** (`deepEqual` por omisión).

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-equal.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { deepEqual } from '../src/editor/shell/equal'

describe('deepEqual', () => {
  it('compara por valor objetos, listas y primitivos', () => {
    expect(deepEqual({ a: 1, b: [1, { c: 'x' }] }, { a: 1, b: [1, { c: 'x' }] })).toBe(true)
    expect(deepEqual([1, 2], [1, 2])).toBe(true)
    expect(deepEqual(null, null)).toBe(true)
    expect(deepEqual(NaN, NaN)).toBe(true)
  })

  it('distingue valores, largos, claves y listas de objetos', () => {
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false)
    expect(deepEqual([], {})).toBe(false)
    expect(deepEqual(null, {})).toBe(false)
  })
})
```

Create `apps/web/test/shell-save-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { saveStateOf } from '../src/editor/shell/save-state'

describe('saveStateOf (estado del guardador → chip de la barra)', () => {
  it.each([
    ['idle', 'sin-cambios'],
    ['pending', 'guardando'],
    ['saving', 'guardando'],
    ['saved', 'guardado'],
    ['error', 'sin-conexion'],
    ['conflict', 'conflicto'],
    ['unauthorized', 'sin-guardar'],
    ['rejected', 'sin-guardar'],
  ] as const)('%s se muestra como %s', (status, state) => {
    expect(saveStateOf(status)).toBe(state)
  })
})
```

Create `apps/web/test/shell-use-bridge.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { BridgeProvider, useShell } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

function render(node: (bridge: ReturnType<typeof createBridge>) => React.ReactNode, setup?: (fake: ReturnType<typeof createFakeDeps>) => void) {
  const fake = createFakeDeps()
  setup?.(fake)
  const bridge = createBridge(fake.deps)
  return renderToStaticMarkup(<BridgeProvider bridge={bridge}>{node(bridge)}</BridgeProvider>)
}

describe('useShell', () => {
  it('lee del estado real del puente y falla con un mensaje claro sin proveedor', () => {
    const Probe = () => <p>{useShell((s) => s.editor.viewMode)}</p>
    expect(render(() => <Probe />, ({ editor }) => editor.setState({ viewMode: 'split' }))).toBe('<p>split</p>')
    expect(() => renderToStaticMarkup(<Probe />)).toThrow('Falta <BridgeProvider>')
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-equal shell-save-state shell-use-bridge`
Expected: FAIL — `Cannot find module '../src/editor/shell/equal'`, `'../src/editor/shell/save-state'` y `'../src/editor/shell/use-bridge'` (tres archivos de prueba en rojo).

- [ ] **Paso 2: Escribir la igualdad por valor y el estado de guardado**

Create `apps/web/src/editor/shell/equal.ts`:

```ts
/** Igualdad por valor de datos simples (primitivos, listas y objetos): estabiliza lo que devuelven los selectores. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const keysA = Object.keys(a)
  if (keysA.length !== Object.keys(b).length) return false
  return keysA.every(
    (key) => key in b && deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  )
}
```

Create `apps/web/src/editor/shell/save-state.ts`:

```ts
import type { SaverStatus } from '../scene-saver'
import type { SaveState } from './ui/status'

/**
 * Estado del guardador (`scene-saver`) → chip de la barra superior. Un rechazo del servidor y la sesión vencida muestran
 * "Sin guardar": el aviso de `SaveBanner` explica qué hacer sin perder lo local.
 */
export function saveStateOf(status: SaverStatus): SaveState {
  switch (status) {
    case 'idle':
      return 'sin-cambios'
    case 'pending':
    case 'saving':
      return 'guardando'
    case 'saved':
      return 'guardado'
    case 'error':
      return 'sin-conexion'
    case 'conflict':
      return 'conflicto'
    case 'unauthorized':
    case 'rejected':
      return 'sin-guardar'
  }
}
```

- [ ] **Paso 3: Escribir el proveedor y el hook de lectura**

Create `apps/web/src/editor/shell/use-bridge.tsx`:

```tsx
'use client'

import { createContext, type ReactNode, useContext, useRef, useSyncExternalStore } from 'react'
import type { ShellBridge } from './bridge'
import type { BridgeSnapshot } from './bridge/types'
import { deepEqual } from './equal'

const BridgeContext = createContext<ShellBridge | null>(null)

export function BridgeProvider({ bridge, children }: { bridge: ShellBridge; children: ReactNode }) {
  return <BridgeContext.Provider value={bridge}>{children}</BridgeContext.Provider>
}

export function useBridge(): ShellBridge {
  const bridge = useContext(BridgeContext)
  if (!bridge) throw new Error('Falta <BridgeProvider> alrededor del shell del editor.')
  return bridge
}

/**
 * Lee del estado real de Pascal lo que `select` pida. Solo vuelve a pintar si el resultado cambió **de valor**: Pascal avisa
 * en cada cambio de su escena (por ejemplo al arrastrar un muro) y los selectores arman listas nuevas cada vez.
 */
export function useShell<T>(select: (snapshot: BridgeSnapshot) => T, equals: (a: T, b: T) => boolean = deepEqual): T {
  const bridge = useBridge()
  const last = useRef<{ value: T } | null>(null)
  const read = () => {
    const next = select(bridge.snapshot())
    if (last.current && equals(last.current.value, next)) return last.current.value
    last.current = { value: next }
    return next
  }
  return useSyncExternalStore(bridge.subscribe, read, read)
}
```

- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-equal shell-save-state shell-use-bridge shell-boundaries`
Expected: PASS (`shell-equal`: 2; `shell-save-state`: 8; `shell-use-bridge`: 1; `shell-boundaries`: 1).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/equal.ts apps/web/src/editor/shell/save-state.ts apps/web/src/editor/shell/use-bridge.tsx apps/web/test/shell-equal.test.ts apps/web/test/shell-save-state.test.ts apps/web/test/shell-use-bridge.test.tsx
git commit -m "feat(editor): proveedor del puente, useShell con resultado estable, igualdad por valor y estado de guardado" -- apps/web/src/editor/shell/equal.ts apps/web/src/editor/shell/save-state.ts apps/web/src/editor/shell/use-bridge.tsx apps/web/test/shell-equal.test.ts apps/web/test/shell-save-state.test.ts apps/web/test/shell-use-bridge.test.tsx
```

---

### Task 4d: Piezas conectadas del shell (Ver/Editar, 2D/3D/Ambas, deshacer, barra superior) y `EditorShell`

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/shell/ModeSwitch.tsx`, `ViewSwitch.tsx`, `ShellUndoRedo.tsx`, `ShellTopBar.tsx`, `EditorShell.tsx` (todos en `apps/web/src/editor/shell/`)
- Test: `apps/web/test/shell-connected.test.tsx`

**Interfaces:**
- Consumes: `Segmented`, `SegItem` (1b); `TopBar` (1d); `UndoRedo` (1d); `useBridge`, `useShell`, `BridgeProvider` (4c); `selectShellState` y `createBridge` (4b); `saveStateOf` (4c); `SaverStatus` de `src/editor/scene-saver.ts`; `createFakeDeps` (4a).
- Produces:
  - `ModeSwitch()`: Ver | Editar (`bridge.setMode`); `ViewSwitch()`: 2D | 3D | Ambas (`bridge.setView`); `ShellUndoRedo()`: Deshacer/Rehacer habilitados según el historial real de Pascal; `ShellTopBar(props: { name: string; saveStatus: SaverStatus; onBack: () => void; backBusy?: boolean })`.
  - `EditorShell(props: { bridge: ShellBridge; projectName: string; saveStatus: SaverStatus; onBack: () => void; backBusy?: boolean })`: contenedor `data-editor-shell` que no recibe clics (`pointer-events-none`), `z-40` (por debajo de los diálogos de Pascal `z-50` y del cargador `z-60`). Al montar llama `bridge.mountDefaults()` y al desmontar suelta el solo lectura (`bridge.dispose()`). Las tareas 5c, 6c, 7d y siguientes le suman sus paneles.

El shell **lee** el estado real de Pascal por el puente: nunca supone la herramienta ni la selección con que se abre (Pascal restaura fase, herramienta y selección desde `localStorage`). Las piezas se prueban con los dobles de la Tarea 4a; el cableado con los almacenes reales es la Tarea 4e y el montaje en el editor, la 4f.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-connected.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { EditorShell } from '../src/editor/shell/EditorShell'
import { ModeSwitch } from '../src/editor/shell/ModeSwitch'
import { ShellUndoRedo } from '../src/editor/shell/ShellUndoRedo'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { ViewSwitch } from '../src/editor/shell/ViewSwitch'
import { createFakeDeps } from './support/fake-deps'

const NO_EMOJI = /\p{Extended_Pictographic}/u
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => {}
const pressedOf = (markup: string) => [...markup.matchAll(/aria-pressed="(true|false)"[^>]*>(?:<svg[\s\S]*?<\/svg>)?([^<]+)<\/button>/g)].map((m) => [m[2], m[1]])

function render(node: (bridge: ReturnType<typeof createBridge>) => React.ReactNode, setup?: (fake: ReturnType<typeof createFakeDeps>) => void) {
  const fake = createFakeDeps()
  setup?.(fake)
  const bridge = createBridge(fake.deps)
  return renderToStaticMarkup(<BridgeProvider bridge={bridge}>{node(bridge)}</BridgeProvider>)
}

describe('ModeSwitch', () => {
  it('marca Editar al abrir y Ver cuando la escena está en solo lectura', () => {
    expect(pressedOf(render(() => <ModeSwitch />))).toEqual([['Ver', 'false'], ['Editar', 'true']])
    expect(pressedOf(render(() => <ModeSwitch />, ({ scene }) => scene.setState({ readOnly: true })))).toEqual([['Ver', 'true'], ['Editar', 'false']])
  })
})

describe('ViewSwitch', () => {
  it('ofrece 2D, 3D y Ambas y marca la vista real de Pascal (Ambas = split)', () => {
    expect(pressedOf(render(() => <ViewSwitch />))).toEqual([['2D', 'false'], ['3D', 'true'], ['Ambas', 'false']])
    expect(pressedOf(render(() => <ViewSwitch />, ({ editor }) => editor.setState({ viewMode: 'split' })))).toEqual([['2D', 'false'], ['3D', 'false'], ['Ambas', 'true']])
  })
})

describe('ShellUndoRedo', () => {
  it('sin cambios ambos botones están deshabilitados; con algo que deshacer, solo Rehacer', () => {
    expect(render(() => <ShellUndoRedo />).match(/disabled=""/g)).toHaveLength(2)
    const withUndo = render(() => <ShellUndoRedo />, ({ history }) => history.set({ canUndo: true, canRedo: false }))
    expect(withUndo.match(/disabled=""/g)).toHaveLength(1)
  })
})

describe('EditorShell', () => {
  const shell = (setup?: Parameters<typeof render>[1], status: 'saved' | 'idle' = 'saved') =>
    render(
      (bridge) => <EditorShell bridge={bridge} projectName="Loft Palermo" saveStatus={status} onBack={noop} />,
      setup,
    )

  it('es un contenedor que deja pasar los clics, por debajo de los diálogos de Pascal, con la barra superior', () => {
    const markup = shell()
    expect(markup).toContain('data-editor-shell')
    expect(markup).toContain('pointer-events-none')
    expect(markup).toContain('z-40')
    expect(markup).toMatch(/<h1[^>]*>Loft Palermo<\/h1>/)
    expect(textOf(markup)).toContain('Guardado')
  })

  it('en Editar muestra deshacer y rehacer; en Ver no', () => {
    expect(shell()).toContain('aria-label="Deshacer"')
    expect(shell(({ scene }) => scene.setState({ readOnly: true }))).not.toContain('aria-label="Deshacer"')
  })

  it('el chip refleja el estado del guardador y no usa emojis', () => {
    expect(textOf(shell(undefined, 'idle'))).toContain('Sin cambios')
    expect(shell()).not.toMatch(NO_EMOJI)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-connected`
Expected: FAIL — `Cannot find module '../src/editor/shell/EditorShell'`.

- [ ] **Paso 2: Escribir las piezas conectadas**

Create `apps/web/src/editor/shell/ModeSwitch.tsx`:

```tsx
'use client'

import { Eye, PenLine } from 'lucide-react'
import { selectShellState } from './bridge/selectors'
import { type SegItem, Segmented } from './ui/primitives'
import { useBridge, useShell } from './use-bridge'

const MODES: readonly SegItem<'ver' | 'editar'>[] = [
  { id: 'ver', icon: Eye, label: 'Ver' },
  { id: 'editar', icon: PenLine, label: 'Editar' },
]

/** Ver | Editar: Ver es el modo de solo lectura de Pascal (D3). */
export function ModeSwitch() {
  const bridge = useBridge()
  const mode = useShell((s) => selectShellState(s).mode)
  return <Segmented label="Modo del editor" items={MODES} value={mode} onChange={bridge.setMode} />
}
```

Create `apps/web/src/editor/shell/ViewSwitch.tsx`:

```tsx
'use client'

import { Box, Columns2, Map as MapIcon } from 'lucide-react'
import { selectShellState } from './bridge/selectors'
import type { ViewMode } from './bridge/types'
import { type SegItem, Segmented } from './ui/primitives'
import { useBridge, useShell } from './use-bridge'

const VIEWS: readonly SegItem<ViewMode>[] = [
  { id: '2d', icon: MapIcon, label: '2D' },
  { id: '3d', icon: Box, label: '3D' },
  { id: 'split', icon: Columns2, label: 'Ambas' },
]

/** 2D | 3D | Ambas = `setViewMode('2d' | '3d' | 'split')` de Pascal (se conserva al recargar: Pascal lo guarda). */
export function ViewSwitch() {
  const bridge = useBridge()
  const view = useShell((s) => selectShellState(s).view)
  return <Segmented label="Vista del plano" items={VIEWS} value={view} onChange={bridge.setView} />
}
```

Create `apps/web/src/editor/shell/ShellUndoRedo.tsx`:

```tsx
'use client'

import { UndoRedo } from './ui/UndoRedo'
import { useBridge, useShell } from './use-bridge'

/** Deshacer y Rehacer habilitados según el historial real de Pascal. */
export function ShellUndoRedo() {
  const bridge = useBridge()
  const { canUndo, canRedo } = useShell((s) => ({ canUndo: s.history.canUndo, canRedo: s.history.canRedo }))
  return (
    <UndoRedo
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={bridge.undo}
      onRedo={bridge.redo}
      className="absolute bottom-6 left-5 z-10"
    />
  )
}
```

- [ ] **Paso 3: Escribir la barra conectada y el contenedor del shell**

Create `apps/web/src/editor/shell/ShellTopBar.tsx`:

```tsx
'use client'

import type { SaverStatus } from '../scene-saver'
import { ModeSwitch } from './ModeSwitch'
import { saveStateOf } from './save-state'
import { TopBar } from './ui/TopBar'
import { ViewSwitch } from './ViewSwitch'

export function ShellTopBar({
  name,
  saveStatus,
  onBack,
  backBusy,
}: {
  name: string
  saveStatus: SaverStatus
  onBack: () => void
  backBusy?: boolean
}) {
  return (
    <TopBar
      name={name}
      saveState={saveStateOf(saveStatus)}
      onBack={onBack}
      backBusy={backBusy}
      center={<ModeSwitch />}
      right={<ViewSwitch />}
    />
  )
}
```

Create `apps/web/src/editor/shell/EditorShell.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import type { SaverStatus } from '../scene-saver'
import type { ShellBridge } from './bridge'
import { selectShellState } from './bridge/selectors'
import { ShellTopBar } from './ShellTopBar'
import { ShellUndoRedo } from './ShellUndoRedo'
import { BridgeProvider, useShell } from './use-bridge'

function ShellBody() {
  const mode = useShell((s) => selectShellState(s).mode)
  return mode === 'editar' ? <ShellUndoRedo /> : null
}

/**
 * El shell de Madori sobre el lienzo de Pascal: un contenedor que deja pasar los clics (`pointer-events-none`) con piezas que sí
 * los reciben. Va por debajo de los diálogos de Pascal (`z-50`) y de su cargador (`z-60`). Lee el estado real de Pascal por el
 * puente; nunca supone la herramienta ni la selección con que se abre.
 */
export function EditorShell({
  bridge,
  projectName,
  saveStatus,
  onBack,
  backBusy,
}: {
  bridge: ShellBridge
  projectName: string
  saveStatus: SaverStatus
  onBack: () => void
  backBusy?: boolean
}) {
  useEffect(() => {
    const stop = bridge.mountDefaults()
    return () => {
      stop()
      bridge.dispose()
    }
  }, [bridge])
  return (
    <BridgeProvider bridge={bridge}>
      <div data-editor-shell className="editor-shell pointer-events-none absolute inset-0 z-40 overflow-hidden">
        <ShellTopBar name={projectName} saveStatus={saveStatus} onBack={onBack} backBusy={backBusy} />
        <ShellBody />
      </div>
    </BridgeProvider>
  )
}
```

- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-connected shell-boundaries`
Expected: PASS (`shell-connected`: 6 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/ModeSwitch.tsx apps/web/src/editor/shell/ViewSwitch.tsx apps/web/src/editor/shell/ShellUndoRedo.tsx apps/web/src/editor/shell/ShellTopBar.tsx apps/web/src/editor/shell/EditorShell.tsx apps/web/test/shell-connected.test.tsx
git commit -m "feat(editor): piezas conectadas del shell (Ver/Editar, 2D/3D/Ambas, deshacer y barra superior) y EditorShell" -- apps/web/src/editor/shell/ModeSwitch.tsx apps/web/src/editor/shell/ViewSwitch.tsx apps/web/src/editor/shell/ShellUndoRedo.tsx apps/web/src/editor/shell/ShellTopBar.tsx apps/web/src/editor/shell/EditorShell.tsx apps/web/test/shell-connected.test.tsx
```

---

### Task 4e: Puente real con Pascal (`pascal-bridge.ts`) y ganchos de lectura para las pruebas

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Modify: `apps/web/src/editor/pascal-bridge.ts` (se reescribe entero: conserva `applyEditorTheme` y suma el puente real), `apps/web/src/editor/e2e-hooks.ts` (suma `state()` y `select()`)

**Interfaces:**
- Consumes: `createBridge`, `ShellBridge`, `BridgeDeps` (`shell/bridge`, 4a y 4b); `CoreDeps`, `HistoryPort` (`bridge/core`); `ModeDeps` (`bridge/mode`); `DECISIONS` (0c); `appFontClasses` (2b).
- Produces:
  - `createPascalBridge(): ShellBridge` en `src/editor/pascal-bridge.ts`: **único** archivo del shell que toca `useEditor`, `useViewer`, `useScene`, `runUndo`, `acquireSceneReadOnlyLease`… Usa `import * as Pascal from '@pascal-app/editor'`, así las tareas siguientes agregan dependencias sin tocar la lista de importaciones. Cada tarea suma su función `xxxDeps()` arriba de `// @@deps`.
  - `applyEditorTheme(): () => void` (sin cambios).
  - Ganchos `window.__e2e.state(): { phase; mode; tool; viewMode; readOnly; firstPerson; canUndo; canRedo; selectedIds: string[]; zoneId: string | null; levelId: string | null }` y `select(id: string | null): void`, que leen **Pascal directamente** (no el shell): lo que las pruebas en navegador comparan con lo que el shell muestra.

**Sin prueba unitaria propia.** Esta tarea es solo cableado: lo comprueba el compilador (TypeScript rechaza `editor: Pascal.useEditor` si el almacén real no tiene la forma de `StoreLike<EditorLike>`; lo mismo para `useViewer` y `useScene`) y lo ejercita en el navegador la Tarea 4f, cuyas pruebas se escriben antes y fallan primero. Las dos decisiones de código que dependen del spike (`historySource`, Tarea 0c) están en la función `historyPort()`.

- [ ] **Paso 1: Escribir el puente real (la única pieza que toca los almacenes de Pascal)**

Create `apps/web/src/editor/pascal-bridge.ts` (ya existe: reemplázalo entero con esto):

```ts
import * as Pascal from '@pascal-app/editor'
import { appFontClasses } from '@/components/AppShell'
import { type ShellBridge, createBridge } from './shell/bridge'
import type { CoreDeps, HistoryPort } from './shell/bridge/core'
import type { ModeDeps } from './shell/bridge/mode'
import { DECISIONS } from './shell/decisions'

/**
 * Único archivo de `src/editor` que toca los almacenes y funciones de Pascal para el shell: `src/editor/shell/` usa tipos propios
 * (lo vigila `shell-boundaries.test.ts`) y recibe de aquí lo que necesita. TypeScript comprueba que `useEditor`, `useViewer` y
 * `useScene` tengan la forma que piden las interfaces del puente. Cada tarea suma su función `xxxDeps()` arriba de `// @@deps`.
 */

/** Escena `studio` (apariencia clara), metros, y las fuentes de la interfaz en <body>, donde cuelgan los portales de Pascal. */
export function applyEditorTheme(): () => void {
  const viewer = Pascal.useViewer.getState()
  viewer.setSceneTheme('studio')
  viewer.setUnit('metric')
  const classes = appFontClasses.split(' ')
  document.body.classList.add(...classes)
  return () => document.body.classList.remove(...classes)
}

/** Historial: `getHistoryCommandState` de Pascal, o (decisión de la Tarea 0b) el historial de la escena leído directamente. */
function historyPort(): HistoryPort {
  const fromPascal = DECISIONS.historySource === 'pascal'
  return {
    read: fromPascal
      ? () => {
          const { canUndo, canRedo } = Pascal.getHistoryCommandState()
          return { canUndo, canRedo }
        }
      : () => {
          const temporal = Pascal.useScene.temporal.getState()
          return { canUndo: temporal.pastStates.length > 0, canRedo: temporal.futureStates.length > 0 }
        },
    subscribe: fromPascal
      ? Pascal.subscribeHistoryCommandState
      : (listener) => Pascal.useScene.temporal.subscribe(listener),
    undo: () => {
      Pascal.runUndo()
    },
    redo: () => {
      Pascal.runRedo()
    },
  }
}

function coreDeps(): CoreDeps {
  return {
    editor: Pascal.useEditor,
    viewer: Pascal.useViewer,
    scene: Pascal.useScene,
    history: historyPort(),
    applyTheme: applyEditorTheme,
    // `focus([])` oculta el aviso de cámara en inglés (editor/src/store/use-camera-hint-focus.ts); `focus(null)` lo devuelve.
    hideCameraHint: () => {
      Pascal.useCameraHintFocus.getState().focus([])
      return () => Pascal.useCameraHintFocus.getState().focus(null)
    },
  }
}

function modeDeps(): ModeDeps {
  return {
    acquireReadOnly: Pascal.acquireSceneReadOnlyLease,
    cancelActiveTool: () => {
      Pascal.cancelActiveTool()
    },
  }
}

export function createPascalBridge(): ShellBridge {
  return createBridge({
    ...coreDeps(),
    ...modeDeps(),
    // @@deps
  })
}
```

- [ ] **Paso 2: Ganchos de lectura para las pruebas en navegador**

Modify `apps/web/src/editor/e2e-hooks.ts`:

```diff
@@
-import { armToolMode } from '@pascal-app/editor'
+import { armToolMode, getHistoryCommandState, useEditor } from '@pascal-app/editor'
@@
     armWall: () => armToolMode({ mode: 'build', tool: 'wall' }),
+    /** Lectura directa de Pascal (no del shell): lo que las pruebas comparan con lo que el shell muestra. */
+    state: () => {
+      const editor = useEditor.getState()
+      const selection = useViewer.getState().selection
+      const history = getHistoryCommandState()
+      return {
+        phase: editor.phase,
+        mode: editor.mode,
+        tool: editor.tool,
+        viewMode: editor.viewMode,
+        readOnly: useScene.getState().readOnly,
+        firstPerson: editor.isFirstPersonMode,
+        canUndo: history.canUndo,
+        canRedo: history.canRedo,
+        selectedIds: [...selection.selectedIds] as string[],
+        zoneId: selection.zoneId as string | null,
+        levelId: selection.levelId as string | null,
+      }
+    },
+    select: (id: string | null) => useViewer.getState().setSelection({ selectedIds: id ? ([id] as never) : [], zoneId: null }),
```


- [ ] **Paso 3: Tipos y lint**

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` (el puente comprueba por tipos que los almacenes reales tienen la forma de `StoreLike<EditorLike>`, `StoreLike<ViewerLike>` y `StoreLike<SceneLike>`) y Biome sin errores nuevos. Si TypeScript rechaza `scene: Pascal.useScene` por la forma de `nodes` (claves con patrón de plantilla), conviértelo con `Pascal.useScene as unknown as StoreLike<SceneLike>` y deja un comentario con el motivo; no relajes `SceneLike`.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/pascal-bridge.ts apps/web/src/editor/e2e-hooks.ts
git commit -m "feat(editor): puente real con Pascal (almacenes, historial, solo lectura) y ganchos de lectura para las pruebas" -- apps/web/src/editor/pascal-bridge.ts apps/web/src/editor/e2e-hooks.ts
```

---

### Task 4f: El shell dentro del editor (`ProjectEditor`) y pruebas en navegador de modos, vista e historial

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Modify: `apps/web/src/editor/ProjectEditor.tsx`, `apps/web/src/editor/SaveBanner.tsx` (se reescribe entero: solo avisos; el estado corriente pasa al chip), `apps/web/e2e/support/projects.ts` (suma `createBlankProject`)
- Create: `apps/web/e2e/support/shell.ts`, `apps/web/e2e/modos.spec.ts`
- Test: `apps/web/e2e/modos.spec.ts` (navegador real); las pruebas unitarias del shell ya cubren el resto (Tareas 4a a 4d)

**Interfaces:**
- Consumes: `createPascalBridge` (4e), `EditorShell` (4d), `useNavigate()` de `@/lib/use-navigate` (`{ go(href), pending }`), `hook` (3b), `luminanceOf` (2a), `createProjectViaUi` de `e2e/support/projects.ts`.
- Produces: `ProjectEditor` monta `<EditorShell>` como hermano del `<Editor>` (encima, `z-40`); el tema y el aviso de cámara los aplica `bridge.mountDefaults()` (se quita el `useEffect` de la Tarea 2b); `SaveBanner` conserva `data-testid="save-alert"` y los textos de sus avisos; `modeButton(page, name)`, `viewButton(page, name)` y `undoRedo(page)` en `e2e/support/shell.ts`; `createBlankProject(page, label): Promise<string>` en `e2e/support/projects.ts` (crea un proyecto en blanco con nombre único y devuelve su URL: lo usan todas las pruebas en navegador que parten de un proyecto vacío).

Qué cambia a la vista: aparecen la barra superior (volver, nombre, chip de guardado, Ver | Editar, 2D | 3D | Ambas) y Deshacer/Rehacer. El dock, los paneles y las propiedades llegan en las tareas 5 a 9; hasta la Tarea 5c el editor no tiene dock (el de Pascal ya está oculto desde la 3b): esta rama **no se fusiona** antes de la Tarea 12b.

- [ ] **Paso 1: Escribir las pruebas en navegador (rojo)**

Primero el apoyo común: casi todas las pruebas de esta serie parten de un proyecto en blanco, y esa receta va en un solo lugar, junto a `createProjectViaUi`.

Modify `apps/web/e2e/support/projects.ts`:

```diff
@@
   if (options.waitForEditor !== false) await ready(page)
   return page.url()
 }
+
+/** Un proyecto en blanco con nombre único (`E2E <etiqueta> <hora>`); devuelve la URL del proyecto abierto. */
+export const createBlankProject = (page: Page, label: string) =>
+  createProjectViaUi(page, { name: `E2E ${label} ${Date.now()}`, template: null })
```


Create `apps/web/e2e/support/shell.ts`:

```ts
import type { Page } from '@playwright/test'

export const modeButton = (page: Page, name: 'Ver' | 'Editar') =>
  page.getByRole('group', { name: 'Modo del editor' }).getByRole('button', { name, exact: true })

export const viewButton = (page: Page, name: '2D' | '3D' | 'Ambas') =>
  page.getByRole('group', { name: 'Vista del plano' }).getByRole('button', { name, exact: true })

export const undoRedo = (page: Page) => ({
  group: page.getByRole('group', { name: 'Historial' }),
  undo: page.getByRole('button', { name: 'Deshacer' }),
  redo: page.getByRole('button', { name: 'Rehacer' }),
})
```

Create `apps/web/e2e/modos.spec.ts`:

```ts
import { type Page, expect, test } from '@playwright/test'
import { counts, ready } from './support/editor'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { modeButton, undoRedo, viewButton } from './support/shell'
import { luminanceOf } from './support/theme'

const walls = async (page: Page) => (await counts(page)).wall ?? 0

test('abre en Editar con el nombre del proyecto, el chip de guardado y la barra de Madori', async ({ page }) => {
  await createBlankProject(page, 'barra')
  await expect(modeButton(page, 'Editar')).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 })
  await expect(modeButton(page, 'Ver')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('heading', { level: 1, name: /E2E barra/ })).toBeVisible()
  await expect(page.getByTestId('save-status')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Volver a mis proyectos' })).toBeEnabled()
})

test('Ver con la herramienta de muro armada (proyecto en blanco) la desarma, bloquea la escena y esconde el historial; Editar no la rearma', async ({ page }) => {
  await createBlankProject(page, 'ver')
  await expect(modeButton(page, 'Editar')).toBeVisible({ timeout: 15_000 })
  // Pascal abre un proyecto en blanco con la herramienta de muro ya armada: el shell no puede suponer "Seleccionar".
  await expect.poll(async () => (await hook(page, 'state')).tool, { timeout: 15_000 }).toBe('wall')

  await modeButton(page, 'Ver').click()
  await expect(modeButton(page, 'Ver')).toHaveAttribute('aria-pressed', 'true')
  expect(await hook(page, 'state')).toMatchObject({ readOnly: true, mode: 'select', tool: null })
  await expect(undoRedo(page).group).toHaveCount(0)

  await modeButton(page, 'Editar').click()
  expect(await hook(page, 'state')).toMatchObject({ readOnly: false, mode: 'select', tool: null })
  await expect(undoRedo(page).group).toBeVisible()
})

test('en Ver, Supr, Retroceso y las teclas de herramienta no cambian la escena', async ({ page }) => {
  await createBlankProject(page, 'teclas')
  await expect(modeButton(page, 'Ver')).toBeVisible({ timeout: 15_000 })
  await hook(page, 'addWall')
  await hook(page, 'selectFirstWall')
  const before = await counts(page)
  await modeButton(page, 'Ver').click()
  expect((await hook(page, 'state')).selectedIds).toEqual([]) // Ver limpia la selección
  // Ctrl+Z no está en la lista a propósito: el historial de Pascal no mira el solo lectura y lo frena el shell (Tarea 11b).
  for (const key of ['Delete', 'Backspace', 'x', 'b']) await page.keyboard.press(key)
  expect(await counts(page)).toEqual(before)
})

test('2D / 3D / Ambas cambia la vista de Pascal y se conserva al recargar', async ({ page }) => {
  const url = await createBlankProject(page, 'vista')
  await viewButton(page, '2D').click()
  await expect.poll(async () => (await hook(page, 'state')).viewMode).toBe('2d')
  await viewButton(page, 'Ambas').click()
  await expect.poll(async () => (await hook(page, 'state')).viewMode).toBe('split')
  await page.goto(url)
  await ready(page)
  await expect(viewButton(page, 'Ambas')).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 })
  expect((await hook(page, 'state')).viewMode).toBe('split')
  await viewButton(page, '3D').click()
  await expect.poll(async () => (await hook(page, 'state')).viewMode).toBe('3d')
})

test('Deshacer y Rehacer se habilitan y deshabilitan solos según el historial real', async ({ page }) => {
  await createBlankProject(page, 'historial')
  const { undo, redo } = undoRedo(page)
  await expect(undo).toBeDisabled({ timeout: 15_000 })
  await expect(redo).toBeDisabled()
  const before = await walls(page)
  await hook(page, 'addWall')
  await expect(undo).toBeEnabled()
  expect(await walls(page)).toBe(before + 1)
  await undo.click()
  await expect.poll(() => walls(page)).toBe(before)
  await expect(redo).toBeEnabled()
  await redo.click()
  await expect.poll(() => walls(page)).toBe(before + 1)
})

test('recargar estando en Ver abre en Editar y la escena se puede editar', async ({ page }) => {
  const url = await createBlankProject(page, 'recarga')
  await modeButton(page, 'Ver').click()
  await page.goto(url)
  await ready(page)
  await expect(modeButton(page, 'Editar')).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 })
  expect((await hook(page, 'state')).readOnly).toBe(false)
  const before = await walls(page)
  await hook(page, 'addWall')
  expect(await walls(page)).toBe(before + 1)
})

test('ninguna pieza flotante del shell tiene fondo oscuro aunque Pascal ponga body.dark', async ({ page }) => {
  await createBlankProject(page, 'luz')
  await expect(modeButton(page, 'Editar')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('body')).toHaveClass(/\bdark\b/)
  const colors = await page.evaluate(() =>
    [...document.querySelectorAll('[data-editor-shell] .shell-float')].map((el) => getComputedStyle(el).backgroundColor),
  )
  expect(colors.length).toBeGreaterThanOrEqual(3)
  for (const color of colors) expect(luminanceOf(color) ?? 1, color).toBeGreaterThanOrEqual(0.6)
})
```

Run: `pnpm --filter @interiores/web e2e e2e/modos.spec.ts`
Expected: FAIL — no existe `[data-editor-shell]` ni `getByRole('group', { name: 'Modo del editor' })` (el shell todavía no está montado).

- [ ] **Paso 2: Montar el shell en `ProjectEditor`**

Modify `apps/web/src/editor/ProjectEditor.tsx`:

```diff
@@
-import { applyEditorTheme } from './pascal-bridge'
+import { createPascalBridge } from './pascal-bridge'
@@
 import { SaveBanner } from './SaveBanner'
+import { EditorShell } from './shell/EditorShell'
@@
 import { friendlyMessage } from '@/lib/api/errors'
+import { useNavigate } from '@/lib/use-navigate'
@@
-  // Tema claro de Madori: escena `studio`, metros y la tipografía en <body> (los portales de Pascal cuelgan de ahí).
-  useEffect(() => applyEditorTheme(), [])
+  // El puente con Pascal y el shell de Madori; `EditorShell` aplica el tema claro y oculta el aviso de cámara al montarse.
+  const bridge = useMemo(() => createPascalBridge(), [])
+  const { go, pending: leaving } = useNavigate()
 
@@
-    <div className="relative h-screen w-screen">
+    <div className="relative h-screen w-screen overflow-hidden">
@@
         sidebarTabs={sidebarTabs}
       />
+      <EditorShell
+        backBusy={leaving}
+        bridge={bridge}
+        onBack={() => go('/proyectos')}
+        projectName={phase.name}
+        saveStatus={status}
+      />
     </div>
```


- [ ] **Paso 3: `SaveBanner` solo con los avisos (el estado corriente vive en el chip)**

Create `apps/web/src/editor/SaveBanner.tsx` (ya existe: reemplázalo entero con esto):

```tsx
'use client'

import type { SaverStatus } from './scene-saver'

type Props = { status: SaverStatus; detail?: string; onKeepEditing: () => void; dismissed: boolean }

const ALERT = 'absolute left-1/2 top-24 z-50 -translate-x-1/2 rounded-xl bg-white p-4 text-sm shadow-lg'

/**
 * Avisos que explican qué hacer cuando el guardado se detiene (rechazo, conflicto o sesión vencida) sin perder lo local.
 * El estado corriente (guardando, guardado…) lo muestra el chip de la barra superior del shell.
 */
export function SaveBanner({ status, detail, onKeepEditing, dismissed }: Props) {
  if (status === 'rejected') {
    return (
      <div data-testid="save-alert" role="alert" className={ALERT}>
        {detail ?? 'La escena no se puede guardar.'} Tu trabajo local sigue en esta pantalla.
      </div>
    )
  }
  if (status === 'conflict' && !dismissed) {
    return (
      <div data-testid="save-alert" role="alert" className={`${ALERT} flex flex-col gap-2`}>
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
      <div data-testid="save-alert" role="alert" className={ALERT}>
        Tu sesión venció. Tu trabajo local sigue aquí:{' '}
        <a className="underline" href="/login" rel="noreferrer" target="_blank">
          ingresa de nuevo en otra pestaña
        </a>{' '}
        y este editor retomará el guardado solo.
      </div>
    )
  }
  return null
}
```

- [ ] **Paso 4: Verde de las pruebas existentes, tipos y navegador**

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

Run: `pnpm --filter @interiores/web e2e e2e/modos.spec.ts e2e/persistence.spec.ts e2e/pascal-chrome.spec.ts e2e/tema.spec.ts`
Expected: PASS. `persistence.spec.ts` sigue verde porque el chip conserva `data-testid="save-status"` con el texto "Guardado" y el aviso conserva `save-alert`. Si `modos.spec.ts` falla en la primera aserción de `state().tool === 'wall'`, mira qué herramienta tiene realmente el proyecto en blanco (`await hook(page, 'state')`) y corrige **la nota de `docs/pascal-notes.md`** además de la prueba: es el comportamiento real de Pascal el que manda.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/ProjectEditor.tsx apps/web/src/editor/SaveBanner.tsx apps/web/e2e/support/shell.ts apps/web/e2e/modos.spec.ts
git commit -m "feat(editor): barra superior, Ver/Editar, vista 2D/3D/Ambas y deshacer/rehacer montados sobre el lienzo de Pascal" -- apps/web/src/editor/ProjectEditor.tsx apps/web/src/editor/SaveBanner.tsx apps/web/e2e/support/shell.ts apps/web/e2e/modos.spec.ts
```

---

### Task 5a: Modelo del dock (tabla 4.3 del spec)

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/shell/dock-model.ts`
- Test: `apps/web/test/shell-dock-model.test.ts`

**Interfaces:**
- Consumes: `DockButton`, `MenuEntry` de `./ui/Dock` (Tarea 1e); `DECISIONS` y `Decisions` de `./decisions` (0c: `zoneTool`); `Phase` y `EditorMode` de `./bridge/types` (4a).
- Produces (`src/editor/shell/dock-model.ts`, puro):
  - `type DockId = 'select' | 'structure' | 'openings' | 'furniture' | 'materials' | 'measure' | 'more'`, `type StructureTool = 'wall' | 'zone' | 'slab' | 'ceiling' | 'stair' | 'column'`, `type OpeningTool = 'door' | 'window'`, `type MeasureKind = 'distance' | 'angle' | 'area' | 'perimeter' | 'volume'`.
  - `type Arming = { kind: 'select' } | { kind: 'delete' } | { kind: 'furniture' } | { kind: 'paint' } | { kind: 'measure'; measure: MeasureKind } | { kind: 'tool'; tool: StructureTool | OpeningTool }`.
  - `DOCK: readonly (DockButton & { id: DockId })[]` (siete botones: Seleccionar, Estructura, Aberturas, Muebles, Materiales, Medir, Más; el de Más anuncia un diálogo), `structureEntries(decisions?): readonly MenuEntry[]` (sin Ambiente si `DECISIONS.zoneTool` es `false`), `OPENING_ENTRIES`, `MEASURE_ENTRIES`, `asMenuEntries(...)`, `armingForButton(id: DockId): Arming | null` (los botones sin menú), `expectedState(arming): { phase?: Phase; mode: EditorMode; tool: string | null }` (la **tabla 4.3 del spec**: cómo debe quedar Pascal tras cada botón) y `activeDockId(state: { mode: EditorMode; tool: string | null }): DockId | null` (qué botón marcar según el estado **real** de Pascal).

**Esta tarea es la tabla 4.3 hecha código.** El criterio 2 del spec dice: "cada botón del dock deja a Pascal en la fase, el modo y la herramienta esperados; una prueba lee el estado del editor y lo comprueba". `expectedState` es esa tabla (la leen la prueba unitaria de aquí, la del armado de la Tarea 5b y la prueba en navegador de la 5f) y `activeDockId` es su inversa: como Pascal restaura fase y herramienta al abrir (un proyecto en blanco abre con Estructura › Muro armada), el dock **marca lo que Pascal tiene**, no lo que el shell crea haber elegido. Cómo se logra cada estado en Pascal es la Tarea 5b.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-dock-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  type Arming,
  DOCK,
  MEASURE_ENTRIES,
  OPENING_ENTRIES,
  activeDockId,
  armingForButton,
  expectedState,
  structureEntries,
} from '../src/editor/shell/dock-model'

describe('DOCK', () => {
  it('son siete botones en castellano y en este orden', () => {
    expect(DOCK.map((b) => [b.id, b.label])).toEqual([
      ['select', 'Seleccionar'],
      ['structure', 'Estructura'],
      ['openings', 'Aberturas'],
      ['furniture', 'Muebles'],
      ['materials', 'Materiales'],
      ['measure', 'Medir'],
      ['more', 'Más'],
    ])
  })

  it('solo Estructura, Aberturas, Medir y Más abren un menú', () => {
    expect(DOCK.filter((b) => b.menu).map((b) => b.id)).toEqual(['structure', 'openings', 'measure', 'more'])
  })
})

describe('menús', () => {
  it('Estructura: Muro, Ambiente, Piso, Cielorraso, Escalera y Columna (D6: "Ambiente", nunca "zona")', () => {
    expect(structureEntries().map((e) => [e.id, e.label])).toEqual([
      ['wall', 'Muro'],
      ['zone', 'Ambiente'],
      ['slab', 'Piso'],
      ['ceiling', 'Cielorraso'],
      ['stair', 'Escalera'],
      ['column', 'Columna'],
    ])
  })

  it('si el spike de la Tarea 0 dice que la herramienta de ambientes no funciona, Estructura no la ofrece', () => {
    const ids = structureEntries({ zoneTool: false }).map((e) => e.id)
    expect(ids).not.toContain('zone')
    expect(ids).toHaveLength(5)
  })

  it('Aberturas: Puerta y Ventana; Medir: distancia, ángulo, área, perímetro y volumen', () => {
    expect(OPENING_ENTRIES.map((e) => [e.id, e.label])).toEqual([['door', 'Puerta'], ['window', 'Ventana']])
    expect(MEASURE_ENTRIES.map((e) => [e.id, e.label])).toEqual([
      ['distance', 'Distancia'],
      ['angle', 'Ángulo'],
      ['area', 'Área'],
      ['perimeter', 'Perímetro'],
      ['volume', 'Volumen'],
    ])
  })
})

describe('expectedState (tabla 4.3 del spec)', () => {
  const cases: [string, Arming, { phase?: string; mode: string; tool: string | null }][] = [
    ['Seleccionar', { kind: 'select' }, { mode: 'select', tool: null }],
    ['Muro', { kind: 'tool', tool: 'wall' }, { phase: 'structure', mode: 'build', tool: 'wall' }],
    ['Ambiente', { kind: 'tool', tool: 'zone' }, { phase: 'structure', mode: 'build', tool: 'zone' }],
    ['Piso', { kind: 'tool', tool: 'slab' }, { phase: 'structure', mode: 'build', tool: 'slab' }],
    ['Cielorraso', { kind: 'tool', tool: 'ceiling' }, { phase: 'structure', mode: 'build', tool: 'ceiling' }],
    ['Escalera', { kind: 'tool', tool: 'stair' }, { phase: 'structure', mode: 'build', tool: 'stair' }],
    ['Columna', { kind: 'tool', tool: 'column' }, { phase: 'structure', mode: 'build', tool: 'column' }],
    ['Puerta', { kind: 'tool', tool: 'door' }, { phase: 'structure', mode: 'build', tool: 'door' }],
    ['Ventana', { kind: 'tool', tool: 'window' }, { phase: 'structure', mode: 'build', tool: 'window' }],
    ['Muebles', { kind: 'furniture' }, { phase: 'furnish', mode: 'build', tool: 'item' }],
    ['Materiales', { kind: 'paint' }, { phase: 'structure', mode: 'material-paint', tool: null }],
    ['Medir', { kind: 'measure', measure: 'area' }, { phase: 'structure', mode: 'build', tool: 'measurement' }],
    ['Eliminar', { kind: 'delete' }, { mode: 'delete', tool: null }],
  ]
  it.each(cases)('%s deja a Pascal en %j', (_label, arming, expected) => {
    expect(expectedState(arming)).toEqual(expected)
  })
})

describe('activeDockId (lo que el dock marca según el estado REAL de Pascal)', () => {
  it.each([
    [{ mode: 'select', tool: null }, 'select'],
    [{ mode: 'edit', tool: null }, 'select'],
    [{ mode: 'build', tool: 'wall' }, 'structure'], // un proyecto en blanco abre así
    [{ mode: 'build', tool: 'zone' }, 'structure'],
    [{ mode: 'build', tool: 'stair' }, 'structure'],
    [{ mode: 'build', tool: 'door' }, 'openings'],
    [{ mode: 'build', tool: 'window' }, 'openings'],
    [{ mode: 'build', tool: 'item' }, 'furniture'],
    [{ mode: 'build', tool: 'cabinet' }, 'furniture'],
    [{ mode: 'build', tool: 'measurement' }, 'measure'],
    [{ mode: 'material-paint', tool: null }, 'materials'],
    [{ mode: 'delete', tool: null }, 'more'],
    [{ mode: 'build', tool: 'roof' }, null],
    [{ mode: 'terrain-sculpt', tool: null }, null],
  ] as const)('%j marca %s', (state, expected) => {
    expect(activeDockId({ mode: state.mode, tool: state.tool })).toBe(expected)
  })

  it('cada botón sin menú tiene su armado y los demás no', () => {
    expect(armingForButton('select')).toEqual({ kind: 'select' })
    expect(armingForButton('furniture')).toEqual({ kind: 'furniture' })
    expect(armingForButton('materials')).toEqual({ kind: 'paint' })
    for (const id of ['structure', 'openings', 'measure', 'more'] as const) expect(armingForButton(id)).toBeNull()
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-dock-model`
Expected: FAIL — `Cannot find module '../src/editor/shell/dock-model'`.

- [ ] **Paso 2: Escribir el modelo del dock**

Create `apps/web/src/editor/shell/dock-model.ts`:

```ts
import {
  Blocks,
  BrickWall,
  Box,
  ChartNoAxesColumnIncreasing,
  DoorOpen,
  Ellipsis,
  Grid3x3,
  Layers2,
  type LucideIcon,
  MousePointer2,
  PaintBucket,
  RectangleHorizontal,
  RectangleVertical,
  Ruler,
  Sofa,
  Square,
  SquareDashed,
  Triangle,
  Waypoints,
} from 'lucide-react'
import type { EditorMode, Phase } from './bridge/types'
import { DECISIONS, type Decisions } from './decisions'
import type { DockButton, MenuEntry } from './ui/Dock'

export type DockId = 'select' | 'structure' | 'openings' | 'furniture' | 'materials' | 'measure' | 'more'
export type StructureTool = 'wall' | 'zone' | 'slab' | 'ceiling' | 'stair' | 'column'
export type OpeningTool = 'door' | 'window'
export type MeasureKind = 'distance' | 'angle' | 'area' | 'perimeter' | 'volume'

/** Lo que un botón o una entrada de menú pide armar en Pascal (el puente lo traduce a llamadas). */
export type Arming =
  | { kind: 'select' }
  | { kind: 'delete' }
  | { kind: 'furniture' }
  | { kind: 'paint' }
  | { kind: 'measure'; measure: MeasureKind }
  | { kind: 'tool'; tool: StructureTool | OpeningTool }

export const DOCK: readonly (DockButton & { id: DockId })[] = [
  { id: 'select', label: 'Seleccionar', icon: MousePointer2 },
  { id: 'structure', label: 'Estructura', icon: Blocks, menu: true },
  { id: 'openings', label: 'Aberturas', icon: DoorOpen, menu: true },
  { id: 'furniture', label: 'Muebles', icon: Sofa },
  { id: 'materials', label: 'Materiales', icon: PaintBucket },
  { id: 'measure', label: 'Medir', icon: Ruler, menu: true },
  { id: 'more', label: 'Más', icon: Ellipsis, menu: true, popup: 'dialog' },
]

type Entry<T extends string> = { id: T; label: string; icon: LucideIcon }

const STRUCTURE: readonly Entry<StructureTool>[] = [
  { id: 'wall', label: 'Muro', icon: BrickWall },
  { id: 'zone', label: 'Ambiente', icon: SquareDashed },
  { id: 'slab', label: 'Piso', icon: Grid3x3 },
  { id: 'ceiling', label: 'Cielorraso', icon: Layers2 },
  { id: 'stair', label: 'Escalera', icon: ChartNoAxesColumnIncreasing },
  { id: 'column', label: 'Columna', icon: RectangleVertical },
]

/** Menú Estructura. Si el spike dijo que la herramienta de ambientes no funciona, no se ofrece. */
export const structureEntries = (decisions: Pick<Decisions, 'zoneTool'> = DECISIONS): readonly Entry<StructureTool>[] =>
  STRUCTURE.filter((e) => e.id !== 'zone' || decisions.zoneTool)

export const OPENING_ENTRIES: readonly Entry<OpeningTool>[] = [
  { id: 'door', label: 'Puerta', icon: DoorOpen },
  { id: 'window', label: 'Ventana', icon: RectangleHorizontal },
]

export const MEASURE_ENTRIES: readonly Entry<MeasureKind>[] = [
  { id: 'distance', label: 'Distancia', icon: Ruler },
  { id: 'angle', label: 'Ángulo', icon: Triangle },
  { id: 'area', label: 'Área', icon: Square },
  { id: 'perimeter', label: 'Perímetro', icon: Waypoints },
  { id: 'volume', label: 'Volumen', icon: Box },
]

/** Entradas de menú listas para `ToolMenu`, con la activa marcada. */
export const asMenuEntries = (entries: readonly Entry<string>[], activeId: string | null): MenuEntry[] =>
  entries.map((e) => ({ ...e, active: e.id === activeId }))

/** Armado de los botones que no abren menú (`null` = abren un menú). */
export function armingForButton(id: DockId): Arming | null {
  if (id === 'select') return { kind: 'select' }
  if (id === 'furniture') return { kind: 'furniture' }
  if (id === 'materials') return { kind: 'paint' }
  return null
}

/** La tabla 4.3 del spec: cómo debe quedar Pascal (`phase` ausente = no cambia). Las pruebas en navegador la comparan con el estado real. */
export function expectedState(arming: Arming): { phase?: Phase; mode: EditorMode; tool: string | null } {
  switch (arming.kind) {
    case 'select':
      return { mode: 'select', tool: null }
    case 'delete':
      return { mode: 'delete', tool: null }
    case 'furniture':
      return { phase: 'furnish', mode: 'build', tool: 'item' }
    case 'paint':
      return { phase: 'structure', mode: 'material-paint', tool: null }
    case 'measure':
      return { phase: 'structure', mode: 'build', tool: 'measurement' }
    case 'tool':
      return { phase: 'structure', mode: 'build', tool: arming.tool }
  }
}

const STRUCTURE_TOOLS = new Set<string>(STRUCTURE.map((e) => e.id))
const OPENING_TOOLS = new Set<string>(OPENING_ENTRIES.map((e) => e.id))
const FURNITURE_TOOLS = new Set(['item', 'cabinet', 'shelf'])

/** Qué botón del dock marcar según el estado REAL de Pascal (que restaura herramienta y fase al abrir un proyecto). */
export function activeDockId(state: { mode: EditorMode; tool: string | null }): DockId | null {
  if (state.mode === 'material-paint') return 'materials'
  if (state.mode === 'delete') return 'more'
  if (state.mode === 'select' || state.mode === 'edit') return 'select'
  if (state.mode !== 'build' || !state.tool) return null
  if (STRUCTURE_TOOLS.has(state.tool)) return 'structure'
  if (OPENING_TOOLS.has(state.tool)) return 'openings'
  if (state.tool === 'measurement') return 'measure'
  if (FURNITURE_TOOLS.has(state.tool)) return 'furniture'
  return null
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-dock-model shell-boundaries`
Expected: PASS (`shell-dock-model`: 33 pruebas; `shell-boundaries`: 1).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/dock-model.ts apps/web/test/shell-dock-model.test.ts
git commit -m "feat(editor): modelo del dock con la tabla 4.3 del spec (qué deja cada botón en Pascal y qué botón marcar)" -- apps/web/src/editor/shell/dock-model.ts apps/web/test/shell-dock-model.test.ts
```

---

### Task 5b: Armar herramientas, cuadrícula y ajuste por el puente

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/shell/bridge/tools.ts`
- Modify: `apps/web/src/editor/shell/bridge/types.ts`, `apps/web/src/editor/shell/bridge/index.ts`, `apps/web/test/support/fake-deps.ts`
- Test: `apps/web/test/shell-bridge-tools.test.ts`

**Interfaces:**
- Consumes: `Arming` de `../dock-model` (5a); `CoreDeps` (4a); `createBridge`, `createFakeDeps` (4a, 4b).
- Produces (puente, `bridge/tools.ts`): `createToolsSlice(deps)` con `arm(arming: Arming): void`, `setGridStep(step: number): void` y `setSnap(context: 'wall' | 'item', mode: SnapMode): void`. `EditorLike` suma `structureLayer`, `gridSnapStep`, `snappingModeByContext`, `setStructureLayer`, `armMaterialPaint`, `setMode`, `setTool`, `setLastMeasurementKind`, `setToolDefaults`, `setGridSnapStep` y `setSnappingMode`; `SnapMode = 'grid' | 'lines' | 'angles' | 'off'` y `SnapContext = 'wall' | 'item' | 'polygon' | 'rotation'` pasan a `bridge/types.ts`.

**Qué hace cada botón en Pascal** (verificado en `use-editor.tsx`, `use-keyboard.ts` y `measurement-control.tsx`; ver `docs/pascal-notes.md`): `armToolMode` solo cambia la fase al armar desde `site`; `stair` y `zone` solo existen en `structure`; y arma `wall` con la capa de ambientes (`zones`) aún puesta deja la capa mal. Por eso cada herramienta de estructura pide primero la fase `structure` y la capa `elements` (salvo Ambiente), igual que las teclas `b`, `z` y `m` de Pascal. Materiales sigue la tecla `p` (fase, capa de elementos y `armMaterialPaint`) y Medir sigue `measurement-control` (tipo de medida, valores por omisión de la herramienta, modo y herramienta, en ese orden). El puente real no se toca en esta tarea: `pascal-bridge.ts` ya pasa `Pascal.useEditor` entero y TypeScript comprueba que tenga los miembros nuevos de `EditorLike`.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-bridge-tools.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { createFakeDeps } from './support/fake-deps'

const setup = () => {
  const fake = createFakeDeps()
  return { ...fake, bridge: createBridge(fake.deps), e: fake.editor.getState }
}
/** Orden global de la primera llamada de cada doble: sirve para comprobar qué se llamó antes. */
const firstCall = (fn: (...args: never[]) => unknown) => vi.mocked(fn).mock.invocationCallOrder[0] ?? Number.NaN

describe('arm', () => {
  it('Seleccionar y Eliminar arman el modo y nada más', () => {
    const { bridge, e } = setup()
    bridge.arm({ kind: 'select' })
    expect(e()).toMatchObject({ mode: 'select', tool: null, phase: 'structure' })
    bridge.arm({ kind: 'delete' })
    expect(e()).toMatchObject({ mode: 'delete', tool: null })
    expect(e().setPhase).not.toHaveBeenCalled()
  })

  it('una herramienta de estructura pasa a la fase structure y se arma después (la escalera no existe en otra fase)', () => {
    const { bridge, e, editor } = setup()
    editor.setState({ phase: 'furnish', mode: 'select', tool: null })
    bridge.arm({ kind: 'tool', tool: 'stair' })
    expect(e()).toMatchObject({ phase: 'structure', mode: 'build', tool: 'stair' })
    expect(firstCall(e().setPhase)).toBeLessThan(firstCall(e().armToolMode))
  })

  it('Muro después de Ambiente devuelve la capa de elementos antes de armar; Ambiente no la toca', () => {
    const { bridge, e, editor } = setup()
    editor.setState({ structureLayer: 'zones' })
    bridge.arm({ kind: 'tool', tool: 'wall' })
    expect(e().setStructureLayer).toHaveBeenCalledWith('elements')
    expect(e()).toMatchObject({ mode: 'build', tool: 'wall', structureLayer: 'elements' })
    bridge.arm({ kind: 'tool', tool: 'zone' })
    expect(e().setStructureLayer).toHaveBeenCalledTimes(1)
    expect(e()).toMatchObject({ tool: 'zone' })
  })

  it('Muebles pasa a la fase furnish y arma `item`', () => {
    const { bridge, e } = setup()
    bridge.arm({ kind: 'furniture' })
    expect(e()).toMatchObject({ phase: 'furnish', mode: 'build', tool: 'item' })
  })

  it('Materiales sigue la secuencia de la tecla `p` de Pascal: fase, capa de elementos y armMaterialPaint', () => {
    const { bridge, e, editor } = setup()
    editor.setState({ structureLayer: 'zones' })
    bridge.arm({ kind: 'paint' })
    expect(e().setPhase).toHaveBeenCalledWith('structure')
    expect(e().setStructureLayer).toHaveBeenCalledWith('elements')
    expect(e().armMaterialPaint).toHaveBeenCalledTimes(1)
    expect(e()).toMatchObject({ mode: 'material-paint', tool: null })
  })

  it('Medir sigue la secuencia de measurement-control de Pascal, con el tipo elegido', () => {
    const { bridge, e } = setup()
    bridge.arm({ kind: 'measure', measure: 'angle' })
    expect(e().setLastMeasurementKind).toHaveBeenCalledWith('angle')
    expect(e().setToolDefaults).toHaveBeenCalledWith('measurement', { kind: 'angle' })
    expect(e().setMode).toHaveBeenCalledWith('build')
    expect(e().setTool).toHaveBeenCalledWith('measurement')
    expect(e()).toMatchObject({ phase: 'structure', mode: 'build', tool: 'measurement' })
    expect(firstCall(e().setToolDefaults)).toBeLessThan(firstCall(e().setTool))
  })
})

describe('cuadrícula y ajuste', () => {
  it('setGridStep y setSnap llaman a Pascal con el contexto indicado', () => {
    const { bridge, e } = setup()
    bridge.setGridStep(0.25)
    bridge.setSnap('wall', 'angles')
    bridge.setSnap('item', 'grid')
    expect(e().gridSnapStep).toBe(0.25)
    expect(e().snappingModeByContext).toMatchObject({ wall: 'angles', item: 'grid' })
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-tools`
Expected: FAIL — `TypeError: bridge.arm is not a function` (6 pruebas) y `bridge.setGridStep is not a function` (1).

- [ ] **Paso 2: Ampliar los tipos propios y los dobles**

Modify `apps/web/src/editor/shell/bridge/types.ts`:

```diff
@@
 export type ViewMode = '2d' | '3d' | 'split'
+export type SnapMode = 'grid' | 'lines' | 'angles' | 'off'
+export type SnapContext = 'wall' | 'item' | 'polygon' | 'rotation'
@@
   setFirstPersonMode(enabled: boolean): void
+  structureLayer: 'zones' | 'elements'
+  gridSnapStep: number
+  snappingModeByContext: Record<SnapContext, SnapMode>
+  setStructureLayer(layer: 'zones' | 'elements'): void
+  armMaterialPaint(): void
+  setMode(mode: EditorMode): void
+  setTool(tool: string | null): void
+  setLastMeasurementKind(kind: string): void
+  setToolDefaults(tool: string, defaults: Record<string, unknown> | null): void
+  setGridSnapStep(step: number): void
+  setSnappingMode(context: SnapContext, mode: SnapMode): void
   // @@editor-like
```


Modify `apps/web/test/support/fake-deps.ts`:

```diff
@@
-import type { EditorLike, EditorMode, HistoryState, SceneLike, ViewerLike } from '../../src/editor/shell/bridge/types'
+import type { EditorLike, EditorMode, HistoryState, SceneLike, SnapContext, SnapMode, ViewerLike } from '../../src/editor/shell/bridge/types'
@@
+    structureLayer: 'elements',
+    gridSnapStep: 0.5,
+    snappingModeByContext: { wall: 'grid', item: 'lines', polygon: 'grid', rotation: 'angles' },
+    setStructureLayer: vi.fn((structureLayer: 'zones' | 'elements') => editor.setState({ structureLayer })),
+    armMaterialPaint: vi.fn(() => editor.setState({ mode: 'material-paint', tool: null })),
+    setMode: vi.fn((mode: EditorMode) => editor.setState({ mode })),
+    setTool: vi.fn((tool: string | null) => editor.setState({ tool, ...(tool ? { mode: 'build' as const } : {}) })),
+    setLastMeasurementKind: vi.fn(),
+    setToolDefaults: vi.fn(),
+    setGridSnapStep: vi.fn((gridSnapStep: number) => editor.setState({ gridSnapStep })),
+    setSnappingMode: vi.fn((context: SnapContext, mode: SnapMode) =>
+      editor.setState({ snappingModeByContext: { ...editor.getState().snappingModeByContext, [context]: mode } }),
+    ),
     // @@fake-editor
```


- [ ] **Paso 3: El armado de herramientas en el puente**

Create `apps/web/src/editor/shell/bridge/tools.ts`:

```ts
import type { CoreDeps } from './core'
import type { Arming } from '../dock-model'
import type { SnapMode } from './types'

/**
 * Armar herramientas con las mismas secuencias que las teclas de Pascal (`use-keyboard.ts`, `measurement-control.tsx`):
 * `armToolMode` solo cambia la fase al armar desde `site`, `stair` y `zone` solo existen en `structure` y la capa `zones`
 * queda puesta si no se devuelve a `elements`.
 */
export function createToolsSlice(deps: CoreDeps) {
  const editor = () => deps.editor.getState()
  const elementsLayer = () => {
    if (editor().structureLayer !== 'elements') editor().setStructureLayer('elements')
  }
  return {
    arm(arming: Arming): void {
      if (arming.kind === 'select') {
        editor().armToolMode({ mode: 'select' })
      } else if (arming.kind === 'delete') {
        editor().armToolMode({ mode: 'delete' })
      } else if (arming.kind === 'furniture') {
        editor().setPhase('furnish')
        editor().armToolMode({ mode: 'build', tool: 'item' })
      } else if (arming.kind === 'paint') {
        editor().setPhase('structure')
        elementsLayer()
        editor().armMaterialPaint()
      } else if (arming.kind === 'measure') {
        editor().setPhase('structure')
        elementsLayer()
        editor().setLastMeasurementKind(arming.measure)
        editor().setToolDefaults('measurement', { kind: arming.measure })
        editor().setMode('build')
        editor().setTool('measurement')
      } else {
        editor().setPhase('structure')
        if (arming.tool !== 'zone') elementsLayer()
        editor().armToolMode({ mode: 'build', tool: arming.tool })
      }
    },
    setGridStep(step: number): void {
      editor().setGridSnapStep(step)
    },
    setSnap(context: 'wall' | 'item', mode: SnapMode): void {
      editor().setSnappingMode(context, mode)
    },
  }
}
```

Modify `apps/web/src/editor/shell/bridge/index.ts`:

```diff
@@
 import { type ModeDeps, createModeSlice } from './mode'
+import { createToolsSlice } from './tools'
@@
     ...createModeSlice(deps),
+    ...createToolsSlice(deps),
     // @@slices
```


- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-tools shell-bridge-mode shell-dock-model shell-boundaries`
Expected: PASS (`shell-bridge-tools`: 7 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` (el puente real sigue cumpliendo `EditorLike` ampliado: `useEditor` tiene todos esos miembros) y Biome sin errores nuevos.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/bridge apps/web/test/support/fake-deps.ts apps/web/test/shell-bridge-tools.test.ts
git commit -m "feat(editor): armar herramientas, cuadrícula y ajuste por el puente con las secuencias de Pascal" -- apps/web/src/editor/shell/bridge apps/web/test/support/fake-deps.ts apps/web/test/shell-bridge-tools.test.ts
```

---

### Task 5c: Opciones del menú "Más" (cuadrícula, ajustes, atajos) y el diálogo de atajos

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/more-model.ts`, `apps/web/src/editor/shell/ui/ShortcutsDialog.tsx`
- Test: `apps/web/test/shell-more-model.test.ts`, `apps/web/test/shell-shortcuts-dialog.test.tsx`

**Interfaces:**
- Consumes: `SnapMode` de `./bridge/types` (5b).
- Produces:
  - `more-model.ts` (puro): `GRID_STEPS`, `WALL_SNAP`, `ITEM_SNAP` (`{ value; label }[]`: la cuadrícula de 50, 25, 10 y 5 cm y solo los modos de ajuste válidos de cada contexto de Pascal), `SHORTCUTS: readonly { keys: string; label: string }[]` (los atajos de Pascal que siguen valiendo, en castellano) y `SOON_ITEMS: readonly { id: string; label: string }[]` (Compartir, Renderizar, Exportar plano: los botones "Pronto").
  - `ShortcutsDialog(props: { open: boolean; shortcuts: readonly { keys: string; label: string }[]; onClose: () => void })` (`ui/ShortcutsDialog.tsx`): un `<dialog>` nativo con nombre "Atajos de teclado" y la lista en castellano; Esc cierra, el foco queda atrapado y "Cerrar" usa `method="dialog"`.

Esta es la respuesta a la **pregunta abierta 4 del spec** ("contenido exacto del menú Más y atajos que se muestran en castellano"): los atajos son los de Pascal que siguen activos en Editar (`1 2 3 f z m v b x p g r t e c`, Supr, Ctrl+Z y compañía); la paleta de comandos Ctrl+K sigue en inglés y queda fuera de este spec.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-more-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { GRID_STEPS, ITEM_SNAP, SHORTCUTS, SOON_ITEMS, WALL_SNAP } from '../src/editor/shell/more-model'

const ENGLISH = /\b(select|delete|undo|redo|wall|zone|grid|snap|measure|furniture|save|cancel)\b/i

describe('menú Más', () => {
  it('la cuadrícula ofrece exactamente los pasos que admite Pascal (0,5; 0,25; 0,1 y 0,05 m)', () => {
    expect(GRID_STEPS.map((s) => s.value)).toEqual([0.5, 0.25, 0.1, 0.05])
    expect(GRID_STEPS.map((s) => s.label)).toEqual(['50 cm', '25 cm', '10 cm', '5 cm'])
  })

  it('los ajustes ofrecen solo los modos válidos de cada contexto de Pascal', () => {
    expect(WALL_SNAP.map((o) => o.value)).toEqual(['grid', 'lines', 'angles', 'off'])
    expect(ITEM_SNAP.map((o) => o.value)).toEqual(['lines', 'grid', 'off'])
  })

  it('los atajos están en castellano, sin teclas repetidas', () => {
    expect(new Set(SHORTCUTS.map((s) => s.keys)).size).toBe(SHORTCUTS.length)
    for (const s of SHORTCUTS) expect(s.label, s.keys).not.toMatch(ENGLISH)
    expect(SHORTCUTS.map((s) => s.keys)).toContain('Supr')
  })

  it('Compartir, Renderizar y Exportar plano son los botones "Pronto"', () => {
    expect(SOON_ITEMS.map((i) => i.label)).toEqual(['Compartir', 'Renderizar', 'Exportar plano'])
  })
})
```

Create `apps/web/test/shell-shortcuts-dialog.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SHORTCUTS } from '../src/editor/shell/more-model'
import { ShortcutsDialog } from '../src/editor/shell/ui/ShortcutsDialog'

const NO_EMOJI = /\p{Extended_Pictographic}/u
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => {}

describe('ShortcutsDialog', () => {
  it('lista todos los atajos en castellano dentro de un diálogo con nombre', () => {
    const markup = renderToStaticMarkup(<ShortcutsDialog open={false} shortcuts={SHORTCUTS} onClose={noop} />)
    expect(markup).toContain('aria-label="Atajos de teclado"')
    expect(markup.match(/<dt/g)).toHaveLength(SHORTCUTS.length)
    expect(textOf(markup)).toContain('Borrar lo elegido')
    expect(markup).not.toMatch(NO_EMOJI)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-more-model shell-shortcuts-dialog`
Expected: FAIL — `Cannot find module '../src/editor/shell/more-model'` (los dos archivos de prueba lo importan).

- [ ] **Paso 2: Escribir las opciones del menú y el diálogo de atajos**

Create `apps/web/src/editor/shell/more-model.ts`:

```ts
import type { SnapMode } from './bridge/types'

/** Pasos de cuadrícula que admite `setGridSnapStep` de Pascal (en metros). */
export const GRID_STEPS = [
  { value: 0.5, label: '50 cm' },
  { value: 0.25, label: '25 cm' },
  { value: 0.1, label: '10 cm' },
  { value: 0.05, label: '5 cm' },
] as const

type Option = { value: SnapMode; label: string }

/** Ajuste al dibujar muros: los cuatro modos del contexto `wall` de Pascal. */
export const WALL_SNAP: readonly Option[] = [
  { value: 'grid', label: 'Cuadrícula' },
  { value: 'lines', label: 'Alineación' },
  { value: 'angles', label: 'Ángulos' },
  { value: 'off', label: 'Libre' },
]

/** Ajuste al mover muebles: los tres modos del contexto `item` (`lines` es el de las guías moradas). */
export const ITEM_SNAP: readonly Option[] = [
  { value: 'lines', label: 'Alineación' },
  { value: 'grid', label: 'Cuadrícula' },
  { value: 'off', label: 'Libre' },
]

/** Atajos de Pascal que se muestran en castellano (los que escucha `use-keyboard.ts`). */
export const SHORTCUTS: readonly { keys: string; label: string }[] = [
  { keys: 'V', label: 'Seleccionar' },
  { keys: 'B', label: 'Dibujar muros' },
  { keys: 'Z', label: 'Dibujar un ambiente' },
  { keys: 'F', label: 'Colocar muebles' },
  { keys: 'P', label: 'Pintar con materiales' },
  { keys: 'M', label: 'Medir' },
  { keys: 'X', label: 'Eliminar elementos' },
  { keys: 'R', label: 'Girar el elemento' },
  { keys: 'Esc', label: 'Cancelar lo que estás haciendo' },
  { keys: 'Supr', label: 'Borrar lo elegido' },
  { keys: 'Ctrl + Z', label: 'Deshacer' },
  { keys: 'Ctrl + Shift + Z', label: 'Rehacer' },
  { keys: 'Ctrl + C / X / V', label: 'Copiar, cortar y pegar' },
  { keys: 'Ctrl + ↑ / ↓', label: 'Cambiar de planta' },
  { keys: 'Ctrl + S', label: 'Guardar ahora' },
]

/** Funciones que llegan en una próxima versión: botones deshabilitados con "Pronto" (criterio 11). */
export const SOON_ITEMS: readonly { id: string; label: string }[] = [
  { id: 'share', label: 'Compartir' },
  { id: 'render', label: 'Renderizar' },
  { id: 'export-plan', label: 'Exportar plano' },
]
```

Create `apps/web/src/editor/shell/ui/ShortcutsDialog.tsx`:

```tsx
'use client'

import { Fragment, useEffect, useRef } from 'react'

/** Atajos de teclado en un diálogo nativo (`<dialog>`): Esc cierra, el foco queda atrapado y "Cerrar" usa `method="dialog"`. */
export function ShortcutsDialog({
  open,
  shortcuts,
  onClose,
}: {
  open: boolean
  shortcuts: readonly { keys: string; label: string }[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog ref={ref} aria-label="Atajos de teclado" onClose={onClose} className="app-dialog max-w-[480px]">
      <form method="dialog" className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-xl font-bold tracking-[-0.02em]">Atajos de teclado</h2>
        <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2 text-[14px]">
          {shortcuts.map((s) => (
            <Fragment key={s.keys}>
              <dt>
                <kbd className="rounded-md bg-ink/6 px-2 py-0.5 font-sans text-[13px] font-semibold text-ink">{s.keys}</kbd>
              </dt>
              <dd className="text-ink-muted">{s.label}</dd>
            </Fragment>
          ))}
        </dl>
        <button type="submit" className="btn btn-primary focus-ring self-end">
          Cerrar
        </button>
      </form>
    </dialog>
  )
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-more-model shell-shortcuts-dialog shell-boundaries`
Expected: PASS (`shell-more-model`: 4 pruebas; `shell-shortcuts-dialog`: 1).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/more-model.ts apps/web/src/editor/shell/ui/ShortcutsDialog.tsx apps/web/test/shell-more-model.test.ts apps/web/test/shell-shortcuts-dialog.test.tsx
git commit -m "feat(editor): opciones del menú Más (cuadrícula, ajustes y atajos en castellano) y diálogo de atajos" -- apps/web/src/editor/shell/more-model.ts apps/web/src/editor/shell/ui/ShortcutsDialog.tsx apps/web/test/shell-more-model.test.ts apps/web/test/shell-shortcuts-dialog.test.tsx
```

---

### Task 5d: Panel del menú "Más" conectado (eliminar, cuadrícula, ajustes, atajos y botones "Pronto")

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/MoreMenu.tsx`
- Test: `apps/web/test/shell-more-menu.test.tsx`

**Interfaces:**
- Consumes: `GRID_STEPS`, `WALL_SNAP`, `ITEM_SNAP`, `SOON_ITEMS` (5c); `ChipRow`, `FLOAT` de `./ui/primitives` (1b); `SoonButton` de `./ui/status` (1c); `bridge.arm`, `bridge.setGridStep`, `bridge.setSnap` (5b); `useBridge`, `useShell` (4c).
- Produces: `MoreMenu(props: { onClose: () => void; onShortcuts: () => void })` (`src/editor/shell/MoreMenu.tsx`): un panel con `role="dialog"` y nombre "Más opciones" que se abre sobre su botón del dock. Marca la cuadrícula y los ajustes que Pascal tiene **ahora** (se lee del estado real) y, al elegir una opción, la aplica por el puente.

**Decisión sobre el menú "Más" (pregunta abierta 4 del spec):** contiene **Eliminar elementos** (arma la herramienta de borrado de Pascal), **Cuadrícula** (50, 25, 10 y 5 cm), **Ajuste de muros** y **Ajuste de muebles** (solo los modos válidos de cada contexto de Pascal), **Atajos de teclado** (abre el diálogo de la Tarea 5c) y **Próximamente** con Compartir, Renderizar y Exportar plano deshabilitados con "Pronto" (criterio 11 del spec). No es un menú de ítems puros sino un panel de opciones: por eso el botón anuncia `aria-haspopup="dialog"` (5a) y no `menu`.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-more-menu.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { MoreMenu } from '../src/editor/shell/MoreMenu'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => {}

function render(node: React.ReactNode, setup?: (fake: ReturnType<typeof createFakeDeps>) => void) {
  const fake = createFakeDeps()
  setup?.(fake)
  return renderToStaticMarkup(<BridgeProvider bridge={createBridge(fake.deps)}>{node}</BridgeProvider>)
}
const pressedLabels = (markup: string) =>
  [...markup.matchAll(/aria-pressed="true"[^>]*>(?:<svg[\s\S]*?<\/svg>)?([^<]+)<\/button>/g)].map((m) => m[1])

describe('MoreMenu', () => {
  const markup = render(<MoreMenu onClose={noop} onShortcuts={noop} />)

  it('ofrece eliminar, cuadrícula, ajustes, atajos y los tres botones Pronto deshabilitados', () => {
    const text = textOf(markup)
    for (const label of ['Eliminar elementos', 'Cuadrícula', 'Ajuste de muros', 'Ajuste de muebles', 'Atajos de teclado', 'Próximamente', 'Compartir', 'Renderizar', 'Exportar plano']) {
      expect(text, label).toContain(label)
    }
    expect(markup.match(/Pronto/g)).toHaveLength(3)
    expect(markup.match(/<button[^>]*disabled=""/g)).toHaveLength(3)
    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-label="Más opciones"')
  })

  it('marca la cuadrícula y los ajustes que tiene Pascal ahora (0,5 m; muros en cuadrícula; muebles en alineación)', () => {
    expect(pressedLabels(markup)).toEqual(['50 cm', 'Cuadrícula', 'Alineación'])
  })

  it('refleja otros valores de Pascal', () => {
    const other = render(<MoreMenu onClose={noop} onShortcuts={noop} />, ({ editor }) =>
      editor.setState({ gridSnapStep: 0.1, snappingModeByContext: { wall: 'angles', item: 'off', polygon: 'grid', rotation: 'angles' }, mode: 'delete' }),
    )
    expect(pressedLabels(other)).toEqual(['Eliminar elementos', '10 cm', 'Ángulos', 'Libre'])
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-more-menu`
Expected: FAIL — `Cannot find module '../src/editor/shell/MoreMenu'`.

- [ ] **Paso 2: Escribir el panel del menú Más**

Create `apps/web/src/editor/shell/MoreMenu.tsx`:

```tsx
'use client'

import { FileDown, Keyboard, type LucideIcon, Share2, Sparkles, Trash2 } from 'lucide-react'
import { type KeyboardEvent, useEffect, useRef } from 'react'
import { cx } from '@/lib/cx'
import type { SnapMode } from './bridge/types'
import { GRID_STEPS, ITEM_SNAP, SOON_ITEMS, WALL_SNAP } from './more-model'
import { ChipRow, FLOAT } from './ui/primitives'
import { SoonButton } from './ui/status'
import { useBridge, useShell } from './use-bridge'

const SOON_ICONS: Record<string, LucideIcon> = { share: Share2, render: Sparkles, 'export-plan': FileDown }
const ROW =
  'focus-ring flex h-11 w-full cursor-pointer items-center gap-3 rounded-[14px] px-2.5 text-left text-[15px] transition-colors duration-150 ease-out'
const GRID_CHIPS = GRID_STEPS.map((s) => ({ value: String(s.value), label: s.label }))

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-1">
      <h3 className="mb-2 text-xs font-semibold text-ink-muted">{title}</h3>
      {children}
    </section>
  )
}

/** Panel del botón "Más": borrar, cuadrícula y ajustes de Pascal, atajos y lo que llega en una próxima versión. */
export function MoreMenu({ onClose, onShortcuts }: { onClose: () => void; onShortcuts: () => void }) {
  const bridge = useBridge()
  const { mode, gridStep, snapWall, snapItem } = useShell((s) => ({
    mode: s.editor.mode,
    gridStep: s.editor.gridSnapStep,
    snapWall: s.editor.snappingModeByContext.wall,
    snapItem: s.editor.snappingModeByContext.item,
  }))
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus()
  }, [])
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    onClose()
  }
  const deleting = mode === 'delete'
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Más opciones"
      onKeyDown={onKeyDown}
      className={cx(FLOAT, 'absolute bottom-full right-0 z-20 mb-3 flex w-[328px] flex-col gap-3 rounded-[24px] p-3')}
    >
      <button
        type="button"
        aria-pressed={deleting}
        onClick={() => {
          bridge.arm({ kind: 'delete' })
          onClose()
        }}
        className={cx(ROW, deleting ? 'bg-brand-wash font-semibold text-ink' : 'text-ink hover:bg-ink/5')}
      >
        <Trash2 aria-hidden="true" className="size-5 shrink-0 text-ink-muted" strokeWidth={1.9} />
        Eliminar elementos
      </button>
      <Section title="Cuadrícula">
        <ChipRow title="Cuadrícula" chips={GRID_CHIPS} active={String(gridStep)} onPick={(v) => bridge.setGridStep(Number(v))} />
      </Section>
      <Section title="Ajuste de muros">
        <ChipRow title="Ajuste de muros" chips={WALL_SNAP} active={snapWall} onPick={(v) => bridge.setSnap('wall', v as SnapMode)} />
      </Section>
      <Section title="Ajuste de muebles">
        <ChipRow title="Ajuste de muebles" chips={ITEM_SNAP} active={snapItem} onPick={(v) => bridge.setSnap('item', v as SnapMode)} />
      </Section>
      <button type="button" onClick={onShortcuts} className={cx(ROW, 'text-ink hover:bg-ink/5')}>
        <Keyboard aria-hidden="true" className="size-5 shrink-0 text-ink-muted" strokeWidth={1.9} />
        Atajos de teclado
      </button>
      <Section title="Próximamente">
        <div className="flex flex-wrap gap-x-3 gap-y-4 pt-2">
          {SOON_ITEMS.map((item) => (
            <SoonButton key={item.id} icon={SOON_ICONS[item.id] ?? Sparkles} label={item.label} />
          ))}
        </div>
      </Section>
    </div>
  )
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-more-menu shell-boundaries`
Expected: PASS (`shell-more-menu`: 3 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/MoreMenu.tsx apps/web/test/shell-more-menu.test.tsx
git commit -m "feat(editor): panel del menú Más conectado (eliminar, cuadrícula, ajustes, atajos y botones Pronto)" -- apps/web/src/editor/shell/MoreMenu.tsx apps/web/test/shell-more-menu.test.tsx
```

---

### Task 5e: El dock conectado (Estructura, Aberturas, Medir y Más) montado en el shell

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/ShellDock.tsx`
- Modify: `apps/web/src/editor/shell/EditorShell.tsx`
- Test: `apps/web/test/shell-dock.test.tsx`

**Interfaces:**
- Consumes: `DOCK`, `activeDockId`, `armingForButton`, `asMenuEntries`, `structureEntries`, `OPENING_ENTRIES`, `MEASURE_ENTRIES`, `Arming` (5a); `SHORTCUTS` (5c); `Dock`, `ToolMenu` (1e); `ShortcutsDialog` (5c); `MoreMenu` (5d); `bridge.arm` (5b); `useBridge`, `useShell` (4c); `EditorShell` (4d).
- Produces: `ShellDock()` (`src/editor/shell/ShellDock.tsx`): el dock del modo Editar con sus cuatro menús (Estructura, Aberturas, Medir y Más) y el diálogo de atajos. Lo que marca sale del estado **real** de Pascal (`activeDockId`); cada entrada arma la herramienta por el puente; un clic fuera, `Esc` o elegir una entrada cierran el menú y el foco vuelve al botón. En Ver no se dibuja. `EditorShell` lo monta junto a Deshacer/Rehacer solo en Editar.

El dock **no supone** qué herramienta hay armada: un proyecto en blanco abre con Estructura › Muro (Pascal arma el muro al abrir un nivel vacío) y debe verse marcado "Estructura"; un proyecto recargado puede abrir con Muebles o Materiales (Pascal restaura la herramienta). Los botones **Muebles** y **Materiales** no abren menús sino los paneles de las Tareas 7d y 8c.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-dock.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { ShellDock } from '../src/editor/shell/ShellDock'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const NO_EMOJI = /\p{Extended_Pictographic}/u
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')

function render(node: React.ReactNode, setup?: (fake: ReturnType<typeof createFakeDeps>) => void) {
  const fake = createFakeDeps()
  setup?.(fake)
  return renderToStaticMarkup(<BridgeProvider bridge={createBridge(fake.deps)}>{node}</BridgeProvider>)
}
const pressedLabels = (markup: string) =>
  [...markup.matchAll(/aria-pressed="true"[^>]*>(?:<svg[\s\S]*?<\/svg>)?([^<]+)<\/button>/g)].map((m) => m[1])

describe('ShellDock', () => {
  it('muestra los siete botones y marca el que corresponde a la herramienta REAL de Pascal (un proyecto en blanco abre con Estructura)', () => {
    const markup = render(<ShellDock />)
    const toolbar = markup.slice(0, markup.indexOf('<dialog')) // el diálogo de atajos está cerrado y va después de la barra
    expect(textOf(toolbar)).toBe('SeleccionarEstructuraAberturasMueblesMaterialesMedirMás')
    expect(pressedLabels(markup)).toEqual(['Estructura'])
  })

  it('marca Seleccionar, Aberturas, Muebles, Materiales, Medir o Más según el modo y la herramienta restaurados', () => {
    const cases: [Parameters<ReturnType<typeof createFakeDeps>['editor']['setState']>[0], string][] = [
      [{ mode: 'select', tool: null }, 'Seleccionar'],
      [{ mode: 'build', tool: 'window' }, 'Aberturas'],
      [{ mode: 'build', tool: 'item' }, 'Muebles'],
      [{ mode: 'material-paint', tool: null }, 'Materiales'],
      [{ mode: 'build', tool: 'measurement' }, 'Medir'],
      [{ mode: 'delete', tool: null }, 'Más'],
    ]
    for (const [state, label] of cases) {
      expect(pressedLabels(render(<ShellDock />, ({ editor }) => editor.setState(state))), label).toEqual([label])
    }
  })

  it('no dibuja ningún menú ni diálogo abierto al montarse', () => {
    const markup = render(<ShellDock />)
    expect(markup).not.toContain('role="menu"')
    expect(markup).not.toContain('role="dialog"')
    expect(markup).not.toMatch(NO_EMOJI)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-dock`
Expected: FAIL — `Cannot find module '../src/editor/shell/ShellDock'`.

- [ ] **Paso 2: Escribir el dock conectado y montarlo en el shell**

Create `apps/web/src/editor/shell/ShellDock.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import {
  type Arming,
  DOCK,
  type DockId,
  MEASURE_ENTRIES,
  type MeasureKind,
  OPENING_ENTRIES,
  type OpeningTool,
  type StructureTool,
  activeDockId,
  armingForButton,
  asMenuEntries,
  structureEntries,
} from './dock-model'
import { MoreMenu } from './MoreMenu'
import { SHORTCUTS } from './more-model'
import { Dock, ToolMenu } from './ui/Dock'
import { ShortcutsDialog } from './ui/ShortcutsDialog'
import { useBridge, useShell } from './use-bridge'

/** El dock del modo Editar. Lo que marca sale del estado REAL de Pascal; cada entrada arma la herramienta por el puente. */
export function ShellDock() {
  const bridge = useBridge()
  const { mode, tool } = useShell((s) => ({ mode: s.editor.mode, tool: s.editor.tool }))
  const [openMenu, setOpenMenu] = useState<DockId | null>(null)
  const [shortcuts, setShortcuts] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  // Un clic fuera del dock cierra el menú abierto.
  useEffect(() => {
    if (!openMenu) return
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [openMenu])

  /** Cierra el menú y devuelve el teclado al botón que lo abrió. */
  const closeMenu = () => {
    const was = openMenu
    setOpenMenu(null)
    if (was) queueMicrotask(() => root.current?.querySelector<HTMLElement>(`[data-dock="${was}"]`)?.focus())
  }
  const pick = (arming: Arming) => {
    bridge.arm(arming)
    closeMenu()
  }
  const onSelect = (id: string) => {
    const arming = armingForButton(id as DockId)
    if (arming) {
      setOpenMenu(null)
      bridge.arm(arming)
      return
    }
    setOpenMenu(openMenu === id ? null : (id as DockId))
  }

  const menus = {
    structure: (
      <ToolMenu
        title="Estructura"
        entries={asMenuEntries(structureEntries(), tool)}
        onPick={(id) => pick({ kind: 'tool', tool: id as StructureTool })}
        onClose={closeMenu}
      />
    ),
    openings: (
      <ToolMenu
        title="Aberturas"
        entries={asMenuEntries(OPENING_ENTRIES, tool)}
        onPick={(id) => pick({ kind: 'tool', tool: id as OpeningTool })}
        onClose={closeMenu}
      />
    ),
    measure: (
      <ToolMenu
        title="Medir"
        entries={asMenuEntries(MEASURE_ENTRIES, null)}
        onPick={(id) => pick({ kind: 'measure', measure: id as MeasureKind })}
        onClose={closeMenu}
      />
    ),
    more: (
      <MoreMenu
        onClose={closeMenu}
        onShortcuts={() => {
          setShortcuts(true)
          setOpenMenu(null)
        }}
      />
    ),
  }

  return (
    <div ref={root}>
      <Dock
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2"
        items={DOCK}
        active={activeDockId({ mode, tool })}
        openMenu={openMenu}
        onSelect={onSelect}
        menus={menus}
      />
      <ShortcutsDialog open={shortcuts} shortcuts={SHORTCUTS} onClose={() => setShortcuts(false)} />
    </div>
  )
}
```

Modify `apps/web/src/editor/shell/EditorShell.tsx`:

```diff
@@
+import { ShellDock } from './ShellDock'
 import { ShellTopBar } from './ShellTopBar'
@@
-  return mode === 'editar' ? <ShellUndoRedo /> : null
+  if (mode !== 'editar') return null
+  return (
+    <>
+      <ShellDock />
+      <ShellUndoRedo />
+    </>
+  )
```


- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-dock shell-connected shell-boundaries`
Expected: PASS (`shell-dock`: 3 pruebas; `shell-connected`: 6, sigue verde: el dock solo se dibuja en Editar y las pruebas del shell lo ignoran).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/ShellDock.tsx apps/web/src/editor/shell/EditorShell.tsx apps/web/test/shell-dock.test.tsx
git commit -m "feat(editor): dock conectado al estado real de Pascal, con menús de Estructura, Aberturas, Medir y Más" -- apps/web/src/editor/shell/ShellDock.tsx apps/web/src/editor/shell/EditorShell.tsx apps/web/test/shell-dock.test.tsx
```

---

### Task 5f: Pruebas en navegador del dock (cada botón deja a Pascal como pide la tabla 4.3)

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/e2e/dock.spec.ts`
- Modify: `apps/web/e2e/support/shell.ts` (se reescribe: suma `dock` y `dockButton`), `apps/web/src/editor/e2e-hooks.ts` (`state()` suma la cuadrícula y los ajustes)
- Test: `apps/web/e2e/dock.spec.ts` (navegador real)

**Interfaces:**
- Consumes: `expectedState` y la tabla del dock (5a); el dock conectado (5e); `hook` (3b); `modeButton`, `viewButton`, `undoRedo` (4f); `createProjectViaUi`.
- Produces: `dock(page)` y `dockButton(page, name)` en `e2e/support/shell.ts`; `window.__e2e.state()` suma `gridSnapStep`, `snapWall` y `snapItem`.

Cierra el **criterio 2 del spec**: "cada botón del dock deja a Pascal en la fase, el modo y la herramienta esperados (tabla 4.3); una prueba lee el estado del editor y lo comprueba". La prueba recorre cada entrada de los menús y compara con `expectedState`, de modo que si se cambia la tabla y no el puente (o al revés), falla.

- [ ] **Paso 1: Escribir las pruebas en navegador**

Create `apps/web/e2e/support/shell.ts` (ya existe: reemplázalo entero con esto):

```ts
import type { Page } from '@playwright/test'

export const modeButton = (page: Page, name: 'Ver' | 'Editar') =>
  page.getByRole('group', { name: 'Modo del editor' }).getByRole('button', { name, exact: true })

export const viewButton = (page: Page, name: '2D' | '3D' | 'Ambas') =>
  page.getByRole('group', { name: 'Vista del plano' }).getByRole('button', { name, exact: true })

export const undoRedo = (page: Page) => ({
  group: page.getByRole('group', { name: 'Historial' }),
  undo: page.getByRole('button', { name: 'Deshacer' }),
  redo: page.getByRole('button', { name: 'Rehacer' }),
})

export const dock = (page: Page) => page.getByRole('toolbar', { name: 'Herramientas de edición' })

export const dockButton = (page: Page, name: string) => dock(page).getByRole('button', { name, exact: true })
```

Modify `apps/web/src/editor/e2e-hooks.ts`:

```diff
@@
         levelId: selection.levelId as string | null,
+        gridSnapStep: editor.gridSnapStep,
+        snapWall: editor.snappingModeByContext.wall,
+        snapItem: editor.snappingModeByContext.item,
```


Create `apps/web/e2e/dock.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import {
  type Arming,
  DOCK,
  MEASURE_ENTRIES,
  OPENING_ENTRIES,
  activeDockId,
  expectedState,
  structureEntries,
} from '../src/editor/shell/dock-model'
import { ready } from './support/editor'
import { hook } from './support/hooks'
import { createProjectViaUi } from './support/projects'
import { dock, dockButton, modeButton } from './support/shell'

type Step = { label: string; via?: string; arming: Arming }
const STEPS: Step[] = [
  { label: 'Seleccionar', arming: { kind: 'select' } },
  ...structureEntries().map((e): Step => ({ via: 'Estructura', label: e.label, arming: { kind: 'tool', tool: e.id } })),
  ...OPENING_ENTRIES.map((e): Step => ({ via: 'Aberturas', label: e.label, arming: { kind: 'tool', tool: e.id } })),
  { label: 'Muebles', arming: { kind: 'furniture' } },
  { label: 'Materiales', arming: { kind: 'paint' } },
  ...MEASURE_ENTRIES.map((e): Step => ({ via: 'Medir', label: e.label, arming: { kind: 'measure', measure: e.id } })),
]
const labelOfActive = (state: { mode: string; tool: string | null }) =>
  DOCK.find((b) => b.id === activeDockId({ mode: state.mode as never, tool: state.tool }))?.label

test('cada botón y cada entrada de menú deja a Pascal en la fase, el modo y la herramienta de la tabla 4.3', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E dock ${Date.now()}`, template: null })
  await expect(dock(page)).toBeVisible({ timeout: 15_000 })
  for (const step of STEPS) {
    if (step.via) {
      await dockButton(page, step.via).click()
      await page.getByRole('menuitem', { name: step.label, exact: true }).click()
    } else {
      await dockButton(page, step.label).click()
    }
    const want = expectedState(step.arming)
    const target = { mode: want.mode, tool: want.tool, ...(want.phase ? { phase: want.phase } : {}) }
    await expect
      .poll(
        async () => {
          const s = await hook(page, 'state')
          return { mode: s.mode, tool: s.tool, ...(want.phase ? { phase: s.phase } : {}) }
        },
        { message: `${step.via ?? 'dock'} › ${step.label}`, timeout: 10_000 },
      )
      .toEqual(target)
    const pressed = labelOfActive(want)
    if (pressed) await expect(dockButton(page, pressed)).toHaveAttribute('aria-pressed', 'true')
  }
})

test('el dock marca la herramienta REAL de Pascal al abrir y después de recargar (Pascal restaura fase y herramienta)', async ({ page }) => {
  const url = await createProjectViaUi(page, { name: `E2E dock real ${Date.now()}`, template: null })
  // Un proyecto en blanco abre con la herramienta de muro ya armada: el dock no puede suponer "Seleccionar".
  await expect(dockButton(page, 'Estructura')).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 })
  await hook(page, 'addWall')
  await dockButton(page, 'Aberturas').click()
  await page.getByRole('menuitem', { name: 'Ventana', exact: true }).click()
  await expect(page.getByTestId('save-status')).toHaveText('Guardado', { timeout: 30_000 })
  await page.goto(url)
  await ready(page)
  await expect(dock(page)).toBeVisible({ timeout: 15_000 })
  const label = labelOfActive(await hook(page, 'state'))
  const pressed = await dock(page).getByRole('button', { pressed: true }).allInnerTexts()
  expect(pressed.map((t) => t.trim())).toEqual(label ? [label] : [])
})

test('en Ver el dock no está en pantalla y Editar lo devuelve', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E dock ver ${Date.now()}`, template: null })
  await expect(dock(page)).toBeVisible({ timeout: 15_000 })
  await modeButton(page, 'Ver').click()
  await expect(dock(page)).toHaveCount(0)
  await modeButton(page, 'Editar').click()
  await expect(dock(page)).toBeVisible()
})

test('Más: cuadrícula y ajuste cambian lo de Pascal, Eliminar arma el borrado, Atajos abre su diálogo y los botones Pronto no hacen nada', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E mas ${Date.now()}`, template: null })
  const more = page.getByRole('dialog', { name: 'Más opciones' })
  await dockButton(page, 'Más').click()
  await expect(more).toBeVisible({ timeout: 15_000 })
  await more.getByRole('button', { name: '25 cm' }).click()
  await expect.poll(async () => (await hook(page, 'state')).gridSnapStep).toBe(0.25)
  await more.getByRole('button', { name: 'Ángulos' }).click()
  await expect.poll(async () => (await hook(page, 'state')).snapWall).toBe('angles')
  for (const name of ['Compartir', 'Renderizar', 'Exportar plano']) await expect(more.getByRole('button', { name })).toBeDisabled()
  await expect(more.getByText('Pronto')).toHaveCount(3)

  await more.getByRole('button', { name: 'Atajos de teclado' }).click()
  const shortcuts = page.getByRole('dialog', { name: 'Atajos de teclado' })
  await expect(shortcuts).toBeVisible()
  await expect(shortcuts).toContainText('Borrar lo elegido')
  await page.keyboard.press('Escape')
  await expect(shortcuts).toBeHidden()

  await dockButton(page, 'Más').click()
  await more.getByRole('button', { name: 'Eliminar elementos' }).click()
  await expect.poll(async () => (await hook(page, 'state')).mode).toBe('delete')
  await expect(dockButton(page, 'Más')).toHaveAttribute('aria-pressed', 'true')
})

test('un menú del dock enfoca su primera entrada, las flechas mueven el foco y Esc lo cierra y devuelve el foco al botón', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E menu ${Date.now()}`, template: null })
  await dockButton(page, 'Estructura').click()
  await expect(page.getByRole('menuitem', { name: 'Muro', exact: true })).toBeFocused({ timeout: 15_000 })
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Ambiente', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu', { name: 'Estructura' })).toHaveCount(0)
  await expect(dockButton(page, 'Estructura')).toBeFocused()
  // Escape cerró el menú sin cancelar la herramienta que ya estaba armada.
  expect((await hook(page, 'state')).tool).toBe('wall')
})
```

Run (Supabase local arriba: `pnpm db:start && pnpm db:env`): `pnpm --filter @interiores/web e2e e2e/dock.spec.ts`
Expected: PASS (5 pruebas). Si `Ambiente` falla, revisa `DECISIONS.zoneTool` (Tarea 0c): con `false` el menú no la ofrece y `STEPS` tampoco (usa `structureEntries()`). Esta prueba ejercita con Pascal real la unión de las Tareas 5a a 5e (cuyas pruebas unitarias ya tuvieron su rojo): si el puente deja una fase o una herramienta distinta de la tabla, la comparación con `expectedState` lo dice.

- [ ] **Paso 2: Commit**

```bash
git add apps/web/e2e/support/shell.ts apps/web/src/editor/e2e-hooks.ts apps/web/e2e/dock.spec.ts
git commit -m "test(editor): cada botón del dock deja a Pascal en la fase, el modo y la herramienta de la tabla 4.3" -- apps/web/e2e/support/shell.ts apps/web/src/editor/e2e-hooks.ts apps/web/e2e/dock.spec.ts
```

---

### Task 6a: Nombres en castellano de plantas y ambientes, formato de superficie y freno de doble clic

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/lib/editor-names.ts`, `apps/web/src/lib/format.ts`, `apps/web/src/editor/shell/click-guard.ts`
- Test: `apps/web/test/shell-names.test.ts`, `apps/web/test/shell-click-guard.test.ts`

**Interfaces:**
- Consumes: nada de las tareas anteriores.
- Produces:
  - `defaultLevelName(level: number): string` (`Planta baja` / `Planta N` / `Sótano N`), `levelDisplayName(level: { name?: string | null; level: number }): string` (D10: un nombre vacío o el que Pascal inventa en inglés, `Ground Floor`, `Floor N` y `Basement N`, se muestra en castellano **sin cambiar el dato guardado**; el que puso la persona se respeta), `zoneDisplayName(name?: string | null): string` (`Zone 2` → `Ambiente 2`; un nombre vacío → `Ambiente sin nombre`) en `@/lib/editor-names`.
  - `formatArea(squareMeters: number): string` en `@/lib/format` (`15,2 m²`: coma decimal, un decimal y un espacio; `formatAreaLabel` de Pascal devuelve `15.2m²`, y la maqueta dice `15,2 m²`).
  - `createClickGuard(windowMs?: number): () => boolean` en `shell/click-guard.ts` (`true` = la acción puede correr; una segunda llamada dentro de la ventana, 600 ms por omisión, devuelve `false`): frena el segundo clic de un doble clic en las acciones que **crean** cosas ("Agregar planta" en la Tarea 6c, "Duplicar" en la 9b).

**Cubre el criterio 7 del spec ("Castellano")** para los nombres de nivel: "Niveles sin nombre se ven como 'Planta baja' y 'Planta 1'". Pascal los llama `Ground Floor`, `Floor N` y `Basement N` (`getDefaultLevelName` en `core/dist/lib/level-name.js`) y su herramienta de ambientes nombra `Zone N`; el dato guardado en el proyecto **no se toca** (otros programas leen esos nombres): solo se traduce lo que se muestra.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-names.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { defaultLevelName, levelDisplayName, zoneDisplayName } from '../src/lib/editor-names'
import { formatArea } from '../src/lib/format'

describe('nombres de planta (D10: se muestran en castellano sin tocar el dato guardado)', () => {
  it('una planta sin nombre se ve como Planta baja, Planta N o Sótano N', () => {
    expect(levelDisplayName({ level: 0 })).toBe('Planta baja')
    expect(levelDisplayName({ level: 1 })).toBe('Planta 1')
    expect(levelDisplayName({ level: 2, name: '' })).toBe('Planta 2')
    expect(levelDisplayName({ level: 3, name: '   ' })).toBe('Planta 3')
    expect(levelDisplayName({ level: -1, name: null })).toBe('Sótano 1')
    expect(defaultLevelName(-2)).toBe('Sótano 2')
  })

  it('los nombres por defecto que Pascal guarda en inglés también se muestran en castellano', () => {
    expect(levelDisplayName({ level: 0, name: 'Ground Floor' })).toBe('Planta baja')
    expect(levelDisplayName({ level: 1, name: 'Floor 1' })).toBe('Planta 1')
    expect(levelDisplayName({ level: -1, name: 'Basement 1' })).toBe('Sótano 1')
  })

  it('un nombre que puso la persona se respeta tal cual', () => {
    expect(levelDisplayName({ level: 0, name: 'Altillo' })).toBe('Altillo')
    expect(levelDisplayName({ level: 1, name: 'Floor plan final' })).toBe('Floor plan final')
  })
})

describe('nombres de ambiente', () => {
  it('"Zone N" (lo que nombra la herramienta de Pascal) se muestra "Ambiente N"; lo demás no cambia', () => {
    expect(zoneDisplayName('Zone 1')).toBe('Ambiente 1')
    expect(zoneDisplayName('Zone 12')).toBe('Ambiente 12')
    expect(zoneDisplayName('Sala de estar')).toBe('Sala de estar')
    expect(zoneDisplayName('')).toBe('Ambiente sin nombre')
    expect(zoneDisplayName(undefined)).toBe('Ambiente sin nombre')
  })
})

describe('formatArea', () => {
  it('usa coma decimal, un decimal y un espacio antes de m² (no el "15.2m²" de Pascal)', () => {
    expect(formatArea(15.2)).toBe('15,2 m²')
    expect(formatArea(4.84)).toBe('4,8 m²')
    expect(formatArea(0)).toBe('0,0 m²')
    expect(formatArea(1234.56)).toBe('1.234,6 m²')
  })

  it('un valor que no es número no rompe la lista de ambientes', () => {
    expect(formatArea(Number.NaN)).toBe('0,0 m²')
  })
})
```

Create `apps/web/test/shell-click-guard.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createClickGuard } from '../src/editor/shell/click-guard'

afterEach(() => vi.useRealTimers())

describe('createClickGuard', () => {
  it('deja pasar el primer clic y frena el segundo dentro de la ventana (doble clic)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
    const allow = createClickGuard(600)
    expect(allow()).toBe(true)
    vi.setSystemTime(1_200)
    expect(allow()).toBe(false)
  })

  it('vuelve a dejar pasar cuando la ventana terminó, y la ventana cuenta desde el último permitido', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
    const allow = createClickGuard(600)
    expect(allow()).toBe(true)
    vi.setSystemTime(1_599)
    expect(allow()).toBe(false)
    vi.setSystemTime(1_600)
    expect(allow()).toBe(true)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-names shell-click-guard`
Expected: FAIL — `Cannot find module '../src/lib/editor-names'` y `Cannot find module '../src/editor/shell/click-guard'`.

- [ ] **Paso 2: Escribir nombres, formato y freno de doble clic**

Create `apps/web/src/lib/editor-names.ts`:

```ts
/** Nombre de una planta cuando no tiene uno propio: `Planta baja`, `Planta N` o `Sótano N` (Pascal las llama Ground Floor, Floor N y Basement N). */
export function defaultLevelName(level: number): string {
  if (level === 0) return 'Planta baja'
  return level > 0 ? `Planta ${level}` : `Sótano ${-level}`
}

const ENGLISH_FLOOR = /^Floor (\d+)$/
const ENGLISH_BASEMENT = /^Basement (\d+)$/

/** Cómo se MUESTRA una planta (D10): el nombre guardado no se cambia; los vacíos y los que Pascal inventó en inglés salen en castellano. */
export function levelDisplayName(level: { name?: string | null; level: number }): string {
  const name = level.name?.trim()
  if (!name) return defaultLevelName(level.level)
  if (name === 'Ground Floor') return 'Planta baja'
  const floor = ENGLISH_FLOOR.exec(name)
  if (floor) return `Planta ${floor[1]}`
  const basement = ENGLISH_BASEMENT.exec(name)
  if (basement) return `Sótano ${basement[1]}`
  return name
}

/** La herramienta de ambientes de Pascal los nombra `Zone N`; en pantalla se dice "ambiente", nunca "zona". */
export function zoneDisplayName(name?: string | null): string {
  const text = name?.trim()
  if (!text) return 'Ambiente sin nombre'
  const generated = /^Zone (\d+)$/.exec(text)
  return generated ? `Ambiente ${generated[1]}` : text
}
```

Create `apps/web/src/lib/format.ts`:

```ts
const AREA = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** "15,2 m²": coma decimal, un decimal y un espacio, como la maqueta (`formatAreaLabel` de Pascal devuelve "15.2m²"). */
export function formatArea(squareMeters: number): string {
  return `${AREA.format(Number.isFinite(squareMeters) ? squareMeters : 0)} m²`
}
```

Create `apps/web/src/editor/shell/click-guard.ts`:

```ts
/**
 * Frena el segundo clic de un doble clic: `true` = la acción puede correr; una nueva llamada dentro de `windowMs` desde la
 * última permitida devuelve `false`. Sirve para "Agregar planta" y "Duplicar", que crean cosas.
 */
export function createClickGuard(windowMs = 600): () => boolean {
  let last = Number.NEGATIVE_INFINITY
  return () => {
    const now = Date.now()
    if (now - last < windowMs) return false
    last = now
    return true
  }
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-names shell-click-guard shell-boundaries`
Expected: PASS (`shell-names`: 6 pruebas; `shell-click-guard`: 2).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/lib/editor-names.ts apps/web/src/lib/format.ts apps/web/src/editor/shell/click-guard.ts apps/web/test/shell-names.test.ts apps/web/test/shell-click-guard.test.ts
git commit -m "feat(editor): nombres de plantas y ambientes en castellano, formato de metros cuadrados y freno de doble clic" -- apps/web/src/lib/editor-names.ts apps/web/src/lib/format.ts apps/web/src/editor/shell/click-guard.ts apps/web/test/shell-names.test.ts apps/web/test/shell-click-guard.test.ts
```

---

### Task 6b: Plantas y ambientes por el puente (1 de 2): selectores, elegir planta y elegir ambiente

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/shell/bridge/levels.ts`, `apps/web/test/support/loft.ts`
- Modify: `apps/web/src/editor/shell/bridge/index.ts`
- Test: `apps/web/test/shell-bridge-levels.test.ts`

**Interfaces:**
- Consumes: `levelDisplayName`, `zoneDisplayName` (6a); `CoreDeps`, `SceneNodeLike`, `BridgeSnapshot` (4a); `createBridge`, `createFakeDeps` y su `snapshot()` (4a, 4b).
- Produces (`shell/bridge/levels.ts`):
  - `selectLevels(s: BridgeSnapshot): { levels: { id: string; name: string }[]; activeId: string | null }` (las plantas del edificio elegido, o del primero, ordenadas por índice y con su nombre en castellano; `activeId` es `null` si la elegida ya no existe) y `selectZones(s: BridgeSnapshot): { zones: { id: string; name: string; area: number }[]; selectedId: string | null }` (los ambientes de la planta activa con su superficie en m²; lo que no es ambiente se ignora).
  - `shoelaceArea(polygon): number`: la superficie con la fórmula del polígono.
  - `createLevelsSlice(deps: CoreDeps)` con `selectLevel(id: string): void` y `selectZone(id: string): void` (no hace nada en Ver; arma Seleccionar si había otra herramienta). La Tarea 6c le suma `addLevel`.
- Produces (`test/support/loft.ts`): `LOFT` (un edificio con dos plantas: la baja sin nombre, con dos ambientes y un muro, y `Floor 1` vacía) y `withLoft()`: dobles con ese edificio cargado y la planta baja elegida. Las pruebas de 6b y 6c lo comparten.

**Superficie de un ambiente.** `deriveZoneQuantityReport(...).footprintArea` (core) es exactamente el área con la fórmula del polígono (`zone-quantities.js`, línea 370), pero antes corre la detección de recintos de la planta; recalcularla en cada cambio de la escena (arrastrar un muro) sería caro. Aquí se usa la misma fórmula (`shoelaceArea`). Los ambientes del panel salen de `LevelNode.children`, igual que la lista de Pascal.

- [ ] **Paso 1: Escribir los dobles de la escena y la prueba (rojo)**

Create `apps/web/test/support/loft.ts`:

```ts
import type { SceneLike } from '../../src/editor/shell/bridge/types'
import { createFakeDeps } from './fake-deps'

const nodes = (list: Record<string, object>) => list as unknown as SceneLike['nodes']

/** Un edificio con dos plantas: la baja sin nombre (con dos ambientes y un muro) y "Floor 1" vacía, como las deja Pascal. */
export const LOFT = nodes({
  site_1: { id: 'site_1', type: 'site', children: ['building_1'] },
  building_1: { id: 'building_1', type: 'building', children: ['level_b', 'level_a'] },
  level_a: { id: 'level_a', type: 'level', level: 0, children: ['zone_1', 'wall_1', 'zone_2'] },
  level_b: { id: 'level_b', type: 'level', level: 1, name: 'Floor 1', children: [] },
  wall_1: { id: 'wall_1', type: 'wall' },
  zone_1: { id: 'zone_1', type: 'zone', name: 'Sala de estar', polygon: [[0, 0], [4, 0], [4, 3], [0, 3]] },
  zone_2: { id: 'zone_2', type: 'zone', name: 'Zone 2', polygon: [[0, 0], [1, 0]] },
})

/** Los dobles con el edificio cargado y la planta baja elegida. */
export function withLoft() {
  const fake = createFakeDeps()
  fake.scene.setState({ nodes: LOFT })
  fake.viewer.setState({ selection: { buildingId: 'building_1', levelId: 'level_a', zoneId: null, selectedIds: [] } })
  return fake
}
```

Create `apps/web/test/shell-bridge-levels.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { selectLevels, selectZones } from '../src/editor/shell/bridge/levels'
import { createFakeDeps } from './support/fake-deps'
import { withLoft } from './support/loft'

describe('selectLevels', () => {
  it('lista las plantas ordenadas por índice y con nombre en castellano aunque no tengan nombre o lo traigan en inglés', () => {
    expect(selectLevels(withLoft().snapshot())).toEqual({
      levels: [
        { id: 'level_a', name: 'Planta baja' },
        { id: 'level_b', name: 'Planta 1' },
      ],
      activeId: 'level_a',
    })
  })

  it('una escena sin edificio (o vacía) no rompe: no hay plantas ni planta activa', () => {
    expect(selectLevels(createFakeDeps().snapshot())).toEqual({ levels: [], activeId: null })
  })

  it('si la planta elegida ya no existe no queda ninguna activa', () => {
    const fake = withLoft()
    fake.viewer.setState({ selection: { buildingId: 'building_1', levelId: 'level_borrado', zoneId: null, selectedIds: [] } })
    expect(selectLevels(fake.snapshot()).activeId).toBeNull()
  })
})

describe('selectZones', () => {
  it('lista los ambientes de la planta activa con su superficie y el nombre traducido; ignora lo que no es ambiente', () => {
    expect(selectZones(withLoft().snapshot())).toEqual({
      zones: [
        { id: 'zone_1', name: 'Sala de estar', area: 12 },
        { id: 'zone_2', name: 'Ambiente 2', area: 0 },
      ],
      selectedId: null,
    })
  })

  it('un proyecto en blanco no tiene ambientes y la planta sin hijos tampoco', () => {
    expect(selectZones(createFakeDeps().snapshot()).zones).toEqual([])
    const fake = withLoft()
    fake.viewer.setState({ selection: { buildingId: 'building_1', levelId: 'level_b', zoneId: null, selectedIds: [] } })
    expect(selectZones(fake.snapshot()).zones).toEqual([])
  })

  it('marca el ambiente elegido', () => {
    const fake = withLoft()
    fake.viewer.setState({ selection: { buildingId: 'building_1', levelId: 'level_a', zoneId: 'zone_1', selectedIds: [] } })
    expect(selectZones(fake.snapshot()).selectedId).toBe('zone_1')
  })
})

describe('selectLevel y selectZone', () => {
  it('elegir una planta la selecciona dentro de su edificio (Pascal vacía la selección del nivel anterior)', () => {
    const fake = withLoft()
    createBridge(fake.deps).selectLevel('level_b')
    expect(fake.viewer.getState().selection).toMatchObject({ buildingId: 'building_1', levelId: 'level_b' })
  })

  it('elegir un ambiente lo selecciona y deja la herramienta en Seleccionar; en Ver no hace nada', () => {
    const fake = withLoft()
    const bridge = createBridge(fake.deps)
    bridge.selectZone('zone_1') // el doble arranca con la herramienta de muro armada
    expect(fake.editor.getState()).toMatchObject({ mode: 'select', tool: null })
    expect(fake.viewer.getState().selection).toMatchObject({ zoneId: 'zone_1', selectedIds: [] })
    fake.viewer.setState({ selection: { buildingId: 'building_1', levelId: 'level_a', zoneId: null, selectedIds: [] } })
    fake.scene.setState({ readOnly: true })
    bridge.selectZone('zone_2')
    expect(fake.viewer.getState().selection.zoneId).toBeNull()
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-levels`
Expected: FAIL — `Cannot find module '../src/editor/shell/bridge/levels'`.

- [ ] **Paso 2: Escribir la porción de niveles del puente**

Create `apps/web/src/editor/shell/bridge/levels.ts`:

```ts
import { levelDisplayName, zoneDisplayName } from '@/lib/editor-names'
import type { CoreDeps } from './core'
import type { BridgeSnapshot, SceneLike, SceneNodeLike, ViewerLike } from './types'

type LevelNodeLike = SceneNodeLike & { level: number; name?: string | null }
type ZoneNodeLike = SceneNodeLike & { name?: string | null; polygon?: readonly (readonly [number, number])[] }

/** Edificio de la selección (o el primero) y sus plantas ordenadas por índice, como el selector de planta de Pascal. */
function levelsOf(scene: SceneLike, viewer: ViewerLike): { buildingId: string | null; levels: LevelNodeLike[] } {
  const { nodes } = scene
  const picked = viewer.selection.buildingId ? nodes[viewer.selection.buildingId] : undefined
  const building = picked?.type === 'building' ? picked : Object.values(nodes).find((n) => n.type === 'building')
  if (!building) return { buildingId: null, levels: [] }
  const levels = (building.children ?? [])
    .map((id) => nodes[id])
    .filter((n): n is SceneNodeLike => n?.type === 'level') as LevelNodeLike[]
  return { buildingId: building.id, levels: [...levels].sort((a, b) => a.level - b.level) }
}

/** Superficie con la fórmula del polígono (la misma de `footprintArea` en `deriveZoneQuantityReport`, sin su detección de recintos). */
export function shoelaceArea(polygon: readonly (readonly [number, number])[]): number {
  let twice = 0
  polygon.forEach((start, index) => {
    const end = polygon[(index + 1) % polygon.length] as readonly [number, number]
    twice += start[0] * end[1] - end[0] * start[1]
  })
  return Math.abs(twice) / 2
}

export function selectLevels(s: BridgeSnapshot): { levels: { id: string; name: string }[]; activeId: string | null } {
  const { levels } = levelsOf(s.scene, s.viewer)
  const activeId = levels.some((l) => l.id === s.viewer.selection.levelId) ? s.viewer.selection.levelId : null
  return { levels: levels.map((l) => ({ id: l.id, name: levelDisplayName(l) })), activeId }
}

export function selectZones(s: BridgeSnapshot): {
  zones: { id: string; name: string; area: number }[]
  selectedId: string | null
} {
  const active = levelsOf(s.scene, s.viewer).levels.find((l) => l.id === s.viewer.selection.levelId)
  const zones = (active?.children ?? [])
    .map((id) => s.scene.nodes[id])
    .filter((n): n is SceneNodeLike => n?.type === 'zone')
    .map((n) => {
      const zone = n as ZoneNodeLike
      return { id: zone.id, name: zoneDisplayName(zone.name), area: shoelaceArea(zone.polygon ?? []) }
    })
  return { zones, selectedId: s.viewer.selection.zoneId }
}

export function createLevelsSlice(deps: CoreDeps) {
  const current = () => levelsOf(deps.scene.getState(), deps.viewer.getState())
  return {
    selectLevel(id: string): void {
      const { buildingId } = current()
      deps.viewer.getState().setSelection(buildingId ? { buildingId, levelId: id } : { levelId: id })
    },
    // @@levels-actions
    /** Elegir un ambiente de la lista lo selecciona (en Ver no hay selección). */
    selectZone(id: string): void {
      if (deps.scene.getState().readOnly) return
      if (deps.editor.getState().mode !== 'select') deps.editor.getState().armToolMode({ mode: 'select' })
      deps.viewer.getState().setSelection({ selectedIds: [], zoneId: id })
    },
  }
}
```

Modify `apps/web/src/editor/shell/bridge/index.ts`:

```diff
@@
+import { createLevelsSlice } from './levels'
 import { type ModeDeps, createModeSlice } from './mode'
@@
     ...createToolsSlice(deps),
+    ...createLevelsSlice(deps),
     // @@slices
```


- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-levels shell-selectors shell-bridge-mode shell-boundaries`
Expected: PASS (`shell-bridge-levels`: 8 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/bridge/levels.ts apps/web/src/editor/shell/bridge/index.ts apps/web/test/support/loft.ts apps/web/test/shell-bridge-levels.test.ts
git commit -m "feat(editor): selectores de plantas y ambientes (con sus metros cuadrados) y elegir planta o ambiente por el puente" -- apps/web/src/editor/shell/bridge/levels.ts apps/web/src/editor/shell/bridge/index.ts apps/web/test/support/loft.ts apps/web/test/shell-bridge-levels.test.ts
```

---

### Task 6c: Plantas y ambientes por el puente (2 de 2): agregar una planta

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Modify: `apps/web/src/editor/shell/bridge/levels.ts`, `apps/web/src/editor/shell/bridge/index.ts`, `apps/web/src/editor/pascal-bridge.ts`, `apps/web/test/support/fake-deps.ts`
- Test: `apps/web/test/shell-bridge-add-level.test.ts`

**Interfaces:**
- Consumes: `createClickGuard` (6a); `withLoft()` (6b); `createLevelsSlice`, `levelsOf` (6b); `LevelNode` y `DEFAULT_LEVEL_HEIGHT` de `@pascal-app/core` (solo `pascal-bridge.ts`).
- Produces:
  - `type LevelsDeps = { createLevel(input: { buildingId: string; level: number }): string }` y `addLevel(): string | null` en el puente (`bridge/levels.ts`): crea la planta siguiente a la más alta del edificio y la deja activa; no hace nada en Ver, sin edificio ni dentro de la ventana de doble clic (devuelve `null`). `BridgeDeps = CoreDeps & ModeDeps & LevelsDeps`.
  - En `pascal-bridge.ts`: `levelsDeps()`, que crea el nivel con la misma receta que "Add level above" del selector de planta de Pascal (`editor/src/components/ui/floating-level-selector.tsx`): `LevelNode.parse({ level, height: DEFAULT_LEVEL_HEIGHT, children: [], parentId })` y `useScene.getState().createNode(node, buildingId)`.

Un doble clic en "Agregar planta" crea **una sola** planta: el segundo clic cae dentro de la ventana del `createClickGuard` (600 ms) y no hace nada. Esta es una de las dos acciones que crean cosas y por eso tienen freno; la otra es Duplicar (Tarea 9b).

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-bridge-add-level.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { createFakeDeps } from './support/fake-deps'
import { withLoft } from './support/loft'

afterEach(() => vi.useRealTimers())

describe('addLevel', () => {
  it('crea la planta siguiente al índice más alto y la deja activa', () => {
    const fake = withLoft()
    const bridge = createBridge(fake.deps)
    expect(bridge.addLevel()).toBe('level_nuevo')
    expect(fake.deps.createLevel).toHaveBeenCalledWith({ buildingId: 'building_1', level: 2 })
    expect(fake.viewer.getState().selection).toMatchObject({ buildingId: 'building_1', levelId: 'level_nuevo' })
  })

  it('un doble clic en "Agregar planta" crea una sola planta', () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    const fake = withLoft()
    const bridge = createBridge(fake.deps)
    bridge.addLevel()
    expect(bridge.addLevel()).toBeNull()
    expect(fake.deps.createLevel).toHaveBeenCalledTimes(1)
  })

  it('en Ver no se crean plantas, y sin edificio tampoco', () => {
    const fake = withLoft()
    fake.scene.setState({ readOnly: true })
    expect(createBridge(fake.deps).addLevel()).toBeNull()
    const empty = createFakeDeps()
    expect(createBridge(empty.deps).addLevel()).toBeNull()
    expect(empty.deps.createLevel).not.toHaveBeenCalled()
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-add-level`
Expected: FAIL — `TypeError: bridge.addLevel is not a function` (3 pruebas en rojo).

- [ ] **Paso 2: Sumar `addLevel` a la porción de niveles**

Modify `apps/web/src/editor/shell/bridge/levels.ts`:

```diff
@@
+import { createClickGuard } from '../click-guard'
 import type { CoreDeps } from './core'
@@
 type ZoneNodeLike = SceneNodeLike & { name?: string | null; polygon?: readonly (readonly [number, number])[] }
+
+export type LevelsDeps = {
+  /** `LevelNode.parse` + `createNode` de Pascal: crea la planta dentro del edificio y devuelve su id. */
+  createLevel(input: { buildingId: string; level: number }): string
+}
@@
-export function createLevelsSlice(deps: CoreDeps) {
+export function createLevelsSlice(deps: CoreDeps & LevelsDeps) {
+  const allowAdd = createClickGuard()
   const current = () => levelsOf(deps.scene.getState(), deps.viewer.getState())
@@
-    // @@levels-actions
+    /** Agrega una planta sobre la más alta (como "Add level above" de Pascal) y la deja activa. En Ver no hace nada. */
+    addLevel(): string | null {
+      if (deps.scene.getState().readOnly || !allowAdd()) return null
+      const { buildingId, levels } = current()
+      if (!buildingId) return null
+      const level = levels.length > 0 ? Math.max(...levels.map((l) => l.level)) + 1 : 0
+      const id = deps.createLevel({ buildingId, level })
+      deps.viewer.getState().setSelection({ buildingId, levelId: id })
+      return id
+    },
```


Modify `apps/web/src/editor/shell/bridge/index.ts`:

```diff
@@
-import { createLevelsSlice } from './levels'
+import { type LevelsDeps, createLevelsSlice } from './levels'
@@
-export type BridgeDeps = CoreDeps & ModeDeps
+export type BridgeDeps = CoreDeps & ModeDeps & LevelsDeps
```


Modify `apps/web/test/support/fake-deps.ts`:

```diff
@@
     cancelActiveTool: vi.fn(),
+    createLevel: vi.fn((_input: { buildingId: string; level: number }) => 'level_nuevo'),
     // @@fake-deps
```


- [ ] **Paso 3: Conectar la creación de plantas con Pascal**

Modify `apps/web/src/editor/pascal-bridge.ts`:

```diff
@@
+import * as Core from '@pascal-app/core'
 import * as Pascal from '@pascal-app/editor'
@@
+import type { LevelsDeps } from './shell/bridge/levels'
 import type { ModeDeps } from './shell/bridge/mode'
@@
-export function createPascalBridge(): ShellBridge {
-  return createBridge({
-    ...coreDeps(),
-    ...modeDeps(),
+/** Misma receta que "Add level above" del selector de planta de Pascal (editor/src/components/ui/floating-level-selector.tsx). */
+function levelsDeps(): LevelsDeps {
+  return {
+    createLevel: ({ buildingId, level }) => {
+      const node = Core.LevelNode.parse({ level, height: Core.DEFAULT_LEVEL_HEIGHT, children: [], parentId: buildingId })
+      Pascal.useScene.getState().createNode(node, buildingId as never)
+      return node.id
+    },
+  }
+}
+
+export function createPascalBridge(): ShellBridge {
+  return createBridge({
+    ...coreDeps(),
+    ...modeDeps(),
+    ...levelsDeps(),
     // @@deps
```


- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-add-level shell-bridge-levels shell-bridge-mode shell-bridge-tools shell-boundaries`
Expected: PASS (`shell-bridge-add-level`: 3 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` (`LevelNode.parse(...)` y `createNode(node, buildingId)` compilan contra los tipos reales de Pascal) y Biome sin errores nuevos.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/bridge/levels.ts apps/web/src/editor/shell/bridge/index.ts apps/web/src/editor/pascal-bridge.ts apps/web/test/support/fake-deps.ts apps/web/test/shell-bridge-add-level.test.ts
git commit -m "feat(editor): agregar una planta por el puente (una sola con doble clic; nada en Ver)" -- apps/web/src/editor/shell/bridge/levels.ts apps/web/src/editor/shell/bridge/index.ts apps/web/src/editor/pascal-bridge.ts apps/web/test/support/fake-deps.ts apps/web/test/shell-bridge-add-level.test.ts
```

---

### Task 6d: Panel de plantas y ambientes conectado al shell y sus pruebas en navegador

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/use-dismiss.ts`, `apps/web/src/editor/shell/LevelsPanel.tsx`, `apps/web/e2e/niveles.spec.ts`
- Modify: `apps/web/src/editor/shell/EditorShell.tsx`, `apps/web/src/editor/shell/ShellDock.tsx` (usa `useDismiss`)
- Test: `apps/web/test/shell-levels-panel.test.tsx`, `apps/web/e2e/niveles.spec.ts` (navegador real)

**Interfaces:**
- Consumes: `LevelPanel` (1f); `selectLevels`, `selectZones`, `bridge.selectLevel`, `bridge.selectZone` (6b); `bridge.addLevel` (6c); `formatArea` (6a); `useBridge`, `useShell` (4c); `EditorShell` (4d); `ShellDock` (5e); `hook` (3b); `modeButton` (4f).
- Produces:
  - `useDismiss(active: boolean, ref: RefObject<HTMLElement | null>, onDismiss: () => void)` en `shell/use-dismiss.ts`: cierra algo flotante (un menú, una lista) con un clic fuera del elemento de `ref`. Lo usan `LevelsPanel` y `ShellDock`.
  - `LevelsPanel()`: el panel izquierdo conectado: planta activa (con crear planta) y ambientes con sus m². Se ve **en Editar y en Ver**; en Ver no se crean plantas ni se eligen ambientes. `EditorShell` lo monta siempre.

Cierra el criterio 7 del spec para el panel de niveles: "Niveles sin nombre se ven como 'Planta baja' y 'Planta 1'", sin palabras de la lista de inglés conocida (`Ground Floor`, `Floor N`, `Basement`, `Zone N`).

- [ ] **Paso 1: Escribir la prueba del panel (rojo)**

Create `apps/web/test/shell-levels-panel.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import type { SceneLike } from '../src/editor/shell/bridge/types'
import { LevelsPanel } from '../src/editor/shell/LevelsPanel'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const ENGLISH = /Ground Floor|Floor \d|Basement|Zone \d/

function render(setup: (fake: ReturnType<typeof createFakeDeps>) => void) {
  const fake = createFakeDeps()
  setup(fake)
  return renderToStaticMarkup(
    <BridgeProvider bridge={createBridge(fake.deps)}>
      <LevelsPanel />
    </BridgeProvider>,
  )
}
const loft = (fake: ReturnType<typeof createFakeDeps>) => {
  fake.scene.setState({
    nodes: {
      building_1: { id: 'building_1', type: 'building', children: ['level_a', 'level_b'] },
      level_a: { id: 'level_a', type: 'level', level: 0, children: ['zone_1', 'zone_2'] },
      level_b: { id: 'level_b', type: 'level', level: 1, name: 'Floor 1', children: [] },
      zone_1: { id: 'zone_1', type: 'zone', name: 'Zone 1', polygon: [[0, 0], [4, 0], [4, 3.8], [0, 3.8]] },
      zone_2: { id: 'zone_2', type: 'zone', name: 'Cocina', polygon: [[0, 0], [2, 0], [2, 2.4], [0, 2.4]] },
    } as unknown as SceneLike['nodes'],
  })
  fake.viewer.setState({ selection: { buildingId: 'building_1', levelId: 'level_a', zoneId: 'zone_2', selectedIds: [] } })
}

describe('LevelsPanel', () => {
  it('muestra la planta activa, los ambientes con su superficie en castellano y el elegido marcado', () => {
    const markup = render(loft)
    const text = textOf(markup)
    expect(text).toContain('Planta baja')
    expect(text).toContain('Ambiente 1')
    expect(text).toContain('15,2 m²')
    expect(text).toContain('Cocina')
    expect(text).toContain('4,8 m²')
    expect(text).not.toMatch(ENGLISH)
    expect([...markup.matchAll(/aria-pressed="true"[^>]*>(?:<svg[\s\S]*?<\/svg>)?<span[^>]*>([^<]+)</g)].map((m) => m[1])).toEqual(['Cocina'])
  })

  it('un proyecto en blanco invita a dibujar un ambiente y dice "Sin plantas" mientras no hay edificio', () => {
    const text = textOf(render(() => undefined))
    expect(text).toContain('Sin plantas')
    expect(text).toContain('Todavía no hay ambientes.')
  })

  it('en Ver los ambientes quedan deshabilitados', () => {
    const markup = render((fake) => {
      loft(fake)
      fake.scene.setState({ readOnly: true })
    })
    expect(markup.match(/<button[^>]*aria-pressed[^>]*disabled=""|<button[^>]*disabled=""[^>]*aria-pressed/g)).toHaveLength(2)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-levels-panel`
Expected: FAIL — `Cannot find module '../src/editor/shell/LevelsPanel'`.

- [ ] **Paso 2: Escribir el panel conectado**

Create `apps/web/src/editor/shell/use-dismiss.ts`:

```ts
import { type RefObject, useEffect } from 'react'

/** Cierra algo flotante (un menú, una lista) con un clic fuera del elemento de `ref`. */
export function useDismiss(active: boolean, ref: RefObject<HTMLElement | null>, onDismiss: () => void) {
  useEffect(() => {
    if (!active) return
    const onDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onDismiss()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [active, ref, onDismiss])
}
```

Create `apps/web/src/editor/shell/LevelsPanel.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import { formatArea } from '@/lib/format'
import { selectLevels, selectZones } from './bridge/levels'
import { LevelPanel } from './ui/LevelPanel'
import { useDismiss } from './use-dismiss'
import { useBridge, useShell } from './use-bridge'

/** Panel izquierdo: planta activa (con crear planta) y ambientes con sus m². En Ver no se crean plantas ni se eligen ambientes. */
export function LevelsPanel() {
  const bridge = useBridge()
  const { levels, activeId } = useShell(selectLevels)
  const { zones, selectedId } = useShell(selectZones)
  const readOnly = useShell((s) => s.scene.readOnly)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useDismiss(open, root, () => setOpen(false))
  return (
    <div ref={root}>
      <LevelPanel
        picker={{
          levels,
          activeId,
          open,
          canAdd: !readOnly,
          onToggle: () => setOpen((value) => !value),
          onPick: (id) => {
            bridge.selectLevel(id)
            setOpen(false)
          },
          onAdd: () => {
            bridge.addLevel()
            setOpen(false)
          },
        }}
        zones={{
          zones: zones.map((z) => ({ id: z.id, name: z.name, area: formatArea(z.area) })),
          selectedId,
          disabled: readOnly,
          onPick: bridge.selectZone,
        }}
      />
    </div>
  )
}
```

- [ ] **Paso 3: Montar el panel en el shell (también `ShellDock` usa `useDismiss`)**

Modify `apps/web/src/editor/shell/EditorShell.tsx`:

```diff
@@
+import { LevelsPanel } from './LevelsPanel'
 import { ShellDock } from './ShellDock'
@@
-  if (mode !== 'editar') return null
-  return (
-    <>
-      <ShellDock />
-      <ShellUndoRedo />
+  return (
+    <>
+      <LevelsPanel />
+      {mode === 'editar' && (
+        <>
+          <ShellDock />
+          <ShellUndoRedo />
+        </>
+      )}
     </>
   )
```


Modify `apps/web/src/editor/shell/ShellDock.tsx`:

```diff
@@
 import { ShortcutsDialog } from './ui/ShortcutsDialog'
 import { useBridge, useShell } from './use-bridge'
+import { useDismiss } from './use-dismiss'
@@
   // Un clic fuera del dock cierra el menú abierto.
-  useEffect(() => {
-    if (!openMenu) return
-    const onDown = (event: PointerEvent) => {
-      if (!root.current?.contains(event.target as Node)) setOpenMenu(null)
-    }
-    document.addEventListener('pointerdown', onDown)
-    return () => document.removeEventListener('pointerdown', onDown)
-  }, [openMenu])
+  useDismiss(openMenu !== null, root, () => setOpenMenu(null))
@@
-import { useEffect, useRef, useState } from 'react'
+import { useRef, useState } from 'react'
```


- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-levels-panel shell-dock shell-connected shell-boundaries`
Expected: PASS (`shell-levels-panel`: 3 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 5: Pruebas en navegador**

Create `apps/web/e2e/niveles.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { hook } from './support/hooks'
import { createProjectViaUi } from './support/projects'
import { modeButton } from './support/shell'

const ENGLISH = /Ground Floor|Floor \d|Basement|Zone \d/

test('las plantas sin nombre se ven como Planta baja y Planta 1; se cambia de planta y se crea una nueva', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E niveles ${Date.now()}`, kind: 'vivienda', template: 'Loft' })
  const panel = page.getByRole('complementary', { name: 'Nivel y ambientes' })
  await expect(panel).toBeVisible({ timeout: 15_000 })
  const trigger = panel.getByRole('button', { name: /Planta/ }).first()
  await expect(trigger).toContainText('Planta baja')
  const before = (await hook(page, 'state')).levelId

  await trigger.click()
  const list = panel.getByRole('list', { name: 'Plantas' })
  await expect(list.getByRole('button')).toHaveText(['Planta baja', 'Planta 1'])
  await list.getByRole('button', { name: 'Planta 1' }).click()
  await expect(trigger).toContainText('Planta 1')
  expect((await hook(page, 'state')).levelId).not.toBe(before)

  await trigger.click()
  await panel.getByRole('button', { name: 'Agregar planta' }).dblclick() // un doble clic crea una sola
  await expect(trigger).toContainText('Planta 2', { timeout: 15_000 })
  await trigger.click()
  await expect(list.getByRole('button')).toHaveText(['Planta baja', 'Planta 1', 'Planta 2'])
  expect(await panel.innerText()).not.toMatch(ENGLISH)
})

test('los ambientes de la planta se listan con su superficie en m² y se pueden elegir', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E ambientes ${Date.now()}`, kind: 'vivienda', template: 'Loft' })
  const panel = page.getByRole('complementary', { name: 'Nivel y ambientes' })
  const rooms = panel.getByRole('button', { pressed: false }).filter({ hasText: /m²/ })
  await expect(rooms.first()).toBeVisible({ timeout: 15_000 })
  expect(await rooms.count()).toBeGreaterThanOrEqual(2)
  for (const text of await rooms.allInnerTexts()) expect(text).toMatch(/\d+,\d m²/)
  await rooms.first().click()
  await expect(panel.getByRole('button', { pressed: true })).toHaveCount(1)
  expect((await hook(page, 'state')).zoneId).not.toBeNull()
  expect(await panel.innerText()).not.toMatch(ENGLISH)
})

test('un proyecto en blanco no tiene ambientes: la lista invita a dibujar uno; en Ver no se crean plantas', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E vacio ${Date.now()}`, template: null })
  const panel = page.getByRole('complementary', { name: 'Nivel y ambientes' })
  await expect(panel.getByText('Todavía no hay ambientes. Marca uno con Estructura › Ambiente.')).toBeVisible({ timeout: 15_000 })
  await modeButton(page, 'Ver').click()
  await panel.getByRole('button', { name: /Planta/ }).first().click()
  await expect(panel.getByRole('button', { name: 'Agregar planta' })).toHaveCount(0)
})
```

Run (Supabase local arriba): `pnpm --filter @interiores/web e2e e2e/niveles.spec.ts e2e/dock.spec.ts e2e/modos.spec.ts`
Expected: PASS. Antes de esta tarea `niveles.spec.ts` falla (no existe el panel "Nivel y ambientes").

- [ ] **Paso 6: Commit**

```bash
git add apps/web/src/editor/shell/use-dismiss.ts apps/web/src/editor/shell/LevelsPanel.tsx apps/web/src/editor/shell/EditorShell.tsx apps/web/src/editor/shell/ShellDock.tsx apps/web/test/shell-levels-panel.test.tsx apps/web/e2e/niveles.spec.ts
git commit -m "feat(editor): panel de plantas y ambientes en castellano con crear planta y metros cuadrados, visible en Editar y en Ver" -- apps/web/src/editor/shell/use-dismiss.ts apps/web/src/editor/shell/LevelsPanel.tsx apps/web/src/editor/shell/EditorShell.tsx apps/web/src/editor/shell/ShellDock.tsx apps/web/test/shell-levels-panel.test.tsx apps/web/e2e/niveles.spec.ts
```

---

### Task 7a: Catálogo en castellano (nombre y categoría de cada ítem)

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/lib/catalog-es.ts`
- Modify: `apps/web/test/support/asset-ids.ts` (suma `availableAssets`)
- Test: `apps/web/test/catalog-es.test.ts`

**Interfaces:**
- Consumes: `COMMERCE_PASCAL_IDS` de `src/editor/commerce-catalog.ts`; `availableAssetIds()` y el catálogo oficial de Pascal leído como texto (`test/support/asset-ids.ts`).
- Produces (`@/lib/catalog-es`): `type CatalogCategoryId = 'estar' | 'dormitorio' | 'cocina' | 'bano' | 'exterior' | 'otros'`, `CATALOG_CATEGORIES: readonly { id: CatalogCategoryId; label: string }[]`, `CATALOG_ES: Readonly<Record<string, readonly [name: string, category: CatalogCategoryId]>>` (los **101** ítems del catálogo con modelo local), `nameEs(id: string, fallback: string): string` y `categoryOf(id: string): CatalogCategoryId` (`'otros'` si el id no está).
- Produces (`test/support/asset-ids.ts`): `availableAssets(): { id: string; name: string; dimensions: [number, number, number] }[]`.

Las 6 categorías son las de la maqueta (Estar, Dormitorio, Cocina, Baño, Exterior) más **Otros** para lo que no tiene un hogar claro (juguetes, instrumentos, gimnasio, instalaciones). **Comercio** no es una categoría de la tabla: es un filtro transversal (las 33 piezas de `COMMERCE_PASCAL_IDS`, que ya están repartidas entre las demás). Los nombres usan castellano neutro ("refrigerador", "lavadora", "tumbona"). El spec habla de "144 carpetas": 101 son ítems del catálogo (los que se listan) y 43 son modelos de Pascal que el catálogo no ofrece (puertas, ventanas, setos…); esas 43 solo necesitan miniatura transparente (Tarea 7e).

- [ ] **Paso 1: Escribir la prueba (rojo)**

Modify `apps/web/test/support/asset-ids.ts`:

```diff
@@
+/** Los mismos ítems con su nombre (en inglés) y medidas: sirve para comprobar que los nombres propios no son los de Pascal. */
+export function availableAssets(): { id: string; name: string; dimensions: [number, number, number] }[] {
+  const ids = availableAssetIds()
+  return source.split('\n  {\n').flatMap((block) => {
+    const id = /\bid: '([^']+)'/.exec(block)?.[1]
+    const name = /\bname: '([^']+)'/.exec(block)?.[1]
+    const dims = /dimensions: \[([^\]]+)\]/.exec(block)?.[1]?.split(',').map(Number)
+    if (!(id && name && dims && dims.length === 3 && ids.has(id))) return []
+    return [{ id, name, dimensions: dims as [number, number, number] }]
+  })
+}
+
 /** Ids de piezas que una plantilla puede usar: el catálogo oficial de Pascal con modelo local. */
```


Create `apps/web/test/catalog-es.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { COMMERCE_PASCAL_IDS } from '../src/editor/commerce-catalog'
import { CATALOG_CATEGORIES, CATALOG_ES, categoryOf, nameEs } from '../src/lib/catalog-es'
import { availableAssetIds, availableAssets } from './support/asset-ids'

/** Palabras que delatan un nombre sin traducir. */
const ENGLISH = /\b(table|chair|bed|lamp|shower|sink|stand|rack|toy|light|plant|tree|machine|speaker|kitchen|counter|shelf|panel|fan|iron|bag|rug|door|wall|floor)\b/i
/** Nombres que se escriben igual en los dos idiomas. */
const SAME_IN_BOTH = new Set(['Cactus', 'Piano'])

describe('catálogo en castellano', () => {
  const assets = availableAssets()

  it('hay un ítem local por cada id (los 101 del catálogo con modelo propio)', () => {
    expect(assets.length).toBeGreaterThanOrEqual(100)
    expect(availableAssetIds().size).toBe(assets.length)
  })

  it('todos los ítems del catálogo tienen nombre y categoría en castellano (falla si falta alguno)', () => {
    for (const asset of assets) {
      const entry = CATALOG_ES[asset.id]
      expect(entry, `falta ${asset.id} (${asset.name})`).toBeDefined()
      expect(entry?.[0].trim(), asset.id).not.toBe('')
      expect(CATALOG_CATEGORIES.map((c) => c.id), asset.id).toContain(entry?.[1])
    }
  })

  it('la tabla no tiene ids de más (un error de tipeo no pasa inadvertido)', () => {
    const real = availableAssetIds()
    for (const id of Object.keys(CATALOG_ES)) expect(real.has(id), id).toBe(true)
  })

  it('los nombres no son los de Pascal, no tienen palabras en inglés y no se repiten', () => {
    const names = Object.values(CATALOG_ES).map(([name]) => name)
    expect(new Set(names).size).toBe(names.length)
    for (const asset of assets) {
      const name = nameEs(asset.id, asset.name)
      if (!SAME_IN_BOTH.has(name)) expect(name, asset.id).not.toBe(asset.name)
      expect(name, asset.id).not.toMatch(ENGLISH)
    }
  })

  it('las 33 piezas de Comercio están en la tabla y cada categoría tiene al menos una pieza', () => {
    for (const id of COMMERCE_PASCAL_IDS) expect(CATALOG_ES[id], id).toBeDefined()
    for (const category of CATALOG_CATEGORIES) {
      expect(Object.values(CATALOG_ES).some(([, c]) => c === category.id), category.id).toBe(true)
    }
  })

  it('un id desconocido usa el nombre de respaldo y la categoría "otros"', () => {
    expect(nameEs('sofa', 'Sofa')).toBe('Sofá')
    expect(nameEs('no-existe', 'Respaldo')).toBe('Respaldo')
    expect(categoryOf('bathtub')).toBe('bano')
    expect(categoryOf('no-existe')).toBe('otros')
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run catalog-es`
Expected: FAIL — `Error: Cannot find module '../src/lib/catalog-es'`.

- [ ] **Paso 2: Escribir la tabla**

Create `apps/web/src/lib/catalog-es.ts`:

```ts
export type CatalogCategoryId = 'estar' | 'dormitorio' | 'cocina' | 'bano' | 'exterior' | 'otros'

export const CATALOG_CATEGORIES: readonly { id: CatalogCategoryId; label: string }[] = [
  { id: 'estar', label: 'Estar' },
  { id: 'dormitorio', label: 'Dormitorio' },
  { id: 'cocina', label: 'Cocina' },
  { id: 'bano', label: 'Baño' },
  { id: 'exterior', label: 'Exterior' },
  { id: 'otros', label: 'Otros' },
]

type Entry = readonly [name: string, category: CatalogCategoryId]

/** Nombre y categoría en castellano de los 101 ítems del catálogo de Pascal con modelo local (la clave es su `id`). */
export const CATALOG_ES: Readonly<Record<string, Entry>> = {
  // Muebles
  cactus: ['Cactus', 'estar'],
  'tv-stand': ['Mueble de TV', 'estar'],
  'single-bed': ['Cama individual', 'dormitorio'],
  'livingroom-chair': ['Sillón', 'estar'],
  'small-indoor-plant': ['Planta chica', 'estar'],
  column: ['Columna decorativa', 'otros'],
  barbell: ['Mancuerna', 'otros'],
  toy: ['Juguete', 'otros'],
  'barbell-stand': ['Soporte de pesas', 'otros'],
  books: ['Libros', 'estar'],
  stool: ['Taburete', 'estar'],
  'pool-table': ['Mesa de billar', 'otros'],
  bookshelf: ['Biblioteca', 'estar'],
  'coat-rack': ['Perchero', 'estar'],
  'car-toy': ['Auto de juguete', 'otros'],
  'bedside-table': ['Mesa de noche', 'dormitorio'],
  cabinet: ['Gabinete modular', 'cocina'],
  sofa: ['Sofá', 'estar'],
  bunkbed: ['Litera', 'dormitorio'],
  'office-table': ['Escritorio', 'otros'],
  'dining-table': ['Mesa de comedor', 'estar'],
  guitar: ['Guitarra', 'otros'],
  'trash-bin': ['Cesto de basura', 'otros'],
  'recessed-light': ['Luz empotrada', 'otros'],
  shelf: ['Estante', 'estar'],
  'table-lamp': ['Lámpara de mesa', 'estar'],
  'ceiling-lamp': ['Lámpara de techo', 'estar'],
  closet: ['Armario', 'dormitorio'],
  'coffee-table': ['Mesa de centro', 'estar'],
  'dining-chair': ['Silla de comedor', 'estar'],
  dresser: ['Cómoda', 'dormitorio'],
  'indoor-plant': ['Planta de interior', 'estar'],
  'ironing-board': ['Tabla de planchar', 'otros'],
  'double-bed': ['Cama doble', 'dormitorio'],
  'floor-lamp': ['Lámpara de pie', 'estar'],
  easel: ['Caballete', 'otros'],
  'lounge-chair': ['Sillón de descanso', 'estar'],
  'office-chair': ['Silla de oficina', 'otros'],
  piano: ['Piano', 'estar'],
  picture: ['Cuadro', 'estar'],
  'rectangular-carpet': ['Alfombra rectangular', 'estar'],
  'round-mirror': ['Espejo redondo', 'estar'],
  'round-carpet': ['Alfombra redonda', 'estar'],
  threadmill: ['Cinta para correr', 'otros'],
  // Electrodomésticos e instalaciones
  sprinkler: ['Rociador', 'otros'],
  'exit-sign': ['Cartel de salida', 'otros'],
  'sewing-machine': ['Máquina de coser', 'otros'],
  television: ['Televisor', 'estar'],
  'ac-block': ['Unidad exterior de aire', 'otros'],
  'stereo-speaker': ['Parlante', 'estar'],
  thermostat: ['Termostato', 'otros'],
  toaster: ['Tostadora', 'cocina'],
  kettle: ['Hervidor eléctrico', 'cocina'],
  hydrant: ['Hidrante', 'exterior'],
  'fire-detector': ['Detector de incendios', 'otros'],
  'smoke-detector': ['Detector de humo', 'otros'],
  'coffee-machine': ['Cafetera', 'cocina'],
  'ceiling-fan': ['Ventilador de techo', 'estar'],
  iron: ['Plancha', 'otros'],
  'air-conditioning': ['Aire acondicionado', 'estar'],
  computer: ['Computadora', 'otros'],
  'alarm-keypad': ['Teclado de alarma', 'otros'],
  'ev-wall-charger': ['Cargador para auto eléctrico', 'exterior'],
  'electric-panel': ['Tablero eléctrico', 'otros'],
  // Baño
  'bathroom-sink': ['Lavabo', 'bano'],
  'shower-angle': ['Ducha de esquina', 'bano'],
  'toilet-paper': ['Papel higiénico', 'bano'],
  'washing-machine': ['Lavadora', 'bano'],
  'shower-rug': ['Alfombra de baño', 'bano'],
  bathtub: ['Bañera', 'bano'],
  'laundry-bag': ['Bolsa de ropa sucia', 'bano'],
  'shower-square': ['Ducha cuadrada', 'bano'],
  'drying-rack': ['Tendedero', 'bano'],
  toilet: ['Inodoro', 'bano'],
  // Cocina
  microwave: ['Microondas', 'cocina'],
  'cutting-board': ['Tabla de cortar', 'cocina'],
  'kitchen-utensils': ['Utensilios de cocina', 'cocina'],
  'kitchen-counter': ['Encimera de cocina', 'cocina'],
  hood: ['Campana extractora', 'cocina'],
  'kitchen-cabinet': ['Mueble de cocina', 'cocina'],
  kitchen: ['Bloque de cocina', 'cocina'],
  'frying-pan': ['Sartén', 'cocina'],
  fruits: ['Frutas', 'cocina'],
  fridge: ['Refrigerador', 'cocina'],
  'kitchen-shelf': ['Repisa de cocina', 'cocina'],
  'wine-bottle': ['Botella de vino', 'cocina'],
  stove: ['Cocina con horno', 'cocina'],
  // Exterior
  ball: ['Pelota', 'exterior'],
  bush: ['Arbusto', 'exterior'],
  'basket-hoop': ['Aro de básquet', 'exterior'],
  'parking-spot': ['Lugar de estacionamiento', 'exterior'],
  palm: ['Palmera', 'exterior'],
  sunbed: ['Tumbona', 'exterior'],
  'fir-tree': ['Abeto', 'exterior'],
  tree: ['Árbol', 'exterior'],
  skate: ['Patineta', 'exterior'],
  'outdoor-playhouse': ['Casita de juegos', 'exterior'],
  'patio-umbrella': ['Sombrilla de patio', 'exterior'],
  pillar: ['Pilar', 'exterior'],
  scooter: ['Monopatín', 'exterior'],
  tesla: ['Auto eléctrico', 'exterior'],
}

/** Nombre en castellano de un ítem; si no está en la tabla (un ítem nuevo de Pascal) se usa el de respaldo. */
export function nameEs(id: string, fallback: string): string {
  return CATALOG_ES[id]?.[0] ?? fallback
}

/** Categoría de un ítem; "otros" si no está en la tabla. */
export function categoryOf(id: string): CatalogCategoryId {
  return CATALOG_ES[id]?.[1] ?? 'otros'
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run catalog-es catalog commerce-catalog`
Expected: PASS (`catalog-es`: 6 pruebas; las de `catalog` y `commerce-catalog` siguen verdes).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/lib/catalog-es.ts apps/web/test/catalog-es.test.ts apps/web/test/support/asset-ids.ts
git commit -m "feat(editor): nombre y categoría en castellano de los 101 muebles del catálogo, con prueba que falla si falta alguno" -- apps/web/src/lib/catalog-es.ts apps/web/test/catalog-es.test.ts apps/web/test/support/asset-ids.ts
```
---

### Task 7b: Modelo del catálogo de muebles (formato de medidas, filtros y tarjetas en castellano)

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/furniture-model.ts`
- Modify: `apps/web/src/lib/format.ts` (suma `formatMeters` y `formatSize`)
- Test: `apps/web/test/format.test.ts`, `apps/web/test/shell-furniture-model.test.ts`

**Interfaces:**
- Consumes: `CATALOG_CATEGORIES`, `categoryOf`, `nameEs` de `@/lib/catalog-es` (7a); `CatalogCard`, `CatalogChip` de `./ui/FurnitureCatalog` (1g).
- Produces:
  - `formatMeters(meters: number): string` (`0,90 m`) y `formatSize(width: number, depth: number): string` (`2,06 × 1,01 m`) en `@/lib/format`.
  - `furniture-model.ts` (puro): `type CatalogItemLike = { id: string; name: string; thumbnail?: string; dimensions?: readonly [number, number, number]; tool?: string }`, `ALL_CHIP = 'todos'`, `COMMERCE_CHIP = 'comercio'`, `FURNITURE_CHIPS: readonly CatalogChip[]` (Todos, Estar, Dormitorio, Cocina, Baño, Exterior, Otros, Comercio), `normalize(text: string): string` (sin tildes ni mayúsculas), `filterFurniture(items, filter: { query: string; chip: string }, commerceIds: ReadonlySet<string>): CatalogItemLike[]` (ordenados por nombre en castellano) y `toCards(items, selectedId: string | null): CatalogCard[]`.

**Qué ve la persona.** Cada tarjeta muestra el nombre en castellano (`nameEs`), las medidas (ancho × fondo en metros con coma) y la miniatura. La búsqueda ignora tildes y mayúsculas ("sofa" encuentra "Sofá"); **Comercio** es un filtro transversal (las 33 piezas de `COMMERCE_PASCAL_IDS`, repartidas además por su categoría de hogar) y no una pestaña aparte. Los ítems traen su `dimensions` opcional porque `AssetInput.dimensions` de Pascal lo es.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatMeters, formatSize } from '../src/lib/format'

describe('formatMeters y formatSize', () => {
  it('usan coma decimal, dos decimales y la unidad, como la maqueta', () => {
    expect(formatMeters(0.9)).toBe('0,90 m')
    expect(formatMeters(2.1)).toBe('2,10 m')
    expect(formatMeters(12.456)).toBe('12,46 m')
    expect(formatSize(2.06, 1.01)).toBe('2,06 × 1,01 m')
    expect(formatSize(0.34, 0.27)).toBe('0,34 × 0,27 m')
  })

  it('un valor que no es número no rompe la tarjeta', () => {
    expect(formatMeters(Number.NaN)).toBe('0,00 m')
    expect(formatSize(Number.NaN, 1)).toBe('0,00 × 1,00 m')
  })
})
```

Create `apps/web/test/shell-furniture-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ALL_CHIP, COMMERCE_CHIP, FURNITURE_CHIPS, filterFurniture, normalize, toCards } from '../src/editor/shell/furniture-model'

const item = (id: string, name: string, dimensions: [number, number, number] = [1, 1, 1]) => ({ id, name, dimensions, thumbnail: `/items/${id}/thumbnail.webp` })
const ITEMS = [
  item('sofa', 'Sofa', [2.06, 0.74, 1.01]),
  item('bathtub', 'Bathtub'),
  item('stove', 'Stove'),
  item('tree', 'Tree'),
  item('double-bed', 'Double Bed'),
  item('single-bed', 'Single Bed'),
  item('guitar', 'Guitar'),
]
const COMMERCE = new Set(['sofa', 'stove'])
const ids = (list: readonly { id: string }[]) => list.map((i) => i.id)
const filter = (query: string, chip = ALL_CHIP) => ids(filterFurniture(ITEMS, { query, chip }, COMMERCE))

describe('chips', () => {
  it('son Todos, las seis categorías (con Baño) y Comercio, en castellano', () => {
    expect(FURNITURE_CHIPS.map((c) => c.label)).toEqual(['Todos', 'Estar', 'Dormitorio', 'Cocina', 'Baño', 'Exterior', 'Otros', 'Comercio'])
    expect(FURNITURE_CHIPS[0]?.id).toBe(ALL_CHIP)
    expect(FURNITURE_CHIPS.at(-1)?.id).toBe(COMMERCE_CHIP)
  })
})

describe('filterFurniture', () => {
  it('Todos lista todo ordenado por el nombre en castellano (Árbol antes que Bañera)', () => {
    expect(filter('')).toEqual(['tree', 'bathtub', 'double-bed', 'single-bed', 'stove', 'guitar', 'sofa'])
  })

  it('una categoría deja solo sus piezas', () => {
    expect(filter('', 'dormitorio')).toEqual(['double-bed', 'single-bed'])
    expect(filter('', 'bano')).toEqual(['bathtub'])
    expect(filter('', 'otros')).toEqual(['guitar'])
  })

  it('Comercio es transversal: deja las piezas de la lista de comercio sin importar su categoría', () => {
    expect(filter('', COMMERCE_CHIP)).toEqual(['stove', 'sofa'])
  })

  it('la búsqueda ignora tildes y mayúsculas y se combina con la categoría elegida', () => {
    expect(filter('sofa')).toEqual(['sofa'])
    expect(filter('SOFÁ')).toEqual(['sofa'])
    expect(filter('cama')).toEqual(['double-bed', 'single-bed'])
    expect(filter('cama', 'dormitorio')).toEqual(['double-bed', 'single-bed'])
    expect(filter('cama', 'exterior')).toEqual([])
    expect(filter('  bañera  ')).toEqual(['bathtub'])
    expect(filter('zzz')).toEqual([])
  })

  it('normalize quita tildes y diéresis', () => {
    expect(normalize('Árbol Cómoda ÑANDÚ')).toBe('arbol comoda nandu')
  })
})

describe('toCards', () => {
  it('arma tarjetas con nombre en castellano, ancho × fondo y la miniatura propia', () => {
    const [card] = toCards([ITEMS[0] as (typeof ITEMS)[number]], null)
    expect(card).toEqual({ id: 'sofa', name: 'Sofá', size: '2,06 × 1,01 m', thumbnail: '/items/sofa/thumbnail.webp', selected: false })
  })

  it('marca la tarjeta del mueble que se está colocando y usa un ícono si el ítem no trae miniatura ni medidas', () => {
    const cards = toCards([ITEMS[0] as (typeof ITEMS)[number], { id: 'nuevo', name: 'New' }], 'sofa')
    expect(cards.map((c) => c.selected)).toEqual([true, false])
    expect(cards[1]?.thumbnail).toBe('/icons/couch.webp')
    expect(cards[1]?.name).toBe('New')
    expect(cards[1]?.size).toBe('1,00 × 1,00 m')
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run format shell-furniture-model`
Expected: FAIL — `formatMeters is not a function` (`format`) y `Cannot find module '../src/editor/shell/furniture-model'`.

- [ ] **Paso 2: Formato de medidas y el modelo del catálogo**

Modify `apps/web/src/lib/format.ts`:

```diff
@@
 const AREA = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
+const METERS = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
+const meters = (value: number) => METERS.format(Number.isFinite(value) ? value : 0)
+
+/** "0,90 m": coma decimal y dos decimales, como los campos de propiedades de la maqueta. */
+export function formatMeters(value: number): string {
+  return `${meters(value)} m`
+}
+
+/** "2,06 × 1,01 m" (ancho × fondo), como las tarjetas de muebles de la maqueta. */
+export function formatSize(width: number, depth: number): string {
+  return `${meters(width)} × ${meters(depth)} m`
+}
```


Create `apps/web/src/editor/shell/furniture-model.ts`:

```ts
import { CATALOG_CATEGORIES, categoryOf, nameEs } from '@/lib/catalog-es'
import { formatSize } from '@/lib/format'
import type { CatalogCard, CatalogChip } from './ui/FurnitureCatalog'

/** Lo que el panel necesita de un ítem del catálogo de Pascal (`CatalogItem`: `AssetInput` más `tool?`). */
export type CatalogItemLike = {
  id: string
  name: string
  thumbnail?: string
  /** Opcional en el tipo de Pascal (por defecto 1 × 1 × 1 m). */
  dimensions?: readonly [number, number, number]
  tool?: string
}

export const ALL_CHIP = 'todos'
export const COMMERCE_CHIP = 'comercio'

export const FURNITURE_CHIPS: readonly CatalogChip[] = [
  { id: ALL_CHIP, label: 'Todos' },
  ...CATALOG_CATEGORIES,
  { id: COMMERCE_CHIP, label: 'Comercio' },
]

/** Sin tildes ni mayúsculas: "sofa" encuentra "Sofá". */
export const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/**
 * Los ítems de la categoría elegida (Comercio es transversal: las piezas de `commerceIds`, de cualquier categoría) cuyo nombre
 * en castellano contiene la búsqueda, ordenados por ese nombre.
 */
export function filterFurniture(
  items: readonly CatalogItemLike[],
  filter: { query: string; chip: string },
  commerceIds: ReadonlySet<string>,
): CatalogItemLike[] {
  const query = normalize(filter.query)
  const inChip = (item: CatalogItemLike) =>
    filter.chip === ALL_CHIP ||
    (filter.chip === COMMERCE_CHIP ? commerceIds.has(item.id) : categoryOf(item.id) === filter.chip)
  return items
    .filter((item) => inChip(item) && (query === '' || normalize(nameEs(item.id, item.name)).includes(query)))
    .sort((a, b) => nameEs(a.id, a.name).localeCompare(nameEs(b.id, b.name), 'es'))
}

export function toCards(items: readonly CatalogItemLike[], selectedId: string | null): CatalogCard[] {
  return items.map((item) => ({
    id: item.id,
    name: nameEs(item.id, item.name),
    size: formatSize(item.dimensions?.[0] ?? 1, item.dimensions?.[2] ?? 1),
    thumbnail: item.thumbnail ?? '/icons/couch.webp',
    selected: item.id === selectedId,
  }))
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run format shell-furniture-model shell-boundaries`
Expected: PASS (`format`: 2; `shell-furniture-model`: 8).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/lib/format.ts apps/web/src/editor/shell/furniture-model.ts apps/web/test/format.test.ts apps/web/test/shell-furniture-model.test.ts
git commit -m "feat(editor): modelo del catálogo de muebles (filtros, búsqueda sin tildes y tarjetas con medidas en castellano)" -- apps/web/src/lib/format.ts apps/web/src/editor/shell/furniture-model.ts apps/web/test/format.test.ts apps/web/test/shell-furniture-model.test.ts
```

---

### Task 7c: Colocar un mueble por el puente

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/shell/bridge/catalog.ts`
- Modify: `apps/web/src/editor/shell/bridge/types.ts`, `apps/web/src/editor/shell/bridge/index.ts`, `apps/web/src/editor/pascal-bridge.ts`, `apps/web/test/support/fake-deps.ts`
- Test: `apps/web/test/shell-bridge-catalog.test.ts`

**Interfaces:**
- Consumes: `CatalogItemLike` (7b); `DECISIONS.furnishPhaseBeforeItem` (Tarea 0c); `CoreDeps` (4a); `createFakeDeps` (4a).
- Produces:
  - `EditorLike.selectedItem: { id: string } | null`; `CatalogDeps = { activateCatalogItem(item: CatalogItemLike): void }`.
  - Del puente (`bridge/catalog.ts`): `createCatalogSlice(deps, decisions?)` con `placeItem(item: CatalogItemLike): void` (en Ver no hace nada; con `furnishPhaseBeforeItem` pasa antes a la fase `furnish`). `BridgeDeps = CoreDeps & ModeDeps & LevelsDeps & CatalogDeps`.
  - En `pascal-bridge.ts`: `catalogDeps()`, que llama a `activateCatalogItem` de Pascal con el ítem de `CATALOG_ITEMS` que volvió de la tarjeta.

**Colocar un mueble** (`activateCatalogItem` de Pascal): vacía la selección, elige el ítem y arma `item` (o la herramienta propia del ítem, `cabinet`) **sin tocar la fase**. Por eso, salvo que el spike (Tarea 0b) haya demostrado que colocar desde `structure` funciona, el puente pasa antes a `furnish` (riesgo "Colocar muebles desde la fase structure" del spec): `DECISIONS.furnishPhaseBeforeItem` es `true` en el camino probable.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-bridge-catalog.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { createCatalogSlice } from '../src/editor/shell/bridge/catalog'
import { createFakeDeps } from './support/fake-deps'

const SOFA = { id: 'sofa', name: 'Sofa', dimensions: [2.06, 0.74, 1.01] as [number, number, number] }
const firstCall = (fn: (...args: never[]) => unknown) => vi.mocked(fn).mock.invocationCallOrder[0] ?? Number.NaN

describe('placeItem', () => {
  it('pasa a la fase furnish ANTES de armar el mueble (activateCatalogItem de Pascal no cambia la fase)', () => {
    const fake = createFakeDeps()
    createBridge(fake.deps).placeItem(SOFA)
    expect(fake.editor.getState().phase).toBe('furnish')
    expect(fake.deps.activateCatalogItem).toHaveBeenCalledWith(SOFA)
    expect(firstCall(fake.editor.getState().setPhase)).toBeLessThan(firstCall(fake.deps.activateCatalogItem))
  })

  it('si el spike mostró que colocar desde structure funciona (decisión), no cambia la fase', () => {
    const fake = createFakeDeps()
    createCatalogSlice(fake.deps, { furnishPhaseBeforeItem: false }).placeItem(SOFA)
    expect(fake.editor.getState().setPhase).not.toHaveBeenCalled()
    expect(fake.deps.activateCatalogItem).toHaveBeenCalledTimes(1)
  })

  it('en Ver no se coloca nada', () => {
    const fake = createFakeDeps()
    fake.scene.setState({ readOnly: true })
    createBridge(fake.deps).placeItem(SOFA)
    expect(fake.deps.activateCatalogItem).not.toHaveBeenCalled()
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-catalog`
Expected: FAIL — `Cannot find module '../src/editor/shell/bridge/catalog'`.

- [ ] **Paso 2: Colocar un mueble por el puente**

Create `apps/web/src/editor/shell/bridge/catalog.ts`:

```ts
import { DECISIONS, type Decisions } from '../decisions'
import type { CatalogItemLike } from '../furniture-model'
import type { CoreDeps } from './core'

export type CatalogDeps = {
  /** `activateCatalogItem` de Pascal (editor): elige el ítem y arma `item` (o su herramienta propia) sin tocar la fase. */
  activateCatalogItem(item: CatalogItemLike): void
}

export function createCatalogSlice(
  deps: CoreDeps & CatalogDeps,
  decisions: Pick<Decisions, 'furnishPhaseBeforeItem'> = DECISIONS,
) {
  return {
    /** Elegir una tarjeta del catálogo para colocar ese mueble. En Ver no se coloca nada. */
    placeItem(item: CatalogItemLike): void {
      if (deps.scene.getState().readOnly) return
      if (decisions.furnishPhaseBeforeItem) deps.editor.getState().setPhase('furnish')
      deps.activateCatalogItem(item)
    },
  }
}
```

Modify `apps/web/src/editor/shell/bridge/types.ts`:

```diff
@@
   setFirstPersonMode(enabled: boolean): void
+  selectedItem: { id: string } | null
   structureLayer: 'zones' | 'elements'
```


Modify `apps/web/src/editor/shell/bridge/index.ts`:

```diff
@@
+import { type CatalogDeps, createCatalogSlice } from './catalog'
 import { type CoreDeps, createCoreSlice } from './core'
@@
-export type BridgeDeps = CoreDeps & ModeDeps & LevelsDeps
+export type BridgeDeps = CoreDeps & ModeDeps & LevelsDeps & CatalogDeps
@@
     ...createLevelsSlice(deps),
+    ...createCatalogSlice(deps),
     // @@slices
```


Modify `apps/web/test/support/fake-deps.ts`:

```diff
@@
     isFirstPersonMode: false,
+    selectedItem: null,
@@
     createLevel: vi.fn((_input: { buildingId: string; level: number }) => 'level_nuevo'),
+    activateCatalogItem: vi.fn(),
     // @@fake-deps
```


Modify `apps/web/src/editor/pascal-bridge.ts`:

```diff
@@
+import type { CatalogDeps } from './shell/bridge/catalog'
 import type { LevelsDeps } from './shell/bridge/levels'
@@
-export function createPascalBridge(): ShellBridge {
-  return createBridge({
-    ...coreDeps(),
-    ...modeDeps(),
-    ...levelsDeps(),
+type PascalCatalogItem = (typeof Pascal.CATALOG_ITEMS)[number]
+
+function catalogDeps(): CatalogDeps {
+  return {
+    // Las tarjetas salen de `CATALOG_ITEMS` de Pascal (ya con rutas locales): el ítem que vuelve es uno de ellos.
+    activateCatalogItem: (item) => Pascal.activateCatalogItem(item as PascalCatalogItem),
+  }
+}
+
+export function createPascalBridge(): ShellBridge {
+  return createBridge({
+    ...coreDeps(),
+    ...modeDeps(),
+    ...levelsDeps(),
+    ...catalogDeps(),
     // @@deps
```


- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-catalog shell-bridge-levels shell-bridge-add-level shell-boundaries`
Expected: PASS (`shell-bridge-catalog`: 3).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` (el almacén real de Pascal tiene `selectedItem: AssetInput | null`, que cumple `{ id: string } | null`) y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/bridge apps/web/src/editor/pascal-bridge.ts apps/web/test/support/fake-deps.ts apps/web/test/shell-bridge-catalog.test.ts
git commit -m "feat(editor): colocar un mueble del catálogo por el puente (pasa a la fase de muebles antes de armarlo)" -- apps/web/src/editor/shell/bridge apps/web/src/editor/pascal-bridge.ts apps/web/test/support/fake-deps.ts apps/web/test/shell-bridge-catalog.test.ts
```

---

### Task 7d: Panel de muebles conectado y panel izquierdo según el botón del dock

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/FurniturePanel.tsx`, `apps/web/src/editor/shell/LeftPanel.tsx`
- Modify: `apps/web/src/editor/shell/dock-model.ts` (suma `leftPanelFor`), `apps/web/src/editor/shell/EditorShell.tsx` (recibe `catalog`), `apps/web/src/editor/ProjectEditor.tsx` (pasa el catálogo al shell), `apps/web/test/shell-connected.test.tsx` (monta el shell con `catalog={[]}`)
- Test: `apps/web/test/shell-left-panel.test.tsx`

**Interfaces:**
- Consumes: `FurnitureCatalog` (1g); `filterFurniture`, `toCards`, `FURNITURE_CHIPS`, `ALL_CHIP`, `CatalogItemLike` (7b); `bridge.placeItem` (7c); `COMMERCE_PASCAL_IDS` (`src/editor/commerce-catalog.ts`); `activeDockId` (5a); `LevelsPanel` (6d); `EditorShell` (4d).
- Produces:
  - `FurniturePanel(props: { items: readonly CatalogItemLike[] })`: búsqueda, categorías (Comercio incluida) y tarjetas; elegir una tarjeta arma esa pieza por el puente; marca la tarjeta del mueble que Pascal tiene elegido.
  - `leftPanelFor(id: DockId | null): 'levels' | 'furniture'` (en `dock-model.ts`: el dock manda qué panel va a la izquierda; la Tarea 8e suma `'materials'`).
  - `LeftPanel(props: { catalog: readonly CatalogItemLike[] })`: las plantas y ambientes, salvo con el botón Muebles activo; **en Ver siempre** las plantas y ambientes.
  - `EditorShell` recibe `catalog: readonly CatalogItemLike[]`.

En Pascal, las plantas y los ambientes y el catálogo de muebles compiten por el mismo lugar (la izquierda): el catálogo aparece cuando se arma la herramienta de muebles y cede su lugar al volver a Seleccionar o pasar a Ver. La barra lateral propia de Pascal (`sidebarTabs`) se quita en la Tarea 7e; hasta entonces conviven.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-left-panel.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { leftPanelFor } from '../src/editor/shell/dock-model'
import { FurniturePanel } from '../src/editor/shell/FurniturePanel'
import { LeftPanel } from '../src/editor/shell/LeftPanel'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const CATALOG = [
  { id: 'sofa', name: 'Sofa', dimensions: [2.06, 0.74, 1.01] as const, thumbnail: '/items/sofa/thumbnail.webp' },
  { id: 'double-bed', name: 'Double Bed', dimensions: [1.52, 0.71, 2] as const, thumbnail: '/items/double-bed/thumbnail.webp' },
]

function render(node: React.ReactNode, setup?: (fake: ReturnType<typeof createFakeDeps>) => void) {
  const fake = createFakeDeps()
  setup?.(fake)
  return renderToStaticMarkup(<BridgeProvider bridge={createBridge(fake.deps)}>{node}</BridgeProvider>)
}

describe('leftPanelFor', () => {
  it('Muebles trae el catálogo; todo lo demás deja las plantas y ambientes', () => {
    expect(leftPanelFor('furniture')).toBe('furniture')
    for (const id of ['select', 'structure', 'openings', 'materials', 'measure', 'more', null] as const) {
      expect(leftPanelFor(id)).toBe('levels')
    }
  })
})

describe('FurniturePanel', () => {
  it('muestra las tarjetas en castellano, con medidas y miniatura, todas las categorías y el botón Pronto', () => {
    const markup = render(<FurniturePanel items={CATALOG} />)
    const text = textOf(markup)
    expect(text).toContain('Cama doble')
    expect(text).toContain('Sofá')
    expect(text).toContain('2,06 × 1,01 m')
    expect(text).toContain('Comercio')
    expect(text).toContain('Subir mi mueble')
    expect(text).not.toMatch(/Sofa|Double Bed/)
    expect(markup).toContain('src="/items/sofa/thumbnail.webp"')
  })

  it('marca la tarjeta del mueble que Pascal tiene elegido para colocar', () => {
    const markup = render(<FurniturePanel items={CATALOG} />, ({ editor }) => editor.setState({ selectedItem: { id: 'sofa' } }))
    expect(markup.match(/<li><button[^>]*aria-pressed="true"/g)).toHaveLength(1)
  })
})

describe('LeftPanel', () => {
  const leftOf = (setup?: Parameters<typeof render>[1]) => render(<LeftPanel catalog={CATALOG} />, setup)

  it('con la herramienta de muro armada (un proyecto en blanco) muestra plantas y ambientes', () => {
    expect(leftOf()).toContain('aria-label="Nivel y ambientes"')
  })

  it('con la herramienta de muebles armada muestra el catálogo', () => {
    const markup = leftOf(({ editor }) => editor.setState({ mode: 'build', tool: 'item' }))
    expect(markup).toContain('aria-label="Muebles"')
    expect(markup).not.toContain('aria-label="Nivel y ambientes"')
  })

  it('en Ver siempre muestra plantas y ambientes, aunque la herramienta de muebles estuviera armada', () => {
    const markup = leftOf(({ editor, scene }) => {
      editor.setState({ mode: 'build', tool: 'item' })
      scene.setState({ readOnly: true })
    })
    expect(markup).toContain('aria-label="Nivel y ambientes"')
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-left-panel`
Expected: FAIL — `Cannot find module '../src/editor/shell/FurniturePanel'`.

- [ ] **Paso 2: Escribir el panel de muebles, el panel izquierdo y `leftPanelFor`**

Create `apps/web/src/editor/shell/FurniturePanel.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { COMMERCE_PASCAL_IDS } from '../commerce-catalog'
import { ALL_CHIP, type CatalogItemLike, FURNITURE_CHIPS, filterFurniture, toCards } from './furniture-model'
import { FurnitureCatalog } from './ui/FurnitureCatalog'
import { useBridge, useShell } from './use-bridge'

const COMMERCE_IDS: ReadonlySet<string> = new Set(COMMERCE_PASCAL_IDS)

/** Panel de muebles del modo Editar: búsqueda, categorías (Comercio incluida) y tarjetas. Elegir una tarjeta arma esa pieza. */
export function FurniturePanel({ items }: { items: readonly CatalogItemLike[] }) {
  const bridge = useBridge()
  const selectedId = useShell((s) => s.editor.selectedItem?.id ?? null)
  const [query, setQuery] = useState('')
  const [chip, setChip] = useState(ALL_CHIP)
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  const cards = toCards(filterFurniture(items, { query, chip }, COMMERCE_IDS), selectedId)
  return (
    <FurnitureCatalog
      query={query}
      onQuery={setQuery}
      chips={FURNITURE_CHIPS}
      chip={chip}
      onChip={setChip}
      cards={cards}
      onPick={(id) => {
        const item = byId.get(id)
        if (item) bridge.placeItem(item)
      }}
    />
  )
}
```

Create `apps/web/src/editor/shell/LeftPanel.tsx`:

```tsx
'use client'

import { activeDockId, leftPanelFor } from './dock-model'
import { FurniturePanel } from './FurniturePanel'
import type { CatalogItemLike } from './furniture-model'
import { LevelsPanel } from './LevelsPanel'
import { useShell } from './use-bridge'

/** Panel izquierdo: lo manda el dock (Muebles trae el catálogo; lo demás, plantas y ambientes). En Ver, siempre plantas y ambientes. */
export function LeftPanel({ catalog }: { catalog: readonly CatalogItemLike[] }) {
  const panel = useShell((s) =>
    s.scene.readOnly ? 'levels' : leftPanelFor(activeDockId({ mode: s.editor.mode, tool: s.editor.tool })),
  )
  return panel === 'furniture' ? <FurniturePanel items={catalog} /> : <LevelsPanel />
}
```

Modify `apps/web/src/editor/shell/dock-model.ts`:

```diff
@@
+/** Qué panel va a la izquierda según el botón activo del dock. */
+export function leftPanelFor(id: DockId | null): 'levels' | 'furniture' {
+  return id === 'furniture' ? 'furniture' : 'levels'
+}
+
 /** La tabla 4.3 del spec: cómo debe quedar Pascal (`phase` ausente = no cambia). Las pruebas en navegador la comparan con el estado real. */
```


Modify `apps/web/src/editor/shell/EditorShell.tsx`:

```diff
@@
-import { LevelsPanel } from './LevelsPanel'
+import type { CatalogItemLike } from './furniture-model'
+import { LeftPanel } from './LeftPanel'
@@
-function ShellBody() {
+function ShellBody({ catalog }: { catalog: readonly CatalogItemLike[] }) {
@@
-      <LevelsPanel />
+      <LeftPanel catalog={catalog} />
@@
 export function EditorShell({
   bridge,
+  catalog,
   projectName,
@@
   bridge: ShellBridge
+  catalog: readonly CatalogItemLike[]
   projectName: string
@@
-        <ShellBody />
+        <ShellBody catalog={catalog} />
```


- [ ] **Paso 3: Pasar el catálogo al shell desde `ProjectEditor` y ajustar la prueba del shell**

Modify `apps/web/src/editor/ProjectEditor.tsx`:

```diff
@@
         bridge={bridge}
+        catalog={items}
         onBack={() => go('/proyectos')}
```


Modify `apps/web/test/shell-connected.test.tsx`:

```diff
@@
-      (bridge) => <EditorShell bridge={bridge} projectName="Loft Palermo" saveStatus={status} onBack={noop} />,
+      (bridge) => <EditorShell bridge={bridge} catalog={[]} projectName="Loft Palermo" saveStatus={status} onBack={noop} />,
```


- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-left-panel shell-connected shell-dock shell-boundaries`
Expected: PASS (`shell-left-panel`: 6 pruebas; `shell-connected` y `shell-dock` siguen verdes: `EditorShell` ahora pide `catalog`, así que `shell-connected.test.tsx` lo monta con `catalog={[]}`).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/FurniturePanel.tsx apps/web/src/editor/shell/LeftPanel.tsx apps/web/src/editor/shell/dock-model.ts apps/web/src/editor/shell/EditorShell.tsx apps/web/src/editor/ProjectEditor.tsx apps/web/test/shell-left-panel.test.tsx apps/web/test/shell-connected.test.tsx
git commit -m "feat(editor): panel de muebles conectado y panel izquierdo según el botón activo del dock" -- apps/web/src/editor/shell/FurniturePanel.tsx apps/web/src/editor/shell/LeftPanel.tsx apps/web/src/editor/shell/dock-model.ts apps/web/src/editor/shell/EditorShell.tsx apps/web/src/editor/ProjectEditor.tsx apps/web/test/shell-left-panel.test.tsx apps/web/test/shell-connected.test.tsx
```

---

### Task 7e: Quitar la barra lateral de Pascal y pruebas en navegador del catálogo de muebles

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Modify: `apps/web/src/editor/ProjectEditor.tsx` (quita la barra lateral de Pascal), `apps/web/e2e/catalog.spec.ts` (se reescribe: ahora entra por el dock)
- Create: `apps/web/e2e/muebles.spec.ts`
- Test: `apps/web/e2e/muebles.spec.ts`, `apps/web/e2e/catalog.spec.ts` (navegador real)

**Interfaces:**
- Consumes: `FurniturePanel`, `LeftPanel` y `EditorShell` con `catalog` (7d); `bridge.placeItem` (7c); `dockButton`, `modeButton` (4f, 5f); `hook` (3b); `createProjectViaUi`.
- Produces: `ProjectEditor` ya no pasa `sidebarTabs` al `<Editor>` ni importa `ItemsPanel` ni `buildCommerceItems` (la lista de comercio queda para las pruebas de `commerce-catalog.ts`); la pestaña **Comercio** pasa a ser una categoría más del panel de muebles.

Con el panel propio ya no hace falta `sidebarTabs`: sin ellas Pascal no monta su columna izquierda (`docs/pascal-notes.md`, "Se oculta por omisión"). Cierra el criterio 7 del spec para el catálogo ("Furniture", "Search…" y compañía ya no aparecen) y el flujo de colocar: elegir una tarjeta pasa a la fase `furnish` y arma el ítem.

- [ ] **Paso 1: Escribir las pruebas en navegador**

Create `apps/web/e2e/catalog.spec.ts` (ya existe: reemplázalo entero con esto):

```ts
import { expect, test } from '@playwright/test'
import { createProjectViaUi } from './support/projects'
import { dockButton } from './support/shell'

test('la categoría Comercio lista el gabinete y el estante paramétricos y todo carga sin 404', async ({ page }) => {
  const failed: string[] = []
  page.on('response', (r) => {
    if (r.status() === 404 && /\/items\//.test(r.url())) failed.push(r.url())
  })
  await createProjectViaUi(page, { name: `E2E comercio ${Date.now()}`, template: null, waitForEditor: false })
  await dockButton(page, 'Muebles').click({ timeout: 60_000 })
  const panel = page.getByRole('complementary', { name: 'Muebles' })
  await panel.getByRole('button', { name: 'Comercio', exact: true }).click()
  // El gabinete y el estante paramétricos están en la lista de comercio; todos los modelos salen de /items/ locales.
  await expect(panel.getByText('Gabinete modular')).toBeVisible({ timeout: 60_000 })
  await expect(panel.getByText('Estante', { exact: true })).toBeVisible()
  await page.waitForTimeout(3000)
  expect(failed).toEqual([])
})
```

Create `apps/web/e2e/muebles.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { hook } from './support/hooks'
import { createProjectViaUi } from './support/projects'
import { dockButton, modeButton } from './support/shell'

const ENGLISH = /\b(Sofa|Double Bed|Furniture|Search|Bathtub|Dining|Stool|Tree|Kitchen)\b/

test('Muebles abre el catálogo en castellano; elegir uno pasa a la fase furnish y arma el mueble; la búsqueda y las categorías filtran', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E muebles ${Date.now()}`, template: null })
  await dockButton(page, 'Muebles').click()
  const panel = page.getByRole('complementary', { name: 'Muebles' })
  await expect(panel).toBeVisible({ timeout: 15_000 })
  expect(await panel.innerText()).not.toMatch(ENGLISH)
  const cards = panel.getByRole('listitem')
  await expect(cards.first()).toBeVisible({ timeout: 15_000 })
  expect(await cards.count()).toBeGreaterThanOrEqual(100)

  await panel.getByRole('searchbox', { name: 'Buscar muebles' }).fill('cama')
  await expect(cards).toHaveCount(2)
  await expect(panel.getByRole('button', { name: /Cama doble/ })).toBeVisible()
  await panel.getByRole('searchbox', { name: 'Buscar muebles' }).fill('')
  await panel.getByRole('button', { name: 'Baño', exact: true }).click()
  await expect(cards).toHaveCount(10)

  await panel.getByRole('button', { name: 'Todos', exact: true }).click()
  await panel.getByRole('button', { name: /^Sofá/ }).click()
  expect(await hook(page, 'state')).toMatchObject({ phase: 'furnish', mode: 'build', tool: 'item' })
  await expect(panel.getByRole('button', { name: /^Sofá/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(dockButton(page, 'Muebles')).toHaveAttribute('aria-pressed', 'true')
})

test('las miniaturas del catálogo se ven (no quedan rotas)', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E miniaturas ${Date.now()}`, template: null })
  await dockButton(page, 'Muebles').click()
  const images = page.getByRole('complementary', { name: 'Muebles' }).locator('img')
  await expect(images.first()).toBeVisible({ timeout: 15_000 })
  await expect
    .poll(() => images.evaluateAll((list) => list.slice(0, 8).every((img) => (img as HTMLImageElement).naturalWidth > 0)), { timeout: 15_000 })
    .toBe(true)
})

test('al volver a Seleccionar o pasar a Ver el panel de muebles cede su lugar a las plantas y los ambientes', async ({ page }) => {
  await createProjectViaUi(page, { name: `E2E panel ${Date.now()}`, template: null })
  const furniture = page.getByRole('complementary', { name: 'Muebles' })
  const levels = page.getByRole('complementary', { name: 'Nivel y ambientes' })
  await dockButton(page, 'Muebles').click()
  await expect(furniture).toBeVisible({ timeout: 15_000 })
  await expect(levels).toHaveCount(0)
  await dockButton(page, 'Seleccionar').click()
  await expect(levels).toBeVisible()
  await expect(furniture).toHaveCount(0)
  await dockButton(page, 'Muebles').click()
  await modeButton(page, 'Ver').click()
  await expect(levels).toBeVisible()
  await expect(furniture).toHaveCount(0)
})
```

- [ ] **Paso 2: Quitar la barra lateral de Pascal de `ProjectEditor`**

Modify `apps/web/src/editor/ProjectEditor.tsx`:

```diff
@@
-import { CATALOG_ITEMS, Editor, ItemsPanel, type SceneGraph } from '@pascal-app/editor'
+import { CATALOG_ITEMS, Editor, type SceneGraph } from '@pascal-app/editor'
@@
-import { Sofa, Store } from 'lucide-react'
 import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
@@
-import { buildCommerceItems } from './commerce-catalog'
 import { HIDDEN_CHROME, type PascalChrome } from './chrome'
@@
   const items = useMemo(() => localizeCatalog(CATALOG_ITEMS), [])
-  const commerceItems = useMemo(() => buildCommerceItems(items), [items])
@@
-  const sidebarTabs = useMemo(
-    () => [
-      {
-        id: 'items',
-        label: 'Muebles',
-        icon: <Sofa aria-hidden size={20} />,
-        component: () => <ItemsPanel items={items} showSourceFilter={false} showTagFilters={false} />,
-      },
-      {
-        id: 'commerce',
-        label: 'Comercio',
-        icon: <Store aria-hidden size={20} />,
-        component: () => <ItemsPanel items={commerceItems} showSourceFilter={false} showTagFilters={false} />,
-      },
-    ],
-    [items, commerceItems],
-  )
-
   if (phase.kind === 'loading') return <LoaderPortal />
@@
         projectId={projectId}
-        sidebarTabs={sidebarTabs}
       />
```


- [ ] **Paso 3: Tipos, lint y navegador**

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos (ya no hay `ItemsPanel`, `Sofa` ni `Store` sin usar).

Run (Supabase local arriba: `pnpm db:start && pnpm db:env`): `pnpm --filter @interiores/web e2e e2e/muebles.spec.ts e2e/catalog.spec.ts e2e/niveles.spec.ts`
Expected: PASS. Antes de esta tarea fallan: la barra lateral de Pascal sigue en inglés y no hay `getByRole('complementary', { name: 'Muebles' })`.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/ProjectEditor.tsx apps/web/e2e/catalog.spec.ts apps/web/e2e/muebles.spec.ts
git commit -m "feat(editor): la barra lateral de Pascal se reemplaza por el panel de muebles en castellano, con Comercio como categoría" -- apps/web/src/editor/ProjectEditor.tsx apps/web/e2e/catalog.spec.ts apps/web/e2e/muebles.spec.ts
```

---

### Task 7f: Miniaturas transparentes (1 de 2): encuadre, escenario de captura y script

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/dev/thumbnail-camera.ts`, `apps/web/src/editor/dev/ThumbnailStage.tsx`, `apps/web/app/dev/miniaturas/page.tsx`, `apps/web/e2e/capture-items.spec.ts`, `apps/web/scripts/item-thumbnails.mjs`
- Modify: `apps/web/package.json` (script `items:thumbs` y la devDependency `@types/three`), `pnpm-lock.yaml`
- Test: `apps/web/test/thumbnail-camera.test.ts`

**Interfaces:**
- Consumes: nada de las tareas anteriores; usa los modelos `public/items/<id>/model.glb` y el HDRI `public/hdri/venice_sunset_1k.hdr` que ya están en el repo.
- Produces (`thumbnail-camera.ts`, puro, sin `three`): `type Vec3 = readonly [number, number, number]`, `THUMBNAIL_SIZE = 256`, `THUMBNAIL_FOV = 30`, `VIEW_DIRECTION: Vec3` (unitario) y `framePlacement(center: Vec3, radius: number, fovDegrees: number, margin?: number): { position: Vec3; near: number; far: number }`.
- Produces (`ThumbnailStage.tsx`): `default function ThumbnailStage(props: { id: string; onReady: () => void })`: lienzo de 256 × 256 con **fondo transparente** que dibuja `/items/<id>/model.glb` y llama a `onReady` tras 3 cuadros completos.
- Produces: la página de desarrollo `/dev/miniaturas?id=<id>` (en producción no muestra nada) con el atributo `data-thumb-ready="<id>"` en el contenedor cuando el mueble ya está dibujado, y el comando `pnpm --filter @interiores/web items:thumbs [id …]`, que guarda `public/items/<id>/thumbnail.webp` (todas si no se pasan ids). La **Tarea 7g** verifica y versiona el resultado.

**Por qué en el navegador y sin dependencias de imagen.** Las miniaturas actuales traen el negro dentro de la imagen (D9): no se arreglan con CSS. Para regenerarlas hay que dibujar cada GLB con luz y encuadre fijos y guardar el cuadro con alfa. El navegador ya sabe hacerlo: `canvas.toDataURL('image/webp')` conserva el canal alfa, así que no hace falta `sharp` ni ninguna otra librería. Los modelos y el HDRI ya están en `public/`, y `@react-three/fiber`, `@react-three/drei` y `three` ya son dependencias de `apps/web`.

**Una dependencia de tipos.** `three` no trae tipos propios (los de Pascal los resuelve cada paquete por su cuenta) y el propio `ThumbnailStage` los necesita: sin ellos `tsc` falla con `TS7016` en el primer `import … from 'three'` de código nuestro. `@types/three@0.186.0` ya está en `pnpm-lock.yaml` como dependencia indirecta de `drei`; se agrega como devDependency exacta de `apps/web` (solo tipos: no entra al paquete que se publica).

- [ ] **Paso 1: Escribir la prueba del encuadre (rojo)**

Create `apps/web/test/thumbnail-camera.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { THUMBNAIL_FOV, VIEW_DIRECTION, framePlacement } from '../src/editor/dev/thumbnail-camera'

type Vec3 = readonly [number, number, number]
const minus = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const length = (v: Vec3) => Math.hypot(v[0], v[1], v[2])
const CENTER: Vec3 = [0.2, 0.5, -0.1]

describe('framePlacement', () => {
  it('aleja la cámara lo justo para que la esfera del mueble quepa entera', () => {
    for (const radius of [0.03, 0.4, 1.5, 12]) {
      const { position } = framePlacement(CENTER, radius, THUMBNAIL_FOV)
      const distance = length(minus(position, CENTER))
      const visibleRadius = distance * Math.sin((THUMBNAIL_FOV * Math.PI) / 360)
      expect(visibleRadius).toBeGreaterThanOrEqual(radius)
      expect(visibleRadius).toBeLessThan(radius * 1.25) // con aire, pero sin dejar un mueble diminuto al centro
    }
  })

  it('siempre mira desde la misma dirección, sea cual sea el tamaño', () => {
    for (const radius of [0.1, 3]) {
      const offset = minus(framePlacement(CENTER, radius, THUMBNAIL_FOV).position, CENTER)
      for (const [i, n] of offset.entries()) expect(n / length(offset)).toBeCloseTo(VIEW_DIRECTION[i] ?? 0, 6)
    }
  })

  it('VIEW_DIRECTION es un vector unitario que mira de frente y desde arriba', () => {
    expect(length(VIEW_DIRECTION)).toBeCloseTo(1, 9)
    expect(VIEW_DIRECTION[1]).toBeGreaterThan(0)
    expect(VIEW_DIRECTION[2]).toBeGreaterThan(0)
  })

  it('deja el plano cercano delante del mueble y el lejano detrás', () => {
    const radius = 2
    const { position, near, far } = framePlacement(CENTER, radius, THUMBNAIL_FOV)
    const distance = length(minus(position, CENTER))
    expect(near).toBeGreaterThan(0)
    expect(near).toBeLessThan(distance - radius)
    expect(far).toBeGreaterThan(distance + radius)
  })

  it('un mueble del doble de tamaño se mira desde el doble de lejos', () => {
    const small = length(minus(framePlacement(CENTER, 0.5, THUMBNAIL_FOV).position, CENTER))
    const big = length(minus(framePlacement(CENTER, 1, THUMBNAIL_FOV).position, CENTER))
    expect(big / small).toBeCloseTo(2, 9)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run thumbnail-camera`
Expected: FAIL — `Cannot find module '../src/editor/dev/thumbnail-camera'`.

- [ ] **Paso 2: Escribir el encuadre**

Create `apps/web/src/editor/dev/thumbnail-camera.ts`:

```ts
export type Vec3 = readonly [number, number, number]

/** Lado, en píxeles, de cada miniatura: la tarjeta del catálogo la muestra a unos 100 px y el doble da nitidez en pantallas densas. */
export const THUMBNAIL_SIZE = 256
/** Campo de visión vertical de la cámara de captura, en grados. */
export const THUMBNAIL_FOV = 30

const unit = (v: Vec3): Vec3 => {
  const n = Math.hypot(v[0], v[1], v[2])
  return [v[0] / n, v[1] / n, v[2] / n]
}

/** Desde dónde se fotografía: de frente, algo hacia la derecha y desde arriba (la vista clásica de catálogo). */
export const VIEW_DIRECTION: Vec3 = unit([0.55, 0.42, 0.72])

/**
 * Dónde poner la cámara para que una esfera de `radius` metros centrada en `center` entre entera en el cuadro, con
 * un 12 % de aire (`margin`). Los planos cercano y lejano se ajustan al tamaño para no recortar ni perder precisión.
 */
export function framePlacement(
  center: Vec3,
  radius: number,
  fovDegrees: number,
  margin = 1.12,
): { position: Vec3; near: number; far: number } {
  const distance = (radius / Math.sin((fovDegrees * Math.PI) / 360)) * margin
  return {
    position: [
      center[0] + VIEW_DIRECTION[0] * distance,
      center[1] + VIEW_DIRECTION[1] * distance,
      center[2] + VIEW_DIRECTION[2] * distance,
    ],
    near: (distance - radius) / 2,
    far: (distance + radius) * 2,
  }
}
```

Run: `pnpm --filter @interiores/web exec vitest run thumbnail-camera`
Expected: PASS (5 pruebas).

- [ ] **Paso 3: Agregar los tipos de `three`**

Run: `pnpm --filter @interiores/web add -D --save-exact @types/three@0.186.0`
Expected: `+ @types/three 0.186.0` (no descarga nada nuevo: ya estaba en el almacén). `git diff --stat` muestra solo `apps/web/package.json` y `pnpm-lock.yaml`.

- [ ] **Paso 4: Escribir el escenario de captura y su página**

El modelo se encuadra con la esfera que envuelve su caja (`Box3`), se mira desde `VIEW_DIRECTION` y se ilumina con el HDRI del repo más una luz direccional. El lienzo es transparente (`alpha: true`, sin `background`) y conserva el cuadro (`preserveDrawingBuffer`) para poder leerlo con `toDataURL`. Las constantes de luz están al principio por si la hoja de contactos de la Tarea 7g pide ajustar el brillo.

Create `apps/web/src/editor/dev/ThumbnailStage.tsx`:

```tsx
'use client'

import { Environment, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import { Box3, Sphere } from 'three'
import { THUMBNAIL_FOV, framePlacement, type Vec3 } from './thumbnail-camera'

/** Luz fija de estudio: la misma para todos los muebles, para que la hoja de contactos sea comparable. */
const AMBIENT = 0.35
const KEY_LIGHT = { position: [2.5, 4, 3] as Vec3, intensity: 1.6 }
const ENVIRONMENT_INTENSITY = 0.9
/** Cuadros que se dibujan con el mueble ya puesto antes de darlo por listo. */
const SETTLE_FRAMES = 3

function Model({ id, onReady }: { id: string; onReady: () => void }) {
  const { scene } = useGLTF(`/items/${id}/model.glb`)
  const camera = useThree((state) => state.camera)
  const frames = useRef(0)
  const fit = useMemo(() => {
    const sphere = new Box3().setFromObject(scene).getBoundingSphere(new Sphere())
    const center: Vec3 = [sphere.center.x, sphere.center.y, sphere.center.z]
    return { center, ...framePlacement(center, sphere.radius, THUMBNAIL_FOV) }
  }, [scene])
  useLayoutEffect(() => {
    camera.position.set(...fit.position)
    camera.near = fit.near
    camera.far = fit.far
    camera.lookAt(...fit.center)
    camera.updateProjectionMatrix()
    frames.current = 0
  }, [camera, fit])
  useFrame(() => {
    frames.current += 1
    if (frames.current === SETTLE_FRAMES) onReady()
  })
  return <primitive object={scene} />
}

/** Un mueble sobre fondo transparente, encuadrado y con luz fijas: lo que se fotografía para su miniatura. */
export default function ThumbnailStage({ id, onReady }: { id: string; onReady: () => void }) {
  return (
    <Canvas dpr={1} camera={{ fov: THUMBNAIL_FOV }} gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}>
      <ambientLight intensity={AMBIENT} />
      <directionalLight position={KEY_LIGHT.position} intensity={KEY_LIGHT.intensity} />
      <Suspense fallback={null}>
        <Environment files="/hdri/venice_sunset_1k.hdr" environmentIntensity={ENVIRONMENT_INTENSITY} />
        <Model id={id} onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}
```

Create `apps/web/app/dev/miniaturas/page.tsx`:

```tsx
'use client'

import dynamic from 'next/dynamic'
import { use, useState } from 'react'
import { THUMBNAIL_SIZE } from '@/editor/dev/thumbnail-camera'

// R3F usa el DOM y WebGL: nunca se renderiza en el servidor.
const ThumbnailStage = dynamic(() => import('@/editor/dev/ThumbnailStage'), { ssr: false })

// El tablero de cuadros gris y blanco solo está para ver la transparencia; `toDataURL` guarda únicamente los píxeles del lienzo.
const CHECKERBOARD = {
  backgroundImage: 'conic-gradient(#dfe5f1 25%, #ffffff 0 50%, #dfe5f1 0 75%, #ffffff 0)',
  backgroundSize: '16px 16px',
}

/** Solo para desarrollo: dibuja un mueble sobre fondo transparente para fotografiarlo (`pnpm items:thumbs`). */
export default function ThumbnailPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = use(searchParams)
  const [ready, setReady] = useState(false)
  if (process.env.NODE_ENV === 'production') return null
  if (!id) return <p className="p-6">Falta el mueble: abre /dev/miniaturas?id=sofa</p>
  return (
    <main className="min-h-dvh p-6">
      <div
        key={id}
        data-thumb-ready={ready ? id : undefined}
        style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, ...CHECKERBOARD }}
      >
        <ThumbnailStage id={id} onReady={() => setReady(true)} />
      </div>
    </main>
  )
}
```

- [ ] **Paso 5: Escribir la captura con Playwright y el script**

Sigue el molde de `e2e/capture-templates.spec.ts` y `scripts/capture-templates.mjs`: no corre con `pnpm e2e` (se salta sola) y necesita Supabase local porque Playwright inicia sesión antes. Se puede pedir solo algunos ids (`items:thumbs sofa cactus`) para ajustar la luz sin esperar los 144.

Create `apps/web/e2e/capture-items.spec.ts`:

```ts
// Fotografía cada mueble de public/items con fondo transparente y guarda public/items/<id>/thumbnail.webp.
// No corre con `pnpm e2e`: se pide con `pnpm --filter @interiores/web items:thumbs [id ...]` (necesita Supabase local, como las demás capturas).
import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

const ITEMS = join(process.cwd(), 'public', 'items')
const only = (process.env.ITEM_IDS ?? '').split(',').filter(Boolean)
const IDS =
  only.length > 0
    ? only
    : readdirSync(ITEMS, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()

test('capturar las miniaturas de los muebles', async ({ page }) => {
  test.skip(process.env.CAPTURE_ITEMS !== '1', 'Solo con items:thumbs')
  test.setTimeout(Math.max(IDS.length, 1) * 25_000)
  const failed: string[] = []
  for (const id of IDS) {
    try {
      await page.goto(`/dev/miniaturas?id=${encodeURIComponent(id)}`)
      const canvas = page.locator(`[data-thumb-ready="${id}"] canvas`)
      await expect(canvas).toBeVisible({ timeout: 20_000 })
      const dataUrl = await canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL('image/webp', 0.92))
      if (!dataUrl.startsWith('data:image/webp;base64,')) throw new Error('el navegador no codificó WebP')
      writeFileSync(join(ITEMS, id, 'thumbnail.webp'), Buffer.from(dataUrl.split(',')[1] ?? '', 'base64'))
    } catch (error) {
      failed.push(`${id}: ${String(error).split('\n')[0]}`)
    }
  }
  expect(failed, 'Muebles que no se pudieron fotografiar').toEqual([])
})
```

Create `apps/web/scripts/item-thumbnails.mjs`:

```js
// Regenera las miniaturas de public/items/<id>/thumbnail.webp con fondo transparente (spec 3, D9).
// Uso: pnpm --filter @interiores/web items:thumbs [id ...]   (sin ids: todas las carpetas de public/items)
// Requisitos: Supabase local (pnpm db:start && pnpm db:env); Playwright levanta la API y la web si no están corriendo.
import { spawnSync } from 'node:child_process'

const ids = process.argv.slice(2)
const result = spawnSync('pnpm', ['exec', 'playwright', 'test', 'e2e/capture-items.spec.ts', '--project=chromium'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, CAPTURE_ITEMS: '1', ...(ids.length > 0 ? { ITEM_IDS: ids.join(',') } : {}) },
})
process.exit(result.status ?? 1)
```

Modify `apps/web/package.json`:

```diff
@@
     "templates:thumbs": "node scripts/capture-templates.mjs",
+    "items:thumbs": "node scripts/item-thumbnails.mjs",
```


- [ ] **Paso 6: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run thumbnail-camera shell-boundaries`
Expected: PASS (`thumbnail-camera`: 5 pruebas; `shell-boundaries` sigue verde: `src/editor/dev/` es parte de `src/editor/`, el único lugar que puede importar `three`).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 7: Ver el escenario en el navegador y probar la captura con dos muebles**

Run (Supabase local arriba: `pnpm db:start && pnpm db:env`): `pnpm --filter @interiores/web dev` y abre `http://localhost:3000/dev/miniaturas?id=sofa`.
Expected: el sofá, visto de frente y desde arriba, sobre un tablero de cuadros gris claro y blanco (el tablero es la transparencia), sin errores en la consola.

Run: `pnpm --filter @interiores/web items:thumbs sofa cactus`
Expected: `1 passed`. Abre `apps/web/public/items/sofa/thumbnail.webp` en el navegador: el sofá se ve **sin recuadro negro** (con el fondo de la pestaña detrás). Si se ve oscuro o quemado, ajusta `AMBIENT`, `KEY_LIGHT` y `ENVIRONMENT_INTENSITY` al principio de `ThumbnailStage.tsx` y repite.

Run: `git checkout -- apps/web/public/items`
Expected: sin salida. Esta tarea no versiona imágenes: las 144 se regeneran y se comprueban en la Tarea 7g.

- [ ] **Paso 8: Commit**

```bash
git add apps/web/src/editor/dev/thumbnail-camera.ts apps/web/src/editor/dev/ThumbnailStage.tsx apps/web/app/dev/miniaturas/page.tsx apps/web/e2e/capture-items.spec.ts apps/web/scripts/item-thumbnails.mjs apps/web/test/thumbnail-camera.test.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(assets): escenario y script para fotografiar los muebles con fondo transparente" -- apps/web/src/editor/dev/thumbnail-camera.ts apps/web/src/editor/dev/ThumbnailStage.tsx apps/web/app/dev/miniaturas/page.tsx apps/web/e2e/capture-items.spec.ts apps/web/scripts/item-thumbnails.mjs apps/web/test/thumbnail-camera.test.ts apps/web/package.json pnpm-lock.yaml
```
---

### Task 7g: Miniaturas transparentes (2 de 2): regenerar las 144, comprobar la transparencia y revisar la hoja de contactos

**Responsable sugerido:** Victoria (mira la hoja de contactos a ojo). Revisa: Silvert.

**Files:**
- Create: `apps/web/test/support/webp.ts`, `apps/web/test/webp.test.ts`, `apps/web/test/item-thumbnails.test.ts`, `apps/web/e2e/miniaturas.spec.ts`, `apps/web/app/dev/miniaturas/hoja/page.tsx`
- Modify: `apps/web/scripts/item-thumbnails.mjs` (al terminar actualiza `local-items.json`), `apps/web/e2e/capture-items.spec.ts` (suma la hoja de contactos), `apps/web/scripts/vendor-pascal-assets.mjs` (un aviso), `apps/web/src/editor/local-items.json` (`shower` y `tub` ganan miniatura), `apps/web/public/items/*/thumbnail.webp` (144 archivos binarios)
- Test: `apps/web/test/webp.test.ts`, `apps/web/test/item-thumbnails.test.ts`, `apps/web/e2e/miniaturas.spec.ts`

**Interfaces:**
- Consumes: `pnpm --filter @interiores/web items:thumbs` y la página `/dev/miniaturas` (Tarea 7f); `nameEs` de `@/lib/catalog-es` (7a).
- Produces (`test/support/webp.ts`): `webpHasAlpha(bytes: Uint8Array): boolean` (lee solo la cabecera: `VP8X` con la bandera de alfa `0x10`, `VP8L` con el bit `alpha_is_used`, `VP8 ` nunca; lanza si no es WebP). La usan las pruebas; no entra a la app.
- Produces: página de desarrollo `/dev/miniaturas/hoja` (todas las miniaturas sobre un tablero de cuadros para ver la transparencia) y la captura `test-results/hoja-miniaturas.png` que deja `items:thumbs`.

**Qué dice el estado de hoy** (medido al escribir el plan sobre `public/items`): de 144 carpetas, **139** miniaturas son WebP con pérdida **sin canal alfa** (`VP8 `), **3** declaran alfa (`VP8X`) y **2** (`shower` y `tub`) **no tienen miniatura**: `local-items.json` las lista solo con `model.glb`, por eso el catálogo les muestra el recuadro vacío. La prueba de cabecera no alcanza por sí sola (una imagen puede declarar alfa y traerlo opaco): por eso hay **dos** comprobaciones, la de cabecera en Vitest (rápida, falla con la lista de ids) y la lectura real de las cuatro esquinas de cada imagen en el navegador (criterio 8 del spec).

**Cómo se versionan los binarios.** `.gitattributes` ya marca `*.webp binary`. Las 144 imágenes de 256 × 256 pesan en total alrededor de 1 a 2 MB: se commitean directamente, sin LFS. `pnpm assets:vendor` copia de nuevo `public/items` desde el repo de Pascal y **pisaría** estas miniaturas con las negras; el script de vendoreo avisa al terminar (Paso 5) y `pnpm build` solo verifica que los assets estén, no los copia.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/webp.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { webpHasAlpha } from './support/webp'

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))
/** Un WebP mínimo: solo la cabecera RIFF y el primer trozo (lo único que lee `webpHasAlpha`). */
const webp = (chunk: string, payload: number[]) =>
  Uint8Array.from([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP'), ...ascii(chunk), payload.length, 0, 0, 0, ...payload])

describe('webpHasAlpha', () => {
  it('VP8X: lee la bandera de alfa de la cabecera extendida', () => {
    expect(webpHasAlpha(webp('VP8X', [0x10, 0, 0, 0, 255, 0, 0, 255, 0, 0]))).toBe(true)
    expect(webpHasAlpha(webp('VP8X', [0x00, 0, 0, 0, 255, 0, 0, 255, 0, 0]))).toBe(false)
  })

  it('VP8L: lee el bit alpha_is_used (el bit 28 de los 32 que siguen a la firma 0x2f)', () => {
    expect(webpHasAlpha(webp('VP8L', [0x2f, 255, 63, 0, 0x10]))).toBe(true)
    expect(webpHasAlpha(webp('VP8L', [0x2f, 255, 63, 0, 0x00]))).toBe(false)
  })

  it('VP8 (con pérdida y sin trozo de alfa) nunca tiene alfa', () => {
    expect(webpHasAlpha(webp('VP8 ', [0x10, 0x10, 0x10, 0x10, 0x10, 0x10]))).toBe(false)
  })

  it('lanza si el archivo no es un WebP', () => {
    expect(() => webpHasAlpha(Uint8Array.from(ascii('GIF89a-esto-no-es-un-webp')))).toThrow('No es un WebP')
    expect(() => webpHasAlpha(webp('XXXX', [0, 0, 0, 0, 0, 0]))).toThrow('Trozo WebP desconocido')
  })
})
```

Create `apps/web/test/item-thumbnails.test.ts`:

```ts
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import manifest from '../src/editor/local-items.json'
import { webpHasAlpha } from './support/webp'

const ITEMS = fileURLToPath(new URL('../public/items', import.meta.url))
const IDS = readdirSync(ITEMS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
const thumbnail = (id: string) => join(ITEMS, id, 'thumbnail.webp')

describe('miniaturas de los muebles (D9, criterio 8)', () => {
  it('hay 144 muebles y cada carpeta tiene su miniatura', () => {
    expect(IDS.length).toBeGreaterThanOrEqual(144)
    expect(IDS.filter((id) => !existsSync(thumbnail(id)))).toEqual([])
  })

  it('todas son WebP con canal alfa: la imagen no trae el fondo negro adentro', () => {
    const sinAlfa = IDS.filter((id) => existsSync(thumbnail(id)) && !webpHasAlpha(readFileSync(thumbnail(id))))
    expect(sinAlfa, 'Miniaturas sin canal alfa: corre pnpm --filter @interiores/web items:thumbs').toEqual([])
  })

  it('local-items.json lista la miniatura de cada carpeta que la tiene (si no, el catálogo no la usa)', () => {
    const files = manifest as Record<string, string[]>
    const sinListar = IDS.filter((id) => existsSync(thumbnail(id)) && !files[id]?.includes('thumbnail.webp'))
    expect(sinListar).toEqual([])
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run webp item-thumbnails`
Expected: FAIL — `Cannot find module './support/webp'`.

- [ ] **Paso 2: Escribir el lector de cabeceras**

Create `apps/web/test/support/webp.ts`:

```ts
/**
 * ¿El WebP declara canal alfa? Lee solo la cabecera del primer trozo, sin decodificar la imagen:
 * `VP8X` (formato extendido) trae la bandera de alfa en el bit 4 del byte 20; `VP8L` (sin pérdida) trae el bit
 * `alpha_is_used` (el bit 28 de los 32 que siguen a la firma 0x2f); `VP8 ` (con pérdida simple) nunca trae alfa.
 */
export function webpHasAlpha(bytes: Uint8Array): boolean {
  const text = (start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length))
  if (bytes.length < 21 || text(0, 4) !== 'RIFF' || text(8, 4) !== 'WEBP') throw new Error('No es un WebP')
  const chunk = text(12, 4)
  if (chunk === 'VP8X') return ((bytes[20] ?? 0) & 0x10) !== 0
  if (chunk === 'VP8L') return bytes[20] === 0x2f && ((bytes[24] ?? 0) & 0x10) !== 0
  if (chunk === 'VP8 ') return false
  throw new Error(`Trozo WebP desconocido: ${chunk}`)
}
```

Run: `pnpm --filter @interiores/web exec vitest run webp`
Expected: PASS (`webp`: 4 pruebas).

Run: `pnpm --filter @interiores/web exec vitest run item-thumbnails`
Expected: FAIL por lo que dice el estado de hoy, no por un error de código: la primera prueba lista `["shower", "tub"]`; la segunda lista 139 ids con `Miniaturas sin canal alfa: corre pnpm …items:thumbs`; la tercera pasa (todavía no hay miniaturas nuevas).

- [ ] **Paso 3: Escribir la lectura real de las esquinas (navegador) y la hoja de contactos**

El navegador decodifica el WebP de verdad, así que esta prueba no se deja engañar por una cabecera que declara alfa con el plano opaco: lee las cuatro esquinas (alfa 0) y exige que el mueble ocupe al menos un 2 % de la imagen con píxeles opacos.

Create `apps/web/e2e/miniaturas.spec.ts`:

```ts
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

const IDS = readdirSync(join(process.cwd(), 'public', 'items'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

test('las 144 miniaturas tienen las cuatro esquinas transparentes y un mueble opaco al centro', async ({ page }) => {
  await page.goto('/logo.svg') // cualquier archivo del mismo origen: aquí solo hacen falta `fetch` y un lienzo
  const bad = await page.evaluate(async (ids) => {
    const failures: string[] = []
    for (const id of ids) {
      const response = await fetch(`/items/${id}/thumbnail.webp`, { cache: 'reload' })
      if (!response.ok) {
        failures.push(`${id} (no existe)`)
        continue
      }
      const bitmap = await createImageBitmap(await response.blob())
      const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d')
      if (!context) throw new Error('El navegador no ofrece un lienzo 2D')
      context.drawImage(bitmap, 0, 0)
      const { data, width, height } = context.getImageData(0, 0, bitmap.width, bitmap.height)
      const alphaAt = (x: number, y: number) => data[(y * width + x) * 4 + 3] ?? 255
      const corners = [alphaAt(0, 0), alphaAt(width - 1, 0), alphaAt(0, height - 1), alphaAt(width - 1, height - 1)]
      let opaque = 0
      for (let i = 3; i < data.length; i += 4) if ((data[i] ?? 0) > 200) opaque += 1
      if (corners.some((alpha) => alpha !== 0) || opaque < width * height * 0.02) failures.push(id)
    }
    return failures
  }, IDS)
  expect(IDS.length).toBeGreaterThanOrEqual(144)
  expect(bad, 'Miniaturas con esquina opaca, vacías o inexistentes').toEqual([])
})
```

Create `apps/web/app/dev/miniaturas/hoja/page.tsx`:

```tsx
'use client'

import manifest from '@/editor/local-items.json'
import { nameEs } from '@/lib/catalog-es'

const IDS = Object.keys(manifest).sort()
// El tablero gris claro y blanco deja ver la transparencia de cada miniatura.
const CHECKERBOARD = {
  backgroundImage: 'conic-gradient(#dfe5f1 25%, #ffffff 0 50%, #dfe5f1 0 75%, #ffffff 0)',
  backgroundSize: '16px 16px',
}

/** Solo para desarrollo: todas las miniaturas en una cuadrícula, para revisarlas a ojo después de regenerarlas. */
export default function ContactSheetPage() {
  if (process.env.NODE_ENV === 'production') return null
  return (
    <main className="min-h-dvh p-4" style={CHECKERBOARD}>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3 p-0" aria-label="Miniaturas de los muebles">
        {IDS.map((id) => (
          <li key={id} className="flex flex-col items-center gap-1">
            {/* biome-ignore lint/performance/noImgElement: página de desarrollo, no necesita next/image */}
            <img src={`/items/${id}/thumbnail.webp`} alt={nameEs(id, id)} width={128} height={128} />
            <span className="rounded bg-white/90 px-1 text-[11px] leading-tight text-black">{id}</span>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

Modify `apps/web/e2e/capture-items.spec.ts`:

```diff
@@
   expect(failed, 'Muebles que no se pudieron fotografiar').toEqual([])
 })
+
+// La hoja de contactos queda en test-results/hoja-miniaturas.png (no se commitea): se mira a ojo antes de dar las miniaturas por buenas.
+test('hoja de contactos de las miniaturas', async ({ page }) => {
+  test.skip(process.env.CAPTURE_ITEMS !== '1', 'Solo con items:thumbs')
+  await page.setViewportSize({ width: 1600, height: 1000 })
+  await page.goto('/dev/miniaturas/hoja')
+  await expect.poll(() => page.evaluate(() => [...document.images].every((image) => image.complete))).toBe(true)
+  await page.screenshot({ path: 'test-results/hoja-miniaturas.png', fullPage: true })
+})
```


- [ ] **Paso 4: Que el script deje `local-items.json` al día**

`shower` y `tub` no tenían miniatura: `localizeCatalogItem` (`src/editor/catalog.ts`, línea 20) solo la usa si el manifiesto la lista. El script lo actualiza al terminar bien, sin cambiar el orden de las claves (el diff queda en las dos entradas nuevas).

Modify `apps/web/scripts/item-thumbnails.mjs`:

```diff
@@
 import { spawnSync } from 'node:child_process'
+import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
@@
+if (result.status === 0) {
+  // El catálogo local solo usa las miniaturas que `local-items.json` lista: se vuelve a leer cada carpeta (mismas claves y orden).
+  const manifestUrl = new URL('../src/editor/local-items.json', import.meta.url)
+  const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'))
+  for (const id of Object.keys(manifest)) manifest[id] = readdirSync(new URL(`../public/items/${id}/`, import.meta.url)).sort()
+  writeFileSync(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`)
+}
 process.exit(result.status ?? 1)
```


- [ ] **Paso 5: Avisar en el script de vendoreo**

Modify `apps/web/scripts/vendor-pascal-assets.mjs`:

```diff
@@
   console.log(`Listo: ${Object.keys(manifest).length} muebles locales de Pascal @ ${COMMIT.slice(0, 7)}`)
+  console.log('Ojo: public/items/*/thumbnail.webp volvió a las miniaturas con fondo negro de Pascal. Corre: pnpm --filter @interiores/web items:thumbs')
```


- [ ] **Paso 6: Regenerar las 144 miniaturas**

Run (Supabase local arriba: `pnpm db:start && pnpm db:env`): `pnpm --filter @interiores/web items:thumbs`
Expected: `2 passed` (la captura y la hoja de contactos), unos 5 a 15 minutos. Si algún mueble falla, el error lista `id: motivo` y el resto se guarda igual; repite solo esos: `pnpm --filter @interiores/web items:thumbs <id> <id>`. Con una conexión lenta tarda más la primera vez: el decodificador Draco se pide a `gstatic.com`, como lo hace el visor de Pascal.

Run: `git status --short apps/web/public/items apps/web/src/editor/local-items.json | head -5; git status --short apps/web/public/items | wc -l`
Expected: líneas ` M apps/web/public/items/<id>/thumbnail.webp` (y `?? …/shower/thumbnail.webp`, `?? …/tub/thumbnail.webp`), y el conteo es `144`. `git diff apps/web/src/editor/local-items.json` muestra solo `"thumbnail.webp"` agregado en `shower` y `tub`.

- [ ] **Paso 7: Verde y revisión a ojo de la hoja de contactos**

Run: `pnpm --filter @interiores/web exec vitest run webp item-thumbnails`
Expected: PASS (`webp`: 4 pruebas; `item-thumbnails`: 3 pruebas).

Run: `pnpm --filter @interiores/web e2e e2e/miniaturas.spec.ts`
Expected: PASS (1 prueba). Antes de regenerar fallaba: las esquinas eran negras y opacas.

Abre `apps/web/test-results/hoja-miniaturas.png` y revisa a ojo (lo hace la persona que revisa la tarea):
1. Ninguna pieza está cortada por el borde ni queda diminuta al centro.
2. Ninguna se ve negra ni "quemada" (blanco liso sin sombras). Si varias lo están, ajusta `AMBIENT`, `KEY_LIGHT` y `ENVIRONMENT_INTENSITY` en `ThumbnailStage.tsx` y repite `items:thumbs` (la prueba de encuadre no depende de la luz).
3. Los fondos son tablero de cuadros (transparentes), no un color liso.
4. Las 43 piezas que el catálogo no ofrece (puertas, ventanas, setos…) también se ven bien: solo necesitan miniatura transparente.
Si una pieza puntual queda mal (por ejemplo, un objeto muy plano), repite solo esa con `items:thumbs <id>` después de ajustar `margin` en la llamada a `framePlacement`.

- [ ] **Paso 8: Tipos, lint y commit**

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

```bash
git add apps/web/public/items apps/web/src/editor/local-items.json apps/web/test/support/webp.ts apps/web/test/webp.test.ts apps/web/test/item-thumbnails.test.ts apps/web/e2e/miniaturas.spec.ts apps/web/e2e/capture-items.spec.ts apps/web/app/dev/miniaturas/hoja/page.tsx apps/web/scripts/item-thumbnails.mjs apps/web/scripts/vendor-pascal-assets.mjs
git commit -m "feat(assets): miniaturas de los 144 muebles con fondo transparente y pruebas que lo comprueban" -- apps/web/public/items apps/web/src/editor/local-items.json apps/web/test/support/webp.ts apps/web/test/webp.test.ts apps/web/test/item-thumbnails.test.ts apps/web/e2e/miniaturas.spec.ts apps/web/e2e/capture-items.spec.ts apps/web/app/dev/miniaturas/hoja/page.tsx apps/web/scripts/item-thumbnails.mjs apps/web/scripts/vendor-pascal-assets.mjs
```
---

### Task 8a: Materiales en castellano (nombre de cada uno de los 114 y de sus categorías)

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/lib/material-es.ts`
- Test: `apps/web/test/material-es.test.ts`

**Interfaces:**
- Consumes: nada de las tareas anteriores. La prueba lee la biblioteca de Pascal (`MATERIAL_CATALOG` y `MATERIAL_CATEGORIES` de `@pascal-app/core/material-library`: las pruebas pueden importar Pascal, el código de `src/lib/` no).
- Produces (`@/lib/material-es`): `MATERIAL_ES: Readonly<Record<string, string>>` (id → nombre; los **114** de `MATERIAL_CATALOG`), `MATERIAL_CATEGORY_ES: Readonly<Record<string, string>>` (las 16 categorías de Pascal, también las que hoy no traen materiales), `materialNameEs(id: string, fallback: string): string` y `materialCategoryEs(category: string): string` (`'Otros'` si no la conoce). Los usa el panel de materiales (Tareas 8b y 8c).

**Por qué una tabla y no una traducción en vivo.** La biblioteca de Pascal trae los nombres en inglés fijo (`label: 'Hungarian Parquet 10'`) y ningún mecanismo de idioma (`docs/pascal-notes.md`). Es el mismo molde que `catalog-es.ts` de los muebles: una tabla por id, una prueba que **falla si falta alguno** (si una actualización de Pascal agrega un material, el catálogo no se ve a medias en inglés) y otra que falla si una traducción conserva palabras del inglés. Los números del final (`Madera fina 27`) se conservan: son parte del nombre que Pascal le da a la textura.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/material-es.test.ts`:

```ts
import { MATERIAL_CATALOG, MATERIAL_CATEGORIES } from '@pascal-app/core/material-library'
import { describe, expect, it } from 'vitest'
import { MATERIAL_CATEGORY_ES, MATERIAL_ES, materialCategoryEs, materialNameEs } from '../src/lib/material-es'

const IDS = MATERIAL_CATALOG.map((item) => item.id)
const words = (text: string) => text.toLowerCase().split(/[^a-záéíóúüñ]+/).filter((word) => word.length > 2)
// Palabras que se escriben igual en castellano y en inglés.
const SAME_IN_SPANISH = new Set(['beige', 'metal', 'bouclé', 'panel'])

describe('materiales en castellano', () => {
  it('cada material de la biblioteca de Pascal tiene nombre (si Pascal suma uno, esta prueba lo dice)', () => {
    expect(IDS.filter((id) => !(id in MATERIAL_ES))).toEqual([])
  })

  it('la tabla no guarda ids que Pascal no tiene (un error de tipeo no se queda mudo)', () => {
    const known = new Set(IDS)
    expect(Object.keys(MATERIAL_ES).filter((id) => !known.has(id))).toEqual([])
  })

  it('no hay dos materiales con el mismo nombre', () => {
    const names = Object.values(MATERIAL_ES)
    expect(names.filter((name, i) => names.indexOf(name) !== i)).toEqual([])
  })

  it('ningún nombre conserva palabras del inglés de la biblioteca', () => {
    const english = new Set(MATERIAL_CATALOG.flatMap((item) => words(item.label)))
    const kept = Object.entries(MATERIAL_ES).flatMap(([id, name]) =>
      words(name)
        .filter((word) => english.has(word) && !SAME_IN_SPANISH.has(word))
        .map((word) => `${id}: ${word}`),
    )
    expect(kept).toEqual([])
  })

  it('las 16 categorías tienen etiqueta y la conocida se lee en castellano', () => {
    expect(MATERIAL_CATEGORIES.filter((category) => !(category in MATERIAL_CATEGORY_ES))).toEqual([])
    expect(materialCategoryEs('tile')).toBe('Cerámica')
    expect(materialCategoryEs('inventada')).toBe('Otros')
    expect(materialNameEs('preset-white', 'White')).toBe('Blanco')
    expect(materialNameEs('no-existe', 'Mystery')).toBe('Mystery')
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run material-es`
Expected: FAIL — `Cannot find module '../src/lib/material-es'`.

- [ ] **Paso 2: Escribir la tabla**

Las traducciones siguen el castellano neutro del resto de la interfaz ("suelo", "azulejo", "cerámica", como en la maqueta de Materiales). Dos decisiones de significado: `Shingles` (tejas planas de asfalto) se escribe "tejas asfálticas" y `Drywall` (placa de yeso entre dos cartones) "placa de yeso".

Create `apps/web/src/lib/material-es.ts`:

```ts
/** Nombre en castellano de cada material de la biblioteca de Pascal (`MATERIAL_CATALOG`, 114 ítems). Los números son de la textura. */
export const MATERIAL_ES: Readonly<Record<string, string>> = {
  // Colores lisos
  'preset-white': 'Blanco',
  'preset-softwhite': 'Blanco suave',
  'preset-cream': 'Crema',
  'preset-beige': 'Beige',
  'preset-lightgrey': 'Gris claro',
  'preset-greige': 'Gris beige',
  'preset-midgrey': 'Gris medio',
  'preset-charcoal': 'Carbón',
  'preset-nearblack': 'Casi negro',
  'preset-blush': 'Rosa pálido',
  'preset-tomato': 'Tomate',
  'preset-brickred': 'Rojo ladrillo',
  'preset-oxblood': 'Burdeos',
  'preset-peach': 'Durazno',
  'preset-terracotta': 'Terracota',
  'preset-burntorange': 'Naranja quemado',
  'preset-clay': 'Arcilla',
  'preset-paleyellow': 'Amarillo pálido',
  'preset-mustard': 'Mostaza',
  'preset-ochre': 'Ocre',
  'preset-gold': 'Dorado',
  'preset-mint': 'Menta',
  'preset-sage': 'Salvia',
  'preset-olive': 'Oliva',
  'preset-forest': 'Verde bosque',
  'preset-paleteal': 'Verde azulado pálido',
  'preset-teal': 'Verde azulado',
  'preset-deepteal': 'Verde azulado oscuro',
  'preset-powderblue': 'Azul polvo',
  'preset-softblue': 'Azul suave',
  'preset-sky': 'Cielo',
  'preset-slateblue': 'Azul pizarra',
  'preset-royalblue': 'Azul rey',
  'preset-navy': 'Azul marino',
  'preset-lavender': 'Lavanda',
  'preset-plum': 'Ciruela',
  'preset-aubergine': 'Berenjena',
  'preset-petal': 'Pétalo',
  'preset-rose': 'Rosa',
  'preset-dustyrose': 'Rosa viejo',
  'preset-berry': 'Frambuesa',
  'preset-sand': 'Arena',
  'preset-tan': 'Marrón claro',
  'preset-taupe': 'Gris pardo',
  'preset-espresso': 'Café oscuro',
  // Madera
  'wood-finewood27': 'Madera fina 27',
  'wood-floorplank1': 'Tablón de suelo 1',
  'wood-hungarianparquet10': 'Parqué húngaro 10',
  'wood-hungarianparquet2': 'Parqué húngaro 2',
  'wood-squareparquet21': 'Parqué cuadrado 21',
  'wood-squareparquet23': 'Parqué cuadrado 23',
  'wood-woodfine1': 'Madera fina 1',
  'wood-woodfine11': 'Madera fina 11',
  'wood-woodfine13': 'Madera fina 13',
  'wood-woodfine2': 'Madera fina 2',
  'wood-woodfine22': 'Madera fina 22',
  'wood-woodfine24': 'Madera fina 24',
  'wood-woodparquet14': 'Parqué de madera 14',
  'wood-woodenparquet11': 'Parqué de madera 11',
  'wood-woodparquet121': 'Parqué de madera 121',
  'wood-woodparquet56': 'Parqué de madera 56',
  'wood-woodparquet65': 'Parqué de madera 65',
  'wood-woodparquet99': 'Parqué de madera 99',
  'wood-woodplank19': 'Tablón de madera 19',
  'wood-woodplank48': 'Tablón de madera 48',
  'flooring-woodparquet76': 'Parqué de madera 76',
  // Cerámica
  'flooring-tile85a': 'Baldosa de cantera',
  'flooring-pooltiles': 'Azulejos de piscina',
  'flooring-tiles3': 'Baldosas ajedrezadas',
  'flooring-tiles4': 'Baldosas en cuadrícula',
  'flooring-woodenceramic3': 'Cerámica símil madera 3',
  'flooring-ceramic53': 'Mosaico cerámico',
  'flooring-tile86': 'Baldosa de terracota',
  'flooring-darkceramic22': 'Cerámica oscura desgastada',
  'flooring-lightceramic24': 'Cerámica clara desgastada',
  'flooring-tile20': 'Baldosa mosaico',
  'flooring-tile68': 'Baldosa con dibujo',
  'flooring-woodenceramic2': 'Cerámica símil madera 2',
  // Ladrillo
  'flooring-rusticbrick': 'Ladrillo rústico',
  'flooring-agedbrick': 'Ladrillo envejecido',
  'flooring-weatheredbrick': 'Ladrillo desgastado',
  // Metal
  'flooring-garagedoor': 'Panel de garaje',
  'preset-metal': 'Metal',
  'metal-copper': 'Cobre',
  'metal-polished': 'Metal pulido',
  'metal-steel': 'Acero cepillado',
  'metal-brass': 'Latón',
  'metal-chrome': 'Cromo',
  // Piedra
  'flooring-greenlabradorite': 'Labradorita verde',
  'flooring-wallstone1': 'Muro de piedra',
  'flooring-terrazzo19': 'Terrazo',
  'flooring-tile79': 'Baldosa de piedra',
  'flooring-greenquartzitea': 'Cuarcita verde',
  'flooring-statuarettowhite': 'Estatuario blanco',
  // Tierra
  'flooring-ground13': 'Tierra',
  // Techos
  'roof-classicshingles': 'Tejas asfálticas clásicas',
  'roof-claytiles': 'Tejas de arcilla',
  'roof-terracottatiles': 'Tejas de terracota',
  'roof-weatheredshingles': 'Tejas asfálticas envejecidas',
  // Vidrio
  'preset-glass': 'Vidrio',
  // Tela
  'fabric-linen': 'Lino',
  'fabric-cotton': 'Algodón',
  'fabric-velvet': 'Terciopelo',
  'fabric-wool': 'Lana',
  'fabric-suede': 'Gamuza',
  'fabric-boucle': 'Bouclé',
  // Cuero
  'leather-black': 'Cuero negro',
  'leather-calf': 'Cuero de becerro',
  // Hormigón y yeso
  'concrete-plaster': 'Yeso pintado',
  'concrete-polished': 'Hormigón pulido',
  'concrete-raw': 'Hormigón en bruto',
  'concrete-plate': 'Placa de hormigón',
  'concrete-stucco': 'Estuco blanco',
  'concrete-drywall': 'Placa de yeso preparada',
}

/** Las 16 categorías de la biblioteca (hoy cuatro no traen materiales: igual se nombran por si Pascal las llena). */
export const MATERIAL_CATEGORY_ES: Readonly<Record<string, string>> = {
  colors: 'Colores',
  wood: 'Madera',
  stone: 'Piedra',
  brick: 'Ladrillo',
  tile: 'Cerámica',
  wallpaper: 'Papel tapiz',
  concrete: 'Hormigón',
  metal: 'Metal',
  plastic: 'Plástico',
  fabric: 'Tela',
  carpet: 'Alfombra',
  leather: 'Cuero',
  roofing: 'Techos',
  ground: 'Tierra',
  glass: 'Vidrio',
  other: 'Otros',
}

/** Nombre del material en castellano; si Pascal suma uno que la tabla no conoce, queda su nombre original. */
export const materialNameEs = (id: string, fallback: string) => MATERIAL_ES[id] ?? fallback

/** Etiqueta de la categoría de materiales en castellano (`Otros` si no la conoce). */
export const materialCategoryEs = (category: string) => MATERIAL_CATEGORY_ES[category] ?? 'Otros'
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run material-es`
Expected: PASS (5 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/lib/material-es.ts apps/web/test/material-es.test.ts
git commit -m "feat(editor): nombres en castellano para los 114 materiales y sus categorías" -- apps/web/src/lib/material-es.ts apps/web/test/material-es.test.ts
```
---

### Task 8b: Modelo del panel de materiales (superficie, categoría, muestras)

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/shell/materials-model.ts`
- Test: `apps/web/test/shell-materials-model.test.ts`

**Interfaces:**
- Consumes: `materialNameEs`, `materialCategoryEs` (8a).
- Produces (`materials-model.ts`, puro, sin Pascal):
  - `type MaterialItemLike = { id: string; label: string; category: string; surfaces?: readonly string[]; thumbnail?: string; color?: string }` (`surfaces` ausente = sirve para cualquier superficie, como los colores lisos).
  - `type SurfaceTabId = 'floor' | 'wall' | 'furniture' | 'roof'`, `SURFACE_TABS: readonly { id: SurfaceTabId; label: string; category: string }[]` (Suelo, Muros, Muebles, Techo, cada una con su categoría de partida), `DEFAULT_SURFACE: SurfaceTabId` (`'floor'`).
  - `materialsFor(items, tab): MaterialItemLike[]`, `categoriesFor(items, tab): { id: string; label: string }[]` (en orden fijo y solo las que tienen materiales), `resolveCategory(items, tab, wanted: string | null): string | null` y `swatchesFor(items, tab, category: string | null, selectedId: string | null): Swatch[]` con `type Swatch = { id: string; name: string; thumbnail?: string; color?: string; selected: boolean }`.

**Qué muestra cada pestaña.** Las pestañas de superficie del panel (Suelo, Muros, Muebles, Techo) son un **filtro** sobre la biblioteca de Pascal: usan el campo `surfaces` de cada material (`floor` 46, `wall` 36, `furniture` 22, `roof` 4; los 46 sin `surfaces`, colores lisos y vidrio, sirven en todas). Cada pestaña arranca en su categoría más usada (Suelo en Maderas, Muros en Colores, Muebles en Telas, Techo en Techos) y solo ofrece las categorías que tienen materiales. Todo es lógica pura: la lista de materiales la entrega el puente en la Tarea 8c y la dibuja el panel en la 8d.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-materials-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SURFACE,
  type MaterialItemLike,
  SURFACE_TABS,
  categoriesFor,
  materialsFor,
  resolveCategory,
  swatchesFor,
} from '../src/editor/shell/materials-model'

const ITEMS: MaterialItemLike[] = [
  { id: 'preset-white', label: 'White', category: 'colors', color: '#e9e9e9' },
  { id: 'preset-cream', label: 'Cream', category: 'colors', color: '#f3ead2' },
  { id: 'preset-beige', label: 'Beige', category: 'colors', color: '#d9c7a3' },
  { id: 'wood-woodfine11', label: 'Wood Fine 11', category: 'wood', surfaces: ['floor', 'wall', 'furniture'], thumbnail: '/material/wood/11.webp' },
  { id: 'wood-woodfine2', label: 'Wood Fine 2', category: 'wood', surfaces: ['floor', 'wall', 'furniture'], thumbnail: '/material/wood/2.webp' },
  { id: 'flooring-tile20', label: 'Mosaic Tile', category: 'tile', surfaces: ['floor'] },
  { id: 'fabric-linen', label: 'Linen', category: 'fabric', surfaces: ['furniture', 'wall'] },
  { id: 'roof-claytiles', label: 'Clay Tiles', category: 'roofing', surfaces: ['roof'] },
]

describe('materialsFor', () => {
  it('trae los de esa superficie y los lisos que sirven para cualquiera', () => {
    expect(materialsFor(ITEMS, 'floor').map((m) => m.id)).toEqual([
      'preset-white', 'preset-cream', 'preset-beige', 'wood-woodfine11', 'wood-woodfine2', 'flooring-tile20',
    ])
    expect(materialsFor(ITEMS, 'roof').map((m) => m.id)).toEqual(['preset-white', 'preset-cream', 'preset-beige', 'roof-claytiles'])
  })
})

describe('categoriesFor y resolveCategory', () => {
  it('lista solo las categorías con materiales, en un orden fijo y en castellano', () => {
    expect(categoriesFor(ITEMS, 'floor')).toEqual([
      { id: 'wood', label: 'Madera' },
      { id: 'tile', label: 'Cerámica' },
      { id: 'colors', label: 'Colores' },
    ])
    expect(categoriesFor(ITEMS, 'wall').map((c) => c.id)).toEqual(['wood', 'fabric', 'colors'])
  })

  it('parte de la categoría propia de la superficie y, si no hay, de la primera disponible', () => {
    expect(resolveCategory(ITEMS, 'floor', null)).toBe('wood')
    expect(resolveCategory(ITEMS, 'wall', null)).toBe('colors')
    expect(resolveCategory(ITEMS, 'roof', null)).toBe('roofing')
    expect(resolveCategory(ITEMS.filter((m) => m.category !== 'wood'), 'floor', null)).toBe('tile')
    expect(resolveCategory([], 'floor', null)).toBeNull()
  })

  it('conserva la categoría pedida si existe en la superficie y la cambia si no', () => {
    expect(resolveCategory(ITEMS, 'floor', 'tile')).toBe('tile')
    expect(resolveCategory(ITEMS, 'roof', 'tile')).toBe('roofing')
  })
})

describe('swatchesFor', () => {
  it('muestra el nombre en castellano, la imagen o el color y marca el elegido', () => {
    const swatches = swatchesFor(ITEMS, 'floor', 'colors', 'preset-cream')
    expect(swatches.map((s) => [s.id, s.name, s.selected])).toEqual([
      ['preset-white', 'Blanco', false],
      ['preset-cream', 'Crema', true],
      ['preset-beige', 'Beige', false],
    ])
    expect(swatches[0]?.color).toBe('#e9e9e9')
  })

  it('ordena por nombre con los números en orden (2 antes que 11), salvo los colores, que siguen el orden de Pascal', () => {
    expect(swatchesFor(ITEMS, 'floor', 'wood', null).map((s) => s.name)).toEqual(['Madera fina 2', 'Madera fina 11'])
    expect(swatchesFor(ITEMS, 'floor', 'wood', null)[0]?.thumbnail).toBe('/material/wood/2.webp')
  })

  it('sin categoría no hay muestras', () => {
    expect(swatchesFor(ITEMS, 'floor', null, null)).toEqual([])
  })
})

describe('SURFACE_TABS', () => {
  it('son cuatro, con su rótulo y arrancan en Suelo', () => {
    expect(SURFACE_TABS.map((t) => t.label)).toEqual(['Suelo', 'Muros', 'Muebles', 'Techo'])
    expect(DEFAULT_SURFACE).toBe('floor')
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-materials-model`
Expected: FAIL — `Cannot find module '../src/editor/shell/materials-model'`.

- [ ] **Paso 2: Escribir el modelo**

Create `apps/web/src/editor/shell/materials-model.ts`:

```ts
import { materialCategoryEs, materialNameEs } from '@/lib/material-es'

/** Un material de la biblioteca de Pascal con lo que necesita el panel. `surfaces` ausente = sirve en cualquier superficie. */
export type MaterialItemLike = {
  id: string
  label: string
  category: string
  surfaces?: readonly string[]
  thumbnail?: string
  color?: string
}

export type SurfaceTabId = 'floor' | 'wall' | 'furniture' | 'roof'
export type Swatch = { id: string; name: string; thumbnail?: string; color?: string; selected: boolean }

/** Pestañas del panel (el diseño 17 muestra Suelo y Muros): filtran por `surfaces` y arrancan en su categoría más usada. */
export const SURFACE_TABS: readonly { id: SurfaceTabId; label: string; category: string }[] = [
  { id: 'floor', label: 'Suelo', category: 'wood' },
  { id: 'wall', label: 'Muros', category: 'colors' },
  { id: 'furniture', label: 'Muebles', category: 'fabric' },
  { id: 'roof', label: 'Techo', category: 'roofing' },
]
export const DEFAULT_SURFACE: SurfaceTabId = 'floor'

/** Orden fijo de las categorías en las fichas (las que Pascal agregue más adelante van al final). */
const CATEGORY_ORDER = [
  'wood', 'stone', 'tile', 'brick', 'concrete', 'metal', 'fabric', 'leather',
  'roofing', 'ground', 'glass', 'wallpaper', 'plastic', 'carpet', 'colors', 'other',
]

/** Los materiales que sirven para esa superficie: los suyos y los lisos, que sirven para cualquiera. */
export function materialsFor(items: readonly MaterialItemLike[], tab: SurfaceTabId): MaterialItemLike[] {
  return items.filter((item) => !item.surfaces || item.surfaces.includes(tab))
}

export function categoriesFor(items: readonly MaterialItemLike[], tab: SurfaceTabId): { id: string; label: string }[] {
  const present = new Set(materialsFor(items, tab).map((item) => item.category))
  const known = CATEGORY_ORDER.filter((id) => present.has(id))
  const extra = [...present].filter((id) => !CATEGORY_ORDER.includes(id))
  return [...known, ...extra].map((id) => ({ id, label: materialCategoryEs(id) }))
}

/** La categoría a mostrar: la pedida si la superficie la tiene; si no, la de partida de la superficie; si no, la primera. */
export function resolveCategory(items: readonly MaterialItemLike[], tab: SurfaceTabId, wanted: string | null): string | null {
  const available = categoriesFor(items, tab).map((c) => c.id)
  const home = SURFACE_TABS.find((t) => t.id === tab)?.category
  for (const candidate of [wanted, home]) if (candidate && available.includes(candidate)) return candidate
  return available[0] ?? null
}

const byName = new Intl.Collator('es', { numeric: true })

export function swatchesFor(
  items: readonly MaterialItemLike[],
  tab: SurfaceTabId,
  category: string | null,
  selectedId: string | null,
): Swatch[] {
  const swatches = materialsFor(items, tab)
    .filter((item) => item.category === category)
    .map((item) => ({
      id: item.id,
      name: materialNameEs(item.id, item.label),
      thumbnail: item.thumbnail,
      color: item.color,
      selected: item.id === selectedId,
    }))
  // Los colores siguen el orden de Pascal (por tono); el resto, por nombre con los números en orden.
  return category === 'colors' ? swatches : swatches.sort((a, b) => byName.compare(a.name, b.name))
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-materials-model shell-boundaries`
Expected: PASS (`shell-materials-model`: 8 pruebas; `shell-boundaries` sigue verde: `materials-model.ts` no importa Pascal).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/materials-model.ts apps/web/test/shell-materials-model.test.ts
git commit -m "feat(editor): modelo del panel de materiales (superficies, categorías y muestras)" -- apps/web/src/editor/shell/materials-model.ts apps/web/test/shell-materials-model.test.ts
```

---

### Task 8c: Elegir un material por el puente

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/shell/bridge/materials.ts`
- Modify: `apps/web/src/editor/shell/bridge/index.ts`, `apps/web/src/editor/pascal-bridge.ts`, `apps/web/test/support/fake-deps.ts`
- Test: `apps/web/test/shell-bridge-materials.test.ts`

**Interfaces:**
- Consumes: `MaterialItemLike` (8b); `CoreDeps` del puente, `createBridge` y `BridgeDeps` (4a); `createFakeDeps` (4a).
- Produces:
  - Del puente (`bridge/materials.ts`): `type MaterialsModelLike = { items: readonly MaterialItemLike[]; selectedId: string | null; select(id: string): void }`, `type MaterialsDeps = { useMaterialsModel(): MaterialsModelLike }`, `createMaterialsSlice(deps)` con el **hook** `useMaterials(): MaterialsModelLike` (en Ver, `select` no hace nada). `BridgeDeps = CoreDeps & ModeDeps & LevelsDeps & CatalogDeps & MaterialsDeps`.
  - En `pascal-bridge.ts`: `materialsDeps()`: `useMaterialsModel` envuelve `useMaterialPaintPanelModel()` de Pascal (`activePaintMaterial`, `selectMaterial(ref)`) y la lista fija `MATERIAL_CATALOG` de `@pascal-app/core` (solo las de origen `pascal`; los materiales "míos" y "de la comunidad" son de otra función).

**Cómo pinta Pascal** (verificado en `lib/material-paint-panel-model.ts` y `components/editor/selection-manager.tsx`): `selectMaterial('library:<id>')` llama a `armMaterialPaint({ materialPreset, sourceTarget: activePaintTarget })`, que deja el modo en `material-paint` con ese material; después cada clic sobre una superficie del lienzo lo aplica (el muro, la losa, el mueble… lo decide el nodo bajo el cursor, no la pestaña). Las pestañas de superficie del panel (Suelo, Muros, Muebles, Techo) son un **filtro** sobre la biblioteca: usan el campo `surfaces` de cada material (`floor` 46, `wall` 36, `furniture` 22, `roof` 4; los 46 sin `surfaces`, colores lisos y vidrio, sirven en todas). El hook `useMaterialPaintPanelModel` mantiene además `activePaintTarget` según lo que esté seleccionado, igual que su panel original.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-bridge-materials.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { createFakeDeps } from './support/fake-deps'

describe('createMaterialsSlice', () => {
  it('useMaterials entrega la biblioteca y el material armado', () => {
    const { deps } = createFakeDeps()
    const model = createBridge(deps).useMaterials()
    expect(model.items.map((m) => m.id)).toContain('preset-white')
    expect(model.selectedId).toBeNull()
  })

  it('elegir un material lo arma para pintar', () => {
    const { deps } = createFakeDeps()
    createBridge(deps).useMaterials().select('wood-woodfine1')
    expect(deps.useMaterialsModel().select).toHaveBeenCalledWith('wood-woodfine1')
  })

  it('en Ver no se elige ninguno', () => {
    const { deps, scene } = createFakeDeps()
    scene.setState({ readOnly: true })
    createBridge(deps).useMaterials().select('wood-woodfine1')
    expect(deps.useMaterialsModel().select).not.toHaveBeenCalled()
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-materials`
Expected: FAIL — `TypeError: createBridge(...).useMaterials is not a function` (el puente todavía no tiene la porción de materiales).

- [ ] **Paso 2: La porción de materiales del puente, su doble y la conexión con Pascal**

Create `apps/web/src/editor/shell/bridge/materials.ts`:

```ts
import type { MaterialItemLike } from '../materials-model'
import type { CoreDeps } from './core'

export type MaterialsModelLike = {
  items: readonly MaterialItemLike[]
  /** Id (sin el prefijo `library:`) del material armado para pintar, o `null`. */
  selectedId: string | null
  select(id: string): void
}

export type MaterialsDeps = {
  /** Hook de Pascal: `useMaterialPaintPanelModel` + la lista fija de la biblioteca (ver `pascal-bridge.ts`). */
  useMaterialsModel(): MaterialsModelLike
}

export function createMaterialsSlice(deps: CoreDeps & MaterialsDeps) {
  return {
    /** Hook de lectura para el panel de materiales. En Ver, elegir un material no hace nada. */
    useMaterials(): MaterialsModelLike {
      const model = deps.useMaterialsModel()
      return {
        ...model,
        select(id: string) {
          if (!deps.scene.getState().readOnly) model.select(id)
        },
      }
    },
  }
}
```

Modify `apps/web/src/editor/shell/bridge/index.ts`:

```diff
@@
 import { type CoreDeps, createCoreSlice } from './core'
+import { type MaterialsDeps, createMaterialsSlice } from './materials'
@@
-export type BridgeDeps = CoreDeps & ModeDeps & LevelsDeps & CatalogDeps
+export type BridgeDeps = CoreDeps & ModeDeps & LevelsDeps & CatalogDeps & MaterialsDeps
@@
     ...createCatalogSlice(deps),
+    ...createMaterialsSlice(deps),
     // @@slices
```


Modify `apps/web/test/support/fake-deps.ts`:

```diff
@@
+import type { MaterialItemLike } from '../../src/editor/shell/materials-model'
+
+/** Biblioteca de materiales de mentira: un color liso, una madera y un techo. */
+export const FAKE_MATERIALS: MaterialItemLike[] = [
+  { id: 'preset-white', label: 'White', category: 'colors', color: '#e9e9e9' },
+  { id: 'wood-woodfine1', label: 'Wood Fine 1', category: 'wood', surfaces: ['floor', 'wall', 'furniture'], thumbnail: '/material/wood/1.webp' },
+  { id: 'roof-claytiles', label: 'Clay Tiles', category: 'roofing', surfaces: ['roof'] },
+]
+
 export function createFakeStore<S extends object>(initial: S) {
@@
   const showHint = vi.fn()
+  const materials = { items: FAKE_MATERIALS, selectedId: null as string | null, select: vi.fn() }
@@
+    // El mismo objeto en cada llamada: las pruebas miran `deps.useMaterialsModel().select`.
+    useMaterialsModel: vi.fn(() => materials),
     // @@fake-deps
```


Modify `apps/web/src/editor/pascal-bridge.ts`:

```diff
@@
 import type { CatalogDeps } from './shell/bridge/catalog'
+import type { MaterialsDeps } from './shell/bridge/materials'
+import type { MaterialItemLike } from './shell/materials-model'
@@
+/** La biblioteca de materiales de Pascal (solo los suyos; los "míos" y los de la comunidad son de otra función). */
+const MATERIAL_LIBRARY: readonly MaterialItemLike[] = Core.MATERIAL_CATALOG.filter(
+  (item) => (item.source ?? 'pascal') === 'pascal',
+).map((item) => ({
+  id: item.id,
+  label: item.label,
+  category: item.category,
+  surfaces: item.surfaces,
+  thumbnail: item.previewThumbnailUrl,
+  color: item.previewColor,
+}))
+
+function materialsDeps(): MaterialsDeps {
+  return {
+    useMaterialsModel() {
+      const paint = Pascal.useMaterialPaintPanelModel()
+      return {
+        items: MATERIAL_LIBRARY,
+        selectedId: Core.getLibraryMaterialIdFromRef(paint.activePaintMaterial?.materialPreset),
+        select: (id) => paint.selectMaterial(Core.toLibraryMaterialRef(id)),
+      }
+    },
+  }
+}
+
 export function createPascalBridge(): ShellBridge {
@@
     ...catalogDeps(),
+    ...materialsDeps(),
     // @@deps
```


- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-materials shell-materials-model shell-boundaries`
Expected: PASS (`shell-bridge-materials`: 3 pruebas; `shell-boundaries` sigue verde: `bridge/materials.ts` no importa Pascal).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos. Si `tsc` marca `Core.MATERIAL_CATALOG`, `Core.getLibraryMaterialIdFromRef` o `Core.toLibraryMaterialRef`, confirma el nombre con `grep -n "getLibraryMaterialIdFromRef" apps/web/node_modules/@pascal-app/core/dist/index.d.ts` (están en la línea 33, verificadas al escribir el plan).

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/bridge/materials.ts apps/web/src/editor/shell/bridge/index.ts apps/web/src/editor/pascal-bridge.ts apps/web/test/support/fake-deps.ts apps/web/test/shell-bridge-materials.test.ts
git commit -m "feat(editor): elegir un material por el puente (Pascal pinta con el cursor)" -- apps/web/src/editor/shell/bridge/materials.ts apps/web/src/editor/shell/bridge/index.ts apps/web/src/editor/pascal-bridge.ts apps/web/test/support/fake-deps.ts apps/web/test/shell-bridge-materials.test.ts
```

---

### Task 8d: Panel de materiales (catálogo presentacional y panel conectado)

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/ui/MaterialsCatalog.tsx`, `apps/web/src/editor/shell/MaterialsPanel.tsx`
- Test: `apps/web/test/shell-materials-panel.test.tsx`

**Interfaces:**
- Consumes: `ChipRow`, `FLOAT`, `SIDE_PANEL` (`./primitives`, Tarea 1b) y `SoonButton` (`./status`, 1c); `Swatch`, `SURFACE_TABS`, `DEFAULT_SURFACE`, `SurfaceTabId`, `categoriesFor`, `resolveCategory`, `swatchesFor` (8b); `bridge.useMaterials()` (8c).
- Produces:
  - `MaterialsCatalog(props: { tabs: readonly { value: string; label: string }[]; tab: string; onTab: (value: string) => void; categories: readonly { value: string; label: string }[]; category: string | null; onCategory: (value: string) => void; swatches: readonly Swatch[]; onPick: (id: string) => void })`: presentacional, `<aside aria-label="Materiales">`. "Color personalizado" es un `SoonButton`.
  - `MaterialsPanel()`: conectado; guarda la pestaña y la categoría pedida en su estado (la categoría se conserva al cambiar de pestaña si la nueva la tiene).

**Decisión sobre "Color personalizado" (diseño 17).** Pascal lo resuelve creando un material de escena y editándolo con su panel en inglés (`createCustomMaterial` solo lo crea en blanco). Aquí queda visible pero **deshabilitado con "Pronto"** (D4): no es de los cuatro botones que el spec manda mostrar así, y se agrega a la lista por el mismo criterio. El texto del recuadro de ayuda reemplaza a "Se aplica al suelo de Sala de estar" del diseño: Pascal decide qué superficie se pinta por lo que está bajo el cursor, no por la pestaña, así que el panel no puede anunciar un destino que no controla.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-materials-panel.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import type { Swatch } from '../src/editor/shell/materials-model'
import { MaterialsPanel } from '../src/editor/shell/MaterialsPanel'
import { MaterialsCatalog } from '../src/editor/shell/ui/MaterialsCatalog'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const noop = () => undefined
const TABS = [
  { value: 'floor', label: 'Suelo' },
  { value: 'wall', label: 'Muros' },
]
const CATEGORIES = [
  { value: 'wood', label: 'Madera' },
  { value: 'colors', label: 'Colores' },
]
const SWATCHES: Swatch[] = [
  { id: 'wood-woodfine1', name: 'Madera fina 1', thumbnail: '/material/wood/1.webp', selected: true },
  { id: 'preset-white', name: 'Blanco', color: '#e9e9e9', selected: false },
]
const catalog = (swatches: readonly Swatch[]) =>
  renderToStaticMarkup(
    <MaterialsCatalog tabs={TABS} tab="floor" onTab={noop} categories={CATEGORIES} category="wood" onCategory={noop} swatches={swatches} onPick={noop} />,
  )

describe('MaterialsCatalog', () => {
  it('muestra el título, las superficies, las categorías y cada muestra con su nombre', () => {
    const markup = catalog(SWATCHES)
    const text = textOf(markup)
    for (const word of ['Materiales', 'Suelo', 'Muros', 'Madera', 'Colores', 'Madera fina 1', 'Blanco']) expect(text).toContain(word)
    expect(markup).toContain('aria-label="Materiales"')
  })

  it('marca la superficie y la categoría activas, y la muestra elegida; la de color liso pinta su cuadro', () => {
    const markup = catalog(SWATCHES)
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(3) // Suelo, Madera y la muestra elegida
    expect(markup).toContain('src="/material/wood/1.webp"')
    expect(markup).toContain('background-color:#e9e9e9')
  })

  it('"Color personalizado" está deshabilitado con "Pronto"', () => {
    const markup = catalog(SWATCHES)
    expect(textOf(markup)).toContain('Color personalizado')
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?Color personalizado/)
    expect(textOf(markup)).toContain('Pronto')
  })

  it('sin muestras avisa en castellano en lugar de dejar la grilla vacía', () => {
    expect(textOf(catalog([]))).toContain('No hay materiales para esta superficie.')
  })
})

describe('MaterialsPanel', () => {
  const render = (setup?: (model: ReturnType<ReturnType<typeof createFakeDeps>['deps']['useMaterialsModel']>) => void) => {
    const { deps } = createFakeDeps()
    setup?.(deps.useMaterialsModel())
    return renderToStaticMarkup(
      <BridgeProvider bridge={createBridge(deps)}>
        <MaterialsPanel />
      </BridgeProvider>,
    )
  }

  it('arranca en Suelo y Madera, con los nombres en castellano y sin el inglés de Pascal', () => {
    const markup = render()
    const text = textOf(markup)
    for (const word of ['Suelo', 'Muros', 'Muebles', 'Techo', 'Madera', 'Madera fina 1']) expect(text).toContain(word)
    expect(text).not.toMatch(/Wood Fine|White|Clay Tiles/)
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(2) // Suelo y Madera
  })

  it('marca el material que Pascal tiene armado para pintar', () => {
    const markup = render((model) => {
      model.selectedId = 'wood-woodfine1'
    })
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(3) // Suelo, Madera y la muestra
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-materials-panel`
Expected: FAIL — `Cannot find module '../src/editor/shell/MaterialsPanel'`.

- [ ] **Paso 2: Escribir el catálogo presentacional y el panel conectado**

Create `apps/web/src/editor/shell/ui/MaterialsCatalog.tsx`:

```tsx
import { Check, Palette } from 'lucide-react'
import { cx } from '@/lib/cx'
import type { Swatch } from '../materials-model'
import { ChipRow, FLOAT, SIDE_PANEL } from './primitives'
import { SoonButton } from './status'

type Option = { value: string; label: string }

function SwatchTile({ swatch, onPick }: { swatch: Swatch; onPick: (id: string) => void }) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={swatch.selected}
        onClick={() => onPick(swatch.id)}
        className="focus-ring flex w-full cursor-pointer flex-col gap-1.5 rounded-[18px] p-1.5 text-left transition-colors duration-150 ease-out hover:bg-ink/5"
      >
        <span
          className={cx(
            'relative block aspect-square w-full overflow-hidden rounded-[14px]',
            swatch.selected ? 'ring-2 ring-ink ring-offset-2' : 'ring-1 ring-ink/10',
          )}
          style={swatch.thumbnail ? undefined : { backgroundColor: swatch.color ?? '#F1F5FC' }}
        >
          {swatch.thumbnail && (
            // biome-ignore lint/performance/noImgElement: texturas propias de Pascal ya optimizadas (webp)
            <img
              src={swatch.thumbnail}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className="absolute inset-0 size-full object-cover"
            />
          )}
          {swatch.selected && (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-ink text-white"
            >
              <Check className="size-4" strokeWidth={2.5} />
            </span>
          )}
        </span>
        <span className="block px-0.5 text-[12.5px] font-medium leading-tight text-ink">{swatch.name}</span>
      </button>
    </li>
  )
}

/** Panel izquierdo del modo Materiales: superficie, categoría y muestras; "Color personalizado" llega en una próxima versión. */
export function MaterialsCatalog({
  tabs,
  tab,
  onTab,
  categories,
  category,
  onCategory,
  swatches,
  onPick,
}: {
  tabs: readonly Option[]
  tab: string
  onTab: (value: string) => void
  categories: readonly Option[]
  category: string | null
  onCategory: (value: string) => void
  swatches: readonly Swatch[]
  onPick: (id: string) => void
}) {
  return (
    <aside aria-label="Materiales" className={cx(FLOAT, SIDE_PANEL)}>
      <h2 className="font-display text-[22px] font-semibold leading-none">Materiales</h2>
      <div className="mt-3.5">
        <ChipRow title="Superficie" chips={tabs} active={tab} onPick={onTab} />
      </div>
      <p className="mt-3 rounded-[14px] bg-brand-wash px-3 py-2 text-[13px] leading-snug text-ink">
        Elige un material y haz clic en lo que quieras pintar.
      </p>
      <div className="mt-3">
        <ChipRow title="Categoría" chips={categories} active={category ?? ''} onPick={onCategory} />
      </div>
      {swatches.length === 0 ? (
        <p className="mt-4 text-[14px] text-ink-muted">No hay materiales para esta superficie.</p>
      ) : (
        <ul className="shell-scroll mt-3.5 grid min-h-0 flex-1 grid-cols-3 content-start gap-1 overflow-y-auto pb-1 pr-0.5">
          {swatches.map((swatch) => (
            <SwatchTile key={swatch.id} swatch={swatch} onPick={onPick} />
          ))}
        </ul>
      )}
      <div className="mt-3 flex">
        <SoonButton icon={Palette} label="Color personalizado" />
      </div>
    </aside>
  )
}
```

Create `apps/web/src/editor/shell/MaterialsPanel.tsx`:

```tsx
'use client'

import { useState } from 'react'
import {
  DEFAULT_SURFACE,
  SURFACE_TABS,
  type SurfaceTabId,
  categoriesFor,
  resolveCategory,
  swatchesFor,
} from './materials-model'
import { MaterialsCatalog } from './ui/MaterialsCatalog'
import { useBridge } from './use-bridge'

const TABS = SURFACE_TABS.map((tab) => ({ value: tab.id, label: tab.label }))

/** Panel de materiales del modo Editar. Elegir una muestra arma la pintura con ese material (después se hace clic en lo que se quiera pintar). */
export function MaterialsPanel() {
  const { items, selectedId, select } = useBridge().useMaterials()
  const [tab, setTab] = useState<SurfaceTabId>(DEFAULT_SURFACE)
  const [wanted, setWanted] = useState<string | null>(null)
  const category = resolveCategory(items, tab, wanted)
  return (
    <MaterialsCatalog
      tabs={TABS}
      tab={tab}
      onTab={(value) => setTab(value as SurfaceTabId)}
      categories={categoriesFor(items, tab).map((c) => ({ value: c.id, label: c.label }))}
      category={category}
      onCategory={setWanted}
      swatches={swatchesFor(items, tab, category, selectedId)}
      onPick={select}
    />
  )
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-materials-panel shell-materials-model shell-bridge-materials shell-boundaries`
Expected: PASS (`shell-materials-panel`: 6 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/ui/MaterialsCatalog.tsx apps/web/src/editor/shell/MaterialsPanel.tsx apps/web/test/shell-materials-panel.test.tsx
git commit -m "feat(editor): panel de materiales en castellano con superficies, categorías y muestras" -- apps/web/src/editor/shell/ui/MaterialsCatalog.tsx apps/web/src/editor/shell/MaterialsPanel.tsx apps/web/test/shell-materials-panel.test.tsx
```

---

### Task 8e: El panel de materiales en el shell y sus pruebas en navegador

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/e2e/materiales.spec.ts`
- Modify: `apps/web/src/editor/shell/dock-model.ts` (`leftPanelFor` suma `'materials'`), `apps/web/src/editor/shell/LeftPanel.tsx`, `apps/web/src/editor/e2e-hooks.ts` (`state()` suma `paintMaterial`), `apps/web/test/shell-left-panel.test.tsx`
- Test: `apps/web/test/shell-left-panel.test.tsx`, `apps/web/e2e/materiales.spec.ts` (navegador real)

**Interfaces:**
- Consumes: `MaterialsPanel` (8d); `leftPanelFor`, `activeDockId` (5a, 7d); `LeftPanel` (7d); `createBlankProject` (4f); `hook` (3b); `dockButton` y `modeButton` (4f, 5f).
- Produces:
  - `leftPanelFor(id: DockId | null): 'levels' | 'furniture' | 'materials'`; `window.__e2e.state().paintMaterial: string | null` (el `materialPreset` que Pascal tiene armado, por ejemplo `library:wood-woodfine1`).

Con esta tarea el botón Materiales del dock abre el panel que se hizo en la 8d (criterio 7 del spec para los materiales). La prueba en navegador mira los textos y que elegir una muestra arme la pintura de Pascal; pintar de verdad se comprueba a mano porque Pascal pinta con el cursor.

- [ ] **Paso 1: Escribir la prueba del panel izquierdo (rojo)**

Modify `apps/web/test/shell-left-panel.test.tsx`:

```diff
@@
-  it('Muebles trae el catálogo; todo lo demás deja las plantas y ambientes', () => {
-    expect(leftPanelFor('furniture')).toBe('furniture')
-    for (const id of ['select', 'structure', 'openings', 'materials', 'measure', 'more', null] as const) {
+  it('Muebles trae el catálogo, Materiales las muestras y todo lo demás las plantas y ambientes', () => {
+    expect(leftPanelFor('furniture')).toBe('furniture')
+    expect(leftPanelFor('materials')).toBe('materials')
+    for (const id of ['select', 'structure', 'openings', 'measure', 'more', null] as const) {
@@
+  it('con la pintura armada muestra los materiales', () => {
+    const markup = leftOf(({ editor }) => editor.setState({ mode: 'material-paint', tool: null }))
+    expect(markup).toContain('aria-label="Materiales"')
+    expect(markup).not.toContain('aria-label="Nivel y ambientes"')
+  })
+
   it('en Ver siempre muestra plantas y ambientes, aunque la herramienta de muebles estuviera armada', () => {
```



Run: `pnpm --filter @interiores/web exec vitest run shell-left-panel`
Expected: FAIL — en `shell-left-panel`, `expected 'levels' to be 'materials'`.

- [ ] **Paso 2: Montar el panel según el botón del dock**

Modify `apps/web/src/editor/shell/dock-model.ts`:

```diff
@@
-export function leftPanelFor(id: DockId | null): 'levels' | 'furniture' {
-  return id === 'furniture' ? 'furniture' : 'levels'
+export function leftPanelFor(id: DockId | null): 'levels' | 'furniture' | 'materials' {
+  if (id === 'furniture' || id === 'materials') return id
+  return 'levels'
 }
```


Modify `apps/web/src/editor/shell/LeftPanel.tsx`:

```diff
@@
 import { LevelsPanel } from './LevelsPanel'
+import { MaterialsPanel } from './MaterialsPanel'
@@
-/** Panel izquierdo: lo manda el dock (Muebles trae el catálogo; lo demás, plantas y ambientes). En Ver, siempre plantas y ambientes. */
+/** Panel izquierdo: lo manda el dock (Muebles trae el catálogo, Materiales las muestras; lo demás, plantas y ambientes). En Ver, siempre plantas y ambientes. */
@@
-  return panel === 'furniture' ? <FurniturePanel items={catalog} /> : <LevelsPanel />
+  if (panel === 'furniture') return <FurniturePanel items={catalog} />
+  if (panel === 'materials') return <MaterialsPanel />
+  return <LevelsPanel />
```


Modify `apps/web/src/editor/e2e-hooks.ts`:

```diff
@@
         snapItem: editor.snappingModeByContext.item,
+        paintMaterial: editor.activePaintMaterial?.materialPreset ?? null,
```


- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-left-panel shell-materials-panel shell-boundaries`
Expected: PASS (`shell-left-panel`: 7 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Pruebas en navegador (rojo, luego verde)**

Create `apps/web/e2e/materiales.spec.ts`:

```ts
import { type Page, expect, test } from '@playwright/test'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { dockButton, modeButton } from './support/shell'

const ENGLISH = /\b(Wood|Floor|Plank|Parquet|Tiles?|White|Black|Brick|Stone|Glass|Linen|Leather|Concrete|Shingles|Steel)\b/

const paintMaterial = async (page: Page) => (await hook(page, 'state')).paintMaterial

test('Materiales abre el panel en castellano; elegir una muestra arma la pintura con ese material', async ({ page }) => {
  await createBlankProject(page, 'materiales')
  await dockButton(page, 'Materiales').click()
  const panel = page.getByRole('complementary', { name: 'Materiales' })
  await expect(panel).toBeVisible({ timeout: 15_000 })
  expect(await hook(page, 'state')).toMatchObject({ mode: 'material-paint', tool: null, paintMaterial: null })
  expect(await panel.innerText()).not.toMatch(ENGLISH)
  const wood = panel.getByRole('button', { name: 'Madera fina 1', exact: true })
  await wood.click()
  await expect.poll(() => paintMaterial(page)).toBe('library:wood-woodfine1')
  await expect(wood).toHaveAttribute('aria-pressed', 'true')
  await expect(dockButton(page, 'Materiales')).toHaveAttribute('aria-pressed', 'true')
})

test('cada superficie parte de su categoría: Muros en Colores, Techo en Techos', async ({ page }) => {
  await createBlankProject(page, 'superficies')
  await dockButton(page, 'Materiales').click()
  const panel = page.getByRole('complementary', { name: 'Materiales' })
  await expect(panel.getByRole('button', { name: 'Madera', exact: true })).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 })
  await panel.getByRole('button', { name: 'Muros', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Colores', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await panel.getByRole('button', { name: 'Blanco', exact: true }).click()
  await expect.poll(() => paintMaterial(page)).toBe('library:preset-white')
  await panel.getByRole('button', { name: 'Techo', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Techos', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(panel.getByRole('button', { name: 'Tejas de arcilla', exact: true })).toBeVisible()
})

test('al volver a Seleccionar o pasar a Ver el panel de materiales cede su lugar a las plantas y los ambientes', async ({ page }) => {
  await createBlankProject(page, 'panel materiales')
  const materials = page.getByRole('complementary', { name: 'Materiales' })
  const levels = page.getByRole('complementary', { name: 'Nivel y ambientes' })
  await dockButton(page, 'Materiales').click()
  await expect(materials).toBeVisible({ timeout: 15_000 })
  await expect(levels).toHaveCount(0)
  await dockButton(page, 'Seleccionar').click()
  await expect(levels).toBeVisible()
  await expect(materials).toHaveCount(0)
  await dockButton(page, 'Materiales').click()
  await modeButton(page, 'Ver').click()
  await expect(levels).toBeVisible()
  await expect(materials).toHaveCount(0)
})
```

Run (Supabase local arriba: `pnpm db:start && pnpm db:env`): `pnpm --filter @interiores/web e2e e2e/materiales.spec.ts`
Expected: PASS (3 pruebas). Antes de los Pasos 1 y 2 fallan: el botón "Materiales" del dock no abre ningún panel.

Comprobación a mano (Pascal pinta con el cursor y eso no se automatiza con píxeles): en un proyecto con un muro, abre Materiales › Muros › Colores, elige "Blanco" y haz clic sobre el muro.
Expected: el muro cambia de color; Deshacer (o Ctrl+Z) lo revierte.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/dock-model.ts apps/web/src/editor/shell/LeftPanel.tsx apps/web/src/editor/e2e-hooks.ts apps/web/test/shell-left-panel.test.tsx apps/web/e2e/materiales.spec.ts
git commit -m "feat(editor): el botón Materiales del dock abre el panel de materiales" -- apps/web/src/editor/shell/dock-model.ts apps/web/src/editor/shell/LeftPanel.tsx apps/web/src/editor/e2e-hooks.ts apps/web/test/shell-left-panel.test.tsx apps/web/e2e/materiales.spec.ts
```

---

### Task 9a: Modelo de propiedades (1 de 4): metros, límites, tipos y aviso de borrado

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/properties-model.ts`, `apps/web/test/support/properties.ts`
- Test: `apps/web/test/shell-properties-model.test.ts`

**Interfaces:**
- Consumes: `FieldView` de `./ui/PropertiesCard` (1h); `SceneNodeLike` de `./bridge/types` (4a).
- Produces (`src/editor/shell/properties-model.ts`, puro: sin Pascal ni React):
  - `type PropNode = SceneNodeLike & Record<string, unknown>` (un nodo con los campos que el panel lee), `type PropTarget = { node: PropNode; hostLength: number | null; descendants: number }` (el elemento elegido, el largo en metros del muro que lo aloja si es una puerta o ventana, y cuántos elementos cuelgan de él) y `type Patch = Record<string, unknown>`.
  - `parseMeters(raw: string): number | null` (`"1,25"`, `"1.25"`, `"1,25 m"` y `"125 cm"` valen 1,25 m; sin unidad se entiende metros; `null` si no es un número) y `parseDegrees(raw: string): number | null` (`"90"`, `"90°"`, `"90 grados"`, normalizado a [0, 360)).
  - `metersPatch(raw: string, range: readonly [number, number], current: number): number | null`: lee un campo de metros, lo ajusta al rango y lo redondea al milímetro; devuelve el valor nuevo solo si es distinto del actual (`null` si no es un número o no cambia).
  - `LIMITS`: los rangos de cada medida en metros (muro, puerta, ventana, mueble, ambiente). **Fuera del rango se ajusta al límite**: escribir "10" como ancho de puerta deja 3,00 m; es predecible y nunca rompe el nodo (los mínimos de Pascal son 0,5 m de puerta, 0,3 m de ventana y 0,05 m de grosor).
  - `typeLabel(type: string): string` (`Muro`, `Puerta`, `Ventana`, `Mueble`, `Ambiente`, `Piso`, `Cielorraso`, `Escalera`, `Columna`… y `Elemento` para lo que no conoce).
  - `fieldsFor(target: PropTarget): FieldView[]`, `patchFor(target: PropTarget, fieldId: string, raw: string): Patch | null` (el cambio que produce editar un campo; `null` si no se entiende o no cambia nada), `titleFor(target)`, `subtitleFor(target): string | undefined`, `duplicatePatch(target): Patch | null` (qué cambiar en la copia para que no quede encima del original), `canDuplicate(target): boolean` y `deleteWarning(target): string | null` (el aviso cuando el elemento tiene cosas colgando; `null` si no).
  - Un **constructor por tipo** (`Builder`) registrado en el mapa `BUILDERS`: las Tareas 9b (muro y ambiente), 9c (puerta y ventana) y 9d (mueble) suman el suyo en los cortes `// @@builders` y `// @@types`. Los tipos sin constructor (piso, cielorraso, escalera, columna…) reciben el **panel mínimo** (D5): el nombre del tipo y Borrar, sin campos.
- Produces (`test/support/properties.ts`): `target(node, extra?): PropTarget` (un elemento elegido de prueba, con su id `<tipo>_1`) y `values(target): Record<string, string>` (lo que muestra cada campo, por id). Los usan las pruebas de las Tareas 9a a 9d.

**Reglas del panel (spec 4.4).** Las medidas van en metros con coma (`0,90 m`); un cambio se aplica con `commitParametricNodeFields` (Tarea 9e), así que entra al historial y Deshacer lo revierte; Duplicar crea una copia desplazada; Borrar pide confirmación **solo si el elemento tiene hijos** (`deleteWarning`). Esta tarea deja lo común a todos los tipos; el muro y el ambiente llegan en la 9b.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Primero el ayudante que comparten las pruebas del modelo (cada tipo arma su elemento elegido igual):

Create `apps/web/test/support/properties.ts`:

```ts
import { type PropTarget, fieldsFor } from '../../src/editor/shell/properties-model'

/** Un elemento elegido de prueba: el nodo con su id (`<tipo>_1`) y lo que el panel necesita de su entorno. */
export const target = (node: Record<string, unknown>, extra: Partial<PropTarget> = {}): PropTarget => ({
  node: { id: `${node.type}_1`, ...node } as PropTarget['node'],
  hostLength: null,
  descendants: 0,
  ...extra,
})

/** Lo que muestra cada campo del panel, por id. */
export const values = (t: PropTarget) => Object.fromEntries(fieldsFor(t).map((f) => [f.id, f.value]))
```

Create `apps/web/test/shell-properties-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  LIMITS,
  canDuplicate,
  deleteWarning,
  fieldsFor,
  metersPatch,
  parseDegrees,
  parseMeters,
  patchFor,
  titleFor,
  typeLabel,
} from '../src/editor/shell/properties-model'
import { target } from './support/properties'

const WALL = { type: 'wall' }

describe('parseMeters y parseDegrees', () => {
  it('entiende coma o punto, la unidad m o cm y los espacios; sin unidad son metros', () => {
    expect(parseMeters('1,25')).toBe(1.25)
    expect(parseMeters('1.25')).toBe(1.25)
    expect(parseMeters(' 0,9 m ')).toBe(0.9)
    expect(parseMeters('125 cm')).toBe(1.25)
    expect(parseMeters('90CM')).toBe(0.9)
    expect(parseMeters('2')).toBe(2)
  })

  it('devuelve null si no es un número', () => {
    for (const raw of ['', 'abc', '1,2,3', '1 metro', '-', 'm']) expect(parseMeters(raw), raw).toBeNull()
  })

  it('los grados se normalizan a [0, 360)', () => {
    expect(parseDegrees('90')).toBe(90)
    expect(parseDegrees('90°')).toBe(90)
    expect(parseDegrees('-90')).toBe(270)
    expect(parseDegrees('450')).toBe(90)
    expect(parseDegrees('12,5 grados')).toBe(12.5)
    expect(parseDegrees('x')).toBeNull()
  })
})

describe('metersPatch', () => {
  it('ajusta al rango, redondea al milímetro y devuelve solo lo que cambia', () => {
    expect(metersPatch('1,234567', [0.5, 3], 1)).toBe(1.235)
    expect(metersPatch('10', LIMITS.doorWidth, 0.9)).toBe(3)
    expect(metersPatch('0,1', LIMITS.doorWidth, 0.9)).toBe(0.5)
    expect(metersPatch('0,9', LIMITS.doorWidth, 0.9)).toBeNull()
  })

  it('lo que no es un número no cambia nada', () => {
    expect(metersPatch('abc', LIMITS.doorWidth, 0.9)).toBeNull()
  })
})

describe('tipos sin panel propio y aviso de borrado', () => {
  it('un piso o una escalera solo tienen el nombre del tipo: sin campos, sin Duplicar', () => {
    for (const [type, label] of [['slab', 'Piso'], ['stair', 'Escalera'], ['column', 'Columna'], ['raro', 'Elemento']] as const) {
      expect(typeLabel(type)).toBe(label)
      expect(titleFor(target({ type }))).toBe(label)
      expect(fieldsFor(target({ type }))).toEqual([])
      expect(patchFor(target({ type }), 'x', '1')).toBeNull()
      expect(canDuplicate(target({ type }))).toBe(false)
    }
  })

  it('borrar pide confirmación solo si hay cosas colgando, y lo dice con el género del elemento', () => {
    expect(deleteWarning(target(WALL))).toBeNull()
    expect(deleteWarning(target(WALL, { descendants: 2 }))).toBe('Este muro tiene 2 elementos que también se borrarán.')
    expect(deleteWarning(target({ type: 'stair' }, { descendants: 1 }))).toBe('Esta escalera tiene 1 elemento que también se borrará.')
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-properties-model`
Expected: FAIL — `Cannot find module '../src/editor/shell/properties-model'`.

- [ ] **Paso 2: Escribir el modelo base**

Create `apps/web/src/editor/shell/properties-model.ts`:

```ts
import type { SceneNodeLike } from './bridge/types'
import type { FieldView } from './ui/PropertiesCard'

/** Un nodo de Pascal con los campos que el panel lee (cada tipo trae los suyos: `@pascal-app/core/dist/schema/nodes`). */
export type PropNode = SceneNodeLike & Record<string, unknown>

/** El elemento elegido y lo que el panel necesita de su entorno. */
export type PropTarget = {
  node: PropNode
  /** Largo, en metros, del muro que aloja a una puerta o ventana (`null` si no tiene muro o no se encuentra). */
  hostLength: number | null
  /** Cuántos elementos cuelgan de este (aberturas de un muro, muebles sobre un estante): se borran con él. */
  descendants: number
}

export type Patch = Record<string, unknown>

/** Cómo se comporta el panel con un tipo de nodo: sus campos, qué cambia al editar uno, su título y su copia. */
type Builder = {
  fields(target: PropTarget): FieldView[]
  /** El cambio de un campo (`null` = no se entiende o no cambia nada). Fuera del rango se ajusta al límite. */
  patch(target: PropTarget, fieldId: string, raw: string): Patch | null
  title?(target: PropTarget): string
  subtitle?(target: PropTarget): string
  /** Qué cambiar en la copia para que no quede encima del original (`null` = no hay lugar o no se duplica). */
  duplicate?(target: PropTarget): Patch | null
}

/** Rangos en metros: fuera de ellos el valor se ajusta al límite. Los mínimos de Pascal son 0,5 (puerta), 0,3 (ventana) y 0,05 (grosor). */
export const LIMITS = {
  wallLength: [0.1, 100],
  wallHeight: [0.1, 10],
  wallThickness: [0.05, 1],
  doorWidth: [0.5, 3],
  doorHeight: [1, 3.5],
  windowWidth: [0.3, 6],
  windowHeight: [0.3, 4],
  windowSill: [0, 2.5],
  itemSize: [0.05, 10],
  zoneHeight: [1.8, 10],
} as const satisfies Record<string, readonly [number, number]>

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const roundMm = (value: number) => Math.round(value * 1000) / 1000
const differs = (a: number, b: number) => Math.abs(a - b) > 0.0005

/** "1,25", "1.25", "1,25 m" o "125 cm" → metros. Sin unidad se entiende metros. `null` si no es un número. */
export function parseMeters(raw: string): number | null {
  const match = /^\s*(-?\d+(?:[.,]\d+)?)\s*(m|cm)?\s*$/i.exec(raw)
  if (!match) return null
  const value = Number((match[1] ?? '').replace(',', '.'))
  if (!Number.isFinite(value)) return null
  return match[2]?.toLowerCase() === 'cm' ? value / 100 : value
}

/** "90", "90°" o "90 grados" → grados normalizados a [0, 360). `null` si no es un número. */
export function parseDegrees(raw: string): number | null {
  const match = /^\s*(-?\d+(?:[.,]\d+)?)\s*(°|grados?)?\s*$/i.exec(raw)
  if (!match) return null
  const value = Number((match[1] ?? '').replace(',', '.'))
  return Number.isFinite(value) ? ((value % 360) + 360) % 360 : null
}

/** Un campo de metros: lee, ajusta al rango y devuelve el valor nuevo solo si es distinto del actual. */
export function metersPatch(raw: string, range: readonly [number, number], current: number): number | null {
  const parsed = parseMeters(raw)
  if (parsed === null) return null
  const next = roundMm(clamp(parsed, range[0], range[1]))
  return differs(next, current) ? next : null
}

const TYPES: Readonly<Record<string, { label: string; article: 'Este' | 'Esta' }>> = {
  wall: { label: 'Muro', article: 'Este' },
  door: { label: 'Puerta', article: 'Esta' },
  window: { label: 'Ventana', article: 'Esta' },
  item: { label: 'Mueble', article: 'Este' },
  zone: { label: 'Ambiente', article: 'Este' },
  slab: { label: 'Piso', article: 'Este' },
  ceiling: { label: 'Cielorraso', article: 'Este' },
  stair: { label: 'Escalera', article: 'Esta' },
  column: { label: 'Columna', article: 'Esta' },
  shelf: { label: 'Estante', article: 'Este' },
  cabinet: { label: 'Gabinete', article: 'Este' },
  fence: { label: 'Cerco', article: 'Este' },
  roof: { label: 'Techo', article: 'Este' },
}
export const typeLabel = (type: string) => TYPES[type]?.label ?? 'Elemento'

// @@builders

const BUILDERS: Readonly<Record<string, Builder>> = {
  // @@types
}

const builderOf = (target: PropTarget) => BUILDERS[target.node.type]

/** Campos del panel; los tipos sin constructor (piso, escalera…) no tienen: reciben el panel mínimo (D5). */
export const fieldsFor = (target: PropTarget): FieldView[] => builderOf(target)?.fields(target) ?? []

/** El cambio que produce editar un campo, o `null` si no se entiende o no cambia nada. */
export const patchFor = (target: PropTarget, fieldId: string, raw: string): Patch | null =>
  builderOf(target)?.patch(target, fieldId, raw) ?? null

/** Título del panel: el nombre del ambiente o del mueble; si no, el tipo ("Muro"). */
export const titleFor = (target: PropTarget): string => builderOf(target)?.title?.(target) ?? typeLabel(target.node.type)

export const subtitleFor = (target: PropTarget): string | undefined => builderOf(target)?.subtitle?.(target)

/** Qué cambiar en la copia para que no quede encima del original (`null` = este tipo no se duplica o no hay lugar). */
export const duplicatePatch = (target: PropTarget): Patch | null => builderOf(target)?.duplicate?.(target) ?? null

export const canDuplicate = (target: PropTarget): boolean => duplicatePatch(target) !== null

/** El aviso de Borrar cuando el elemento tiene cosas colgando (se borran con él); `null` si no tiene y se borra sin preguntar. */
export function deleteWarning({ node, descendants }: PropTarget): string | null {
  if (descendants === 0) return null
  const many = descendants > 1
  const article = TYPES[node.type]?.article ?? 'Este'
  return `${article} ${typeLabel(node.type).toLowerCase()} tiene ${descendants} ${many ? 'elementos' : 'elemento'} que también ${many ? 'se borrarán' : 'se borrará'}.`
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-properties-model shell-boundaries`
Expected: PASS (`shell-properties-model`: 7 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/properties-model.ts apps/web/test/support/properties.ts apps/web/test/shell-properties-model.test.ts
git commit -m "feat(editor): modelo de propiedades, base común (metros, límites, tipos sin panel propio y aviso de borrado)" -- apps/web/src/editor/shell/properties-model.ts apps/web/test/support/properties.ts apps/web/test/shell-properties-model.test.ts
```

---

### Task 9b: Modelo de propiedades (2 de 4): muro y ambiente

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Modify: `apps/web/src/editor/shell/properties-model.ts` (suma los constructores `wall` y `zone` en los cortes `// @@builders` y `// @@types`)
- Test: `apps/web/test/shell-properties-wall-zone.test.ts`

**Interfaces:**
- Consumes: `Builder`, `PropNode`, `PropTarget`, `Patch`, `LIMITS`, `metersPatch` y el mapa `BUILDERS` (9a); `target` y `values` de `test/support/properties.ts` (9a); `FieldView` (1h); `formatMeters`, `formatArea` (`@/lib/format`, 6a y 7b); `zoneDisplayName` (`@/lib/editor-names`, 6a); `shoelaceArea` (`./bridge/levels`, 6b).
- Produces:
  - `wallLength(node: PropNode): number`: el largo de un muro en metros (la Tarea 9e lo usa para ubicar sus puertas y ventanas).
  - `WALL_DEFAULTS = { height: 2.5, thickness: 0.1 }` y `ZONE_COLORS` (los seis colores con que se pinta un ambiente en el plano; el primero es el que Pascal usa por omisión).
  - Los constructores del **muro** (Largo, Alto y Grosor; cambiar el largo mueve el extremo final sobre la misma recta) y del **ambiente** (Nombre, Altura, Color y Superficie de solo lectura), registrados en `BUILDERS`.

Los valores por omisión del muro son los de Pascal (`DEFAULT_WALL_HEIGHT` = 2,5 y `DEFAULT_WALL_THICKNESS` = 0,1, de `@pascal-app/core`; una prueba los compara con los reales). La superficie de un ambiente es la del polígono (`shoelaceArea`, Tarea 6b) y el nombre que Pascal le pone (`Zone 1`) se muestra traducido (`zoneDisplayName`); el dato guardado no se toca.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-properties-wall-zone.test.ts`:

```ts
import { DEFAULT_WALL_HEIGHT, DEFAULT_WALL_THICKNESS } from '@pascal-app/core/wall'
import { describe, expect, it } from 'vitest'
import {
  WALL_DEFAULTS,
  canDuplicate,
  duplicatePatch,
  fieldsFor,
  patchFor,
  subtitleFor,
  titleFor,
} from '../src/editor/shell/properties-model'
import { target, values } from './support/properties'

const WALL = { type: 'wall', start: [0, 0], end: [4, 0] }
const ZONE = { type: 'zone', name: 'Sala de estar', polygon: [[0, 0], [4, 0], [4, 3], [0, 3]], color: '#3b82f6' }

describe('muro', () => {
  it('muestra Largo, Alto y Grosor en metros, con los valores por omisión de Pascal cuando el muro no los trae', () => {
    expect(fieldsFor(target(WALL)).map((f) => [f.id, f.label])).toEqual([['length', 'Largo'], ['height', 'Alto'], ['thickness', 'Grosor']])
    expect(values(target(WALL))).toEqual({ length: '4,00 m', height: '2,50 m', thickness: '0,10 m' })
    expect(values(target({ ...WALL, height: 3, thickness: 0.2 }))).toMatchObject({ height: '3,00 m', thickness: '0,20 m' })
  })

  it('los valores por omisión coinciden con los de Pascal', () => {
    expect(WALL_DEFAULTS).toEqual({ height: DEFAULT_WALL_HEIGHT, thickness: DEFAULT_WALL_THICKNESS })
  })

  it('cambiar el alto o el grosor devuelve solo ese campo; fuera de rango se ajusta al límite', () => {
    expect(patchFor(target(WALL), 'height', '3')).toEqual({ height: 3 })
    expect(patchFor(target(WALL), 'height', '10,5')).toEqual({ height: 10 })
    expect(patchFor(target(WALL), 'thickness', '2 cm')).toEqual({ thickness: 0.05 })
  })

  it('un valor igual al actual o que no es un número no cambia nada', () => {
    expect(patchFor(target(WALL), 'height', '2,5')).toBeNull()
    expect(patchFor(target(WALL), 'height', 'abc')).toBeNull()
    expect(patchFor(target(WALL), 'desconocido', '1')).toBeNull()
  })

  it('cambiar el largo mueve el extremo final sobre la misma recta', () => {
    expect(patchFor(target(WALL), 'length', '6')).toEqual({ end: [6, 0] })
    expect(patchFor(target({ type: 'wall', start: [0, 0], end: [3, 4] }), 'length', '10')).toEqual({ end: [6, 8] })
    expect(patchFor(target({ type: 'wall', start: [1, 1], end: [1, 1] }), 'length', '2')).toBeNull()
  })

  it('título, subtítulo y copia desplazada', () => {
    expect(titleFor(target(WALL))).toBe('Muro')
    expect(subtitleFor(target(WALL))).toBe('Largo 4,00 m')
    expect(duplicatePatch(target(WALL))).toEqual({ start: [0.5, 0.5], end: [4.5, 0.5] })
    expect(canDuplicate(target(WALL))).toBe(true)
  })
})

describe('ambiente', () => {
  it('muestra Nombre, Altura, Color y Superficie (solo lectura), con "Zone N" traducido', () => {
    const t = target(ZONE)
    expect(fieldsFor(t).map((f) => [f.id, f.kind])).toEqual([['name', 'text'], ['ceilingHeight', 'number'], ['color', 'swatch'], ['area', 'readonly']])
    expect(values(t)).toMatchObject({ name: 'Sala de estar', ceilingHeight: '2,70 m', area: '12,0 m²' })
    expect(titleFor(target({ ...ZONE, name: 'Zone 2' }))).toBe('Ambiente 2')
    expect(subtitleFor(t)).toBe('12,0 m²')
  })

  it('renombrar recorta los espacios y no admite un nombre vacío', () => {
    expect(patchFor(target(ZONE), 'name', '  Cocina  ')).toEqual({ name: 'Cocina' })
    expect(patchFor(target(ZONE), 'name', '   ')).toBeNull()
    expect(patchFor(target(ZONE), 'name', 'Sala de estar')).toBeNull()
  })

  it('la altura se ajusta al rango y el color solo cambia si es otro', () => {
    expect(patchFor(target(ZONE), 'ceilingHeight', '2,4')).toEqual({ ceilingHeight: 2.4 })
    expect(patchFor(target(ZONE), 'ceilingHeight', '0,5')).toEqual({ ceilingHeight: 1.8 })
    expect(patchFor(target(ZONE), 'color', '#22c55e')).toEqual({ color: '#22c55e' })
    expect(patchFor(target(ZONE), 'color', '#3b82f6')).toBeNull()
  })

  it('la copia se corre medio metro y se llama "(copia)"', () => {
    expect(duplicatePatch(target(ZONE))).toEqual({
      polygon: [[0.5, 0.5], [4.5, 0.5], [4.5, 3.5], [0.5, 3.5]],
      name: 'Sala de estar (copia)',
    })
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-properties-wall-zone`
Expected: FAIL — 9 pruebas, la primera con `AssertionError: expected [] to deeply equal [ [ 'length', 'Largo' ], … ]` (el modelo base todavía no conoce `wall` ni `zone` ni exporta `WALL_DEFAULTS`).

- [ ] **Paso 2: Sumar el muro y el ambiente al modelo**

Modify `apps/web/src/editor/shell/properties-model.ts`:

```diff
@@
+import { zoneDisplayName } from '@/lib/editor-names'
+import { formatArea, formatMeters } from '@/lib/format'
+import { shoelaceArea } from './bridge/levels'
 import type { SceneNodeLike } from './bridge/types'
@@
+/** Lo que Pascal asume cuando un muro no trae el campo (`DEFAULT_WALL_HEIGHT` y `DEFAULT_WALL_THICKNESS` de `@pascal-app/core`). */
+export const WALL_DEFAULTS = { height: 2.5, thickness: 0.1 } as const
+const ZONE_HEIGHT_DEFAULT = 2.7
+/** Cuánto se corre una copia (en metros) para que no quede encima del original. */
+const SHIFT = 0.5
+
+const num = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)
+const pair = (value: unknown): readonly [number, number] => (Array.isArray(value) ? [num(value[0], 0), num(value[1], 0)] : [0, 0])
+
+const wallVector = (node: PropNode) => {
+  const [sx, sz] = pair(node.start)
+  const [ex, ez] = pair(node.end)
+  return { sx, sz, ex, ez, length: Math.hypot(ex - sx, ez - sz) }
+}
+
+/** Largo en metros de un muro (la distancia entre sus extremos); también sirve para ubicar sus puertas y ventanas. */
+export const wallLength = (node: PropNode) => wallVector(node).length
+
+const wall: Builder = {
+  fields: ({ node }) => [
+    { kind: 'number', id: 'length', label: 'Largo', value: formatMeters(wallVector(node).length) },
+    { kind: 'number', id: 'height', label: 'Alto', value: formatMeters(num(node.height, WALL_DEFAULTS.height)) },
+    { kind: 'number', id: 'thickness', label: 'Grosor', value: formatMeters(num(node.thickness, WALL_DEFAULTS.thickness)) },
+  ],
+  patch: ({ node }, fieldId, raw) => {
+    if (fieldId === 'height') {
+      const value = metersPatch(raw, LIMITS.wallHeight, num(node.height, WALL_DEFAULTS.height))
+      return value === null ? null : { height: value }
+    }
+    if (fieldId === 'thickness') {
+      const value = metersPatch(raw, LIMITS.wallThickness, num(node.thickness, WALL_DEFAULTS.thickness))
+      return value === null ? null : { thickness: value }
+    }
+    if (fieldId === 'length') {
+      const { sx, sz, ex, ez, length } = wallVector(node)
+      const value = metersPatch(raw, LIMITS.wallLength, length)
+      if (value === null || length === 0) return null
+      const ratio = value / length
+      return { end: [roundMm(sx + (ex - sx) * ratio), roundMm(sz + (ez - sz) * ratio)] }
+    }
+    return null
+  },
+  subtitle: ({ node }) => `Largo ${formatMeters(wallVector(node).length)}`,
+  duplicate: ({ node }) => {
+    const { sx, sz, ex, ez } = wallVector(node)
+    return { start: [sx + SHIFT, sz + SHIFT], end: [ex + SHIFT, ez + SHIFT] }
+  },
+}
+
+/** Los colores con que se pinta un ambiente en el plano (el primero es el que Pascal usa por omisión). */
+export const ZONE_COLORS = [
+  { value: '#3b82f6', label: 'Azul', color: '#3b82f6' },
+  { value: '#22c55e', label: 'Verde', color: '#22c55e' },
+  { value: '#f59e0b', label: 'Ámbar', color: '#f59e0b' },
+  { value: '#ec4899', label: 'Rosa', color: '#ec4899' },
+  { value: '#8b5cf6', label: 'Violeta', color: '#8b5cf6' },
+  { value: '#94a3b8', label: 'Gris', color: '#94a3b8' },
+] as const
+
+const zonePolygon = (node: PropNode): readonly (readonly [number, number])[] =>
+  Array.isArray(node.polygon) ? node.polygon.map(pair) : []
+const zoneName = (node: PropNode) => (typeof node.name === 'string' ? node.name : '')
+
+const zone: Builder = {
+  fields: ({ node }) => [
+    { kind: 'text', id: 'name', label: 'Nombre', value: zoneDisplayName(zoneName(node)) },
+    { kind: 'number', id: 'ceilingHeight', label: 'Altura', value: formatMeters(num(node.ceilingHeight, ZONE_HEIGHT_DEFAULT)) },
+    { kind: 'swatch', id: 'color', label: 'Color', value: typeof node.color === 'string' ? node.color : '', options: ZONE_COLORS },
+    { kind: 'readonly', id: 'area', label: 'Superficie', value: formatArea(shoelaceArea(zonePolygon(node))) },
+  ],
+  patch: ({ node }, fieldId, raw) => {
+    if (fieldId === 'name') {
+      const name = raw.trim()
+      return name === '' || name === zoneDisplayName(zoneName(node)) ? null : { name }
+    }
+    if (fieldId === 'ceilingHeight') {
+      const value = metersPatch(raw, LIMITS.zoneHeight, num(node.ceilingHeight, ZONE_HEIGHT_DEFAULT))
+      return value === null ? null : { ceilingHeight: value }
+    }
+    if (fieldId === 'color') return raw === node.color || !/^#[0-9a-f]{6}$/i.test(raw) ? null : { color: raw }
+    return null
+  },
+  title: ({ node }) => zoneDisplayName(zoneName(node)),
+  subtitle: ({ node }) => formatArea(shoelaceArea(zonePolygon(node))),
+  duplicate: ({ node }) => ({
+    polygon: zonePolygon(node).map(([x, z]) => [x + SHIFT, z + SHIFT]),
+    name: `${zoneDisplayName(zoneName(node))} (copia)`,
+  }),
+}
+
 // @@builders
@@
+  wall,
+  zone,
   // @@types
```


- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-properties-wall-zone shell-properties-model shell-boundaries`
Expected: PASS (`shell-properties-wall-zone`: 10 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/properties-model.ts apps/web/test/shell-properties-wall-zone.test.ts
git commit -m "feat(editor): propiedades del muro y del ambiente (campos, límites, copia y títulos)" -- apps/web/src/editor/shell/properties-model.ts apps/web/test/shell-properties-wall-zone.test.ts
```

---

### Task 9c: Modelo de propiedades (3 de 4): puerta y ventana

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Modify: `apps/web/src/editor/shell/properties-model.ts` (suma los constructores `doorBuilder` y `windowBuilder` en los cortes `// @@builders` y `// @@types`)
- Test: `apps/web/test/shell-properties-openings.test.ts`

**Interfaces:**
- Consumes: `metersPatch`, `LIMITS`, `PropTarget`, `Patch`, el mapa `BUILDERS` y los ayudantes del módulo (`num`, `clamp`, `roundMm`, `SHIFT`) (9a y 9b); `values` de `test/support/properties.ts` (9a); `formatMeters` (7b).
- Produces: en `fieldsFor`, `patchFor`, `subtitleFor` y `duplicatePatch` los tipos `door` y `window`:
  - **Puerta:** Tipo (`select`: Batiente, Doble y Francesa; si la puerta es de otro tipo, como Plegable o Corrediza, ese tipo aparece **deshabilitado** para que el campo diga la verdad sin permitir elegirlo), Ancho (0,5 a 3 m), Alto (1 a 3,5 m), Hojas (solo lectura: 1 en la batiente, 2 en la doble y la francesa) y Forma del hueco (Rectangular, Redondeado o Arco).
  - **Ventana:** Tipo (Fija, Corrediza, Batiente, Proyectante, Guillotina simple y Guillotina doble; otros tipos se muestran deshabilitados), Ancho (0,3 a 6 m), Alto (0,3 a 4 m), Antepecho (0 a 2,5 m: la altura desde el piso hasta el borde inferior; **no es un campo de Pascal**, sale de `position[1] - alto / 2`) y Forma del hueco.
  - Cambiar el ancho de una abertura **la mantiene dentro de su muro** (su centro a lo largo del muro, `position[0]`, se ajusta entre media abertura y el largo del muro menos media: si el muro es más corto que la abertura, queda al centro); cambiar el alto de una **puerta** mantiene su centro en la mitad del alto (apoya en el piso) y el de una **ventana** conserva su antepecho.
  - La copia de una abertura va al lado, sobre el mismo muro: a la derecha (ancho + 0,15 m) si cabe, si no a la izquierda, y si no hay lugar (o no se conoce el muro) no se ofrece Duplicar.

**Qué no hace.** Cambiar el tipo de puerta en Pascal reescribe además los paneles de la hoja y las medidas de fábrica del tipo (`getDoorTypeUpdates` está dentro de su panel y no se exporta). Aquí solo se cambian `doorType` y `leafCount`: una puerta francesa conserva el relleno de paneles que tenía. Es la única parte del panel de la puerta que **no** llega al nivel del de Pascal, y por eso solo se ofrecen los tres tipos de hoja batiente (queda anotado en "Desviaciones" del plan).

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-properties-openings.test.ts`:

```ts
import { DoorNode, WindowNode } from '@pascal-app/core/schema'
import { describe, expect, it } from 'vitest'
import {
  type PropTarget,
  canDuplicate,
  duplicatePatch,
  fieldsFor,
  patchFor,
  subtitleFor,
  titleFor,
} from '../src/editor/shell/properties-model'
import { values } from './support/properties'

type Node = PropTarget['node']
const doorAt = (x: number, extra: Record<string, unknown> = {}, hostLength: number | null = 4): PropTarget => ({
  node: DoorNode.parse({ position: [x, 1.05, 0], wallId: 'wall_1', parentId: 'wall_1', ...extra }) as unknown as Node,
  hostLength,
  descendants: 0,
})
const windowAt = (x: number, extra: Record<string, unknown> = {}, hostLength: number | null = 4): PropTarget => ({
  node: WindowNode.parse({ position: [x, 1.5, 0], wallId: 'wall_1', parentId: 'wall_1', ...extra }) as unknown as Node,
  hostLength,
  descendants: 0,
})
const optionsOf = (t: PropTarget, id: string) => {
  const field = fieldsFor(t).find((f) => f.id === id)
  return field && 'options' in field ? field.options.map((o) => [o.value, o.label, 'disabled' in o && o.disabled === true]) : []
}

describe('puerta', () => {
  it('muestra Tipo, Ancho, Alto, Hojas y Forma del hueco con los valores de la puerta', () => {
    const t = doorAt(1)
    expect(fieldsFor(t).map((f) => [f.id, f.label, f.kind])).toEqual([
      ['doorType', 'Tipo', 'select'],
      ['width', 'Ancho', 'number'],
      ['height', 'Alto', 'number'],
      ['leafCount', 'Hojas', 'readonly'],
      ['openingShape', 'Forma del hueco', 'select'],
    ])
    expect(values(t)).toEqual({ doorType: 'hinged', width: '0,90 m', height: '2,10 m', leafCount: '1', openingShape: 'rectangle' })
    expect(titleFor(t)).toBe('Puerta')
    expect(subtitleFor(t)).toBe('Batiente de 1 hoja')
    expect(subtitleFor(doorAt(1, { doorType: 'double', leafCount: 2 }))).toBe('Doble de 2 hojas')
  })

  it('ofrece tres tipos y muestra, deshabilitado, el que no se puede elegir', () => {
    expect(optionsOf(doorAt(1), 'doorType')).toEqual([['hinged', 'Batiente', false], ['double', 'Doble', false], ['french', 'Francesa', false]])
    expect(optionsOf(doorAt(1, { doorType: 'folding' }), 'doorType').at(-1)).toEqual(['folding', 'Plegable', true])
  })

  it('cambiar el tipo cambia las hojas; un tipo no ofrecido o el mismo no cambian nada', () => {
    expect(patchFor(doorAt(1), 'doorType', 'double')).toEqual({ doorType: 'double', leafCount: 2 })
    expect(patchFor(doorAt(1, { doorType: 'double', leafCount: 2 }), 'doorType', 'hinged')).toEqual({ doorType: 'hinged', leafCount: 1 })
    expect(patchFor(doorAt(1), 'doorType', 'hinged')).toBeNull()
    expect(patchFor(doorAt(1), 'doorType', 'folding')).toBeNull()
    expect(patchFor(doorAt(1), 'openingShape', 'arch')).toEqual({ openingShape: 'arch' })
  })

  it('cambiar el ancho a 1,00 m deja el nodo en 1 m y la puerta dentro de su muro', () => {
    expect(patchFor(doorAt(1), 'width', '1,00')).toEqual({ width: 1, position: [1, 1.05, 0] })
    expect(patchFor(doorAt(1, {}, 1.2), 'width', '1')).toEqual({ width: 1, position: [0.7, 1.05, 0] })
    expect(patchFor(doorAt(1, {}, 0.8), 'width', '1')).toEqual({ width: 1, position: [0.4, 1.05, 0] })
    expect(patchFor(doorAt(1), 'width', '10')).toEqual({ width: 3, position: [1.5, 1.05, 0] })
    expect(patchFor(doorAt(1), 'width', '0,2')).toEqual({ width: 0.5, position: [1, 1.05, 0] })
  })

  it('cambiar el alto mantiene la puerta apoyada en el piso (su centro es la mitad del alto)', () => {
    expect(patchFor(doorAt(1), 'height', '2,4')).toEqual({ height: 2.4, position: [1, 1.2, 0] })
    expect(patchFor(doorAt(1), 'height', '2,1')).toBeNull()
  })

  it('la copia va al lado: a la derecha si cabe, si no a la izquierda, y si no hay lugar no se ofrece', () => {
    expect(duplicatePatch(doorAt(1))).toEqual({ position: [2.05, 1.05, 0] })
    expect(duplicatePatch(doorAt(3.5))).toEqual({ position: [2.45, 1.05, 0] })
    expect(canDuplicate(doorAt(1, {}, 1.2))).toBe(false)
    expect(canDuplicate(doorAt(1, {}, null))).toBe(false)
  })
})

describe('ventana', () => {
  it('muestra Tipo, Ancho, Alto, Antepecho y Forma del hueco; el antepecho sale del centro y el alto', () => {
    const t = windowAt(2)
    expect(fieldsFor(t).map((f) => [f.id, f.label])).toEqual([
      ['windowType', 'Tipo'],
      ['width', 'Ancho'],
      ['height', 'Alto'],
      ['sill', 'Antepecho'],
      ['openingShape', 'Forma del hueco'],
    ])
    expect(values(t)).toEqual({ windowType: 'fixed', width: '1,50 m', height: '1,50 m', sill: '0,75 m', openingShape: 'rectangle' })
    expect(titleFor(t)).toBe('Ventana')
    expect(subtitleFor(t)).toBe('Fija')
  })

  it('ofrece seis tipos y muestra deshabilitado el que no se puede elegir', () => {
    expect(optionsOf(windowAt(2), 'windowType').map((o) => o[1])).toEqual(['Fija', 'Corrediza', 'Batiente', 'Proyectante', 'Guillotina simple', 'Guillotina doble'])
    expect(optionsOf(windowAt(2, { windowType: 'bay' }), 'windowType').at(-1)).toEqual(['bay', 'En saliente', true])
    expect(patchFor(windowAt(2), 'windowType', 'sliding')).toEqual({ windowType: 'sliding' })
    expect(patchFor(windowAt(2), 'windowType', 'bay')).toBeNull()
  })

  it('cambiar el alto conserva el antepecho y cambiar el antepecho mueve la ventana', () => {
    expect(patchFor(windowAt(2), 'height', '1')).toEqual({ height: 1, position: [2, 1.25, 0] })
    expect(patchFor(windowAt(2), 'sill', '1')).toEqual({ position: [2, 1.75, 0] })
    expect(patchFor(windowAt(2), 'sill', '5')).toEqual({ position: [2, 3.25, 0] })
    expect(patchFor(windowAt(2), 'sill', '0,75')).toBeNull()
  })

  it('cambiar el ancho la mantiene dentro del muro', () => {
    expect(patchFor(windowAt(2, {}, 3), 'width', '2')).toEqual({ width: 2, position: [2, 1.5, 0] })
    expect(patchFor(windowAt(2.8, {}, 3), 'width', '2')).toEqual({ width: 2, position: [2, 1.5, 0] })
  })

  it('la copia va al lado sobre el mismo muro', () => {
    expect(duplicatePatch(windowAt(1))).toEqual({ position: [2.65, 1.5, 0] })
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-properties-openings`
Expected: FAIL — `AssertionError: expected [] to deeply equal [['doorType', 'Tipo', 'select'], …]` (el modelo todavía no conoce `door` ni `window`: sin constructor, `fieldsFor` devuelve el panel mínimo).

- [ ] **Paso 2: Sumar la puerta y la ventana al modelo**

Modify `apps/web/src/editor/shell/properties-model.ts`:

```diff
@@
+const vec3 = (value: unknown): readonly [number, number, number] =>
+  Array.isArray(value) ? [num(value[0], 0), num(value[1], 0), num(value[2], 0)] : [0, 0, 0]
+
+/** Medidas de fábrica de Pascal cuando el nodo no trae el campo (`DoorNode` y `WindowNode` de `@pascal-app/core`). */
+const DOOR_DEFAULTS = { width: 0.9, height: 2.1 } as const
+const WINDOW_DEFAULTS = { width: 1.5, height: 1.5 } as const
+
+const DOOR_TYPES: Readonly<Record<string, string>> = {
+  hinged: 'Batiente',
+  double: 'Doble',
+  french: 'Francesa',
+  folding: 'Plegable',
+  pocket: 'Embutida',
+  barn: 'De granero',
+  sliding: 'Corrediza',
+  'garage-sectional': 'De garaje seccional',
+  'garage-rollup': 'De garaje enrollable',
+  'garage-tiltup': 'De garaje basculante',
+}
+const DOOR_CHOICES = ['hinged', 'double', 'french'] as const
+const WINDOW_TYPES: Readonly<Record<string, string>> = {
+  fixed: 'Fija',
+  sliding: 'Corrediza',
+  casement: 'Batiente',
+  awning: 'Proyectante',
+  hopper: 'Banderola',
+  'single-hung': 'Guillotina simple',
+  'double-hung': 'Guillotina doble',
+  bay: 'En saliente',
+  bow: 'Curva',
+  louvered: 'Con celosías',
+}
+const WINDOW_CHOICES = ['fixed', 'sliding', 'casement', 'awning', 'single-hung', 'double-hung'] as const
+const SHAPES: Readonly<Record<string, string>> = { rectangle: 'Rectangular', rounded: 'Redondeado', arch: 'Arco' }
+const SHAPE_OPTIONS = Object.entries(SHAPES).map(([value, label]) => ({ value, label }))
+
+/** Las opciones que se pueden elegir; si el nodo trae otra (una puerta plegable), se muestra deshabilitada para decir la verdad. */
+function typeOptions(labels: Readonly<Record<string, string>>, choices: readonly string[], current: string) {
+  const base = choices.map((value) => ({ value, label: labels[value] ?? value }))
+  return choices.includes(current) ? base : [...base, { value: current, label: labels[current] ?? current, disabled: true }]
+}
+
+const text = (value: unknown, fallback: string) => (typeof value === 'string' && value !== '' ? value : fallback)
+
+/** El centro de la abertura a lo largo del muro (`position[0]`) ajustado para que quepa entera; con el muro desconocido no se toca. */
+const insideWall = (x: number, width: number, hostLength: number | null) =>
+  hostLength === null ? x : width >= hostLength ? hostLength / 2 : clamp(x, width / 2, hostLength - width / 2)
+
+/** La copia de una abertura va al lado sobre el mismo muro: a la derecha si cabe, si no a la izquierda, si no no hay lugar. */
+function beside({ node, hostLength }: PropTarget, factoryWidth: number): Patch | null {
+  if (hostLength === null) return null
+  const [x, y, z] = vec3(node.position)
+  const width = num(node.width, factoryWidth)
+  const right = x + width + 0.15
+  if (right + width / 2 <= hostLength) return { position: [roundMm(right), y, z] }
+  const left = x - width - 0.15
+  return left - width / 2 >= 0 ? { position: [roundMm(left), y, z] } : null
+}
+
+const doorBuilder: Builder = {
+  fields: ({ node }) => {
+    const type = text(node.doorType, 'hinged')
+    return [
+      { kind: 'select', id: 'doorType', label: 'Tipo', value: type, options: typeOptions(DOOR_TYPES, DOOR_CHOICES, type) },
+      { kind: 'number', id: 'width', label: 'Ancho', value: formatMeters(num(node.width, DOOR_DEFAULTS.width)) },
+      { kind: 'number', id: 'height', label: 'Alto', value: formatMeters(num(node.height, DOOR_DEFAULTS.height)) },
+      { kind: 'readonly', id: 'leafCount', label: 'Hojas', value: String(num(node.leafCount, 1)) },
+      { kind: 'select', id: 'openingShape', label: 'Forma del hueco', value: text(node.openingShape, 'rectangle'), options: SHAPE_OPTIONS },
+    ]
+  },
+  patch: ({ node, hostLength }, fieldId, raw) => {
+    const [x, y, z] = vec3(node.position)
+    if (fieldId === 'doorType') {
+      if (!(DOOR_CHOICES as readonly string[]).includes(raw) || raw === node.doorType) return null
+      return { doorType: raw, leafCount: raw === 'hinged' ? 1 : 2 }
+    }
+    if (fieldId === 'openingShape') return raw in SHAPES && raw !== node.openingShape ? { openingShape: raw } : null
+    if (fieldId === 'width') {
+      const width = metersPatch(raw, LIMITS.doorWidth, num(node.width, DOOR_DEFAULTS.width))
+      return width === null ? null : { width, position: [roundMm(insideWall(x, width, hostLength)), y, z] }
+    }
+    if (fieldId === 'height') {
+      const height = metersPatch(raw, LIMITS.doorHeight, num(node.height, DOOR_DEFAULTS.height))
+      // Una puerta apoya en el piso: su centro vertical es siempre la mitad de su alto.
+      return height === null ? null : { height, position: [x, roundMm(height / 2), z] }
+    }
+    return null
+  },
+  subtitle: ({ node }) => {
+    const leaves = num(node.leafCount, 1)
+    return `${DOOR_TYPES[text(node.doorType, 'hinged')] ?? 'Puerta'} de ${leaves} ${leaves === 1 ? 'hoja' : 'hojas'}`
+  },
+  duplicate: (target) => beside(target, DOOR_DEFAULTS.width),
+}
+
+/** El antepecho (altura del borde inferior de la ventana sobre el piso) sale de su centro y su alto: Pascal no lo guarda. */
+const sillOf = (node: PropNode) => Math.max(0, vec3(node.position)[1] - num(node.height, WINDOW_DEFAULTS.height) / 2)
+
+const windowBuilder: Builder = {
+  fields: ({ node }) => {
+    const type = text(node.windowType, 'fixed')
+    return [
+      { kind: 'select', id: 'windowType', label: 'Tipo', value: type, options: typeOptions(WINDOW_TYPES, WINDOW_CHOICES, type) },
+      { kind: 'number', id: 'width', label: 'Ancho', value: formatMeters(num(node.width, WINDOW_DEFAULTS.width)) },
+      { kind: 'number', id: 'height', label: 'Alto', value: formatMeters(num(node.height, WINDOW_DEFAULTS.height)) },
+      { kind: 'number', id: 'sill', label: 'Antepecho', value: formatMeters(sillOf(node)) },
+      { kind: 'select', id: 'openingShape', label: 'Forma del hueco', value: text(node.openingShape, 'rectangle'), options: SHAPE_OPTIONS },
+    ]
+  },
+  patch: ({ node, hostLength }, fieldId, raw) => {
+    const [x, y, z] = vec3(node.position)
+    const sill = sillOf(node)
+    const height = num(node.height, WINDOW_DEFAULTS.height)
+    if (fieldId === 'windowType') {
+      return (WINDOW_CHOICES as readonly string[]).includes(raw) && raw !== node.windowType ? { windowType: raw } : null
+    }
+    if (fieldId === 'openingShape') return raw in SHAPES && raw !== node.openingShape ? { openingShape: raw } : null
+    if (fieldId === 'width') {
+      const width = metersPatch(raw, LIMITS.windowWidth, num(node.width, WINDOW_DEFAULTS.width))
+      return width === null ? null : { width, position: [roundMm(insideWall(x, width, hostLength)), y, z] }
+    }
+    if (fieldId === 'height') {
+      const next = metersPatch(raw, LIMITS.windowHeight, height)
+      // La ventana conserva su antepecho: el centro sube o baja la mitad de lo que cambia el alto.
+      return next === null ? null : { height: next, position: [x, roundMm(sill + next / 2), z] }
+    }
+    if (fieldId === 'sill') {
+      const next = metersPatch(raw, LIMITS.windowSill, sill)
+      return next === null ? null : { position: [x, roundMm(next + height / 2), z] }
+    }
+    return null
+  },
+  subtitle: ({ node }) => WINDOW_TYPES[text(node.windowType, 'fixed')] ?? 'Ventana',
+  duplicate: (target) => beside(target, WINDOW_DEFAULTS.width),
+}
+
 // @@builders
@@
   zone,
+  door: doorBuilder,
+  window: windowBuilder,
   // @@types
```


- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-properties-openings shell-properties-model shell-boundaries`
Expected: PASS (`shell-properties-openings`: 11 pruebas; `shell-properties-model`: 15).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/properties-model.ts apps/web/test/shell-properties-openings.test.ts
git commit -m "feat(editor): propiedades de puerta y ventana (tipo, ancho, alto, antepecho y forma) que mantienen la abertura dentro de su muro" -- apps/web/src/editor/shell/properties-model.ts apps/web/test/shell-properties-openings.test.ts
```

---

### Task 9d: Modelo de propiedades (4 de 4): mueble

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Modify: `apps/web/src/editor/shell/properties-model.ts` (suma `itemBuilder` en los cortes `// @@builders` y `// @@types`)
- Test: `apps/web/test/shell-properties-item.test.ts`

**Interfaces:**
- Consumes: `metersPatch`, `LIMITS`, `parseDegrees`, `PropNode`, `Patch`, `vec3` (9c) y el mapa `BUILDERS` con los ayudantes del módulo (9a y 9b); `values` de `test/support/properties.ts` (9a); `nameEs` de `@/lib/catalog-es` (7a); `formatMeters`, `formatSize` (7b).
- Produces: en `fieldsFor`, `patchFor`, `titleFor`, `subtitleFor` y `duplicatePatch` el tipo `item`:
  - **Mueble:** Ancho, Alto, Profundidad (de 0,05 a 10 m) y Giro (grados, normalizado a 0–360). Pascal no guarda las medidas de un mueble: guarda las del modelo (`asset.dimensions`) y un factor de escala (`scale`). Aquí el ancho es `asset.dimensions[0] × scale[0]` (igual el alto con el índice 1 y la profundidad con el 2), y editar una medida **cambia la escala** de ese eje (`scale[i] = medida / asset.dimensions[i]`, a cuatro decimales); el giro es `rotation[1]` en radianes (la herramienta de Pascal lo da en pasos de 45°).
  - Título: el nombre del mueble en castellano (`nameEs`); subtítulo: ancho × profundidad (`2,06 × 1,01 m`).
  - Copia: medio metro hacia +x y +z. **Solo** los muebles sueltos se duplican: los pegados a un muro o al techo (`wallId`, `roofSegmentId`) no se ofrecen (dónde van sobre el muro depende de su cara y de su altura, y eso lo resuelve la herramienta de mover de Pascal).

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-properties-item.test.ts`:

```ts
import { ItemNode } from '@pascal-app/core/schema'
import { describe, expect, it } from 'vitest'
import {
  type PropTarget,
  canDuplicate,
  duplicatePatch,
  fieldsFor,
  patchFor,
  subtitleFor,
  titleFor,
} from '../src/editor/shell/properties-model'
import { values } from './support/properties'

const SOFA = { id: 'sofa', category: 'furniture', name: 'Sofa', thumbnail: '/items/sofa/thumbnail.webp', src: '/items/sofa/model.glb', dimensions: [2.06, 0.74, 1.01] }
const itemAt = (extra: Record<string, unknown> = {}): PropTarget => ({
  node: ItemNode.parse({ position: [1, 0, 1], asset: SOFA, ...extra }) as unknown as PropTarget['node'],
  hostLength: null,
  descendants: 0,
})
const scaleOf = (patch: Record<string, unknown> | null) => (patch?.scale as number[] | undefined) ?? []

describe('mueble', () => {
  it('muestra Ancho, Alto, Profundidad y Giro; las medidas son las del modelo por su escala', () => {
    const t = itemAt()
    expect(fieldsFor(t).map((f) => [f.id, f.label])).toEqual([
      ['width', 'Ancho'],
      ['height', 'Alto'],
      ['depth', 'Profundidad'],
      ['rotation', 'Giro'],
    ])
    expect(values(t)).toEqual({ width: '2,06 m', height: '0,74 m', depth: '1,01 m', rotation: '0°' })
    expect(values(itemAt({ scale: [0.5, 1, 2], rotation: [0, Math.PI / 2, 0] }))).toEqual({ width: '1,03 m', height: '0,74 m', depth: '2,02 m', rotation: '90°' })
  })

  it('el título es el nombre en castellano y el subtítulo, ancho × profundidad', () => {
    expect(titleFor(itemAt())).toBe('Sofá')
    expect(subtitleFor(itemAt())).toBe('2,06 × 1,01 m')
  })

  it('cambiar una medida cambia la escala de ese eje y deja las demás', () => {
    const [sx, sy, sz] = scaleOf(patchFor(itemAt(), 'width', '4'))
    expect((sx ?? 0) * 2.06).toBeCloseTo(4, 3)
    expect([sy, sz]).toEqual([1, 1])
    expect((scaleOf(patchFor(itemAt(), 'height', '1'))[1] ?? 0) * 0.74).toBeCloseTo(1, 3)
    expect((scaleOf(patchFor(itemAt(), 'depth', '50 cm'))[2] ?? 0) * 1.01).toBeCloseTo(0.5, 3)
  })

  it('fuera de rango se ajusta; igual al actual o no numérico no cambia nada', () => {
    expect((scaleOf(patchFor(itemAt(), 'width', '20'))[0] ?? 0) * 2.06).toBeCloseTo(10, 3)
    expect((scaleOf(patchFor(itemAt(), 'width', '0'))[0] ?? 0) * 2.06).toBeCloseTo(0.05, 3)
    expect(patchFor(itemAt(), 'width', '2,06')).toBeNull()
    expect(patchFor(itemAt(), 'width', 'ancho')).toBeNull()
  })

  it('el giro se escribe en grados, se guarda en radianes y se normaliza', () => {
    expect(patchFor(itemAt(), 'rotation', '90')).toEqual({ rotation: [0, 1.5708, 0] })
    expect(patchFor(itemAt(), 'rotation', '450°')).toEqual({ rotation: [0, 1.5708, 0] })
    expect(patchFor(itemAt(), 'rotation', '-90')).toEqual({ rotation: [0, 4.7124, 0] })
    expect(patchFor(itemAt(), 'rotation', '0')).toBeNull()
  })

  it('un mueble suelto se duplica medio metro más allá; uno pegado a un muro no se ofrece', () => {
    expect(duplicatePatch(itemAt())).toEqual({ position: [1.5, 0, 1.5] })
    expect(canDuplicate(itemAt())).toBe(true)
    expect(canDuplicate(itemAt({ wallId: 'wall_1' }))).toBe(false)
    expect(canDuplicate(itemAt({ roofSegmentId: 'roof-segment_1' }))).toBe(false)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-properties-item`
Expected: FAIL — `AssertionError: expected [] to deeply equal [ …(4) ]` (el modelo todavía no conoce `item`).

- [ ] **Paso 2: Sumar el mueble al modelo**

Modify `apps/web/src/editor/shell/properties-model.ts`:

```diff
@@
-import { zoneDisplayName } from '@/lib/editor-names'
-import { formatArea, formatMeters } from '@/lib/format'
+import { nameEs } from '@/lib/catalog-es'
+import { zoneDisplayName } from '@/lib/editor-names'
+import { formatArea, formatMeters, formatSize } from '@/lib/format'
@@
+/** Las medidas de un mueble: las del modelo (`asset.dimensions`) por la escala de cada eje. */
+function itemAxes(node: PropNode) {
+  const asset = (node.asset ?? {}) as Record<string, unknown>
+  const dimensions = Array.isArray(asset.dimensions) ? asset.dimensions : []
+  const scale = Array.isArray(node.scale) ? node.scale : []
+  return [0, 1, 2].map((axis) => {
+    const base = num(dimensions[axis], 1)
+    const factor = num(scale[axis], 1)
+    return { base, factor, size: base * factor }
+  })
+}
+
+/** El giro del mueble en grados, a un decimal (Pascal lo guarda en radianes en `rotation[1]`). */
+const itemDegrees = (node: PropNode) => {
+  const degrees = (vec3(node.rotation)[1] * 180) / Math.PI
+  return Math.round((((degrees % 360) + 360) % 360) * 10) / 10
+}
+
+const ITEM_AXES = [
+  { id: 'width', label: 'Ancho' },
+  { id: 'height', label: 'Alto' },
+  { id: 'depth', label: 'Profundidad' },
+] as const
+
+const itemBuilder: Builder = {
+  fields: ({ node }) => {
+    const axes = itemAxes(node)
+    return [
+      ...ITEM_AXES.map(({ id, label }, axis) => ({ kind: 'number' as const, id, label, value: formatMeters(axes[axis]?.size ?? 0) })),
+      { kind: 'number', id: 'rotation', label: 'Giro', value: `${String(itemDegrees(node)).replace('.', ',')}°` },
+    ]
+  },
+  patch: ({ node }, fieldId, raw) => {
+    if (fieldId === 'rotation') {
+      const degrees = parseDegrees(raw)
+      if (degrees === null || Math.abs(degrees - itemDegrees(node)) < 0.05) return null
+      const [rx, , rz] = vec3(node.rotation)
+      return { rotation: [rx, Math.round(((degrees * Math.PI) / 180) * 10000) / 10000, rz] }
+    }
+    const axis = ITEM_AXES.findIndex((a) => a.id === fieldId)
+    const axes = itemAxes(node)
+    const current = axes[axis]
+    if (!current || current.base <= 0) return null
+    const size = metersPatch(raw, LIMITS.itemSize, current.size)
+    if (size === null) return null
+    return { scale: axes.map((a, i) => (i === axis ? Math.round((size / a.base) * 10000) / 10000 : a.factor)) }
+  },
+  title: ({ node }) => {
+    const asset = (node.asset ?? {}) as Record<string, unknown>
+    return nameEs(text(asset.id, ''), text(asset.name, 'Mueble'))
+  },
+  subtitle: ({ node }) => {
+    const [width, , depth] = itemAxes(node)
+    return formatSize(width?.size ?? 0, depth?.size ?? 0)
+  },
+  duplicate: ({ node }) => {
+    if (node.wallId || node.roofSegmentId) return null
+    const [x, y, z] = vec3(node.position)
+    return { position: [x + SHIFT, y, z + SHIFT] }
+  },
+}
+
 // @@builders
@@
   window: windowBuilder,
+  item: itemBuilder,
   // @@types
```


- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-properties-item shell-properties-openings shell-properties-model shell-boundaries`
Expected: PASS (`shell-properties-item`: 6 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/properties-model.ts apps/web/test/shell-properties-item.test.ts
git commit -m "feat(editor): propiedades de mueble (ancho, alto, profundidad y giro) con las medidas del modelo por su escala" -- apps/web/src/editor/shell/properties-model.ts apps/web/test/shell-properties-item.test.ts
```

---

### Task 9e: Qué elemento se edita y cambiar un campo por el puente

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/shell/bridge/edit.ts`
- Modify: `apps/web/src/editor/shell/bridge/index.ts`, `apps/web/src/editor/pascal-bridge.ts`, `apps/web/test/support/fake-deps.ts`
- Test: `apps/web/test/shell-bridge-edit.test.ts`

**Interfaces:**
- Consumes: `PropNode`, `PropTarget` (9a) y `wallLength` (9b); `CoreDeps`, `BridgeSnapshot`, `SceneLike` (4a); `createFakeDeps` (4a); de `@pascal-app/core` y `@pascal-app/editor` (solo `pascal-bridge.ts`): `commitParametricNodeFields`.
- Produces:
  - `selectEditTarget(s: BridgeSnapshot): PropTarget | null` (`bridge/edit.ts`): el elemento que muestra el panel de propiedades: el ambiente elegido (`selection.zoneId`) o el único elemento elegido, con el largo de su muro anfitrión si es una abertura y cuántos elementos cuelgan de él. **`null`** en Ver, con nada o varios elegidos, y **si el elemento elegido ya no existe** (por ejemplo, otra pestaña o Deshacer lo borró con el panel abierto: el panel se cierra, no falla).
  - `type EditDeps = { commitFields(id: string, patch: Record<string, unknown>): void }` y `createEditSlice(deps)` con `commit(id, patch): void` y `clearSelection(): void`. En Ver, o con un elemento que ya no existe, `commit` no hace nada. `BridgeDeps = … & EditDeps`. La Tarea 9f suma `duplicate` y `remove`.
  - En `pascal-bridge.ts`: `editDeps()` con `commitFields` = `commitParametricNodeFields` de Pascal (aplica los ganchos de cada tipo y deja el cambio **en el historial**: Deshacer lo revierte).

El panel de propiedades muestra **un** elemento a la vez, y ese elemento puede desaparecer con el panel abierto (otra pestaña lo borró, o Deshacer deshizo su creación): por eso `selectEditTarget` devuelve `null` en ese caso y el panel se cierra, en lugar de fallar al leer un nodo que ya no existe.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-bridge-edit.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { selectEditTarget } from '../src/editor/shell/bridge/edit'
import type { SceneLike } from '../src/editor/shell/bridge/types'
import { createFakeDeps } from './support/fake-deps'

const SCENE = {
  building_1: { id: 'building_1', type: 'building', children: ['level_a'] },
  level_a: { id: 'level_a', type: 'level', level: 0, children: ['wall_1', 'zone_1', 'item_1'] },
  wall_1: { id: 'wall_1', type: 'wall', parentId: 'level_a', start: [0, 0], end: [4, 0], children: ['door_1', 'item_2'] },
  door_1: { id: 'door_1', type: 'door', parentId: 'wall_1', wallId: 'wall_1', position: [1, 1.05, 0] },
  item_2: { id: 'item_2', type: 'item', parentId: 'wall_1', children: ['item_3'] },
  item_3: { id: 'item_3', type: 'item', parentId: 'item_2' },
  zone_1: { id: 'zone_1', type: 'zone', name: 'Sala', polygon: [[0, 0], [4, 0], [4, 3], [0, 3]] },
  item_1: { id: 'item_1', type: 'item', position: [1, 0, 1] },
} as unknown as SceneLike['nodes']

function setup() {
  const fake = createFakeDeps()
  fake.scene.setState({ nodes: SCENE })
  const select = (selectedIds: string[], zoneId: string | null = null) =>
    fake.viewer.setState({ selection: { buildingId: 'building_1', levelId: 'level_a', zoneId, selectedIds } })
  return { ...fake, bridge: createBridge(fake.deps), select }
}

describe('selectEditTarget', () => {
  it('sin nada elegido, o con varios, no hay panel', () => {
    const { snapshot, select } = setup()
    expect(selectEditTarget(snapshot())).toBeNull()
    select(['item_1', 'wall_1'])
    expect(selectEditTarget(snapshot())).toBeNull()
  })

  it('un muro elegido trae cuántos elementos cuelgan de él, contando los de más abajo', () => {
    const { snapshot, select } = setup()
    select(['wall_1'])
    expect(selectEditTarget(snapshot())).toMatchObject({ node: { id: 'wall_1' }, hostLength: null, descendants: 3 })
  })

  it('una puerta trae el largo de su muro; un ambiente elegido (zoneId) también es un elemento', () => {
    const { snapshot, select } = setup()
    select(['door_1'])
    expect(selectEditTarget(snapshot())).toMatchObject({ node: { id: 'door_1' }, hostLength: 4, descendants: 0 })
    select([], 'zone_1')
    expect(selectEditTarget(snapshot())).toMatchObject({ node: { id: 'zone_1', type: 'zone' } })
  })

  it('si el elemento elegido ya no existe el panel se cierra en lugar de fallar', () => {
    const { snapshot, select, scene } = setup()
    select(['item_1'])
    expect(selectEditTarget(snapshot())).not.toBeNull()
    const { item_1: _borrado, ...rest } = SCENE as unknown as Record<string, unknown>
    scene.setState({ nodes: rest as unknown as SceneLike['nodes'] })
    expect(selectEditTarget(snapshot())).toBeNull()
  })

  it('en Ver no hay panel de propiedades', () => {
    const { snapshot, select, scene } = setup()
    select(['item_1'])
    scene.setState({ readOnly: true })
    expect(selectEditTarget(snapshot())).toBeNull()
  })
})

describe('commit y clearSelection', () => {
  it('commit pasa el cambio a Pascal; en Ver o con un elemento que ya no existe no hace nada', () => {
    const { bridge, deps, scene } = setup()
    bridge.commit('door_1', { width: 1 })
    expect(deps.commitFields).toHaveBeenCalledWith('door_1', { width: 1 })
    bridge.commit('no_existe', { width: 1 })
    scene.setState({ readOnly: true })
    bridge.commit('door_1', { width: 2 })
    expect(deps.commitFields).toHaveBeenCalledTimes(1)
  })

  it('clearSelection cierra el panel sin tocar la escena', () => {
    const { bridge, viewer, select } = setup()
    select(['item_1'])
    bridge.clearSelection()
    expect(viewer.getState().selection).toMatchObject({ selectedIds: [], zoneId: null })
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-edit`
Expected: FAIL — `Cannot find module '../src/editor/shell/bridge/edit'`.

- [ ] **Paso 2: Escribir la porción de edición del puente y sumarla al ensamblado y a los dobles**

Create `apps/web/src/editor/shell/bridge/edit.ts`:

```ts
import { type PropNode, type PropTarget, wallLength } from '../properties-model'
import type { CoreDeps } from './core'
import type { BridgeSnapshot, SceneLike } from './types'

export type EditDeps = {
  /** `commitParametricNodeFields` de Pascal (editor): aplica el cambio con los ganchos de cada tipo y lo deja en el historial. */
  commitFields(id: string, patch: Record<string, unknown>): void
}

/** Cuántos elementos cuelgan de `id`, contando los de más abajo (se borran con él). */
function countDescendants(nodes: SceneLike['nodes'], id: string): number {
  const seen = new Set<string>([id])
  const queue = [...(nodes[id]?.children ?? [])]
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    if (seen.has(next) || !nodes[next]) continue
    seen.add(next)
    queue.push(...(nodes[next]?.children ?? []))
  }
  return seen.size - 1
}

/** El elemento que muestra el panel de propiedades: el ambiente elegido o el único elemento elegido. `null` si no hay (o ya no existe). */
export function selectEditTarget(s: BridgeSnapshot): PropTarget | null {
  if (s.scene.readOnly) return null
  const { zoneId, selectedIds } = s.viewer.selection
  const id = zoneId ?? (selectedIds.length === 1 ? (selectedIds[0] ?? null) : null)
  const node = id ? (s.scene.nodes[id] as PropNode | undefined) : undefined
  if (!node) return null
  const hostId = typeof node.wallId === 'string' ? node.wallId : null
  const host = hostId ? (s.scene.nodes[hostId] as PropNode | undefined) : undefined
  return {
    node,
    hostLength: host?.type === 'wall' ? wallLength(host) : null,
    descendants: countDescendants(s.scene.nodes, node.id),
  }
}

export function createEditSlice(deps: CoreDeps & EditDeps) {
  const node = (id: string) => deps.scene.getState().nodes[id]
  const editable = (id: string) => !deps.scene.getState().readOnly && node(id) !== undefined
  const clearSelection = () => deps.viewer.getState().setSelection({ selectedIds: [], zoneId: null })
  return {
    /** Cambia campos de un elemento (queda en el historial de Pascal). En Ver, o si el elemento ya no existe, no hace nada. */
    commit(id: string, patch: Record<string, unknown>): void {
      if (editable(id)) deps.commitFields(id, patch)
    },
    /** Cierra el panel de propiedades (deja la selección vacía). */
    clearSelection,
  }
}
```

Modify `apps/web/src/editor/shell/bridge/index.ts`:

```diff
@@
 import { type CoreDeps, createCoreSlice } from './core'
+import { type EditDeps, createEditSlice } from './edit'
@@
-export type BridgeDeps = CoreDeps & ModeDeps & LevelsDeps & CatalogDeps & MaterialsDeps
+export type BridgeDeps = CoreDeps & ModeDeps & LevelsDeps & CatalogDeps & MaterialsDeps & EditDeps
@@
     ...createMaterialsSlice(deps),
+    ...createEditSlice(deps),
     // @@slices
```


Modify `apps/web/test/support/fake-deps.ts`:

```diff
@@
+    commitFields: vi.fn(),
     // @@fake-deps
```


- [ ] **Paso 3: Conectar la edición con Pascal**

Modify `apps/web/src/editor/pascal-bridge.ts`:

```diff
@@
+import type { EditDeps } from './shell/bridge/edit'
 import type { MaterialsDeps } from './shell/bridge/materials'
@@
+type AnyNode = Core.AnyNode
+type AnyNodeId = Core.AnyNodeId
+
+/** Editar con la misma función que usa el inspector de Pascal (`parametric-inspector.tsx`). */
+function editDeps(): EditDeps {
+  return {
+    commitFields: (id, patch) => Pascal.commitParametricNodeFields(id as AnyNodeId, patch as Partial<AnyNode>),
+  }
+}
+
 export function createPascalBridge(): ShellBridge {
@@
     ...materialsDeps(),
+    ...editDeps(),
     // @@deps
```


- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-edit shell-bridge-levels shell-bridge-catalog shell-boundaries`
Expected: PASS (`shell-bridge-edit`: 7 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …`: `commitParametricNodeFields` compila contra los tipos reales de Pascal (por eso los `as AnyNodeId`: los ids de Pascal son patrones de texto como `` `wall_${string}` ``) y Biome sin errores nuevos.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/bridge/edit.ts apps/web/src/editor/shell/bridge/index.ts apps/web/src/editor/pascal-bridge.ts apps/web/test/support/fake-deps.ts apps/web/test/shell-bridge-edit.test.ts
git commit -m "feat(editor): qué elemento se edita y cambiar un campo por el puente (entra al historial)" -- apps/web/src/editor/shell/bridge/edit.ts apps/web/src/editor/shell/bridge/index.ts apps/web/src/editor/pascal-bridge.ts apps/web/test/support/fake-deps.ts apps/web/test/shell-bridge-edit.test.ts
```

---

### Task 9f: Duplicar y borrar por el puente

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Modify: `apps/web/src/editor/shell/bridge/edit.ts`, `apps/web/src/editor/pascal-bridge.ts`, `apps/web/test/support/fake-deps.ts`, `apps/web/test/shell-bridge-edit.test.ts`
- Test: `apps/web/test/shell-bridge-edit.test.ts`

**Interfaces:**
- Consumes: `EditDeps`, `createEditSlice`, `selectEditTarget` (9e); `createClickGuard` (6a); `createFakeDeps` (4a); de `@pascal-app/core` y `@pascal-app/editor` (solo `pascal-bridge.ts`): `collectSubtree`, `cloneNodesInto`, `runAsSingleSceneHistoryStep`, `useScene`.
- Produces:
  - `EditDeps` ampliado con `duplicateNode(input: { id: string; rootPatch: Record<string, unknown> }): string | null` y `deleteNodes(ids: string[]): void`; `createEditSlice(deps)` suma `duplicate(id, rootPatch): string | null` y `remove(id): void`. En Ver, o con un elemento que ya no existe, no hacen nada.
  - En `pascal-bridge.ts`: `editDeps()` suma `deleteNodes` = `useScene.deleteNodes` (borra también lo que cuelga) y `duplicateNode`, que clona el elemento con lo que cuelga de él (`collectSubtree` y `cloneNodesInto`, que ponen ids nuevos y reasignan `parentId` y `children`), reasigna el `wallId` de las aberturas copiadas al muro nuevo (`cloneNodesInto` no lo hace), aplica `rootPatch` a la copia y lo crea todo con `createNodes` dentro de **un solo paso del historial** (`runAsSingleSceneHistoryStep`).

**Un doble clic en Duplicar crea una sola copia** (`createClickGuard`, 600 ms): Duplicar es una de las dos acciones que crean cosas (la otra es Agregar planta, Tarea 6c). `createNodes` de Pascal agrega cada nodo a la lista `children` de su padre **sin repetirlo** (`Array.from(new Set(…))`), por eso se puede pasar el muro con sus aberturas ya enlazadas. Y `deleteNodes` borra el elemento **con todos sus descendientes** (`node-actions.js`: junta `children` recursivamente); no hace nada con la escena en solo lectura.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Las pruebas nuevas se suman al archivo de la 9e: comparten la escena de ejemplo y el armado del puente con dobles.

Modify `apps/web/test/shell-bridge-edit.test.ts`:

```diff
@@
-import { describe, expect, it } from 'vitest'
+import { afterEach, describe, expect, it, vi } from 'vitest'
@@
+afterEach(() => vi.useRealTimers())
+
 const SCENE = {
@@
-describe('commit y clearSelection', () => {
+describe('commit, duplicate y remove', () => {
@@
   it('clearSelection cierra el panel sin tocar la escena', () => {
     const { bridge, viewer, select } = setup()
     select(['item_1'])
     bridge.clearSelection()
     expect(viewer.getState().selection).toMatchObject({ selectedIds: [], zoneId: null })
   })
+
+  it('duplicar crea la copia con el cambio de la copia y la deja elegida; un ambiente copiado se elige por zoneId', () => {
+    vi.useFakeTimers()
+    vi.setSystemTime(10_000)
+    const { bridge, deps, viewer } = setup()
+    expect(bridge.duplicate('item_1', { position: [1.5, 0, 1.5] })).toBe('copia_1')
+    expect(deps.duplicateNode).toHaveBeenCalledWith({ id: 'item_1', rootPatch: { position: [1.5, 0, 1.5] } })
+    expect(viewer.getState().selection).toMatchObject({ selectedIds: ['copia_1'], zoneId: null })
+    vi.setSystemTime(20_000)
+    bridge.duplicate('zone_1', { name: 'Sala (copia)' })
+    expect(viewer.getState().selection).toMatchObject({ selectedIds: [], zoneId: 'copia_1' })
+  })
+
+  it('un doble clic en Duplicar crea una sola copia', () => {
+    vi.useFakeTimers()
+    vi.setSystemTime(10_000)
+    const { bridge, deps } = setup()
+    bridge.duplicate('item_1', {})
+    expect(bridge.duplicate('item_1', {})).toBeNull()
+    expect(deps.duplicateNode).toHaveBeenCalledTimes(1)
+  })
+
+  it('duplicar no hace nada en Ver, con un elemento que ya no existe o si Pascal no pudo crear la copia', () => {
+    const { bridge, deps, scene } = setup()
+    expect(bridge.duplicate('no_existe', {})).toBeNull()
+    vi.mocked(deps.duplicateNode).mockReturnValueOnce(null)
+    vi.useFakeTimers()
+    vi.setSystemTime(90_000)
+    expect(bridge.duplicate('item_1', {})).toBeNull()
+    scene.setState({ readOnly: true })
+    vi.setSystemTime(95_000)
+    expect(bridge.duplicate('item_1', {})).toBeNull()
+    expect(deps.duplicateNode).toHaveBeenCalledTimes(1)
+  })
+
+  it('borrar pide a Pascal borrar el elemento y limpia la selección; en Ver o inexistente no hace nada', () => {
+    const { bridge, deps, viewer, select, scene } = setup()
+    select(['item_1'])
+    bridge.remove('item_1')
+    expect(deps.deleteNodes).toHaveBeenCalledWith(['item_1'])
+    expect(viewer.getState().selection).toMatchObject({ selectedIds: [], zoneId: null })
+    bridge.remove('no_existe')
+    scene.setState({ readOnly: true })
+    bridge.remove('item_1')
+    expect(deps.deleteNodes).toHaveBeenCalledTimes(1)
+  })
```



Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-edit`
Expected: FAIL — `TypeError: bridge.duplicate is not a function` y `bridge.remove is not a function` (4 pruebas; las otras 7 siguen en verde).

- [ ] **Paso 2: Sumar duplicar y borrar a la porción de edición y a los dobles**

Modify `apps/web/src/editor/shell/bridge/edit.ts`:

```diff
@@
+import { createClickGuard } from '../click-guard'
 import { type PropNode, type PropTarget, wallLength } from '../properties-model'
@@
   commitFields(id: string, patch: Record<string, unknown>): void
+  /** Clona el elemento con lo que cuelga de él (ids nuevos, un solo paso del historial), aplica `rootPatch` a la copia y devuelve su id. */
+  duplicateNode(input: { id: string; rootPatch: Record<string, unknown> }): string | null
+  /** `deleteNodes` de Pascal: borra los elementos y todo lo que cuelga de ellos. */
+  deleteNodes(ids: string[]): void
 }
@@
 export function createEditSlice(deps: CoreDeps & EditDeps) {
+  const allowDuplicate = createClickGuard()
   const node = (id: string) => deps.scene.getState().nodes[id]
@@
+    /** Duplica el elemento (con lo que cuelga de él) aplicando `rootPatch` a la copia y la deja elegida. Un doble clic crea una sola. */
+    duplicate(id: string, rootPatch: Record<string, unknown>): string | null {
+      if (!editable(id) || !allowDuplicate()) return null
+      const isZone = node(id)?.type === 'zone'
+      const copyId = deps.duplicateNode({ id, rootPatch })
+      if (!copyId) return null
+      deps.viewer.getState().setSelection(isZone ? { selectedIds: [], zoneId: copyId } : { selectedIds: [copyId], zoneId: null })
+      return copyId
+    },
+    /** Borra el elemento con todo lo que cuelga de él y cierra el panel. En Ver, o si ya no existe, no hace nada. */
+    remove(id: string): void {
+      if (!editable(id)) return
+      deps.deleteNodes([id])
+      clearSelection()
+    },
     /** Cierra el panel de propiedades (deja la selección vacía). */
     clearSelection,
```


Modify `apps/web/test/support/fake-deps.ts`:

```diff
@@
     commitFields: vi.fn(),
+    duplicateNode: vi.fn((_input: { id: string; rootPatch: Record<string, unknown> }): string | null => 'copia_1'),
+    deleteNodes: vi.fn(),
```


- [ ] **Paso 3: Conectar duplicar y borrar con Pascal**

Modify `apps/web/src/editor/pascal-bridge.ts`:

```diff
@@
-/** Editar con la misma función que usa el inspector de Pascal (`parametric-inspector.tsx`). */
+/** Editar, duplicar y borrar con las mismas funciones que usa el inspector de Pascal (`parametric-inspector.tsx`). */
@@
     commitFields: (id, patch) => Pascal.commitParametricNodeFields(id as AnyNodeId, patch as Partial<AnyNode>),
+    deleteNodes: (ids) => Pascal.useScene.getState().deleteNodes(ids as AnyNodeId[]),
+    duplicateNode: ({ id, rootPatch }) => {
+      const scene = Pascal.useScene.getState()
+      const subtree = Core.collectSubtree(scene.nodes, id as AnyNodeId)
+      if (!subtree) return null
+      const clone = Core.cloneNodesInto([subtree.root, ...subtree.descendants], {
+        rootId: id as AnyNodeId,
+        parentId: (subtree.root.parentId ?? undefined) as AnyNodeId | undefined,
+      })
+      // `cloneNodesInto` no reasigna `wallId` (la referencia al muro que aloja la abertura): en un muro copiado, sus puertas
+      // y ventanas tienen que apuntar al muro nuevo, no al original.
+      const copies = clone.nodes.map((node) => {
+        const own = (node.id === clone.rootId ? { ...node, ...rootPatch } : node) as AnyNode & { wallId?: string }
+        const host = own.wallId ? clone.idMap.get(own.wallId as AnyNodeId) : undefined
+        return host ? ({ ...own, wallId: host } as AnyNode) : (own as AnyNode)
+      })
+      Core.runAsSingleSceneHistoryStep(Pascal.useScene, () =>
+        Pascal.useScene.getState().createNodes(copies.map((node) => ({ node, parentId: (node.parentId ?? undefined) as AnyNodeId | undefined }))),
+      )
+      return clone.rootId
+    },
```


- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-edit shell-bridge-levels shell-bridge-catalog shell-boundaries`
Expected: PASS (`shell-bridge-edit`: 11 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …`: `collectSubtree`, `cloneNodesInto` y `runAsSingleSceneHistoryStep` compilan contra los tipos reales de Pascal (por eso los `as AnyNodeId`) y Biome sin errores nuevos.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/bridge/edit.ts apps/web/src/editor/pascal-bridge.ts apps/web/test/support/fake-deps.ts apps/web/test/shell-bridge-edit.test.ts
git commit -m "feat(editor): duplicar (con lo que cuelga, en un solo paso del historial) y borrar por el puente" -- apps/web/src/editor/shell/bridge/edit.ts apps/web/src/editor/pascal-bridge.ts apps/web/test/support/fake-deps.ts apps/web/test/shell-bridge-edit.test.ts
```

---

### Task 9g: Panel de propiedades conectado y montado en el shell

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/PropertiesPanel.tsx`
- Modify: `apps/web/src/editor/shell/EditorShell.tsx`
- Test: `apps/web/test/shell-properties-panel.test.tsx`

**Interfaces:**
- Consumes: `selectEditTarget`, `bridge.commit`, `bridge.duplicate`, `bridge.remove`, `bridge.clearSelection` (9e y 9f); `fieldsFor`, `patchFor`, `titleFor`, `subtitleFor`, `duplicatePatch`, `deleteWarning` (9a a 9d); `PropertiesCard` (1h); `useBridge`, `useShell` (4c); `EditorShell` (4d).
- Produces: `PropertiesPanel()` (`src/editor/shell/PropertiesPanel.tsx`): la ficha de propiedades del elemento elegido, en Editar. No dibuja nada con nada elegido, con varios, en Ver, o si el elemento elegido **ya no existe**. Cambiar un campo llama a `bridge.commit` con el cambio de `patchFor` (queda en el historial); Duplicar usa `duplicatePatch`; Borrar pide confirmación **solo** si `deleteWarning` trae un aviso (el elemento tiene cosas colgando) y entonces ofrece Cancelar y Borrar; con el panel mínimo (piso, escalera…) no hay campos ni Duplicar. `EditorShell` lo monta junto al dock, solo en Editar.

La ficha lleva `key={node.id}`: al elegir otro elemento se rehace desde cero (los campos de texto no arrastran lo escrito en el anterior) y el aviso de borrado pendiente de uno no se aplica a otro (`confirming` guarda el id al que se le pidió).

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-properties-panel.test.tsx`:

```tsx
import { DoorNode, ItemNode, WallNode } from '@pascal-app/core/schema'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import type { SceneLike } from '../src/editor/shell/bridge/types'
import { PropertiesPanel } from '../src/editor/shell/PropertiesPanel'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const WALL = WallNode.parse({ start: [0, 0], end: [4, 0] })
const DOOR = DoorNode.parse({ position: [1, 1.05, 0], wallId: WALL.id, parentId: WALL.id })
const SOFA = { id: 'sofa', category: 'furniture', name: 'Sofa', thumbnail: '/items/sofa/thumbnail.webp', src: '/items/sofa/model.glb', dimensions: [2.06, 0.74, 1.01] }
const ITEM = ItemNode.parse({ position: [1, 0, 1], asset: SOFA })
const nodes = (list: object[]) =>
  Object.fromEntries(list.map((n) => [(n as { id: string }).id, n])) as unknown as SceneLike['nodes']

function render(selectedIds: string[], extra: (fake: ReturnType<typeof createFakeDeps>) => void = () => undefined) {
  const fake = createFakeDeps()
  fake.scene.setState({ nodes: nodes([{ ...WALL, children: [DOOR.id] }, DOOR, ITEM, { id: 'slab_1', type: 'slab' }]) })
  fake.viewer.setState({ selection: { buildingId: null, levelId: null, zoneId: null, selectedIds } })
  extra(fake)
  return renderToStaticMarkup(
    <BridgeProvider bridge={createBridge(fake.deps)}>
      <PropertiesPanel />
    </BridgeProvider>,
  )
}

describe('PropertiesPanel', () => {
  it('con nada elegido, con varios o con un elemento que ya no existe no dibuja nada', () => {
    expect(render([])).toBe('')
    expect(render([DOOR.id, ITEM.id])).toBe('')
    expect(render(['item_borrado'])).toBe('')
  })

  it('una puerta muestra su tipo, sus medidas en metros con coma y los botones Duplicar y Borrar', () => {
    const markup = render([DOOR.id])
    const text = textOf(markup)
    expect(markup).toContain('aria-label="Propiedades"')
    for (const word of ['Puerta', 'Batiente de 1 hoja', 'Ancho', 'Alto', 'Hojas', 'Forma del hueco', 'Duplicar', 'Borrar']) {
      expect(text, word).toContain(word)
    }
    expect(markup).toContain('value="0,90 m"')
    expect(markup).toContain('value="2,10 m"')
    expect(text).not.toMatch(/hinged|rectangle|Width|Delete/)
  })

  it('un mueble muestra su nombre en castellano y sus medidas', () => {
    const markup = render([ITEM.id])
    const text = textOf(markup)
    for (const word of ['Sofá', '2,06 × 1,01 m', 'Profundidad', 'Giro']) expect(text, word).toContain(word)
    expect(markup).toContain('value="2,06 m"')
    expect(markup).toContain('value="0°"')
  })

  it('un tipo sin panel propio (piso) muestra solo su nombre y Borrar: sin campos y sin Duplicar', () => {
    const markup = render(['slab_1'])
    const text = textOf(markup)
    expect(text).toContain('Piso')
    expect(text).toContain('Borrar')
    expect(text).not.toContain('Duplicar')
    expect(markup).not.toContain('id="prop-')
  })

  it('en Ver no hay panel de propiedades', () => {
    expect(render([DOOR.id], ({ scene }) => scene.setState({ readOnly: true }))).toBe('')
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-properties-panel`
Expected: FAIL — `Cannot find module '../src/editor/shell/PropertiesPanel'`.

- [ ] **Paso 2: Escribir el panel conectado y montarlo**

Create `apps/web/src/editor/shell/PropertiesPanel.tsx`:

```tsx
'use client'

import {
  Box,
  BrickWall,
  DoorOpen,
  Layers2,
  type LucideIcon,
  RectangleVertical,
  Sofa,
  Square,
  SquareDashed,
  Triangle,
} from 'lucide-react'
import { useState } from 'react'
import { selectEditTarget } from './bridge/edit'
import { deleteWarning, duplicatePatch, fieldsFor, patchFor, subtitleFor, titleFor } from './properties-model'
import { PropertiesCard } from './ui/PropertiesCard'
import { useBridge, useShell } from './use-bridge'

const ICONS: Readonly<Record<string, LucideIcon>> = {
  wall: BrickWall,
  door: DoorOpen,
  window: RectangleVertical,
  item: Sofa,
  zone: SquareDashed,
  slab: Square,
  ceiling: Layers2,
  stair: Triangle,
}

/** Propiedades del elemento elegido (modo Editar). Con nada elegido, o con un elemento que ya no existe, no se dibuja. */
export function PropertiesPanel() {
  const bridge = useBridge()
  const target = useShell(selectEditTarget)
  // Id del elemento al que se le pidió borrar y está esperando confirmación (solo si tiene cosas colgando).
  const [confirming, setConfirming] = useState<string | null>(null)
  if (!target) return null
  const { node } = target
  const copy = duplicatePatch(target)
  return (
    <PropertiesCard
      key={node.id}
      title={titleFor(target)}
      subtitle={subtitleFor(target)}
      icon={ICONS[node.type] ?? Box}
      fields={fieldsFor(target)}
      onCommit={(fieldId, raw) => {
        const patch = patchFor(target, fieldId, raw)
        if (patch) bridge.commit(node.id, patch)
      }}
      onClose={bridge.clearSelection}
      onDuplicate={copy ? () => bridge.duplicate(node.id, copy) : undefined}
      onDelete={() => {
        if (deleteWarning(target)) setConfirming(node.id)
        else bridge.remove(node.id)
      }}
      confirmMessage={confirming === node.id ? deleteWarning(target) : null}
      onConfirmDelete={() => {
        setConfirming(null)
        bridge.remove(node.id)
      }}
      onCancelDelete={() => setConfirming(null)}
    />
  )
}
```

Modify `apps/web/src/editor/shell/EditorShell.tsx`:

```diff
@@
+import { PropertiesPanel } from './PropertiesPanel'
 import { ShellDock } from './ShellDock'
@@
           <ShellUndoRedo />
+          <PropertiesPanel />
         </>
```


- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-properties-panel shell-properties-card shell-connected shell-dock shell-boundaries`
Expected: PASS (`shell-properties-panel`: 5 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/PropertiesPanel.tsx apps/web/src/editor/shell/EditorShell.tsx apps/web/test/shell-properties-panel.test.tsx
git commit -m "feat(editor): panel de propiedades conectado al elemento elegido, con Duplicar y Borrar (confirmación solo si tiene cosas colgando)" -- apps/web/src/editor/shell/PropertiesPanel.tsx apps/web/src/editor/shell/EditorShell.tsx apps/web/test/shell-properties-panel.test.tsx
```

---

### Task 9h: Pruebas en navegador de las propiedades (editar, guardar, deshacer, duplicar y borrar)

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/e2e/propiedades.spec.ts`
- Modify: `apps/web/src/editor/e2e-hooks.ts` (ganchos `node`, `deleteNode`, `addDoor`, `addWindow`, `addItem` y `addZone`), `apps/web/src/editor/shell/ui/PropertiesCard.tsx` (el campo vuelve al valor del nodo si el cambio no se aplicó)
- Test: `apps/web/e2e/propiedades.spec.ts` (navegador real)

**Interfaces:**
- Consumes: el panel de propiedades montado (9g); `hook`, `counts`, `ready`, `undoRedo`, `createBlankProject` (4f); `window.__e2e.state()`, `select()` y `selectFirstWall()` (4e, 3b).
- Produces: ganchos `node(id): Record<string, unknown> | null` (el nodo como lo tiene Pascal, copia simple), `deleteNode(id)`, `addDoor()`, `addWindow()` (en el primer muro; devuelven el id o `null`), `addItem()` y `addZone()` (devuelven el id).

Cierra dos criterios del spec y dos de los puntos del **Review Focus**:
- **Criterio 6:** "al seleccionar una puerta y cambiar su ancho a 1,00 m, el nodo cambia, se guarda (sobrevive a recargar) y Deshacer lo revierte. Igual para Muro, Ventana, Mueble y Ambiente": una prueba por tipo (la misma receta con otro campo).
- **Review Focus 4 (el elemento elegido ya no existe con el panel abierto):** una prueba borra el nodo por detrás y comprueba que el panel se cierra sin errores de página.
- **Review Focus 5 (doble clic y confirmación):** un doble clic en Duplicar crea una sola copia; Borrar de un muro con una puerta pide confirmación, Cancelar no borra nada y confirmar borra las dos cosas en **un** paso del historial.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/e2e/propiedades.spec.ts`:

```ts
import { type Page, expect, test } from '@playwright/test'
import { counts, ready } from './support/editor'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { undoRedo } from './support/shell'

type Json = Record<string, unknown>

const panel = (page: Page) => page.getByRole('complementary', { name: 'Propiedades' })
const field = (page: Page, label: string) => panel(page).getByLabel(label, { exact: true })
const nodeOf = async (page: Page, id: string) => (await hook(page, 'node', id)) as Json | null
const selected = async (page: Page) => (await hook(page, 'state')).selectedIds

/** Escribe en un campo y lo confirma con Enter (así lo hace una persona). */
async function setField(page: Page, label: string, value: string) {
  const input = field(page, label)
  await input.fill(value)
  await input.press('Enter')
}

/** Espera a que el guardado de lo último termine: el chip pasa de "Guardado" a "Guardando…" y vuelve. */
async function waitSaved(page: Page) {
  const chip = page.getByTestId('save-status')
  await expect(chip).not.toHaveText('Guardado', { timeout: 10_000 })
  await expect(chip).toHaveText('Guardado', { timeout: 30_000 })
}

const withWall = async (page: Page) => {
  await hook(page, 'addWall')
}

type Case = {
  name: string
  add(page: Page): Promise<string>
  label: string
  value: string
  read(node: Json): unknown
  before: unknown
  after: unknown
}
const yaw = (node: Json) => Math.round(((node.rotation as number[] | undefined)?.[1] ?? 0) * 1000) / 1000

const CASES: Case[] = [
  { name: 'muro', add: async (page) => { await withWall(page); return (await hook(page, 'selectFirstWall')) as string }, label: 'Alto', value: '3', read: (n) => n.height, before: undefined, after: 3 },
  { name: 'puerta', add: async (page) => { await withWall(page); return (await hook(page, 'addDoor')) as string }, label: 'Ancho', value: '1', read: (n) => n.width, before: 0.9, after: 1 },
  { name: 'ventana', add: async (page) => { await withWall(page); return (await hook(page, 'addWindow')) as string }, label: 'Ancho', value: '2', read: (n) => n.width, before: 1.5, after: 2 },
  { name: 'mueble', add: async (page) => (await hook(page, 'addItem')) as string, label: 'Giro', value: '90', read: yaw, before: 0, after: 1.571 },
  { name: 'ambiente', add: async (page) => (await hook(page, 'addZone')) as string, label: 'Nombre', value: 'Cocina', read: (n) => n.name, before: 'Zone 1', after: 'Cocina' },
]

for (const c of CASES) {
  test(`${c.name}: editar un campo cambia el nodo, se guarda y Deshacer lo revierte`, async ({ page }) => {
    const url = await createBlankProject(page, c.name)
    const id = await c.add(page)
    await waitSaved(page)
    await hook(page, 'select', id)
    await expect(panel(page)).toBeVisible({ timeout: 15_000 })
    const read = async () => c.read((await nodeOf(page, id)) ?? {})
    expect(await read()).toBe(c.before)

    await setField(page, c.label, c.value)
    await expect.poll(read).toBe(c.after)

    const { undo, redo } = undoRedo(page)
    await undo.click()
    await expect.poll(read).toBe(c.before)
    await redo.click()
    await expect.poll(read).toBe(c.after)

    await waitSaved(page)
    await page.goto(url)
    await ready(page)
    expect(await read()).toBe(c.after)
  })
}

test('las medidas se escriben en metros con coma; lo que no es un número se descarta y lo fuera de rango se ajusta', async ({ page }) => {
  await createBlankProject(page, 'medidas')
  await withWall(page)
  const id = (await hook(page, 'addDoor')) as string
  await hook(page, 'select', id)
  const width = field(page, 'Ancho')
  await expect(width).toHaveValue('0,90 m', { timeout: 15_000 })

  await setField(page, 'Ancho', 'abc')
  await expect(width).toHaveValue('0,90 m')
  expect((await nodeOf(page, id))?.width).toBe(0.9)

  await setField(page, 'Ancho', '1,2')
  await expect(width).toHaveValue('1,20 m')
  await setField(page, 'Ancho', '10')
  await expect(width).toHaveValue('3,00 m')
  await setField(page, 'Ancho', '40 cm')
  await expect(width).toHaveValue('0,50 m')
})

test('Duplicar crea una sola copia aunque se haga doble clic, la deja elegida y Deshacer la quita', async ({ page }) => {
  await createBlankProject(page, 'duplicar')
  const id = (await hook(page, 'addItem')) as string
  await hook(page, 'select', id)
  const before = (await counts(page)).item ?? 0
  await panel(page).getByRole('button', { name: 'Duplicar' }).dblclick()
  await expect.poll(async () => (await counts(page)).item).toBe(before + 1)
  const ids = await selected(page)
  expect(ids).toHaveLength(1)
  expect(ids[0]).not.toBe(id)
  await undoRedo(page).undo.click()
  await expect.poll(async () => (await counts(page)).item ?? 0).toBe(before)
})

test('duplicar un muro copia también su puerta, y la puerta nueva apunta al muro nuevo', async ({ page }) => {
  await createBlankProject(page, 'copia de muro')
  await withWall(page)
  const doorId = (await hook(page, 'addDoor')) as string
  const wallId = (await hook(page, 'selectFirstWall')) as string
  await panel(page).getByRole('button', { name: 'Duplicar' }).click()
  await expect.poll(async () => (await counts(page)).wall).toBe(2)
  expect((await counts(page)).door).toBe(2)
  const copyId = (await selected(page))[0] as string
  const copyChildren = ((await nodeOf(page, copyId))?.children ?? []) as string[]
  expect(copyChildren).toHaveLength(1)
  expect(copyChildren[0]).not.toBe(doorId)
  const copyDoor = await nodeOf(page, copyChildren[0] as string)
  expect(copyDoor).toMatchObject({ wallId: copyId, parentId: copyId })
  expect(await nodeOf(page, doorId)).toMatchObject({ wallId })
})

test('Borrar un mueble suelto no pregunta; Borrar un muro con una puerta pide confirmar y Cancelar no borra nada', async ({ page }) => {
  await createBlankProject(page, 'borrar')
  const itemId = (await hook(page, 'addItem')) as string
  await hook(page, 'select', itemId)
  await panel(page).getByRole('button', { name: 'Borrar' }).click()
  await expect(panel(page)).toHaveCount(0)
  expect((await counts(page)).item ?? 0).toBe(0)

  await withWall(page)
  await hook(page, 'addDoor')
  await hook(page, 'selectFirstWall')
  await panel(page).getByRole('button', { name: 'Borrar' }).click()
  const warning = panel(page).getByRole('alert')
  await expect(warning).toContainText('Este muro tiene 1 elemento que también se borrará.')
  await warning.getByRole('button', { name: 'Cancelar' }).click()
  await expect(warning).toHaveCount(0)
  expect(await counts(page)).toMatchObject({ wall: 1, door: 1 })

  await panel(page).getByRole('button', { name: 'Borrar' }).click()
  await panel(page).getByRole('alert').getByRole('button', { name: 'Borrar' }).click()
  await expect.poll(async () => (await counts(page)).wall ?? 0).toBe(0)
  expect((await counts(page)).door ?? 0).toBe(0)
  await undoRedo(page).undo.click() // el muro y su puerta vuelven juntos: fue un solo paso del historial
  await expect.poll(async () => (await counts(page)).wall).toBe(1)
  expect((await counts(page)).door).toBe(1)
})

test('si el elemento elegido desaparece con el panel abierto, el panel se cierra sin errores', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await createBlankProject(page, 'desaparece')
  const id = (await hook(page, 'addItem')) as string
  await hook(page, 'select', id)
  await expect(panel(page)).toBeVisible({ timeout: 15_000 })
  await hook(page, 'deleteNode', id)
  await expect(panel(page)).toHaveCount(0)
  expect(errors).toEqual([])
})
```


Run (Supabase local arriba: `pnpm db:start && pnpm db:env`): `pnpm --filter @interiores/web e2e e2e/propiedades.spec.ts`
Expected: FAIL — `TypeError: window.__e2e.addItem is not a function` (los ganchos todavía no existen).

- [ ] **Paso 2: Los ganchos para armar escenas y leer nodos**

Modify `apps/web/src/editor/e2e-hooks.ts`:

```diff
@@
-import { WallNode, useScene } from '@pascal-app/core'
+import { DoorNode, ItemNode, WallNode, WindowNode, ZoneNode, useScene } from '@pascal-app/core'
@@
 type E2eOptions = { setChrome?: (chrome: PascalChrome) => void }
+
+/** Un sofá del catálogo para los ganchos que arman escenas. */
+const SOFA = {
+  id: 'sofa',
+  category: 'furniture',
+  name: 'Sofa',
+  thumbnail: '/items/sofa/thumbnail.webp',
+  src: '/items/sofa/model.glb',
+  dimensions: [2.06, 0.74, 1.01] as [number, number, number],
+}
@@
   const nodes = () => Object.values(useScene.getState().nodes) as SceneNode[]
+  const firstOf = (type: string) => nodes().find((n) => n.type === type)?.id
+  /** Crea el nodo bajo ese padre y devuelve su id (`null` si no hay padre). */
+  const createUnder = (node: { id: string }, parentId: string | undefined) => {
+    if (!parentId) return null
+    useScene.getState().createNode(node as never, parentId as never)
+    return node.id
+  }
@@
     select: (id: string | null) => useViewer.getState().setSelection({ selectedIds: id ? ([id] as never) : [], zoneId: null }),
+    /** El nodo tal como lo tiene Pascal (copia simple), o `null` si ya no existe. */
+    node: (id: string) => {
+      const node = useScene.getState().nodes[id as never]
+      return node ? (JSON.parse(JSON.stringify(node)) as Record<string, unknown>) : null
+    },
+    deleteNode: (id: string) => useScene.getState().deleteNode(id as never),
+    /** Agregan una puerta o una ventana en el primer muro y devuelven su id (`null` si no hay muro). */
+    addDoor: () => {
+      const wallId = firstOf('wall')
+      return createUnder(DoorNode.parse({ position: [1, 1.05, 0], wallId, parentId: wallId }), wallId)
+    },
+    addWindow: () => {
+      const wallId = firstOf('wall')
+      return createUnder(WindowNode.parse({ position: [2.5, 1.5, 0], wallId, parentId: wallId }), wallId)
+    },
+    /** Agregan un mueble o un ambiente en el primer nivel y devuelven su id. */
+    addItem: () => createUnder(ItemNode.parse({ position: [1, 0, 1.5], asset: SOFA }), firstOf('level')),
+    addZone: () => createUnder(ZoneNode.parse({ name: 'Zone 1', polygon: [[0, 0], [3, 0], [3, 2], [0, 2]] }), firstOf('level')),
```


- [ ] **Paso 3: Que un campo vuelva al valor del nodo si el cambio no se aplicó**

Un campo de la ficha es un `<input>` sin controlar: si la persona escribe `abc` o un valor igual al actual, el nodo no cambia y el texto escrito se queda en pantalla. Al salir del campo, la ficha lo vuelve a poner con el valor del nodo (si el cambio sí se aplicó, el campo se rehace solo con el valor nuevo porque su `key` incluye el valor).

Modify `apps/web/src/editor/shell/ui/PropertiesCard.tsx`:

```diff
@@
           onBlur={(event) => {
-            if (event.currentTarget.value !== field.value) onCommit(field.id, event.currentTarget.value)
+            const input = event.currentTarget
+            if (input.value !== field.value) onCommit(field.id, input.value)
+            // Si el cambio no se aplicó (no es un número, o es igual al actual) el campo vuelve al valor del nodo.
+            input.value = field.value
           }}
```


- [ ] **Paso 4: Tipos, lint y navegador**

Run: `pnpm --filter @interiores/web exec vitest run shell-properties-card shell-properties-panel shell-boundaries`
Expected: PASS (la ficha no cambia de marcado).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` (`DoorNode.parse`, `WindowNode.parse`, `ItemNode.parse` y `ZoneNode.parse` compilan contra los tipos reales) y Biome sin errores nuevos.

Run (Supabase local arriba): `pnpm --filter @interiores/web e2e e2e/propiedades.spec.ts e2e/niveles.spec.ts e2e/dock.spec.ts e2e/modos.spec.ts`
Expected: PASS (`propiedades.spec.ts`: 10 pruebas). Si falla la copia del muro con su puerta en `copyDoor.wallId`, la puerta copiada sigue apuntando al muro original: revisa la reasignación de `wallId` por `idMap` en `editDeps().duplicateNode` (Tarea 9f).

- [ ] **Paso 5: Commit**

```bash
git add apps/web/e2e/propiedades.spec.ts apps/web/src/editor/e2e-hooks.ts apps/web/src/editor/shell/ui/PropertiesCard.tsx
git commit -m "test(editor): editar, guardar, deshacer, duplicar y borrar desde las propiedades (muro, puerta, ventana, mueble y ambiente)" -- apps/web/e2e/propiedades.spec.ts apps/web/src/editor/e2e-hooks.ts apps/web/src/editor/shell/ui/PropertiesCard.tsx
```

---

### Task 9i: Propiedades de estantes (ancho, fondo, alto, filas, columnas e interruptores)

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Por qué existe esta subtarea (hallazgo verificado en `node_modules/@pascal-app`).** El panel de las Tareas 9a a 9d solo cubría Muro, Puerta, Ventana, Mueble y Ambiente. Los nodos **paramétricos** `shelf`, `cabinet` y `stair` (las piezas de las plantillas de comercio: góndola, exhibidor, mostrador) caían en el panel mínimo (solo Borrar), aunque en el lienzo se alargan con tiradores. Las subtareas 9i a 9l los cubren con el mismo patrón: un constructor por tipo (`Builder`), campos en metros con coma, límites que se ajustan, cambio por `commitFields` (historial de Pascal) y pruebas de ida y vuelta.

| Dato | Valor confirmado | Dónde |
|---|---|---|
| Estante: campos y límites del esquema | `width` 0,3 a 3; `depth` 0,1 a 1; `height` 0,05 a 2,5; `rows` entero 1 a 8; `columns` entero 1 a 6; `withBack`, `withSides`, `withBottom` booleanos; `style`: `wall-shelf`, `bookshelf`, `open-rack`, `cubby` | `core/dist/schema/nodes/shelf.js` (`ShelfNode`); `nodes/dist/shelf/dimensions.js` (`sanitizeShelfDimensions`) |
| Inspector de Pascal | solo pone el mínimo (`max: 1000`) y muestra `columns` en bookshelf y cubby, `withSides` solo en bookshelf, `withBack` en bookshelf y open-rack, `withBottom` en bookshelf y cubby | `nodes/dist/shelf/parametrics.js` (`shelfParametrics`, `visibleIf`) |
| Tiradores del lienzo | `NodeArrowHandles` con `linear-resize` sobre `width` (mín 0,3), `depth` (mín 0,1) y `height` (mín 0,05); aplican `{ width }`, `{ depth }`, `{ height }` sin más | `nodes/dist/shelf/definition.js` (`shelfWidthHandle`, `shelfDepthHandle`, `shelfHeightHandle`) |
| Cómo se aplica | `commitParametricNodeFields(id, patch)`: junta `derive`/`reconcile` del descriptor (el estante no tiene) y llama a `updateNodes` | `editor/src/lib/parametric-node-update.ts` |

**Un valor sobre el máximo del esquema no vuelve a cargar** (el inspector deja escribir 1000 pero `ShelfNode` lo rechaza): por eso los límites de este panel son los del esquema y no los `max` del inspector.

**Files:**
- Create: `apps/web/src/editor/shell/properties-fields.ts` (ayudantes de campos que comparten 9i, 9j y 9k), `apps/web/src/editor/shell/properties-parametric.ts` (registro y constructor del estante), `apps/web/test/shell-properties-shelf.test.ts`
- Modify: `apps/web/src/editor/shell/properties-model.ts` (exporta `Builder` y consulta `PARAMETRIC_BUILDERS`)

**Interfaces:**
- Consumes: `Builder`, `PropNode`, `PropTarget`, `Patch`, `metersPatch` y `builderOf` (9a); `formatMeters`, `formatSize` (`@/lib/format`, 7b); `FieldView` (1h); `target`/`values` de `test/support/properties.ts` (9a).
- Produces:
  - `properties-fields.ts` (hoja sin dependencias de ejecución del modelo): `num(value, fallback)`, `countPatch(raw, range, current): number | null` (un entero escrito solo con dígitos, ajustado al rango; `null` si no es un entero o no cambia), `toggleField(id, label, on): FieldView` (la ficha solo sabe de números, textos y listas: un interruptor es una lista **Sí / No** con valores `yes` / `no`) y `togglePatch(raw, current): boolean | null`.
  - `properties-parametric.ts`: `SHELF_LIMITS` (los rangos de arriba), `shelfBuilder` y `PARAMETRIC_BUILDERS: Readonly<Record<string, Builder>>` (los tipos paramétricos con panel propio; 9j y 9k suman los suyos). `builderOf` busca primero en `BUILDERS` y después aquí; **es una consulta dentro de una función**, así que el ciclo de importación entre `properties-model` y `properties-parametric` no se evalúa al cargar (los dos módulos solo usan lo del otro dentro de funciones).
  - Estante: Estilo (solo lectura), Ancho, Fondo, Alto, Filas y, según el estilo, Columnas, Paneles laterales, Panel trasero y Tabla de base. Título: el estilo ("Biblioteca", "Góndola", "Cubículos", "Estante de pared"); subtítulo: ancho × fondo; Duplicar medio metro más allá.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-properties-shelf.test.ts`:

```ts
import { ShelfNode } from '@pascal-app/core/schema'
import { describe, expect, it } from 'vitest'
import { countPatch, togglePatch } from '../src/editor/shell/properties-fields'
import {
  type PropTarget,
  canDuplicate,
  duplicatePatch,
  fieldsFor,
  patchFor,
  subtitleFor,
  titleFor,
} from '../src/editor/shell/properties-model'
import { SHELF_LIMITS } from '../src/editor/shell/properties-parametric'
import { values } from './support/properties'

const shelfAt = (extra: Record<string, unknown> = {}): PropTarget => ({
  node: ShelfNode.parse({
    position: [1, 0, 1], style: 'bookshelf', width: 1, depth: 0.5, height: 1.8, rows: 3, columns: 2,
    withBack: true, withSides: true, withBottom: false, ...extra,
  }) as unknown as PropTarget['node'],
  hostLength: null,
  descendants: 0,
})
const ids = (t: PropTarget) => fieldsFor(t).map((f) => f.id)
/** Aplica el cambio al nodo como lo hace Pascal (une los campos) para volver a leerlo. */
const applied = (t: PropTarget, patch: Record<string, unknown> | null): PropTarget => ({ ...t, node: { ...t.node, ...patch } })

describe('estante', () => {
  it('una biblioteca muestra su estilo, las tres medidas en metros, filas, columnas y los tres interruptores', () => {
    const t = shelfAt()
    expect(fieldsFor(t).map((f) => [f.id, f.label])).toEqual([
      ['style', 'Estilo'], ['width', 'Ancho'], ['depth', 'Fondo'], ['height', 'Alto'], ['rows', 'Filas'],
      ['columns', 'Columnas'], ['withSides', 'Paneles laterales'], ['withBack', 'Panel trasero'], ['withBottom', 'Tabla de base'],
    ])
    expect(values(t)).toEqual({
      style: 'Biblioteca', width: '1,00 m', depth: '0,50 m', height: '1,80 m', rows: '3', columns: '2',
      withSides: 'yes', withBack: 'yes', withBottom: 'no',
    })
  })

  it('cada estilo muestra solo lo que le corresponde (como el inspector de Pascal)', () => {
    expect(ids(shelfAt({ style: 'wall-shelf' }))).toEqual(['style', 'width', 'depth', 'height', 'rows'])
    expect(ids(shelfAt({ style: 'open-rack' }))).toEqual(['style', 'width', 'depth', 'height', 'rows', 'withBack'])
    expect(ids(shelfAt({ style: 'cubby' }))).toEqual(['style', 'width', 'depth', 'height', 'rows', 'columns', 'withBottom'])
  })

  it('fuera de rango se ajusta al límite del esquema', () => {
    const t = shelfAt()
    expect(patchFor(t, 'width', '10')).toEqual({ width: 3 })
    expect(patchFor(t, 'width', '10 cm')).toEqual({ width: 0.3 })
    expect(patchFor(t, 'depth', '5')).toEqual({ depth: 1 })
    expect(patchFor(t, 'depth', '0')).toEqual({ depth: 0.1 })
    expect(patchFor(t, 'height', '9')).toEqual({ height: 2.5 })
    expect(patchFor(t, 'height', '0')).toEqual({ height: 0.05 })
    expect(patchFor(t, 'rows', '20')).toEqual({ rows: 8 })
    expect(patchFor(t, 'rows', '0')).toEqual({ rows: 1 })
    expect(patchFor(t, 'columns', '99')).toEqual({ columns: 6 })
  })

  it('un valor igual al actual, que no es un número o de un campo que el estilo no muestra no cambia nada', () => {
    const t = shelfAt()
    for (const [id, raw] of [['width', '1'], ['width', '1,0 m'], ['width', 'ancho'], ['rows', '3'], ['rows', '2,5'], ['rows', 'tres'], ['columns', '2'], ['otro', '1']]) {
      expect(patchFor(t, id as string, raw as string), `${id} ${raw}`).toBeNull()
    }
    expect(patchFor(shelfAt({ style: 'wall-shelf' }), 'columns', '3')).toBeNull()
    expect(patchFor(shelfAt({ style: 'open-rack' }), 'withSides', 'no')).toBeNull()
  })

  it('el cambio aplicado al nodo se lee de vuelta, y el valor anterior se recupera (lo que hace Deshacer)', () => {
    const t = shelfAt()
    expect(values(applied(t, patchFor(t, 'width', '2'))).width).toBe('2,00 m')
    expect(values(applied(t, patchFor(t, 'rows', '5'))).rows).toBe('5')
    const off = applied(t, patchFor(t, 'withBack', 'no'))
    expect(values(off).withBack).toBe('no')
    expect(patchFor(off, 'withBack', 'no')).toBeNull()
    expect(patchFor(off, 'withBack', 'yes')).toEqual({ withBack: true })
    expect(values(applied(off, { withBack: true })).withBack).toBe('yes')
  })

  it('los interruptores solo aceptan Sí o No y devuelven un booleano', () => {
    const t = shelfAt()
    expect(patchFor(t, 'withBottom', 'yes')).toEqual({ withBottom: true })
    expect(patchFor(t, 'withBack', 'yes')).toBeNull()
    expect(patchFor(t, 'withBack', 'tal vez')).toBeNull()
  })

  it('los límites son los del esquema real: dentro se acepta y un paso más allá se rechaza', () => {
    for (const [key, [min, max]] of Object.entries(SHELF_LIMITS)) {
      const eps = key === 'rows' || key === 'columns' ? 1 : 0.001
      expect(ShelfNode.safeParse({ [key]: min }).success, `${key} mínimo`).toBe(true)
      expect(ShelfNode.safeParse({ [key]: max }).success, `${key} máximo`).toBe(true)
      expect(ShelfNode.safeParse({ [key]: min - eps }).success, `${key} bajo el mínimo`).toBe(false)
      expect(ShelfNode.safeParse({ [key]: max + eps }).success, `${key} sobre el máximo`).toBe(false)
    }
  })

  it('título, subtítulo y copia desplazada', () => {
    expect(titleFor(shelfAt())).toBe('Biblioteca')
    expect(titleFor(shelfAt({ style: 'open-rack' }))).toBe('Góndola')
    expect(subtitleFor(shelfAt())).toBe('1,00 × 0,50 m')
    expect(duplicatePatch(shelfAt())).toEqual({ position: [1.5, 0, 1.5] })
    expect(canDuplicate(shelfAt())).toBe(true)
  })

  it('countPatch y togglePatch', () => {
    expect(countPatch('3', [1, 8], 2)).toBe(3)
    expect(countPatch(' 9 ', [1, 8], 2)).toBe(8)
    expect(countPatch('2', [1, 8], 2)).toBeNull()
    expect(countPatch('2,5', [1, 8], 2)).toBeNull()
    expect(countPatch('-1', [1, 8], 2)).toBeNull()
    expect(togglePatch('no', true)).toBe(false)
    expect(togglePatch('yes', true)).toBeNull()
    expect(togglePatch('x', true)).toBeNull()
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-properties-shelf`
Expected: FAIL — `Cannot find module '../src/editor/shell/properties-fields'`.

- [ ] **Paso 2: Escribir los ayudantes de campos**

Create `apps/web/src/editor/shell/properties-fields.ts`:

```ts
import type { FieldView } from './ui/PropertiesCard'

/** Un número finito o, si no lo es, el valor de respaldo (los nodos de Pascal pueden venir sin el campo). */
export const num = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)

/** Un campo de cantidad: solo dígitos ("3"); fuera del rango se ajusta; solo devuelve el valor si es distinto del actual. */
export function countPatch(raw: string, range: readonly [number, number], current: number): number | null {
  if (!/^\s*\d+\s*$/.test(raw)) return null
  const next = Math.min(range[1], Math.max(range[0], Number(raw)))
  return next === current ? null : next
}

const YES_NO = [
  { value: 'yes', label: 'Sí' },
  { value: 'no', label: 'No' },
] as const

/** Un interruptor del panel: la ficha solo conoce números, textos y listas, así que va como lista de Sí y No. */
export const toggleField = (id: string, label: string, on: boolean): FieldView => ({
  kind: 'select',
  id,
  label,
  value: on ? 'yes' : 'no',
  options: YES_NO,
})

/** Lo que eligió la persona en un interruptor: `null` si no es Sí ni No, o si ya estaba así. */
export function togglePatch(raw: string, current: boolean): boolean | null {
  if (raw !== 'yes' && raw !== 'no') return null
  const next = raw === 'yes'
  return next === current ? null : next
}
```

- [ ] **Paso 3: Escribir el estante y su registro, y consultarlo desde el modelo**

Create `apps/web/src/editor/shell/properties-parametric.ts`:

```ts
import { formatMeters, formatSize } from '@/lib/format'
import { countPatch, num, toggleField, togglePatch } from './properties-fields'
import { type Builder, type Patch, type PropNode, metersPatch } from './properties-model'
import type { FieldView } from './ui/PropertiesCard'

/**
 * Rangos del estante: los de `ShelfNode` (`core/dist/schema/nodes/shelf.js`) y de `sanitizeShelfDimensions`
 * (`nodes/dist/shelf/dimensions.js`). El inspector de Pascal (`shelfParametrics`) solo pone el mínimo (`max: 1000`),
 * pero un valor sobre el máximo del esquema no vuelve a cargar.
 */
export const SHELF_LIMITS = {
  width: [0.3, 3],
  depth: [0.1, 1],
  height: [0.05, 2.5],
  rows: [1, 8],
  columns: [1, 6],
} as const satisfies Record<string, readonly [number, number]>

/** Lo que Pascal asume cuando el estante no trae el campo (los `default` de `ShelfNode`). */
const SHELF_DEFAULTS = { width: 1.2, depth: 0.3, height: 0.9, rows: 1, columns: 1 } as const

const SHELF_STYLES: Readonly<Record<string, string>> = {
  'wall-shelf': 'Estante de pared',
  bookshelf: 'Biblioteca',
  'open-rack': 'Góndola',
  cubby: 'Cubículos',
}

/** Qué columnas e interruptores tiene cada estilo (los `visibleIf` de `shelfParametrics`). */
const SHELF_SHOWS: Readonly<Record<string, readonly string[]>> = {
  'wall-shelf': [],
  bookshelf: ['columns', 'withSides', 'withBack', 'withBottom'],
  'open-rack': ['withBack'],
  cubby: ['columns', 'withBottom'],
}

/** Los interruptores: id, rótulo y valor que Pascal asume si el nodo no lo trae. */
const SHELF_FLAGS = [
  ['withSides', 'Paneles laterales', true],
  ['withBack', 'Panel trasero', false],
  ['withBottom', 'Tabla de base', false],
] as const

const styleOf = (node: PropNode) => (typeof node.style === 'string' && node.style in SHELF_STYLES ? node.style : 'wall-shelf')
const flagOf = (node: PropNode, id: string, fallback: boolean) => (typeof node[id] === 'boolean' ? (node[id] as boolean) : fallback)
const shelfSize = (node: PropNode) => ({
  width: num(node.width, SHELF_DEFAULTS.width),
  depth: num(node.depth, SHELF_DEFAULTS.depth),
  height: num(node.height, SHELF_DEFAULTS.height),
  rows: Math.round(num(node.rows, SHELF_DEFAULTS.rows)),
  columns: Math.round(num(node.columns, SHELF_DEFAULTS.columns)),
})
const change = (key: string, value: boolean | number | null): Patch | null => (value === null ? null : { [key]: value })

const shelfBuilder: Builder = {
  fields: ({ node }) => {
    const shows = SHELF_SHOWS[styleOf(node)] ?? []
    const size = shelfSize(node)
    const fields: FieldView[] = [
      { kind: 'readonly', id: 'style', label: 'Estilo', value: SHELF_STYLES[styleOf(node)] ?? '' },
      { kind: 'number', id: 'width', label: 'Ancho', value: formatMeters(size.width) },
      { kind: 'number', id: 'depth', label: 'Fondo', value: formatMeters(size.depth) },
      { kind: 'number', id: 'height', label: 'Alto', value: formatMeters(size.height) },
      { kind: 'number', id: 'rows', label: 'Filas', value: String(size.rows) },
    ]
    if (shows.includes('columns')) fields.push({ kind: 'number', id: 'columns', label: 'Columnas', value: String(size.columns) })
    for (const [id, label, fallback] of SHELF_FLAGS) if (shows.includes(id)) fields.push(toggleField(id, label, flagOf(node, id, fallback)))
    return fields
  },
  patch: ({ node }, fieldId, raw) => {
    const shows = SHELF_SHOWS[styleOf(node)] ?? []
    const size = shelfSize(node)
    if (fieldId === 'width') return change('width', metersPatch(raw, SHELF_LIMITS.width, size.width))
    if (fieldId === 'depth') return change('depth', metersPatch(raw, SHELF_LIMITS.depth, size.depth))
    if (fieldId === 'height') return change('height', metersPatch(raw, SHELF_LIMITS.height, size.height))
    if (fieldId === 'rows') return change('rows', countPatch(raw, SHELF_LIMITS.rows, size.rows))
    if (fieldId === 'columns') return shows.includes('columns') ? change('columns', countPatch(raw, SHELF_LIMITS.columns, size.columns)) : null
    const flag = SHELF_FLAGS.find(([id]) => id === fieldId)
    return flag && shows.includes(fieldId) ? change(fieldId, togglePatch(raw, flagOf(node, fieldId, flag[2]))) : null
  },
  title: ({ node }) => SHELF_STYLES[styleOf(node)] ?? 'Estante',
  subtitle: ({ node }) => formatSize(shelfSize(node).width, shelfSize(node).depth),
  duplicate: ({ node }) => {
    const [x, y, z] = Array.isArray(node.position) ? node.position : [0, 0, 0]
    return { position: [num(x, 0) + 0.5, num(y, 0), num(z, 0) + 0.5] }
  },
}

/** Los tipos paramétricos con panel propio (estante aquí; gabinete en 9j y escalera en 9k). */
export const PARAMETRIC_BUILDERS: Readonly<Record<string, Builder>> = {
  shelf: shelfBuilder,
}
```

Modify `apps/web/src/editor/shell/properties-model.ts`:

```diff
@@
-type Builder = {
+export type Builder = {
@@
+import { PARAMETRIC_BUILDERS } from './properties-parametric'
 import type { FieldView } from './ui/PropertiesCard'
@@
-const builderOf = (target: PropTarget) => BUILDERS[target.node.type]
+const builderOf = (target: PropTarget) => BUILDERS[target.node.type] ?? PARAMETRIC_BUILDERS[target.node.type]
```


- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-properties-shelf shell-properties-model shell-properties-wall-zone shell-properties-openings shell-properties-item shell-boundaries`
Expected: PASS (`shell-properties-shelf`: 9 pruebas; las demás siguen igual).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos (si se queja del orden de los `import` de `properties-model.ts`, déjalos en el orden que pida).

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/properties-fields.ts apps/web/src/editor/shell/properties-parametric.ts apps/web/src/editor/shell/properties-model.ts apps/web/test/shell-properties-shelf.test.ts
git commit -m "feat(editor): propiedades de estantes (ancho, fondo, alto, filas, columnas e interruptores) con los límites del esquema" -- apps/web/src/editor/shell/properties-fields.ts apps/web/src/editor/shell/properties-parametric.ts apps/web/src/editor/shell/properties-model.ts apps/web/test/shell-properties-shelf.test.ts
```

---

### Task 9j: Propiedades de gabinetes (ancho, fondo y alto del cuerpo)

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Hallazgo que cambia el *cómo* se aplica el cambio.** A diferencia del estante, el gabinete **no** se puede editar con `commitParametricNodeFields` a secas: sus tiradores del lienzo (`cabinetWidthHandle`, `cabinetDepthHandle`, `cabinetHeightHandle`) aplican el cambio con `commitCabinetResize`, que reacomoda los módulos de la hilera, sus vecinos en esquina y los gabinetes de pared (`nodes/dist/cabinet/definition.js`); el descriptor `cabinetParametrics` no trae `derive` ni `reconcile`, así que un cambio plano dejaría los módulos con el fondo o el alto viejo. Por eso esta tarea aplica el cambio **con el mismo tirador que usa el lienzo** (`handle.apply` y `handle.commit` con `createSceneApi(useScene)`, en un solo paso del historial con `runAsSingleSceneHistoryStep`).

| Dato | Valor confirmado | Dónde |
|---|---|---|
| Campos y límites | `width` 0,3 a 3; `depth` 0,3 a 1,2; `carcassHeight` 0,4 a 2,4 (igual en `cabinet` y `cabinet-module`) | `nodes/dist/cabinet/parametrics.js` (`cabinetParametrics`, `cabinetModuleParametrics`); `core/dist/schema/nodes/cabinet.js` (`CabinetNode`, `CabinetModuleNode`, `cabinetBoxFields`) |
| De fábrica | ancho 0,5; fondo 0,6; alto del cuerpo 0,8 | `core/dist/schema/nodes/cabinet.js` (`CABINET_METRIC_DEFAULTS`), `nodes/dist/cabinet/definition.js` (`defaults`) |
| Tiradores del lienzo | topes de arrastre más estrechos (1,2 m de ancho y 0,8 m de fondo); no se aplican aquí, que admite todo lo que el esquema vuelve a cargar | `nodes/dist/cabinet/resize-limits.js` |
| Hilera con módulos | el ancho de una hilera sale de sus módulos y Pascal **no** ofrece tiradores de ancho ni de alto sobre ella (`cabinetHandles`): el panel muestra solo cuántos módulos tiene y se edita cada módulo | `nodes/dist/cabinet/definition.js` (`cabinetHandles`), `run-layout.js` |

**Files:**
- Create: `apps/web/src/editor/shell/properties-cabinet.ts`, `apps/web/src/editor/cabinet-commit.ts`, `apps/web/test/shell-properties-cabinet.test.ts`
- Modify: `apps/web/src/editor/shell/properties-parametric.ts` (registra los dos constructores), `apps/web/src/editor/shell/properties-model.ts` (rótulo del módulo), `apps/web/src/editor/pascal-bridge.ts` (`commitFields` de los gabinetes)

**Interfaces:**
- Consumes: `Builder`, `PropNode`, `Patch`, `metersPatch` y `PARAMETRIC_BUILDERS` (9a y 9i); `num` (9i); `formatMeters`, `formatSize` (7b); `EditDeps.commitFields` (9e); de `@pascal-app/core` (solo `src/editor/`): `nodeRegistry`, `createSceneApi`, `runAsSingleSceneHistoryStep`, `useScene`.
- Produces:
  - `CABINET_LIMITS`, `cabinetBuilder` (gabinete suelto: Ancho, Fondo y Alto del cuerpo; **hilera con módulos**: solo "Módulos", solo lectura) y `cabinetModuleBuilder` (Ancho, Fondo y Alto del cuerpo). Título "Gabinete" y "Módulo de gabinete"; subtítulo ancho × fondo (o "2 módulos"). Sin Duplicar: la copia de un gabinete tiene reglas propias en Pascal (`cleanCabinetDuplicateNode`) que el clon genérico de 9f no aplica.
  - `isCabinetNode(node)` y `commitCabinetFields(node, patch)` (`src/editor/cabinet-commit.ts`): busca el tirador lineal del eje del campo (`width` en x, `depth` en z, `carcassHeight` en y; para el ancho, el último de los de eje x, que es el derecho), calcula el cambio con `apply` y lo aplica con su `commit`. Si el tirador no existe o no está visible para ese nodo (un módulo de ancho fijo, como un electrodoméstico), **no hace nada** y la ficha vuelve al valor real (9h).

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-properties-cabinet.test.ts`:

```ts
import { CabinetModuleNode, CabinetNode } from '@pascal-app/core/schema'
import { describe, expect, it } from 'vitest'
import {
  type PropTarget,
  canDuplicate,
  deleteWarning,
  fieldsFor,
  patchFor,
  subtitleFor,
  titleFor,
} from '../src/editor/shell/properties-model'
import { CABINET_LIMITS } from '../src/editor/shell/properties-cabinet'
import { values } from './support/properties'

const asTarget = (node: unknown, descendants = 0): PropTarget => ({ node: node as PropTarget['node'], hostLength: null, descendants })
const single = (extra: Record<string, unknown> = {}) => asTarget(CabinetNode.parse(extra))
const cabModule = (extra: Record<string, unknown> = {}) => asTarget(CabinetModuleNode.parse(extra))
const applied = (t: PropTarget, patch: Record<string, unknown> | null): PropTarget => ({ ...t, node: { ...t.node, ...patch } })

describe('gabinete', () => {
  it('un gabinete suelto muestra Ancho, Fondo y Alto del cuerpo en metros', () => {
    const t = single()
    expect(fieldsFor(t).map((f) => [f.id, f.label])).toEqual([['width', 'Ancho'], ['depth', 'Fondo'], ['carcassHeight', 'Alto del cuerpo']])
    expect(values(t)).toEqual({ width: '0,50 m', depth: '0,60 m', carcassHeight: '0,80 m' })
    expect(titleFor(t)).toBe('Gabinete')
    expect(subtitleFor(t)).toBe('0,50 × 0,60 m')
  })

  it('una hilera con módulos solo muestra cuántos tiene: se edita cada módulo', () => {
    const run = single({ children: ['cabinet-module_a', 'cabinet-module_b'] })
    expect(fieldsFor(run)).toEqual([{ kind: 'readonly', id: 'modules', label: 'Módulos', value: '2' }])
    expect(subtitleFor(run)).toBe('2 módulos')
    expect(subtitleFor(single({ children: ['cabinet-module_a'] }))).toBe('1 módulo')
    for (const id of ['width', 'depth', 'carcassHeight']) expect(patchFor(run, id, '1'), id).toBeNull()
  })

  it('un módulo muestra los mismos tres campos y su propio título, también al borrarlo', () => {
    const t = cabModule()
    expect(fieldsFor(t).map((f) => f.id)).toEqual(['width', 'depth', 'carcassHeight'])
    expect(titleFor(t)).toBe('Módulo de gabinete')
    expect(deleteWarning({ ...t, descendants: 1 })).toBe('Este módulo de gabinete tiene 1 elemento que también se borrará.')
  })

  it('fuera de rango se ajusta al límite', () => {
    for (const t of [single(), cabModule()]) {
      expect(patchFor(t, 'width', '10')).toEqual({ width: 3 })
      expect(patchFor(t, 'width', '10 cm')).toEqual({ width: 0.3 })
      expect(patchFor(t, 'depth', '5')).toEqual({ depth: 1.2 })
      expect(patchFor(t, 'depth', '0')).toEqual({ depth: 0.3 })
      expect(patchFor(t, 'carcassHeight', '9')).toEqual({ carcassHeight: 2.4 })
      expect(patchFor(t, 'carcassHeight', '0')).toEqual({ carcassHeight: 0.4 })
    }
  })

  it('un valor igual al actual o que no es un número no cambia nada', () => {
    for (const t of [single(), cabModule()]) {
      for (const [id, raw] of [['width', '0,5'], ['depth', '60 cm'], ['carcassHeight', '0,80'], ['width', 'ancho'], ['otro', '1']]) {
        expect(patchFor(t, id as string, raw as string), `${id} ${raw}`).toBeNull()
      }
    }
  })

  it('el cambio aplicado al nodo se lee de vuelta, y el valor anterior se recupera (lo que hace Deshacer)', () => {
    const t = single()
    const wider = applied(t, patchFor(t, 'width', '1,2'))
    expect(values(wider).width).toBe('1,20 m')
    expect(values(applied(wider, { width: 0.5 })).width).toBe('0,50 m')
    expect(values(applied(t, patchFor(t, 'carcassHeight', '0,9'))).carcassHeight).toBe('0,90 m')
  })

  it('los límites son los del esquema real: el máximo se acepta y un paso más allá se rechaza', () => {
    for (const schema of [CabinetNode, CabinetModuleNode]) {
      for (const [key, [min, max]] of Object.entries(CABINET_LIMITS)) {
        expect(schema.safeParse({ [key]: min }).success, `${key} mínimo`).toBe(true)
        expect(schema.safeParse({ [key]: max }).success, `${key} máximo`).toBe(true)
        expect(schema.safeParse({ [key]: max + 0.001 }).success, `${key} sobre el máximo`).toBe(false)
      }
      expect(schema.safeParse({ depth: 0.299 }).success).toBe(false)
      expect(schema.safeParse({ carcassHeight: 0.399 }).success).toBe(false)
    }
  })

  it('un gabinete no se duplica desde el panel', () => {
    expect(canDuplicate(single())).toBe(false)
    expect(canDuplicate(cabModule())).toBe(false)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-properties-cabinet`
Expected: FAIL — `Cannot find module '../src/editor/shell/properties-cabinet'`.

- [ ] **Paso 2: Escribir los constructores del gabinete y registrarlos**

Create `apps/web/src/editor/shell/properties-cabinet.ts`:

```ts
import { formatMeters, formatSize } from '@/lib/format'
import { num } from './properties-fields'
import { type Builder, type Patch, type PropNode, metersPatch } from './properties-model'
import type { FieldView } from './ui/PropertiesCard'

/**
 * Rangos del gabinete y de su módulo: los de `cabinetParametrics` y `cabinetModuleParametrics`
 * (`nodes/dist/cabinet/parametrics.js`), que coinciden con `CabinetNode` y `CabinetModuleNode`
 * (`core/dist/schema/nodes/cabinet.js`). Los tiradores del lienzo topan antes (1,2 m de ancho y 0,8 m de fondo,
 * `resize-limits.js`); aquí se admite todo lo que el esquema vuelve a cargar.
 */
export const CABINET_LIMITS = {
  width: [0.3, 3],
  depth: [0.3, 1.2],
  carcassHeight: [0.4, 2.4],
} as const satisfies Record<string, readonly [number, number]>

/** De fábrica (`defaults` de la definición y `CABINET_METRIC_DEFAULTS`). */
const DEFAULTS = { width: 0.5, depth: 0.6, carcassHeight: 0.8 } as const

const size = (node: PropNode) => ({
  width: num(node.width, DEFAULTS.width),
  depth: num(node.depth, DEFAULTS.depth),
  carcassHeight: num(node.carcassHeight, DEFAULTS.carcassHeight),
})

/** Los módulos de una hilera cuelgan de ella con ids `cabinet-module_…` (la misma regla de `cabinetHandles`). */
const modulesOf = (node: PropNode) =>
  Array.isArray(node.children) ? node.children.filter((id) => typeof id === 'string' && (id.startsWith('cabinet_') || id.startsWith('cabinet-module_'))).length : 0

const boxFields = (node: PropNode): FieldView[] => {
  const current = size(node)
  return [
    { kind: 'number', id: 'width', label: 'Ancho', value: formatMeters(current.width) },
    { kind: 'number', id: 'depth', label: 'Fondo', value: formatMeters(current.depth) },
    { kind: 'number', id: 'carcassHeight', label: 'Alto del cuerpo', value: formatMeters(current.carcassHeight) },
  ]
}

function boxPatch(node: PropNode, fieldId: string, raw: string): Patch | null {
  if (fieldId !== 'width' && fieldId !== 'depth' && fieldId !== 'carcassHeight') return null
  const value = metersPatch(raw, CABINET_LIMITS[fieldId], size(node)[fieldId])
  return value === null ? null : { [fieldId]: value }
}

const boxSubtitle = (node: PropNode) => formatSize(size(node).width, size(node).depth)

export const cabinetBuilder: Builder = {
  fields: ({ node }) => {
    const modules = modulesOf(node)
    return modules > 0 ? [{ kind: 'readonly', id: 'modules', label: 'Módulos', value: String(modules) }] : boxFields(node)
  },
  patch: ({ node }, fieldId, raw) => (modulesOf(node) > 0 ? null : boxPatch(node, fieldId, raw)),
  subtitle: ({ node }) => {
    const modules = modulesOf(node)
    return modules > 0 ? `${modules} ${modules === 1 ? 'módulo' : 'módulos'}` : boxSubtitle(node)
  },
}

export const cabinetModuleBuilder: Builder = {
  fields: ({ node }) => boxFields(node),
  patch: ({ node }, fieldId, raw) => boxPatch(node, fieldId, raw),
  subtitle: ({ node }) => boxSubtitle(node),
}
```

Modify `apps/web/src/editor/shell/properties-parametric.ts`:

```diff
@@
 import { formatMeters, formatSize } from '@/lib/format'
+import { cabinetBuilder, cabinetModuleBuilder } from './properties-cabinet'
 import { countPatch, num, toggleField, togglePatch } from './properties-fields'
@@
 export const PARAMETRIC_BUILDERS: Readonly<Record<string, Builder>> = {
   shelf: shelfBuilder,
+  cabinet: cabinetBuilder,
+  'cabinet-module': cabinetModuleBuilder,
 }
```

Modify `apps/web/src/editor/shell/properties-model.ts` (el rótulo del módulo para su título y para el aviso de borrado):

```diff
@@
   cabinet: { label: 'Gabinete', article: 'Este' },
+  'cabinet-module': { label: 'Módulo de gabinete', article: 'Este' },
```


- [ ] **Paso 3: Aplicar el cambio con el tirador del lienzo**

Create `apps/web/src/editor/cabinet-commit.ts`:

```ts
import * as Core from '@pascal-app/core'

type AnyNode = Core.AnyNode

/** Eje del tirador de cada campo del panel (`nodes/dist/cabinet/definition.js`: ancho en x, fondo en z, alto en y). */
const AXIS = { width: 'x', depth: 'z', carcassHeight: 'y' } as const

/** Un gabinete (`cabinet`) o uno de sus módulos (`cabinet-module`). */
export const isCabinetNode = (node: AnyNode) => node.type === 'cabinet' || node.type === 'cabinet-module'

/**
 * Cambia el ancho, el fondo o el alto con el mismo tirador que usa el lienzo: `apply` calcula el cambio y `commit`
 * (`commitCabinetResize`) reacomoda los módulos, los vecinos en esquina y los gabinetes de pared. Todo queda en **un**
 * paso del historial. Si el tirador no existe o no está visible para este nodo (un módulo de ancho fijo), no hace nada.
 */
export function commitCabinetFields(node: AnyNode, patch: Record<string, unknown>): void {
  const field = (Object.keys(AXIS) as (keyof typeof AXIS)[]).find((key) => typeof patch[key] === 'number')
  if (!field) return
  const sceneApi = Core.createSceneApi(Core.useScene)
  const handles = (Core.nodeRegistry.get(node.type)?.handles?.(node as never, sceneApi) ?? []) as unknown as {
    kind: string
    axis?: string
    visible?: (node: never, sceneApi: never) => boolean
    apply: (node: never, value: number, sceneApi: never, modifiers: { altKey: boolean; shiftKey: boolean }) => Record<string, unknown>
    commit?: (node: never, patch: never, sceneApi: never, modifiers: { altKey: boolean; shiftKey: boolean }) => void
  }[]
  const handle = handles.filter((candidate) => candidate.kind === 'linear-resize' && candidate.axis === AXIS[field]).at(-1)
  if (!handle || (handle.visible && !handle.visible(node as never, sceneApi as never))) return
  const modifiers = { altKey: false, shiftKey: false }
  const next = handle.apply(node as never, patch[field] as number, sceneApi as never, modifiers)
  Core.runAsSingleSceneHistoryStep(Core.useScene, () => {
    if (handle.commit) handle.commit(node as never, next as never, sceneApi as never, modifiers)
    else sceneApi.update(node.id as never, next as never)
  })
}
```

Modify `apps/web/src/editor/pascal-bridge.ts`:

```diff
@@
+import { commitCabinetFields, isCabinetNode } from './cabinet-commit'
 import type { EditDeps } from './shell/bridge/edit'
@@
-    commitFields: (id, patch) => Pascal.commitParametricNodeFields(id as AnyNodeId, patch as Partial<AnyNode>),
+    commitFields: (id, patch) => {
+      const node = Core.useScene.getState().nodes[id as AnyNodeId]
+      // Los gabinetes se redimensionan con la rutina de sus tiradores (reacomoda módulos y vecinos); el resto, con la del inspector.
+      if (node && isCabinetNode(node)) commitCabinetFields(node, patch)
+      else Pascal.commitParametricNodeFields(id as AnyNodeId, patch as Partial<AnyNode>)
+    },
```


- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-properties-cabinet shell-properties-shelf shell-properties-model shell-bridge-edit shell-boundaries`
Expected: PASS (`shell-properties-cabinet`: 8 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos. `commitCabinetFields` no tiene prueba unitaria (necesita el almacén real de Pascal): la cubre la Tarea 9l en el navegador (cambiar el fondo y Deshacer). Si el compilador rechaza algún acceso a `nodeRegistry`, ajústalo con `as never`, como el resto del puente.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/properties-cabinet.ts apps/web/src/editor/shell/properties-parametric.ts apps/web/src/editor/shell/properties-model.ts apps/web/src/editor/cabinet-commit.ts apps/web/src/editor/pascal-bridge.ts apps/web/test/shell-properties-cabinet.test.ts
git commit -m "feat(editor): propiedades de gabinetes (ancho, fondo y alto del cuerpo) aplicadas con la rutina de sus tiradores" -- apps/web/src/editor/shell/properties-cabinet.ts apps/web/src/editor/shell/properties-parametric.ts apps/web/src/editor/shell/properties-model.ts apps/web/src/editor/cabinet-commit.ts apps/web/src/editor/pascal-bridge.ts apps/web/test/shell-properties-cabinet.test.ts
```

---

### Task 9k: Propiedades de escaleras (ancho y escalones) y de sus tramos

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Hallazgo que parte la tarea en dos nodos.** Una escalera **recta** (la que se coloca por omisión) es un grupo (`stair`) de **tramos** (`stair-segment`): el ancho y los escalones de una recta viven en cada tramo, y el lienzo le da tiradores a los tramos, no al grupo (`stairHandles`: "Straight stairs have no parent-level shape arrows"). Solo las escaleras **curvas y de caracol** guardan `width` y `stepCount` en el propio nodo `stair`. Por eso hay dos constructores: `stair` (curva y caracol: Ancho y Escalones; recta: cuántos tramos tiene, y se elige un tramo) y `stair-segment` (Ancho y Escalones del tramo; un descanso solo tiene Ancho).

| Dato | Valor confirmado | Dónde |
|---|---|---|
| Escalera curva y caracol | `width` mín 0,4 (el panel de Pascal topa en 10); `stepCount` entero 2 a 32 (el panel lo redondea con `Math.max(2, Math.round(value))`); el inspector solo los muestra si `stairType !== 'straight'` | `nodes/dist/stair/parametrics.js` (`stairParametrics`), `nodes/dist/stair/panel.js` (`MetricControl` de Ancho y Escalones), `nodes/dist/stair/definition.js` (`MIN_CURVED_WIDTH`) |
| Tramo | `width` mín 0,5; `stepCount` 2 a 30 (solo si `segmentType === 'stair'`); `height`, `length`, `thickness` quedan fuera | `nodes/dist/stair-segment/parametrics.js` (`stairSegmentParametrics`) |
| Esquema | `StairNode` y `StairSegmentNode` solo tienen `z.number()` sin tope: los máximos (10 de ancho) son los del panel de Pascal; de fábrica ancho 1,0 y 10 escalones | `core/dist/schema/nodes/stair.js`, `stair-segment.js` |
| Cómo se aplica | `commitParametricNodeFields`: el descriptor de la escalera solo tiene `derive` al cambiar `stairType` (no se toca aquí) y el del tramo no tiene | `editor/src/lib/parametric-node-update.ts`, `nodes/dist/stair/parametrics.js` |

**Files:**
- Create: `apps/web/src/editor/shell/properties-stair.ts`, `apps/web/test/shell-properties-stair.test.ts`
- Modify: `apps/web/src/editor/shell/properties-parametric.ts` (registra los constructores), `apps/web/src/editor/shell/properties-model.ts` (rótulo del tramo), `apps/web/test/shell-properties-model.test.ts` (la escalera deja de ser un "tipo sin panel propio")

**Interfaces:**
- Consumes: `Builder`, `PropNode`, `metersPatch`, `PARAMETRIC_BUILDERS` (9a y 9i); `num`, `countPatch` (9i); `formatMeters` (7b).
- Produces: `STAIR_LIMITS`, `FLIGHT_LIMITS`, `stairBuilder` y `flightBuilder`. Sin Duplicar en ninguno (9a lo deja así para la escalera). Con esto `stair` deja de ir al panel mínimo; el piso, el cielorraso y la columna siguen yendo.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-properties-stair.test.ts`:

```ts
import { StairNode, StairSegmentNode } from '@pascal-app/core/schema'
import { describe, expect, it } from 'vitest'
import {
  type PropTarget,
  canDuplicate,
  fieldsFor,
  patchFor,
  subtitleFor,
  titleFor,
} from '../src/editor/shell/properties-model'
import { values } from './support/properties'

const asTarget = (node: unknown): PropTarget => ({ node: node as PropTarget['node'], hostLength: null, descendants: 0 })
const FLIGHT = StairSegmentNode.parse({})
const spiral = (extra: Record<string, unknown> = {}) => asTarget(StairNode.parse({ stairType: 'spiral', ...extra }))
const flight = (extra: Record<string, unknown> = {}) => asTarget(StairSegmentNode.parse(extra))
const applied = (t: PropTarget, patch: Record<string, unknown> | null): PropTarget => ({ ...t, node: { ...t.node, ...patch } })

describe('escalera curva y de caracol', () => {
  it('muestra Ancho y Escalones, y su tipo como subtítulo', () => {
    const t = spiral()
    expect(fieldsFor(t).map((f) => [f.id, f.label])).toEqual([['width', 'Ancho'], ['stepCount', 'Escalones']])
    expect(values(t)).toEqual({ width: '1,00 m', stepCount: '10' })
    expect(titleFor(t)).toBe('Escalera')
    expect(subtitleFor(t)).toBe('Caracol')
    expect(subtitleFor(asTarget(StairNode.parse({ stairType: 'curved' })))).toBe('Curva')
  })

  it('fuera de rango se ajusta; igual al actual o no numérico no cambia nada', () => {
    const t = spiral()
    expect(patchFor(t, 'width', '20')).toEqual({ width: 10 })
    expect(patchFor(t, 'width', '0,1')).toEqual({ width: 0.4 })
    expect(patchFor(t, 'stepCount', '99')).toEqual({ stepCount: 32 })
    expect(patchFor(t, 'stepCount', '1')).toEqual({ stepCount: 2 })
    for (const [id, raw] of [['width', '1'], ['stepCount', '10'], ['stepCount', '10,5'], ['stepCount', 'diez'], ['width', 'ancho'], ['otro', '1']]) {
      expect(patchFor(t, id as string, raw as string), `${id} ${raw}`).toBeNull()
    }
  })

  it('el cambio aplicado al nodo se lee de vuelta, y el valor anterior se recupera (lo que hace Deshacer)', () => {
    const t = spiral()
    expect(values(applied(t, patchFor(t, 'width', '1,5'))).width).toBe('1,50 m')
    const more = applied(t, patchFor(t, 'stepCount', '14'))
    expect(values(more).stepCount).toBe('14')
    expect(values(applied(more, { stepCount: 10 })).stepCount).toBe('10')
  })
})

describe('escalera recta', () => {
  it('solo muestra cuántos tramos tiene y pide elegir un tramo', () => {
    const t = asTarget(StairNode.parse({ children: [FLIGHT.id] }))
    expect(fieldsFor(t)).toEqual([{ kind: 'readonly', id: 'tramos', label: 'Tramos', value: '1' }])
    expect(subtitleFor(t)).toBe('Elige un tramo para cambiar sus medidas')
    expect(patchFor(t, 'width', '2')).toBeNull()
  })
})

describe('tramo de escalera', () => {
  it('un tramo muestra Ancho y Escalones; un descanso, solo Ancho', () => {
    expect(fieldsFor(flight()).map((f) => [f.id, f.label])).toEqual([['width', 'Ancho'], ['stepCount', 'Escalones']])
    expect(values(flight())).toEqual({ width: '1,00 m', stepCount: '10' })
    expect(titleFor(flight())).toBe('Tramo de escalera')
    expect(subtitleFor(flight())).toBe('10 escalones')
    expect(fieldsFor(flight({ segmentType: 'landing' })).map((f) => f.id)).toEqual(['width'])
    expect(titleFor(flight({ segmentType: 'landing' }))).toBe('Descanso')
    expect(patchFor(flight({ segmentType: 'landing' }), 'stepCount', '5')).toBeNull()
  })

  it('fuera de rango se ajusta; el cambio se lee de vuelta', () => {
    const t = flight()
    expect(patchFor(t, 'width', '20')).toEqual({ width: 10 })
    expect(patchFor(t, 'width', '0,2')).toEqual({ width: 0.5 })
    expect(patchFor(t, 'stepCount', '99')).toEqual({ stepCount: 30 })
    expect(patchFor(t, 'stepCount', '0')).toEqual({ stepCount: 2 })
    expect(patchFor(t, 'stepCount', '10')).toBeNull()
    expect(values(applied(t, patchFor(t, 'width', '1,2'))).width).toBe('1,20 m')
  })

  it('ni la escalera ni el tramo se duplican desde el panel', () => {
    expect(canDuplicate(spiral())).toBe(false)
    expect(canDuplicate(flight())).toBe(false)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-properties-stair`
Expected: FAIL — `AssertionError: expected [] to deeply equal [ [ 'width', 'Ancho' ], [ 'stepCount', 'Escalones' ] ]` (la escalera todavía va al panel mínimo).

- [ ] **Paso 2: Escribir los constructores de la escalera y del tramo y registrarlos**

Create `apps/web/src/editor/shell/properties-stair.ts`:

```ts
import { formatMeters } from '@/lib/format'
import { countPatch, num } from './properties-fields'
import { type Builder, type Patch, type PropNode, metersPatch } from './properties-model'

/**
 * Escalera curva o de caracol: `stairParametrics` (`nodes/dist/stair/parametrics.js`) pone ancho mín 0,4 y 2 a 32
 * escalones; el panel de Pascal (`stair/panel.js`) topa el ancho en 10. El esquema (`StairNode`) no tiene topes.
 */
export const STAIR_LIMITS = { width: [0.4, 10], stepCount: [2, 32] } as const satisfies Record<string, readonly [number, number]>
/** Tramo: `stairSegmentParametrics` (`nodes/dist/stair-segment/parametrics.js`): ancho mín 0,5 y 2 a 30 escalones. */
export const FLIGHT_LIMITS = { width: [0.5, 10], stepCount: [2, 30] } as const satisfies Record<string, readonly [number, number]>

/** De fábrica en `StairNode` y `StairSegmentNode`: 1 m de ancho y 10 escalones. */
const DEFAULTS = { width: 1, stepCount: 10 } as const
const TYPES: Readonly<Record<string, string>> = { straight: 'Recta', curved: 'Curva', spiral: 'Caracol' }

const isCurved = (node: PropNode) => node.stairType === 'curved' || node.stairType === 'spiral'
const widthOf = (node: PropNode) => num(node.width, DEFAULTS.width)
const stepsOf = (node: PropNode) => Math.round(num(node.stepCount, DEFAULTS.stepCount))
const change = (key: string, value: number | null): Patch | null => (value === null ? null : { [key]: value })

/** Ancho y escalones con los límites que le toquen (los mismos campos en la escalera curva y en el tramo). */
function patchOf(node: PropNode, fieldId: string, raw: string, limits: typeof STAIR_LIMITS | typeof FLIGHT_LIMITS): Patch | null {
  if (fieldId === 'width') return change('width', metersPatch(raw, limits.width, widthOf(node)))
  if (fieldId === 'stepCount') return change('stepCount', countPatch(raw, limits.stepCount, stepsOf(node)))
  return null
}

export const stairBuilder: Builder = {
  fields: ({ node }) =>
    isCurved(node)
      ? [
          { kind: 'number', id: 'width', label: 'Ancho', value: formatMeters(widthOf(node)) },
          { kind: 'number', id: 'stepCount', label: 'Escalones', value: String(stepsOf(node)) },
        ]
      : [{ kind: 'readonly', id: 'tramos', label: 'Tramos', value: String(Array.isArray(node.children) ? node.children.length : 0) }],
  patch: ({ node }, fieldId, raw) => (isCurved(node) ? patchOf(node, fieldId, raw, STAIR_LIMITS) : null),
  subtitle: ({ node }) => (isCurved(node) ? (TYPES[String(node.stairType)] ?? '') : 'Elige un tramo para cambiar sus medidas'),
}

const isLanding = (node: PropNode) => node.segmentType === 'landing'

export const flightBuilder: Builder = {
  fields: ({ node }) => [
    { kind: 'number', id: 'width', label: 'Ancho', value: formatMeters(widthOf(node)) },
    ...(isLanding(node) ? [] : [{ kind: 'number' as const, id: 'stepCount', label: 'Escalones', value: String(stepsOf(node)) }]),
  ],
  patch: ({ node }, fieldId, raw) => (fieldId === 'stepCount' && isLanding(node) ? null : patchOf(node, fieldId, raw, FLIGHT_LIMITS)),
  title: ({ node }) => (isLanding(node) ? 'Descanso' : 'Tramo de escalera'),
  subtitle: ({ node }) => (isLanding(node) ? undefined : `${stepsOf(node)} escalones`),
}
```

Modify `apps/web/src/editor/shell/properties-parametric.ts`:

```diff
@@
 import { countPatch, num, toggleField, togglePatch } from './properties-fields'
 import { type Builder, type Patch, type PropNode, metersPatch } from './properties-model'
+import { flightBuilder, stairBuilder } from './properties-stair'
@@
   'cabinet-module': cabinetModuleBuilder,
+  stair: stairBuilder,
+  'stair-segment': flightBuilder,
 }
```

Modify `apps/web/src/editor/shell/properties-model.ts` (rótulo del tramo para el aviso de borrado):

```diff
@@
   stair: { label: 'Escalera', article: 'Esta' },
+  'stair-segment': { label: 'Tramo de escalera', article: 'Este' },
```

Modify `apps/web/test/shell-properties-model.test.ts` (la escalera ya tiene panel propio; el cielorraso ocupa su lugar en la prueba del panel mínimo):

```diff
@@
-  it('un piso o una escalera solo tienen el nombre del tipo: sin campos, sin Duplicar', () => {
-    for (const [type, label] of [['slab', 'Piso'], ['stair', 'Escalera'], ['column', 'Columna'], ['raro', 'Elemento']] as const) {
+  it('un piso o un cielorraso solo tienen el nombre del tipo: sin campos, sin Duplicar', () => {
+    for (const [type, label] of [['slab', 'Piso'], ['ceiling', 'Cielorraso'], ['column', 'Columna'], ['raro', 'Elemento']] as const) {
```


- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-properties-stair shell-properties-cabinet shell-properties-shelf shell-properties-model shell-boundaries`
Expected: PASS (`shell-properties-stair`: 7 pruebas; `shell-properties-model` sigue con 7).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/properties-stair.ts apps/web/src/editor/shell/properties-parametric.ts apps/web/src/editor/shell/properties-model.ts apps/web/test/shell-properties-stair.test.ts apps/web/test/shell-properties-model.test.ts
git commit -m "feat(editor): propiedades de escaleras (ancho y escalones) y de sus tramos" -- apps/web/src/editor/shell/properties-stair.ts apps/web/src/editor/shell/properties-parametric.ts apps/web/src/editor/shell/properties-model.ts apps/web/test/shell-properties-stair.test.ts apps/web/test/shell-properties-model.test.ts
```

---

### Task 9l: Estantes, gabinetes y escaleras en el panel (íconos, ganchos y pruebas en navegador)

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Qué ajusta y qué no.** El despacho por tipo **ya está hecho** sin tocar la 9a ni la 9g: `builderOf` (9i) consulta `BUILDERS` y luego `PARAMETRIC_BUILDERS`, y el panel conectado (9g) no sabe de tipos (llama a `fieldsFor`, `patchFor`, `duplicatePatch` y `deleteWarning`), así que `shelf`, `cabinet`, `cabinet-module`, `stair` y `stair-segment` dejan de ir al panel mínimo con solo registrar su constructor. Lo que falta es lo visible y la prueba de punta a punta: el ícono de cada tipo, los ganchos para armar escenas y las pruebas en navegador con recarga y Deshacer (el criterio 6 del spec: Estante, Gabinete y Escalera, igual que los otros cinco tipos).

**Files:**
- Create: `apps/web/test/shell-properties-panel-parametric.test.tsx`, `apps/web/e2e/propiedades-parametricas.spec.ts`
- Modify: `apps/web/src/editor/shell/PropertiesPanel.tsx` (íconos), `apps/web/src/editor/e2e-hooks.ts` (ganchos `addShelf`, `addCabinet`, `addStair` y `addFlight`)
- Test: las dos pruebas nuevas (la segunda, en navegador real)

**Interfaces:**
- Consumes: `PropertiesPanel` (9g); los constructores de 9i a 9k; `hook`, `counts`, `ready`, `undoRedo`, `createBlankProject` (4f); los ganchos `node`, `select` y `deleteNode` (9h).
- Produces: íconos de `lucide-react` (`Library` para el estante, `Archive` para el gabinete y su módulo, `Triangle` para el tramo, además del ya existente de la escalera) y los ganchos `addShelf()`, `addCabinet()`, `addStair()` (caracol) y `addFlight()` (escalera recta con un tramo; devuelve el id **del tramo**), todos con el id del nodo creado.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-properties-panel-parametric.test.tsx`:

```tsx
import { CabinetNode, ShelfNode, StairNode, StairSegmentNode } from '@pascal-app/core/schema'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import type { SceneLike } from '../src/editor/shell/bridge/types'
import { PropertiesPanel } from '../src/editor/shell/PropertiesPanel'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const SHELF = ShelfNode.parse({ position: [1, 0, 1], style: 'bookshelf', width: 1, depth: 0.5, height: 1.8, rows: 3, columns: 2, withBack: true })
const CABINET = CabinetNode.parse({})
const FLIGHT = StairSegmentNode.parse({})
const STRAIGHT = StairNode.parse({ children: [FLIGHT.id] })
const SPIRAL = StairNode.parse({ stairType: 'spiral' })
const nodes = Object.fromEntries([SHELF, CABINET, FLIGHT, STRAIGHT, SPIRAL].map((n) => [n.id, n])) as unknown as SceneLike['nodes']

function render(id: string) {
  const fake = createFakeDeps()
  fake.scene.setState({ nodes })
  fake.viewer.setState({ selection: { buildingId: null, levelId: null, zoneId: null, selectedIds: [id] } })
  return renderToStaticMarkup(
    <BridgeProvider bridge={createBridge(fake.deps)}>
      <PropertiesPanel />
    </BridgeProvider>,
  )
}

describe('PropertiesPanel con los tipos paramétricos', () => {
  it('un estante muestra sus medidas, filas, columnas e interruptores, con Duplicar y su ícono', () => {
    const markup = render(SHELF.id)
    for (const word of ['Biblioteca', 'Ancho', 'Fondo', 'Alto', 'Filas', 'Columnas', 'Panel trasero', 'Duplicar', 'Borrar']) {
      expect(textOf(markup), word).toContain(word)
    }
    expect(markup).toContain('value="1,00 m"')
    expect(markup).toContain('lucide-library')
    expect(textOf(markup)).not.toMatch(/withBack|Width|Rows/)
  })

  it('un gabinete muestra su alto del cuerpo, sin Duplicar, con su ícono', () => {
    const markup = render(CABINET.id)
    expect(textOf(markup)).toContain('Alto del cuerpo')
    expect(textOf(markup)).not.toContain('Duplicar')
    expect(markup).toContain('lucide-archive')
  })

  it('una escalera de caracol muestra Ancho y Escalones', () => {
    const markup = render(SPIRAL.id)
    for (const word of ['Escalera', 'Caracol', 'Escalones']) expect(textOf(markup), word).toContain(word)
    expect(markup).toContain('value="10"')
  })

  it('una escalera recta pide elegir un tramo y no muestra Escalones', () => {
    const text = textOf(render(STRAIGHT.id))
    expect(text).toContain('Tramos')
    expect(text).toContain('Elige un tramo para cambiar sus medidas')
    expect(text).not.toContain('Escalones')
  })

  it('un tramo muestra su título y sus escalones', () => {
    const text = textOf(render(FLIGHT.id))
    for (const word of ['Tramo de escalera', 'Ancho', 'Escalones', '10 escalones']) expect(text, word).toContain(word)
  })
})
```

Create `apps/web/e2e/propiedades-parametricas.spec.ts`:

```ts
import { type Page, expect, test } from '@playwright/test'
import { ready } from './support/editor'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { undoRedo } from './support/shell'

type Json = Record<string, unknown>

const panel = (page: Page) => page.getByRole('complementary', { name: 'Propiedades' })
const field = (page: Page, label: string) => panel(page).getByLabel(label, { exact: true })
const nodeOf = async (page: Page, id: string) => (await hook(page, 'node', id)) as Json | null
const addVia = (name: string) => async (page: Page) => (await hook(page, name)) as string

/** Escribe en un campo y lo confirma con Enter (así lo hace una persona). */
async function setField(page: Page, label: string, value: string) {
  const input = field(page, label)
  await input.fill(value)
  await input.press('Enter')
}

/** Espera a que termine el guardado de lo último: el chip pasa de "Guardado" a "Guardando…" y vuelve. */
async function waitSaved(page: Page) {
  const chip = page.getByTestId('save-status')
  await expect(chip).not.toHaveText('Guardado', { timeout: 10_000 })
  await expect(chip).toHaveText('Guardado', { timeout: 30_000 })
}

const CASES = [
  { name: 'estante (ancho)', add: addVia('addShelf'), label: 'Ancho', value: '2', read: (n: Json) => n.width, before: 1, after: 2 },
  { name: 'estante (filas)', add: addVia('addShelf'), label: 'Filas', value: '5', read: (n: Json) => n.rows, before: 3, after: 5 },
  { name: 'gabinete (fondo)', add: addVia('addCabinet'), label: 'Fondo', value: '0,5', read: (n: Json) => n.depth, before: 0.6, after: 0.5 },
  { name: 'escalera de caracol (escalones)', add: addVia('addStair'), label: 'Escalones', value: '14', read: (n: Json) => n.stepCount, before: 10, after: 14 },
  { name: 'tramo de escalera recta (ancho)', add: addVia('addFlight'), label: 'Ancho', value: '1,2', read: (n: Json) => n.width, before: 1, after: 1.2 },
]

for (const c of CASES) {
  test(`${c.name}: editar un campo cambia el nodo, se guarda y Deshacer lo revierte`, async ({ page }) => {
    const url = await createBlankProject(page, c.name)
    const id = await c.add(page)
    await waitSaved(page)
    await hook(page, 'select', id)
    await expect(panel(page)).toBeVisible({ timeout: 15_000 })
    const read = async () => c.read((await nodeOf(page, id)) ?? {})
    expect(await read()).toBe(c.before)

    await setField(page, c.label, c.value)
    await expect.poll(read).toBe(c.after)

    const { undo, redo } = undoRedo(page)
    await undo.click()
    await expect.poll(read).toBe(c.before)
    await redo.click()
    await expect.poll(read).toBe(c.after)

    await waitSaved(page)
    await page.goto(url)
    await ready(page)
    expect(await read()).toBe(c.after)
  })
}

test('un estante: lo fuera de rango se ajusta al límite y lo que no es un número se descarta', async ({ page }) => {
  await createBlankProject(page, 'límites del estante')
  const id = await addVia('addShelf')(page)
  await hook(page, 'select', id)
  await expect(field(page, 'Ancho')).toHaveValue('1,00 m', { timeout: 15_000 })

  await setField(page, 'Ancho', '10')
  await expect(field(page, 'Ancho')).toHaveValue('3,00 m')
  expect((await nodeOf(page, id))?.width).toBe(3)
  await setField(page, 'Filas', '20')
  await expect(field(page, 'Filas')).toHaveValue('8')
  await setField(page, 'Filas', 'muchas')
  await expect(field(page, 'Filas')).toHaveValue('8')
})

test('un estante: el interruptor Panel trasero cambia el nodo y Deshacer lo revierte', async ({ page }) => {
  await createBlankProject(page, 'interruptor')
  const id = await addVia('addShelf')(page)
  await hook(page, 'select', id)
  const back = field(page, 'Panel trasero')
  await expect(back).toHaveValue('yes', { timeout: 15_000 })
  await back.selectOption('no')
  await expect.poll(async () => (await nodeOf(page, id))?.withBack).toBe(false)
  await undoRedo(page).undo.click()
  await expect.poll(async () => (await nodeOf(page, id))?.withBack).toBe(true)
  await expect(back).toHaveValue('yes')
})

test('una escalera recta no se edita en el grupo: muestra sus tramos y pide elegir uno', async ({ page }) => {
  await createBlankProject(page, 'recta')
  const flightId = await addVia('addFlight')(page)
  const parentId = (await nodeOf(page, flightId))?.parentId as string
  await hook(page, 'select', parentId)
  await expect(panel(page).getByText('Tramos')).toBeVisible({ timeout: 15_000 })
  await expect(field(page, 'Ancho')).toHaveCount(0)
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-properties-panel-parametric`
Expected: FAIL — `AssertionError: expected '<aside …' to contain 'lucide-library'` (todavía no hay íconos para estos tipos y se dibuja la caja genérica).

Run (Supabase local arriba: `pnpm db:start && pnpm db:env`): `pnpm --filter @interiores/web e2e e2e/propiedades-parametricas.spec.ts`
Expected: FAIL — `TypeError: window.__e2e.addShelf is not a function`.

- [ ] **Paso 2: Los íconos de cada tipo**

Modify `apps/web/src/editor/shell/PropertiesPanel.tsx`:

```diff
@@
 import {
+  Archive,
   Box,
   BrickWall,
   DoorOpen,
   Layers2,
+  Library,
   type LucideIcon,
@@
   stair: Triangle,
+  'stair-segment': Triangle,
+  shelf: Library,
+  cabinet: Archive,
+  'cabinet-module': Archive,
 }
```

- [ ] **Paso 3: Los ganchos para armar estantes, gabinetes y escaleras**

Modify `apps/web/src/editor/e2e-hooks.ts`:

```diff
@@
-import { DoorNode, ItemNode, WallNode, WindowNode, ZoneNode, useScene } from '@pascal-app/core'
+import { CabinetNode, DoorNode, ItemNode, ShelfNode, StairNode, StairSegmentNode, WallNode, WindowNode, ZoneNode, useScene } from '@pascal-app/core'
@@
     addZone: () => createUnder(ZoneNode.parse({ name: 'Zone 1', polygon: [[0, 0], [3, 0], [3, 2], [0, 2]] }), firstOf('level')),
+    /** Un estante (biblioteca de 3 filas y 2 columnas), un gabinete suelto y una escalera de caracol en el primer nivel. */
+    addShelf: () =>
+      createUnder(ShelfNode.parse({ position: [1, 0, 1.5], style: 'bookshelf', rows: 3, columns: 2, width: 1, depth: 0.4, height: 1.8, withBack: true }), firstOf('level')),
+    addCabinet: () => createUnder(CabinetNode.parse({ position: [2, 0, 1.5] }), firstOf('level')),
+    addStair: () => createUnder(StairNode.parse({ position: [3, 0, 1.5], stairType: 'spiral', width: 1, stepCount: 10 }), firstOf('level')),
+    /** Una escalera recta con un tramo; devuelve el id del tramo (el padre es `node(id).parentId`). */
+    addFlight: () => {
+      const stairId = createUnder(StairNode.parse({ position: [4, 0, 1.5] }), firstOf('level'))
+      return stairId ? createUnder(StairSegmentNode.parse({ parentId: stairId }), stairId) : null
+    },
```


- [ ] **Paso 4: Verde, tipos, lint y navegador**

Run: `pnpm --filter @interiores/web exec vitest run shell-properties-panel-parametric shell-properties-panel shell-boundaries`
Expected: PASS (`shell-properties-panel-parametric`: 5 pruebas; `shell-properties-panel`: 5).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` (`ShelfNode.parse`, `CabinetNode.parse`, `StairNode.parse` y `StairSegmentNode.parse` compilan contra los tipos reales) y Biome sin errores nuevos.

Run (Supabase local arriba): `pnpm --filter @interiores/web e2e e2e/propiedades-parametricas.spec.ts e2e/propiedades.spec.ts`
Expected: PASS (`propiedades-parametricas.spec.ts`: 8 pruebas; `propiedades.spec.ts`: 10). Esto no se pudo correr al escribir el plan. Si falla **gabinete (fondo)**, `commitCabinetFields` (9j) no encontró el tirador de fondo o no es visible para ese nodo: mira `Core.nodeRegistry.get('cabinet').handles(node, sceneApi)` en la consola y comprueba que alguno tenga `axis: 'z'`; si el fondo cambia pero Deshacer necesita dos pasos, revisa que `runAsSingleSceneHistoryStep` envuelva el `commit`. Si falla **tramo de escalera recta**, comprueba en el navegador que al hacer clic en un tramo de una escalera recta Pascal selecciona el tramo y no el grupo (de lo contrario, la escalera recta solo muestra sus tramos y habrá que ofrecer elegirlos desde el panel: se anota en `docs/ESTADO.md`).

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/PropertiesPanel.tsx apps/web/src/editor/e2e-hooks.ts apps/web/test/shell-properties-panel-parametric.test.tsx apps/web/e2e/propiedades-parametricas.spec.ts
git commit -m "test(editor): estantes, gabinetes y escaleras en el panel (íconos, ganchos y pruebas en navegador con recarga y deshacer)" -- apps/web/src/editor/shell/PropertiesPanel.tsx apps/web/src/editor/e2e-hooks.ts apps/web/test/shell-properties-panel-parametric.test.tsx apps/web/e2e/propiedades-parametricas.spec.ts
```

---

### Task 10a: Vista 3D por el puente: muros, niveles, cámara, estilo, girar, vista superior y Recorrer

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/shell/bridge/view.ts`
- Modify: `apps/web/src/editor/shell/bridge/types.ts`, `apps/web/src/editor/shell/bridge/index.ts`, `apps/web/src/editor/pascal-bridge.ts`, `apps/web/test/support/fake-deps.ts`
- Test: `apps/web/test/shell-bridge-view.test.ts`

**Interfaces:**
- Consumes: `CoreDeps`, `BridgeSnapshot`, `ViewerLike`, `EditorLike` (4a); `createBridge`, `createFakeDeps` (4a, 4b); `DECISIONS.walkthrough` (0c, lo lee la Tarea 10b); de Pascal (solo `pascal-bridge.ts`): `emitter` de `@pascal-app/core` (`camera-controls:orbit-ccw`, `orbit-cw` y `top-view`), `useEditor.setFirstPersonMode` y `flushSync` de `react-dom`.
- Produces:
  - Tipos propios en `bridge/types.ts`: `WallMode = 'up' | 'cutaway' | 'down' | 'translucent'`, `LevelMode = 'stacked' | 'exploded' | 'solo' | 'manual'`, `CameraMode = 'perspective' | 'orthographic'`, `Shading = 'solid' | 'rendered'`; `ViewerLike` suma `wallMode`, `levelMode`, `cameraMode`, `shading` y sus cuatro setters (`useViewer` de Pascal ya los tiene: `viewer/dist/store/use-viewer.d.ts`).
  - Del puente (`bridge/view.ts`): `selectViewOptions(s: BridgeSnapshot): { walls: WallMode; levels: LevelMode; camera: CameraMode; shading: Shading }`; `type ViewDeps = { moveCamera(move: 'orbit-left' | 'orbit-right' | 'top'): void; startWalkthrough(): void }`; `createViewSlice(deps)` con `setWalls(mode)`, `setLevels(mode)`, `setCamera(mode)`, `setShading(shading)`, `moveCamera(move)`, `startWalkthrough()` (solo en Ver y solo si no se está recorriendo ya) y `stopWalkthrough()`. `BridgeDeps = … & ViewDeps`.
  - En `pascal-bridge.ts`: `viewDeps()`. Los giros y la vista superior emiten los eventos de cámara de Pascal; **Recorrer** pone `isFirstPersonMode` con `flushSync` (así los controles ya están montados) y pide el puntero sobre `[data-pascal-viewer-3d] canvas` **dentro del mismo clic**: el ayudante de Pascal, `requestWalkthroughPointerLock`, no se exporta (`editor/src/lib/walkthrough-pointer-lock.ts`), así que se repite su receta (enfocar el lienzo y `requestPointerLock`; si el navegador lo rechaza por su espera tras un desbloqueo, un clic sobre el lienzo lo vuelve a pedir). Pascal ya sale solo de primera persona con `Esc` (`first-person-controls.tsx`, `setFirstPersonMode(false)` y `exitPointerLock`).

**Qué hace cada opción** (valores de `use-viewer.d.ts`): Muros Completos = `up`, Cortados = `cutaway`, Bajos = `down` (Pascal tiene además `translucent`, que el panel no ofrece); Niveles Juntos = `stacked`, Separados = `exploded`, Uno solo = `solo` (existe `manual`: si es el actual, ninguno queda marcado); Cámara Perspectiva = `perspective`, Isométrica = `orthographic`; Estilo Sólido = `solid`, Realista = `rendered`. Cámara y Estilo se ofrecen solo si el spike de la Tarea 0b los confirmó (D7); eso lo decide la Tarea 10b, aquí el puente siempre sabe hacerlo.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-bridge-view.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { selectViewOptions } from '../src/editor/shell/bridge/view'
import { createFakeDeps } from './support/fake-deps'

const setup = () => {
  const fake = createFakeDeps()
  return { ...fake, bridge: createBridge(fake.deps), options: () => selectViewOptions(fake.snapshot()) }
}

describe('opciones de la Vista 3D', () => {
  it('leen el estado real del visor de Pascal', () => {
    const { options, viewer } = setup()
    expect(options()).toEqual({ walls: 'up', levels: 'stacked', camera: 'perspective', shading: 'solid' })
    viewer.setState({ wallMode: 'translucent', levelMode: 'manual' })
    expect(options()).toMatchObject({ walls: 'translucent', levels: 'manual' })
  })

  it('cada opción llama al setter de Pascal y se refleja en la lectura', () => {
    const { bridge, options } = setup()
    bridge.setWalls('cutaway')
    bridge.setLevels('exploded')
    bridge.setCamera('orthographic')
    bridge.setShading('rendered')
    expect(options()).toEqual({ walls: 'cutaway', levels: 'exploded', camera: 'orthographic', shading: 'rendered' })
  })
})

describe('cámara y recorrido', () => {
  it('girar y la vista superior piden a Pascal el movimiento de cámara', () => {
    const { bridge, deps } = setup()
    bridge.moveCamera('orbit-left')
    bridge.moveCamera('orbit-right')
    bridge.moveCamera('top')
    expect(deps.moveCamera).toHaveBeenNthCalledWith(1, 'orbit-left')
    expect(deps.moveCamera).toHaveBeenNthCalledWith(2, 'orbit-right')
    expect(deps.moveCamera).toHaveBeenNthCalledWith(3, 'top')
  })

  it('Recorrer solo arranca en Ver y una sola vez', () => {
    const { bridge, deps, scene, editor } = setup()
    bridge.startWalkthrough()
    expect(deps.startWalkthrough).not.toHaveBeenCalled() // en Editar no se recorre
    scene.setState({ readOnly: true })
    bridge.startWalkthrough()
    bridge.startWalkthrough()
    expect(deps.startWalkthrough).toHaveBeenCalledTimes(1)
    expect(editor.getState().isFirstPersonMode).toBe(true)
  })

  it('salir del recorrido apaga la primera persona', () => {
    const { bridge, scene, editor } = setup()
    scene.setState({ readOnly: true })
    bridge.startWalkthrough()
    bridge.stopWalkthrough()
    expect(editor.getState().isFirstPersonMode).toBe(false)
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-view`
Expected: FAIL — `Cannot find module '../src/editor/shell/bridge/view'`.

- [ ] **Paso 2: Tipos propios, dobles y la porción de Vista 3D del puente**

Modify `apps/web/src/editor/shell/bridge/types.ts`:

```diff
@@
 export type SnapContext = 'wall' | 'item' | 'polygon' | 'rotation'
+export type WallMode = 'up' | 'cutaway' | 'down' | 'translucent'
+export type LevelMode = 'stacked' | 'exploded' | 'solo' | 'manual'
+export type CameraMode = 'perspective' | 'orthographic'
+export type Shading = 'solid' | 'rendered'
@@
+  wallMode: WallMode
+  levelMode: LevelMode
+  cameraMode: CameraMode
+  shading: Shading
+  setWallMode(mode: WallMode): void
+  setLevelMode(mode: LevelMode): void
+  setCameraMode(mode: CameraMode): void
+  setShading(shading: Shading): void
   // @@viewer-like
```


Modify `apps/web/test/support/fake-deps.ts`:

```diff
@@
+    wallMode: 'up',
+    levelMode: 'stacked',
+    cameraMode: 'perspective',
+    shading: 'solid',
+    setWallMode: vi.fn((wallMode: ViewerLike['wallMode']) => viewer.setState({ wallMode })),
+    setLevelMode: vi.fn((levelMode: ViewerLike['levelMode']) => viewer.setState({ levelMode })),
+    setCameraMode: vi.fn((cameraMode: ViewerLike['cameraMode']) => viewer.setState({ cameraMode })),
+    setShading: vi.fn((shading: ViewerLike['shading']) => viewer.setState({ shading })),
     // @@fake-viewer
@@
+    moveCamera: vi.fn(),
+    startWalkthrough: vi.fn(() => editor.setState({ isFirstPersonMode: true })),
     // @@fake-deps
```


Create `apps/web/src/editor/shell/bridge/view.ts`:

```ts
import type { CoreDeps } from './core'
import type { BridgeSnapshot, CameraMode, LevelMode, Shading, WallMode } from './types'

export type CameraMove = 'orbit-left' | 'orbit-right' | 'top'

export type ViewDeps = {
  /** Los eventos de cámara de Pascal (`camera-controls:orbit-ccw`, `orbit-cw` y `top-view`). */
  moveCamera(move: CameraMove): void
  /** Pasa a primera persona y pide el puntero sobre el lienzo 3D, todo dentro del clic que lo pidió (ver `pascal-bridge.ts`). */
  startWalkthrough(): void
}

export type ViewOptions = { walls: WallMode; levels: LevelMode; camera: CameraMode; shading: Shading }

/** Lo que muestra el panel Vista 3D, leído del visor de Pascal. */
export function selectViewOptions(s: BridgeSnapshot): ViewOptions {
  return { walls: s.viewer.wallMode, levels: s.viewer.levelMode, camera: s.viewer.cameraMode, shading: s.viewer.shading }
}

export function createViewSlice(deps: CoreDeps & ViewDeps) {
  const viewer = () => deps.viewer.getState()
  return {
    setWalls: (mode: WallMode): void => viewer().setWallMode(mode),
    setLevels: (mode: LevelMode): void => viewer().setLevelMode(mode),
    setCamera: (mode: CameraMode): void => viewer().setCameraMode(mode),
    setShading: (shading: Shading): void => viewer().setShading(shading),
    moveCamera: (move: CameraMove): void => deps.moveCamera(move),
    /** Recorrer es de Ver (primera persona con el puntero bloqueado); si ya se está recorriendo, no hace nada. */
    startWalkthrough(): void {
      if (!deps.scene.getState().readOnly || deps.editor.getState().isFirstPersonMode) return
      deps.startWalkthrough()
    },
    stopWalkthrough: (): void => deps.editor.getState().setFirstPersonMode(false),
  }
}
```

Modify `apps/web/src/editor/shell/bridge/index.ts`:

```diff
@@
 import { type ModeDeps, createModeSlice } from './mode'
+import { type ViewDeps, createViewSlice } from './view'
@@
-export type BridgeDeps = CoreDeps & ModeDeps & LevelsDeps & CatalogDeps & MaterialsDeps & EditDeps
+export type BridgeDeps = CoreDeps & ModeDeps & LevelsDeps & CatalogDeps & MaterialsDeps & EditDeps & ViewDeps
@@
     ...createEditSlice(deps),
+    ...createViewSlice(deps),
     // @@slices
```


- [ ] **Paso 3: Conectar la Vista 3D con Pascal**

Modify `apps/web/src/editor/pascal-bridge.ts`:

```diff
@@
 import * as Core from '@pascal-app/core'
 import * as Pascal from '@pascal-app/editor'
+import { flushSync } from 'react-dom'
@@
 import type { MaterialsDeps } from './shell/bridge/materials'
+import type { ViewDeps } from './shell/bridge/view'
@@
+const CAMERA_EVENTS = {
+  'orbit-left': 'camera-controls:orbit-ccw',
+  'orbit-right': 'camera-controls:orbit-cw',
+  top: 'camera-controls:top-view',
+} as const
+
+/**
+ * Vista 3D. Recorrer repite la receta de `requestWalkthroughPointerLock` de Pascal (no se exporta): primera persona con
+ * `flushSync`, para que sus controles ya estén montados cuando llegue el puntero, y puntero bloqueado sobre el lienzo, todo
+ * dentro del clic. Si el navegador lo rechaza (espera de ~1,25 s tras un desbloqueo), un clic sobre el lienzo lo vuelve a pedir.
+ */
+function viewDeps(): ViewDeps {
+  return {
+    moveCamera: (move) => Core.emitter.emit(CAMERA_EVENTS[move]),
+    startWalkthrough: () => {
+      flushSync(() => Pascal.useEditor.getState().setFirstPersonMode(true))
+      const canvas = document.querySelector<HTMLCanvasElement>('[data-pascal-viewer-3d] canvas')
+      if (!canvas) return
+      if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = -1
+      canvas.focus({ preventScroll: true })
+      const request = canvas.requestPointerLock() as unknown as Promise<void> | undefined
+      request?.catch?.(() => undefined)
+    },
+  }
+}
+
 export function createPascalBridge(): ShellBridge {
@@
     ...editDeps(),
+    ...viewDeps(),
     // @@deps
```


- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-bridge-view shell-selectors shell-bridge-edit shell-boundaries`
Expected: PASS (`shell-bridge-view`: 5 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` (el visor real de Pascal cumple el `ViewerLike` ampliado; `Core.emitter.emit` acepta esos tres eventos sin datos) y Biome sin errores nuevos.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/bridge/view.ts apps/web/src/editor/shell/bridge/types.ts apps/web/src/editor/shell/bridge/index.ts apps/web/src/editor/pascal-bridge.ts apps/web/test/support/fake-deps.ts apps/web/test/shell-bridge-view.test.ts
git commit -m "feat(editor): Vista 3D por el puente (muros, niveles, cámara, estilo, girar, vista superior y recorrer)" -- apps/web/src/editor/shell/bridge/view.ts apps/web/src/editor/shell/bridge/types.ts apps/web/src/editor/shell/bridge/index.ts apps/web/src/editor/pascal-bridge.ts apps/web/test/support/fake-deps.ts apps/web/test/shell-bridge-view.test.ts
```

---

### Task 10b: Panel Vista 3D y barra de cámara en Ver (con Cámara, Estilo y Recorrer según el spike)

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/view-model.ts`, `apps/web/src/editor/shell/ShellView.tsx`
- Modify: `apps/web/src/editor/shell/EditorShell.tsx`
- Test: `apps/web/test/shell-view-model.test.ts`, `apps/web/test/shell-view.test.tsx`

**Interfaces:**
- Consumes: `ViewPanel`, `ViewBar`, `ShareRender`, `ChipGroup`, `ViewAction` (1i); `selectViewOptions`, `ViewOptions` y las acciones `setWalls`, `setLevels`, `setCamera`, `setShading`, `moveCamera`, `startWalkthrough` (10a); `DECISIONS` y `Decisions` (0c: `cameraControl`, `styleControl`, `walkthrough`); `useBridge`, `useShell` (4c); `EditorShell` (4d).
- Produces:
  - `viewGroups(options: ViewOptions, decisions?): ChipGroup[]` y `viewActions(decisions?): ViewAction[]` (`view-model.ts`, puros). **Muros** (Completos, Cortados, Bajos) y **Niveles** (Juntos, Separados, Uno solo) siempre; **Cámara** (Perspectiva, Isométrica) solo si `decisions.cameraControl`, **Estilo** (Sólido, Realista) solo si `decisions.styleControl` y **Recorrer** solo si `decisions.walkthrough` (D7: lo que Pascal no permitió en el spike **se oculta**, no se deja "a confirmar"). Girar izq., Girar der. y Vista superior van siempre.
  - `ShellView(props: { decisions?: Pick<Decisions, 'cameraControl' | 'styleControl' | 'walkthrough'> })` (`ShellView.tsx`): el panel Vista 3D, la barra de cámara y Compartir/Renderizar (deshabilitados con "Pronto": criterio 11 del spec), conectados al puente. `EditorShell` lo monta **solo en Ver**; en Editar queda el dock.

El panel Vista 3D y la barra son del modo Ver porque ahí Pascal está en solo lectura y mirar es lo único que se hace; los controles de Pascal que hacían lo mismo (el selector de nivel y los ayudantes) ya están ocultos desde la Tarea 3b. Los chips usan `ChipRow` (1b): una fila de botones `aria-pressed` con la opción activa en azul noche (D8).

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-view-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { viewActions, viewGroups } from '../src/editor/shell/view-model'

const OPTIONS = { walls: 'cutaway', levels: 'solo', camera: 'perspective', shading: 'rendered' } as const
const ALL = { cameraControl: true, styleControl: true, walkthrough: true }
const NONE = { cameraControl: false, styleControl: false, walkthrough: false }
const labels = (chips: readonly { label: string }[]) => chips.map((c) => c.label)

describe('viewGroups', () => {
  it('ofrece Muros, Niveles, Cámara y Estilo, cada uno con sus opciones en castellano y la activa marcada', () => {
    const groups = viewGroups(OPTIONS, ALL)
    expect(groups.map((g) => g.title)).toEqual(['Muros', 'Niveles', 'Cámara', 'Estilo'])
    expect(labels(groups[0]?.chips ?? [])).toEqual(['Completos', 'Cortados', 'Bajos'])
    expect(labels(groups[1]?.chips ?? [])).toEqual(['Juntos', 'Separados', 'Uno solo'])
    expect(labels(groups[2]?.chips ?? [])).toEqual(['Perspectiva', 'Isométrica'])
    expect(labels(groups[3]?.chips ?? [])).toEqual(['Sólido', 'Realista'])
    expect(groups.map((g) => g.active)).toEqual(['cutaway', 'solo', 'perspective', 'rendered'])
  })

  it('cada opción lleva el valor que entiende Pascal', () => {
    const [walls, levels, camera, shading] = viewGroups(OPTIONS, ALL)
    expect(walls?.chips.map((c) => c.value)).toEqual(['up', 'cutaway', 'down'])
    expect(levels?.chips.map((c) => c.value)).toEqual(['stacked', 'exploded', 'solo'])
    expect(camera?.chips.map((c) => c.value)).toEqual(['perspective', 'orthographic'])
    expect(shading?.chips.map((c) => c.value)).toEqual(['solid', 'rendered'])
  })

  it('si el spike no confirmó Cámara y Estilo, esos grupos se ocultan', () => {
    expect(viewGroups(OPTIONS, NONE).map((g) => g.title)).toEqual(['Muros', 'Niveles'])
    expect(viewGroups(OPTIONS, { ...NONE, styleControl: true }).map((g) => g.title)).toEqual(['Muros', 'Niveles', 'Estilo'])
  })

  it('un modo de Pascal que el panel no ofrece (translúcido, manual) no deja nada marcado', () => {
    const [walls, levels] = viewGroups({ ...OPTIONS, walls: 'translucent', levels: 'manual' }, NONE)
    expect(walls?.chips.some((c) => c.value === walls.active)).toBe(false)
    expect(levels?.chips.some((c) => c.value === levels.active)).toBe(false)
  })
})

describe('viewActions', () => {
  it('Girar izq., Girar der., Vista superior y Recorrer, con su ícono', () => {
    const actions = viewActions(ALL)
    expect(actions.map((a) => [a.id, a.label])).toEqual([
      ['orbit-left', 'Girar izq.'],
      ['orbit-right', 'Girar der.'],
      ['top', 'Vista superior'],
      ['walk', 'Recorrer'],
    ])
    for (const action of actions) expect(action.icon, action.id).toBeDefined()
  })

  it('si el spike no confirmó Recorrer, el botón no está', () => {
    expect(viewActions(NONE).map((a) => a.id)).toEqual(['orbit-left', 'orbit-right', 'top'])
  })
})
```

Create `apps/web/test/shell-view.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { EditorShell } from '../src/editor/shell/EditorShell'
import { ShellView } from '../src/editor/shell/ShellView'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')
const NONE = { cameraControl: false, styleControl: false, walkthrough: false }
const pressed = (markup: string) =>
  [...markup.matchAll(/aria-pressed="true"[^>]*>(?:<svg[\s\S]*?<\/svg>)?([^<]+)<\/button>/g)].map((m) => m[1])

function render(node: React.ReactNode) {
  const fake = createFakeDeps()
  fake.viewer.setState({ wallMode: 'cutaway', levelMode: 'solo', shading: 'rendered' })
  return renderToStaticMarkup(<BridgeProvider bridge={createBridge(fake.deps)}>{node}</BridgeProvider>)
}

describe('ShellView', () => {
  const all = { cameraControl: true, styleControl: true, walkthrough: true }

  it('muestra el panel Vista 3D, la barra de cámara y Compartir y Renderizar deshabilitados con "Pronto"', () => {
    const markup = render(<ShellView decisions={all} />)
    const text = textOf(markup)
    expect(markup).toContain('aria-label="Vista 3D"')
    expect(markup).toContain('role="toolbar"')
    for (const word of ['Muros', 'Niveles', 'Cámara', 'Estilo', 'Girar izq.', 'Girar der.', 'Vista superior', 'Recorrer', 'Compartir', 'Renderizar']) {
      expect(text, word).toContain(word)
    }
    expect(markup.match(/Pronto/g)).toHaveLength(2)
    expect(markup.match(/<button[^>]*disabled=""/g)).toHaveLength(2)
  })

  it('marca lo que Pascal tiene: muros cortados, un solo nivel y estilo realista', () => {
    expect(pressed(render(<ShellView decisions={all} />))).toEqual(['Cortados', 'Uno solo', 'Perspectiva', 'Realista'])
  })

  it('sin Cámara, Estilo ni Recorrer del spike, esos controles no están', () => {
    const text = textOf(render(<ShellView decisions={NONE} />))
    for (const word of ['Cámara', 'Estilo', 'Perspectiva', 'Realista', 'Recorrer']) expect(text, word).not.toContain(word)
    expect(text).toContain('Girar izq.')
  })
})

describe('EditorShell según el modo', () => {
  const shell = (readOnly: boolean) => {
    const fake = createFakeDeps()
    fake.scene.setState({ readOnly })
    return renderToStaticMarkup(
      <EditorShell bridge={createBridge(fake.deps)} catalog={[]} projectName="Loft" saveStatus="saved" onBack={() => undefined} />,
    )
  }

  it('en Ver muestra la Vista 3D y no el dock; en Editar, al revés', () => {
    const view = shell(true)
    expect(view).toContain('aria-label="Vista 3D"')
    expect(view).not.toContain('aria-label="Herramientas de edición"')
    const edit = shell(false)
    expect(edit).toContain('aria-label="Herramientas de edición"')
    expect(edit).not.toContain('aria-label="Vista 3D"')
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-view-model shell-view`
Expected: FAIL — `Cannot find module '../src/editor/shell/view-model'` y `Cannot find module '../src/editor/shell/ShellView'`.

- [ ] **Paso 2: Escribir el modelo de la Vista 3D**

Create `apps/web/src/editor/shell/view-model.ts`:

```ts
import { Footprints, Maximize, RotateCcw, RotateCw } from 'lucide-react'
import type { ViewOptions } from './bridge/view'
import { DECISIONS, type Decisions } from './decisions'
import type { ChipGroup, ViewAction } from './ui/ViewControls'

type ViewDecisions = Pick<Decisions, 'cameraControl' | 'styleControl' | 'walkthrough'>

const WALL_CHIPS = [
  { value: 'up', label: 'Completos' },
  { value: 'cutaway', label: 'Cortados' },
  { value: 'down', label: 'Bajos' },
] as const
const LEVEL_CHIPS = [
  { value: 'stacked', label: 'Juntos' },
  { value: 'exploded', label: 'Separados' },
  { value: 'solo', label: 'Uno solo' },
] as const
const CAMERA_CHIPS = [
  { value: 'perspective', label: 'Perspectiva' },
  { value: 'orthographic', label: 'Isométrica' },
] as const
const STYLE_CHIPS = [
  { value: 'solid', label: 'Sólido' },
  { value: 'rendered', label: 'Realista' },
] as const

/** Los grupos del panel Vista 3D. Cámara y Estilo solo si el spike de la Tarea 0b los confirmó (D7); si no, se ocultan. */
export function viewGroups(options: ViewOptions, decisions: ViewDecisions = DECISIONS): ChipGroup[] {
  return [
    { id: 'walls', title: 'Muros', chips: WALL_CHIPS, active: options.walls },
    { id: 'levels', title: 'Niveles', chips: LEVEL_CHIPS, active: options.levels },
    ...(decisions.cameraControl ? [{ id: 'camera', title: 'Cámara', chips: CAMERA_CHIPS, active: options.camera }] : []),
    ...(decisions.styleControl ? [{ id: 'shading', title: 'Estilo', chips: STYLE_CHIPS, active: options.shading }] : []),
  ]
}

/** Las acciones de la barra de cámara. Recorrer solo si el spike confirmó el puntero bloqueado (D7). */
export function viewActions(decisions: ViewDecisions = DECISIONS): ViewAction[] {
  return [
    { id: 'orbit-left', label: 'Girar izq.', icon: RotateCcw },
    { id: 'orbit-right', label: 'Girar der.', icon: RotateCw },
    { id: 'top', label: 'Vista superior', icon: Maximize },
    ...(decisions.walkthrough ? [{ id: 'walk', label: 'Recorrer', icon: Footprints }] : []),
  ]
}
```

- [ ] **Paso 3: Escribir la vista conectada y montarla en Ver**

Create `apps/web/src/editor/shell/ShellView.tsx`:

```tsx
'use client'

import type { CameraMode, LevelMode, Shading, WallMode } from './bridge/types'
import { selectViewOptions } from './bridge/view'
import { DECISIONS, type Decisions } from './decisions'
import { ShareRender, ViewBar, ViewPanel } from './ui/ViewControls'
import { useBridge, useShell } from './use-bridge'
import { viewActions, viewGroups } from './view-model'

/** Lo que se ve en Ver: el panel Vista 3D, la barra de cámara y Compartir y Renderizar (deshabilitados con "Pronto"). */
export function ShellView({ decisions = DECISIONS }: { decisions?: Pick<Decisions, 'cameraControl' | 'styleControl' | 'walkthrough'> }) {
  const bridge = useBridge()
  const options = useShell(selectViewOptions)
  return (
    <>
      <ViewPanel
        groups={viewGroups(options, decisions)}
        onPick={(group, value) => {
          if (group === 'walls') bridge.setWalls(value as WallMode)
          else if (group === 'levels') bridge.setLevels(value as LevelMode)
          else if (group === 'camera') bridge.setCamera(value as CameraMode)
          else if (group === 'shading') bridge.setShading(value as Shading)
        }}
      />
      <ViewBar
        actions={viewActions(decisions)}
        onAction={(id) => {
          if (id === 'walk') bridge.startWalkthrough()
          else if (id === 'orbit-left' || id === 'orbit-right' || id === 'top') bridge.moveCamera(id)
        }}
      />
      <ShareRender />
    </>
  )
}
```

Modify `apps/web/src/editor/shell/EditorShell.tsx`:

```diff
@@
 import { ShellUndoRedo } from './ShellUndoRedo'
+import { ShellView } from './ShellView'
@@
-      {mode === 'editar' && (
-        <>
-          <ShellDock />
-          <ShellUndoRedo />
-          <PropertiesPanel />
-        </>
+      {mode === 'editar' ? (
+        <>
+          <ShellDock />
+          <ShellUndoRedo />
+          <PropertiesPanel />
+        </>
+      ) : (
+        <ShellView />
       )}
```


- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-view-model shell-view shell-connected shell-boundaries`
Expected: PASS (`shell-view-model`: 6 pruebas; `shell-view`: 4).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/view-model.ts apps/web/src/editor/shell/ShellView.tsx apps/web/src/editor/shell/EditorShell.tsx apps/web/test/shell-view-model.test.ts apps/web/test/shell-view.test.tsx
git commit -m "feat(editor): panel Vista 3D y barra de cámara en Ver (Cámara, Estilo y Recorrer solo si el spike los confirmó)" -- apps/web/src/editor/shell/view-model.ts apps/web/src/editor/shell/ShellView.tsx apps/web/src/editor/shell/EditorShell.tsx apps/web/test/shell-view-model.test.ts apps/web/test/shell-view.test.tsx
```

---

### Task 10c: Recorrer (primera persona con puntero bloqueado) y pruebas en navegador de la Vista 3D

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/shell/WalkthroughHint.tsx`, `apps/web/e2e/vista.spec.ts`
- Modify: `apps/web/src/editor/shell/EditorShell.tsx`, `apps/web/src/editor/e2e-hooks.ts` (`state()` suma las opciones de la vista y un gancho `cameraPose()`)
- Test: `apps/web/test/shell-walkthrough.test.tsx`, `apps/web/e2e/vista.spec.ts` (navegador real)

**Interfaces:**
- Consumes: `bridge.startWalkthrough`, `bridge.stopWalkthrough` y las opciones de la Vista 3D (10a); `ShellView` (10b); `selectShellState().firstPerson` (4b); `FLOAT` (1b); `DECISIONS` (0c); `modeButton` y `createBlankProject` (4f); `hook` (3b).
- Produces:
  - `WalkthroughHint()` (`WalkthroughHint.tsx`): una sola pieza flotante, "Recorriendo el proyecto. Pulsa Esc para volver." con el botón **Salir**, que reemplaza a todo el shell (menos la barra superior) mientras Pascal está en primera persona. El botón sirve cuando el navegador no dio el puntero (su espera tras un desbloqueo): con el cursor libre se puede hacer clic.
  - `window.__e2e.state()` suma `wallMode`, `levelMode`, `cameraMode` y `shading`; gancho nuevo `cameraPose(): { position: number[]; target: number[]; projection: string } | null` (la última cámara que publicó Pascal con `subscribeCameraPose`), para comprobar giros y vista superior sin leer píxeles.

**Cómo se entra y se sale** (verificado en `first-person-controls.tsx`): con `isFirstPersonMode` activo, Pascal monta sus controles de primera persona (WASD para caminar); `Esc` hace `exitPointerLock()` y `setFirstPersonMode(false)`; si el navegador libera el puntero por su cuenta (Esc con el cursor bloqueado no entrega la tecla), `pointerlockchange` también sale. El shell no interviene en la salida: lee `isFirstPersonMode` y vuelve a dibujar el panel Vista 3D y la barra.

- [ ] **Paso 1: Escribir la prueba del aviso (rojo)**

Create `apps/web/test/shell-walkthrough.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { EditorShell } from '../src/editor/shell/EditorShell'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { WalkthroughHint } from '../src/editor/shell/WalkthroughHint'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')

describe('WalkthroughHint', () => {
  it('dice cómo volver y ofrece el botón Salir', () => {
    const markup = renderToStaticMarkup(
      <BridgeProvider bridge={createBridge(createFakeDeps().deps)}>
        <WalkthroughHint />
      </BridgeProvider>,
    )
    expect(textOf(markup)).toBe('Recorriendo el proyecto. Pulsa Esc para volver.Salir')
    expect(markup).toContain('role="status"')
  })
})

describe('EditorShell mientras se recorre', () => {
  const shell = (firstPerson: boolean) => {
    const fake = createFakeDeps()
    fake.scene.setState({ readOnly: true })
    fake.editor.setState({ isFirstPersonMode: firstPerson })
    return renderToStaticMarkup(
      <EditorShell bridge={createBridge(fake.deps)} catalog={[]} projectName="Loft" saveStatus="saved" onBack={() => undefined} />,
    )
  }

  it('solo queda la barra superior y el aviso: ni plantas, ni Vista 3D, ni barra de cámara', () => {
    const walking = shell(true)
    expect(textOf(walking)).toContain('Recorriendo el proyecto')
    for (const label of ['Nivel y ambientes', 'Vista 3D', 'Cámara']) expect(walking, label).not.toContain(`aria-label="${label}"`)
    expect(walking).toMatch(/<h1[^>]*>Loft<\/h1>/)
  })

  it('al terminar el recorrido vuelven el panel y la barra', () => {
    const idle = shell(false)
    expect(idle).not.toContain('Recorriendo el proyecto')
    expect(idle).toContain('aria-label="Vista 3D"')
    expect(idle).toContain('aria-label="Nivel y ambientes"')
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-walkthrough`
Expected: FAIL — `Cannot find module '../src/editor/shell/WalkthroughHint'`.

- [ ] **Paso 2: Escribir el aviso y usarlo en el shell**

Create `apps/web/src/editor/shell/WalkthroughHint.tsx`:

```tsx
'use client'

import { Footprints } from 'lucide-react'
import { cx } from '@/lib/cx'
import { FLOAT } from './ui/primitives'
import { useBridge } from './use-bridge'

/** Mientras se recorre el proyecto no se ve nada del shell salvo cómo volver: Esc, o el botón si el cursor está libre. */
export function WalkthroughHint() {
  const bridge = useBridge()
  return (
    <div
      role="status"
      className={cx(FLOAT, 'absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full py-2 pl-5 pr-2')}
    >
      <Footprints aria-hidden="true" className="size-5 text-ink-muted" strokeWidth={1.9} />
      <span className="text-[15px] font-medium text-ink">Recorriendo el proyecto. Pulsa Esc para volver.</span>
      <button
        type="button"
        onClick={bridge.stopWalkthrough}
        className="focus-ring h-11 cursor-pointer rounded-full bg-ink px-5 text-[15px] font-semibold text-white"
      >
        Salir
      </button>
    </div>
  )
}
```

Modify `apps/web/src/editor/shell/EditorShell.tsx`:

```diff
@@
 import { ShellView } from './ShellView'
+import { WalkthroughHint } from './WalkthroughHint'
@@
-  const mode = useShell((s) => selectShellState(s).mode)
+  const { mode, firstPerson } = useShell((s) => {
+    const state = selectShellState(s)
+    return { mode: state.mode, firstPerson: state.firstPerson }
+  })
+  if (firstPerson) return <WalkthroughHint />
   return (
```


- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-walkthrough shell-view shell-connected shell-boundaries`
Expected: PASS (`shell-walkthrough`: 3 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Ganchos de lectura para las pruebas en navegador**

Modify `apps/web/src/editor/e2e-hooks.ts`:

```diff
@@
-import { armToolMode, getHistoryCommandState, useEditor } from '@pascal-app/editor'
+import { armToolMode, getHistoryCommandState, subscribeCameraPose, useEditor } from '@pascal-app/editor'
@@
   const firstOf = (type: string) => nodes().find((n) => n.type === type)?.id
+  /** La última cámara que publicó Pascal (para comprobar giros y vista superior sin leer píxeles). */
+  let pose: { position: readonly number[]; target: readonly number[]; projection: string } | null = null
+  subscribeCameraPose((next) => {
+    pose = next
+  })
@@
         paintMaterial: editor.activePaintMaterial?.materialPreset ?? null,
+        wallMode: useViewer.getState().wallMode as string,
+        levelMode: useViewer.getState().levelMode as string,
+        cameraMode: useViewer.getState().cameraMode as string,
+        shading: useViewer.getState().shading as string,
@@
     deleteNode: (id: string) => useScene.getState().deleteNode(id as never),
+    cameraPose: () => pose,
```


- [ ] **Paso 5: Escribir las pruebas en navegador**

Create `apps/web/e2e/vista.spec.ts`:

```ts
import { type Page, expect, test } from '@playwright/test'
import { DECISIONS } from '../src/editor/shell/decisions'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { modeButton } from './support/shell'

type Row = [label: string, key: 'wallMode' | 'levelMode' | 'cameraMode' | 'shading', value: string]

const panel = (page: Page) => page.getByRole('complementary', { name: 'Vista 3D' })
const bar = (page: Page) => page.getByRole('toolbar', { name: 'Cámara' })
const toView = async (page: Page) => {
  await expect(modeButton(page, 'Ver')).toBeVisible({ timeout: 15_000 })
  await modeButton(page, 'Ver').click()
  await expect(panel(page)).toBeVisible()
}
/** Dónde está la cámara de Pascal y qué mira, como números (0 si faltan), o `null` si todavía no publicó ninguna. */
const camera = async (page: Page) => {
  const pose = await hook(page, 'cameraPose')
  if (!pose) return null
  const [px = 0, py = 0, pz = 0] = pose.position
  const [tx = 0, ty = 0, tz = 0] = pose.target
  return { px, py, pz, tx, ty, tz }
}
/** Ángulo de la cámara alrededor del punto que mira (azimut), en radianes. */
const azimuth = async (page: Page) => {
  const c = await camera(page)
  return c ? Math.atan2(c.pz - c.tz, c.px - c.tx) : Number.NaN
}

test('en Ver aparecen la Vista 3D y la barra de cámara; Compartir y Renderizar están deshabilitados con "Pronto"; en Editar no', async ({ page }) => {
  await createBlankProject(page, 'vista')
  await toView(page)
  await expect(bar(page)).toBeVisible()
  for (const name of ['Compartir', 'Renderizar']) await expect(page.getByRole('button', { name })).toBeDisabled()
  await expect(page.getByText('Pronto')).toHaveCount(2)
  await modeButton(page, 'Editar').click()
  await expect(panel(page)).toHaveCount(0)
  await expect(bar(page)).toHaveCount(0)
})

test('Muros, Niveles, Cámara y Estilo cambian lo que Pascal usa y la opción elegida queda marcada', async ({ page }) => {
  await createBlankProject(page, 'opciones')
  await toView(page)
  const cameraRows: Row[] = DECISIONS.cameraControl ? [['Isométrica', 'cameraMode', 'orthographic'], ['Perspectiva', 'cameraMode', 'perspective']] : []
  const styleRows: Row[] = DECISIONS.styleControl ? [['Realista', 'shading', 'rendered'], ['Sólido', 'shading', 'solid']] : []
  const table: Row[] = [
    ['Cortados', 'wallMode', 'cutaway'],
    ['Bajos', 'wallMode', 'down'],
    ['Completos', 'wallMode', 'up'],
    ['Separados', 'levelMode', 'exploded'],
    ['Uno solo', 'levelMode', 'solo'],
    ['Juntos', 'levelMode', 'stacked'],
    ...cameraRows,
    ...styleRows,
  ]
  for (const [label, key, value] of table) {
    const chip = panel(page).getByRole('button', { name: label, exact: true })
    await chip.click()
    await expect.poll(async () => (await hook(page, 'state'))[key], { message: label }).toBe(value)
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
  }
})

test('Girar y Vista superior mueven la cámara de Pascal', async ({ page }) => {
  await createBlankProject(page, 'camara')
  await toView(page)
  await expect.poll(() => azimuth(page), { timeout: 15_000 }).not.toBeNaN()
  const start = await azimuth(page)
  await bar(page).getByRole('button', { name: 'Girar izq.' }).click()
  await expect.poll(() => azimuth(page)).not.toBeCloseTo(start, 1)
  await bar(page).getByRole('button', { name: 'Vista superior' }).click()
  await expect
    .poll(async () => {
      const c = await camera(page)
      return c !== null && c.py > c.ty && Math.hypot(c.px - c.tx, c.pz - c.tz) < 0.5
    })
    .toBe(true)
})

test('Recorrer pasa a primera persona, deja solo el aviso y Esc devuelve el panel', async ({ page }) => {
  test.skip(!DECISIONS.walkthrough, 'El spike de la Tarea 0b no confirmó el puntero bloqueado: el botón Recorrer no se ofrece.')
  await createBlankProject(page, 'recorrer')
  await toView(page)
  await bar(page).getByRole('button', { name: 'Recorrer' }).click()
  await expect.poll(async () => (await hook(page, 'state')).firstPerson, { timeout: 15_000 }).toBe(true)
  await expect(page.getByText('Recorriendo el proyecto. Pulsa Esc para volver.')).toBeVisible()
  await expect(panel(page)).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect.poll(async () => (await hook(page, 'state')).firstPerson).toBe(false)
  await expect(panel(page)).toBeVisible()
})
```

Run (Supabase local arriba: `pnpm db:start && pnpm db:env`): `pnpm --filter @interiores/web e2e e2e/vista.spec.ts`
Expected: PASS (4 pruebas; la de Recorrer se salta si `DECISIONS.walkthrough` es `false`). Para esa prueba hace falta un navegador con WebGL (el mismo de las demás pruebas de Pascal): si el puntero no se concede, igual se comprueba `firstPerson`, que no depende de él.

- [ ] **Paso 6: Tipos, lint y commit**

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

```bash
git add apps/web/src/editor/shell/WalkthroughHint.tsx apps/web/src/editor/shell/EditorShell.tsx apps/web/src/editor/e2e-hooks.ts apps/web/test/shell-walkthrough.test.tsx apps/web/e2e/vista.spec.ts
git commit -m "feat(editor): Recorrer en primera persona con aviso para volver y pruebas en navegador de la Vista 3D" -- apps/web/src/editor/shell/WalkthroughHint.tsx apps/web/src/editor/shell/EditorShell.tsx apps/web/src/editor/e2e-hooks.ts apps/web/test/shell-walkthrough.test.tsx apps/web/e2e/vista.spec.ts
```

---

### Task 11a: Qué teclas de Pascal se frenan y cuándo (reglas puras)

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/shell/key-guard.ts`
- Test: `apps/web/test/shell-key-guard.test.ts`

**Interfaces:**
- Consumes: nada (funciones puras).
- Produces: `keyFamilies(event: KeyEventLike): KeyFamily[]` y `shouldTrap(family: KeyFamily, ctx: TrapContext): boolean`, con `type KeyEventLike = Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey'>`, `type KeyFamily = 'tool' | 'delete' | 'clipboard' | 'history' | 'pan'` y `type TrapContext = { mode: 'ver' | 'editar'; walking: boolean; inShell: boolean; editable: boolean }`. La Tarea 11b las usa en el oyente que se monta en el shell.

**Qué teclas son de Pascal** (verificado en `hooks/use-keyboard.ts`, `lib/keyboard-pan.ts` y `lib/history.ts` de `@pascal-app/editor`):

| Familia | Teclas | Qué hace Pascal |
|---|---|---|
| `tool` | `1 2 3 f z m v b x p g r t e c [ ]`, por `event.key` | fases, herramientas, giro, abrir una puerta, pincel |
| `delete` | Supr y Retroceso (con cualquier modificador) | borra la selección |
| `clipboard` | Ctrl o Cmd + C, X, V | copiar, cortar, pegar |
| `history` | Ctrl o Cmd + Z (con o sin Mayús) | deshacer y rehacer |
| `pan` | W, A, S, D y Espacio, por **tecla física** (`event.code`) | desplazar la cámara |

Pascal ignora los campos de texto (`INPUT`, `TEXTAREA`, `contentEditable`) pero **no** los botones ni las listas: con el foco en "Duplicar", Supr borraba el elemento. Además `runUndo` llama a `useScene.temporal.undo()`, que **no mira** el solo lectura de Ver (sí lo miran `createNodes`, `updateNodes` y `deleteNodes`): sin freno, Ctrl+Z en Ver deshace la escena. Pascal apaga `useKeyboard` por completo durante el recorrido (`disabled: isFirstPersonMode || isStudioMode`, `components/editor/index.tsx`) y las teclas del recorrido (WASD, E, R, T, P, Q, Esc) las lee su propio oyente de `document`: el shell no toca nada mientras se recorre.

| Contexto | Se frenan |
|---|---|
| Foco en un campo de texto | nada (Pascal ya lo ignora y el campo necesita sus teclas: Ctrl+Z dentro de un campo es el del campo) |
| Durante el recorrido | nada |
| **Ver**, foco en cualquier parte | `tool`, `delete`, `clipboard` e `history` |
| Ver, foco dentro del shell | además `pan` (Espacio no mueve la cámara mientras activa un botón) |
| **Editar**, foco dentro del shell | `tool`, `delete`, `clipboard` y `pan`; **no** `history` (Ctrl+Z con el foco en un botón debe deshacer) |
| Editar, foco fuera del shell (el lienzo) | nada: Pascal funciona como siempre |

Escape, Tab, Enter y las flechas no pertenecen a ninguna familia y nunca se frenan. Ctrl+S (guardado), Ctrl+K (paleta) y Ctrl+flecha (cambio de nivel, que no modifica la escena) tampoco.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-key-guard.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { type KeyEventLike, type KeyFamily, keyFamilies, shouldTrap } from '../src/editor/shell/key-guard'

const press = (key: string, extra: Partial<KeyEventLike> = {}): KeyEventLike => ({
  key,
  code: /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key,
  ctrlKey: false,
  metaKey: false,
  ...extra,
})

describe('keyFamilies', () => {
  it('las teclas de herramienta de Pascal, con o sin mayúscula', () => {
    for (const key of ['1', '2', '3', 'f', 'z', 'm', 'v', 'b', 'x', 'p', 'g', 'r', 't', 'e', 'c', '[', ']', 'B']) {
      expect(keyFamilies(press(key)), key).toContain('tool')
    }
  })

  it('Supr y Retroceso borran, también con Ctrl; Ctrl o Cmd con C, X o V son el portapapeles', () => {
    expect(keyFamilies(press('Delete'))).toEqual(['delete'])
    expect(keyFamilies(press('Backspace', { ctrlKey: true }))).toEqual(['delete'])
    for (const key of ['c', 'x', 'v']) {
      expect(keyFamilies(press(key, { ctrlKey: true }))).toEqual(['clipboard'])
      expect(keyFamilies(press(key, { metaKey: true }))).toEqual(['clipboard'])
    }
  })

  it('Ctrl o Cmd con Z (en mayúscula si va con Mayús) es el historial', () => {
    expect(keyFamilies(press('z', { ctrlKey: true }))).toEqual(['history'])
    expect(keyFamilies(press('Z', { metaKey: true }))).toEqual(['history'])
  })

  it('W, A, S, D y Espacio desplazan la cámara según la tecla física; la z de un teclado francés es la W física', () => {
    for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space']) {
      expect(keyFamilies({ ...press('?'), code }), code).toEqual(['pan'])
    }
    expect(keyFamilies({ ...press('z'), code: 'KeyW' })).toEqual(['tool', 'pan'])
  })

  it('Escape, Enter, Tab, las flechas, el cambio de nivel y los atajos de la aplicación no pertenecen a ninguna familia', () => {
    for (const key of ['Escape', 'Enter', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']) expect(keyFamilies(press(key)), key).toEqual([])
    expect(keyFamilies(press('ArrowUp', { ctrlKey: true }))).toEqual([]) // cambia de nivel: no modifica la escena
    expect(keyFamilies(press('s', { ctrlKey: true }))).toEqual([]) // el guardado es automático y lo ignora Pascal
    expect(keyFamilies(press('k', { ctrlKey: true }))).toEqual([]) // paleta de comandos
  })
})

describe('shouldTrap', () => {
  const FAMILIES: KeyFamily[] = ['tool', 'delete', 'clipboard', 'history', 'pan']
  const trapped = (ctx: { mode: 'ver' | 'editar'; inShell: boolean; editable?: boolean; walking?: boolean }) =>
    FAMILIES.filter((family) => shouldTrap(family, { editable: false, walking: false, ...ctx }))

  it('con el foco en un campo de texto no se frena nada', () => {
    expect(trapped({ mode: 'ver', inShell: true, editable: true })).toEqual([])
    expect(trapped({ mode: 'editar', inShell: true, editable: true })).toEqual([])
  })

  it('en Ver se frena todo lo que modifica, esté donde esté el foco (incluido Deshacer); desplazar solo dentro del shell', () => {
    expect(trapped({ mode: 'ver', inShell: false })).toEqual(['tool', 'delete', 'clipboard', 'history'])
    expect(trapped({ mode: 'ver', inShell: true })).toEqual(FAMILIES)
  })

  it('en Editar se frena con el foco en el shell todo menos el historial; con el foco en el lienzo, nada', () => {
    expect(trapped({ mode: 'editar', inShell: true })).toEqual(['tool', 'delete', 'clipboard', 'pan'])
    expect(trapped({ mode: 'editar', inShell: false })).toEqual([])
  })

  it('durante el recorrido no se frena nada: Pascal apaga sus atajos y las teclas del recorrido son suyas', () => {
    expect(trapped({ mode: 'ver', inShell: true, walking: true })).toEqual([])
    expect(trapped({ mode: 'ver', inShell: false, walking: true })).toEqual([])
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-key-guard`
Expected: FAIL — `Cannot find module '../src/editor/shell/key-guard'`.

- [ ] **Paso 2: Escribir las reglas**

Create `apps/web/src/editor/shell/key-guard.ts`:

```ts
export type KeyEventLike = Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey'>
export type KeyFamily = 'tool' | 'delete' | 'clipboard' | 'history' | 'pan'
export type TrapContext = { mode: 'ver' | 'editar'; walking: boolean; inShell: boolean; editable: boolean }

/** Atajos de una sola tecla de Pascal (`hooks/use-keyboard.ts`): fases, herramientas, giro y pincel. */
const TOOL_KEYS = new Set(['1', '2', '3', 'f', 'z', 'm', 'v', 'b', 'x', 'p', 'g', 'r', 't', 'e', 'c', '[', ']'])
/** Teclas físicas con las que Pascal mueve la cámara (`lib/keyboard-pan.ts`). */
const PAN_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'])

/** A qué familias de atajos de Pascal pertenece la tecla. Las herramientas van por `key` y el desplazamiento por `code`, como en Pascal. */
export function keyFamilies(event: KeyEventLike): KeyFamily[] {
  const key = event.key.toLowerCase()
  const chord = event.ctrlKey || event.metaKey
  const families: KeyFamily[] = []
  if (event.key === 'Delete' || event.key === 'Backspace') families.push('delete')
  else if (chord) {
    if (key === 'z') families.push('history')
    else if (key === 'c' || key === 'x' || key === 'v') families.push('clipboard')
  } else if (TOOL_KEYS.has(key)) families.push('tool')
  if (!chord && PAN_CODES.has(event.code)) families.push('pan')
  return families
}

/** ¿Se corta el camino de esta tecla hacia Pascal? Ver la tabla de reglas de la Tarea 11a. */
export function shouldTrap(family: KeyFamily, { mode, walking, inShell, editable }: TrapContext): boolean {
  if (editable || walking) return false
  if (mode === 'ver') return family === 'pan' ? inShell : true
  return inShell && family !== 'history'
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-key-guard shell-boundaries`
Expected: PASS (`shell-key-guard`: 9 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/key-guard.ts apps/web/test/shell-key-guard.test.ts
git commit -m "feat(editor): reglas de qué teclas de Pascal se frenan en el shell y en Ver" -- apps/web/src/editor/shell/key-guard.ts apps/web/test/shell-key-guard.test.ts
```

---

### Task 11b: El oyente que corta las teclas, montado en el shell

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/src/editor/shell/key-trap.ts`
- Modify: `apps/web/src/editor/shell/EditorShell.tsx`, `docs/pascal-notes.md` (una fila al final)
- Test: `apps/web/test/shell-key-trap.test.ts`

**Interfaces:**
- Consumes: `keyFamilies` y `shouldTrap` (11a); `selectShellState(snapshot): ShellState` (4b: `mode`, `firstPerson`) y `bridge.snapshot()` (4e); `EditorShell` (4d).
- Produces: `installKeyTrap(options: { state: () => TrapState; target?: KeyTrapTarget }): () => void` con `type TrapState = { mode: 'ver' | 'editar'; walking: boolean }` y `type KeyTrapTarget` (lo que tiene `window` para escuchar `keydown`); `EditorShell` lo instala al montarse, junto a `mountDefaults`.

**Por qué en captura sobre `window` y no con `onKeyDown` de React.** Pascal escucha `keydown` en `window` (burbuja) y, para la cámara, en `document`. Un oyente de React cuelga de la raíz de la aplicación y llega **después** de Pascal; en captura sobre `window` el shell va primero, y `stopPropagation()` corta el camino hacia los oyentes de burbuja de `window` y de `document` sin tocar la tecla en sí. Nunca se llama a `preventDefault()`: Espacio y Enter siguen activando el botón enfocado, y las letras siguen buscando en una lista nativa. Quedan sin frenar los pocos oyentes de Pascal que también van en captura sobre `window` (Ctrl+G, `v` del plano 2D en `site`, Ctrl+C con el plano bajo el cursor): se registran sobre la misma `window`, y `stopPropagation()` no los alcanza.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-key-trap.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { installKeyTrap } from '../src/editor/shell/key-trap'

type Handler = (event: never) => void
/** Un `window` de mentira: guarda el oyente y el modo de captura con que se registró. */
function fakeWindow() {
  const listeners: { type: string; handler: Handler; capture: boolean }[] = []
  return {
    listeners,
    addEventListener: (type: string, handler: Handler, capture: boolean) => void listeners.push({ type, handler, capture }),
    removeEventListener: (type: string, handler: Handler) => {
      const at = listeners.findIndex((l) => l.type === type && l.handler === handler)
      if (at >= 0) listeners.splice(at, 1)
    },
  }
}
const element = (tagName: string, inShell: boolean, isContentEditable = false) => ({
  tagName,
  isContentEditable,
  closest: (selector: string) => (inShell && selector === '[data-editor-shell]' ? {} : null),
})
const keydown = (key: string, target: unknown, extra: Record<string, unknown> = {}) => ({
  key,
  code: /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key,
  ctrlKey: false,
  metaKey: false,
  target,
  stopPropagation: vi.fn(),
  preventDefault: vi.fn(),
  ...extra,
})

describe('installKeyTrap', () => {
  const setup = (mode: 'ver' | 'editar', walking = false) => {
    const win = fakeWindow()
    const stop = installKeyTrap({ state: () => ({ mode, walking }), target: win })
    const send = win.listeners[0]?.handler as unknown as (event: unknown) => void
    return { win, stop, send }
  }

  it('registra un solo oyente de keydown en fase de captura y se quita al desmontar', () => {
    const { win, stop } = setup('editar')
    expect(win.listeners).toHaveLength(1)
    expect(win.listeners[0]).toMatchObject({ type: 'keydown', capture: true })
    stop()
    expect(win.listeners).toHaveLength(0)
  })

  it('Supr con el foco en un botón del shell no llega a Pascal, pero la tecla no se cancela (Espacio sigue activando el botón)', () => {
    const { send } = setup('editar')
    const delKey = keydown('Delete', element('BUTTON', true))
    send(delKey)
    expect(delKey.stopPropagation).toHaveBeenCalledTimes(1)
    expect(delKey.preventDefault).not.toHaveBeenCalled()
  })

  it('con el foco en un campo del shell, o en el lienzo, Pascal recibe la tecla como siempre', () => {
    const { send } = setup('editar')
    for (const target of [element('INPUT', true), element('TEXTAREA', true), element('DIV', true, true), element('CANVAS', false)]) {
      const event = keydown('Delete', target)
      send(event)
      expect(event.stopPropagation, target.tagName).not.toHaveBeenCalled()
    }
  })

  it('en Ver Ctrl+Z no llega a Pascal ni desde el lienzo; en Editar con el foco en el lienzo sí', () => {
    const view = setup('ver')
    const undoInView = keydown('z', element('CANVAS', false), { ctrlKey: true })
    view.send(undoInView)
    expect(undoInView.stopPropagation).toHaveBeenCalledTimes(1)
    const edit = setup('editar')
    const undoInEdit = keydown('z', element('CANVAS', false), { ctrlKey: true })
    edit.send(undoInEdit)
    expect(undoInEdit.stopPropagation).not.toHaveBeenCalled()
  })

  it('Escape y Tab nunca se frenan', () => {
    const { send } = setup('ver')
    for (const key of ['Escape', 'Tab']) {
      const event = keydown(key, element('BUTTON', true))
      send(event)
      expect(event.stopPropagation, key).not.toHaveBeenCalled()
    }
  })

  it('durante el recorrido, E, R, T y P llegan al recorrido de Pascal', () => {
    const { send } = setup('ver', true)
    for (const key of ['e', 'r', 't', 'p']) {
      const event = keydown(key, element('CANVAS', false))
      send(event)
      expect(event.stopPropagation, key).not.toHaveBeenCalled()
    }
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-key-trap`
Expected: FAIL — `Cannot find module '../src/editor/shell/key-trap'`.

- [ ] **Paso 2: Escribir el oyente y montarlo en el shell**

Create `apps/web/src/editor/shell/key-trap.ts`:

```ts
import { keyFamilies, shouldTrap } from './key-guard'

type KeyListener = (event: KeyboardEvent) => void
export type KeyTrapTarget = {
  addEventListener(type: 'keydown', listener: KeyListener, capture: boolean): void
  removeEventListener(type: 'keydown', listener: KeyListener, capture: boolean): void
}
export type TrapState = { mode: 'ver' | 'editar'; walking: boolean }
type ElementLike = { tagName?: string; isContentEditable?: boolean; closest?: (selector: string) => unknown }

/**
 * Corta el camino de las teclas globales de Pascal cuando el foco está en el shell, y el de todas las que modifican la escena
 * en Ver. Un solo oyente en captura sobre `window`: llega antes que los de Pascal (burbuja en `window`, `document`) y solo
 * llama a `stopPropagation()`; nunca cancela la tecla, así Espacio sigue activando el botón y las letras buscan en las listas.
 */
export function installKeyTrap(options: { state: () => TrapState; target?: KeyTrapTarget }): () => void {
  const target: KeyTrapTarget = options.target ?? window
  const listener: KeyListener = (event) => {
    const el = event.target as ElementLike | null
    const editable = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable === true
    const inShell = Boolean(el?.closest?.('[data-editor-shell]'))
    const { mode, walking } = options.state()
    if (keyFamilies(event).some((family) => shouldTrap(family, { mode, walking, inShell, editable }))) {
      event.stopPropagation()
    }
  }
  target.addEventListener('keydown', listener, true)
  return () => target.removeEventListener('keydown', listener, true)
}
```

Modify `apps/web/src/editor/shell/EditorShell.tsx`:

```diff
@@
 import type { CatalogItemLike } from './furniture-model'
+import { installKeyTrap } from './key-trap'
@@
     const stop = bridge.mountDefaults()
-    return () => {
+    // Las teclas de Pascal no llegan a sus atajos con el foco en un botón del shell, ni en Ver (donde Ctrl+Z ni siquiera
+    // debe deshacer: el historial de Pascal no mira el solo lectura).
+    const untrap = installKeyTrap({
+      state: () => {
+        const { mode, firstPerson } = selectShellState(bridge.snapshot())
+        return { mode, walking: firstPerson }
+      },
+    })
+    return () => {
+      untrap()
       stop()
       bridge.dispose()
     }
```


- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-key-trap shell-key-guard shell-connected shell-boundaries`
Expected: PASS (`shell-key-trap`: 6 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Anotar lo verificado en `docs/pascal-notes.md`**

`>>` agrega al final (la tabla ya termina en una fila):

```bash
cat >> docs/pascal-notes.md <<'EOF'
| **Teclas y solo lectura**: `runUndo` y `runRedo` llaman a `useScene.temporal.undo()` y `redo()` **sin mirar** el solo lectura (sí lo miran `createNodes`, `updateNodes` y `deleteNodes`), así que Ctrl+Z deshace la escena aunque esté bloqueada; `useKeyboard` se apaga solo en primera persona y en estudio (`disabled: isFirstPersonMode \|\| isStudioMode`); el recorrido lee WASD, Q, E, R, T, P y Esc en su propio oyente de `document` (captura); Ctrl+G y los atajos del plano 2D (`v` en `site`, Ctrl+C con el plano bajo el cursor) van en captura sobre `window` y el shell no los frena | `editor/src/lib/history.ts`, `editor/src/hooks/use-keyboard.ts`, `editor/src/components/editor/index.tsx`, `editor/src/components/editor/first-person-controls.tsx`, `editor/src/components/editor-2d/floorplan-hotkey-handlers.tsx` | `shell/key-trap.ts` corta en captura sobre `window` (con `stopPropagation`, sin `preventDefault`) las teclas de herramienta, borrar, portapapeles, desplazar y, en Ver, también el historial. |
EOF
```
Expected: `tail -c 200 docs/pascal-notes.md` termina en `…el historial. |` y `git diff --stat docs/pascal-notes.md` muestra solo líneas agregadas.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/key-trap.ts apps/web/src/editor/shell/EditorShell.tsx apps/web/test/shell-key-trap.test.ts docs/pascal-notes.md
git commit -m "feat(editor): las teclas de Pascal no se disparan con el foco en el shell ni en Ver (Ctrl+Z incluido)" -- apps/web/src/editor/shell/key-trap.ts apps/web/src/editor/shell/EditorShell.tsx apps/web/test/shell-key-trap.test.ts docs/pascal-notes.md
```

---

### Task 11c: Pruebas en navegador del teclado (Ctrl+Z en Ver, Supr con el foco en un botón, campos de texto)

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/e2e/teclas.spec.ts`
- Test: `apps/web/e2e/teclas.spec.ts` (navegador real)

**Interfaces:**
- Consumes: `installKeyTrap` montado en el shell (11b); `createBlankProject` (4f); `hook` (3b: `addWall`, `selectFirstWall`, `state`, `node`); `counts` (`e2e/support/editor.ts`); `dockButton`, `modeButton` y `undoRedo` (4f, 5f); la ficha de propiedades (9g: región "Propiedades", botón "Duplicar", campo "Alto" del muro).
- Produces: nada que otras tareas consuman. Cierra la entrada del spec "teclado (Supr con foco en un campo nuestro no borra)" y el **primer punto del Review Focus**.

Las pruebas arman la escena con los ganchos (sin dibujar con el ratón) y después aprietan teclas **reales** (`page.keyboard.press`): llegan al elemento enfocado igual que las de una persona. "Foco en el lienzo" se consigue con `blur()`: quien acaba de hacer clic en el lienzo deja el foco en `body`, fuera del shell. La escena parte con "Seleccionar" armado porque Pascal abre un proyecto en blanco con la herramienta de muro puesta, y Ctrl+Z con una herramienta armada la cancela en vez de deshacer (`cancelInteractionForHistoryShortcut`).

- [ ] **Paso 1: Escribir las pruebas en navegador**

Create `apps/web/e2e/teclas.spec.ts`:

```ts
import { type Page, expect, test } from '@playwright/test'
import { counts } from './support/editor'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { dockButton, modeButton, undoRedo } from './support/shell'

const walls = async (page: Page) => (await counts(page)).wall ?? 0
const panel = (page: Page) => page.getByRole('complementary', { name: 'Propiedades' })
/** Quien acaba de hacer clic en el lienzo deja el foco en `body`, fuera del shell. */
const focusCanvas = (page: Page) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
const focusIsInShell = (page: Page) => page.evaluate(() => Boolean(document.activeElement?.closest('[data-editor-shell]')))

/** Un proyecto en blanco con un muro y "Seleccionar" armado; el clic en el dock deja el foco en un botón del shell. */
async function withWall(page: Page, label: string) {
  await createBlankProject(page, label)
  await expect(dockButton(page, 'Seleccionar')).toBeVisible({ timeout: 15_000 })
  await hook(page, 'addWall')
  await dockButton(page, 'Seleccionar').click()
  await expect.poll(async () => (await hook(page, 'state')).tool).toBeNull()
  expect(await focusIsInShell(page)).toBe(true)
}

test('en Ver, Ctrl+Z y Ctrl+Mayús+Z no tocan la escena, ni con el foco en el shell ni con el foco en el lienzo', async ({ page }) => {
  await withWall(page, 'ver-deshacer')
  await hook(page, 'addWall')
  await undoRedo(page).undo.click() // un paso hecho y otro deshecho: hay algo que deshacer y algo que rehacer
  await expect.poll(() => walls(page)).toBe(1)
  const before = await counts(page)
  expect(await hook(page, 'state')).toMatchObject({ canUndo: true, canRedo: true })
  await modeButton(page, 'Ver').click()
  await expect(modeButton(page, 'Ver')).toHaveAttribute('aria-pressed', 'true')
  for (const where of ['shell', 'canvas'] as const) {
    if (where === 'canvas') await focusCanvas(page)
    expect(await focusIsInShell(page), where).toBe(where === 'shell')
    for (const chord of ['Control+z', 'Control+Shift+z']) await page.keyboard.press(chord)
    expect(await counts(page), where).toEqual(before)
  }
  expect(await hook(page, 'state')).toMatchObject({ canUndo: true, canRedo: true })
})

test('en Editar, Ctrl+Z con el foco en un botón del shell sí deshace y Ctrl+Mayús+Z rehace', async ({ page }) => {
  await withWall(page, 'editar-deshacer')
  const before = await walls(page)
  await page.keyboard.press('Control+z')
  await expect.poll(() => walls(page)).toBe(before - 1)
  await page.keyboard.press('Control+Shift+z')
  await expect.poll(() => walls(page)).toBe(before)
})

test('en Editar, Supr y Retroceso con el foco en un botón del shell no borran la selección; con el foco en el lienzo, sí', async ({ page }) => {
  await withWall(page, 'supr')
  const id = (await hook(page, 'selectFirstWall')) as string
  await expect(panel(page)).toBeVisible()
  const before = await walls(page)
  await panel(page).getByRole('button', { name: 'Duplicar' }).focus()
  expect(await focusIsInShell(page)).toBe(true)
  for (const key of ['Delete', 'Backspace']) await page.keyboard.press(key)
  expect(await walls(page)).toBe(before)
  expect(await hook(page, 'node', id)).not.toBeNull()
  await focusCanvas(page)
  await page.keyboard.press('Delete')
  await expect.poll(() => walls(page)).toBe(before - 1)
})

test('Supr y Retroceso dentro de un campo de la ficha editan el número y no borran el elemento', async ({ page }) => {
  await withWall(page, 'campo')
  await hook(page, 'selectFirstWall')
  const before = await walls(page)
  const height = panel(page).getByLabel('Alto', { exact: true })
  await height.click()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Backspace')
  await expect(height).toHaveValue('')
  await page.keyboard.press('Delete')
  expect(await walls(page)).toBe(before)
})

test('en Editar, las teclas de herramienta con el foco en un botón del shell no arman nada; con el foco en el lienzo, sí', async ({ page }) => {
  await withWall(page, 'herramienta')
  const idle = await hook(page, 'state')
  for (const key of ['b', 'x', 'p', 'z', '1']) await page.keyboard.press(key)
  expect(await hook(page, 'state')).toMatchObject({ mode: idle.mode, tool: idle.tool, phase: idle.phase })
  await focusCanvas(page)
  await page.keyboard.press('b')
  await expect.poll(async () => (await hook(page, 'state')).tool).toBe('wall')
})

test('Espacio y Enter siguen activando los botones del shell aunque el shell frene esas teclas', async ({ page }) => {
  await createBlankProject(page, 'espacio')
  await expect(modeButton(page, 'Ver')).toBeVisible({ timeout: 15_000 })
  await modeButton(page, 'Ver').focus()
  await page.keyboard.press('Space')
  await expect(modeButton(page, 'Ver')).toHaveAttribute('aria-pressed', 'true')
  await modeButton(page, 'Editar').focus()
  await page.keyboard.press('Enter')
  await expect(modeButton(page, 'Editar')).toHaveAttribute('aria-pressed', 'true')
})
```

Run: `pnpm --filter @interiores/web e2e e2e/teclas.spec.ts`
Expected: PASS (6 pruebas). Si falla la segunda en `before - 1`, Pascal canceló una herramienta en vez de deshacer: revisa que `withWall` termine con `tool` en `null`.

- [ ] **Paso 2: Comprobar que las pruebas muerden (quitar el freno un momento)**

Que pasen no basta: hay que ver que fallan sin el freno. En `apps/web/src/editor/shell/EditorShell.tsx` comenta el bloque `const untrap = installKeyTrap({ … })` y escribe debajo `const untrap = () => undefined`; corre la misma prueba.

Run: `pnpm --filter @interiores/web e2e e2e/teclas.spec.ts`
Expected: FAIL en 3 pruebas y PASS en 3. Fallan la primera (en Ver, Ctrl+Z deshace el muro que queda: `counts` distinto de `before`), la tercera (Supr con el foco en "Duplicar" borra el muro: `Expected: 1  Received: 0`) y la quinta (`b` y `x` arman herramientas: `tool` deja de ser `null`). Siguen en verde la segunda, la cuarta y la sexta, que comprueban lo que Pascal ya hacía bien y que el freno no debe romper.

Vuelve atrás con `git checkout -- apps/web/src/editor/shell/EditorShell.tsx` (el archivo quedó comiteado en la Tarea 11b).

- [ ] **Paso 3: Tipos, lint y commit**

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

```bash
git add apps/web/e2e/teclas.spec.ts
git commit -m "test(editor): pruebas en navegador del teclado (Ctrl+Z en Ver, Supr con foco en un botón, campos de texto)" -- apps/web/e2e/teclas.spec.ts
```

---

### Task 11d: Flechas entre los botones del dock (un solo ayudante para la barra y los menús)

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/src/editor/shell/ui/focus-nav.ts`
- Modify: `apps/web/src/editor/shell/ui/Dock.tsx`
- Test: `apps/web/test/shell-focus-nav.test.ts`

**Interfaces:**
- Consumes: `Dock` y `ToolMenu` (5c); `KeyboardEvent` de React.
- Produces:
  - `type Orientation = 'horizontal' | 'vertical'`.
  - `nextIndex(key: string, at: number, count: number, orientation: Orientation): number | null`: a qué posición va el foco con esa tecla (la flecha del eje avanza o retrocede dando la vuelta en los bordes; Inicio y Fin van a los extremos); `null` si la tecla no mueve el foco. `at` es una posición válida y `count` es mayor que cero.
  - `moveFocusOnKey(event: KeyboardEvent<HTMLElement>, selector: string, orientation: Orientation): boolean`: mueve el foco entre los elementos de `event.currentTarget` que cumplen `selector`, **solo si la tecla viene de uno de ellos** (un menú abierto dentro de la barra no la mueve), cancela la tecla (la página no se desplaza) y devuelve si la usó. Con Ctrl, Cmd o Alt no hace nada: son atajos del navegador.
  - `Dock` mueve el foco entre sus botones con las flechas izquierda y derecha, Inicio y Fin; `ToolMenu` deja de llevar su propia copia de esa lógica y usa el mismo ayudante en vertical.

Tab sigue pasando por todos los botones (no hay un solo "punto de entrada" con tabindex móvil): son siete botones, y así nadie queda sin poder llegar a uno por teclado aunque la barra tenga un botón con menú abierto. Las flechas son un atajo más rápido, no el único camino.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/shell-focus-nav.test.ts`:

```ts
import type { KeyboardEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { moveFocusOnKey, nextIndex } from '../src/editor/shell/ui/focus-nav'

describe('nextIndex', () => {
  it('la flecha del eje avanza y retrocede, y da la vuelta en los bordes', () => {
    expect(nextIndex('ArrowRight', 0, 3, 'horizontal')).toBe(1)
    expect(nextIndex('ArrowRight', 2, 3, 'horizontal')).toBe(0)
    expect(nextIndex('ArrowLeft', 0, 3, 'horizontal')).toBe(2)
    expect(nextIndex('ArrowLeft', 2, 3, 'horizontal')).toBe(1)
    expect(nextIndex('ArrowDown', 1, 3, 'vertical')).toBe(2)
    expect(nextIndex('ArrowUp', 0, 3, 'vertical')).toBe(2)
  })

  it('Inicio y Fin van al primero y al último, en cualquier eje', () => {
    expect(nextIndex('Home', 2, 4, 'horizontal')).toBe(0)
    expect(nextIndex('End', 0, 4, 'vertical')).toBe(3)
  })

  it('las flechas del otro eje y las demás teclas no mueven el foco', () => {
    expect(nextIndex('ArrowUp', 1, 3, 'horizontal')).toBeNull()
    expect(nextIndex('ArrowLeft', 1, 3, 'vertical')).toBeNull()
    for (const key of ['Tab', 'Enter', ' ', 'a', 'Escape']) expect(nextIndex(key, 1, 3, 'horizontal'), key).toBeNull()
  })

  it('con un solo elemento da la vuelta sobre sí mismo', () => {
    expect(nextIndex('ArrowRight', 0, 1, 'horizontal')).toBe(0)
    expect(nextIndex('ArrowLeft', 0, 1, 'horizontal')).toBe(0)
  })
})

describe('moveFocusOnKey', () => {
  const buttons = () => [{ focus: vi.fn() }, { focus: vi.fn() }, { focus: vi.fn() }]
  const send = (key: string, items: ReturnType<typeof buttons>, from: unknown, extra: Record<string, unknown> = {}) => {
    const event = {
      key,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      target: from,
      currentTarget: { querySelectorAll: () => items },
      preventDefault: vi.fn(),
      ...extra,
    }
    return { event, moved: moveFocusOnKey(event as unknown as KeyboardEvent<HTMLElement>, '[data-dock]', 'horizontal') }
  }

  it('enfoca el vecino, cancela la tecla (la página no se desplaza) y avisa que la usó', () => {
    const items = buttons()
    const { event, moved } = send('ArrowRight', items, items[0])
    expect(moved).toBe(true)
    expect(items[1]?.focus).toHaveBeenCalledTimes(1)
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('Fin y Inicio saltan a los extremos', () => {
    const items = buttons()
    send('End', items, items[0])
    expect(items[2]?.focus).toHaveBeenCalledTimes(1)
    send('Home', items, items[2])
    expect(items[0]?.focus).toHaveBeenCalledTimes(1)
  })

  it('con Ctrl, Cmd o Alt no hace nada: son atajos del navegador', () => {
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
      const items = buttons()
      const { event, moved } = send('ArrowRight', items, items[0], { [modifier]: true })
      expect(moved, modifier).toBe(false)
      expect(event.preventDefault, modifier).not.toHaveBeenCalled()
      for (const item of items) expect(item.focus, modifier).not.toHaveBeenCalled()
    }
  })

  it('si la tecla no viene de uno de los elementos (un menú abierto dentro de la barra) no hace nada', () => {
    const items = buttons()
    const { event, moved } = send('ArrowRight', items, { tagName: 'BUTTON', role: 'menuitem' })
    expect(moved).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
    for (const item of items) expect(item.focus).not.toHaveBeenCalled()
  })

  it('una tecla que no mueve el foco no se cancela', () => {
    const items = buttons()
    const { event, moved } = send('Enter', items, items[1])
    expect(moved).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })
})
```


Run: `pnpm --filter @interiores/web exec vitest run shell-focus-nav`
Expected: FAIL — `Cannot find module '../src/editor/shell/ui/focus-nav'`.

- [ ] **Paso 2: Escribir el ayudante y usarlo en el dock**

Create `apps/web/src/editor/shell/ui/focus-nav.ts`:

```ts
import type { KeyboardEvent } from 'react'

export type Orientation = 'horizontal' | 'vertical'

/** A qué posición va el foco con esa tecla: la flecha del eje avanza o retrocede dando la vuelta, Inicio y Fin van a los extremos; `null` si no la usa. */
export function nextIndex(key: string, at: number, count: number, orientation: Orientation): number | null {
  const back = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
  const forward = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  if (key === forward) return (at + 1) % count
  if (key === back) return (at - 1 + count) % count
  return null
}

/**
 * Mueve el foco entre los elementos de `event.currentTarget` que cumplen `selector`, solo si la tecla viene de uno de ellos (así un
 * menú abierto dentro de la barra no la mueve). Cancela la tecla para que la página no se desplace y devuelve si la usó.
 */
export function moveFocusOnKey(event: KeyboardEvent<HTMLElement>, selector: string, orientation: Orientation): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>(selector)]
  const at = items.indexOf(event.target as HTMLElement)
  if (at < 0) return false
  const to = nextIndex(event.key, at, items.length, orientation)
  if (to === null) return false
  event.preventDefault()
  items[to]?.focus()
  return true
}
```

Modify `apps/web/src/editor/shell/ui/Dock.tsx`:

```diff
@@
 import { cx } from '@/lib/cx'
+import { moveFocusOnKey } from './focus-nav'
 import { FLOAT } from './primitives'
@@
-/** Barra de herramientas del modo Editar: botones de ≥ 44 px con ícono y etiqueta debajo; el menú abierto sale sobre su botón. */
+/** Barra de herramientas del modo Editar: botones de ≥ 44 px con ícono y etiqueta debajo; el menú abierto sale sobre su botón y las flechas, Inicio y Fin mueven el foco entre los botones. */
@@
         aria-label="Herramientas de edición"
+        onKeyDown={(event) => moveFocusOnKey(event, '[data-dock]', 'horizontal')}
         className={cx(FLOAT, 'flex items-center gap-1 rounded-[28px] p-2')}
       >
@@
-    const buttons = [...(ref.current?.querySelectorAll<HTMLElement>(ITEM) ?? [])]
-    const at = buttons.indexOf(document.activeElement as HTMLElement)
-    const next =
-      event.key === 'ArrowDown' ? at + 1 : event.key === 'ArrowUp' ? at - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : null
-    if (next === null || buttons.length === 0) return
-    event.preventDefault()
-    buttons[(next + buttons.length) % buttons.length]?.focus()
+    moveFocusOnKey(event, ITEM, 'vertical')
   }
```


- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-focus-nav shell-dock shell-boundaries`
Expected: PASS (`shell-focus-nav`: 9 pruebas; el filtro `shell-dock` alcanza también `shell-dock-ui` y `shell-dock-model`, que siguen igual porque el marcado del dock no cambió).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/ui/focus-nav.ts apps/web/src/editor/shell/ui/Dock.tsx apps/web/test/shell-focus-nav.test.ts
git commit -m "feat(editor): flechas, Inicio y Fin mueven el foco entre los botones del dock y las entradas de sus menús" -- apps/web/src/editor/shell/ui/focus-nav.ts apps/web/src/editor/shell/ui/Dock.tsx apps/web/test/shell-focus-nav.test.ts
```

---

### Task 11e: Pruebas en navegador de accesibilidad (criterio 12 del spec)

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/e2e/accesibilidad.spec.ts`
- Test: `apps/web/e2e/accesibilidad.spec.ts` (navegador real)

**Interfaces:**
- Consumes: `DOCK`, `expectedState` (5a); `Dock` con flechas (11d); `createBlankProject` (4f); `hook` (3b); `dock`, `dockButton` y `modeButton` (4f, 5f); el CSS del shell (`app/editor-shell.css`: `shell-hit`, movimiento reducido) y la utilidad `focus-ring` (`app/app-shell.css`).
- Produces: nada que otras tareas consuman. Cierra el **criterio 12**: "el dock es una barra de herramientas (`role="toolbar"`) con botones `aria-pressed` operables con teclado, objetivos táctiles de al menos 44 px, foco visible y movimiento reducido respetado".

Cada prueba mira una cosa que una persona nota: que se puede llegar a todo con el teclado y se ve dónde está el foco, que nada es más chico que un dedo (44 px) y que con "reducir movimiento" activado el shell no anima nada. El tamaño se mide en el navegador, no en las clases: así lo que vale es lo que se ve. El chip `shell-hit` mide 36 px de alto pero su `::after` suma 5 px por lado, y esa área también cuenta.

- [ ] **Paso 1: Escribir las pruebas en navegador**

Create `apps/web/e2e/accesibilidad.spec.ts`:

```ts
import { type Page, expect, test } from '@playwright/test'
import { DOCK, expectedState } from '../src/editor/shell/dock-model'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { dock, dockButton, modeButton } from './support/shell'

const LABELS = DOCK.map((button) => button.label)
const FIRST = LABELS[0] as string
const LAST = LABELS[LABELS.length - 1] as string
const state = (page: Page) => hook(page, 'state')

/** Controles visibles del shell que miden menos de 44 px (cuenta el área táctil extra de `shell-hit`, que va en su `::after`). */
const smallTargets = (page: Page) =>
  page.evaluate(() => {
    const MIN = 44
    const small: string[] = []
    const selector = '[data-editor-shell] :is(button, input, select, textarea, a[href], [role="menuitem"])'
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const box = el.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      const after = getComputedStyle(el, '::after')
      const hasHitArea = after.position === 'absolute' && after.content !== 'none' && after.content !== 'normal'
      const grow = hasHitArea ? Math.max(0, -Number.parseFloat(after.top)) + Math.max(0, -Number.parseFloat(after.bottom)) : 0
      const height = box.height + grow
      if (box.width < MIN - 0.5 || height < MIN - 0.5) {
        const name = el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 24) ?? ''
        small.push(`${el.tagName.toLowerCase()} "${name}" ${Math.round(box.width)}x${Math.round(height)}`)
      }
    }
    return small
  })

test('el dock es una barra de herramientas: las flechas, Inicio y Fin mueven el foco y se ve dónde está', async ({ page }) => {
  await createBlankProject(page, 'dock-flechas')
  await expect(dock(page)).toBeVisible({ timeout: 15_000 })
  const buttons = dock(page).getByRole('button')
  await expect(buttons).toHaveCount(DOCK.length)
  for (const pressed of await buttons.evaluateAll((els) => els.map((el) => el.getAttribute('aria-pressed')))) {
    expect(['true', 'false']).toContain(pressed)
  }

  await dockButton(page, FIRST).focus()
  for (const label of LABELS.slice(1)) {
    await page.keyboard.press('ArrowRight')
    await expect(dockButton(page, label)).toBeFocused()
  }
  await page.keyboard.press('ArrowRight')
  await expect(dockButton(page, FIRST)).toBeFocused() // da la vuelta
  await page.keyboard.press('ArrowLeft')
  await expect(dockButton(page, LAST)).toBeFocused()
  await page.keyboard.press('Home')
  await expect(dockButton(page, FIRST)).toBeFocused()
  await page.keyboard.press('End')
  await expect(dockButton(page, LAST)).toBeFocused()

  // Tab sigue pasando por cada botón, y el anillo de foco de 3 px se ve en cada uno.
  await dockButton(page, FIRST).focus()
  for (const label of LABELS.slice(1)) {
    await page.keyboard.press('Tab')
    const button = dockButton(page, label)
    await expect(button).toBeFocused()
    const ring = await button.evaluate((el) => `${getComputedStyle(el).outlineStyle} ${getComputedStyle(el).outlineWidth}`)
    expect(ring, label).toBe('solid 3px')
  }
})

test('Espacio y Enter arman la herramienta de un botón del dock igual que el clic', async ({ page }) => {
  await createBlankProject(page, 'dock-teclado')
  await expect(dock(page)).toBeVisible({ timeout: 15_000 })
  await dockButton(page, 'Seleccionar').click()
  await expect.poll(async () => (await state(page)).tool).toBeNull()

  await dockButton(page, 'Muebles').focus()
  await page.keyboard.press('Space')
  await expect
    .poll(async () => {
      const s = await state(page)
      return { phase: s.phase, mode: s.mode, tool: s.tool }
    })
    .toEqual(expectedState({ kind: 'furniture' }))
  await expect(dockButton(page, 'Muebles')).toHaveAttribute('aria-pressed', 'true')
  await expect(dock(page).getByRole('button', { pressed: true })).toHaveCount(1)

  await dockButton(page, 'Seleccionar').focus()
  await page.keyboard.press('Enter')
  await expect
    .poll(async () => {
      const s = await state(page)
      return { mode: s.mode, tool: s.tool }
    })
    .toEqual(expectedState({ kind: 'select' }))
  await expect(dockButton(page, 'Seleccionar')).toHaveAttribute('aria-pressed', 'true')
})

test('todos los controles del shell miden al menos 44 px: Editar, menú abierto, Muebles, Materiales y Ver', async ({ page }) => {
  await createBlankProject(page, 'tamanos')
  await expect(dock(page)).toBeVisible({ timeout: 15_000 })
  await dockButton(page, 'Seleccionar').click()
  await hook(page, 'addWall')
  await hook(page, 'selectFirstWall')
  await expect(page.getByRole('complementary', { name: 'Propiedades' })).toBeVisible()
  expect(await smallTargets(page), 'Editar con un muro elegido').toEqual([])

  await dockButton(page, 'Estructura').click()
  await expect(page.getByRole('menu', { name: 'Estructura' })).toBeVisible()
  expect(await smallTargets(page), 'menú Estructura').toEqual([])
  await page.keyboard.press('Escape')

  await dockButton(page, 'Muebles').click()
  await expect(page.getByRole('complementary', { name: 'Muebles' })).toBeVisible()
  expect(await smallTargets(page), 'Muebles').toEqual([])

  await dockButton(page, 'Materiales').click()
  await expect(page.getByRole('complementary', { name: 'Materiales' })).toBeVisible()
  expect(await smallTargets(page), 'Materiales').toEqual([])

  await modeButton(page, 'Ver').click()
  await expect(page.getByRole('complementary', { name: 'Vista 3D' })).toBeVisible()
  expect(await smallTargets(page), 'Ver').toEqual([])
})

test('con "reducir movimiento" activado el shell no anima nada; sin esa preferencia, sí', async ({ page }) => {
  await createBlankProject(page, 'movimiento')
  await expect(dock(page)).toBeVisible({ timeout: 15_000 })
  const durations = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-editor-shell] button')].map((el) => getComputedStyle(el).transitionDuration),
    )
  const normal = await durations()
  expect(normal.length).toBeGreaterThan(5)
  expect(normal.some((d) => d !== '0s')).toBe(true) // sin la preferencia hay transiciones: la regla es lo que las apaga
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect((await durations()).every((d) => d === '0s')).toBe(true)
})
```

Run: `pnpm --filter @interiores/web e2e e2e/accesibilidad.spec.ts`
Expected: PASS (4 pruebas; el recorrido de un menú con el teclado ya lo prueba la 5f). Si falla la de tamaños, el mensaje trae cada control chico con su medida (`button "Cerrar" 40x40`): sube su altura y su ancho a `h-11 min-w-11` (44 px) o dale la clase `shell-hit` si es un chip de texto. Si falla la del anillo de foco, revisa que el botón lleve la clase `focus-ring` (definida en `app/app-shell.css`).

- [ ] **Paso 2: Tipos, lint y commit**

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

```bash
git add apps/web/e2e/accesibilidad.spec.ts
git commit -m "test(editor): accesibilidad del dock en navegador (teclado, foco visible, 44 px y movimiento reducido)" -- apps/web/e2e/accesibilidad.spec.ts
```

---

### Task 12a: Barrido final de castellano y se quita la maqueta

**Responsable sugerido:** Victoria. Revisa: Silvert.

**Files:**
- Create: `apps/web/e2e/castellano.spec.ts`
- Delete: `apps/web/app/editor-prueba/` (la carpeta entera: la maqueta aprobada (Tareas 1a a 1i), cuyo código ya vive en `src/editor/shell/ui/`)
- Test: `apps/web/e2e/castellano.spec.ts` (navegador real)

**Interfaces:**
- Consumes: `createBlankProject` (4f); `hook` (3b: `addWall`, `addDoor`, `addWindow`, `addItem`, `addZone`, `select`, `node`); `dock`, `dockButton` y `modeButton` (4f, 5f); las regiones "Muebles", "Materiales", "Propiedades" y "Vista 3D" (7d, 8d, 9g, 10b).
- Produces: nada que otras tareas consuman. Cierra el **criterio 7 del spec** con un solo barrido sobre todo el shell: si una actualización de Pascal o un cambio nuestro deja una palabra de interfaz en inglés a la vista, esta prueba lo dice con el texto exacto.

Las pruebas de cada panel ya miran sus propias palabras (nombres de nivel, muebles, materiales, atajos). Esta mira todo junto y también lo que se lee sin verse: `aria-label`, `title`, `placeholder` y `alt`. La lista son palabras de interfaz que Pascal usa en su propio chrome y en sus nombres por defecto, sin parecido en castellano (así `Cancel` no confunde a `Cancelar`, porque el límite de palabra corta ahí).

- [ ] **Paso 1: Escribir el barrido (en verde si todas las tareas anteriores se hicieron)**

Create `apps/web/e2e/castellano.spec.ts`:

```ts
import { type Page, expect, test } from '@playwright/test'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { dock, dockButton, modeButton } from './support/shell'

/** Palabras de interfaz en inglés (el chrome de Pascal y sus nombres por defecto) que no deben verse ni leerse en el shell. */
const KNOWN_ENGLISH = new RegExp(
  `\\b(${[
    'Ground Floor', 'Floor \\d', 'Basement', 'Zone \\d', 'Measurement \\d',
    'Select', 'Build', 'Delete', 'Undo', 'Redo', 'Save', 'Saved', 'Saving', 'Cancel', 'Search', 'Settings',
    'Share', 'Export', 'Upload', 'Furniture', 'Wall', 'Walls', 'Door', 'Window', 'Roof', 'Ceiling',
    'Level', 'Levels', 'Measure', 'Grid', 'Snap', 'Close', 'Back', 'Next', 'Loading', 'Walkthrough',
    'Orbit', 'Top view', 'Rotate', 'Move', 'Copy', 'Paste', 'Add', 'Remove', 'Edit', 'View',
  ].join('|')})\\b`,
  'gi',
)

/** Todo lo que el shell muestra o lee: su texto y los atributos que un lector de pantalla anuncia. */
const shellTexts = (page: Page) =>
  page.locator('[data-editor-shell]').evaluate((root) => {
    const texts = [root.textContent ?? '']
    for (const el of root.querySelectorAll('[aria-label], [title], [placeholder], img[alt]')) {
      for (const name of ['aria-label', 'title', 'placeholder', 'alt']) {
        const value = el.getAttribute(name)
        if (value) texts.push(value)
      }
    }
    return texts
  })

async function expectSpanish(page: Page, where: string) {
  const found = (await shellTexts(page)).join('\n').match(KNOWN_ENGLISH) ?? []
  expect(found, `Palabras en inglés a la vista en: ${where}`).toEqual([])
}

test('el shell entero está en castellano: dock, menús, paneles, fichas de cada tipo y Ver', async ({ page }) => {
  await createBlankProject(page, 'castellano')
  await expect(dock(page)).toBeVisible({ timeout: 15_000 })
  await dockButton(page, 'Seleccionar').click()
  await expectSpanish(page, 'Editar con el panel de niveles')

  // Una ficha de cada tipo. El ambiente nace como "Zone 1" en el nodo (Pascal) y el shell lo muestra traducido.
  const wallId = (await hook(page, 'selectFirstWall')) as string
  const doorId = (await hook(page, 'addDoor')) as string
  const windowId = (await hook(page, 'addWindow')) as string
  const itemId = (await hook(page, 'addItem')) as string
  const zoneId = (await hook(page, 'addZone')) as string
  expect(await hook(page, 'node', zoneId)).toMatchObject({ name: 'Zone 1' })
  for (const [kind, id] of [['muro', wallId], ['puerta', doorId], ['ventana', windowId], ['mueble', itemId], ['ambiente', zoneId]] as const) {
    await hook(page, 'select', id)
    await expect(page.getByRole('complementary', { name: 'Propiedades' })).toBeVisible()
    await expectSpanish(page, `la ficha de ${kind}`)
  }

  for (const menu of ['Estructura', 'Aberturas', 'Medir']) {
    await dockButton(page, menu).click()
    await expect(page.getByRole('menu', { name: menu })).toBeVisible()
    await expectSpanish(page, `el menú ${menu}`)
    await page.keyboard.press('Escape')
  }

  for (const panel of ['Muebles', 'Materiales']) {
    await dockButton(page, panel).click()
    await expect(page.getByRole('complementary', { name: panel })).toBeVisible()
    await expectSpanish(page, `el panel ${panel}`)
  }

  await modeButton(page, 'Ver').click()
  await expect(page.getByRole('complementary', { name: 'Vista 3D' })).toBeVisible()
  await expectSpanish(page, 'Ver con el panel Vista 3D')
})
```

Run: `pnpm --filter @interiores/web e2e e2e/castellano.spec.ts`
Expected: PASS (1 prueba). Si falla, el mensaje trae las palabras exactas y el lugar (`la ficha de ambiente`): búscalas con `grep -rn "<palabra>" apps/web/src/editor` y arregla la **tabla de traducción** que corresponda (`catalog-es`, `material-es`, `zoneDisplayName`, `levelDisplayName`), no el síntoma en pantalla. Si la palabra es un nombre propio o un término que se usa igual en castellano, quítala de `KNOWN_ENGLISH` y anótalo en el commit.

- [ ] **Paso 2: Quitar la maqueta**

La maqueta (`apps/web/app/editor-prueba/`) se conservó hasta ahora para comparar a ojo cada pieza del shell con la original (Tareas 1a a 1i). Ya no se necesita: su código vive en `src/editor/shell/ui/` y las pruebas del shell lo cubren.

```bash
if [ -n "$(git ls-files apps/web/app/editor-prueba)" ]; then
  git rm -r -q apps/web/app/editor-prueba
else
  rm -r apps/web/app/editor-prueba
fi
grep -rn "editor-prueba\|maqueta.css" apps/web/src apps/web/app apps/web/e2e apps/web/test
```
Expected: el `grep` no imprime nada (nada importa ni enlaza la maqueta). Si hubiera una referencia, sácala antes de seguir.

Run: `pnpm --filter @interiores/web typecheck && pnpm lint && pnpm --filter @interiores/web exec vitest run shell- --reporter=dot`
Expected: `Tipos OK …`, Biome sin errores nuevos y todas las pruebas `shell-*` en verde (la maqueta no era importada por ninguna).

- [ ] **Paso 3: Commit**

```bash
git add apps/web/e2e/castellano.spec.ts
git commit -m "test(editor): barrido de castellano sobre todo el shell (criterio 7)" -- apps/web/e2e/castellano.spec.ts
if [ -z "$(git ls-files apps/web/app/editor-prueba)" ] && [ -n "$(git status --short apps/web/app/editor-prueba | head -1)" ]; then
  git commit -m "chore(editor): se quita la maqueta /editor-prueba, su código vive en el shell" -- apps/web/app/editor-prueba
fi
```
Expected: un commit con la prueba y, solo si la maqueta estaba versionada, un segundo commit con su borrado (si nunca se subió, no hay nada que comitear: la carpeta se borró del disco y listo).

---

### Task 12b: Capturas, documentación y verificación final

**Responsable sugerido:** Silvert. Revisa: Victoria.

**Files:**
- Create: `apps/web/e2e/capture-editor.spec.ts`, `apps/web/scripts/capture-editor.mjs`, `docs/design/implementado/editor-*.jpg` (6 capturas)
- Modify: `apps/web/package.json` (script `editor:shots`), `docs/ESTADO.md`, `apps/web/CLAUDE.md`
- Test: `pnpm verify` en un clon limpio y la suite e2e completa

**Interfaces:**
- Consumes: todo lo anterior; `createProjectViaUi` (repo), `templateById` de `src/lib/templates`, `hook` (3b: `setWallMode`, `selectFirstWall`), `dock`, `dockButton`, `modeButton` y `viewButton` (4f, 5f).
- Produces: el comando `pnpm --filter @interiores/web editor:shots` (regenera las capturas), las seis capturas del editor con la interfaz de Madori y la documentación al día. Con esta tarea la rama `feature/interfaz-laboratorio` **ya puede fusionarse**: hasta aquí el editor mezcla piezas nuevas con huecos (4f y 5c lo avisan).

- [ ] **Paso 1: Escribir la captura y su script**

Sigue el molde de `e2e/capture-templates.spec.ts` y `scripts/capture-templates.mjs`: no corre con `pnpm e2e` (se salta sola) y necesita Supabase local, porque Playwright inicia sesión antes. Las seis pantallas son las que el diseño de Pencil tiene en `docs/design/12` a `17`.

Create `apps/web/e2e/capture-editor.spec.ts`:

```ts
// Captura el editor real con la interfaz de Madori y guarda las pantallas en docs/design/implementado/ para compararlas a ojo con docs/design/12 a 17.
// No corre con `pnpm e2e`: se pide con `pnpm --filter @interiores/web editor:shots` (necesita Supabase local y la API, como las demás capturas).
import { join } from 'node:path'
import { type Page, expect, test } from '@playwright/test'
import { templateById } from '../src/lib/templates'
import { hook } from './support/hooks'
import { createProjectViaUi } from './support/projects'
import { dock, dockButton, modeButton, viewButton } from './support/shell'

test.skip(process.env.CAPTURE_EDITOR !== '1', 'Solo con editor:shots')

const OUT = join(process.cwd(), '..', '..', 'docs', 'design', 'implementado')
const VIEWPORT = { width: 1440, height: 900 }

/** Aparta el cursor (nada queda resaltado) y espera a que terminen las animaciones y las texturas. */
async function shot(page: Page, name: string) {
  await page.mouse.move(1430, 450)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: join(OUT, `${name}.jpg`), type: 'jpeg', quality: 88 })
}

test('capturar el editor en Editar y en Ver', async ({ page }) => {
  test.setTimeout(240_000)
  const loft = templateById('loft')
  if (!loft) throw new Error('Falta la plantilla "loft"')
  await page.setViewportSize(VIEWPORT)
  await createProjectViaUi(page, { name: `Captura editor ${Date.now()}`, kind: loft.kind, template: loft.name })
  await expect(dock(page)).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(6000) // texturas y modelos
  await dockButton(page, 'Seleccionar').click()
  await hook(page, 'setWallMode', 'cutaway') // con los muros cercanos recortados se ve el interior

  await viewButton(page, '2D').click()
  await hook(page, 'selectFirstWall')
  await shot(page, 'editor-editar-planta') // docs/design/12

  await viewButton(page, '3D').click()
  await dockButton(page, 'Muebles').click()
  await shot(page, 'editor-muebles') // docs/design/15

  await dockButton(page, 'Materiales').click()
  await shot(page, 'editor-materiales') // docs/design/17

  await dockButton(page, 'Estructura').click()
  await shot(page, 'editor-menu-estructura') // docs/design/16
  await page.keyboard.press('Escape')

  await modeButton(page, 'Ver').click()
  await shot(page, 'editor-ver-3d') // docs/design/13

  await viewButton(page, 'Ambas').click()
  await shot(page, 'editor-ver-dividida') // docs/design/14
})
```

Create `apps/web/scripts/capture-editor.mjs`:

```js
// Corre solo la captura del editor (e2e/capture-editor.spec.ts) con la variable que la habilita.
// Requisitos: Supabase local (pnpm db:start && pnpm db:env); Playwright levanta la API y la web si no están corriendo.
import { spawnSync } from 'node:child_process'

const result = spawnSync('pnpm', ['exec', 'playwright', 'test', 'e2e/capture-editor.spec.ts', '--project=chromium'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, CAPTURE_EDITOR: '1' },
})
process.exit(result.status ?? 1)
```

Modify `apps/web/package.json`:

```diff
@@
     "items:thumbs": "node scripts/item-thumbnails.mjs",
+    "editor:shots": "node scripts/capture-editor.mjs",
```


- [ ] **Paso 2: Sacar las capturas y mirarlas**

Run (Supabase local arriba: `pnpm db:start && pnpm db:env`): `pnpm --filter @interiores/web editor:shots`
Expected: PASS (1 prueba) y seis archivos nuevos `docs/design/implementado/editor-*.jpg`.

Abre cada una junto a su referencia (`docs/design/12`, `13`, `14`, `15`, `16`, `17`) y comprueba a ojo, sin números: la paleta Madori (Noche, Cobalto, Sol, Alba, Cielo y Crema), **ningún panel con fondo oscuro**, el dock con el botón activo en azul noche y texto blanco, todos los textos en castellano, y nada tapado por la barra superior ni por el dock. Si algo no cuadra, corrígelo en su tarea de origen (no aquí) y vuelve a sacar las capturas.

- [ ] **Paso 3: Documentar**

`docs/ESTADO.md`: la decisión, lo hecho y lo que sigue. `apps/web/CLAUDE.md`: las reglas que cualquiera que toque el editor debe saber.

Modify `docs/ESTADO.md`:

```diff
@@
+| Shell del editor | La interfaz propia del editor (barra superior, Ver y Editar, 2D, 3D y Ambas, dock, paneles de niveles, muebles y materiales, propiedades por tipo y Vista 3D) es un **shell de React hermano de `<Editor>`** que habla con Pascal solo por un puente inyectable. El tema es CSS más un **parche mínimo** de `@pascal-app/editor` (propiedad `chrome`) vigilado por una prueba y por el CI. Ver bloquea la escena con el modo de solo lectura de Pascal. Todo el texto está en castellano con tablas propias de traducción. | [spec 3](superpowers/specs/2026-10-11-editor-shell-design.md), [plan](superpowers/plans/2026-10-11-editor-shell.md) |
 | Repo | **Nuevo y dedicado** (raíz = proyecto), público, con la otra persona como colaboradora. | — |
@@
+- **Shell del editor implementado** (spec 3, rama `feature/interfaz-laboratorio`, plan [editor-shell](superpowers/plans/2026-10-11-editor-shell.md)): barra superior con nombre, estado de guardado, Ver | Editar y 2D | 3D | Ambas; Deshacer y Rehacer; dock con menús (Estructura, Aberturas, Medir, Más); paneles de niveles y ambientes, muebles (144 con nombre en castellano y miniatura transparente) y materiales (114); ficha de propiedades de muro, puerta, ventana, mueble y ambiente con duplicar y borrar; panel Vista 3D con Recorrer; teclado y accesibilidad (las teclas de Pascal se frenan con el foco en el shell y en Ver). Compartir, Renderizar, Exportar plano y Subir mi mueble se ven deshabilitados con "Pronto". Capturas en `docs/design/implementado/editor-*.jpg` (`pnpm --filter @interiores/web editor:shots`). La maqueta `/editor-prueba` se borró.
 
 ## Pendiente (en este orden)
@@
+2e. **Después del shell del editor** (spec 3, sección 7): editor para móvil y tablet (Ver, Recorrer, hojas inferiores); flujo de Renderizar con marcadores de notas y de cámara; Exportar plano a PDF; Subir mi mueble (almacenamiento propio) y Compartir. Cada uno con su brainstorming → spec → plan.
 3. Crear cuentas a mano (para la nube): Supabase `dev` y `prod`, Vercel, Cloudflare Free. GitHub ya está (repo público creado). Con las cuentas, seguir [`nube.md`](nube.md) y pasarle a Victoria la URL y la clave pública del `dev` por un canal privado.
@@
-Pascal no está en el material del curso (alucina la API) · assets y 100 muebles vendoreados del repo MIT de Pascal (sin licencia propia por activo; 11 ítems descartados) · WebGPU del equipo de la demo · textos de Pascal en inglés · historia de git concentrada en 48 h · conectores de correo/Drive activos en la sesión.
+Pascal no está en el material del curso (alucina la API) · assets y 100 muebles vendoreados del repo MIT de Pascal (sin licencia propia por activo; 11 ítems descartados) · WebGPU del equipo de la demo · textos de Pascal en inglés (el shell los reemplaza con tablas propias; la paleta Ctrl+K sigue en inglés) · historia de git concentrada en 48 h · conectores de correo/Drive activos en la sesión.
```


Modify `apps/web/CLAUDE.md`:

```diff
@@
+- **Shell del editor** (`src/editor/shell/`, spec 3 y plan `docs/superpowers/plans/2026-10-11-editor-shell.md`): la interfaz propia del editor es un hermano de `<Editor>` (`EditorShell`, en `ProjectEditor`) que habla con Pascal **solo** por el puente (`shell/bridge/`; `createPascalBridge` en `src/editor/pascal-bridge.ts` es el único enlace real con `@pascal-app/*`). `shell/ui/` es presentacional y no importa Pascal. El tema es CSS (`app/globals.css`, `app/editor-shell.css`) más un parche mínimo de `@pascal-app/editor` (propiedad `chrome`; `patches/`, `scripts/pascal-chrome-patch.mjs`): `pascal-chrome.spec.ts` lo vigila y el CI lo aplica con `--frozen-lockfile`; al subir la versión de Pascal hay que regenerarlo (`docs/pascal-notes.md`). Los textos de Pascal que se muestran pasan por tablas propias (`catalog-es`, `material-es`, `levelDisplayName`, `zoneDisplayName`) y `e2e/castellano.spec.ts` busca palabras en inglés. Las teclas globales de Pascal se frenan en `shell/key-trap.ts`. Excepción a "solo `src/editor/` importa `three`": las miniaturas de muebles se fotografían con `src/editor/dev/` (`pnpm --filter @interiores/web items:thumbs`), y como `assets:vendor` vuelve a traer las miniaturas opacas de Pascal, después de vendorear hay que volver a correr `items:thumbs`.
 - **Acceso** (2026-10-11; `/login` y `/bienvenida`): `LoginScreen` (`src/components/LoginScreen.tsx`) es el único que habla con Supabase Auth; `LoginForm` y `RegisterForm` solo validan (`src/lib/auth-form.ts`, funciones puras) y avisan; las pestañas son `AuthTabs` (WAI-ARIA, flechas con `tabForKey`). **Los errores de Supabase Auth se traducen solo en `src/lib/auth-errors.ts`** (`describeAuthError`, por `code` y `status`; los de la API propia siguen en `api/errors.ts`); al ingresar nunca se dice si el correo existe. **Todo `next` pasa por `safeNext`** (`src/lib/safe-next.ts`) antes de navegar, y a /login se manda con `useLoginRedirect()` o `loginHref()` (`use-login-redirect.ts`, `login-params.ts`: `/login?motivo=sesion&next=<ruta>`), nunca con `router.replace('/login')` a mano. `useSession()` devuelve `hadSession`: distingue "nunca ingresó" (sin aviso) de "la sesión se perdió estando aquí" (`motivo=sesion`); el editor no se desmonta por eso (`sessionGate`). El nombre vive en `user_metadata.name` (`person-name.ts`: `savedName`, `greetingName`, `initialsFor`; cae al correo en las cuentas anteriores). `/bienvenida` solo se muestra tras CREAR la cuenta y lleva a `/proyectos?nuevo=vivienda|comercio|blanco`, que abre "Nuevo proyecto" con un `NewProjectPreset` (`new-project-preset.ts`) y limpia la URL. Tokens de error del shell: `danger`, `danger-ink`, `danger-wash` y `sun-ink` (texto junto a una forma Sol). **El correo y la contraseña nunca van en la URL ni en la consola.** En e2e (`e2e/acceso.spec.ts`): la contraseña se busca con `getByLabel('Contraseña', { exact: true })` (el botón "Mostrar contraseña" también la nombra) y las pruebas que registran cuentas por la interfaz llaman a `blockNonLocalSignups`: solo Supabase local.
```


```bash
sed -i "s/^> Última actualización: [0-9-]*\./> Última actualización: $(date +%F)./" docs/ESTADO.md
git diff --stat docs/ESTADO.md apps/web/CLAUDE.md
```
Expected: `git diff --stat` muestra solo líneas agregadas o cambiadas en esos dos archivos (la línea de "Última actualización" lleva la fecha de hoy).

- [ ] **Paso 4: Verificación final**

En un clon limpio, para comprobar a la vez el parche de Pascal y todo lo que se verifica sin base de datos (criterio 1 del spec):

```bash
git clone --branch feature/interfaz-laboratorio . ../madori-limpio
cd ../madori-limpio
pnpm install --frozen-lockfile
pnpm verify
```
Expected: `pnpm install` aplica el parche de Pascal sin errores y `pnpm verify` (lint, build, tipos y pruebas) termina en verde. Borra la carpeta `../madori-limpio` al terminar.

Después, en el árbol de trabajo (con Supabase local arriba: `pnpm db:start && pnpm db:env`):

Run: `pnpm --filter @interiores/web e2e`
Expected: toda la suite en verde (las pruebas de captura se saltan solas). Si falla alguna, el nombre del archivo dice la tarea: `modos` (4f), `dock` (5f), `niveles` (6d), `muebles` y `catalog` (7e), `miniaturas` (7g), `materiales` (8e), `propiedades` (9h), `vista` (10c), `teclas` (11c), `accesibilidad` (11e), `castellano` (12a), `tema` (2b) y `pascal-chrome` (3b).

- [ ] **Paso 5: Commit**

```bash
git add apps/web/e2e/capture-editor.spec.ts apps/web/scripts/capture-editor.mjs apps/web/package.json docs/design/implementado/editor-*.jpg docs/ESTADO.md apps/web/CLAUDE.md
git commit -m "docs(editor): capturas del editor, ESTADO y reglas de apps/web al día tras el shell" -- apps/web/e2e/capture-editor.spec.ts apps/web/scripts/capture-editor.mjs apps/web/package.json docs/design/implementado/editor-*.jpg docs/ESTADO.md apps/web/CLAUDE.md
```

---

## Revisión final del plan

Hecha con el spec delante, cuando el plan ya estaba escrito entero; lo que apareció se corrigió en su lugar.

### 1. Cobertura del spec

| Criterio de éxito | Tareas y pruebas que lo cubren |
|---|---|
| 1. `pnpm verify` y la suite e2e en verde desde un clon limpio, con el parche aplicado por `pnpm install` | 3a (`pascal-patch.test.ts` y el paso de CI con `--frozen-lockfile`), 12b (clon limpio, `pnpm verify` y la suite e2e completa) |
| 2. Cada botón del dock deja a Pascal como pide la tabla 4.3 | 5a (`expectedState`, `shell-dock-model`), 5b (`shell-bridge-tools`), 5f (`dock.spec.ts` recorre cada botón y cada entrada de menú) |
| 3. Ver: sin dock ni propiedades, y Supr, Retroceso y atajos no cambian la escena | 4b (`shell-bridge-mode`), 4d (`shell-connected`), 4f (`modos.spec.ts`), 5f ("en Ver el dock no está en pantalla"), 9g ("en Ver no hay panel de propiedades"), 11c (`teclas.spec.ts`) |
| 4. 2D, 3D y Ambas cambia la vista y se conserva al recargar | 4f (`modos.spec.ts`) |
| 5. Deshacer y Rehacer según el historial real | 4b (`shell-selectors`), 4f ("Deshacer y Rehacer se habilitan y deshabilitan solos…") |
| 6. Propiedades: cambia el nodo, se guarda y Deshacer lo revierte, para los ocho tipos (Muro, Puerta, Ventana, Mueble, Ambiente, Estante, Gabinete y Escalera) | 9a a 9d y 9i a 9k (modelos), 9e y 9f (puente), 9h y 9l (`propiedades.spec.ts` y `propiedades-parametricas.spec.ts`: un caso por tipo, con recarga) |
| 7. Castellano: sin palabras de la lista de inglés; "Planta baja" y "Planta 1" | 5c (atajos), 6a y 6d (plantas y ambientes), 7a y 7e (muebles), 8a, 8d y 8e (materiales), 12a (barrido de todo el shell, atributos incluidos) |
| 8. Catálogo: 144 ítems con nombre y categoría en castellano y miniatura con fondo transparente | 7a (`catalog-es.test.ts`: cada carpeta), 7g (`item-thumbnails.test.ts` y `miniaturas.spec.ts`: las cuatro esquinas de cada una) |
| 9. Tema: ningún panel con fondo oscuro pese a `body.dark` | 2a (`theme-luminance`), 2b (`tema.spec.ts`), 4f ("ninguna pieza flotante del shell tiene fondo oscuro…") |
| 10. Parche vigilado: lo que Pascal oculta no existe en pantalla | 3a (`pascal-patch.test.ts`) y 3b (`pascal-chrome.spec.ts`, con prueba de que la guarda no es vacua) |
| 11. Compartir, Renderizar, Exportar plano y Subir mi mueble deshabilitados con "Pronto" | 1c (`SoonButton`), 1g (Subir mi mueble), 5d (`shell-more-menu`), 5f (el menú Más), 10c |
| 12. Accesibilidad básica | 1e (`role="toolbar"` y `aria-pressed` en el marcado), 11d (flechas), 11e (`accesibilidad.spec.ts`: teclado, foco, 44 px, movimiento reducido), 5f (menús con teclado) |

| Decisión | Dónde se cumple |
|---|---|
| D1 escritorio completo | todas las series; móvil y tablet quedan fuera, como dice el spec |
| D2 enfoque combinado | tema (2), parche mínimo (3), shell propio (4 a 10) |
| D3 Ver = solo lectura de Pascal | 4b, 4f y, para el teclado, 11a a 11c |
| D4 "Pronto" | 1c, 1g, 5d, 8d, 10c |
| D5 panel de propiedades propio | 9a a 9l (estante, gabinete y escalera en 9i a 9l; tipo sin panel propio: nombre y Borrar, en 9g) |
| D6 "Ambiente" con la herramienta de zonas | rama de 0c (`zoneTool`), 5a, 6a a 6d |
| D7 ocultar los controles de Ver sin soporte | rama de 0c (`walkthrough`, `cameraControl`, `styleControl`), 10b, 10c |
| D8 azul noche en lo activo | 1b (`SegButton`), 1e, 2a y 2b |
| D9 catálogo propio y miniaturas transparentes | 7a a 7g |
| D10 nombres de nivel en castellano sin tocar el dato | 6a |

Las preguntas abiertas del spec quedan resueltas así: D6, D7 y D8 con su valor por defecto (el spike puede cambiar D6 y D7 sin tocar el resto: son ramas de la Tarea 0c); el contenido del menú Más, en 5d; y la revisión de la maqueta por Victoria, que el plan no exige antes del cableado (la maqueta ya la aprobó Silvert): Victoria revisa cada tarea, como dice su campo "Revisa".

Secciones del spec: 4.1 (capas) en 2, 3, 4 y 7; 4.2 (modos y vistas) en 4b, 4d, 4f y 10; 4.3 (dock) en 5; 4.4 (paneles) en 6, 7, 8 y 9; 4.5 (teclado) en 11. La estrategia de pruebas de la sección 5 queda en las pruebas citadas arriba y la visual, en las capturas de 12b. Nada de "Qué NO hace este spec" se construye.

### 2. Marcadores pendientes

Se buscaron `TBD`, `TODO`, "implementar después", "similar a la tarea", "agrega el manejo de errores" y "escribe pruebas para lo anterior" en todo el documento: sin coincidencias. Las únicas celdas "sin medir" son las de "Resultados del spike", que llena la Tarea 0 al ejecutarse.

### 3. Consistencia de nombres y tipos

Cada tarea declara en "Interfaces › Consumes" lo que usa de las anteriores y los nombres se comprobaron con el compilador: el código de todas las tareas se aplicó **en orden** sobre una copia del repo y `tsc` solo se queja de lo esperado (abajo). Los puntos donde un renombre habría roto algo: `createBlankProject` (4f) lo usan 4f, 8e, 9h, 10c, 11c, 11e y 12a; `hook` y `E2eApi` (3b) crecen en 2b, 4e, 5f, 8e, 9h y 10c sin cambiar de firma; `ShellBridge` y sus rebanadas (`bridge/*`) crecen una tarea a la vez (4a a 10a) y su único enlace real es `pascal-bridge.ts`; `DECISIONS` (0c) lo leen 3a, 3b, 4e, 5a, 7c, 10b y 10c; `ToolMenu` (1e) ya traía las flechas y en 11d comparte el ayudante con `Dock`, que las gana, sin cambiar su marcado.

### 4. Qué se verificó al escribir el plan y qué no

- **Sí:** el código de las tareas 0c a 12b se aplicó en orden sobre una copia del repo, y se corrieron las pruebas unitarias, `tsc` y Biome. Resultado: 709 pruebas en verde (284 son las `shell-*`, en 47 archivos); fallan solo las 5 que esperan un paso de su propia tarea (`pascal-patch.test.ts`, que necesita el parche de la Tarea 3a aplicado por pnpm, e `item-thumbnails.test.ts`, que necesita las miniaturas de la 7g); `tsc` sin errores propios salvo `ProjectEditor.tsx`, que pasa la propiedad `chrome` (no existe hasta que el parche está aplicado); Biome sin errores nuevos (6 avisos previos de archivos que el plan no toca). Cada tarea con pruebas unitarias se vio en rojo antes de su código y en verde después.
- **No:** todo lo que corre en navegador (14 archivos nuevos en `e2e/`), la medición de la Tarea 0 (parche de pnpm, Recorrer, cámara y estilo, colocar un mueble, ambientes e historial), el parche en sí y la regeneración de las miniaturas. Dependen de Pascal real, de WebGL, de pnpm y de Supabase local. Cada una trae su rama de respaldo (0c, 3b) o una explicación de qué mirar si falla; el punto más probable de fallo es Recorrer (puntero bloqueado) y se oculta solo si el spike no lo confirma.

# Exportar plano en PDF (Madori) — Plan de implementación

> **Para quien ejecute el plan:** REQUIRED SUB-SKILL: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementarlo tarea por tarea. Los pasos usan casillas `- [ ]` para llevar el avance.

**Goal:** Que desde el editor (en Ver y en Editar) se pueda descargar **un solo PDF con todas las plantas** del proyecto, una hoja A4 o A3 por planta, con norte arriba, a escala 1:25, 1:50 o 1:100, con cajetín y logotipo vectorial de Madori y en dos modos: **Papel** (blanco y negro, muros rellenos de negro, sin imágenes) y **Color** (ambientes, pisos y muebles en color). Un diálogo accesible muestra la vista previa real de la hoja, deshabilita las escalas en las que el edificio no cabe y sugiere la mayor que sí cabe.

**Architecture:** Un parche pequeño de `@pascal-app/editor` agrega `measureFloorplanLevels()` y `exportFloorplanPages(opciones)`, que reutilizan el dibujo de datos de Pascal (`FloorplanGeometry` a `pdfkit`) pero con hoja, escala fija, norte arriba, ganchos de estilo y de cajetín, y devuelven un `Blob` sin descargar nada. Toda la lógica de hoja, cabida, estilo, cajetín, leyenda y nombre de archivo es **código puro** en `apps/web/src/lib/export/` (sin Pascal ni DOM, con pruebas); `apps/web/src/editor/export/` lo enchufa a Pascal y a `pdfkit`; el shell habla con todo por `bridge.plan` (`measureLevels`, `build`) y el diálogo (`<dialog>` nativo) usa solo tipos propios. `pdfkit` y `pdfjs-dist` se cargan con `import()` (nunca en el paquete inicial).

**Tech Stack:** Next 16 y React 19; `@pascal-app/{editor,core,nodes,viewer}` 1.0.3 con `pnpm patch`; `pdfkit` 0.19.1 (el de Pascal; en `devDependencies` para las pruebas); `pdfjs-dist` 6.4.299 (vista previa, carga dinámica); DM Sans (OFL) incrustada; `lucide-react`; Vitest (marcado estático, sin jsdom); Playwright contra la base local; Biome; pnpm 11.2.2.

**Spec:** `docs/superpowers/specs/2026-10-12-exportar-plano-design.md` (spec 4, actualizado el 2026-10-12 con las decisiones de Silvert). El plan argumenta desde el spec: léelos juntos. Los criterios de éxito se citan como "criterio N" (17) y las decisiones como D1 a D13.

## Global Constraints

Cada tarea cumple, además de lo suyo, todo lo que sigue:

- **Frontera con Pascal (criterio 16):** solo `apps/web/src/editor/` importa `@pascal-app/*`, `three` y `@react-three/*`. `apps/web/src/lib/export/` es puro: sin Pascal, sin `three`, sin DOM, sin `pdfkit` ni `pdfjs-dist`. `shell/` y `shell/ui/` usan tipos propios. `tests/boundaries.test.ts` y `shell-boundaries.test.ts` siguen en verde.
- **Versiones exactas** en toda dependencia nueva: `pdfjs-dist` 6.4.299 (dependencia), `pdfkit` 0.19.1, `@types/pdfkit` 0.17.6, `@napi-rs/canvas` 1.0.11, `fontkit` 2.0.4, `@types/fontkit` 2.0.9, `@fontsource/dm-sans` 5.3.0 y `@fontsource-variable/fraunces` 5.3.0 (todas `devDependencies` de `apps/web`). Pascal sigue fijado en 1.0.3. Ninguna llega al paquete inicial: `pdfkit` (en Pascal) y `pdfjs-dist` se importan solo con `import()`.
- **Hojas:** A4 = 297 × 210 mm y A3 = 420 × 297 mm (apaisadas; vertical las invierte); tamaño en puntos con tolerancia de 0,5 pt (595,28 × 841,89 y 841,89 × 1190,55). Margen de 10 mm por lado, banda inferior de 36 mm (16 mm sin cajetín).
- **Escalas: solo 1:25, 1:50 y 1:100** (decisión de Silvert). Una sola para todo el PDF. Regla de cabida: `(medida en metros + 1) × 1000 / escala` en mm contra el área útil de la hoja; el porcentaje es el del eje más justo, redondeado.
- **Norte arriba** (giro 0) y **unidades en metros**, siempre. Un PDF nunca se genera con una escala en la que el edificio no cabe.
- **Papel:** muros con **relleno negro**; sin imágenes; solo negro, blanco y grises; todas las líneas de 0,7 pt o menos; sin tintes. **Color:** ambientes al 35 %, piso con el color de su material, muebles con su PNG cenital.
- **Cajetín:** logotipo vectorial (todo negro en Papel), proyecto, planta, escala, fecha en letras ("12 de octubre de 2026"), autor (nombre de la cuenta; el correo si no tiene nombre), "Hoja N de M", norte y escala gráfica. **Norte y escala gráfica siempre visibles**, incluso con "Incluir cajetín" apagado. La leyenda que no entra termina en una línea "y N más" dentro del cajetín.
- **Castellano neutro con tuteo ("tú")** en todo texto visible y en el PDF; sin lenguaje técnico en pantalla; ninguna palabra en inglés de Pascal en el PDF ("Floor plan", "Construction Schedules"). Los textos del diálogo son **nodos de React**, nunca HTML.
- **Íconos solo de `lucide-react`, nunca emojis** (`.claude/rules/iconos-sin-emojis.md`): ícono decorativo con `aria-hidden`; el botón que solo tiene ícono lleva `aria-label` en castellano.
- **Archivos de menos de 300 líneas**; lógica pura separada de los componentes.
- **Accesibilidad (criterio 15):** `<dialog>` modal, foco inicial en el primer control y vuelta al botón que lo abrió, grupos de opciones operables con teclado, las deshabilitadas explican el motivo con `aria-describedby`, resultado de la cabida con `role="status"`, vista previa con texto alternativo, objetivos táctiles de al menos 44 px, movimiento reducido respetado.
- **Antes de usar un nombre de la API de Pascal, confírmalo en `node_modules/@pascal-app/*`** y anótalo en `docs/pascal-notes.md` (regla `.claude/rules/apis-de-terceros.md`).
- **TDD:** cada tarea escribe primero la prueba y la ve fallar con su comando. Las pruebas en navegador usan la base local y los ganchos `window.__e2e` (solo con `NEXT_PUBLIC_E2E=1`), con esperas tolerantes (`toBeVisible({ timeout: 15_000 })`).
- **Commits** `tipo(área): descripción`, en castellano, **sin líneas de atribución**, con rutas explícitas (`git add <rutas>` y `git commit -m "…" -- <rutas>`); nunca `git add -A` ni `commit -a`. Sin `push`.

## Review Focus

Entradas que el spec insinúa y que ninguna prueba obvia cubriría; cada una tiene su prueba en la tarea que es dueña del código. Orden: la que más probablemente rompa primero.

1. **Escena sin ambientes, o con una planta vacía:** el PDF sale igual (muros y muebles), la leyenda de Color dice "Sin ambientes dibujados" sin dejar un hueco roto, las etiquetas no inventan m²; una planta sin nada aparece deshabilitada y desmarcada con "(vacía)", y si todas están vacías el diálogo dice "Aún no hay nada que dibujar" y "Descargar PDF" queda inactivo. → Tareas **4** (`legend`), **10a** (`draw-band`), **10c** (`draw-sheet`), **12c** (`build-plan`), **14a** y **14b** (`export-plan-model`) y **19** (`exportar-plano.spec.ts`).
2. **Plantas sin nombre o con el nombre en inglés de Pascal (`Ground Floor`, `Floor 1`, `Level 0`):** el cajetín, el paginador y la lista de plantas muestran "Planta baja", "Planta 1", "Sótano 1"; el dato guardado no se toca. → Tareas **13** (`shell-plan-bridge`) y **12c** (`build-plan` sobre el PDF).
3. **Edificio que no cabe en ninguna escala** (un supermercado de 40 × 30 m en A4, o más grande aún en A3): las tres escalas quedan deshabilitadas con su motivo, el mensaje dice "El proyecto no cabe en esta hoja ni a 1:100. Prueba con A3 o quita plantas.", el botón de descarga queda inactivo y **nunca** se genera un PDF recortado (el parche además recorta el dibujo al área útil, así que un exceso jamás pisa el cajetín). → Tareas **2** (`fit`), **14a** (`export-plan-model`) y **19**.
4. **Nombre de proyecto con caracteres especiales o muy largo** (`a/b:c`, `CON`, tildes, "ñ", emoji, 300 caracteres, solo espacios, escritura no latina): el archivo es seguro y de 80 caracteres o menos, nunca vacío; el cajetín corta con "…" sin salirse de su caja y el texto con "ő" o "Ł" no sale roto. → Tareas **3** (`file-name`, `fit-text`), **7b** (`font-coverage`), **10b** (`draw-block`) y **11** (cajetín sobre `pdfkit` real).
5. **Muebles sin PNG cenital o con la imagen bloqueada** (las 40 carpetas sin `floor-plan.png`, o la red cae): en Color el PDF sale igual, el diálogo avisa cuántos muebles faltaron y en Papel no se pide ninguna imagen. → Tareas **0b** (medición con `route.abort()`), **5a** (`plan-style` quita las imágenes en Papel) y **20b** (`exportar-plano-pdf.spec.ts`).

---

## Cómo ejecutar este plan

**Rama:** `feature/editor-shell` (la actual). Cada tarea termina en un commit. No se hace `push`.

**Antes de empezar (una sola vez):**

```bash
git branch --show-current   # feature/editor-shell
pnpm db:start && pnpm db:env   # Supabase local; apps/web/.env.local trae NEXT_PUBLIC_E2E=1
pnpm --filter @interiores/web exec vitest run && pnpm --filter @interiores/web typecheck && pnpm lint
```
Esperado: todo en verde. Biome ya muestra unos avisos de archivos que este plan no toca; "sin errores nuevos" quiere decir que no sube el número.

**Fin de línea.** Este equipo trabaja en Windows y varios archivos que el plan edita están en el disco con CRLF (el índice de git guarda LF). Las ediciones del plan buscan texto de varias líneas y **no encuentran nada si el archivo tiene CRLF**. Antes de empezar, pásalos a LF:

```bash
sed -i 's/\r$//' apps/web/src/editor/pascal-bridge.ts apps/web/src/editor/e2e-hooks.ts apps/web/src/editor/ProjectEditor.tsx apps/web/src/editor/shell/EditorShell.tsx apps/web/src/editor/shell/ShellDock.tsx apps/web/src/editor/shell/ShellView.tsx apps/web/src/editor/shell/MoreMenu.tsx apps/web/src/editor/shell/more-model.ts apps/web/src/editor/shell/bridge/index.ts apps/web/src/editor/shell/ui/ViewControls.tsx apps/web/test/support/fake-deps.ts apps/web/test/pascal-patch.test.ts apps/web/test/shell-more-menu.test.tsx apps/web/test/shell-more-model.test.ts apps/web/test/shell-view-controls.test.tsx apps/web/test/person-name.test.ts apps/web/src/lib/person-name.ts apps/web/e2e/dock.spec.ts apps/web/e2e/castellano.spec.ts apps/web/package.json apps/web/CLAUDE.md docs/ESTADO.md docs/pascal-notes.md docs/design/README.md docs/superpowers/specs/2026-10-11-editor-shell-design.md .gitignore
git status --short   # no debe listar esos archivos como modificados
```
Si más adelante una edición dice que no encuentra su texto, mira `git ls-files --eol <archivo>`: si muestra `w/crlf`, corre el mismo `sed` sobre ese archivo.

**Cómo leer los bloques de código:**

- **`Create ruta:`** seguido de un bloque de código crea ese archivo con ese contenido exacto (si añade «ya existe: reemplázalo entero», lo sobrescribe).
- **`Modify ruta:`** seguido de un bloque `diff` cambia un archivo que ya existe. Cada `@@` abre un cambio: las líneas que empiezan con un espacio son **contexto** (están igual en el archivo), las que empiezan con `-` se borran y las que empiezan con `+` se agregan. El contexto más las líneas con `-` aparecen **exactamente una vez** en el archivo; si no lo encuentras una sola vez, no adivines: mira el archivo y ajusta el ancla.
- **`Run:`** es el comando y **`Expected:`** lo que debes ver; si ves otra cosa, no sigas: la tarea tiene su explicación debajo.
- Las tareas **1 a 12c** (menos la 0) se verifican con `vitest` y sin navegador (las 11, 12b y 12c usan `pdfkit` real en Node). Lo que corre en navegador (0b, 0d, 19 a 22) y la exportación real dependen de lo que mida la Tarea 0.
- **Tamaño de las tareas:** van de unas 55 a unas 370 líneas porque cada una lleva su prueba y su código completos; la 0a (el script del parche, un solo bloque indivisible) es la única que pasa de 400.

**Comandos** (desde la raíz del repo):

| Para | Comando |
|---|---|
| Pruebas unitarias de lo que tocas | `pnpm --filter @interiores/web exec vitest run <parte-del-nombre>` (todas las de este plan: `export-`; las del shell: `shell-`) |
| Tipos | `pnpm --filter @interiores/web typecheck` (ignora los errores internos de Pascal en `node_modules`) |
| Lint | `pnpm lint` |
| Pruebas en navegador | `pnpm --filter @interiores/web e2e e2e/<archivo>.spec.ts` (Playwright levanta la API y la web si no están corriendo) |
| Todo | `pnpm verify` (lint, build, tipos y pruebas) y `pnpm --filter @interiores/web e2e` |

## Mapa de archivos

```
apps/web/
  src/lib/export/                       código puro (sin Pascal, sin DOM)                               (1 a 12)
    types.ts            tipos compartidos: hoja, escala, modo, opciones, niveles, puente            (1)
    sheet.ts            hojas A4/A3, orientaciones, márgenes, banda, mm <-> pt                         (1)
    fit.ts              regla de cabida, escalas, orientación sugerida                                 (2)
    file-name.ts, format-date.ts, fit-text.ts   nombre de archivo, fecha en letras, texto con "…"       (3)
    scale-bar.ts, legend.ts                      escala gráfica y leyenda                              (4)
    plan-style.ts, color-filter.ts, plan-colors.ts   estilo Papel y Color y filtro de colores         (0c, 5a, 5b, 12a)
    texts-es.ts, font-coverage.ts, font-files.ts   textos y reparto de caracteres entre las fuentes      (7a, 7b, 8)
    title-block.ts      reparto de la banda y capacidad de la leyenda                                  (6)
    surface.ts, draw-band.ts, draw-block.ts, draw-sheet.ts   dibujantes sobre PdfSurface             (10a, 10b, 10c)
    brand-paths.ts      logotipo de Madori en caminos (generado)                                       (9)
    zone-labels.ts      superficie y centro de un ambiente                                             (12a)
    decisions.ts        lo que midió la Tarea 0                                                        (0e)
  src/editor/export/                    enlace con Pascal y pdfkit                                      (8, 11, 12b, 13)
    pdf-surface.ts      PdfSurface sobre un documento de pdfkit                                         (11)
    pdf-fonts.ts        carga de DM Sans                                                                (8)
    build-plan.ts       junta proyecto, persona, fuentes y opciones y llama al parche                   (12b, 12c)
    pascal-plan.ts      funciones reales de PlanDeps                                                    (13)
  src/editor/shell/
    bridge/plan.ts      bridge.plan.measureLevels() y bridge.plan.build()                              (13)
    export-plan-model.ts   estado del diálogo (reductor) y selectores                                  (14a, 14b, 14c)
    ExportPlanDialog.tsx, ui/PlanOptions.tsx, ui/PlanPreview.tsx, use-plan-preview.ts                  (15a a 17)
  public/fonts/pdf/   DM Sans (woff), OFL.txt y FUENTES.txt                                             (8)
  public/brand/madori-logotipo.svg                                                                      (9)
  scripts/            vendor-pdf-fonts.mjs, build-brand-paths.ts, copy-pdf-worker.mjs, initial-js.mjs
  test/               export-*.test.ts(x), shell-plan-*.test.ts(x)                                      (todas)
  e2e/                exportar-plano.spec.ts, exportar-plano-papel-color.spec.ts, exportar-plano-pdf.spec.ts, capture-export-plan.spec.ts, support/export.ts, support/pdf.ts   (19, 20a, 20b, 22)
scripts/pascal-plan-patch.mjs, patches/@pascal-app__editor@1.0.3.patch   el parche y su regeneración   (0a)
docs/                pascal-notes.md, ESTADO.md, design/implementado/exportar-plano-*.png, design/24-*.png (21 a 23)
```

## Tareas

| Serie | Qué entrega | Quién (sugerido) |
|---|---|---|
| **0a a 0e** | Medición previa de lo que el spec marca como no verificado: el parche de Pascal (0a, medido en el navegador en la 0b), `pdfkit`, el filtro de colores y DM Sans (0c), `pdfjs-dist` y el peso del paquete inicial (0d) y `decisions.ts` (0e). Cada medición tiene su rama de respaldo. | Sonnet (mide) |
| **1 a 4** | Hojas y tipos, cabida, nombre de archivo, fecha y texto con "…", escala gráfica y leyenda. | Haiku |
| **5a a 5b** | Estilo Papel (muros negros, sin imágenes) y estilo Color (filtro puro sobre la geometría). | Haiku, revisa Sonnet |
| **6 a 7b** | Reparto de la banda del cajetín; textos en castellano; reparto de caracteres entre las fuentes. | Haiku |
| **8** | DM Sans (archivos, licencia, versión y origen) y su carga. | Haiku |
| **9** | Logotipo vectorial con letras (script, caminos, SVG). | Sonnet |
| **10a a 10c** | Dibujantes de la hoja: superficie, norte, escala gráfica y leyenda (10a); cajetín con logotipo (10b); hoja completa (10c). | Sonnet |
| **11** | `PdfSurface` sobre `pdfkit` y la prueba del contenido del PDF real. | Sonnet |
| **12a a 12c** | Colores de pisos y etiquetas de superficie (12a, Haiku); `build-plan`: opciones del parche (12b) y dibujo de cada hoja (12c). | Haiku / Sonnet |
| **13 a 14c** | Puente (`bridge.plan`) y estado del diálogo (opciones y cabida, plantas, generar). | Haiku, revisa Sonnet |
| **15a a 17** | Opciones (hoja, orientación, escala, modo; plantas y cajetín), vista previa (ejecutor y hoja real) y diálogo accesible con descarga. | Sonnet |
| **18a a 18b** | Activar "Exportar plano" en el menú Más y en Ver; el diálogo en el editor y el autor. | Haiku |
| **19 a 20b** | E2E: abrir, escalas, descarga real (19); Papel y Color (20a); escala medida, imágenes, carga perezosa y castellano (20b). | Sonnet |
| **21 a 22** | Lámina 24 (352 mm) y capturas contra las láminas. | Silvert o Sonnet |
| **23** | Documentación, guardas de carga y verificación final. | Haiku, revisa Sonnet |

Las series dependen unas de otras en el orden en que están: ejecútalas **en orden**.

## Resultados de la Tarea 0

Los llena la Tarea 0 (la 0a pone el parche y la 0b lo mide en el navegador: M1 a M6; la 0c mide `pdfkit` y las fuentes: M7 y M8; la 0d, `pdfjs` y el peso: M9 y M10; la 0e fija `decisions.ts`). Las tareas siguientes leen solo `apps/web/src/lib/export/decisions.ts`; esta tabla es el registro con fecha. Si algo no se confirma, **no sigas con las tareas que dependen de eso**: aplica la rama de respaldo de la fila y anótala.

<!-- tarea0-resultados -->
| # | Se mide | Se acepta si | Si no se confirma (rama de respaldo) | Resultado y fecha |
|---|---|---|---|---|
| M1 | `pnpm patch` conserva el parche anterior (`chrome`, `__madoriDecoupled`…) y se vuelve a aplicar con `pnpm install --frozen-lockfile` | `patches/@pascal-app__editor@1.0.3.patch` sigue trayendo `__madoriDecoupled` y las pruebas de `pascal-patch.test.ts` pasan tras reinstalar | Aplicar el parche viejo a mano en la carpeta de edición con `patch -p1 < patches/...` antes de reaplicar el script (paso 3 de la 0a) | |
| M2 | `measureFloorplanLevels()` en el Loft | 2 plantas con ancho y alto en metros mayores que 0, sin errores en consola | Si lanza por `flushSync` dentro de un efecto: llamarlo desde `setTimeout(…, 0)` en `pascal-plan.ts`; si las medidas vienen en otra unidad, dividir en el puente | |
| M3 | `exportFloorplanPages()` con A4 apaisada y 1:50 | PDF con una página por planta marcada, de 842 × 595 pt (± 1) | Si Pascal pinta fuera de la hoja: bajar el recorte al área útil en el parche; si no hay `Blob`, usar `finish()` del documento | |
| M4 | Tiempo de una planta del Loft y del Supermercado | Loft ≤ 2 s por planta (criterio 8); Supermercado se registra | Subir `previewDelayMs` a 400 y aceptar ≤ 4 s con aviso "Actualizando…"; el criterio 8 se reescribe en el spec | |
| M5 | ¿La etiqueta de ambiente de Pascal ya trae los m²? | texto con `m²` entre los `text` del plano | `areaLabels: 'madori'` en `decisions.ts` (`extraGeometry` los agrega) | |
| M6 | Imagen de mueble bloqueada con `route.abort()` | `skippedImages > 0` y el PDF sigue válido | Capturar el error por planta en `exportFloorplanPages` y contar la planta entera | |
| M7 | Filtro de colores (`withColorFilter`) sobre `pdfkit` 0.19.1 real, también encadenado | `0 0 0 rg` y `1 1 1 rg`, sin los grises azulados de Pascal | `colorFilter` dentro del renderizador (más parche) en lugar del `Proxy` | |
| M8 | DM Sans (woff de `@fontsource/dm-sans` 5.3.0) incrustada en `pdfkit` y leída con `pdfjs-dist` | `BaseFont` con "DMSans", texto extraído con tildes, "ñ", "—" y "Łódź" | `fonts: 'helvetica'` (Helvetica estándar, sin Latin extendido, el criterio 12 se rebaja) | |
| M9 | `pdfkit` en el navegador con carga dinámica | el trozo de `pdfkit` (`PDFNameTree`) solo se pide al exportar; el JS inicial de la página del editor no crece | Marcar `exportFloorplanPdf` de Pascal como único importador; si el trozo está en el inicial, avisar a Silvert antes de seguir | |
| M10 | `pdfjs-dist` 6.4.299 en Next 16 (dev y producción) con el trabajador en `public/` | un `<canvas>` con píxeles no blancos y sin errores de CSP | `previewMode: 'frame'`: cuadro con el tamaño de la hoja y el porcentaje usado (D10); el criterio 8 queda como "texto y porcentaje" | |

## Desviaciones y decisiones frente al spec

Cada fila dice qué hace el plan de distinto o de más que el spec, y por qué.

| Tema | El spec dice | El plan hace, y por qué | Tarea |
|---|---|---|---|
| Parche | D3: `export` en `mountFloorplanSvg`, `combineGeometryList`, `measureFloorplanBounds` | La función nueva vive **dentro** de `floorplan-export.tsx`, así que no hace falta exportar nada: ahorra tres cambios. Además el parche toca el documento de `pdfkit` (`wrapRaw` y `finish`) y el renderizador (`onImageError`) | 0a |
| Papel | D11: sin rellenos; muros en doble línea | Decisión de Silvert: **muros con relleno negro**; el resto sin relleno. El criterio 9 se redacta de nuevo | 5a, 20a |
| Colores en Papel | no lo dice | Un `Proxy` sobre el documento (`withColorFilter`) convierte los colores fijos del renderizador de Pascal (`#334155`, `#111827`…) en negro o blanco, para que la página tenga solo grises | 0c, 12 |
| Escalas | D5: 1:25, 1:50, 1:100, 1:200 y 1:500 | Solo 1:25, 1:50 y 1:100; el mensaje de "no cabe" dice "ni a 1:100" | 2 |
| Cotas en Papel | D11: 0,25 pt en cotas | Las cotas las dibuja el renderizador de Pascal con 0,5 pt fijos (≤ 0,7: cumple el criterio 9); no se tocan | 5a |
| Cajetín | D9/D12: icono y logotipo | El cajetín lleva el **logotipo con letras** (vectorial); el cuadrado Crema del icono no se dibuja (sería redundante) | 9, 10b |
| Leyenda | 5.3: capacidad 8, 12, 4, 8 | Se obtiene con columnas de 45 mm (máximo 3) y 4 filas; da exactamente 8, 12, 4 y 8 | 6 |
| Vista previa numerada | 5.5 | `PlanBuildArgs.sheetNumbers` deja que la vista previa de una sola planta diga "Hoja 2 de 3" | 12c, 14b, 16a |
| Superficie de un ambiente | 5.3: `deriveZoneQuantityReport` | `polygonArea` (la misma fórmula del polígono, sin la detección de recintos que corre antes: sería caro en cada cambio), igual que el plan del shell | 12a |
| Fuentes | D8: TTF estáticos de DM Sans | Los `woff` de `@fontsource/dm-sans` 5.3.0 (`latin` y `latin-ext`, 400 y 700), con `splitRuns` repartiendo los caracteres entre los dos archivos; respaldo Helvetica (`decisions.fonts`) | 7b, 8 |
| Texto del plano | 7 (riesgos): un filtro reemplaza por "?" lo que Helvetica no tiene | `safeText` en `plan-style.ts`, en Papel y en Color | 5a, 5b |
| Pruebas de carga y de pureza | 6: una prueba estática de `import()` | `export-lazy-imports.test.ts` (también vigila que `lib/export` sea puro) en la Tarea 23 | 23 |
| Tamaño de las tareas | tareas de 90 a 250 líneas | Entre 55 y 370 líneas porque cada una trae su prueba y su código completos; la 0a es la única que pasa de 400 (el script del parche no se parte) | todas |

---

## Tarea 0: medir lo que el spec marca como no verificado

Las sub-tareas (0a a 0e) responden a la tabla "Resultados de la Tarea 0". **Regla:** una medición que falla no se maquilla: se aplica su rama de respaldo, se anota en la tabla y, si cambia un criterio del spec, se corrige el spec en el mismo commit.

### Task 0a: El parche de Pascal (`measureFloorplanLevels` y `exportFloorplanPages`)

**Files:**
- Create: `scripts/pascal-plan-patch.mjs`
- Modify: `patches/@pascal-app__editor@1.0.3.patch` (lo regenera `pnpm patch-commit`), `pnpm-lock.yaml` (idem), `apps/web/test/pascal-patch.test.ts`, `docs/superpowers/plans/2026-10-12-exportar-plano.md` (fila M1 de la tabla de resultados)

**Interfaces:**
- Consumes: nada de las tareas anteriores.
- Produces (desde `@pascal-app/editor`, ya parchado):
  - `measureFloorplanLevels(): Promise<FloorplanLevelMeasure[]>` con `FloorplanLevelMeasure = { id: string; name: string | null; level: number; widthM: number; heightM: number; empty: boolean }` (de la más baja a la más alta; `empty` si la planta no tiene nada que dibujar).
  - `exportFloorplanPages(options: FloorplanPagesOptions): Promise<FloorplanPagesResult>` con `FloorplanPagesOptions = { levels: readonly string[]; page: { widthPt; heightPt; usable: { x; y; width; height } }; scale: number /* pt por metro */; mapGeometry?(node, geometry); extraGeometry?(levelId); wrapRaw?(raw); setup?(raw); pageChrome?(raw, { index, count, levelId }); onProgress?(done, total); signal?: AbortSignal }` y `FloorplanPagesResult = { blob: Blob; pages: number; skippedImages: number }`.

Este parche es **el definitivo** (no un experimento): la Tarea 0b solo comprueba que funciona en el navegador. El script es un único bloque que no se puede partir sin romper sus anclas (por eso esta tarea pasa de las 250 líneas). Los nombres salen de la lectura de `floorplan-export.tsx`, `floorplan-pdfkit-document.ts` y `floorplan-pdfkit-renderer.ts` (Pascal 1.0.3).

- [ ] **Paso 1: Escribir la prueba del parche (rojo)**

Modify `apps/web/test/pascal-patch.test.ts`: agrega la ruta de las fuentes de Pascal y una prueba al final del `describe`.

```diff
 const editorIndex = fileURLToPath(
   new URL('../node_modules/@pascal-app/editor/src/components/editor/index.tsx', import.meta.url),
 )
+const editorSrc = fileURLToPath(new URL('../node_modules/@pascal-app/editor/src/', import.meta.url))
 const PATCH_FILE = 'patches/@pascal-app__editor@1.0.3.patch'
```

```diff
   it('el plano y la cámara 3D se desenlazan con __madoriDecoupled (parche en floorplan-camera-sync y floorplan-panel)', () => {
     const dir = editorIndex.replace('index.tsx', '')
     expect(readFileSync(`${dir}floorplan-camera-sync.ts`, 'utf8')).toContain('__madoriDecoupled')
     expect(readFileSync(`${dir}floorplan-panel.tsx`, 'utf8')).toContain('__madoriDecoupled')
     expect(readFileSync(fromRoot(PATCH_FILE), 'utf8')).toMatch(/^\+.*__madoriDecoupled/m)
   })
+
+  it('el parche de planos agrega measureFloorplanLevels y exportFloorplanPages, los exporta y conserva los parches anteriores', () => {
+    const exportFile = readFileSync(`${editorSrc}lib/floorplan/floorplan-export.tsx`, 'utf8')
+    expect(exportFile).toContain('export async function exportFloorplanPages')
+    expect(exportFile).toContain('export async function measureFloorplanLevels')
+    const index = readFileSync(`${editorSrc}index.tsx`, 'utf8')
+    for (const name of ['exportFloorplanPages', 'measureFloorplanLevels', 'FloorplanPagesOptions', 'FloorplanPagesResult', 'FloorplanLevelMeasure']) {
+      expect(index, name).toContain(name)
+    }
+    expect(readFileSync(`${editorSrc}lib/floorplan/floorplan-pdfkit-renderer.ts`, 'utf8')).toContain('onImageError')
+    expect(readFileSync(`${editorSrc}lib/floorplan/floorplan-pdfkit-document.ts`, 'utf8')).toContain('wrapRaw')
+    const patch = readFileSync(fromRoot(PATCH_FILE), 'utf8')
+    for (const name of ['exportFloorplanPages', 'measureFloorplanLevels', 'onImageError', 'wrapRaw', '__madoriDecoupled', 'data-pascal-dock']) {
+      expect(patch, name).toMatch(new RegExp(`^\\+.*${name}`, 'm'))
+    }
+  })
 })
```

Run: `pnpm --filter @interiores/web exec vitest run pascal-patch`
Expected: FAIL en "el parche de planos agrega…" (`expected … to contain 'export async function exportFloorplanPages'`); las otras cuatro pasan.

- [ ] **Paso 2: Escribir el script del parche**

Create `scripts/pascal-plan-patch.mjs` (reaplica el parche de planos sobre una carpeta abierta con `pnpm patch`; falla y no escribe nada si un ancla ya no aparece exactamente una vez):

```js
// Aplica el parche de planos de Madori sobre @pascal-app/editor 1.0.3 (exportación configurable a PDF).
// Uso: pnpm patch @pascal-app/editor@1.0.3 --edit-dir ../madori-editor-plan-edit
//      node scripts/pascal-plan-patch.mjs ../madori-editor-plan-edit
//      pnpm patch-commit ../madori-editor-plan-edit
// Falla (y no escribe nada) si algún ancla ya no aparece exactamente una vez: señal de que Pascal cambió.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir) {
  console.error('Uso: node scripts/pascal-plan-patch.mjs <carpeta abierta con pnpm patch>')
  process.exit(1)
}

const EXPORT_BLOCK = `/* ── Madori: planos configurables (hoja, escala fija y norte arriba) ─────────────────────────────────────── */
type PdfRaw = FloorplanPdfDocument['raw']

export type FloorplanLevelMeasure = {
  id: string
  name: string | null
  level: number
  /** Medidas del dibujo de la planta en metros, sin el margen de cotas. */
  widthM: number
  heightM: number
  empty: boolean
}

export type FloorplanPagesOptions = {
  /** Ids de las plantas elegidas; el orden sale de la planta (de la más baja a la más alta). */
  levels: readonly string[]
  /** Hoja y área útil en puntos del PDF, con el origen arriba a la izquierda. */
  page: {
    widthPt: number
    heightPt: number
    usable: { x: number; y: number; width: number; height: number }
  }
  /** Puntos del PDF por metro del plano (a 1:50 son 56,69). */
  scale: number
  /** Cambia o descarta (null) la geometría de cada nodo antes de dibujarla. */
  mapGeometry?: (node: AnyNode | undefined, geometry: FloorplanGeometry) => FloorplanGeometry | null
  /** Geometría propia que se suma al plano de la planta (por ejemplo, superficies). */
  extraGeometry?: (levelId: string) => FloorplanGeometry[]
  /** Envuelve el documento que usa el renderizador de Pascal (por ejemplo, para filtrar colores). */
  wrapRaw?: (raw: PdfRaw) => PdfRaw
  /** Se llama una vez, con el documento sin envolver, antes de la primera página (fuentes, metadatos). */
  setup?: (raw: PdfRaw) => void | Promise<void>
  /** Se llama al final de cada página, con el documento sin envolver y sin recorte (marco y cajetín). */
  pageChrome?: (
    raw: PdfRaw,
    context: { index: number; count: number; levelId: string },
  ) => void | Promise<void>
  onProgress?: (done: number, total: number) => void
  signal?: AbortSignal
}

export type FloorplanPagesResult = { blob: Blob; pages: number; skippedImages: number }

const MADORI_ROTATION_DEG = 0

function madoriHost(): HTMLDivElement {
  const host = document.createElement('div')
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none;'
  document.body.appendChild(host)
  return host
}

function madoriGeometries(levelId: AnyNodeId): ExportGeometry[] {
  const { nodes, installedPlugins } = useScene.getState()
  const viewer = useViewer.getState()
  const floorplanMode = useFloorplanMode.getState().mode
  const annotationState = useFloorplanAnnotationVisibility.getState()
  return collectFloorplanGeometry(
    nodes,
    levelId,
    'full',
    'metric',
    viewer.metricNotation,
    resolveFloorplanExportAnnotationVisibility(floorplanMode, annotationState.visibility),
    'floor-plan',
    resolveFloorplanWallDimensionReference(floorplanMode, annotationState.wallDimensionReference),
    installedPlugins,
  )
}

/** Mide cada planta del edificio activo (de la más baja a la más alta): metros de ancho y alto del dibujo. */
export async function measureFloorplanLevels(): Promise<FloorplanLevelMeasure[]> {
  const { nodes } = useScene.getState()
  const host = madoriHost()
  const result: FloorplanLevelMeasure[] = []
  try {
    for (const level of resolveExportLevels(nodes)) {
      const node = nodes[level.id]
      const base = {
        id: level.id as string,
        name: node?.name?.trim() || null,
        level: node ? levelIndexOf(node) : 0,
      }
      const geometries = madoriGeometries(level.id)
      const mounted = geometries.some((geometry) => geometry.model)
        ? await mountFloorplanSvg(host, geometries, MADORI_ROTATION_DEG)
        : null
      if (!mounted) {
        result.push({ ...base, widthM: 0, heightM: 0, empty: true })
        continue
      }
      try {
        const bounds = measureFloorplanBounds(mounted.svg, '[data-floorplan-model]')
        result.push({ ...base, widthM: bounds?.width ?? 0, heightM: bounds?.height ?? 0, empty: !bounds })
      } finally {
        mounted.cleanup()
      }
    }
  } finally {
    host.remove()
  }
  return result
}

/**
 * Genera un PDF con una página por planta elegida, a escala fija y con el norte arriba, y devuelve el Blob (no descarga
 * nada). El dibujo queda centrado en el área útil y recortado a ella: un exceso nunca pisa el cajetín.
 */
export async function exportFloorplanPages(
  options: FloorplanPagesOptions,
): Promise<FloorplanPagesResult> {
  const { nodes } = useScene.getState()
  const chosen = resolveExportLevels(nodes).filter((level) => options.levels.includes(level.id))
  if (chosen.length === 0) throw new Error('[floorplan-export] no level to export')
  const { page, scale } = options
  const { doc, raw, finish } = await createFloorplanPdfDocument(
    [page.widthPt, page.heightPt],
    options.wrapRaw,
  )
  if (options.setup) await options.setup(raw)
  const host = madoriHost()
  const area = page.usable
  let pages = 0
  let skippedImages = 0
  const onImageError = () => {
    skippedImages += 1
  }
  try {
    for (const [index, level] of chosen.entries()) {
      if (options.signal?.aborted) throw new DOMException('Exportación cancelada', 'AbortError')
      options.onProgress?.(index, chosen.length)
      await nextFrames(1)
      const geometries = madoriGeometries(level.id).map((geometry) => ({
        ...geometry,
        model:
          geometry.model && options.mapGeometry
            ? options.mapGeometry(nodes[geometry.id], geometry.model)
            : geometry.model,
      }))
      const extras = options.extraGeometry ? options.extraGeometry(level.id) : []
      doc.addPage([page.widthPt, page.heightPt])
      pages += 1
      const mounted = geometries.some((geometry) => geometry.model)
        ? await mountFloorplanSvg(host, geometries, MADORI_ROTATION_DEG)
        : null
      if (mounted) {
        try {
          await mounted.setScreenUnitsPerPixel(1 / scale)
          const { viewport } = mounted
          const width = viewport.width * scale
          const height = viewport.height * scale
          const placement = {
            x: area.x + (area.width - width) / 2,
            y: area.y + (area.height - height) / 2,
            width,
            height,
          }
          raw.save()
          raw.rect(area.x, area.y, area.width, area.height).clip()
          const model = combineGeometryList([...geometries.map((geometry) => geometry.model), ...extras])
          if (model) {
            await renderFloorplanGeometryToPdfKit(doc, model, {
              annotationLayer: false,
              placement,
              rotationDeg: MADORI_ROTATION_DEG,
              viewport,
              onImageError,
              signal: options.signal,
            })
          }
          const annotations = combineGeometryList(geometries.map((geometry) => geometry.annotations))
          if (annotations) {
            await renderFloorplanGeometryToPdfKit(doc, annotations, {
              annotationLabelShifts: mounted.annotationLabelShifts,
              annotationLayer: true,
              placement,
              rotationDeg: MADORI_ROTATION_DEG,
              viewport,
              onImageError,
              signal: options.signal,
            })
          }
          raw.restore()
        } finally {
          mounted.cleanup()
        }
      }
      if (options.pageChrome) {
        await options.pageChrome(raw, { index, count: chosen.length, levelId: level.id as string })
      }
      options.onProgress?.(index + 1, chosen.length)
    }
    return { blob: await finish(), pages, skippedImages }
  } finally {
    host.remove()
  }
}
/* ── fin del parche de planos ─────────────────────────────────────────────────────────────────────────────── */

export function collectFloorplanSchedules(`

const EDITS = {
  'src/lib/floorplan/floorplan-export.tsx': [
    ['export function collectFloorplanSchedules(', EXPORT_BLOCK],
  ],
  'src/lib/floorplan/floorplan-pdfkit-document.ts': [
    [
      'export async function createFloorplanPdfDocument(defaultPageSize: readonly [number, number]) {',
      `export async function createFloorplanPdfDocument(
  defaultPageSize: readonly [number, number],
  /** Madori: envuelve el documento que usa el renderizador (filtro de colores del modo Papel). */
  wrapRaw?: (raw: PdfKitDocumentInstance) => PdfKitDocumentInstance,
) {`,
    ],
    [
      `  return {
    doc: new FloorplanPdfDocument(raw, defaultPageSize),
    save: async (filename: string) => {
      const blob = await new Promise<Blob>((resolve, reject) => {
        stream.on('finish', () => resolve(stream.toBlob('application/pdf')))
        stream.on('error', reject)
        raw.on('error', reject)
        raw.end()
      })
`,
      `  // Madori: cerrar el documento y devolver el Blob sin descargarlo.
  const finish = () =>
    new Promise<Blob>((resolve, reject) => {
      stream.on('finish', () => resolve(stream.toBlob('application/pdf')))
      stream.on('error', reject)
      raw.on('error', reject)
      raw.end()
    })
  return {
    doc: new FloorplanPdfDocument(wrapRaw ? wrapRaw(raw) : raw, defaultPageSize),
    raw,
    finish,
    save: async (filename: string) => {
      const blob = await finish()
`,
    ],
  ],
  'src/lib/floorplan/floorplan-pdfkit-renderer.ts': [
    ['type RenderContext = {\n', 'type RenderContext = {\n  onImageError?: (error: unknown) => void\n  signal?: AbortSignal\n'],
    [
      `    placement: FloorplanPdfKitPlacement
    rotationDeg: number
    viewport: FloorplanExportBounds
  },
): Promise<void> {`,
      `    placement: FloorplanPdfKitPlacement
    rotationDeg: number
    viewport: FloorplanExportBounds
    /** Madori: una imagen que no carga no tumba el PDF; quien llama la cuenta. */
    onImageError?: (error: unknown) => void
    /** Madori: al cancelar, la siguiente imagen corta el dibujo de la planta en curso. */
    signal?: AbortSignal
  },
): Promise<void> {`,
    ],
    [
      `    sceneRotationDeg: options.rotationDeg,
    unitsPerPoint: 1 / pointsPerUnit,
  })`,
      `    sceneRotationDeg: options.rotationDeg,
    unitsPerPoint: 1 / pointsPerUnit,
    onImageError: options.onImageError,
    signal: options.signal,
  })`,
    ],
    [
      `    case 'image':
      await drawImage(doc, geometry)
      return`,
      `    case 'image':
      if (context.signal?.aborted) throw new DOMException('Exportación cancelada', 'AbortError')
      try {
        await drawImage(doc, geometry)
      } catch (error) {
        if (!context.onImageError) throw error
        context.onImageError(error)
      }
      return`,
    ],
  ],
  'src/index.tsx': [
    [
      `export {
  exportFloorplanPdf,
  type FloorplanExportScope,
} from './lib/floorplan/floorplan-export'`,
      `export {
  exportFloorplanPages,
  exportFloorplanPdf,
  type FloorplanExportScope,
  type FloorplanLevelMeasure,
  type FloorplanPagesOptions,
  type FloorplanPagesResult,
  measureFloorplanLevels,
} from './lib/floorplan/floorplan-export'`,
    ],
  ],
}

// Primero se calcula todo; solo si todas las anclas aparecen una vez se escribe.
const outputs = []
for (const [file, edits] of Object.entries(EDITS)) {
  let text = readFileSync(join(dir, file), 'utf8')
  for (const [anchor, replacement] of edits) {
    const count = text.split(anchor).length - 1
    if (count !== 1) {
      console.error(`${file}: el ancla aparece ${count} veces (debía ser 1):\n${anchor.slice(0, 160)}`)
      process.exit(1)
    }
    text = text.replace(anchor, () => replacement)
  }
  outputs.push([file, text])
}
for (const [file, text] of outputs) writeFileSync(join(dir, file), text)
console.log(`OK: ${outputs.length} archivos parchados (${outputs.map(([file]) => file).join(', ')})`)
```

- [ ] **Paso 3: Abrir, parchar y confirmar el parche (M1)**

Run (desde la raíz del repo):

```bash
pnpm patch @pascal-app/editor@1.0.3 --edit-dir ../madori-editor-plan-edit
grep -c "__madoriDecoupled" ../madori-editor-plan-edit/src/components/editor/floorplan-panel.tsx
```
Expected: la primera línea imprime la ruta de edición; el `grep -c` imprime un número **mayor que 0** (el parche anterior viene aplicado).

Si imprime `0`: pnpm abrió el paquete original. **Rama de respaldo (M1):** `cd ../madori-editor-plan-edit && patch -p1 < "../PF - Quispe Villalba/patches/@pascal-app__editor@1.0.3.patch"` (ajusta la ruta del repo) y repite el `grep -c`; solo entonces sigue.

Run:

```bash
node scripts/pascal-plan-patch.mjs ../madori-editor-plan-edit
pnpm patch-commit "$(pwd)/../madori-editor-plan-edit"
pnpm install
```
Expected: `OK: 4 archivos parchados (src/lib/floorplan/floorplan-export.tsx, …)`; `patch-commit` reescribe `patches/@pascal-app__editor@1.0.3.patch` y `pnpm-lock.yaml`; `pnpm install` termina sin errores. Si el script dice "el ancla aparece 0 veces", Pascal no es la 1.0.3 que se leyó: para y avisa.

- [ ] **Paso 4: Verde de la prueba del parche y reinstalación limpia (M1)**

Run: `pnpm --filter @interiores/web exec vitest run pascal-patch`
Expected: PASS (5 pruebas).

Run: `pnpm install --frozen-lockfile && pnpm --filter @interiores/web exec vitest run pascal-patch pascal-chrome`
Expected: PASS: la reinstalación desde cero vuelve a aplicar el parche (criterio 1 del spec: "el parche se aplica con `pnpm install`").

- [ ] **Paso 5: Commit**

Anota M1 en la tabla "Resultados de la Tarea 0" de este plan (qué pasó con `grep -c "__madoriDecoupled"` y con la reinstalación). Después:

```bash
git add scripts/pascal-plan-patch.mjs patches/@pascal-app__editor@1.0.3.patch pnpm-lock.yaml apps/web/test/pascal-patch.test.ts docs/superpowers/plans/2026-10-12-exportar-plano.md
git commit -m "feat(parche): medir plantas y exportar páginas a escala fija desde Pascal" -- scripts/pascal-plan-patch.mjs patches/@pascal-app__editor@1.0.3.patch pnpm-lock.yaml apps/web/test/pascal-patch.test.ts docs/superpowers/plans/2026-10-12-exportar-plano.md
```

---

### Task 0b: Medir el parche en el navegador (M2 a M6)

**Files:**
- Create: `apps/web/e2e/spike/exportar-plano-0b.spec.ts` (se borra en la 0e)
- Modify: `apps/web/src/editor/e2e-hooks.ts` (el gancho `planSpike`, se borra en la 0e), `docs/superpowers/plans/2026-10-12-exportar-plano.md` (filas M2 a M6 de la tabla)

**Interfaces:**
- Consumes: `measureFloorplanLevels` y `exportFloorplanPages` (Tarea 0a).
- Produces: nada de código del producto; deja medidos M2 (plantas del Loft), M3 (páginas y tamaño), M4 (tiempo por planta), M5 (si Pascal ya pone los m²) y M6 (una imagen bloqueada no tumba el PDF) en la tabla, que fijan `decisions.ts` (Tarea 0e).

- [ ] **Paso 1: El gancho de medición y la prueba en navegador**

Modify `apps/web/src/editor/e2e-hooks.ts`: importa las dos funciones y agrega el gancho `planSpike` (se borra en la Tarea 0e).

```diff
-import { armToolMode, getHistoryCommandState, subscribeCameraPose, useEditor, useFirstPersonHud } from '@pascal-app/editor'
+import { armToolMode, exportFloorplanPages, getHistoryCommandState, measureFloorplanLevels, subscribeCameraPose, useEditor, useFirstPersonHud } from '@pascal-app/editor'
```

```diff
     cameraPose: () => pose,
+    /** SOLO MEDICIÓN (Tarea 0b, se borra en la 0e): mide las plantas y exporta una hoja A4 apaisada a 1:50. */
+    planSpike: async (opts: { scale?: number }) => {
+      const t0 = performance.now()
+      const measured = await measureFloorplanLevels()
+      const measureMs = performance.now() - t0
+      const texts: string[] = []
+      const collect = (geometry: unknown) => {
+        const g = geometry as { kind?: string; text?: string; children?: unknown[] }
+        if (g?.kind === 'text' && g.text) texts.push(g.text)
+        for (const child of g?.children ?? []) collect(child)
+      }
+      const t1 = performance.now()
+      const result = await exportFloorplanPages({
+        levels: measured.filter((l) => !l.empty).map((l) => l.id),
+        page: { widthPt: 841.89, heightPt: 595.28, usable: { x: 28.35, y: 28.35, width: 785.2, height: 436.5 } },
+        scale: opts.scale ?? 56.69,
+        mapGeometry: (_node, geometry) => {
+          collect(geometry)
+          return geometry
+        },
+      })
+      const exportMs = performance.now() - t1
+      const dataUrl = await new Promise<string>((resolve) => {
+        const reader = new FileReader()
+        reader.onload = () => resolve(String(reader.result))
+        reader.readAsDataURL(result.blob)
+      })
+      return { measured, measureMs, exportMs, pages: result.pages, skippedImages: result.skippedImages, bytes: result.blob.size, texts, base64: dataUrl.split(',')[1] ?? '' }
+    },
```

Create `apps/web/e2e/spike/exportar-plano-0b.spec.ts`:

```ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { templateById } from '../../src/lib/templates'
import { hook } from '../support/hooks'
import { createProjectViaUi } from '../support/projects'
import { dock } from '../support/shell'

async function open(page: import('@playwright/test').Page, id: string) {
  const template = templateById(id)
  if (!template) throw new Error(`Falta la plantilla ${id}`)
  await createProjectViaUi(page, { name: `E2E plano 0b ${Date.now()}`, kind: template.kind, template: template.name })
  await expect(dock(page)).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(3000)
}

function describePdf(base64: string, file: string) {
  const pdf = Buffer.from(base64, 'base64')
  mkdirSync('test-results', { recursive: true })
  writeFileSync(`test-results/${file}`, pdf)
  const text = pdf.toString('latin1')
  const media = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(text)
  return { pages: (text.match(/\/Type \/Page\b/g) ?? []).length, width: Number(media?.[1]), height: Number(media?.[2]) }
}

test('M2, M3, M4, M5: el Loft se mide y se exporta a 1:50 en A4 apaisada', async ({ page }) => {
  test.setTimeout(240_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await open(page, 'loft')
  const out = await hook(page, 'planSpike', {})
  const pdf = describePdf(out.base64, 'spike-plan-0b-loft.pdf')
  const areaTexts = out.texts.filter((t) => /m²|m2/.test(t))
  console.log(`SPIKE M2 plantas=${JSON.stringify(out.measured)} medir_ms=${Math.round(out.measureMs)}`)
  console.log(`SPIKE M3 paginas=${pdf.pages} tam=${pdf.width}x${pdf.height} bytes=${out.bytes} omitidas=${out.skippedImages}`)
  console.log(`SPIKE M4 exportar_ms=${Math.round(out.exportMs)} por_planta_ms=${Math.round(out.exportMs / Math.max(1, out.pages))}`)
  console.log(`SPIKE M5 textos_con_m2=${JSON.stringify(areaTexts)} todos=${JSON.stringify(out.texts.slice(0, 20))}`)
  expect(out.measured.length).toBeGreaterThanOrEqual(2)
  expect(out.measured.some((l) => l.widthM > 0 && l.heightM > 0)).toBe(true)
  expect(pdf.pages).toBe(out.measured.filter((l) => !l.empty).length)
  expect(Math.abs(pdf.width - 841.89)).toBeLessThan(1)
  expect(Math.abs(pdf.height - 595.28)).toBeLessThan(1)
  expect(errors).toEqual([])
})

test('M6: una imagen de mueble bloqueada no tumba el PDF', async ({ page }) => {
  test.setTimeout(240_000)
  await page.route('**/floor-plan.png', (route) => route.abort())
  await open(page, 'loft')
  const out = await hook(page, 'planSpike', {})
  const pdf = describePdf(out.base64, 'spike-plan-0b-sin-imagenes.pdf')
  console.log(`SPIKE M6 omitidas=${out.skippedImages} paginas=${pdf.pages}`)
  expect(out.skippedImages).toBeGreaterThan(0)
  expect(pdf.pages).toBeGreaterThanOrEqual(1)
})

test('M4: tiempo del Supermercado (solo se registra)', async ({ page }) => {
  test.setTimeout(300_000)
  await open(page, 'supermercado')
  const out = await hook(page, 'planSpike', {})
  console.log(`SPIKE M4-super plantas=${out.measured.length} medir_ms=${Math.round(out.measureMs)} exportar_ms=${Math.round(out.exportMs)} bytes=${out.bytes} medidas=${JSON.stringify(out.measured.map((l) => [l.widthM, l.heightM]))}`)
  expect(out.pages).toBeGreaterThanOrEqual(1)
})
```

- [ ] **Paso 2: Correr la medición (M2 a M6)**

Run: `pnpm --filter @interiores/web e2e e2e/spike/exportar-plano-0b.spec.ts`
Expected: 3 pruebas en verde y líneas `SPIKE M2 …` a `SPIKE M6 …` en la salida. Si una falla:
- `measureFloorplanLevels` lanza algo de `flushSync`: **rama de respaldo (M2)**, envolver la llamada en `await new Promise((r) => setTimeout(r, 0))` dentro de `pascal-plan.ts` (Tarea 13) y anotarlo.
- `pages` no coincide con las plantas no vacías, o el tamaño no es 842 × 595: revisa el recorte y `page` del gancho; **M3**.
- `skippedImages` es 0 con el bloqueo (la imagen se resolvió del caché): repite con `page.context().clearCookies()` no sirve; usa un mueble con PNG propio o aborta también `**/items/**`. Si de verdad lanza: **M6**, captura el error por planta en el parche.

Anota en la tabla "Resultados de la Tarea 0" (en este mismo plan) los valores medidos de M2 a M6 con la fecha. Los números de `SPIKE M4` fijan `previewDelayMs` (Tarea 0e); `SPIKE M5` decide `areaLabels`.

- [ ] **Paso 3: Commit**

```bash
git add apps/web/src/editor/e2e-hooks.ts apps/web/e2e/spike/exportar-plano-0b.spec.ts docs/superpowers/plans/2026-10-12-exportar-plano.md
git commit -m "test(parche): medir en el navegador las plantas y la exportación a escala fija (spike 0b)" -- apps/web/src/editor/e2e-hooks.ts apps/web/e2e/spike/exportar-plano-0b.spec.ts docs/superpowers/plans/2026-10-12-exportar-plano.md
```

---

### Task 0c: `pdfkit` real en Node: el filtro de colores del modo Papel y DM Sans incrustada

**Files:**
- Modify: `apps/web/package.json` y `pnpm-lock.yaml` (dependencias)
- Create: `apps/web/src/lib/export/color-filter.ts`, `apps/web/test/export-color-filter.test.ts`, `apps/web/scripts/spike-pdf-fonts.mjs` (se borra en la 0e)

**Interfaces:**
- Consumes: nada.
- Produces: `withColorFilter<T extends object>(raw: T, filter: (color: string) => string): T` en `@/lib/export/color-filter`. Envuelve un documento de `pdfkit`: todo color en hexadecimal que reciban `fillColor`, `strokeColor`, `fill`, `stroke` y `fillAndStroke` pasa por `filter`, también en llamadas encadenadas (`raw.save().fillColor(...)`).

- [ ] **Paso 1: Agregar las dependencias (versiones exactas)**

Run:

```bash
pnpm --filter @interiores/web add --save-exact pdfjs-dist@6.4.299
pnpm --filter @interiores/web add -D --save-exact pdfkit@0.19.1 @types/pdfkit@0.17.6 @napi-rs/canvas@1.0.11 fontkit@2.0.4 @types/fontkit@2.0.9 @fontsource/dm-sans@5.3.0 @fontsource-variable/fraunces@5.3.0
git diff apps/web/package.json
```
Expected: `pdfjs-dist` en `dependencies` y las otras siete en `devDependencies`, **todas sin `^` ni `~`**. Si alguna quedó con `^`, quítalo a mano y corre `pnpm install`.

- [ ] **Paso 2: Escribir la prueba del filtro (rojo)**

Create `apps/web/test/export-color-filter.test.ts`:

```ts
import PDFDocument from 'pdfkit'
import { describe, expect, it } from 'vitest'
import { withColorFilter } from '../src/lib/export/color-filter'

const paper = (color: string) => (color.toLowerCase() === '#ffffff' ? '#ffffff' : '#000000')

/** Dibuja con el documento dado y devuelve el contenido sin comprimir de la página. */
async function render(draw: (doc: InstanceType<typeof PDFDocument>) => void): Promise<string> {
  const doc = new PDFDocument({ autoFirstPage: false, compress: false, margin: 0 })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))
  const ended = new Promise<void>((resolve) => doc.on('end', () => resolve()))
  doc.addPage({ size: [100, 100], margin: 0 })
  draw(doc)
  doc.end()
  await ended
  return Buffer.concat(chunks).toString('latin1')
}

describe('withColorFilter (el modo Papel convierte los colores fijos del renderizador de Pascal)', () => {
  it('filtra fillColor, strokeColor, fill, stroke y fillAndStroke, también encadenados', async () => {
    const pdf = await render((doc) => {
      const filtered = withColorFilter(doc, paper)
      filtered.save().fillColor('#374151').rect(10, 10, 20, 20).fill()
      filtered.strokeColor('#334155').lineWidth(1).moveTo(0, 0).lineTo(50, 50).stroke()
      filtered.rect(40, 40, 10, 10).fillAndStroke('#cbd5e1', '#475569')
      filtered.rect(60, 60, 5, 5).fill('#111827')
      filtered.fillColor('#FFFFFF').rect(70, 70, 5, 5).fill()
    })
    expect(pdf).toContain('0 0 0 rg')
    expect(pdf).toContain('0 0 0 RG')
    expect(pdf).toContain('1 1 1 rg')
    // Ningún gris azulado de los de Pascal (#374151 = 0.2157 0.2549 0.3176; #334155 = 0.2 0.2549 0.3333).
    expect(pdf).not.toMatch(/0\.2\d* 0\.2\d* 0\.3\d* (rg|RG)/)
    expect(pdf).not.toMatch(/0\.7\d* 0\.8\d* 0\.8\d* (rg|RG)/)
  })

  it('deja pasar todo lo demás sin tocar (reglas de relleno, números, métodos de dibujo)', async () => {
    const pdf = await render((doc) => {
      const filtered = withColorFilter(doc, paper)
      filtered.rect(5, 5, 10, 10).fill('#ffffff', 'even-odd')
      filtered.circle(50, 50, 10).stroke()
    })
    expect(pdf).toContain('1 1 1 rg')
    expect(pdf).toMatch(/f\*/)
  })

  it('no cambia el documento original: sin el filtro, el color sigue siendo el que se pidió', async () => {
    const pdf = await render((doc) => {
      doc.fillColor('#374151').rect(1, 1, 5, 5).fill()
    })
    expect(pdf).toMatch(/0\.2\d* 0\.2\d* 0\.3\d* rg/)
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-color-filter`
Expected: FAIL — `Cannot find module '../src/lib/export/color-filter'`.

- [ ] **Paso 3: Escribir el filtro**

Create `apps/web/src/lib/export/color-filter.ts`:

```ts
/** Métodos de `pdfkit` cuyo primer argumento puede ser un color (`fill('#fff', 'even-odd')` también lo es). */
const COLOR_METHODS = new Set(['fillColor', 'strokeColor', 'fill', 'stroke'])

type AnyFunction = (...args: unknown[]) => unknown

/** Solo se filtran los colores en hexadecimal: las reglas de relleno ('even-odd'), los números y los objetos pasan igual. */
function mapColor(value: unknown, filter: (color: string) => string): unknown {
  return typeof value === 'string' && value.startsWith('#') ? filter(value) : value
}

/**
 * Envuelve un documento de `pdfkit` para que todo color que se le pida pase por `filter` (modo Papel: todo negro o
 * blanco). Cada método se llama con el proxy como `this`, así que el encadenado (`raw.save().fillColor(...)`) sigue
 * filtrado. El documento original no se toca: quien lo tenga sin envolver dibuja con los colores que pida.
 */
export function withColorFilter<T extends object>(raw: T, filter: (color: string) => string): T {
  return new Proxy(raw, {
    get(target, key, receiver) {
      const value: unknown = Reflect.get(target, key, receiver)
      if (typeof value !== 'function') return value
      const method = value as AnyFunction
      if (key === 'fillAndStroke') {
        return (...args: unknown[]) =>
          method.apply(receiver, [mapColor(args[0], filter), mapColor(args[1], filter), ...args.slice(2)])
      }
      if (typeof key === 'string' && COLOR_METHODS.has(key)) {
        return (...args: unknown[]) => method.apply(receiver, [mapColor(args[0], filter), ...args.slice(1)])
      }
      return value
    },
  })
}
```

- [ ] **Paso 4: Verde (M7)**

Run: `pnpm --filter @interiores/web exec vitest run export-color-filter`
Expected: PASS (3 pruebas). Si falla porque `pdfkit` escribe los colores con otro formato (por ejemplo `0.21569`), ajusta solo los patrones `not.toMatch` mirando `console.log(pdf)`; lo que importa es que aparezcan `0 0 0 rg` y `1 1 1 rg`.

**Rama de respaldo (M7):** si el encadenado no queda filtrado (aparece un gris de Pascal), el `Proxy` no sirve con esta versión: se documenta y el filtro se mueve dentro del renderizador con una opción `colorFilter` del parche (un cuarto cambio en `floorplan-pdfkit-renderer.ts`).

- [ ] **Paso 5: Medir DM Sans (M8)**

Create `apps/web/scripts/spike-pdf-fonts.mjs`:

```js
// SOLO MEDICIÓN (Tarea 0c, se borra en la 0e): incrusta DM Sans (woff de @fontsource) en pdfkit y lee el resultado con pdfjs.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import PDFDocument from 'pdfkit'

const dir = join(process.cwd(), 'node_modules/@fontsource/dm-sans/files')
const files = {
  'dms-latin-400': 'dm-sans-latin-400-normal.woff',
  'dms-latin-700': 'dm-sans-latin-700-normal.woff',
  'dms-ext-400': 'dm-sans-latin-ext-400-normal.woff',
  'dms-ext-700': 'dm-sans-latin-ext-700-normal.woff',
}
const chunks = []
const doc = new PDFDocument({ autoFirstPage: false, compress: true, margin: 0 })
doc.on('data', (chunk) => chunks.push(chunk))
const ended = new Promise((resolve) => doc.on('end', resolve))
for (const [name, file] of Object.entries(files)) doc.registerFont(name, readFileSync(join(dir, file)))
doc.addPage({ size: [595.28, 841.89], margin: 0 })
doc.font('dms-latin-700').fontSize(12).text('Casa Alvear — Planta baja · Año ñandú', 40, 40, { lineBreak: false })
doc.font('dms-latin-400').fontSize(12).text('Escala 1:50 · 12 de octubre de 2026 · Hoja 1 de 2', 40, 60, { lineBreak: false })
doc.font('dms-ext-700').fontSize(12).text('Łódź', 40, 80, { lineBreak: false })
doc.end()
await ended
const pdf = Buffer.concat(chunks)
const bases = [...pdf.toString('latin1').matchAll(/\/BaseFont \/(\S+)/g)].map((m) => m[1])
const loaded = await pdfjs.getDocument({ data: new Uint8Array(pdf), useSystemFonts: false }).promise
const content = await (await loaded.getPage(1)).getTextContent()
console.log(`SPIKE M8 bytes=${pdf.length} basefonts=${JSON.stringify(bases)}`)
console.log(`SPIKE M8 texto=${JSON.stringify(content.items.map((item) => item.str))}`)
```

Run: `pnpm --filter @interiores/web exec node scripts/spike-pdf-fonts.mjs`
Expected: dos líneas `SPIKE M8`. La primera trae `basefonts` con nombres que contienen `DMSans` (por ejemplo `ABCDEF+DMSans-Bold`); la segunda trae las cuatro cadenas con **tildes, "ñ", "—", "·" y "Łódź" intactas**. Si falla:
- `Cannot find module 'pdfjs-dist/legacy/build/pdf.mjs'`: `ls apps/web/node_modules/pdfjs-dist/legacy/build/` y usa el `.mjs` que exista (anótalo: lo usan las Tareas 11 y 19).
- `ENOENT … dm-sans-latin-400-normal.woff`: `ls apps/web/node_modules/@fontsource/dm-sans/files | grep -E "latin(-ext)?-(400|700)-normal"` y corrige los nombres aquí y en la Tarea 8.
- El texto sale con cuadros o `?`, o `pdfkit` lanza al subconjuntar el `woff`: **rama de respaldo (M8)**, repite con los `.woff2` del mismo paquete; si tampoco, fija `fonts: 'helvetica'` en `decisions.ts` (0e): el cajetín usa Helvetica, `splitRuns` solo admite Latin-1 y el criterio 12 se rebaja a "texto real con tildes y ñ, fuente estándar del PDF" en el spec.

Anota M7 y M8 en la tabla "Resultados de la Tarea 0".

- [ ] **Paso 6: Tipos, lint y commit**

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos (el spike `.mjs` está bajo `scripts/`: si Biome protesta por algo de él, se borra en la 0e de todas formas).

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/lib/export/color-filter.ts apps/web/test/export-color-filter.test.ts apps/web/scripts/spike-pdf-fonts.mjs docs/superpowers/plans/2026-10-12-exportar-plano.md
git commit -m "feat(plano): dependencias de PDF con versión exacta, filtro de colores del modo Papel y medición de DM Sans (spike 0c)" -- apps/web/package.json pnpm-lock.yaml apps/web/src/lib/export/color-filter.ts apps/web/test/export-color-filter.test.ts apps/web/scripts/spike-pdf-fonts.mjs docs/superpowers/plans/2026-10-12-exportar-plano.md
```

---

### Task 0d: `pdfjs-dist` en el navegador (trabajador, CSP) y el peso del paquete inicial

**Files:**
- Create: `apps/web/scripts/copy-pdf-worker.mjs`, `apps/web/scripts/initial-js.mjs`, `apps/web/app/dev/pdfjs/page.tsx` (se borra en la 0e), `apps/web/e2e/spike/exportar-plano-0d.spec.ts` (se borra en la 0e)
- Modify: `apps/web/package.json` (scripts `predev`, `prebuild`, `postinstall`), `.gitignore`

**Interfaces:**
- Consumes: `pdfjs-dist` 6.4.299 (0c).
- Produces: `public/pdf.worker.min.mjs` (copiado, no versionado) y la ruta fija `/pdf.worker.min.mjs` que usa `PlanPreview` (Tarea 16b); `node scripts/initial-js.mjs "<ruta>"` imprime los KB gzip del JS inicial de una ruta compilada y si algún trozo trae `pdfkit` (`PDFNameTree`, `PDFReference`) o `pdfjs` (`GlobalWorkerOptions`).

- [ ] **Paso 1: Copiar el trabajador de `pdfjs` a `public/`**

Create `apps/web/scripts/copy-pdf-worker.mjs`:

```js
// Copia el trabajador de pdfjs-dist a public/ para cargarlo por una ruta fija (/pdf.worker.min.mjs). No se versiona.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const source = join(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs')
const target = join(root, 'public/pdf.worker.min.mjs')
if (!existsSync(source)) {
  console.error(`No encuentro ${source}: corre pnpm install (o mira node_modules/pdfjs-dist/build para el nombre real).`)
  process.exit(1)
}
mkdirSync(join(root, 'public'), { recursive: true })
copyFileSync(source, target)
console.log('Trabajador de pdfjs copiado a public/pdf.worker.min.mjs')
```

Modify `apps/web/package.json`:

```diff
   "scripts": {
-    "dev": "next dev --port 3000",
-    "prebuild": "pnpm --filter @interiores/contract build && node scripts/vendor-pascal-assets.mjs --check",
+    "postinstall": "node scripts/copy-pdf-worker.mjs",
+    "predev": "node scripts/copy-pdf-worker.mjs",
+    "dev": "next dev --port 3000",
+    "prebuild": "pnpm --filter @interiores/contract build && node scripts/vendor-pascal-assets.mjs --check && node scripts/copy-pdf-worker.mjs",
```

Modify `.gitignore` (agrega al final de la sección de artefactos):

```diff
 # artefactos de herramientas
 .playwright-mcp/
 .worktrees/
 *.log
+
+# trabajador de pdfjs copiado por apps/web/scripts/copy-pdf-worker.mjs
+apps/web/public/pdf.worker.min.mjs
```

Run: `pnpm --filter @interiores/web exec node scripts/copy-pdf-worker.mjs && git status --short apps/web/public`
Expected: `Trabajador de pdfjs copiado …` y `git status` **no** lista `public/pdf.worker.min.mjs` (ignorado).

- [ ] **Paso 2: Medir el peso del paquete inicial ANTES de agregar nada del producto (M9)**

Create `apps/web/scripts/initial-js.mjs`:

```js
// Imprime cuánto JS (gzip) carga una ruta compilada de entrada y si algún trozo trae pdfkit o pdfjs.
// Uso, después de `pnpm --filter @interiores/web build`:  node scripts/initial-js.mjs "/proyectos/[id]"
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const route = process.argv[2] ?? '/proyectos/[id]'
const next = join(process.cwd(), '.next')
const manifest = join(next, 'server/app', route, 'page_client-reference-manifest.js')
let text
try {
  text = readFileSync(manifest, 'utf8')
} catch {
  console.error(`No encuentro ${manifest}. ¿Corriste el build? Si Next 16 cambió el nombre, busca page_client-reference-manifest.js bajo .next/server/app.`)
  process.exit(1)
}
const chunks = [...new Set([...text.matchAll(/static\/chunks\/[\w.~%\-]+\.js/g)].map((m) => m[0]))]
if (chunks.length === 0) {
  console.error('El manifiesto no lista trozos de JS: Next cambió su formato; revisa a mano y anota el método en docs/pascal-notes.md.')
  process.exit(1)
}
let total = 0
const flagged = []
for (const chunk of chunks) {
  const body = readFileSync(join(next, chunk))
  total += gzipSync(body).length
  const source = body.toString('utf8')
  // Marcas propias de las bibliotecas: el código de Pascal menciona `PDFDocument`, pero solo pdfkit trae PDFNameTree y PDFReference.
  if (/PDFNameTree|PDFReference|GlobalWorkerOptions/.test(source)) flagged.push(chunk)
}
console.log(`JS_INICIAL ruta=${route} trozos=${chunks.length} gzip_kb=${(total / 1024).toFixed(1)}`)
console.log(`PDF_EN_EL_INICIAL=${flagged.length > 0 ? flagged.join(',') : 'ninguno'}`)
process.exit(flagged.length > 0 ? 2 : 0)
```

Run:

```bash
pnpm --filter @interiores/web build
pnpm --filter @interiores/web exec node scripts/initial-js.mjs "/proyectos/[id]"
```
Expected: `JS_INICIAL … gzip_kb=<número>` y `PDF_EN_EL_INICIAL=ninguno`. **Anota ese `gzip_kb` como línea base** en la tabla (M9): la Tarea 23 repite el comando y exige que no crezca más de 40 KB gzip y que siga en `ninguno`. Si `PDF_EN_EL_INICIAL` lista un trozo, el `pdfkit` de Pascal ya está en el inicial (la ruta `proyectos/[id]` lo importa estáticamente): **rama de respaldo (M9)**, no sigas y avisa a Silvert; el criterio 13 se reformula como "no crece respecto de esta línea base".

- [ ] **Paso 3: Medir `pdfjs-dist` en el navegador (M10)**

Create `apps/web/app/dev/pdfjs/page.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'

/** SOLO MEDICIÓN (Tarea 0d, se borra en la 0e): dibuja un PDF mínimo con pdfjs-dist y el trabajador de public/. */
const MINI_PDF = [
  '%PDF-1.4',
  '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]/Contents 4 0 R>>endobj',
  '4 0 obj<</Length 27>>stream',
  '0 0 0 rg 20 20 100 40 re f',
  'endstream endobj',
  'trailer<</Root 1 0 R/Size 5>>',
].join('\n')

export default function PdfjsSpike() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState('cargando')
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    let alive = true
    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        const doc = await pdfjs.getDocument({ data: new TextEncoder().encode(MINI_PDF) }).promise
        const page = await doc.getPage(1)
        const viewport = page.getViewport({ scale: 2 })
        const el = canvas.current
        if (!el || !alive) return
        el.width = viewport.width
        el.height = viewport.height
        const context = el.getContext('2d')
        if (!context) throw new Error('sin contexto 2d')
        await page.render({ canvas: el, canvasContext: context, viewport }).promise
        setState('listo')
      } catch (error) {
        setState(`error: ${String(error)}`)
      }
    })()
    return () => {
      alive = false
    }
  }, [])
  return (
    <main>
      <p data-testid="estado">{state}</p>
      <canvas data-testid="lienzo" ref={canvas} />
    </main>
  )
}
```

Si `typecheck` dice que `canvas` o `canvasContext` no existen en `RenderParameters`, deja **solo la clave que el tipo acepte** y anótalo: es la forma que usará `PlanPreview` (Tarea 16b).

Create `apps/web/e2e/spike/exportar-plano-0d.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('M10: pdfjs-dist dibuja un PDF en un canvas con el trabajador de public/ y sin errores de CSP', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/dev/pdfjs')
  await expect(page.getByTestId('estado')).toHaveText('listo', { timeout: 30_000 })
  const dark = await page.getByTestId('lienzo').evaluate((el) => {
    const canvas = el as HTMLCanvasElement
    const data = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data ?? []
    let count = 0
    for (let i = 0; i < data.length; i += 4) if ((data[i] ?? 255) < 50 && (data[i + 3] ?? 0) > 0) count += 1
    return count
  })
  console.log(`SPIKE M10 pixeles_oscuros=${dark} errores=${JSON.stringify(errors)}`)
  expect(dark).toBeGreaterThan(1000)
  expect(errors).toEqual([])
})
```

Run: `pnpm --filter @interiores/web e2e e2e/spike/exportar-plano-0d.spec.ts`
Expected: PASS y `SPIKE M10 pixeles_oscuros=<más de 1000> errores=[]`.

Comprobación de la CSP de producción (leída en `security-headers.mjs`: `worker-src 'self' blob:`, `script-src … 'wasm-unsafe-eval'`): el trabajador sale de `'self'`, así que no hace falta cambiarla. **Rama de respaldo (M10):** si el trabajador no carga (404, CORS o `Failed to fetch dynamically imported module`), fija `previewMode: 'frame'` en `decisions.ts` (0e): `PlanPreview` muestra solo el cuadro con el tamaño de la hoja y el porcentaje, y el criterio 8 del spec se reescribe como "texto y porcentaje".

- [ ] **Paso 4: Tipos, lint y commit**

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

```bash
git add apps/web/scripts/copy-pdf-worker.mjs apps/web/scripts/initial-js.mjs apps/web/app/dev/pdfjs/page.tsx apps/web/e2e/spike/exportar-plano-0d.spec.ts apps/web/package.json .gitignore docs/superpowers/plans/2026-10-12-exportar-plano.md
git commit -m "feat(plano): trabajador de pdfjs en public/ y medición del paquete inicial (spike 0d)" -- apps/web/scripts/copy-pdf-worker.mjs apps/web/scripts/initial-js.mjs apps/web/app/dev/pdfjs/page.tsx apps/web/e2e/spike/exportar-plano-0d.spec.ts apps/web/package.json .gitignore docs/superpowers/plans/2026-10-12-exportar-plano.md
```

---

### Task 0e: Fijar `decisions.ts`, anotar los resultados y limpiar los experimentos

**Files:**
- Create: `apps/web/src/lib/export/decisions.ts`, `apps/web/test/export-decisions.test.ts`
- Delete: `apps/web/e2e/spike/exportar-plano-0b.spec.ts`, `apps/web/e2e/spike/exportar-plano-0d.spec.ts`, `apps/web/scripts/spike-pdf-fonts.mjs`, `apps/web/app/dev/pdfjs/page.tsx`
- Modify: `apps/web/src/editor/e2e-hooks.ts` (quita `planSpike`), `docs/superpowers/plans/2026-10-12-exportar-plano.md` (tabla)

**Interfaces:**
- Consumes: la tabla "Resultados de la Tarea 0" ya llena (M1 a M10).
- Produces: `EXPORT_DECISIONS` y el tipo `ExportDecisions` en `@/lib/export/decisions`:
  `{ areaLabels: 'pascal' | 'madori'; fonts: 'dmsans' | 'helvetica'; previewMode: 'pdfjs' | 'frame'; previewDelayMs: number }`.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/export-decisions.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { EXPORT_DECISIONS } from '../src/lib/export/decisions'

describe('decisiones medidas en la Tarea 0', () => {
  it('cada decisión tiene un valor permitido', () => {
    expect(['pascal', 'madori']).toContain(EXPORT_DECISIONS.areaLabels)
    expect(['dmsans', 'helvetica']).toContain(EXPORT_DECISIONS.fonts)
    expect(['pdfjs', 'frame']).toContain(EXPORT_DECISIONS.previewMode)
  })

  it('la espera de la vista previa está entre 150 y 800 ms', () => {
    expect(EXPORT_DECISIONS.previewDelayMs).toBeGreaterThanOrEqual(150)
    expect(EXPORT_DECISIONS.previewDelayMs).toBeLessThanOrEqual(800)
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-decisions`
Expected: FAIL — `Cannot find module '../src/lib/export/decisions'`.

- [ ] **Paso 2: Escribir `decisions.ts` con lo que midió la Tarea 0**

Create `apps/web/src/lib/export/decisions.ts` (los valores de abajo son los **por defecto**; cámbialos según tu tabla de resultados antes de seguir):

```ts
export type ExportDecisions = {
  /** M5: quién escribe los m² de cada ambiente. 'pascal' = ya vienen en su etiqueta; 'madori' = los agrega `extraGeometry` (Tarea 12b). */
  areaLabels: 'pascal' | 'madori'
  /** M8: 'dmsans' incrusta DM Sans (woff); 'helvetica' usa la fuente estándar del PDF (respaldo: solo Latin-1). */
  fonts: 'dmsans' | 'helvetica'
  /** M10: 'pdfjs' dibuja la página real con pdfjs-dist; 'frame' muestra solo el cuadro con el tamaño de la hoja y el porcentaje. */
  previewMode: 'pdfjs' | 'frame'
  /** M4: espera (ms) tras un cambio de opción antes de pedir la vista previa. */
  previewDelayMs: number
}

/** Lo que midió la Tarea 0 (tabla "Resultados de la Tarea 0" del plan 2026-10-12-exportar-plano.md). */
export const EXPORT_DECISIONS: ExportDecisions = {
  areaLabels: 'madori',
  fonts: 'dmsans',
  previewMode: 'pdfjs',
  previewDelayMs: 250,
}
```

Reglas para fijar los valores: `areaLabels: 'pascal'` solo si M5 encontró `m²` en los textos de la etiqueta de ambiente; `fonts: 'helvetica'` solo si M8 falló en `woff` y `woff2`; `previewMode: 'frame'` solo si M10 falló; `previewDelayMs` = 250 si M4 dio ≤ 1 s por planta del Loft, 400 si dio entre 1 y 2 s, 600 si más (y en ese caso reescribe el criterio 8 del spec).

- [ ] **Paso 3: Verde, y borrar los experimentos**

Run: `pnpm --filter @interiores/web exec vitest run export-decisions`
Expected: PASS (2 pruebas).

Run:

```bash
git rm -q apps/web/e2e/spike/exportar-plano-0b.spec.ts apps/web/e2e/spike/exportar-plano-0d.spec.ts apps/web/scripts/spike-pdf-fonts.mjs apps/web/app/dev/pdfjs/page.tsx
ls apps/web/e2e/spike 2>/dev/null | wc -l
```
Expected: `0` (la carpeta queda vacía o no existe).

Modify `apps/web/src/editor/e2e-hooks.ts`: quita el gancho `planSpike` entero y deja los imports como estaban:

```diff
-import { armToolMode, exportFloorplanPages, getHistoryCommandState, measureFloorplanLevels, subscribeCameraPose, useEditor, useFirstPersonHud } from '@pascal-app/editor'
+import { armToolMode, getHistoryCommandState, subscribeCameraPose, useEditor, useFirstPersonHud } from '@pascal-app/editor'
```

Y borra desde `/** SOLO MEDICIÓN (Tarea 0b, se borra en la 0e)…` hasta el cierre `},` de `planSpike` (el bloque que agregó la 0b, justo debajo de `cameraPose: () => pose,`).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint && pnpm --filter @interiores/web exec vitest run`
Expected: `Tipos OK …`, Biome sin errores nuevos y todas las pruebas en verde.

- [ ] **Paso 4: Anotar los resultados y commit**

Completa la columna "Resultado y fecha" de M1 a M10 en la tabla de este plan (un renglón por medición, con el número que salió), y copia las líneas `SPIKE …` que usaste. Después:

```bash
git add apps/web/src/lib/export/decisions.ts apps/web/test/export-decisions.test.ts apps/web/src/editor/e2e-hooks.ts docs/superpowers/plans/2026-10-12-exportar-plano.md
git commit -m "feat(plano): decisiones medidas en la Tarea 0 y se borran los experimentos" -- apps/web/src/lib/export/decisions.ts apps/web/test/export-decisions.test.ts apps/web/src/editor/e2e-hooks.ts apps/web/e2e/spike apps/web/scripts/spike-pdf-fonts.mjs apps/web/app/dev/pdfjs docs/superpowers/plans/2026-10-12-exportar-plano.md
```

---

## Código puro, dibujantes y enlace con `pdfkit` (Tareas 1 a 12a)

Todo `apps/web/src/lib/export/` es **puro**: sin Pascal, sin `three`, sin DOM, sin `pdfkit`, sin `pdfjs-dist`. Se prueba con `vitest` en Node. `tsconfig.base.json` trae `noUncheckedIndexedAccess`: un índice de arreglo es `T | undefined`.

### Task 1: Tipos compartidos y hojas (A4 y A3, orientaciones, margen y banda)

**Files:**
- Create: `apps/web/src/lib/export/types.ts`, `apps/web/src/lib/export/sheet.ts`
- Test: `apps/web/test/export-sheet.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `@/lib/export/types`: `PaperSize = 'A4' | 'A3'`, `Orientation = 'landscape' | 'portrait'`, `PlanMode = 'paper' | 'color'`, `SCALES = [25, 50, 100] as const`, `Scale`, `Extent = { widthM: number; heightM: number }`, `PlanLevel = Extent & { id: string; label: string; empty: boolean }`, `LevelMeasure = Extent & { id: string; name: string | null; level: number; empty: boolean }`, `PlanOptions`, `PlanProgress`, `PlanBuildArgs`, `PlanResult`, `PlanBridge`, `PlanDeps`.
  - `@/lib/export/sheet`: `MM_TO_PT`, `mmToPt(mm)`, `ptToMm(pt)`, `MARGIN_MM = 10`, `BAND_MM = 36`, `BAND_PLAIN_MM = 16`, `BoxMm = { x; y; width; height }` (mm, origen arriba a la izquierda), `Sheet`, `sheetFor(paper, orientation, titleBlock?) => Sheet`, `paperLabel(paper, orientation) => string` (`"A4 apaisada"`).

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/export-sheet.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { BAND_MM, BAND_PLAIN_MM, MARGIN_MM, mmToPt, paperLabel, ptToMm, sheetFor } from '../src/lib/export/sheet'
import { SCALES } from '../src/lib/export/types'

const usable = (paper: 'A4' | 'A3', orientation: 'landscape' | 'portrait', titleBlock = true) => {
  const { width, height } = sheetFor(paper, orientation, titleBlock).usable
  return [width, height]
}

describe('hojas (criterio 5)', () => {
  it('el tamaño de cada hoja en puntos coincide con A4 y A3 (tolerancia 0,5 pt)', () => {
    const cases = [
      ['A4', 'landscape', 841.89, 595.28],
      ['A4', 'portrait', 595.28, 841.89],
      ['A3', 'landscape', 1190.55, 841.89],
      ['A3', 'portrait', 841.89, 1190.55],
    ] as const
    for (const [paper, orientation, widthPt, heightPt] of cases) {
      const sheet = sheetFor(paper, orientation)
      expect(Math.abs(sheet.widthPt - widthPt), `${paper} ${orientation} ancho`).toBeLessThan(0.5)
      expect(Math.abs(sheet.heightPt - heightPt), `${paper} ${orientation} alto`).toBeLessThan(0.5)
    }
  })

  it('el área útil (hoja menos márgenes y banda de 36 mm) de las cuatro combinaciones', () => {
    expect(usable('A4', 'landscape')).toEqual([277, 154])
    expect(usable('A3', 'landscape')).toEqual([400, 241])
    expect(usable('A4', 'portrait')).toEqual([190, 241])
    expect(usable('A3', 'portrait')).toEqual([277, 364])
  })

  it('sin cajetín la banda baja a 16 mm y el área útil crece 20 mm de alto', () => {
    expect(usable('A4', 'landscape', false)).toEqual([277, 174])
    expect(sheetFor('A4', 'landscape', false).bandMm).toBe(BAND_PLAIN_MM)
    expect(sheetFor('A4', 'landscape', true).bandMm).toBe(BAND_MM)
  })

  it('el área útil empieza en el margen de 10 mm', () => {
    const { x, y } = sheetFor('A3', 'portrait').usable
    expect([x, y]).toEqual([MARGIN_MM, MARGIN_MM])
  })

  it('mm y puntos son inversos', () => {
    expect(ptToMm(mmToPt(123.4))).toBeCloseTo(123.4, 9)
    expect(mmToPt(25.4)).toBeCloseTo(72, 9)
  })

  it('el nombre de la hoja va en castellano', () => {
    expect(paperLabel('A4', 'landscape')).toBe('A4 apaisada')
    expect(paperLabel('A3', 'portrait')).toBe('A3 vertical')
  })

  it('solo hay tres escalas (decisión de Silvert)', () => {
    expect([...SCALES]).toEqual([25, 50, 100])
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-sheet`
Expected: FAIL — `Cannot find module '../src/lib/export/sheet'`.

- [ ] **Paso 2: Escribir los tipos y las hojas**

Create `apps/web/src/lib/export/types.ts`:

```ts
/** Tipos compartidos de la exportación de planos. Código puro: sin Pascal ni DOM (excepto `Blob`, `AbortSignal` y `Date`, que son del lenguaje). */
export type PaperSize = 'A4' | 'A3'
export type Orientation = 'landscape' | 'portrait'
/** Papel = blanco y negro para imprimir; Color = ambientes, pisos y muebles para presentar. */
export type PlanMode = 'paper' | 'color'

/** Escalas que ofrece el diálogo (decisión de Silvert, 2026-10-12): 1:25, 1:50 y 1:100. */
export const SCALES = [25, 50, 100] as const
export type Scale = (typeof SCALES)[number]

/** Medidas de un dibujo en metros. */
export type Extent = { widthM: number; heightM: number }

/** Una planta como la ve el diálogo: el nombre ya está en castellano. */
export type PlanLevel = Extent & { id: string; label: string; empty: boolean }

/** Una planta como la mide Pascal, antes de ponerle nombre (`name` nulo = sin nombre propio). */
export type LevelMeasure = Extent & { id: string; name: string | null; level: number; empty: boolean }

export type PlanOptions = {
  paper: PaperSize
  orientation: Orientation
  scale: Scale
  mode: PlanMode
  /** Ids de las plantas elegidas. */
  levelIds: readonly string[]
  titleBlock: boolean
  projectName: string
  /** Nombre de la cuenta (o el correo si no tiene nombre). */
  author: string
  date: Date
}

export type PlanProgress = { done: number; total: number }

export type PlanBuildArgs = PlanOptions & {
  onProgress?: (progress: PlanProgress) => void
  signal?: AbortSignal
  /** Para la vista previa de una sola planta: "Hoja `start + 1` de `total`" en lugar de "Hoja 1 de 1". */
  sheetNumbers?: { start: number; total: number }
}

export type PlanResult = { blob: Blob; pages: number; skippedImages: number }

/** `bridge.plan`: lo único que el diálogo sabe de Pascal. */
export type PlanBridge = {
  measureLevels(): Promise<PlanLevel[]>
  build(args: PlanBuildArgs): Promise<PlanResult>
}

/** Las dos funciones reales (o de mentira, en las pruebas) que alimentan a `bridge.plan`. */
export type PlanDeps = {
  measureLevels(): Promise<LevelMeasure[]>
  buildPlan(args: PlanBuildArgs): Promise<PlanResult>
}
```

Create `apps/web/src/lib/export/sheet.ts`:

```ts
import type { Orientation, PaperSize } from './types'

export const MM_TO_PT = 72 / 25.4
export const mmToPt = (mm: number): number => mm * MM_TO_PT
export const ptToMm = (pt: number): number => pt / MM_TO_PT

/** Margen de la hoja por lado, banda inferior con cajetín y banda inferior sin cajetín (solo norte y escala gráfica). */
export const MARGIN_MM = 10
export const BAND_MM = 36
export const BAND_PLAIN_MM = 16

/** Una caja en milímetros con el origen arriba a la izquierda de la hoja. */
export type BoxMm = { x: number; y: number; width: number; height: number }

export type Sheet = {
  paper: PaperSize
  orientation: Orientation
  titleBlock: boolean
  widthMm: number
  heightMm: number
  widthPt: number
  heightPt: number
  /** Alto de la banda inferior (norte, escala gráfica, leyenda y cajetín). */
  bandMm: number
  /** Donde va el plano: la hoja menos el margen por lado y la banda. */
  usable: BoxMm
}

const LANDSCAPE_MM: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 297, height: 210 },
  A3: { width: 420, height: 297 },
}

export function sheetFor(paper: PaperSize, orientation: Orientation, titleBlock = true): Sheet {
  const base = LANDSCAPE_MM[paper]
  const widthMm = orientation === 'landscape' ? base.width : base.height
  const heightMm = orientation === 'landscape' ? base.height : base.width
  const bandMm = titleBlock ? BAND_MM : BAND_PLAIN_MM
  return {
    paper,
    orientation,
    titleBlock,
    widthMm,
    heightMm,
    widthPt: mmToPt(widthMm),
    heightPt: mmToPt(heightMm),
    bandMm,
    usable: {
      x: MARGIN_MM,
      y: MARGIN_MM,
      width: widthMm - 2 * MARGIN_MM,
      height: heightMm - 2 * MARGIN_MM - bandMm,
    },
  }
}

/** "A4 apaisada" o "A3 vertical". */
export function paperLabel(paper: PaperSize, orientation: Orientation): string {
  return `${paper} ${orientation === 'landscape' ? 'apaisada' : 'vertical'}`
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-sheet`
Expected: PASS (7 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/lib/export/types.ts apps/web/src/lib/export/sheet.ts apps/web/test/export-sheet.test.ts
git commit -m "feat(plano): hojas A4 y A3 con área útil y banda del cajetín" -- apps/web/src/lib/export/types.ts apps/web/src/lib/export/sheet.ts apps/web/test/export-sheet.test.ts
```

---

### Task 2: Regla de cabida, escalas y orientación sugerida

**Files:**
- Create: `apps/web/src/lib/export/fit.ts`
- Test: `apps/web/test/export-fit.test.ts`

**Interfaces:**
- Consumes: `sheetFor`, `Sheet` (Tarea 1); `SCALES`, `Scale`, `Extent`, `Orientation`, `PaperSize` (Tarea 1).
- Produces en `@/lib/export/fit`:
  - `DIM_MARGIN_M = 1`; `FitResult = { fits: boolean; neededMm: { width: number; height: number }; usableMm: { width: number; height: number }; percent: number; axis: 'width' | 'height' }`.
  - `fitScale(extent: Extent, sheet: Sheet, scale: Scale): FitResult`; `largestFittingScale(extent, sheet): Scale | null` (la de menor denominador que cabe); `suggestOrientation(extent, paper: PaperSize, titleBlock: boolean): Orientation`; `maxExtent(levels: readonly Extent[]): Extent`.

**Cubre el criterio 7** (cabida con el edificio de 7,8 × 3,8 m: 64 % del ancho en A4 a 1:50 y 88 % en A3 a 1:25) y el caso 3 de Review Focus (no cabe en ninguna escala).

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/export-fit.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { DIM_MARGIN_M, fitScale, largestFittingScale, maxExtent, suggestOrientation } from '../src/lib/export/fit'
import { sheetFor } from '../src/lib/export/sheet'

const HOUSE = { widthM: 7.8, heightM: 3.8 }
const a4 = sheetFor('A4', 'landscape')
const a3 = sheetFor('A3', 'landscape')

describe('regla de cabida (spec 5.2, láminas 19 y 24)', () => {
  it('el margen de cotas es de 1 m', () => expect(DIM_MARGIN_M).toBe(1))

  it('A4 apaisada: 1:25 no cabe (352 mm de 277) y 1:50 usa 64 % del ancho', () => {
    const tight = fitScale(HOUSE, a4, 25)
    expect(tight.fits).toBe(false)
    expect(tight.neededMm.width).toBeCloseTo(352, 6)
    expect(tight.usableMm).toEqual({ width: 277, height: 154 })
    const ok = fitScale(HOUSE, a4, 50)
    expect(ok.fits).toBe(true)
    expect(ok.neededMm.width).toBeCloseTo(176, 6)
    expect(ok.percent).toBe(64)
    expect(ok.axis).toBe('width')
  })

  it('A3 apaisada: 1:25 cabe y usa 88 % del ancho (80 % del alto)', () => {
    const result = fitScale(HOUSE, a3, 25)
    expect(result.fits).toBe(true)
    expect(result.percent).toBe(88)
    expect(result.axis).toBe('width')
    expect(result.neededMm.height / result.usableMm.height).toBeCloseTo(0.797, 3)
  })

  it('el borde exacto cabe (277,00 mm de 277) y un milímetro más no', () => {
    // (12,85 + 1) m × 1000 / 50 = 277 mm
    expect(fitScale({ widthM: 12.85, heightM: 1 }, a4, 50).fits).toBe(true)
    expect(fitScale({ widthM: 12.9, heightM: 1 }, a4, 50).fits).toBe(false)
  })

  it('cuando el alto es el eje más justo, el porcentaje es el del alto', () => {
    const tall = fitScale({ widthM: 2, heightM: 14 }, a4, 100)
    expect(tall.axis).toBe('height')
    expect(tall.percent).toBe(97)
  })

  it('largestFittingScale devuelve la escala mayor (menor denominador) que cabe', () => {
    expect(largestFittingScale(HOUSE, a4)).toBe(50)
    expect(largestFittingScale(HOUSE, a3)).toBe(25)
    expect(largestFittingScale({ widthM: 0, heightM: 0 }, a4)).toBe(25)
  })

  it('un edificio que no cabe en ninguna escala devuelve null y porcentajes mayores que 100', () => {
    const huge = { widthM: 60, heightM: 40 }
    expect(largestFittingScale(huge, a4)).toBeNull()
    expect(largestFittingScale(huge, a3)).toBeNull()
    const wide = fitScale({ widthM: 60, heightM: 5 }, a4, 100)
    expect(wide.fits).toBe(false)
    expect(wide.percent).toBe(220)
    expect(wide.axis).toBe('width')
    expect(fitScale(huge, a4, 100).percent).toBeGreaterThan(100)
  })

  it('un supermercado de 40 × 30 m no cabe en A4 a ninguna escala y en A3 apaisada tampoco (31 m de alto)', () => {
    const market = { widthM: 40, heightM: 30 }
    expect(largestFittingScale(market, a4)).toBeNull()
    expect(largestFittingScale(market, a3)).toBeNull()
    expect(largestFittingScale({ widthM: 30, heightM: 20 }, a3)).toBe(100)
  })
})

describe('orientación sugerida (D7)', () => {
  it('un edificio ancho sugiere apaisada y uno alto sugiere vertical', () => {
    expect(suggestOrientation({ widthM: 20, heightM: 5 }, 'A4', true)).toBe('landscape')
    expect(suggestOrientation({ widthM: 4, heightM: 12 }, 'A4', true)).toBe('portrait')
  })

  it('si solo una orientación admite alguna escala, esa es la sugerida', () => {
    expect(suggestOrientation({ widthM: 6, heightM: 30 }, 'A3', true)).toBe('portrait')
  })

  it('a igualdad de escala gana la que sigue la forma del edificio', () => {
    // 4 × 4 m en A4: 1:50 en las dos orientaciones.
    expect(suggestOrientation({ widthM: 4, heightM: 4 }, 'A4', true)).toBe('landscape')
    expect(suggestOrientation({ widthM: 4, heightM: 12 }, 'A4', true)).toBe('portrait')
  })

  it('si no cabe en ninguna orientación se sugiere la que sigue la forma del edificio', () => {
    expect(suggestOrientation({ widthM: 90, heightM: 20 }, 'A4', true)).toBe('landscape')
    expect(suggestOrientation({ widthM: 20, heightM: 90 }, 'A4', true)).toBe('portrait')
  })
})

describe('maxExtent', () => {
  it('toma el máximo de cada eje entre las plantas', () => {
    expect(maxExtent([{ widthM: 5, heightM: 8 }, { widthM: 7, heightM: 3 }])).toEqual({ widthM: 7, heightM: 8 })
  })

  it('sin plantas es 0 × 0', () => {
    expect(maxExtent([])).toEqual({ widthM: 0, heightM: 0 })
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-fit`
Expected: FAIL — `Cannot find module '../src/lib/export/fit'`.

- [ ] **Paso 2: Escribir la regla de cabida**

Create `apps/web/src/lib/export/fit.ts`:

```ts
import { type Sheet, sheetFor } from './sheet'
import { type Extent, type Orientation, type PaperSize, SCALES, type Scale } from './types'

/** Metro de más que se suma a cada eje para que las cotas no salgan cortadas (D6). */
export const DIM_MARGIN_M = 1
const EPSILON_MM = 1e-6

export type FitResult = {
  fits: boolean
  /** Lo que ocupa el dibujo (más el margen de cotas) a esa escala, en milímetros. */
  neededMm: { width: number; height: number }
  /** Lo que ofrece el área útil de la hoja, en milímetros. */
  usableMm: { width: number; height: number }
  /** Porcentaje del eje más justo, redondeado al entero más cercano (puede pasar de 100). */
  percent: number
  axis: 'width' | 'height'
}

/** ¿Cabe `extent` (metros) en el área útil de `sheet` a la escala 1:`scale`? */
export function fitScale(extent: Extent, sheet: Sheet, scale: Scale): FitResult {
  const needed = {
    width: ((extent.widthM + DIM_MARGIN_M) * 1000) / scale,
    height: ((extent.heightM + DIM_MARGIN_M) * 1000) / scale,
  }
  const usable = { width: sheet.usable.width, height: sheet.usable.height }
  const ratioWidth = needed.width / usable.width
  const ratioHeight = needed.height / usable.height
  return {
    fits: needed.width <= usable.width + EPSILON_MM && needed.height <= usable.height + EPSILON_MM,
    neededMm: needed,
    usableMm: usable,
    percent: Math.round(Math.max(ratioWidth, ratioHeight) * 100),
    axis: ratioWidth >= ratioHeight ? 'width' : 'height',
  }
}

/** La escala mayor (menor denominador) en la que el edificio cabe, o `null` si no cabe en ninguna. */
export function largestFittingScale(extent: Extent, sheet: Sheet): Scale | null {
  for (const scale of SCALES) if (fitScale(extent, sheet, scale).fits) return scale
  return null
}

/** La orientación que permite la escala mayor; a igualdad (o si ninguna cabe), la que sigue la forma del edificio. */
export function suggestOrientation(extent: Extent, paper: PaperSize, titleBlock: boolean): Orientation {
  const byShape: Orientation = extent.widthM >= extent.heightM ? 'landscape' : 'portrait'
  const landscape = largestFittingScale(extent, sheetFor(paper, 'landscape', titleBlock))
  const portrait = largestFittingScale(extent, sheetFor(paper, 'portrait', titleBlock))
  if (landscape === null && portrait === null) return byShape
  if (landscape === null) return 'portrait'
  if (portrait === null) return 'landscape'
  if (landscape !== portrait) return landscape < portrait ? 'landscape' : 'portrait'
  return byShape
}

/** El máximo de cada eje entre las plantas (la escala es una sola para todo el PDF, D5). */
export function maxExtent(levels: readonly Extent[]): Extent {
  return levels.reduce<Extent>(
    (acc, level) => ({ widthM: Math.max(acc.widthM, level.widthM), heightM: Math.max(acc.heightM, level.heightM) }),
    { widthM: 0, heightM: 0 },
  )
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-fit export-sheet`
Expected: PASS (`export-fit`: 14 pruebas).

Si "un supermercado de 40 × 30 m…" falla en A3: recalcula a mano `(30 + 1) × 1000 / 100 = 310 mm` contra el alto útil de 241 mm: no cabe; `(30+1)` en vertical (A3 vertical 277 × 364) tampoco ancho: `(40+1) × 10 = 410 > 277`. La prueba solo usa A3 apaisada: debe dar `null`.

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/lib/export/fit.ts apps/web/test/export-fit.test.ts
git commit -m "feat(plano): regla de cabida, escalas 1:25, 1:50 y 1:100 y orientación sugerida" -- apps/web/src/lib/export/fit.ts apps/web/test/export-fit.test.ts
```

---

### Task 3: Nombre de archivo seguro, fecha en letras y texto con "…"

**Files:**
- Create: `apps/web/src/lib/export/file-name.ts`, `apps/web/src/lib/export/format-date.ts`, `apps/web/src/lib/export/fit-text.ts`
- Test: `apps/web/test/export-file-name.test.ts`, `apps/web/test/export-text.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `exportFileName(projectName: string): string` en `@/lib/export/file-name` (`"Casa Alvear"` → `"Casa-Alvear-planos.pdf"`).
  - `formatLongDate(date: Date): string` en `@/lib/export/format-date` (`new Date(2026, 9, 12)` → `"12 de octubre de 2026"`; fecha inválida → `""`).
  - `fitText(text: string, maxWidth: number, widthOf: (text: string) => number): string` en `@/lib/export/fit-text` (corta con `"…"` para no pasar de `maxWidth`).

**Cubre el criterio 3** (nombre del archivo) y el caso 4 de Review Focus (nombre con caracteres especiales o muy largo), además de la fecha en letras (decisión de Silvert).

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/export-file-name.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { exportFileName } from '../src/lib/export/file-name'

const SAFE = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-planos\.pdf$/

describe('exportFileName (criterio 3)', () => {
  it('"Casa Alvear" se llama Casa-Alvear-planos.pdf', () => {
    expect(exportFileName('Casa Alvear')).toBe('Casa-Alvear-planos.pdf')
  })

  it('quita tildes y ñ, no las cambia por guiones', () => {
    expect(exportFileName('Niño ñandú Éxito')).toBe('Nino-nandu-Exito-planos.pdf')
  })

  it('los caracteres prohibidos en Windows y los de control se vuelven un solo guion', () => {
    expect(exportFileName('a/b:c*d?"e<f>g|h\\i')).toBe('a-b-c-d-e-f-g-h-i-planos.pdf')
    expect(exportFileName('A\u0000B\tC\nD')).toBe('A-B-C-D-planos.pdf')
  })

  it('un nombre reservado de Windows no queda solo (CON, NUL, COM1)', () => {
    for (const name of ['CON', 'NUL', 'COM1', 'aux']) expect(exportFileName(name)).toMatch(SAFE)
    expect(exportFileName('CON')).toBe('CON-planos.pdf')
  })

  it('un nombre vacío, de espacios, de símbolos o de escritura no latina nunca deja el archivo vacío', () => {
    for (const name of ['', '   ', '///', '...', '日本語', '🏠🏠']) {
      expect(exportFileName(name), JSON.stringify(name)).toBe('proyecto-planos.pdf')
    }
  })

  it('los emojis y los símbolos se descartan y el resto se conserva', () => {
    expect(exportFileName('🏠 Casa — Norte')).toBe('Casa-Norte-planos.pdf')
  })

  it('un nombre de 300 caracteres da un archivo de 80 caracteres', () => {
    const name = exportFileName('a'.repeat(300))
    expect(name).toHaveLength(80)
    expect(name).toMatch(SAFE)
  })

  it('al cortar no deja un guion pegado al sufijo ni guiones dobles', () => {
    const name = exportFileName(`${'x'.repeat(68)} yyyy`)
    expect(name).toBe(`${'x'.repeat(68)}-planos.pdf`)
    expect(name).not.toContain('--')
  })

  it('cualquier entrada rara da un nombre seguro de 80 caracteres o menos', () => {
    const inputs = ['Łódź ő', 'a.b.c', '  .oculto', 'x'.repeat(69), 'y'.repeat(70), 'Casa  Alvear -- 2', '‮evil', 'ﬁle']
    for (const input of inputs) {
      const name = exportFileName(input)
      expect(name, JSON.stringify(input)).toMatch(SAFE)
      expect(name.length).toBeLessThanOrEqual(80)
    }
  })
})
```

Create `apps/web/test/export-text.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { fitText } from '../src/lib/export/fit-text'
import { formatLongDate } from '../src/lib/export/format-date'

/** Cada carácter mide 2 unidades. */
const width = (text: string) => [...text].length * 2

describe('formatLongDate (decisión de Silvert: la fecha va en letras)', () => {
  it('12 de octubre de 2026', () => {
    expect(formatLongDate(new Date(2026, 9, 12))).toBe('12 de octubre de 2026')
  })

  it('sin cero a la izquierda y con todos los meses en minúscula', () => {
    expect(formatLongDate(new Date(2027, 0, 1))).toBe('1 de enero de 2027')
    expect(formatLongDate(new Date(2026, 11, 31))).toBe('31 de diciembre de 2026')
    expect(formatLongDate(new Date(2026, 8, 5))).toBe('5 de septiembre de 2026')
  })

  it('una fecha inválida da texto vacío (no "NaN de undefined")', () => {
    expect(formatLongDate(new Date('no es una fecha'))).toBe('')
  })
})

describe('fitText (un nombre de 120 caracteres no se sale de su caja)', () => {
  it('el texto que cabe queda igual (con los espacios normalizados)', () => {
    expect(fitText('Casa Alvear', 100, width)).toBe('Casa Alvear')
    expect(fitText('  Casa   Alvear ', 100, width)).toBe('Casa Alvear')
  })

  it('el que no cabe se corta con "…" y mide lo que cabe o menos', () => {
    const long = 'abcdefghij'.repeat(13)
    expect(long.length).toBeGreaterThan(120)
    const fitted = fitText(long, 60, width)
    expect(fitted.endsWith('…')).toBe(true)
    expect(width(fitted)).toBeLessThanOrEqual(60)
    expect(width(`${fitted.slice(0, -1)}x…`)).toBeGreaterThan(60)
  })

  it('no deja un espacio antes de los puntos suspensivos', () => {
    expect(fitText('abcd efgh', 12, width)).toBe('abcd…')
  })

  it('no parte un emoji ni un par sustituto por la mitad', () => {
    const out = fitText('🏠🏠🏠🏠🏠🏠', 8, width)
    expect(out).toBe('🏠🏠🏠…')
  })

  it('si ni siquiera cabe "…" devuelve cadena vacía', () => {
    expect(fitText('Casa', 1, width)).toBe('')
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-file-name export-text`
Expected: FAIL — `Cannot find module '../src/lib/export/file-name'` (y las otras dos).

- [ ] **Paso 2: Escribir los tres módulos**

Create `apps/web/src/lib/export/file-name.ts`:

```ts
const SUFFIX = '-planos.pdf'
const MAX_LENGTH = 80

/**
 * Nombre del archivo que se descarga: `<proyecto>-planos.pdf` (criterio 3). Solo letras y números sin tildes, separados por
 * guiones; nunca vacío, nunca más de 80 caracteres y nunca con los caracteres que Windows, macOS o Linux prohíben.
 */
export function exportFileName(projectName: string): string {
  const base = projectName
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH - SUFFIX.length)
    .replace(/-+$/g, '')
  return `${base || 'proyecto'}${SUFFIX}`
}
```

Create `apps/web/src/lib/export/format-date.ts`:

```ts
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "12 de octubre de 2026" (hora local). Una fecha inválida da texto vacío. */
export function formatLongDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getDate()} de ${MONTHS[date.getMonth()] ?? ''} de ${date.getFullYear()}`
}
```

Create `apps/web/src/lib/export/fit-text.ts`:

```ts
/**
 * Corta `text` con "…" para que `widthOf` (la medida real en la fuente) no pase de `maxWidth`. Normaliza los espacios, no parte
 * caracteres de dos unidades (emoji) y no deja un espacio antes de los puntos suspensivos. Vacío si ni "…" cabe.
 */
export function fitText(text: string, maxWidth: number, widthOf: (text: string) => number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (widthOf(clean) <= maxWidth) return clean
  const chars = Array.from(clean)
  const cut = (count: number) => `${chars.slice(0, count).join('').trimEnd()}…`
  let low = 0
  let high = chars.length
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (widthOf(cut(mid)) <= maxWidth) low = mid
    else high = mid - 1
  }
  if (low === 0) return widthOf('…') <= maxWidth ? '…' : ''
  return cut(low)
}
```

Nota para "si ni siquiera cabe": con `width = 2 por carácter` y `maxWidth = 1`, `widthOf('…') = 2 > 1`, devuelve `''` ✓. Con `low === 0` y `'…'` que sí cabe devuelve `'…'` solo.

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-file-name export-text`
Expected: PASS (`export-file-name`: 9 pruebas; `export-text`: 8).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/lib/export/file-name.ts apps/web/src/lib/export/format-date.ts apps/web/src/lib/export/fit-text.ts apps/web/test/export-file-name.test.ts apps/web/test/export-text.test.ts
git commit -m "feat(plano): nombre de archivo seguro, fecha en letras y texto con puntos suspensivos" -- apps/web/src/lib/export/file-name.ts apps/web/src/lib/export/format-date.ts apps/web/src/lib/export/fit-text.ts apps/web/test/export-file-name.test.ts apps/web/test/export-text.test.ts
```

---

### Task 4: Escala gráfica y leyenda con "y N más"

**Files:**
- Create: `apps/web/src/lib/export/scale-bar.ts`, `apps/web/src/lib/export/legend.ts`
- Test: `apps/web/test/export-scale-bar.test.ts`, `apps/web/test/export-legend.test.ts`

**Interfaces:**
- Consumes: `Scale` (Tarea 1).
- Produces:
  - `@/lib/export/scale-bar`: `ScaleBar = { lengthM: number; lengthMm: number; segments: 4; ticks: { atMm: number; label: string }[] }`; `pickScaleBar(scale: Scale, limits?: { minMm?: number; maxMm?: number }): ScaleBar` (largo "bonito" de 0,5, 1, 2, 5, 10 o 20 m que mide entre 20 y 60 mm por omisión); `formatMeters(meters: number): string` (`"2 m"`, `"0,5 m"`).
  - `@/lib/export/legend`: `LegendEntry = { kind: 'zone' | 'material'; label: string; color: string; areaM2?: number }`; `LegendView = { shown: LegendEntry[]; more: number }`; `sortLegend(entries): LegendEntry[]` (ambientes por nombre y luego materiales sin repetir); `buildLegend(entries, capacity: number): LegendView` (si no entran todos, la última fila es "y N más": `shown` trae `capacity - 1` y `more` el resto).

**Cubre el criterio 6** (la barra de 2 m mide 40,0 mm a 1:50) y la regla de leyenda de Silvert ("y N más" dentro del cajetín).

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/export-scale-bar.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatMeters, pickScaleBar } from '../src/lib/export/scale-bar'

describe('escala gráfica (criterio 6 y tabla 5.3)', () => {
  it('1:25 usa 1 m, 1:50 usa 2 m y 1:100 usa 5 m', () => {
    expect(pickScaleBar(25).lengthM).toBe(1)
    expect(pickScaleBar(50).lengthM).toBe(2)
    expect(pickScaleBar(100).lengthM).toBe(5)
  })

  it('la barra de 2 m a 1:50 mide 40,0 mm', () => {
    expect(pickScaleBar(50).lengthMm).toBeCloseTo(40, 9)
    expect(pickScaleBar(25).lengthMm).toBeCloseTo(40, 9)
    expect(pickScaleBar(100).lengthMm).toBeCloseTo(50, 9)
  })

  it('mide entre 20 y 60 mm con los límites por omisión', () => {
    for (const scale of [25, 50, 100] as const) {
      const bar = pickScaleBar(scale)
      expect(bar.lengthMm).toBeGreaterThanOrEqual(20)
      expect(bar.lengthMm).toBeLessThanOrEqual(60)
      expect(bar.segments).toBe(4)
    }
  })

  it('en una zona angosta (30 mm) elige el largo más corto que sigue siendo legible', () => {
    expect(pickScaleBar(25, { maxMm: 30 }).lengthM).toBe(0.5)
    expect(pickScaleBar(50, { maxMm: 30 }).lengthM).toBe(1)
    expect(pickScaleBar(100, { maxMm: 30 }).lengthM).toBe(2)
  })

  it('si ningún largo llega a 20 mm usa el mayor que cabe; si ninguno cabe, el menor', () => {
    expect(pickScaleBar(100, { maxMm: 10 }).lengthM).toBe(1)
    expect(pickScaleBar(100, { maxMm: 3 }).lengthM).toBe(0.5)
  })

  it('las marcas están en 0, a la mitad y al final, con la unidad solo en la última', () => {
    const bar = pickScaleBar(50)
    expect(bar.ticks).toEqual([
      { atMm: 0, label: '0' },
      { atMm: 20, label: '1' },
      { atMm: 40, label: '2 m' },
    ])
    expect(pickScaleBar(25, { maxMm: 30 }).ticks.map((t) => t.label)).toEqual(['0', '0,25', '0,5 m'])
  })

  it('formatMeters usa coma decimal', () => {
    expect(formatMeters(2)).toBe('2 m')
    expect(formatMeters(0.5)).toBe('0,5 m')
    expect(formatMeters(10)).toBe('10 m')
  })
})
```

Create `apps/web/test/export-legend.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { type LegendEntry, buildLegend, sortLegend } from '../src/lib/export/legend'

const zone = (label: string, areaM2 = 10): LegendEntry => ({ kind: 'zone', label, color: '#1F5FE0', areaM2 })
const material = (label: string): LegendEntry => ({ kind: 'material', label, color: '#C9A27A' })

describe('leyenda del cajetín', () => {
  it('ordena los ambientes por nombre (con tildes y ñ) y después los materiales, sin repetir materiales', () => {
    const sorted = sortLegend([material('Madera'), zone('Sala'), zone('Ñandú'), zone('Baño'), material('Madera'), material('Azulejo')])
    expect(sorted.map((e) => e.label)).toEqual(['Baño', 'Ñandú', 'Sala', 'Azulejo', 'Madera'])
  })

  it('no repite un ambiente que tenga el mismo nombre que otro (los dos se listan)', () => {
    expect(sortLegend([zone('Dormitorio'), zone('Dormitorio')])).toHaveLength(2)
  })

  it('si todo entra, no hay línea "y N más"', () => {
    const view = buildLegend([zone('A'), zone('B')], 8)
    expect(view.shown).toHaveLength(2)
    expect(view.more).toBe(0)
  })

  it('si no entra, la última fila es "y N más": se muestran capacidad - 1 y se cuenta el resto', () => {
    const entries = Array.from({ length: 10 }, (_, i) => zone(`Ambiente ${String(i).padStart(2, '0')}`))
    const view = buildLegend(entries, 8)
    expect(view.shown).toHaveLength(7)
    expect(view.more).toBe(3)
  })

  it('el borde exacto (tantos como filas) cabe sin "y N más"', () => {
    const entries = Array.from({ length: 4 }, (_, i) => zone(`Ambiente ${i}`))
    expect(buildLegend(entries, 4)).toEqual({ shown: entries, more: 0 })
  })

  it('con capacidad 1 solo queda la línea "y N más"; con capacidad 0 no hay dónde dibujar nada', () => {
    const entries = [zone('A'), zone('B'), zone('C')]
    expect(buildLegend(entries, 1)).toEqual({ shown: [], more: 3 })
    expect(buildLegend(entries, 0)).toEqual({ shown: [], more: 3 })
  })

  it('sin ambientes ni materiales la leyenda queda vacía y sin línea de resto (Review Focus 1)', () => {
    expect(buildLegend([], 8)).toEqual({ shown: [], more: 0 })
    expect(buildLegend([], 0)).toEqual({ shown: [], more: 0 })
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-scale-bar export-legend`
Expected: FAIL — `Cannot find module '../src/lib/export/scale-bar'` y `'../src/lib/export/legend'`.

- [ ] **Paso 2: Escribir la escala gráfica y la leyenda**

Create `apps/web/src/lib/export/scale-bar.ts`:

```ts
import type { Scale } from './types'

/** Largos "bonitos" de la barra, en metros. 0,5 m solo sale cuando la zona es angosta (hoja vertical A4). */
const CANDIDATES_M = [0.5, 1, 2, 5, 10, 20] as const

export type ScaleBar = {
  lengthM: number
  lengthMm: number
  /** Tramos alternados (negro y blanco) de la barra. */
  segments: 4
  ticks: { atMm: number; label: string }[]
}

/** "2 m", "0,5 m": coma decimal y la unidad pegada con un espacio. */
export function formatMeters(meters: number): string {
  return `${formatNumber(meters)} m`
}

function formatNumber(value: number): string {
  return String(value).replace('.', ',')
}

/**
 * Elige el largo "bonito" más grande que mide entre `minMm` y `maxMm` (20 y 60 mm por omisión). Si ninguno llega al mínimo
 * usa el mayor que cabe; si ninguno cabe, el menor. 1:25 → 1 m, 1:50 → 2 m y 1:100 → 5 m en las hojas apaisadas.
 */
export function pickScaleBar(scale: Scale, limits: { minMm?: number; maxMm?: number } = {}): ScaleBar {
  const minMm = limits.minMm ?? 20
  const maxMm = limits.maxMm ?? 60
  const toMm = (meters: number) => (meters * 1000) / scale
  const fits = CANDIDATES_M.filter((m) => toMm(m) <= maxMm + 1e-9)
  const readable = fits.filter((m) => toMm(m) >= minMm - 1e-9)
  const lengthM = readable.at(-1) ?? fits.at(-1) ?? CANDIDATES_M[0]
  const lengthMm = toMm(lengthM)
  return {
    lengthM,
    lengthMm,
    segments: 4,
    ticks: [
      { atMm: 0, label: '0' },
      { atMm: lengthMm / 2, label: formatNumber(lengthM / 2) },
      { atMm: lengthMm, label: formatMeters(lengthM) },
    ],
  }
}
```

Create `apps/web/src/lib/export/legend.ts`:

```ts
export type LegendEntry = {
  kind: 'zone' | 'material'
  label: string
  /** Color de la muestra (hexadecimal). */
  color: string
  /** Solo los ambientes: metros cuadrados. */
  areaM2?: number
}

export type LegendView = { shown: LegendEntry[]; more: number }

/** Ambientes por nombre y después los materiales del piso, sin repetir el mismo material. */
export function sortLegend(entries: readonly LegendEntry[]): LegendEntry[] {
  const byLabel = (a: LegendEntry, b: LegendEntry) => a.label.localeCompare(b.label, 'es')
  const zones = entries.filter((entry) => entry.kind === 'zone').sort(byLabel)
  const seen = new Set<string>()
  const materials = entries
    .filter((entry) => entry.kind === 'material')
    .sort(byLabel)
    .filter((entry) => {
      const key = entry.label.toLocaleLowerCase('es')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  return [...zones, ...materials]
}

/**
 * Lo que entra en `capacity` filas. Si no entran todos, la última fila es la línea "y N más" (`more` > 0) y se muestran
 * `capacity - 1`. Con capacidad 0 no hay dónde dibujar nada (`shown` vacío) pero `more` cuenta lo que quedó fuera.
 */
export function buildLegend(entries: readonly LegendEntry[], capacity: number): LegendView {
  if (entries.length <= capacity) return { shown: [...entries], more: 0 }
  const rows = Math.max(0, capacity - 1)
  return { shown: entries.slice(0, rows), more: entries.length - rows }
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-scale-bar export-legend`
Expected: PASS (`export-scale-bar`: 7 pruebas; `export-legend`: 7).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/lib/export/scale-bar.ts apps/web/src/lib/export/legend.ts apps/web/test/export-scale-bar.test.ts apps/web/test/export-legend.test.ts
git commit -m "feat(plano): escala gráfica y leyenda con la línea 'y N más'" -- apps/web/src/lib/export/scale-bar.ts apps/web/src/lib/export/legend.ts apps/web/test/export-scale-bar.test.ts apps/web/test/export-legend.test.ts
```

---

### Task 5a: Estilo de Papel (muros negros, sin imágenes, líneas finas)

**Files:**
- Create: `apps/web/src/lib/export/plan-style.ts`
- Test: `apps/web/test/export-plan-style.test.ts`

**Interfaces:**
- Consumes: `PlanMode` (Tarea 1).
- Produces en `@/lib/export/plan-style`:
  - `GeoLike`: forma mínima y estructural de una geometría del plano (`kind`, `fill`, `stroke`, `strokeWidth`, `fillOpacity`, `strokeOpacity`, `opacity`, `vectorEffect`, `strokeDasharray`, `paintOrder`, `fontSize`, `text`, `children`, y cualquier otro campo). La geometría real de Pascal (`FloorplanGeometry`) se convierte con un `as unknown as GeoLike` en `src/editor/export/` (Tarea 12b).
  - `StyleContext = { mode: PlanMode; nodeType: string | undefined; ptPerUnit: number; zoneColor?: string; floorColor?: string }` (`ptPerUnit` = puntos del PDF por metro del plano).
  - `styleGeometry(geometry: GeoLike, context: StyleContext): GeoLike | null` (`null` = no se dibuja; en modo Color pasa la geometría tal cual hasta la Tarea 5b); `paperColor(color: string): string` (el filtro de colores del modo Papel); `isWhite(color: string | undefined): boolean`; `safeText(value: string): string` (el texto del plano que Helvetica no puede dibujar sale con "?"); `PAPER_WIDTH_PT = { wall: 0.7, opening: 0.35, light: 0.25 }`.

**Cubre el criterio 9** (Papel) y el caso 5 de Review Focus (en Papel no se pide ninguna imagen). **Papel** (decisión de Silvert: muros con relleno negro): rellenos solo negro (muros) o blanco; trazos negros o blancos de 0,7 pt los muros, 0,35 las aberturas, escaleras, losas y cielorrasos, y 0,25 el resto; sin tintes de ambientes ni imágenes; texto negro sin halo. Las cotas las dibuja el renderizador de Pascal con 0,5 pt fijos (cumple el tope de 0,7 pt) y sus colores fijos los convierte `withColorFilter` con `paperColor`.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/export-plan-style.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { type GeoLike, PAPER_WIDTH_PT, type StyleContext, isWhite, paperColor, safeText, styleGeometry } from '../src/lib/export/plan-style'

const PT_PER_M = 56.69 // 1:50
const paper = (nodeType: string | undefined, extra: Partial<StyleContext> = {}): StyleContext => ({ mode: 'paper', nodeType, ptPerUnit: PT_PER_M, ...extra })

const WALL: GeoLike = { kind: 'polygon', points: [[0, 0], [5, 0], [5, 0.2], [0, 0.2]], fill: '#374151', stroke: '#1f2937', strokeWidth: 0.02, opacity: 0.92 }
const DOOR_ARC: GeoLike = { kind: 'path', d: 'M0 0', fill: 'none', stroke: '#2563eb', strokeWidth: 1.4, vectorEffect: 'non-scaling-stroke' }
const DOOR_LEAF: GeoLike = { kind: 'polygon', points: [[0, 0], [1, 0], [1, 0.05]], fill: '#ffffff', stroke: '#2563eb', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }
const DOOR_WEDGE: GeoLike = { kind: 'path', d: 'M0 0', fill: '#2563eb', fillOpacity: 0.12, stroke: 'none' }
const SLAB: GeoLike = { kind: 'polygon', points: [[0, 0], [5, 0], [5, 4]], fill: '#cbd5e1', fillOpacity: 0.6, stroke: '#475569', strokeWidth: 0.03 }
const ZONE: GeoLike = { kind: 'polygon', points: [[0, 0], [5, 0], [5, 4]], fill: '#3b82f6', fillOpacity: 0.04, stroke: '#3b82f6', strokeWidth: 0.02 }
const ZONE_LABEL: GeoLike = { kind: 'text', x: 1, y: 1, text: 'Sala', fontSize: 0.2, fill: '#ffffff', stroke: '#3b82f6', strokeWidth: 0.03, paintOrder: 'stroke', fontWeight: 500 }
const SOFA_IMAGE: GeoLike = { kind: 'image', url: '/items/sofa/floor-plan.png', center: [1, 1], width: 2, height: 1 }
const SOFA_OUTLINE: GeoLike = { kind: 'polygon', points: [[0, 0], [2, 0], [2, 1]], fill: '#94a3b8', fillOpacity: 0.2, stroke: '#475569', strokeWidth: 0.02 }

const widthPt = (g: GeoLike) => (g.vectorEffect === 'non-scaling-stroke' ? (g.strokeWidth ?? 0) : (g.strokeWidth ?? 0) * PT_PER_M)

function leaves(g: GeoLike | null): GeoLike[] {
  if (!g) return []
  return g.kind === 'group' ? (g.children ?? []).flatMap(leaves) : [g]
}

describe('modo Papel (criterio 9)', () => {
  it('el muro se rellena de negro y su contorno mide 0,7 pt, sin transparencia', () => {
    const out = styleGeometry(WALL, paper('wall'))
    expect(out).toMatchObject({ kind: 'polygon', fill: '#000000', stroke: '#000000' })
    expect(widthPt(out as GeoLike)).toBeCloseTo(PAPER_WIDTH_PT.wall, 9)
    expect(out?.opacity).toBeUndefined()
    expect(out?.points).toEqual(WALL.points)
  })

  it('las aberturas (puerta) quedan en trazo negro de 0,35 pt; el blanco del batiente se conserva y la cuña se vacía', () => {
    const arc = styleGeometry(DOOR_ARC, paper('door'))
    expect(arc).toMatchObject({ fill: 'none', stroke: '#000000', strokeWidth: 0.35, vectorEffect: 'non-scaling-stroke' })
    expect(styleGeometry(DOOR_LEAF, paper('door'))).toMatchObject({ fill: '#ffffff', stroke: '#000000' })
    expect(styleGeometry(DOOR_WEDGE, paper('door'))).toMatchObject({ fill: 'none', stroke: 'none' })
  })

  it('la losa pierde su relleno gris y conserva un contorno fino de 0,35 pt', () => {
    const out = styleGeometry(SLAB, paper('slab'))
    expect(out).toMatchObject({ fill: 'none', stroke: '#000000' })
    expect(out?.fillOpacity).toBeUndefined()
    expect(widthPt(out as GeoLike)).toBeCloseTo(PAPER_WIDTH_PT.opening, 9)
  })

  it('el ambiente no pinta tinte ni contorno (los muros ya lo marcan)', () => {
    expect(styleGeometry(ZONE, paper('zone'))).toMatchObject({ fill: 'none', stroke: 'none' })
  })

  it('los muebles pierden la imagen y dejan su huella en 0,25 pt', () => {
    expect(styleGeometry(SOFA_IMAGE, paper('item'))).toBeNull()
    const out = styleGeometry(SOFA_OUTLINE, paper('item'))
    expect(out).toMatchObject({ fill: 'none', stroke: '#000000' })
    expect(widthPt(out as GeoLike)).toBeCloseTo(PAPER_WIDTH_PT.light, 9)
  })

  it('un grupo conserva lo que se dibuja, descarta lo que no y desaparece si queda vacío', () => {
    const group: GeoLike = { kind: 'group', children: [SOFA_IMAGE, SOFA_OUTLINE], transform: { translate: [1, 2] } }
    const out = styleGeometry(group, paper('item'))
    expect(out?.kind).toBe('group')
    expect(out?.children).toHaveLength(1)
    expect(out?.transform).toEqual({ translate: [1, 2] })
    expect(styleGeometry({ kind: 'group', children: [SOFA_IMAGE] }, paper('item'))).toBeNull()
  })

  it('el texto es negro y sin halo (Papel no tiene color)', () => {
    const out = styleGeometry(ZONE_LABEL, paper('zone'))
    expect(out).toMatchObject({ kind: 'text', text: 'Sala', fill: '#000000', fontWeight: 500 })
    expect(out?.stroke).toBeUndefined()
    expect(out?.paintOrder).toBeUndefined()
  })

  it('una página entera de geometrías cumple los invariantes de Papel', () => {
    const cases: [GeoLike, string][] = [[WALL, 'wall'], [DOOR_ARC, 'door'], [DOOR_LEAF, 'door'], [DOOR_WEDGE, 'door'], [SLAB, 'slab'], [ZONE, 'zone'], [ZONE_LABEL, 'zone'], [SOFA_IMAGE, 'item'], [SOFA_OUTLINE, 'item']]
    for (const [geometry, nodeType] of cases) {
      for (const leaf of leaves(styleGeometry(geometry, paper(nodeType)))) {
        expect(leaf.kind, nodeType).not.toBe('image')
        if (leaf.kind === 'text') continue
        expect(['none', '#000000', '#ffffff'], `${nodeType} relleno`).toContain(leaf.fill)
        expect(['none', '#000000', '#ffffff'], `${nodeType} trazo`).toContain(leaf.stroke)
        if (leaf.fill === '#000000') expect(nodeType).toBe('wall')
        if (leaf.stroke !== 'none') expect(widthPt(leaf), `${nodeType} ancho`).toBeLessThanOrEqual(0.7 + 1e-9)
      }
    }
  })

  it('no modifica la geometría que recibe', () => {
    const before = structuredClone(WALL)
    styleGeometry(WALL, paper('wall'))
    expect(WALL).toEqual(before)
  })

  it('los trazos de las cotas y otros tipos que no se tocan pasan tal cual', () => {
    const dimension: GeoLike = { kind: 'dimension', from: [0, 0], to: [4, 0] }
    expect(styleGeometry(dimension, paper('wall'))).toBe(dimension)
  })
})

describe('texto del plano (Pascal lo dibuja con Helvetica: solo Latin-1)', () => {
  it('un carácter que la fuente estándar no tiene sale como "?" y lo demás no cambia', () => {
    const label = (text: string): GeoLike => ({ ...ZONE_LABEL, text })
    expect(styleGeometry(label('Łódź'), paper('zone'))?.text).toBe('?ód?')
    expect(styleGeometry(label('Cocina · Año — Ñandú'), paper('zone'))?.text).toBe('Cocina · Año — Ñandú')
    expect(styleGeometry(label('Salón 🏠'), paper('zone'))?.text).toBe('Salón ?')
    expect(safeText('Győr')).toBe('Gy?r')
  })
})

describe('paperColor (el filtro de colores del renderizador de Pascal en Papel)', () => {
  it('el blanco y casi blanco quedan blancos y todo lo demás, negro', () => {
    expect(paperColor('#ffffff')).toBe('#ffffff')
    expect(paperColor('#FFF')).toBe('#ffffff')
    expect(paperColor('#fafafa')).toBe('#ffffff')
    expect(paperColor('#334155')).toBe('#000000')
    expect(paperColor('#111827')).toBe('#000000')
    expect(paperColor('#cbd5e1')).toBe('#000000')
    expect(paperColor('rgb(1, 2, 3)')).toBe('#000000')
  })

  it('isWhite reconoce blanco y no confunde "none" ni vacío', () => {
    expect(isWhite('#ffffff')).toBe(true)
    expect(isWhite('white')).toBe(true)
    expect(isWhite('none')).toBe(false)
    expect(isWhite(undefined)).toBe(false)
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-plan-style`
Expected: FAIL — `Cannot find module '../src/lib/export/plan-style'`.

- [ ] **Paso 2: Escribir el estilo de Papel**

Create `apps/web/src/lib/export/plan-style.ts`:

```ts
import type { PlanMode } from './types'

/** Forma mínima de una geometría del plano de Pascal (`FloorplanGeometry`): lo único que el estilo necesita saber. */
export type GeoLike = {
  kind: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  fillOpacity?: number
  strokeOpacity?: number
  opacity?: number
  vectorEffect?: string
  strokeDasharray?: string
  paintOrder?: string
  fontSize?: number
  text?: string
  children?: GeoLike[]
  [key: string]: unknown
}

export type StyleContext = {
  mode: PlanMode
  /** Tipo del nodo de Pascal que generó la geometría ('wall', 'door', 'zone', 'slab', 'item'…). */
  nodeType: string | undefined
  /** Puntos del PDF por unidad del plano (el metro): sirve para pasar puntos a metros. */
  ptPerUnit: number
  /** Color del ambiente (solo Color, nodo `zone`). */
  zoneColor?: string
  /** Color del material del piso (solo Color, nodo `slab`). */
  floorColor?: string
}

/** Ancho máximo de línea en Papel, en puntos: muros, aberturas (y escaleras, losas) y el resto. */
export const PAPER_WIDTH_PT = { wall: 0.7, opening: 0.35, light: 0.25 } as const

const OPENING_TYPES = new Set(['door', 'window', 'stair', 'stair-segment', 'slab', 'ceiling', 'column'])
const LEAF_KINDS = new Set(['path', 'polygon', 'polyline', 'rect', 'circle', 'line'])
const PAPER_INK = '#000000'
const WHITE = '#ffffff'

const isNone = (color: string | undefined): boolean => !color || color === 'none' || color === 'transparent'

/** Pascal dibuja el texto del plano con Helvetica (Latin-1 y la puntuación de Windows-1252): lo que no tiene sale "?" en lugar de un carácter roto. */
export function safeText(value: string): string {
  return value.replace(/[^\u0020-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC\u2122]/gu, '?')
}

/** Luminancia aproximada (0 a 1) de un color hexadecimal `#rgb` o `#rrggbb`; `null` si no lo es. */
function hexLuminance(color: string): number | null {
  const hex = color.trim().replace('#', '')
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(hex)) return null
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) / 255)
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

export function isWhite(color: string | undefined): boolean {
  if (!color) return false
  const c = color.trim().toLowerCase()
  if (c === 'white') return true
  return (hexLuminance(c) ?? 0) >= 0.94
}

/** El filtro de colores de Papel: blanco (o casi blanco) queda blanco; todo lo demás, negro. */
export function paperColor(color: string): string {
  return isWhite(color) ? WHITE : PAPER_INK
}

/** Ancho de trazo en las unidades de la geometría: puntos si no escala con el plano, metros si escala. */
function strokeUnits(shape: GeoLike, widthPt: number, ptPerUnit: number): number {
  if (shape.vectorEffect === 'non-scaling-stroke' || ptPerUnit <= 0) return widthPt
  return widthPt / ptPerUnit
}

function paperWidthFor(nodeType: string | undefined): number {
  if (nodeType === 'wall') return PAPER_WIDTH_PT.wall
  return nodeType && OPENING_TYPES.has(nodeType) ? PAPER_WIDTH_PT.opening : PAPER_WIDTH_PT.light
}

function paperLeaf(shape: GeoLike, ctx: StyleContext): GeoLike {
  const { fillOpacity: _fillOpacity, strokeOpacity: _strokeOpacity, opacity: _opacity, strokeWidth: _strokeWidth, ...rest } = shape
  const wall = ctx.nodeType === 'wall'
  const fill = isNone(shape.fill) ? 'none' : isWhite(shape.fill) ? WHITE : wall ? PAPER_INK : 'none'
  const stroke = isNone(shape.stroke) ? 'none' : isWhite(shape.stroke) ? WHITE : ctx.nodeType === 'zone' ? 'none' : PAPER_INK
  const out: GeoLike = { ...rest, fill, stroke }
  if (stroke !== 'none') out.strokeWidth = strokeUnits(shape, paperWidthFor(ctx.nodeType), ctx.ptPerUnit)
  return out
}

function paperText(shape: GeoLike): GeoLike {
  const { stroke: _stroke, strokeWidth: _strokeWidth, paintOrder: _paintOrder, opacity: _opacity, ...rest } = shape
  return { ...rest, fill: PAPER_INK }
}

/**
 * Aplica el modo Papel o Color a una geometría del plano. Devuelve una copia (nunca modifica la que recibe) o `null` si no
 * se dibuja (imágenes en Papel, grupos que quedan vacíos). Lo que no es forma ni texto (cotas, etiquetas de cota…) pasa
 * tal cual: sus colores fijos los convierte `withColorFilter` con `paperColor`.
 */
export function styleGeometry(geometry: GeoLike, ctx: StyleContext): GeoLike | null {
  if (geometry.kind === 'group') {
    const children = (geometry.children ?? [])
      .map((child) => styleGeometry(child, ctx))
      .filter((child): child is GeoLike => child !== null)
    return children.length === 0 ? null : { ...geometry, children }
  }
  if (geometry.kind === 'image') return ctx.mode === 'paper' ? null : geometry
  if (geometry.kind === 'text') {
    const clean = typeof geometry.text === 'string' ? { ...geometry, text: safeText(geometry.text) } : geometry
    return ctx.mode === 'paper' ? paperText(clean) : clean
  }
  if (LEAF_KINDS.has(geometry.kind)) return ctx.mode === 'paper' ? paperLeaf(geometry, ctx) : geometry
  return geometry
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-plan-style`
Expected: PASS (13 pruebas).

Si "una página entera de geometrías…" falla en `trazo` con `"#000000"` esperado y `undefined` recibido, es el texto: el bucle lo salta con `continue`; revisa que el `kind` del texto sea `'text'`.

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos (las variables con `_` delante son intencionales: sirven para sacar campos con `...rest`).

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/lib/export/plan-style.ts apps/web/test/export-plan-style.test.ts
git commit -m "feat(plano): estilo Papel con muros negros, sin imágenes y líneas de 0,7 pt o menos" -- apps/web/src/lib/export/plan-style.ts apps/web/test/export-plan-style.test.ts
```

---

### Task 5b: Estilo de Color (ambientes al 35 %, piso con su material, texto Noche con halo)

**Files:**
- Modify: `apps/web/src/lib/export/plan-style.ts`
- Test: `apps/web/test/export-plan-style-color.test.ts`

**Interfaces:**
- Consumes: `styleGeometry`, `StyleContext`, `GeoLike` (Tarea 5a); `BRAND` de `@/lib/brand`.
- Produces: el mismo `styleGeometry`, que ahora en modo Color: pinta el ambiente (`nodeType: 'zone'` con `zoneColor`) con su color al 35 % y sin contorno, la losa (`'slab'` con `floorColor`) con el color de su material al 55 %, deja las imágenes de los muebles, los muros y los trazos de las aberturas como los dibuja Pascal, y pone el texto en Noche con halo blanco.

**Cubre el criterio 10** (Color: aparecen el color de cada ambiente y el del material del piso; los muebles salen con su proyección cenital).

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/export-plan-style-color.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { BRAND } from '../src/lib/brand'
import { type GeoLike, type StyleContext, styleGeometry } from '../src/lib/export/plan-style'

const PT_PER_M = 56.69 // 1:50
const color = (nodeType: string | undefined, extra: Partial<StyleContext> = {}): StyleContext => ({ mode: 'color', nodeType, ptPerUnit: PT_PER_M, ...extra })

const WALL: GeoLike = { kind: 'polygon', points: [[0, 0], [5, 0], [5, 0.2], [0, 0.2]], fill: '#374151', stroke: '#1f2937', strokeWidth: 0.02, opacity: 0.92 }
const DOOR_ARC: GeoLike = { kind: 'path', d: 'M0 0', fill: 'none', stroke: '#2563eb', strokeWidth: 1.4, vectorEffect: 'non-scaling-stroke' }
const SLAB: GeoLike = { kind: 'polygon', points: [[0, 0], [5, 0], [5, 4]], fill: '#cbd5e1', fillOpacity: 0.6, stroke: '#475569', strokeWidth: 0.03 }
const ZONE: GeoLike = { kind: 'polygon', points: [[0, 0], [5, 0], [5, 4]], fill: '#3b82f6', fillOpacity: 0.04, stroke: '#3b82f6', strokeWidth: 0.02 }
const ZONE_LABEL: GeoLike = { kind: 'text', x: 1, y: 1, text: 'Sala', fontSize: 0.2, fill: '#ffffff', stroke: '#3b82f6', strokeWidth: 0.03, paintOrder: 'stroke', fontWeight: 500 }
const SOFA_IMAGE: GeoLike = { kind: 'image', url: '/items/sofa/floor-plan.png', center: [1, 1], width: 2, height: 1 }
const SOFA_OUTLINE: GeoLike = { kind: 'polygon', points: [[0, 0], [2, 0], [2, 1]], fill: '#94a3b8', fillOpacity: 0.2, stroke: '#475569', strokeWidth: 0.02 }

describe('modo Color (criterio 10)', () => {
  it('el ambiente se rellena con su color al 35 % y no lleva contorno', () => {
    const out = styleGeometry(ZONE, color('zone', { zoneColor: '#B97A00' }))
    expect(out).toMatchObject({ fill: '#B97A00', fillOpacity: 0.35, stroke: 'none' })
  })

  it('la losa se pinta con el color de su material al 55 %; sin material queda como la dibuja Pascal', () => {
    expect(styleGeometry(SLAB, color('slab', { floorColor: '#C9A27A' }))).toMatchObject({ fill: '#C9A27A', fillOpacity: 0.55 })
    expect(styleGeometry(SLAB, color('slab'))).toBe(SLAB)
  })

  it('las imágenes de los muebles, los muros y los trazos de las aberturas se conservan', () => {
    expect(styleGeometry(SOFA_IMAGE, color('item'))).toBe(SOFA_IMAGE)
    expect(styleGeometry(WALL, color('wall'))).toBe(WALL)
    expect(styleGeometry(DOOR_ARC, color('door'))).toBe(DOOR_ARC)
  })

  it('el texto va en Noche con halo blanco', () => {
    const out = styleGeometry(ZONE_LABEL, color('zone'))
    expect(out).toMatchObject({ fill: BRAND.noche, stroke: '#ffffff', paintOrder: 'stroke', text: 'Sala' })
  })

  it('el texto con caracteres que Helvetica no tiene también sale con "?" en Color', () => {
    expect(styleGeometry({ ...ZONE_LABEL, text: 'Łódź' }, color('zone'))?.text).toBe('?ód?')
  })

  it('un grupo se recorre y se conserva aunque tenga imágenes', () => {
    const group: GeoLike = { kind: 'group', children: [SOFA_IMAGE, SOFA_OUTLINE] }
    expect(styleGeometry(group, color('item'))?.children).toHaveLength(2)
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-plan-style-color`
Expected: FAIL — el ambiente y la losa salen sin tocar (`expected … to match object { fill: '#B97A00', fillOpacity: 0.35, … }`).

- [ ] **Paso 2: Agregar el estilo de Color**

Modify `apps/web/src/lib/export/plan-style.ts`:

```diff
+import { BRAND } from '../brand'
 import type { PlanMode } from './types'
```

```diff
 const WHITE = '#ffffff'
+const ZONE_OPACITY = 0.35
+const FLOOR_OPACITY = 0.55
```

```diff
   return { ...rest, fill: PAPER_INK }
 }
+
+function colorLeaf(shape: GeoLike, ctx: StyleContext): GeoLike {
+  if (ctx.nodeType === 'zone' && ctx.zoneColor && !isNone(shape.fill)) {
+    return { ...shape, fill: ctx.zoneColor, fillOpacity: ZONE_OPACITY, stroke: 'none' }
+  }
+  if (ctx.nodeType === 'slab' && ctx.floorColor && !isNone(shape.fill)) {
+    return { ...shape, fill: ctx.floorColor, fillOpacity: FLOOR_OPACITY }
+  }
+  return shape
+}
+
+function colorText(shape: GeoLike): GeoLike {
+  return { ...shape, fill: BRAND.noche, stroke: WHITE, strokeWidth: (shape.fontSize ?? 0.2) * 0.12, paintOrder: 'stroke' }
+}
```

```diff
-    return ctx.mode === 'paper' ? paperText(clean) : clean
+    return ctx.mode === 'paper' ? paperText(clean) : colorText(clean)
```

```diff
-  if (LEAF_KINDS.has(geometry.kind)) return ctx.mode === 'paper' ? paperLeaf(geometry, ctx) : geometry
+  if (LEAF_KINDS.has(geometry.kind)) return ctx.mode === 'paper' ? paperLeaf(geometry, ctx) : colorLeaf(geometry, ctx)
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-plan-style`
Expected: PASS (`export-plan-style`: 13 pruebas y `export-plan-style-color`: 6).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/lib/export/plan-style.ts apps/web/test/export-plan-style-color.test.ts
git commit -m "feat(plano): estilo Color con ambientes al 35 %, piso con su material y texto Noche con halo" -- apps/web/src/lib/export/plan-style.ts apps/web/test/export-plan-style-color.test.ts
```

---

### Task 6: Reparto de la banda del cajetín (norte, escala gráfica, leyenda y caja)

**Files:**
- Create: `apps/web/src/lib/export/title-block.ts`
- Test: `apps/web/test/export-title-block.test.ts`

**Interfaces:**
- Consumes: `Sheet`, `BoxMm`, `MARGIN_MM`, `sheetFor` (Tarea 1).
- Produces en `@/lib/export/title-block`:
  - `BandLayout = { frame: BoxMm; band: BoxMm; north: BoxMm; scaleBar: BoxMm; legend: BoxMm | null; block: BoxMm | null; legendCols: number; legendRows: number; legendCapacity: number; barMaxMm: number }` y `layoutBand(sheet: Sheet): BandLayout` (todo en mm, origen arriba a la izquierda de la hoja).
  - `LEGEND_TITLE_MM = 5`, `LEGEND_ROW_MM = 6`.
  - `BlockLayout = { outline; logo; sheetNo; project; level; scale; date; author: BoxMm; dividers: { x1: number; y1: number; x2: number; y2: number }[] }` y `layoutBlock(block: BoxMm): BlockLayout`.

**Cubre** la capacidad de la leyenda por hoja (8, 12, 4 y 8), que el norte y la escala gráfica queden siempre (también sin cajetín) y que ninguna caja se salga de la banda ni se pise con otra.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/export-title-block.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { type BoxMm, sheetFor } from '../src/lib/export/sheet'
import { layoutBand, layoutBlock } from '../src/lib/export/title-block'

const SHEETS = [
  ['A4', 'landscape'],
  ['A3', 'landscape'],
  ['A4', 'portrait'],
  ['A3', 'portrait'],
] as const

const inside = (inner: BoxMm, outer: BoxMm) =>
  inner.x >= outer.x - 1e-9 &&
  inner.y >= outer.y - 1e-9 &&
  inner.x + inner.width <= outer.x + outer.width + 1e-9 &&
  inner.y + inner.height <= outer.y + outer.height + 1e-9
const overlap = (a: BoxMm, b: BoxMm) =>
  a.x < b.x + b.width - 1e-9 && b.x < a.x + a.width - 1e-9 && a.y < b.y + b.height - 1e-9 && b.y < a.y + a.height - 1e-9

describe('reparto de la banda (spec 5.3)', () => {
  it('la capacidad de la leyenda es 8, 12, 4 y 8 en A4 apaisada, A3 apaisada, A4 vertical y A3 vertical', () => {
    const capacities = SHEETS.map(([paper, orientation]) => layoutBand(sheetFor(paper, orientation)).legendCapacity)
    expect(capacities).toEqual([8, 12, 4, 8])
  })

  it('el cajetín mide 110 mm (90 en la hoja angosta) y la banda 36 mm', () => {
    expect(layoutBand(sheetFor('A4', 'landscape')).block).toMatchObject({ width: 110, height: 36 })
    expect(layoutBand(sheetFor('A4', 'portrait')).block).toMatchObject({ width: 90, height: 36 })
  })

  it('la banda queda pegada al marco inferior y el marco a 10 mm del borde', () => {
    for (const [paper, orientation] of SHEETS) {
      const sheet = sheetFor(paper, orientation)
      const layout = layoutBand(sheet)
      expect(layout.frame).toEqual({ x: 10, y: 10, width: sheet.widthMm - 20, height: sheet.heightMm - 20 })
      expect(layout.band.y + layout.band.height).toBeCloseTo(sheet.heightMm - 10, 9)
      expect(layout.band.height).toBe(36)
    }
  })

  it('ninguna caja se sale de la banda ni se pisa con otra, en las cuatro hojas', () => {
    for (const [paper, orientation] of SHEETS) {
      const layout = layoutBand(sheetFor(paper, orientation))
      const boxes = [layout.north, layout.scaleBar, layout.legend, layout.block].filter((b): b is BoxMm => b !== null)
      for (const box of boxes) expect(inside(box, layout.band), `${paper} ${orientation}`).toBe(true)
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          expect(overlap(boxes[i] as BoxMm, boxes[j] as BoxMm), `${paper} ${orientation} ${i}-${j}`).toBe(false)
        }
      }
    }
  })

  it('la barra de escala admite 55 mm en las hojas anchas y 30 mm en la A4 vertical', () => {
    expect(layoutBand(sheetFor('A4', 'landscape')).barMaxMm).toBe(55)
    expect(layoutBand(sheetFor('A3', 'portrait')).barMaxMm).toBe(55)
    expect(layoutBand(sheetFor('A4', 'portrait')).barMaxMm).toBe(30)
  })

  it('sin cajetín quedan solo el norte y la escala gráfica (banda de 16 mm, sin leyenda ni caja)', () => {
    for (const [paper, orientation] of SHEETS) {
      const sheet = sheetFor(paper, orientation, false)
      const layout = layoutBand(sheet)
      expect(layout.band.height).toBe(16)
      expect(layout.block).toBeNull()
      expect(layout.legend).toBeNull()
      expect(layout.legendCapacity).toBe(0)
      expect(inside(layout.north, layout.band)).toBe(true)
      expect(inside(layout.scaleBar, layout.band)).toBe(true)
      expect(overlap(layout.north, layout.scaleBar)).toBe(false)
    }
  })
})

describe('reparto de la caja del cajetín', () => {
  it('todos los campos caben dentro de la caja y no se pisan, en las dos anchuras', () => {
    for (const width of [110, 90]) {
      const block = { x: 177, y: 164, width, height: 36 }
      const layout = layoutBlock(block)
      const fields = [layout.logo, layout.sheetNo, layout.project, layout.level, layout.scale, layout.date, layout.author]
      for (const field of fields) expect(inside(field, layout.outline), `ancho ${width}`).toBe(true)
      for (let i = 0; i < fields.length; i++) {
        for (let j = i + 1; j < fields.length; j++) {
          expect(overlap(fields[i] as BoxMm, fields[j] as BoxMm), `ancho ${width} ${i}-${j}`).toBe(false)
        }
      }
      expect(layout.outline).toEqual(block)
    }
  })

  it('tiene tres filas de campos debajo del logotipo y rayas que no salen de la caja', () => {
    const block = { x: 0, y: 0, width: 110, height: 36 }
    const layout = layoutBlock(block)
    expect(layout.project.y).toBeGreaterThanOrEqual(layout.logo.y + layout.logo.height)
    expect(layout.level.y).toBeGreaterThanOrEqual(layout.project.y + layout.project.height)
    expect(layout.date.y).toBeGreaterThanOrEqual(layout.level.y + layout.level.height)
    for (const line of layout.dividers) {
      for (const x of [line.x1, line.x2]) expect(x).toBeGreaterThanOrEqual(0)
      for (const x of [line.x1, line.x2]) expect(x).toBeLessThanOrEqual(110)
      for (const y of [line.y1, line.y2]) expect(y).toBeGreaterThanOrEqual(0)
      for (const y of [line.y1, line.y2]) expect(y).toBeLessThanOrEqual(36)
    }
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-title-block`
Expected: FAIL — `Cannot find module '../src/lib/export/title-block'`.

- [ ] **Paso 2: Escribir el reparto**

Create `apps/web/src/lib/export/title-block.ts`:

```ts
import { type BoxMm, MARGIN_MM, type Sheet } from './sheet'

/** Alto del título "Leyenda" y de cada fila de la leyenda, en mm. */
export const LEGEND_TITLE_MM = 5
export const LEGEND_ROW_MM = 6

const PAD_MM = 2
const NORTH_W = 12
const NORTH_H = 14
const NORTH_GAP = 4
const ZONE_W = 75
const ZONE_W_NARROW = 50
const BLOCK_W = 110
const BLOCK_W_NARROW = 90
const NARROW_BELOW_MM = 250
const LEGEND_COL_W = 45
const LEGEND_MAX_COLS = 3
const LEGEND_ROWS = 4

export type BandLayout = {
  /** Marco de la hoja (a 10 mm del borde). */
  frame: BoxMm
  /** Banda inferior donde viven norte, escala gráfica, leyenda y cajetín. */
  band: BoxMm
  north: BoxMm
  scaleBar: BoxMm
  legend: BoxMm | null
  block: BoxMm | null
  legendCols: number
  legendRows: number
  legendCapacity: number
  /** Largo máximo de la barra de escala gráfica en esta hoja, en mm. */
  barMaxMm: number
}

/** Reparte la banda inferior de la hoja (spec 5.3). Todo en mm con el origen arriba a la izquierda de la hoja. */
export function layoutBand(sheet: Sheet): BandLayout {
  const left = MARGIN_MM
  const right = sheet.widthMm - MARGIN_MM
  const top = sheet.heightMm - MARGIN_MM - sheet.bandMm
  const band: BoxMm = { x: left, y: top, width: right - left, height: sheet.bandMm }
  const frame: BoxMm = { x: MARGIN_MM, y: MARGIN_MM, width: sheet.widthMm - 2 * MARGIN_MM, height: sheet.heightMm - 2 * MARGIN_MM }
  const narrow = band.width < NARROW_BELOW_MM
  const zoneW = narrow ? ZONE_W_NARROW : ZONE_W
  const blockW = sheet.titleBlock ? (narrow ? BLOCK_W_NARROW : BLOCK_W) : 0

  const north: BoxMm = { x: left + PAD_MM, y: top + (band.height - NORTH_H) / 2, width: NORTH_W, height: NORTH_H }
  const barX = north.x + NORTH_W + NORTH_GAP
  const scaleBar: BoxMm = { x: barX, y: north.y, width: left + zoneW - PAD_MM - barX, height: NORTH_H }

  const block: BoxMm | null = blockW > 0 ? { x: right - blockW, y: top, width: blockW, height: band.height } : null
  const legendX = left + zoneW
  const legendW = (block ? block.x : right) - legendX
  const legendCols = sheet.titleBlock ? Math.min(LEGEND_MAX_COLS, Math.floor(legendW / LEGEND_COL_W)) : 0
  const legend: BoxMm | null = legendCols > 0 ? { x: legendX, y: top, width: legendW, height: band.height } : null

  return {
    frame,
    band,
    north,
    scaleBar,
    legend,
    block,
    legendCols,
    legendRows: legend ? LEGEND_ROWS : 0,
    legendCapacity: legend ? legendCols * LEGEND_ROWS : 0,
    barMaxMm: scaleBar.width,
  }
}

export type BlockLayout = {
  outline: BoxMm
  logo: BoxMm
  sheetNo: BoxMm
  project: BoxMm
  level: BoxMm
  scale: BoxMm
  date: BoxMm
  author: BoxMm
  /** Rayas finas entre filas y entre columnas, en mm. */
  dividers: { x1: number; y1: number; x2: number; y2: number }[]
}

/** Reparte la caja del cajetín (110 × 36 mm, o 90 × 36 en la hoja angosta): logotipo y hoja arriba, proyecto, y dos filas de dos campos. */
export function layoutBlock(block: BoxMm): BlockLayout {
  const pad = 3
  const x0 = block.x + pad
  const innerW = block.width - 2 * pad
  const leftW = innerW * 0.6
  const rowC = block.y + 21
  const rowD = block.y + 28.5
  const rowH = 7.5
  return {
    outline: block,
    logo: { x: x0, y: block.y + 2.5, width: Math.min(40, innerW * 0.4), height: 7 },
    sheetNo: { x: block.x + block.width - pad - 30, y: block.y + 2.5, width: 30, height: 7 },
    project: { x: x0, y: block.y + 11, width: innerW, height: 10 },
    level: { x: x0, y: rowC, width: leftW - 2, height: rowH },
    scale: { x: x0 + leftW, y: rowC, width: innerW - leftW, height: rowH },
    date: { x: x0, y: rowD, width: leftW - 2, height: rowH },
    author: { x: x0 + leftW, y: rowD, width: innerW - leftW, height: rowH },
    dividers: [
      { x1: block.x, y1: block.y + 11, x2: block.x + block.width, y2: block.y + 11 },
      { x1: block.x, y1: rowC, x2: block.x + block.width, y2: rowC },
      { x1: block.x, y1: rowD, x2: block.x + block.width, y2: rowD },
      { x1: x0 + leftW - 1, y1: rowC, x2: x0 + leftW - 1, y2: block.y + block.height },
    ],
  }
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-title-block`
Expected: PASS (8 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/lib/export/title-block.ts apps/web/test/export-title-block.test.ts
git commit -m "feat(plano): reparto de la banda del cajetín y de su caja con la capacidad de la leyenda" -- apps/web/src/lib/export/title-block.ts apps/web/test/export-title-block.test.ts
```

---

### Task 7a: Textos del diálogo y del PDF en castellano

**Files:**
- Create: `apps/web/src/lib/export/texts-es.ts`
- Test: `apps/web/test/export-texts.test.ts`

**Interfaces:**
- Consumes: `FitResult` (Tarea 2); `Orientation`, `PaperSize`, `Scale` (Tarea 1); `paperLabel` (Tarea 1).
- Produces en `@/lib/export/texts-es`: `TEXT` (todos los textos fijos del diálogo y del PDF) y las funciones `generatingText(done, total)`, `fitSummary(result)`, `scaleDisabledReason(scale, paper, result, best)`, `noFitMessage(paper)`, `skippedImagesText(count)`, `sheetOf(n, total)`, `previewCaption(paper, orientation, widthMm, heightMm, scale)`, `levelPagerText(label, index, total)`, `scaleText(scale)` (`"1:50"`), `moreText(count)` (`"y 3 más"`), `projectTitle(name)` (`"Casa Alvear — planos"`).

**Cubre el criterio 12** (castellano, sin palabras en inglés de Pascal en el diálogo ni en el PDF): un barrido de palabras en inglés recorre **todos** los textos de `TEXT` y los que se arman, así que un texto nuevo sin traducir hace fallar la prueba.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/export-texts.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { fitScale } from '../src/lib/export/fit'
import { sheetFor } from '../src/lib/export/sheet'
import {
  TEXT,
  fitSummary,
  generatingText,
  levelPagerText,
  moreText,
  noFitMessage,
  previewCaption,
  projectTitle,
  scaleDisabledReason,
  scaleText,
  sheetOf,
  skippedImagesText,
} from '../src/lib/export/texts-es'

const ENGLISH = /\b(floor|level|levels|schedules?|construction|sheet|project|author|download|cancel|preview|scale|print|export|title|date|north|legend|more|page|loading|error|warning)\b/i

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

describe('textos en castellano (criterio 12)', () => {
  const HOUSE = { widthM: 7.8, heightM: 3.8 }
  const a4 = sheetFor('A4', 'landscape')

  it('ningún texto fijo trae palabras en inglés ni emojis', () => {
    for (const text of strings(TEXT)) {
      expect(text, text).not.toMatch(ENGLISH)
      expect(text, text).not.toMatch(/\p{Extended_Pictographic}/u)
    }
  })

  it('los textos que se arman tampoco', () => {
    const samples = [
      generatingText(1, 2),
      fitSummary(fitScale(HOUSE, a4, 50)),
      scaleDisabledReason(25, 'A4', fitScale(HOUSE, a4, 25), 50),
      scaleDisabledReason(25, 'A4', fitScale(HOUSE, a4, 25), null),
      noFitMessage('A4'),
      noFitMessage('A3'),
      skippedImagesText(1),
      skippedImagesText(4),
      sheetOf(2, 3),
      previewCaption('A3', 'landscape', 420, 297, 25),
      levelPagerText('Planta baja', 0, 2),
      scaleText(50),
      moreText(3),
      projectTitle('Casa Alvear'),
    ]
    for (const text of samples) expect(text, text).not.toMatch(ENGLISH)
  })

  it('los mensajes de error son los del spec (5.4)', () => {
    expect(TEXT.errors.nothing).toBe('Aún no hay nada que dibujar. Traza muros o ambientes y vuelve a intentarlo.')
    expect(TEXT.errors.failed).toBe('No pudimos generar el PDF. Inténtalo de nuevo.')
    expect(TEXT.errors.cancelled).toBe('Cancelaste la exportación.')
    expect(skippedImagesText(1)).toBe('No se pudo dibujar 1 mueble; el resto del plano sí está en el PDF.')
    expect(skippedImagesText(3)).toBe('No se pudieron dibujar 3 muebles; el resto del plano sí está en el PDF.')
  })

  it('el mensaje de cabida dice cuánto de la hoja usa y en qué eje', () => {
    expect(fitSummary(fitScale(HOUSE, a4, 50))).toBe('Cabe en la hoja · usa 64 % del ancho')
    expect(fitSummary(fitScale({ widthM: 2, heightM: 14 }, a4, 100))).toBe('Cabe en la hoja · usa 97 % del alto')
  })

  it('el motivo de una escala deshabilitada dice cuánto necesita, cuánto ofrece la hoja y cuál es el mejor ajuste', () => {
    expect(scaleDisabledReason(25, 'A4', fitScale(HOUSE, a4, 25), 50)).toBe(
      '1:25 no cabe en A4: necesita 352 mm de ancho y la hoja ofrece 277 mm. Mejor ajuste: 1:50.',
    )
    expect(scaleDisabledReason(25, 'A4', fitScale(HOUSE, a4, 25), null)).toBe(
      '1:25 no cabe en A4: necesita 352 mm de ancho y la hoja ofrece 277 mm.',
    )
  })

  it('cuando no cabe en ninguna escala el mensaje nombra 1:100 y lo que se puede hacer', () => {
    expect(noFitMessage('A4')).toBe('El proyecto no cabe en esta hoja ni a 1:100. Prueba con A3 o quita plantas.')
    expect(noFitMessage('A3')).toBe('El proyecto no cabe en esta hoja ni a 1:100. Prueba con otra orientación o quita plantas.')
  })

  it('el progreso, la hoja y la leyenda', () => {
    expect(generatingText(1, 2)).toBe('Generando planta 1 de 2…')
    expect(sheetOf(1, 2)).toBe('Hoja 1 de 2')
    expect(moreText(3)).toBe('y 3 más')
    expect(scaleText(50)).toBe('1:50')
    expect(previewCaption('A3', 'landscape', 420, 297, 25)).toBe('Vista previa · A3 apaisada (420 × 297 mm) · 1:25')
    expect(levelPagerText('Planta baja', 0, 2)).toBe('Planta baja · 1 de 2')
    expect(projectTitle('Casa Alvear')).toBe('Casa Alvear — planos')
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-texts`
Expected: FAIL — `Cannot find module '../src/lib/export/texts-es'`.

- [ ] **Paso 2: Escribir los textos**

Create `apps/web/src/lib/export/texts-es.ts`:

```ts
import type { FitResult } from './fit'
import { paperLabel } from './sheet'
import type { Orientation, PaperSize, Scale } from './types'

/** Todos los textos fijos del diálogo "Exportar plano" y del PDF: castellano neutro con tuteo y sin lenguaje técnico. */
export const TEXT = {
  title: 'Exportar plano',
  subtitle: 'PDF con escala, cotas y cajetín listo para imprimir.',
  paper: 'Hoja',
  orientation: 'Orientación',
  landscape: 'Apaisada',
  portrait: 'Vertical',
  suggested: 'Sugerida',
  scale: 'Escala',
  mode: 'Modo',
  modePaper: 'Papel',
  modePaperHint: 'Blanco y negro, para imprimir',
  modeColor: 'Color',
  modeColorHint: 'Ambientes y materiales, para presentar',
  levels: 'Plantas',
  emptyLevel: '(vacía)',
  titleBlock: 'Incluir cajetín',
  titleBlockHint: 'Proyecto, escala, fecha y autor',
  cancel: 'Cancelar',
  close: 'Cerrar',
  download: 'Descargar PDF',
  measuring: 'Midiendo tu proyecto…',
  updatingPreview: 'Actualizando la vista previa…',
  previewUnavailable: 'No pudimos mostrar la vista previa, pero puedes descargar el PDF igual.',
  previewLabel: 'Vista previa',
  previewAlt: 'Vista previa de la hoja del plano con el cajetín y el norte',
  previousLevel: 'Planta anterior',
  nextLevel: 'Planta siguiente',
  levelsMin: 'Tiene que quedar al menos una planta marcada.',
  emptyLevelHint: 'Esta planta no tiene nada dibujado.',
  suggestedHint: 'Es la que permite la escala más grande.',
  errors: {
    nothing: 'Aún no hay nada que dibujar. Traza muros o ambientes y vuelve a intentarlo.',
    failed: 'No pudimos generar el PDF. Inténtalo de nuevo.',
    cancelled: 'Cancelaste la exportación.',
  },
  pdf: {
    project: 'Proyecto',
    level: 'Planta',
    scale: 'Escala',
    date: 'Fecha',
    author: 'Autor',
    north: 'N',
    legend: 'Leyenda',
    noZones: 'Sin ambientes dibujados',
    floor: 'Piso',
    titleSuffix: 'planos',
    creator: 'Madori',
  },
} as const

export const generatingText = (done: number, total: number): string => `Generando planta ${done} de ${total}…`

/** "Cabe en la hoja · usa 64 % del ancho". */
export function fitSummary(result: FitResult): string {
  return `Cabe en la hoja · usa ${result.percent} % del ${result.axis === 'width' ? 'ancho' : 'alto'}`
}

export const scaleText = (scale: Scale): string => `1:${scale}`

/** El motivo por el que una escala está deshabilitada, con el mejor ajuste si lo hay. */
export function scaleDisabledReason(scale: Scale, paper: PaperSize, result: FitResult, best: Scale | null): string {
  const width = result.axis === 'width'
  const needed = Math.round(width ? result.neededMm.width : result.neededMm.height)
  const usable = Math.round(width ? result.usableMm.width : result.usableMm.height)
  const base = `${scaleText(scale)} no cabe en ${paper}: necesita ${needed} mm de ${width ? 'ancho' : 'alto'} y la hoja ofrece ${usable} mm.`
  return best === null ? base : `${base} Mejor ajuste: ${scaleText(best)}.`
}

/** Cuando ninguna escala cabe: el edificio no cabe ni a 1:100. */
export function noFitMessage(paper: PaperSize): string {
  const way = paper === 'A4' ? 'Prueba con A3' : 'Prueba con otra orientación'
  return `El proyecto no cabe en esta hoja ni a 1:100. ${way} o quita plantas.`
}

export function skippedImagesText(count: number): string {
  return count === 1
    ? 'No se pudo dibujar 1 mueble; el resto del plano sí está en el PDF.'
    : `No se pudieron dibujar ${count} muebles; el resto del plano sí está en el PDF.`
}

export const sheetOf = (n: number, total: number): string => `Hoja ${n} de ${total}`

export function previewCaption(paper: PaperSize, orientation: Orientation, widthMm: number, heightMm: number, scale: Scale): string {
  return `Vista previa · ${paperLabel(paper, orientation)} (${widthMm} × ${heightMm} mm) · ${scaleText(scale)}`
}

/** Paginador de la vista previa: "Planta baja · 1 de 2". */
export const levelPagerText = (label: string, index: number, total: number): string => `${label} · ${index + 1} de ${total}`

/** Última fila de una leyenda que no entra. */
export const moreText = (count: number): string => `y ${count} más`

/** Título del documento PDF: "Casa Alvear — planos". */
export const projectTitle = (name: string): string => `${name} — ${TEXT.pdf.titleSuffix}`
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-texts`
Expected: PASS (7 pruebas).

Si el barrido de inglés marca una palabra de `TEXT`, reescribe el texto en castellano: el barrido es la regla, no la lista.

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/lib/export/texts-es.ts apps/web/test/export-texts.test.ts
git commit -m "feat(plano): textos del diálogo y del PDF en castellano con barrido de palabras en inglés" -- apps/web/src/lib/export/texts-es.ts apps/web/test/export-texts.test.ts
```

---

### Task 7b: Reparto de caracteres entre las fuentes (DM Sans latina y latina extendida)

**Files:**
- Create: `apps/web/src/lib/export/font-coverage.ts`
- Test: `apps/web/test/export-font-coverage.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces en `@/lib/export/font-coverage`: `Face = 'latin' | 'ext'`, `Run = { face: Face; text: string }`, `faceFor(codePoint): Face | null`, `splitRuns(text, faces?): Run[]` (reparte un texto entre la DM Sans latina y la latina extendida; lo que ninguna tiene sale como `?`; con `['latin']`, el respaldo Helvetica, lo extendido también sale `?`).

**Cubre el criterio 12** y el caso 4 de Review Focus: un nombre de proyecto con "ő" o "Ł" no sale roto en el cajetín (cada tramo se dibuja con el archivo de DM Sans que trae su letra).

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/export-font-coverage.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { faceFor, splitRuns } from '../src/lib/export/font-coverage'

describe('reparto de caracteres entre DM Sans latina y latina extendida', () => {
  it('el castellano completo es latino', () => {
    expect(splitRuns('Ñandú — año 1:50 · 12 de octubre ¿sí? ¡ya!')).toEqual([{ face: 'latin', text: 'Ñandú — año 1:50 · 12 de octubre ¿sí? ¡ya!' }])
  })

  it('"Łódź" y "ő" van a la extendida y lo demás a la latina', () => {
    expect(splitRuns('Łódź')).toEqual([
      { face: 'ext', text: 'Ł' },
      { face: 'latin', text: 'ód' },
      { face: 'ext', text: 'ź' },
    ])
    expect(splitRuns('Győr')).toEqual([
      { face: 'latin', text: 'Gy' },
      { face: 'ext', text: 'ő' },
      { face: 'latin', text: 'r' },
    ])
  })

  it('un carácter que ninguna fuente tiene sale como "?" (emoji, escritura no latina, controles)', () => {
    expect(splitRuns('Casa 🏠')).toEqual([{ face: 'latin', text: 'Casa ?' }])
    expect(splitRuns('日本')).toEqual([{ face: 'latin', text: '??' }])
    expect(splitRuns('a\u0000b\tc')).toEqual([{ face: 'latin', text: 'a?b?c' }])
  })

  it('con solo la fuente latina (respaldo Helvetica) lo extendido sale como "?"', () => {
    expect(splitRuns('Łódź', ['latin'])).toEqual([{ face: 'latin', text: '?ód?' }])
  })

  it('un texto vacío no tiene tramos', () => {
    expect(splitRuns('')).toEqual([])
  })

  it('faceFor en los bordes', () => {
    expect(faceFor(0x20)).toBe('latin')
    expect(faceFor(0x7f)).toBeNull()
    expect(faceFor(0xe1)).toBe('latin')
    expect(faceFor(0x2014)).toBe('latin')
    expect(faceFor(0x141)).toBe('ext')
    expect(faceFor(0x1e9e)).toBe('ext')
    expect(faceFor(0x4e00)).toBeNull()
    expect(faceFor(0x1f3e0)).toBeNull()
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-font-coverage`
Expected: FAIL — `Cannot find module '../src/lib/export/font-coverage'`.

- [ ] **Paso 2: Escribir el reparto de caracteres**

Create `apps/web/src/lib/export/font-coverage.ts`:

```ts
export type Face = 'latin' | 'ext'
export type Run = { face: Face; text: string }

type Range = readonly [number, number]

/** `unicode-range` de los archivos `latin` y `latin-ext` de DM Sans (los de Google Fonts, que copia @fontsource). */
const LATIN: readonly Range[] = [
  [0x0000, 0x00ff], [0x0131, 0x0131], [0x0152, 0x0153], [0x02bb, 0x02bc], [0x02c6, 0x02c6], [0x02da, 0x02da],
  [0x02dc, 0x02dc], [0x0304, 0x0304], [0x0308, 0x0308], [0x0329, 0x0329], [0x2000, 0x206f], [0x20ac, 0x20ac],
  [0x2122, 0x2122], [0x2191, 0x2191], [0x2193, 0x2193], [0x2212, 0x2212], [0x2215, 0x2215], [0xfeff, 0xfeff],
  [0xfffd, 0xfffd],
]
const EXT: readonly Range[] = [
  [0x0100, 0x02ba], [0x02bd, 0x02c5], [0x02c7, 0x02cc], [0x02ce, 0x02d7], [0x02dd, 0x02ff], [0x0304, 0x0304],
  [0x0308, 0x0308], [0x0329, 0x0329], [0x1d00, 0x1dbf], [0x1e00, 0x1e9f], [0x1ef2, 0x1eff], [0x2020, 0x2020],
  [0x20a0, 0x20ab], [0x20ad, 0x20c0], [0x2113, 0x2113], [0x2c60, 0x2c7f], [0xa720, 0xa7ff],
]

const inRanges = (ranges: readonly Range[], codePoint: number) => ranges.some(([low, high]) => codePoint >= low && codePoint <= high)

/** Qué archivo de DM Sans trae ese carácter, o `null` si ninguno (controles, emoji, escrituras no latinas). */
export function faceFor(codePoint: number): Face | null {
  if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint < 0xa0)) return null
  if (inRanges(LATIN, codePoint)) return 'latin'
  if (inRanges(EXT, codePoint)) return 'ext'
  return null
}

/**
 * Reparte un texto en tramos de una sola fuente cada uno. Lo que ninguna fuente permitida tiene sale como "?" (mejor que
 * un cuadro vacío). `faces` limita las fuentes disponibles: con `['latin']` (respaldo Helvetica) lo extendido sale "?".
 */
export function splitRuns(text: string, faces: readonly Face[] = ['latin', 'ext']): Run[] {
  const runs: Run[] = []
  for (const char of text) {
    let face = faceFor(char.codePointAt(0) ?? 0)
    let value = char
    if (face === null || !faces.includes(face)) {
      face = 'latin'
      value = '?'
    }
    const last = runs.at(-1)
    if (last && last.face === face) last.text += value
    else runs.push({ face, text: value })
  }
  return runs
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-font-coverage`
Expected: PASS (6 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/lib/export/font-coverage.ts apps/web/test/export-font-coverage.test.ts
git commit -m "feat(plano): reparto de caracteres entre DM Sans latina y latina extendida" -- apps/web/src/lib/export/font-coverage.ts apps/web/test/export-font-coverage.test.ts
```

---

### Task 8: DM Sans para el PDF (archivos con licencia OFL, versión y origen anotados) y su carga

**Files:**
- Create: `apps/web/scripts/vendor-pdf-fonts.mjs`, `apps/web/public/fonts/pdf/DMSans-latin-400.woff`, `…/DMSans-latin-700.woff`, `…/DMSans-latin-ext-400.woff`, `…/DMSans-latin-ext-700.woff`, `…/OFL.txt`, `…/FUENTES.txt` (los seis últimos los genera el script), `apps/web/src/lib/export/font-files.ts`, `apps/web/src/editor/export/pdf-fonts.ts`
- Modify: `apps/web/package.json` (script `fonts:pdf`)
- Test: `apps/web/test/export-pdf-fonts.test.ts`

**Interfaces:**
- Consumes: `Face` (Tarea 7b); `@fontsource/dm-sans` 5.3.0 (Tarea 0c).
- Produces:
  - `@/lib/export/font-files`: `FontKey = 'latin-400' | 'latin-700' | 'ext-400' | 'ext-700'`, `FONT_FILES: Record<FontKey, string>` (rutas públicas `/fonts/pdf/DMSans-….woff`), `fontKey(face: Face, bold: boolean): FontKey`.
  - `@/editor/export/pdf-fonts`: `PdfFontBytes = Record<FontKey, ArrayBuffer>`, `loadPdfFonts(fetcher?: typeof fetch): Promise<PdfFontBytes>` (descarga una sola vez y guarda la promesa; si falla, la próxima llamada vuelve a intentar).

**Cubre el criterio 12** (DM Sans incrustada) y la nota de licencia de la tabla de riesgos del spec ("`public/fonts/pdf/OFL.txt`"). DM Sans es de Colophon Foundry y Google, licencia SIL Open Font License 1.1: se puede copiar y embeber si el texto de la licencia viaja con los archivos.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/export-pdf-fonts.test.ts`:

```ts
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { loadPdfFonts } from '../src/editor/export/pdf-fonts'
import { FONT_FILES, type FontKey, fontKey } from '../src/lib/export/font-files'

const publicPath = (url: string) => fileURLToPath(new URL(`../public${url}`, import.meta.url))

describe('DM Sans para el PDF (criterio 12)', () => {
  it('las cuatro variantes existen, son woff y pesan lo razonable', () => {
    for (const [key, url] of Object.entries(FONT_FILES)) {
      const path = publicPath(url)
      expect(existsSync(path), key).toBe(true)
      expect(readFileSync(path).subarray(0, 4).toString('latin1'), key).toBe('wOFF')
      expect(statSync(path).size, key).toBeGreaterThan(5_000)
      expect(statSync(path).size, key).toBeLessThan(200_000)
    }
  })

  it('la licencia OFL viaja con los archivos y FUENTES.txt anota versión, origen y huella de cada uno', () => {
    const ofl = readFileSync(publicPath('/fonts/pdf/OFL.txt'), 'utf8')
    expect(ofl).toMatch(/SIL OPEN FONT LICENSE Version 1\.1/i)
    const sources = readFileSync(publicPath('/fonts/pdf/FUENTES.txt'), 'utf8')
    expect(sources).toContain('@fontsource/dm-sans')
    expect(sources).toContain('5.3.0')
    for (const url of Object.values(FONT_FILES)) {
      const name = url.split('/').at(-1) ?? ''
      const sha = createHash('sha256').update(readFileSync(publicPath(url))).digest('hex')
      expect(sources, name).toContain(`${name}  sha256 ${sha}`)
    }
  })

  it('fontKey elige el archivo por tramo y peso', () => {
    expect(fontKey('latin', false)).toBe('latin-400')
    expect(fontKey('latin', true)).toBe('latin-700')
    expect(fontKey('ext', false)).toBe('ext-400')
    expect(fontKey('ext', true)).toBe('ext-700')
  })
})

describe('loadPdfFonts', () => {
  const body = (key: string) => new TextEncoder().encode(key)

  it('descarga las cuatro variantes una sola vez y las reparte por clave', async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const key = (Object.entries(FONT_FILES).find(([, file]) => file === String(url)) ?? ['?'])[0]
      return new Response(body(key), { status: 200 })
    })
    // El estado de caché es del módulo: se prueba con un módulo recién importado.
    vi.resetModules()
    const { loadPdfFonts: load } = await import('../src/editor/export/pdf-fonts')
    const first = await load(fetcher as unknown as typeof fetch)
    const second = await load(fetcher as unknown as typeof fetch)
    expect(fetcher).toHaveBeenCalledTimes(4)
    expect(Object.keys(first).sort()).toEqual(['ext-400', 'ext-700', 'latin-400', 'latin-700'])
    expect(second).toBe(first)
    expect(new TextDecoder().decode(first['latin-700' as FontKey])).toBe('latin-700')
  })

  it('si una descarga falla, el error sale y la próxima llamada vuelve a intentar', async () => {
    vi.resetModules()
    const { loadPdfFonts: load } = await import('../src/editor/export/pdf-fonts')
    const broken = vi.fn(async () => new Response('no', { status: 404 }))
    await expect(load(broken as unknown as typeof fetch)).rejects.toThrow(/404/)
    const working = vi.fn(async () => new Response(body('x'), { status: 200 }))
    await expect(load(working as unknown as typeof fetch)).resolves.toBeDefined()
    expect(working).toHaveBeenCalledTimes(4)
  })

  it('exporta la función que usan las demás tareas', () => {
    expect(typeof loadPdfFonts).toBe('function')
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-pdf-fonts`
Expected: FAIL — `Cannot find module '../src/editor/export/pdf-fonts'` (y `font-files`).

- [ ] **Paso 2: Escribir el script que copia los archivos**

Create `apps/web/scripts/vendor-pdf-fonts.mjs`:

```js
// Copia DM Sans (latin y latin-ext, pesos 400 y 700, woff) desde @fontsource/dm-sans a public/fonts/pdf/, con su licencia OFL
// y un FUENTES.txt con versión, origen y huella de cada archivo. Uso: pnpm --filter @interiores/web fonts:pdf
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const packageDir = join(root, 'node_modules/@fontsource/dm-sans')
const target = join(root, 'public/fonts/pdf')
const FILES = [
  ['dm-sans-latin-400-normal.woff', 'DMSans-latin-400.woff'],
  ['dm-sans-latin-700-normal.woff', 'DMSans-latin-700.woff'],
  ['dm-sans-latin-ext-400-normal.woff', 'DMSans-latin-ext-400.woff'],
  ['dm-sans-latin-ext-700-normal.woff', 'DMSans-latin-ext-700.woff'],
]

for (const required of [join(packageDir, 'package.json'), join(packageDir, 'LICENSE'), ...FILES.map(([from]) => join(packageDir, 'files', from))]) {
  if (!existsSync(required)) {
    console.error(`No encuentro ${required}. Corre pnpm install y mira node_modules/@fontsource/dm-sans/files para los nombres reales.`)
    process.exit(1)
  }
}
const { version } = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
mkdirSync(target, { recursive: true })
const lines = []
for (const [from, to] of FILES) {
  const source = join(packageDir, 'files', from)
  copyFileSync(source, join(target, to))
  const sha = createHash('sha256').update(readFileSync(source)).digest('hex')
  lines.push(`${to}  sha256 ${sha}  (origen: files/${from})`)
}
copyFileSync(join(packageDir, 'LICENSE'), join(target, 'OFL.txt'))
writeFileSync(
  join(target, 'FUENTES.txt'),
  [
    'DM Sans (Colophon Foundry y Google), licencia SIL Open Font License 1.1 (ver OFL.txt, que debe viajar con los archivos).',
    `Origen: paquete npm @fontsource/dm-sans versión ${version} (https://www.npmjs.com/package/@fontsource/dm-sans), carpeta files/.`,
    'Variantes: latin y latin-ext, pesos 400 y 700, formato woff.',
    'Generado por apps/web/scripts/vendor-pdf-fonts.mjs (pnpm --filter @interiores/web fonts:pdf). No editar a mano.',
    '',
    ...lines,
    '',
  ].join('\n'),
)
console.log(`DM Sans ${version} copiada a public/fonts/pdf (${FILES.length} archivos, OFL.txt y FUENTES.txt)`)
```

Modify `apps/web/package.json`:

```diff
     "assets:vendor": "node scripts/vendor-pascal-assets.mjs",
+    "fonts:pdf": "node scripts/vendor-pdf-fonts.mjs",
```

Run: `pnpm --filter @interiores/web fonts:pdf && ls apps/web/public/fonts/pdf`
Expected: `DM Sans 5.3.0 copiada a public/fonts/pdf (4 archivos, OFL.txt y FUENTES.txt)` y la lista con los cuatro `DMSans-*.woff`, `FUENTES.txt` y `OFL.txt`.

- [ ] **Paso 3: Escribir la lista de archivos y el cargador**

Create `apps/web/src/lib/export/font-files.ts`:

```ts
import type { Face } from './font-coverage'

export type FontKey = `${Face}-${400 | 700}`

/** Rutas públicas de DM Sans para el PDF (`public/fonts/pdf/`, ver FUENTES.txt y OFL.txt). */
export const FONT_FILES: Record<FontKey, string> = {
  'latin-400': '/fonts/pdf/DMSans-latin-400.woff',
  'latin-700': '/fonts/pdf/DMSans-latin-700.woff',
  'ext-400': '/fonts/pdf/DMSans-latin-ext-400.woff',
  'ext-700': '/fonts/pdf/DMSans-latin-ext-700.woff',
}

export const fontKey = (face: Face, bold: boolean): FontKey => `${face}-${bold ? 700 : 400}` as FontKey
```

Create `apps/web/src/editor/export/pdf-fonts.ts`:

```ts
import { FONT_FILES, type FontKey } from '@/lib/export/font-files'

export type PdfFontBytes = Record<FontKey, ArrayBuffer>

let cached: Promise<PdfFontBytes> | null = null

async function download(fetcher: typeof fetch): Promise<PdfFontBytes> {
  const entries = await Promise.all(
    (Object.entries(FONT_FILES) as [FontKey, string][]).map(async ([key, url]) => {
      const response = await fetcher(url)
      if (!response.ok) throw new Error(`No se pudo cargar la fuente ${url} (${response.status})`)
      return [key, await response.arrayBuffer()] as const
    }),
  )
  return Object.fromEntries(entries) as PdfFontBytes
}

/** Las cuatro variantes de DM Sans, descargadas una sola vez. Si la descarga falla, la próxima llamada vuelve a intentar. */
export function loadPdfFonts(fetcher: typeof fetch = fetch): Promise<PdfFontBytes> {
  cached ??= download(fetcher).catch((error) => {
    cached = null
    throw error
  })
  return cached
}
```

- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-pdf-fonts`
Expected: PASS (6 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos (`public/` está excluida de Biome).

- [ ] **Paso 5: Commit**

```bash
git add apps/web/scripts/vendor-pdf-fonts.mjs apps/web/public/fonts/pdf apps/web/src/lib/export/font-files.ts apps/web/src/editor/export/pdf-fonts.ts apps/web/package.json apps/web/test/export-pdf-fonts.test.ts
git commit -m "feat(plano): DM Sans para el PDF con licencia OFL, versión y origen anotados" -- apps/web/scripts/vendor-pdf-fonts.mjs apps/web/public/fonts/pdf apps/web/src/lib/export/font-files.ts apps/web/src/editor/export/pdf-fonts.ts apps/web/package.json apps/web/test/export-pdf-fonts.test.ts
```

---

### Task 9: Logotipo vectorial con letras (a partir de `brand.ts` y de Fraunces 700)

**Files:**
- Create: `apps/web/scripts/build-brand-paths.ts`, `apps/web/src/lib/export/brand-paths.ts` (generado), `apps/web/public/brand/madori-logotipo.svg` (generado)
- Modify: `apps/web/package.json` (script `brand:build`)
- Test: `apps/web/test/export-brand-paths.test.ts`

**Interfaces:**
- Consumes: `WINDOW`, `BRAND` de `@/lib/brand`; `fontkit` 2.0.4 y `@fontsource-variable/fraunces` 5.3.0 (Tarea 0c).
- Produces:
  - `@/lib/export/brand-paths`: `LOGO = { box: { minX; minY; width; height }, letters: [string, string], window: { x; y; width; height } }` (unidades: 1000 = 1 em; `y` hacia abajo; la línea de base es `y = 0`; `letters[0]` es "Mad", `letters[1]` es "ri"; `window` es la caja donde va la ventana en lugar de la "o").
  - `apps/web/scripts/build-brand-paths.ts`: `buildLogo(fontFile: string): Logo`, `renderModule(logo): string`, `renderSvg(logo): string`, `FRAUNCES_FILE`.

El logotipo son las letras de Madori en Fraunces 700 (suavidad 100) convertidas a contornos **una sola vez** por este script, con la "o" reemplazada por la ventana de `WINDOW` y el sol, en la caja medida contra la "o" real (alto 0,479 em y ancho 0,5 em a 150 px, `Logo.css`). El PDF no incrusta Fraunces (D8): dibuja estos caminos.

- [ ] **Paso 1: Confirmar el archivo de la fuente (M12)**

Run: `ls apps/web/node_modules/@fontsource-variable/fraunces/files | grep -i "latin-full-normal"`
Expected: `fraunces-latin-full-normal.woff2` (la variable con los ejes `wght`, `opsz`, `SOFT` y `WONK`). Si el nombre es otro, cámbialo en `FRAUNCES_FILE` del script y de la prueba.

**Rama de respaldo:** si `fontkit` no abre el `woff2` o la fuente no trae `SOFT`, usa el `woff` estático `@fontsource/fraunces` 700 (sin suavidad), agrégalo como `devDependency` exacta y anótalo en `docs/nombre-y-marca.md` ("el logotipo del PDF usa Fraunces 700 sin SOFT").

- [ ] **Paso 2: Escribir la prueba (rojo)**

Create `apps/web/test/export-brand-paths.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { BRAND, WINDOW } from '../src/lib/brand'
import { LOGO } from '../src/lib/export/brand-paths'
import { FRAUNCES_FILE, buildLogo, renderModule, renderSvg } from '../scripts/build-brand-paths'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))
const read = (path: string) => readFileSync(here(path), 'utf8').replace(/\r\n/g, '\n')

describe('logotipo vectorial (criterio 11: sin imágenes)', () => {
  it('tiene dos tramos de letras (Mad y ri) hechos solo de caminos', () => {
    expect(LOGO.letters).toHaveLength(2)
    for (const d of LOGO.letters) {
      expect(d.startsWith('M')).toBe(true)
      expect(d).toMatch(/^[MLQCZ0-9.\-\s]+$/)
      expect(d).not.toMatch(/NaN|undefined|Infinity/)
    }
  })

  it('la caja de la ventana mide 0,5 × 0,479 em y queda entre "Mad" y "ri"', () => {
    expect(LOGO.window.width).toBe(500)
    expect(LOGO.window.height).toBe(479)
    expect(LOGO.window.y).toBe(-465)
    expect(LOGO.window.x).toBeGreaterThan(1000)
    expect(LOGO.box.minX).toBeLessThanOrEqual(LOGO.window.x)
    expect(LOGO.box.minX + LOGO.box.width).toBeGreaterThanOrEqual(LOGO.window.x + LOGO.window.width)
  })

  it('el logotipo mide entre 2 y 4 em de ancho y entre 0,6 y 1,3 em de alto', () => {
    expect(LOGO.box.width).toBeGreaterThan(2000)
    expect(LOGO.box.width).toBeLessThan(4000)
    expect(LOGO.box.height).toBeGreaterThan(600)
    expect(LOGO.box.height).toBeLessThan(1300)
  })

  it('el módulo y el SVG commiteados son exactamente lo que genera el script desde Fraunces', () => {
    const logo = buildLogo(here(`../${FRAUNCES_FILE}`))
    expect(read('../src/lib/export/brand-paths.ts')).toBe(renderModule(logo))
    expect(read('../public/brand/madori-logotipo.svg')).toBe(renderSvg(logo))
  })

  it('el SVG usa la ventana y los colores de la marca y no trae imágenes ni texto', () => {
    const svg = read('../public/brand/madori-logotipo.svg')
    expect(svg).toContain(WINDOW.frame)
    expect(svg).toContain(BRAND.noche)
    expect(svg).toContain(BRAND.sol)
    expect(svg).not.toMatch(/<image|<text|font-family/)
    expect(svg).toMatch(/viewBox="-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+"/)
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-brand-paths`
Expected: FAIL — `Cannot find module '../scripts/build-brand-paths'`.

- [ ] **Paso 3: Escribir el script**

Create `apps/web/scripts/build-brand-paths.ts`:

```ts
// Convierte "Mad" y "ri" en Fraunces 700 (SOFT 100) a contornos y reserva la caja de la "o" para la ventana de Madori.
// Uso: pnpm --filter @interiores/web brand:build   (escribe src/lib/export/brand-paths.ts y public/brand/madori-logotipo.svg)
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import * as fontkitNamespace from 'fontkit'
import { BRAND, WINDOW } from '../src/lib/brand'

// Según cómo lo cargue Node (CJS o ESM), `openSync` cuelga del espacio de nombres o de `default`.
const fontkit = (fontkitNamespace as unknown as { default?: typeof fontkitNamespace }).default ?? fontkitNamespace

type Command = { command: 'moveTo' | 'lineTo' | 'quadraticCurveTo' | 'bezierCurveTo' | 'closePath'; args: number[] }
type FontLike = {
  unitsPerEm: number
  getVariation(axes: Record<string, number>): FontLike
  layout(text: string): {
    glyphs: { path: { commands: Command[] } }[]
    positions: { xAdvance: number; xOffset: number; yOffset: number }[]
  }
}

export type Logo = {
  box: { minX: number; minY: number; width: number; height: number }
  letters: [string, string]
  window: { x: number; y: number; width: number; height: number }
}

export const FRAUNCES_FILE = 'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2'
/** Los ejes del logotipo: 700, suavidad al máximo y el tamaño óptico de 150 px (el de la medición de `Logo.css`). */
const AXES = { wght: 700, SOFT: 100, opsz: 144, WONK: 0 }
/** Tracking de -0,02 em, en unidades de 1000 por em. */
const TRACKING = -20
/** Caja de la ventana medida contra la "o" real a 150 px (`Logo.css`): 0,5 em de ancho, 0,479 de alto y 0,014 por debajo de la línea de base. */
const SLOT = { width: 500, height: 479, below: 14, marginLeft: 8, marginRight: -10 }
const LETTER: Record<Command['command'], string> = { moveTo: 'M', lineTo: 'L', quadraticCurveTo: 'Q', bezierCurveTo: 'C', closePath: 'Z' }

const round = (value: number) => Number(value.toFixed(1))
const fixed = (value: number) => Number(value.toFixed(4))

function runPath(font: FontLike, text: string, startX: number) {
  const unit = 1000 / font.unitsPerEm
  const run = font.layout(text)
  let x = startX
  let d = ''
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  run.glyphs.forEach((glyph, index) => {
    const position = run.positions[index]
    const originX = x + (position?.xOffset ?? 0) * unit
    const originY = (position?.yOffset ?? 0) * unit
    for (const { command, args } of glyph.path.commands) {
      const numbers: string[] = []
      for (let i = 0; i < args.length; i += 2) {
        const px = originX + (args[i] ?? 0) * unit
        const py = -((args[i + 1] ?? 0) * unit + originY)
        minX = Math.min(minX, px)
        maxX = Math.max(maxX, px)
        minY = Math.min(minY, py)
        maxY = Math.max(maxY, py)
        numbers.push(String(round(px)), String(round(py)))
      }
      d += `${LETTER[command]}${numbers.join(' ')}`
    }
    x += (position?.xAdvance ?? 0) * unit + TRACKING
  })
  return { d, end: x, minX, maxX, minY, maxY }
}

export function buildLogo(fontFile: string): Logo {
  const font = (fontkit.openSync(fontFile) as unknown as FontLike).getVariation(AXES)
  const first = runPath(font, 'Mad', 0)
  const slotX = first.end + SLOT.marginLeft
  const second = runPath(font, 'ri', slotX + SLOT.width + SLOT.marginRight)
  const windowTop = SLOT.below - SLOT.height
  const minX = Math.min(first.minX, slotX)
  const maxX = Math.max(second.maxX, slotX + SLOT.width)
  const minY = Math.min(first.minY, second.minY, windowTop)
  const maxY = Math.max(first.maxY, second.maxY, SLOT.below)
  return {
    box: { minX: round(minX), minY: round(minY), width: round(maxX - minX), height: round(maxY - minY) },
    letters: [first.d, second.d],
    window: { x: round(slotX), y: windowTop, width: SLOT.width, height: SLOT.height },
  }
}

export function renderModule(logo: Logo): string {
  return [
    '// GENERADO por apps/web/scripts/build-brand-paths.ts (pnpm --filter @interiores/web brand:build) desde Fraunces 700 (SOFT 100, opsz 144).',
    '// No editar a mano: lo vigila test/export-brand-paths.test.ts.',
    '// Unidades: 1000 = 1 em; y hacia abajo; la línea de base es y = 0. letters = "Mad" y "ri"; window = caja de la ventana (la "o").',
    `export const LOGO = ${JSON.stringify(logo, null, 2)} as const`,
    '',
  ].join('\n')
}

export function renderSvg(logo: Logo): string {
  const pad = 20
  const view = [logo.box.minX - pad, logo.box.minY - pad, logo.box.width + 2 * pad, logo.box.height + 2 * pad].map(round).join(' ')
  const { window: slot } = logo
  const paths = logo.letters.map((d) => `  <path d="${d}" fill="${BRAND.noche}"/>`).join('\n')
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" role="img" aria-label="Madori">`,
    '  <title>Madori</title>',
    paths,
    `  <g transform="translate(${slot.x} ${slot.y}) scale(${fixed(slot.width / 64)} ${fixed(slot.height / 64)})">`,
    `    <path d="${WINDOW.frame}" fill="none" stroke="${BRAND.noche}" stroke-width="${WINDOW.strokeWidth}" stroke-linejoin="round"/>`,
    `    <circle cx="${WINDOW.sun.cx}" cy="${WINDOW.sun.cy}" r="${WINDOW.sun.r}" fill="${BRAND.sol}"/>`,
    '  </g>',
    '</svg>',
    '',
  ].join('\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.cwd()
  const logo = buildLogo(join(root, FRAUNCES_FILE))
  const moduleFile = join(root, 'src/lib/export/brand-paths.ts')
  const svg = join(root, 'public/brand/madori-logotipo.svg')
  mkdirSync(dirname(svg), { recursive: true })
  writeFileSync(moduleFile, renderModule(logo))
  writeFileSync(svg, renderSvg(logo))
  console.log(`Logotipo generado: caja ${logo.box.width} × ${logo.box.height}, ventana en x=${logo.window.x}`)
}
```

Modify `apps/web/package.json`:

```diff
     "fonts:pdf": "node scripts/vendor-pdf-fonts.mjs",
+    "brand:build": "tsx scripts/build-brand-paths.ts",
```

- [ ] **Paso 4: Generar los archivos**

Run: `pnpm --filter @interiores/web brand:build`
Expected: `Logotipo generado: caja <entre 2000 y 4000> × <entre 600 y 1300>, ventana en x=<más de 1000>` y dos archivos nuevos: `apps/web/src/lib/export/brand-paths.ts` y `apps/web/public/brand/madori-logotipo.svg`.

Mira el SVG una vez (ábrelo en el navegador o `Read` de la imagen exportada): debe leerse "Madori" con la "o" como ventana con el sol, **igual que el logotipo de la pantalla de ingreso**. Si las letras salen sin suavidad o la ventana no encaja entre la "d" y la "r" (hueco distinto al de las otras letras), ajusta `marginLeft`/`marginRight` de `SLOT` en pasos de 5 y vuelve a generar; el hueco es el de dos letras vecinas.

- [ ] **Paso 5: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-brand-paths brand`
Expected: PASS (`export-brand-paths`: 5 pruebas y las de `brand.test.ts`).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos. Si Biome marca `brand-paths.ts` (cadenas largas), no lo toques: agrega `"!apps/web/src/lib/export/brand-paths.ts"` a `files.includes` de `biome.json`.

- [ ] **Paso 6: Commit**

```bash
git add apps/web/scripts/build-brand-paths.ts apps/web/src/lib/export/brand-paths.ts apps/web/public/brand/madori-logotipo.svg apps/web/package.json apps/web/test/export-brand-paths.test.ts
git commit -m "feat(plano): logotipo vectorial de Madori con letras en Fraunces 700 y la o como ventana" -- apps/web/scripts/build-brand-paths.ts apps/web/src/lib/export/brand-paths.ts apps/web/public/brand/madori-logotipo.svg apps/web/package.json apps/web/test/export-brand-paths.test.ts
```

---

### Task 10a: Los dibujantes de la hoja (1 de 3): la superficie, el norte, la escala gráfica y la leyenda

**Files:**
- Create: `apps/web/src/lib/export/surface.ts`, `apps/web/src/lib/export/draw-band.ts`, `apps/web/test/support/recording-surface.ts`
- Test: `apps/web/test/export-draw-band.test.ts`

**Interfaces:**
- Consumes: `BoxMm`, `mmToPt` (Tarea 1); `LEGEND_ROW_MM`, `LEGEND_TITLE_MM` (Tarea 6); `pickScaleBar` (Tarea 4); `LegendEntry`, `LegendView` (Tarea 4); `fitText` (Tarea 3); `TEXT`, `moreText`, `scaleText` (Tarea 7a); `BRAND`; `formatArea` de `@/lib/format`.
- Produces:
  - `@/lib/export/surface`: `Paint = 'stroke' | 'fill' | 'both'`; `TextStyle = { size: number; bold?: boolean; color: string; align?: 'left' | 'center' | 'right' }`; `Transform = { tx; ty; sx; sy }`; `PdfSurface` (`strokeColor`, `fillColor`, `lineWidth`, `rect`, `line`, `path(d, paint, rule?)`, `circle`, `polygon`, `text(value, x, baselineY, style)`, `widthOf(value, size, bold)`, `withTransform(transform, draw)`; **todo en puntos**, origen arriba a la izquierda); `Palette = { ink; soft; sun: string | null; blank }`; `paletteFor(mode: PlanMode): Palette`.
  - `@/lib/export/draw-band`: `drawNorth(surface, box, palette)`, `drawScaleBar(surface, box, scale, palette)`, `drawLegend(surface, box, view, cols, rows, palette)` y `legendLabel(entry)`; todos reciben la caja en **mm** y dibujan en puntos.
  - `test/support/recording-surface`: `createRecorder()` devuelve `{ surface, calls, texts, widthOf }` y `colorsUsed(recorder)`.

**Cubre el criterio 6** (la barra de escala gráfica mide lo que dice: 2 m = 40,0 mm a 1:50) y la regla de leyenda de Silvert ("y N más" como última fila dentro del cajetín), y el caso 1 de Review Focus (leyenda sin ambientes). La barra nunca pasa del borde de su caja: se elige con `maxMm = ancho de la caja - 5`.

- [ ] **Paso 1: Escribir el doble que registra lo que se dibuja**

Create `apps/web/test/support/recording-surface.ts`:

```ts
import type { PdfSurface, TextStyle } from '../../src/lib/export/surface'

export type Call = { op: string; args: unknown[]; depth: number }
export type RecordedText = { value: string; x: number; y: number; style: TextStyle; depth: number }

/** Una superficie de mentira que anota cada dibujo. `depth` cuenta las transformaciones abiertas (el logotipo dibuja en sus propias unidades). */
export function createRecorder() {
  const calls: Call[] = []
  const texts: RecordedText[] = []
  let depth = 0
  const log = (op: string, ...args: unknown[]) => {
    calls.push({ op, args, depth })
  }
  const widthOf = (value: string, size: number, bold: boolean) => [...value].length * size * (bold ? 0.58 : 0.5)
  const surface: PdfSurface = {
    strokeColor: (color) => log('strokeColor', color),
    fillColor: (color) => log('fillColor', color),
    lineWidth: (width) => log('lineWidth', width),
    rect: (x, y, width, height, paint) => log('rect', x, y, width, height, paint),
    line: (x1, y1, x2, y2) => log('line', x1, y1, x2, y2),
    path: (d, paint, rule) => log('path', d, paint, rule),
    circle: (cx, cy, r, paint) => log('circle', cx, cy, r, paint),
    polygon: (points, paint) => log('polygon', points, paint),
    text: (value, x, y, style) => {
      texts.push({ value, x, y, style, depth })
      log('text', value, x, y, style)
    },
    widthOf,
    withTransform: (transform, draw) => {
      log('transform', transform)
      depth += 1
      draw()
      depth -= 1
    },
  }
  return { surface, calls, texts, widthOf }
}

/** Todos los colores que se pidieron: de trazo, de relleno y de texto. */
export function colorsUsed(recorder: ReturnType<typeof createRecorder>): Set<string> {
  const colors = new Set<string>()
  for (const call of recorder.calls) {
    if (call.op === 'strokeColor' || call.op === 'fillColor') colors.add(String(call.args[0]))
  }
  for (const text of recorder.texts) colors.add(text.style.color)
  return colors
}
```

- [ ] **Paso 2: Escribir la prueba (rojo)**

Create `apps/web/test/export-draw-band.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { drawLegend, drawNorth, drawScaleBar, legendLabel } from '../src/lib/export/draw-band'
import type { LegendEntry, LegendView } from '../src/lib/export/legend'
import { mmToPt } from '../src/lib/export/sheet'
import { paletteFor } from '../src/lib/export/surface'
import type { Scale } from '../src/lib/export/types'
import { createRecorder } from './support/recording-surface'

type Recorder = ReturnType<typeof createRecorder>
const color = paletteFor('color')
const rects = (recorder: Recorder) => recorder.calls.filter((c) => c.op === 'rect')
const zone = (label: string, areaM2?: number): LegendEntry => ({ kind: 'zone', label, color: '#1F5FE0', areaM2 })
const LEGEND_BOX = { x: 85, y: 164, width: 92, height: 36 }

describe('norte', () => {
  it('es una "N" centrada y una flecha rellena que apunta arriba, dentro de su caja de 12 × 14 mm', () => {
    const recorder = createRecorder()
    drawNorth(recorder.surface, { x: 12, y: 164, width: 12, height: 14 }, color)
    const letter = recorder.texts.find((t) => t.value === 'N')
    expect(letter?.style).toMatchObject({ align: 'center', bold: true })
    expect(letter?.x).toBeCloseTo(mmToPt(18), 9)
    const arrow = recorder.calls.find((c) => c.op === 'polygon')
    expect(arrow?.args[1]).toBe('fill')
    const points = arrow?.args[0] as [number, number][]
    expect(points).toHaveLength(4)
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(mmToPt(12))
      expect(x).toBeLessThanOrEqual(mmToPt(24))
      expect(y).toBeGreaterThanOrEqual(mmToPt(164))
      expect(y).toBeLessThanOrEqual(mmToPt(178))
    }
    // La punta (el primer punto) es el más alto de la hoja: la flecha apunta arriba.
    expect(points[0]?.[1]).toBe(Math.min(...points.map(([, y]) => y)))
  })
})

describe('escala gráfica (criterio 6)', () => {
  const draw = (scale: Scale, width: number) => {
    const recorder = createRecorder()
    drawScaleBar(recorder.surface, { x: 28, y: 100, width, height: 14 }, scale, color)
    return recorder
  }
  const totalMm = (recorder: Recorder) => rects(recorder).reduce((sum, c) => sum + Number(c.args[2]), 0) / mmToPt(1)

  it('son 4 tramos alternados de 10 mm: la barra de 2 m mide 40,0 mm a 1:50 en la zona ancha', () => {
    const recorder = draw(50, 55)
    expect(rects(recorder)).toHaveLength(4)
    for (const rect of rects(recorder)) expect(Number(rect.args[2])).toBeCloseTo(mmToPt(10), 9)
    expect(totalMm(recorder)).toBeCloseTo(40, 9)
    const fills = recorder.calls.filter((c) => c.op === 'fillColor').map((c) => c.args[0])
    expect(fills.slice(0, 4)).toEqual(['#0B1F4D', '#ffffff', '#0B1F4D', '#ffffff'])
  })

  it('1:25 usa 1 m (40 mm) y 1:100 usa 5 m (50 mm) en la zona ancha', () => {
    expect(totalMm(draw(25, 55))).toBeCloseTo(40, 9)
    expect(totalMm(draw(100, 55))).toBeCloseTo(50, 9)
  })

  it('rotula 0, la mitad y el largo con su unidad, y "Escala 1:50" debajo', () => {
    const recorder = draw(50, 55)
    expect(recorder.texts.map((t) => t.value)).toEqual(['0', '1', '2 m', 'Escala 1:50'])
    expect(recorder.texts.find((t) => t.value === '2 m')?.x).toBeCloseTo(mmToPt(30 + 40), 9)
  })

  it('en la zona angosta (30 mm) y en la ancha la barra nunca pasa del borde de su caja', () => {
    for (const width of [55, 30]) {
      for (const scale of [25, 50, 100] as const) {
        const end = 28 + 2 + totalMm(draw(scale, width))
        expect(end, `1:${scale} en ${width} mm`).toBeLessThanOrEqual(28 + width - 3 + 1e-9)
      }
    }
    expect(totalMm(draw(100, 30))).toBeCloseTo(20, 9)
  })
})

describe('leyenda (spec 5.3)', () => {
  const draw = (view: LegendView) => {
    const recorder = createRecorder()
    drawLegend(recorder.surface, LEGEND_BOX, view, 2, 4, color)
    return recorder
  }
  const values = (recorder: Recorder) => recorder.texts.map((t) => t.value)

  it('lleva título, una muestra y una etiqueta por entrada, en columnas que se llenan de arriba abajo', () => {
    const recorder = draw({
      shown: [zone('Sala', 15.2), zone('Cocina', 8.4), { kind: 'material', label: 'Madera', color: '#C9A27A' }, zone('Baño', 3), zone('Dormitorio', 12)],
      more: 0,
    })
    for (const expected of ['Leyenda', 'Sala · 15,2 m²', 'Cocina · 8,4 m²', 'Piso: Madera', 'Baño · 3,0 m²', 'Dormitorio · 12,0 m²']) expect(values(recorder), expected).toContain(expected)
    expect(rects(recorder)).toHaveLength(5)
    for (const swatch of rects(recorder)) expect(Number(swatch.args[2])).toBeCloseTo(mmToPt(3.2), 9)
    expect(recorder.texts.find((t) => t.value.startsWith('Sala'))?.x).toBeCloseTo(mmToPt(85 + 6.2), 9)
    // La quinta entrada ya no cabe en la primera columna (4 filas): pasa a la segunda.
    expect(recorder.texts.find((t) => t.value.startsWith('Dormitorio'))?.x).toBeCloseTo(mmToPt(85 + 46 + 6.2), 9)
  })

  it('la última fila es "y 3 más" cuando no entran todos, en el último lugar', () => {
    const recorder = draw({ shown: Array.from({ length: 7 }, (_, i) => zone(`Ambiente ${i}`, 10)), more: 3 })
    const more = recorder.texts.find((t) => t.value === 'y 3 más')
    expect(more).toBeDefined()
    expect(more?.x).toBeCloseTo(mmToPt(85 + 46 + 2), 9)
    expect(more?.y).toBeCloseTo(mmToPt(164 + 2 + 5 + 3 * 6 + 4.2), 9)
    expect(rects(recorder)).toHaveLength(7)
  })

  it('sin ambientes dice "Sin ambientes dibujados" y no dibuja muestras ni "y N más"', () => {
    const recorder = draw({ shown: [], more: 0 })
    expect(values(recorder)).toEqual(['Leyenda', 'Sin ambientes dibujados'])
    expect(rects(recorder)).toHaveLength(0)
  })

  it('un nombre larguísimo se corta con "…" y cabe en su columna', () => {
    const recorder = draw({ shown: [zone('x'.repeat(80), 10)], more: 0 })
    const shown = recorder.texts.find((t) => t.value.endsWith('…'))
    expect(shown).toBeDefined()
    expect(recorder.widthOf(shown?.value ?? '', 6, false)).toBeLessThanOrEqual(mmToPt(46 - 8) + 1e-9)
  })

  it('legendLabel: ambiente con y sin superficie, y material con "Piso:"', () => {
    expect(legendLabel(zone('Sala', 15.2))).toBe('Sala · 15,2 m²')
    expect(legendLabel(zone('Sala'))).toBe('Sala')
    expect(legendLabel({ kind: 'material', label: 'Madera', color: '#C9A27A' })).toBe('Piso: Madera')
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-draw-band`
Expected: FAIL — `Cannot find module '../src/lib/export/draw-band'`.

- [ ] **Paso 3: Escribir la superficie y la paleta**

Create `apps/web/src/lib/export/surface.ts`:

```ts
import { BRAND } from '../brand'
import type { PlanMode } from './types'

export type Paint = 'stroke' | 'fill' | 'both'
export type TextStyle = { size: number; bold?: boolean; color: string; align?: 'left' | 'center' | 'right' }
export type Transform = { tx: number; ty: number; sx: number; sy: number }

/**
 * Lo único que los dibujantes de la hoja saben del PDF. Todo en puntos con el origen arriba a la izquierda; `text` recibe la
 * línea de base. `src/editor/export/pdf-surface.ts` la implementa sobre `pdfkit`; las pruebas, con un registro.
 */
export interface PdfSurface {
  strokeColor(color: string): void
  fillColor(color: string): void
  lineWidth(widthPt: number): void
  rect(x: number, y: number, width: number, height: number, paint: Paint): void
  line(x1: number, y1: number, x2: number, y2: number): void
  /** `d` es un camino SVG (solo M, L, Q, C, H, V, A y Z absolutos); `rule: 'evenodd'` para anillos. */
  path(d: string, paint: Paint, rule?: 'evenodd'): void
  circle(cx: number, cy: number, r: number, paint: Paint): void
  polygon(points: readonly (readonly [number, number])[], paint: Paint): void
  text(value: string, x: number, baselineY: number, style: TextStyle): void
  widthOf(value: string, size: number, bold: boolean): number
  /** Dibuja con el origen movido y escalado; al terminar, colores y grosores vuelven a lo que eran. */
  withTransform(transform: Transform, draw: () => void): void
}

export type Palette = { ink: string; soft: string; sun: string | null; blank: string }

/** Papel: negro, gris y blanco. Color: Noche para el texto y el Sol solo en formas (nunca en texto). */
export function paletteFor(mode: PlanMode): Palette {
  return mode === 'paper'
    ? { ink: '#000000', soft: '#555555', sun: null, blank: '#ffffff' }
    : { ink: BRAND.noche, soft: '#5B6B8C', sun: BRAND.sol, blank: '#ffffff' }
}
```

- [ ] **Paso 4: Escribir norte, escala gráfica y leyenda**

Create `apps/web/src/lib/export/draw-band.ts`:

```ts
import { formatArea } from '../format'
import { fitText } from './fit-text'
import type { LegendEntry, LegendView } from './legend'
import { pickScaleBar } from './scale-bar'
import { type BoxMm, mmToPt as pt } from './sheet'
import type { Palette, PdfSurface } from './surface'
import { TEXT, moreText, scaleText } from './texts-es'
import { LEGEND_ROW_MM, LEGEND_TITLE_MM } from './title-block'
import type { Scale } from './types'

/** Flecha del norte (apunta arriba) con una "N" encima, centrada en su caja de 12 × 14 mm. */
export function drawNorth(s: PdfSurface, box: BoxMm, palette: Palette): void {
  const cx = box.x + box.width / 2
  const bottom = box.y + box.height - 0.5
  s.text(TEXT.pdf.north, pt(cx), pt(box.y + 4), { size: 8, bold: true, color: palette.ink, align: 'center' })
  s.fillColor(palette.ink)
  s.strokeColor(palette.ink)
  s.lineWidth(0.5)
  s.polygon([[pt(cx), pt(box.y + 5.5)], [pt(cx - 3), pt(bottom)], [pt(cx), pt(bottom - 3)], [pt(cx + 3), pt(bottom)]], 'fill')
}

/** Barra de escala de 4 tramos alternados, con su largo en metros y "Escala 1:50" debajo. */
export function drawScaleBar(s: PdfSurface, box: BoxMm, scale: Scale, palette: Palette): void {
  const bar = pickScaleBar(scale, { maxMm: box.width - 5 })
  const x0 = box.x + 2
  const top = box.y + 6.5
  const segment = bar.lengthMm / bar.segments
  s.strokeColor(palette.ink)
  s.lineWidth(0.5)
  for (let i = 0; i < bar.segments; i++) {
    s.fillColor(i % 2 === 0 ? palette.ink : palette.blank)
    s.rect(pt(x0 + i * segment), pt(top), pt(segment), pt(2), 'both')
  }
  for (const tick of bar.ticks) {
    s.text(tick.label, pt(x0 + tick.atMm), pt(box.y + 5), { size: 6, color: palette.ink, align: 'center' })
  }
  s.text(`${TEXT.pdf.scale} ${scaleText(scale)}`, pt(x0), pt(box.y + 13), { size: 6.5, bold: true, color: palette.ink })
}

/** "Sala · 15,2 m²" para un ambiente y "Piso: Madera" para un material. */
export function legendLabel(entry: LegendEntry): string {
  if (entry.kind === 'material') return `${TEXT.pdf.floor}: ${entry.label}`
  return entry.areaM2 === undefined ? entry.label : `${entry.label} · ${formatArea(entry.areaM2)}`
}

/** Leyenda de Color: muestra, nombre y m² de cada ambiente; la última fila es "y N más" si no entran todos. */
export function drawLegend(s: PdfSurface, box: BoxMm, view: LegendView, cols: number, rows: number, palette: Palette): void {
  const colW = box.width / Math.max(1, cols)
  const top = box.y + 2 + LEGEND_TITLE_MM
  s.text(TEXT.pdf.legend, pt(box.x + 2), pt(box.y + 5.5), { size: 6.5, bold: true, color: palette.ink })
  const place = (index: number) => ({ x: box.x + Math.floor(index / rows) * colW, y: top + (index % rows) * LEGEND_ROW_MM })
  const label = (text: string, x: number, y: number, color: string) => {
    const fitted = fitText(text, pt(colW - 8), (t) => s.widthOf(t, 6, false))
    s.text(fitted, pt(x + 6.2), pt(y + 4.2), { size: 6, color })
  }
  if (view.shown.length === 0 && view.more === 0) {
    s.text(TEXT.pdf.noZones, pt(box.x + 2), pt(top + 4.2), { size: 6, color: palette.soft })
    return
  }
  view.shown.forEach((entry, index) => {
    const { x, y } = place(index)
    s.fillColor(entry.color)
    s.strokeColor(palette.ink)
    s.lineWidth(0.25)
    s.rect(pt(x + 2), pt(y + 1.4), pt(3.2), pt(3.2), 'both')
    label(legendLabel(entry), x, y, palette.ink)
  })
  if (view.more > 0) {
    const { x, y } = place(view.shown.length)
    s.text(moreText(view.more), pt(x + 2), pt(y + 4.2), { size: 6, color: palette.soft })
  }
}
```

- [ ] **Paso 5: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-draw-band`
Expected: PASS (10 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 6: Commit**

```bash
git add apps/web/src/lib/export/surface.ts apps/web/src/lib/export/draw-band.ts apps/web/test/support/recording-surface.ts apps/web/test/export-draw-band.test.ts
git commit -m "feat(plano): superficie de dibujo, norte, escala gráfica y leyenda de la hoja" -- apps/web/src/lib/export/surface.ts apps/web/src/lib/export/draw-band.ts apps/web/test/support/recording-surface.ts apps/web/test/export-draw-band.test.ts
```

---

### Task 10b: Los dibujantes de la hoja (2 de 3): el cajetín con el logotipo

**Files:**
- Create: `apps/web/src/lib/export/draw-block.ts`
- Test: `apps/web/test/export-draw-block.test.ts`

**Interfaces:**
- Consumes: `BoxMm`, `mmToPt`, `MM_TO_PT` (Tarea 1); `BlockLayout` (Tarea 6); `fitText` (Tarea 3); `TEXT`, `scaleText` (Tarea 7a); `LOGO` (Tarea 9); `WINDOW`; `PdfSurface`, `Palette`, `paletteFor` (Tarea 10a); `createRecorder`, `colorsUsed`.
- Produces en `@/lib/export/draw-block`: `BlockData = { projectName; levelLabel; scale; dateText; author; sheetText }`, `drawLogo(surface, box: BoxMm, palette)` y `drawBlock(surface, layout: BlockLayout, data: BlockData, palette)`.

**Cubre el criterio 11** (logotipo vectorial sin imágenes; proyecto, planta, escala, fecha, autor y "Hoja N de M"; un nombre de 120 caracteres se corta con "…" y no se sale de su caja) y el caso 4 de Review Focus (nombre largo o con "ő" y "Ł"). El **logotipo** se dibuja con los caminos de la Tarea 9 y el marco de su ventana como **contorno relleno** (no como trazo grueso), así en Papel ninguna línea pasa de 0,7 pt: letras y marco en negro, sol como círculo sin relleno; en Color, Noche y Sol.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/export-draw-block.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { BRAND, WINDOW } from '../src/lib/brand'
import { type BlockData, drawBlock, drawLogo } from '../src/lib/export/draw-block'
import { type BoxMm, mmToPt, sheetFor } from '../src/lib/export/sheet'
import { paletteFor } from '../src/lib/export/surface'
import { layoutBand, layoutBlock } from '../src/lib/export/title-block'
import { colorsUsed, createRecorder } from './support/recording-surface'

const DATA: BlockData = {
  projectName: 'Casa Alvear',
  levelLabel: 'Planta baja',
  scale: 50,
  dateText: '12 de octubre de 2026',
  author: 'Silvert Quispe',
  sheetText: 'Hoja 1 de 2',
}
const blockOf = (paper: 'A4' | 'A3', orientation: 'landscape' | 'portrait'): BoxMm => {
  const box = layoutBand(sheetFor(paper, orientation)).block
  if (!box) throw new Error('falta la caja del cajetín')
  return box
}
const LAYOUT = layoutBlock(blockOf('A4', 'landscape'))
const draw = (mode: 'paper' | 'color', data: BlockData = DATA, layout = LAYOUT) => {
  const recorder = createRecorder()
  drawBlock(recorder.surface, layout, data, paletteFor(mode))
  return recorder
}
const values = (recorder: ReturnType<typeof createRecorder>) => recorder.texts.map((t) => t.value)

describe('logotipo (criterio 11: sin imágenes)', () => {
  it('son caminos: dos tramos de letras, el marco de la ventana como anillo par-impar y el sol', () => {
    const recorder = createRecorder()
    drawLogo(recorder.surface, { x: 100, y: 100, width: 40, height: 7 }, paletteFor('color'))
    const paths = recorder.calls.filter((c) => c.op === 'path')
    expect(paths).toHaveLength(3)
    expect(paths.filter((c) => c.args[2] === 'evenodd')).toHaveLength(1)
    expect(String(paths.find((c) => c.args[2] === 'evenodd')?.args[0])).toContain(WINDOW.glass)
    expect(recorder.calls.filter((c) => c.op === 'circle')).toHaveLength(1)
  })

  it('la geometría de la ventana que supone el dibujo es la de la marca (si cambia, recalcula FRAME_OUTER en draw-block.ts)', () => {
    expect(WINDOW.strokeWidth).toBe(11)
    expect(WINDOW.frame).toBe('M7 46V32A25 25 0 0 1 57 32V46A12 12 0 0 1 45 58H19A12 12 0 0 1 7 46Z')
    expect(WINDOW.glass).toBe('M12.5 46V32A19.5 19.5 0 0 1 51.5 32V46A6.5 6.5 0 0 1 45 52.5H19A6.5 6.5 0 0 1 12.5 46Z')
  })

  it('en Papel todo es negro y el sol es un círculo sin relleno; en Color, Noche y el sol relleno de Sol', () => {
    const paper = createRecorder()
    drawLogo(paper.surface, { x: 100, y: 100, width: 40, height: 7 }, paletteFor('paper'))
    expect(colorsUsed(paper).has(BRAND.sol)).toBe(false)
    expect(paper.calls.find((c) => c.op === 'circle')?.args[3]).toBe('stroke')
    const color = createRecorder()
    drawLogo(color.surface, { x: 100, y: 100, width: 40, height: 7 }, paletteFor('color'))
    expect(colorsUsed(color).has(BRAND.sol)).toBe(true)
    expect(color.calls.find((c) => c.op === 'circle')?.args[3]).toBe('fill')
  })
})

describe('caja del cajetín (criterio 11)', () => {
  it('lleva los cinco campos con su etiqueta y "Hoja N de M"', () => {
    const texts = values(draw('color'))
    for (const expected of ['Proyecto', 'Casa Alvear', 'Planta', 'Planta baja', 'Escala', '1:50', 'Fecha', '12 de octubre de 2026', 'Autor', 'Silvert Quispe', 'Hoja 1 de 2']) {
      expect(texts, expected).toContain(expected)
    }
  })

  it('un nombre de 120 caracteres se corta con "…" y no se sale de su caja; un autor largo (correo) también', () => {
    const name = 'Casa de campo con quincho y pileta '.repeat(4).slice(0, 120)
    const recorder = draw('color', { ...DATA, projectName: name, author: 'una.persona.con.un.correo.muy.largo@ejemplo.com.ar' })
    const project = recorder.texts.find((t) => t.value.endsWith('…') && t.style.size >= 9)
    expect(project).toBeDefined()
    expect(recorder.widthOf(project?.value ?? '', project?.style.size ?? 0, true)).toBeLessThanOrEqual(mmToPt(LAYOUT.project.width) + 1e-9)
    const author = recorder.texts.find((t) => t.value.startsWith('una.persona'))
    expect(recorder.widthOf(author?.value ?? '', author?.style.size ?? 0, false)).toBeLessThanOrEqual(mmToPt(LAYOUT.author.width) + 1e-9)
  })

  it('un nombre con "ő" o "Ł" llega intacto a la superficie (ella reparte las fuentes)', () => {
    expect(values(draw('color', { ...DATA, projectName: 'Győr Łódź' }))).toContain('Győr Łódź')
  })

  it('todo lo que se dibuja cabe dentro de la caja, en la ancha (110 mm) y en la angosta (90 mm)', () => {
    for (const [paper, orientation] of [['A4', 'landscape'], ['A4', 'portrait']] as const) {
      const box = blockOf(paper, orientation)
      const recorder = draw('color', DATA, layoutBlock(box))
      for (const call of recorder.calls.filter((c) => c.depth === 0 && (c.op === 'rect' || c.op === 'line'))) {
        const [x1, y1, a, b] = call.args as number[]
        const [x2, y2] = call.op === 'rect' ? [(x1 ?? 0) + (a ?? 0), (y1 ?? 0) + (b ?? 0)] : [a ?? 0, b ?? 0]
        for (const x of [x1, x2]) expect(x, `${paper} ${orientation}`).toBeGreaterThanOrEqual(mmToPt(box.x) - 1e-6)
        for (const x of [x1, x2]) expect(x, `${paper} ${orientation}`).toBeLessThanOrEqual(mmToPt(box.x + box.width) + 1e-6)
        for (const y of [y1, y2]) expect(y, `${paper} ${orientation}`).toBeGreaterThanOrEqual(mmToPt(box.y) - 1e-6)
        for (const y of [y1, y2]) expect(y, `${paper} ${orientation}`).toBeLessThanOrEqual(mmToPt(box.y + box.height) + 1e-6)
      }
    }
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-draw-block`
Expected: FAIL — `Cannot find module '../src/lib/export/draw-block'`.

- [ ] **Paso 2: Escribir el cajetín y el logotipo**

Create `apps/web/src/lib/export/draw-block.ts`:

```ts
import { WINDOW } from '../brand'
import { fitText } from './fit-text'
import { LOGO } from './brand-paths'
import { type BoxMm, MM_TO_PT, mmToPt as pt } from './sheet'
import type { Palette, PdfSurface } from './surface'
import { TEXT, scaleText } from './texts-es'
import type { BlockLayout } from './title-block'
import type { Scale } from './types'

export type BlockData = {
  projectName: string
  levelLabel: string
  scale: Scale
  dateText: string
  author: string
  /** "Hoja 1 de 2". */
  sheetText: string
}

/**
 * El marco de la ventana como contorno relleno y no como trazo de 11 unidades (así en Papel ninguna línea pasa de 0,7 pt): el borde
 * exterior es el camino central de `WINDOW.frame` desplazado 5,5 y el interior es `WINDOW.glass`; se rellena con la regla par-impar.
 * Si cambia `WINDOW`, recalcula el exterior (`export-draw-sheet.test.ts` lo vigila).
 */
const FRAME_OUTER = 'M1.5 46V32A30.5 30.5 0 0 1 62.5 32V46A17.5 17.5 0 0 1 45 63.5H19A17.5 17.5 0 0 1 1.5 46Z'
const FRAME_RING = `${FRAME_OUTER} ${WINDOW.glass}`

/** El logotipo de Madori (letras y ventana con el sol) ajustado a `box` (mm), alineado a la izquierda y centrado en vertical. */
export function drawLogo(s: PdfSurface, box: BoxMm, palette: Palette): void {
  const fit = Math.min(box.width / LOGO.box.width, box.height / LOGO.box.height)
  const k = fit * MM_TO_PT
  const tx = pt(box.x) - LOGO.box.minX * k
  const ty = pt(box.y) + pt((box.height - LOGO.box.height * fit) / 2) - LOGO.box.minY * k
  s.withTransform({ tx, ty, sx: k, sy: k }, () => {
    s.fillColor(palette.ink)
    for (const letters of LOGO.letters) s.path(letters, 'fill')
    const { x, y, width, height } = LOGO.window
    s.withTransform({ tx: x, ty: y, sx: width / 64, sy: height / 64 }, () => {
      s.fillColor(palette.ink)
      s.path(FRAME_RING, 'fill', 'evenodd')
      if (palette.sun) {
        s.fillColor(palette.sun)
        s.circle(WINDOW.sun.cx, WINDOW.sun.cy, WINDOW.sun.r, 'fill')
      } else {
        s.strokeColor(palette.ink)
        s.lineWidth(3)
        s.circle(WINDOW.sun.cx, WINDOW.sun.cy, WINDOW.sun.r, 'stroke')
      }
    })
  })
}

/** Un campo del cajetín: la etiqueta chica arriba y el valor (cortado con "…" si no cabe) abajo. */
function field(s: PdfSurface, box: BoxMm, label: string, value: string, size: number, bold: boolean, palette: Palette): void {
  s.text(label, pt(box.x), pt(box.y + 2.4), { size: 5, color: palette.soft })
  const fitted = fitText(value, pt(box.width - 1), (t) => s.widthOf(t, size, bold))
  s.text(fitted, pt(box.x), pt(box.y + box.height - 1.4), { size, bold, color: palette.ink })
}

/** La caja del cajetín: contorno, rayas, logotipo, "Hoja N de M" y los cinco campos. */
export function drawBlock(s: PdfSurface, layout: BlockLayout, data: BlockData, palette: Palette): void {
  const { outline } = layout
  s.strokeColor(palette.ink)
  s.lineWidth(0.5)
  s.rect(pt(outline.x), pt(outline.y), pt(outline.width), pt(outline.height), 'stroke')
  s.lineWidth(0.25)
  for (const line of layout.dividers) s.line(pt(line.x1), pt(line.y1), pt(line.x2), pt(line.y2))
  drawLogo(s, layout.logo, palette)
  const sheetText = fitText(data.sheetText, pt(layout.sheetNo.width), (t) => s.widthOf(t, 8, true))
  s.text(sheetText, pt(layout.sheetNo.x + layout.sheetNo.width), pt(layout.sheetNo.y + layout.sheetNo.height - 1.5), {
    size: 8,
    bold: true,
    color: palette.ink,
    align: 'right',
  })
  field(s, layout.project, TEXT.pdf.project, data.projectName, 10, true, palette)
  field(s, layout.level, TEXT.pdf.level, data.levelLabel, 7.5, false, palette)
  field(s, layout.scale, TEXT.pdf.scale, scaleText(data.scale), 7.5, false, palette)
  field(s, layout.date, TEXT.pdf.date, data.dateText, 7.5, false, palette)
  field(s, layout.author, TEXT.pdf.author, data.author, 7.5, false, palette)
}
```


Nota: `x` e `y` de `LOGO.window` están en las unidades del logotipo; el primer `withTransform` ya las escala a milímetros.


- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-draw-block`
Expected: PASS (7 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/lib/export/draw-block.ts apps/web/test/export-draw-block.test.ts
git commit -m "feat(plano): cajetín con logotipo vectorial (caminos, sin imágenes) y campos del proyecto" -- apps/web/src/lib/export/draw-block.ts apps/web/test/export-draw-block.test.ts
```

---

### Task 10c: Los dibujantes de la hoja (3 de 3): la hoja completa

**Files:**
- Create: `apps/web/src/lib/export/draw-sheet.ts`
- Test: `apps/web/test/export-draw-sheet.test.ts`

**Interfaces:**
- Consumes: `Sheet`, `mmToPt` (Tarea 1); `layoutBand`, `layoutBlock` (Tarea 6); `buildLegend`, `sortLegend`, `LegendEntry` (Tarea 4); `sheetOf` (Tarea 7a); `drawNorth`, `drawScaleBar`, `drawLegend`, `paletteFor`, `PdfSurface` (Tarea 10a); `drawBlock` (Tarea 10b); `createRecorder`, `colorsUsed`.
- Produces en `@/lib/export/draw-sheet`: `SheetInput = { sheet: Sheet; mode: PlanMode; scale: Scale; projectName: string; levelLabel: string; author: string; dateText: string; sheetNumber: number; sheetTotal: number; legend: readonly LegendEntry[] }` y `drawSheet(surface: PdfSurface, input: SheetInput): void`.

**Cubre el criterio 11 en la hoja entera** (con "Incluir cajetín" apagado queda solo el norte y la escala gráfica; todo cabe dentro de la hoja en las cuatro hojas, los dos modos y con o sin cajetín; las líneas miden 0,7 pt o menos), el criterio 6 (la barra de 40 mm) y los casos 1 y 2 de Review Focus: la leyenda vacía y la planta sin nombre.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/export-draw-sheet.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { BRAND, WINDOW } from '../src/lib/brand'
import { drawSheet, type SheetInput } from '../src/lib/export/draw-sheet'
import type { LegendEntry } from '../src/lib/export/legend'
import { mmToPt, sheetFor } from '../src/lib/export/sheet'
import { layoutBand, layoutBlock } from '../src/lib/export/title-block'
import { colorsUsed, createRecorder } from './support/recording-surface'

const zone = (label: string, areaM2: number): LegendEntry => ({ kind: 'zone', label, color: '#1F5FE0', areaM2 })
const BASE: SheetInput = {
  sheet: sheetFor('A4', 'landscape'),
  mode: 'color',
  scale: 50,
  projectName: 'Casa Alvear',
  levelLabel: 'Planta baja',
  author: 'Silvert Quispe',
  dateText: '12 de octubre de 2026',
  sheetNumber: 1,
  sheetTotal: 2,
  legend: [zone('Sala', 15.2), zone('Cocina', 8.4), { kind: 'material', label: 'Madera', color: '#C9A27A' }],
}
const draw = (overrides: Partial<SheetInput> = {}) => {
  const recorder = createRecorder()
  drawSheet(recorder.surface, { ...BASE, ...overrides })
  return recorder
}
const values = (recorder: ReturnType<typeof createRecorder>) => recorder.texts.map((t) => t.value)

describe('cajetín (criterio 11)', () => {
  it('lleva proyecto, planta, escala, fecha, autor, "Hoja N de M", norte y escala gráfica', () => {
    const texts = values(draw())
    for (const expected of ['Proyecto', 'Casa Alvear', 'Planta', 'Planta baja', 'Escala', '1:50', 'Fecha', '12 de octubre de 2026', 'Autor', 'Silvert Quispe', 'Hoja 1 de 2', 'N', '2 m']) {
      expect(texts, expected).toContain(expected)
    }
  })

  it('con "Incluir cajetín" apagado queda solo el norte y la escala gráfica (decisión de Silvert)', () => {
    const recorder = draw({ sheet: sheetFor('A4', 'landscape', false) })
    const texts = values(recorder)
    expect(texts).toContain('N')
    expect(texts).toContain('2 m')
    for (const absent of ['Proyecto', 'Casa Alvear', 'Hoja 1 de 2', 'Leyenda', 'Silvert Quispe']) expect(texts, absent).not.toContain(absent)
    expect(recorder.calls.filter((c) => c.op === 'path')).toHaveLength(0)
  })

  it('el logotipo son caminos: dos tramos de letras, el marco como contorno relleno y el sol', () => {
    const paths = draw().calls.filter((c) => c.op === 'path')
    expect(paths).toHaveLength(3)
    expect(paths.filter((c) => c.args[2] === 'evenodd')).toHaveLength(1)
    expect(String(paths.find((c) => c.args[2] === 'evenodd')?.args[0])).toContain(WINDOW.glass)
  })

  it('la geometría de la ventana que supone el dibujo es la de la marca (si cambia, recalcula FRAME_OUTER en draw-block.ts)', () => {
    expect(WINDOW.strokeWidth).toBe(11)
    expect(WINDOW.frame).toBe('M7 46V32A25 25 0 0 1 57 32V46A12 12 0 0 1 45 58H19A12 12 0 0 1 7 46Z')
    expect(WINDOW.glass).toBe('M12.5 46V32A19.5 19.5 0 0 1 51.5 32V46A6.5 6.5 0 0 1 45 52.5H19A6.5 6.5 0 0 1 12.5 46Z')
  })

  it('la barra de escala gráfica de 2 m mide 40,0 mm a 1:50 (criterio 6)', () => {
    const segments = draw().calls.filter((c) => c.op === 'rect' && Math.abs(Number(c.args[3]) - mmToPt(2)) < 1e-9)
    expect(segments).toHaveLength(4)
    const total = segments.reduce((sum, c) => sum + Number(c.args[2]), 0)
    expect(Math.abs(total - mmToPt(40))).toBeLessThan(mmToPt(0.5))
  })

  it('un nombre de 120 caracteres se corta con "…" y no se sale de su caja', () => {
    const name = 'Casa de campo con quincho y pileta '.repeat(4).slice(0, 120)
    const recorder = draw({ projectName: name })
    const sheet = BASE.sheet
    const block = layoutBand(sheet).block
    if (!block) throw new Error('falta la caja')
    const box = layoutBlock(block).project
    const shown = recorder.texts.find((t) => t.value.endsWith('…') && t.style.size >= 9)
    expect(shown).toBeDefined()
    expect(recorder.widthOf(shown?.value ?? '', shown?.style.size ?? 0, true)).toBeLessThanOrEqual(mmToPt(box.width) + 1e-9)
  })

  it('un nombre con "ő", "Ł" o un autor largo (correo) también se ajusta', () => {
    const recorder = draw({ projectName: 'Győr Łódź', author: 'una.persona.con.un.correo.muy.largo@ejemplo.com.ar' })
    expect(values(recorder)).toContain('Győr Łódź')
    const block = layoutBand(BASE.sheet).block
    if (!block) throw new Error('falta la caja')
    const box = layoutBlock(block).author
    const author = recorder.texts.find((t) => t.value.startsWith('una.persona'))
    expect(recorder.widthOf(author?.value ?? '', author?.style.size ?? 0, false)).toBeLessThanOrEqual(mmToPt(box.width) + 1e-9)
  })

  it('todo lo que se dibuja cabe dentro de la hoja, en las cuatro hojas, los dos modos y con o sin cajetín', () => {
    for (const [paper, orientation] of [['A4', 'landscape'], ['A3', 'landscape'], ['A4', 'portrait'], ['A3', 'portrait']] as const) {
      for (const mode of ['paper', 'color'] as const) {
        for (const titleBlock of [true, false]) {
          const sheet = sheetFor(paper, orientation, titleBlock)
          const recorder = draw({ sheet, mode })
          const label = `${paper} ${orientation} ${mode} ${titleBlock}`
          for (const call of recorder.calls.filter((c) => c.depth === 0)) {
            if (call.op === 'rect') {
              const [x, y, w, h] = call.args as number[]
              expect(x, label).toBeGreaterThanOrEqual(0)
              expect(y, label).toBeGreaterThanOrEqual(0)
              expect((x ?? 0) + (w ?? 0), label).toBeLessThanOrEqual(sheet.widthPt + 1e-6)
              expect((y ?? 0) + (h ?? 0), label).toBeLessThanOrEqual(sheet.heightPt + 1e-6)
            }
            if (call.op === 'line') {
              const [x1, y1, x2, y2] = call.args as number[]
              for (const x of [x1, x2]) expect(x, label).toBeLessThanOrEqual(sheet.widthPt + 1e-6)
              for (const y of [y1, y2]) expect(y, label).toBeLessThanOrEqual(sheet.heightPt + 1e-6)
            }
          }
          for (const text of recorder.texts.filter((t) => t.depth === 0)) {
            expect(text.x, label).toBeGreaterThanOrEqual(0)
            expect(text.y, label).toBeLessThanOrEqual(sheet.heightPt)
          }
        }
      }
    }
  })
})

describe('colores y líneas', () => {
  it('Papel usa solo negro, gris y blanco; el sol es un círculo sin relleno', () => {
    const recorder = draw({ mode: 'paper' })
    for (const color of colorsUsed(recorder)) expect(['#000000', '#555555', '#ffffff'], color).toContain(color)
    expect(colorsUsed(recorder).has(BRAND.sol)).toBe(false)
    const sun = recorder.calls.find((c) => c.op === 'circle')
    expect(sun?.args[3]).toBe('stroke')
  })

  it('Color usa Noche para el texto y Sol para el sol (relleno)', () => {
    const recorder = draw({ mode: 'color' })
    const colors = colorsUsed(recorder)
    expect(colors.has(BRAND.noche)).toBe(true)
    expect(colors.has(BRAND.sol)).toBe(true)
    expect(recorder.calls.find((c) => c.op === 'circle')?.args[3]).toBe('fill')
  })

  it('las líneas de la hoja (marco, cajetín, barra) miden 0,7 pt o menos', () => {
    const widths = draw().calls.filter((c) => c.op === 'lineWidth' && c.depth === 0).map((c) => Number(c.args[0]))
    expect(widths.length).toBeGreaterThan(0)
    for (const width of widths) expect(width).toBeLessThanOrEqual(0.7)
  })
})

describe('leyenda (solo en Color)', () => {
  const many = Array.from({ length: 10 }, (_, i) => zone(`Ambiente ${String(i).padStart(2, '0')}`, 10 + i))

  it('muestra nombre y m² de cada ambiente y el material del piso, con la muestra de color', () => {
    const texts = values(draw())
    expect(texts).toContain('Leyenda')
    expect(texts).toContain('Sala · 15,2 m²')
    expect(texts).toContain('Cocina · 8,4 m²')
    expect(texts).toContain('Piso: Madera')
  })

  it('si no entra, la última fila es "y N más" dentro del cajetín (A4 apaisada: 7 ambientes y "y 3 más")', () => {
    const texts = values(draw({ legend: many }))
    expect(texts.filter((t) => t.startsWith('Ambiente'))).toHaveLength(7)
    expect(texts).toContain('y 3 más')
  })

  it('sin ambientes dice "Sin ambientes dibujados" y no deja el hueco roto', () => {
    const texts = values(draw({ legend: [] }))
    expect(texts).toContain('Sin ambientes dibujados')
    expect(texts.some((t) => /más$/.test(t))).toBe(false)
  })

  it('en Papel no hay leyenda (no hay color que explicar)', () => {
    expect(values(draw({ mode: 'paper' }))).not.toContain('Leyenda')
  })

  it('una planta sin nombre propio llega ya como "Planta baja" y se imprime tal cual', () => {
    expect(values(draw({ levelLabel: 'Planta baja' }))).toContain('Planta baja')
    expect(values(draw({ levelLabel: 'Sótano 1' }))).toContain('Sótano 1')
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-draw-sheet`
Expected: FAIL — `Cannot find module '../src/lib/export/draw-sheet'`.

- [ ] **Paso 2: Escribir la hoja completa**

Create `apps/web/src/lib/export/draw-sheet.ts`:

```ts
import { drawLegend, drawNorth, drawScaleBar } from './draw-band'
import { drawBlock } from './draw-block'
import { type LegendEntry, buildLegend, sortLegend } from './legend'
import { type Sheet, mmToPt as pt } from './sheet'
import { type PdfSurface, paletteFor } from './surface'
import { sheetOf } from './texts-es'
import { layoutBand, layoutBlock } from './title-block'
import type { PlanMode, Scale } from './types'

export type SheetInput = {
  sheet: Sheet
  mode: PlanMode
  scale: Scale
  projectName: string
  /** Nombre de la planta ya en castellano ("Planta baja", "Planta 1", "Sótano 1"). */
  levelLabel: string
  author: string
  /** "12 de octubre de 2026". */
  dateText: string
  /** Número de esta hoja (desde 1) y total de hojas del PDF. */
  sheetNumber: number
  sheetTotal: number
  legend: readonly LegendEntry[]
}

/**
 * Dibuja todo lo que no es el plano: marco, línea de la banda, norte y escala gráfica (siempre), y, con cajetín, la leyenda
 * (solo en Color) y la caja con el logotipo. Se llama una vez por página, después del plano.
 */
export function drawSheet(s: PdfSurface, input: SheetInput): void {
  const palette = paletteFor(input.mode)
  const layout = layoutBand(input.sheet)
  const { frame, band } = layout
  s.strokeColor(palette.ink)
  s.lineWidth(0.5)
  s.rect(pt(frame.x), pt(frame.y), pt(frame.width), pt(frame.height), 'stroke')
  s.line(pt(band.x), pt(band.y), pt(band.x + band.width), pt(band.y))
  drawNorth(s, layout.north, palette)
  drawScaleBar(s, layout.scaleBar, input.scale, palette)
  if (layout.legend && input.mode === 'color') {
    const view = buildLegend(sortLegend(input.legend), layout.legendCapacity)
    drawLegend(s, layout.legend, view, layout.legendCols, layout.legendRows, palette)
  }
  if (layout.block) {
    drawBlock(
      s,
      layoutBlock(layout.block),
      {
        projectName: input.projectName,
        levelLabel: input.levelLabel,
        scale: input.scale,
        dateText: input.dateText,
        author: input.author,
        sheetText: sheetOf(input.sheetNumber, input.sheetTotal),
      },
      palette,
    )
  }
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-draw-sheet export-draw-block export-draw-band`
Expected: PASS (`export-draw-sheet`: 16 pruebas; `export-draw-block`: 7; `export-draw-band`: 10).

Si la prueba del nombre de 120 caracteres falla con `expect(shown).toBeDefined()`: el texto cortado debe terminar en "…" y tener `size >= 9` (el valor del proyecto es el único de 10 pt). Si la de "dentro de la hoja" falla en `text.y`, revisa que ningún `baselineY` pase de la altura de la hoja.

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/lib/export/draw-sheet.ts apps/web/test/export-draw-sheet.test.ts
git commit -m "feat(plano): hoja completa con marco, norte, escala gráfica, leyenda y cajetín" -- apps/web/src/lib/export/draw-sheet.ts apps/web/test/export-draw-sheet.test.ts
```

---

### Task 11: `PdfSurface` sobre `pdfkit` y la prueba del contenido del PDF (texto real, DM Sans, castellano)

**Files:**
- Create: `apps/web/src/editor/export/pdf-surface.ts`, `apps/web/test/support/pdf-read.ts`, `apps/web/test/support/pdf-fonts.ts`
- Test: `apps/web/test/export-pdf-content.test.ts`

**Interfaces:**
- Consumes: `PdfSurface`, `Paint`, `TextStyle`, `Transform` (Tarea 10a); `splitRuns`, `Face` (Tarea 7b); `fontKey`, `FontKey` (Tarea 8); `PdfFontBytes` (Tarea 8); `drawSheet`, `SheetInput` (Tarea 10c).
- Produces:
  - `@/editor/export/pdf-surface`: `PdfRawLike` (la parte de un documento de `pdfkit` que se usa), `registerPdfFonts(raw: PdfRawLike, bytes: PdfFontBytes): void` (registra `madori-latin-400`, `madori-latin-700`, `madori-ext-400`, `madori-ext-700`), `createPdfSurface(raw: PdfRawLike, fonts?: 'dmsans' | 'helvetica'): PdfSurface`.
  - `test/support/pdf-read`: `readPdf(bytes: Uint8Array): Promise<{ width: number; height: number; items: { str: string; x: number; y: number; width: number }[] }[]>` (lee con `pdfjs-dist`).

**Cubre los criterios 11 y 12 sobre un `pdfkit` 0.19.1 real:** el texto del cajetín es texto de verdad (no curvas), usa DM Sans, conserva tildes, "ñ", "ő" y "Ł", la página mide A4, el PDF no tiene imágenes y en Papel todos los colores son grises. Es también la comprobación de que la línea de base del texto cae donde la pidió el dibujante (la altura de los ascendentes de DM Sans).

- [ ] **Paso 1: Escribir el lector y la prueba (rojo)**

Create `apps/web/test/support/pdf-read.ts`:

```ts
/** Lee un PDF con pdfjs-dist (la build "legacy" para Node). El nombre del módulo se confirmó en la Tarea 0c. */
const PDFJS = 'pdfjs-dist/legacy/build/pdf.mjs'

export type PdfPage = { width: number; height: number; items: { str: string; x: number; y: number; width: number }[] }

export async function readPdf(bytes: Uint8Array): Promise<PdfPage[]> {
  const pdfjs = await import(/* @vite-ignore */ PDFJS)
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false, isEvalSupported: false }).promise
  const pages: PdfPage[] = []
  for (let number = 1; number <= doc.numPages; number++) {
    const page = await doc.getPage(number)
    const [x0, y0, x1, y1] = page.view as number[]
    const content = await page.getTextContent()
    const items = (content.items as { str?: string; transform?: number[]; width?: number }[])
      .filter((item) => typeof item.str === 'string' && item.transform)
      .map((item) => ({ str: item.str as string, x: item.transform?.[4] ?? 0, y: item.transform?.[5] ?? 0, width: item.width ?? 0 }))
    pages.push({ width: (x1 ?? 0) - (x0 ?? 0), height: (y1 ?? 0) - (y0 ?? 0), items })
  }
  return pages
}
```

Create `apps/web/test/support/pdf-fonts.ts` (los bytes de DM Sans para las pruebas en Node; también lo usan las Tareas 12b y 12c):

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { PdfFontBytes } from '../../src/editor/export/pdf-fonts'
import { FONT_FILES, type FontKey } from '../../src/lib/export/font-files'

export function fontBytes(): PdfFontBytes {
  const entries = (Object.entries(FONT_FILES) as [FontKey, string][]).map(([key, url]) => {
    const file = readFileSync(fileURLToPath(new URL(`../../public${url}`, import.meta.url)))
    return [key, file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)] as const
  })
  return Object.fromEntries(entries) as PdfFontBytes
}
```

Create `apps/web/test/export-pdf-content.test.ts`:

```ts
import PDFDocument from 'pdfkit'
import { describe, expect, it } from 'vitest'
import { type PdfRawLike, createPdfSurface, registerPdfFonts } from '../src/editor/export/pdf-surface'
import { BRAND } from '../src/lib/brand'
import { type SheetInput, drawSheet } from '../src/lib/export/draw-sheet'
import { mmToPt, sheetFor } from '../src/lib/export/sheet'
import { layoutBand, layoutBlock } from '../src/lib/export/title-block'
import { fontBytes } from './support/pdf-fonts'
import { readPdf } from './support/pdf-read'
import { createRecorder } from './support/recording-surface'

const BASE: SheetInput = {
  sheet: sheetFor('A4', 'landscape'),
  mode: 'color',
  scale: 50,
  projectName: 'Casa Alvear',
  levelLabel: 'Planta baja',
  author: 'Silvert Quispe',
  dateText: '12 de octubre de 2026',
  sheetNumber: 1,
  sheetTotal: 2,
  legend: [{ kind: 'zone', label: 'Sala', color: '#1F5FE0', areaM2: 15.2 }],
}

async function buildPdf(input: SheetInput, fonts: 'dmsans' | 'helvetica' = 'dmsans'): Promise<Buffer> {
  const doc = new PDFDocument({ autoFirstPage: false, compress: false, margin: 0 })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))
  const ended = new Promise<void>((resolve) => doc.on('end', () => resolve()))
  const raw = doc as unknown as PdfRawLike
  if (fonts === 'dmsans') registerPdfFonts(raw, fontBytes())
  doc.addPage({ size: [input.sheet.widthPt, input.sheet.heightPt], margin: 0 })
  drawSheet(createPdfSurface(raw, fonts), input)
  doc.end()
  await ended
  return Buffer.concat(chunks)
}

const joined = (items: { str: string }[]) => items.map((item) => item.str).join('')

describe('el cajetín en un PDF real de pdfkit 0.19.1 (criterios 11 y 12)', () => {
  it('la página mide A4 apaisada (595,28 × 841,89 con tolerancia de 0,5 pt) y el texto es texto de verdad', async () => {
    const [page] = await readPdf(await buildPdf(BASE))
    expect(Math.abs((page?.width ?? 0) - 841.89)).toBeLessThan(0.5)
    expect(Math.abs((page?.height ?? 0) - 595.28)).toBeLessThan(0.5)
    const text = joined(page?.items ?? [])
    for (const expected of ['Casa Alvear', 'Planta baja', '1:50', '12 de octubre de 2026', 'Silvert Quispe', 'Hoja 1 de 2', 'Sala · 15,2 m²']) {
      expect(text, expected).toContain(expected)
    }
  })

  it('incrusta DM Sans, no trae imágenes y conserva tildes, "ñ", "ő" y "Ł"', async () => {
    const pdf = await buildPdf({ ...BASE, projectName: 'Győr Łódź — Ñandú', author: 'María Peña' })
    expect(pdf.toString('latin1')).toMatch(/DMSans/)
    expect(pdf.toString('latin1')).not.toMatch(/\/Subtype\s*\/Image/)
    const [page] = await readPdf(pdf)
    const text = joined(page?.items ?? [])
    expect(text).toContain('Győr Łódź — Ñandú')
    expect(text).toContain('María Peña')
  })

  it('la línea de base del texto cae donde la pidió el dibujante (± 0,6 pt)', async () => {
    const recorder = createRecorder()
    drawSheet(recorder.surface, BASE)
    const wanted = recorder.texts.find((t) => t.value === 'Hoja 1 de 2')
    const [page] = await readPdf(await buildPdf(BASE))
    const item = page?.items.find((i) => i.str.includes('Hoja 1 de 2'))
    expect(wanted).toBeDefined()
    expect(item).toBeDefined()
    expect(Math.abs((item?.y ?? 0) - (BASE.sheet.heightPt - (wanted?.y ?? 0)))).toBeLessThan(0.6)
  })

  it('un nombre de 120 caracteres termina en "…" y no pasa del ancho de su caja', async () => {
    const name = 'Casa de campo con quincho y pileta '.repeat(4).slice(0, 120)
    const [page] = await readPdf(await buildPdf({ ...BASE, projectName: name }))
    const block = layoutBand(BASE.sheet).block
    if (!block) throw new Error('falta la caja')
    const box = layoutBlock(block).project
    const shown = page?.items.find((i) => i.str.endsWith('…'))
    expect(shown).toBeDefined()
    expect(shown?.width ?? 999).toBeLessThanOrEqual(mmToPt(box.width) + 0.5)
  })

  it('en Papel todos los colores del PDF son grises (R = G = B)', async () => {
    const pdf = (await buildPdf({ ...BASE, mode: 'paper' })).toString('latin1')
    const triples = [...pdf.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) (?:rg|RG)/g)].map((m) => m.slice(1, 4).map(Number))
    expect(triples.length).toBeGreaterThan(0)
    for (const [r, g, b] of triples) {
      expect(Math.abs((r ?? 0) - (g ?? 0))).toBeLessThan(0.01)
      expect(Math.abs((g ?? 0) - (b ?? 0))).toBeLessThan(0.01)
    }
  })

  it('en Color aparece el Noche de la marca y en Papel no', async () => {
    const noche = /0\.0431\d* 0\.1215\d* 0\.3019\d* (rg|RG)/
    expect((await buildPdf(BASE)).toString('latin1')).toMatch(noche)
    expect((await buildPdf({ ...BASE, mode: 'paper' })).toString('latin1')).not.toMatch(noche)
    expect(BRAND.noche).toBe('#0B1F4D')
  })

  it('con el respaldo Helvetica, lo que no es Latin-1 sale como "?" y no se incrusta DM Sans', async () => {
    const pdf = await buildPdf({ ...BASE, projectName: 'Łódź' }, 'helvetica')
    expect(pdf.toString('latin1')).not.toMatch(/DMSans/)
    const [page] = await readPdf(pdf)
    expect(joined(page?.items ?? [])).toContain('?ód?')
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-pdf-content`
Expected: FAIL — `Cannot find module '../src/editor/export/pdf-surface'`.

- [ ] **Paso 2: Escribir el adaptador**

Create `apps/web/src/editor/export/pdf-surface.ts`:

```ts
import { type Face, splitRuns } from '@/lib/export/font-coverage'
import { fontKey } from '@/lib/export/font-files'
import type { Paint, PdfSurface } from '@/lib/export/surface'
import type { PdfFontBytes } from './pdf-fonts'

/** Lo que se usa de un documento de `pdfkit` (el real se pasa con un `as unknown as PdfRawLike`: así este archivo no importa `pdfkit`). */
export type PdfRawLike = {
  save(): PdfRawLike
  restore(): PdfRawLike
  translate(x: number, y: number): PdfRawLike
  scale(x: number, y?: number): PdfRawLike
  rect(x: number, y: number, width: number, height: number): PdfRawLike
  moveTo(x: number, y: number): PdfRawLike
  lineTo(x: number, y: number): PdfRawLike
  path(d: string): PdfRawLike
  circle(x: number, y: number, r: number): PdfRawLike
  polygon(...points: [number, number][]): PdfRawLike
  fill(color?: string, rule?: string): PdfRawLike
  stroke(color?: string): PdfRawLike
  fillAndStroke(fill?: string, stroke?: string, rule?: string): PdfRawLike
  fillColor(color: string): PdfRawLike
  strokeColor(color: string): PdfRawLike
  lineWidth(width: number): PdfRawLike
  font(name: string): PdfRawLike
  fontSize(size: number): PdfRawLike
  text(value: string, x: number, y: number, options?: { lineBreak?: boolean }): PdfRawLike
  widthOfString(value: string, options?: { lineBreak?: boolean }): number
  registerFont(name: string, source: ArrayBuffer | Uint8Array): PdfRawLike
  /** Metadatos del documento (`Title`, `Author`, `Creator`). */
  info?: Record<string, unknown>
  /** Interno de `pdfkit`: la fuente en uso, con su ascendente en milésimas de em. */
  _font?: { ascender?: number }
}

const NAMES: Record<string, string> = {
  'latin-400': 'madori-latin-400',
  'latin-700': 'madori-latin-700',
  'ext-400': 'madori-ext-400',
  'ext-700': 'madori-ext-700',
}

/** Registra las cuatro variantes de DM Sans en el documento. Se llama una vez, desde `setup` del parche. */
export function registerPdfFonts(raw: PdfRawLike, bytes: PdfFontBytes): void {
  for (const [key, name] of Object.entries(NAMES)) raw.registerFont(name, bytes[key as keyof PdfFontBytes])
}

/**
 * La superficie de dibujo sobre un documento de `pdfkit`. El texto se reparte en tramos (DM Sans latina y extendida) con
 * `splitRuns`; con `fonts: 'helvetica'` (respaldo de la Tarea 0) usa la fuente estándar y lo que no es Latin-1 sale "?".
 */
export function createPdfSurface(raw: PdfRawLike, fonts: 'dmsans' | 'helvetica' = 'dmsans'): PdfSurface {
  const faces: readonly Face[] = fonts === 'dmsans' ? ['latin', 'ext'] : ['latin']
  let fill = '#000000'
  let stroke = '#000000'

  const select = (face: Face, bold: boolean, size: number) => {
    raw.font(fonts === 'dmsans' ? (NAMES[fontKey(face, bold)] ?? 'Helvetica') : bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size)
  }
  const measure = (value: string, size: number, bold: boolean) =>
    splitRuns(value, faces).reduce((total, run) => {
      select(run.face, bold, size)
      return total + raw.widthOfString(run.text, { lineBreak: false })
    }, 0)
  const paint = (kind: Paint, rule?: 'evenodd') => {
    const name = rule === 'evenodd' ? 'even-odd' : undefined
    if (kind === 'fill') raw.fill(fill, name)
    else if (kind === 'stroke') raw.stroke(stroke)
    else raw.fillAndStroke(fill, stroke, name)
  }

  return {
    strokeColor: (color) => {
      stroke = color
      raw.strokeColor(color)
    },
    fillColor: (color) => {
      fill = color
      raw.fillColor(color)
    },
    lineWidth: (width) => {
      raw.lineWidth(width)
    },
    rect: (x, y, width, height, kind) => {
      raw.rect(x, y, width, height)
      paint(kind)
    },
    line: (x1, y1, x2, y2) => {
      raw.moveTo(x1, y1).lineTo(x2, y2)
      raw.stroke(stroke)
    },
    path: (d, kind, rule) => {
      raw.path(d)
      paint(kind, rule)
    },
    circle: (cx, cy, r, kind) => {
      raw.circle(cx, cy, r)
      paint(kind)
    },
    polygon: (points, kind) => {
      raw.polygon(...points.map(([x, y]) => [x, y] as [number, number]))
      paint(kind)
    },
    text: (value, x, baselineY, style) => {
      const bold = style.bold === true
      const total = measure(value, style.size, bold)
      let cursor = style.align === 'center' ? x - total / 2 : style.align === 'right' ? x - total : x
      raw.fillColor(style.color)
      for (const run of splitRuns(value, faces)) {
        select(run.face, bold, style.size)
        const ascent = ((raw._font?.ascender ?? 780) / 1000) * style.size
        raw.text(run.text, cursor, baselineY - ascent, { lineBreak: false })
        cursor += raw.widthOfString(run.text, { lineBreak: false })
      }
      raw.fillColor(fill)
    },
    widthOf: measure,
    withTransform: (transform, draw) => {
      const saved = { fill, stroke }
      raw.save()
      raw.translate(transform.tx, transform.ty).scale(transform.sx, transform.sy)
      draw()
      raw.restore()
      fill = saved.fill
      stroke = saved.stroke
    },
  }
}
```

- [ ] **Paso 3: Verde (M8 sobre el producto) y revisión de la línea de base**

Run: `pnpm --filter @interiores/web exec vitest run export-pdf-content`
Expected: PASS (7 pruebas).

Si falla solo "la línea de base del texto cae donde la pidió el dibujante": mira la diferencia (`console.log(item.y, alturaHoja - wanted.y)`). Si es constante (por ejemplo 0,2 × tamaño), `pdfkit` coloca la línea de base con otro ascendente que `_font.ascender`: reemplaza `ascent` por `raw.currentLineHeight()`-based o por el valor medido (`diferencia / tamaño`) y repite; la prueba es el árbitro, no la fórmula. Si falla "DMSans": usa el nombre que imprimió la 0c en `basefonts` (por ejemplo `/DM ?Sans/`).

**Rama de respaldo (M8):** si `registerFont` con el `woff` falla aquí aunque la 0c lo haya incrustado, `decisions.fonts` pasa a `'helvetica'` y la prueba "incrusta DM Sans" se reemplaza por la del respaldo (ya está escrita: la última).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/export/pdf-surface.ts apps/web/test/support/pdf-read.ts apps/web/test/support/pdf-fonts.ts apps/web/test/export-pdf-content.test.ts
git commit -m "feat(plano): superficie de dibujo sobre pdfkit y prueba del contenido del PDF con DM Sans" -- apps/web/src/editor/export/pdf-surface.ts apps/web/test/support/pdf-read.ts apps/web/test/support/pdf-fonts.ts apps/web/test/export-pdf-content.test.ts
```

---

## Pegamento con Pascal y estado del diálogo (Tareas 12b a 14c)

### Task 12a: Colores de pisos y etiquetas de superficie

**Files:**
- Create: `apps/web/src/lib/export/plan-colors.ts`, `apps/web/src/lib/export/zone-labels.ts`
- Test: `apps/web/test/export-plan-colors.test.ts`, `apps/web/test/export-zone-labels.test.ts`

**Interfaces:**
- Consumes: `GeoLike` (Tarea 5a); `formatArea` de `@/lib/format`.
- Produces:
  - `@/lib/export/plan-colors`: `FALLBACK_FLOOR_COLOR`, `CATEGORY_COLORS`, `MaterialInfo = { label: string; category: string; previewColor?: string }`, `MaterialLookup = (id: string) => MaterialInfo | undefined`, `FloorInfo = { color: string | null; label: string | null }`, `floorInfoOf(slab: { materialPreset?: string; material?: { color?: string } }, lookup: MaterialLookup): FloorInfo` (`color: null` = la losa no tiene material: se deja como la dibuja Pascal; un material de la biblioteca sin `previewColor` usa un gris por categoría, la propuesta del spec).
  - `@/lib/export/zone-labels`: `Point = readonly [number, number]`, `polygonArea(points)`, `polygonCentroid(points)`, `areaLabel(points, options?: { fontSizeM?: number; offsetM?: number }): GeoLike | null` (la etiqueta "12,0 m²" bajo el nombre del ambiente; `null` si el polígono no tiene 3 puntos o su superficie es menor que 0,05 m²).

**Cubre el criterio 10** (el color del material del piso y la superficie de cada ambiente) y el caso 1 de Review Focus (un ambiente degenerado no inventa m²). `areaLabels: 'madori'` (Tarea 0e) hace que `build-plan` agregue estos m² cuando Pascal no los pone.

- [ ] **Paso 1: Escribir las pruebas (rojo)**

Create `apps/web/test/export-plan-colors.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CATEGORY_COLORS, FALLBACK_FLOOR_COLOR, type MaterialLookup, floorInfoOf } from '../src/lib/export/plan-colors'

const lookup: MaterialLookup = (id) =>
  ({
    'preset-white': { label: 'Blanco', category: 'colors', previewColor: '#E9E9E9' },
    'wood-woodfine22': { label: 'Madera fina', category: 'wood' },
    'weird-thing': { label: 'Cosa rara', category: 'inexistente' },
  })[id]

describe('color del piso (criterio 10)', () => {
  it('un material con color de vista previa usa ese color y su nombre en castellano', () => {
    expect(floorInfoOf({ materialPreset: 'library:preset-white' }, lookup)).toEqual({ color: '#E9E9E9', label: 'Blanco' })
  })

  it('un material solo con textura usa el gris de su categoría (propuesta del spec)', () => {
    expect(floorInfoOf({ materialPreset: 'library:wood-woodfine22' }, lookup)).toEqual({ color: CATEGORY_COLORS.wood, label: 'Madera fina' })
  })

  it('una categoría desconocida cae al gris general', () => {
    expect(floorInfoOf({ materialPreset: 'library:weird-thing' }, lookup)).toEqual({ color: FALLBACK_FLOOR_COLOR, label: 'Cosa rara' })
  })

  it('un color propio de la losa gana, y sin material de la biblioteca no se lista en la leyenda', () => {
    expect(floorInfoOf({ material: { color: '#aabbcc' } }, lookup)).toEqual({ color: '#aabbcc', label: null })
    expect(floorInfoOf({ materialPreset: 'library:wood-woodfine22', material: { color: '#aabbcc' } }, lookup)).toEqual({ color: '#aabbcc', label: 'Madera fina' })
  })

  it('una losa sin material (o con una referencia que no es de la biblioteca o no existe) no tiene color', () => {
    expect(floorInfoOf({}, lookup)).toEqual({ color: null, label: null })
    expect(floorInfoOf({ materialPreset: 'scene:abc' }, lookup)).toEqual({ color: null, label: null })
    expect(floorInfoOf({ materialPreset: 'library:no-existe' }, lookup)).toEqual({ color: null, label: null })
  })

  it('un color propio mal escrito se ignora', () => {
    expect(floorInfoOf({ material: { color: 'rojo; drop' } }, lookup)).toEqual({ color: null, label: null })
  })
})
```

Create `apps/web/test/export-zone-labels.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { areaLabel, polygonArea, polygonCentroid } from '../src/lib/export/zone-labels'

const ROOM = [[0, 0], [4, 0], [4, 3], [0, 3]] as const

describe('superficie y centro de un ambiente', () => {
  it('el área de un rectángulo de 4 × 3 m es 12 m², en cualquier sentido de giro', () => {
    expect(polygonArea(ROOM)).toBe(12)
    expect(polygonArea([...ROOM].reverse())).toBe(12)
  })

  it('el centro de un rectángulo es el centro, y el de una L cae dentro de la L', () => {
    expect(polygonCentroid(ROOM)).toEqual([2, 1.5])
    const l = [[0, 0], [4, 0], [4, 1], [1, 1], [1, 3], [0, 3]] as const
    const [cx, cy] = polygonCentroid(l)
    expect(cx).toBeGreaterThan(0)
    expect(cy).toBeGreaterThan(0)
    expect(polygonArea(l)).toBe(6)
  })

  it('un polígono sin superficie tiene como centro el promedio de sus vértices', () => {
    expect(polygonCentroid([[0, 0], [2, 0], [4, 0]])).toEqual([2, 0])
    expect(polygonArea([[0, 0], [1, 0]])).toBe(0)
  })
})

describe('areaLabel', () => {
  it('es un texto "12,0 m²" centrado bajo el nombre del ambiente', () => {
    const label = areaLabel(ROOM)
    expect(label).toMatchObject({ kind: 'text', text: '12,0 m²', textAnchor: 'middle', x: 2 })
    expect(Number(label?.y)).toBeGreaterThan(1.5)
  })

  it('un ambiente degenerado (2 puntos o casi sin superficie) no lleva etiqueta', () => {
    expect(areaLabel([[0, 0], [1, 0]])).toBeNull()
    expect(areaLabel([[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1]])).toBeNull()
  })

  it('el tamaño de la letra se puede cambiar', () => {
    expect(areaLabel(ROOM, { fontSizeM: 0.3 })?.fontSize).toBe(0.3)
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-plan-colors export-zone-labels`
Expected: FAIL — `Cannot find module '../src/lib/export/plan-colors'` y `'../src/lib/export/zone-labels'`.

- [ ] **Paso 2: Escribir los colores y las etiquetas**

Create `apps/web/src/lib/export/plan-colors.ts`:

```ts
export const FALLBACK_FLOOR_COLOR = '#E3E6EA'

/** Un color por categoría de material de Pascal, para los materiales que solo tienen textura y no `previewColor`. */
export const CATEGORY_COLORS: Readonly<Record<string, string>> = {
  colors: '#E9E9E9',
  wood: '#C9A27A',
  stone: '#BDBDB8',
  brick: '#B5654A',
  tile: '#D7DEE6',
  wallpaper: '#E4DCCB',
  concrete: '#B8BBBE',
  metal: '#A8AEB5',
  plastic: '#DADDE2',
  fabric: '#D9CFC1',
  carpet: '#C9C2D6',
  leather: '#9C6B4E',
  roofing: '#A07060',
  ground: '#A9B58F',
  glass: '#CFE3EE',
  other: '#D9D9D9',
}

export type MaterialInfo = { label: string; category: string; previewColor?: string }
export type MaterialLookup = (id: string) => MaterialInfo | undefined
/** `color: null` = la losa no tiene material (se dibuja como Pascal); `label: null` = no va en la leyenda. */
export type FloorInfo = { color: string | null; label: string | null }

const LIBRARY_PREFIX = 'library:'
const HEX = /^#[0-9a-f]{3,8}$/i

/** El color y el nombre del material del piso de una losa. Un material de la biblioteca se escribe `library:<id>`. */
export function floorInfoOf(slab: { materialPreset?: string; material?: { color?: string } }, lookup: MaterialLookup): FloorInfo {
  const id = slab.materialPreset?.startsWith(LIBRARY_PREFIX) ? slab.materialPreset.slice(LIBRARY_PREFIX.length) : undefined
  const item = id ? lookup(id) : undefined
  const custom = slab.material?.color && HEX.test(slab.material.color) ? slab.material.color : null
  if (custom) return { color: custom, label: item?.label ?? null }
  if (!item) return { color: null, label: null }
  return { color: item.previewColor ?? CATEGORY_COLORS[item.category] ?? FALLBACK_FLOOR_COLOR, label: item.label }
}
```

Create `apps/web/src/lib/export/zone-labels.ts`:

```ts
import { formatArea } from '../format'
import type { GeoLike } from './plan-style'

export type Point = readonly [number, number]

const MIN_AREA_M2 = 0.05

/** Superficie por la fórmula del polígono (shoelace), siempre positiva. */
export function polygonArea(points: readonly Point[]): number {
  let twice = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    if (a && b) twice += a[0] * b[1] - b[0] * a[1]
  }
  return Math.abs(twice) / 2
}

/** Centro de gravedad del polígono; si no tiene superficie, el promedio de sus vértices. */
export function polygonCentroid(points: readonly Point[]): [number, number] {
  let twice = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    if (!a || !b) continue
    const cross = a[0] * b[1] - b[0] * a[1]
    twice += cross
    cx += (a[0] + b[0]) * cross
    cy += (a[1] + b[1]) * cross
  }
  if (Math.abs(twice) < 1e-9) {
    const n = Math.max(1, points.length)
    return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n]
  }
  return [cx / (3 * twice), cy / (3 * twice)]
}

/** La etiqueta de superficie de un ambiente ("12,0 m²"), centrada y debajo del nombre. `null` si el ambiente no tiene forma. */
export function areaLabel(points: readonly Point[], options: { fontSizeM?: number; offsetM?: number } = {}): GeoLike | null {
  const area = polygonArea(points)
  if (points.length < 3 || area < MIN_AREA_M2) return null
  const fontSize = options.fontSizeM ?? 0.16
  const [cx, cy] = polygonCentroid(points)
  return {
    kind: 'text',
    x: cx,
    y: cy + (options.offsetM ?? Math.max(0.28, fontSize * 1.4)),
    text: formatArea(area),
    fontSize,
    fill: '#1f2937',
    fontWeight: 500,
    textAnchor: 'middle',
  }
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-plan-colors export-zone-labels`
Expected: PASS (`export-plan-colors`: 6 pruebas; `export-zone-labels`: 6).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/lib/export/plan-colors.ts apps/web/src/lib/export/zone-labels.ts apps/web/test/export-plan-colors.test.ts apps/web/test/export-zone-labels.test.ts
git commit -m "feat(plano): color del piso por material y etiquetas de superficie de los ambientes" -- apps/web/src/lib/export/plan-colors.ts apps/web/src/lib/export/zone-labels.ts apps/web/test/export-plan-colors.test.ts apps/web/test/export-zone-labels.test.ts
```

---

### Task 12b: `build-plan` (1 de 2): las opciones que se le pasan al parche

**Files:**
- Create: `apps/web/src/editor/export/build-plan.ts`, `apps/web/test/support/fake-export-pages.ts`
- Test: `apps/web/test/export-build-plan.test.ts`

**Interfaces:**
- Consumes: de las Tareas 1 a 12a: `sheetFor`, `MM_TO_PT`, `mmToPt`, `styleGeometry`, `paperColor`, `withColorFilter`, `registerPdfFonts`, `PdfFontBytes`, `ExportDecisions`, `TEXT`, `projectTitle`, `floorInfoOf`, `areaLabel`; `fontBytes()` y `readPdf()` de `test/support/` (Tarea 11).
- Produces en `@/editor/export/build-plan`: `SceneNode`, `ScenePort`, `PagesOptions`, `BuildDeps`, `createBuildPlan(deps: BuildDeps): (args: PlanBuildArgs) => Promise<PlanResult>`. Sin imports de Pascal: recibe `exportPages` (la función del parche), la escena y las fuentes por inyección, así que se prueba con `pdfkit` real y sin navegador. En `test/support/fake-export-pages.ts`: `NODES`, `DECISIONS`, `ARGS`, `setup(decisions?)` (un `exportFloorplanPages` de mentira que abre un PDF real y llama a los ganchos como el parche) y `textOf(blob)`.

**Cubre el criterio 9 y 10 en las opciones** (el filtro de colores solo en Papel; el estilo del modo y el color de cada nodo; los m² de cada ambiente solo si Pascal no los pone: `areaLabels: 'madori'` de la Tarea 0e), los metadatos del documento y la cancelación y el progreso. El dibujo de cada hoja (planta, leyenda, "Hoja N de M") es la Tarea 12c.

- [ ] **Paso 1: Escribir la prueba y el doble (rojo)**

Create `apps/web/test/support/fake-export-pages.ts`:

```ts
import PDFDocument from 'pdfkit'
import { vi } from 'vitest'
import { type BuildDeps, type PagesOptions, type SceneNode, createBuildPlan } from '../../src/editor/export/build-plan'
import type { PdfRawLike } from '../../src/editor/export/pdf-surface'
import type { ExportDecisions } from '../../src/lib/export/decisions'
import type { PlanBuildArgs } from '../../src/lib/export/types'
import { fontBytes } from './pdf-fonts'
import { readPdf } from './pdf-read'

export const NODES: Record<string, SceneNode> = {
  level_a: { id: 'level_a', type: 'level', level: 0, name: null, children: ['zone_1', 'slab_1', 'wall_1'] },
  level_b: { id: 'level_b', type: 'level', level: 1, name: 'Floor 1', children: [] },
  zone_1: { id: 'zone_1', type: 'zone', name: 'Zone 1', color: '#B97A00', polygon: [[0, 0], [4, 0], [4, 3], [0, 3]] },
  slab_1: { id: 'slab_1', type: 'slab', materialPreset: 'library:wood-woodfine22' },
  wall_1: { id: 'wall_1', type: 'wall' },
}
export const DECISIONS: ExportDecisions = { areaLabels: 'madori', fonts: 'dmsans', previewMode: 'pdfjs', previewDelayMs: 250 }
export const ARGS: PlanBuildArgs = {
  paper: 'A4',
  orientation: 'landscape',
  scale: 50,
  mode: 'color',
  levelIds: ['level_a', 'level_b'],
  titleBlock: true,
  projectName: 'Casa Alvear',
  author: 'Silvert Quispe',
  date: new Date(2026, 9, 12),
}

/** Un `exportFloorplanPages` de mentira: abre un PDF real de pdfkit, llama a los ganchos como el parche y devuelve el Blob. */
export function setup(decisions: ExportDecisions = DECISIONS) {
  const received: PagesOptions[] = []
  const seen: { info?: Record<string, unknown> } = {}
  const exportPages = vi.fn(async (options: PagesOptions) => {
    received.push(options)
    const doc = new PDFDocument({ autoFirstPage: false, compress: false, margin: 0 })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    const ended = new Promise<void>((resolve) => doc.on('end', () => resolve()))
    const raw = doc as unknown as PdfRawLike
    await options.setup?.(raw)
    seen.info = { ...(raw.info ?? {}) }
    for (const [index, levelId] of options.levels.entries()) {
      doc.addPage({ size: [options.page.widthPt, options.page.heightPt], margin: 0 })
      options.onProgress?.(index, options.levels.length)
      await options.pageChrome?.(raw, { index, count: options.levels.length, levelId })
      options.onProgress?.(index + 1, options.levels.length)
    }
    doc.end()
    await ended
    return { blob: new Blob([Buffer.concat(chunks)]), pages: options.levels.length, skippedImages: 2 }
  })
  const loadFonts = vi.fn(async () => fontBytes())
  const deps: BuildDeps = {
    exportPages,
    loadFonts,
    decisions,
    scene: {
      nodes: () => NODES,
      materialById: (id) => (id === 'wood-woodfine22' ? { label: 'Madera fina', category: 'wood', previewColor: '#B98A5E' } : undefined),
    },
  }
  return { build: createBuildPlan(deps), received, seen, exportPages, loadFonts }
}

export const textOf = async (blob: Blob) => {
  const pages = await readPdf(new Uint8Array(await blob.arrayBuffer()))
  return pages.map((page) => page.items.map((item) => item.str).join(''))
}

```

Create `apps/web/test/export-build-plan.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import type { GeoLike } from '../src/lib/export/plan-style'
import { MM_TO_PT } from '../src/lib/export/sheet'
import { ARGS, DECISIONS, NODES, setup } from './support/fake-export-pages'

describe('createBuildPlan: las opciones que le pasa al parche', () => {
  it('pasa al parche la hoja, el área útil y la escala en puntos (A3 apaisada a 1:25)', async () => {
    const { build, received } = setup()
    await build({ ...ARGS, paper: 'A3', scale: 25 })
    const options = received[0]
    expect(options?.levels).toEqual(['level_a', 'level_b'])
    expect(Math.abs((options?.page.widthPt ?? 0) - 1190.55)).toBeLessThan(0.5)
    expect(Math.abs((options?.page.heightPt ?? 0) - 841.89)).toBeLessThan(0.5)
    expect(options?.scale).toBeCloseTo(40 * MM_TO_PT, 9)
    expect(options?.page.usable.width).toBeCloseTo(400 * MM_TO_PT, 9)
    expect(options?.page.usable.height).toBeCloseTo(241 * MM_TO_PT, 9)
    expect(options?.page.usable.x).toBeCloseTo(10 * MM_TO_PT, 9)
  })

  it('el filtro de colores solo se pide en Papel', async () => {
    const paper = setup()
    await paper.build({ ...ARGS, mode: 'paper' })
    expect(paper.received[0]?.wrapRaw).toBeTypeOf('function')
    const color = setup()
    await color.build(ARGS)
    expect(color.received[0]?.wrapRaw).toBeUndefined()
  })

  it('mapGeometry aplica el estilo del modo y el color del nodo (muro negro en Papel; ambiente y piso en Color)', async () => {
    const wall: GeoLike = { kind: 'polygon', points: [[0, 0], [1, 0], [1, 1]], fill: '#374151', stroke: '#1f2937', strokeWidth: 0.02 }
    const tint: GeoLike = { kind: 'polygon', points: [[0, 0], [1, 0], [1, 1]], fill: '#3b82f6', fillOpacity: 0.04 }
    const slab: GeoLike = { kind: 'polygon', points: [[0, 0], [1, 0], [1, 1]], fill: '#cbd5e1', fillOpacity: 0.6 }
    const paper = setup()
    await paper.build({ ...ARGS, mode: 'paper' })
    expect(paper.received[0]?.mapGeometry?.(NODES.wall_1, wall)).toMatchObject({ fill: '#000000' })
    const color = setup()
    await color.build(ARGS)
    const map = color.received[0]?.mapGeometry
    expect(map?.(NODES.zone_1, tint)).toMatchObject({ fill: '#B97A00', fillOpacity: 0.35 })
    expect(map?.(NODES.slab_1, slab)).toMatchObject({ fill: '#B98A5E', fillOpacity: 0.55 })
    expect(map?.(undefined, slab)).toBe(slab)
  })

  it('los m² de cada ambiente se agregan solo si Pascal no los pone (decisión de la Tarea 0)', async () => {
    const madori = setup()
    await madori.build(ARGS)
    const labels = madori.received[0]?.extraGeometry?.('level_a') ?? []
    expect(labels).toHaveLength(1)
    expect(labels[0]).toMatchObject({ kind: 'text', text: '12,0 m²' })
    expect(madori.received[0]?.extraGeometry?.('level_b')).toEqual([])
    const pascal = setup({ ...DECISIONS, areaLabels: 'pascal' })
    await pascal.build(ARGS)
    expect(pascal.received[0]?.extraGeometry).toBeUndefined()
  })

  it('anota título, autor y creador en el documento', async () => {
    const { build, seen } = setup()
    await build(ARGS)
    expect(seen.info).toMatchObject({ Title: 'Casa Alvear — planos', Author: 'Silvert Quispe', Creator: 'Madori' })
  })

  it('pasa el progreso y la señal de cancelación tal cual, y un error del parche sale sin disfrazar', async () => {
    const { build, received, exportPages } = setup()
    const onProgress = vi.fn()
    const controller = new AbortController()
    await build({ ...ARGS, onProgress, signal: controller.signal })
    expect(received[0]?.signal).toBe(controller.signal)
    // El parche llama onProgress(done, total); la persona recibe { done, total }.
    expect(onProgress).toHaveBeenCalledWith({ done: 1, total: 2 })
    exportPages.mockRejectedValueOnce(new Error('se cayó'))
    await expect(build(ARGS)).rejects.toThrow('se cayó')
  })

  it('con el respaldo Helvetica no descarga DM Sans', async () => {
    const { build, loadFonts } = setup({ ...DECISIONS, fonts: 'helvetica' })
    await build(ARGS)
    expect(loadFonts).not.toHaveBeenCalled()
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-build-plan`
Expected: FAIL — `Cannot find module '../src/editor/export/build-plan'`.

- [ ] **Paso 2: Escribir `build-plan.ts`**

Create `apps/web/src/editor/export/build-plan.ts`:

```ts
import { withColorFilter } from '@/lib/export/color-filter'
import type { ExportDecisions } from '@/lib/export/decisions'
import { type MaterialLookup, floorInfoOf } from '@/lib/export/plan-colors'
import { type GeoLike, paperColor, styleGeometry } from '@/lib/export/plan-style'
import { MM_TO_PT, mmToPt, sheetFor } from '@/lib/export/sheet'
import { TEXT, projectTitle } from '@/lib/export/texts-es'
import type { PlanBuildArgs, PlanResult } from '@/lib/export/types'
import { type Point, areaLabel } from '@/lib/export/zone-labels'
import type { PdfFontBytes } from './pdf-fonts'
import { type PdfRawLike, registerPdfFonts } from './pdf-surface'

/** Lo que se lee de un nodo de la escena de Pascal (forma mínima: este archivo no importa Pascal). */
export type SceneNode = {
  id: string
  type: string
  name?: string | null
  level?: number
  color?: string
  polygon?: readonly Point[]
  children?: readonly string[]
  materialPreset?: string
  material?: { color?: string }
}

export type ScenePort = {
  nodes(): Readonly<Record<string, SceneNode>>
  materialById: MaterialLookup
}

/** `FloorplanPagesOptions` del parche de Pascal, con geometrías estructurales. */
export type PagesOptions = {
  levels: readonly string[]
  page: { widthPt: number; heightPt: number; usable: { x: number; y: number; width: number; height: number } }
  scale: number
  mapGeometry?: (node: SceneNode | undefined, geometry: GeoLike) => GeoLike | null
  extraGeometry?: (levelId: string) => GeoLike[]
  wrapRaw?: (raw: PdfRawLike) => PdfRawLike
  setup?: (raw: PdfRawLike) => void | Promise<void>
  pageChrome?: (raw: PdfRawLike, context: { index: number; count: number; levelId: string }) => void | Promise<void>
  onProgress?: (done: number, total: number) => void
  signal?: AbortSignal
}

export type BuildDeps = {
  exportPages(options: PagesOptions): Promise<PlanResult>
  scene: ScenePort
  loadFonts(): Promise<PdfFontBytes>
  decisions: ExportDecisions
}

/** Arma las opciones del parche a partir de lo que eligió la persona y devuelve el PDF. */
export function createBuildPlan(deps: BuildDeps) {
  return async function buildPlan(args: PlanBuildArgs): Promise<PlanResult> {
    const sheet = sheetFor(args.paper, args.orientation, args.titleBlock)
    const ptPerM = (1000 / args.scale) * MM_TO_PT
    const nodes = () => deps.scene.nodes()
    const childrenOf = (levelId: string, type: string): SceneNode[] =>
      (nodes()[levelId]?.children ?? []).map((id) => nodes()[id]).filter((node): node is SceneNode => node?.type === type)

    const areaLabels = (levelId: string): GeoLike[] => {
      const fontSizeM = Math.min(0.3, Math.max(0.1, 7 / ptPerM))
      return childrenOf(levelId, 'zone').flatMap((zone) => {
        const label = areaLabel(zone.polygon ?? [], { fontSizeM })
        const styled = label ? styleGeometry(label, { mode: args.mode, nodeType: 'zone', ptPerUnit: ptPerM }) : null
        return styled ? [styled] : []
      })
    }

    const result = await deps.exportPages({
      levels: args.levelIds,
      page: {
        widthPt: sheet.widthPt,
        heightPt: sheet.heightPt,
        usable: { x: mmToPt(sheet.usable.x), y: mmToPt(sheet.usable.y), width: mmToPt(sheet.usable.width), height: mmToPt(sheet.usable.height) },
      },
      scale: ptPerM,
      mapGeometry: (node, geometry) =>
        styleGeometry(geometry, {
          mode: args.mode,
          nodeType: node?.type,
          ptPerUnit: ptPerM,
          zoneColor: node?.type === 'zone' ? node.color : undefined,
          floorColor: node?.type === 'slab' ? (floorInfoOf(node, deps.scene.materialById).color ?? undefined) : undefined,
        }),
      extraGeometry: deps.decisions.areaLabels === 'madori' ? areaLabels : undefined,
      wrapRaw: args.mode === 'paper' ? (raw) => withColorFilter(raw, paperColor) : undefined,
      setup: async (raw) => {
        if (deps.decisions.fonts === 'dmsans') registerPdfFonts(raw, await deps.loadFonts())
        raw.info = { ...(raw.info ?? {}), Title: projectTitle(args.projectName), Author: args.author, Creator: TEXT.pdf.creator }
      },
      onProgress: args.onProgress ? (done, total) => args.onProgress?.({ done, total }) : undefined,
      signal: args.signal,
    })
    return result
  }
}
```

`PlanBuildArgs.onProgress` recibe un objeto `{ done, total }` (Tarea 1) y el parche llama `onProgress(done, total)`: `build-plan.ts` hace la traducción en la línea de `onProgress`.

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-build-plan`
Expected: PASS (7 pruebas).

Si "mapGeometry … piso" falla porque el color queda en `#E3E6EA`, `floorInfoOf` no encontró el material: revisa que el prefijo sea `library:`.

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/export/build-plan.ts apps/web/test/support/fake-export-pages.ts apps/web/test/export-build-plan.test.ts
git commit -m "feat(plano): build-plan arma las opciones del parche (hoja, escala, estilo, colores y metadatos)" -- apps/web/src/editor/export/build-plan.ts apps/web/test/support/fake-export-pages.ts apps/web/test/export-build-plan.test.ts
```

---

### Task 12c: `build-plan` (2 de 2): planta, leyenda, fecha y "Hoja N de M" en cada hoja

**Files:**
- Modify: `apps/web/src/editor/export/build-plan.ts`
- Test: `apps/web/test/export-build-plan-pages.test.ts`

**Interfaces:**
- Consumes: `createBuildPlan` y el doble `fake-export-pages` (Tarea 12b); `drawSheet` (Tarea 10c); `createPdfSurface` (Tarea 11); `formatLongDate` (Tarea 3); `levelDisplayName`, `zoneDisplayName` de `@/lib/editor-names`; `polygonArea` (Tarea 12a); `LegendEntry` (Tarea 4).
- Produces: el gancho `pageChrome` de `createBuildPlan`: dibuja en cada hoja, con `drawSheet`, el nombre de la planta en castellano, la leyenda de ese nivel (ambientes con su superficie y material del piso), la fecha en letras, el autor y "Hoja N de M" (o la numeración de la vista previa con `sheetNumbers`).

**Cubre los criterios 4, 10, 11 y 12 en el PDF** (una hoja por planta con "Hoja N de M"; leyenda de Color con ambientes y pisos; fecha en letras y autor; sin palabras en inglés de Pascal) y los casos 1 y 2 de Review Focus: la planta sin nombre sale "Planta baja", la que Pascal llama `Floor 1` sale "Planta 1" y la que no tiene ambientes dice "Sin ambientes dibujados".

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/export-build-plan-pages.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ARGS, DECISIONS, setup, textOf } from './support/fake-export-pages'

describe('createBuildPlan: lo que dibuja en cada hoja', () => {
  it('cada página lleva su planta en castellano, "Hoja N de M", el proyecto, la fecha en letras y el autor', async () => {
    const { build } = setup()
    const result = await build(ARGS)
    expect(result.pages).toBe(2)
    expect(result.skippedImages).toBe(2)
    const [first, second] = await textOf(result.blob)
    for (const expected of ['Planta baja', 'Hoja 1 de 2', 'Casa Alvear', '12 de octubre de 2026', 'Silvert Quispe', '1:50']) expect(first, expected).toContain(expected)
    for (const expected of ['Planta 1', 'Hoja 2 de 2']) expect(second, expected).toContain(expected)
    expect(first).not.toContain('Floor')
    expect(second).not.toContain('Floor')
  })

  it('en Color la leyenda lista el ambiente con sus m² y el material del piso; sin ambientes dice que no hay', async () => {
    const { build } = setup()
    const [first, second] = await textOf((await build(ARGS)).blob)
    expect(first).toContain('Ambiente 1 · 12,0 m²')
    expect(first).toContain('Piso: Madera fina')
    expect(second).toContain('Sin ambientes dibujados')
  })

  it('la vista previa de una sola planta numera la hoja con sheetNumbers ("Hoja 2 de 3")', async () => {
    const { build } = setup()
    const [only] = await textOf((await build({ ...ARGS, levelIds: ['level_b'], sheetNumbers: { start: 1, total: 3 } })).blob)
    expect(only).toContain('Hoja 2 de 3')
  })

  it('con el respaldo Helvetica no descarga DM Sans', async () => {
    const { build, loadFonts } = setup({ ...DECISIONS, fonts: 'helvetica' })
    const [first] = await textOf((await build(ARGS)).blob)
    expect(loadFonts).not.toHaveBeenCalled()
    expect(first).toContain('Casa Alvear')
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-build-plan-pages`
Expected: FAIL — el PDF no trae "Planta baja" ni "Hoja 1 de 2" (`expected '' to contain 'Planta baja'`): `pageChrome` todavía no existe.

- [ ] **Paso 2: Agregar el dibujo de cada hoja**

Modify `apps/web/src/editor/export/build-plan.ts`:

```diff
+import { levelDisplayName, zoneDisplayName } from '@/lib/editor-names'
 import { withColorFilter } from '@/lib/export/color-filter'
 import type { ExportDecisions } from '@/lib/export/decisions'
+import { drawSheet } from '@/lib/export/draw-sheet'
+import { formatLongDate } from '@/lib/export/format-date'
+import type { LegendEntry } from '@/lib/export/legend'
```

```diff
-import { type Point, areaLabel } from '@/lib/export/zone-labels'
+import { type Point, areaLabel, polygonArea } from '@/lib/export/zone-labels'
 import type { PdfFontBytes } from './pdf-fonts'
-import { type PdfRawLike, registerPdfFonts } from './pdf-surface'
+import { type PdfRawLike, createPdfSurface, registerPdfFonts } from './pdf-surface'
```

```diff
+const ZONE_FALLBACK_COLOR = '#9CA3AF'
+
 /** Arma las opciones del parche a partir de lo que eligió la persona y devuelve el PDF. */
 export function createBuildPlan(deps: BuildDeps) {
```

```diff
+    const legendFor = (levelId: string): LegendEntry[] => {
+      const zones = childrenOf(levelId, 'zone')
+        .filter((zone) => (zone.polygon?.length ?? 0) >= 3)
+        .map((zone): LegendEntry => ({ kind: 'zone', label: zoneDisplayName(zone.name), color: zone.color ?? ZONE_FALLBACK_COLOR, areaM2: polygonArea(zone.polygon ?? []) }))
+      const floors = childrenOf(levelId, 'slab').flatMap((slab): LegendEntry[] => {
+        const info = floorInfoOf(slab, deps.scene.materialById)
+        return info.label && info.color ? [{ kind: 'material', label: info.label, color: info.color }] : []
+      })
+      return [...zones, ...floors]
+    }
     const areaLabels = (levelId: string): GeoLike[] => {
```

```diff
+      pageChrome: (raw, context) => {
+        const node = nodes()[context.levelId]
+        const first = args.sheetNumbers?.start ?? 0
+        drawSheet(createPdfSurface(raw, deps.decisions.fonts), {
+          sheet,
+          mode: args.mode,
+          scale: args.scale,
+          projectName: args.projectName,
+          levelLabel: levelDisplayName({ name: node?.name, level: node?.level ?? 0 }),
+          author: args.author,
+          dateText: formatLongDate(args.date),
+          sheetNumber: first + context.index + 1,
+          sheetTotal: args.sheetNumbers?.total ?? context.count,
+          legend: legendFor(context.levelId),
+        })
+      },
       onProgress: args.onProgress ? (done, total) => args.onProgress?.({ done, total }) : undefined,
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-build-plan export-build-plan-pages`
Expected: PASS (`export-build-plan`: 7 pruebas; `export-build-plan-pages`: 4).

Si "la leyenda lista el ambiente" no encuentra `Ambiente 1 · 12,0 m²`, mira `zoneDisplayName('Zone 1')` (debe dar `Ambiente 1`) y el espacio de `formatArea`.

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/export/build-plan.ts apps/web/test/export-build-plan-pages.test.ts
git commit -m "feat(plano): cada hoja con su planta en castellano, leyenda, fecha en letras, autor y hoja N de M" -- apps/web/src/editor/export/build-plan.ts apps/web/test/export-build-plan-pages.test.ts
```

---

### Task 13: El puente `bridge.plan` (`measureLevels` y `build`) y el enlace real con Pascal

**Files:**
- Create: `apps/web/src/editor/shell/bridge/plan.ts`, `apps/web/src/editor/export/pascal-plan.ts`
- Modify: `apps/web/src/editor/shell/bridge/index.ts`, `apps/web/src/editor/pascal-bridge.ts`, `apps/web/test/support/fake-deps.ts`
- Test: `apps/web/test/shell-plan-bridge.test.ts`

**Interfaces:**
- Consumes: `PlanDeps`, `PlanLevel`, `LevelMeasure`, `PlanBuildArgs`, `PlanResult` (Tarea 1); `levelDisplayName` de `@/lib/editor-names`; `createBuildPlan`, `PagesOptions`, `ScenePort`, `SceneNode` (Tareas 12b y 12c); `loadPdfFonts` (Tarea 8); `EXPORT_DECISIONS` (Tarea 0e); `exportFloorplanPages`, `measureFloorplanLevels` y `FloorplanPagesOptions` de `@pascal-app/editor` (parche, Tarea 0a); `getCatalogMaterialById` y `useScene` de `@pascal-app/core` (verificados en `core/dist/index.d.ts`).
- Produces: `bridge.plan.measureLevels(): Promise<PlanLevel[]>` (cada planta con su nombre **en castellano**: `Planta baja`, `Planta 1`, `Sótano 1`; el dato guardado no se toca) y `bridge.plan.build(args: PlanBuildArgs): Promise<PlanResult>`; `planDeps(): PlanDeps` en `src/editor/export/pascal-plan.ts` (el único enlace real); en los dobles, `deps.measureLevels` y `deps.buildPlan` (`vi.fn`).

**Cubre el caso 2 de Review Focus** (plantas sin nombre o con el de Pascal en inglés) y la decisión D13 (una sola acción del puente: ni el diálogo ni el shell importan Pascal).

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-plan-bridge.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import type { PlanBuildArgs } from '../src/lib/export/types'
import { createFakeDeps } from './support/fake-deps'

const ARGS: PlanBuildArgs = {
  paper: 'A4',
  orientation: 'landscape',
  scale: 50,
  mode: 'paper',
  levelIds: ['a'],
  titleBlock: true,
  projectName: 'Casa',
  author: 'Ana',
  date: new Date(2026, 9, 12),
}

describe('bridge.plan', () => {
  it('measureLevels pone cada planta en castellano sin tocar el dato guardado (Review Focus 2)', async () => {
    const fake = createFakeDeps()
    fake.deps.measureLevels.mockResolvedValue([
      { id: 'a', name: null, level: 0, widthM: 7.8, heightM: 3.8, empty: false },
      { id: 'b', name: 'Floor 1', level: 1, widthM: 6, heightM: 3, empty: false },
      { id: 'c', name: 'Basement 1', level: -1, widthM: 4, heightM: 4, empty: true },
      { id: 'd', name: 'Altillo', level: 2, widthM: 2, heightM: 2, empty: false },
      { id: 'e', name: 'Ground Floor', level: 0, widthM: 1, heightM: 1, empty: false },
    ])
    const levels = await createBridge(fake.deps).plan.measureLevels()
    expect(levels.map((l) => l.label)).toEqual(['Planta baja', 'Planta 1', 'Sótano 1', 'Altillo', 'Planta baja'])
    expect(levels[2]).toEqual({ id: 'c', label: 'Sótano 1', widthM: 4, heightM: 4, empty: true })
    expect(Object.keys(levels[0] ?? {}).sort()).toEqual(['empty', 'heightM', 'id', 'label', 'widthM'])
  })

  it('una escena sin plantas da una lista vacía', async () => {
    const fake = createFakeDeps()
    expect(await createBridge(fake.deps).plan.measureLevels()).toEqual([])
  })

  it('si medir falla, el error sale tal cual', async () => {
    const fake = createFakeDeps()
    fake.deps.measureLevels.mockRejectedValue(new Error('no se pudo medir'))
    await expect(createBridge(fake.deps).plan.measureLevels()).rejects.toThrow('no se pudo medir')
  })

  it('build entrega los argumentos al parche y devuelve su resultado', async () => {
    const fake = createFakeDeps()
    const result = await createBridge(fake.deps).plan.build(ARGS)
    expect(fake.deps.buildPlan).toHaveBeenCalledWith(ARGS)
    expect(result).toMatchObject({ pages: 1, skippedImages: 0 })
    expect(result.blob).toBeInstanceOf(Blob)
  })

  it('build deja salir el error del parche (cancelación incluida)', async () => {
    const fake = createFakeDeps()
    fake.deps.buildPlan.mockRejectedValue(new DOMException('Exportación cancelada', 'AbortError'))
    await expect(createBridge(fake.deps).plan.build(ARGS)).rejects.toMatchObject({ name: 'AbortError' })
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run shell-plan-bridge`
Expected: FAIL — `fake.deps.measureLevels` no existe (TypeScript lo marca) y `bridge.plan` no existe.

- [ ] **Paso 2: Escribir la rebanada del puente**

Create `apps/web/src/editor/shell/bridge/plan.ts`:

```ts
import { levelDisplayName } from '@/lib/editor-names'
import type { PlanBuildArgs, PlanDeps, PlanLevel, PlanResult } from '@/lib/export/types'

export type { PlanDeps } from '@/lib/export/types'

/** Exportar plano: medir las plantas y armar el PDF. Todo lo que el diálogo sabe de Pascal está aquí (D13). */
export function createPlanSlice(deps: PlanDeps) {
  return {
    plan: {
      /** Las plantas del edificio activo, de la más baja a la más alta, con su nombre en castellano (`Planta baja`, `Planta 1`, `Sótano 1`). */
      async measureLevels(): Promise<PlanLevel[]> {
        const levels = await deps.measureLevels()
        return levels.map((level) => ({
          id: level.id,
          label: levelDisplayName({ name: level.name, level: level.level }),
          widthM: level.widthM,
          heightM: level.heightM,
          empty: level.empty,
        }))
      },
      build(args: PlanBuildArgs): Promise<PlanResult> {
        return deps.buildPlan(args)
      },
    },
  }
}
```

Modify `apps/web/src/editor/shell/bridge/index.ts`:

```diff
 import { type ModeDeps, createModeSlice } from './mode'
+import { type PlanDeps, createPlanSlice } from './plan'
 import { type PresetsDeps, createPresetsSlice } from './presets'
```

```diff
-export type BridgeDeps = CoreDeps & ModeDeps & LevelsDeps & CatalogDeps & MaterialsDeps & EditDeps & ViewDeps & PresetsDeps & LevelsManageDeps & FrameDeps
+export type BridgeDeps = CoreDeps & ModeDeps & LevelsDeps & CatalogDeps & MaterialsDeps & EditDeps & ViewDeps & PresetsDeps & LevelsManageDeps & FrameDeps & PlanDeps
```

```diff
     ...createFrameSlice(deps),
+    ...createPlanSlice(deps),
     // @@slices
```

Modify `apps/web/test/support/fake-deps.ts`:

```diff
 import type { MaterialItemLike } from '../../src/editor/shell/materials-model'
+import type { LevelMeasure, PlanBuildArgs, PlanResult } from '../../src/lib/export/types'
```

```diff
     armNodePatch: vi.fn(),
     clearNodePatch: vi.fn(),
+    measureLevels: vi.fn(async (): Promise<LevelMeasure[]> => []),
+    buildPlan: vi.fn(async (_args: PlanBuildArgs): Promise<PlanResult> => ({ blob: new Blob(['%PDF-1.4']), pages: 1, skippedImages: 0 })),
     // @@fake-deps
```

- [ ] **Paso 3: Escribir el enlace real con Pascal**

Create `apps/web/src/editor/export/pascal-plan.ts`:

```ts
import { getCatalogMaterialById, useScene } from '@pascal-app/core'
import { type FloorplanPagesOptions, exportFloorplanPages, measureFloorplanLevels } from '@pascal-app/editor'
import { EXPORT_DECISIONS } from '@/lib/export/decisions'
import type { LevelMeasure, PlanDeps } from '@/lib/export/types'
import { materialNameEs } from '@/lib/material-es'
import { type PagesOptions, type SceneNode, type ScenePort, createBuildPlan } from './build-plan'
import { loadPdfFonts } from './pdf-fonts'

/**
 * Las dos funciones reales de `bridge.plan`: medir con `measureFloorplanLevels` y armar con `exportFloorplanPages` (parche de
 * `@pascal-app/editor`, ver docs/pascal-notes.md). Único lugar de la exportación que toca Pascal, junto con el parche.
 */
export function planDeps(): PlanDeps {
  const scene: ScenePort = {
    nodes: () => useScene.getState().nodes as unknown as Readonly<Record<string, SceneNode>>,
    materialById: (id) => {
      const item = getCatalogMaterialById(id)
      return item ? { label: materialNameEs(id, item.label), category: item.category, previewColor: item.previewColor } : undefined
    },
  }
  const buildPlan = createBuildPlan({
    exportPages: (options: PagesOptions) => exportFloorplanPages(options as unknown as FloorplanPagesOptions),
    scene,
    loadFonts: () => loadPdfFonts(),
    decisions: EXPORT_DECISIONS,
  })
  return {
    measureLevels: async (): Promise<LevelMeasure[]> => measureFloorplanLevels(),
    buildPlan,
  }
}
```

Modify `apps/web/src/editor/pascal-bridge.ts`:

```diff
 import { levelManageDeps } from './level-manage-deps'
 import { nodePresets } from './node-presets'
+import { planDeps } from './export/pascal-plan'
 import { createViewStorage } from './shell/view-storage'
```

```diff
     ...frameDeps(),
+    ...planDeps(),
     // @@deps
```

- [ ] **Paso 4: Verde, tipos, fronteras y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-plan-bridge shell-boundaries shell-bridge`
Expected: PASS (`shell-plan-bridge`: 5 pruebas; `shell-boundaries` y las demás del puente, sin cambios).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint && pnpm exec vitest run tests/boundaries`
Expected: `Tipos OK …`, Biome sin errores nuevos y `tests/boundaries.test.ts` en verde (`lib/export` y `shell/` no importan Pascal; `src/editor/export/pascal-plan.ts` sí puede).

Si TypeScript dice que `measureFloorplanLevels` o `FloorplanPagesOptions` no existen en `@pascal-app/editor`, el parche de la Tarea 0a no está instalado: corre `pnpm install` y repite.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/bridge/plan.ts apps/web/src/editor/export/pascal-plan.ts apps/web/src/editor/shell/bridge/index.ts apps/web/src/editor/pascal-bridge.ts apps/web/test/support/fake-deps.ts apps/web/test/shell-plan-bridge.test.ts
git commit -m "feat(plano): bridge.plan con las plantas en castellano y el enlace real con Pascal" -- apps/web/src/editor/shell/bridge/plan.ts apps/web/src/editor/export/pascal-plan.ts apps/web/src/editor/shell/bridge/index.ts apps/web/src/editor/pascal-bridge.ts apps/web/test/support/fake-deps.ts apps/web/test/shell-plan-bridge.test.ts
```

---

### Task 14a: Estado del diálogo (1 de 3): opciones y cabida

**Files:**
- Create: `apps/web/src/editor/shell/export-plan-model.ts`
- Test: `apps/web/test/shell-export-plan-model.test.ts`

**Interfaces:**
- Consumes: `fitScale`, `FitResult`, `largestFittingScale`, `maxExtent`, `suggestOrientation` (Tarea 2); `sheetFor`, `Sheet` (Tarea 1); tipos de la Tarea 1; `TEXT`, `fitSummary`, `noFitMessage`, `scaleDisabledReason` (Tarea 7a).
- Produces en `@/editor/shell/export-plan-model` (puro, sin React ni Pascal):
  - `ExportForm = { paper; orientation; scale; mode; checked: readonly string[]; titleBlock }`, `ExportState`, `ExportAction`, `initialState`, `exportReducer(state, action): ExportState` (acciones `open`, `measured`, `measureFailed`, `paper`, `orientation`, `scale`, `mode`, `titleBlock` y `dismissMessage`).
  - Selectores: `selectedLevels(state): PlanLevel[]` (de la más baja a la más alta), `currentSheet(state): Sheet`, `scaleOptions(state): { scale: Scale; fit: FitResult; enabled: boolean; reason: string | null }[]`, `suggestedOrientation(state): Orientation`, `fitInfo(state): { summary: string | null; problem: 'nothing' | 'nofit' | null; canDownload: boolean; best: Scale | null }`.

**Cubre el criterio 7** (cabida y escalas deshabilitadas con su motivo) y los casos 1 y 3 de Review Focus (todo vacío; no cabe en ninguna escala). Reglas: la escala es una sola; el valor inicial es la mayor que cabe; la orientación sugerida sigue al edificio mientras la persona no la toque; una escala que no cabe no se puede elegir; "Descargar PDF" queda inactivo si no hay plantas marcadas o nada cabe. Marcar plantas y armar las opciones del PDF son la Tarea 14b; generar, la 14c.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-export-plan-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  type ExportState,
  currentSheet,
  exportReducer,
  fitInfo,
  initialState,
  scaleOptions,
  suggestedOrientation,
} from '../src/editor/shell/export-plan-model'
import type { PlanLevel } from '../src/lib/export/types'

const GROUND: PlanLevel = { id: 'a', label: 'Planta baja', widthM: 7.8, heightM: 3.8, empty: false }
const UPPER: PlanLevel = { id: 'b', label: 'Planta 1', widthM: 6, heightM: 3, empty: false }
const ATTIC: PlanLevel = { id: 'c', label: 'Altillo', widthM: 0, heightM: 0, empty: true }

const measured = (levels: PlanLevel[]): ExportState => exportReducer(exportReducer(initialState, { type: 'open' }), { type: 'measured', levels })
const reduce = (state: ExportState, ...actions: Parameters<typeof exportReducer>[1][]) => actions.reduce(exportReducer, state)

describe('apertura y medición', () => {
  it('empieza quieto, "open" pasa a medir y "measured" deja todo listo con las plantas no vacías marcadas', () => {
    expect(initialState.status).toBe('idle')
    expect(exportReducer(initialState, { type: 'open' }).status).toBe('measuring')
    const state = measured([GROUND, UPPER, ATTIC])
    expect(state.status).toBe('ready')
    expect(state.form.checked).toEqual(['a', 'b'])
    expect(state.form.paper).toBe('A4')
    expect(state.form.mode).toBe('paper')
    expect(state.form.titleBlock).toBe(true)
  })

  it('el valor inicial es la escala mayor que cabe y la orientación sugerida (A4: 1:50, apaisada)', () => {
    const state = measured([GROUND, UPPER])
    expect(state.form.scale).toBe(50)
    expect(state.form.orientation).toBe('landscape')
  })

  it('si medir falla, se avisa en castellano y no se puede descargar', () => {
    const state = reduce(initialState, { type: 'open' }, { type: 'measureFailed' })
    expect(state.status).toBe('ready')
    expect(state.messageKind).toBe('error')
    expect(state.message).toBe('No pudimos generar el PDF. Inténtalo de nuevo.')
    expect(fitInfo(state).canDownload).toBe(false)
  })
})

describe('escala y hoja (criterio 7)', () => {
  it('en A4 1:25 está deshabilitada con su motivo y 1:50 y 1:100 se pueden elegir; en A3 1:25 se habilita y se elige sola', () => {
    const a4 = measured([GROUND])
    const options = scaleOptions(a4)
    expect(options.map((o) => [o.scale, o.enabled])).toEqual([[25, false], [50, true], [100, true]])
    expect(options[0]?.reason).toBe('1:25 no cabe en A4: necesita 352 mm de ancho y la hoja ofrece 277 mm. Mejor ajuste: 1:50.')
    expect(options[1]?.reason).toBeNull()
    const a3 = exportReducer(a4, { type: 'paper', value: 'A3' })
    expect(scaleOptions(a3).every((o) => o.enabled)).toBe(true)
    expect(a3.form.scale).toBe(25)
  })

  it('el resumen dice cuánto de la hoja usa (64 % del ancho en A4 a 1:50; 88 % en A3 a 1:25)', () => {
    expect(fitInfo(measured([GROUND])).summary).toBe('Cabe en la hoja · usa 64 % del ancho')
    expect(fitInfo(exportReducer(measured([GROUND]), { type: 'paper', value: 'A3' })).summary).toBe('Cabe en la hoja · usa 88 % del ancho')
  })

  it('elegir una escala que no cabe no hace nada; elegir una que cabe la fija aunque cambie la hoja', () => {
    const a4 = measured([GROUND])
    expect(exportReducer(a4, { type: 'scale', value: 25 })).toBe(a4)
    const picked = reduce(a4, { type: 'scale', value: 100 }, { type: 'paper', value: 'A3' })
    expect(picked.form.scale).toBe(100)
  })

  it('si la escala elegida deja de caber (más plantas, otra hoja) pasa a la mayor que sí cabe', () => {
    // En A3 la escala sale sola en 1:25; se elige 1:100 y de nuevo 1:25 para que la persona la haya fijado a mano.
    const a3 = reduce(measured([GROUND]), { type: 'paper', value: 'A3' }, { type: 'scale', value: 100 }, { type: 'scale', value: 25 })
    expect(a3.form.scale).toBe(25)
    expect(a3.touched.scale).toBe(true)
    const a4 = exportReducer(a3, { type: 'paper', value: 'A4' })
    expect(a4.form.scale).toBe(50)
  })

  it('la orientación sugerida sigue al edificio hasta que la persona elige una', () => {
    const tall: PlanLevel = { id: 't', label: 'Torre', widthM: 4, heightM: 12, empty: false }
    const state = measured([tall])
    expect(state.form.orientation).toBe('portrait')
    expect(suggestedOrientation(state)).toBe('portrait')
    const manual = exportReducer(state, { type: 'orientation', value: 'landscape' })
    expect(manual.form.orientation).toBe('landscape')
    expect(exportReducer(manual, { type: 'paper', value: 'A3' }).form.orientation).toBe('landscape')
  })

  it('sin cajetín el área útil crece y la hoja tiene banda de 16 mm', () => {
    const state = exportReducer(measured([GROUND]), { type: 'titleBlock', value: false })
    expect(currentSheet(state).bandMm).toBe(16)
  })
})

describe('lo que no se puede exportar (Review Focus 1 y 3)', () => {
  it('con todas las plantas vacías dice que no hay nada que dibujar y no se puede descargar', () => {
    const state = measured([ATTIC])
    const info = fitInfo(state)
    expect(info.problem).toBe('nothing')
    expect(info.summary).toBe('Aún no hay nada que dibujar. Traza muros o ambientes y vuelve a intentarlo.')
    expect(info.canDownload).toBe(false)
  })

  it('un edificio que no cabe en ninguna escala deshabilita las tres, lo dice y no se puede descargar', () => {
    const market: PlanLevel = { id: 'm', label: 'Planta baja', widthM: 40, heightM: 30, empty: false }
    const state = measured([market])
    expect(scaleOptions(state).every((o) => !o.enabled)).toBe(true)
    const info = fitInfo(state)
    expect(info.problem).toBe('nofit')
    expect(info.best).toBeNull()
    expect(info.summary).toBe('El proyecto no cabe en esta hoja ni a 1:100. Prueba con A3 o quita plantas.')
    expect(info.canDownload).toBe(false)
    // El eje más justo es el alto: (30 + 1) × 1000 / 25 = 1240 mm contra 154 mm. Sin mejor ajuste, el motivo termina ahí.
    expect(scaleOptions(state)[0]?.reason).toBe('1:25 no cabe en A4: necesita 1240 mm de alto y la hoja ofrece 154 mm.')
  })

  it('en A3 el mensaje sugiere otra orientación en lugar de A3', () => {
    const market: PlanLevel = { id: 'm', label: 'Planta baja', widthM: 90, heightM: 80, empty: false }
    const state = exportReducer(measured([market]), { type: 'paper', value: 'A3' })
    expect(fitInfo(state).summary).toBe('El proyecto no cabe en esta hoja ni a 1:100. Prueba con otra orientación o quita plantas.')
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run shell-export-plan-model`
Expected: FAIL — `Cannot find module '../src/editor/shell/export-plan-model'`.

- [ ] **Paso 2: Escribir el modelo**

Create `apps/web/src/editor/shell/export-plan-model.ts`:

```ts
import { type FitResult, fitScale, largestFittingScale, maxExtent, suggestOrientation } from '@/lib/export/fit'
import { type Sheet, sheetFor } from '@/lib/export/sheet'
import { TEXT, fitSummary, noFitMessage, scaleDisabledReason } from '@/lib/export/texts-es'
import { type Orientation, type PaperSize, type PlanLevel, type PlanMode, type PlanProgress, SCALES, type Scale } from '@/lib/export/types'

export type ExportForm = {
  paper: PaperSize
  orientation: Orientation
  scale: Scale
  mode: PlanMode
  /** Ids de las plantas marcadas. */
  checked: readonly string[]
  titleBlock: boolean
}

export type ExportState = {
  status: 'idle' | 'measuring' | 'ready' | 'generating'
  levels: readonly PlanLevel[]
  form: ExportForm
  /** La persona ya eligió orientación o escala: no se las pisa al cambiar de hoja o de plantas (mientras sigan cabiendo). */
  touched: { orientation: boolean; scale: boolean }
  progress: PlanProgress | null
  message: string | null
  messageKind: 'error' | 'notice' | null
  /** Posición, entre las plantas marcadas, de la que muestra la vista previa. */
  previewIndex: number
}

export type ExportAction =
  | { type: 'open' }
  | { type: 'measured'; levels: readonly PlanLevel[] }
  | { type: 'measureFailed' }
  | { type: 'paper'; value: PaperSize }
  | { type: 'orientation'; value: Orientation }
  | { type: 'scale'; value: Scale }
  | { type: 'mode'; value: PlanMode }
  | { type: 'titleBlock'; value: boolean }
  | { type: 'dismissMessage' }

const DEFAULT_FORM: ExportForm = { paper: 'A4', orientation: 'landscape', scale: 50, mode: 'paper', checked: [], titleBlock: true }

export const initialState: ExportState = {
  status: 'idle',
  levels: [],
  form: DEFAULT_FORM,
  touched: { orientation: false, scale: false },
  progress: null,
  message: null,
  messageKind: null,
  previewIndex: 0,
}

/** Las plantas marcadas, en el orden en que las midió Pascal (de la más baja a la más alta). */
export const selectedLevels = (state: ExportState): PlanLevel[] => state.levels.filter((level) => state.form.checked.includes(level.id))
export const currentSheet = (state: ExportState): Sheet => sheetFor(state.form.paper, state.form.orientation, state.form.titleBlock)

/** Vuelve a calcular lo que depende de la hoja y de las plantas: orientación sugerida, escala que cabe y vista previa. */
function normalize(state: ExportState): ExportState {
  const extent = maxExtent(selectedLevels(state))
  let { orientation, scale } = state.form
  if (!state.touched.orientation) orientation = suggestOrientation(extent, state.form.paper, state.form.titleBlock)
  const sheet = sheetFor(state.form.paper, orientation, state.form.titleBlock)
  const best = largestFittingScale(extent, sheet)
  if (best !== null && (!state.touched.scale || !fitScale(extent, sheet, scale).fits)) scale = best
  const previewIndex = Math.min(state.previewIndex, Math.max(0, selectedLevels(state).length - 1))
  return { ...state, form: { ...state.form, orientation, scale }, previewIndex }
}

export function scaleOptions(state: ExportState): { scale: Scale; fit: FitResult; enabled: boolean; reason: string | null }[] {
  const extent = maxExtent(selectedLevels(state))
  const sheet = currentSheet(state)
  const best = largestFittingScale(extent, sheet)
  return SCALES.map((scale) => {
    const fit = fitScale(extent, sheet, scale)
    return { scale, fit, enabled: fit.fits, reason: fit.fits ? null : scaleDisabledReason(scale, state.form.paper, fit, best) }
  })
}

export const suggestedOrientation = (state: ExportState): Orientation =>
  suggestOrientation(maxExtent(selectedLevels(state)), state.form.paper, state.form.titleBlock)

export function fitInfo(state: ExportState): { summary: string | null; problem: 'nothing' | 'nofit' | null; canDownload: boolean; best: Scale | null } {
  const chosen = selectedLevels(state)
  const extent = maxExtent(chosen)
  const best = largestFittingScale(extent, currentSheet(state))
  if (state.status === 'idle' || state.status === 'measuring') return { summary: null, problem: null, canDownload: false, best }
  if (chosen.length === 0) return { summary: TEXT.errors.nothing, problem: 'nothing', canDownload: false, best }
  if (best === null) return { summary: noFitMessage(state.form.paper), problem: 'nofit', canDownload: false, best }
  const fit = fitScale(extent, currentSheet(state), state.form.scale)
  return { summary: fitSummary(fit), problem: null, canDownload: state.status === 'ready' && fit.fits, best }
}

export function exportReducer(state: ExportState, action: ExportAction): ExportState {
  switch (action.type) {
    case 'open':
      return { ...initialState, status: 'measuring' }
    case 'measured': {
      const checked = action.levels.filter((level) => !level.empty).map((level) => level.id)
      return normalize({ ...initialState, status: 'ready', levels: action.levels, form: { ...DEFAULT_FORM, checked } })
    }
    case 'measureFailed':
      return { ...initialState, status: 'ready', message: TEXT.errors.failed, messageKind: 'error' }
    case 'paper':
      return normalize({ ...state, form: { ...state.form, paper: action.value } })
    case 'orientation':
      return normalize({ ...state, touched: { ...state.touched, orientation: true }, form: { ...state.form, orientation: action.value } })
    case 'scale': {
      const option = scaleOptions(state).find((o) => o.scale === action.value)
      if (!option?.enabled || action.value === state.form.scale) return state
      return { ...state, touched: { ...state.touched, scale: true }, form: { ...state.form, scale: action.value } }
    }
    case 'mode':
      return { ...state, form: { ...state.form, mode: action.value } }
    case 'titleBlock':
      return normalize({ ...state, form: { ...state.form, titleBlock: action.value } })
    case 'dismissMessage':
      return { ...state, message: null, messageKind: null }
  }
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-export-plan-model`
Expected: PASS (12 pruebas).

Si falla una de las de cabida, recalcula a mano con la regla del spec: `(medida + 1) × 1000 / escala` mm contra el área útil (A4 apaisada 277 × 154 mm con cajetín, 277 × 174 sin él); el eje más justo es el que da el porcentaje y el motivo.

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/export-plan-model.ts apps/web/test/shell-export-plan-model.test.ts
git commit -m "feat(plano): estado del diálogo de exportar plano con cabida, escalas y orientación sugerida" -- apps/web/src/editor/shell/export-plan-model.ts apps/web/test/shell-export-plan-model.test.ts
```

---

### Task 14b: Estado del diálogo (2 de 3): marcar plantas y armar las opciones del PDF

**Files:**
- Modify: `apps/web/src/editor/shell/export-plan-model.ts`
- Test: `apps/web/test/shell-export-plan-levels.test.ts`

**Interfaces:**
- Consumes: el reductor y los selectores de la Tarea 14a; `PlanBuildArgs` (Tarea 1).
- Produces: las acciones `toggleLevel` y `previewLevel` del mismo `exportReducer`, y `buildArgs(state, meta: { projectName; author; date }): PlanBuildArgs` y `previewArgs(state, meta)` (solo la planta de la vista previa, numerada como en el PDF completo con `sheetNumbers`).

**Cubre los criterios 4 y 8** (una hoja por planta marcada, de la más baja a la más alta; la vista previa sigue a una planta marcada) y el caso 1 de Review Focus (la planta vacía no se marca ni se puede marcar; la última marcada no se puede desmarcar).

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-export-plan-levels.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { type ExportState, buildArgs, exportReducer, initialState, previewArgs, selectedLevels } from '../src/editor/shell/export-plan-model'
import type { PlanLevel } from '../src/lib/export/types'

const GROUND: PlanLevel = { id: 'a', label: 'Planta baja', widthM: 7.8, heightM: 3.8, empty: false }
const UPPER: PlanLevel = { id: 'b', label: 'Planta 1', widthM: 6, heightM: 3, empty: false }
const ATTIC: PlanLevel = { id: 'c', label: 'Altillo', widthM: 0, heightM: 0, empty: true }
const META = { projectName: 'Casa Alvear', author: 'Silvert Quispe', date: new Date(2026, 9, 12) }

const measured = (levels: PlanLevel[]): ExportState => exportReducer(exportReducer(initialState, { type: 'open' }), { type: 'measured', levels })
const reduce = (state: ExportState, ...actions: Parameters<typeof exportReducer>[1][]) => actions.reduce(exportReducer, state)

describe('plantas', () => {
  it('una planta vacía no se marca ni se puede marcar; la última marcada no se puede desmarcar', () => {
    const state = measured([GROUND, UPPER, ATTIC])
    expect(exportReducer(state, { type: 'toggleLevel', id: 'c' })).toBe(state)
    const one = exportReducer(state, { type: 'toggleLevel', id: 'b' })
    expect(one.form.checked).toEqual(['a'])
    expect(exportReducer(one, { type: 'toggleLevel', id: 'a' })).toBe(one)
  })

  it('desmarcar la planta más grande libera una escala mayor mientras la persona no haya elegido una', () => {
    const big: PlanLevel = { id: 'big', label: 'Planta baja', widthM: 14, heightM: 5, empty: false }
    const state = measured([big, UPPER])
    expect(state.form.scale).toBe(100)
    expect(exportReducer(state, { type: 'toggleLevel', id: 'big' }).form.scale).toBe(50)
  })

  it('las plantas elegidas salen de la más baja a la más alta, como las midió Pascal', () => {
    const state = measured([GROUND, UPPER])
    expect(selectedLevels(state).map((l) => l.id)).toEqual(['a', 'b'])
    expect(buildArgs(state, META).levelIds).toEqual(['a', 'b'])
  })

  it('la vista previa sigue a una planta marcada y se queda dentro de las marcadas', () => {
    const state = reduce(measured([GROUND, UPPER]), { type: 'previewLevel', index: 5 })
    expect(state.previewIndex).toBe(1)
    const fewer = exportReducer(state, { type: 'toggleLevel', id: 'b' })
    expect(fewer.previewIndex).toBe(0)
    expect(previewArgs(state, META).levelIds).toEqual(['b'])
    expect(previewArgs(state, META).sheetNumbers).toEqual({ start: 1, total: 2 })
  })
})

describe('opciones del PDF', () => {
  it('buildArgs arma las opciones con lo elegido y los datos del proyecto', () => {
    const state = reduce(measured([GROUND, UPPER]), { type: 'mode', value: 'color' }, { type: 'titleBlock', value: false })
    expect(buildArgs(state, META)).toEqual({
      paper: 'A4',
      orientation: 'landscape',
      scale: 50,
      mode: 'color',
      levelIds: ['a', 'b'],
      titleBlock: false,
      projectName: 'Casa Alvear',
      author: 'Silvert Quispe',
      date: META.date,
    })
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run shell-export-plan-levels`
Expected: FAIL — `buildArgs` y `previewArgs` no están exportados y `toggleLevel` no existe.

- [ ] **Paso 2: Agregar las plantas y las opciones del PDF al modelo**

Modify `apps/web/src/editor/shell/export-plan-model.ts`:

```diff
-import { type Orientation, type PaperSize, type PlanLevel, type PlanMode, type PlanProgress, SCALES, type Scale } from '@/lib/export/types'
+import { type Orientation, type PaperSize, type PlanBuildArgs, type PlanLevel, type PlanMode, type PlanProgress, SCALES, type Scale } from '@/lib/export/types'
```

```diff
   | { type: 'titleBlock'; value: boolean }
+  | { type: 'toggleLevel'; id: string }
+  | { type: 'previewLevel'; index: number }
   | { type: 'dismissMessage' }
```

```diff
+    case 'toggleLevel': {
+      const level = state.levels.find((l) => l.id === action.id)
+      if (!level || level.empty) return state
+      const isOn = state.form.checked.includes(action.id)
+      if (isOn && state.form.checked.length === 1) return state
+      const checked = state.levels.filter((l) => (l.id === action.id ? !isOn : state.form.checked.includes(l.id))).map((l) => l.id)
+      return normalize({ ...state, form: { ...state.form, checked } })
+    }
+    case 'previewLevel':
+      return normalize({ ...state, previewIndex: Math.max(0, action.index) })
     case 'dismissMessage':
```

Y al final del archivo (después de `exportReducer`):

```ts
type Meta = { projectName: string; author: string; date: Date }

/** Las opciones del PDF completo (una hoja por planta marcada). */
export function buildArgs(state: ExportState, meta: Meta): PlanBuildArgs {
  const { paper, orientation, scale, mode, titleBlock } = state.form
  return { paper, orientation, scale, mode, levelIds: selectedLevels(state).map((level) => level.id), titleBlock, ...meta }
}

/** Las opciones de la vista previa: solo la planta que se está viendo, numerada como en el PDF completo. */
export function previewArgs(state: ExportState, meta: Meta): PlanBuildArgs {
  const chosen = selectedLevels(state)
  const level = chosen[state.previewIndex]
  return { ...buildArgs(state, meta), levelIds: level ? [level.id] : [], sheetNumbers: { start: state.previewIndex, total: chosen.length } }
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-export-plan`
Expected: PASS (`shell-export-plan-model`: 12 pruebas; `shell-export-plan-levels`: 5).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/export-plan-model.ts apps/web/test/shell-export-plan-levels.test.ts
git commit -m "feat(plano): marcar plantas y armar las opciones del PDF en el estado del diálogo" -- apps/web/src/editor/shell/export-plan-model.ts apps/web/test/shell-export-plan-levels.test.ts
```

---

### Task 14c: Estado del diálogo (3 de 3): generar, progreso, cancelación y mensajes

**Files:**
- Modify: `apps/web/src/editor/shell/export-plan-model.ts`
- Test: `apps/web/test/shell-export-plan-generate.test.ts`

**Interfaces:**
- Consumes: el reductor y los selectores de las Tareas 14a y 14b; `skippedImagesText`, `TEXT` (Tarea 7a); `PlanProgress` (Tarea 1).
- Produces: las acciones `generate`, `progress`, `done`, `failed` y `cancelled` del mismo `exportReducer` (estado `status: 'generating'` con `progress`, y `message`/`messageKind` al terminar).

**Cubre el criterio 14** (un solo vuelo: un segundo `generate` no hace nada; progreso por planta; los muebles que faltaron se avisan en castellano; un error y una cancelación dejan el diálogo listo con su mensaje) y el caso 5 de Review Focus (el aviso de cuántos muebles faltaron).

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-export-plan-generate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { type ExportState, exportReducer, fitInfo, initialState } from '../src/editor/shell/export-plan-model'
import type { PlanLevel } from '../src/lib/export/types'

const GROUND: PlanLevel = { id: 'a', label: 'Planta baja', widthM: 7.8, heightM: 3.8, empty: false }
const UPPER: PlanLevel = { id: 'b', label: 'Planta 1', widthM: 6, heightM: 3, empty: false }
const ATTIC: PlanLevel = { id: 'c', label: 'Altillo', widthM: 0, heightM: 0, empty: true }

const measured = (levels: PlanLevel[]): ExportState => exportReducer(exportReducer(initialState, { type: 'open' }), { type: 'measured', levels })

describe('generar (criterio 14)', () => {
  it('"generate" pasa a generando y un segundo "generate" no hace nada (un solo vuelo)', () => {
    const ready = measured([GROUND, UPPER])
    const generating = exportReducer(ready, { type: 'generate' })
    expect(generating.status).toBe('generating')
    expect(generating.progress).toEqual({ done: 0, total: 2 })
    expect(exportReducer(generating, { type: 'generate' })).toBe(generating)
    expect(fitInfo(generating).canDownload).toBe(false)
  })

  it('no se genera si no se puede descargar', () => {
    const nothing = measured([ATTIC])
    expect(exportReducer(nothing, { type: 'generate' })).toBe(nothing)
  })

  it('el progreso se refleja y al terminar vuelve a "listo"; los muebles que faltaron se avisan', () => {
    const generating = exportReducer(measured([GROUND, UPPER]), { type: 'generate' })
    const half = exportReducer(generating, { type: 'progress', value: { done: 1, total: 2 } })
    expect(half.progress).toEqual({ done: 1, total: 2 })
    const done = exportReducer(half, { type: 'done', skippedImages: 3 })
    expect(done.status).toBe('ready')
    expect(done.progress).toBeNull()
    expect(done.messageKind).toBe('notice')
    expect(done.message).toBe('No se pudieron dibujar 3 muebles; el resto del plano sí está en el PDF.')
    expect(exportReducer(half, { type: 'done', skippedImages: 0 }).message).toBeNull()
  })

  it('un error y una cancelación dejan el diálogo listo con su mensaje en castellano', () => {
    const generating = exportReducer(measured([GROUND]), { type: 'generate' })
    const failed = exportReducer(generating, { type: 'failed' })
    expect(failed).toMatchObject({ status: 'ready', messageKind: 'error', message: 'No pudimos generar el PDF. Inténtalo de nuevo.' })
    const cancelled = exportReducer(generating, { type: 'cancelled' })
    expect(cancelled).toMatchObject({ status: 'ready', messageKind: 'notice', message: 'Cancelaste la exportación.' })
    expect(exportReducer(cancelled, { type: 'dismissMessage' }).message).toBeNull()
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run shell-export-plan-generate`
Expected: FAIL — TypeScript no acepta `{ type: 'generate' }` y el reductor devuelve el mismo estado (`expected 'ready' to be 'generating'`).

- [ ] **Paso 2: Agregar generar al modelo**

Modify `apps/web/src/editor/shell/export-plan-model.ts`:

```diff
-import { TEXT, fitSummary, noFitMessage, scaleDisabledReason } from '@/lib/export/texts-es'
+import { TEXT, fitSummary, noFitMessage, scaleDisabledReason, skippedImagesText } from '@/lib/export/texts-es'
```

```diff
   | { type: 'previewLevel'; index: number }
+  | { type: 'generate' }
+  | { type: 'progress'; value: PlanProgress }
+  | { type: 'done'; skippedImages: number }
+  | { type: 'failed' }
+  | { type: 'cancelled' }
   | { type: 'dismissMessage' }
```

```diff
     case 'previewLevel':
       return normalize({ ...state, previewIndex: Math.max(0, action.index) })
+    case 'generate':
+      if (!fitInfo(state).canDownload) return state
+      return { ...state, status: 'generating', progress: { done: 0, total: selectedLevels(state).length }, message: null, messageKind: null }
+    case 'progress':
+      return state.status === 'generating' ? { ...state, progress: action.value } : state
+    case 'done':
+      return {
+        ...state,
+        status: 'ready',
+        progress: null,
+        message: action.skippedImages > 0 ? skippedImagesText(action.skippedImages) : null,
+        messageKind: action.skippedImages > 0 ? 'notice' : null,
+      }
+    case 'failed':
+      return { ...state, status: 'ready', progress: null, message: TEXT.errors.failed, messageKind: 'error' }
+    case 'cancelled':
+      return { ...state, status: 'ready', progress: null, message: TEXT.errors.cancelled, messageKind: 'notice' }
     case 'dismissMessage':
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-export-plan-model shell-export-plan-generate`
Expected: PASS (`shell-export-plan-model`: 17 pruebas; `shell-export-plan-generate`: 4).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/export-plan-model.ts apps/web/test/shell-export-plan-generate.test.ts
git commit -m "feat(plano): generar, progreso, cancelación y mensajes en el estado del diálogo de exportar plano" -- apps/web/src/editor/shell/export-plan-model.ts apps/web/test/shell-export-plan-generate.test.ts
```

---

## Diálogo "Exportar plano" (Tareas 15a a 18b)

### Task 15a: Las opciones del diálogo (1 de 2): hoja, orientación, escala y modo

**Files:**
- Create: `apps/web/src/editor/shell/ui/PlanOptions.tsx`
- Test: `apps/web/test/shell-plan-options.test.tsx`

**Interfaces:**
- Consumes: `TEXT`, `scaleText` (Tarea 7a); `Orientation`, `PaperSize`, `PlanMode`, `Scale` (Tarea 1); `Badge` de `./primitives`.
- Produces `PlanOptions(props: PlanOptionsProps)` en `shell/ui/PlanOptions.tsx`, con `ScaleChoice = { scale: Scale; enabled: boolean; reason: string | null }`, `LevelChoice = { id: string; label: string; empty: boolean; checked: boolean }` y `PlanOptionsProps = { paper; orientation; scale; mode; titleBlock; suggestedOrientation; scales: readonly ScaleChoice[]; levels: readonly LevelChoice[]; busy: boolean; onPaper(v); onOrientation(v); onScale(v); onMode(v); onTitleBlock(v); onToggleLevel(id) }`. Es presentacional: no importa Pascal ni el puente. En esta tarea dibuja los cuatro primeros grupos; las plantas y el cajetín son la 15b.

**Cubre el criterio 15 (accesibilidad) en las opciones:** cada grupo es un `<fieldset>` con `<legend>` y botones de opción nativos (`radio`), así que el teclado funciona sin código (flechas dentro del grupo, Tab entre grupos); las escalas que no caben están deshabilitadas y explican su motivo con `aria-describedby` y con un texto visible; todos los objetivos miden al menos 44 px (`min-h-11`); los íconos son de `lucide-react` con `aria-hidden`; "Sugerida" acompaña a la orientación que permite la escala mayor.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-plan-options.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlanOptions, type PlanOptionsProps } from '../src/editor/shell/ui/PlanOptions'

const noop = () => {}
const SCALES: PlanOptionsProps['scales'] = [
  { scale: 25, enabled: false, reason: '1:25 no cabe en A4: necesita 352 mm de ancho y la hoja ofrece 277 mm. Mejor ajuste: 1:50.' },
  { scale: 50, enabled: true, reason: null },
  { scale: 100, enabled: true, reason: null },
]
const LEVELS: PlanOptionsProps['levels'] = [
  { id: 'a', label: 'Planta baja', empty: false, checked: true },
  { id: 'b', label: 'Planta 1', empty: false, checked: true },
  { id: 'c', label: 'Altillo', empty: true, checked: false },
]
const BASE: PlanOptionsProps = {
  paper: 'A4',
  orientation: 'landscape',
  scale: 50,
  mode: 'paper',
  titleBlock: true,
  suggestedOrientation: 'landscape',
  scales: SCALES,
  levels: LEVELS,
  busy: false,
  onPaper: noop,
  onOrientation: noop,
  onScale: noop,
  onMode: noop,
  onTitleBlock: noop,
  onToggleLevel: noop,
}
const render = (overrides: Partial<PlanOptionsProps> = {}) => renderToStaticMarkup(<PlanOptions {...BASE} {...overrides} />)
const inputs = (markup: string) => markup.match(/<input[^>]*>/g) ?? []
const input = (markup: string, type: string, value: string) => inputs(markup).find((tag) => tag.includes(`type="${type}"`) && tag.includes(`value="${value}"`)) ?? ''
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')

describe('opciones del diálogo (criterio 15)', () => {
  const markup = render()

  it('hoja, orientación, escala y modo son grupos con su título y opciones de radio, con la elegida marcada', () => {
    for (const legend of ['Hoja', 'Orientación', 'Escala', 'Modo']) {
      expect(markup, legend).toMatch(new RegExp(`<legend[^>]*>${legend}</legend>`))
    }
    expect(inputs(markup).filter((tag) => tag.includes('type="radio"'))).toHaveLength(9)
    for (const [value, checked] of [['A4', true], ['A3', false], ['landscape', true], ['portrait', false], ['50', true], ['100', false], ['paper', true], ['color', false]] as const) {
      expect(input(markup, 'radio', value).includes('checked=""'), value).toBe(checked)
    }
  })

  it('las opciones se llaman en castellano y no traen emojis', () => {
    const text = textOf(markup)
    for (const label of ['A4', 'A3', 'Apaisada', 'Vertical', '1:25', '1:50', '1:100', 'Papel', 'Color']) {
      expect(text, label).toContain(label)
    }
    expect(markup).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(markup).not.toMatch(/\b(Floor|Level|Scale|Sheet)\b/)
  })

  it('1:25 está deshabilitada y explica su motivo con aria-describedby y con un texto visible', () => {
    const tag = input(markup, 'radio', '25')
    expect(tag).toContain('disabled=""')
    const describedBy = /aria-describedby="([^"]+)"/.exec(tag)?.[1]
    expect(describedBy).toBeTruthy()
    expect(markup).toMatch(new RegExp(`<span[^>]*id="${describedBy}"[^>]*>1:25 no cabe en A4`))
    expect(markup).toMatch(/<p[^>]*>1:25 no cabe en A4: necesita 352 mm de ancho/)
    expect(input(markup, 'radio', '50')).not.toContain('disabled')
  })

  it('"Sugerida" acompaña a la orientación que permite la escala mayor', () => {
    const labelOf = (html: string, value: string) => html.split('<label').find((part) => part.includes(`value="${value}"`)) ?? ''
    const portrait = render({ suggestedOrientation: 'portrait' })
    expect(labelOf(portrait, 'portrait')).toContain('Sugerida')
    expect(labelOf(portrait, 'landscape')).not.toContain('Sugerida')
    expect(markup.match(/Sugerida/g)).toHaveLength(1)
    expect(labelOf(markup, 'landscape')).toContain('Sugerida')
  })

  it('mientras genera, todas las opciones quedan deshabilitadas', () => {
    for (const tag of inputs(render({ busy: true }))) expect(tag).toContain('disabled=""')
  })

  it('los objetivos táctiles miden al menos 44 px y los íconos son decorativos', () => {
    expect(markup.match(/min-h-11/g)?.length ?? 0).toBeGreaterThanOrEqual(9)
    for (const svg of markup.match(/<svg[^>]*>/g) ?? []) expect(svg).toContain('aria-hidden="true"')
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run shell-plan-options`
Expected: FAIL — `Cannot find module '../src/editor/shell/ui/PlanOptions'`.

- [ ] **Paso 2: Escribir las opciones**

Create `apps/web/src/editor/shell/ui/PlanOptions.tsx`:

```tsx
'use client'

import { Palette, Printer, RectangleHorizontal, RectangleVertical } from 'lucide-react'
import { type ReactNode, useId } from 'react'
import { TEXT, scaleText } from '@/lib/export/texts-es'
import type { Orientation, PaperSize, PlanMode, Scale } from '@/lib/export/types'
import { Badge } from './primitives'

export type ScaleChoice = { scale: Scale; enabled: boolean; reason: string | null }
export type LevelChoice = { id: string; label: string; empty: boolean; checked: boolean }

export type PlanOptionsProps = {
  paper: PaperSize
  orientation: Orientation
  scale: Scale
  mode: PlanMode
  titleBlock: boolean
  suggestedOrientation: Orientation
  scales: readonly ScaleChoice[]
  levels: readonly LevelChoice[]
  /** Generando: nada se puede cambiar. */
  busy: boolean
  onPaper(value: PaperSize): void
  onOrientation(value: Orientation): void
  onScale(value: Scale): void
  onMode(value: PlanMode): void
  onTitleBlock(value: boolean): void
  onToggleLevel(id: string): void
}

const CHIP =
  'relative inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-full bg-white px-4 text-[15px] font-medium text-ink shadow-soft transition-colors duration-150 hover:bg-brand-wash motion-reduce:transition-none has-[:checked]:bg-ink has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand/45 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45 has-[:disabled]:hover:bg-white'

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1.5 ml-1.5 text-[13px] text-ink-muted">{legend}</legend>
      {children}
    </fieldset>
  )
}

function Choice({
  name,
  value,
  label,
  checked,
  disabled,
  describedBy,
  icon,
  badge,
  onChange,
}: {
  name: string
  value: string
  label: string
  checked: boolean
  disabled: boolean
  describedBy?: string
  icon?: ReactNode
  badge?: ReactNode
  onChange(): void
}) {
  return (
    <label className={CHIP}>
      <input
        aria-describedby={describedBy}
        checked={checked}
        className="sr-only"
        disabled={disabled}
        name={name}
        onChange={onChange}
        type="radio"
        value={value}
      />
      {icon}
      {label}
      {badge}
    </label>
  )
}

/** Hoja, orientación, escala, modo, plantas y cajetín: la columna izquierda del diálogo "Exportar plano". */
export function PlanOptions(props: PlanOptionsProps) {
  const id = useId()
  const { busy } = props
  const firstBlocked = props.scales.find((choice) => !choice.enabled && choice.reason)
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Group legend={TEXT.paper}>
        <div className="flex flex-wrap gap-2">
          {(['A4', 'A3'] as const).map((paper) => (
            <Choice checked={props.paper === paper} disabled={busy} key={paper} label={paper} name={`${id}-paper`} onChange={() => props.onPaper(paper)} value={paper} />
          ))}
        </div>
      </Group>

      <Group legend={TEXT.orientation}>
        <div className="flex flex-wrap gap-2">
          {(['landscape', 'portrait'] as const).map((orientation) => (
            <Choice
              badge={props.suggestedOrientation === orientation ? <Badge>{TEXT.suggested}</Badge> : null}
              checked={props.orientation === orientation}
              disabled={busy}
              icon={orientation === 'landscape' ? <RectangleHorizontal aria-hidden="true" className="size-[18px]" strokeWidth={2} /> : <RectangleVertical aria-hidden="true" className="size-[18px]" strokeWidth={2} />}
              key={orientation}
              label={orientation === 'landscape' ? TEXT.landscape : TEXT.portrait}
              name={`${id}-orientation`}
              onChange={() => props.onOrientation(orientation)}
              value={orientation}
            />
          ))}
        </div>
      </Group>

      <Group legend={TEXT.scale}>
        <div className="flex flex-wrap gap-2">
          {props.scales.map((choice) => {
            const reasonId = `${id}-reason-${choice.scale}`
            return (
              <span className="contents" key={choice.scale}>
                <Choice
                  checked={props.scale === choice.scale}
                  describedBy={choice.reason ? reasonId : undefined}
                  disabled={busy || !choice.enabled}
                  label={scaleText(choice.scale)}
                  name={`${id}-scale`}
                  onChange={() => props.onScale(choice.scale)}
                  value={String(choice.scale)}
                />
                {choice.reason && (
                  <span className="sr-only" id={reasonId}>
                    {choice.reason}
                  </span>
                )}
              </span>
            )
          })}
        </div>
        {firstBlocked?.reason && <p className="ml-1.5 mt-1.5 text-[13px] text-sun-ink">{firstBlocked.reason}</p>}
      </Group>

      <Group legend={TEXT.mode}>
        <div className="flex flex-wrap gap-2">
          <Choice checked={props.mode === 'paper'} disabled={busy} icon={<Printer aria-hidden="true" className="size-[18px]" strokeWidth={2} />} label={TEXT.modePaper} name={`${id}-mode`} onChange={() => props.onMode('paper')} value="paper" />
          <Choice checked={props.mode === 'color'} disabled={busy} icon={<Palette aria-hidden="true" className="size-[18px]" strokeWidth={2} />} label={TEXT.modeColor} name={`${id}-mode`} onChange={() => props.onMode('color')} value="color" />
        </div>
        <p className="ml-1.5 mt-1.5 text-[13px] text-ink-muted">{props.mode === 'paper' ? TEXT.modePaperHint : TEXT.modeColorHint}</p>
      </Group>
    </div>
  )
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-plan-options`
Expected: PASS (6 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/ui/PlanOptions.tsx apps/web/test/shell-plan-options.test.tsx
git commit -m "feat(plano): opciones accesibles del diálogo de exportar plano (hoja, orientación, escala y modo)" -- apps/web/src/editor/shell/ui/PlanOptions.tsx apps/web/test/shell-plan-options.test.tsx
```

---

### Task 15b: Las opciones del diálogo (2 de 2): plantas y cajetín

**Files:**
- Modify: `apps/web/src/editor/shell/ui/PlanOptions.tsx`
- Test: `apps/web/test/shell-plan-options-levels.test.tsx`

**Interfaces:**
- Consumes: `PlanOptions`, `PlanOptionsProps` y los tipos de la Tarea 15a; `TEXT` (Tarea 7a); `cx` de `@/lib/cx`.
- Produces: el mismo `PlanOptions`, que ahora dibuja también el grupo **Plantas** (una casilla por planta) y el interruptor **Incluir cajetín**.

**Cubre el criterio 15** y el caso 1 de Review Focus: las plantas vacías van deshabilitadas y desmarcadas con "(vacía)" y la última marcada no se puede desmarcar (cada una con su explicación en `aria-describedby`); "Incluir cajetín" es un interruptor (`role="switch"`) con su ayuda; mientras se genera nada se puede cambiar.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-plan-options-levels.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlanOptions, type PlanOptionsProps } from '../src/editor/shell/ui/PlanOptions'

const noop = () => {}
const SCALES: PlanOptionsProps['scales'] = [
  { scale: 25, enabled: false, reason: '1:25 no cabe en A4: necesita 352 mm de ancho y la hoja ofrece 277 mm. Mejor ajuste: 1:50.' },
  { scale: 50, enabled: true, reason: null },
  { scale: 100, enabled: true, reason: null },
]
const LEVELS: PlanOptionsProps['levels'] = [
  { id: 'a', label: 'Planta baja', empty: false, checked: true },
  { id: 'b', label: 'Planta 1', empty: false, checked: true },
  { id: 'c', label: 'Altillo', empty: true, checked: false },
]
const BASE: PlanOptionsProps = {
  paper: 'A4',
  orientation: 'landscape',
  scale: 50,
  mode: 'paper',
  titleBlock: true,
  suggestedOrientation: 'landscape',
  scales: SCALES,
  levels: LEVELS,
  busy: false,
  onPaper: noop,
  onOrientation: noop,
  onScale: noop,
  onMode: noop,
  onTitleBlock: noop,
  onToggleLevel: noop,
}
const render = (overrides: Partial<PlanOptionsProps> = {}) => renderToStaticMarkup(<PlanOptions {...BASE} {...overrides} />)
const inputs = (markup: string) => markup.match(/<input[^>]*>/g) ?? []
const input = (markup: string, type: string, value: string) => inputs(markup).find((tag) => tag.includes(`type="${type}"`) && tag.includes(`value="${value}"`)) ?? ''
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')

describe('plantas y cajetín (criterio 15)', () => {
  const markup = render()

  it('las plantas son un grupo más, con su título y una casilla por planta', () => {
    expect(markup.match(/<fieldset/g)).toHaveLength(5)
    expect(markup).toMatch(/<legend[^>]*>Plantas<\/legend>/)
    expect(inputs(markup).filter((tag) => tag.includes('type="checkbox"') && tag.includes('value='))).toHaveLength(3)
    expect(textOf(markup)).toContain('Planta baja')
    expect(textOf(markup)).toContain('Planta 1')
    expect(textOf(markup)).toContain('Incluir cajetín')
  })

  it('una planta vacía va deshabilitada, desmarcada y con "(vacía)"', () => {
    const tag = input(markup, 'checkbox', 'c')
    expect(tag).toContain('disabled=""')
    expect(tag).not.toContain('checked=""')
    expect(textOf(markup)).toContain('Altillo (vacía)')
    expect(markup).toContain('Esta planta no tiene nada dibujado.')
  })

  it('la última planta marcada no se puede desmarcar y dice por qué', () => {
    const only = render({ levels: [{ id: 'a', label: 'Planta baja', empty: false, checked: true }, { id: 'b', label: 'Planta 1', empty: false, checked: false }] })
    expect(input(only, 'checkbox', 'a')).toContain('disabled=""')
    expect(input(only, 'checkbox', 'b')).not.toContain('disabled')
    expect(only).toContain('Tiene que quedar al menos una planta marcada.')
    expect(input(markup, 'checkbox', 'a')).not.toContain('disabled')
  })

  it('"Incluir cajetín" es un interruptor con su ayuda', () => {
    const tag = inputs(markup).find((t) => t.includes('role="switch"')) ?? ''
    expect(tag).toContain('checked=""')
    expect(textOf(markup)).toContain('Proyecto, escala, fecha y autor')
    expect(inputs(render({ titleBlock: false })).find((t) => t.includes('role="switch"'))).not.toContain('checked=""')
  })

  it('mientras genera, las casillas y el interruptor quedan deshabilitados', () => {
    for (const tag of inputs(render({ busy: true })).filter((t) => t.includes('type="checkbox"'))) expect(tag).toContain('disabled=""')
  })

  it('los objetivos táctiles de las plantas y del interruptor miden al menos 44 px', () => {
    expect(markup.match(/min-h-11/g)?.length ?? 0).toBeGreaterThanOrEqual(13)
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run shell-plan-options-levels`
Expected: FAIL — `expected null to have a length of 5` (todavía no se dibuja el grupo de plantas).

- [ ] **Paso 2: Agregar las plantas y el cajetín**

Modify `apps/web/src/editor/shell/ui/PlanOptions.tsx`:

```diff
 import { type ReactNode, useId } from 'react'
+import { cx } from '@/lib/cx'
 import { TEXT, scaleText } from '@/lib/export/texts-es'
```

```diff
+const ROW =
+  'flex min-h-11 cursor-pointer items-center gap-3 rounded-[16px] bg-white px-4 text-[15px] text-ink shadow-soft has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand/45'
+
 function Group({ legend, children }: { legend: string; children: ReactNode }) {
```

```diff
   const { busy } = props
+  const checkedCount = props.levels.filter((level) => level.checked).length
   const firstBlocked = props.scales.find((choice) => !choice.enabled && choice.reason)
```

```diff
         <p className="ml-1.5 mt-1.5 text-[13px] text-ink-muted">{props.mode === 'paper' ? TEXT.modePaperHint : TEXT.modeColorHint}</p>
       </Group>
+
+      <Group legend={TEXT.levels}>
+        <div className="flex flex-col gap-1.5">
+          {props.levels.map((level) => {
+            const last = level.checked && checkedCount === 1
+            const hint = level.empty ? TEXT.emptyLevelHint : last ? TEXT.levelsMin : null
+            const hintId = `${id}-level-${level.id}`
+            return (
+              <label className={ROW} key={level.id}>
+                <input
+                  aria-describedby={hint ? hintId : undefined}
+                  checked={level.checked}
+                  className="size-5 shrink-0 accent-brand"
+                  disabled={busy || level.empty || last}
+                  onChange={() => props.onToggleLevel(level.id)}
+                  type="checkbox"
+                  value={level.id}
+                />
+                <span>{level.empty ? `${level.label} ${TEXT.emptyLevel}` : level.label}</span>
+                {hint && (
+                  <span className="sr-only" id={hintId}>
+                    {hint}
+                  </span>
+                )}
+              </label>
+            )
+          })}
+        </div>
+      </Group>
+
+      <label className={cx(ROW, 'justify-between rounded-[20px] py-3')}>
+        <span>
+          <span className="block font-medium">{TEXT.titleBlock}</span>
+          <span className="block text-[13px] text-ink-muted">{TEXT.titleBlockHint}</span>
+        </span>
+        <input checked={props.titleBlock} className="size-6 shrink-0 accent-brand" disabled={busy} onChange={(event) => props.onTitleBlock(event.target.checked)} role="switch" type="checkbox" />
+      </label>
     </div>
   )
 }
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-plan-options`
Expected: PASS (`shell-plan-options`: 6 pruebas; `shell-plan-options-levels`: 6).

Si "los objetivos táctiles de las plantas…" cuenta menos de 13 `min-h-11`: hay 9 chips (hoja, orientación, escala y modo), 3 filas de plantas y 1 del interruptor = 13; las que faltan indican una clase mal escrita.

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/ui/PlanOptions.tsx apps/web/test/shell-plan-options-levels.test.tsx
git commit -m "feat(plano): plantas y cajetín en las opciones del diálogo de exportar plano" -- apps/web/src/editor/shell/ui/PlanOptions.tsx apps/web/test/shell-plan-options-levels.test.tsx
```

---

### Task 16a: La vista previa (1 de 2): escala del lienzo y ejecutor con espera, de a una por vez

**Files:**
- Create: `apps/web/src/lib/export/preview-scale.ts`, `apps/web/src/editor/shell/use-plan-preview.ts`
- Test: `apps/web/test/export-preview.test.ts`

**Interfaces:**
- Consumes: `PlanBuildArgs`, `PlanResult` (Tarea 1).
- Produces:
  - `@/lib/export/preview-scale`: `canvasScale(boxWidthCss: number, pageWidthPt: number, devicePixelRatio: number): number`.
  - `use-plan-preview.ts`: `PreviewState = { status: 'idle' | 'loading' | 'ready' | 'unavailable'; blob: Blob | null }`, `previewKey(args: PlanBuildArgs): string`, `createPreviewRunner({ build, delayMs, onState }): { request(args); clear(); dispose() }` y el gancho `usePlanPreview(args: PlanBuildArgs | null, build, delayMs): PreviewState`.

**Cubre el criterio 8** (la vista previa se actualiza tras cambiar hoja, escala, modo o planta: con una espera de `previewDelayMs`, **de a una por vez** y sin que un resultado viejo pise a uno nuevo; mientras carga conserva la imagen anterior). Pascal monta un plano oculto por cada hoja que arma: dos a la vez serían caros y podrían cruzar resultados.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/export-preview.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { canvasScale } from '../src/lib/export/preview-scale'
import { type PreviewState, createPreviewRunner, previewKey } from '../src/editor/shell/use-plan-preview'
import type { PlanBuildArgs, PlanResult } from '../src/lib/export/types'

const ARGS: PlanBuildArgs = {
  paper: 'A4',
  orientation: 'landscape',
  scale: 50,
  mode: 'paper',
  levelIds: ['a'],
  titleBlock: true,
  projectName: 'Casa',
  author: 'Ana',
  date: new Date(2026, 9, 12),
}
const result = (text: string): PlanResult => ({ blob: new Blob([text]), pages: 1, skippedImages: 0 })

describe('canvasScale', () => {
  it('lleva el ancho de la hoja en puntos al ancho del cuadro en píxeles reales', () => {
    expect(canvasScale(600, 841.89, 1)).toBeCloseTo(600 / 841.89, 9)
    expect(canvasScale(600, 841.89, 2)).toBeCloseTo(1200 / 841.89, 9)
  })

  it('limita la densidad de píxeles entre 1 y 2 y nunca da cero', () => {
    expect(canvasScale(600, 841.89, 3)).toBeCloseTo(1200 / 841.89, 9)
    expect(canvasScale(600, 841.89, 0.5)).toBeCloseTo(600 / 841.89, 9)
    expect(canvasScale(0, 841.89, 1)).toBe(0.1)
  })
})

describe('previewKey', () => {
  it('cambia con lo que cambia la hoja y no con lo que no la cambia (progreso, señal, fecha)', () => {
    const base = previewKey(ARGS)
    expect(previewKey({ ...ARGS, onProgress: () => {}, signal: new AbortController().signal, date: new Date(2030, 0, 1) })).toBe(base)
    for (const change of [{ scale: 100 as const }, { mode: 'color' as const }, { paper: 'A3' as const }, { titleBlock: false }, { levelIds: ['b'] }, { projectName: 'Otra' }, { sheetNumbers: { start: 1, total: 2 } }]) {
      expect(previewKey({ ...ARGS, ...change }), JSON.stringify(change)).not.toBe(base)
    }
  })
})

describe('createPreviewRunner (criterio 8: espera, una a la vez, sin resultados viejos)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  /** Deja correr las promesas pendientes (el ejecutor encadena varias). */
  const settle = async () => {
    for (let i = 0; i < 6; i++) await vi.advanceTimersByTimeAsync(0)
  }

  function setup(build: (args: PlanBuildArgs) => Promise<PlanResult>) {
    const states: PreviewState[] = []
    const runner = createPreviewRunner({ build, delayMs: 250, onState: (s) => states.push(s) })
    return { runner, states, last: () => states.at(-1) }
  }

  it('varios cambios seguidos arman una sola página, la del último', async () => {
    const build = vi.fn(async (args: PlanBuildArgs) => result(String(args.scale)))
    const { runner, last } = setup(build)
    runner.request({ ...ARGS, scale: 25 })
    runner.request({ ...ARGS, scale: 50 })
    runner.request({ ...ARGS, scale: 100 })
    expect(last()?.status).toBe('loading')
    await vi.advanceTimersByTimeAsync(249)
    expect(build).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await settle()
    expect(build).toHaveBeenCalledTimes(1)
    expect(build.mock.calls[0]?.[0].scale).toBe(100)
    expect(last()?.status).toBe('ready')
    expect(await last()?.blob?.text()).toBe('100')
  })

  it('mientras carga conserva la imagen anterior (sin parpadeo)', async () => {
    const { runner, last } = setup(async () => result('uno'))
    runner.request(ARGS)
    await vi.advanceTimersByTimeAsync(250)
    await settle()
    runner.request({ ...ARGS, scale: 100 })
    expect(last()).toMatchObject({ status: 'loading' })
    expect(await last()?.blob?.text()).toBe('uno')
  })

  it('un resultado viejo que llega tarde no pisa al nuevo, y nunca corren dos a la vez', async () => {
    const resolvers: ((value: PlanResult) => void)[] = []
    let running = 0
    let peak = 0
    const build = vi.fn(
      (_args: PlanBuildArgs) =>
        new Promise<PlanResult>((resolve) => {
          running += 1
          peak = Math.max(peak, running)
          resolvers.push((value) => {
            running -= 1
            resolve(value)
          })
        }),
    )
    const { runner, last } = setup(build)
    runner.request({ ...ARGS, scale: 25 })
    await vi.advanceTimersByTimeAsync(250)
    runner.request({ ...ARGS, scale: 100 })
    await vi.advanceTimersByTimeAsync(250)
    expect(build).toHaveBeenCalledTimes(1)
    resolvers[0]?.(result('viejo'))
    await settle()
    expect(build).toHaveBeenCalledTimes(2)
    expect(last()?.status).toBe('loading')
    resolvers[1]?.(result('nuevo'))
    await settle()
    expect(await last()?.blob?.text()).toBe('nuevo')
    expect(peak).toBe(1)
  })

  it('si armar falla, la vista previa queda "no disponible" (la descarga no depende de ella)', async () => {
    const { runner, last } = setup(async () => {
      throw new Error('se cayó')
    })
    runner.request(ARGS)
    await vi.advanceTimersByTimeAsync(250)
    await settle()
    expect(last()).toEqual({ status: 'unavailable', blob: null })
  })

  it('clear vuelve a "idle" y cancela lo pendiente; dispose no avisa más', async () => {
    const build = vi.fn(async () => result('x'))
    const { runner, states, last } = setup(build)
    runner.request(ARGS)
    runner.clear()
    await vi.advanceTimersByTimeAsync(500)
    expect(build).not.toHaveBeenCalled()
    expect(last()).toEqual({ status: 'idle', blob: null })
    runner.request(ARGS)
    const count = states.length
    runner.dispose()
    await vi.advanceTimersByTimeAsync(500)
    expect(states).toHaveLength(count)
    expect(build).not.toHaveBeenCalled()
  })

  it('pasa una señal de cancelación al armar y la cancela con el siguiente pedido', async () => {
    const signals: AbortSignal[] = []
    const { runner } = setup(
      (args) =>
        new Promise<PlanResult>((resolve) => {
          if (args.signal) signals.push(args.signal)
          setTimeout(() => resolve(result('x')), 1000)
        }),
    )
    runner.request(ARGS)
    await vi.advanceTimersByTimeAsync(250)
    runner.request({ ...ARGS, scale: 100 })
    expect(signals[0]?.aborted).toBe(true)
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-preview`
Expected: FAIL — `Cannot find module '../src/lib/export/preview-scale'` y `'../src/editor/shell/use-plan-preview'`.

- [ ] **Paso 2: Escribir la escala del lienzo y el ejecutor de la vista previa**

Create `apps/web/src/lib/export/preview-scale.ts`:

```ts
/** Escala de `pdfjs` para que la página (en puntos) llene un cuadro de `boxWidthCss` píxeles CSS con densidad `devicePixelRatio` (entre 1 y 2). */
export function canvasScale(boxWidthCss: number, pageWidthPt: number, devicePixelRatio: number): number {
  const density = Math.min(2, Math.max(1, devicePixelRatio))
  if (!(boxWidthCss > 0) || !(pageWidthPt > 0)) return 0.1
  return (boxWidthCss * density) / pageWidthPt
}
```

Create `apps/web/src/editor/shell/use-plan-preview.ts`:

```ts
'use client'

import { useEffect, useRef, useState } from 'react'
import type { PlanBuildArgs, PlanResult } from '@/lib/export/types'

export type PreviewState = { status: 'idle' | 'loading' | 'ready' | 'unavailable'; blob: Blob | null }

/** Lo que cambia la hoja de la vista previa (no el progreso, la señal ni la fecha): sirve de dependencia del efecto. */
export function previewKey(args: PlanBuildArgs): string {
  return JSON.stringify([args.paper, args.orientation, args.scale, args.mode, args.titleBlock, args.levelIds, args.sheetNumbers ?? null, args.projectName, args.author])
}

type Runner = {
  request(args: PlanBuildArgs): void
  clear(): void
  dispose(): void
}

/**
 * Arma la hoja de la vista previa con una espera tras el último cambio, **de a una por vez** (Pascal monta un plano oculto por
 * cada una) y descartando lo que llega después de un pedido más nuevo. Mientras carga conserva la imagen anterior.
 */
export function createPreviewRunner(options: { build(args: PlanBuildArgs): Promise<PlanResult>; delayMs: number; onState(state: PreviewState): void }): Runner {
  let timer: ReturnType<typeof setTimeout> | null = null
  let controller: AbortController | null = null
  let latest = 0
  let last: Blob | null = null
  let chain: Promise<void> = Promise.resolve()

  const run = async (id: number, args: PlanBuildArgs) => {
    if (id !== latest) return
    const mine = new AbortController()
    controller = mine
    try {
      const result = await options.build({ ...args, signal: mine.signal })
      if (id !== latest) return
      last = result.blob
      options.onState({ status: 'ready', blob: result.blob })
    } catch {
      if (id !== latest || mine.signal.aborted) return
      options.onState({ status: 'unavailable', blob: null })
    }
  }

  const stopTimer = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }

  return {
    request(args) {
      stopTimer()
      controller?.abort()
      latest += 1
      const id = latest
      options.onState({ status: 'loading', blob: last })
      timer = setTimeout(() => {
        timer = null
        chain = chain.then(() => run(id, args))
      }, options.delayMs)
    },
    clear() {
      stopTimer()
      controller?.abort()
      latest += 1
      last = null
      options.onState({ status: 'idle', blob: null })
    },
    dispose() {
      stopTimer()
      controller?.abort()
      latest += 1
    },
  }
}

const IDLE: PreviewState = { status: 'idle', blob: null }

/** La página de la vista previa para esas opciones (`null` = no hay nada que mostrar: se limpia). */
export function usePlanPreview(args: PlanBuildArgs | null, build: (args: PlanBuildArgs) => Promise<PlanResult>, delayMs: number): PreviewState {
  const [state, setState] = useState<PreviewState>(IDLE)
  const runner = useRef<Runner | null>(null)
  const buildRef = useRef(build)
  buildRef.current = build
  const latestArgs = useRef(args)
  latestArgs.current = args

  useEffect(() => {
    const created = createPreviewRunner({ build: (next) => buildRef.current(next), delayMs, onState: setState })
    runner.current = created
    return () => created.dispose()
  }, [delayMs])

  const key = args ? previewKey(args) : null
  useEffect(() => {
    const current = latestArgs.current
    if (key === null || !current) runner.current?.clear()
    else runner.current?.request(current)
  }, [key])

  return state
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run export-preview`
Expected: PASS (9 pruebas).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/lib/export/preview-scale.ts apps/web/src/editor/shell/use-plan-preview.ts apps/web/test/export-preview.test.ts
git commit -m "feat(plano): ejecutor de la vista previa con espera, una por vez y sin resultados viejos" -- apps/web/src/lib/export/preview-scale.ts apps/web/src/editor/shell/use-plan-preview.ts apps/web/test/export-preview.test.ts
```

---

### Task 16b: La vista previa (2 de 2): la hoja real con `pdfjs-dist` y el respaldo en cuadro

**Files:**
- Create: `apps/web/src/editor/shell/ui/render-pdf-page.ts`, `apps/web/src/editor/shell/ui/PlanPreview.tsx`
- Test: `apps/web/test/shell-plan-preview.test.tsx`

**Interfaces:**
- Consumes: `PreviewState` (Tarea 16a); `canvasScale` (Tarea 16a); `Loader` de `@/components/Loader`; `TEXT`, `levelPagerText` (Tarea 7a); `pdfjs-dist` 6.4.299 con el trabajador en `/pdf.worker.min.mjs` (Tarea 0d).
- Produces: `renderPdfPage(blob, canvas, isCancelled): Promise<() => void>` y `PlanPreview(props: PlanPreviewProps)` con `PlanPreviewProps = PreviewState & { widthMm; heightMm; alt: string; caption: string; mode: 'pdfjs' | 'frame'; message: string | null; messageTone: 'ok' | 'problem'; pager: { label: string; index: number; total: number; onPrev(): void; onNext(): void } | null }`.

**Cubre los criterios 8 y 15 en la interfaz:** el diálogo muestra la **página real** del PDF (no un dibujo esquemático), con texto alternativo, el mensaje de cabida en un `role="status"` y un paginador con botones de 44 px y etiquetas ("Planta anterior", "Planta siguiente"). `pdfjs-dist` se carga con `import()` solo cuando hay una página que mostrar (nunca en el paquete inicial). Si no carga (`previewMode: 'frame'` de la Tarea 0e, o falla en ejecución), queda el cuadro con el tamaño de la hoja y el aviso, y la descarga no depende de la vista previa (D10).

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-plan-preview.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlanPreview, type PlanPreviewProps } from '../src/editor/shell/ui/PlanPreview'

const noop = () => {}
const BASE: PlanPreviewProps = {
  status: 'ready',
  blob: null,
  widthMm: 297,
  heightMm: 210,
  alt: 'Vista previa de la hoja del plano con el cajetín y el norte. Vista previa · A4 apaisada (297 × 210 mm) · 1:50',
  caption: 'Vista previa · A4 apaisada (297 × 210 mm) · 1:50',
  mode: 'pdfjs',
  message: 'Cabe en la hoja · usa 64 % del ancho',
  messageTone: 'ok',
  pager: { label: 'Planta baja', index: 0, total: 2, onPrev: noop, onNext: noop },
}
const render = (overrides: Partial<PlanPreviewProps> = {}) => renderToStaticMarkup(<PlanPreview {...BASE} {...overrides} />)
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')

describe('vista previa de la hoja', () => {
  it('es una región con la hoja en su proporción real, un lienzo con texto alternativo y la leyenda', () => {
    const markup = render()
    expect(markup).toContain('aria-label="Vista previa"')
    expect(markup).toMatch(/aspect-ratio:\s*297\s*\/\s*210/)
    expect(markup).toMatch(/<canvas[^>]*role="img"/)
    expect(markup).toMatch(/<canvas[^>]*aria-label="Vista previa de la hoja del plano/)
    expect(textOf(markup)).toContain('Vista previa · A4 apaisada (297 × 210 mm) · 1:50')
  })

  it('el mensaje de cabida se anuncia con role="status"', () => {
    const markup = render()
    expect(markup).toMatch(/<p[^>]*role="status"[^>]*>[\s\S]*Cabe en la hoja · usa 64 % del ancho/)
  })

  it('un problema (no cabe, nada que dibujar) también va en el mensaje', () => {
    const markup = render({ message: 'El proyecto no cabe en esta hoja ni a 1:100. Prueba con A3 o quita plantas.', messageTone: 'problem', status: 'idle' })
    expect(textOf(markup)).toContain('El proyecto no cabe en esta hoja ni a 1:100.')
    expect(markup).not.toContain('<canvas')
  })

  it('el paginador dice "Planta baja · 1 de 2", tiene botones con nombre y los de los extremos están deshabilitados', () => {
    const markup = render()
    expect(textOf(markup)).toContain('Planta baja · 1 de 2')
    expect(markup).toContain('aria-label="Planta anterior"')
    expect(markup).toContain('aria-label="Planta siguiente"')
    expect(markup.match(/<button[^>]*disabled=""/g)).toHaveLength(1)
    const middle = render({ pager: { label: 'Planta 1', index: 1, total: 3, onPrev: noop, onNext: noop } })
    expect(middle.match(/<button[^>]*disabled=""/g) ?? []).toHaveLength(0)
    expect(render({ pager: null })).not.toContain('Planta anterior')
  })

  it('cargando sin imagen previa muestra el cargador compacto y se marca ocupada', () => {
    const markup = render({ status: 'loading', blob: null })
    expect(markup).toContain('aria-busy="true"')
    expect(markup).toContain('madori-loader')
  })

  it('"no disponible" y el modo cuadro dejan solo el cuadro con el aviso en castellano', () => {
    for (const markup of [render({ status: 'unavailable' }), render({ mode: 'frame' })]) {
      expect(markup).not.toContain('<canvas')
      expect(textOf(markup)).toContain('No pudimos mostrar la vista previa, pero puedes descargar el PDF igual.')
    }
  })

  it('los botones del paginador miden al menos 44 px y sus íconos son decorativos', () => {
    const markup = render()
    expect(markup.match(/size-11/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
    for (const svg of markup.match(/<svg[^>]*>/g) ?? []) expect(svg).toMatch(/aria-hidden="true"/)
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run shell-plan-preview`
Expected: FAIL — `Cannot find module '../src/editor/shell/ui/PlanPreview'`.

- [ ] **Paso 2: Escribir el dibujo de la página con `pdfjs` y el componente**

Create `apps/web/src/editor/shell/ui/render-pdf-page.ts`:

```ts
import { canvasScale } from '@/lib/export/preview-scale'

let workerReady = false

/**
 * Dibuja la primera página de un PDF en un `<canvas>` con `pdfjs-dist` (carga dinámica: no entra en el paquete inicial; el
 * trabajador se sirve de `public/pdf.worker.min.mjs`, ver `scripts/copy-pdf-worker.mjs`). Devuelve cómo soltar los recursos.
 * `render` recibe `canvas` y `canvasContext` a la vez: si `pdfjs` rechaza una de las dos claves (Tarea 0d), deja la que acepte.
 */
export async function renderPdfPage(blob: Blob, canvas: HTMLCanvasElement, isCancelled: () => boolean): Promise<() => void> {
  const pdfjs = await import('pdfjs-dist')
  if (!workerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
    workerReady = true
  }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise
  const release = () => void doc.destroy()
  if (isCancelled()) {
    release()
    return () => {}
  }
  const page = await doc.getPage(1)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: canvasScale(canvas.clientWidth || canvas.parentElement?.clientWidth || 600, base.width, window.devicePixelRatio || 1) })
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const context = canvas.getContext('2d')
  if (!context) {
    release()
    throw new Error('sin contexto 2d')
  }
  const task = page.render({ canvas, canvasContext: context, viewport })
  await task.promise
  return () => {
    task.cancel()
    release()
  }
}
```

Create `apps/web/src/editor/shell/ui/PlanPreview.tsx`:

```tsx
'use client'

import { Check, ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Loader } from '@/components/Loader'
import { cx } from '@/lib/cx'
import { TEXT, levelPagerText } from '@/lib/export/texts-es'
import type { PreviewState } from '../use-plan-preview'
import { renderPdfPage } from './render-pdf-page'

export type PlanPreviewProps = PreviewState & {
  /** Medidas de la hoja en mm (la proporción del cuadro). */
  widthMm: number
  heightMm: number
  /** Texto alternativo del lienzo. */
  alt: string
  /** "Vista previa · A4 apaisada (297 × 210 mm) · 1:50". */
  caption: string
  mode: 'pdfjs' | 'frame'
  /** La cabida o el problema ("Cabe en la hoja · usa 64 % del ancho"). */
  message: string | null
  messageTone: 'ok' | 'problem'
  pager: { label: string; index: number; total: number; onPrev(): void; onNext(): void } | null
}

const PAGER_BUTTON =
  'focus-ring grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-white text-ink shadow-soft transition-colors duration-150 hover:bg-brand-wash disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none'

/** La columna derecha del diálogo: la hoja real (la página del PDF en un lienzo), el paginador y el mensaje de cabida. */
export function PlanPreview(props: PlanPreviewProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  // La página que `pdfjs` no pudo dibujar: si cambia la página, se vuelve a intentar.
  const [failedFor, setFailedFor] = useState<Blob | null>(null)
  const failed = props.blob !== null && failedFor === props.blob
  const drawable = props.mode === 'pdfjs' && props.status !== 'unavailable' && !failed
  const ratio = props.widthMm / props.heightMm

  useEffect(() => {
    const el = canvas.current
    if (!drawable || props.status !== 'ready' || !props.blob || !el) return
    let cancelled = false
    let release: (() => void) | undefined
    renderPdfPage(props.blob, el, () => cancelled)
      .then((stop) => {
        if (cancelled) stop()
        else release = stop
      })
      .catch(() => {
        if (!cancelled) setFailedFor(props.blob)
      })
    return () => {
      cancelled = true
      release?.()
    }
  }, [drawable, props.status, props.blob])

  const loading = props.status === 'loading'
  const showFrameNote = !drawable && props.status !== 'idle'
  return (
    <section aria-label={TEXT.previewLabel} className="flex min-w-0 flex-col gap-3 rounded-[24px] bg-brand-mist/70 p-4" aria-busy={loading}>
      <div className="relative mx-auto max-w-full" style={{ aspectRatio: `${props.widthMm} / ${props.heightMm}`, width: `min(100%, calc(42vh * ${ratio}))` }}>
        {props.status !== 'idle' && drawable && <canvas aria-label={props.alt} className="absolute inset-0 size-full rounded-[6px] bg-white shadow-soft" ref={canvas} role="img" />}
        {(props.status === 'idle' || showFrameNote) && <div aria-hidden="true" className="absolute inset-0 rounded-[6px] bg-white shadow-soft" />}
        {loading && !props.blob && (
          <div className="absolute inset-0 grid place-items-center">
            <Loader label={TEXT.updatingPreview} size="md" />
          </div>
        )}
        {showFrameNote && (
          <p className="absolute inset-0 grid place-items-center p-4 text-center text-[13px] text-ink-muted" role="status">
            {TEXT.previewUnavailable}
          </p>
        )}
      </div>

      {props.pager && (
        <div className="flex items-center justify-center gap-2">
          <button aria-label={TEXT.previousLevel} className={PAGER_BUTTON} disabled={props.pager.index <= 0} onClick={props.pager.onPrev} type="button">
            <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2} />
          </button>
          <span className="min-w-[8.5rem] text-center text-[14px] font-medium text-ink">{levelPagerText(props.pager.label, props.pager.index, props.pager.total)}</span>
          <button aria-label={TEXT.nextLevel} className={PAGER_BUTTON} disabled={props.pager.index >= props.pager.total - 1} onClick={props.pager.onNext} type="button">
            <ChevronRight aria-hidden="true" className="size-5" strokeWidth={2} />
          </button>
        </div>
      )}

      {props.message && (
        <p
          className={cx(
            'mx-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold',
            props.messageTone === 'ok' ? 'bg-[#E1F5EB] text-ok' : 'bg-[#FFF1D6] text-sun-ink',
          )}
          role="status"
        >
          {props.messageTone === 'ok' ? <Check aria-hidden="true" className="size-4" strokeWidth={2.5} /> : <TriangleAlert aria-hidden="true" className="size-4" strokeWidth={2.25} />}
          {props.message}
        </p>
      )}
      <p className="text-center text-[13px] text-ink-muted">{props.caption}</p>
    </section>
  )
}
```

- [ ] **Paso 3: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-plan-preview`
Expected: PASS (7 pruebas).

Si "cargando sin imagen previa…" no encuentra `madori-loader`, mira `Loader.tsx` (clase `madori-loader`). Si falla "el mensaje de cabida…" porque el `role="status"` quedó en otro elemento, el `<p role="status">` del mensaje debe llevar el texto de cabida.

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos. Si TypeScript rechaza `page.render({ canvas, canvasContext, viewport })`, quita la clave que no acepta (Tarea 0d).

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/ui/render-pdf-page.ts apps/web/src/editor/shell/ui/PlanPreview.tsx apps/web/test/shell-plan-preview.test.tsx
git commit -m "feat(plano): vista previa de la hoja real con pdfjs y respaldo en cuadro" -- apps/web/src/editor/shell/ui/render-pdf-page.ts apps/web/src/editor/shell/ui/PlanPreview.tsx apps/web/test/shell-plan-preview.test.tsx
```

---

### Task 17: El diálogo accesible "Exportar plano" conectado al puente, con descarga real

**Files:**
- Create: `apps/web/src/editor/shell/ExportPlanDialog.tsx`, `apps/web/src/editor/shell/download-blob.ts`
- Test: `apps/web/test/shell-export-dialog.test.tsx`

**Interfaces:**
- Consumes: `useBridge` (`./use-bridge`); `bridge.plan.measureLevels()`, `bridge.plan.build()` (Tarea 13); el modelo y sus selectores (Tareas 14a a 14c); `PlanOptions` (Tareas 15a y 15b); `PlanPreview`, `usePlanPreview` (Tareas 16a y 16b); `exportFileName` (Tarea 3); `paperLabel` (Tarea 1); `EXPORT_DECISIONS` (Tarea 0e); `TEXT`, `generatingText`, `previewCaption` (Tarea 7a); `Loader`.
- Produces: `ExportPlanDialog({ open, projectName, author, opener, onClose })` con `opener: RefObject<HTMLElement | null>` (el botón que lo abrió: el foco vuelve ahí al cerrar) y `downloadBlob(blob: Blob, fileName: string): void`.

**Cubre los criterios 8, 14 y 15 en la interfaz:** `<dialog>` modal con título y descripción, foco inicial en el primer control cuando termina de medir (mientras mide, queda en "Cerrar") y vuelta al botón que lo abrió; Esc cancela la generación si hay una en curso (y si no, cierra) sin desarmar la herramienta de Pascal; "Descargar PDF" no se puede pulsar dos veces (una bandera síncrona además del reductor); progreso por planta ("Generando planta 1 de 2…"); errores en castellano con `role="alert"`, avisos con `role="status"`; en 390 px el diálogo se apila (la vista previa arriba) y ocupa el alto de la pantalla; `pointer-events-auto` porque el shell es un contenedor que deja pasar los clics. La descarga se llama `<proyecto>-planos.pdf` (criterio 3). Al cerrar se cancela el trabajo en curso y se sueltan las URL.

- [ ] **Paso 1: Escribir la prueba (rojo)**

Create `apps/web/test/shell-export-dialog.test.tsx`:

```tsx
import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { ExportPlanDialog } from '../src/editor/shell/ExportPlanDialog'
import { BridgeProvider } from '../src/editor/shell/use-bridge'
import { createFakeDeps } from './support/fake-deps'

const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')

function render(open = false) {
  const fake = createFakeDeps()
  return renderToStaticMarkup(
    <BridgeProvider bridge={createBridge(fake.deps)}>
      <ExportPlanDialog author="Silvert Quispe" onClose={() => {}} open={open} opener={createRef<HTMLElement>()} projectName="Casa Alvear" />
    </BridgeProvider>,
  )
}

describe('diálogo "Exportar plano" (criterio 15)', () => {
  const markup = render()

  it('es un <dialog> con nombre y descripción, cerrado al montarse', () => {
    expect(markup).toMatch(/^<dialog/)
    expect(markup).not.toMatch(/<dialog[^>]*\sopen/)
    const labelled = /aria-labelledby="([^"]+)"/.exec(markup)?.[1]
    expect(markup).toMatch(new RegExp(`<h2[^>]*id="${labelled}"[^>]*>Exportar plano</h2>`))
    expect(markup).toMatch(/aria-describedby="[^"]+"/)
    expect(textOf(markup)).toContain('PDF con escala, cotas y cajetín listo para imprimir.')
  })

  it('recibe clics aunque el shell los deje pasar, y ocupa el alto en pantallas angostas', () => {
    expect(markup).toContain('pointer-events-auto')
    expect(markup).toContain('app-dialog')
    expect(markup).toContain('max-[820px]:h-[calc(100dvh-2rem)]')
  })

  it('el botón de cerrar solo tiene ícono y por eso lleva nombre', () => {
    expect(markup).toMatch(/<button[^>]*aria-label="Cerrar"[^>]*type="button"|<button[^>]*type="button"[^>]*aria-label="Cerrar"/)
    for (const svg of markup.match(/<svg[^>]*>/g) ?? []) expect(svg).toContain('aria-hidden="true"')
  })

  it('antes de medir muestra el cargador y "Descargar PDF" está deshabilitado; "Cancelar" no', () => {
    expect(textOf(markup)).toContain('Midiendo tu proyecto…')
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?Descargar PDF/)
    expect(markup).not.toMatch(/<button[^>]*disabled=""[^>]*>\s*Cancelar/)
    expect(markup).toContain('Cancelar')
  })

  it('no trae emojis ni palabras en inglés', () => {
    expect(markup).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(textOf(markup)).not.toMatch(/\b(Download|Cancel|Export|Floor plan|Sheet|Scale)\b/)
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run shell-export-dialog`
Expected: FAIL — `Cannot find module '../src/editor/shell/ExportPlanDialog'`.

- [ ] **Paso 2: Escribir la descarga**

Create `apps/web/src/editor/shell/download-blob.ts`:

```ts
/** Descarga un `Blob` como archivo con ese nombre (enlace `download` y URL temporal que se suelta enseguida). */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.hidden = true
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
```

- [ ] **Paso 3: Escribir el diálogo**

Create `apps/web/src/editor/shell/ExportPlanDialog.tsx`:

```tsx
'use client'

import { FileDown, X } from 'lucide-react'
import { type RefObject, useEffect, useId, useReducer, useRef } from 'react'
import { Loader } from '@/components/Loader'
import { EXPORT_DECISIONS } from '@/lib/export/decisions'
import { exportFileName } from '@/lib/export/file-name'
import { TEXT, generatingText, previewCaption } from '@/lib/export/texts-es'
import { downloadBlob } from './download-blob'
import { buildArgs, currentSheet, exportReducer, fitInfo, initialState, previewArgs, scaleOptions, selectedLevels, suggestedOrientation } from './export-plan-model'
import { PlanOptions } from './ui/PlanOptions'
import { PlanPreview } from './ui/PlanPreview'
import { useBridge } from './use-bridge'
import { usePlanPreview } from './use-plan-preview'

type Props = {
  open: boolean
  projectName: string
  /** Nombre de la cuenta (o el correo si no tiene nombre). */
  author: string
  /** El botón que abrió el diálogo: el foco vuelve ahí al cerrar. */
  opener: RefObject<HTMLElement | null>
  onClose: () => void
}

/**
 * "Exportar plano": opciones a la izquierda, la hoja real a la derecha y Cancelar / Descargar PDF abajo. Habla con Pascal solo por
 * `bridge.plan`. Esc cancela la generación en curso (y si no hay, cierra); el estado vive en `export-plan-model`.
 */
export function ExportPlanDialog({ open, projectName, author, opener, onClose }: Props) {
  const bridge = useBridge()
  const ids = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previous = useRef<HTMLElement | null>(null)
  const controller = useRef<AbortController | null>(null)
  const busy = useRef(false)
  const focusedFirst = useRef(false)
  const [state, dispatch] = useReducer(exportReducer, initialState)
  const metaNow = () => ({ projectName, author, date: new Date() })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      previous.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      focusedFirst.current = false
      dispatch({ type: 'open' })
      dialog.showModal()
      let alive = true
      bridge.plan
        .measureLevels()
        .then((levels) => alive && dispatch({ type: 'measured', levels }))
        .catch(() => alive && dispatch({ type: 'measureFailed' }))
      return () => {
        alive = false
      }
    }
    if (!open && dialog.open) dialog.close()
  }, [open, bridge])

  // Cuando termina de medir, el foco pasa al primer control (hasta entonces queda en "Cerrar").
  useEffect(() => {
    if (!open || state.status !== 'ready' || focusedFirst.current) return
    focusedFirst.current = true
    dialogRef.current?.querySelector<HTMLElement>('fieldset input:not(:disabled)')?.focus()
  }, [open, state.status])

  const info = fitInfo(state)
  const sheet = currentSheet(state)
  const chosen = selectedLevels(state)
  const preview = usePlanPreview(
    open && state.status === 'ready' && info.problem === null && chosen.length > 0 ? previewArgs(state, metaNow()) : null,
    bridge.plan.build,
    EXPORT_DECISIONS.previewDelayMs,
  )

  const generate = async () => {
    if (busy.current || !info.canDownload) return
    busy.current = true
    const abort = new AbortController()
    controller.current = abort
    dispatch({ type: 'generate' })
    try {
      const result = await bridge.plan.build({
        ...buildArgs(state, metaNow()),
        onProgress: (value) => dispatch({ type: 'progress', value }),
        signal: abort.signal,
      })
      downloadBlob(result.blob, exportFileName(projectName))
      dispatch({ type: 'done', skippedImages: result.skippedImages })
    } catch (error) {
      const aborted = abort.signal.aborted || (error instanceof Error && error.name === 'AbortError')
      dispatch({ type: aborted ? 'cancelled' : 'failed' })
    } finally {
      busy.current = false
      controller.current = null
    }
  }

  /** Cancelar: si se está generando, corta la generación; si no, cierra el diálogo. */
  const cancelOrClose = () => {
    if (busy.current) controller.current?.abort()
    else dialogRef.current?.close()
  }

  const generating = state.status === 'generating'
  const total = state.progress?.total ?? chosen.length
  const caption = previewCaption(state.form.paper, state.form.orientation, sheet.widthMm, sheet.heightMm, state.form.scale)
  const current = chosen[state.previewIndex]

  return (
    <dialog
      aria-describedby={`${ids}-description`}
      aria-labelledby={`${ids}-title`}
      className="app-dialog pointer-events-auto max-[820px]:h-[calc(100dvh-2rem)]"
      onCancel={(event) => {
        event.preventDefault()
        cancelOrClose()
      }}
      onClose={() => {
        controller.current?.abort()
        ;(opener.current ?? previous.current)?.focus()
        onClose()
      }}
      onKeyDown={(event) => {
        // Pascal también escucha Esc en la ventana: se frena aquí para que no desarme la herramienta.
        if (event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        cancelOrClose()
      }}
      ref={dialogRef}
    >
      <div className="flex max-h-[inherit] flex-col gap-4 p-6 max-[820px]:h-full">
        <header className="flex items-start gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-[-0.02em]" id={`${ids}-title`}>
              {TEXT.title}
            </h2>
            <p className="text-[14px] text-ink-muted" id={`${ids}-description`}>
              {TEXT.subtitle}
            </p>
          </div>
          <span className="flex-1" />
          <button
            aria-label={TEXT.close}
            className="focus-ring grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-ink/5 transition-colors duration-150 hover:bg-ink/10 motion-reduce:transition-none"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={2} />
          </button>
        </header>

        {state.status === 'idle' || state.status === 'measuring' ? (
          <div className="grid min-h-48 place-items-center">
            <Loader label={TEXT.measuring} size="md" />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto min-[820px]:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
            <div className="order-last min-w-0 min-[820px]:order-none">
              <PlanOptions
                busy={generating}
                levels={state.levels.map((level) => ({ id: level.id, label: level.label, empty: level.empty, checked: state.form.checked.includes(level.id) }))}
                mode={state.form.mode}
                onMode={(value) => dispatch({ type: 'mode', value })}
                onOrientation={(value) => dispatch({ type: 'orientation', value })}
                onPaper={(value) => dispatch({ type: 'paper', value })}
                onScale={(value) => dispatch({ type: 'scale', value })}
                onTitleBlock={(value) => dispatch({ type: 'titleBlock', value })}
                onToggleLevel={(id) => dispatch({ type: 'toggleLevel', id })}
                orientation={state.form.orientation}
                paper={state.form.paper}
                scale={state.form.scale}
                scales={scaleOptions(state).map(({ scale, enabled, reason }) => ({ scale, enabled, reason }))}
                suggestedOrientation={suggestedOrientation(state)}
                titleBlock={state.form.titleBlock}
              />
            </div>
            <PlanPreview
              alt={`${TEXT.previewAlt}. ${caption}`}
              blob={preview.blob}
              caption={caption}
              heightMm={sheet.heightMm}
              message={info.summary}
              messageTone={info.problem === null ? 'ok' : 'problem'}
              mode={EXPORT_DECISIONS.previewMode}
              pager={
                chosen.length > 1 && current
                  ? { label: current.label, index: state.previewIndex, total: chosen.length, onPrev: () => dispatch({ type: 'previewLevel', index: state.previewIndex - 1 }), onNext: () => dispatch({ type: 'previewLevel', index: state.previewIndex + 1 }) }
                  : null
              }
              status={preview.status}
              widthMm={sheet.widthMm}
            />
          </div>
        )}

        {state.message && (
          <p className={state.messageKind === 'error' ? 'text-sm text-destructive' : 'text-sm text-ink-muted'} role={state.messageKind === 'error' ? 'alert' : 'status'}>
            {state.message}
          </p>
        )}

        <footer className="flex flex-wrap items-center justify-end gap-3">
          {generating && <Loader inline label={generatingText(Math.min((state.progress?.done ?? 0) + 1, total), total)} size="sm" />}
          <button className="btn btn-ghost focus-ring" onClick={cancelOrClose} type="button">
            {TEXT.cancel}
          </button>
          <button aria-busy={generating} className="btn btn-primary focus-ring" disabled={!info.canDownload} onClick={generate} type="button">
            <FileDown aria-hidden="true" className="size-[18px]" strokeWidth={2} />
            {TEXT.download}
          </button>
        </footer>
      </div>
    </dialog>
  )
}
```

- [ ] **Paso 4: Verde, tipos y lint**

Run: `pnpm --filter @interiores/web exec vitest run shell-export-dialog shell-boundaries`
Expected: PASS (`shell-export-dialog`: 5 pruebas; `shell-boundaries` sigue en verde: `ExportPlanDialog.tsx` no importa Pascal).

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos. Si Biome marca `useExhaustiveDependencies` en el efecto de apertura, la lista `[open, bridge]` es la correcta: `dispatch` es estable; no agregues más.

- [ ] **Paso 5: Commit**

```bash
git add apps/web/src/editor/shell/ExportPlanDialog.tsx apps/web/src/editor/shell/download-blob.ts apps/web/test/shell-export-dialog.test.tsx
git commit -m "feat(plano): diálogo accesible de exportar plano con vista previa, progreso, cancelación y descarga" -- apps/web/src/editor/shell/ExportPlanDialog.tsx apps/web/src/editor/shell/download-blob.ts apps/web/test/shell-export-dialog.test.tsx
```

---

### Task 18a: "Exportar plano" activo en el menú Más (Editar) y en Ver

**Files:**
- Modify: `apps/web/src/editor/shell/more-model.ts`, `apps/web/src/editor/shell/MoreMenu.tsx`, `apps/web/src/editor/shell/ShellDock.tsx`, `apps/web/src/editor/shell/ui/ViewControls.tsx`, `apps/web/src/editor/shell/ShellView.tsx`, `apps/web/test/shell-more-model.test.ts`, `apps/web/test/shell-more-menu.test.tsx`, `apps/web/test/shell-view-controls.test.tsx`, `apps/web/e2e/dock.spec.ts`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `MoreMenu({ onClose, onShortcuts, onExportPlan })` con un botón activo "Exportar plano" (ícono `FileDown`, sin "Pronto"); `SOON_ITEMS` solo con Compartir y Renderizar; `ShellDock({ onExportPlan? })`, `ShellView({ decisions?, onExportPlan? })` y `ShareRender({ onExportPlan? })` con `onExportPlan(opener: HTMLElement | null)`: reciben el botón que abrió el diálogo para devolverle el foco al cerrar. Hasta la Tarea 18b nadie pasa la devolución de llamada: los botones se ven y no hacen nada.

**Cubre el criterio 2** (en el menú **Más** de Editar y como botón en **Ver**, "Exportar plano" está habilitado y sin "Pronto"; Compartir y Renderizar siguen en "Pronto"). El diálogo en sí se monta en la Tarea 18b.

- [ ] **Paso 1: Escribir las pruebas que cambian (rojo)**

Modify `apps/web/test/shell-more-model.test.ts`:

```diff
-  it('Compartir, Renderizar y Exportar plano son los botones "Pronto"', () => {
-    expect(SOON_ITEMS.map((i) => i.label)).toEqual(['Compartir', 'Renderizar', 'Exportar plano'])
+  it('Compartir y Renderizar son los botones "Pronto"; Exportar plano ya es real (spec 4, criterio 2)', () => {
+    expect(SOON_ITEMS.map((i) => i.label)).toEqual(['Compartir', 'Renderizar'])
   })
```

Modify `apps/web/test/shell-more-menu.test.tsx`:

```diff
 describe('MoreMenu', () => {
-  const markup = render(<MoreMenu onClose={noop} onShortcuts={noop} />)
+  const markup = render(<MoreMenu onClose={noop} onExportPlan={noop} onShortcuts={noop} />)
 
-  it('ofrece eliminar, cuadrícula, ajustes, atajos y los tres botones Pronto deshabilitados', () => {
+  it('ofrece eliminar, cuadrícula, ajustes, atajos, Exportar plano y los dos botones Pronto deshabilitados', () => {
```

```diff
-    expect(markup.match(/Pronto/g)).toHaveLength(3)
-    expect(markup.match(/<button[^>]*disabled=""/g)).toHaveLength(3)
+    expect(markup.match(/Pronto/g)).toHaveLength(2)
+    expect(markup.match(/<button[^>]*disabled=""/g)).toHaveLength(2)
```

```diff
+  it('Exportar plano es un botón activo (sin "Pronto") con su ícono decorativo', () => {
+    const buttons = markup.match(/<button[^>]*>(?:(?!<\/button>)[\s\S])*Exportar plano<\/button>/g) ?? []
+    expect(buttons).toHaveLength(1)
+    expect(buttons[0]).not.toContain('disabled')
+    expect(buttons[0]).not.toContain('Pronto')
+    expect(buttons[0]).toMatch(/<svg[^>]*aria-hidden="true"/)
+  })
+
   it('marca la cuadrícula y los ajustes que tiene Pascal ahora (0,5 m; muros en cuadrícula; muebles en alineación)', () => {
```

```diff
-    const other = render(<MoreMenu onClose={noop} onShortcuts={noop} />, ({ editor }) =>
+    const other = render(<MoreMenu onClose={noop} onExportPlan={noop} onShortcuts={noop} />, ({ editor }) =>
```

Modify `apps/web/test/shell-view-controls.test.tsx`:

```diff
   it('Compartir y Renderizar se ven deshabilitados con "Pronto"', () => {
     const markup = renderToStaticMarkup(<ShareRender />)
     expect(markup.match(/<button[^>]*disabled=""/g)).toHaveLength(2)
     expect(textOf(markup)).toContain('Compartir')
     expect(textOf(markup)).toContain('Renderizar')
     expect(markup.match(/Pronto/g)).toHaveLength(2)
   })
+
+  it('Exportar plano está activo junto a Compartir y Renderizar', () => {
+    const markup = renderToStaticMarkup(<ShareRender onExportPlan={noop} />)
+    expect(textOf(markup)).toContain('Exportar plano')
+    const exportButton = markup.match(/<button[^>]*>(?:(?!<\/button>)[\s\S])*Exportar plano<\/button>/g) ?? []
+    expect(exportButton).toHaveLength(1)
+    expect(exportButton[0]).not.toContain('disabled')
+    expect(markup.match(/<button[^>]*disabled=""/g)).toHaveLength(2)
+  })
```

Run: `pnpm --filter @interiores/web exec vitest run shell-more shell-view-controls`
Expected: FAIL — `MoreMenu` no recibe `onExportPlan`, "Exportar plano" sigue en `SOON_ITEMS` y `ShareRender` no trae el botón.

- [ ] **Paso 2: Cambiar el menú Más, el dock y Ver**

Modify `apps/web/src/editor/shell/more-model.ts`:

```diff
-/** Funciones que llegan en una próxima versión: botones deshabilitados con "Pronto" (criterio 11). */
+/** Funciones que llegan en una próxima versión: botones deshabilitados con "Pronto" (criterio 11 del spec 3; "Exportar plano" ya es real, spec 4). */
 export const SOON_ITEMS: readonly { id: string; label: string }[] = [
   { id: 'share', label: 'Compartir' },
   { id: 'render', label: 'Renderizar' },
-  { id: 'export-plan', label: 'Exportar plano' },
 ]
```

Modify `apps/web/src/editor/shell/MoreMenu.tsx`:

```diff
-const SOON_ICONS: Record<string, LucideIcon> = { share: Share2, render: Sparkles, 'export-plan': FileDown }
+const SOON_ICONS: Record<string, LucideIcon> = { share: Share2, render: Sparkles }
```

```diff
-/** Panel del botón "Más": borrar, cuadrícula y ajustes de Pascal, atajos y lo que llega en una próxima versión. */
-export function MoreMenu({ onClose, onShortcuts }: { onClose: () => void; onShortcuts: () => void }) {
+/** Panel del botón "Más": borrar, cuadrícula y ajustes de Pascal, atajos, Exportar plano y lo que llega en una próxima versión. */
+export function MoreMenu({ onClose, onShortcuts, onExportPlan }: { onClose: () => void; onShortcuts: () => void; onExportPlan: () => void }) {
```

```diff
       <button type="button" onClick={onShortcuts} className={cx(ROW, 'text-ink hover:bg-ink/5')}>
         <Keyboard aria-hidden="true" className="size-5 shrink-0 text-ink-muted" strokeWidth={1.9} />
         Atajos de teclado
       </button>
+      <button type="button" onClick={onExportPlan} className={cx(ROW, 'text-ink hover:bg-ink/5')}>
+        <FileDown aria-hidden="true" className="size-5 shrink-0 text-ink-muted" strokeWidth={1.9} />
+        Exportar plano
+      </button>
```

Modify `apps/web/src/editor/shell/ShellDock.tsx`:

```diff
-export function ShellDock() {
+export function ShellDock({ onExportPlan }: { onExportPlan?: (opener: HTMLElement | null) => void } = {}) {
```

```diff
       <MoreMenu
         onClose={closeMenu}
+        onExportPlan={() => {
+          // El botón Más es el que "abrió" el diálogo: el foco vuelve ahí al cerrarlo.
+          onExportPlan?.(root.current?.querySelector<HTMLElement>('[data-dock="more"]') ?? null)
+          setOpenMenu(null)
+        }}
         onShortcuts={() => {
```

Modify `apps/web/src/editor/shell/ui/ViewControls.tsx`:

```diff
-import { Share2, Sparkles, type LucideIcon } from 'lucide-react'
+import { FileDown, Share2, Sparkles, type LucideIcon } from 'lucide-react'
```

```diff
-/** Compartir y Renderizar: visibles pero deshabilitados, con "Pronto". */
-export function ShareRender() {
+/** Exportar plano (activo) junto a Compartir y Renderizar (visibles pero deshabilitados, con "Pronto"). */
+export function ShareRender({ onExportPlan }: { onExportPlan?: (opener: HTMLElement) => void } = {}) {
   return (
     <div className="absolute bottom-6 right-5 z-10 flex items-center gap-3">
+      <button
+        type="button"
+        onClick={(event) => onExportPlan?.(event.currentTarget)}
+        className={cx(FLOAT, 'focus-ring inline-flex h-12 cursor-pointer items-center gap-2 rounded-full px-5 text-[15px] font-semibold text-ink transition-colors duration-150 ease-out hover:bg-white')}
+      >
+        <FileDown aria-hidden="true" className="size-[18px]" strokeWidth={2} />
+        Exportar plano
+      </button>
       <SoonButton icon={Share2} label="Compartir" />
```

Modify `apps/web/src/editor/shell/ShellView.tsx`:

```diff
-export function ShellView({ decisions = DECISIONS }: { decisions?: Pick<Decisions, 'cameraControl' | 'styleControl' | 'walkthrough'> }) {
+export function ShellView({
+  decisions = DECISIONS,
+  onExportPlan,
+}: {
+  decisions?: Pick<Decisions, 'cameraControl' | 'styleControl' | 'walkthrough'>
+  onExportPlan?: (opener: HTMLElement | null) => void
+}) {
```

```diff
-      <ShareRender />
+      <ShareRender onExportPlan={onExportPlan} />
```

Modify `apps/web/e2e/dock.spec.ts`:

```diff
-  for (const name of ['Compartir', 'Renderizar', 'Exportar plano']) await expect(more.getByRole('button', { name })).toBeDisabled()
-  await expect(more.getByText('Pronto')).toHaveCount(3)
+  for (const name of ['Compartir', 'Renderizar']) await expect(more.getByRole('button', { name })).toBeDisabled()
+  await expect(more.getByRole('button', { name: 'Exportar plano' })).toBeEnabled()
+  await expect(more.getByText('Pronto')).toHaveCount(2)
```

- [ ] **Paso 3: Verde, tipos, lint y las pruebas del shell**

Run: `pnpm --filter @interiores/web exec vitest run shell-`
Expected: PASS (todas las del shell). Si alguna prueba de `shell-` compara el texto completo de Ver o de Editar y falla solo por la palabra nueva "Exportar plano", agrégala a lo esperado: es el único cambio que se admite en esas pruebas.

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/more-model.ts apps/web/src/editor/shell/MoreMenu.tsx apps/web/src/editor/shell/ShellDock.tsx apps/web/src/editor/shell/ui/ViewControls.tsx apps/web/src/editor/shell/ShellView.tsx apps/web/test/shell-more-model.test.ts apps/web/test/shell-more-menu.test.tsx apps/web/test/shell-view-controls.test.tsx apps/web/e2e/dock.spec.ts
git commit -m "feat(plano): botón Exportar plano activo en el menú Más y en Ver" -- apps/web/src/editor/shell/more-model.ts apps/web/src/editor/shell/MoreMenu.tsx apps/web/src/editor/shell/ShellDock.tsx apps/web/src/editor/shell/ui/ViewControls.tsx apps/web/src/editor/shell/ShellView.tsx apps/web/test/shell-more-model.test.ts apps/web/test/shell-more-menu.test.tsx apps/web/test/shell-view-controls.test.tsx apps/web/e2e/dock.spec.ts
```

---

### Task 18b: El diálogo montado en `EditorShell` y el autor de la cuenta en el cajetín

**Files:**
- Modify: `apps/web/src/editor/shell/EditorShell.tsx`, `apps/web/src/editor/ProjectEditor.tsx`, `apps/web/src/lib/person-name.ts`, `apps/web/test/person-name.test.ts`, `docs/superpowers/specs/2026-10-11-editor-shell-design.md`

**Interfaces:**
- Consumes: `ExportPlanDialog` (Tarea 17); los `onExportPlan` de la Tarea 18a; `savedName`, `AccountLike` de `@/lib/person-name`; `useSession` de `@/lib/use-session`.
- Produces: `authorName(user: AccountLike): string` en `@/lib/person-name` (el nombre de la cuenta; el correo entero si no tiene nombre; `""` si no hay cuenta); `EditorShell({ …, author? })` (por omisión `""`) que monta `ExportPlanDialog` como hermano del dock y de Ver y se lo abre a quien lo pida.

**Cubre el criterio 2 completo** (funciona en Ver y en Editar y abre el diálogo; el criterio 11 del spec 3 se actualiza en el mismo cambio) y la decisión de Silvert sobre el autor (nombre de la cuenta; el correo si no tiene nombre). El diálogo vive en `EditorShell` para que su estado no dependa del modo; el foco vuelve al botón que lo abrió (`opener`).

- [ ] **Paso 1: Escribir la prueba (rojo)**

Modify `apps/web/test/person-name.test.ts` (agrega `authorName` al import y una prueba al final):

```diff
-import { NAME_MAX, NAME_MIN, greetingName, initialsFor, normalizeName, savedName } from '../src/lib/person-name'
+import { NAME_MAX, NAME_MIN, authorName, greetingName, initialsFor, normalizeName, savedName } from '../src/lib/person-name'
```

```ts
describe('authorName (el autor del cajetín del plano)', () => {
  it('es el nombre de la cuenta', () => {
    expect(authorName(withName('Ana María'))).toBe('Ana María')
  })

  it('si la cuenta no tiene nombre, es el correo entero', () => {
    expect(authorName(withName(undefined, 'silvert.quispe@correo.com'))).toBe('silvert.quispe@correo.com')
    expect(authorName({ email: ' ana@correo.com ', user_metadata: null })).toBe('ana@correo.com')
  })

  it('sin cuenta es vacío', () => {
    expect(authorName(null)).toBe('')
    expect(authorName(undefined)).toBe('')
    expect(authorName({ email: null })).toBe('')
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run person-name`
Expected: FAIL — `authorName` no está exportado.

- [ ] **Paso 2: El autor, el diálogo en `EditorShell` y el autor en `ProjectEditor`**

Modify `apps/web/src/lib/person-name.ts` (al final del archivo):

```ts
/** Autor del cajetín del plano: el nombre de la cuenta y, si no tiene, el correo entero (las cuentas anteriores al registro con nombre). */
export function authorName(user: AccountLike): string {
  return savedName(user) || (user?.email ?? '').trim()
}
```

Modify `apps/web/src/editor/shell/EditorShell.tsx`:

```diff
-import { useEffect } from 'react'
+import { useEffect, useRef, useState } from 'react'
 import type { SaverStatus } from '../scene-saver'
 import type { ShellBridge } from './bridge'
 import { selectShellState } from './bridge/selectors'
+import { ExportPlanDialog } from './ExportPlanDialog'
 import type { CatalogItemLike } from './furniture-model'
```

```diff
-function ShellBody({ catalog }: { catalog: readonly CatalogItemLike[] }) {
+function ShellBody({ catalog, onExportPlan }: { catalog: readonly CatalogItemLike[]; onExportPlan: (opener: HTMLElement | null) => void }) {
```

```diff
-          <ShellDock />
+          <ShellDock onExportPlan={onExportPlan} />
```

```diff
-        <ShellView />
+        <ShellView onExportPlan={onExportPlan} />
```

```diff
   projectName,
+  author = '',
   saveStatus,
   onBack,
   backBusy,
 }: {
   bridge: ShellBridge
   catalog: readonly CatalogItemLike[]
   projectName: string
+  /** Nombre de la cuenta (o el correo): va en el cajetín del plano. */
+  author?: string
   saveStatus: SaverStatus
```

```diff
 }) {
+  const [exportOpen, setExportOpen] = useState(false)
+  const exportOpener = useRef<HTMLElement | null>(null)
+  const openExport = (opener: HTMLElement | null) => {
+    exportOpener.current = opener
+    setExportOpen(true)
+  }
   useEffect(() => {
     const stop = bridge.mountDefaults()
```

```diff
         <ShellTopBar name={projectName} saveStatus={saveStatus} onBack={onBack} backBusy={backBusy} />
-        <ShellBody catalog={catalog} />
+        <ShellBody catalog={catalog} onExportPlan={openExport} />
+        <ExportPlanDialog author={author} onClose={() => setExportOpen(false)} open={exportOpen} opener={exportOpener} projectName={projectName} />
```

Modify `apps/web/src/editor/ProjectEditor.tsx`:

```diff
 import { friendlyMessage } from '@/lib/api/errors'
 import { useNavigate } from '@/lib/use-navigate'
+import { authorName } from '@/lib/person-name'
+import { useSession } from '@/lib/use-session'
 import { supabaseBrowser } from '@/lib/supabase/browser'
```

```diff
   const { go, pending: leaving } = useNavigate()
+  const { session } = useSession()
   const rootRef = useRef<HTMLDivElement>(null)
```

```diff
       <EditorShell
+        author={authorName(session?.user)}
         backBusy={leaving}
```

Modify `docs/superpowers/specs/2026-10-11-editor-shell-design.md` (el criterio 11 y la lista de lo que no se hace; el cambio de Exportar plano vive en el spec 4):

```diff
-11. Compartir, Renderizar, Exportar plano y Subir mi mueble se ven **deshabilitados con "Pronto"** y no hacen nada.
+11. Compartir, Renderizar y Subir mi mueble se ven **deshabilitados con "Pronto"** y no hacen nada. **Exportar plano** ya está activo (spec 4, 2026-10-12): en el menú Más de Editar y como botón en Ver abre su diálogo.
```

```diff
-- **Compartir, Renderizar, Exportar plano y Subir mi mueble:** solo sus botones deshabilitados.
+- **Compartir, Renderizar y Subir mi mueble:** solo sus botones deshabilitados (Exportar plano se hizo en el spec 4).
```

- [ ] **Paso 3: Verde, tipos, lint y las pruebas del shell**

Run: `pnpm --filter @interiores/web exec vitest run shell- person-name`
Expected: PASS (todas las del shell y `person-name`). Si alguna prueba de `shell-` que renderiza `EditorShell` falla solo por el `<dialog>` cerrado que ahora trae, agrégalo a lo esperado: es el único cambio que se admite en esas pruebas.

Run: `pnpm --filter @interiores/web typecheck && pnpm lint && pnpm exec vitest run tests/boundaries`
Expected: `Tipos OK …`, Biome sin errores nuevos y la frontera en verde.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/src/editor/shell/EditorShell.tsx apps/web/src/editor/ProjectEditor.tsx apps/web/src/lib/person-name.ts apps/web/test/person-name.test.ts docs/superpowers/specs/2026-10-11-editor-shell-design.md
git commit -m "feat(plano): el diálogo de exportar plano en el editor y el autor de la cuenta en el cajetín" -- apps/web/src/editor/shell/EditorShell.tsx apps/web/src/editor/ProjectEditor.tsx apps/web/src/lib/person-name.ts apps/web/test/person-name.test.ts docs/superpowers/specs/2026-10-11-editor-shell-design.md
```

---

## Pruebas en navegador (Tareas 19 a 20b)

### Task 19: E2E del diálogo: abrir, teclado, escalas que no caben, descarga real y cancelar

**Files:**
- Create: `apps/web/e2e/exportar-plano.spec.ts`, `apps/web/e2e/support/export.ts`
- Modify: `apps/web/src/editor/e2e-hooks.ts` (ganchos `planMeasure` y `addWallOf`)

**Interfaces:**
- Consumes: todo lo anterior; `hook`, `createProjectViaUi`, `createBlankProject`, `dock`, `dockButton`, `modeButton`; `readPdf` de `test/support/pdf-read.ts`; las funciones puras de `src/lib/export/` (se prueba contra la misma regla, no contra números copiados).
- Produces: en `e2e/support/export.ts`: `exportDialog(page)`, `openTemplate(page, id, label?)`, `openExportFromMore(page)`, `choose(dialog, name)`, `downloadButton(dialog)`, `downloadPdf(page, dialog, path)`; ganchos `window.__e2e.planMeasure()` (las plantas como las mide el parche) y `window.__e2e.addWallOf(length)` (un muro horizontal de esa longitud en metros).

**Cubre los criterios 2, 3, 4, 5, 7, 8 (vista previa con píxeles), 14 y 15 en navegador**, y los casos 1 y 3 de Review Focus (nada que dibujar; no cabe en ninguna escala). La descarga es la real (`page.waitForEvent('download')`).

- [ ] **Paso 1: Los ganchos y las ayudas**

Modify `apps/web/src/editor/e2e-hooks.ts`:

```diff
-import { armToolMode, getHistoryCommandState, subscribeCameraPose, useEditor, useFirstPersonHud } from '@pascal-app/editor'
+import { armToolMode, getHistoryCommandState, measureFloorplanLevels, subscribeCameraPose, useEditor, useFirstPersonHud } from '@pascal-app/editor'
```

```diff
+    /** Las plantas como las mide el parche de planos: metros de ancho y alto y si están vacías. */
+    planMeasure: () => measureFloorplanLevels(),
+    /** Un muro horizontal de esa longitud (en metros) en el primer nivel, desde el origen. */
+    addWallOf: (length: number) => {
+      const level = nodes().find((n) => n.type === 'level')
+      if (!level) throw new Error('No hay nivel donde agregar el muro')
+      useScene.getState().createNode(WallNode.parse({ start: [0, 0], end: [length, 0] }), level.id as never)
+    },
     /** Muestra u oculta el chrome de Pascal (la prueba de guarda lo enciende para comprobar que sus selectores existen). */
```

Create `apps/web/e2e/support/export.ts`:

```ts
import { type Locator, type Page, expect } from '@playwright/test'
import { templateById } from '../../src/lib/templates'
import { createProjectViaUi } from './projects'
import { dock, dockButton } from './shell'

export const exportDialog = (page: Page) => page.getByRole('dialog', { name: 'Exportar plano' })
export const downloadButton = (dialog: Locator) => dialog.getByRole('button', { name: 'Descargar PDF' })

/** Crea un proyecto con una plantilla y espera a que el editor esté listo; devuelve el nombre del proyecto. */
export async function openTemplate(page: Page, id: string, label = 'plano'): Promise<string> {
  const template = templateById(id)
  if (!template) throw new Error(`Falta la plantilla ${id}`)
  const name = `E2E ${label} ${Date.now()}`
  await createProjectViaUi(page, { name, kind: template.kind, template: template.name })
  await expect(dock(page)).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(3000)
  return name
}

/** Abre el diálogo desde Más (Editar) y espera a que termine de medir. */
export async function openExportFromMore(page: Page): Promise<Locator> {
  await dockButton(page, 'Más').click()
  await page.getByRole('dialog', { name: 'Más opciones' }).getByRole('button', { name: 'Exportar plano' }).click()
  const dialog = exportDialog(page)
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Midiendo tu proyecto…')).toBeHidden({ timeout: 60_000 })
  return dialog
}

/** Elige una opción de radio como una persona: con un clic en su etiqueta (el radio en sí está oculto). */
export const choose = (dialog: Locator, name: string | RegExp) =>
  dialog.locator('label').filter({ has: dialog.page().getByRole('radio', { name }) }).first().click()

/** Pulsa "Descargar PDF" y guarda la descarga real en `path`. */
export async function downloadPdf(page: Page, dialog: Locator, path: string) {
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), downloadButton(dialog).click()])
  await download.saveAs(path)
  return download
}
```

- [ ] **Paso 2: Escribir la prueba en navegador**

Create `apps/web/e2e/exportar-plano.spec.ts`:

```ts
import { readFileSync } from 'node:fs'
import { type Page, expect, test } from '@playwright/test'
import { exportFileName } from '../src/lib/export/file-name'
import { fitScale, largestFittingScale, maxExtent } from '../src/lib/export/fit'
import { sheetFor } from '../src/lib/export/sheet'
import { SCALES } from '../src/lib/export/types'
import { readPdf } from '../test/support/pdf-read'
import { choose, downloadButton, downloadPdf, exportDialog, openExportFromMore, openTemplate } from './support/export'
import { hook } from './support/hooks'
import { createBlankProject } from './support/projects'
import { dock, dockButton, modeButton } from './support/shell'

/** Las escalas habilitadas y la elegida de cada hoja siguen la regla de cabida, con las medidas reales del proyecto. */
async function expectScalesFollowTheRule(page: Page, dialog: ReturnType<typeof exportDialog>) {
  const levels = (await hook(page, 'planMeasure')).filter((level) => !level.empty)
  const extent = maxExtent(levels)
  for (const paper of ['A4', 'A3'] as const) {
    await choose(dialog, new RegExp(`^${paper}$`))
    await expect(dialog.getByRole('radio', { name: paper, exact: true })).toBeChecked()
    const landscape = await dialog.getByRole('radio', { name: /^Apaisada/ }).isChecked()
    const sheet = sheetFor(paper, landscape ? 'landscape' : 'portrait')
    for (const scale of SCALES) {
      const radio = dialog.getByRole('radio', { name: `1:${scale}`, exact: true })
      if (fitScale(extent, sheet, scale).fits) await expect(radio, `${paper} 1:${scale}`).toBeEnabled()
      else {
        await expect(radio, `${paper} 1:${scale}`).toBeDisabled()
        await expect(radio).toHaveAccessibleDescription(/no cabe en/)
      }
    }
    const best = largestFittingScale(extent, sheet)
    if (best !== null) {
      await expect(dialog.getByRole('radio', { name: `1:${best}`, exact: true })).toBeChecked()
      const fit = fitScale(extent, sheet, best)
      await expect(dialog.getByRole('status').filter({ hasText: 'Cabe en la hoja' })).toContainText(`usa ${fit.percent} % del ${fit.axis === 'width' ? 'ancho' : 'alto'}`)
    }
  }
}

test('se abre desde Más en Editar con el foco en el primer control; las flechas cambian de hoja; Esc cierra, devuelve el foco y no desarma la herramienta', async ({ page }) => {
  test.setTimeout(180_000)
  await openTemplate(page, 'loft')
  await hook(page, 'armWall')
  await dockButton(page, 'Más').click()
  const more = page.getByRole('dialog', { name: 'Más opciones' })
  for (const name of ['Compartir', 'Renderizar']) await expect(more.getByRole('button', { name })).toBeDisabled()
  await expect(more.getByText('Pronto')).toHaveCount(2)
  await expect(more.getByRole('button', { name: 'Exportar plano' })).toBeEnabled()
  await more.getByRole('button', { name: 'Exportar plano' }).click()
  const dialog = exportDialog(page)
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('radio', { name: 'A4', exact: true })).toBeFocused({ timeout: 60_000 })
  await page.keyboard.press('ArrowRight')
  await expect(dialog.getByRole('radio', { name: 'A3', exact: true })).toBeChecked()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(dockButton(page, 'Más')).toBeFocused()
  expect((await hook(page, 'state')).tool).toBe('wall')
})

test('en Ver el botón Exportar plano abre el mismo diálogo y el foco vuelve a él al cerrarlo', async ({ page }) => {
  test.setTimeout(180_000)
  await openTemplate(page, 'loft')
  await modeButton(page, 'Ver').click()
  await expect(page.getByRole('complementary', { name: 'Vista 3D' })).toBeVisible()
  for (const name of ['Compartir', 'Renderizar']) await expect(page.getByRole('button', { name })).toBeDisabled()
  const button = page.getByRole('button', { name: 'Exportar plano', exact: true })
  await button.click()
  const dialog = exportDialog(page)
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('radio', { name: 'A4', exact: true })).toBeEnabled({ timeout: 60_000 })
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog).toBeHidden()
  await expect(button).toBeFocused()
})

test('las escalas que no caben están deshabilitadas con su motivo y la mayor que cabe viene elegida: Loft y Supermercado', async ({ page }) => {
  test.setTimeout(300_000)
  await openTemplate(page, 'loft')
  const loft = await openExportFromMore(page)
  await expectScalesFollowTheRule(page, loft)
  await page.keyboard.press('Escape')
  await expect(loft).toBeHidden()
  await page.goto('/proyectos')
  await openTemplate(page, 'supermercado', 'plano comercio')
  const shop = await openExportFromMore(page)
  await expectScalesFollowTheRule(page, shop)
})

test('un edificio que no cabe en ninguna escala lo dice y no deja descargar (Review Focus 3)', async ({ page }) => {
  test.setTimeout(180_000)
  await createBlankProject(page, 'plano enorme')
  await expect(dock(page)).toBeVisible({ timeout: 30_000 })
  await hook(page, 'addWallOf', 150)
  const dialog = await openExportFromMore(page)
  for (const scale of SCALES) await expect(dialog.getByRole('radio', { name: `1:${scale}`, exact: true })).toBeDisabled()
  await expect(dialog.getByText('El proyecto no cabe en esta hoja ni a 1:100. Prueba con A3 o quita plantas.')).toBeVisible()
  await expect(downloadButton(dialog)).toBeDisabled()
  await choose(dialog, /^A3$/)
  await expect(dialog.getByText('El proyecto no cabe en esta hoja ni a 1:100. Prueba con otra orientación o quita plantas.')).toBeVisible()
  await expect(downloadButton(dialog)).toBeDisabled()
})

test('un proyecto sin nada dibujado dice que no hay nada que dibujar, deja la planta vacía desmarcada y no descarga (Review Focus 1)', async ({ page }) => {
  test.setTimeout(180_000)
  await createBlankProject(page, 'plano vacio')
  await expect(dock(page)).toBeVisible({ timeout: 30_000 })
  const dialog = await openExportFromMore(page)
  await expect(dialog.getByText('Aún no hay nada que dibujar. Traza muros o ambientes y vuelve a intentarlo.')).toBeVisible()
  const level = dialog.getByRole('checkbox', { name: /Planta baja \(vacía\)/ })
  await expect(level).toBeDisabled()
  await expect(level).not.toBeChecked()
  await expect(downloadButton(dialog)).toBeDisabled()
})

test('la descarga es real: nombre <proyecto>-planos.pdf, una página por planta del tamaño de la hoja, "Hoja N de M", fecha, autor y vista previa con píxeles', async ({ page }) => {
  test.setTimeout(300_000)
  const name = await openTemplate(page, 'loft')
  const dialog = await openExportFromMore(page)
  const levels = (await hook(page, 'planMeasure')).filter((level) => !level.empty)
  // La vista previa dibuja la página real: el lienzo termina con píxeles que no son blancos.
  const canvas = dialog.getByRole('img', { name: /Vista previa de la hoja del plano/ })
  await expect(canvas).toBeVisible({ timeout: 60_000 })
  await expect
    .poll(() => canvas.evaluate((el) => {
      const c = el as HTMLCanvasElement
      const data = c.getContext('2d')?.getImageData(0, 0, c.width, c.height).data ?? []
      let dark = 0
      for (let i = 0; i < data.length; i += 4) if ((data[i] ?? 255) < 200 && (data[i + 3] ?? 0) > 0) dark += 1
      return dark
    }), { timeout: 30_000 })
    .toBeGreaterThan(500)

  const download = await downloadPdf(page, dialog, 'test-results/plano-loft-papel.pdf')
  expect(download.suggestedFilename()).toBe(exportFileName(name))
  expect(download.suggestedFilename()).toMatch(/^E2E-plano-\d+-planos\.pdf$/)
  const pages = await readPdf(new Uint8Array(readFileSync('test-results/plano-loft-papel.pdf')))
  expect(pages).toHaveLength(levels.length)
  for (const [index, pdfPage] of pages.entries()) {
    expect(Math.abs(pdfPage.width - 841.89), `página ${index + 1} ancho`).toBeLessThan(0.5)
    expect(Math.abs(pdfPage.height - 595.28), `página ${index + 1} alto`).toBeLessThan(0.5)
    const text = pdfPage.items.map((item) => item.str).join('')
    expect(text).toContain(`Hoja ${index + 1} de ${levels.length}`)
    expect(text).toContain(name)
    expect(text).toContain('@example.com')
    expect(text).toMatch(/\d{1,2} de [a-záéíóú]+ de \d{4}/)
    expect(text).not.toMatch(/Floor plan|Construction Schedules|Level \d|Ground Floor/)
  }
  await expect(downloadButton(dialog)).toBeEnabled()
})

test('doble clic en "Descargar PDF" descarga una sola vez', async ({ page }) => {
  test.setTimeout(240_000)
  await openTemplate(page, 'loft')
  const dialog = await openExportFromMore(page)
  let downloads = 0
  page.on('download', () => {
    downloads += 1
  })
  await downloadButton(dialog).dblclick()
  await expect.poll(() => downloads, { timeout: 120_000 }).toBe(1)
  await page.waitForTimeout(3000)
  expect(downloads).toBe(1)
})

test('Esc durante la generación la cancela sin descargar nada y el diálogo sigue abierto; otro Esc lo cierra', async ({ page }) => {
  test.setTimeout(300_000)
  await page.route('**/floor-plan.png', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.continue()
  })
  await openTemplate(page, 'loft')
  const dialog = await openExportFromMore(page)
  await choose(dialog, /^Color$/)
  let downloads = 0
  page.on('download', () => {
    downloads += 1
  })
  await downloadButton(dialog).click()
  await expect(dialog.getByText(/Generando planta \d de \d…/)).toBeVisible({ timeout: 30_000 })
  await page.keyboard.press('Escape')
  await expect(dialog.getByText('Cancelaste la exportación.')).toBeVisible({ timeout: 60_000 })
  await expect(dialog).toBeVisible()
  expect(downloads).toBe(0)
  await expect(downloadButton(dialog)).toBeEnabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('en 390 px el diálogo se apila con la vista previa arriba, cabe sin desplazamiento horizontal y los botones miden 44 px o más', async ({ page }) => {
  test.setTimeout(240_000)
  await openTemplate(page, 'loft')
  const dialog = await openExportFromMore(page)
  await page.setViewportSize({ width: 390, height: 844 })
  const box = await dialog.boundingBox()
  expect(box?.width ?? 999).toBeLessThanOrEqual(390)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  const preview = await dialog.getByRole('region', { name: 'Vista previa' }).boundingBox()
  const options = await dialog.getByRole('group', { name: 'Hoja' }).boundingBox()
  expect(preview?.y ?? 9999).toBeLessThan(options?.y ?? 0)
  for (const name of ['Descargar PDF', 'Cancelar', 'Cerrar']) {
    const button = await dialog.getByRole('button', { name, exact: true }).boundingBox()
    expect(button?.height ?? 0, name).toBeGreaterThanOrEqual(43.5)
  }
})
```

- [ ] **Paso 3: Correr**

Run: `pnpm --filter @interiores/web e2e e2e/exportar-plano.spec.ts`
Expected: 9 pruebas en verde. Si una falla:
- "se abre desde Más…" no encuentra el foco en `A4`: el efecto de foco del diálogo corre solo cuando termina de medir; sube el `timeout` de ese `toBeFocused`.
- "las escalas…" difiere de la regla: compara `fit.percent` con lo que dice el diálogo; si el diálogo usa otras medidas, `measureFloorplanLevels` y `planMeasure` no son la misma llamada (deben serlo).
- "la descarga es real" no ve `@example.com`: `authorName` recibió `undefined` (la sesión no cargó): `ProjectEditor` debe pasar `author` a `EditorShell`.
- "Esc durante la generación" termina sin el aviso: la imagen tarda 1,5 s y la señal se mira en la siguiente imagen; si el Loft tuviera pocos muebles, la generación termina antes del Esc: baja el retraso a 800 ms en el `route` y vuelve a probar.
- "en 390 px" falla por `scrollWidth`: el diálogo debe llevar `max-w` de `min(940px, 100% - 2rem)` (clase `app-dialog`); mira qué elemento se pasa con `page.evaluate(() => [...document.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > 390).map(e => e.tagName))`.

- [ ] **Paso 4: Tipos, lint y commit**

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

```bash
git add apps/web/e2e/exportar-plano.spec.ts apps/web/e2e/support/export.ts apps/web/src/editor/e2e-hooks.ts
git commit -m "test(plano): pruebas en navegador del diálogo de exportar plano (abrir, teclado, cabida, descarga y cancelar)" -- apps/web/e2e/exportar-plano.spec.ts apps/web/e2e/support/export.ts apps/web/src/editor/e2e-hooks.ts
```

---

### Task 20a: E2E del contenido del PDF (1 de 2): el analizador, Papel y Color

**Files:**
- Create: `apps/web/e2e/support/pdf.ts`, `apps/web/e2e/exportar-plano-papel-color.spec.ts`

**Interfaces:**
- Consumes: `e2e/support/export.ts` (Tarea 19); `@napi-rs/canvas` 1.0.11 y `pdfjs-dist` (Tarea 0c); `readPdf` (Tarea 11); `zoneDisplayName`.
- Produces en `e2e/support/pdf.ts`: `openPdf(path)`; `pageStats(path, page?)` → `{ images: number; fillColors: Set<string>; strokeColors: Set<string>; maxStrokePt: number }` (lee la lista de operaciones de la página con la matriz de transformación, así el ancho de línea es el efectivo en puntos); `rasterize(path, page, pxPerMm)` → `Raster` (`{ width; height; data; pxPerMm; save(path) }`); `isGray(raster)`, `countColored(raster)`, `wallRunMm(raster, region)` y `darkSpanMm(raster, rowMm, x0Mm, x1Mm)`.

**Cubre los criterios 9, 10 y 13 (peso) sobre el PDF real.** Todo el análisis de la página vive en `support/pdf.ts`: **si `pdfjs-dist` cambia el formato de su lista de operaciones, se ajusta solo ahí** (`constructPath` lleva la operación de pintado en el primer argumento desde pdf.js 4; en las versiones viejas el pintado va en una operación aparte: el ayudante acepta las dos). Papel: solo grises, sin imágenes, rellenos negros o blancos, líneas de 0,7 pt o menos y menos de 1 MB. Color: ambientes con color, muebles con su proyección (imágenes), leyenda de ambientes y pisos y menos de 5 MB.

- [ ] **Paso 1: Escribir el analizador del PDF**

Create `apps/web/e2e/support/pdf.ts`:

```ts
import { readFileSync, writeFileSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'

const PDFJS = 'pdfjs-dist/legacy/build/pdf.mjs'

type OperatorList = { fnArray: number[]; argsArray: unknown[] }
type PdfPage = {
  getViewport(options: { scale: number }): { width: number; height: number }
  getOperatorList(): Promise<OperatorList>
  render(options: unknown): { promise: Promise<void> }
}
type Pdfjs = { getDocument(options: unknown): { promise: Promise<{ numPages: number; getPage(n: number): Promise<PdfPage> }> }; OPS: Record<string, number> }

export async function openPdf(path: string) {
  const pdfjs = (await import(/* @vite-ignore */ PDFJS)) as Pdfjs
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(path)), isEvalSupported: false }).promise
  return { pdfjs, doc }
}

export type PageStats = { images: number; fillColors: Set<string>; strokeColors: Set<string>; maxStrokePt: number }
type State = { ctm: number[]; fill: string; stroke: string; width: number }

/** Compone la matriz nueva `m` con la actual `c` como lo hace el operador `cm` de PDF. */
const concat = (c: number[], m: number[]): number[] => [
  (m[0] ?? 1) * (c[0] ?? 1) + (m[1] ?? 0) * (c[2] ?? 0),
  (m[0] ?? 1) * (c[1] ?? 0) + (m[1] ?? 0) * (c[3] ?? 1),
  (m[2] ?? 0) * (c[0] ?? 1) + (m[3] ?? 1) * (c[2] ?? 0),
  (m[2] ?? 0) * (c[1] ?? 0) + (m[3] ?? 1) * (c[3] ?? 1),
  (m[4] ?? 0) * (c[0] ?? 1) + (m[5] ?? 0) * (c[2] ?? 0) + (c[4] ?? 0),
  (m[4] ?? 0) * (c[1] ?? 0) + (m[5] ?? 0) * (c[3] ?? 1) + (c[5] ?? 0),
]

/** "r,g,b" en 0 a 255 (pdfjs a veces entrega 0 a 1). */
function rgbKey(args: unknown): string {
  const values = (Array.isArray(args) || ArrayBuffer.isView(args) ? Array.from(args as ArrayLike<number>) : []).map(Number)
  const scale = values.length > 0 && values.every((v) => v <= 1) ? 255 : 1
  return values.map((v) => Math.round(v * scale)).join(',')
}

/** Qué se pintó en la página: imágenes, colores de relleno y de trazo de los caminos y el ancho de línea más grueso en puntos. */
export async function pageStats(path: string, pageNumber = 1): Promise<PageStats> {
  const { pdfjs, doc } = await openPdf(path)
  const { OPS } = pdfjs
  const list = await (await doc.getPage(pageNumber)).getOperatorList()
  const numbers = (...names: string[]) => new Set(names.map((name) => OPS[name]).filter((n): n is number => typeof n === 'number'))
  const imageOps = numbers('paintImageXObject', 'paintInlineImageXObject', 'paintImageMaskXObject', 'paintImageXObjectRepeat', 'paintJpegXObject')
  const fillOps = numbers('fill', 'eoFill', 'fillStroke', 'eoFillStroke', 'closeFillStroke', 'closeEOFillStroke')
  const strokeOps = numbers('stroke', 'closeStroke', 'fillStroke', 'eoFillStroke', 'closeFillStroke', 'closeEOFillStroke')
  const stats: PageStats = { images: 0, fillColors: new Set(), strokeColors: new Set(), maxStrokePt: 0 }
  let state: State = { ctm: [1, 0, 0, 1, 0, 0], fill: '0,0,0', stroke: '0,0,0', width: 1 }
  const stack: State[] = []
  const paint = (op: number) => {
    if (fillOps.has(op)) stats.fillColors.add(state.fill)
    if (strokeOps.has(op)) {
      stats.strokeColors.add(state.stroke)
      const [a = 1, b = 0, c = 0, d = 1] = state.ctm
      stats.maxStrokePt = Math.max(stats.maxStrokePt, state.width * Math.sqrt(Math.abs(a * d - b * c)))
    }
  }
  list.fnArray.forEach((fn, index) => {
    const args = list.argsArray[index]
    if (fn === OPS.save) stack.push({ ...state, ctm: [...state.ctm] })
    else if (fn === OPS.restore) state = stack.pop() ?? state
    else if (fn === OPS.transform) state = { ...state, ctm: concat(state.ctm, (args as number[]).map(Number)) }
    else if (fn === OPS.setLineWidth) state = { ...state, width: Number((args as number[])[0]) }
    else if (fn === OPS.setFillRGBColor) state = { ...state, fill: rgbKey(args) }
    else if (fn === OPS.setStrokeRGBColor) state = { ...state, stroke: rgbKey(args) }
    else if (imageOps.has(fn)) stats.images += 1
    else if (fn === OPS.constructPath && Array.isArray(args) && typeof args[0] === 'number') paint(args[0])
    else paint(fn)
  })
  return stats
}

export type Raster = { width: number; height: number; data: Uint8ClampedArray; pxPerMm: number; save(path: string): void }

/** Dibuja una página con pdfjs sobre un lienzo de Node (`pxPerMm` píxeles por milímetro). */
export async function rasterize(path: string, pageNumber: number, pxPerMm: number): Promise<Raster> {
  const { doc } = await openPdf(path)
  const page = await doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale: (pxPerMm * 25.4) / 72 })
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const context = canvas.getContext('2d')
  await page.render({ canvas, canvasContext: context, viewport }).promise
  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  return { width: canvas.width, height: canvas.height, data: image.data, pxPerMm, save: (target) => writeFileSync(target, canvas.toBuffer('image/png')) }
}

const at = (r: Raster, x: number, y: number) => {
  const i = (y * r.width + x) * 4
  return [r.data[i] ?? 255, r.data[i + 1] ?? 255, r.data[i + 2] ?? 255] as const
}

/** Todos los píxeles son grises (R = G = B con 2 de tolerancia). */
export function isGray(raster: Raster, tolerance = 2): boolean {
  for (let i = 0; i < raster.data.length; i += 4) {
    const [r, g, b] = [raster.data[i] ?? 0, raster.data[i + 1] ?? 0, raster.data[i + 2] ?? 0]
    if (Math.abs(r - g) > tolerance || Math.abs(g - b) > tolerance) return false
  }
  return true
}

/** Cuántos píxeles tienen color (el canal más alto supera al más bajo en `spread`). */
export function countColored(raster: Raster, spread = 25): number {
  let count = 0
  for (let i = 0; i < raster.data.length; i += 4) {
    const channels = [raster.data[i] ?? 0, raster.data[i + 1] ?? 0, raster.data[i + 2] ?? 0]
    if (Math.max(...channels) - Math.min(...channels) > spread) count += 1
  }
  return count
}

const isDark = (r: Raster, x: number, y: number) => at(r, x, y)[0] < 96

/** El tramo oscuro más largo de una fila entre dos x (mm), en mm. */
function longestRun(r: Raster, y: number, x0: number, x1: number): { length: number; middle: number } {
  let best = { length: 0, middle: 0 }
  let start = -1
  for (let x = x0; x <= x1 + 1; x++) {
    const dark = x <= x1 && isDark(r, x, y)
    if (dark && start < 0) start = x
    if (!dark && start >= 0) {
      if (x - start > best.length) best = { length: x - start, middle: (start + x) / 2 }
      start = -1
    }
  }
  return best
}

/**
 * El largo de la figura negra más ancha y gruesa de una zona (el muro relleno): busca la banda de filas (de al menos 1,2 mm de
 * alto) cuyo tramo oscuro es casi el máximo y mide ese tramo en la fila central. Las cotas y sus rayas finas no pasan el filtro.
 */
export function wallRunMm(raster: Raster, region: { x0: number; x1: number; y0: number; y1: number }): number {
  const px = (mm: number) => Math.round(mm * raster.pxPerMm)
  const rows: number[] = []
  for (let y = px(region.y0); y <= px(region.y1); y++) rows.push(longestRun(raster, y, px(region.x0), px(region.x1)).length)
  const max = Math.max(0, ...rows)
  const minRows = Math.ceil(1.2 * raster.pxPerMm)
  let bandStart = -1
  for (let i = 0; i <= rows.length; i++) {
    const inBand = i < rows.length && (rows[i] ?? 0) >= max * 0.8
    if (inBand && bandStart < 0) bandStart = i
    if (!inBand && bandStart >= 0) {
      if (i - bandStart >= minRows) return (rows[Math.floor((bandStart + i) / 2)] ?? 0) / raster.pxPerMm
      bandStart = -1
    }
  }
  return 0
}

/** Del primer al último píxel oscuro de una fila entre dos x (mm), en mm: lo que mide la barra de escala gráfica de borde a borde. */
export function darkSpanMm(raster: Raster, rowMm: number, x0Mm: number, x1Mm: number): number {
  const y = Math.round(rowMm * raster.pxPerMm)
  let first = -1
  let last = -1
  for (let x = Math.round(x0Mm * raster.pxPerMm); x <= Math.round(x1Mm * raster.pxPerMm); x++) {
    if (isDark(raster, x, y)) {
      if (first < 0) first = x
      last = x
    }
  }
  return first < 0 ? 0 : (last - first + 1) / raster.pxPerMm
}
```

- [ ] **Paso 2: Escribir las pruebas en navegador**

Create `apps/web/e2e/exportar-plano-papel-color.spec.ts`:

```ts
import { readFileSync, statSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { zoneDisplayName } from '../src/lib/editor-names'
import { readPdf } from '../test/support/pdf-read'
import { choose, downloadPdf, openExportFromMore, openTemplate } from './support/export'
import { hook } from './support/hooks'
import { countColored, isGray, pageStats, rasterize } from './support/pdf'

const BLACK_OR_WHITE = new Set(['0,0,0', '255,255,255'])

test('Papel: solo grises, sin imágenes, rellenos negros o blancos, líneas de 0,7 pt o menos y menos de 1 MB (criterios 9 y 13)', async ({ page }) => {
  test.setTimeout(300_000)
  await openTemplate(page, 'loft')
  const dialog = await openExportFromMore(page)
  const levels = (await hook(page, 'planMeasure')).filter((level) => !level.empty)
  await downloadPdf(page, dialog, 'test-results/loft-papel.pdf')
  for (let number = 1; number <= levels.length; number++) {
    const stats = await pageStats('test-results/loft-papel.pdf', number)
    expect(stats.images, `página ${number}: imágenes`).toBe(0)
    for (const color of stats.fillColors) expect(BLACK_OR_WHITE.has(color), `página ${number}: relleno ${color}`).toBe(true)
    for (const color of stats.strokeColors) expect(BLACK_OR_WHITE.has(color), `página ${number}: trazo ${color}`).toBe(true)
    expect(stats.maxStrokePt, `página ${number}: línea más gruesa`).toBeLessThanOrEqual(0.7 + 0.01)
  }
  const raster = await rasterize('test-results/loft-papel.pdf', 1, 4)
  expect(isGray(raster)).toBe(true)
  expect(statSync('test-results/loft-papel.pdf').size).toBeLessThan(1_000_000)
})

test('Color: ambientes con color, muebles con su proyección, leyenda de ambientes y pisos, y menos de 5 MB (criterio 10)', async ({ page }) => {
  test.setTimeout(300_000)
  await openTemplate(page, 'loft')
  const dialog = await openExportFromMore(page)
  await choose(dialog, /^Color$/)
  await downloadPdf(page, dialog, 'test-results/loft-color.pdf')
  const stats = await pageStats('test-results/loft-color.pdf', 1)
  expect(stats.images).toBeGreaterThan(0)
  const raster = await rasterize('test-results/loft-color.pdf', 1, 4)
  expect(countColored(raster)).toBeGreaterThan(3000)
  const [first] = await readPdf(new Uint8Array(readFileSync('test-results/loft-color.pdf')))
  const text = first?.items.map((item) => item.str).join('') ?? ''
  expect(text).toContain('Leyenda')
  expect(text).toContain('Piso:')
  const zones = await hook(page, 'nodesOf', 'zone')
  expect(zones.some((zone) => text.includes(zoneDisplayName(String(zone.name))))).toBe(true)
  expect(statSync('test-results/loft-color.pdf').size).toBeLessThan(5_000_000)
})
```

- [ ] **Paso 3: Correr**

Run: `pnpm --filter @interiores/web e2e e2e/exportar-plano-papel-color.spec.ts`
Expected: 2 pruebas en verde. Si una falla:
- `pageStats` devuelve `images: 0` en Color con el Loft (que sí tiene muebles): la operación de imagen se llama distinto en tu `pdfjs`; imprime `Object.keys(OPS).filter((k) => /image/i.test(k))` y agrégala a `imageOps`.
- "Papel … rellenos" ve `'0,0,0'` y un color raro como `'85,85,85'` en `fillColors`: algo dibujó un camino relleno en gris (la leyenda en Papel no debe existir; el texto no cuenta). Mira qué página y busca con `rasterize(...).save('test-results/papel.png')`.
- El PDF de Papel pesa más de 1 MB: mira cuántas páginas tiene y si trae imágenes (no debería).

- [ ] **Paso 4: Tipos, lint y commit**

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

```bash
git add apps/web/e2e/support/pdf.ts apps/web/e2e/exportar-plano-papel-color.spec.ts
git commit -m "test(plano): el PDF real en Papel (grises, sin imágenes, líneas finas) y en Color (ambientes, muebles, leyenda)" -- apps/web/e2e/support/pdf.ts apps/web/e2e/exportar-plano-papel-color.spec.ts
```

---

### Task 20b: E2E del contenido del PDF (2 de 2): escala real, muebles sin imagen, carga perezosa y castellano

**Files:**
- Create: `apps/web/e2e/exportar-plano-pdf.spec.ts`
- Modify: `apps/web/e2e/castellano.spec.ts`

**Interfaces:**
- Consumes: `e2e/support/pdf.ts` y `e2e/support/export.ts` (Tareas 20a y 19); `layoutBand`, `sheetFor` (Tareas 1 y 6).
- Produces: nada nuevo (solo pruebas).

**Cubre los criterios 6, 12, 13 y 17 sobre el PDF real** y el caso 5 de Review Focus (muebles sin imagen): un muro de 5 m mide 100 mm y la barra de 2 m mide 40 mm a 1:50 con el muro horizontal (norte arriba); con la imagen de los muebles bloqueada el PDF de Color sale igual y avisa cuántos faltaron; en Papel la generación no pide ninguna imagen; `pdfkit` y `pdfjs-dist` solo se cargan al usarlos; y el barrido de castellano lee también el diálogo.

- [ ] **Paso 1: Escribir las pruebas en navegador**

Create `apps/web/e2e/exportar-plano-pdf.spec.ts`:

```ts
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { sheetFor } from '../src/lib/export/sheet'
import { layoutBand } from '../src/lib/export/title-block'
import { readPdf } from '../test/support/pdf-read'
import { choose, downloadPdf, openExportFromMore, openTemplate } from './support/export'
import { hook } from './support/hooks'
import { darkSpanMm, pageStats, rasterize, wallRunMm } from './support/pdf'
import { createBlankProject } from './support/projects'
import { dock } from './support/shell'

test('escala real y norte arriba: un muro de 5 m mide 100 mm, la barra de 2 m mide 40 mm y el muro sale horizontal (criterios 6 y 17)', async ({ page }) => {
  test.setTimeout(240_000)
  await createBlankProject(page, 'plano escala')
  await expect(dock(page)).toBeVisible({ timeout: 30_000 })
  await hook(page, 'addWallOf', 5)
  const dialog = await openExportFromMore(page)
  await choose(dialog, '1:50')
  await expect(dialog.getByRole('radio', { name: '1:50', exact: true })).toBeChecked()
  await downloadPdf(page, dialog, 'test-results/muro-5m.pdf')
  const sheet = sheetFor('A4', 'landscape')
  const raster = await rasterize('test-results/muro-5m.pdf', 1, 4)
  const wall = wallRunMm(raster, { x0: 10, x1: sheet.widthMm - 10, y0: 10, y1: sheet.heightMm - 10 - sheet.bandMm })
  expect(Math.abs(wall - 100), `el muro mide ${wall} mm`).toBeLessThanOrEqual(1)
  const { scaleBar } = layoutBand(sheet)
  const bar = darkSpanMm(raster, scaleBar.y + 7.5, scaleBar.x, scaleBar.x + scaleBar.width)
  expect(Math.abs(bar - 40), `la barra mide ${bar} mm`).toBeLessThanOrEqual(0.5)
  const [first] = await readPdf(new Uint8Array(readFileSync('test-results/muro-5m.pdf')))
  expect(first?.items.some((item) => item.str === 'N')).toBe(true)
})

test('Review Focus 5: con la imagen de los muebles bloqueada el PDF de Color sale igual y avisa cuántos faltaron', async ({ page }) => {
  test.setTimeout(300_000)
  await page.route('**/floor-plan.png', (route) => route.abort())
  await openTemplate(page, 'loft')
  const dialog = await openExportFromMore(page)
  await choose(dialog, /^Color$/)
  await downloadPdf(page, dialog, 'test-results/loft-sin-imagenes.pdf')
  await expect(dialog.getByRole('status').filter({ hasText: /No se pudo(?:ieron)? dibujar \d* ?muebles?/ })).toBeVisible()
  await expect(dialog.getByText('el resto del plano sí está en el PDF.')).toBeVisible()
  const pages = await readPdf(new Uint8Array(readFileSync('test-results/loft-sin-imagenes.pdf')))
  expect(pages.length).toBeGreaterThanOrEqual(1)
  expect((await pageStats('test-results/loft-sin-imagenes.pdf', 1)).images).toBe(0)
})

test('Review Focus 5: en Papel la generación no pide ninguna imagen de mueble', async ({ page }) => {
  test.setTimeout(300_000)
  await openTemplate(page, 'loft')
  const dialog = await openExportFromMore(page)
  await expect(dialog.getByRole('img', { name: /Vista previa de la hoja del plano/ })).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(1500)
  let requests = 0
  page.on('request', (request) => {
    if (request.url().includes('floor-plan.png')) requests += 1
  })
  await downloadPdf(page, dialog, 'test-results/loft-papel-imagenes.pdf')
  expect(requests).toBe(0)
})

test('el generador y el visor del PDF se cargan solo al usarlos (criterio 13)', async ({ page }) => {
  test.setTimeout(300_000)
  const heavy: string[] = []
  page.on('response', async (response) => {
    if (response.request().resourceType() !== 'script') return
    const body = await response.text().catch(() => '')
    if (/PDFNameTree|PDFReference|GlobalWorkerOptions/.test(body)) heavy.push(response.url())
  })
  await openTemplate(page, 'loft')
  expect(heavy, 'antes de abrir el diálogo no debe haber trozos de pdfkit ni de pdfjs').toEqual([])
  const dialog = await openExportFromMore(page)
  await expect(dialog.getByRole('img', { name: /Vista previa de la hoja del plano/ })).toBeVisible({ timeout: 60_000 })
  await downloadPdf(page, dialog, 'test-results/loft-perezosa.pdf')
  expect(heavy.length, 'después de usarlo sí se cargan').toBeGreaterThan(0)
})
```

Modify `apps/web/e2e/castellano.spec.ts` (el barrido de inglés también lee el diálogo "Exportar plano"):

```diff
 import { createBlankProject } from './support/projects'
+import { openExportFromMore } from './support/export'
 import { dock, dockButton, modeButton } from './support/shell'
```

```diff
+  // El diálogo "Exportar plano" también va en castellano: el barrido lee su texto y sus etiquetas (está dentro del shell).
+  const exportDialog = await openExportFromMore(page)
+  await expectSpanish(page, 'el diálogo Exportar plano')
+  await page.keyboard.press('Escape')
+  await expect(exportDialog).toBeHidden()
+
   await modeButton(page, 'Ver').click()
```

- [ ] **Paso 2: Correr**

Run: `pnpm --filter @interiores/web e2e e2e/exportar-plano-pdf.spec.ts e2e/castellano.spec.ts`
Expected: 4 + 1 pruebas en verde. Si una falla:
- "escala real" da el muro en 101,5 mm o más: el polígono del muro de Pascal incluye algo más que los 5 m (por ejemplo medio grosor en cada extremo, 0,05 m = 1 mm cada lado a 1:50). **No se afloja el criterio a ciegas:** mide `wallRunMm` contra la geometría real (`hook(page, 'nodesOf', 'wall')` da `start`, `end` y `thickness`) y anota la desviación explicada en la tabla de la Tarea 0; si es el grosor, el criterio 6 del spec se reescribe como "la longitud del muro más su grosor".
- "carga perezosa": si `heavy` ya trae un trozo antes de abrir el diálogo, vuelve a la rama de respaldo M9 de la Tarea 0.
- La prueba de `castellano.spec.ts` solo cambia el final; si se queja de una palabra de la lista inglesa en el diálogo, es un texto sin traducir: arréglalo en `texts-es.ts`.

- [ ] **Paso 3: Tipos, lint y commit**

Run: `pnpm --filter @interiores/web typecheck && pnpm lint`
Expected: `Tipos OK …` y Biome sin errores nuevos.

```bash
git add apps/web/e2e/exportar-plano-pdf.spec.ts apps/web/e2e/castellano.spec.ts
git commit -m "test(plano): escala medida en el PDF, muebles sin imagen, carga perezosa y castellano del diálogo" -- apps/web/e2e/exportar-plano-pdf.spec.ts apps/web/e2e/castellano.spec.ts
```

---

## Diseño, documentación y cierre (Tareas 21 a 23)

### Task 21: Corregir la lámina 24 (352 mm) y quitar las escalas que ya no existen

**Files:**
- Modify: `docs/design/24-exportar-plano-a4-escritorio.png`, `docs/design/19-exportar-plano-a3-escritorio.png` (re-exportados desde Pencil); `docs/design/README.md` (los pies de las láminas 19 y 24)
- No versionado: `design/interiores.pen` (local, ignorado por git; solo lo edita Pencil)

**Interfaces:**
- Consumes: la regla de cabida de la Tarea 2 (el número que debe decir la lámina 24).
- Produces: las dos láminas con la escala de tres opciones (1:25, 1:50, 1:100) y el número corregido.

**Qué está mal hoy** [verificado leyendo las dos imágenes]: la lámina 24 dice "1:25 no cabe en A4 (**382 mm** de 277 mm)" y la regla da `(7,8 + 1) × 1000 / 25 = 352 mm`; y las dos láminas muestran una cuarta escala, **1:200**, que Silvert descartó (solo 1:25, 1:50 y 1:100).

Este paso es manual en Pencil (no hay prueba automática). Sigue las reglas del proyecto para Pencil: no tocar documentos ajenos, exportar a escala 0,5 a 0,6 y mirar solo las pantallas que cambiaron.

- [ ] **Paso 1: Abrir el documento y ubicar los textos**

Con las herramientas de Pencil: llama a `mcp__pencil__get_app_state({ include_schema: true, include_canvas_design: true, include_scripts_and_shaders: false })` para ver el documento abierto (debe ser `design/interiores.pen`; si no, ábrelo en la aplicación Pencil) y `mcp__pencil__get_guidelines` para el lenguaje de `execute`. Con `mcp__pencil__execute`, busca en las láminas "19 · Exportar plano A3" y "24 · Exportar plano A4":
- el texto que contiene `382 mm` (lámina 24);
- el chip `1:200` (las dos láminas) y, si existe, `1:500`.

Verifica con `Get` (estructura y límites) antes de pedir imagen.

- [ ] **Paso 2: Corregir**

En la lámina 24 cambia `382 mm` por `352 mm` (el texto queda "1:25 no cabe en A4 (352 mm de 277 mm) · mejor ajuste: 1:50"). En las dos láminas borra el chip `1:200` y vuelve a repartir los tres chips que quedan con el mismo espacio entre ellos. No toques nada más.

- [ ] **Paso 3: Exportar y comparar**

Exporta solo esas dos láminas con `scale: 0.5` a `docs/design/24-exportar-plano-a4-escritorio.png` y `docs/design/19-exportar-plano-a3-escritorio.png` (los archivos actuales miden 720 × 450: la salida tiene que medir lo mismo; si sale distinta, ajusta el `scale`).

Run: `file docs/design/19-exportar-plano-a3-escritorio.png docs/design/24-exportar-plano-a4-escritorio.png`
Expected: `PNG image data, 720 x 450` las dos.

Mira las dos imágenes (herramienta de lectura de imágenes): la 24 dice 352 mm, ninguna muestra 1:200 y los chips quedan alineados.

- [ ] **Paso 4: Anotar y commit**

Modify `docs/design/README.md` (los pies de las dos filas):

```diff
-| [19-exportar-plano-a3-escritorio.png](19-exportar-plano-a3-escritorio.png) | Exportar plano · A3 (1:25 cabe) |
+| [19-exportar-plano-a3-escritorio.png](19-exportar-plano-a3-escritorio.png) | Exportar plano · A3 (1:25 cabe; escalas 1:25, 1:50 y 1:100) |
```

```diff
-| [24-exportar-plano-a4-escritorio.png](24-exportar-plano-a4-escritorio.png) | Exportar plano · A4 (1:25 no cabe, 1:50 sí) |
+| [24-exportar-plano-a4-escritorio.png](24-exportar-plano-a4-escritorio.png) | Exportar plano · A4 (1:25 no cabe: 352 mm de 277 mm; 1:50 sí) |
```

```bash
git add docs/design/24-exportar-plano-a4-escritorio.png docs/design/19-exportar-plano-a3-escritorio.png docs/design/README.md
git commit -m "docs(diseño): láminas 19 y 24 de exportar plano con 352 mm y solo las escalas 1:25, 1:50 y 1:100" -- docs/design/24-exportar-plano-a4-escritorio.png docs/design/19-exportar-plano-a3-escritorio.png docs/design/README.md
```

---

### Task 22: Capturas de lo implementado, comparadas con las láminas

**Files:**
- Create: `apps/web/e2e/capture-export-plan.spec.ts`, `docs/design/implementado/exportar-plano-a4-papel.png`, `…/exportar-plano-a3-color.png`, `…/exportar-plano-loft-planta-2.png`, `…/exportar-plano-supermercado.png`, `…/exportar-plano-dialogo.png` (los generan las pruebas de captura)

**Interfaces:**
- Consumes: `rasterize(...).save(...)` (Tarea 20a); `e2e/support/export.ts` (Tarea 19).
- Produces: las cinco capturas y el visto bueno visual de la sección "Visual" del spec: **ninguna cota, etiqueta o mueble sale del marco ni pisa el cajetín**, en el Loft y en el Supermercado.

Estas capturas no son pruebas de aceptación automática (se miran): sirven para comparar a ojo con las láminas 19 y 24 y para dejar constancia en `docs/design/implementado/`.

- [ ] **Paso 1: Escribir el capturador**

Create `apps/web/e2e/capture-export-plan.spec.ts`:

```ts
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { choose, downloadPdf, exportDialog, openExportFromMore, openTemplate } from './support/export'
import { rasterize } from './support/pdf'

const OUT = resolve(process.cwd(), '../../docs/design/implementado')
const PX_PER_MM = 100 / 25.4

/** Capturas de lo implementado (`pnpm --filter @interiores/web e2e e2e/capture-export-plan.spec.ts`); no son pruebas de aceptación. */
test('capturas de Exportar plano: diálogo, A4 Papel, A3 Color, segunda planta del Loft y Supermercado', async ({ page }) => {
  test.setTimeout(600_000)
  mkdirSync(OUT, { recursive: true })

  await openTemplate(page, 'loft', 'captura plano')
  let dialog = await openExportFromMore(page)
  await exportDialog(page).getByRole('img', { name: /Vista previa de la hoja del plano/ }).waitFor({ timeout: 60_000 })
  await page.waitForTimeout(1500)
  await dialog.screenshot({ path: `${OUT}/exportar-plano-dialogo.png` })

  await downloadPdf(page, dialog, 'test-results/captura-loft-a4-papel.pdf')
  ;(await rasterize('test-results/captura-loft-a4-papel.pdf', 1, PX_PER_MM)).save(`${OUT}/exportar-plano-a4-papel.png`)
  ;(await rasterize('test-results/captura-loft-a4-papel.pdf', 2, PX_PER_MM)).save(`${OUT}/exportar-plano-loft-planta-2.png`)

  await choose(dialog, /^A3$/)
  await choose(dialog, /^Color$/)
  await downloadPdf(page, dialog, 'test-results/captura-loft-a3-color.pdf')
  ;(await rasterize('test-results/captura-loft-a3-color.pdf', 1, PX_PER_MM)).save(`${OUT}/exportar-plano-a3-color.png`)
  await page.keyboard.press('Escape')

  await openTemplate(page, 'supermercado', 'captura plano comercio')
  dialog = await openExportFromMore(page)
  await choose(dialog, /^A3$/)
  await choose(dialog, /^Color$/)
  await downloadPdf(page, dialog, 'test-results/captura-supermercado-a3-color.pdf')
  ;(await rasterize('test-results/captura-supermercado-a3-color.pdf', 1, PX_PER_MM)).save(`${OUT}/exportar-plano-supermercado.png`)
})
```

- [ ] **Paso 2: Generar**

Run: `pnpm --filter @interiores/web e2e e2e/capture-export-plan.spec.ts`
Expected: 1 prueba en verde y cinco archivos nuevos en `docs/design/implementado/`.

- [ ] **Paso 3: Mirar y decidir**

Mira (herramienta de lectura de imágenes; una por vez, solo las que cambiaron) las cinco capturas y compara con las láminas 19 y 24. Marca cada punto:

| Punto | A4 Papel | A3 Color | Loft planta 2 | Supermercado |
|---|---|---|---|---|
| Ninguna cota, etiqueta o mueble sale del marco ni pisa el cajetín | | | | |
| El norte y la escala gráfica se leen y la barra mide lo que dice | | | | |
| Papel: muros negros, sin colores, sin muebles dibujados con imagen | n/c | | | |
| Color: ambientes y pisos se distinguen y la leyenda coincide con lo dibujado | n/c | | | |
| El logotipo se ve completo (letras y ventana con el sol) | | | | |
| El texto del cajetín está en castellano y no se corta mal | | | | |

Si un punto falla por las cotas (se salen del 1 m de margen): sube `DIM_MARGIN_M` a 2 en `fit.ts` (el riesgo "Las cotas de Pascal pueden salirse" del spec), actualiza los números de `export-fit.test.ts` que dependen de él y vuelve a generar. Si falla por las etiquetas de los ambientes (se pisan con los muebles), anótalo en `docs/ESTADO.md` como pendiente visual: no se resuelve con código en este plan.

- [ ] **Paso 4: Commit**

```bash
git add apps/web/e2e/capture-export-plan.spec.ts docs/design/implementado/exportar-plano-a4-papel.png docs/design/implementado/exportar-plano-a3-color.png docs/design/implementado/exportar-plano-loft-planta-2.png docs/design/implementado/exportar-plano-supermercado.png docs/design/implementado/exportar-plano-dialogo.png
git commit -m "docs(diseño): capturas de exportar plano (A4 Papel, A3 Color, Loft y Supermercado) y revisión visual" -- apps/web/e2e/capture-export-plan.spec.ts docs/design/implementado/exportar-plano-a4-papel.png docs/design/implementado/exportar-plano-a3-color.png docs/design/implementado/exportar-plano-loft-planta-2.png docs/design/implementado/exportar-plano-supermercado.png docs/design/implementado/exportar-plano-dialogo.png
```

---

### Task 23: Documentación (ESTADO, `apps/web/CLAUDE.md`, notas de Pascal y marca) y verificación final

**Files:**
- Create: `apps/web/test/export-lazy-imports.test.ts`
- Modify: `docs/ESTADO.md`, `apps/web/CLAUDE.md`, `docs/pascal-notes.md`, `docs/nombre-y-marca.md`, `docs/README.md` (solo si hace falta), `docs/superpowers/plans/2026-10-12-exportar-plano.md` (casillas y tabla de la Tarea 0)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: las guardas que impiden que `pdfkit` y `pdfjs-dist` entren al paquete inicial y que `src/lib/export/` deje de ser puro (criterios 13 y 16); la documentación al día (regla del proyecto: cada decisión nueva se anota en `docs/ESTADO.md` el mismo día y los demás documentos no se duplican) y la verificación final con salida real.

- [ ] **Paso 1: `docs/ESTADO.md`**

Modify `docs/ESTADO.md` (fila de decisiones: reemplaza la fila entera que empieza con `| Exportar plano |`):

```diff
-| Exportar plano | La escala disponible **depende de la hoja y del tamaño del proyecto**: el diálogo muestra la vista previa de la hoja, deshabilita las escalas que no caben (p. ej. 1:25 no cabe en A4 pero sí en A3), sugiere el *mejor ajuste* e indica cuánto del ancho usa. Regla [inferencia, a validar con el PDF real]: cabe si (tamaño real + 1 m de cotas) ÷ escala ≤ hoja − 10 mm de margen − 36 mm de cajetín. | capturas 19 y 24 |
+| Exportar plano | **Un PDF con todas las plantas, una hoja A4 o A3 por planta, norte arriba, escala 1:25, 1:50 o 1:100** (una sola para todo el PDF), cajetín con el logotipo vectorial de Madori, norte y escala gráfica siempre visibles, y dos modos: **Papel** (blanco y negro, muros rellenos de negro, sin imágenes, líneas de 0,7 pt o menos) y **Color** (ambientes al 35 %, piso con el color de su material, muebles con su proyección cenital y leyenda con "y N más"). El diálogo muestra la hoja real (`pdfjs-dist`), deshabilita las escalas que no caben y sugiere la mayor. Cabe si (tamaño real + 1 m de cotas) × 1000 ÷ escala ≤ hoja − 10 mm de margen por lado − 36 mm de cajetín [verificado con el PDF real en `e2e/exportar-plano-pdf.spec.ts`]. Fecha en letras, autor = nombre de la cuenta (el correo si no tiene). Parche de Pascal `measureFloorplanLevels` y `exportFloorplanPages`; DM Sans (OFL) incrustada. | [spec 4](superpowers/specs/2026-10-12-exportar-plano-design.md), [plan](superpowers/plans/2026-10-12-exportar-plano.md), capturas 19 y 24 |
```

Modify `docs/ESTADO.md` (item 2e de "Pendiente": sale "Exportar plano a PDF"): en la línea que empieza con `2e.`, reemplaza el fragmento `flujo de Renderizar con marcadores de notas y de cámara; Exportar plano a PDF; Subir mi mueble` por `flujo de Renderizar con marcadores de notas y de cámara; Subir mi mueble`.

Modify `docs/ESTADO.md` (sección nueva antes de "Elementos paramétricos, vistas y plantas"):

```diff
+## Exportar plano en PDF (2026-10-12, rama `feature/editor-shell`)
+- **Hecho** según el [plan](superpowers/plans/2026-10-12-exportar-plano.md): "Exportar plano" activo en Más (Editar) y en Ver; diálogo accesible (`<dialog>`, grupos de opciones, vista previa real, progreso, Esc cancela, un solo vuelo); PDF A4/A3 con cajetín, logotipo vectorial (`scripts/build-brand-paths.ts`), DM Sans incrustada (`public/fonts/pdf/`, OFL), norte y escala gráfica; Papel y Color; leyenda con "y N más"; nombre de archivo seguro (`<proyecto>-planos.pdf`); `pdfkit` y `pdfjs-dist` solo con `import()`. Código puro en `src/lib/export/`, enlace con Pascal en `src/editor/export/` y el parche `patches/@pascal-app__editor@1.0.3.patch` (`scripts/pascal-plan-patch.mjs`).
+- **Medido en la Tarea 0** (tabla del plan): M1 a M10 con su fecha y la rama de respaldo que se usó si hizo falta (`src/lib/export/decisions.ts`).
+- **Decisiones de Silvert (2026-10-12):** muros en Papel con relleno negro; leyenda que no entra = línea "y N más" dentro del cajetín; logotipo todo negro en Papel; norte y escala gráfica siempre visibles, incluso sin cajetín; escalas solo 1:25, 1:50 y 1:100; fecha en letras; autor = nombre de la cuenta (el correo si no tiene).
+- **Pendiente:** exportar desde móvil y tablet; tablas de aberturas y ambientes; cielorraso y cortes; compartir el PDF. Las cotas de Pascal se dibujan con 0,5 pt fijos (cumple el tope de 0,7 pt).
+
 ## Elementos paramétricos, vistas y plantas (2026-10-12, rama `feature/editor-shell`)
```

También actualiza la fecha de "Última actualización" si cambió el día.

- [ ] **Paso 2: `apps/web/CLAUDE.md`**

Modify `apps/web/CLAUDE.md` (agrega una viñeta al final de la lista, después de **Acceso**):

```diff
+- **Exportar plano** (2026-10-12; spec 4 y plan `docs/superpowers/plans/2026-10-12-exportar-plano.md`): todo lo que no es dibujo de Pascal es **código puro** en `src/lib/export/` (hojas, cabida, estilo Papel/Color, cajetín, leyenda, nombre de archivo; sin Pascal ni DOM, con pruebas `export-*.test.ts`). `src/editor/export/` enchufa `pdfkit` y el parche de Pascal (`measureFloorplanLevels`, `exportFloorplanPages`; `pascal-plan.ts` es el único enlace real) y `bridge.plan` es lo único que el diálogo (`shell/ExportPlanDialog.tsx`) sabe de Pascal. **`pdfkit` y `pdfjs-dist` solo con `import()`** (`export-lazy-imports.test.ts` lo vigila; `scripts/initial-js.mjs` mide el JS inicial tras un `build`). Escalas 1:25, 1:50 y 1:100; la regla de cabida es `fit.ts` (no la repitas en la interfaz). El logotipo vectorial se regenera con `pnpm --filter @interiores/web brand:build` y la DM Sans del PDF con `fonts:pdf`; el trabajador de `pdfjs` se copia solo a `public/` (`predev`, `prebuild`, `postinstall`). Lo que midió la Tarea 0 vive en `src/lib/export/decisions.ts`. Si Pascal sube de versión, hay que regenerar el parche con `scripts/pascal-plan-patch.mjs` (falla si un ancla cambió).
```

- [ ] **Paso 3: `docs/pascal-notes.md` y `docs/nombre-y-marca.md`**

Modify `docs/pascal-notes.md` (agrega al final):

```markdown

### Exportar plano: el parche y lo que se verificó (2026-10-12)

| Qué | Dónde se verificó | Nota |
|---|---|---|
| `exportFloorplanPages(opciones)` y `measureFloorplanLevels()` (parche de Madori, exportadas de `@pascal-app/editor`): una página por planta, escala fija en puntos por metro, giro 0 (norte arriba, `FLOOR_PLAN_VIEW_ROTATION_DEG = 0`), unidades en metros, tipo de plano `floor-plan`, recorte al área útil y `Blob` sin descargar nada | `editor/src/lib/floorplan/floorplan-export.tsx` (`exportFloorplanPdf` es el modelo), `index.tsx` | Opciones: `levels`, `page`, `scale`, `mapGeometry(node, geometry)`, `extraGeometry(levelId)`, `wrapRaw`, `setup`, `pageChrome`, `onProgress`, `signal`. El orden de las plantas lo da `resolveExportLevels` (de la más baja a la más alta, sin las de techo). |
| `createFloorplanPdfDocument(tamaño, wrapRaw?)` devuelve además `raw` y `finish()` (cierra y da el `Blob`); `renderFloorplanGeometryToPdfKit` acepta `onImageError` y `signal` | `floorplan-pdfkit-document.ts`, `floorplan-pdfkit-renderer.ts` | Una imagen que no carga (`drawImage` lanza) ya no tumba el PDF: `skippedImages` las cuenta. La señal corta en la siguiente imagen. |
| El renderizador de Pascal fija colores propios (`#334155`, `#111827`, `#ffffff`) y el ancho de las cotas (0,5 pt) | `floorplan-pdfkit-renderer.ts` | Para Papel, `withColorFilter` (`Proxy` sobre el documento de `pdfkit`) los convierte en negro o blanco; los anchos de los trazos de la geometría salen de `plan-style.ts` (en puntos si el trazo no escala con el plano, en metros si escala). |
| Los muros se dibujan con `#374151` y las losas con `#cbd5e1` fijos; solo los ambientes llevan color propio (`node.color`); los materiales no se pintan en el plano | `nodes/dist/{wall,slab,zone}/floorplan.js` | Color: el piso toma `previewColor` del material o un gris por categoría (`plan-colors.ts`). |
| `getCatalogMaterialById(id)` y `MATERIAL_CATALOG` salen de `@pascal-app/core`; un material de la losa va como `library:<id>` | `core/dist/index.d.ts`, `material-library.d.ts` | Los nombres se traducen con `materialNameEs`. |
| `pdfkit` 0.19.1 se carga con `import('pdfkit/js/pdfkit.standalone')` solo al exportar (571 KB comprimido, incluye `fontkit`) | `floorplan-pdfkit-document.ts` | Marcas del trozo: `PDFNameTree`, `PDFReference`; `scripts/initial-js.mjs` comprueba que no esté en el JS inicial. |
```

Modify `docs/nombre-y-marca.md` (en "Entregables en `docs/design/marca/`", agrega una nota debajo de la tabla):

```markdown

**Logotipo vectorial para el PDF** (2026-10-12): `apps/web/public/brand/madori-logotipo.svg` y `apps/web/src/lib/export/brand-paths.ts` son las letras de Madori en Fraunces 700 (SOFT 100, tamaño óptico 144) convertidas a contornos con `pnpm --filter @interiores/web brand:build`, con la "o" reservada para la ventana (`WINDOW` de `brand.ts`) en una caja de 0,5 × 0,479 em medida contra la "o" real. En Papel va todo negro y el sol como círculo sin relleno; en Color, Noche y Sol. El PDF no incrusta Fraunces.
```

- [ ] **Paso 4: Guardas de carga y de pureza (criterios 13 y 16)**

Create `apps/web/test/export-lazy-imports.test.ts`:

```ts
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const STATIC_IMPORT = "from[[:space:]]*['\"](pdfkit|pdfjs-dist)|^[[:space:]]*import[[:space:]]+['\"](pdfkit|pdfjs-dist)"
const exportDir = fileURLToPath(new URL('../src/lib/export/', import.meta.url))

describe('lo pesado se carga solo al usarlo (criterio 13)', () => {
  it('ningún archivo del producto importa pdfkit ni pdfjs-dist de forma estática', () => {
    let out = ''
    try {
      out = execFileSync('git', ['grep', '-n', '-E', '--untracked', STATIC_IMPORT, '--', 'apps/web/src', 'apps/web/app'], { encoding: 'utf8' })
    } catch (error) {
      // git grep sale con 1 cuando no hay coincidencias
      if ((error as { status?: number }).status !== 1) throw error
    }
    expect(out.trim()).toBe('')
  })

  it('la vista previa carga pdfjs-dist con import() dentro de una función', () => {
    const source = readFileSync(fileURLToPath(new URL('../src/editor/shell/ui/render-pdf-page.ts', import.meta.url)), 'utf8')
    expect(source).toMatch(/await import\('pdfjs-dist'\)/)
  })
})

describe('apps/web/src/lib/export es puro (criterio 16)', () => {
  const files = readdirSync(exportDir).filter((file) => file.endsWith('.ts'))

  it('hay archivos que revisar', () => {
    expect(files.length).toBeGreaterThan(15)
  })

  it('ningún archivo importa Pascal, three, R3F, pdfkit, pdfjs-dist ni React, ni toca el DOM', () => {
    for (const file of files) {
      const source = readFileSync(`${exportDir}${file}`, 'utf8')
      expect(source, file).not.toMatch(/from\s+['"](@pascal-app\/|three|@react-three\/|pdfkit|pdfjs-dist|react)/)
      expect(source, file).not.toMatch(/\b(document|window|navigator)\./)
    }
  })
})
```

Run: `pnpm --filter @interiores/web exec vitest run export-lazy-imports`
Expected: PASS (4 pruebas). Son guardas: pasan desde que existen; si alguien agrega un `import` estático de `pdfkit` o `pdfjs-dist`, o un `document.` en `src/lib/export/`, fallan con el archivo y la línea.

- [ ] **Paso 5: Verificación final con salida real**

Usa la skill `verificar-cambio` del proyecto (obliga a correr `pnpm verify` y pegar la salida real). Los comandos:

Run: `pnpm verify`
Expected: lint, `build`, tipos y pruebas en verde (todas las `export-*.test.ts` y `shell-*`). Pega la salida real en la respuesta final.

Run: `pnpm --filter @interiores/web build && pnpm --filter @interiores/web exec node scripts/initial-js.mjs "/proyectos/[id]"`
Expected: `PDF_EN_EL_INICIAL=ninguno` y `gzip_kb` **no mayor que la línea base de la Tarea 0d más 40 KB** (el diálogo, el modelo y los textos son nuestro código; las bibliotecas siguen fuera). Anota los dos números en la tabla de la Tarea 0 (M9).

Run: `pnpm --filter @interiores/web e2e`
Expected: todas las pruebas en verde, incluidas `exportar-plano.spec.ts`, `exportar-plano-pdf.spec.ts`, `castellano.spec.ts`, `dock.spec.ts`, `vista.spec.ts` y `plano-recto.spec.ts`.

Run: `git status --short && git log --oneline -30`
Expected: sin archivos sueltos de `test-results/`; los commits de las Tareas 0a a 23 con mensajes `tipo(área): descripción` y sin líneas de atribución.

- [ ] **Paso 6: Marcar el plan y commit**

Marca las casillas hechas y completa la tabla de la Tarea 0 con lo medido; agrega al final del plan la sección "Revisión final" (fecha, `pnpm verify` y e2e en verde, líneas base). Después:

```bash
git add apps/web/test/export-lazy-imports.test.ts docs/ESTADO.md apps/web/CLAUDE.md docs/pascal-notes.md docs/nombre-y-marca.md docs/superpowers/plans/2026-10-12-exportar-plano.md
git commit -m "docs(plano): estado, notas de Pascal, marca, guardas de carga y guía de apps/web para exportar plano" -- apps/web/test/export-lazy-imports.test.ts docs/ESTADO.md apps/web/CLAUDE.md docs/pascal-notes.md docs/nombre-y-marca.md docs/superpowers/plans/2026-10-12-exportar-plano.md
```

---

## Autorrevisión del plan

### Cobertura de los 17 criterios (criterio → tarea)

| Criterio | Qué pide | Tareas |
|---|---|---|
| 1 | `pnpm verify` y el e2e en verde desde un clon limpio (el parche se aplica con `pnpm install`) | **0a** (parche y `install --frozen-lockfile`), **23** (`pnpm verify`, e2e, `git status`) |
| 2 | "Exportar plano" habilitado en Más y en Ver; Compartir y Renderizar siguen en "Pronto"; criterio 11 del spec 3 actualizado | **18a** (botones y pruebas), **18b** (diálogo montado y spec 3), **19** (e2e) |
| 3 | Archivo `<proyecto>-planos.pdf` seguro, de 80 caracteres o menos y nunca vacío | **3** (`file-name`), **17** (`downloadBlob(exportFileName(...))`), **19** (descarga real) |
| 4 | Una página por planta marcada, de la más baja a la más alta, con "Hoja N de M" | **12c** (numeración en `build-plan`), **14b** (orden y marcado), **19** |
| 5 | Tamaño de hoja A4/A3 con tolerancia de 0,5 pt | **1** (`sheet`), **11** (pdfjs sobre `pdfkit`), **19** |
| 6 | Barra de 2 m = 40,0 mm ± 0,5; muro de 5 m = 100 mm ± 1 | **4** (`scale-bar`), **10a** (suma de tramos), **20b** (medido sobre el PDF) |
| 7 | Cabida: 7,8 × 3,8 m, 64 % en A4 a 1:50 y 88 % en A3 a 1:25; escalas deshabilitadas con el mayor ajuste | **2** (`fit`), **14a** (modelo), **15a** (opciones), **19** (regla contra el proyecto real) |
| 8 | Vista previa real, actualizada en ≤ 2 s | **0b** (M4: tiempo), **0d** (M10: `pdfjs`), **16a** (ejecutor con espera), **16b** (hoja real), **17**, **19** (píxeles) |
| 9 | Papel: solo grises, sin imágenes, rellenos negro o blanco, líneas de 0,7 pt o menos | **0c** (filtro de colores), **5a** (`plan-style`), **11** (grises), **20a** (lista de operaciones y píxeles) |
| 10 | Color: ambientes, piso, muebles con proyección y leyenda | **5b**, **12a** (`plan-colors`), **12c** (leyenda en el PDF), **10a** (`draw-band`), **20a** |
| 11 | Cajetín: logotipo vectorial, proyecto, planta, escala, fecha, autor, hoja, norte y escala gráfica; 120 caracteres cortados con "…" | **6**, **9** (logotipo), **10b**, **10c**, **11**, **19**, **20b** |
| 12 | DM Sans incrustada, texto real, tildes y "ñ"; sin inglés de Pascal | **0c** (M8), **7a** (`texts-es`), **7b** (`font-coverage`), **8** (archivos y licencia), **11**, **20b** (`castellano.spec`) |
| 13 | Peso (menos de 1 MB Papel, menos de 5 MB Color); el paquete inicial no crece | **0d** (línea base y `initial-js.mjs`), **20a**, **20b** (carga perezosa), **23** (`export-lazy-imports` y `initial-js`) |
| 14 | Estados: progreso por planta, Esc cancela, un solo vuelo, errores en castellano, imagen caída no tumba | **0a** (`onImageError`, `signal`), **0b**, **14c**, **17**, **19**, **20b** |
| 15 | Accesibilidad: `<dialog>`, foco, grupos, `aria-describedby`, `role="status"`, texto alternativo, 44 px, movimiento reducido | **15a**, **15b**, **16b**, **17**, **19** |
| 16 | Frontera: `lib/export` sin Pascal, `three` ni R3F; solo `src/editor/` toca Pascal | **13** (`tests/boundaries`), **23** (`export-lazy-imports`: `lib/export` es puro) |
| 17 | Norte arriba: el plano exportado coincide con el de la pantalla (0°) | **0a** (giro 0), **20b** (el muro de 5 m sale horizontal y está la "N"), `plano-recto.spec.ts` sigue en verde (**23**) |

### Cobertura de las decisiones D1 a D13 y de las de Silvert

D1 y D3: **0a**. D2: **0c, 0d, 11**. D4 (muebles): **5a, 20a**. D5 (escalas, una sola): **2, 14a**. D6 (cabida): **2**. D7 (orientación): **2, 14a, 15a**. D8 (fuentes): **7b, 8, 11**. D9 (logotipo): **9, 10b**. D10 (vista previa): **16a, 16b, 17**. D11 (Papel y Color): **5a, 5b, 12b**. D12 (cajetín): **6, 10b, 10c**. D13 (una sola acción del puente): **13**. Silvert: muros negros (**5a**), "y N más" (**4, 10a**), logotipo negro en Papel (**10b**), norte y escala siempre (**6, 10c**), escalas 1:25, 1:50 y 1:100 (**1, 2**), fecha en letras (**3**), autor (**18b**).

### Revisión de coherencia

- **Tipos y nombres:** `Scale`, `PaperSize`, `Orientation`, `PlanMode`, `PlanLevel`, `LevelMeasure`, `PlanBuildArgs`, `PlanResult`, `PlanDeps` (Tarea 1) se usan con los mismos nombres en las Tareas 12b a 19. `Sheet`/`BoxMm` (1) → `layoutBand`/`layoutBlock` (6) → `drawSheet` (10c) → `build-plan` (12c). `PdfSurface` (10a) → `createPdfSurface` (11). `PagesOptions` de `build-plan` (12b) es la forma estructural de `FloorplanPagesOptions` del parche (0a): mismos campos (`levels`, `page`, `scale`, `mapGeometry`, `extraGeometry`, `wrapRaw`, `setup`, `pageChrome`, `onProgress`, `signal`). `onProgress` del parche es `(done, total)` y el de `PlanBuildArgs` es `{ done, total }`: `build-plan` los traduce (Tarea 12b).
- **Sin marcadores de pendiente:** las únicas casillas vacías son las de resultados de la Tarea 0 (se llenan al ejecutar), y los pasos que dependen de una medición traen su rama de respaldo escrita.
- **Tamaños:** las tareas de código miden entre 55 y 370 líneas de plan con su prueba y su código completos; ningún archivo de producto pasa de 300 líneas. La 0a (437) es la única que pasa de 400: el script del parche es un solo bloque.
- **Cosas que solo se confirman al ejecutar** (y por eso están en la Tarea 0 o en un paso "Si falla"): el nombre exacto de los archivos de `@fontsource` y de `pdfjs-dist/legacy`, que `pnpm patch` parta del paquete ya parchado, el nombre de la fuente en el `BaseFont` del PDF, el formato de `constructPath` en `getOperatorList`, y la medida exacta del polígono de un muro suelto.

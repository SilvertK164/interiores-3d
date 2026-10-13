# Bitácora de proceso

Registro de sorpresas, alucinaciones del agente y correcciones. Una línea por hecho, con fecha.

- 2026-10-11 — Se creyó que el catálogo de Pascal dependía de su bucket; el repo MIT trae 100 de los 111 modelos. Se verificó listando `apps/editor/public/items`.
- 2026-10-11 — Se creyó que `scene-migrations` se podía llamar desde `@pascal-app/core`; no se exporta. Se verificó en `core/dist/index.d.ts`.
- 2026-10-11 — `pnpm 11` aborta con `ERR_PNPM_IGNORED_BUILDS` si no se declara `allowBuilds` para `esbuild`.
- 2026-10-11 — La prueba en navegador (Playwright) encontró un error que ninguna prueba unitaria veía: `ProjectEditor` pasaba `onLoad={async () => ...}` inline; `<Editor>` recarga la escena cuando cambia la identidad de `onLoad`, así que cada cambio del estado de guardado borraba el muro recién dibujado. Corregido con `useCallback` + `useRef`.
- 2026-10-11 — El test de fronteras del plan buscaba la cadena `@pascal-app/` en cualquier parte; daba falso positivo con una ruta de texto en `catalog.test.ts`. Ahora busca solo imports reales.
- 2026-10-11 — Dos veces se insertaron saltos de línea literales en código dentro de cadenas por un error de escape al generar el plan; se detectó al extraer y ejecutar el código.
- 2026-10-11 — `cabinet` se perdió al autoalojar el catálogo porque se buscaba por id; el modelo vive en la carpeta `kitchen-cabinet`. Se detectó al listar ítems con `tool` y se corrigió buscando por la carpeta del `src`.
- 2026-10-11 — Se eligió Kenney Mini Market (CC0) para las piezas de comercio y al verlas en el editor Silvert las descartó ("parecen de un juego"). Se retiraron del repo; el comercio usa los estantes y gabinetes paramétricos de Pascal. Lección: mirar el estilo de un pack antes de integrarlo.
- 2026-10-11 — Un `CabinetNode` con `stack` propio no se dibuja: solo se ven las corridas con `CabinetModuleNode` hijos. Se descubrió con un prototipo en el editor real, no leyendo los esquemas.
- 2026-10-11 — El plan asumía que la pestaña "Comercio" mostraba todas las piezas a la vez; el panel de Pascal filtra por categoría y arranca en "Furniture". La prueba en navegador lo detectó.
- 2026-10-11 — Biome 2.5.15 marca como error `forEach` con valor de retorno y `a?.b` dentro de una aserción; el código del plan se había validado solo con Vitest. Se corrigió al correr `pnpm verify`.
- 2026-10-11 — Un reemplazo de texto con una cadena vacía (`str.replace('', nuevo)`) insertó el texto entre cada carácter del plan (129 MB). Se recuperó quitando la cadena insertada; desde entonces cada reemplazo se acota con `assert old and count == 1`.
- 2026-10-11 — Revisión visual de las plantillas: parquet, ladrillo, zócalos, estantes, vitrinas de vidrio, pared de heladeras y cocina con isla se ven correctos en las cuatro. Sin verificar a ojo: la llegada de la escalera al entrepiso.

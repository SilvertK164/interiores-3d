# Bitácora de proceso

Registro de sorpresas, alucinaciones del agente y correcciones. Una línea por hecho, con fecha.

- 2026-10-11 — Se creyó que el catálogo de Pascal dependía de su bucket; el repo MIT trae 100 de los 111 modelos. Se verificó listando `apps/editor/public/items`.
- 2026-10-11 — Se creyó que `scene-migrations` se podía llamar desde `@pascal-app/core`; no se exporta. Se verificó en `core/dist/index.d.ts`.
- 2026-10-11 — `pnpm 11` aborta con `ERR_PNPM_IGNORED_BUILDS` si no se declara `allowBuilds` para `esbuild`.
- 2026-10-11 — La prueba en navegador (Playwright) encontró un error que ninguna prueba unitaria veía: `ProjectEditor` pasaba `onLoad={async () => ...}` inline; `<Editor>` recarga la escena cuando cambia la identidad de `onLoad`, así que cada cambio del estado de guardado borraba el muro recién dibujado. Corregido con `useCallback` + `useRef`.
- 2026-10-11 — El test de fronteras del plan buscaba la cadena `@pascal-app/` en cualquier parte; daba falso positivo con una ruta de texto en `catalog.test.ts`. Ahora busca solo imports reales.
- 2026-10-11 — Dos veces se insertaron saltos de línea literales en código dentro de cadenas por un error de escape al generar el plan; se detectó al extraer y ejecutar el código.

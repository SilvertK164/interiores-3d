# Bitácora de proceso

Registro de sorpresas, alucinaciones del agente y correcciones. Una línea por hecho, con fecha.

- 2026-10-11 — Se creyó que el catálogo de Pascal dependía de su bucket; el repo MIT trae 100 de los 111 modelos. Se verificó listando `apps/editor/public/items`.
- 2026-10-11 — Se creyó que `scene-migrations` se podía llamar desde `@pascal-app/core`; no se exporta. Se verificó en `core/dist/index.d.ts`.
- 2026-10-11 — `pnpm 11` aborta con `ERR_PNPM_IGNORED_BUILDS` si no se declara `allowBuilds` para `esbuild`.

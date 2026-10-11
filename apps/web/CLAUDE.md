# apps/web/

Next 16 (App Router) + editor de Pascal. Reglas en `.claude/rules/apis-de-terceros.md` y `mensajes-en-castellano.md`.
- **Solo `src/editor/`** importa `@pascal-app/*`, `three` y `@react-three/*`. Las páginas (`app/`) importan el editor por `next/dynamic` con `ssr: false`.
- Los assets de Pascal están vendoreados en `public/` desde el repo MIT de Pascal (`pnpm --filter @interiores/web assets:vendor`). No editarlos a mano.
- Lógica pura (guardador, adaptador, catálogo, cliente de API) lleva pruebas en `test/`; los componentes de React se verifican con Playwright (`e2e/`).
- Cualquier nombre de la API de Pascal se confirma antes en `node_modules` y se anota en `docs/pascal-notes.md`.
- **Plantillas** (`src/lib/templates/`): son datos puros, multinivel, con materiales por id de la biblioteca de Pascal y estantes/gabinetes paramétricos. `pnpm --filter @interiores/web templates:build` regenera `public/templates/`; `pnpm verify` falla si los archivos commiteados no coinciden con las definiciones.
- **Íconos:** solo `lucide-react`, nunca emojis (`.claude/rules/iconos-sin-emojis.md`).

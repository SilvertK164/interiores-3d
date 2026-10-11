# apps/web/

Next 16 (App Router) + editor de Pascal. Reglas en `.claude/rules/apis-de-terceros.md` y `mensajes-en-castellano.md`.
- **Solo `src/editor/`** importa `@pascal-app/*`, `three` y `@react-three/*`. Las páginas (`app/`) importan el editor por `next/dynamic` con `ssr: false`.
- Los assets de Pascal están vendoreados en `public/` desde el repo MIT de Pascal (`pnpm --filter @interiores/web assets:vendor`). No editarlos a mano.
- Lógica pura (guardador, adaptador, catálogo, cliente de API) lleva pruebas en `test/`; los componentes de React se verifican con Playwright (`e2e/`).
- Cualquier nombre de la API de Pascal se confirma antes en `node_modules` y se anota en `docs/pascal-notes.md`.
- **Plantillas** (`src/lib/templates/`): son datos puros, multinivel, con materiales por id de la biblioteca de Pascal y estantes/gabinetes paramétricos. `pnpm --filter @interiores/web templates:build` regenera `public/templates/`; `pnpm verify` falla si los archivos commiteados no coinciden con las definiciones.
- **Íconos:** solo `lucide-react`, nunca emojis (`.claude/rules/iconos-sin-emojis.md`).
- **Interfaz propia** (`/login`, `/proyectos`): se envuelve en `<AppShell>` (`src/components/AppShell.tsx`), que trae Geist y los tokens de `app/app-shell.css` (`brand`, `canvas`, `ink`, utilidades `glass`, `btn`, `field`). Nunca uses esos tokens ni `AppShell` en `/proyectos/[id]`: el editor de Pascal depende de las variables de shadcn de `globals.css`.
- **Laboratorio de Victoria** (`app/laboratorio/`, `src/lib/lab/`, guía en `lab/README.md`): `analysisToDefinition` (`src/lib/lab/analysis-to-definition.ts`) queda **en blanco a propósito**, es su espacio de exploración del modelado con Pascal: no se implementa salvo que ella lo pida. La plomería (TP3 → página → `openDefinitionAsProject` en `src/editor/lab-scene.ts`) sí está hecha y probada.

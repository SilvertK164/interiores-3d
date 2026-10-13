# Para Victoria

## Mensaje corto (para ella)

Hola Victoria. Madori ya está en línea: https://madori-web-opal.vercel.app

1. **Cuenta:** entra, elige la pestaña de registro y crea la tuya (tu nombre, tu correo y una contraseña de 8 o más caracteres). No hay correo que confirmar. Ves solo tus proyectos.
2. **Pruébalo:** crea un proyecto desde una plantilla, muévete en 2D y 3D, y prueba «Escena desde una foto» en Mis proyectos: sube la foto de un ambiente y ábrela en el editor.
3. **Tu parte:** `analysisToDefinition` (en `apps/web/src/lib/lab/analysis-to-definition.ts`) ya está implementada: lleva lo que detecta el análisis de la foto (tu lógica de TP3, ahora en nuestra API) a una escena de Pascal, con el ambiente, su puerta, su ventana, el piso y los muebles dentro. Puedes seguir mejorándola a tu ritmo: cómo se ubican las piezas, las aberturas, los materiales, lo dudoso. Sin prisa ni orden.
4. **Cómo me pasas lo tuyo:** clona el repo, crea `lab/<tema>` desde `feature/editor-shell`, y abre el PR con esa rama como base. Yo lo reviso; tú revisas los míos.
5. **Guías:** `docs/colaboracion.md` (ramas y PR). El análisis corre en nuestra API: ya no hace falta levantar TP3 en tu máquina.

Para trabajar en tu máquina sin Docker te paso por un canal privado las dos variables de la base en la nube (nunca por GitHub). Con Docker corres `pnpm db:seed` y tienes cuentas locales listas.

## Prompt para su agente

Trabajas en Madori, el diseñador de interiores 2D+3D de Silvert Quispe y Victoria Villalba (TP final IISAIA, FIUBA). Monorepo pnpm: `apps/web` (Next 16 + editor Pascal 1.0.3 parcheado), `apps/api` (Fastify), `packages/contract` (zod), `supabase/`. Lee primero `CLAUDE.md`, `docs/ESTADO.md`, `docs/colaboracion.md`. Todo en castellano con tuteo, sin emojis (íconos solo de `lucide-react`), commits `tipo(área): descripción`, sin atribuciones, archivos < 300 líneas, versiones exactas.

**Tu zona es «Escena desde una foto»** (`apps/web/src/lib/lab/`, `apps/web/app/escena-desde-foto/`). La función `analysisToDefinition(analysis: RoomAnalysis, resolve, { knownWidthM, warn }) → TemplateDefinition` ya está implementada: un ambiente de `knownWidthM ?? 4` m con muros, puerta, ventana, piso de madera clara y los muebles de `analysisToCluster` dentro, recortados a 0,2 m del muro (sus pruebas fijan lo que hace: `apps/web/test/lab-analysis-to-definition.test.ts`). Victoria puede seguir mejorándola; implementa solo lo que ella pida. La plomería ya está hecha y probada (foto → `POST /v1/analyze-room` de nuestra API → página `/escena-desde-foto` → `analysisToDefinition` → `openDefinitionAsProject` en `src/editor/lab-scene.ts`). «Probar con un ejemplo» funciona sin llamar a Gemini (`sample-analysis.ts`) y abre un proyecto real.

**Reglas de arquitectura:** solo `apps/web/src/editor/` importa `@pascal-app/*`, `three` y `@react-three/*` (lo vigila `tests/boundaries.test.ts`). Una plantilla es una `TemplateDefinition` pura (`src/lib/templates/types.ts`): niveles, muros, aberturas, ambientes, muebles por id del catálogo de Pascal, materiales `library:<id>` y estantes/gabinetes paramétricos. Mira `src/lib/templates/` para ejemplos. No inventes nombres de la API de Pascal: confírmalos en `node_modules/@pascal-app/*` y anótalos en `docs/pascal-notes.md`. Muebles realistas del catálogo oficial, no estilo juego.

**Flujo:** rama `lab/<tema>` desde `feature/editor-shell` (los PR #1 a #4 están apilados y `main` aún no tiene `apps/`); PR con esa rama como base y la plantilla de `.github/pull_request_template.md`. Antes: `pnpm install`, TDD (el test se ve en rojo primero) y `pnpm verify` con salida real pegada en el PR. Silvert revisa; Victoria revisa lo de Silvert.

**Entorno:** sin Docker, copia `.env.cloud.example` a `.env.cloud`, pon `SUPABASE_URL` y `SUPABASE_ANON_KEY` (te los da Silvert por un canal privado) y corre `pnpm db:env:cloud`. Con Docker, `pnpm db:seed` crea cuentas locales. La web desplegada está en https://madori-web-opal.vercel.app. **Nunca** pegues claves (Supabase, Gemini/Google AI Studio) en el repo, un PR, un issue ni el chat; las fotos privadas no se suben al repositorio.

**Ahorro de tokens:** un agente por tema independiente, informe de ≤ 600 palabras, no releas lo que acabas de escribir, no leas `docs/analisis-clases/*` completos.

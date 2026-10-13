# Para Victoria: revisión de Madori

Todo está fusionado en `main` (PR #1 a #4) y desplegado: web https://madori-web-opal.vercel.app · API https://madori-api.vercel.app.

## Mensaje corto (para ella)

Hola Victoria. Ya está todo en `main` y en línea: https://madori-web-opal.vercel.app

1. **Revisa sin instalar nada:** entra a la web, crea tu cuenta en la pestaña de registro (nombre, correo y contraseña de 8 o más caracteres; no hay correo que confirmar) y prueba: plantillas, editor 2D/3D, Exportar plano (PDF con hojas isométricas), Exportar imagen 3D y **Escena desde una foto** (Mis proyectos). Usa fotos de ambientes que no sean privadas: Google puede usar las fotos del nivel gratuito.
2. **Tu parte ya está integrada:** el análisis con Gemini corre en nuestra API (ya no necesita tu TP3 local), con tu catálogo de piezas y tus IDs validados. `analysisToDefinition` (`apps/web/src/lib/lab/analysis-to-definition.ts`) arma el ambiente con muros, puerta, ventana, piso y los muebles; la cámara queda como en la foto. Puedes seguir mejorándola.
3. **Si quieres correrlo en tu máquina,** necesitas las variables de entorno: te las paso Silvert por un canal privado (nunca por GitHub). Pasos abajo.
4. **Cómo me pasas cambios:** rama `lab/<tema>` desde `main`, PR con la plantilla y la salida real de `pnpm verify`; Silvert lo revisa y tú revisas los suyos.
5. **Un favor en tu repo de TP3:** el último commit (`catalogo pascal`) subió `main.py`, `test_main.py`, `requirements.txt` y el `README` con marcas de conflicto sin resolver (`<<<<<<< HEAD`). Quédate con el bloque `HEAD` en los cuatro archivos y vuelve a subirlo (con eso `main.py` compila y pasan sus 25 pruebas).

## Variables de entorno (para correrlo en local)

Qué necesitas (dos valores que te pasa Silvert; no los pegues en el repo, un PR, un issue ni el chat):

| Variable | Qué es | Dónde va |
|---|---|---|
| `SUPABASE_URL` | URL del proyecto de desarrollo (`madori-dev`) | `.env.cloud` |
| `SUPABASE_ANON_KEY` | Clave pública (anon) del mismo proyecto | `.env.cloud` |
| `GEMINI_API_KEY` | **Tu propia** clave gratis de https://aistudio.google.com/apikey (solo para probar el análisis en local) | `apps/api/.env` |

Con PowerShell, desde la carpeta del repositorio (te pide los dos valores sin mostrarlos):

```powershell
git clone https://github.com/SilvertK164/interiores-3d; cd interiores-3d
pnpm install
$u = Read-Host "SUPABASE_URL"
$k = Read-Host "SUPABASE_ANON_KEY" -AsSecureString
$p = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($k))
[IO.File]::WriteAllText("$PWD\.env.cloud", "SUPABASE_URL=$u`nSUPABASE_ANON_KEY=$p`n")
Remove-Variable k, p
pnpm db:env:cloud          # escribe apps/api/.env y apps/web/.env.local
```

Para el análisis de fotos en local, agrega tu clave de Gemini a `apps/api/.env` (el archivo no se sube: está en `.gitignore`):

```powershell
$g = Read-Host "GEMINI_API_KEY" -AsSecureString
$q = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($g))
Add-Content -Path apps/api/.env -Value "GEMINI_API_KEY=$q"
Remove-Variable g, q
```

Luego, en dos terminales:

```powershell
pnpm --filter @interiores/api dev     # API en http://localhost:3001
pnpm --filter @interiores/web dev     # web en http://localhost:3000
```

Con Docker puedes usar una base local en vez de la nube: `pnpm db:start`, `pnpm db:env`, `pnpm db:seed` (cuentas de prueba, como `victoria@interiores.test`). Más detalle: `docs/colaboracion.md`, `docs/nube.md` y `lab/README.md`.

## Prompt para su agente

Trabajas en Madori, el diseñador de interiores 2D+3D de Silvert Quispe y Victoria Villalba (TP final IISAIA, FIUBA). Monorepo pnpm: `apps/web` (Next 16 + editor Pascal 1.0.3 parcheado), `apps/api` (Fastify en Vercel), `packages/contract` (zod), `supabase/`. Todo está en `main` y desplegado (web https://madori-web-opal.vercel.app, API https://madori-api.vercel.app). Lee primero `CLAUDE.md`, `docs/ESTADO.md`, `docs/colaboracion.md` y `docs/para-victoria.md`. Castellano con tuteo, sin emojis (íconos solo de `lucide-react`), commits `tipo(área): descripción`, sin atribuciones, archivos < 300 líneas, versiones exactas.

**Qué hay:** editor con plantillas, exportación de plano en PDF (con hojas isométricas) y de imagen 3D, y «Escena desde una foto» (`apps/web/app/escena-desde-foto`): la foto va a `POST /v1/analyze-room` (`apps/api/src/analyze-room/`, Gemini con modelos de respaldo, tope de 10 análisis por hora por persona) y `analysisToDefinition` (`apps/web/src/lib/lab/analysis-to-definition.ts`) arma el ambiente; la cámara queda como en la foto. «Muebles desde una foto» (menú Más) agrega las piezas al proyecto abierto.

**Reglas:** solo `apps/web/src/editor/` importa `@pascal-app/*`, `three` o `@react-three/*` (lo vigila `tests/boundaries.test.ts`). No inventes nombres de la API de Pascal: confírmalos en `node_modules/@pascal-app/*` y anótalos en `docs/pascal-notes.md`. Rama `lab/<tema>` desde `main`; TDD (el test se ve en rojo primero); `pnpm verify` con salida real pegada en el PR; revisión cruzada.

**Entorno:** copia las variables como indica `docs/para-victoria.md` (Silvert te da `SUPABASE_URL` y `SUPABASE_ANON_KEY` por un canal privado; la clave de Gemini es la tuya). **Nunca** pegues claves en el repo, un PR, un issue ni el chat. Fotos privadas no.

**Ahorro de tokens:** un agente por tema independiente, informe de ≤ 600 palabras, no releas lo que acabas de escribir, no leas `docs/analisis-clases/*` completos.

# Videos de Madori (HyperFrames)

Dos videos de presentación hechos con [HyperFrames](https://github.com/heygen-com/hyperframes) (HeyGen): composiciones HTML + GSAP que se previsualizan en el navegador y se renderizan a MP4. **Esta carpeta es independiente del monorepo**: tiene su propio `package.json` y `npm install`, no está en `pnpm-workspace.yaml` y no toca `apps/`, `packages/` ni `supabase/`.

| Video | Duración | Comando | Salida |
|---|---|---|---|
| Teaser (1920x1080, 30 fps) | 30,5 s | `npm run teaser` | `out/teaser.mp4` |
| Explicativo (1920x1080, 30 fps) | 2 min 58 s | `npm run explicativo` | `out/explicativo.mp4` |

El guion completo (escena por escena: tiempo, texto, fuente de la imagen y transición) está en [`guion.md`](guion.md). Los videos **no tienen voz en off ni música**: el texto en pantalla hace de subtítulos. No se usa ningún servicio en la nube ni clave de API.

## Requisitos

- Node 22 o superior (probado con 22.20) y npm.
- **FFmpeg y FFprobe** en el `PATH` (probado con 8.1.1). Si falta: `winget install Gyan.FFmpeg`.
- **Chrome/Chromium**: HyperFrames descarga solo un `chrome-headless-shell` la primera vez (`npx hyperframes browser`). Docker no hace falta.
- Comprobación de todo: `npx hyperframes doctor` (las líneas opcionales de whisper, TTS y MusicGen no se usan).
- Las capturas y plantillas salen del propio repo (`docs/design/implementado/` y `apps/web/public/templates/`): hay que correr los comandos dentro de una copia completa del repositorio.

## Uso

```bash
cd video
npm install          # versiones exactas: hyperframes 0.8.150, gsap 3.15.0, lucide-static 1.55.0
npm run preview      # estudio de HyperFrames con el teaser (http://localhost:3002)
npm run preview:explicativo
npm run check        # lint + validación en navegador de ambas composiciones
npm run teaser       # renderiza out/teaser.mp4 (~30 s)
npm run explicativo  # renderiza out/explicativo.mp4 (varios minutos)
```

Cada comando corre antes `npm run prep`: genera los HTML (`src/generar.mjs`) y copia fuentes, GSAP y las imágenes reales a `teaser/` y `explicativo/` (esas copias y `out/` están en `.gitignore`; los `.mp4` nunca se versionan).

Para ver fotogramas sueltos sin renderizar: `npx hyperframes snapshot teaser --at 3,12,30 -o snaps/teaser`.

## Estructura

- `src/teaser.mjs`, `src/explicativo.mjs`: **las escenas** (texto, imagen, duración y transición). Es lo único que se edita para cambiar el contenido.
- `src/escenas.mjs`, `src/arq.mjs`, `src/piezas.mjs`, `src/estilos.mjs`: tipos de escena, diagrama de arquitectura animado, logotipo y marca.
- `src/escenas2.mjs`, `src/maquetas.mjs`, `src/estilos2.mjs` (13 de octubre de 2026): escenas de «Escena desde una foto», «Exportar plano», «Imagen 3D» y el despliegue. Son **maquetas** en HTML/CSS/SVG con los textos y colores reales de la interfaz (no capturas); la imagen 3D usa la miniatura de la plantilla Loft.
- `src/generar.mjs`: escribe `teaser/index.html`, `explicativo/index.html` y `guion.md`. Después de tocar `src/`, correr `npm run generar`.
- `fonts/` (Fraunces, Bricolage Grotesque y DM Sans, licencia OFL, de `@fontsource-variable`) y `vendor/gsap.min.js`: versionados y autoalojados para que el render no dependa de internet.

## Notas

- Marca según `docs/nombre-y-marca.md`: Noche, Cobalto, Sol (solo formas), Cielo y Crema; sin degradados ni fondos oscuros; la ventana del logotipo usa la misma geometría que `apps/web/src/lib/brand.ts`. Íconos de lucide, sin emojis.
- El kanji 間取り se dibuja con la fuente japonesa del sistema (Yu Mincho / Yu Gothic en Windows); en otro sistema puede cambiar de aspecto.
- `hyperframes lint` avisa `nested_structure_needs_subcomposition` por cada escena: solo afecta cómo el estudio dibuja la línea de tiempo, no el render.
- Música: si más adelante se quiere un fondo sonoro, usar solo audio de dominio público o CC0, ponerlo en `assets/` y documentar su origen en `guion.md`.

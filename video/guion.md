# Guion de los videos de Madori

Generado por `src/generar.mjs` desde `src/teaser.mjs` y `src/explicativo.mjs`: **no se edita a mano**, se cambian las escenas y se corre `npm run generar`.

- Formato: 1920 x 1080, 30 fps, MP4 (H.264). Sin voz en off y **sin música** (no se usó ninguna pista: ninguna fuente CC0 verificada); el texto en pantalla hace de subtítulos.
- Marca: Noche `#0B1F4D`, Cobalto `#1F5FE0`, Sol `#FFB02E` (solo formas), Cielo `#CFE0FF`, Crema `#FFF4E2`; Fraunces (logotipo), Bricolage Grotesque (títulos) y DM Sans (texto). Íconos de lucide, sin emojis.
- Las pantallas de login, proyectos y editor son capturas reales de la app y de sus plantillas (rutas del repo). Las escenas de **Escena desde una foto, Exportar plano, Imagen 3D y despliegue** (versión del 13 de octubre de 2026) son **maquetas dibujadas en HTML/CSS/SVG** con los textos, las opciones y los colores reales de la interfaz de Madori (https://madori-web-opal.vercel.app); la miniatura 3D es la de la plantilla Loft. No hay material de terceros.
- Cada transición se solapa 0,6 s con la escena anterior (la duración indicada es la de lectura, sin contar el solape).

## Video 1: teaser (0:31, 30.5 s) — `npm run teaser`

| N.º | Tiempo | Dur. | Texto en pantalla | Fuente de la imagen | Transición de entrada |
|---|---|---|---|---|---|
| 1 | 0:00-0:04 | 3.5 s | El problema · Amoblar y planificar un local o una vivienda sin software complejo. · Planos, medidas y muebles en programas pensados para profesionales. | Sin imagen: tipografía y forma de la marca (círculo Sol) | inicio (sin transición) |
| 2 | 0:04-0:08 | 4.5 s | Editor 2D y 3D · El plano y la casa, a la vez · Mira en modo Ver o cambia a Editar. | docs/design/implementado/editor-ver-dividida.jpg | zoom suave con fundido (0,6 s) |
| 3 | 0:08-0:14 | 5.5 s | Escena desde una foto · Una foto de tu ambiente y se arma en 3D · 1 Subes una foto (sofá, lámpara de pie, mesa de centro y planta con su porcentaje de confianza) · 2 Gemini reconoce los muebles del catálogo de Madori · 3 Se arma en 3D con la cámara en el punto de vista de la foto (Gemini reconoce los muebles y la cámara queda como en la foto) | Maqueta HTML/SVG de la pantalla «Escena desde una foto» (textos reales) | deslizar desde la derecha (0,6 s) |
| 4 | 0:14-0:19 | 5 s | Exportar plano · Diálogo con Hoja (A4 o A3), Escala (1:25, 1:50, 1:100), Modo (Papel o Color), Incluir cajetín e Incluir vistas isométricas · vista previa de la hoja con cajetín, norte y escala · Descargar PDF | Maqueta HTML/SVG del diálogo «Exportar plano» (textos reales) | fundido (0,6 s) |
| 5 | 0:19-0:23 | 4 s | Imagen 3D · Exportar imagen 3D · PNG isométrico en Color o en Blanco y negro (loft-isometrico.png y loft-isometrico-bn.png) | Miniatura de la plantilla Loft (apps/web/public/templates/loft.jpg) con controles maquetados | deslizar desde la derecha (0,6 s) |
| 6 | 0:23-0:26 | 3.5 s | En la nube · Tu navegador, HTTPS, Vercel (web Next 16), REST + JWT, Vercel (API Fastify), con RLS, Supabase (Postgres + Auth); la API llama a Gemini · madori-web-opal.vercel.app | Maqueta HTML/SVG del despliegue (docs/nube.md) | fundido (0,6 s) |
| 7 | 0:26-0:31 | 4.5 s | Madori · Diseño de interiores 2D y 3D · Silvert Quispe y Victoria Villalba · Trabajo final de IISAIA, FIUBA | Logotipo reconstruido con la geometría de apps/web/src/lib/brand.ts | fundido (0,6 s) |

## Video 2: explicativo (2:58, 178 s) — `npm run explicativo`

| N.º | Tiempo | Dur. | Texto en pantalla | Fuente de la imagen | Transición de entrada |
|---|---|---|---|---|---|
| 1 | 0:00-0:05 | 5 s | Madori · Un diseñador de interiores 2D y 3D para viviendas y comercios | Logotipo reconstruido con la geometría de apps/web/src/lib/brand.ts | inicio (sin transición) |
| 2 | 0:05-0:12 | 7 s | Quiénes somos · Dos personas, un trabajo final · Silvert Quispe y Victoria Villalba, autores de Madori: un trabajo hecho entre los dos · El curso: IISAIA, Ingeniería de Software Asistida por IA, FIUBA | Sin imagen: datos del README.md y docs/ESTADO.md | fundido (0,6 s) |
| 3 | 0:12-0:20 | 8 s | El nombre · Madori: el plano de una casa · 間取り (madori): en japonés, la distribución de los ambientes de una vivienda · la "o" de Madori es una ventana con el sol adentro | docs/nombre-y-marca.md (dibujo propio en SVG) | deslizar desde la derecha (0,6 s) |
| 4 | 0:20-0:26 | 6 s | La marca · La "o" es una ventana, con el sol adentro · Colores planos, sin degradados y sin fondos oscuros. | docs/nombre-y-marca.md (paleta y tipografías) | fundido (0,6 s) |
| 5 | 0:26-0:30 | 4 s | El producto · Entras con tu cuenta · Ingresar o crear cuenta, con mensajes claros en castellano. | docs/design/implementado/login.jpg | deslizar desde la derecha (0,6 s) |
| 6 | 0:30-0:35 | 5 s | Tus proyectos · Todo en una pantalla · Tus proyectos guardados y plantillas para empezar. | docs/design/implementado/proyectos.jpg | fundido (0,6 s) |
| 7 | 0:35-0:41 | 6 s | Plantillas reales · Empieza desde un ejemplo terminado · Con niveles, escalera, materiales y piezas paramétricas. | apps/web/public/templates/*.jpg | zoom suave con fundido (0,6 s) |
| 8 | 0:41-0:48 | 7 s | Editor · Plano 2D y 3D, en Ver o en Editar · Cada vista tiene su propia cámara. Elige 2D, 3D o ambas. | docs/design/implementado/editor-ver-dividida.jpg | deslizar desde la derecha (0,6 s) |
| 9 | 0:48-0:53 | 5 s | Muebles · Muebles paramétricos · 144 muebles con nombre en castellano, más estantes y gabinetes a medida. | docs/design/implementado/editor-muebles.jpg | fundido (0,6 s) |
| 10 | 0:53-0:57 | 4 s | Materiales · 114 materiales · Pisos, paredes y revestimientos de la biblioteca de Pascal. | docs/design/implementado/editor-materiales.jpg | deslizar desde la derecha (0,6 s) |
| 11 | 0:57-1:02 | 5 s | Recorrer · Camina por tu diseño · Choca con los muros, abre puertas y sube escaleras. | docs/design/implementado/editor-ver-3d.jpg | zoom suave con fundido (0,6 s) |
| 12 | 1:02-1:11 | 9 s | Escena desde una foto · Una foto de tu ambiente y se arma en 3D · 1 Subes una foto (sofá, lámpara de pie, mesa de centro y planta con su porcentaje de confianza) · 2 Gemini reconoce los muebles del catálogo de Madori · 3 Se arma en 3D con la cámara en el punto de vista de la foto · Gemini reconoce los muebles y Madori arma el ambiente | Maqueta HTML/SVG de la pantalla «Escena desde una foto» (textos reales); docs/ESTADO.md | fundido (0,6 s) |
| 13 | 1:11-1:19 | 8 s | Escena desde una foto · Se arma el ambiente en 3D · Cámara en el muro cercano, mirando de frente, 60° de campo de visión a 1,5 m de altura · Muros, piso, puerta y ventana · Todo en un solo paso: un Deshacer lo quita | Maqueta HTML/SVG (docs/ESTADO.md, «La cámara 3D abre en el punto de vista de la foto») | deslizar desde la derecha (0,6 s) |
| 14 | 1:19-1:29 | 10 s | Exportar plano · Diálogo con Hoja (A4 o A3), Escala (1:25, 1:50, 1:100), Modo (Papel o Color), Incluir cajetín e Incluir vistas isométricas · vista previa de la hoja con cajetín, norte y escala · Descargar PDF · Hoja A4 o A3, escalas 1:25, 1:50 y 1:100, modo Papel o Color | Maqueta HTML/SVG del diálogo «Exportar plano» (textos de apps/web/src/lib/export/texts-es.ts) | fundido (0,6 s) |
| 15 | 1:29-1:35 | 6 s | Exportar plano · Una hoja por planta, también en isométrico · Hoja 1 y 2: planos de la planta baja y alta a escala 1:50 · Hoja 3 y 4: vistas isométricas, sin escala · Con cajetín, norte arriba y el logotipo de Madori · Modos Papel y Color | Maqueta HTML/SVG de las hojas del PDF; vistas isométricas con la miniatura de la plantilla Loft | deslizar desde la derecha (0,6 s) |
| 16 | 1:35-1:43 | 8 s | Imagen 3D · Exportar imagen 3D · PNG isométrico en Color o en Blanco y negro (loft-isometrico.png y loft-isometrico-bn.png) | Miniatura de la plantilla Loft (apps/web/public/templates/loft.jpg) con controles maquetados (textos reales) | fundido (0,6 s) |
| 17 | 1:43-1:59 | 16 s | Arquitectura · Cómo se conectan las piezas | Diagrama propio (HTML y SVG), según docs/ESTADO.md y el README | fundido (0,6 s) |
| 18 | 1:59-2:07 | 8 s | El stack · Tecnología elegida y por qué · Next 16, React 19 y Tailwind 4 (web en Vercel) · Pascal 1.0.3 con 2 parches · Fastify y contrato zod / OpenAPI · Supabase (Postgres con RLS y Auth) · Gemini (visión) · pnpm monorepo (Vitest, Playwright y Biome) | Sin imagen: íconos lucide | deslizar desde la derecha (0,6 s) |
| 19 | 2:07-2:16 | 9 s | En la nube · Tu navegador, HTTPS, Vercel (web Next 16), REST + JWT, Vercel (API Fastify), con RLS, Supabase (Postgres + Auth); la API llama a Gemini · madori-web-opal.vercel.app · Web y API se publican desde el repositorio, cada una con su proyecto de Vercel | Maqueta HTML/SVG del despliegue (docs/nube.md) | deslizar desde la derecha (0,6 s) |
| 20 | 2:16-2:24 | 8 s | Cómo trabajamos con IA · El flujo del curso, sin saltarnos pasos | CLAUDE.md (flujo obligatorio, clase 05) | deslizar desde la derecha (0,6 s) |
| 21 | 2:24-2:30 | 6 s | Con la IA, con cabeza · Menos tokens, más control · Reglas simples para que la IA ayude sin perder el hilo. | CLAUDE.md y memoria del proyecto | fundido (0,6 s) |
| 22 | 2:30-2:37 | 7 s | Seguridad · Tus datos, solo tuyos · Dos barreras: la API y la base de datos. | README.md (decisiones) y docs/ESTADO.md | deslizar desde la derecha (0,6 s) |
| 23 | 2:37-2:44 | 7 s | Calidad · Cifras reales del repositorio · Conteo de casos de prueba al 12 de octubre de 2026. | Conteo en el repo (ver guion.md) y docs/ESTADO.md | fundido (0,6 s) |
| 24 | 2:44-2:51 | 7 s | Lo que viene · Próximos pasos · Lo que sigue, anotado en docs/ESTADO.md. | docs/ESTADO.md (Pendiente) | deslizar desde la derecha (0,6 s) |
| 25 | 2:51-2:58 | 7 s | Madori · Diseño de interiores 2D y 3D · Silvert Quispe y Victoria Villalba · Trabajo final de IISAIA (Ingeniería de Software Asistida por IA), FIUBA | Logotipo reconstruido con la geometría de apps/web/src/lib/brand.ts | fundido (0,6 s) |

## Cifras usadas (todas comprobadas en el repositorio)

- Casos de prueba: conteo estático de `it(`/`test(` por carpeta al 2026-10-12 (no es la salida de `pnpm verify`, que necesita Docker): API 58, web 738, raíz 77, paquetes 18, RLS 15 = 906 de unidad e integración; 168 escenarios E2E en 31 archivos.
- 144 muebles con nombre en castellano, 114 materiales, 4 plantillas: `docs/ESTADO.md`.
- 2 parches de pnpm (Pascal `chrome` y drei `Html`): `docs/ESTADO.md`.
- Exportar plano: hoja A4 o A3, escalas 1:25, 1:50 y 1:100, modos Papel y Color, cajetín con el logotipo y una hoja isométrica por planta (`docs/ESTADO.md`, «Exportar plano en PDF»; textos en `apps/web/src/lib/export/texts-es.ts`). Imagen 3D: PNG isométrico en Color o Blanco y negro (`loft-isometrico.png`, `-bn.png`).
- Escena desde una foto: `POST /v1/analyze-room` de la API con Gemini, hasta 10 análisis por hora y por persona, la foto no se guarda; cámara 3D con 60° de campo de visión a 1,5 m de altura (`docs/ESTADO.md`). Despliegue: web y API en Vercel, Postgres y Auth en Supabase (`docs/nube.md`); dirección https://madori-web-opal.vercel.app.

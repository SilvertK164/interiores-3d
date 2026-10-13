# Guion de los videos de Madori

Generado por `src/generar.mjs` desde `src/teaser.mjs` y `src/explicativo.mjs`: **no se edita a mano**, se cambian las escenas y se corre `npm run generar`.

- Formato: 1920 x 1080, 30 fps, MP4 (H.264). Sin voz en off y **sin música** (no se usó ninguna pista: ninguna fuente CC0 verificada); el texto en pantalla hace de subtítulos.
- Marca: Noche `#0B1F4D`, Cobalto `#1F5FE0`, Sol `#FFB02E` (solo formas), Cielo `#CFE0FF`, Crema `#FFF4E2`; Fraunces (logotipo), Bricolage Grotesque (títulos) y DM Sans (texto). Íconos de lucide.
- Todas las imágenes son capturas reales de la app y de sus plantillas (rutas del repo); no hay material de terceros.
- Cada transición se solapa 0,6 s con la escena anterior (la duración indicada es la de lectura, sin contar el solape).

## Video 1: teaser (0:38, 37.5 s) — `npm run teaser`

| N.º | Tiempo | Dur. | Texto en pantalla | Fuente de la imagen | Transición de entrada |
|---|---|---|---|---|---|
| 1 | 0:00-0:05 | 4.5 s | El problema · Amoblar y planificar un local o una vivienda sin software complejo. · Planos, medidas y muebles en programas pensados para profesionales. | Sin imagen: tipografía y forma de la marca (círculo Sol) | inicio (sin transición) |
| 2 | 0:05-0:09 | 4.5 s | Entra · Tu cuenta, tus proyectos · Ingresa o crea tu cuenta en segundos. | docs/design/implementado/login.jpg | deslizar desde la derecha (0,6 s) |
| 3 | 0:09-0:14 | 5 s | Empieza rápido · Elige una plantilla de vivienda o comercio · O parte de un plano en blanco. | docs/design/implementado/nuevo-proyecto.jpg | fundido (0,6 s) |
| 4 | 0:14-0:20 | 6 s | Editor 2D y 3D · El plano y la casa, a la vez · Mira en modo Ver o cambia a Editar. | docs/design/implementado/editor-ver-dividida.jpg | zoom suave con fundido (0,6 s) |
| 5 | 0:20-0:25 | 4.5 s | Muebles · Muebles que se ajustan a tu medida · Estantes y gabinetes paramétricos, y más de cien piezas. | docs/design/implementado/editor-muebles.jpg | deslizar desde la derecha (0,6 s) |
| 6 | 0:25-0:29 | 4.5 s | Recorre tu diseño · Varias plantas, y camina por dentro · Mira el resultado antes de comprar o construir. | docs/design/implementado/editor-ver-3d.jpg | fundido (0,6 s) |
| 7 | 0:29-0:32 | 3 s | Próximamente · Exporta tu plano en PDF · Con escala y cajetín. Todavía no está disponible. | Sin imagen: tipografía y forma de la marca | zoom suave con fundido (0,6 s) |
| 8 | 0:32-0:38 | 5.5 s | Diseño de interiores 2D y 3D | Logotipo reconstruido con la geometría de apps/web/src/lib/brand.ts | fundido (0,6 s) |

## Video 2: explicativo (2:51, 171 s) — `npm run explicativo`

| N.º | Tiempo | Dur. | Texto en pantalla | Fuente de la imagen | Transición de entrada |
|---|---|---|---|---|---|
| 1 | 0:00-0:06 | 6 s | Madori · Un diseñador de interiores 2D y 3D para viviendas y comercios | Logotipo reconstruido con la geometría de apps/web/src/lib/brand.ts | inicio (sin transición) |
| 2 | 0:06-0:14 | 8 s | Quiénes somos · Dos personas, un trabajo final · Madori es el proyecto final del curso. | Sin imagen: datos del README.md y docs/ESTADO.md | fundido (0,6 s) |
| 3 | 0:14-0:24 | 10 s | El nombre · Madori: el plano de una casa · En japonés, madori es la distribución de los ambientes de una vivienda. | docs/nombre-y-marca.md (dibujo propio en SVG) | deslizar desde la derecha (0,6 s) |
| 4 | 0:24-0:33 | 9 s | La marca · La "o" es una ventana, con el sol adentro · Colores planos, sin degradados y sin fondos oscuros. | docs/nombre-y-marca.md (paleta y tipografías) | fundido (0,6 s) |
| 5 | 0:33-0:38 | 5 s | El producto · Entras con tu cuenta · Ingresar o crear cuenta, con mensajes claros en castellano. | docs/design/implementado/login.jpg | deslizar desde la derecha (0,6 s) |
| 6 | 0:38-0:44 | 6 s | Tus proyectos · Todo en una pantalla · Tus proyectos guardados y plantillas para empezar. | docs/design/implementado/proyectos.jpg | fundido (0,6 s) |
| 7 | 0:44-0:52 | 8 s | Plantillas reales · Empieza desde un ejemplo terminado · Con niveles, escalera, materiales y piezas paramétricas. | apps/web/public/templates/*.jpg | zoom suave con fundido (0,6 s) |
| 8 | 0:52-1:00 | 8 s | Editor · Plano 2D y 3D, en Ver o en Editar · Cada vista tiene su propia cámara. Elige 2D, 3D o ambas. | docs/design/implementado/editor-ver-dividida.jpg | deslizar desde la derecha (0,6 s) |
| 9 | 1:00-1:07 | 7 s | Muebles · Muebles paramétricos · 144 muebles con nombre en castellano, más estantes y gabinetes a medida. | docs/design/implementado/editor-muebles.jpg | fundido (0,6 s) |
| 10 | 1:07-1:13 | 6 s | Materiales · 114 materiales · Pisos, paredes y revestimientos de la biblioteca de Pascal. | docs/design/implementado/editor-materiales.jpg | deslizar desde la derecha (0,6 s) |
| 11 | 1:13-1:19 | 6 s | Recorrer · Camina por tu diseño · Choca con los muros, abre puertas y sube escaleras. | docs/design/implementado/editor-ver-3d.jpg | zoom suave con fundido (0,6 s) |
| 12 | 1:19-1:37 | 18 s | Arquitectura · Cómo se conectan las piezas | Diagrama propio (HTML y SVG), según docs/ESTADO.md y el README | fundido (0,6 s) |
| 13 | 1:37-1:46 | 9 s | El stack · Tecnología elegida y por qué · Todo con versiones exactas y un solo comando de verificación. | Sin imagen: íconos lucide | deslizar desde la derecha (0,6 s) |
| 14 | 1:46-1:55 | 9 s | Laboratorio de Victoria · De una foto a un plano · Un servicio propio (TP3) propone las piezas; Madori las convierte en escena. | docs/ESTADO.md (Laboratorio de Victoria) y lab/README.md | fundido (0,6 s) |
| 15 | 1:55-2:07 | 12 s | Cómo trabajamos con IA · El flujo del curso, sin saltarnos pasos | CLAUDE.md (flujo obligatorio, clase 05) | deslizar desde la derecha (0,6 s) |
| 16 | 2:07-2:15 | 8 s | Con la IA, con cabeza · Menos tokens, más control · Reglas simples para que la IA ayude sin perder el hilo. | CLAUDE.md y memoria del proyecto | fundido (0,6 s) |
| 17 | 2:15-2:24 | 9 s | Seguridad · Tus datos, solo tuyos · Dos barreras: la API y la base de datos. | README.md (decisiones) y docs/ESTADO.md | deslizar desde la derecha (0,6 s) |
| 18 | 2:24-2:34 | 10 s | Calidad · Cifras reales del repositorio · Conteo de casos de prueba al 12 de octubre de 2026. | Conteo en el repo (ver guion.md) y docs/ESTADO.md | fundido (0,6 s) |
| 19 | 2:34-2:43 | 9 s | Lo que viene · Próximos pasos · Hoy se ven como "Pronto" dentro del editor. | docs/ESTADO.md (Pendiente) | deslizar desde la derecha (0,6 s) |
| 20 | 2:43-2:51 | 8 s | Diseño de interiores 2D y 3D | Logotipo reconstruido con la geometría de apps/web/src/lib/brand.ts | fundido (0,6 s) |

## Cifras usadas (todas comprobadas en el repositorio)

- Casos de prueba: conteo estático de `it(`/`test(` por carpeta al 2026-10-12 (no es la salida de `pnpm verify`, que necesita Docker): API 58, web 738, raíz 77, paquetes 18, RLS 15 = 906 de unidad e integración; 168 escenarios E2E en 31 archivos.
- 144 muebles con nombre en castellano, 114 materiales, 4 plantillas: `docs/ESTADO.md`.
- 2 parches de pnpm (Pascal `chrome` y drei `Html`): `docs/ESTADO.md`.

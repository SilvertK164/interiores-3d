# Investigación: exportaciones, renders realistas y diseño con Pencil

> Fecha: 2026-10-11. Etiquetas: **[verificado]** lo comprobamos leyendo código o el registro de npm · **[fuente externa]** viene de páginas de terceros y hay que confirmarlo en la página oficial antes de presupuestar · **[inferencia]** estimación nuestra.
> Complementa [`analisis-clases.md`](analisis-clases.md) y el [spec 1](superpowers/specs/2026-10-11-fundacion-y-persistencia-design.md).

## 1. Exportaciones: qué trae Pascal y qué habría que construir

| Salida | ¿Existe en `@pascal-app/editor` 1.0.3 (publicado)? | Evidencia | Esfuerzo propio | Recomendación |
|---|---|---|---|---|
| **Plano en PDF** | **Sí** | `lib/floorplan/floorplan-export.tsx` exporta `exportFloorplanPdf(scope)`, con `pdfkit`. A4 apaisado, cotas automáticas de muros y tablas de aberturas/ambientes (`collectFloorplanSchedules`) **[verificado]** | Bajo: un botón en nuestro shell | **Incluir.** |
| **Escala del plano** | **No explícita** | El código ajusta el plano a la hoja (`fitPlanToBox`); no encontramos escala numérica (1:50, 1:100) ni escala gráfica **[verificado por búsqueda en el código]** | Medio: cajetín con nombre/fecha/escala y barra de escala calculada desde los metros reales del plano (el módulo exporta `fitPlanToBox` y `resolveFloorplanPageLayout`) **[inferencia]** | **Incluir** como lo mínimo que pide el plano "con escalas y acotado". |
| **Cotas (acotar)** | **Sí** | Capa de cotas en el plano 2D (`floorplan-dimension-renderer`, `measurement-pill`) y cotas automáticas en el PDF **[verificado]** | Nulo | Ya está. |
| **Modelo 3D (GLB, OBJ, STL, USDZ, 3MF)** | **Sí** | `ModelExportFormat = 'glb' \| 'usdz' \| 'stl' \| 'obj' \| 'print-stl' \| 'print-3mf'` **[verificado]** | Bajo | GLB sirve de "modelo exportable" y además alimenta renders físicos. |
| **DXF** | **No** | No hay exportador DXF en el repo (la búsqueda de código solo encontró coincidencias en una lucarna, fixtures y el lockfile) **[verificado]** | Medio/alto: generar entidades 2D (muros como polilíneas, aberturas, ambientes, cotas) desde la misma geometría que usa el PDF (`collectFloorplanGeometry`) con una librería escritora de DXF **[inferencia]** | **Opcional.** Si el PDF con escala y cotas alcanza (lo que planteó el equipo), queda como trabajo futuro documentado. |
| **IFC (salida)** | **No en 1.0.3; sí en `main`** | `lib/ifc-export.ts` en `main` llama a `buildIfcExport` de `@pascal-app/ifc-converter/export`. El paquete **publicado** del conversor solo exporta `.` (dirección IFC → Pascal) **[verificado en npm y en el repo]** | Alto/incierto: vendorear ≈ 91 KB de TypeScript (9 archivos, `scene-to-ifc.ts` pesa 58 KB), con riesgo de desajuste con los tipos de `core` 1.0.3 **[inferencia]** | **Spike acotado a 2 h o descartar** y documentar la razón. |
| **IFC (entrada)** | Sí | `@pascal-app/ifc-converter` convierte IFC → grafo de Pascal: muros, puertas, ventanas, losas, columnas y espacios como ambientes **[verificado]** | Bajo/medio | Posible "Importar plano IFC" en el futuro. |

**Conclusión:** PDF con escala, cajetín y cotas es barato y entra. **Decisión del equipo (2026-10-11):** DXF e IFC quedan **fuera de alcance** y se documentan como trabajo futuro. Razones para el README: Pascal 1.0.3 no trae DXF; el IFC de salida solo existe en una rama sin publicar y depende de ≈ 91 KB de código con tipos que podrían no coincidir con la versión que usamos; y un plano PDF con escala y cotas cubre lo que necesita quien presenta el espacio.

## 2. Renders realistas

### Dos caminos
1. **Render con IA a partir de una captura del editor** (recomendado para 2 días). Pascal captura el visor (`snapshot-capture.ts`, runtime `capture`); la API del proveedor devuelve una imagen fotorrealista conservando la distribución; se guarda en Supabase Storage y se muestra en una galería por proyecto.
2. **Path tracing físico en el navegador** con [`three-gpu-pathtracer`](https://github.com/gkjohnson/three-gpu-pathtracer): carga un GLB y calcula iluminación física con WebGL 2. Es exacto con la geometría, gratis y sin API, pero es progresivo (no tiempo real), pesado en GPU y no pudimos confirmar su mantenimiento actual **[fuente externa]**. Requiere exportar el GLB y montarlo en una escena aparte (Pascal usa WebGPU). Reservado como extra.

### Opciones de API para el camino 1

| Opción | Cómo preserva la geometría | Precio por imagen | Estado de la verificación |
|---|---|---|---|
| **Stability AI — Control Structure** | Condicionado por estructura/profundidad de la imagen de referencia | ≈ 3 créditos = ≈ US$ 0,03 | **[fuente externa]** ([listado](https://developer.puter.com/tutorials/stability-ai-api-pricing/)); confirmar en platform.stability.ai |
| **FLUX.1 Kontext [pro]** (Black Forest Labs) | Edición por instrucción de una imagen (conserva composición) | US$ 0,04 (pro) / 0,08 (max), 1 crédito = US$ 0,01 | Precio oficial según la [página de precios de BFL](https://docs.eu.bfl.ai/quick_start/pricing); Replicate y fal difieren según la fuente |
| **Gemini 3 Pro Image / 2.5 Flash Image** (Google) | Edición por instrucciones | Entre US$ 0,039 y 0,134 según el blog consultado | **[fuente externa]**, cifras inconsistentes ([comparativa](https://invideo.io/blog/ai-image-model-pricing/)); confirmar en la página de Google. Imagen 4 no sirve (no edita y se discontinúa el 17/08/2026) |
| **Modelos de interiorismo en Replicate** (p. ej. [`rocketdigitalai/interior-design-sdxl`](https://replicate.com/rocketdigitalai/interior-design-sdxl)) | SDXL con ControlNet de profundidad + estructura, pensado para interiores | Se factura por segundos de GPU; sin cifra confiable | Probar: no encontramos documentación oficial de precio ni de latencia |
| **Comerciales de interiorismo** (Rendair, Decor8, etc.) | Preservan geometría según su marketing | Planes propios | Afirmaciones del proveedor, no independientes |

**Qué recomendamos hoy:** empezar con **Stability AI Control Structure** como candidato principal, porque su propósito documentado es conservar la estructura de la imagen de referencia, que es lo que más importa al comparar un render con el plano. Dejar **FLUX.1 Kontext [pro]** como alternativa y **Gemini** para variaciones de estilo. **Esto es una hipótesis**: ninguno de los criterios de fidelidad geométrica está comparado de forma independiente.

**Estado:** el proveedor **no está elegido**. El equipo va a compartir el material que reunió Victoria; la comparativa lo incluye como candidato antes de decidir.

### Protocolo para decidir con evidencia (30–45 min)
Tomar 3 capturas del editor (una vivienda, un comercio y un cuarto con muebles) y correr cada candidato —incluida la API que investigó Victoria— con el mismo prompt. Puntuar de 1 a 5: fidelidad de muros y aberturas, fidelidad de muebles, realismo de luz y materiales, tiempo, costo. Guardar capturas y tabla: es la evidencia de la decisión para *Qué decidí yo*.

### Reglas de arquitectura (válidas con cualquier proveedor)
- **La clave de API vive solo en `apps/api`** (variable de entorno), nunca en el navegador ni en el repo. Se agrega a las reglas de `deny` de lectura de `.env*`.
- Tabla `renders(id, project_id, owner_id, status, provider, prompt, image_path, created_at)` con RLS por dueño.
- **Cuota por usuario** (p. ej. 5 renders por día): una API paga expuesta sin límite es un riesgo de costo y de abuso.
- Subida de la captura y resultado en Supabase Storage con URL firmada y vencimiento.
- Prompt y capturas son datos del usuario: no incluir información personal en el prompt.
- Estimación de trabajo del slice: **3–5 h** si la API colabora **[inferencia]**.

## 3. Diseño de la interfaz con Pencil

- El Pencil abierto en esta sesión tiene otro archivo (`ON SITE 360`, +400 nodos). **No lo tocamos.** Nuestro diseño vive en un archivo nuevo dentro de este repo (`design/interiores.pen`).
- Las skills de diseño instaladas (`onsite-app-design`, `clash-triage-ui`, `ui-ux-modern`, …) son de otros proyectos; el estilo del TP es **propio**, como pidió el equipo.
- Pencil ofrece guías de **Web App**, **Mobile App**, **Design System**, **Tailwind** (v4, que es nuestro stack) y **Code** (generar código desde `.pen`), y estilos como *Blueprint Technical*, *Spatial Plus*, *Soft Bento* y *Product Data Grid* **[verificado]**.
- El editor de Pascal ya trae hojas móviles (`mobile-panel-sheet.tsx`, `bottom-sheet.tsx`) y props `mobileIcon`/`mobileDefaultSnap` por pestaña **[verificado]**: lo responsivo se apoya en eso y el shell propio lo extiende.
- Flujo previsto del spec de shell: (1) sistema de diseño en variables (color, tipografía, radio, elevación, movimiento); (2) pantallas en escritorio, tablet y móvil: acceso, lista de proyectos, editor con tarjeta de ambiente + chips + dock, selector de presets, catálogo, subida de mueble, compartir, galería de renders, exportar; (3) verificación visual por captura; (4) implementación con la guía *Tailwind*; (5) puente de tokens hacia el canvas 3D (el canvas no hereda CSS).

## 4. Material de Victoria: modelos de visión "por 1.000 análisis"

Transcripción de la tabla compartida por el equipo (datos de la investigación de Victoria, **no verificados por nosotros**; los nombres y precios de los modelos hay que confirmarlos en las páginas oficiales):

| Proveedor y modelo | ¿API gratuita? | Costo por 1.000 análisis | Notas de la tabla |
|---|---|---|---|
| Google Gemini 3.8 Flash | Sí, con límites sujetos a proyecto y modelo (se consulta en AI Studio) | US$ 0 dentro de la cuota; ≈ US$ 3,40 hasta el 31/12/2026 y ≈ US$ 6,80 desde el 1/1/2027 | Recibe imágenes, salida estructurada. En el nivel gratuito Google puede usar el contenido para mejorar sus productos. |
| OpenRouter, modelo `:free` con imagen | Sí: 50 solicitudes por día y 20 por minuto; con US$ 10 de crédito sube a 1.000 por día | US$ 0 dentro de la cuota | El modelo gratuito cambia; hay que confirmar que acepte imágenes. Enruta a proveedores externos, así que importa la política de datos de quien atienda. |
| OpenAI GPT-5.4 nano | No asumir cuota gratuita recurrente | ≈ US$ 1,10 | Visión; US$ 0,20/M de entrada y US$ 1,25/M de salida. Los datos de API no se usan para entrenar por defecto; los logs pueden retener contenido hasta 30 días. |
| Mistral Ministral 3 8B | Sin cuota general permanente en la API | ≈ US$ 0,40 | Visión y salida estructurada; US$ 0,15/M de entrada y de salida. La estimación de tokens de la imagen es incierta. |
| Anthropic Claude Haiku 4.5 | Créditos de prueba para algunos usuarios nuevos | ≈ US$ 4,80 | Visión sólida para interpretar objetos, sin promesa de precisión espacial. Una imagen de 1024 × 1024 ≈ 1.296 tokens; US$ 1/M de entrada y US$ 5/M de salida. No usa imágenes de API para entrenar; las cargas son efímeras. |

**Verificación de las cuentas [verificado]:** las cifras pagas cierran con la hipótesis de ≈ 2.300 tokens de entrada (foto incluida) y 500 de salida por análisis: GPT-5.4 nano ≈ 0,46 + 0,63 = US$ 1,09; Ministral ≈ 0,35 + 0,08 = US$ 0,42; Haiku 4.5 = 2,30 + 2,50 = US$ 4,80.

**Observaciones:**
1. **Estos modelos devuelven texto o datos estructurados; no generan imágenes.** Sirven para *entender* una imagen, no para producir el render fotorrealista de la sección 2. Falta aclarar con Victoria qué "análisis" quería resolver.
2. Usos que sí encajan en el proyecto: sugerir nombre, categoría y etiquetas de un mueble subido a partir de su miniatura (slice de subida de muebles), o describir un render guardado. Usos que **no** conviene prometer: medir o reconstruir un espacio desde una foto; la propia tabla advierte que la visión "no promete precisión espacial".
3. **Privacidad:** los niveles gratuitos pueden usar el contenido enviado para mejorar productos o enrutarlo a terceros. Con capturas de proyectos de usuarios reales, usar el nivel pago o datos de demostración.
4. Haiku 4.5 es de la generación anterior de Anthropic; conviene revisar la versión vigente antes de presupuestar.

## 5. Pendiente de verificar

- Qué API investigó Victoria y con qué prueba.
- Precios y límites oficiales vigentes de cada proveedor de render.
- Si podemos agregar escala gráfica al PDF sin reescribir el renderizador de `pdfkit`.
- Si `lib/ifc-export` de `main` compila contra `@pascal-app/core` 1.0.3.
- Que el WebGPU y el render funcionen en la máquina donde se haga el Demo Day.

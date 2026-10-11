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

### Comparativa de proveedores con nivel gratuito (verificada el 2026-10-11)

**Resultado principal: de 13 proveedores revisados, solo Cloudflare Workers AI tiene un nivel gratuito *recurrente* utilizable para editar o generar imágenes. Stability AI regala 25 créditos una única vez (≈ 5 renders). Los demás son de pago.**

Cómo se verificó: dos agentes leyeron las páginas **oficiales** de cada proveedor (precios, límites, términos, pasos de la clave) y marcaron lo que no pudieron confirmar. Los precios y la cuota de Cloudflare los comprobamos además nosotros en su documentación. El resto **no está re-verificado por nosotros**: antes de confiar en una cifra, abrir la página citada. Informes completos: [`F1`](analisis-clases/F1-render-gratuito-parte1.md) y [`F2`](analisis-clases/F2-render-gratuito-parte2.md).

| Proveedor | Modelo recomendable | Imagen de entrada | ¿Gratis real hoy? | Costo al agotarse | Tarjeta | Datos en el nivel gratuito | Verificación |
|---|---|---|---|---|---|---|---|
| **Cloudflare Workers AI** | `flux-2-klein-4b` | Sí, hasta 4 referencias, cada una **menor que 512 × 512**; sin control estructural | **Sí: 10.000 neurons/día** (≈ 91 imágenes de 1024 × 1024 con 1 referencia, cuenta nuestra) | US$ 0,011 por 1.000 neurons (≈ US$ 0,0012 por imagen) | No figura en el alta | No entrena con contenido de clientes (oficial, 21/4/2026) | OFICIAL (tarjeta por omisión) |
| **Stability AI** | `POST /v2beta/stable-image/control/structure` | Sí, **control estructural nativo** (también sketch e image-to-image) | **25 créditos únicos** ≈ 5 renders | 5 créditos = US$ 0,05 por render | Créditos de bienvenida con cuenta Google, según su guía | **Por defecto pueden entrenar** con entradas y salidas; hay opt-out | OFICIAL |
| **Google Gemini** | `gemini-nano-banana-2.1` | Sí, hasta 14 referencias; sin control estructural | **No**: los modelos de imagen figuran "Not available" en el nivel gratuito; hay que activar facturación (prepago mínimo US$ 5) | ≈ US$ 0,034 (1K) | Sí | En gratis, Google usa los datos y hay revisión humana; en pago, no | OFICIAL |
| **OpenRouter** | `flux.2-klein-4b`, Nano Banana 2.1 | Sí | **No** (0 de 61 modelos con salida de imagen son `:free`) | US$ 0,014 por MP / ≈ US$ 0,034 | Sí | Sin log de prompts por defecto | OFICIAL |
| **Together AI** | `FLUX.1-kontext-pro`, `FLUX.2` | Sí, por URL | **No** (primera compra mínima US$ 15) | US$ 0,015 – 0,04 | Sí | Guardan prompts por defecto; hay Zero Data Retention | OFICIAL |
| **Hugging Face** | `FLUX.1-Kontext-dev`, `FLUX.2-klein-9B` vía terceros | Sí | **No** (cuentas free: "None"; PRO US$ 9/mes) | Según el proveedor final | Según el caso | HF dice no guardar ni entrenar | OFICIAL / parcial NV |
| **Replicate** | `flux-kontext`, `flux-depth/canny-pro`, `adirik/interior-design` (≈ US$ 0,009) | Sí | No garantizado: sus docs se contradicen | Pago por uso | Sí | Entradas y salidas se borran a la hora | OFICIAL con contradicción |
| **fal.ai** | `flux-kontext/dev`, klein 4B edit (US$ 0,01/MP) | Sí | Créditos de bienvenida de monto variable que vencen a los 90 días | Pago por uso | Sí | Las salidas son URL **públicas** por defecto | OFICIAL; monto NV |
| **Segmind, Leonardo, Freepik/Magnific** | varios | Sí | **No** documentado | Pago por uso (Segmind: recarga mínima US$ 10) | Sí | — | OFICIAL |
| **NVIDIA NIM** | `flux.1-kontext-dev` | **Solo imágenes predefinidas** (no admite capturas propias) | Prueba con restricciones | — | No | Recolecta contenido para mejorar sus productos; prueba sin uso en producción | OFICIAL → **descartar** |
| **Pollinations** | `flux.2-klein-4b` | Sí | **Ya exige clave** (HTTP 401 sin ella, comprobado el 11/10/2026); solo "Quests" | — | No | Términos NV | OFICIAL → **descartar** |

**Lo que cambió respecto de la investigación anterior:** Gemini ya no tiene nivel gratuito para imagen (los blogs que hablan de "500 por día" están desactualizados); además cerraron o deprecaron varios modelos de imagen entre junio y octubre de 2026, así que **el identificador del modelo debe ser configurable**. Stability cuesta 5 créditos (US$ 0,05) por render según su página oficial, no los 3 de los listados de terceros.

**Recomendación (derivada del cuadro, no es un dato de ningún proveedor):**
1. **Proveedor por defecto y "gratis": Cloudflare + `flux-2-klein-4b`.** Es el único gratuito recurrente. Requiere crear una cuenta en Cloudflare, pero **el plan Free alcanza**: los US$ 5 mensuales corresponden a Workers Paid y solo hacen falta para superar la cuota.
2. **Proveedor de mayor fidelidad estructural: Stability `control/structure`**, que conserva la estructura de la imagen. Sus 25 créditos sirven para probar la integración y comparar; después es de pago.
3. **Adaptadores opcionales de pago:** Gemini (facturación prepaga desde US$ 5), fal.ai o Replicate (`adirik/interior-design` si hay que respetar muros). **No presentar como gratis** a los demás.
4. Si el equipo descarta Cloudflare, **no queda ninguna opción gratuita recurrente**: lo gratuito sería solo la prueba de 25 créditos de Stability y el costo pasaría a cada persona usuaria.

**Límites que hay que probar con capturas reales:**
- Con Cloudflare, las referencias deben ser menores que **512 × 512**: la captura se reduce y se pierde detalle de muebles pequeños. No hay ControlNet ni profundidad: solo imagen de referencia + prompt, así que la fidelidad geométrica **no está garantizada**.
- Con Stability, el control estructural es lo que se busca, pero el costo es de créditos y sus términos permiten entrenar con lo enviado salvo que la persona haga opt-out.

**Pasos para crear la clave (insumo de la guía dentro de la interfaz).** La app necesita **dos datos** para Cloudflare (token y Account ID) y uno para Stability:
- *Cloudflare:* (1) crear cuenta en `dash.cloudflare.com` (correo, contraseña y verificación); (2) abrir `https://dash.cloudflare.com/?to=/:account/ai/workers-ai` y elegir **Use REST API**; (3) **Create a Workers AI API Token** con la plantilla; copiar el token (se muestra una vez); (4) copiar el **Account ID** de la misma pantalla.
- *Stability:* (1) crear cuenta en `platform.stability.ai` (con Google para recibir los 25 créditos); (2) abrir `https://platform.stability.ai/account/keys` y crear la clave; copiarla (se muestra una vez).

**Contrato de Cloudflare `flux-2-klein-4b` (según la documentación oficial leída por el agente):** `multipart/form-data` obligatorio; campos `prompt`, `input_image_0` a `input_image_3`, `width` y `height` (256–1920), `seed`, `guidance`; `steps` fijo en 4; respuesta `{image: <base64>}` (el formato JPEG/PNG y el sobre `result.image` **no están confirmados**).

**No verificado** (hacerlo antes de apoyarse en ello): que el plan Free corra `klein-4b` en una cuenta real; el permiso mínimo del token; si una entrada de exactamente 512 × 512 es admitida; si Stability otorga los 25 créditos sin cuenta Google; los montos de bienvenida de Replicate y fal.ai.

**Decisión del equipo (2026-10-11): soportar solo Cloudflare Workers AI (`flux-2-klein-4b`)**, porque es la única opción gratuita recurrente. Costo asumido: sin alternativa a mano si la fidelidad no alcanza. **Compuerta de entrada al slice:** una prueba de 30 minutos con una captura real del editor (cuenta Free de Cloudflare, token propio, captura reducida a < 512 × 512) para juzgar si muros, aberturas y muebles conservan su lugar. Si no alcanza, se vuelve a decidir con Stability (25 créditos de prueba) como siguiente candidato. La interfaz `RenderProvider` se mantiene para no cerrar esa puerta.

**Nota sobre la tabla de Victoria:** la tabla de Victoria (sección 4) resultó ser de modelos de *visión* y el equipo confirmó que lo que quiere es **render realista**, así que esa tabla no entra en esta decisión.

### Protocolo para decidir con evidencia (30–45 min)
Tomar 3 capturas del editor (una vivienda, un comercio y un cuarto con muebles) y correr cada candidato —incluida la API que investigó Victoria— con el mismo prompt. Puntuar de 1 a 5: fidelidad de muros y aberturas, fidelidad de muebles, realismo de luz y materiales, tiempo, costo. Guardar capturas y tabla: es la evidencia de la decisión para *Qué decidí yo*.

### Reglas de arquitectura (válidas con cualquier proveedor)
- **La clave de API vive solo en `apps/api`** (variable de entorno), nunca en el navegador ni en el repo. Se agrega a las reglas de `deny` de lectura de `.env*`.
- Tabla `renders(id, project_id, owner_id, status, provider, prompt, image_path, created_at)` con RLS por dueño.
- **Cuota por usuario** (p. ej. 5 renders por día): una API paga expuesta sin límite es un riesgo de costo y de abuso.
- Subida de la captura y resultado en Supabase Storage con URL firmada y vencimiento.
- Prompt y capturas son datos del usuario: no incluir información personal en el prompt.
- Estimación de trabajo del slice: **3–5 h** si la API colabora **[inferencia]**.

### ¿Quién aporta la clave de la API de render? (servidor vs. cliente "trae su propia clave")

| | **A. Clave del equipo en el servidor + cuota por usuario** | **B. Cada persona conecta su propia clave (BYOK)** |
|---|---|---|
| Experiencia | Un clic en "Renderizar". | La persona debe tener cuenta y clave en el proveedor y pegarla en Ajustes. |
| Demo Day / corrector | **Funciona sin que nadie traiga nada.** | Quien evalúa no ve un render si no tiene una clave propia. |
| Costo y abuso | Lo asume el equipo; se acota con cuota (p. ej. 5 por día) y límite de tamaño. | Lo asume cada persona; no hay abuso sobre la cuenta del equipo. |
| Seguridad | Una clave, solo en `apps/api`. Superficie chica. | Hay que **guardar secretos de terceros**: cifrado en reposo (p. ej. Supabase Vault), RLS, no devolver nunca la clave al navegador, rotación y borrado. Más superficie de ataque. |
| Proveedores | Uno (el elegido). | Varios, si se abstrae el proveedor. |
| Trabajo | Bajo. | Un slice extra: tabla de integraciones, pantalla de ajustes, cifrado, validación de la clave y pruebas. |
| Qué demuestra para el curso | Manejo de secretos y de costo en servidor (clase 06: credenciales y alcance). | Lo mismo, pero con más riesgo y más para defender. |

**Decisión del equipo (2026-10-11): B (BYOK).** Cada persona conecta su propia clave; la interfaz explica cómo crearla, la guarda de forma segura y todo queda documentado. Mi recomendación inicial era A (clave del equipo), por el riesgo de que quien evalúa no tenga una clave; el equipo prefirió B porque el manejo y la documentación de claves es parte de lo que quiere mostrar. El riesgo se mitiga cargando una clave gratuita del equipo en la cuenta de demostración por el mismo flujo, y con renders previos guardados en el proyecto de demo.

Diseño de seguridad, modelo de amenazas, contrato y requisitos de interfaz: [`seguridad-claves-byok.md`](seguridad-claves-byok.md). Reglas que no cambian: una interfaz `RenderProvider` en `apps/api` para cambiar de proveedor sin tocar el resto, y **nunca** llamar al proveedor desde el navegador con una clave (la mayoría no permite CORS y la clave quedaría expuesta a cualquier script de la página).

Como cada persona usa su propio nivel gratuito, **el criterio de elección pasa a ser** qué proveedores tienen un gratis real, una clave fácil de crear y condiciones de datos aceptables; ver la comparativa de la sección 2.

**Sobre el costo de Cloudflare:** los US$ 5 por mes son el plan **Workers Paid**. Según la [página de precios](https://developers.cloudflare.com/workers-ai/platform/pricing/) (act. 9/10/2026), Workers AI está **incluido en el plan Workers Free** con 10.000 neurons por día sin cargo; lo único que ese plan no permite es superar la cuota. Aun así, si no quieren abrir cuenta ahí, los candidatos de pago cuestan centavos por imagen y alcanzan con un **prepago único** de pocos dólares (monto mínimo a confirmar en cada proveedor), no una suscripción.

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

# F1 - Render realista con IA: proveedores con nivel gratuito (parte 1)

Fecha de la investigación: 2026-10-11. Alcance: Google Gemini API, Stability AI, Hugging Face Inference Providers, OpenRouter, Together AI.
Caso de uso: BYOK (cada persona crea su propia clave), captura de la vista 3D como imagen de entrada, salida fotorrealista que conserve la distribución.

Metodología: páginas oficiales leídas con WebFetch y, cuando la página es una SPA que WebFetch no renderiza (platform.stability.ai, OpenRouter, Together docs), leídas con el navegador integrado en modo solo lectura (sin registro, sin crear cuentas ni claves, sin descargas). El contenido web se trató como dato. Donde WebSearch devolvió algo que contradice la página oficial, se prefirió la página oficial y se anota la contradicción.

Escala de "Nivel de verificación": OFICIAL = leído en la página del propio proveedor; TERCERO = blog/foro/agregador; NO VERIFICADO = no pude confirmarlo.

---

## CONCLUSIÓN RÁPIDA (leer primero)

1. A 2026-10-11 NINGUNO de los cinco proveedores ofrece un nivel gratuito recurrente para generación/edición de imagen que sirva para este caso.
   - Gemini API: todos los modelos de imagen figuran como "Not available" en el nivel gratuito (OFICIAL, pricing actualizado 2026-10-09).
   - Hugging Face: cuentas gratuitas tienen "None" de créditos mensuales; hay que comprar créditos o pasar a PRO (OFICIAL).
   - OpenRouter: no existe ningún modelo `:free` con salida de imagen (consulté la API en vivo: 0 de 61 modelos de imagen).
   - Together AI: "no ofrece pruebas gratuitas"; mínimo USD 15 en la primera compra (OFICIAL).
   - Stability AI: único con algo gratis, pero es una dotación ÚNICA de 25 créditos (no se renueva) = unos 5 renders con Control Structure (OFICIAL).
2. Las guías de terceros que dicen "Gemini da ~500 imágenes/día gratis" (WebSearch, blogs de febrero 2026) están desactualizadas o contradichas por la página oficial de precios actual. No usarlas.
3. Si el equipo quiere BYOK con costo mínimo para la persona usuaria, lo más barato y simple por render hoy es: Gemini `gemini-nano-banana-2.1` a USD 0,0336 por imagen 1K (requiere billing Tier 1 con prepago mínimo USD 5) o Stability Control Structure a USD 0,05 por imagen (25 créditos gratis de prueba, luego USD 1 = 100 créditos). Ver tabla final.
4. Riesgo transversal: rotación rápida de IDs de modelo (Gemini deprecó/cerró varios en 2026; Together cerró FLUX.1 Kontext dev y schnell). Hacer el ID de modelo configurable y no hardcodeado.
5. Seguridad BYOK (de la documentación oficial de Google): no poner la clave en el frontend; guardarla cifrada en el backend (Fastify) y llamar al proveedor desde el servidor.

---

## 1) Google Gemini API / Google AI Studio

### Modelos concretos recomendables
- `gemini-nano-banana-2.1` (Nano Banana 2.1): GA desde 2026-10-06, recomendado por Google para proyectos nuevos. OFICIAL.
- `gemini-3.1-flash-lite-image` (Nano Banana 2 Lite): GA desde 2026-06-30, el más barato, solo 1K, "no optimizado" para múltiples referencias ni edición multi-turno. OFICIAL.
- `gemini-3-pro-image` (Nano Banana Pro): GA desde 2026-05-28, el más caro, hasta 4K. OFICIAL.
- `gemini-3.1-flash-image` (Nano Banana 2): deprecado el 2026-10-06 (sin fecha de cierre anunciada). Evitar para proyectos nuevos. OFICIAL (changelog).
- `gemini-2.5-flash-image` (Nano Banana original): marcado "deprecated", cierre anunciado para 2026-10-02 (la fecha ya pasó respecto de hoy; asumir no disponible). OFICIAL (pricing).
- Imagen 4 (`imagen-4.0-*`): cerrado el 2026-08-17. Previews `gemini-3.1-flash-image-preview` y `gemini-3-pro-image-preview`: cerrados el 2026-06-25. OFICIAL (changelog).

### ¿Acepta imagen de entrada (edición)?
Sí. Se envía la imagen en base64 más el texto; hasta 14 imágenes de referencia en total (objetos: 14 Lite, 10 en 2.1/3.1 Flash, 6 en Pro). La guía oficial recomienda frases del tipo "mantené todo lo demás igual, preservando estilo, iluminación y composición" y listar explícitamente qué debe quedar sin cambios. Tamaño máximo de la imagen de entrada: no consta. OFICIAL.
No hay "control estructural" formal (tipo ControlNet): la conservación de la distribución depende del prompt y del modelo, no de un parámetro. Hay que probarlo con capturas reales. (Inferencia mía, marcada.)

### Nivel gratuito exacto
- Imagen: NO HAY. Todos los modelos de imagen muestran "Not available" para entrada y salida en el Free Tier, incluidas las secciones Batch/Flex/Priority. Verificado por duplicado: WebFetch y lectura directa de la tabla HTML en el navegador (tabla de Nano Banana 2.1: Free Tier "Not available"; "Used to improve our products": Yes en gratis / No en pago). OFICIAL.
- La página de rate limits (actualizada 2026-10-09) define el nivel "Free" como "proyecto activo o prueba gratuita" y no publica números de IPM/RPM para modelos de imagen. Los límites se miden por proyecto (no por clave); RPD se reinicia a medianoche hora del Pacífico. OFICIAL.
- Para pasar a pago: configurar billing en AI Studio ("Set up billing"). La página de billing (actualizada 2026-09-28) dice que pasar de gratis a pago implica vincular una cuenta de facturación y prepagar mínimo USD 5; algunos usuarios pueden recibir pospago. OFICIAL.
- Tier 1 = billing activo vinculado, tope USD 250. OFICIAL.
- ¿Tarjeta/verificación? Crear la clave no pide tarjeta según la documentación; usar imagen exige billing (método de pago). No consta explícitamente "tarjeta" en la página, solo "cuenta de facturación y método de pago". OFICIAL parcial.
- Footnote de la página de precios: "Can be tested in Google AI Studio" aparece junto a funciones de grounding; si el uso gratuito de imagen en la interfaz web de AI Studio existe hoy, NO LO VERIFIQUÉ y de todos modo no aplica a llamadas por API/clave. NO VERIFICADO.

### Precio (nivel pago)
- Nano Banana 2.1: USD 0,0336 (1K), 0,0504 (2K), 0,113 (4K) por imagen; Batch la mitad. OFICIAL.
- Nano Banana 2 Lite: USD 0,0336 por 1K. OFICIAL.
- Nano Banana Pro: USD 0,134 (1K/2K), 0,24 (4K). OFICIAL.

### Resolución máxima
1K, 2K y 4K (usar "K" mayúscula; minúscula se rechaza). 0.5K solo en 3.1 Flash Image. Lite: solo 1K. Todas las imágenes llevan marca SynthID. Aspect ratios: la página lista varios (1:1, 3:2, 16:9, 21:9, etc.); lista completa por modelo no consta. OFICIAL.

### Política de datos
- Nivel gratuito ("Unpaid Services"): Google usa los prompts y respuestas para mejorar productos y tecnologías de ML; revisores humanos pueden leer, anotar y procesar entradas y salidas (desconectadas de cuenta/clave/proyecto); "no envíes información sensible, confidencial o personal". OFICIAL (términos, vigentes desde 2026-03-23, página actualizada 2026-04-28).
- Nivel de pago ("Paid Services"): no se usa para mejorar productos; se registra por tiempo limitado solo para prevención de abuso/seguridad/legal. OFICIAL.
- Para EEE, Suiza y Reino Unido: solo se pueden usar Paid Services al poner el cliente API a disposición de usuarios de esas regiones, y rigen los términos de pago para todos los servicios. OFICIAL.
- Edad mínima 18 años; además no usar un cliente API dirigido a menores de 18. OFICIAL.

### Pasos para crear la API key (ver nota de billing)
1. Entrar a https://aistudio.google.com/apikey con cuenta Google (la persona debe hacerlo ella misma).
2. Clic en "Create API key" (si no aparece su proyecto Cloud, importarlo desde Dashboard > Projects > Import projects). Fuente: https://ai.google.dev/gemini-api/docs/api-key
3. Copiar la clave y guardarla en un gestor/variable de entorno; la doc recomienda restringir la clave a la Gemini API y poner alertas de billing.
4. Para que ande la imagen: en la misma página de AI Studio (API keys o Projects), clic en "Set up billing" en la columna Billing Tier del proyecto; elegir país y método de pago; prepagar mínimo USD 5 (o pospago si se lo ofrecen). Fuente: https://ai.google.dev/gemini-api/docs/billing
(Los pasos 1-3 son OFICIAL; el paso 4 es OFICIAL en la doc de billing.)

### ¿Hay que habilitar facturación para imagen?
Sí, según la página oficial de precios (free tier "Not available" para todos los modelos de imagen). No probé una llamada real (prohibido crear claves), por lo que el mensaje de error exacto al llamar sin billing es NO VERIFICADO.

### Endpoint
La guía oficial de imagen actual usa `POST https://generativelanguage.googleapis.com/v1beta/interactions` con `"model": "gemini-nano-banana-2.1"` y `response_format` con `aspect_ratio`/`image_size` (SDK JS: `ai.interactions.create`). Si el viejo `generateContent` sigue aceptando los modelos de imagen: NO VERIFICADO (la página de imagen no lo menciona). OFICIAL para lo primero.

### Riesgos
- Cambio de cuota: la propia gente de blogs reporta recortes del free tier en diciembre de 2025 (TERCERO); hoy es cero para imagen (OFICIAL).
- Rotación de modelos muy rápida en 2026 (ver lista de deprecaciones). Usar ID configurable.
- Sin parámetro de control estructural: la fidelidad de la distribución no está garantizada.
- Región: Argentina, Perú, España, México, Chile, Colombia y Uruguay figuran como disponibles (página actualizada 2026-04-28). OFICIAL. Para usuarios en EEE/UK/CH hay obligación de usar solo servicios de pago.
- Marca SynthID en todas las salidas.

### URLs consultadas (fecha de la página)
- https://ai.google.dev/gemini-api/docs/pricing (Last updated 2026-10-09 UTC)
- https://ai.google.dev/gemini-api/docs/rate-limits (2026-10-09)
- https://ai.google.dev/gemini-api/docs/image-generation (2026-10-09)
- https://ai.google.dev/gemini-api/docs/billing (2026-09-28)
- https://ai.google.dev/gemini-api/docs/api-key (2026-10-06)
- https://ai.google.dev/gemini-api/terms (efectivo 2026-03-23; página 2026-04-28)
- https://ai.google.dev/gemini-api/docs/available-regions (2026-04-28)
- https://ai.google.dev/gemini-api/docs/changelog (entradas hasta 2026-10-08)

### Nivel de verificación: OFICIAL (el dato central "sin free tier para imagen" confirmado dos veces). Terceros (blogs laozhang, zenmux, etc.) solo se usaron para detectar la contradicción histórica y se descartan.

---

## 2) Stability AI (platform.stability.ai)

### Modelos / endpoints concretos recomendables
Referencia oficial v2beta (https://platform.stability.ai/docs/api-reference, leída en el navegador):
- Control Structure (recomendado para conservar la distribución): `POST https://api.stability.ai/v2beta/stable-image/control/structure`
  - Campos multipart/form-data: `image` (requerido), `prompt` (requerido, 1-10000 caracteres), `control_strength` (0-1, default 0.7), `negative_prompt`, `seed` (0-4294967294), `output_format` (jpeg/png/webp, default png), `style_preset`.
  - Imagen de entrada: jpeg/png/webp; cada lado >= 64 px; total de píxeles entre 4.096 y 9.437.184; relación de aspecto entre 1:2,5 y 2,5:1; solicitud máx. 10 MiB (413 si se excede).
  - Salida: misma resolución que la imagen de entrada.
  - Costo: 5 créditos por generación exitosa; no se cobran las fallidas.
  - Header `Authorization: Bearer <clave>`; `Accept: image/*` (bytes) o `application/json` (base64).
- Control Sketch: `POST /v2beta/stable-image/control/sketch` (5 créditos; mismos parámetros clave). Pensado para bocetos o para usar contornos/bordes de cualquier imagen.
- Control Style (Style Guide): `/v2beta/stable-image/control/style` (5 créditos) y Style Transfer: `/v2beta/stable-image/control/style-transfer` (8 créditos). No sirven para conservar la estructura.
- Image-to-image con SD 3.5: `POST /v2beta/stable-image/generate/sd3` con `mode=image-to-image`, `image`, `prompt`, `strength` (0-1; 0 = idéntica a la entrada, 1 = ignora la imagen), `model` (sd3.5-large 6,5 créditos; large-turbo 4; medium 3,5; flash 2,5 — la doc sugiere strength 0,94-0,97 para Flash en i2i), `cfg_scale`, `negative_prompt`, `seed`, `output_format`. Salida de 1 MP. (Detalle: la doc lista "sd3.5-flash" en el texto pero el enum del parámetro `model` muestra solo large, large-turbo y medium; verificar contra el spec OpenAPI antes de codificar.)
- Stable Image Ultra (`/v2beta/stable-image/generate/ultra`) también admite `image` + `strength` (8 créditos, 1 MP) y Core (3 créditos) solo texto.
Todo OFICIAL.

### ¿Acepta imagen de entrada?
Sí: Control Structure (control estructural real), Control Sketch (bordes/contornos), image-to-image (SD3.5 y Ultra con `strength`). Es el único proveedor de los cinco con endpoint de control estructural nativo documentado. OFICIAL.

### Nivel gratuito exacto
- 25 créditos gratis de bienvenida. La página de precios dice "Get started with 25 free credits"; la guía Getting Started dice que crear la cuenta con el login social de Google "otorga 25 créditos gratis" (la doc no aclara si con usuario/contraseña también se otorgan). Es una dotación ÚNICA, no hay renovación mensual documentada. OFICIAL.
- 1 crédito = USD 0,01; se compran a USD 1 por 100 créditos en el Billing dashboard. Los créditos premium no vencen (KB). OFICIAL.
- Equivalencia (cálculo mío con precios oficiales): 25 créditos = 5 renders con Control Structure, o 10 con SD3.5 Flash i2i.
- Rate limit: 150 solicitudes cada 10 segundos; excederlo da 429 y bloqueo de 60 segundos. OFICIAL.
- Tarjeta: la documentación no menciona que se pida tarjeta para recibir los 25 créditos; para créditos adicionales se compra en Billing. Verificación telefónica/otra: NO VERIFICADO.

### Resolución máxima
- Control Structure/Sketch: igual a la entrada; límite de entrada 9.437.184 píxeles (p. ej. 3072x3072). Si se garantiza la salida completa hasta ese tamaño: NO VERIFICADO (la doc solo dice "match that of the input").
- SD3.5 y Ultra: 1 MP (1024x1024 por defecto). Core: 1,5 MP. OFICIAL.

### Política de datos (nivel gratuito = misma política que pago; no hay distinción)
- Términos (efectivos 2026-09-30, sección 4): Stability puede usar el Contenido (entradas y salidas) para mejorar y desarrollar los Servicios; las personas usuarias pueden optar por NO permitir el uso de sus entradas/salidas para entrenar modelos (opt-out). Sección 4(a): se conserva la propiedad del contenido y de las salidas ("hasta donde lo permita la ley").
- Política de privacidad (efectiva 2026-09-30): puede usar entradas y salidas para I+D, incluido entrenar, afinar y evaluar modelos; opt-out vía Account Settings / privacy center; sin período fijo de retención para entradas/salidas de la API.
- Implicancia: por defecto sí pueden entrenar con lo que se envía hasta que la persona haga el opt-out. Para BYOK, avisar en la UI y guiar el opt-out. OFICIAL (leído vía WebFetch; el texto completo de la sección 4 conviene releerlo antes de lanzar).
- Edad mínima 18 (servicios no-audio); sección 12(j): acceso vedado en países/territorios bajo embargo de EE. UU. Mercados LATAM/España: sin restricción específica encontrada. OFICIAL.
- Las salidas llevan firma C2PA (release notes 2025-04-01). OFICIAL.
- Uso comercial de salidas permitido si no infringen derechos (FAQ). OFICIAL.

### Pasos para crear la API key (hacerlos la propia persona)
1. Crear la cuenta en https://platform.stability.ai (botón Login; con Google para recibir los 25 créditos según la guía). Fuente: https://platform.stability.ai/docs/getting-started
2. Ir a la página de claves https://platform.stability.ai/account/keys y crear una API key (copiar y guardar; si se filtra, crear una nueva y borrar la vieja).
3. Ver/comprar créditos en https://platform.stability.ai/account/credits (Billing). Saldo por API: `GET https://api.stability.ai/v1/user/balance`.
(La URL de claves y Billing salen de los enlaces de la propia documentación; el flujo exacto de la UI de login no lo recorrí. OFICIAL.)

### ¿Hay que habilitar facturación?
No para gastar los 25 créditos de bienvenida. Sí (comprar créditos) para seguir; no hay plan de facturación mensual, es prepago por créditos. OFICIAL.

### Riesgos
- Dotación gratuita única y pequeña (5 renders): sirve para probar, no como "nivel gratuito real" sostenido.
- Precios cambiables: la propia página dice "subject to change"; hubo alza de precios el 2025-08-01 y descontinuaciones (SD 1.6, Stable Video) el 2025-07-24. OFICIAL.
- Control Structure conserva la estructura de bordes/profundidad pero re-sintetiza texturas y puede alterar detalles de muebles según `control_strength`; hay que calibrar. (Inferencia mía; no medida.)
- Moderación de contenido (403 si el filtro lo marca). OFICIAL.
- El nombre en la UI de precios es "Structure/Sketch/Style Guide/Style Transfer"; en el pricing de agosto 2025 figuraba "Control Structure/Style". Cuidar nombres en el código.
- Modelo de datos: entrenan por defecto salvo opt-out (ver arriba).

### URLs consultadas (fecha de la página)
- https://platform.stability.ai/docs/api-reference (sin fecha; © 2026; incluye OpenAPI descargable)
- https://platform.stability.ai/pricing (sin fecha; © 2026)
- https://platform.stability.ai/docs/getting-started (sin fecha)
- https://platform.stability.ai/faq (sin fecha)
- https://platform.stability.ai/docs/release-notes (última entrada: 2026-05-20)
- https://stability.ai/api-pricing-update-25 (2025-07-09; vigente desde 2025-08-01)
- https://stability.ai/terms-of-service (efectivo 2026-09-30)
- https://stability.ai/privacypolicy (efectivo 2026-09-30)
- https://kb.stability.ai/knowledge-base/credit-usage-across-our-products (© 2025)

### Nivel de verificación: OFICIAL (ruta del endpoint, parámetros, créditos y límites leídos de la referencia de API renderizada). Términos/privacidad: OFICIAL pero vía resumen de WebFetch. Terceros (puter.com, costbench, etc.) solo para contraste.

---

## 3) Hugging Face Inference Providers

### Modelos concretos recomendables (image-to-image / edición)
La página oficial de la tarea image-to-image (https://huggingface.co/docs/inference-providers/tasks/image-to-image) recomienda:
- `black-forest-labs/FLUX.1-Kontext-dev` (edición potente). En la tarjeta del modelo, el widget de Inference Providers lista solo "fal"; Together aparece en la sección de API endpoints pero Together cerró su Kontext dev el 2026-02-25 (ver sección 5). OFICIAL.
- `kontext-community/relighting-kontext-dev-lora-v3` (re-iluminación). OFICIAL.
- El mapeo de ejemplo de la doc usa `black-forest-labs/FLUX.2-klein-9B` con proveedores fal-ai (`fal-ai/flux-2/klein/9b/edit`), replicate y wavespeed (`wavespeed-ai/flux-2-klein-9b/edit`). Soporta edición de una o varias referencias en un solo modelo, destilado a 4 pasos. OFICIAL.
- Proveedor `hf-inference` (el propio de HF): hoy es sobre todo CPU; solo texto-a-imagen con SD3 medium; sin image-to-image. OFICIAL.
- No hay endpoint de "control estructural" (Canny/Depth/ControlNet) en la documentación de tareas de Inference Providers. NO VERIFICADO que no exista en modelos individuales; no aparece en la doc.
Licencias: FLUX.1 Kontext [dev] y FLUX.2 klein 9B usan la licencia FLUX no comercial (acceso con aceptación de licencia y política de uso). La tarjeta de Kontext dev dice que las salidas generadas pueden usarse con fines personales, científicos y comerciales, pero el texto completo de la licencia no se leyó. Para un proyecto estudiantil probablemente sin problema; revisar si se comercializa. OFICIAL parcial.

### ¿Acepta imagen de entrada?
Sí, tarea `image-to-image`: payload `inputs` = imagen en base64 (o bytes crudos si no hay `parameters`); `parameters`: `prompt`, `guidance_scale`, `negative_prompt`, `num_inference_steps`, `target_size {width,height}` (solo algunos proveedores). Respuesta: bytes de imagen. El token va como `Authorization: Bearer hf_...`. Recomendado usar los clientes oficiales (JS `@huggingface/inference` o Python `huggingface_hub`) porque cada proveedor tiene formato propio detrás del router `router.huggingface.co`. OFICIAL.

### Nivel gratuito exacto
- Cuentas gratuitas: "Monthly Credits: None". Los usuarios gratuitos pueden usar Inference Providers solo comprando créditos o pasando a PRO. Verificado dos veces (WebFetch y lectura de la tabla en el navegador). OFICIAL.
- PRO: USD 2,00 de créditos mensuales (USD 9/mes según huggingface.co/pricing); Team/Enterprise USD 2,00 por asiento; consumo extra a tarifa de pago por uso sin recargo de HF (tarifa del proveedor). Los créditos mensuales solo aplican en modo "Routed by Hugging Face" (no con clave propia de proveedor). OFICIAL.
- Una búsqueda web devolvió un resumen que decía "USD 0,10 mensuales para usuarios gratuitos"; contradice la página oficial actual. Es una cifra histórica/TERCERO desactualizada: no usar.
- Tarjeta: para comprar créditos o PRO se requiere método de pago (el detalle de la UI de compra no lo recorrí). Parcialmente NO VERIFICADO.
- Rate limits específicos de imagen: no publicados en estas páginas. NO VERIFICADO.

### Resolución máxima
No consta de forma general (depende del proveedor/modelo; los ejemplos usan 1024x1024; `target_size` es opcional y solo en algunos proveedores). NO VERIFICADO.

### Política de datos
- HF: "no almacena datos de usuario para entrenamiento", no guarda cuerpo de petición ni respuesta al enrutar; guarda logs de depuración hasta 30 días sin datos de usuario ni tokens. Para el tratamiento real hay que ver la política de cada proveedor externo (fal, Replicate, WaveSpeed, etc.), que no revisé. OFICIAL (HF) / NO VERIFICADO (proveedores).

### Pasos para crear el token (la persona los hace ella misma)
1. Crear cuenta en https://huggingface.co/join (o iniciar sesión).
2. Cargar crédito o suscribirse a PRO desde https://huggingface.co/settings/billing (los usuarios gratuitos no tienen créditos incluidos). Fuente: https://huggingface.co/docs/inference-providers/pricing
3. Crear un token "fine-grained" con el permiso "Make calls to Inference Providers": https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained (fuente: https://huggingface.co/docs/inference-providers/index). Tipos de token y gestión: https://huggingface.co/docs/hub/security-tokens
4. Para Kontext dev/FLUX.2 klein 9B: aceptar la licencia del modelo en su tarjeta si está "gated" (Kontext dev lo está).
OFICIAL.

### ¿Hay que habilitar facturación?
Sí en la práctica: sin créditos incluidos, una cuenta gratuita necesita comprar créditos (o PRO) para llamar a modelos de imagen vía proveedores. OFICIAL.

### Riesgos
- No hay nivel gratuito (históricamente existía un mínimo; hoy "None").
- Precio por imagen depende del proveedor elegido (no relevé precios por modelo): NO VERIFICADO.
- Disponibilidad por proveedor cambia (p. ej. Kontext dev: fal sí, Together cerrado).
- Nuevas licencias no comerciales en modelos FLUX dev/klein-9B.
- Formato de petición varía por proveedor detrás del router; usar el cliente oficial.

### URLs consultadas (fecha de la página)
- https://huggingface.co/docs/inference-providers/pricing (sin fecha)
- https://huggingface.co/docs/inference-providers/index (sin fecha)
- https://huggingface.co/docs/inference-providers/tasks/image-to-image (sin fecha)
- https://huggingface.co/docs/inference-providers/security (sin fecha)
- https://huggingface.co/docs/inference-providers/providers/{fal-ai, hf-inference, wavespeed} (sin fecha)
- https://huggingface.co/docs/hub/security-tokens (sin fecha)
- https://huggingface.co/pricing (sin fecha)
- https://huggingface.co/black-forest-labs/FLUX.2-klein-9B y .../FLUX.1-Kontext-dev (tarjetas de modelo)

### Nivel de verificación: OFICIAL para créditos, tarea image-to-image, token y política de HF. NO VERIFICADO para precios por proveedor, resolución y políticas de datos de proveedores.

---

## 4) OpenRouter

### Modelos con salida de imagen
Consulté la API pública en vivo (https://openrouter.ai/api/v1/models?output_modalities=image, 2026-10-11): 61 modelos con salida de imagen. Relevantes para este caso (entrada texto+imagen, salida imagen):
- `google/gemini-nano-banana-2.1` (proveedor Google AI Studio): hasta 14 referencias, resoluciones 1K/2K/4K; precio de salida USD 30 por millón de tokens de imagen (igual que Google: ≈ USD 0,0336 por 1K). OFICIAL.
- `google/gemini-3.1-flash-lite-image`, `google/gemini-3.1-flash-image`, `google/gemini-3-pro-image`, `google/gemini-2.5-flash-image`. OFICIAL.
- `black-forest-labs/flux.2-klein-4b`: USD 0,014 por megapíxel de salida, hasta 4 imágenes de referencia, relaciones de aspecto 1:1, 4:3, 3:4, 3:2, 2:3, 16:9, 9:16, 21:9; salida png/jpeg. OFICIAL.
- Otros: `black-forest-labs/flux.2-pro/-flex/-max`, `openai/gpt-image-2` y `gpt-image-1`, `bytedance-seed/seedream-4.5`, `qwen/qwen-image-3`, `krea/*`, `recraft/*`, etc.
- Ningún modelo de la lista es de "control estructural".

### ¿Existe alguno gratuito con generación/edición de imagen?
- Modelos con ID terminado en `:free`: hay 15 aprox. en el catálogo completo (659 modelos) y NINGUNO tiene salida de imagen (solo texto, embeddings, voz, rerank, "decisions"). OFICIAL (API en vivo).
- Dos modelos de imagen con precio USD 0 (sin sufijo `:free`), servidos por Novita: `inclusionai/ming-image-0.1-design` (solo texto a imagen, orientado a diseño gráfico con texto legible) e `inclusionai/ming-image-0.1-design-layer` (imagen a imagen, pero descompone un diseño plano en capas RGBA). NO sirven para render fotorrealista que conserve la distribución. El precio 0 puede ser promocional (modelos de 2026-09-22); si les aplican los límites de los `:free`: NO VERIFICADO. OFICIAL (datos del catálogo).

### ¿Acepta imagen de entrada?
Sí, con el endpoint dedicado de imágenes `POST https://openrouter.ai/api/v1/images` (parámetros `model`, `prompt`, `input_references` [lista de imágenes en URL http(s) o data URL base64; la cantidad depende del proveedor], `resolution` [512/768/1K/1.5K/2K/4K], `aspect_ratio`, `size`, `quality`, `output_format`, `n` 1-10). Respuesta: base64 en `b64_json` con `media_type` y `usage.cost`. Descubrimiento de modelos: `GET /api/v1/images/models` y `/api/v1/images/models/{id}/endpoints`. OFICIAL (documentación de Image Generation, sin fecha).

### Nivel gratuito exacto (modelos `:free` de texto; NO aplica a imagen)
- Menos de 10 créditos comprados (acumulado): 20 solicitudes/minuto y 50/día. Con al menos 10 créditos: 20/min y 1.000/día. Superar da 429. Con saldo negativo puede haber 402 incluso en modelos gratuitos. BYOK no está sujeto al tope diario. OFICIAL (https://openrouter.ai/docs/api-reference/limits, sin fecha).
- FAQ: "pequeña dotación gratuita para probar OpenRouter". OFICIAL.
- Tarjeta: crear una clave no exige saldo según la doc de autenticación; los modelos de imagen de pago exigen créditos comprados (tarjeta, AliPay o USDC). La FAQ dice que las claves se crean tras agregar créditos, y la doc de autenticación no fija un mínimo: ligera inconsistencia entre páginas. OFICIAL parcial.

### Resolución máxima
Según el modelo: hasta 4K (Nano Banana 2.1); FLUX.2 klein 4B se factura por megapíxel (el máximo no consta). OFICIAL parcial.

### Política de datos
- Metadatos básicos siempre (marca de tiempo, modelo, cantidad de tokens). Prompts y respuestas NO se registran por defecto (FAQ); activarlo da 1% de descuento. OFICIAL.
- Hay ajustes de cuenta separados para modelos de pago y gratuitos sobre enrutar a proveedores que puedan entrenar con los datos; OpenRouter "intenta" excluirse del entrenamiento donde puede, pero algunos proveedores pueden entrenar (términos, sección 6, actualizados 2026-08-31). La política de cada proveedor está en una tabla dinámica que no se pudo leer. OFICIAL / NO VERIFICADO para el detalle por proveedor.
- Edad mínima 18; restricciones regionales provienen de cada proveedor de modelo (sección 5.7). OFICIAL.

### Pasos para crear la API key
1. Crear cuenta/iniciar sesión en https://openrouter.ai (la persona lo hace ella misma).
2. Agregar créditos desde la configuración de créditos de la cuenta (la doc no da la URL exacta en las páginas leídas; la ruta típica es https://openrouter.ai/settings/credits: NO VERIFICADO).
3. Crear la clave en https://openrouter.ai/keys (gestionar en https://openrouter.ai/settings/keys): nombre y límite de crédito por clave (la doc recomienda poner siempre un límite). Fuente: https://openrouter.ai/docs/api-reference/authentication
OFICIAL (pasos 1 y 3); paso 2 NO VERIFICADO.

### ¿Hay que habilitar facturación?
Para cualquier modelo de imagen existente (salvo los dos Ming de USD 0, que no sirven): sí, comprar créditos.

### Riesgos
- No hay opción gratuita utilizable para este caso.
- Catálogo muy cambiante (se agregaron modelos nuevos en septiembre-octubre 2026).
- Capa intermedia: posibles cargos por compra de créditos (no leí el monto: NO VERIFICADO) y aplica la política de datos del proveedor final.
- `input_references` por proveedor: FLUX.2 klein 4B hasta 4; Nano Banana 2.1 hasta 14.

### URLs consultadas (fecha de la página)
- https://openrouter.ai/api/v1/models?output_modalities=image y ?output_modalities=all (consulta en vivo 2026-10-11)
- https://openrouter.ai/docs/features/multimodal/image-generation (sin fecha)
- https://openrouter.ai/docs/api-reference/limits (sin fecha)
- https://openrouter.ai/docs/faq (sin fecha)
- https://openrouter.ai/docs/features/privacy-and-logging (sin fecha)
- https://openrouter.ai/docs/api-reference/authentication (sin fecha)
- https://openrouter.ai/terms (Last Updated 2026-08-31)

### Nivel de verificación: OFICIAL (catálogo y precios consultados en la API pública del propio proveedor; docs oficiales). NO VERIFICADO: URL de compra de créditos, política de datos por proveedor, límites aplicables a los modelos Ming de USD 0.

---

## 5) Together AI

### Modelos concretos recomendables (edición con imagen de entrada)
Lista oficial de modelos de imagen serverless (https://docs.together.ai/docs/serverless-models, 26 modelos):
- `black-forest-labs/FLUX.1-kontext-pro` (edición mediante `image_url`; USD 0,04 por megapíxel, 28 pasos por defecto) y `black-forest-labs/FLUX.1-kontext-max` (USD 0,08/MP). OFICIAL.
- `black-forest-labs/FLUX.2-pro` (USD 0,03 por imagen), `FLUX.2-dev` (USD 0,0154 por imagen; solo `reference_images`), `FLUX.2-flex` (USD 0,03), `FLUX.2-max` (USD 0,070/MP). Soportan múltiples referencias. OFICIAL (pricing, sin fecha).
- Modelos de Google vía Together (`google/flash-image-2.5`, `google/gemini-3-pro-image`, `google/flash-image-3.1`, `google/flash-image-3.1-lite`) con `reference_images`. OFICIAL.
- No hay modelo de control estructural vigente: FLUX.1 Canny/Depth/Redux se retiraron el 2025-08-28. OFICIAL.

### ¿Existe aún algún modelo FLUX gratuito?
No. `FLUX.1-schnell-free` figura retirado el 2025-12-23; `FLUX.1-schnell` retirado el 2026-08-19; `FLUX.1-dev` y `FLUX.1 Kontext dev` retirados el 2026-02-25. La lista de 26 modelos de imagen no marca ninguno como Free. En la página de precios los únicos "gratis" son modelos de texto. OFICIAL (docs.together.ai/docs/deprecations y serverless-models).

### ¿Acepta imagen de entrada (img2img/edición)?
Sí:
- `image_url` (string, UNA imagen por URL): FLUX.1 Kontext pro/max y FLUX.2 pro/flex.
- `reference_images` (lista de URLs): FLUX.2 pro/dev/flex y los modelos de Google.
Endpoint: `POST https://api.together.ai/v1/images/generations`. Los ejemplos de la doc usan URLs públicas; si se aceptan data URLs/base64 como entrada: NO VERIFICADO (relevante para subir capturas). `response_format: "base64"` devuelve el resultado como `b64_json`. OFICIAL.

### Nivel gratuito exacto / créditos iniciales
- "Together AI no ofrece actualmente pruebas gratuitas. El acceso a la plataforma requiere una compra mínima de USD 15 en créditos." Mínimo USD 15 en la primera compra de la organización y USD 5 en las siguientes. Prepago total; saldo cero = acceso suspendido; los créditos no vencen. OFICIAL (https://docs.together.ai/docs/billing-credits, sin fecha).
- Contradicciones: un artículo de soporte de Together (resumen vía WebFetch y WebSearch) dice mínimo USD 5; otra página antigua ("get-started") aún afirma USD 25 de prueba gratuita según un resumen de WebSearch; blogs de terceros dicen USD 5 o USD 25. La página de docs de billing vigente dice USD 15 y sin prueba gratuita; prevalece. Los USD 25 gratis: no lo pude re-confirmar en la fuente (TERCERO/obsoleto).
- Tarjeta: se paga con tarjeta de crédito/débito o ACH de EE. UU.; la compra mínima obliga a tener método de pago. OFICIAL.
- Rate limits de imagen y créditos de prueba: la página de rate limits leída no los publica. NO VERIFICADO.

### Resolución máxima
No consta una cifra general; "las dimensiones disponibles difieren por modelo", `width`/`height` múltiplos de 8, ejemplos hasta 1344x768; Kontext usa `aspect_ratio`. NO VERIFICADO el máximo.

### Política de datos
Por defecto (sin ZDR), Together almacena los prompts y respuestas y puede usarlos para "mejoras de producto", sin compartirlos con terceros; el entrenamiento de modelos con tus datos es un opt-in aparte, desactivado por defecto. Se puede activar Zero Data Retention (Organization Settings > Privacy > "Store prompts and model responses" = No). Los modelos "passthrough" (p. ej. los de Google) siguen la política de su proveedor. OFICIAL (https://docs.together.ai/docs/zero-data-retention, sin fecha).

### Pasos para crear la API key (la persona los hace ella misma)
1. Crear cuenta en https://api.together.ai (la consola; la URL de registro exacta no la recorrí).
2. Comprar créditos: Billing settings > "Add credits" (mínimo USD 15 la primera vez). Fuente: https://docs.together.ai/docs/billing-credits
3. Crear la clave en https://api.together.ai/settings/projects/~current/api-keys > "Create API Key" (nombre, expiración opcional; se muestra una sola vez). Fuente: https://docs.together.ai/docs/api-keys-authentication
OFICIAL (pasos 2 y 3); paso 1 NO VERIFICADO en detalle.

### ¿Hay que habilitar facturación?
Sí, es obligatorio comprar créditos (USD 15) antes de usar la API. OFICIAL.

### Riesgos
- Sin nivel gratuito para imagen.
- Retiros frecuentes de modelos (FLUX.1 Kontext dev, schnell free, etc.); documentación con páginas viejas que contradicen la actual.
- Entrada por URL: puede obligar a alojar la captura públicamente o a subirla en otro formato (no verificado el soporte de base64).
- Por defecto guardan prompts/respuestas.
- Mínimo USD 15 es una barrera alta para BYOK de estudiantes.

### URLs consultadas (fecha de la página)
- https://docs.together.ai/docs/billing-credits (sin fecha)
- https://docs.together.ai/docs/deprecations (sin fecha)
- https://docs.together.ai/docs/serverless-models (sin fecha)
- https://docs.together.ai/docs/inference/images/overview, /reference-images, /parameters (sin fecha)
- https://docs.together.ai/docs/zero-data-retention (sin fecha)
- https://docs.together.ai/docs/api-keys-authentication (sin fecha)
- https://www.together.ai/pricing (sin fecha; menciona promoción hasta 2026-10-11)
- https://support.together.ai/articles/1862638756-changes-to-free-tier-and-billing-july-2025 (muestra "4 meses"; dice mínimo USD 5; contradice la doc)

### Nivel de verificación: OFICIAL para ausencia de gratis, mínimo USD 15, retiros de modelos, parámetros de edición y ZDR. TERCERO/obsoleto para "USD 25 de prueba". NO VERIFICADO: soporte de base64 como entrada, rate limits de imagen, resolución máxima.

---

## TABLA COMPARATIVA FINAL

| Proveedor | Mejor modelo para el caso | Imagen de entrada / control estructural | Gratis real para imagen (API) | Tarjeta / billing | Resolución máx. | Datos en gratis | Precio por render (pago) | Verificación |
|---|---|---|---|---|---|---|---|---|
| Google Gemini API | `gemini-nano-banana-2.1` (Lite: `gemini-3.1-flash-lite-image`) | Sí, edición con hasta 14 refs; sin control estructural | NO (todos "Not available") | Billing Tier 1, prepago mín. USD 5 | 4K (Lite solo 1K) | Gratis: usan datos y hay revisión humana; pago: no | USD 0,0336 (1K) | OFICIAL |
| Stability AI | `control/structure` (también `control/sketch`, `generate/sd3` i2i) | Sí; control estructural nativo | Solo 25 créditos únicos (~5 renders) | La doc no menciona tarjeta para los 25; luego prepago (USD 1 = 100 créditos) | = entrada (hasta 9,4 MP); SD3.5 1 MP | Pueden entrenar por defecto; opt-out disponible | USD 0,05 (5 créditos); SD3.5 Flash i2i USD 0,025 | OFICIAL |
| Hugging Face | `FLUX.1-Kontext-dev` o `FLUX.2-klein-9B` vía fal/Replicate/WaveSpeed | Sí (image-to-image); sin control estructural documentado | NO (free = "None"; PRO USD 9/mes con USD 2) | Comprar créditos o PRO | No consta | HF no guarda ni entrena; proveedores: no verificado | Según proveedor (no verificado) | OFICIAL / parcial NO VERIFICADO |
| OpenRouter | `google/gemini-nano-banana-2.1` o `black-forest-labs/flux.2-klein-4b` | Sí (`input_references`: 14 / 4); sin control estructural | NO (0 modelos `:free` con imagen; 2 modelos Ming a USD 0 no aptos) | Comprar créditos | 4K (Nano Banana 2.1) | Sin log por defecto; algunos proveedores pueden entrenar | ~USD 0,0336 (Nano Banana 2.1 1K); FLUX.2 klein 4B USD 0,014/MP | OFICIAL |
| Together AI | `FLUX.1-kontext-pro` o `FLUX.2-pro/dev` | Sí (`image_url` / `reference_images`, por URL); sin control estructural | NO (sin pruebas gratuitas; FLUX schnell free retirado 2025-12-23) | Compra mín. USD 15 | No consta | Guardan prompts por defecto; entrenar es opt-in; ZDR opcional | USD 0,0154 a 0,03 por imagen (FLUX.2); Kontext pro USD 0,04/MP | OFICIAL |

---

## Recomendación para el equipo (derivada, no dato de proveedor)
- Como "nivel gratuito real y recurrente" no existe en ninguno de los cinco para imagen, conviene reformular la promesa de BYOK: "pegá tu clave; cada render cuesta unos USD 0,03-0,05".
- Opción 1 (mejor para conservar la distribución): Stability `control/structure` (control estructural nativo, 5 créditos, 25 créditos de prueba para probar la integración sin pagar). Avisar del opt-out de entrenamiento.
- Opción 2 (más simple y barata): Gemini `gemini-nano-banana-2.1`, pero requiere billing Tier 1 y la fidelidad de la distribución depende del prompt; hacer pruebas A/B con capturas reales.
- Descartar Together (mínimo USD 15, entrada por URL) y OpenRouter/HF como primera opción (capa intermedia sin ventaja gratuita). Pueden quedar como proveedores secundarios.
- Implementación: guardar la clave cifrada en backend (Fastify), nunca en el cliente; ID de modelo configurable; manejar 429/402/403/413; limitar tamaño de captura (Stability: <= 10 MiB, <= 9.437.184 píxeles, relación de aspecto 1:2,5 a 2,5:1).

## Pendientes / no verificado
- Mensaje de error real de Gemini al llamar sin billing (no se hicieron llamadas).
- Si Stability otorga los 25 créditos también al registrarse sin Google.
- Si Together acepta base64 como entrada de imagen.
- Precios por modelo en los proveedores de HF y resolución máxima en HF/Together.
- Política de datos de proveedores finales en OpenRouter y HF.
- Uso gratuito (si existe) de imagen en la interfaz web de Google AI Studio (no aplica a BYOK).

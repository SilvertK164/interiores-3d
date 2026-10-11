# F2 - Render realista con IA, BYOK: proveedores con nivel gratuito (parte 2)

Fecha de la investigacion: 2026-10-11. Metodo: lectura de paginas oficiales (WebFetch + MCP de documentacion de Cloudflare), busquedas web y, para Pollinations, dos pruebas HTTP sin clave contra su API publica (solo cabeceras/errores; sin registrarme ni usar credenciales).

Escala de verificacion usada en todo el informe:
- OFICIAL = leido en pagina/doc/terminos/API del propio proveedor (se indica la fecha de la pagina cuando figura).
- TERCERO = blog, foro, agregador, snippet de buscador.
- NO VERIFICADO = no pude confirmarlo; no tomarlo como hecho.

Nota metodologica: WebFetch resume las paginas con un modelo pequeno; los datos numericos criticos los repeti o contraste con una segunda fuente cuando fue posible. Lo que dice "(resumen de WebFetch)" conviene revalidarlo con una llamada real antes de cerrar el diseno.

---

## 0. Conclusiones rapidas

1. Solo Cloudflare Workers AI tiene un nivel gratuito real, documentado, por persona, sin tarjeta mencionada y con imagen de referencia: 10.000 neurons/dia (OFICIAL, pagina de precios actualizada 2026-10-09). Con `flux-2-klein-4b`, 1 imagen de 1024x1024 con 1 imagen de referencia de 512x512 cuesta ~110 neurons (calculo propio con tarifas oficiales) = unas 91 imagenes/dia por cuenta.
2. Restriccion clave de Cloudflare para "conservar la distribucion": las imagenes de entrada deben ser "smaller than 512x512" (OFICIAL, changelog 2026-01-15). La captura 3D hay que reducirla a ~512 px por lado; no hay control estructural (ControlNet/depth/canny), solo edicion por referencia + prompt.
3. Pollinations ya NO sirve sin clave: probe `gen.pollinations.ai/image/...` sin clave el 2026-10-11 y devolvio HTTP 401 `"A valid API key is required. Get one at https://enter.pollinations.ai/keys"` (OFICIAL, respuesta de su API). Y su issue oficial #11375 (cerrado 2026-10-01) fija el "drip" recurrente de pollen en 0: no hay cuota gratuita diaria garantizada, solo Quests.
4. NVIDIA build.nvidia.com: descartar. La API alojada de FLUX.1 Kontext dev / FLUX.2 klein documenta que "Preview API NIM supports only a predefined set of images" (no sube imagenes arbitrarias), y los Trial Terms prohiben uso en produccion y permiten a NVIDIA recolectar User Content/Generated Content "to improve NVIDIA products and services, including AI models" (3.3 iv).
5. Replicate, fal.ai, Segmind, Leonardo y Freepik/Magnific: son pago-por-uso. Ninguno tiene un nivel gratuito permanente verificable; las cifras de "creditos de bienvenida" que circulan son de terceros y se contradicen. Segmind lo desmiente en su propio blog (2026-05-18).
6. Recomendacion: Cloudflare como opcion gratuita por defecto; fal.ai/Replicate como "opcion de pago por uso" opcional (unos USD 5-10 de credito rinden cientos de ediciones) para quien quiera mas fidelidad/resolucion; no ofrecer Pollinations/NVIDIA/Segmind/Leonardo/Freepik como "gratis".

---

## 1. Cloudflare Workers AI

**Modelos recomendables**
- `@cf/black-forest-labs/flux-2-klein-4b` (principal: destilado, 4 pasos fijos, edicion con hasta 4 imagenes de referencia, barato en neurons).
- Alternativas: `flux-2-klein-9b` (mejor calidad, pero ~1.364 neurons por primer megapixel + 181,82 por MP de entrada = ~14x mas caro; con 10k neurons/dia alcanza para ~7 imagenes), `flux-2-dev` (18,75/37,5 neurons por tile y paso; caro).
- `@cf/runwayml/stable-diffusion-v1-5-img2img` aparece en la pagina de limites (1.500 req/min) pero su pagina de modelo da 404 y no figura en el indice de modelos de imagen: probablemente retirado; NO VERIFICADO.

**Acepta imagen de entrada**: Si. Edicion/multi-referencia (no control estructural tipo ControlNet).
- Campos (multipart/form-data obligatorio, incluso con solo prompt): `prompt` (string, requerido), `input_image_0`, `input_image_1`, `input_image_2`, `input_image_3` (archivos binarios; "you have to name the input parameter as ..."), `width` (int, default 1024, rango 256-1920), `height` (int, default 768, rango 256-1920), `seed` (int), `guidance` (float), `steps` fijo en 4 ("cannot be adjusted"). [OFICIAL; los rangos y defaults provienen del resumen de WebFetch del changelog 2026-01-15; el JSON Schema de entrada publicado solo expone `multipart: {body, contentType}`.]
- El prompt puede referirse a las imagenes por indice ("take the subject of image 1 and style it like image 0", "place the dog beside the woman").
- REST: `POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`, header `Authorization: Bearer {TOKEN}`, `--form prompt=... --form input_image_0=@captura.png --form width=1024 --form height=1024`.
- Binding de Workers: `env.AI.run(model, { multipart: { body: formStream, contentType } })`, donde `new Response(formData)` entrega `body` y el `content-type` con boundary.

**Formato de respuesta**
- Esquema de salida oficial (`schema-output.json`): `{ "image": <string> }` = "Generated image as Base64 string." -> base64, no binario. [OFICIAL]
- Por REST, la API general envuelve en `{"result": {...}, "success": true, "errors": [], "messages": []}` (visto en la guia REST con llama); para flux-2 el sobre exacto no esta documentado: lo esperable es `result.image`. [Inferido; NO VERIFICADO para este modelo.]
- Formato del archivo decodificado (JPEG vs PNG) no documentado para klein (flux-1-schnell documenta JPEG). Detectar por magic bytes.

**Limites de tamano de la imagen de entrada**
- "All input images must be smaller than 512x512" (changelog klein-4b 2026-01-15; igual en klein-9b y flux-2-dev "512x512 per input image"). [OFICIAL] Ambiguo si 512x512 exacto es admitido: probar 512 y, si falla, 504/496.
- Maximo 4 imagenes. Tamano en bytes: no documentado (existe error 3006 "Request too large", HTTP 413). Salida: width/height hasta 1920.
- Impacto de producto: la captura 3D se reduce a <=512 px; el modelo "rellena" detalle; la fidelidad de muros/aberturas dependera del prompt y de la baja resolucion de la referencia. Probar con capturas reales.

**Nivel gratuito exacto (OFICIAL, pagina de precios, "Last updated Oct 9, 2026")**
- 10.000 Neurons/dia sin cargo, igual para Workers Free y Workers Paid; reinicio diario a las 00:00 UTC. Pasarse -> las operaciones fallan (error 3036 "Account limited", HTTP 429: "daily free allocation of neurons is used up"); para mas hay que subir a Workers Paid ($0,011 por 1.000 neurons extra).
- Tarifa klein-4b: 5,37 neurons por tile de entrada 512x512 y 26,05 por tile de salida 512x512 ($0,000059 y $0,000287).
- Calculos propios (NO oficiales; el redondeo de tiles para tamanos no multiplos de 512 no esta documentado): 1024x1024 de salida (4 tiles) + 1 tile de entrada = 4x26,05 + 5,37 = 109,57 neurons -> ~91 imagenes/dia; 512x512 de salida: 31,42 neurons -> ~318/dia.
- Limite por minuto: Text-to-Image 720 req/min (OFICIAL, pagina de limites, "Last updated Sep 17, 2026"). Los modelos "beta" pueden tener menos.
- Es por cuenta de Cloudflare: en BYOK cada persona tiene sus propios 10.000 neurons/dia.
- Nota de estabilidad: el 2026-07-28 Cloudflare limito el plan Free para unos modelos de texto pesados (kimi-k2.6, kimi-k2.7-code, glm-5.2; glm-5.3 tambien exige Paid) "so we can prioritize capacity... fewer 429 and 3040 (Out of Capacity) errors". Ningun modelo de imagen figura en esa lista, pero los errores 3040 existen para todos los modelos.

**Tarjeta / verificacion**
- No hay mencion de tarjeta en la guia de crear cuenta (solo email + contrasena + verificacion de correo; "Last updated Sep 17, 2026") ni en la de Workers ("By default, users have access to the Workers Free plan"). Conclusion por omision: no pide tarjeta para el plan Free. [OFICIAL por omision; no lo probe creando cuenta.] El unico "no card" explicito vino de un agregador (TERCERO).
- No se menciona verificacion telefonica.

**Resolucion maxima**: salida hasta 1920x1920 (256-1920 por lado); entrada <512x512. [OFICIAL, via resumen]

**Politica de datos** (OFICIAL, `workers-ai/platform/data-usage`, Apr 21, 2026): Cloudflare no usa el contenido del cliente para entrenar ningun modelo disponible en Workers AI ni para mejorar servicios propios o de terceros sin consentimiento explicito; no da periodo de retencion; los modelos son de terceros ("Third-Party Services") con sus propias licencias. El modelo klein-4b figura como "Cloudflare-hosted" y "Partner: Yes"; terminos del proveedor: https://bfl.ai/legal/terms-of-service (la pagina del modelo, sin leer el texto de BFL).

**Pasos numerados para que cada persona cree su API key y obtenga el Account ID**
1. Crear cuenta gratuita (email + contrasena, luego verificar el correo): https://dash.cloudflare.com/sign-up (guia oficial: https://developers.cloudflare.com/fundamentals/account/create-account/).
2. En el dashboard abrir la pagina Workers AI: https://dash.cloudflare.com/?to=/:account/ai/workers-ai y elegir **Use REST API**.
3. Pulsar **Create a Workers AI API Token** -> revisar los datos pre-rellenados -> **Create API Token** -> **Copy API Token** y guardarlo (guia oficial: https://developers.cloudflare.com/workers-ai/get-started/rest-api/, "Last updated Sep 15, 2026"). El secreto solo se muestra una vez (doc de tokens, https://developers.cloudflare.com/fundamentals/api/get-started/create-token/).
4. En la misma pantalla, en **Get Account ID**, copiar el **Account ID**. Alternativas oficiales (https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/, Aug 3, 2026): Ctrl/Cmd+K -> "Copy account ID"; o https://dash.cloudflare.com/?to=/:account/workers-and-pages -> "Account Details".
5. (Alternativa con permiso minimo manual) https://dash.cloudflare.com/profile/api-tokens -> Create Token -> Create Custom Token -> Permissions: Account > Workers AI -> guardar. Permisos: la guia REST dice que un token propio necesita "Workers AI - Read" y "Workers AI - Edit"; la referencia del endpoint `ai/run` dice "at least one of: Workers AI Write or Workers AI Read" (la pagina de permisos lista "Read/Edit" y en otra tabla "Read/Write"). Minimo teorico: Read; por seguridad recomendar la plantilla del paso 3. NO VERIFICADO en la practica.

**Hay que habilitar facturacion**: No para usar los 10.000 neurons/dia (segun docs). Si se agotan, fallan hasta las 00:00 UTC salvo que la persona pase a Workers Paid. NO probado con cuenta real.

**Riesgos**
- Entrada <512x512 y sin control estructural -> riesgo alto de que cambie muebles/aberturas; validar con capturas reales.
- Capacidad en plan Free (errores 429/3040) y posibles cambios de cuota/tarifa (el changelog de flux-2-dev anuncio "we expect to drop pricing in the next few days"; la tarifa de los modelos de imagen ya se movio una vez).
- Modelo "Partner" de BFL: su disponibilidad/terminos pueden cambiar.
- La clave Cloudflare + Account ID son datos sensibles de la persona usuaria: llamar desde el servidor y cifrar en reposo (recomendacion de diseno, no hecho de la fuente).
- Tarifa en tiles: el consumo real de 1024x768 o 1920x1080 no esta documentado; medir con el panel de uso.

**URLs consultadas**
- https://developers.cloudflare.com/changelog/post/2026-01-15-flux-2-klein-4b-workers-ai/ (2026-01-15)
- https://developers.cloudflare.com/workers-ai/models/flux-2-klein-4b/ (+ `schema-input.json`, `schema-output.json`)
- https://developers.cloudflare.com/workers-ai/platform/pricing/ (Oct 9, 2026)
- https://developers.cloudflare.com/workers-ai/platform/limits/ (Sep 17, 2026)
- https://developers.cloudflare.com/workers-ai/platform/errors/ (Sep 17, 2026)
- https://developers.cloudflare.com/workers-ai/platform/data-usage/ (Apr 21, 2026)
- https://developers.cloudflare.com/workers-ai/get-started/rest-api/ (Sep 15, 2026)
- https://developers.cloudflare.com/api/resources/ai/methods/run/
- https://developers.cloudflare.com/fundamentals/api/get-started/create-token/ (Apr 20, 2026), .../api/reference/permissions/ (Oct 1, 2026), .../account/find-account-and-zone-ids/ (Aug 3, 2026), .../account/create-account/ (Sep 17, 2026)
- https://developers.cloudflare.com/workers/platform/pricing/ (Oct 2, 2026)
- https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/

**Nivel de verificacion**: OFICIAL (precios, limites, campos, esquema de salida, pasos, datos). Parciales/NO VERIFICADO: sobre `result.image` en REST, formato del archivo, tarjeta (por omision), permiso minimo exacto, consumo real por tamano, aplicacion efectiva del limite de 512 px.

---

## 2. Replicate

**Modelos recomendables**
- `black-forest-labs/flux-kontext-dev` (OFICIAL: "image-to-image model that edits your images with text"; pesos abiertos con licencia no comercial, uso comercial via Replicate) y `black-forest-labs/flux-kontext-pro`.
- Con control estructural: `black-forest-labs/flux-depth-pro`, `black-forest-labs/flux-canny-pro` (coleccion de edicion de imagenes, https://replicate.com/collections/image-editing), y `adirik/interior-design` (OFICIAL: "Realistic interior design with text and image inputs", combina ControlNet de segmentacion + MLSD, "(mostly) preserves the original room layout"; entradas `image`, `prompt`, `negative_prompt`, `guidance_scale`, `prompt_strength`, `num_inference_steps`, `seed`; ~USD 0,0092 por ejecucion, ~108 por USD 1, L40S ~10 s). Es el unico candidato de todo el estudio pensado para interiores con estructura (MLSD).
- Los parametros exactos de Kontext (p. ej. `input_image`, `aspect_ratio`) NO los pude leer de la pagina oficial (sitio dinamico; la API de esquemas exige token): NO VERIFICADO. Tampoco el precio por imagen de Kontext (terceros: ~USD 0,04 pro; sin confirmar).

**Acepta imagen de entrada**: Si (img2img/edicion con Kontext; estructura via depth/canny/MLSD).

**Nivel gratuito**: NO verificable como permanente. Las paginas oficiales se contradicen:
- Billing: "You can run select models on Replicate for free, but after a bit you'll be asked to set up billing." (sin cifras).
- Prepaid credit: "To use Replicate, you must first purchase credit upfront"; comprar credito exige metodo de pago; el credito vence al ano y no se reembolsa; con saldo 0 se bloquea todo trabajo nuevo.
- Guia Next.js: "free to get started, and you get a bit of credit when you sign up" (sin monto, sin fecha).
- Rate limits: crear predicciones 600/min; cuentas "con credito otorgado pero sin metodo de pago" limitadas a 1 req/s y max 6/min.
- Conclusion: puede haber un pequeno credito/uso gratis de entrada, pero no es un nivel gratuito garantizado para BYOK; monto NO VERIFICADO. Pagina de precios: sin mencion de creditos gratis (flux-schnell USD 3 por mil imagenes).

**Tarjeta / verificacion**: para comprar credito, si (metodo de pago). El login es via cuenta de Replicate (metodo exacto de registro no confirmado en los docs que lei).

**Resolucion maxima**: NO VERIFICADO (no figura en las paginas leidas).

**Politica de datos**: OFICIAL. Para predicciones por API: "all input parameters, output values, output files, and logs are automatically removed after an hour, by default" (https://replicate.com/docs/topics/predictions/data-retention). Terminos (https://replicate.com/terms): Replicate usa los datos del cliente "to provide the Output, train and generate Customer Derivative Models" (tus propios fine-tunes); los "Resultant Data" (anonimizados/agregados) para mejorar el servicio excluyen los Customer Data; en modelos de Marketplace rige el tercero (2.5). No dice que entrene modelos generales con tus entradas. Los modelos de terceros pueden tener sus propias condiciones.

**Pasos para crear la API key**
1. Crear cuenta en https://replicate.com (login/registro).
2. Configurar facturacion/comprar credito en los ajustes de billing de la cuenta (la URL exacta del panel no la verifique; segun el doc de prepaid, "Add credit" cobra de inmediato al metodo guardado) - ver https://replicate.com/docs/topics/billing/prepaid-credit.
3. Generar el token en https://replicate.com/account/api-tokens (OFICIAL: guias get-started/python y nextjs), copiarlo (formato `r8_...`) y enviarlo como `Authorization: Bearer`.

**Facturacion para que ande la imagen**: Si en la practica (docs de prepaid: debe comprarse credito); salvo el posible uso gratis inicial no cuantificado.

**Riesgos**: cuota inicial incierta; modelos "comunitarios" (adirik/*) de 1+ ano sin mantenimiento; cold start; precio variable por tiempo de computo; las licencias de los pesos (Kontext dev no comercial salvo via Replicate).

**URLs consultadas** (sin fecha visible en ninguna): https://replicate.com/pricing, /docs/topics/billing, /docs/topics/billing/prepaid-credit, /docs/topics/predictions/rate-limits, /docs/topics/predictions/data-retention, /docs/get-started/python, /docs/get-started/nextjs, /terms, /black-forest-labs/flux-kontext-dev, /black-forest-labs/flux-kontext-pro, /adirik/interior-design, /collections/image-editing.

**Nivel de verificacion**: OFICIAL para billing/datos/pasos/existencia de modelos (con contradiccion entre paginas sobre credito gratis); NO VERIFICADO: monto de credito de bienvenida, parametros de Kontext, resolucion maxima, precio de Kontext.

---

## 3. fal.ai

**Modelos recomendables**
- `fal-ai/flux-kontext/dev` (OFICIAL, pagina de API): entrada `prompt` (req.), `image_url` (req., "Max 14142 x 14142 px; 20s timeout"), `num_inference_steps` (28), `guidance_scale` (2.5), `seed`, `num_images`, `output_format` (jpeg|png), `resolution_mode` (default `match_input`; tambien `auto` y relaciones de aspecto), `acceleration`, `sync_mode`, `enable_safety_checker`. Salida: `images[]` con `url`, `width`, `height`, `content_type`. Precio: USD 0,025 por megapixel (pagina del modelo).
- `fal-ai/flux-2/edit`: USD 0,012 por MP de entrada y salida; imagenes de entrada reescaladas a 1 MP; campos `prompt`, `image_urls`; ejemplo de la pagina: salida 1024x1024 + entrada 512x512 = USD 0,024.
- `fal-ai/flux-2/klein/4b/edit`: USD 0,01 por MP.
- Control estructural (depth/canny): NO verificado en esta ronda.

**Acepta imagen de entrada**: Si (edicion e img2img por URL; la acepcion de data URI/base64 en `image_url` NO la verifique en esta ronda).

**Nivel gratuito**: NO hay nivel gratuito permanente verificable.
- OFICIAL (Terminos, "Last Updated: September 8, 2026", sec. 9.1): "If you receive free or other promotional credits, they expire in 90 days"; creditos comprados vencen a 365 dias.
- OFICIAL (FAQ): "Free credits and coupons have variable expiration depending on the specific grant" (1 semana a 1 ano): hay concesiones de creditos gratis, pero el monto para cuentas nuevas no esta publicado. Terceros dicen USD 1, USD 20 o "con correo corporativo": contradictorio -> NO VERIFICADO.
- OFICIAL (FAQ): si el saldo cae bajo el umbral de bloqueo, "your account is locked and API requests will be rejected"; se desbloquea agregando creditos. Cuentas nuevas empiezan con concurrencia 2, sube hasta 40 al comprar credito.
- La pagina de precios no menciona creditos gratis.
- El programa "fal Agent credits" (USD 1.000+) es por solicitud para creadores/estudios seleccionados, no aplica.

**Tarjeta / verificacion**: no figura en docs si se exige tarjeta para el credito inicial; comprar creditos requiere pago. Edad minima 18 (terminos, sec. 2).

**Resolucion maxima**: entrada hasta 14142x14142 px (Kontext dev); salida sin maximo fijo, multiplos de 16 y dentro de los limites del modelo.

**Politica de datos**: Terminos sec. 6: licencia no exclusiva solo para prestar el servicio; el cliente conserva la propiedad. Sec. 6(c) "Usage Data" (anonimizado/agregado, puede derivar de los inputs) puede usarse para desarrollar productos y "AI models". Politica de privacidad (2026-07-22): no menciona entrenamiento con prompts/archivos. FAQ: archivos generados en la CDN de fal "at least 7 days"; las URLs son publicas por defecto ("By default, yes"). No se cobra error 500+; 422 puede cobrarse.

**Pasos para crear la API key**
1. Crear cuenta/iniciar sesion en https://fal.ai (login unificado; hay codigo de un solo uso con GitHub segun la FAQ).
2. Ver el saldo/creditos y fechas de vencimiento en el panel de billing del dashboard (la FAQ lo menciona como "billing dashboard"; la URL exacta no la verifique) y agregar credito si la cuenta no tiene saldo.
3. Abrir https://fal.ai/dashboard/keys -> **Create Key**, ponerle nombre, elegir el preset **API** ("most recent recommended") -> copiar la clave de inmediato (no se vuelve a mostrar).
4. Usarla como `FAL_KEY` desde el servidor, nunca en el navegador (doc oficial: https://fal.ai/docs/documentation/model-apis/authentication).

**Facturacion**: practicamente si (cuenta sin saldo queda bloqueada).

**Riesgos**: creditos gratis de monto/caducidad variable; cuenta bloqueada al llegar al umbral; concurrencia 2 al inicio; URLs de salida publicas por defecto (privacidad de los renders de viviendas); modelos con licencia "Research only" no comerciales.

**URLs consultadas**: https://fal.ai/pricing, https://fal.ai/docs/model-apis/faq, https://fal.ai/docs/documentation/model-apis/authentication, https://fal.ai/terms (Sep 8, 2026), https://fal.ai/privacy (Jul 22, 2026), https://fal.ai/models/fal-ai/flux-kontext/dev(/api), https://fal.ai/models/fal-ai/flux-2/edit, https://fal.ai/models/fal-ai/flux-2/klein/4b/edit, https://fal.ai/agent-access/claim.

**Nivel de verificacion**: OFICIAL (terminos, FAQ, pasos, precios y esquema de Kontext dev); NO VERIFICADO/TERCERO: monto de credito de bienvenida, base64 en `image_url`, controles estructurales.

---

## 4. Segmind

**Modelos recomendables** (catalogo https://www.segmind.com/models): `flux-2-klein-4b` (generacion y edicion, `image_urls` hasta 4 referencias, `negative_prompt`, `seed`, `image_format`, relaciones de aspecto 1:1 a 21:9), `flux-2-klein-9b`, `nano-banana`/`nano-banana-2`/`pro`, `seedream-4.5`, `p-image-edit`, `sd3-med-img2img`. No encontre en el listado ControlNet ni modelos de interiorismo/virtual staging (el listado puede estar incompleto). Hay colecciones "Flux Kontext Models" (/models/all/flux-kontext). Precios por modelo: no obtenidos (estan en la pestana Pricing de cada modelo).

**Acepta imagen de entrada**: Si, en los modelos de edicion/img2img citados (los nombres exactos de campos de la API REST de cada modelo no los confirme; la pagina del modelo no muestra el endpoint `api.segmind.com/v1/...`).

**Nivel gratuito**: NO verificable; lo oficial reciente lo desmiente.
- OFICIAL (blog de Segmind, 2026-05-18): "There is no automatic welcome bonus dropped into new Segmind accounts in 2026"; "Segmind accounts start as Free Accounts on the Flexible plan, but you need to recharge at least $10 to start generating." (el post habla de Seedance 2.0 pero la frase es general sobre las cuentas).
- OFICIAL (docs de billing): todas las cuentas empiezan en el plan Flexible (pay-as-you-go; "Free Plan" en la consola) y se puede empezar con una recarga "as little as $10". No se cobra por solicitudes fallidas. Pagina de precios: Flexible = pay as you go, 60 RPM, "All Model APIs"; Pro USD 39/mes (USD 50 en creditos), Business USD 99, Scale USD 599.
- TERCERO/obsoleto: "100 free API calls per day" (snippet de una pagina `docs.segmind.com/pricing` que hoy da 404) y posts antiguos del blog con "creditos diarios gratis" (USD 0,25/dia, 100 creditos/dia): NO VERIFICADO y probablemente retirado.

**Tarjeta / verificacion**: para recargar si hay pago (auto-recarga guarda tarjeta); no se dijo si hace falta tarjeta para registrarse.

**Resolucion maxima**: NO VERIFICADO (la pagina de klein-4b solo lista aspectos de 1:1 a 21:9).

**Politica de datos**: NO VERIFICADO (no lei terminos/privacidad de Segmind).

**Pasos para crear la API key (OFICIAL)**
1. Iniciar sesion en https://platform.segmind.com/auth/login (Google, Discord, Microsoft o enlace unico por correo).
2. Recargar saldo (minimo USD 10) desde la consola (la URL exacta del panel de billing no la verifique).
3. Abrir https://platform.segmind.com/api-keys y crear la clave (formato `SG_` + 16 hex).
4. Enviar `x-api-key: <clave>`; para comprobar saldo sin gastar: `GET https://api.segmind.com/v1/get-user-credits`. (Doc: https://docs.segmind.com/docs/get-started/authentication.)

**Facturacion**: si (recarga minima USD 10).

**Riesgos**: sin gratuito; documentacion y cifras de "creditos gratis" inconsistentes entre blog viejo, docs y pagina de precios; sin ControlNet/interiorismo en el catalogo revisado.

**URLs consultadas**: https://www.segmind.com/pricing, https://docs.segmind.com/, /docs/get-started/authentication, /docs/get-started/key-concepts, /docs/platform/pricing-and-billing, https://www.segmind.com/models, https://www.segmind.com/models/flux-2-klein-4b, https://blog.segmind.com/seedance-2-0-free-credits-how-to-actually-stretch-a-10-top-up/ (2026-05-18). Ninguna pagina de docs/precios muestra fecha.

**Nivel de verificacion**: OFICIAL (sin bono, minimo USD 10, pasos de clave, catalogo); TERCERO/NO VERIFICADO (100 llamadas/dia, creditos diarios, precios por modelo, politica de datos).

---

## 5. NVIDIA NIM / build.nvidia.com (API Catalog)

**Modelos**
- `black-forest-labs/flux.1-kontext-dev`: `POST https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-kontext-dev`, `Authorization: Bearer $NVIDIA_API_KEY`. Campos: `prompt` (<=10.000 car.), `image`, `width`/`height` (enum 672...1568), `aspect_ratio` (default `match_input_image`), `cfg_scale` (3,5; >1 y <=9), `steps` (30; 20-50), `seed` (0=aleatorio), `samples` (solo 1). Respuesta: `{"artifacts":[{"base64":"<JPEG>","finishReason":"SUCCESS|ERROR|CONTENT_FILTERED","seed":N}]}`. [OFICIAL, https://docs.api.nvidia.com/nim/reference/black-forest-labs-flux_1-kontext-dev-infer]
- `black-forest-labs/flux.2-klein-4b`: `mode` ("Image Generation" | "Image Editing"), `prompt`, `steps` 1-4, `cfg_scale` 0, `width`/`height` ("Only 1024 is supported"), `image`, `samples` 1. [OFICIAL]
- Stable Diffusion 3 medium y SDXL: solo texto a imagen en el catalogo; no hay modelos de control (depth/canny) ni SD 3.5. [OFICIAL, indice de la referencia]

**Acepta imagen de entrada**: En el papel si, pero la API alojada ("Preview API") restringe la imagen: la descripcion oficial del campo `image` dice textualmente "An image input to edit. Preview API NIM supports only a predefined set of images." y el formato aceptado es `data:image/png;example_id,{id}` con `example_id` 0-2 (Kontext) o 0-3 (klein). Es decir, segun la documentacion oficial NO se puede subir una captura propia en el nivel de prueba. El esquema declara `image` de tipo `null` y las plantillas de codigo de klein envian `"image": ["<url>"]`: hay incoherencia; no lo probe (no tengo clave). NO VERIFICADO si en la practica acepta una imagen base64 arbitraria; por lo documentado, asumir que no.

**Nivel gratuito**
- OFICIAL (foro de NVIDIA, personal de NVIDIA, 2024; "NVIDIA NIM FAQ" 2024-09-11): el API Catalog es "a trial experience"; los miembros del NVIDIA Developer Program tienen acceso gratuito a los endpoints API de NIM "for prototyping", limites segun modelo y concurrencia ("check your account at the top right"). Foro (personal NVIDIA, 2024): 1.000 creditos al registrarse, "Request More" hasta 5.000, +4.000 con correo corporativo.
- TERCERO/foros 2026: ~40 RPM y NVIDIA no concede aumentos; algunas guias dicen que el sistema de creditos se elimino. Sin pagina oficial actual que fije cifras -> NO VERIFICADO el monto y los RPM de hoy.
- Pagina del modelo Kontext dev (actualizada 2026-08-06): "ready for non-commercial use"; comercial por contacto con BFL.

**Tarjeta / verificacion**: no pide tarjeta. Registro con correo (te hace miembro del Developer Program). Verificacion telefonica: no la menciona el quickstart oficial; existen hilos del foro sobre "Verification Required" -> NO VERIFICADO.

**Resolucion maxima**: Kontext dev 17 tamanos fijos hasta 1568x672 / 1024x1024; klein-4b: solo 1024x1024 (aunque el enum lista mas). Entrada: sin limites documentados.

**Politica de datos (OFICIAL, "NVIDIA API Trial Terms of Service", PDF con metadata Oct 7, 2025)**
- 1.2/1.4: acceso "for limited trial purposes only and without use of the API Service or Generated Content in production"; sin suscripcion solo "internal testing and evaluation purposes, not in production".
- 2.3: NVIDIA no almacena ni usa el contenido al terminar la sesion, salvo lo indicado.
- 3.3 (iv): NVIDIA recolecta, sin identificar usuarios, "User Content and Generated Content to improve NVIDIA products and services, including AI models". Si entrena con lo que enviás.
- 4.2: no se puede distribuir ni poner a disposicion de terceros el contenido generado (salvo lo permitido en 1.2); 2.6/4.3: no subir datos personales identificables.
- Solo adultos.
=> Incompatible con una funcion de producto para terceros (aunque sea BYOK).

**Pasos para crear la API key (OFICIAL, https://docs.api.nvidia.com/nim/docs/api-quickstart, 2026-08-06)**
1. Abrir una pagina de modelo en https://build.nvidia.com/ (la guia usa https://build.nvidia.com/meta/llama-3_1-8b-instruct).
2. En el panel derecho pulsar **Get API Key**.
3. Escribir el correo; crear o iniciar sesion con la cuenta NVIDIA (queda como miembro del Developer Program).
4. Se muestra la clave en una ventana emergente: **Copy Key** y guardarla.
(El listado posterior de claves en build.nvidia.com/settings/api-keys no lo verifique.)

**Facturacion**: no hace falta para el trial; produccion exige NVIDIA AI Enterprise o autoalojar el NIM.

**Riesgos**: restriccion a imagenes predefinidas (documentada), prohibicion de produccion, recoleccion de contenido para mejorar modelos, cuotas opacas, modelos "pre-release" que NVIDIA puede retirar (1.3), licencia no comercial de Kontext dev.

**URLs consultadas**: https://docs.api.nvidia.com/nim/reference/ (indice), .../black-forest-labs-flux_1-kontext-dev(-infer), .../black-forest-labs-flux_2-klein-4b(-infer), https://build.nvidia.com/black-forest-labs/flux_1-kontext-dev (2025-08-12), https://docs.api.nvidia.com/nim/docs/api-quickstart (2026-08-06), https://forums.developer.nvidia.com/t/nvidia-nim-faq/300317, https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf (lei el texto extraido localmente con pypdf; copia temporal en scratchpad\nvidia_trial_terms.txt).

**Nivel de verificacion**: OFICIAL (restriccion de imagen, esquema, terminos, pasos); TERCERO (cifras actuales de creditos/RPM); NO VERIFICADO (si acepta imagen arbitraria en la practica, verificacion telefonica).

---

## 6a. Leonardo.ai API

**Modelos recomendables** (indice oficial https://docs.leonardo.ai/llms.txt): FLUX.1 Kontext [pro] y Kontext Max (recetas con imagen subida y multi-imagen), Nano Banana / Nano Banana Pro / Nano Banana 2 (edicion con imagen subida), y recetas de "Image to Image Guidance" con multiples ControlNets (control estructural) y "Image Prompts".

**Acepta imagen de entrada**: Si (init image, guidance con ControlNets, Kontext, Nano Banana).

**Nivel gratuito**: No hay uno documentado para la API.
- OFICIAL (Quick Start, actualizada 2026-06-26): "API access is separate from free or web app subscriptions"; hay que comprar creditos de API; sin mencion de creditos gratis.
- OFICIAL (Pricing & Plans FAQ, 2026-09-01): pago por uso (PAYG) "available now for new users", recargas en importes enteros, el saldo no expira.
- OFICIAL (PAYG guide, 2026-01-28): cada generacion descuenta saldo en dolares; sin credito inicial ni prueba gratis mencionados.
- TERCERO: algunos agregadores dicen "USD 5 de credito inicial no expirable" o "150 tokens/dia" (los 150/dia son de la app web, no de la API). Contradictorio -> NO VERIFICADO. (Una pagina de CostBench afirma "forever free plan" para la API: baja fiabilidad.)

**Tarjeta / verificacion**: no se indica; para recargar, metodo de pago (auto top-up lo usa).

**Resolucion maxima**: NO VERIFICADO (depende del modelo; ver `Get Available Models` en https://docs.leonardo.ai/reference/getmodels).

**Politica de datos**: la FAQ de API no la trata -> NO VERIFICADO.

**Pasos para crear la API key (OFICIAL, Quick Start)**
1. Iniciar sesion en la app web de Leonardo (https://app.leonardo.ai/).
2. Menu izquierdo -> **API Access** -> **Buy Credit** (necesario antes de generar).
3. En la pagina API Access, **Create New Key**, ponerle nombre y, opcionalmente, un webhook de callback. Se permiten hasta 10 claves por cuenta (FAQ, 2026-02-23); la clave "User" esta deprecada y se usa la "Production API key".
4. No incrustar la clave en codigo cliente.

**Facturacion**: si.

**Riesgos**: sin gratuito verificable; nombres de planes y precios cambiaron (migracion a PAYG); concurrencia/colas por cuenta.

**URLs consultadas**: https://docs.leonardo.ai/docs/getting-started (2026-06-26), /docs/pricing-and-plans-faq.md (2026-09-01), /docs/payg-guide.md (2026-01-28), /docs/api-faq.md (2026-02-23), https://docs.leonardo.ai/llms.txt; https://leonardo.ai/api devolvio 403.

**Nivel de verificacion**: OFICIAL (PAYG, claves, modelos, no mencion de gratuito); TERCERO/NO VERIFICADO ($5 inicial).

---

## 6b. Freepik API (hoy "Magnific API")

**Estado**: `docs.freepik.com/*` redirige (301) a `docs.magnific.com/*` (OFICIAL); la API se llama ahora Magnific API, base `https://api.magnific.com/v1`, header `x-magnific-api-key` (docs oficiales). Un tercero ubica el rebrand en abril de 2026 y dice que las claves de Freepik siguieron funcionando (TERCERO).

**Modelos recomendables**: `flux-2-pro` (OFICIAL: `prompt`, `input_image`, `input_image_2..4` en base64 JPEG/PNG/WebP, `width`/`height` 256-1440, `seed`, `prompt_upsampling`, `webhook_url`; respuesta asincrona `{"data":{"task_id","status":"CREATED"}}` con estados CREATED/IN_PROGRESS/COMPLETED/FAILED y GET de consulta), `flux-kontext-pro`, `seedream-4-5-edit`, `Mystic`, Relight, Style Transfer, Upscaler. Control estructural ("structure reference") no figura en el indice leido: NO VERIFICADO. Los enlaces de salida expiran a los 30 minutos (quickstart).

**Acepta imagen de entrada**: Si (hasta 4 imagenes base64 en flux-2-pro).

**Nivel gratuito**: NO verificado en la documentacion actual.
- OFICIAL (docs.magnific.com/pricing): "Every AI generation request you make through the API ... deducts credits from your organization's balance ... This applies to every paid plan"; los creditos de la suscripcion web "only cover usage inside the Magnific web app"; no hay mencion de nivel gratuito. La pagina de rate limits tampoco trae cuotas gratis (limites: 50 req/s por IP en 5 s, 10 req/s promedio, 30.000 req/min por clave).
- TERCERO (snippets de buscador atribuidos a paginas oficiales de freepik.com que devolvieron 403 al abrirlas): "free tier with up to 5 EUR worth of API requests", "initial 5 EUR credit", tope mensual hasta 500 EUR, facturacion a fin de mes. Pudo cambiar con el rebrand -> NO VERIFICADO hoy.

**Tarjeta / verificacion**: no figura; para la cuenta, el quickstart exige iniciar sesion con el correo del Administrador de la organizacion.

**Resolucion maxima**: flux-2-pro 256-1440 por lado (OFICIAL).

**Politica de datos**: sin declaracion de entrenamiento en lo leido; el log de auditoria retiene 30 dias -> NO VERIFICADO para entradas/salidas.

**Pasos para la API key (OFICIAL, https://docs.magnific.com/quickstart)**
1. Iniciar sesion con el correo del Administrador de la organizacion en https://www.magnific.com.
2. Ir a https://www.magnific.com/user/organization/api-keys.
3. Generar la clave y usarla en el header `x-magnific-api-key` (https://docs.magnific.com/authentication; solo claves privadas, llamadas servidor a servidor).
(Las cuentas Enterprise deben pedir primero la habilitacion a su representante.)

**Facturacion**: si (saldo de creditos).

**Riesgos**: rebrand y cambio de dominio/headers (`x-freepik-api-key` vs `x-magnific-api-key`); posible fin del credito inicial; modelo asincrono (polling o webhook); claves solo server-side.

**URLs consultadas**: https://docs.freepik.com/pricing -> https://docs.magnific.com/pricing, /ratelimits, /authentication, /quickstart, /llms.txt, /api-reference/text-to-image/post-flux-2-pro; sin fecha en ninguna. https://www.freepik.com/api, https://www.magnific.com/api, https://cn.freepik.com/ai/docs/freepik-api, https://it.freepik.com/ai/faq/general-questions: 403.

**Nivel de verificacion**: OFICIAL (API actual, rate limits, creditos de pago, pasos); TERCERO/NO VERIFICADO (credito inicial de 5 EUR).

---

## 7. Pollinations.ai

**Modelos (catalogo oficial de la propia API, https://gen.pollinations.ai/image/models, leido el 2026-10-11)** con entrada de imagen y `paid_only: false` (los que se pueden pagar con "Quest Pollen"): `black-forest-labs/flux.2-klein-4b` (0,005 pollen por imagen, `max_reference_images` 10, `per_user_rpm` 60, "up to 2.4 megapixels", salud 99,3 %), `black-forest-labs/flux.1-kontext-pro` (0,03, 1 referencia), `openai/gpt-image-1.5`, `openai/gpt-image-2`, `openai/gpt-image-1-mini`, `microsoft/mai-image-2.6`(-flash). Los demas (Seedream, FLUX.2 pro/max/flex, Nano Banana, etc.) son `paid_only`.

**Acepta imagen de entrada**: Si. `GET /image/{prompt}?image=<URL>[|<URL>]` ("Reference image URL(s) for image editing"), `POST /v1/images/generations` con campo `image` (URL), y `POST /v1/images/edits` (JSON o multipart con `-F image=@...`, repetible). Los limites por imagen/conteo existen (errores `image_too_large`, `unsupported_image_media_type`, `invalid_image_url`) pero sin cifras; la referencia debe ser URL publica directa. No hay control estructural.

**Nivel gratuito / "sin clave"**: ya no hay uso sin clave.
- PRUEBA EN VIVO (2026-10-11, sin credenciales): `GET https://gen.pollinations.ai/image/living%20room%20<id>?width=256&height=256` -> HTTP 401 y cuerpo `{"success":false,"error":{"message":"A valid API key is required. Get one at https://enter.pollinations.ai/keys","code":"UNAUTHORIZED"},"status":401}`; lo mismo con `model=black-forest-labs/flux.2-klein-4b` y con `image=`. Solo respondio 200 un prompt ya cacheado (`X-Cache: HIT`). OFICIAL (respuesta del propio servicio).
- OFICIAL (README, con ultima entrada fechada 2026-10-10): "earn Pollen by contributing, no credit card required"; Pollen = sistema pay-as-you-go ($1 ~ 1 Pollen); claves `pk_` (app/navegador, presupuesto fijado al crearla) y `sk_` (servidor, sin rate limit); alta en https://enter.pollinations.ai; "Pollen Quests" para ganar Pollen.
- OFICIAL (APIDOCS): hay dos saldos, "Quest Pollen" y "Paid Pollen"; los modelos `paid_only` exigen Paid Pollen; claves "quest-only" se detienen cuando se acaba el Quest Pollen; `402 PAYMENT_REQUIRED` cuando se agota.
- OFICIAL (issue #11375 de pollinations/pollinations, abierto 2026-05-29, cerrado como completado 2026-10-01): se reemplazan los tiers por saldos REWARD/PAID; "The recurring REWARD drip is 0"; "No tier-based hourly pollen". => no hay cuota gratuita diaria garantizada.
- TERCERO: antes (ene-mar 2026) habia tiers con 1-3 pollen/dia; hoy los montos de Quest NO VERIFICADOS.

**Tarjeta / verificacion**: el README dice "no credit card required" para ganar Pollen. Metodo de login en enter.pollinations.ai: NO VERIFICADO (un listado tercero menciona GitHub).

**Resolucion maxima**: klein-4b "up to 2.4 megapixels" (descripcion oficial del modelo); resto NO VERIFICADO.

**Politica de datos / terminos**: las paginas pollinations.ai/terms y /privacy son dinamicas y no pude leerlas -> NO VERIFICADO. Datos sueltos OFICIALES: las imagenes generadas con `response_format=url` se guardan en `media.pollinations.ai` ("media URLs are public reads"), subidas con ciclo de 30 dias; el modelo comunitario `sdxl-lightning-free` avisa que registra prompts y completions para datasets internos (nunca para entrenar, segun su ficha). Un tercero afirma que los terminos dicen que el Quest Pollen no crea derecho a montos fijos (NO VERIFICADO).

**Estabilidad**: proyecto abierto (MIT), con sede en Berlin, financiado por creditos de nubes/patrocinadores; el sistema de cuotas cambio al menos 3 veces en 2026 (tiers -> tiers dinamicos -> Quests/REWARD). Estado de salud de modelos expuesto en https://model-monitor.pollinations.ai.

**Pasos para crear la clave**
1. Registrarse/iniciar sesion en https://enter.pollinations.ai (metodo exacto sin confirmar).
2. Ir a https://enter.pollinations.ai/keys (URL citada en el propio error 401) y crear una clave `sk_` (servidor) o `pk_` (app), con limite de presupuesto y modelos permitidos (opcionalmente "quest-only").
3. Conseguir Quest Pollen completando Quests en el dashboard (no hay saldo diario asegurado) o comprar un pack.
4. Llamar `https://gen.pollinations.ai/...` con `Authorization: Bearer <clave>` (nunca `sk_` en cliente).

**Facturacion**: no obligatoria, pero sin Quest Pollen o saldo -> 402.

**Riesgos**: la cuota gratuita puede ser 0 para una persona nueva; reglas cambiantes; terminos/privacidad sin leer; imagenes de referencia como URL publica (obliga a subir la captura a un host accesible, con implicancias de privacidad).

**URLs consultadas**: https://github.com/pollinations/pollinations (README), https://raw.githubusercontent.com/pollinations/pollinations/main/APIDOCS.md, https://gen.pollinations.ai/image/models, https://github.com/pollinations/pollinations/issues/11375, https://pollinations.ai y /terms (vacias para el lector), https://gen.pollinations.ai/docs (vacia), pruebas HTTP del 2026-10-11.

**Nivel de verificacion**: OFICIAL (obligatoriedad de clave, endpoints de imagen/edicion, catalogo, REWARD drip = 0); NO VERIFICADO (terminos, montos de Quests, login, limites de tamano).

---

## 8. Tabla comparativa

| Proveedor | Modelo(s) para el caso | Imagen de entrada | Nivel gratuito real hoy | Tarjeta | Res. maxima | Datos en nivel gratuito | Veredicto BYOK-gratis | Verificacion |
|---|---|---|---|---|---|---|---|---|
| Cloudflare Workers AI | flux-2-klein-4b (9b/dev caros) | Si, hasta 4 refs `input_image_0..3`, <512x512 | 10.000 neurons/dia (~91 img 1024x1024 con 1 ref), 720 req/min | No mencionada (alta con email) | salida 256-1920; entrada <512 | No entrena (doc) | SI, unico gratis verificado; limitacion: entrada <=512 px | OFICIAL (tarjeta por omision, REST envelope inferido) |
| Replicate | flux-kontext-dev/pro, flux-depth/canny-pro, adirik/interior-design (MLSD+seg) | Si | No garantizado; docs contradictorias ("comprar credito primero" vs "un poco de credito") | Si para comprar credito | NO VERIFICADO | I/O borrados a la hora; no entrena modelos generales | NO (pago; ~USD 0,009 por render interior) | OFICIAL con contradiccion |
| fal.ai | flux-kontext/dev (USD 0,025/MP), flux-2/edit (0,012/MP), klein 4b edit (0,01/MP) | Si (URL) | Creditos gratis de monto/caducidad variable (promo = 90 dias); bloqueo sin saldo | Pago para comprar | entrada 14142x14142 | URLs publicas; Usage Data anonimizada puede usarse para modelos | NO (pago por uso) | OFICIAL; monto de bienvenida NO VERIFICADO |
| Segmind | flux-2-klein-4b, nano-banana, seedream, sd3 img2img | Si | NO: sin bono; recarga minima USD 10 (blog 2026-05-18) | Pago | NO VERIFICADO | NO VERIFICADO | NO | OFICIAL |
| NVIDIA build | flux.1-kontext-dev, flux.2-klein-4b | Documentado solo imagenes predefinidas (`example_id`) | Trial: ~1.000 creditos (foro 2024) / ~40 RPM (terceros); solo prototipado | No | 1568x672 / 1024x1024 | Recolecta contenido para mejorar modelos; prohibe produccion | NO (descartar) | OFICIAL (restricciones); cifras = TERCERO |
| Leonardo API | Kontext pro, Nano Banana, guidance con ControlNets | Si | No documentado ("$5 inicial" = tercero) | Pago | NO VERIFICADO | NO VERIFICADO | NO | OFICIAL (PAYG) |
| Freepik / Magnific API | flux-2-pro (4 imgs base64), kontext-pro, seedream-4.5 edit | Si | No documentado hoy (5 EUR = snippets sin abrir) | Pago | 256-1440 | NO VERIFICADO | NO | OFICIAL (pago); 5 EUR NO VERIFICADO |
| Pollinations | flux.2-klein-4b, flux.1-kontext-pro, gpt-image-1.5 | Si (URL publica) | Clave obligatoria (401 sin clave, verificado en vivo); REWARD drip = 0; solo Quests | No para Quests | klein ~2,4 MP | Terminos NO leidos; media URLs publicas | NO como cuota confiable | OFICIAL (clave, drip); terminos NO VERIFICADO |

---

## 9. Lo que NO pude confirmar (para no tomarlo como hecho)

1. Cloudflare: si el plan Free efectivamente corre klein-4b sin tarjeta (no cree cuenta); formato del archivo decodificado y sobre REST exacto; permiso minimo ("Workers AI Read" basta?); consumo real por tamano distinto de multiplos de 512; si "smaller than 512x512" admite 512 exacto; tamano maximo del cuerpo (error 3006).
2. Replicate: monto del credito inicial; parametros y resolucion de Kontext; precios por imagen.
3. fal.ai: monto de bienvenida; entrada base64; controles depth/canny.
4. Segmind: precios por modelo; endpoint y campos REST de cada modelo; politica de datos; si hay modelos ControlNet/interiorismo fuera del listado.
5. NVIDIA: si la API alojada hoy acepta imagenes base64 arbitrarias (la doc dice que no); creditos/RPM actuales.
6. Leonardo: credito inicial de API (terceros: USD 5).
7. Freepik/Magnific: credito inicial de 5 EUR tras el rebrand.
8. Pollinations: terminos/privacidad, montos de Quests, metodo de login, limites de tamano de imagen.

## 10. Sugerencia de diseno derivada (no es hecho de las fuentes)

- Proveedor por defecto "gratis": Cloudflare Workers AI + `flux-2-klein-4b`. En el editor, reducir la captura a <=512 px por lado, enviar como `input_image_0`, pedir salida 1024x1024 (o 1024x768) y un prompt que fije "keep walls, doors, windows, furniture positions exactly as in image 0; photorealistic interior; natural light". Validar con 10-20 capturas reales antes de comprometerse.
- Segundo adaptador opcional de pago por uso: fal.ai (`flux-2/klein/4b/edit` o `flux-kontext/dev`) o Replicate (`adirik/interior-design` si se necesita preservar muros con MLSD). Avisar que requieren cargar saldo.
- Llamar a los proveedores desde la API Fastify (las claves son de ambito de cuenta y no deben viajar al cliente); cifrar claves por usuario; manejar 429/3036/3040 (Cloudflare) y 402 (Pollinations).

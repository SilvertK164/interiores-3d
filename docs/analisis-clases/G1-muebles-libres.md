# G1 - Bibliotecas libres de muebles 3D para el diseñador de interiores (vivienda + comercio)

Fecha de la investigación: 2026-10-11. Alcance: solo se leyeron páginas, specs de API y metadatos públicos. No se descargó ningún modelo ni ZIP (solo un pedido HEAD al ZIP de Kenney para ver su tamaño), no se creó ninguna cuenta ni token, y no se tocó el proyecto.

Niveles de verificación usados:
- **OFICIAL**: leído en la página, el repo o la API del propio proveedor.
- **TERCERO**: leído en un espejo, un buscador, una nota de prensa o un repo ajeno.
- **NO VERIFICADO**: no pude confirmarlo; es una estimación o un recuerdo.

Formato del catálogo que hay que producir (de `docs/inventario-pascal-herramientas.md`, línea 152): `id`, `category`, `name`, `tags` (con `floor` / `wall` / `ceiling` / `countertop`), `thumbnail`, `src` (GLB), `floorPlanUrl` (ícono del plano 2D), `dimensions` [ancho, alto, profundidad] en metros, `offset`, `rotation`, `scale`, y opcionalmente `surface`, `attachTo` y controles. Un GLB ajeno debe escalarse a metros antes de entrar.

---

## 0. Hallazgos que cambian la decisión

1. **Quaternius tiene una licencia nueva y contradictoria con sus propias páginas.** `quaternius.com/license.html` publica la "Quaternius Asset License (QAL) v1.0, última actualización 8/28/2026". Esa licencia **prohíbe redistribuir los assets en sí** como asset suelto o pack, incluso gratis y modificados (§3a). Sin embargo el FAQ y 82 de las 83 páginas de pack siguen diciendo "CC0". Solo la página del pack más nuevo (Bestiary - Dungeon Monsters Kit) dice "QAL". Los packs de muebles figuran como CC0 hoy. Ver sección 2.
2. **Sketchfab cambió de dueño el 2026-08-10/12** (KitBash la compró a Epic) y la Download API exige que cada usuario final inicie sesión con su cuenta Sketchfab dentro de nuestra app. No sirve como fuente automática; solo como descarga manual y puntual de modelos CC0/CC-BY.
3. **Kenney Mini Market** (CC0, 20 archivos) es el único pack libre y CC0 que encontré pensado para comercio: caja registradora, góndolas, freezers, exhibidores.
4. **Poly Pizza** ya reúne en formato GLB, por modelo y con licencia etiquetada, los modelos CC0 de Kenney (452), Quaternius (1411 modelos en el sitio), Kay Lousberg (224) y otros. Es el mejor canal para obtener GLB sin convertir.
5. **Google Scanned Objects no sirve para muebles** (son objetos chicos de uso doméstico, escaneados y pesados).

---

## 1. Kenney (kenney.nl)

- **URLs oficiales consultadas:** https://kenney.nl/assets/furniture-kit · https://kenney.nl/assets/mini-market · https://kenney.nl/assets/food-kit · https://kenney.nl/assets/retro-urban-kit · https://kenney.nl/support
- **Licencia exacta:** "Creative Commons CC0" en cada página de asset (OFICIAL). Soporte: "all game assets on the asset pages are public domain licensed (CC0). You're free to use them, even in commercial projects." Atribución: "Attribution is not required, but if you choose to give credit you can do so by mentioning 'Kenney'." No usar el logo de Kenney. (OFICIAL.) La página de soporte no habla de redistribución de los archivos; CC0 la permite por definición del deed.
- **Atribución:** no exigida. Recomendada una línea "Kenney (CC0)" en créditos.

### Furniture Kit
- **Cantidad:** "Files 140×" (OFICIAL). Versión mostrada en la página: 1.0, 2018. El `License.txt` del espejo dice "Furniture Kit (2.0)" (TERCERO).
- **Formatos:** la página oficial **no lista formatos**. En un espejo de GitHub (RetroDECK/RetroQUEST) el kit trae carpetas `DAE`, `FBX`, `GLTF format`, `OBJ`, `STL`, y la carpeta `GLTF format` contiene **140 archivos `.glb`** (TERCERO). Los modelos comparten una textura de paleta.
- **Contenido (clasificación mía sobre la lista de 140 nombres, TERCERO):** 20 piezas de estructura (muros, pisos, escaleras, puertas; Pascal ya las hace paramétricas), 20 asientos (sillones, sofás, bancos, taburetes, sillas), 10 camas y almohadones, 14 mesas y escritorios, 10 guardado (bibliotecas, mueble de TV, perchero `coatRack`), 23 cocina (gabinetes, heladeras, cocina, campana, microondas, cafetera), 13 baño y lavado (bañera, ducha, inodoro, lavatorio, lavarropas), 7 iluminación, 10 electrónica, 13 decoración (alfombras, plantas, cajas, cesto).
- **Estilo:** low-poly estilizado, colores planos. Combina muy bien con un editor de planos limpio (la captura de Pascal en `design/assets/` es gris claro con muebles de tonos suaves).
- **Cómo se obtiene:** botón de descarga a un ZIP directo en kenney.nl (`kenney_furniture-kit.zip`, 5.130.729 bytes según el encabezado `Content-Length`; OFICIAL). La página pide una donación opcional ("Continue without donating..."). Hay un bundle pago en itch.io, no hace falta.
- **Redistribuir en repo público / Supabase Storage:** sí, CC0 (OFICIAL para la licencia).
- **Riesgos:** (a) la escala, el origen y la orientación de cada pieza **no están verificados** (no abrí ningún GLB); (b) pocas piezas de comercio; (c) la lista de formatos viene de un espejo, no de Kenney.
- **Nivel de verificación:** licencia y cantidad OFICIAL; formatos y contenido TERCERO.

### Mini Market (comercio)
- **Datos oficiales:** CC0, 20 archivos, etiquetas "shop, market, supermarket, store", con animación y variaciones. Versión 1.0.
- **Contenido (TERCERO, espejo AkiraNim/CLTCrossing, todos `.glb`):** `cash-register`, `shelf-bags`, `shelf-boxes`, `shelf-end` (góndolas), `freezer`, `freezers-standing`, `display-bread`, `display-fruit`, `shopping-basket`, `shopping-cart`, `bottle-return`, más columna, cerco, muros, piso y un empleado animado. Unas 11 piezas útiles como mobiliario.
- **Estilo:** igual que el resto de Kenney.
- **Nivel:** licencia y cantidad OFICIAL; lista de piezas y formato GLB TERCERO.

### Otros packs Kenney vistos
- Food Kit: 200 archivos, CC0, tags "food, kitchen" (OFICIAL). Útil para vajilla y utilería de café; no verifiqué el contenido.
- Retro Urban Kit: 120 archivos, CC0 (OFICIAL). Es más de calle; no lo evalué para interiores.
- City Kit (Commercial) 50 archivos y Modular Buildings 100 archivos son edificios, no mobiliario.
- No hay un pack "restaurant", "shop" ni "kitchen" separado: esas URLs devolvieron error (probado por slug; el listado general de Kenney se carga con JavaScript y no pude recorrerlo completo, así que puede haber packs que no vi).

---

## 2. Quaternius (quaternius.com)

- **URLs oficiales consultadas:** https://quaternius.com/ · /license.html · /faq.html · /packs/furniture.html · /packs/ultimatefurniture.html · /packs/ultimatehomeinterior.html · /packs/sushirestaurantkit.html · /packs/downtowncitymegakit.html
- **Licencia: hay dos mensajes contradictorios (OFICIAL, ambos en el sitio).**
  - FAQ: "All models are under the CC0 License." Sin atribución. Cada página de pack de muebles muestra "License: CC0" con enlace al deed. De 83 páginas de pack que bajé, 82 dicen CC0 y 1 dice QAL (Bestiary - Dungeon Monsters Kit).
  - `license.html`: "Quaternius Asset License (QAL) v1.0 - Last updated: 8/28/2026". Permite uso personal, educativo y comercial sin crédito. Prohíbe (§3a) "extract, repackage, sublicense, sell, or otherwise redistribute the Assets (in original or modified form) as a standalone asset, asset pack, stock file, template, or similar product, whether for free or for payment". Permite distribuir un Producto terminado que incorpore los assets. §7: las versiones nuevas valen para lanzamientos futuros; "the version in effect at the time you obtained the Assets governs".
  - El único snapshot de Wayback cercano a enero de 2026 para `license.html` es del 2026-08-29 (TERCERO), consistente con que la página sea nueva.
  - **Lectura prudente:** hoy los packs de muebles se publican como CC0 y la QAL parece aplicarse a lanzamientos nuevos. Pero el sitio está en transición y el texto de la QAL, si se aplicara a estos packs, impediría subir los archivos crudos a un repo público. Mi interpretación de que CC0 es irrevocable para lo ya descargado es conocimiento general, NO VERIFICADO en esta corrida.
  - **Mitigación:** descargar ya, guardar una captura/PDF de la página del pack con la fecha y el enlace al deed CC0 en `LICENSES/quaternius/`, y servir solo los GLB convertidos (no los FBX/Blend originales).
- **Packs relevantes (cantidad y formatos, OFICIAL, de las páginas de pack):**

| Pack | Modelos | Formatos | Licencia en la página |
|---|---|---|---|
| Ultimate House Interior Pack | 123 | FBX, OBJ, Blend (sin glTF) | CC0 |
| Furniture Pack | 23 | FBX, OBJ, Blend | CC0 |
| Ultimate Furniture Pack | 20 | FBX, OBJ, Blend | CC0 |
| Sushi Restaurant Kit | 108 | FBX, OBJ, Blend, **glTF** | CC0 |
| Downtown City MegaKit | 315 | FBX, Blend, glTF | CC0 (exterior urbano, no mobiliario) |

- **Categorías (Ultimate House Interior, según la descripción y los 82 títulos del bundle de Poly Pizza, TERCERO):** sofás (L, mediano, chico, grande), camas (single, king, cucheta), mesas redondas, sillas, banquetas, cajoneras, mesas de luz, estantes, inodoro, lavatorio, bañera, lavarropas, heladera, horno, bacha de cocina, lámparas (pie, mesa, techo, araña), plantas, alfombras, cortinas, puertas y ventanas (que Pascal ya hace paramétricas).
- **Estilo:** low-poly estilizado con paleta de atlas; combina con el editor.
- **Cómo se obtienen:** el botón "Download" de cada pack abre una carpeta de Google Drive (OFICIAL, está en el HTML de la página). El "All In One File" es de Patreon (pago).
- **Atajo en GLB:** Poly Pizza tiene el bundle "Ultimate House Interior Pack" con **82 modelos, todos etiquetados CC0 1.0** (https://poly.pizza/bundle/Ultimate-House-Interior-Pack-2SXnFbwFzm; OFICIAL de Poly Pizza). Ahí cada modelo se baja como GLB.
- **Comercio:** el Sushi Restaurant Kit trae "modular interior models" (descripción oficial de la página) y está en glTF. No verifiqué qué muebles trae. Quaternius no tiene góndolas ni caja registradora que yo haya confirmado.
- **Riesgos:** la licencia en transición (arriba); el formato FBX/OBJ exige conversión salvo que se use el bundle de Poly Pizza.
- **Nivel de verificación:** licencia, cantidad y formatos OFICIAL; contenido detallado TERCERO.

---

## 3. Poly Pizza (poly.pizza)

- **URLs oficiales consultadas:** https://poly.pizza · https://poly.pizza/docs/api/v1.1 (la página carga la spec) · **https://poly.pizza/apispec/v1.1.yaml** · https://poly.pizza/docs/tos · https://poly.pizza/support · búsquedas y páginas de usuarios/bundles del sitio.
- **Qué es:** biblioteca comunitaria low-poly. La portada dice "10,700+ free models" (OFICIAL). Los modelos son subidos por usuarios; incluye los modelos CC0 de Kenney (452), Quaternius (1411 en su perfil, 3,67 M de descargas), Kay Lousberg (224, todos CC0), Isa Lousberg (290: 260 CC0 y 30 CC-BY 3.0), CreativeTrio (134, CC0) y el archivo de Google Poly ("Poly by Google", CC-BY 3.0). (Conteos leídos del estado de las páginas, OFICIAL.)
- **Licencias:** por modelo, **CC0 1.0** o **CC-BY 3.0** (campo `Licence`; en el spec aparece "CC0 1.0" y "CC-BY 3.0"). Términos: "By downloading User Content made available by other Users, you agree to adhere to the terms of the Creative Commons license that applies at the time of download." (OFICIAL, ToS).
- **Atribución (OFICIAL, spec de la API):** "any use of a creative commons model requires attribution by law. You can included the provided attribution text ... ideally with the links as that's required by the licence, otherwise the model title and creator will do." La API devuelve el texto armado, por ejemplo `Fish by jeremy, https://poly.pizza/m/52s3JpUSjmX. Licence at https://creativecommons.org/licenses/by/3.0`. Para CC0 devuelve también un texto, pero no es obligatorio.
- **API: sí, REST, versión 1.1 (OFICIAL).** Base `https://api.poly.pizza/v1.1`. Autenticación con **API key en el encabezado `x-auth-token`**; la clave se crea en https://poly.pizza/settings/api ("create an app"), por lo tanto **requiere una cuenta gratuita del equipo** (no la creé). Endpoints: `GET /model/{id}`, `GET /list/{id}`, `GET /search` (solo filtros), `GET /search/{keyword}`, y los modelos de un usuario. Filtros: `Limit` (máx. 32), `Page`, `Category` (4 = "Furniture & Decor", 5 = "Objects", 8 = "Buildings"), `License` (**0 = solo CC-BY, 1 = solo CC0**), `Animated`. Cada modelo trae `Download` (URL directa a `.glb` en `static.poly.pizza`), `Tri Count`, `Creator`, `Licence`, `Attribution`. Recomiendan llamar a la API desde un servidor y cachear (la clave "could easily be sniffed and stolen").
- **Límites:** el spec no publica límite de pedidos. La página de apoyo menciona "Extra API credits" para suscriptores y "Unlimited API access" para sponsors, lo que sugiere un cupo para cuentas gratis (la cuota exacta es NO VERIFICADO).
- **Restricciones de uso (OFICIAL, ToS):** prohíbe scraping del sitio y acceder "other than through our currently available, published interfaces". Para bajar ~60 modelos hay que usar la API o los botones de descarga a mano, no un crawler. Tampoco se permite usar datos del servicio para entrenar IA.
- **Formatos:** GLB por la API; la página de un modelo muestra "FBX / GLTF format" (OFICIAL). Si el botón de descarga del sitio exige login: NO VERIFICADO.
- **Cantidad de muebles y comercio (conteos de resultados de búsqueda del sitio, incluyen coincidencias aproximadas):** chair 262, couch 254, sofa 227, table 161, bed 78, shelf 293, lamp 247, desk 220, fridge 76, wardrobe 69, cafe 56, restaurant 38, counter 16, shop 20, store 9, cash register 10, mannequin 13. Hay modelos concretos de comercio: "Cash register" (Poly by Google, CC-BY 3.0), "POS Machine" (J-Toastie, CC-BY 3.0), "Display Case" (CMHT Oculus, CC-BY 3.0), "Coat Rack" (Kenney y CreativeTrio, CC0), "Misc Hanger" (MilkAndBanana, CC0), "Container Shelf" (MilkAndBanana, CC0), "Counter Straight / Corner / Doors / Drawers / End" (Quaternius, CC0), "Countertop ..." (Isa Lousberg, CC0), "Market Stalls" (Quaternius, CC0).
- **Estilo:** heterogéneo. Lo CC0 de Kenney, Quaternius y Kay Lousberg es coherente entre sí; lo CC-BY de terceros (Google Poly, 2016-2018) mezcla niveles y paletas, y exige control visual.
- **Redistribuir:** CC0 sí; CC-BY 3.0 sí con atribución (autor, título, URL, licencia).
- **Riesgos:** calidad dispareja en CC-BY; atribución a mantener por modelo; la clave de API no debe ir al repo; el sitio puede retirar modelos (el ToS lo permite) pero lo ya descargado conserva la licencia con la que se bajó.
- **Nivel de verificación:** OFICIAL (spec, ToS y estado del sitio leídos).

---

## 4. Poly Haven (polyhaven.com/models)

- **URLs oficiales consultadas:** https://polyhaven.com/license · https://github.com/Poly-Haven/Public-API (README y `ToS.md`) · https://api.polyhaven.com/assets?t=models · `/files/<id>` · `/info/<id>` (solo metadatos JSON).
- **Licencia:** "Our assets are all licensed as CC0". "You do not need to give credit" (la atribución "is appreciated"). "You can redistribute them", incluso en productos que se venden. (OFICIAL.)
- **API pública:** sí, gratis, sin clave, `https://api.polyhaven.com` (OFICIAL). Términos de la API (OFICIAL, `ToS.md`): uso comercial permitido; cada llamada debe llevar un **User-Agent o Referer único** con el nombre de la app (§2.4); si se muestra contenido en vivo desde la API hay que dar un crédito visible tipo "Powered by Poly Haven" (§2.5), que **no aplica a los CC0 una vez descargados y alojados por nosotros**. Prohibido degradar el servicio. El sitio prohíbe scraping fuera de la API (§3.2 de los términos del sitio).
- **¿Hay muebles? Sí.** La API lista **521 modelos**; **85 con la categoría `furniture`** y **144 si se suman asientos, mesas, estantes, camas, oficina, electrodomésticos e iluminación** (conteo mío sobre la respuesta, OFICIAL). Ejemplos: Sofa_01, ArmChair_01, dining_table, dining_chair_02, painted_wooden_* (silla, mesa, sofá, estante, alacena, banco), Shelf_01, GothicBed_01, mid_century_lounge_chair, modern_coffee_table_01/02.
- **Comercio (OFICIAL, etiquetas del propio Poly Haven):** `CashRegister_01` (tags retail, store; 9927 triángulos, textura 8K), `steel_frame_shelves_01/02/03` (etiquetas "commercial" y "display"; son góndolas/estantes metálicos), `wooden_display_shelves_01`, `BarberShopChair_01`, `bar_chair_round_01`, `outdoor_table_chair_set_01` (tag cafe), `wooden_stool_01` (tag shop), `plastic_crate_01/02` (retail), `wooden_crate_02`, `CoffeeCart_01`. No hay mostrador ni vitrina ni perchero de ropa.
- **Formatos (OFICIAL, endpoint `/files`):** glTF (como `.gltf` + `.bin` + texturas JPG en carpeta, **no GLB**), FBX y Blend, a 1k, 2k, 4k y 8k, más USD. Hay que **empaquetar a GLB** (por ejemplo con gltf-transform). Tamaño de ejemplo en 1k: CashRegister_01 ≈ 1,0 MB, Sofa_01 ≈ 0,5 MB.
- **Metadatos útiles:** `/info/<id>` trae `dimensions` (en milímetros, por ejemplo Sofa_01 = [1571, 658, 796]), `polycount`, `categories`, `tags`, `authors`. Sirve para llenar `dimensions` y verificar la escala (el orden de los ejes no está documentado; NO VERIFICADO).
- **Estilo:** **realista PBR** (fotogrametría/modelado detallado). Distinto de Kenney/Quaternius; con texturas 1k queda aceptable y luce bien en 3D, pero rompe el aire limpio de los íconos 2D y pesa más. Usarlo solo para piezas "héroe" que no existen en estilo low-poly (góndola metálica, caja registradora).
- **Obtención y redistribución:** descarga manual o por API; se pueden alojar en Supabase y en repo público (CC0).
- **Riesgos:** peso y estilo; hay que fijar un User-Agent propio si se usa la API.
- **Nivel de verificación:** OFICIAL.

---

## 5. Sketchfab

- **URLs oficiales consultadas:** https://sketchfab.com/developers/download-api · /developers/download-api/guidelines · /developers/terms · https://api.sketchfab.com/v3/licenses · https://sketchfab.com/licenses · post oficial https://sketchfab.com/blogs/community/fab-publishing-portal-open-for-sketchfab-migration/
- **Licencias por modelo (OFICIAL, endpoint `/v3/licenses`):** CC Attribution 4.0 (`by`), `by-sa`, `by-nd`, `by-nc`, `by-nc-sa`, `by-nc-nd`, **CC0 (`cc0`)**, "Free Standard" y "Standard" (de pago). El propio endpoint resume: BY = "Author must be credited. Commercial use is allowed."; CC0 = "Credit is not mandatory. Commercial use is allowed."; BY-NC = "No commercial use."; BY-ND = "Modified versions can not be distributed."; BY-SA = "Modified versions must have the same license."
- **Para nosotros sirven solo CC0 y CC-BY 4.0.** Excluir NC (riesgo por el despliegue público), ND (convertir/escalar es modificar y lo distribuimos) y SA (copyleft).
- **Download API (OFICIAL):** extensión de la Data API; entrega glTF, GLB y USDZ ("Models are not currently available in their source formats"); "Downloading models requires users to be authenticated with a Sketchfab account"; el usuario final debe poder iniciar sesión **dentro de nuestra app** (OAuth2); para descargar sin login de usuario hay que contactar a Sketchfab. No basta con un token propio en el servidor.
- **Términos de desarrollo (OFICIAL):** la app debe mostrar la licencia CC y la atribución del autor (usuario + enlace), y "must clearly mention that downloadable models are provided by Sketchfab"; "The Creative Commons license and attribution must follow the asset everywhere it is used". Caché o almacenamiento de modelos descargados: **no lo regulan** esas páginas. Límites de pedidos: no aparecen.
- **¿Se pueden usar modelos CC0/CC-BY en una app?** La licencia CC lo permite (con crédito para CC-BY). La vía **manual** (una persona del equipo inicia sesión en el sitio, baja el GLB de un modelo CC0/CC-BY 4.0 y registra autor, URL y licencia) evita el requisito de OAuth, pero los términos del sitio para descargas manuales no los leí (NO VERIFICADO). La vía **automática** (descargar por API para alojar en Supabase) no es viable sin acuerdo con Sketchfab.
- **Contexto 2026:** KitBash adquirió Sketchfab y ArtStation de Epic (nota del 2026-08-10/12; TERCERO: varias notas de prensa en los resultados de búsqueda y Wikipedia; no abrí la nota de Epic). Un post oficial de 2024 dice que los CC0/BY-SA/BY-NC/BY-ND no migran a Fab y que "Integrations that use Sketchfab's Download API keep access to free content until Fab offers an equivalent public API" (OFICIAL, 2024-10-01). Qué pasará con la API bajo KitBash: NO VERIFICADO.
- **Cantidad:** la guía dice "More than 700,000 3D models are available for download under Creative Commons licenses"; la página de la API dice más de 1 millón de modelos (cifras inconsistentes entre sí, OFICIAL). No cuantifiqué muebles.
- **Estilo:** todo mezclado; hay que revisar uno por uno.
- **Veredicto:** fuente de rescate para piezas de comercio que no existan en otro lado (vitrina, góndola, perchero), una por una, con registro de autor.
- **Nivel:** OFICIAL (licencias, API, términos); contexto corporativo TERCERO.

---

## 6. Khronos glTF-Sample-Assets

- **URL oficial:** https://github.com/KhronosGroup/glTF-Sample-Assets (README, `Models/model-index.json`, y los `README.md` / `LICENSE.md` de cada modelo vía la API de GitHub).
- **Propósito:** "a curated collection of glTF models that illustrate one or more features or capabilities of glTF" (OFICIAL). No es una biblioteca de muebles.
- **Licencia:** **por modelo**, en el `LICENSE.md` / README de cada carpeta (OFICIAL). Los que miré: SheenChair = CC0 1.0 (los metadatos CC-BY 4.0); ChairDamaskPurplegold, GlamVelvetSofa, SpecularSilkPouf, AnisotropyBarnLamp, StainedGlassLamp, IridescenceLamp = **CC-BY 4.0** (© Wayfair); CommercialRefrigerator = CC-BY 4.0 (basado en "Commercial Fridge" de Sean Thomas, Sketchfab, CC-BY 4.0); SheenWoodLeatherSofa = CC-BY 4.0 (mejoras) sobre un original CC0 de Fran Calvente. Atribución para los CC-BY: "© 2021, Wayfair. CC BY 4.0" y el nombre del autor de cada README.
- **Formato:** hay carpeta `glTF-Binary` (GLB directo). Pesados: GlamVelvetSofa 3,1 MB, SheenChair 4,1 MB, CommercialRefrigerator 10,1 MB (OFICIAL, API de GitHub).
- **Cantidad útil:** 150 modelos en el índice; **solo unos 6 a 8 son mobiliario** (2 sillas, 2 sofás, 1 puf, 1 heladera comercial, lámparas). Uso previsto: probar visores, con extensiones glTF (sheen, anisotropía, iridiscencia, transmisión) que Pascal/three.js podrían no renderizar igual.
- **Estilo:** fotorrealista, texturas 2K+.
- **Veredicto:** **no como biblioteca.** Como mucho, 1 o 2 piezas sueltas (la heladera comercial es un caso de comercio, 10 MB y CC-BY 4.0) con su crédito.
- **Nivel:** OFICIAL.

---

## 7. Google Scanned Objects (Open Robotics / Gazebo Fuel)

- **URLs oficiales:** https://research.google/blog/scanned-objects-by-google-research-a-dataset-of-3d-scanned-common-household-items/ · https://arxiv.org/abs/2204.11918 (la página de Gazebo Fuel de la colección me dio 404, no pude leerla).
- **Licencia:** "licensed under the CC-BY 4.0 License" (OFICIAL, blog de Google Research, 2022-06-14). La ficha de arXiv solo dice "a Creative Commons license". Atribución obligatoria: citar a Google Research / el dataset.
- **Cantidad:** **1030 objetos, 13 GB**. Alojado en Gazebo Fuel, colección "Scanned Objects by Google Research" (hosted on Open Robotics).
- **Formatos:** modelos SDF que apuntan a mallas **Wavefront OBJ** (promedio 1,4 MB) y texturas **PNG** (promedio 11,2 MB) (OFICIAL). No hay GLB.
- **¿Sirven para interiores?** No para mobiliario. El blog los describe como "common household items" y da ejemplos como zapatos, juguetes y una olla a presión; no hay un desglose por categoría (OFICIAL). Son objetos chicos de mesada, de escaneo estructurado, con texturas de ~11 MB cada una: inaceptables para una web de planos y con estilo que choca con el editor.
- **Veredicto:** descartar (como mucho 2 o 3 utensilios de cocina decorativos, y todos exigen conversión y recorte de textura).
- **Nivel:** OFICIAL en licencia, cantidad y formato; la falta de muebles es mi lectura de las categorías mencionadas.

---

## 8. OpenGameArt e itch.io

Los 4 mejores que verifiqué (licencia leída en la página de cada uno):

| Pack | Autor | Licencia exacta | Contenido | Formatos | Nivel |
|---|---|---|---|---|---|
| **KayKit: Furniture Bits** (https://kaylousberg.itch.io/furniture-bits) | Kay Lousberg | "Creative Commons Zero v1.0 Universal (CC0)"; "Free for personal and commercial use, no attribution required." Pide "please don't resell unmodified copies or claim them as your own" (solicitud, no condición de CC0) | 50+ modelos gratis; Extra (+20 modelos y 3 texturas, desde US$3,95); Source (.blend, desde US$5,95). Textura de gradiente 1024x1024 | OBJ, FBX, glTF | OFICIAL |
| **KayKit: Restaurant Bits** (https://kaylousberg.itch.io/restaurant-bits) | Kay Lousberg | CC0, misma frase | 140+ modelos gratis (cocina y comida; la página no detalla mesas ni sillas); Extra +75 desde US$7,95 | OBJ, FBX, glTF | OFICIAL |
| **3D Interior Home Assets** (https://opengameart.org/node/172343) | mabaci | "CC0" (CC0 1.0 Universal) | 13 ítems: sillas, taburete, biblioteca, estante, cama, mesa de luz, sofá, banco, mesa, jarrón, cuadro, libros. ZIP de 771,7 KB | no figuran en la página | OFICIAL (licencia); formatos NO VERIFICADO |
| **3D Furniture Pack [new]** (https://opengameart.org/node/80530) | mehrasaur | CC0 | 28 modelos (2 camas, 6 sillas, 5 alacenas, 1 escritorio, 2 lámparas, 3 sofás, 3 taburetes, 6 mesas), **sin materiales** | .blend, .obj + .mtl, .fbx | OFICIAL |

Otros leídos: "Furniture Low Poly" de Quaternius en OGA (CC0, ZIP de 2,9 MB, formatos no listados; https://opengameart.org/content/furniture-low-poly) y el "Furniture Kit" de Kenney espejado en OGA (CC0, OBJ + PNG, 120 objetos; es una versión antigua, usar la de kenney.nl).

- **Redistribuir:** CC0, sí. Kay Lousberg pide no revender copias sin modificar: no sirve de problema legal aquí pero conviene respetar el espíritu (no publicar el ZIP original tal cual).
- **Obtención:** descarga manual desde itch.io ("name your own price", gratis) u OGA.
- **Nivel:** OFICIAL.

---

## 9. Otras fuentes descubiertas

### 9.1 Sweet Home 3D, "Free 3D models" (muy cercana al dominio: planos de interiores)
- **URL oficial:** https://www.sweethome3d.com/freeModels.jsp (OFICIAL).
- **Texto:** "Feel free to download these models, use them, modify them or even redistribute them, as long as you respect their Free Art license or Creative Commons Attribution license under which they are available." 1602 ZIP, "generally low-poly", en **OBJ + MTL**.
- **Licencias por autor:** 585 modelos de colaboradores del proyecto bajo **Free Art License**; 500 de Scopia bajo **CC-BY 3.0** (crédito exigido si se redistribuye el modelo o una obra derivada); 90 de Kator Legaz bajo CC-BY 3.0 US; 310 de Blend Swap (175 de dominio público/CC0 y 135 CC-BY 3.0); 25 de Reallusion bajo CC-BY 3.0 US. (Conteos sumados de los encabezados de la página.)
- **Comercio presente (por nombre en la lista):** Mannequin (male, female, girl, boy, baby), Shop window, Display Cabinet, Counter, Suits racked, Pinewood Rack (4 alturas) y Bar stool (Free Art License); Clothes rack y Shopping basket (Scopia, CC-BY 3.0); Cafe-table y Cafe-chair (Kator Legaz, CC-BY 3.0 US).
- **Riesgos:** la **Free Art License es copyleft** (los derivados deben quedar bajo la misma licencia); no leí su texto, así que su efecto sobre un GLB convertido que alojamos es NO VERIFICADO. Calidad de modelos desigual (varios con más de 15 años). Los ZIP son de un modelo con su `.mtl`, hay que convertir OBJ a GLB.
- **Estilo:** low-poly, funcional, bien proporcionado (los modelos de Sweet Home 3D se usan con medidas reales).

### 9.2 Amazon Berkeley Objects (ABO)
- **URL oficial:** https://amazon-berkeley-objects.s3.amazonaws.com/index.html (OFICIAL).
- **Licencia:** "licensed under the Creative Commons Attribution 4.0 International Public License (CC BY 4.0)"; crédito para "Amazon.com" por datos, imágenes y modelos 3D. **Aviso:** mis recuerdos previos de ABO eran de una licencia NC; la página de hoy dice BY 4.0, pero conviene confirmar el `LICENSE-CC-BY-4.0.txt` dentro del archivo antes de usar (no lo abrí; NO VERIFICADO).
- **Contenido:** más de 7.900 productos con modelo 3D en **glTF 2.0** con texturas 4K PBR; 147.702 productos en total; archivo `abo-3dmodels.tar` de **154 GB** (no se puede bajar entero; uso por objeto sin verificar). Incluye muebles (la muestra es un sofá de la categoría "Furniture/Living Room Furniture/Sofas & Couches"), pero es catálogo de Amazon, con **marcas y logos de terceros** en muchos productos.
- **Veredicto:** demasiado pesado y fotorrealista para este editor; riesgo de marcas. Solo como cantera de último recurso.

### 9.3 Descartadas o no evaluadas
- BlenderKit: la URL de licencias redirigió a otro dominio (`blendkit.com`), no la seguí; exige cuenta y complemento de Blender. NO VERIFICADO.
- Fab, Objaverse, ShapeNet, 3D-FUTURE: no las investigué. No hay datos verificados sobre ellas; si alguna aparece como candidata, leer la licencia primero.

---

## 10. Cobertura de COMERCIO (lo que realmente existe, verificado por nombre)

| Necesidad | Mejor opción CC0 | Alternativa con atribución | Nota |
|---|---|---|---|
| Góndola / estantería de góndola | Kenney Mini Market `shelf-end`, `shelf-boxes`, `shelf-bags`; Poly Haven `steel_frame_shelves_01..03`, `wooden_display_shelves_01` | Poly Pizza "Shelf" de varios autores (CC-BY 3.0) | los de Poly Haven son realistas; los de Kenney, estilizados |
| Caja registradora | Kenney Mini Market `cash-register`; Poly Haven `CashRegister_01` (vintage, 8K) | Poly Pizza "Cash register" (Poly by Google, CC-BY 3.0), "POS Machine" (J-Toastie, CC-BY 3.0) | OK |
| Mostrador / counter | Poly Pizza "Counter Straight / Corner / End / Drawers / Doors" (Quaternius, CC0), "Countertop ..." (Isa Lousberg, CC0), Kenney `kitchenBar`, `kitchenBarEnd` | Sweet Home 3D "Counter" (Free Art License) | son mostradores de cocina; para atención al público hay que combinarlos |
| Vitrina / exhibidor | Kenney `display-bread`, `display-fruit` (Mini Market) | Poly Pizza "Display Case" (CMHT Oculus, CC-BY 3.0); Sweet Home 3D "Display Cabinet", "Shop window" | no hay vitrina de vidrio CC0 confirmada |
| Mesa y silla de café/restaurante | Kenney `table`, `tableRound`, `chair`, `stoolBar`, `stoolBarSquare`; Poly Haven `bar_chair_round_01`, `outdoor_table_chair_set_01`; KayKit y Quaternius Sushi Restaurant Kit | Sweet Home 3D "Cafe-table", "Cafe-chair" (CC-BY 3.0 US) | cubierto |
| Perchero de ropa | Kenney `coatRack`, `coatRackStanding`; Poly Pizza "Coat Rack" (CreativeTrio, CC0), "Misc Hanger" (MilkAndBanana, CC0) | Sweet Home 3D "Clothes rack" (Scopia, CC-BY 3.0), "Suits racked" y "Mannequin" (Free Art License) | los CC0 son de uso doméstico |
| Heladera comercial / freezer | Kenney Mini Market `freezer`, `freezers-standing` | Khronos CommercialRefrigerator (CC-BY 4.0, 10 MB) | OK |

---

## 11. Tabla comparativa resumida

| Fuente | Licencia | GLB directo | Muebles útiles aprox. | Comercio | Estilo | Redistribuir | Verificación |
|---|---|---|---|---|---|---|---|
| Kenney Furniture Kit | CC0 | sí (TERCERO) | ~120 (+20 estructura) | poco (perchero, bar) | low-poly plano, muy limpio | sí | OFICIAL licencia; TERCERO formato |
| Kenney Mini Market | CC0 | sí (TERCERO) | ~11 | **sí** (caja, góndolas, freezers) | igual | sí | OFICIAL / TERCERO |
| Quaternius (House Interior, Furniture, Sushi Restaurant) | CC0 en las páginas; **QAL v1.0 publicada 8/28/2026** | no (FBX/OBJ), salvo bundle de Poly Pizza (82 GLB) y Sushi (glTF) | 123 + 23 + 20 | algo (Sushi Restaurant) | low-poly con paleta | sí si CC0; **no** el pack crudo si rige la QAL | OFICIAL; licencia ambigua |
| Poly Pizza | CC0 o CC-BY 3.0 por modelo | sí | miles (búsqueda) | parcial | mixto | sí (con crédito si CC-BY) | OFICIAL |
| Poly Haven | CC0 | glTF multiarchivo (empaquetar) | 85 (144 ampliado) | **sí** (góndolas, caja) | realista PBR | sí | OFICIAL |
| Sketchfab | CC0/CC-BY 4.0 (excluir NC/ND/SA) | glTF/GLB solo con OAuth del usuario | enorme | sí, caso por caso | mixto | licencia sí; API no automatizable | OFICIAL |
| Khronos Sample Assets | CC0 / CC-BY 4.0 por modelo | sí | 6 a 8 | 1 (heladera) | fotorrealista pesado | sí | OFICIAL |
| Google Scanned Objects | CC-BY 4.0 | no (OBJ+PNG) | ~0 muebles | no | escaneo | sí | OFICIAL |
| KayKit (itch.io) | CC0 | glTF | 50+ y 140+ (cocina) | algo (cocina/restaurant) | low-poly | sí (pide no revender el ZIP tal cual) | OFICIAL |
| OGA (mabaci, mehrasaur) | CC0 | no listado / .obj/.fbx | 13 y 28 | no | low-poly sin textura | sí | OFICIAL |
| Sweet Home 3D | Free Art License / CC-BY 3.0 / CC0 | no (OBJ+MTL) | cientos | **sí** (maniquíes, percheros, vidriera) | low-poly funcional | sí con condiciones | OFICIAL; texto de FAL no leído |
| Amazon Berkeley Objects | CC BY 4.0 (a confirmar en el archivo) | glTF 2.0, 4K | miles | no | realista pesado | sí con crédito | OFICIAL; confirmar licencia |

---

## 12. RECOMENDACIÓN priorizada

**1) Kenney (Furniture Kit + Mini Market)** como base. Es CC0, está en GLB (según espejo), tiene el estilo más cercano a lo que muestra Pascal, y es la única fuente libre que cubre tanto vivienda (sala, dormitorio, cocina, baño, oficina) como una tienda mínima (caja, góndolas, freezers, exhibidores). Obtener el ZIP oficial de kenney.nl y verificar abriendo el ZIP que de verdad traiga `GLTF format/*.glb`.

**2) Quaternius vía Poly Pizza (bundle "Ultimate House Interior Pack", 82 GLB CC0) + Poly Pizza CC0 filtrado por la API (`License=1`, `Category=4`)** para completar: mostradores de cocina/atención, estantes, placares, mesas de luz, y modelos de Kay Lousberg, Isa Lousberg y CreativeTrio. Todo CC0 y ya en GLB. Guardar una captura fechada de la licencia CC0 de cada pack de Quaternius por la transición a la QAL. Si el equipo prefiere cero riesgo, reemplazar lo de Quaternius por KayKit Furniture Bits (CC0) y quedarse con Kenney + Poly Haven.

**3) Poly Haven (solo ~8 a 12 piezas "héroe" de comercio)**: `steel_frame_shelves_01/02/03`, `wooden_display_shelves_01`, `CashRegister_01`, `BarberShopChair_01`, `bar_chair_round_01`, `outdoor_table_chair_set_01`, y 2 o 3 sofás/sillones realistas si se quiere una variante "premium". CC0, API sin clave, `dimensions` real en el JSON. Empaquetar a GLB a 1k.

**Reserva para vacíos de comercio (con atribución):** Sweet Home 3D (maniquíes, percheros de ropa, vidriera, vitrina, mesa y silla de café) y Poly Pizza CC-BY (Display Case, POS Machine). Cada uno exige crédito en pantalla y en `ATTRIBUTIONS.md`; la Free Art License requiere leer su texto antes de usarla.

**Descartar:** Google Scanned Objects (sin muebles), Khronos como biblioteca (solo piezas sueltas), ABO (peso y marcas), y cualquier modelo con licencia NC, ND o SA.

### Composición sugerida para ~60 modelos (orientativa)
- ~30 Kenney Furniture Kit: sofás, camas, mesas, escritorios, bibliotecas, cocina (módulos y heladera), baño, lámparas, TV, plantas y alfombras.
- ~11 Kenney Mini Market: caja, 3 góndolas, 2 freezers, 2 exhibidores, carrito y canasto.
- ~8 Quaternius (por Poly Pizza): mostradores, placares, cajoneras, mesas de luz, estantes.
- ~8 a 10 Poly Haven: góndolas metálicas, caja vintage, sillas de bar/café, sillón de peluquería.
- ~3 a 5 de reserva con atribución (perchero de ropa, vitrina, maniquí).

### Horas aproximadas para llevar ~60 modelos al formato del catálogo (ESTIMACIÓN MÍA, NO VERIFICADO)
Supuestos: GLB en metros, origen en el centro de la base, `dimensions` calculadas desde el bounding box, miniatura y ícono 2D por modelo, ficha de licencia por modelo, y una pasada visual en el editor.

| Tarea | Horas |
|---|---|
| Armar el pipeline una vez (Node con gltf-transform: normalizar escala a metros, recentrar origen a la base, calcular `dimensions`, comprimir texturas, empaquetar glTF a GLB; Blender headless para FBX/OBJ a GLB; render de miniatura y silueta 2D) | 8 a 12 |
| Por modelo después del pipeline: elegir, descargar, correr, revisar pivote/escala/orientación, `tags` de ubicación (`floor`/`wall`/`ceiling`/`countertop`), `surface`/`attachTo` donde corresponda: 4 a 6 min × 60 | 4 a 6 |
| Casos problemáticos (≈15 %: escala rara, origen desplazado, materiales faltantes): 10 a 15 min × 9 | 1,5 a 2,5 |
| `ATTRIBUTIONS.md`, carpeta `LICENSES/` con capturas fechadas, pantalla de créditos, campos `license`, `author`, `sourceUrl` por modelo | 2 a 3 |
| Subida a Supabase Storage, manifest/migración del catálogo e integración con el panel de muebles, prueba en el editor | 3 a 4 |
| **Total (ambos alumnos)** | **≈ 19 a 28 h (≈ 10 a 14 h por persona)** |

Si solo se usan fuentes con GLB directo (Kenney y Poly Pizza CC0), el extremo bajo (~19 h) es realista; sumar Poly Haven (empaquetado y recorte de texturas) y FBX/OBJ de Quaternius acerca el total al extremo alto. La escala real de cada pack (si 1 unidad = 1 m) **no la verifiqué**: hay que medirla con un objeto de referencia (puerta ~2 m, cama ~2 m) al abrir el primer GLB de cada pack.

### Recomendaciones de cumplimiento (aplican a cualquier opción)
1. Guardar por modelo: `license` (CC0 / CC-BY 3.0 / CC-BY 4.0), `author`, `sourceUrl`, `retrievedAt`, y la cadena `Attribution` que entrega Poly Pizza.
2. Mostrar una pantalla "Créditos" en la app y un `ATTRIBUTIONS.md` en el repo. Obligatoria para CC-BY; recomendable para CC0.
3. No publicar los archivos originales (FBX/Blend/ZIP) en el repo; solo los GLB convertidos más el manifest. Esto reduce el riesgo si la QAL de Quaternius llegara a aplicarse y respeta la solicitud de Kay Lousberg.
4. No poner la API key de Poly Pizza en el repo ni en el cliente; descargar los modelos una sola vez con un script local.
5. Dejar fuera todo modelo NC, ND o SA y todo con marcas/logos reconocibles.

---

## 13. Qué NO pude confirmar
- Los formatos reales dentro del ZIP oficial de Kenney (la lista GLB viene de un espejo; no bajé el ZIP).
- La escala, el origen y la orientación de los GLB de Kenney, Quaternius y Poly Pizza (no abrí ningún modelo).
- El cupo gratis de la API de Poly Pizza y si su sitio permite bajar sin iniciar sesión.
- La situación real de licencias de Quaternius a futuro (CC0 en sus páginas, QAL en `license.html`).
- Cómo quedará la Download API de Sketchfab bajo KitBash; los términos del sitio para descargas manuales.
- El texto completo de la Free Art License y su efecto sobre un GLB convertido.
- La licencia efectiva del contenido de ABO (la página dice CC BY 4.0, el archivo no se abrió).
- El orden de ejes de `dimensions` en la API de Poly Haven.
- Packs de Kenney que no aparezcan por slug (el listado general se carga con JavaScript).

## 14. Fuentes principales (consultadas)
- Kenney: https://kenney.nl/assets/furniture-kit · https://kenney.nl/assets/mini-market · https://kenney.nl/support. Espejos TERCERO: https://github.com/RetroDECK/RetroQUEST (carpeta `assets/kenney_furniture-kit`) · https://github.com/AkiraNim/CLTCrossing (carpeta `kenney_mini-market`).
- Quaternius: https://quaternius.com/license.html · https://quaternius.com/faq.html · https://quaternius.com/packs/ultimatehomeinterior.html · /furniture.html · /ultimatefurniture.html · /sushirestaurantkit.html · https://poly.pizza/bundle/Ultimate-House-Interior-Pack-2SXnFbwFzm
- Poly Pizza: https://poly.pizza/apispec/v1.1.yaml · https://poly.pizza/docs/tos · https://poly.pizza/support
- Poly Haven: https://polyhaven.com/license · https://github.com/Poly-Haven/Public-API · https://api.polyhaven.com/assets?t=models
- Sketchfab: https://sketchfab.com/developers/download-api · /developers/download-api/guidelines · /developers/terms · https://api.sketchfab.com/v3/licenses · https://sketchfab.com/blogs/community/fab-publishing-portal-open-for-sketchfab-migration/
- Khronos: https://github.com/KhronosGroup/glTF-Sample-Assets
- Google Scanned Objects: https://research.google/blog/scanned-objects-by-google-research-a-dataset-of-3d-scanned-common-household-items/ · https://arxiv.org/abs/2204.11918
- KayKit / OGA: https://kaylousberg.itch.io/furniture-bits · https://kaylousberg.itch.io/restaurant-bits · https://opengameart.org/node/172343 · https://opengameart.org/node/80530 · https://opengameart.org/content/furniture-low-poly
- Sweet Home 3D: https://www.sweethome3d.com/freeModels.jsp
- ABO: https://amazon-berkeley-objects.s3.amazonaws.com/index.html

# Spec 2 — Tienda: catálogo de comercio y plantillas

**Proyecto:** diseñador de interiores 2D + 3D para viviendas y comercios (TP final de IISAIA, FIUBA).
**Fecha:** 2026-10-11 · **Estado:** borrador para revisión del equipo · **Idioma:** español.
**Antecedentes:** [spec 1](2026-10-11-fundacion-y-persistencia-design.md) (implementado en local, PR #1), [`docs/ESTADO.md`](../../ESTADO.md) y el brainstorming del 2026-10-11 (decisiones D1–D6 abajo).

## 1. Objetivo

Que quien arma un **comercio** encuentre piezas de tienda en el editor y pueda **partir de una plantilla de showroom** (concept store de 2 niveles, café con terraza, supermercado de barrio o loft de doble altura) en vez de una escena vacía. Las plantillas muestran el potencial del editor: **varios niveles con escalera, materiales de la biblioteca de Pascal** (parquet, ladrillo, terrazo, concreto pulido, pinturas), zócalos y cornisas, y decenas de piezas. No cambia la API ni el contrato del spec 1.

### Criterios de éxito (verificables)
1. `pnpm install && pnpm verify` termina en verde desde un clon limpio.
2. El panel de muebles tiene una pestaña **Comercio** con al menos **20 piezas** (12 de Kenney y 8 o más de Pascal); una prueba pide la URL local de cada modelo y de cada textura y **ninguna da 404**.
3. El **gabinete paramétrico** (`cabinet`) aparece en el panel y arma su herramienta nativa (recupera lo que el spec 1 perdió al autoalojar el catálogo).
4. Existen **4 plantillas** (`concept-store`, `cafe`, `supermercado`, `loft`) como escena válida (`SceneEnvelope`, ≤ 5 MB) con miniatura. Una prueba comprueba, **por definición**: ambientes cerrados (salvo los bordes declarados abiertos), puertas y ventanas dentro de su muro, piezas dentro de un ambiente, que cada pieza exista en el catálogo y que cada material exista en la biblioteca de Pascal. Al menos **dos** plantillas tienen **2 niveles con escalera** y cada una usa **5 o más materiales distintos**.
5. En un navegador real: **crear un proyecto desde "Concept store" y recargar** deja la escena con los mismos niveles, ambientes y piezas, y **ninguna textura da 404**.
6. Si el guardado de la escena falla después de crear el proyecto, queda un proyecto vacío y la interfaz ofrece **reintentar** (prueba unitaria).
7. `THIRD_PARTY_NOTICES.md` acredita Kenney y Pascal.

## 2. Qué NO hace este spec

Sin interfaz final del diseño de Pencil (spec de shell), sin subida de muebles propios, sin marcadores ni notas, sin flujo de render, sin cambios en la API ni en `openapi.yaml`, sin el servidor MCP de Pascal (ver D6), sin variantes de plantilla (una por tipo) y sin piezas BIM ni modelos fuera de Kenney y del repo de Pascal.

## 3. Decisiones

| # | Pregunta | Decisión | Alternativas descartadas | Razón / costo asumido |
|---|---|---|---|---|
| D1 | ¿Qué cubre? | **Concept store de 2 niveles** (tienda minorista), **café de especialidad con terraza**, **supermercado de barrio** y un **loft de doble altura** (vivienda). Una por tipo, más "en blanco" | Plantillas básicas (local de una planta, departamento de 4 cuartos); dos variantes por tipo | El pedido del equipo es mostrar el potencial, no ambientes básicos. Costo: más trabajo de armado y de revisión visual por plantilla; sin oficina ni consultorio (siguiente entrega). |
| D2 | ¿Cómo se cubren las piezas que faltan (caja, freezer, góndola, exhibidores)? | **Kenney Mini Market** (CC0): 12 de sus 20 modelos | Armar solo con lo que hay; piezas procedurales de Pascal | [verificado 2026-10-11] ZIP de 1,1 MB, 20 GLB, licencia CC0. Plan B si fallara: armarlas con mostrador + computadora y estante paramétrico. |
| D3 | ¿Cómo se arman las plantillas? | **Constructor reproducible**: una definición compacta por plantilla y un script que usa el **runtime real de `@pascal-app/core` en Node** para producir el JSON; Playwright solo saca la miniatura y verifica | A mano en el editor; JSON escrito a mano; script solo en navegador | [verificado] `@pascal-app/core` importa y valida en Node (`WallNode.parse`, `ZoneNode`, `SlabNode`, `CeilingNode`, `DoorNode`, `WindowNode`, `ItemNode`). Se revisa como código y se regenera si cambia Pascal. Refina lo acordado ("en el editor real"): mismo runtime, sin navegador. |
| D4 | ¿Cómo se crea un proyecto desde plantilla? | **En el navegador**: `POST /v1/projects` y luego `PUT .../scene` con `If-Match: 1` | Un `templateId` en la API | No toca contrato ni API. Costo: dos pasos no atómicos; se compensa con el reintento (criterio 6). |
| D5 | ¿Dónde viven las piezas nuevas? | Pestaña **Comercio** propia con `ItemsPanel items=…`; las piezas reutilizan las categorías que Pascal ya entiende (`furniture`, `appliance`) | Agregar una categoría nueva al tipo de Pascal | La categoría es un tipo cerrado de Pascal; una pestaña propia no lo toca. |
| D7 | ¿De dónde salen los materiales? | **Biblioteca de Pascal por id** (`library:<id>`): pisos, muros y cielos con `materialPreset`, zócalo y cornisa activados. Las texturas que el repo MIT **no** trae (madera, ladrillo, azulejo, mármol) se piden al **CDN predeterminado de Pascal** mediante un `rewrite` de Next; un archivo local siempre tiene prioridad | Solo materiales locales; copiar las texturas del CDN al repo | [verificado] el repo trae textura para 66 de los 114 materiales (concreto, metal, telas, cueros y todas las pinturas lisas); el CDN responde `200` con `Access-Control-Allow-Origin: *` y es el que usan sus paquetes por defecto. Costo: dependencia en vivo de `editor.pascal.app` y licencia de esas texturas sin declarar (uso educativo; no se redistribuyen). **Plan B:** solo materiales locales (concreto pulido, pinturas, metal). |
| D8 | ¿Plantillas de más de un nivel? | **Sí**: la definición tiene `levels[]`; la escalera recta de Pascal conecta niveles y el entrepiso deja un borde abierto hacia la planta baja | Solo plantas únicas | [verificado] un prototipo con 2 niveles, escalera, parquet, ladrillo y zócalos se abre en el editor sin errores. Costo: la orientación de la escalera se calibra a ojo en la revisión visual. |
| D6 | ¿Y el MCP de Pascal? | **Fuera de esta entrega** | Usarlo para armar las escenas | [verificado] existe (`@pascal-app/cli` 1.0.3, MCP local sin cuenta) pero su documentación solo da por verificado macOS y no lista las herramientas de edición ni el export. Se reevalúa en un spike aparte. |

## 4. Arquitectura

```
apps/web/
  scripts/vendor-kenney-mini-market.ts     descarga el ZIP (SHA-256 fijo), extrae 12 GLB + colormap.png, escribe el manifest
  scripts/build-templates.ts               corre las definiciones con @pascal-app/core en Node → public/templates/*.json|svg
  src/lib/templates/definitions/*.ts       definiciones por nivel (muros, ambientes, aberturas, piezas, escaleras, materiales)
  public/items/kenney-*/model.glb, Textures/colormap.png
  public/templates/<id>.json, <id>.svg       escena y plano (miniatura SVG generada de la definición)
  src/editor/commerce-catalog.ts           AssetInput de cada pieza (dimensiones medidas del propio modelo)
  src/editor/templates.ts                  metadatos + createFromTemplate(api, {name, kind, templateId})
  src/editor/catalog.ts                    (cambia) localizeCatalogItem conserva ítems con `tool` y sin modelo (cabinet)
```

- **Piezas.** El script de Kenney verifica el SHA-256 del ZIP, extrae las 12 piezas (`cash-register`, `freezer`, `freezers-standing`, `shelf-bags`, `shelf-boxes`, `shelf-end`, `display-bread`, `display-fruit`, `shopping-cart`, `shopping-basket`, `bottle-return`, `character-employee`) y copia cada GLB a `public/items/kenney-<nombre>/model.glb` con su `Textures/colormap.png` al lado (los GLB referencian la textura por ruta relativa). Las dimensiones se calculan del propio GLB. La pestaña **Comercio** suma las piezas de Pascal útiles para comercio (mostrador de cocina, perchero, taburetes, computadora, espejos, cafetera, heladera, extintor, salida de emergencia, alfombras, plantas, mesas y sillas) y el `cabinet`.
- **Definición de plantilla.** `{ id, kind, name, resumen, levels[{ id, altura, materiales por defecto de muros, zócalo, muros[{id, de, a, alto?, material interior/exterior?}], ambientes[{nombre, rectángulo, color, piso, cielo, bordes abiertos?}], aberturas[{tipo: puerta|ventana, muro, desplazamiento, ancho, alto?, antepecho?}], piezas[{catálogoId, x, z, giroY, y?}], escaleras[{id, x, z, giro, ancho, escalones, hacia}] }] }`. El constructor crea sitio, edificio, un nodo por nivel, muros (con espesor, altura y material), una losa con su piso y un cielo por ambiente, zonas, aberturas, piezas y escaleras, y serializa `{ nodes, rootNodeIds, collections, materials, installedPlugins }` dentro del `SceneEnvelope` del spec 1. La miniatura es el plano de la planta baja en SVG, generado de la misma definición.
- **Contenido de las plantillas.** *Concept store de 2 niveles* (~150 m²): salón de ventas con parquet y muro de ladrillo, doble vidriera, barra de café con terrazo, depósito y baño; entrepiso de showroom y oficina con escalera. *Café de especialidad con terraza* (~140 m²): salón de madera con barra y mesas, cocina y baño con azulejo, depósito y terraza con parapeto, sombrillas y plantas. *Supermercado de barrio* (~200 m²): salón de concreto pulido con freezers, góndolas en pasillos, cajas y carritos, panadería, depósito con portón, oficina y baños. *Loft de doble altura* (~100 m²): cocina con isla, comedor y estar sobre concreto pulido con muro de ladrillo, baño, estudio y dormitorio en el entrepiso. Las medidas finales se ajustan al armarlas.
- **Crear desde plantilla.** `createFromTemplate` llama a `api.createProject`, pide `public/templates/<id>.json`, valida con `SceneEnvelopeSchema` y el límite de 5 MB, y guarda con `api.saveScene(id, envelope, 1)`. Si falla el guardado devuelve el proyecto creado y un error para que la pantalla ofrezca reintentar sin crear otro. La pantalla `/proyectos` suma el paso **plantilla** (mínimo y funcional).
- **Aislamiento (D8 del spec 1).** Solo `apps/web/src/editor/` importa Pascal; los scripts de `scripts/` no son parte de la aplicación y pueden importar `@pascal-app/core` (el test de fronteras mira solo `.ts`/`.tsx`).

## 5. Estrategia de pruebas

- **Definiciones** (`vitest`, TDD): ambientes cerrados y sin solapes, aberturas dentro del muro, piezas dentro de un ambiente, catálogo existente y área aproximada.
- **Constructor:** el JSON generado pasa `SceneEnvelopeSchema`, no pasa de 5 MB y tiene la cantidad esperada de muros, zonas, losas, cielos, aberturas y piezas.
- **Catálogo:** `localizeCatalogItem` conserva `cabinet`; la pestaña Comercio no repite ids; cada URL local existe (script que lee el manifest y comprueba archivos, y una prueba que los pide al servidor).
- **`createFromTemplate`** con cliente de API falso: camino feliz, fallo del `PUT` (devuelve el proyecto para reintentar) y plantilla inexistente.
- **Navegador real (Playwright):** crear desde "Tienda minorista", recargar y contar ambientes y piezas; abrir cada plantilla sin errores de consola.
- **Verificación visual** manual de las 4 plantillas (captura 3D y planta) antes de cerrar.

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Escena construida por código que Pascal dibuja mal (losa, cielo o abertura mal parentadas) | Primera tarea: un **spike** que arma un cuarto con puerta y ventana, lo abre en el editor y compara con `scene_19.json`; si falla, se cambia D3 por "a mano en el editor y exportar". |
| Una textura que el CDN de Pascal deje de servir, o que tarde | El `rewrite` solo cubre `/material/*`; una prueba en navegador falla si alguna textura de las plantillas da 4xx. Plan B (D7): materiales locales. |
| La escalera sube en otra dirección o queda fuera del entrepiso | Revisión visual con captura de cada plantilla y ajuste de `giro` y posición. |
| Escala u origen de los GLB de Kenney distintos a los de Pascal | Se miden en el script y se ajustan `scale`/`offset`; revisión visual con una captura por pieza. |
| La textura externa no carga desde la carpeta del modelo | Probado en el spike; plan B: incrustar la textura en el GLB. |
| Peso de las plantillas | Escenas pequeñas (decenas de nodos); límite de 5 MB verificado por prueba. |
| Kenney deja de publicar el ZIP | El SHA-256 fijo hace que el script falle en voz alta; los archivos ya vendoreados quedan en el repo. |

## 7. Dependencias y trabajo posterior

**A cargo de ustedes:** nada nuevo en infraestructura; la descarga del ZIP de Kenney ya está autorizada y verificada (1,1 MB, CC0).
**Siguiente spec:** interfaz (shell visual con el diseño de Pencil: dock propio, Ver/Editar, plantilla primero con su diseño final).

## 8. Preguntas abiertas

1. ¿Los nombres y los tamaños de las plantillas (§4) son los que quieren mostrar en el Demo Day?
3. ¿Aceptan depender del CDN de Pascal para madera, ladrillo, azulejo y mármol (D7), o prefieren el plan B de solo materiales locales?
2. ¿Se acredita a Kenney en la interfaz (pantalla "Acerca de") además de `THIRD_PARTY_NOTICES.md`? Su licencia CC0 no lo exige.

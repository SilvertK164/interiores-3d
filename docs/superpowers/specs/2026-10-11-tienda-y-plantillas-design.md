# Spec 2 — Tienda: catálogo de comercio y plantillas

**Proyecto:** diseñador de interiores 2D + 3D para viviendas y comercios (TP final de IISAIA, FIUBA).
**Fecha:** 2026-10-11 · **Estado:** borrador para revisión del equipo · **Idioma:** español.
**Antecedentes:** [spec 1](2026-10-11-fundacion-y-persistencia-design.md) (implementado en local, PR #1), [`docs/ESTADO.md`](../../ESTADO.md) y el brainstorming del 2026-10-11 (decisiones D1–D6 abajo).

## 1. Objetivo

Que quien arma un **comercio** encuentre piezas de tienda en el editor y pueda **partir de una plantilla** (tienda minorista, café, minimercado o departamento) en vez de una escena vacía, sin cambiar la API ni el contrato del spec 1.

### Criterios de éxito (verificables)
1. `pnpm install && pnpm verify` termina en verde desde un clon limpio.
2. El panel de muebles tiene una pestaña **Comercio** con al menos **20 piezas** (12 de Kenney y 8 o más de Pascal); una prueba pide la URL local de cada modelo y de cada textura y **ninguna da 404**.
3. El **gabinete paramétrico** (`cabinet`) aparece en el panel y arma su herramienta nativa (recupera lo que el spec 1 perdió al autoalojar el catálogo).
4. Existen **4 plantillas** (`tienda-minorista`, `cafe`, `minimercado`, `departamento`) como escena válida (`SceneEnvelope`, ≤ 5 MB) con miniatura, y una prueba comprueba, **por definición**, ambientes cerrados, puertas y ventanas dentro de su muro, piezas dentro de un ambiente y que cada pieza exista en el catálogo.
5. En un navegador real: **crear un proyecto desde "Tienda minorista" y recargar** deja la escena con los mismos ambientes y la misma cantidad de piezas.
6. Si el guardado de la escena falla después de crear el proyecto, queda un proyecto vacío y la interfaz ofrece **reintentar** (prueba unitaria).
7. `THIRD_PARTY_NOTICES.md` acredita Kenney y Pascal.

## 2. Qué NO hace este spec

Sin interfaz final del diseño de Pencil (spec de shell), sin subida de muebles propios, sin marcadores ni notas, sin flujo de render, sin cambios en la API ni en `openapi.yaml`, sin el servidor MCP de Pascal (ver D6), sin variantes de plantilla (una por tipo) y sin piezas BIM ni modelos fuera de Kenney y del repo de Pascal.

## 3. Decisiones

| # | Pregunta | Decisión | Alternativas descartadas | Razón / costo asumido |
|---|---|---|---|---|
| D1 | ¿Qué comercios cubre? | **Tienda minorista, café/restaurante y minimercado**, más un **departamento** de 2 ambientes | Solo comercio; dos variantes por tipo | Cubre vivienda y comercio con 4 escenas bien armadas. Costo: sin oficina ni consultorio (siguiente entrega). |
| D2 | ¿Cómo se cubren las piezas que faltan (caja, freezer, góndola, exhibidores)? | **Kenney Mini Market** (CC0): 12 de sus 20 modelos | Armar solo con lo que hay; piezas procedurales de Pascal | [verificado 2026-10-11] ZIP de 1,1 MB, 20 GLB, licencia CC0. Plan B si fallara: armarlas con mostrador + computadora y estante paramétrico. |
| D3 | ¿Cómo se arman las plantillas? | **Constructor reproducible**: una definición compacta por plantilla y un script que usa el **runtime real de `@pascal-app/core` en Node** para producir el JSON; Playwright solo saca la miniatura y verifica | A mano en el editor; JSON escrito a mano; script solo en navegador | [verificado] `@pascal-app/core` importa y valida en Node (`WallNode.parse`, `ZoneNode`, `SlabNode`, `CeilingNode`, `DoorNode`, `WindowNode`, `ItemNode`). Se revisa como código y se regenera si cambia Pascal. Refina lo acordado ("en el editor real"): mismo runtime, sin navegador. |
| D4 | ¿Cómo se crea un proyecto desde plantilla? | **En el navegador**: `POST /v1/projects` y luego `PUT .../scene` con `If-Match: 1` | Un `templateId` en la API | No toca contrato ni API. Costo: dos pasos no atómicos; se compensa con el reintento (criterio 6). |
| D5 | ¿Dónde viven las piezas nuevas? | Pestaña **Comercio** propia con `ItemsPanel items=…`; las piezas reutilizan las categorías que Pascal ya entiende (`furniture`, `appliance`) | Agregar una categoría nueva al tipo de Pascal | La categoría es un tipo cerrado de Pascal; una pestaña propia no lo toca. |
| D6 | ¿Y el MCP de Pascal? | **Fuera de esta entrega** | Usarlo para armar las escenas | [verificado] existe (`@pascal-app/cli` 1.0.3, MCP local sin cuenta) pero su documentación solo da por verificado macOS y no lista las herramientas de edición ni el export. Se reevalúa en un spike aparte. |

## 4. Arquitectura

```
apps/web/
  scripts/vendor-kenney-mini-market.mjs    descarga el ZIP (SHA-256 fijo), extrae 12 GLB + colormap.png, escribe el manifest
  scripts/build-templates.mjs              corre las definiciones con @pascal-app/core en Node → public/templates/*.json
  scripts/capture-template-thumbnails.mjs  Playwright: abre cada plantilla y guarda la miniatura PNG
  templates/*.template.ts                  definiciones (ambientes, aberturas, piezas)
  public/items/kenney-*/model.glb, Textures/colormap.png
  public/templates/<id>.json, <id>.png
  src/editor/commerce-catalog.ts           AssetInput de cada pieza (dimensiones medidas del propio modelo)
  src/editor/templates.ts                  metadatos + createFromTemplate(api, {name, kind, templateId})
  src/editor/catalog.ts                    (cambia) localizeCatalogItem conserva ítems con `tool` y sin modelo (cabinet)
```

- **Piezas.** El script de Kenney verifica el SHA-256 del ZIP, extrae las 12 piezas (`cash-register`, `freezer`, `freezers-standing`, `shelf-bags`, `shelf-boxes`, `shelf-end`, `display-bread`, `display-fruit`, `shopping-cart`, `shopping-basket`, `bottle-return`, `character-employee`) y copia cada GLB a `public/items/kenney-<nombre>/model.glb` con su `Textures/colormap.png` al lado (los GLB referencian la textura por ruta relativa). Las dimensiones se calculan del propio GLB. La pestaña **Comercio** suma las piezas de Pascal útiles para comercio (mostrador de cocina, perchero, taburetes, computadora, espejos, cafetera, heladera, extintor, salida de emergencia, alfombras, plantas, mesas y sillas) y el `cabinet`.
- **Definición de plantilla.** `{ id, kind, name, resumen, areaM2, ambientes[{nombre, rectángulo|polígono, color}], aberturas[{tipo: puerta|ventana|vidriera, muro, desplazamiento, ancho}], piezas[{catálogoId, x, z, giroY}] }`. El constructor crea sitio, edificio, nivel, muros (con espesor y altura de Pascal), una losa y un cielo por ambiente, zonas, aberturas y piezas, y serializa `{ nodes, rootNodeIds, collections, materials, installedPlugins }` dentro del `SceneEnvelope` del spec 1.
- **Contenido de las plantillas.** *Tienda minorista* (~60 m²): salón de ventas con vidriera y puerta, mostrador con caja, góndolas, percheros, 2 probadores, depósito y baño. *Café* (~80 m²): salón con mesas, barra con cafetera, cocina y baño. *Minimercado* (~120 m²): salón con 4 góndolas, freezers, 2 cajas, depósito y baño. *Departamento* (~50 m²): sala-comedor, cocina, dormitorio y baño. Las medidas finales se ajustan al armarlas.
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
| Escala u origen de los GLB de Kenney distintos a los de Pascal | Se miden en el script y se ajustan `scale`/`offset`; revisión visual con una captura por pieza. |
| La textura externa no carga desde la carpeta del modelo | Probado en el spike; plan B: incrustar la textura en el GLB. |
| Peso de las plantillas | Escenas pequeñas (decenas de nodos); límite de 5 MB verificado por prueba. |
| Kenney deja de publicar el ZIP | El SHA-256 fijo hace que el script falle en voz alta; los archivos ya vendoreados quedan en el repo. |

## 7. Dependencias y trabajo posterior

**A cargo de ustedes:** nada nuevo en infraestructura; la descarga del ZIP de Kenney ya está autorizada y verificada (1,1 MB, CC0).
**Siguiente spec:** interfaz (shell visual con el diseño de Pencil: dock propio, Ver/Editar, plantilla primero con su diseño final).

## 8. Preguntas abiertas

1. ¿Los nombres y los tamaños de las plantillas (§4) son los que quieren mostrar en el Demo Day?
2. ¿Se acredita a Kenney en la interfaz (pantalla "Acerca de") además de `THIRD_PARTY_NOTICES.md`? Su licencia CC0 no lo exige.

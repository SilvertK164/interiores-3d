# Notas verificadas de Pascal 1.0.3

Todo lo de aquí se comprobó leyendo `node_modules/@pascal-app/*` el 2026-10-11. Si usas algo que no está aquí, **verifícalo primero** y agrégalo.

| Qué | Dónde se verificó | Nota |
|---|---|---|
| `<Editor layoutVersion="v2" projectId onLoad onSave onSaveStatusChange guardAgainstSceneWipe sidebarTabs>` | `editor/src/components/editor/index.tsx` (`EditorProps`) | `onLoad: () => Promise<SceneGraph \| null>`; `onSave(scene, { keepalive? })`. |
| Autoguardado propio con debounce de 1 s | `editor/src/hooks/use-auto-save.ts` | Nuestro `createSceneSaver` agrega 2 s y un solo vuelo. |
| `SaveStatus = 'idle' \| 'pending' \| 'saving' \| 'saved' \| 'paused' \| 'error'` | mismo archivo | Exportado desde `@pascal-app/editor`. |
| `SceneGraph = { nodes, rootNodeIds, collections?, materials?, installedPlugins? }` | `editor/src/lib/scene.ts` | Es lo que entrega `onSave`. |
| Migraciones (`healSceneNodes`, `migrateVerticalSceneNodes`) | `core/dist/store/use-scene.js` | **No** se exportan; `useScene` las corre al cargar. |
| `loadPlugin(builtinPlugin)` antes de montar | spike del 2026-10-11 | Sin él el registro de nodos queda vacío. |
| `useScene.getState().createNode(node, parentId)` y `WallNode.parse({ start, end })` | `core/dist/store/use-scene.d.ts`, `schema/nodes/wall.js` | Lo usa el gancho de pruebas E2E. |
| `CATALOG_ITEMS` (111) y `ItemsPanel` | `editor/src/components/ui/item-catalog/catalog-items.tsx` | 100 con modelo local; ver `src/editor/catalog.ts`. |
| URLs de assets: `ASSETS_CDN_URL + ruta` | `viewer/dist/lib/asset-url.js` | Si la variable está vacía usa `editor.pascal.app`; por eso `next.config.mjs` la fija. |
| Licencia | `LICENSE` del repo y de cada paquete: MIT, Pascal Group Inc. | Copia en `public/pascal-LICENSE.txt`. |
| `SiteNode`, `BuildingNode`, `LevelNode`, `WallNode`, `ZoneNode`, `SlabNode`, `CeilingNode`, `DoorNode`, `WindowNode`, `ItemNode`, `StairNode`, `ShelfNode`, `CabinetNode` y `CabinetModuleNode` se pueden `parse` en Node puro (sin navegador) | `import('@pascal-app/core')` desde un script y pruebas del constructor, 2026-10-11 | Base de `src/editor/templates/scene-builder.ts`. |
| Una puerta o ventana cuelga de su muro (`parentId` y `wallId` = id del muro; `position: [distancia al inicio, altura del centro, 0]`) y el muro la lista en `children` | `scene_19.json` de Pascal y escena real guardada por el editor | `side: 'front'` por defecto. |
| `AssetInput` exige `thumbnail` (texto); el resto de campos del descriptor es opcional | error de Zod al construir un `ItemNode` | Las piezas sin miniatura usan `/icons/couch.webp`. |
| Las zonas, losas y cielos son nodos explícitos (no se derivan al cargar) | `scene_19.json` | El constructor crea uno de cada por ambiente (sin cielo en terrazas y entrepisos abiertos). |
| Un material de la biblioteca se aplica con `materialPreset` (losa, cielo, estante, gabinete) o `interiorMaterialPreset`/`exteriorMaterialPreset` (muro), valor `library:<id>`; `MATERIAL_CATALOG` trae 114 y solo 66 tienen textura en el repo | `MATERIAL_CATALOG` y `apps/web/public/material`, 2026-10-11 | Las demás se piden a `https://editor.pascal.app/material/` con un `rewrites().fallback` de Next (CORS `*`, HTTP 200). |
| Zócalo y cornisa son `skirting`/`crown` del muro (`{ ...WALL_SKIRTING_DEFAULT, enabled: true, sides: 'interior' }`) | `WallNode` y sus constantes por defecto | Se activan por nivel con `trim: true`, salvo en parapetos y barandas. |
| `LevelNode.level` es el índice (0 = planta baja) y `BuildingNode.children` los lista en orden | prototipo de 2 niveles en el editor | La escalera (`StairNode`) cuelga del nivel de abajo con `fromLevelId`/`toLevelId` y `slabOpeningMode: 'destination'`. |
| **Una corrida `CabinetNode` solo se dibuja si tiene `CabinetModuleNode` hijos** (el `stack` en la corrida no se muestra); cada módulo se ubica por `position[0]` (centro sobre el eje local x de la corrida) y el ancho de la corrida es la suma de sus módulos (máximo 3 m) | prototipo en el editor, 2026-10-11, y `cabinet/run-layout.js` | El constructor reparte los módulos centrados y arma `children`. El frente mira a +z con `rotation 0`; `barLedge.edge: 'back'` pone la barra del lado de atrás. |
| `ShelfNode` tiene 4 estilos (`wall-shelf`, `bookshelf`, `open-rack`, `cubby`) y su `position` es el centro de la base | prototipo, 2026-10-11 | `open-rack` hace de góndola; `cubby` de exhibidor; `wall-shelf` de repisa (con `y` para elevarla). |
| Un `CabinetNode` con `fridge-double` dibuja una heladera con pantalla; con `door` + `doorType: 'glass'` una vitrina | capturas de las plantillas "Supermercado" y "Concept store" | Así se arman las heladeras de exhibición y las vitrinas sin modelos externos. |
| El panel de ítems filtra por categoría y arranca en "Furniture" | `ItemsPanel` en el editor | Las piezas de otra categoría (por ejemplo `appliance`) se ven al cambiar de pestaña interna. |

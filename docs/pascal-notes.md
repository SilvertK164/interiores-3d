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

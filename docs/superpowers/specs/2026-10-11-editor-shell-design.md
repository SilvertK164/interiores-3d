# Spec 3 — Shell del editor: Ver/Editar, dock, paneles y tema Madori

**Proyecto:** Madori, diseñador de interiores 2D + 3D para viviendas y comercios (TP final de IISAIA, FIUBA).
**Fecha:** 2026-10-11 · **Estado:** borrador para revisión del equipo · **Idioma:** español.
**Antecedentes:** [spec 1](2026-10-11-fundacion-y-persistencia-design.md), [spec 2](2026-10-11-tienda-y-plantillas-design.md), el diseño de Pencil (`docs/design/12` a `17`, `22`), [`docs/pascal-notes.md`](../../pascal-notes.md) (inventario verificado de Pascal 1.0.3), [`docs/nombre-y-marca.md`](../../nombre-y-marca.md) y el brainstorming del 2026-10-11.

## 1. Objetivo

Que el editor se vea y se maneje como el resto de Madori: claro, en castellano y con el diseño aprobado en Pencil, en lugar de la interfaz en inglés y oscura de Pascal. Pascal sigue siendo el **motor** del lienzo 2D y 3D y de la edición; lo que cambia es todo lo que lo rodea: barra superior, modos **Ver / Editar**, vista **2D / 3D / Ambas**, dock de herramientas, paneles laterales y panel de propiedades.

### Criterios de éxito (verificables)
1. `pnpm verify` y la suite e2e terminan en verde desde un clon limpio, con el parche de Pascal aplicado por `pnpm install`.
2. **Editar:** cada botón del dock deja a Pascal en la fase, el modo y la herramienta esperados (tabla de la sección 4.3); una prueba lee el estado del editor y lo comprueba.
3. **Ver:** el dock y el panel de propiedades no están en pantalla, y Supr, Retroceso y los atajos de herramienta no cambian la escena (el número de nodos no varía).
4. **2D / 3D / Ambas** cambia la vista y se conserva al recargar.
5. **Deshacer / Rehacer** se habilitan y deshabilitan solos según el historial real (sin cambios: ambos deshabilitados; tras crear un muro: Deshacer habilitado).
6. **Propiedades:** al seleccionar una puerta y cambiar su ancho a 1,00 m, el nodo cambia, se guarda (sobrevive a recargar) y Deshacer lo revierte. Igual para Muro, Puerta, Ventana, Mueble, Ambiente, Estante, Gabinete y Escalera.
7. **Castellano:** el texto de la barra, el dock, los paneles propios y los nombres de nivel no contiene palabras de una lista de inglés conocida ("Ground Floor", "Furniture", "Search…"). Niveles sin nombre se ven como "Planta baja" y "Planta 1".
8. **Catálogo:** todos los ítems del catálogo y de Comercio (hoy 144 carpetas en `public/items`) tienen nombre y categoría en castellano (una prueba falla si falta alguno) y miniatura con **fondo transparente** (una prueba lee la esquina de cada una).
9. **Tema:** ningún panel, barra o dock tiene fondo oscuro (prueba de luminancia del color de fondo calculado) pese a que Pascal pone `body.dark` al montar.
10. **Parche vigilado:** una prueba comprueba que el dock, el inspector, los ayudantes y el selector de nivel de Pascal **no existen en pantalla**; si una actualización rompe el parche, falla.
11. Compartir, Renderizar y Subir mi mueble se ven **deshabilitados con "Pronto"** y no hacen nada. **Exportar plano** ya está activo (spec 4, 2026-10-12): en el menú Más de Editar y como botón en Ver abre su diálogo.
12. Accesibilidad básica: el dock es una barra de herramientas (`role="toolbar"`) con botones `aria-pressed` operables con teclado, objetivos táctiles de al menos 44 px, foco visible y movimiento reducido respetado.

## 2. Qué NO hace este spec
- **Móvil y tablet** (Ver, Recorrer, hojas inferiores): spec propio.
- **Compartir, Renderizar y Subir mi mueble:** solo sus botones deshabilitados (Exportar plano se hizo en el spec 4).
- Traducir el resto del texto de Pascal (unas 550 líneas en unos 99 archivos: paleta de comandos, medidas del HUD, paneles avanzados). Solo se traduce lo que reemplazamos.
- Herramientas de techo, cerco, ascensor, punto de aparición e instalaciones (ductos, tuberías).
- Edición de varios elementos a la vez en el panel de propiedades.
- Colaboración en tiempo real entre personas.

## 3. Decisiones

| # | Decisión | Estado |
|---|---|---|
| D1 | **Alcance:** escritorio completo. | Aprobada |
| D2 | **Enfoque combinado:** tema por CSS + `pnpm patch` mínimo del editor + shell propio en castellano encima del lienzo. Se descartan reescribir el editor 2D (su panel no se exporta) y solo repintar. | Aprobada |
| D3 | **Ver = solo lectura** con el modo de solo lectura de Pascal; **Editar** muestra el dock y los paneles. | Aprobada |
| D4 | Funciones futuras visibles pero **deshabilitadas con "Pronto"**. | Aprobada |
| D5 | **Panel de propiedades propio** para Muro, Puerta, Ventana, Mueble, Ambiente, Estante (`shelf`), Gabinete (`cabinet` y sus módulos) y Escalera (`stair` y sus tramos), con Duplicar donde Pascal lo permite y Borrar; el resto de tipos, un panel mínimo (nombre del tipo y Borrar). | Aprobada |
| D6 | **"Habitación automática" no existe en Pascal.** En Estructura va **"Ambiente"** (herramienta de zonas, que nombra el ambiente y lo suma a la lista con sus m²). Cerrar muros ya genera piso y cielorraso solos. | Por defecto, a confirmar |
| D7 | Los controles de Ver **sin soporte comprobado en Pascal** (Cámara perspectiva/isométrica, Estilo sólido/realista) **se ocultan** si la verificación previa no los confirma. | Por defecto, a confirmar |
| D8 | Botones activos del dock y de los selectores en **azul noche `#0B1F4D`** con texto blanco; el cobalto queda para las acciones primarias. | Por defecto, a confirmar |
| D9 | **Catálogo propio de muebles** en castellano (nombres y categorías) y **miniaturas regeneradas con fondo transparente**: las actuales traen el negro dentro de la imagen (verificado: píxel de esquina negro y opaco, 0 % transparente), así que no se arreglan con CSS. | Aprobada |
| D10 | Nombres por defecto de nivel ("Ground Floor", "Floor 1") se **muestran** en castellano sin cambiar el dato guardado. | Aprobada |

## 4. Arquitectura

Solo `apps/web/src/editor/` importa Pascal, `three` y R3F. El shell vive ahí; las páginas lo montan por `next/dynamic`.

### 4.1 Capas
1. **Tema (sin tocar el paquete).** Se redefinen los 24 tokens de `:root` y `--radius` en `app/globals.css` (los usa solo el editor), las sombras de `app/elevation.css` y la fuente `font-barlow`. Al montar se llama `useViewer.setSceneTheme('studio')`. `body.dark` solo activa unas variantes `dark:` y el bloque `.dark` de `elevation.css`, que también se redefinen en claro. Quedan unos 250 usos fijos de blanco/negro y 27 colores hexadecimales dentro del paquete; los cubre el parche si molestan.
2. **Parche mínimo.** `pnpm patch @pascal-app/editor` (versión exacta 1.0.3) en cuatro archivos: `ui/action-menu/index.tsx`, `ui/panels/panel-manager.tsx`, `ui/floating-level-selector.tsx` y `ui/helpers/helper-manager.tsx`. Agrega una propiedad opcional `chrome` (`dock`, `inspector`, `helpers`, `levelSelector`, por defecto todo visible) y atributos `data-pascal-*` estables. Se registra en `patchedDependencies` de `pnpm-workspace.yaml`.
3. **Puente con Pascal** (`src/editor/pascal-bridge.ts`): único lugar que toca los almacenes de Pascal, con funciones tipadas (`setEditMode`, `armTool`, `setView`, `undo`, `redo`, `selectLevel`…). El resto del shell depende del puente y se prueba con uno falso.
4. **Shell** (`src/editor/shell/`), un contenedor `pointer-events-none` sobre el lienzo con paneles `pointer-events-auto`, por debajo de los diálogos de Pascal (`z-50`) y del cargador (`z-60`):
   - `EditorShell`, `TopBar` (volver, nombre, `SaveChip`), `ModeSwitch` (Ver | Editar), `ViewSwitch` (2D | 3D | Ambas), `UndoRedo`.
   - `Dock` y `dock-model.ts` (lógica pura del mapeo de herramientas).
   - `LevelPicker`, `LeftPanel` con `ZonesPanel`, `FurniturePanel` y `MaterialsPanel`.
   - `ViewPanel` (Vista 3D) y `ViewBar` (girar, vista superior, recorrer).
   - `PropertiesPanel` con un componente por tipo y `properties-model.ts` (campos, límites y unidades, puros).
   - `SoonButton` (deshabilitado con "Pronto").
5. **Textos y catálogo:** `src/lib/catalog-es.ts` (nombre y categoría por id) y `scripts/item-thumbnails.mjs` más una página de desarrollo que dibuja cada modelo con fondo transparente y la captura con Playwright.

### 4.2 Modos y vistas
- **Ver:** activa el modo solo lectura de Pascal (`setReadOnly` o su préstamo), que oculta su dock e inspector y bloquea crear, editar y borrar. El panel **Vista 3D**: Muros (Completos = `up`, Cortados = `cutaway`, Bajos = `down`) y Niveles (`setLevelMode`). La barra: Girar izquierda/derecha y Vista superior (eventos de cámara de `core`) y **Recorrer** (primera persona más puntero bloqueado, que se pide a mano sobre el lienzo; sale con Esc).
- **Editar:** dock, panel izquierdo y propiedades.
- **2D | 3D | Ambas** = `setViewMode('2d' | '3d' | 'split')`, en ambos modos.
- Pascal restaura fase, herramienta y selección desde `localStorage`: el shell **lee** el estado real del editor al montar, no lo supone.

### 4.3 Dock (Editar)
| Botón | Efecto en Pascal |
|---|---|
| Seleccionar | modo `select` |
| Estructura | Muro (`wall`), Ambiente (`zone`), Piso (`slab`), Cielorraso (`ceiling`), Escalera (`stair`), Columna (`column`) vía `armToolMode` |
| Aberturas | Puerta (`door`), Ventana (`window`) |
| Muebles | abre `FurniturePanel`; fase `furnish` + `item` |
| Materiales | abre `MaterialsPanel`; `armMaterialPaint` |
| Medir | herramienta `measurement` (distancia, ángulo, área…) |
| Más | Eliminar, cuadrícula y ajuste (`setGridSnapStep`, `setSnappingMode`), atajos, y los botones "Pronto" |

### 4.4 Paneles
- **Nivel y ambientes:** lista de zonas del nivel con m² (`deriveZoneQuantityReport(...).footprintArea`, `formatAreaLabel`); al elegir una se selecciona. Los niveles sin nombre se muestran "Planta baja", "Planta 1"…
- **Muebles:** búsqueda, chips de categoría y tarjetas con miniatura transparente, todo en castellano; la pestaña Comercio es una categoría más. "Subir mi mueble" aparece como "Pronto".
- **Propiedades:** campos definidos desde los esquemas de cada nodo, con unidades en metros; los cambios van por `commitParametricNodeFields(id, patch)`, así que entran al historial. Estante, Gabinete y Escalera son nodos paramétricos que en el lienzo se alargan con tiradores: sus campos son ancho, fondo, alto, filas y columnas (más interruptores) del estante, ancho, fondo y alto del cuerpo del gabinete (aplicados con la rutina de sus tiradores, que reacomoda sus módulos), y ancho y escalones de la escalera curva o de caracol y de cada tramo de una recta. Duplicar crea una copia desplazada; Borrar pide confirmación solo si el elemento tiene hijos.

### 4.5 Teclado
Pascal escucha teclas globales (`1 2 3 f z m v b x p g r t e c`, Supr, Retroceso, Ctrl+Z/C/X/V) y WASD/Espacio para la cámara. Ignora entradas de texto pero no botones ni listas. Nuestros paneles frenan la propagación de esas teclas mientras tienen el foco. Ctrl+S se mantiene (el guardado es automático). La paleta de comandos Ctrl+K sigue en inglés y queda fuera de este spec.

## 5. Estrategia de pruebas
- **Unitarias (TDD, el rojo primero):** `dock-model`, `properties-model` (límites y unidades), `catalog-es` (todos los ids), nombres de nivel, conversión de estados de guardado a texto, `pascal-bridge` con un doble.
- **E2E (Playwright, base local):** modos, dock, vista, deshacer/rehacer, edición de propiedades con persistencia, catálogo en castellano, **guarda del parche**, tema claro, teclado (Supr con foco en un campo nuestro no borra).
- **Visual:** capturas del editor en Editar y en Ver, con la paleta Madori, comparadas a ojo con `docs/design/12`, `13` y `15`.
- Las miniaturas se verifican por código (transparencia en 144/144) y a ojo en una hoja de contactos.

## 6. Riesgos y mitigaciones
| Riesgo | Mitigación |
|---|---|
| El paquete se publica sin compilar y sus APIs internas cambian | Versión exacta; todo pasa por `pascal-bridge`; el parche se reaplica con `pnpm patch-commit` si algún día se actualiza |
| `pnpm patch` no se probó en este repo | Primera tarea de verificación: aplicarlo en una rama y comprobar `pnpm install` en limpio y en la CI |
| Recorrer necesita puntero bloqueado y su helper no se exporta | Pedirlo a mano sobre `[data-pascal-viewer-3d] canvas`; si falla, Recorrer se oculta |
| Las zonas no se crean solas al cerrar muros | D6: herramienta "Ambiente" explícita; detectar y crear zonas solas se evalúa aparte |
| Cámara perspectiva/isométrica y estilo sólido/realista sin soporte comprobado | D7: verificación previa; si no existen, se ocultan |
| Colocar muebles desde la fase `structure` podría no funcionar (`activateCatalogItem` no cambia la fase) | El botón Muebles cambia la fase a `furnish` antes de armar el ítem |
| Atajos globales de Pascal chocan con nuestros campos | Frenar la propagación en el contenedor del shell; prueba e2e |
| Capas fijas de Pascal (cargador `z-60`, diálogos `z-50`) | El shell queda por debajo de ambos; sin superposición con la barra durante la carga |
| ~250 usos de blanco/negro fijos dentro del paquete | Revisión visual; el parche cubre solo los que se vean mal |
| `body.dark` se pone al montar | Redefinir también el bloque `.dark`; prueba de luminancia |
| Regenerar 144 miniaturas (GLB con materiales variados) | Script repetible con luz y encuadre fijos; revisión a ojo de la hoja de contactos |

## 7. Dependencias y trabajo posterior
- **Después de este spec:** editor para móvil y tablet (Ver, Recorrer, hojas inferiores); flujo de Renderizar con marcadores de notas y de cámara; Exportar plano a PDF; Subir mi mueble (almacenamiento propio); Compartir.
- **Orden sugerido del plan:** (0) verificación previa: parche, Recorrer, zonas, controles de Ver; (1) maqueta visual del shell con la paleta Madori para aprobar antes de cablear; (2) tema y parche; (3) puente, modos, vistas, deshacer/rehacer y dock; (4) niveles y ambientes; (5) catálogo en castellano y miniaturas; (6) materiales; (7) propiedades por tipo; (8) panel Vista 3D y Recorrer; (9) teclado, accesibilidad y estados; (10) verificación final y capturas.

## 8. Preguntas abiertas
1. **D6:** ¿"Ambiente" con la herramienta de zonas, o estudiar que se cree solo al cerrar muros?
2. **D7:** ¿Ocultar cámara y estilo si Pascal no los permite, o mostrarlos deshabilitados con "Pronto"?
3. **D8:** ¿Azul noche o cobalto en los botones activos?
4. Contenido exacto del menú "Más" y atajos que se muestran en castellano.
5. ¿Hace falta que Victoria revise la maqueta visual antes del cableado?

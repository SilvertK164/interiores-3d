# Qué puede hacer Pascal y qué mostramos en nuestro editor

> Fecha: 2026-10-11 · Fuente: código de `@pascal-app/editor` 1.0.3 y `@pascal-app/nodes` (paquetes instalados en el spike) y la documentación `wiki/architecture/*` del repo `pascalorg/editor`.
> Etiquetas: **[verificado]** leído en el código · **[por probar]** deducido del código, falta probarlo en una app real.
> Objetivo: decidir **qué herramientas se muestran** para que el menú sea claro, y **qué se esconde** para que no abrume.

## 1. Inventario: lo que Pascal ofrece

Pascal maneja ~55 tipos de elemento. Agrupados por lo que significan para quien diseña un espacio:

| Grupo | Elementos de Pascal | ¿Lo mostramos? |
|---|---|---|
| **Estructura** | Muro, Piso (`slab`), Cielorraso (`ceiling`), Escalera, Columna, Valla, Ascensor, Apertura de piso, Separador, Cuadrícula estructural | **Sí**: muro, habitación automática, piso, cielorraso, escalera, columna. **En "Más"**: valla, ascensor, apertura de piso. Oculto: cuadrícula estructural. |
| **Aberturas** | Puerta, Ventana (se pegan al muro y se mueven con él) | **Sí**, en un grupo propio. |
| **Ambientes** | Zona/habitación (`zone`): se **detecta sola** al cerrar muros; tiene nombre, superficie, piso y cielorraso | **Sí**: lista de ambientes con nombre y m². |
| **Mobiliario** | Ítems del catálogo (111 modelos en 5 categorías: Muebles, Electrodomésticos, Cocina, Baño, Exterior), mueble modular (`cabinet`), estante (`shelf`), ítems paramétricos | **Sí**: panel "Muebles" con las 5 categorías. Oculto: ítems paramétricos. |
| **Materiales** | Modo de pintura, 68 texturas PBR, paletas de color, temas de escena | **Sí**: panel "Materiales". Los temas de escena van en "Estilos" (más adelante). |
| **Medición** | Medición rápida, medidas, cotas de construcción, cotas automáticas en el plano 2D | **Sí**: "Medir" y cotas visibles en el plano. |
| **Referencias** | Imagen guía (para calcar un plano), escaneos 3D, piso de referencia | **En "Más"**: imagen guía. Oculto: escaneos. |
| **Recorrido** | Punto de partida (`spawn`) y control en primera persona | **Sí**: botón "Recorrer". |
| **Techo y exterior** | Techo a dos aguas y sus piezas (lucarna, claraboya, chimenea, canaletas, cúpula, ventilaciones), ampliación, paneles solares | **Oculto**; techo a dos aguas solo en "Más". No es interiorismo. |
| **Terreno y parcela** | Límite de parcela, escultura de terreno | **Oculto**. Se arranca directo en el edificio. |
| **Instalaciones (MEP)** | Ductos, registros, equipos de aire, tuberías, trampas, líneas de refrigerante, diagrama de columnas | **Oculto**. |
| **Importar / exportar** | Exporta GLB, OBJ, STL, USDZ, 3MF y **PDF del plano**; importa IFC (conversor) | **Sí**: "Exportar plano" (PDF). GLB solo si hace falta. |
| **Vistas** | 3D, 2D y **dividida** (`ViewMode = '3d' \| '2d' \| 'split'`); cámara: orbitar izquierda/derecha y vista superior | **Sí**: selector de vista. |
| **Utilidades** | Deshacer/rehacer, selección por clic o por caja, borrar, grilla de 0,5 m con imán (45°), unidades métrico/imperial, sombras, bordes, atajos de teclado | **Sí** las básicas; el resto en "Más". |
| **Plugins, MCP y agentes** | Sistema de plugins, servidor MCP, WebXR | **Oculto**. |

## 2. Menú propuesto (limitado y claro)

**Selector de vista (arriba al centro), opcional y de tres opciones:** `2D` · `3D` · `2D + 3D`. Es un control propio que llama a `setViewMode` del editor. Por defecto se abre en **2D** para dibujar. En móvil solo `3D` y recorrido.

**Dock inferior (6 grupos, grandes y con texto):**

| Grupo | Qué contiene | Cómo se abre |
|---|---|---|
| **Seleccionar** | Mover, rotar, seleccionar por caja | Directo |
| **Estructura** | Muro · Habitación automática · Piso · Cielorraso · Escalera · Columna | Menú sobre el dock |
| **Aberturas** | Puerta · Ventana | Menú sobre el dock |
| **Muebles** | Catálogo con 5 categorías y buscador | Panel lateral |
| **Materiales** | Pisos, paredes, madera, tela… | Panel lateral |
| **Medir** | Medición rápida y cotas | Directo |
| **Más (···)** | Valla · Techo · Ascensor · Imagen guía · Punto de partida | Menú |

**Contextual, sin ocupar espacio fijo:** al seleccionar algo aparece una barra pequeña con Mover · Duplicar · Borrar.
**Aparte del dock:** *Niveles* (selector flotante), *Ambientes* (lista), *Deshacer/Rehacer*, *Recorrer* (en 3D), y arriba a la derecha *Exportar plano · Compartir · Renderizar*.

## 3. Cómo es el flujo de Pascal ("room-first")

1. **Nivel.** Se trabaja sobre un nivel; arranca el nivel 0 (planta baja).
2. **Muros.** Se dibujan con clic de inicio y clic de fin; hay una **habitación automática** que cierra el contorno. La grilla es de 0,5 m con imán a 45°.
3. **Pascal detecta los ambientes solo.** Al cerrar un contorno de muros, el motor crea el **ambiente**, su **piso** y su **cielorraso** automáticamente. Esas piezas son "derivadas": no se crean ni se mueven a mano, se editan por la intención del ambiente (nombre, piso sí/no, cielorraso sí/no, material). Si se borra un muro que separaba dos ambientes, el ambiente se conserva con un **separador**.
4. **Aberturas.** Puertas y ventanas se colocan sobre un muro y lo siguen.
5. **Muebles.** Se elige del catálogo y se coloca con imán a la grilla y a los objetos; se rota con `R`/`T`; `Alt` fuerza la posición libre.
6. **Materiales.** Modo pintura sobre pisos, paredes y partes pintables de los muebles.
7. **Medidas.** Cotas automáticas en el plano y medición rápida.
8. **Dos vistas, una misma edición.** El plano 2D y la vista 3D son dos presentaciones del mismo modelo: lo que se hace en una aparece en la otra.

Atajos útiles verificados: `V` seleccionar, `X` borrar, `M` medir, `Z` ambiente, `F` abrir catálogo de muebles, `B` y `P` armar herramientas, `1`/`2` cambiar entre parcela y edificio, `Shift` (toque) cambia el tipo de imán, `Ctrl` y `Alt` ajustan el imán.

## 4. Niveles

- Un edificio apila **niveles**; cada uno tiene **altura piso a piso** (por defecto 2,5 m) y un orden. El nivel 0 es la planta baja y **no se puede borrar**.
- El **selector flotante** permite **agregar un nivel arriba o abajo**, agregar un **sótano**, renombrar y **borrar** un nivel (con confirmación).
- Los muros toman la altura del nivel; el cielorraso se ajusta al piso del nivel de arriba; una **escalera** o un **ascensor** conecta niveles.
- En la vista 2D se ve el nivel activo; en 3D se puede ver el edificio completo o aislar un nivel.
- **Para nuestro producto:** se muestra el selector de niveles solo cuando el proyecto tiene más de uno o al tocar "Agregar nivel", para no sumar ruido a los espacios de una planta.

## 5. Vistas opcionales

- `ViewMode` es `'3d'`, `'2d'` o `'split'` y vive en el estado del editor (`useEditor.viewMode`, con `setViewMode`). El valor inicial es `'3d'`.
- El editor acepta `preferredView` y la propiedad `viewBar` (mostrar u ocultar su propio selector). **[por probar]** Ocultamos el selector de Pascal y mostramos el nuestro, con las tres opciones.
- En `split` se ven las dos a la vez. **No se puede** mostrar más de dos.
- En móvil: solo 3D y recorrido (decisión del equipo).

## 6. Qué no podemos cambiar y cómo lo resolvemos

- El **inspector** (panel de propiedades de lo seleccionado) y varios paneles internos son de Pascal. Se les aplican nuestros colores y se muestran dentro de nuestro shell; **no se reconstruyen**.
- Las pestañas del panel lateral (`sidebarTabs`) las define la app anfitriona: ahí van solo **Muebles** y **Materiales**; no se muestran Escena, Ajustes ni plugins.
- `useEditor` y `armToolMode` están exportados **[verificado]**, así que nuestro dock puede armar las herramientas de Pascal (`armToolMode({mode:'build', tool:'wall'})`) y cambiar la vista. **[por probar]** que todo funcione con la barra de Pascal oculta.

## 7. Pendiente de verificar en el spike

1. Armar muro, puerta, ventana y piso desde un dock propio.
2. Ocultar la barra de herramientas y el selector de vista de Pascal sin romper nada.
3. Que la edición con la vista dividida funcione igual en escritorio.
4. Qué ve una persona en el inspector de Pascal y si hace falta limitarlo.

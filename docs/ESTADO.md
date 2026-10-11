# Estado del proyecto — leer esto primero

> Última actualización: 2026-10-11. Si algo de acá contradice otro documento, **manda este** y el otro se corrige.
> Etiquetas: **[verificado]** comprobado en código, npm o docs oficiales · **[inferencia]** estimación o propuesta · **[por probar]** falta correrlo.

## Qué es
Diseñador de interiores **2D + 3D para viviendas y comercios**, con plantillas. TP final de IISAIA (FIUBA) de **Silvert Quispe y Victoria Villalba**. Demo Day en la semana 8; plazo de trabajo ≈ 2 días desde el 2026-10-11. No es un MVP: es la app final.

## Decisiones tomadas
| Tema | Decisión | Detalle |
|---|---|---|
| Editor 2D/3D | **Pascal Editor** (`@pascal-app/*` 1.0.3, Next 16, React 19, three 0.186). Plan B: híbrido (`core` + `viewer`). Spike validado. | [analisis-clases](analisis-clases.md) |
| Backend | **API propia en Fastify** (`apps/api`) con `openapi.yaml` y contrato zod. Motivo: el corrector automático solo detecta backend por fastapi/flask/django/express/fastify. | [spec 1](superpowers/specs/2026-10-11-fundacion-y-persistencia-design.md) |
| Datos | Supabase: tablas + `scene jsonb`, RLS, Storage, migraciones en git. Auth con email y contraseña. | spec 1 |
| Alcance | Niveles 0–3 + **PDF de plano con escala y cajetín** + **render con IA**. DXF e IFC **fuera**. | [analisis-clases §0](analisis-clases.md) |
| Render IA | **BYOK** (cada persona conecta su clave, guardada cifrada). Proveedor: **solo Cloudflare Workers AI** `flux-2-klein-4b` (único gratis recurrente). Compuerta: probar fidelidad antes de construir. | [renders](investigacion-renders-exportaciones-diseno.md), [BYOK](seguridad-claves-byok.md) |
| Interfaz | Diseño en **Pencil**. Claro, vidrio con blur, un acento azul plano, **sin degradados ni bordes**, menús grandes, castellano neutro (tú). | `design/`, [inventario](inventario-pascal-herramientas.md) |
| Modos | **Ver** (navegación) y **Editar**. Vista **2D / 3D / Ambas**. | inventario §9 |
| Dispositivos | Editar solo en escritorio; móvil y tablet: ver, recorrer, renders, exportar, compartir. | — |
| Entrada | Plantilla primero (¿vivienda o comercio? → plantilla o en blanco). | — |
| Exportar plano | La escala disponible **depende de la hoja y del tamaño del proyecto**: el diálogo muestra la vista previa de la hoja, deshabilita las escalas que no caben (p. ej. 1:25 no cabe en A4 pero sí en A3), sugiere el *mejor ajuste* e indica cuánto del ancho usa. Regla [inferencia, a validar con el PDF real]: cabe si (tamaño real + 1 m de cotas) ÷ escala ≤ hoja − 10 mm de margen − 36 mm de cajetín. | capturas 19 y 24 |
| Marcadores | **Notas / observaciones** (pines en la escena 2D y 3D, con texto, estado *pendiente/hecho* y a quién le toca) para no olvidar cambios, y **marcadores de cámara de render** (esfera con cono de dirección donde se tomó cada imagen; al tocarla se ve el render). Se guardan **fuera de la escena de Pascal** (tabla propia `project_markers`; la cámara del render va en el registro del render) para no romper `applySceneSnapshot`. Alcance **[propuesta], después del núcleo**; diseño pendiente junto con el flujo de render. | por diseñar |
| Repo | **Nuevo y dedicado** (raíz = proyecto), público, con la otra persona como colaboradora. | — |

## Hecho
- Análisis de las clases y reglas del TP → [analisis-clases.md](analisis-clases.md) (+ 7 informes en `analisis-clases/`).
- **Spec 1** (Fundación y persistencia) escrito y commiteado; **falta la aprobación de ambas personas**.
- Investigación de exportaciones, renders y proveedores gratuitos; diseño de seguridad de claves BYOK.
- Inventario de Pascal: herramientas, vistas, niveles, modos, parámetros de puertas/ventanas/muros/muebles.
- Diseño en Pencil: flujos, sistema de diseño, acceso, proyectos, nuevo proyecto (2 pasos), **Editar** (puerta, muebles, menú Estructura), **Ver** (3D y dividida), conectar cuenta de render, 4 pantallas móviles, **materiales, galería de renders, exportar plano (PDF con escala y cajetín), compartir, estados del sistema (cargando, conflicto, error, sin conexión), tablet y subir mueble**. 23 capturas en [`docs/design/`](design/README.md).

## Pendiente (en este orden)
1. ~~Guardar el diseño~~ **Hecho**: está en `design/interiores.pen`, **local y fuera de git** (`*.pen` en `.gitignore`). Para evidencia en el repo se exportan PNG a `docs/design/` (sin el archivo fuente).
2. Aprobar el spec 1 → `writing-plans` → plan (tareas T0–T7).
3. Crear cuentas a mano: GitHub (repo público nuevo), Supabase `dev` y `prod`, Vercel, Cloudflare Free.
4. ~~Biblioteca de muebles~~ **Decidido (2026-10-11): sin conversión de modelos externos.** Pedido del equipo: muebles paramétricos y una lista potente pero no completa, con el mínimo de horas. Se usa **solo lo que ya trae Pascal 1.0.3 [verificado en `node_modules` del spike]**: (a) catálogo de **111 ítems** (50 muebles, 22 electrodomésticos, 14 cocina, 10 baño, 15 exterior); (b) nodos **paramétricos** `shelf` (4 tipos: estante de pared, biblioteca, rack abierto, cubby), `cabinet` (9 módulos: base con puerta, cajones, lavavajillas, cocina gas/inducción, bacha, despensa alta, torre de horno, heladera), `door`, `window`, `column`, `fence`, `stair`; (c) el tile **"+ Subir mueble"** del spec cubre la cola larga sin costo nuestro. **Comercio** se arma con lo existente (mostrador = `kitchen-counter`/`cabinet`, góndola = `shelf` rack abierto, exhibidor = cubby, perchero, taburetes, computadora) como **plantillas**; brecha conocida: sin caja registradora ni vitrina de vidrio dedicadas. **Licencia [verificado 2026-10-11]:** el código `@pascal-app/*` es **MIT** (gratis, uso comercial permitido); los nodos paramétricos (`shelf`, `cabinet`, puertas, ventanas) son código, sin archivos de modelo. Los **111 GLB del catálogo no declaran licencia en ningún lado** (ni en el repo, ni en el paquete, ni por ítem); el README solo licencia el código (MIT) y los videos (CC BY 4.0), y los términos del servicio pascal.app dicen que el contenido de la plataforma es de Pascal con licencia limitada de uso personal no comercial [inferencia: aplica al servicio alojado]. 109 salen de `items/system/` de su bucket público (los 111 pesan **3,0 MB** en total) y 2 de una carpeta de usuario (`dishwasher`, `fireplace`). **Decisión:** para el TP (educativo, sin fines comerciales) se cargan desde su bucket sin copiarlos al repo público; se excluyen del catálogo propio los ítems de procedencia dudosa (10 con id generado como `ikea-kallax`, `herman-miller-aeron`, `1967-chevrolet-camaro`, más `tesla`) y se documenta en el README; consulta al docente y a Pascal pendiente. T4 queda como "cargar del bucket + filtro", no "autoalojar". Informes [G1](analisis-clases/G1-muebles-libres.md) y [G2](analisis-clases/G2-muebles-bim.md) quedan como respaldo; **opcional solo si sobra tiempo:** Kenney Mini Market (CC0, ~20 modelos de tienda) y revisar licencias (alerta: la licencia de Quaternius se contradice; descartar 3D Warehouse, BIM comercial, ShapeNet, Objaverse, ABO). **[por probar]** que `shelf` y `cabinet` se inserten desde nuestro dock (`armToolMode`) y se vean bien en 2D.
5. **Siguiente diseño (pedido del equipo):** flujo de render completo (diálogo "Nuevo render", elegir vista o marcador de cámara, progreso, resultado), **marcadores de notas** y **marcadores de cámara de render** (3D y planta), más: tablet de Mis proyectos, estados en móvil, prueba de 5 minutos con 2–3 personas y pasar tokens a `globals.css`. [por probar] dibujar los marcadores sobre el lienzo de Pascal desde `src/editor/` (R3F `Html` + malla) sin tocar su escena.
6. Probar en el spike (**orbe/guías moradas al colocar muebles — reproducido**: son las *guías de alineación* de Pascal —cinta punteada índigo, puntos y píldora de distancia— activas con el ajuste "Snapping: Lines", que es el predeterminado para muebles; no es un bloqueo ni un candado. Con "Snapping: Grid" desaparecen. Arreglo: `useEditor.setSnappingMode('item', 'grid')` al montar el editor y, si hace falta, ocultar las píldoras con CSS; [por probar] en el shell real): dock propio con `armToolMode`, ocultar la barra de Pascal, recorrido táctil, prueba de fidelidad del render.

## Riesgos
Pascal no está en el material del curso (alucina la API) · el catálogo y los assets de Pascal salen de su bucket (licencia por activo sin explicitar) · WebGPU del equipo de la demo · textos de Pascal en inglés · historia de git concentrada en 48 h · conectores de correo/Drive activos en la sesión.

## Preguntas abiertas para el docente
Modalidad de a dos y atribución · si Fastify + Supabase cuenta como backend · cómo se evalúa apoyarse en Pascal · MVP o app final, y fecha y formato del Demo Day · rúbrica y hitos · dónde van `.claude/` y `docs/superpowers/`.

## Reglas de trabajo con IA (ahorro de tokens)
Ver [`CLAUDE.md`](../CLAUDE.md). Resumen: leer este archivo y no los informes largos; un agente por tema independiente, con archivo de salida y resumen corto; verificar diseño solo en las pantallas que cambiaron.

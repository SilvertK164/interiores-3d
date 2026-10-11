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
| Repo | **Nuevo y dedicado** (raíz = proyecto), público, con la otra persona como colaboradora. | — |

## Hecho
- Análisis de las clases y reglas del TP → [analisis-clases.md](analisis-clases.md) (+ 7 informes en `analisis-clases/`).
- **Spec 1** (Fundación y persistencia) escrito y commiteado; **falta la aprobación de ambas personas**.
- Investigación de exportaciones, renders y proveedores gratuitos; diseño de seguridad de claves BYOK.
- Inventario de Pascal: herramientas, vistas, niveles, modos, parámetros de puertas/ventanas/muros/muebles.
- Diseño en Pencil: flujos, sistema de diseño, acceso, proyectos, nuevo proyecto (2 pasos), **Editar** (puerta, muebles, menú Estructura), **Ver** (3D y dividida), conectar cuenta de render, 4 pantallas móviles.

## Pendiente (en este orden)
1. ~~Guardar el diseño~~ **Hecho**: está en `design/interiores.pen`, **local y fuera de git** (`*.pen` en `.gitignore`). Para evidencia en el repo se exportan PNG a `docs/design/` (sin el archivo fuente).
2. Aprobar el spec 1 → `writing-plans` → plan (tareas T0–T7).
3. Crear cuentas a mano: GitHub (repo público nuevo), Supabase `dev` y `prod`, Vercel, Cloudflare Free.
4. **Biblioteca de muebles** — informes [G1 (fuentes libres GLB)](analisis-clases/G1-muebles-libres.md) y [G2 (BIM/arquitectura)](analisis-clases/G2-muebles-bim.md), leídos en sitios oficiales, **sin descargar nada**. **Propuesta [inferencia], a confirmar:** (1) base = **Kenney Furniture Kit + Mini Market** (CC0; vivienda + tienda mínima: caja, góndolas, freezers); (2) completar con **Quaternius vía Poly Pizza** (82 GLB CC0) o **KayKit** si no se quiere el riesgo de licencia; (3) **8–12 piezas de comercio** de Poly Haven (CC0: góndola metálica, caja registradora, taburetes); (4) lo parametrizable (puertas, ventanas, estantes, cocinas, vidriera) sale de los **nodos nativos de Pascal**; (5) reserva con atribución: Sweet Home 3D (maniquíes, percheros), Poly Pizza CC-BY. **Descartado:** 3D Warehouse, bibliotecas BIM comerciales, ShapeNet/3D-FUTURE, FurniMesh, Objaverse en bloque, Google Scanned Objects, Khronos como biblioteca, ABO, todo NC/ND/SA. **Alerta:** Quaternius publica CC0 en sus packs pero una "Asset License v1.0" (2026-08-28) en `license.html` que prohíbe redistribuir assets sueltos → guardar captura fechada y no subir los FBX/Blend originales. **Sketchfab** no sirve como fuente automática (cada usuario debe iniciar sesión). Sin vitrina de vidrio CC0 confirmada (se arma con nodo de vidriera). **Esfuerzo ~60 modelos [inferencia, sin verificar]:** 19–28 h entre los dos (pipeline gltf-transform + Blender headless, créditos, subida a Supabase). **[por probar]** formatos reales dentro del ZIP de Kenney, escala/origen de los GLB, versión de `geometry-script` y dónde persiste en Vercel.
5. Diseño que falta: materiales, galería de renders (escritorio), exportar plano, compartir, tablet, estados (carga, error, conflicto).
6. Probar en el spike: dock propio con `armToolMode`, ocultar la barra de Pascal, recorrido táctil, prueba de fidelidad del render.

## Riesgos
Pascal no está en el material del curso (alucina la API) · el catálogo y los assets de Pascal salen de su bucket (licencia por activo sin explicitar) · WebGPU del equipo de la demo · textos de Pascal en inglés · historia de git concentrada en 48 h · conectores de correo/Drive activos en la sesión.

## Preguntas abiertas para el docente
Modalidad de a dos y atribución · si Fastify + Supabase cuenta como backend · cómo se evalúa apoyarse en Pascal · MVP o app final, y fecha y formato del Demo Day · rúbrica y hitos · dónde van `.claude/` y `docs/superpowers/`.

## Reglas de trabajo con IA (ahorro de tokens)
Ver [`CLAUDE.md`](../CLAUDE.md). Resumen: leer este archivo y no los informes largos; un agente por tema independiente, con archivo de salida y resumen corto; verificar diseño solo en las pantallas que cambiaron.

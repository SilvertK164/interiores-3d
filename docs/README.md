# Índice de documentación

Empezar por [`ESTADO.md`](ESTADO.md). Los demás documentos se abren solo cuando hace falta.

| Documento | Para qué sirve | Cuándo abrirlo |
|---|---|---|
| [`ESTADO.md`](ESTADO.md) | Decisiones, hecho, pendiente, riesgos | Siempre, primero |
| [`analisis-clases.md`](analisis-clases.md) | Reglas del TP, qué rescatar de cada clase, stack, niveles de alcance | Al escribir el README-informe o defender decisiones |
| [`analisis-clases/`](analisis-clases/) | 7 informes largos (clases 00–06 y proveedores de render) | **Solo** para buscar un detalle puntual (usar `grep` de títulos) |
| [`superpowers/specs/`](superpowers/specs/) | Specs aprobados o en revisión | Antes de planificar o implementar |
| [`superpowers/plans/`](superpowers/plans/) | Planes de implementación (aún no escrito) | Al ejecutar tareas |
| [`investigacion-renders-exportaciones-diseno.md`](investigacion-renders-exportaciones-diseno.md) | Render con IA, comparativa gratuita, PDF/DXF/IFC | Al construir render y exportar |
| [`seguridad-claves-byok.md`](seguridad-claves-byok.md) | Diseño seguro de claves de usuario | Al construir integraciones |
| [`inventario-pascal-herramientas.md`](inventario-pascal-herramientas.md) | Qué hace Pascal, vistas, modos, parámetros, 3D, móvil | Al diseñar o integrar el editor |
| [`nombre-y-marca.md`](nombre-y-marca.md) | Nombre Madori, alternativa Stanza, descartados, paleta, tipografías, reglas del logotipo, animación y pendientes | Al tocar logo, colores, Loader o textos de marca |
| `design/` y [`docs/design/`](design/README.md) | 23 capturas de las pantallas (PNG) y capturas reales de Pascal en `design/assets/`. El archivo `interiores.pen` es **local y no se versiona**. `design/marca/` trae la intro, el WebM y los PNG de la marca; `design/implementado/` las capturas de la interfaz hecha | Al diseñar o implementar la interfaz |

## Convenciones
- Idioma: castellano; commits `tipo(área): descripción`.
- Cada afirmación lleva etiqueta **[verificado]**, **[inferencia]** o **[por probar]**.
- Los informes de agentes son material de consulta, **no** se editan; las conclusiones viven en `ESTADO.md`.
- Decisión nueva → se anota en `ESTADO.md` el mismo día.

# Avisos de terceros

## Pascal Editor — MIT
Código (`@pascal-app/*`, vía npm) y assets copiados de su repositorio (`apps/web/public/{material,icons,hdri,fonts,audios,items}`: muebles de `public/items/<nombre>/`).
© Pascal Group Inc. Licencia MIT; copia en `apps/web/public/pascal-LICENSE.txt`. Fuente: https://github.com/pascalorg/editor (commit `86f8e833904f7b6b3358bb1505feb82d801ad9ad`).

### Texturas de materiales servidas por el CDN de Pascal — MIT
La biblioteca de materiales de Pascal (`MATERIAL_CATALOG`) es parte de `@pascal-app/core` (MIT). Las texturas de madera, ladrillo, azulejo y piedra que su repositorio no incluye se piden en tiempo de ejecución a `https://editor.pascal.app/material/` mediante un `rewrite` de Next (`apps/web/next.config.mjs`); **no se copian al repositorio**. La dependencia fue aceptada por el equipo el 2026-10-11. Si ese servicio dejara de responder, esos materiales se reemplazan por equivalentes locales (ver el plan de la tienda, sección de desviaciones).

## Estantes y gabinetes paramétricos
Los estantes (`ShelfNode`) y los gabinetes (`CabinetNode`) de las plantillas son nodos paramétricos de `@pascal-app/core` (MIT): se dibujan por geometría, no hay modelos de terceros.

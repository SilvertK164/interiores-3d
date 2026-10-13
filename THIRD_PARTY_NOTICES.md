# Avisos de terceros

## Pascal Editor — MIT
Código (`@pascal-app/*`, vía npm) y assets copiados de su repositorio (`apps/web/public/{material,icons,hdri,fonts,audios,items}`: muebles de `public/items/<nombre>/`).
© Pascal Group Inc. Licencia MIT; copia en `apps/web/public/pascal-LICENSE.txt`. Fuente: https://github.com/pascalorg/editor (commit `86f8e833904f7b6b3358bb1505feb82d801ad9ad`).

### Texturas de materiales servidas por el CDN de Pascal — MIT
La biblioteca de materiales de Pascal (`MATERIAL_CATALOG`) es parte de `@pascal-app/core` (MIT). Las texturas de madera, ladrillo, azulejo y piedra que su repositorio no incluye se piden en tiempo de ejecución a `https://editor.pascal.app/material/` mediante un `rewrite` de Next (`apps/web/next.config.mjs`); **no se copian al repositorio**. La dependencia fue aceptada por el equipo el 2026-10-11. Si ese servicio dejara de responder, esos materiales se reemplazan por equivalentes locales (ver el plan de la tienda, sección de desviaciones).

## Estantes y gabinetes paramétricos
Los estantes (`ShelfNode`) y los gabinetes (`CabinetNode`) de las plantillas son nodos paramétricos de `@pascal-app/core` (MIT): se dibujan por geometría, no hay modelos de terceros.

## DM Sans (PDF de "Exportar plano") — SIL Open Font License 1.1
`apps/web/public/fonts/pdf/DMSans-*.woff`: DM Sans 400 y 700 (latin y latin-ext) del paquete `@fontsource/dm-sans` 5.3.0, © The DM Sans Project Authors (Colophon Foundry y Google). Se incrusta en los PDF de planos. La licencia viaja con los archivos (`apps/web/public/fonts/pdf/OFL.txt`; origen y huellas en `FUENTES.txt`).

## Fraunces (logotipo del PDF) — SIL Open Font License 1.1
`apps/web/src/lib/export/brand-paths.ts` y `apps/web/public/brand/madori-logotipo.svg` son los contornos de las letras "Mad" y "ri" en Fraunces 700 (`@fontsource-variable/fraunces` 5.3.0, © The Fraunces Project Authors), convertidos una sola vez por `apps/web/scripts/build-brand-paths.ts`. El PDF no incrusta la fuente.

## PDF.js — Apache License 2.0
`apps/web/public/pdfjs/` (`pdf.min.mjs` y `pdf.worker.min.mjs`): PDF.js 6.4.299 (paquete `pdfjs-dist`), © Mozilla and individual contributors. Dibuja la vista previa del diálogo "Exportar plano". La licencia viaja con los archivos (`LICENSE.txt`; origen y huellas en `FUENTES.txt`).

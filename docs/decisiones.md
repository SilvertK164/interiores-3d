# Decisiones de diseño

Las decisiones D1–D10 con sus alternativas están en el
[spec 1](superpowers/specs/2026-10-11-fundacion-y-persistencia-design.md#3-decisiones-insumo-directo-de-qué-decidí-yo-del-readme).
Aquí se anotan las que se toman después, con fecha.

## 2026-10-11 — Desviaciones al preparar el plan
- **Migraciones de escena:** `healSceneNodes` y `migrateVerticalSceneNodes` no se exportan desde `@pascal-app/core`; `useScene` las corre al cargar. El adaptador solo valida el envelope.
- **Autoguardado:** Pascal ya hace debounce de 1 s; nuestro `createSceneSaver` agrega 2 s, un solo guardado en vuelo y reintentos.
- **Catálogo autoalojado:** 100 de los 111 ítems existen con `model.glb` dentro del repo MIT de Pascal (commit `86f8e833904f7b6b3358bb1505feb82d801ad9ad`); se vendorean y se descartan 11 (nodo `cabinet` nativo e ítems con id generado de procedencia dudosa).

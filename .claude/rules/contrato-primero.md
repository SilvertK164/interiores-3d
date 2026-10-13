---
paths:
  - "apps/api/**"
  - "packages/contract/**"
---

# Contrato primero

- `apps/api/openapi.yaml` se actualiza **antes** que el código de la ruta; el test de contrato compara rutas del código y del yaml.
- `404` y nunca `403` para recursos ajenos. Errores con `{ error: { code, message } }` en castellano.
- Los esquemas de `packages/contract` y el yaml coinciden (hay un test que lo comprueba).

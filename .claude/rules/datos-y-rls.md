---
paths:
  - "supabase/**"
  - "apps/api/src/supabase-store.ts"
---

# Datos y RLS

- Toda tabla nueva se crea con `enable row level security` y sus políticas **en la misma migración**.
- Sin política para `anon`; se hace `revoke all ... from anon`.
- Las migraciones las aplica una sola persona (`supabase db push`); el resto las propone por PR.
- `service_role` solo existe en pruebas (`.env.test`). Nunca en `apps/web` ni en `apps/api/src`.
- Una prueba de RLS usa dos usuarios reales de `dev`; no se mockea la base.

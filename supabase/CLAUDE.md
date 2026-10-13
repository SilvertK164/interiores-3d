# supabase/

Migraciones SQL (única fuente del esquema) y pruebas de RLS contra el proyecto `dev`.
Reglas en `.claude/rules/datos-y-rls.md`. Las migraciones las aplica **una sola persona**:
`supabase link --project-ref <ref>` y luego `supabase db push` (o pegar el SQL en el editor SQL del panel).
Las pruebas necesitan `.env.test` en la raíz (ver `.env.example`); sin él **fallan a propósito**.

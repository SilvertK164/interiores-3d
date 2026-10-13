# apps/api/

Fastify (TypeScript). Reglas en `.claude/rules/contrato-primero.md`.
- El punto de entrada para Vercel es `src/index.ts` (llama a `listen`). La fábrica `src/build-app.ts` se usa en las pruebas con `app.inject`. **No crear** `src/app.ts` ni `src/server.ts`: Vercel los tomaría como entrada.
- Si cambias una ruta, cambia primero `openapi.yaml`; `test/contract.test.ts` compara ambos.
- La API reenvía el JWT de la persona a Supabase: RLS decide qué ve cada quien.

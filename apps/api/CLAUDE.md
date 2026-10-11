# apps/api/

Fastify (TypeScript). Reglas en `.claude/rules/contrato-primero.md`.
- `src/index.ts` (llama a `listen`) es el arranque **local** (`pnpm --filter @interiores/api dev`). En Vercel la entrada es la función `api/index.ts` (`src/vercel-handler.ts`), que `vercel.json` fija con `framework: null`; el despliegue no se probó (ver `docs/nube.md`). La fábrica `src/build-app.ts` es la misma para ambos y para las pruebas con `app.inject`. **No crear** `src/app.ts` ni `src/server.ts`: si se quita `framework: null`, Vercel los tomaría como entrada.
- Si cambias una ruta, cambia primero `openapi.yaml`; `test/contract.test.ts` compara ambos.
- La API reenvía el JWT de la persona a Supabase: RLS decide qué ve cada quien.

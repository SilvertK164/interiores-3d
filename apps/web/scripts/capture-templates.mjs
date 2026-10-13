// Corre solo la captura de miniaturas 3D (e2e/capture-templates.spec.ts) con la variable que la habilita.
// Requisitos: Supabase local (pnpm db:start && pnpm db:env); Playwright levanta la API y la web si no están corriendo.
import { spawnSync } from 'node:child_process'

const result = spawnSync('pnpm', ['exec', 'playwright', 'test', 'e2e/capture-templates.spec.ts', '--project=chromium'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, CAPTURE_TEMPLATES: '1' },
})
process.exit(result.status ?? 1)

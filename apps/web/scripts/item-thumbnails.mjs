// Regenera las miniaturas de public/items/<id>/thumbnail.webp con fondo transparente (spec 3, D9).
// Uso: pnpm --filter @interiores/web items:thumbs [id ...]   (sin ids: todas las carpetas de public/items)
// Requisitos: Supabase local (pnpm db:start && pnpm db:env); Playwright levanta la API y la web si no están corriendo.
import { spawnSync } from 'node:child_process'

const ids = process.argv.slice(2)
const result = spawnSync('pnpm', ['exec', 'playwright', 'test', 'e2e/capture-items.spec.ts', '--project=chromium'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, CAPTURE_ITEMS: '1', ...(ids.length > 0 ? { ITEM_IDS: ids.join(',') } : {}) },
})
process.exit(result.status ?? 1)

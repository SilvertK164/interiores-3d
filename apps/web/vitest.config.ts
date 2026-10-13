import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// El alias `@/` es el mismo de tsconfig.json: lo necesitan las pruebas que renderizan componentes de `src/components/`.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  oxc: { jsx: { runtime: 'automatic' } },
  test: { include: ['test/**/*.test.{ts,tsx}'], environment: 'node' },
})

import { defineConfig } from '@playwright/test'

const STATE = 'e2e/.auth/state.json'

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: 0,
  // Dos procesos: las pruebas con WebGL por software (swiftshader) fallan por tiempo al correr más en paralelo.
  workers: 2,
  reporter: [['list']],
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000', trace: 'retain-on-failure' },
  webServer: [
    { command: 'pnpm --filter @interiores/api dev', url: 'http://localhost:3001/health', reuseExistingServer: true, timeout: 60_000 },
    { command: 'pnpm --filter @interiores/web dev', url: 'http://localhost:3000/login', reuseExistingServer: true, timeout: 120_000 },
  ],
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { storageState: STATE, launchOptions: { args: ['--enable-unsafe-webgpu', '--use-angle=swiftshader', '--enable-features=Vulkan'] } },
    },
  ],
})

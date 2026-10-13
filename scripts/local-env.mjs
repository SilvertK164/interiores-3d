// Genera los archivos de entorno locales a partir de Supabase local (Docker).
//   node scripts/local-env.mjs               → .env.test, apps/api/.env, apps/web/.env.local
//   node scripts/local-env.mjs --github-env  → exporta las variables al $GITHUB_ENV (CI)
import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { parseStatusEnv, toEnvFiles } from './lib/status-env.mjs'

const raw = execFileSync('npx', ['--yes', 'supabase@2.120.0', 'status', '-o', 'env'], { encoding: 'utf8', shell: true })
const files = toEnvFiles(parseStatusEnv(raw))

if (process.argv.includes('--github-env')) {
  if (!process.env.GITHUB_ENV) throw new Error('--github-env solo funciona dentro de GitHub Actions')
  for (const content of Object.values(files)) appendFileSync(process.env.GITHUB_ENV, content)
} else {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
    console.log(`escrito ${path}`)
  }
}

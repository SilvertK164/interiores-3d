// Escribe los archivos de entorno para trabajar contra Supabase en la nube, sin Docker (guía: docs/nube.md).
//   node scripts/cloud-env.mjs   → apps/api/.env y apps/web/.env.local   (pnpm db:env:cloud)
// Lee SUPABASE_URL y SUPABASE_ANON_KEY del entorno o de .env.cloud (ignorado por git; ver .env.cloud.example).
// Nunca imprime claves. `--root=<carpeta>` (solo para las pruebas) lee y escribe en otra carpeta.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CloudEnvError, cloudSummary, parseCloudFile, readCloudConfig, toCloudEnvFiles } from './lib/cloud-env.mjs'

const rootArg = process.argv.find((arg) => arg.startsWith('--root='))
const root = rootArg ? resolve(rootArg.slice('--root='.length)) : resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readCloudFile() {
  try {
    return parseCloudFile(readFileSync(join(root, '.env.cloud'), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return {}
    throw error
  }
}

try {
  const config = readCloudConfig({ env: process.env, file: readCloudFile() })
  const files = toCloudEnvFiles(config)
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), content)
  }
  console.log(cloudSummary(config, Object.keys(files)).join('\n'))
} catch (error) {
  console.error(error instanceof CloudEnvError ? error.message : `No se pudo escribir la configuración: ${error.message}`)
  process.exitCode = 1
}

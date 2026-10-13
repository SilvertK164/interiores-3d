// Pascal publica TypeScript sin compilar y su código tiene errores de tipos propios.
// Aquí solo fallan los errores de NUESTROS archivos; los de node_modules se cuentan y se ignoran.
import { spawnSync } from 'node:child_process'

const run = spawnSync('pnpm', ['exec', 'tsc', '--noEmit', '--pretty', 'false'], { encoding: 'utf8', shell: true })
const errors = `${run.stdout}${run.stderr}`.split('\n').filter((l) => /\(\d+,\d+\): error TS\d+/.test(l))
const own = errors.filter((l) => !l.includes('node_modules'))

if (own.length > 0) {
  console.error(own.join('\n'))
  console.error(`\n${own.length} error(es) de tipos en archivos propios.`)
  process.exit(1)
}
console.log(`Tipos OK (se ignoraron ${errors.length} error(es) internos de Pascal en node_modules).`)

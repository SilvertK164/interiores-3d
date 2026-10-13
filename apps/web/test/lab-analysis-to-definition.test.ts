import { describe, it } from 'vitest'

// Este archivo es una lista de ideas para ir verificando mientras exploras el modelado con Pascal
// (src/lib/lab/analysis-to-definition.ts). Cada `it.todo` puede convertirse en una prueba cuando quieras;
// ninguna decide por ti cómo se modela. La guía está en lab/README.md, sección «Ideas para ir verificando».
//
// Para ejecutar solo estas pruebas:  pnpm --filter @interiores/web exec vitest run lab
describe('Ideas para ir verificando el modelado (Laboratorio de Victoria)', () => {
  it.todo('el ambiente podría medir el ancho conocido cuando la persona lo indica')
  it.todo('las piezas podrían quedar siempre dentro del ambiente, incluso las que TP3 ubica en el borde')
  it.todo('la rotación podría respetar el sentido horario de TP3 (visto desde arriba)')
  it.todo('el resultado podría pasar validateDefinition con las piezas y los materiales reales de Pascal')
  it.todo('un asset_id que no esté en el catálogo local podría avisarse (opts.warn) sin romper el resto del análisis')
  it.todo('el análisis de ejemplo (SAMPLE_ANALYSIS) podría convertirse en una escena que buildLabEnvelope dibuje sin errores')
  it.todo('un análisis sin muebles podría producir un ambiente vacío pero válido')
  it.todo('las piezas de confianza baja podrían tener un tratamiento explícito y comentado')
})

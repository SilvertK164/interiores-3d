import { describe, expect, it } from 'vitest'
import { saveStateOf } from '../src/editor/shell/save-state'

describe('saveStateOf (estado del guardador → chip de la barra)', () => {
  it.each([
    ['idle', 'sin-cambios'],
    ['pending', 'guardando'],
    ['saving', 'guardando'],
    ['saved', 'guardado'],
    ['error', 'sin-conexion'],
    ['conflict', 'conflicto'],
    ['unauthorized', 'sin-guardar'],
    ['rejected', 'sin-guardar'],
  ] as const)('%s se muestra como %s', (status, state) => {
    expect(saveStateOf(status)).toBe(state)
  })
})

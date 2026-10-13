import { describe, expect, it } from 'vitest'
import { sessionGate } from '../src/lib/session-gate.js'

describe('sessionGate', () => {
  it('espera mientras se resuelve la sesión inicial', () => {
    expect(sessionGate({ loading: true, hasSession: false, hadSession: false })).toBe('wait')
  })

  it('manda a ingresar si no hay sesión desde el principio', () => {
    expect(sessionGate({ loading: false, hasSession: false, hadSession: false })).toBe('login')
  })

  it('muestra el editor con sesión', () => {
    expect(sessionGate({ loading: false, hasSession: true, hadSession: true })).toBe('show')
  })

  it('si la sesión vence con el editor abierto, NO lo desmonta (se perdería lo no guardado)', () => {
    expect(sessionGate({ loading: false, hasSession: false, hadSession: true })).toBe('show')
  })
})

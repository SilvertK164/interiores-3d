import { describe, expect, it } from 'vitest'
import { ApiError } from '../src/lib/api/client'
import { describeLabError } from '../src/lib/lab/describe-error'
import * as labError from '../src/lib/lab/lab-error'
import { LabError } from '../src/lib/lab/lab-error'

describe('describeLabError', () => {
  it('muestra tal cual el mensaje de un error del laboratorio, que ya está escrito para personas', () => {
    expect(describeLabError(new LabError('TP3 no está corriendo.', 'sin_conexion'))).toBe('TP3 no está corriendo.')
  })

  it('el laboratorio solo tiene LabError: ya no hay un aviso de «modelado en blanco»', () => {
    expect(Object.keys(labError)).toEqual(['LabError'])
  })

  it('para el resto de errores usa la capa común de mensajes', () => {
    expect(describeLabError(new ApiError(0, 'sin_conexion', 'x'))).toMatch(/conexión/i)
    expect(describeLabError(new Error('TypeError: x is undefined'))).toBe('Algo salió mal. Inténtalo de nuevo.')
  })
})

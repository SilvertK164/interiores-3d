import { describe, expect, it } from 'vitest'
import { CreateProjectBodySchema, UpdateProjectBodySchema } from '../src/index.js'

describe('CreateProjectBody', () => {
  it('recorta espacios del nombre', () => {
    expect(CreateProjectBodySchema.parse({ name: '  Casa Alvear  ' }).name).toBe('Casa Alvear')
  })

  it('rechaza nombre vacío o de más de 80 caracteres', () => {
    expect(CreateProjectBodySchema.safeParse({ name: '   ' }).success).toBe(false)
    expect(CreateProjectBodySchema.safeParse({ name: 'a'.repeat(81) }).success).toBe(false)
    expect(CreateProjectBodySchema.safeParse({ name: 'a'.repeat(80) }).success).toBe(true)
  })

  it('solo admite vivienda o comercio como tipo', () => {
    expect(CreateProjectBodySchema.safeParse({ name: 'x', kind: 'oficina' }).success).toBe(false)
    expect(CreateProjectBodySchema.safeParse({ name: 'x', kind: 'comercio' }).success).toBe(true)
  })
})

describe('UpdateProjectBody', () => {
  it('exige al menos un campo', () => {
    expect(UpdateProjectBodySchema.safeParse({}).success).toBe(false)
    expect(UpdateProjectBodySchema.safeParse({ name: 'Nuevo' }).success).toBe(true)
  })

  it('permite quitar el tipo con null', () => {
    expect(UpdateProjectBodySchema.safeParse({ kind: null }).success).toBe(true)
  })
})

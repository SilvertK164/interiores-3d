import { describe, expect, it } from 'vitest'
import { NAME_MAX, NAME_MIN, greetingName, initialsFor, normalizeName, savedName } from '../src/lib/person-name'

const withName = (name: unknown, email = 'silvert.quispe@correo.com') => ({ email, user_metadata: { name } })

describe('normalizeName', () => {
  it('recorta los extremos y deja un solo espacio entre palabras', () => {
    expect(normalizeName('  Ana   María \t')).toBe('Ana María')
    expect(normalizeName('Aea')).toBe('Aea')
    expect(normalizeName('   ')).toBe('')
  })

  it('el largo permitido del nombre es de 2 a 40 caracteres', () => {
    expect([NAME_MIN, NAME_MAX]).toEqual([2, 40])
  })
})

describe('savedName', () => {
  it('lee el nombre que se guardó al crear la cuenta (user_metadata.name)', () => {
    expect(savedName(withName('Ana María'))).toBe('Ana María')
    expect(savedName(withName('  Aea  '))).toBe('Aea')
  })

  it('en cuentas viejas, sin nombre o con algo que no es texto, devuelve vacío', () => {
    expect(savedName({ email: 'a@b.com', user_metadata: {} })).toBe('')
    expect(savedName({ email: 'a@b.com' })).toBe('')
    expect(savedName({ email: 'a@b.com', user_metadata: null })).toBe('')
    for (const bad of [42, true, null, undefined, ['Ana'], { first: 'Ana' }]) expect(savedName(withName(bad))).toBe('')
    expect(savedName(null)).toBe('')
    expect(savedName(undefined)).toBe('')
  })

  it('no pasa de 40 caracteres (el metadato lo puede escribir la propia persona)', () => {
    expect([...savedName(withName('x'.repeat(500)))]).toHaveLength(NAME_MAX)
  })
})

describe('greetingName', () => {
  it('usa el primer nombre guardado, tal como se escribió', () => {
    expect(greetingName(withName('Ana María Pérez'))).toBe('Ana')
    expect(greetingName(withName('aea'))).toBe('aea')
    expect(greetingName(withName('Jean-Luc'))).toBe('Jean-Luc')
  })

  it('sin nombre guardado cae al correo, como hasta ahora', () => {
    expect(greetingName({ email: 'silvert.quispe@correo.com', user_metadata: {} })).toBe('Silvert')
    expect(greetingName({ email: 'victoria_villalba@correo.com' })).toBe('Victoria')
  })

  it('sin nombre ni letras en el correo devuelve vacío', () => {
    expect(greetingName({ email: '1234@correo.com' })).toBe('')
    expect(greetingName(null)).toBe('')
  })
})

describe('initialsFor', () => {
  it('dos o más palabras: las iniciales de las dos primeras', () => {
    expect(initialsFor('Ana María Pérez', 'x@y.com')).toBe('AM')
    expect(initialsFor('jean-luc', 'x@y.com')).toBe('JL')
  })

  it('una sola palabra: sus dos primeras letras', () => {
    expect(initialsFor('Aea', 'aea@correo.com')).toBe('AE')
    expect(initialsFor('éric', 'x@y.com')).toBe('ÉR')
  })

  it('sin nombre cae a las iniciales del correo', () => {
    expect(initialsFor('', 'silvert.quispe@correo.com')).toBe('SQ')
    expect(initialsFor(null, 'victoria@correo.com')).toBe('VI')
    expect(initialsFor('   ', 'ana@correo.com')).toBe('AN')
  })

  it('sin nada devuelve "?"', () => {
    expect(initialsFor(null, null)).toBe('?')
    expect(initialsFor(undefined, '1234@correo.com')).toBe('?')
  })
})

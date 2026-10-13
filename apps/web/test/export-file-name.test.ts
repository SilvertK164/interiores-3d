import { describe, expect, it } from 'vitest'
import { exportFileName, imageFileName } from '../src/lib/export/file-name'

const SAFE = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-planos\.pdf$/

describe('exportFileName (criterio 3)', () => {
  it('"Casa Alvear" se llama Casa-Alvear-planos.pdf', () => {
    expect(exportFileName('Casa Alvear')).toBe('Casa-Alvear-planos.pdf')
  })

  it('quita tildes y ñ, no las cambia por guiones', () => {
    expect(exportFileName('Niño ñandú Éxito')).toBe('Nino-nandu-Exito-planos.pdf')
  })

  it('los caracteres prohibidos en Windows y los de control se vuelven un solo guion', () => {
    expect(exportFileName('a/b:c*d?"e<f>g|h\\i')).toBe('a-b-c-d-e-f-g-h-i-planos.pdf')
    expect(exportFileName('A\u0000B\tC\nD')).toBe('A-B-C-D-planos.pdf')
  })

  it('un nombre reservado de Windows no queda solo (CON, NUL, COM1)', () => {
    for (const name of ['CON', 'NUL', 'COM1', 'aux']) expect(exportFileName(name)).toMatch(SAFE)
    expect(exportFileName('CON')).toBe('CON-planos.pdf')
  })

  it('un nombre vacío, de espacios, de símbolos o de escritura no latina nunca deja el archivo vacío', () => {
    for (const name of ['', '   ', '///', '...', '日本語', '🏠🏠']) {
      expect(exportFileName(name), JSON.stringify(name)).toBe('proyecto-planos.pdf')
    }
  })

  it('los emojis y los símbolos se descartan y el resto se conserva', () => {
    expect(exportFileName('🏠 Casa — Norte')).toBe('Casa-Norte-planos.pdf')
  })

  it('un nombre de 300 caracteres da un archivo de 80 caracteres', () => {
    const name = exportFileName('a'.repeat(300))
    expect(name).toHaveLength(80)
    expect(name).toMatch(SAFE)
  })

  it('al cortar no deja un guion pegado al sufijo ni guiones dobles', () => {
    const name = exportFileName(`${'x'.repeat(68)} yyyy`)
    expect(name).toBe(`${'x'.repeat(68)}-planos.pdf`)
    expect(name).not.toContain('--')
  })

  it('cualquier entrada rara da un nombre seguro de 80 caracteres o menos', () => {
    const inputs = ['Łódź ő', 'a.b.c', '  .oculto', 'x'.repeat(69), 'y'.repeat(70), 'Casa  Alvear -- 2', '‮evil', 'ﬁle']
    for (const input of inputs) {
      const name = exportFileName(input)
      expect(name, JSON.stringify(input)).toMatch(SAFE)
      expect(name.length).toBeLessThanOrEqual(80)
    }
  })
})

describe('imageFileName', () => {
  it('termina en -isometrico.png y limpia el nombre como el del PDF', () => {
    expect(imageFileName('Casa Ñandú / 2º piso')).toBe('Casa-Nandu-2-piso-isometrico.png')
    expect(imageFileName('***')).toBe('proyecto-isometrico.png')
  })
  it('en blanco y negro lleva -bn', () => {
    expect(imageFileName('Casa', 'bn')).toBe('Casa-isometrico-bn.png')
  })
})

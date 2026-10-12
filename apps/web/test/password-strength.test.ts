import { describe, expect, it } from 'vitest'
import { PASSWORD_MIN, passwordStrength } from '../src/lib/password-strength'

const label = (password: string) => passwordStrength(password).label

describe('passwordStrength', () => {
  it('el mínimo del registro es de 6 caracteres', () => {
    expect(PASSWORD_MIN).toBe(6)
  })

  it('sin texto no hay nivel (el medidor no se muestra)', () => {
    expect(passwordStrength('')).toEqual({ level: 0, label: '' })
  })

  it('con menos de 6 caracteres es Débil, aunque mezcle de todo', () => {
    expect(passwordStrength('a')).toEqual({ level: 1, label: 'Débil' })
    expect(label('aB3$x')).toBe('Débil')
  })

  it('las claves comunes o repetidas son Débil por largas que sean', () => {
    for (const weak of ['123456', '12345678', 'password', 'Password', 'contraseña', 'qwerty', 'aaaaaaaaaa', 'abababab']) {
      expect(label(weak), weak).toBe('Débil')
    }
  })

  it('6 o 7 caracteres de una sola clase son Débil; con dos clases, Aceptable', () => {
    expect(label('abcdef')).toBe('Débil')
    expect(label('abcdefg')).toBe('Débil')
    expect(passwordStrength('abcde1')).toEqual({ level: 2, label: 'Aceptable' })
    expect(label('Abcdef')).toBe('Aceptable')
  })

  it('8 o más caracteres son al menos Aceptable', () => {
    expect(label('abcdefgh')).toBe('Aceptable')
    expect(label('Abcdefg1')).toBe('Aceptable')
  })

  it('Buena: 10 o más con tres clases, o una frase larga (14 o más)', () => {
    expect(passwordStrength('Abcdefg1xy')).toEqual({ level: 3, label: 'Buena' })
    expect(label('mi-clave-segura')).toBe('Buena')
    expect(label('una frase larga y facil')).toBe('Buena')
    expect(label('abcdefgh1x')).toBe('Aceptable') // 10 caracteres pero solo dos clases
  })

  it('cuenta las letras con tilde y la eñe como letras, y los espacios y signos como símbolos', () => {
    expect(label('Contraseñá1x')).toBe('Buena')
    expect(label('ñandú 12')).toBe('Aceptable')
  })
})

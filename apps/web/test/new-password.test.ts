import { describe, expect, it } from 'vitest'
import { NEW_PASSWORD_MIN, nextRecoveryState, validateNewPassword } from '../src/lib/new-password'

describe('validateNewPassword', () => {
  it('el mínimo es 8 caracteres', () => {
    expect(NEW_PASSWORD_MIN).toBe(8)
  })

  it('todo bien: sin errores y sin campo inválido', () => {
    expect(validateNewPassword('Casa-2026-ok', 'Casa-2026-ok')).toEqual({ errors: {}, first: null })
  })

  it('vacía: pide elegir una y el foco va a la primera', () => {
    expect(validateNewPassword('', '')).toEqual({
      errors: { password: 'Elige una contraseña nueva.', repeat: 'Repite la contraseña nueva.' },
      first: 'password',
    })
  })

  it('corta: dice cuántos caracteres hacen falta (cuenta caracteres, no unidades UTF-16)', () => {
    const short = validateNewPassword('1234567', '1234567')
    expect(short.errors.password).toBe('La contraseña es muy corta: usa 8 caracteres o más.')
    expect(short.first).toBe('password')
    expect(validateNewPassword('12345678', '12345678').errors).toEqual({})
    // 7 emojis son 14 unidades UTF-16 pero 7 caracteres.
    expect(validateNewPassword('😀'.repeat(7), '😀'.repeat(7)).errors.password).toBeDefined()
  })

  it('las dos no coinciden: el error va en "repetir" y el foco allí', () => {
    expect(validateNewPassword('Casa-2026-ok', 'Casa-2026-OK')).toEqual({
      errors: { repeat: 'Las contraseñas no coinciden.' },
      first: 'repeat',
    })
  })

  it('repetir en blanco con una contraseña buena pide repetirla', () => {
    expect(validateNewPassword('Casa-2026-ok', '')).toEqual({ errors: { repeat: 'Repite la contraseña nueva.' }, first: 'repeat' })
  })

  it('los mensajes no incluyen lo escrito (la contraseña nunca se repite en pantalla)', () => {
    const { errors } = validateNewPassword('secreto', 'otra')
    expect(JSON.stringify(errors)).not.toMatch(/secreto|otra/)
  })
})

describe('nextRecoveryState', () => {
  it('el evento PASSWORD_RECOVERY o cualquier sesión dejan crear la contraseña', () => {
    expect(nextRecoveryState('checking', 'PASSWORD_RECOVERY', true)).toBe('ready')
    expect(nextRecoveryState('checking', 'SIGNED_IN', true)).toBe('ready')
    expect(nextRecoveryState('checking', 'GET_SESSION', true)).toBe('ready')
  })

  it('sin sesión al revisar la URL: el enlace venció o no hay enlace', () => {
    expect(nextRecoveryState('checking', 'GET_SESSION', false)).toBe('expired')
  })

  it('INITIAL_SESSION sin sesión no decide nada: espera a la revisión', () => {
    expect(nextRecoveryState('checking', 'INITIAL_SESSION', false)).toBe('checking')
  })

  it('una sesión ya reconocida no se pierde por una revisión tardía sin sesión', () => {
    expect(nextRecoveryState('ready', 'GET_SESSION', false)).toBe('ready')
  })

  it('cerrar sesión (otra pestaña) deja el enlace como vencido', () => {
    expect(nextRecoveryState('ready', 'SIGNED_OUT', false)).toBe('expired')
  })
})

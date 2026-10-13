import { AuthApiError, AuthRetryableFetchError, AuthUnknownError, AuthWeakPasswordError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { CONFIRM_EMAIL_NOTICE, RESET_SENT_NOTICE, SESSION_EXPIRED_NOTICE, describeAuthError } from '../src/lib/auth-errors'

const api = (message: string, status: number, code?: string) => new AuthApiError(message, status, code)

const NETWORK = 'No hay conexión con el servidor. Reintenta en unos segundos.'
const CREDENTIALS = 'El correo o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.'

describe('describeAuthError: ingresar', () => {
  it('credenciales inválidas: siempre el mismo mensaje y el foco va a la contraseña', () => {
    const out = describeAuthError(api('Invalid login credentials', 400, 'invalid_credentials'), 'login')
    expect(out).toEqual({ tone: 'error', message: CREDENTIALS, field: 'password' })
  })

  it('nunca revela si el correo existe: un usuario inexistente y una cuenta repetida dicen lo mismo que una clave errónea', () => {
    for (const code of ['user_not_found', 'user_already_exists', 'email_exists', 'invalid_credentials']) {
      const out = describeAuthError(api('x', 400, code), 'login')
      expect(out.message, code).toBe(CREDENTIALS)
      expect(out.action, code).toBeUndefined()
      expect(out.message).not.toMatch(/existe|registrad|no hay una cuenta/i)
    }
  })

  it('entiende también la respuesta antigua, sin código', () => {
    expect(describeAuthError(api('Invalid login credentials', 400), 'login').message).toBe(CREDENTIALS)
  })

  it('correo sin confirmar (solo llega con la contraseña correcta)', () => {
    const out = describeAuthError(api('Email not confirmed', 400, 'email_not_confirmed'), 'login')
    expect(out.message).toBe('Todavía no confirmaste tu correo. Abre el mensaje que te enviamos y vuelve a ingresar.')
    expect(out.tone).toBe('error')
  })

  it('demasiados intentos', () => {
    for (const err of [api('x', 429, 'over_request_rate_limit'), api('x', 429)]) {
      expect(describeAuthError(err, 'login').message).toBe('Hiciste muchos intentos seguidos. Espera unos minutos e inténtalo de nuevo.')
    }
  })

  it('un error desconocido no filtra detalles técnicos', () => {
    const out = describeAuthError(api('duplicate key value violates unique constraint "users_pkey"', 400, 'raro'), 'login')
    expect(out).toEqual({ tone: 'error', message: 'No pudimos ingresar. Inténtalo de nuevo en unos segundos.' })
  })
})

describe('describeAuthError: crear cuenta', () => {
  it('correo ya registrado: lo dice y ofrece ingresar con esa cuenta', () => {
    for (const code of ['user_already_exists', 'email_exists']) {
      expect(describeAuthError(api('User already registered', 422, code), 'register')).toEqual({
        tone: 'error',
        message: 'Ya existe una cuenta con ese correo.',
        field: 'email',
        action: { kind: 'go-login', label: 'Ingresar con esa cuenta' },
      })
    }
  })

  it('contraseña débil según el motivo que informa el servidor', () => {
    const weak = (reasons: ('length' | 'characters' | 'pwned')[]) => describeAuthError(new AuthWeakPasswordError('x', 422, reasons), 'register')
    expect(weak(['pwned']).message).toBe('Esa contraseña aparece en filtraciones de datos. Elige otra.')
    expect(weak(['length']).message).toBe('La contraseña es muy corta. Usa más caracteres.')
    expect(weak(['characters']).message).toBe('La contraseña es muy simple. Mezcla mayúsculas, minúsculas, números y símbolos.')
    expect(weak([]).message).toBe('La contraseña es muy débil. Usa más caracteres y mezcla letras, números y símbolos.')
    expect(weak(['length', 'pwned']).message).toBe('Esa contraseña aparece en filtraciones de datos. Elige otra.')
    expect(weak(['length']).field).toBe('password')
  })

  it('weak_password llega también como error de API sin lista de motivos', () => {
    const out = describeAuthError(api('Password should be at least 6 characters', 422, 'weak_password'), 'register')
    expect(out.message).toBe('La contraseña es muy débil. Usa más caracteres y mezcla letras, números y símbolos.')
    expect(out.field).toBe('password')
  })

  it('límite de envíos y de pedidos', () => {
    for (const code of ['over_email_send_rate_limit', 'over_request_rate_limit']) {
      expect(describeAuthError(api('x', 429, code), 'register').message).toBe(
        'Hiciste muchos intentos seguidos. Espera unos minutos e inténtalo de nuevo.',
      )
    }
  })

  it('registro cerrado', () => {
    for (const code of ['signup_disabled', 'email_provider_disabled']) {
      expect(describeAuthError(api('Signups not allowed', 422, code), 'register').message).toBe('Por ahora no se pueden crear cuentas nuevas.')
    }
  })

  it('correo que el servidor rechaza por inválido marca el campo', () => {
    const out = describeAuthError(api('Email address "x@x.x" is invalid', 400, 'email_address_invalid'), 'register')
    expect(out.message).toBe('Ese correo no parece válido. Revisa que esté bien escrito o prueba con otro.')
    expect(out.field).toBe('email')
  })

  it('un error desconocido no filtra detalles técnicos', () => {
    const out = describeAuthError(new AuthUnknownError('boom: stack trace', new Error('x')), 'register')
    expect(out).toEqual({ tone: 'error', message: 'No pudimos crear tu cuenta. Inténtalo de nuevo en unos segundos.' })
  })
})

describe('describeAuthError: sin conexión', () => {
  it('error de red, estado 0 y servidor caído se explican igual en ambos formularios', () => {
    const errors = [
      new AuthRetryableFetchError('Failed to fetch', 0),
      new AuthRetryableFetchError('Service unavailable', 503),
      api('x', 500, 'unexpected_failure'),
      api('x', 504, 'request_timeout'),
      { status: 0 },
      { name: 'AuthRetryableFetchError' },
    ]
    for (const err of errors) {
      for (const context of ['login', 'register'] as const) {
        expect(describeAuthError(err, context), `${context} ${JSON.stringify(err)}`).toEqual({ tone: 'error', message: NETWORK })
      }
    }
  })
})

describe('describeAuthError: valores raros', () => {
  it('lo que no es un error de Supabase cae al mensaje desconocido, sin lanzar', () => {
    for (const odd of [null, undefined, 'texto', 42, {}, new Error('TypeError: x is undefined')]) {
      expect(describeAuthError(odd, 'login').message).toBe('No pudimos ingresar. Inténtalo de nuevo en unos segundos.')
    }
  })
})

describe('avisos que no son errores', () => {
  it('el aviso de registro sin sesión pide confirmar el correo', () => {
    expect(CONFIRM_EMAIL_NOTICE).toEqual({
      tone: 'info',
      message: 'Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve a ingresar.',
    })
  })

  it('el aviso de sesión vencida promete volver a donde ibas', () => {
    expect(SESSION_EXPIRED_NOTICE).toEqual({
      tone: 'info',
      message: 'Tu sesión venció. Vuelve a ingresar y seguimos donde lo dejaste.',
    })
  })
})

describe('describeAuthError: pedir el enlace para recuperar la contraseña', () => {
  it('el aviso de éxito es siempre el mismo y no dice si el correo existe', () => {
    expect(RESET_SENT_NOTICE).toEqual({
      tone: 'info',
      message: 'Si el correo está registrado, te enviamos un enlace para crear una contraseña nueva. Revisa también el correo no deseado.',
    })
  })

  it('límite de envíos (429 o over_email_send_rate_limit): mensaje amable que pide esperar', () => {
    for (const err of [api('x', 429, 'over_email_send_rate_limit'), api('x', 429, 'over_request_rate_limit'), api('x', 429)]) {
      const out = describeAuthError(err, 'reset')
      expect(out.tone).toBe('error')
      expect(out.message).toBe('Pediste varios enlaces seguidos. Espera unos minutos antes de pedir otro.')
    }
  })

  it('sin conexión: el mensaje de red de siempre', () => {
    expect(describeAuthError(new AuthRetryableFetchError('Failed to fetch', 0), 'reset').message).toBe(NETWORK)
  })

  it('un correo que el servidor dice que no existe se trata como enviado: nunca se revela', () => {
    for (const code of ['user_not_found', 'email_not_found']) {
      expect(describeAuthError(api('x', 400, code), 'reset')).toEqual(RESET_SENT_NOTICE)
    }
  })

  it('correo inválido apunta al campo; lo desconocido no lanza y no menciona cuentas', () => {
    expect(describeAuthError(api('x', 400, 'email_address_invalid'), 'reset')).toMatchObject({ tone: 'error', field: 'email' })
    for (const odd of [null, undefined, {}, new Error('boom'), api('x', 400, 'otra_cosa')]) {
      const out = describeAuthError(odd, 'reset')
      expect(out.message).toBe('No pudimos enviar el enlace. Inténtalo de nuevo en unos segundos.')
      expect(out.message).not.toMatch(/existe|registrad|no hay una cuenta/i)
    }
  })
})

describe('describeAuthError: guardar la contraseña nueva', () => {
  it('contraseña débil o igual a la actual: el foco va a la contraseña', () => {
    expect(describeAuthError(api('x', 422, 'same_password'), 'new-password')).toMatchObject({
      tone: 'error',
      field: 'password',
      message: 'Esa es tu contraseña actual. Elige una distinta.',
    })
    const weak = new AuthWeakPasswordError('weak', 422, ['pwned'])
    expect(describeAuthError(weak, 'new-password')).toMatchObject({ field: 'password', message: 'Esa contraseña aparece en filtraciones de datos. Elige otra.' })
  })

  it('el enlace venció o ya se usó (sin sesión o 401/403): lo dice y ofrece volver a ingresar', () => {
    for (const err of [api('x', 403, 'session_not_found'), api('x', 401, 'bad_jwt'), api('x', 401), api('x', 403, 'session_expired')]) {
      const out = describeAuthError(err, 'new-password')
      expect(out.message).toBe('El enlace venció o ya se usó. Pide uno nuevo desde «¿Olvidaste tu contraseña?» al ingresar.')
      expect(out.action).toEqual({ kind: 'go-login', label: 'Volver a ingresar' })
    }
  })

  it('red caída, límite de pedidos y lo desconocido', () => {
    expect(describeAuthError(new AuthRetryableFetchError('Failed to fetch', 0), 'new-password').message).toBe(NETWORK)
    expect(describeAuthError(api('x', 429), 'new-password').message).toBe('Hiciste muchos intentos seguidos. Espera unos minutos e inténtalo de nuevo.')
    for (const odd of [null, {}, new Error('boom'), api('x', 400, 'otra_cosa')]) {
      expect(describeAuthError(odd, 'new-password').message).toBe('No pudimos guardar tu contraseña nueva. Inténtalo de nuevo en unos segundos.')
    }
  })
})

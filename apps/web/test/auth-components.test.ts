import { type ComponentProps, createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AuthBanner } from '../src/components/AuthBanner'
import { AuthField } from '../src/components/AuthField'
import { AuthTabs } from '../src/components/AuthTabs'
import { LoginForm } from '../src/components/LoginForm'
import { PasswordStrength } from '../src/components/PasswordStrength'
import { RegisterForm } from '../src/components/RegisterForm'

const html = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node)
const noop = () => {}
const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)?.[1]
const tagsOf = (markup: string, tag: string) => [...markup.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))].map((m) => m[0])
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')

describe('AuthTabs', () => {
  const render = (mode: 'login' | 'register', disabled = false) => {
    // Los hijos van como tercer argumento (lo que pide el linter); el cast evita que TypeScript exija `children` en las props.
    const props: Omit<ComponentProps<typeof AuthTabs>, 'children'> = { mode, onChange: noop, disabled }
    return html(createElement(AuthTabs, props as ComponentProps<typeof AuthTabs>, createElement('p', null, 'contenido')))
  }
  const tabs = (markup: string) => tagsOf(markup, 'button').filter((tag) => attr(tag, 'role') === 'tab')

  it('es un tablist con las pestañas "Ingresar" y "Crear cuenta" y un tabpanel con el contenido', () => {
    const out = render('login')
    expect(out).toMatch(/role="tablist"/)
    expect(tabs(out)).toHaveLength(2)
    expect(textOf(out)).toBe('IngresarCrear cuentacontenido')
    expect(out).toMatch(/role="tabpanel"[^>]*>(<p>contenido<\/p>)/)
  })

  it('marca con aria-selected la pestaña activa y solo ella entra en el orden del teclado', () => {
    const [login, register] = tabs(render('login'))
    expect([attr(login ?? '', 'aria-selected'), attr(login ?? '', 'tabindex')]).toEqual(['true', '0'])
    expect([attr(register ?? '', 'aria-selected'), attr(register ?? '', 'tabindex')]).toEqual(['false', '-1'])

    const [login2, register2] = tabs(render('register'))
    expect(attr(login2 ?? '', 'aria-selected')).toBe('false')
    expect([attr(register2 ?? '', 'aria-selected'), attr(register2 ?? '', 'tabindex')]).toEqual(['true', '0'])
  })

  it('el tabpanel está rotulado por la pestaña activa y esta lo controla', () => {
    for (const mode of ['login', 'register'] as const) {
      const out = render(mode)
      const selected = tabs(out).find((tag) => attr(tag, 'aria-selected') === 'true') ?? ''
      const panel = tagsOf(out, 'div').find((tag) => attr(tag, 'role') === 'tabpanel') ?? ''
      expect(attr(panel, 'aria-labelledby')).toBe(attr(selected, 'id'))
      expect(attr(selected, 'aria-controls')).toBe(attr(panel, 'id'))
    }
  })

  it('con disabled (mientras se envía) las pestañas no se pueden cambiar', () => {
    expect(tabs(render('login', true)).every((tag) => /\sdisabled(=|\s|>)/.test(tag))).toBe(true)
    expect(tabs(render('login')).some((tag) => /\sdisabled(=|\s|>)/.test(tag))).toBe(false)
  })
})

describe('AuthField', () => {
  const field = (props: Record<string, unknown> = {}) =>
    html(createElement(AuthField, { id: 'f', label: 'Correo', value: '', onChange: noop, autoComplete: 'email', type: 'email', ...props }))
  const input = (markup: string) => tagsOf(markup, 'input')[0] ?? ''

  it('une la etiqueta con el campo y trae el autocompletado indicado', () => {
    const out = field()
    expect(out).toMatch(/<label[^>]*\sfor="f"[^>]*>Correo<\/label>/)
    expect([attr(input(out), 'id'), attr(input(out), 'type'), attr(input(out), 'autocomplete')]).toEqual(['f', 'email', 'email'])
    expect(attr(input(out), 'aria-invalid')).toBeUndefined()
    expect(attr(input(out), 'aria-describedby')).toBeUndefined()
  })

  it('con error marca aria-invalid, lo enlaza con aria-describedby y lo anuncia con role="alert"', () => {
    const out = field({ error: 'Escribe tu correo.' })
    expect(attr(input(out), 'aria-invalid')).toBe('true')
    expect(attr(input(out), 'aria-describedby')).toBe('f-error')
    expect(out).toMatch(/<p[^>]*\sid="f-error"[^>]*>Escribe tu correo\.<\/p>/)
    expect(attr(tagsOf(out, 'p')[0] ?? '', 'role')).toBe('alert')
  })

  it('la ayuda y otros textos descriptivos también describen el campo', () => {
    const out = field({ hint: '6 caracteres o más', describedBy: 'otro', error: 'Mal.' })
    expect(attr(input(out), 'aria-describedby')).toBe('f-hint otro f-error')
    expect(out).toContain('6 caracteres o más')
  })

  it('solo la contraseña lleva el botón de ver u ocultar, con aria-pressed y una etiqueta en castellano', () => {
    expect(tagsOf(field(), 'button')).toHaveLength(0)
    const out = field({ type: 'password', label: 'Contraseña', autoComplete: 'current-password' })
    expect(attr(input(out), 'type')).toBe('password')
    const [toggle] = tagsOf(out, 'button')
    expect(attr(toggle ?? '', 'aria-pressed')).toBe('false')
    expect(attr(toggle ?? '', 'aria-label')).toBe('Mostrar contraseña')
    expect(attr(toggle ?? '', 'type')).toBe('button')
    expect(out).toContain('lucide-eye')
  })

  it('con ok muestra la marca de campo correcto, decorativa', () => {
    expect(field()).not.toContain('lucide-check')
    expect(field({ ok: true })).toMatch(/<svg[^>]*aria-hidden="true"[^>]*lucide-check|<svg[^>]*lucide-check[^>]*aria-hidden="true"/)
  })
})

describe('PasswordStrength', () => {
  const meter = (password: string) => html(createElement(PasswordStrength, { password, id: 'm' }))
  const emptyBars = (markup: string) => (markup.match(/bg-brand-wash/g) ?? []).length

  it('sin contraseña no muestra nada', () => {
    expect(meter('')).toBe('')
  })

  it('muestra el nivel con texto además del color, en una región de estado', () => {
    for (const [password, label, level, empty] of [
      ['abc', 'Débil', '1', 2],
      ['abcde1', 'Aceptable', '2', 1],
      ['Abcdefg1xy', 'Buena', '3', 0],
    ] as const) {
      const out = meter(password)
      expect(textOf(out), password).toBe(label)
      const [region] = tagsOf(out, 'div')
      expect([attr(region ?? '', 'role'), attr(region ?? '', 'data-level'), attr(region ?? '', 'id')]).toEqual(['status', level, 'm'])
      expect(emptyBars(out), password).toBe(empty)
    }
  })
})

describe('AuthBanner', () => {
  it('un error se anuncia con role="alert"; un aviso informativo, con role="status"', () => {
    const error = html(createElement(AuthBanner, { notice: { tone: 'error', message: 'Algo falló.' } }))
    const info = html(createElement(AuthBanner, { notice: { tone: 'info', message: 'Tu sesión venció.' } }))
    expect(attr(tagsOf(error, 'div')[0] ?? '', 'role')).toBe('alert')
    expect(attr(tagsOf(info, 'div')[0] ?? '', 'role')).toBe('status')
    expect(textOf(error)).toBe('Algo falló.')
    expect(error).toMatch(/aria-hidden="true"/)
  })

  it('la acción sale como botón con su texto; sin acción no hay botón', () => {
    const notice = { tone: 'error', message: 'Ya existe una cuenta con ese correo.', action: { kind: 'go-login', label: 'Ingresar con esa cuenta' } } as const
    const out = html(createElement(AuthBanner, { notice, onAction: noop }))
    expect(out).toMatch(/<button[^>]*type="button"[^>]*>Ingresar con esa cuenta<\/button>/)
    expect(tagsOf(html(createElement(AuthBanner, { notice: { tone: 'error', message: 'x' } })), 'button')).toHaveLength(0)
  })
})

describe('LoginForm', () => {
  const base = { email: '', onEmail: noop, locked: false, error: null, notice: null, onSubmit: noop, onAction: noop, onForgot: noop }
  const login = (props: Record<string, unknown> = {}) => html(createElement(LoginForm, { ...base, ...props }))

  it('tiene el título, el correo y la contraseña con su autocompletado, y el botón Ingresar', () => {
    const out = login()
    expect(out).toMatch(/<h1[^>]*>Te damos la bienvenida<\/h1>/)
    const [form] = tagsOf(out, 'form')
    expect(form).toMatch(/\snovalidate/i)
    const inputs = tagsOf(out, 'input')
    expect(inputs.map((tag) => [attr(tag, 'type'), attr(tag, 'autocomplete')])).toEqual([
      ['email', 'email'],
      ['password', 'current-password'],
    ])
    expect(out).toMatch(/<label[^>]*>Correo<\/label>/)
    expect(out).toMatch(/<label[^>]*>Contraseña<\/label>/)
    expect(out).toMatch(/<button[^>]*type="submit"[^>]*>Ingresar<\/button>/)
    expect(out).toContain('Mostrar contraseña')
  })

  it('el campo de correo muestra lo que viene de la pestaña (por ejemplo el correo ya escrito)', () => {
    expect(attr(tagsOf(login({ email: 'ana@correo.com' }), 'input')[0] ?? '', 'value')).toBe('ana@correo.com')
  })

  it('mientras envía el botón queda ocupado y no se puede pulsar otra vez', () => {
    const [submit] = tagsOf(login({ locked: true }), 'button').filter((tag) => attr(tag, 'type') === 'submit')
    expect(attr(submit ?? '', 'aria-busy')).toBe('true')
    expect(submit).toMatch(/\sdisabled(=|\s|>)/)
    const [idle] = tagsOf(login(), 'button').filter((tag) => attr(tag, 'type') === 'submit')
    expect(attr(idle ?? '', 'aria-busy')).toBeUndefined()
  })

  it('muestra el aviso de sesión vencida arriba y el error del servidor sobre el botón', () => {
    const out = login({
      notice: { tone: 'info', message: 'Tu sesión venció. Vuelve a ingresar y seguimos donde lo dejaste.' },
      error: { tone: 'error', message: 'El correo o la contraseña no coinciden.', field: 'password' },
    })
    expect(out).toContain('Tu sesión venció. Vuelve a ingresar y seguimos donde lo dejaste.')
    expect(out).toContain('El correo o la contraseña no coinciden.')
    expect(out.indexOf('Tu sesión venció')).toBeLessThan(out.indexOf('Correo</label>'))
    expect(out.indexOf('no coinciden')).toBeGreaterThan(out.indexOf('Contraseña</label>'))
  })

  it('el campo al que apunta el error del servidor queda descrito por el aviso', () => {
    const out = login({ error: { tone: 'error', message: 'El correo o la contraseña no coinciden.', field: 'password' } })
    const password = tagsOf(out, 'input')[1] ?? ''
    const alert = tagsOf(out, 'div').find((tag) => attr(tag, 'role') === 'alert') ?? ''
    expect(attr(alert, 'id')).toBeTruthy()
    expect(attr(password, 'aria-describedby')).toContain(attr(alert, 'id') ?? 'x')
  })
})

describe('RegisterForm', () => {
  const base = { email: '', onEmail: noop, locked: false, error: null, onSubmit: noop, onAction: noop }
  const register = (props: Record<string, unknown> = {}) => html(createElement(RegisterForm, { ...base, ...props }))

  it('pide nombre, correo y contraseña con el autocompletado correcto, y el botón Crear mi cuenta', () => {
    const out = register()
    expect(out).toMatch(/<h1[^>]*>Crea tu cuenta<\/h1>/)
    const inputs = tagsOf(out, 'input')
    expect(inputs.map((tag) => [attr(tag, 'type'), attr(tag, 'autocomplete')])).toEqual([
      ['text', 'name'],
      ['email', 'email'],
      ['password', 'new-password'],
    ])
    expect(out).toMatch(/<label[^>]*>¿Cómo te llamamos\?<\/label>/)
    expect(out).toMatch(/<label[^>]*>Correo<\/label>/)
    expect(out).toMatch(/<label[^>]*>Contraseña<\/label>/)
    expect(out).toMatch(/<button[^>]*type="submit"[^>]*>Crear mi cuenta<\/button>/)
  })

  it('avisa del mínimo de la contraseña y no muestra el medidor mientras está vacía', () => {
    const out = register()
    expect(out).toContain('6 caracteres o más')
    expect(out).not.toContain('data-level')
  })

  it('"Ya existe una cuenta" ofrece ingresar con esa cuenta y queda descrito en el campo del correo', () => {
    const error = {
      tone: 'error',
      message: 'Ya existe una cuenta con ese correo.',
      field: 'email',
      action: { kind: 'go-login', label: 'Ingresar con esa cuenta' },
    }
    const out = register({ error })
    expect(out).toContain('Ya existe una cuenta con ese correo.')
    expect(out).toMatch(/<button[^>]*type="button"[^>]*>Ingresar con esa cuenta<\/button>/)
    const alert = tagsOf(out, 'div').find((tag) => attr(tag, 'role') === 'alert') ?? ''
    expect(attr(tagsOf(out, 'input')[1] ?? '', 'aria-describedby')).toContain(attr(alert, 'id') ?? 'x')
  })

  it('el aviso de confirmar el correo es informativo', () => {
    const out = register({ error: { tone: 'info', message: 'Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve a ingresar.' } })
    expect(out).toContain('Te enviamos un correo para confirmar tu cuenta.')
    expect(tagsOf(out, 'div').some((tag) => attr(tag, 'role') === 'status')).toBe(true)
  })

  it('mientras envía el botón queda ocupado', () => {
    const [submit] = tagsOf(register({ locked: true }), 'button').filter((tag) => attr(tag, 'type') === 'submit')
    expect(attr(submit ?? '', 'aria-busy')).toBe('true')
    expect(submit).toMatch(/\sdisabled(=|\s|>)/)
  })
})

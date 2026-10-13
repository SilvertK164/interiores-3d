import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ForgotPasswordForm } from '../src/components/ForgotPasswordForm'
import { LoginForm } from '../src/components/LoginForm'
import { NewPasswordForm } from '../src/components/NewPasswordForm'
import { RESET_SENT_NOTICE } from '../src/lib/auth-errors'

const html = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node)
const noop = () => {}
const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)?.[1]
const tagsOf = (markup: string, tag: string) => [...markup.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))].map((m) => m[0])
const buttonByText = (markup: string, text: string) => [...markup.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map((m) => m[0]).find((b) => b.replace(/<[^>]+>/g, '').trim() === text)

describe('LoginForm: ¿Olvidaste tu contraseña?', () => {
  const login = () => html(createElement(LoginForm, { email: '', onEmail: noop, locked: false, error: null, notice: null, onSubmit: noop, onAction: noop, onForgot: noop }))

  it('trae el botón de enlace, que no envía el formulario y mide al menos 44 px de alto', () => {
    const button = buttonByText(login(), '¿Olvidaste tu contraseña?')
    expect(button).toBeDefined()
    expect(attr(button ?? '', 'type')).toBe('button')
    expect(button).toMatch(/\bmin-h-11\b/)
    expect(button).toMatch(/\bfocus-ring\b/)
  })

  it('va después de la contraseña y antes del botón Ingresar', () => {
    const out = login()
    expect(out.indexOf('¿Olvidaste tu contraseña?')).toBeGreaterThan(out.indexOf('Contraseña</label>'))
    expect(out.indexOf('¿Olvidaste tu contraseña?')).toBeLessThan(out.indexOf('>Ingresar</button>'))
  })
})

describe('ForgotPasswordForm', () => {
  const base = { email: '', onEmail: noop, locked: false, error: null, sent: false, onSubmit: noop, onBack: noop }
  const forgot = (props: Record<string, unknown> = {}) => html(createElement(ForgotPasswordForm, { ...base, ...props }))

  it('pide solo el correo, con autocompletado, y tiene Enviar enlace y Volver a ingresar', () => {
    const out = forgot()
    expect(out).toMatch(/<h1[^>]*>¿Olvidaste tu contraseña\?<\/h1>/)
    const inputs = tagsOf(out, 'input')
    expect(inputs.map((tag) => [attr(tag, 'type'), attr(tag, 'autocomplete')])).toEqual([['email', 'email']])
    expect(out).toMatch(/<button[^>]*type="submit"[^>]*>Enviar enlace<\/button>/)
    expect(buttonByText(out, 'Volver a ingresar')).toBeDefined()
  })

  it('el campo muestra el correo que ya se escribió en Ingresar', () => {
    expect(attr(tagsOf(forgot({ email: 'ana@correo.com' }), 'input')[0] ?? '', 'value')).toBe('ana@correo.com')
  })

  it('al enviar queda ocupado y deshabilitado', () => {
    const [submit] = tagsOf(forgot({ locked: true }), 'button').filter((tag) => attr(tag, 'type') === 'submit')
    expect(attr(submit ?? '', 'aria-busy')).toBe('true')
    expect(submit).toMatch(/\sdisabled(=|\s|>)/)
  })

  it('con el error amable del servidor lo muestra como alerta', () => {
    const out = forgot({ error: { tone: 'error', message: 'Pediste varios enlaces seguidos. Espera unos minutos antes de pedir otro.' } })
    expect(out).toMatch(/role="alert"/)
    expect(out).toContain('Pediste varios enlaces seguidos.')
  })

  it('tras enviar solo queda el mismo aviso de siempre y Volver a ingresar (no hay campo ni botón de envío)', () => {
    const out = forgot({ sent: true })
    expect(out).toContain(RESET_SENT_NOTICE.message)
    expect(out).toMatch(/role="status"/)
    expect(tagsOf(out, 'input')).toHaveLength(0)
    expect(out).not.toContain('Enviar enlace')
    expect(buttonByText(out, 'Volver a ingresar')).toBeDefined()
  })
})

describe('NewPasswordForm', () => {
  const base = { locked: false, error: null, onSubmit: noop, onAction: noop }
  const form = (props: Record<string, unknown> = {}) => html(createElement(NewPasswordForm, { ...base, ...props }))

  it('dos campos de contraseña nueva, el título y el botón', () => {
    const out = form()
    expect(out).toMatch(/<h1[^>]*>Crea tu contraseña nueva<\/h1>/)
    const inputs = tagsOf(out, 'input')
    expect(inputs.map((tag) => [attr(tag, 'type'), attr(tag, 'autocomplete')])).toEqual([
      ['password', 'new-password'],
      ['password', 'new-password'],
    ])
    expect(out).toMatch(/<label[^>]*>Contraseña nueva<\/label>/)
    expect(out).toMatch(/<label[^>]*>Repite la contraseña<\/label>/)
    expect(out).toContain('8 caracteres o más')
    expect(out).toMatch(/<button[^>]*type="submit"[^>]*>Guardar contraseña<\/button>/)
  })

  it('el medidor de fuerza solo aparece cuando ya se escribió algo (el formulario arranca vacío)', () => {
    expect(form()).not.toMatch(/role="status"/)
  })

  it('el error del servidor se anuncia como alerta y ocupa el botón mientras guarda', () => {
    const out = form({ error: { tone: 'error', message: 'Esa es tu contraseña actual. Elige una distinta.', field: 'password' }, locked: true })
    expect(out).toMatch(/role="alert"/)
    const [submit] = tagsOf(out, 'button').filter((tag) => attr(tag, 'type') === 'submit')
    expect(attr(submit ?? '', 'aria-busy')).toBe('true')
    expect(submit).toMatch(/\sdisabled(=|\s|>)/)
  })
})

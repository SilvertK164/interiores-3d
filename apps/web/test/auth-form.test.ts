import { describe, expect, it } from 'vitest'
import { FIELDS, tabForKey, validateAuthForm, validateField, visibleErrors } from '../src/lib/auth-form'

describe('validateField: nombre', () => {
  it('es obligatorio, también si solo hay espacios', () => {
    expect(validateField('register', 'name', '')).toBe('Escribe cómo te llamamos.')
    expect(validateField('register', 'name', '    ')).toBe('Escribe cómo te llamamos.')
  })

  it('pide de 2 a 40 caracteres, contados después de recortar los espacios', () => {
    expect(validateField('register', 'name', 'A')).toBe('Tu nombre necesita al menos 2 caracteres.')
    expect(validateField('register', 'name', '  A  ')).toBe('Tu nombre necesita al menos 2 caracteres.')
    expect(validateField('register', 'name', 'Al')).toBeNull()
    expect(validateField('register', 'name', ' Al ')).toBeNull()
    expect(validateField('register', 'name', 'x'.repeat(40))).toBeNull()
    expect(validateField('register', 'name', 'x'.repeat(41))).toBe('Usa 40 caracteres o menos.')
  })
})

describe('validateField: correo', () => {
  it('es obligatorio', () => {
    expect(validateField('login', 'email', '')).toBe('Escribe tu correo.')
    expect(validateField('register', 'email', '   ')).toBe('Escribe tu correo.')
  })

  it('revisa que tenga la forma nombre@dominio.ext', () => {
    for (const bad of ['ana', 'ana@', '@correo.com', 'ana@correo', 'ana@correo.', 'ana correo@x.com', 'ana@@x.com']) {
      expect(validateField('login', 'email', bad), bad).toBe('Revisa el correo: debe verse como nombre@correo.com.')
    }
    for (const ok of ['ana@correo.com', ' ana@correo.com ', 'ana.perez+tp@correo.com.ar']) {
      expect(validateField('login', 'email', ok), ok).toBeNull()
    }
  })
})

describe('validateField: contraseña', () => {
  it('al ingresar solo exige que no esté vacía (el largo lo decide la cuenta)', () => {
    expect(validateField('login', 'password', '')).toBe('Escribe tu contraseña.')
    expect(validateField('login', 'password', 'a')).toBeNull()
  })

  it('al crear la cuenta exige 6 caracteres o más, sin recortar espacios', () => {
    expect(validateField('register', 'password', '')).toBe('Elige una contraseña.')
    expect(validateField('register', 'password', '12345')).toBe('La contraseña es muy corta: usa 6 caracteres o más.')
    expect(validateField('register', 'password', '123456')).toBeNull()
    expect(validateField('register', 'password', '      ')).toBeNull()
  })
})

describe('validateAuthForm', () => {
  it('un formulario de ingreso válido no tiene errores ni campo inválido', () => {
    expect(validateAuthForm('login', { name: '', email: 'ana@correo.com', password: 'x' })).toEqual({ errors: {}, first: null })
  })

  it('al ingresar ignora el nombre', () => {
    expect(validateAuthForm('login', { name: '', email: 'ana@correo.com', password: 'x' }).errors.name).toBeUndefined()
  })

  it('el primer campo inválido sigue el orden de la pantalla: nombre, correo, contraseña', () => {
    const empty = validateAuthForm('register', { name: '', email: '', password: '' })
    expect(Object.keys(empty.errors)).toEqual(['name', 'email', 'password'])
    expect(empty.first).toBe('name')
    expect(validateAuthForm('register', { name: 'Ana', email: 'mal', password: '' }).first).toBe('email')
    expect(validateAuthForm('register', { name: 'Ana', email: 'ana@correo.com', password: '123' }).first).toBe('password')
    expect(validateAuthForm('register', { name: 'Ana', email: 'ana@correo.com', password: '123456' }).first).toBeNull()
  })

  it('FIELDS dice qué campos tiene cada formulario, en orden', () => {
    expect(FIELDS.login).toEqual(['email', 'password'])
    expect(FIELDS.register).toEqual(['name', 'email', 'password'])
  })
})

describe('visibleErrors: errores en línea', () => {
  const values = { name: '', email: 'mal', password: '' }

  it('al principio no muestra nada', () => {
    expect(visibleErrors('register', values, { touched: {}, submitted: false })).toEqual({})
  })

  it('muestra el error de un campo solo después de salir de él', () => {
    expect(visibleErrors('register', values, { touched: { email: true }, submitted: false })).toEqual({
      email: 'Revisa el correo: debe verse como nombre@correo.com.',
    })
  })

  it('al enviar muestra todos, y al corregir un campo su error desaparece', () => {
    const all = visibleErrors('register', values, { touched: {}, submitted: true })
    expect(Object.keys(all)).toEqual(['name', 'email', 'password'])
    const fixed = visibleErrors('register', { ...values, email: 'ana@correo.com' }, { touched: {}, submitted: true })
    expect(Object.keys(fixed)).toEqual(['name', 'password'])
  })
})

describe('tabForKey: flechas del teclado en las pestañas', () => {
  it('las flechas pasan a la otra pestaña, dando la vuelta', () => {
    expect(tabForKey('login', 'ArrowRight')).toBe('register')
    expect(tabForKey('register', 'ArrowRight')).toBe('login')
    expect(tabForKey('login', 'ArrowLeft')).toBe('register')
    expect(tabForKey('register', 'ArrowLeft')).toBe('login')
  })

  it('Inicio y Fin van a la primera y a la última', () => {
    expect(tabForKey('register', 'Home')).toBe('login')
    expect(tabForKey('login', 'End')).toBe('register')
  })

  it('cualquier otra tecla no cambia nada', () => {
    for (const key of ['Enter', ' ', 'Tab', 'a', 'ArrowDown', 'ArrowUp']) expect(tabForKey('login', key)).toBeNull()
  })
})

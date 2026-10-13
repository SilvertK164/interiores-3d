import { describe, expect, it } from 'vitest'
import { loginHref, parseLoginParams } from '../src/lib/login-params'

describe('parseLoginParams', () => {
  it('sin parámetros abre Ingresar, sin aviso y sin destino', () => {
    expect(parseLoginParams({})).toEqual({ mode: 'login', reason: null, next: null })
  })

  it('modo=crear abre la pestaña de Crear cuenta; cualquier otro valor, Ingresar', () => {
    expect(parseLoginParams({ modo: 'crear' }).mode).toBe('register')
    expect(parseLoginParams({ modo: 'ingresar' }).mode).toBe('login')
    expect(parseLoginParams({ modo: 'cualquier-cosa' }).mode).toBe('login')
    expect(parseLoginParams({ modo: ['crear', 'x'] }).mode).toBe('register')
  })

  it('motivo=sesion activa el aviso de sesión vencida; otro motivo se ignora', () => {
    expect(parseLoginParams({ motivo: 'sesion' }).reason).toBe('sesion')
    expect(parseLoginParams({ motivo: 'otro' }).reason).toBeNull()
    expect(parseLoginParams({ motivo: ['sesion'] }).reason).toBe('sesion')
  })

  it('next solo se toma si es un único texto; la validación la hace safeNext al navegar', () => {
    expect(parseLoginParams({ next: '/proyectos/abc' }).next).toBe('/proyectos/abc')
    expect(parseLoginParams({ next: ['/a', '/b'] }).next).toBeNull()
    expect(parseLoginParams({ next: '' }).next).toBeNull()
  })
})

describe('loginHref', () => {
  it('sin nada es /login', () => {
    expect(loginHref()).toBe('/login')
    expect(loginHref({})).toBe('/login')
  })

  it('con motivo y ruta arma /login?motivo=sesion&next=<ruta>', () => {
    expect(loginHref({ reason: 'sesion', next: '/proyectos' })).toBe('/login?motivo=sesion&next=%2Fproyectos')
    expect(loginHref({ next: '/proyectos/abc' })).toBe('/login?next=%2Fproyectos%2Fabc')
    expect(loginHref({ reason: 'sesion' })).toBe('/login?motivo=sesion')
  })

  it('codifica la ruta con su búsqueda para que viaje entera', () => {
    const href = loginHref({ next: '/proyectos?nuevo=vivienda' })
    expect(href).toBe('/login?next=%2Fproyectos%3Fnuevo%3Dvivienda')
    expect(new URL(href, 'http://x').searchParams.get('next')).toBe('/proyectos?nuevo=vivienda')
  })

  it('descarta un destino que no es una ruta interna', () => {
    expect(loginHref({ next: '//evil.com' })).toBe('/login')
    expect(loginHref({ next: 'https://evil.com', reason: 'sesion' })).toBe('/login?motivo=sesion')
    expect(loginHref({ next: null })).toBe('/login')
  })
})

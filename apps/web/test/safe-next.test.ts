import { describe, expect, it } from 'vitest'
import { DEFAULT_NEXT, parseNext, safeNext } from '../src/lib/safe-next'

describe('safeNext', () => {
  it('deja pasar rutas internas, con su búsqueda y su ancla', () => {
    for (const ok of [
      '/proyectos',
      '/proyectos/3f2a9c1e-0000-4000-8000-000000000000',
      '/proyectos?nuevo=vivienda',
      '/escena-desde-foto#fotos',
      '/proyectos/abc?x=1&y=2#z',
      '/',
    ]) {
      expect(safeNext(ok)).toBe(ok)
    }
  })

  it('sin valor, o con algo que no es texto, cae a /proyectos', () => {
    expect(DEFAULT_NEXT).toBe('/proyectos')
    for (const bad of [undefined, null, '', 42, {}, ['/proyectos'], ['/a', '/b']]) {
      expect(safeNext(bad)).toBe('/proyectos')
    }
  })

  it('solo acepta rutas que empiezan con una sola barra', () => {
    for (const bad of ['proyectos', ' /proyectos', 'proyectos/abc', '?x=1', '#a', './proyectos', '../proyectos']) {
      expect(safeNext(bad)).toBe('/proyectos')
    }
  })

  it('bloquea los intentos de open redirect', () => {
    for (const evil of [
      '//evil.com',
      '///evil.com',
      '//evil.com/proyectos',
      '/\\evil.com',
      '\\\\evil.com',
      '/\\/evil.com',
      'https://evil.com',
      'http://evil.com/proyectos',
      'HTTPS://evil.com',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      '/proyectos/https://evil.com',
      '/\t/evil.com', // el navegador quita la tabulación y queda "//evil.com"
      '/\n/evil.com',
      '/\r/evil.com',
      '/%2F/evil.com',
      '/%2Fevil.com',
      '/%5Cevil.com',
      '/%09/evil.com',
      '/%0d%0a/evil.com',
    ]) {
      expect(safeNext(evil), evil).toBe('/proyectos')
      expect(parseNext(evil), evil).toBeNull()
    }
  })

  it('no vuelve a /login (quedaría atrapada en la pantalla de ingreso)', () => {
    for (const loop of ['/login', '/login?next=/proyectos', '/login/otra', '/login#x']) {
      expect(safeNext(loop)).toBe('/proyectos')
    }
  })

  it('rechaza textos larguísimos y codificaciones rotas', () => {
    expect(safeNext(`/${'a'.repeat(3000)}`)).toBe('/proyectos')
    expect(safeNext('/proyectos%')).toBe('/proyectos')
    expect(safeNext('/%E0%A4%A')).toBe('/proyectos')
  })

  it('parseNext devuelve la ruta tal cual, o null cuando safeNext usaría la de siempre', () => {
    expect(parseNext('/proyectos?nuevo=blanco')).toBe('/proyectos?nuevo=blanco')
    expect(parseNext('//evil.com')).toBeNull()
    expect(parseNext(undefined)).toBeNull()
  })
})

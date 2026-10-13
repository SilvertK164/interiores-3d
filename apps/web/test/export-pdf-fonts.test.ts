import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { loadPdfFonts } from '../src/editor/export/pdf-fonts'
import { FONT_FILES, type FontKey, fontKey } from '../src/lib/export/font-files'

const publicPath = (url: string) => fileURLToPath(new URL(`../public${url}`, import.meta.url))

describe('DM Sans para el PDF (criterio 12)', () => {
  it('las cuatro variantes existen, son woff y pesan lo razonable', () => {
    for (const [key, url] of Object.entries(FONT_FILES)) {
      const path = publicPath(url)
      expect(existsSync(path), key).toBe(true)
      expect(readFileSync(path).subarray(0, 4).toString('latin1'), key).toBe('wOFF')
      expect(statSync(path).size, key).toBeGreaterThan(5_000)
      expect(statSync(path).size, key).toBeLessThan(200_000)
    }
  })

  it('la licencia OFL viaja con los archivos y FUENTES.txt anota versión, origen y huella de cada uno', () => {
    const ofl = readFileSync(publicPath('/fonts/pdf/OFL.txt'), 'utf8')
    expect(ofl).toMatch(/SIL OPEN FONT LICENSE Version 1\.1/i)
    const sources = readFileSync(publicPath('/fonts/pdf/FUENTES.txt'), 'utf8')
    expect(sources).toContain('@fontsource/dm-sans')
    expect(sources).toContain('5.3.0')
    for (const url of Object.values(FONT_FILES)) {
      const name = url.split('/').at(-1) ?? ''
      const sha = createHash('sha256').update(readFileSync(publicPath(url))).digest('hex')
      expect(sources, name).toContain(`${name}  sha256 ${sha}`)
    }
  })

  it('fontKey elige el archivo por tramo y peso', () => {
    expect(fontKey('latin', false)).toBe('latin-400')
    expect(fontKey('latin', true)).toBe('latin-700')
    expect(fontKey('ext', false)).toBe('ext-400')
    expect(fontKey('ext', true)).toBe('ext-700')
  })
})

describe('loadPdfFonts', () => {
  const body = (key: string) => new TextEncoder().encode(key)

  it('descarga las cuatro variantes una sola vez y las reparte por clave', async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const key = (Object.entries(FONT_FILES).find(([, file]) => file === String(url)) ?? ['?'])[0]
      return new Response(body(key), { status: 200 })
    })
    // El estado de caché es del módulo: se prueba con un módulo recién importado.
    vi.resetModules()
    const { loadPdfFonts: load } = await import('../src/editor/export/pdf-fonts')
    const first = await load(fetcher as unknown as typeof fetch)
    const second = await load(fetcher as unknown as typeof fetch)
    expect(fetcher).toHaveBeenCalledTimes(4)
    expect(Object.keys(first).sort()).toEqual(['ext-400', 'ext-700', 'latin-400', 'latin-700'])
    expect(second).toBe(first)
    expect(new TextDecoder().decode(first['latin-700' as FontKey])).toBe('latin-700')
  })

  it('si una descarga falla, el error sale y la próxima llamada vuelve a intentar', async () => {
    vi.resetModules()
    const { loadPdfFonts: load } = await import('../src/editor/export/pdf-fonts')
    const broken = vi.fn(async () => new Response('no', { status: 404 }))
    await expect(load(broken as unknown as typeof fetch)).rejects.toThrow(/404/)
    const working = vi.fn(async () => new Response(body('x'), { status: 200 }))
    await expect(load(working as unknown as typeof fetch)).resolves.toBeDefined()
    expect(working).toHaveBeenCalledTimes(4)
  })

  it('exporta la función que usan las demás tareas', () => {
    expect(typeof loadPdfFonts).toBe('function')
  })
})

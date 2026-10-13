import { describe, expect, it, vi } from 'vitest'
import { ApiError, createApiClient } from '../src/lib/api/client'
import { friendlyMessage } from '../src/lib/api/errors'
import { PhotoError } from '../src/lib/api/photo'
import type { AnalysisCandidate } from '../src/lib/lab/analysis-catalog'
import { SAMPLE_ANALYSIS } from '../src/lib/lab/sample-analysis'

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const photo = () => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'sala.png', { type: 'image/png' })
const CATALOG: AnalysisCandidate[] = [
  { id: 'sofa', name: 'Sofá', category: 'seating', tags: ['living-room', 'couch'], dimensions_m: [2.06, 0.74, 1.01] },
  { id: 'coffee-table', name: 'Mesa de centro', category: 'tables', tags: ['living-room'] },
]
const REDUCED = { image: '/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==', mime: 'image/jpeg' as const }

function setup(response: () => Response | Promise<Response> = () => json(200, SAMPLE_ANALYSIS), token: string | null = 'tok') {
  const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => response())
  const preparePhoto = vi.fn(async () => REDUCED)
  const client = createApiClient({ baseUrl: 'http://api.test', getToken: async () => token, fetchImpl: fetchImpl as unknown as typeof fetch, preparePhoto })
  const sent = () => JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body))
  return { client, fetchImpl, preparePhoto, sent }
}

describe('api.analyzeRoom: el pedido', () => {
  it('reduce la foto y la envía como JSON con la sesión a POST /v1/analyze-room', async () => {
    const { client, fetchImpl, preparePhoto, sent } = setup()
    const file = photo()
    await client.analyzeRoom(file, { catalog: CATALOG })
    expect(preparePhoto).toHaveBeenCalledWith(file)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://api.test/v1/analyze-room')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ Authorization: 'Bearer tok', 'Content-Type': 'application/json' })
    expect(sent()).toEqual({ image: REDUCED.image, mime: 'image/jpeg', catalog: CATALOG })
  })

  it('manda el ancho conocido solo si lo hay', async () => {
    const withWidth = setup()
    await withWidth.client.analyzeRoom(photo(), { catalog: CATALOG, knownWidthM: 4.5 })
    expect(withWidth.sent().knownWidthM).toBe(4.5)
    for (const none of [undefined, null]) {
      const without = setup()
      await without.client.analyzeRoom(photo(), { catalog: CATALOG, knownWidthM: none })
      expect(without.sent()).not.toHaveProperty('knownWidthM')
    }
  })

  it('el catálogo viaja sin rutas ni nada fuera de id, nombre, categoría, etiquetas y medidas reales', async () => {
    const { client, sent } = setup()
    const dirty = CATALOG.map((option) => ({ ...option, src: '/items/x/model.glb' })) as unknown as AnalysisCandidate[]
    await expect(client.analyzeRoom(photo(), { catalog: dirty })).rejects.toMatchObject({ code: 'catalogo_invalido' })
    await client.analyzeRoom(photo(), { catalog: CATALOG })
    const [sofa, table] = sent().catalog as object[]
    expect(Object.keys(sofa as object).sort()).toEqual(['category', 'dimensions_m', 'id', 'name', 'tags'])
    expect(Object.keys(table as object).sort()).toEqual(['category', 'id', 'name', 'tags'])
  })

  it('las medidas reales de cada pieza llegan a la API como dimensions_m = [ancho, alto, fondo] en metros', async () => {
    const { client, sent } = setup()
    await client.analyzeRoom(photo(), { catalog: CATALOG })
    expect(sent().catalog[0].dimensions_m).toEqual([2.06, 0.74, 1.01])
  })

  it('unas medidas que no son tres números positivos no salen del navegador', async () => {
    const { client, fetchImpl } = setup()
    const bad = [{ ...CATALOG[0], dimensions_m: [0, 1, 1] }] as unknown as AnalysisCandidate[]
    await expect(client.analyzeRoom(photo(), { catalog: bad })).rejects.toMatchObject({ code: 'catalogo_invalido' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('sin piezas que ofrecer (o con un catálogo inválido) avisa antes de reducir la foto y de llamar a la red', async () => {
    const { client, fetchImpl, preparePhoto } = setup()
    const empty = await client.analyzeRoom(photo(), { catalog: [] }).catch((e: unknown) => e)
    expect(empty).toBeInstanceOf(ApiError)
    expect(friendlyMessage(empty)).toBe('No pudimos preparar la lista de muebles. Recarga la página e inténtalo de nuevo.')
    const repeated = await client.analyzeRoom(photo(), { catalog: [CATALOG[0], CATALOG[0]] as AnalysisCandidate[] }).catch((e: unknown) => e)
    expect(friendlyMessage(repeated)).toMatch(/lista de muebles/)
    expect(preparePhoto).not.toHaveBeenCalled()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('un ancho fuera de rango no sale del navegador', async () => {
    const { client, fetchImpl } = setup()
    await expect(client.analyzeRoom(photo(), { catalog: CATALOG, knownWidthM: 0 })).rejects.toBeDefined()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('sin sesión lanza 401 antes de reducir la foto o llamar a la red', async () => {
    const { client, fetchImpl, preparePhoto } = setup(undefined, null)
    await expect(client.analyzeRoom(photo(), { catalog: CATALOG })).rejects.toMatchObject({ status: 401 })
    expect(preparePhoto).not.toHaveBeenCalled()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('si la foto no se puede preparar, el error de la foto llega tal cual y no se llama a la red', async () => {
    const { client, fetchImpl, preparePhoto } = setup()
    preparePhoto.mockRejectedValueOnce(new PhotoError('No pudimos abrir la foto. Prueba con otra imagen en formato JPG, PNG o WebP.'))
    const error = await client.analyzeRoom(photo(), { catalog: CATALOG }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(PhotoError)
    expect(friendlyMessage(error)).toBe('No pudimos abrir la foto. Prueba con otra imagen en formato JPG, PNG o WebP.')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('espera como máximo 40 segundos a la API', async () => {
    const { client, fetchImpl } = setup()
    await client.analyzeRoom(photo(), { catalog: CATALOG })
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })
})

describe('api.analyzeRoom: la respuesta', () => {
  it('devuelve el análisis validado contra el contrato', async () => {
    const { client } = setup()
    expect(await client.analyzeRoom(photo(), { catalog: CATALOG })).toEqual(SAMPLE_ANALYSIS)
  })

  it('una respuesta con otra forma no se acepta (el contrato manda)', async () => {
    const { client } = setup(() => json(200, { furniture: [{ type: 'sofa' }], warnings: [], calibration: { status: 'uncalibrated', width_m: null } }))
    await expect(client.analyzeRoom(photo(), { catalog: CATALOG })).rejects.toBeDefined()
  })
})

describe('api.analyzeRoom: cada error de la API en castellano llano', () => {
  const failure = async (status: number, code: string, message = 'texto técnico del servidor') => {
    const { client } = setup(() => json(status, { error: { code, message } }))
    return client.analyzeRoom(photo(), { catalog: CATALOG }).catch((e: unknown) => e)
  }

  it.each([
    [503, 'analisis_no_disponible', 'El análisis de fotos no está disponible por ahora. Inténtalo más tarde.'],
    [502, 'analisis_fallido', 'No pudimos analizar la foto en este momento. Inténtalo de nuevo en unos minutos.'],
    [422, 'catalogo_invalido', 'No pudimos preparar la lista de muebles. Recarga la página e inténtalo de nuevo.'],
    [422, 'imagen_ilegible', 'No pudimos leer la foto. Prueba con otra imagen en formato JPG, PNG o WebP.'],
    [413, 'imagen_demasiado_grande', 'La foto supera el límite de 3 MB. Prueba con una más liviana.'],
    [429, 'limite_de_analisis', 'Llegaste al límite de 10 análisis por hora. Inténtalo más tarde.'],
  ])('%s %s', async (status, code, expected) => {
    const error = await failure(status, code)
    expect(error).toBeInstanceOf(ApiError)
    expect(friendlyMessage(error)).toBe(expected)
  })

  it('un 401 dice que la sesión venció sin hablar de guardar', async () => {
    const message = friendlyMessage(await failure(401, 'no_autenticado'))
    expect(message).toMatch(/sesión venció/)
    expect(message).not.toMatch(/guardando/)
  })

  it('un 422 con datos inválidos muestra el mensaje en castellano de la API (por ejemplo, el ancho)', async () => {
    const message = 'Los datos enviados no son válidos: el ancho conocido debe ser mayor que 0 y de hasta 100 metros.'
    expect(friendlyMessage(await failure(422, 'datos_invalidos', message))).toBe(message)
  })

  it('el texto técnico del servidor nunca se muestra', async () => {
    for (const [status, code] of [[502, 'analisis_fallido'], [503, 'analisis_no_disponible'], [500, 'error_interno']] as const) {
      expect(friendlyMessage(await failure(status, code))).not.toContain('texto técnico')
    }
  })

  it('una respuesta de error que no es de la API (la página de Vercel, un 504) se explica sin detalles', async () => {
    const { client } = setup(() => new Response('<html>Gateway Timeout</html>', { status: 504 }))
    const error = await client.analyzeRoom(photo(), { catalog: CATALOG }).catch((e: unknown) => e)
    expect(friendlyMessage(error)).toBe('El análisis tardó demasiado. Inténtalo de nuevo.')
  })

  it('sin conexión, lo dice; si se agota la espera, dice que tardó demasiado', async () => {
    const offline = setup(() => {
      throw new TypeError('fetch failed')
    })
    expect(friendlyMessage(await offline.client.analyzeRoom(photo(), { catalog: CATALOG }).catch((e: unknown) => e))).toMatch(/conexión/)

    const slow = setup(() => {
      throw new DOMException('timeout', 'TimeoutError')
    })
    const error = await slow.client.analyzeRoom(photo(), { catalog: CATALOG }).catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 0, code: 'tiempo_agotado' })
    expect(friendlyMessage(error)).toBe('El análisis tardó demasiado. Inténtalo de nuevo.')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { type AnalysisCandidate, serializeCandidates } from '../src/lib/lab/analysis-catalog'
import { analyzeRoom } from '../src/lib/lab/analyze-room'
import { LabError } from '../src/lib/lab/lab-error'
import { SAMPLE_ANALYSIS } from '../src/lib/lab/sample-analysis'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const photo = () => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'sala.png', { type: 'image/png' })
const BASE = 'http://localhost:8000'
const CATALOG: AnalysisCandidate[] = [
  { id: 'sofa', name: 'Sofá', category: 'seating', tags: ['living-room', 'couch'] },
  { id: 'coffee-table', name: 'Mesa de centro', category: 'tables', tags: ['living-room'] },
]

function fetchStub(respond: () => Promise<Response> | Response) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => respond())
}
const asFetch = (stub: ReturnType<typeof fetchStub>) => stub as unknown as typeof fetch
const sentForm = (stub: ReturnType<typeof fetchStub>) => (stub.mock.calls[0]?.[1]?.body as FormData)

async function failureOf(promise: Promise<unknown>): Promise<LabError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(LabError)
  return error as LabError
}

describe('analyzeRoom: el pedido', () => {
  it('envía la foto por POST en multipart a /api/analyze-room', async () => {
    const stub = fetchStub(() => json(200, SAMPLE_ANALYSIS))
    const file = photo()
    await analyzeRoom(file, { catalog: CATALOG, baseUrl: BASE, fetchImpl: asFetch(stub) })
    expect(stub).toHaveBeenCalledTimes(1)
    expect(String(stub.mock.calls[0]?.[0])).toBe(`${BASE}/api/analyze-room`)
    expect(stub.mock.calls[0]?.[1]?.method).toBe('POST')
    const image = sentForm(stub).get('image') as File
    expect(image.name).toBe('sala.png')
    expect(image.type).toBe('image/png')
  })

  it('no fija el Content-Type a mano: el navegador agrega el límite del multipart', async () => {
    const stub = fetchStub(() => json(200, SAMPLE_ANALYSIS))
    await analyzeRoom(photo(), { catalog: CATALOG, baseUrl: BASE, fetchImpl: asFetch(stub) })
    expect(stub.mock.calls[0]?.[1]?.headers).toBeUndefined()
  })

  it('manda el ancho conocido solo si lo hay, con punto decimal', async () => {
    const withWidth = fetchStub(() => json(200, SAMPLE_ANALYSIS))
    await analyzeRoom(photo(), { catalog: CATALOG, baseUrl: BASE, knownWidthM: 4.5, fetchImpl: asFetch(withWidth) })
    expect(sentForm(withWidth).get('known_width_m')).toBe('4.5')

    for (const none of [undefined, null]) {
      const without = fetchStub(() => json(200, SAMPLE_ANALYSIS))
      await analyzeRoom(photo(), { catalog: CATALOG, baseUrl: BASE, knownWidthM: none, fetchImpl: asFetch(without) })
      expect(sentForm(without).has('known_width_m')).toBe(false)
    }
  })

  it('manda el catálogo en catalog_json: el mismo JSON de los candidatos, con las tildes tal cual', async () => {
    const stub = fetchStub(() => json(200, SAMPLE_ANALYSIS))
    await analyzeRoom(photo(), { catalog: CATALOG, baseUrl: BASE, fetchImpl: asFetch(stub) })
    const sent = sentForm(stub).get('catalog_json')
    expect(sent).toBe(serializeCandidates(CATALOG))
    expect(JSON.parse(sent as string)).toEqual(CATALOG)
    expect(sent).toContain('Sofá')
  })

  it('catalog_json no lleva rutas ni nada fuera de id, nombre, categoría y etiquetas', async () => {
    const stub = fetchStub(() => json(200, SAMPLE_ANALYSIS))
    await analyzeRoom(photo(), { catalog: CATALOG, baseUrl: BASE, fetchImpl: asFetch(stub) })
    for (const option of JSON.parse(sentForm(stub).get('catalog_json') as string) as object[]) {
      expect(Object.keys(option).sort()).toEqual(['category', 'id', 'name', 'tags'])
    }
  })

  it('sin piezas que ofrecerle a TP3 avisa antes de llamar a la red', async () => {
    const stub = fetchStub(() => json(200, SAMPLE_ANALYSIS))
    const error = await failureOf(analyzeRoom(photo(), { catalog: [], baseUrl: BASE, fetchImpl: asFetch(stub) }))
    expect(error.code).toBe('catalogo_vacio')
    expect(error.message).toMatch(/catálogo/)
    expect(stub).not.toHaveBeenCalled()
  })

  it('tolera una dirección con barra final o espacios', async () => {
    const stub = fetchStub(() => json(200, SAMPLE_ANALYSIS))
    await analyzeRoom(photo(), { catalog: CATALOG, baseUrl: ' http://localhost:8000/ ', fetchImpl: asFetch(stub) })
    expect(String(stub.mock.calls[0]?.[0])).toBe(`${BASE}/api/analyze-room`)
  })

  it('una dirección inválida avisa sin llamar a la red', async () => {
    const stub = fetchStub(() => json(200, SAMPLE_ANALYSIS))
    const error = await failureOf(analyzeRoom(photo(), { catalog: CATALOG, baseUrl: 'localhost:8000', fetchImpl: asFetch(stub) }))
    expect(error.code).toBe('url_invalida')
    expect(error.message).toMatch(/http:\/\/localhost:8000/)
    expect(stub).not.toHaveBeenCalled()
  })
})

describe('analyzeRoom: la respuesta', () => {
  it('devuelve el análisis validado', async () => {
    const stub = fetchStub(() => json(200, { ...SAMPLE_ANALYSIS, extra: true }))
    const analysis = await analyzeRoom(photo(), { catalog: CATALOG, baseUrl: BASE, fetchImpl: asFetch(stub) })
    expect(analysis).toEqual(SAMPLE_ANALYSIS)
  })

  it('si TP3 responde algo con otra forma, lo explica en vez de romper', async () => {
    const stub = fetchStub(() => json(200, { furniture: 'sofa' }))
    const error = await failureOf(analyzeRoom(photo(), { catalog: CATALOG, baseUrl: BASE, fetchImpl: asFetch(stub) }))
    expect(error.code).toBe('respuesta_invalida')
    expect(error.message).toMatch(/formato que no esperábamos/)
  })

  it('si TP3 todavía responde con los siete tipos fijos (type), dice que es una versión anterior y que se actualizan juntos', async () => {
    const legacy = { ...SAMPLE_ANALYSIS, furniture: SAMPLE_ANALYSIS.furniture.map(({ asset_id, ...rest }) => ({ ...rest, type: asset_id })) }
    const stub = fetchStub(() => json(200, legacy))
    const error = await failureOf(analyzeRoom(photo(), { catalog: CATALOG, baseUrl: BASE, fetchImpl: asFetch(stub) }))
    expect(error.code).toBe('tp3_desactualizado')
    expect(error.message).toMatch(/versión anterior/)
    expect(error.message).toMatch(/juntos/)
    expect(error.message).toMatch(/lab\/README\.md/)
  })

  it('si la respuesta no es JSON, también lo explica', async () => {
    const stub = fetchStub(() => new Response('<html>hola</html>', { status: 200 }))
    expect((await failureOf(analyzeRoom(photo(), { catalog: CATALOG, baseUrl: BASE, fetchImpl: asFetch(stub) }))).code).toBe('respuesta_invalida')
  })
})

describe('analyzeRoom: cada error de TP3 en castellano llano', () => {
  const tp3 = (status: number, code: string) => json(status, { error: { code, message: 'mensaje técnico de TP3' } })

  it.each([
    [400, 'invalid_file_type', /JPG, PNG o WebP/],
    [413, 'file_too_large', /8 MB/],
    [422, 'invalid_calibration', /entre 0 y 100 metros/],
    [422, 'image_unreadable', /no pudo leer la foto/i],
    [422, 'invalid_catalog', /lista de muebles del catálogo/],
    [502, 'provider_failure', /Gemini/],
    [503, 'provider_not_configured', /GEMINI_API_KEY/],
  ])('%i %s', async (status, code, pattern) => {
    const stub = fetchStub(() => tp3(status, code))
    const error = await failureOf(analyzeRoom(photo(), { catalog: CATALOG, baseUrl: BASE, fetchImpl: asFetch(stub) }))
    expect(error.code).toBe(code)
    expect(error.status).toBe(status)
    expect(error.message).toMatch(pattern)
    expect(error.message).not.toMatch(/mensaje técnico/)
  })

  it('sin clave: explica cómo seguir y que el ejemplo sirve mientras tanto', async () => {
    const stub = fetchStub(() => tp3(503, 'provider_not_configured'))
    const error = await failureOf(analyzeRoom(photo(), { catalog: CATALOG, baseUrl: BASE, fetchImpl: asFetch(stub) }))
    expect(error.message).toMatch(/lab\/README\.md/)
    expect(error.message).toMatch(/Probar con un ejemplo/)
  })

  it('un código que no conoce muestra el estado HTTP, sin filtrar el mensaje técnico', async () => {
    const stub = fetchStub(() => tp3(500, 'algo_nuevo'))
    const error = await failureOf(analyzeRoom(photo(), { catalog: CATALOG, baseUrl: BASE, fetchImpl: asFetch(stub) }))
    expect(error.message).toMatch(/inesperado/)
    expect(error.message).toMatch(/500/)
    expect(error.message).not.toMatch(/mensaje técnico/)
  })

  it('una respuesta de error sin el cuerpo de TP3 (por ejemplo un 404 de otro servidor) sugiere revisar la dirección', async () => {
    const stub = fetchStub(() => new Response('<h1>No encontrado</h1>', { status: 404 }))
    const error = await failureOf(analyzeRoom(photo(), { catalog: CATALOG, baseUrl: BASE, fetchImpl: asFetch(stub) }))
    expect(error.status).toBe(404)
    expect(error.message).toMatch(/dirección/)
  })
})

describe('analyzeRoom: cuando no hay conexión', () => {
  it('explica que el servicio de TP3 no está corriendo y apunta a lab/README.md', async () => {
    const stub = fetchStub(() => Promise.reject(new TypeError('Failed to fetch')))
    const error = await failureOf(analyzeRoom(photo(), { catalog: CATALOG, baseUrl: BASE, fetchImpl: asFetch(stub) }))
    expect(error.code).toBe('sin_conexion')
    expect(error.message).toMatch(/no está corriendo/)
    expect(error.message).toMatch(/lab\/README\.md/)
    expect(error.message).toContain(BASE)
  })

  it('menciona la variable CORS_ORIGINS, porque un bloqueo del navegador se ve igual que un servicio apagado', async () => {
    const stub = fetchStub(() => Promise.reject(new TypeError('Failed to fetch')))
    const error = await failureOf(analyzeRoom(photo(), { catalog: CATALOG, baseUrl: BASE, fetchImpl: asFetch(stub) }))
    expect(error.message).toMatch(/CORS_ORIGINS/)
  })

  it('si TP3 tarda más del tiempo permitido, avisa que se agotó la espera', async () => {
    const stub = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
    )
    const error = await failureOf(analyzeRoom(photo(), { catalog: CATALOG, baseUrl: BASE, timeoutMs: 20, fetchImpl: asFetch(stub) }))
    expect(error.code).toBe('tiempo_agotado')
    expect(error.message).toMatch(/tardó demasiado/)
  })
})

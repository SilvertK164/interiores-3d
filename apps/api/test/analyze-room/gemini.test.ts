import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_VISION_MODEL,
  GEMINI_MAX_OUTPUT_TOKENS,
  GEMINI_TIMEOUT_MS,
  createGeminiProvider,
  responseSchemaFor,
} from '../../src/analyze-room/gemini.js'
import { buildPrompt } from '../../src/analyze-room/prompt.js'
import { ProviderError, type VisionRequest } from '../../src/analyze-room/types.js'
import { CATALOG, JPEG, PNG, b64 } from '../support/images.js'

const KEY = 'AIzaSyEJEMPLO-clave-que-no-debe-aparecer-jamas'
const REQUEST: VisionRequest = { image: b64(PNG), mime: 'image/png', catalog: CATALOG }
const RESULT = {
  furniture: [{ asset_id: 'sofa', x: 0.5, y: 0.6, width: 0.3, depth: 0.12, rotation_deg: 0, confidence: 0.8 }],
  warnings: ['oclusión parcial'],
}
const envelope = (text: string, candidate: Record<string, unknown> = {}) => ({
  candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP', ...candidate }],
})
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

function stub(respond: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    return respond(String(url), init ?? {})
  })
  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch }
}
const sent = (calls: { init: RequestInit }[]) => JSON.parse(String(calls[0]?.init.body))

async function failureOf(promise: Promise<unknown>): Promise<ProviderError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(ProviderError)
  return error as ProviderError
}

describe('createGeminiProvider: el pedido', () => {
  it('llama a generateContent del modelo con la clave solo en la cabecera x-goog-api-key', async () => {
    const { calls, fetchImpl } = stub(() => reply(200, envelope(JSON.stringify(RESULT))))
    await createGeminiProvider({ apiKey: KEY, model: 'gemini-test-flash', fetchImpl })(REQUEST)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-test-flash:generateContent')
    expect(calls[0]?.init.method).toBe('POST')
    expect(calls[0]?.init.headers).toEqual({ 'content-type': 'application/json', 'x-goog-api-key': KEY })
    expect(calls[0]?.url).not.toContain(KEY)
    expect(String(calls[0]?.init.body)).not.toContain(KEY)
  })

  it('sin modelo usa gemini-3.5-flash, y el nombre se codifica para que no pueda cambiar la ruta', async () => {
    expect(DEFAULT_VISION_MODEL).toBe('gemini-3.5-flash')
    const byDefault = stub(() => reply(200, envelope(JSON.stringify(RESULT))))
    await createGeminiProvider({ apiKey: KEY, fetchImpl: byDefault.fetchImpl })(REQUEST)
    expect(byDefault.calls[0]?.url).toContain('/models/gemini-3.5-flash:generateContent')
    const blank = stub(() => reply(200, envelope(JSON.stringify(RESULT))))
    await createGeminiProvider({ apiKey: KEY, model: '  ', fetchImpl: blank.fetchImpl })(REQUEST)
    expect(blank.calls[0]?.url).toContain('/models/gemini-3.5-flash:generateContent')
    const sneaky = stub(() => reply(200, envelope(JSON.stringify(RESULT))))
    await createGeminiProvider({ apiKey: KEY, model: '../x?key=1', fetchImpl: sneaky.fetchImpl })(REQUEST)
    expect(sneaky.calls[0]?.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/..%2Fx%3Fkey%3D1:generateContent')
  })

  it('manda el prompt con el catálogo y después la foto en base64 con su formato', async () => {
    const { calls, fetchImpl } = stub(() => reply(200, envelope(JSON.stringify(RESULT))))
    await createGeminiProvider({ apiKey: KEY, fetchImpl })(REQUEST)
    const parts = sent(calls).contents[0].parts
    expect(parts).toHaveLength(2)
    expect(parts[0]).toEqual({ text: buildPrompt(CATALOG) })
    expect(parts[1]).toEqual({ inlineData: { mimeType: 'image/png', data: b64(PNG) } })
  })

  it('pide JSON con un esquema de respuesta que enumera los asset_id del catálogo recibido', async () => {
    const { calls, fetchImpl } = stub(() => reply(200, envelope(JSON.stringify(RESULT))))
    await createGeminiProvider({ apiKey: KEY, fetchImpl })(REQUEST)
    const config = sent(calls).generationConfig
    expect(config.responseMimeType).toBe('application/json')
    expect(config.temperature).toBe(0.1)
    expect(config.maxOutputTokens).toBe(GEMINI_MAX_OUTPUT_TOKENS)
    const furniture = config.responseSchema.properties.furniture.items
    expect(furniture.properties.asset_id).toEqual({ type: 'STRING', enum: ['sofa', 'coffee-table'] })
    expect(furniture.properties).not.toHaveProperty('type')
    expect(furniture.required).toEqual(['asset_id', 'x', 'y', 'width', 'depth', 'rotation_deg', 'confidence'])
    expect(config.responseSchema.required).toEqual(['furniture', 'warnings'])
  })

  it('maxOutputTokens deja espacio de sobra para el razonamiento del modelo y la lista de muebles (más que los 2000 de TP3)', () => {
    expect(GEMINI_MAX_OUTPUT_TOKENS).toBeGreaterThanOrEqual(8192)
  })

  it('el esquema de respuesta sigue al catálogo: cambia con las opciones enviadas', () => {
    const schema = responseSchemaFor([CATALOG[1] as (typeof CATALOG)[number]])
    expect(schema.properties.furniture.items.properties.asset_id.enum).toEqual(['coffee-table'])
  })

  it('espera como máximo 55 segundos en total y le pasa a fetch una señal de aborto', async () => {
    expect(GEMINI_TIMEOUT_MS).toBe(55_000)
    const { calls, fetchImpl } = stub(() => reply(200, envelope(JSON.stringify(RESULT))))
    await createGeminiProvider({ apiKey: KEY, fetchImpl })(REQUEST)
    expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal)
  })
})

describe('createGeminiProvider: la respuesta', () => {
  it('devuelve el JSON del texto de la primera candidata (sin validarlo: eso lo hace el análisis)', async () => {
    const { fetchImpl } = stub(() => reply(200, envelope(JSON.stringify(RESULT))))
    expect(await createGeminiProvider({ apiKey: KEY, fetchImpl })(REQUEST)).toEqual(RESULT)
  })

  it('une las partes de texto y tolera vallas de código alrededor del JSON', async () => {
    const text = JSON.stringify(RESULT)
    const split = stub(() => reply(200, { candidates: [{ content: { parts: [{ text: text.slice(0, 20) }, { text: text.slice(20) }] }, finishReason: 'STOP' }] }))
    expect(await createGeminiProvider({ apiKey: KEY, fetchImpl: split.fetchImpl })(REQUEST)).toEqual(RESULT)
    const fenced = stub(() => reply(200, envelope(`\`\`\`json\n${text}\n\`\`\``)))
    expect(await createGeminiProvider({ apiKey: KEY, fetchImpl: fenced.fetchImpl })(REQUEST)).toEqual(RESULT)
  })

  it('ignora las partes de razonamiento (thought) del modelo', async () => {
    const { fetchImpl } = stub(() =>
      reply(200, { candidates: [{ content: { parts: [{ text: 'pensando en voz alta…', thought: true }, { text: JSON.stringify(RESULT) }] }, finishReason: 'STOP' }] }),
    )
    expect(await createGeminiProvider({ apiKey: KEY, fetchImpl })(REQUEST)).toEqual(RESULT)
  })
})

describe('createGeminiProvider: cuando algo falla lanza ProviderError con un motivo corto', () => {
  const run = (respond: Parameters<typeof stub>[0]) => createGeminiProvider({ apiKey: KEY, fetchImpl: stub(respond).fetchImpl })(REQUEST)

  it('sin conexión', async () => {
    const error = await failureOf(
      run(() => {
        throw new TypeError(`fetch failed ${KEY} ${b64(PNG)}`)
      }),
    )
    expect(error.reason).toBe('network')
  })

  it('si pasa el plazo', async () => {
    const hang = (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(init.signal?.reason)))
    const provider = createGeminiProvider({ apiKey: KEY, fetchImpl: stub(hang).fetchImpl, timeoutMs: 20 })
    expect((await failureOf(provider(REQUEST))).reason).toBe('timeout')
  })

  it('si el plazo se agota mientras llega el cuerpo de la respuesta', async () => {
    const slowBody = (_url: string, init: RequestInit) => {
      const body = new ReadableStream({
        start(controller) {
          init.signal?.addEventListener('abort', () => controller.error(init.signal?.reason))
        },
      })
      return new Response(body, { status: 200 })
    }
    const provider = createGeminiProvider({ apiKey: KEY, fetchImpl: stub(slowBody).fetchImpl, timeoutMs: 20 })
    expect((await failureOf(provider(REQUEST))).reason).toBe('timeout')
  })

  it('un estado HTTP de error: el motivo lleva el código y el estado de Google, nunca su mensaje', async () => {
    const error = await failureOf(
      run(() => reply(400, { error: { code: 400, status: 'INVALID_ARGUMENT', message: `Base64 decoding failed for "${b64(PNG)}" con la clave ${KEY}` } })),
    )
    expect(error.reason).toBe('http_400:INVALID_ARGUMENT')
    expect(error.message).not.toContain(b64(PNG))
    expect(error.message).not.toContain(KEY)
    const limit = await failureOf(run(() => reply(429, { error: { status: 'RESOURCE_EXHAUSTED' } })))
    expect(limit.reason).toBe('http_429:RESOURCE_EXHAUSTED')
    const html = await failureOf(run(() => new Response('<html>Bad gateway</html>', { status: 502 })))
    expect(html.reason).toBe('http_502')
    const weird = await failureOf(run(() => reply(500, { error: { status: 'mensaje libre con detalles <script>' } })))
    expect(weird.reason).toBe('http_500')
  })

  it('una respuesta que no sirve: sin candidatas, vacía, bloqueada, cortada o que no es JSON', async () => {
    expect((await failureOf(run(() => reply(200, {})))).reason).toBe('empty')
    expect((await failureOf(run(() => reply(200, { candidates: [] })))).reason).toBe('empty')
    expect((await failureOf(run(() => reply(200, envelope(''))))).reason).toBe('empty')
    expect((await failureOf(run(() => reply(200, { candidates: [{ finishReason: 'STOP' }] })))).reason).toBe('empty')
    expect((await failureOf(run(() => reply(200, { promptFeedback: { blockReason: 'SAFETY' } })))).reason).toBe('blocked')
    expect((await failureOf(run(() => reply(200, envelope('', { finishReason: 'SAFETY' }))))).reason).toBe('finish_SAFETY')
    expect((await failureOf(run(() => reply(200, envelope('{"furniture": [', { finishReason: 'MAX_TOKENS' }))))).reason).toBe('truncated')
    expect((await failureOf(run(() => reply(200, envelope('esto no es JSON'))))).reason).toBe('not_json')
    expect((await failureOf(run(() => new Response('no es json', { status: 200 })))).reason).toBe('bad_response')
  })

  it('ningún error repite la clave, la foto, el prompt ni el texto que contestó el modelo', async () => {
    const secrets = [KEY, b64(PNG), 'Mesa de centro', 'texto secreto del modelo']
    const failures = [
      () => reply(200, envelope('texto secreto del modelo')),
      () => reply(500, { error: { message: 'texto secreto del modelo', status: 'INTERNAL' } }),
      () => reply(200, envelope('texto secreto del modelo', { finishReason: 'MAX_TOKENS' })),
      () => {
        throw new Error(`boom ${KEY} ${b64(PNG)} Mesa de centro`)
      },
    ]
    for (const respond of failures) {
      const error = await failureOf(run(respond))
      const dump = `${error.message} ${error.reason} ${JSON.stringify(error)} ${error.stack?.split('\n')[0]}`
      for (const secret of secrets) expect(dump).not.toContain(secret)
    }
  })

  it('la foto JPEG viaja igual con su propio formato', async () => {
    const { calls, fetchImpl } = stub(() => reply(200, envelope(JSON.stringify(RESULT))))
    await createGeminiProvider({ apiKey: KEY, fetchImpl })({ ...REQUEST, image: b64(JPEG), mime: 'image/jpeg' })
    expect(sent(calls).contents[0].parts[1].inlineData.mimeType).toBe('image/jpeg')
  })
})

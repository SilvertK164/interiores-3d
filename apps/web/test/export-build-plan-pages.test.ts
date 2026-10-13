import { describe, expect, it } from 'vitest'
import { ARGS, DECISIONS, setup, textOf } from './support/fake-export-pages'

describe('createBuildPlan: lo que dibuja en cada hoja', () => {
  it('cada página lleva su planta en castellano, "Hoja N de M", el proyecto, la fecha en letras y el autor', async () => {
    const { build } = setup()
    const result = await build(ARGS)
    expect(result.pages).toBe(2)
    expect(result.skippedImages).toBe(2)
    const [first, second] = await textOf(result.blob)
    for (const expected of ['Planta baja', 'Hoja 1 de 2', 'Casa Alvear', '12 de octubre de 2026', 'Silvert Quispe', '1:50']) expect(first, expected).toContain(expected)
    for (const expected of ['Planta 1', 'Hoja 2 de 2']) expect(second, expected).toContain(expected)
    expect(first).not.toContain('Floor')
    expect(second).not.toContain('Floor')
  })

  it('en Color la leyenda lista el ambiente con sus m² y el material del piso; sin ambientes dice que no hay', async () => {
    const { build } = setup()
    const [first, second] = await textOf((await build(ARGS)).blob)
    expect(first).toContain('Ambiente 1 · 12,0 m²')
    expect(first).toContain('Piso: Madera fina')
    expect(second).toContain('Sin ambientes dibujados')
  })

  it('la vista previa de una sola planta numera la hoja con sheetNumbers ("Hoja 2 de 3")', async () => {
    const { build } = setup()
    const [only] = await textOf((await build({ ...ARGS, levelIds: ['level_b'], sheetNumbers: { start: 1, total: 3 } })).blob)
    expect(only).toContain('Hoja 2 de 3')
  })

  it('con el respaldo Helvetica no descarga DM Sans', async () => {
    const { build, loadFonts } = setup({ ...DECISIONS, fonts: 'helvetica' })
    const [first] = await textOf((await build(ARGS)).blob)
    expect(loadFonts).not.toHaveBeenCalled()
    expect(first).toContain('Casa Alvear')
  })

  it('con fotos isométricas suma una hoja por planta después de las plantas: sin escala, con su cajetín y "Hoja N de M"', async () => {
    const { build } = setup()
    const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')).buffer
    const result = await build({ ...ARGS, isoImages: [{ levelId: 'level_a', bytes: png }, { levelId: 'level_b', bytes: png }] })
    expect(result.pages).toBe(4)
    const pages = await textOf(result.blob)
    expect(pages).toHaveLength(4)
    expect(pages[1]).toContain('Hoja 2 de 4')
    for (const expected of ['Planta baja · Isométrico', 'Sin escala', 'Hoja 3 de 4', 'Casa Alvear']) expect(pages[2], expected).toContain(expected)
    for (const expected of ['Planta 1 · Isométrico', 'Hoja 4 de 4']) expect(pages[3], expected).toContain(expected)
    expect(pages[2]).not.toContain('1:50')
  })
})

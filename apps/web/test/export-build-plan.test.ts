import { describe, expect, it, vi } from 'vitest'
import type { GeoLike } from '../src/lib/export/plan-style'
import { MM_TO_PT } from '../src/lib/export/sheet'
import { ARGS, DECISIONS, NODES, setup } from './support/fake-export-pages'

describe('createBuildPlan: las opciones que le pasa al parche', () => {
  it('pasa al parche la hoja, el área útil y la escala en puntos (A3 apaisada a 1:25)', async () => {
    const { build, received } = setup()
    await build({ ...ARGS, paper: 'A3', scale: 25 })
    const options = received[0]
    expect(options?.levels).toEqual(['level_a', 'level_b'])
    expect(Math.abs((options?.page.widthPt ?? 0) - 1190.55)).toBeLessThan(0.5)
    expect(Math.abs((options?.page.heightPt ?? 0) - 841.89)).toBeLessThan(0.5)
    expect(options?.scale).toBeCloseTo(40 * MM_TO_PT, 9)
    expect(options?.page.usable.width).toBeCloseTo(400 * MM_TO_PT, 9)
    expect(options?.page.usable.height).toBeCloseTo(241 * MM_TO_PT, 9)
    expect(options?.page.usable.x).toBeCloseTo(10 * MM_TO_PT, 9)
  })

  it('el filtro de colores solo se pide en Papel', async () => {
    const paper = setup()
    await paper.build({ ...ARGS, mode: 'paper' })
    expect(paper.received[0]?.wrapRaw).toBeTypeOf('function')
    const color = setup()
    await color.build(ARGS)
    expect(color.received[0]?.wrapRaw).toBeUndefined()
  })

  it('mapGeometry aplica el estilo del modo y el color del nodo (muro negro en Papel; ambiente y piso en Color)', async () => {
    const wall: GeoLike = { kind: 'polygon', points: [[0, 0], [1, 0], [1, 1]], fill: '#374151', stroke: '#1f2937', strokeWidth: 0.02 }
    const tint: GeoLike = { kind: 'polygon', points: [[0, 0], [1, 0], [1, 1]], fill: '#3b82f6', fillOpacity: 0.04 }
    const slab: GeoLike = { kind: 'polygon', points: [[0, 0], [1, 0], [1, 1]], fill: '#cbd5e1', fillOpacity: 0.6 }
    const paper = setup()
    await paper.build({ ...ARGS, mode: 'paper' })
    expect(paper.received[0]?.mapGeometry?.(NODES.wall_1, wall)).toMatchObject({ fill: '#000000' })
    const color = setup()
    await color.build(ARGS)
    const map = color.received[0]?.mapGeometry
    expect(map?.(NODES.zone_1, tint)).toMatchObject({ fill: '#B97A00', fillOpacity: 0.35 })
    expect(map?.(NODES.slab_1, slab)).toMatchObject({ fill: '#B98A5E', fillOpacity: 0.55 })
    expect(map?.(undefined, slab)).toBe(slab)
  })

  it('los m² de cada ambiente se agregan solo si Pascal no los pone (decisión de la Tarea 0)', async () => {
    const madori = setup()
    await madori.build(ARGS)
    const labels = madori.received[0]?.extraGeometry?.('level_a') ?? []
    expect(labels).toHaveLength(1)
    expect(labels[0]).toMatchObject({ kind: 'text', text: '12,0 m²' })
    expect(madori.received[0]?.extraGeometry?.('level_b')).toEqual([])
    const pascal = setup({ ...DECISIONS, areaLabels: 'pascal' })
    await pascal.build(ARGS)
    expect(pascal.received[0]?.extraGeometry).toBeUndefined()
  })

  it('anota título, autor y creador en el documento', async () => {
    const { build, seen } = setup()
    await build(ARGS)
    expect(seen.info).toMatchObject({ Title: 'Casa Alvear — planos', Author: 'Silvert Quispe', Creator: 'Madori' })
  })

  it('pasa el progreso y la señal de cancelación tal cual, y un error del parche sale sin disfrazar', async () => {
    const { build, received, exportPages } = setup()
    const onProgress = vi.fn()
    const controller = new AbortController()
    await build({ ...ARGS, onProgress, signal: controller.signal })
    expect(received[0]?.signal).toBe(controller.signal)
    // El parche llama onProgress(done, total); la persona recibe { done, total }.
    expect(onProgress).toHaveBeenCalledWith({ done: 1, total: 2 })
    exportPages.mockRejectedValueOnce(new Error('se cayó'))
    await expect(build(ARGS)).rejects.toThrow('se cayó')
  })

  it('con el respaldo Helvetica no descarga DM Sans', async () => {
    const { build, loadFonts } = setup({ ...DECISIONS, fonts: 'helvetica' })
    await build(ARGS)
    expect(loadFonts).not.toHaveBeenCalled()
  })
})

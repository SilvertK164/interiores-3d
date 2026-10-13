import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import type { PlanBuildArgs } from '../src/lib/export/types'
import { createFakeDeps } from './support/fake-deps'

const ARGS: PlanBuildArgs = {
  paper: 'A4',
  orientation: 'landscape',
  scale: 50,
  mode: 'paper',
  levelIds: ['a'],
  titleBlock: true,
  projectName: 'Casa',
  author: 'Ana',
  date: new Date(2026, 9, 12),
}

describe('bridge.plan', () => {
  it('measureLevels pone cada planta en castellano sin tocar el dato guardado (Review Focus 2)', async () => {
    const fake = createFakeDeps()
    fake.deps.measureLevels.mockResolvedValue([
      { id: 'a', name: null, level: 0, widthM: 7.8, heightM: 3.8, empty: false },
      { id: 'b', name: 'Floor 1', level: 1, widthM: 6, heightM: 3, empty: false },
      { id: 'c', name: 'Basement 1', level: -1, widthM: 4, heightM: 4, empty: true },
      { id: 'd', name: 'Altillo', level: 2, widthM: 2, heightM: 2, empty: false },
      { id: 'e', name: 'Ground Floor', level: 0, widthM: 1, heightM: 1, empty: false },
    ])
    const levels = await createBridge(fake.deps).plan.measureLevels()
    expect(levels.map((l) => l.label)).toEqual(['Planta baja', 'Planta 1', 'Sótano 1', 'Altillo', 'Planta baja'])
    expect(levels[2]).toEqual({ id: 'c', label: 'Sótano 1', widthM: 4, heightM: 4, empty: true })
    expect(Object.keys(levels[0] ?? {}).sort()).toEqual(['empty', 'heightM', 'id', 'label', 'widthM'])
  })

  it('una escena sin plantas da una lista vacía', async () => {
    const fake = createFakeDeps()
    expect(await createBridge(fake.deps).plan.measureLevels()).toEqual([])
  })

  it('si medir falla, el error sale tal cual', async () => {
    const fake = createFakeDeps()
    fake.deps.measureLevels.mockRejectedValue(new Error('no se pudo medir'))
    await expect(createBridge(fake.deps).plan.measureLevels()).rejects.toThrow('no se pudo medir')
  })

  it('build entrega los argumentos al parche y devuelve su resultado', async () => {
    const fake = createFakeDeps()
    const result = await createBridge(fake.deps).plan.build(ARGS)
    expect(fake.deps.buildPlan).toHaveBeenCalledWith(ARGS)
    expect(result).toMatchObject({ pages: 1, skippedImages: 0 })
    expect(result.blob).toBeInstanceOf(Blob)
  })

  it('build deja salir el error del parche (cancelación incluida)', async () => {
    const fake = createFakeDeps()
    fake.deps.buildPlan.mockRejectedValue(new DOMException('Exportación cancelada', 'AbortError'))
    await expect(createBridge(fake.deps).plan.build(ARGS)).rejects.toMatchObject({ name: 'AbortError' })
  })
})

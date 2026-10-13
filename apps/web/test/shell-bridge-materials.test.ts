import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { createFakeDeps } from './support/fake-deps'

describe('createMaterialsSlice', () => {
  it('useMaterials entrega la biblioteca y el material armado', () => {
    const { deps } = createFakeDeps()
    const model = createBridge(deps).useMaterials()
    expect(model.items.map((m) => m.id)).toContain('preset-white')
    expect(model.selectedId).toBeNull()
  })

  it('elegir un material lo arma para pintar', () => {
    const { deps } = createFakeDeps()
    createBridge(deps).useMaterials().select('wood-woodfine1')
    expect(deps.useMaterialsModel().select).toHaveBeenCalledWith('wood-woodfine1')
  })

  it('en Ver no se elige ninguno', () => {
    const { deps, scene } = createFakeDeps()
    scene.setState({ readOnly: true })
    createBridge(deps).useMaterials().select('wood-woodfine1')
    expect(deps.useMaterialsModel().select).not.toHaveBeenCalled()
  })
})

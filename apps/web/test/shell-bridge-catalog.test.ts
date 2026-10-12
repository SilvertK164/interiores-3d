import { describe, expect, it, vi } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { createCatalogSlice } from '../src/editor/shell/bridge/catalog'
import { createFakeDeps } from './support/fake-deps'

const SOFA = { id: 'sofa', name: 'Sofa', dimensions: [2.06, 0.74, 1.01] as [number, number, number] }
const firstCall = (fn: (...args: never[]) => unknown) => vi.mocked(fn).mock.invocationCallOrder[0] ?? Number.NaN

describe('placeItem', () => {
  it('pasa a la fase furnish ANTES de armar el mueble (activateCatalogItem de Pascal no cambia la fase)', () => {
    const fake = createFakeDeps()
    createBridge(fake.deps).placeItem(SOFA)
    expect(fake.editor.getState().phase).toBe('furnish')
    expect(fake.deps.activateCatalogItem).toHaveBeenCalledWith(SOFA)
    expect(firstCall(fake.editor.getState().setPhase)).toBeLessThan(firstCall(fake.deps.activateCatalogItem))
  })

  it('si el spike mostró que colocar desde structure funciona (decisión), no cambia la fase', () => {
    const fake = createFakeDeps()
    createCatalogSlice(fake.deps, { furnishPhaseBeforeItem: false }).placeItem(SOFA)
    expect(fake.editor.getState().setPhase).not.toHaveBeenCalled()
    expect(fake.deps.activateCatalogItem).toHaveBeenCalledTimes(1)
  })

  it('en Ver no se coloca nada', () => {
    const fake = createFakeDeps()
    fake.scene.setState({ readOnly: true })
    createBridge(fake.deps).placeItem(SOFA)
    expect(fake.deps.activateCatalogItem).not.toHaveBeenCalled()
  })
})

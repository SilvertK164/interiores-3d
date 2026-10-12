import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { selectShellState } from '../src/editor/shell/bridge/selectors'
import { createFakeDeps } from './support/fake-deps'

const setup = () => {
  const fake = createFakeDeps()
  const bridge = createBridge(fake.deps)
  return { ...fake, bridge, state: () => selectShellState(bridge.snapshot()) }
}

describe('modo Ver / Editar', () => {
  it('pasar a Ver con una herramienta armada (el caso normal de un proyecto en blanco) la desarma y bloquea la escena', () => {
    const { bridge, state, deps } = setup()
    expect(state()).toMatchObject({ mode: 'editar', editorMode: 'build', tool: 'wall' })
    bridge.setMode('ver')
    expect(deps.cancelActiveTool).toHaveBeenCalledTimes(1)
    expect(state()).toMatchObject({ mode: 'ver', editorMode: 'select', tool: null })
  })

  it('Ver limpia la selección que hubiera y la sigue limpiando mientras dure', () => {
    const { bridge, viewer } = setup()
    viewer.setState({ selection: { ...viewer.getState().selection, selectedIds: ['wall_1'] } })
    bridge.setMode('ver')
    expect(viewer.getState().selection.selectedIds).toEqual([])
    viewer.getState().setSelection({ selectedIds: ['door_1'] })
    expect(viewer.getState().selection.selectedIds).toEqual([])
    viewer.getState().setSelection({ zoneId: 'zone_1' })
    expect(viewer.getState().selection.zoneId).toBeNull()
  })

  it('pedir Ver dos veces toma una sola vez el solo lectura (un doble clic no deja la escena bloqueada)', () => {
    const { bridge, deps, scene } = setup()
    bridge.setMode('ver')
    bridge.setMode('ver')
    expect(deps.acquireReadOnly).toHaveBeenCalledTimes(1)
    bridge.setMode('editar')
    expect(scene.getState().readOnly).toBe(false)
  })

  it('volver a Editar suelta el bloqueo, deja de limpiar la selección y NO rearma la herramienta anterior', () => {
    const { bridge, state, viewer } = setup()
    bridge.setMode('ver')
    bridge.setMode('editar')
    expect(state()).toMatchObject({ mode: 'editar', editorMode: 'select', tool: null })
    viewer.getState().setSelection({ selectedIds: ['wall_1'] })
    expect(viewer.getState().selection.selectedIds).toEqual(['wall_1'])
  })

  it('Editar sin haber pasado por Ver no hace nada (por ejemplo al recargar: se abre siempre en Editar)', () => {
    const { bridge, deps, state } = setup()
    bridge.setMode('editar')
    expect(deps.acquireReadOnly).not.toHaveBeenCalled()
    expect(state().mode).toBe('editar')
  })

  it('dispose suelta el bloqueo aunque se haya quedado en Ver', () => {
    const { bridge, scene } = setup()
    bridge.setMode('ver')
    bridge.dispose()
    expect(scene.getState().readOnly).toBe(false)
  })
})

describe('vista e historial', () => {
  it('setView cambia la vista de Pascal', () => {
    const { bridge, state } = setup()
    bridge.setView('split')
    expect(state().view).toBe('split')
    bridge.setView('2d')
    expect(state().view).toBe('2d')
  })

  it('undo y redo llaman al historial de Pascal', () => {
    const { bridge, history } = setup()
    bridge.undo()
    bridge.redo()
    expect(history.undo).toHaveBeenCalledTimes(1)
    expect(history.redo).toHaveBeenCalledTimes(1)
  })
})

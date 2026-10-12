import { describe, expect, it } from 'vitest'
import { selectShellState } from '../src/editor/shell/bridge/selectors'
import { createFakeDeps } from './support/fake-deps'

describe('selectShellState', () => {
  it('lee el estado real de Pascal: un proyecto en blanco abre en Editar con la herramienta de muro ya armada', () => {
    const state = selectShellState(createFakeDeps().snapshot())
    expect(state).toEqual({
      mode: 'editar',
      view: '3d',
      canUndo: false,
      canRedo: false,
      firstPerson: false,
      phase: 'structure',
      editorMode: 'build',
      tool: 'wall',
    })
  })

  it('el modo es Ver exactamente cuando la escena está en solo lectura', () => {
    const fake = createFakeDeps()
    fake.scene.setState({ readOnly: true })
    expect(selectShellState(fake.snapshot()).mode).toBe('ver')
  })

  it('refleja vista, historial y recorrido', () => {
    const fake = createFakeDeps()
    fake.editor.setState({ viewMode: 'split', isFirstPersonMode: true })
    fake.history.set({ canUndo: true, canRedo: false })
    expect(selectShellState(fake.snapshot())).toMatchObject({ view: 'split', firstPerson: true, canUndo: true, canRedo: false })
  })
})

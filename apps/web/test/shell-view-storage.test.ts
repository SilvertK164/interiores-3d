import { describe, expect, it } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { VIEW_STORAGE_KEY, createViewStorage, parseStoredView } from '../src/editor/shell/view-storage'
import { createFakeDeps } from './support/fake-deps'

describe('parseStoredView', () => {
  it('acepta solo 2d, 3d o split', () => {
    expect(parseStoredView('split')).toBe('split')
    expect(parseStoredView('2d')).toBe('2d')
    expect(parseStoredView('3d')).toBe('3d')
    for (const bad of [null, '', 'ambas', '{"a":1}', '4d']) expect(parseStoredView(bad)).toBeNull()
  })
})

describe('createViewStorage', () => {
  const memory = (initial: Record<string, string> = {}, throwing = false) => {
    const data = { ...initial }
    return {
      data,
      getItem: (k: string) => {
        if (throwing) throw new Error('bloqueado')
        return data[k] ?? null
      },
      setItem: (k: string, v: string) => {
        if (throwing) throw new Error('bloqueado')
        data[k] = v
      },
    }
  }
  it('lee y escribe con la clave propia de Madori', () => {
    const m = memory({ [VIEW_STORAGE_KEY]: 'split' })
    const store = createViewStorage(() => m)
    expect(store.read()).toBe('split')
    store.write('2d')
    expect(m.data[VIEW_STORAGE_KEY]).toBe('2d')
  })
  it('sin almacenamiento o con error no falla', () => {
    expect(createViewStorage(() => null).read()).toBeNull()
    createViewStorage(() => null).write('2d')
    const store = createViewStorage(() => memory({}, true))
    expect(store.read()).toBeNull()
    expect(() => store.write('3d')).not.toThrow()
  })
})

describe('mountDefaults conserva la vista', () => {
  const setup = (saved: '2d' | '3d' | 'split' | null) => {
    const fake = createFakeDeps()
    const written: string[] = []
    const bridge = createBridge({ ...fake.deps, viewStore: { read: () => saved, write: (v) => written.push(v) } })
    return { ...fake, bridge, written }
  }
  it('restaura la vista guardada al montar (Pascal la pisa antes de rehidratar)', () => {
    const { bridge, editor } = setup('split')
    bridge.mountDefaults()
    expect(editor.getState().viewMode).toBe('split')
  })
  it('sin vista guardada deja la de Pascal y no escribe nada al montar', () => {
    const { bridge, editor, written } = setup(null)
    bridge.mountDefaults()
    expect(editor.getState().viewMode).toBe('3d')
    expect(written).toEqual([])
  })
  it('guarda cada cambio de vista y deja de hacerlo al desmontar', () => {
    const { bridge, editor, written } = setup(null)
    const stop = bridge.mountDefaults()
    editor.setState({ viewMode: '2d' })
    editor.setState({ viewMode: '2d' })
    expect(written).toEqual(['2d'])
    stop()
    editor.setState({ viewMode: 'split' })
    expect(written).toEqual(['2d'])
  })
})

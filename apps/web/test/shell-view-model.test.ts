import { describe, expect, it } from 'vitest'
import { viewActions, viewGroups } from '../src/editor/shell/view-model'

const OPTIONS = { walls: 'cutaway', levels: 'solo', camera: 'perspective', shading: 'rendered' } as const
const ALL = { cameraControl: true, styleControl: true, walkthrough: true }
const NONE = { cameraControl: false, styleControl: false, walkthrough: false }
const labels = (chips: readonly { label: string }[]) => chips.map((c) => c.label)

describe('viewGroups', () => {
  it('ofrece Muros, Niveles, Cámara y Estilo, cada uno con sus opciones en castellano y la activa marcada', () => {
    const groups = viewGroups(OPTIONS, ALL)
    expect(groups.map((g) => g.title)).toEqual(['Muros', 'Niveles', 'Cámara', 'Estilo'])
    expect(labels(groups[0]?.chips ?? [])).toEqual(['Completos', 'Cortados', 'Bajos'])
    expect(labels(groups[1]?.chips ?? [])).toEqual(['Juntos', 'Separados', 'Uno solo'])
    expect(labels(groups[2]?.chips ?? [])).toEqual(['Perspectiva', 'Isométrica'])
    expect(labels(groups[3]?.chips ?? [])).toEqual(['Sólido', 'Realista'])
    expect(groups.map((g) => g.active)).toEqual(['cutaway', 'solo', 'perspective', 'rendered'])
  })

  it('cada opción lleva el valor que entiende Pascal', () => {
    const [walls, levels, camera, shading] = viewGroups(OPTIONS, ALL)
    expect(walls?.chips.map((c) => c.value)).toEqual(['up', 'cutaway', 'down'])
    expect(levels?.chips.map((c) => c.value)).toEqual(['stacked', 'exploded', 'solo'])
    expect(camera?.chips.map((c) => c.value)).toEqual(['perspective', 'orthographic'])
    expect(shading?.chips.map((c) => c.value)).toEqual(['solid', 'rendered'])
  })

  it('si el spike no confirmó Cámara y Estilo, esos grupos se ocultan', () => {
    expect(viewGroups(OPTIONS, NONE).map((g) => g.title)).toEqual(['Muros', 'Niveles'])
    expect(viewGroups(OPTIONS, { ...NONE, styleControl: true }).map((g) => g.title)).toEqual(['Muros', 'Niveles', 'Estilo'])
  })

  it('un modo de Pascal que el panel no ofrece (translúcido, manual) no deja nada marcado', () => {
    const [walls, levels] = viewGroups({ ...OPTIONS, walls: 'translucent', levels: 'manual' }, NONE)
    expect(walls?.chips.some((c) => c.value === walls.active)).toBe(false)
    expect(levels?.chips.some((c) => c.value === levels.active)).toBe(false)
  })
})

describe('viewActions', () => {
  it('Girar izq., Girar der., Vista superior y Recorrer, con su ícono', () => {
    const actions = viewActions(ALL)
    expect(actions.map((a) => [a.id, a.label])).toEqual([
      ['orbit-left', 'Girar izq.'],
      ['orbit-right', 'Girar der.'],
      ['top', 'Vista superior'],
      ['walk', 'Recorrer'],
    ])
    for (const action of actions) expect(action.icon, action.id).toBeDefined()
  })

  it('si el spike no confirmó Recorrer, el botón no está', () => {
    expect(viewActions(NONE).map((a) => a.id)).toEqual(['orbit-left', 'orbit-right', 'top'])
  })
})

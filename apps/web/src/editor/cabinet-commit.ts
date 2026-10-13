import * as Core from '@pascal-app/core'

type AnyNode = Core.AnyNode

/** Eje del tirador de cada campo del panel (`nodes/dist/cabinet/definition.js`: ancho en x, fondo en z, alto en y). */
const AXIS = { width: 'x', depth: 'z', carcassHeight: 'y' } as const

/** Un gabinete (`cabinet`) o uno de sus módulos (`cabinet-module`). */
export const isCabinetNode = (node: AnyNode) => node.type === 'cabinet' || node.type === 'cabinet-module'

/**
 * Cambia el ancho, el fondo o el alto con el mismo tirador que usa el lienzo: `apply` calcula el cambio y `commit`
 * (`commitCabinetResize`) reacomoda los módulos, los vecinos en esquina y los gabinetes de pared. Todo queda en **un**
 * paso del historial. Si el tirador no existe o no está visible para este nodo (un módulo de ancho fijo), no hace nada.
 */
export function commitCabinetFields(node: AnyNode, patch: Record<string, unknown>): void {
  const field = (Object.keys(AXIS) as (keyof typeof AXIS)[]).find((key) => typeof patch[key] === 'number')
  if (!field) return
  const sceneApi = Core.createSceneApi(Core.useScene)
  // `handles` es una lista o una función que recibe el nodo (`HandleList` de Pascal).
  const registered = Core.nodeRegistry.get(node.type)?.handles
  const list = typeof registered === 'function' ? registered(node as never, sceneApi) : (registered ?? [])
  const handles = list as unknown as {
    kind: string
    axis?: string
    visible?: (node: never, sceneApi: never) => boolean
    apply: (node: never, value: number, sceneApi: never, modifiers: { altKey: boolean; shiftKey: boolean }) => Record<string, unknown>
    commit?: (node: never, patch: never, sceneApi: never, modifiers: { altKey: boolean; shiftKey: boolean }) => void
  }[]
  const handle = handles.filter((candidate) => candidate.kind === 'linear-resize' && candidate.axis === AXIS[field]).at(-1)
  if (!handle || (handle.visible && !handle.visible(node as never, sceneApi as never))) return
  const modifiers = { altKey: false, shiftKey: false }
  const next = handle.apply(node as never, patch[field] as number, sceneApi as never, modifiers)
  Core.runAsSingleSceneHistoryStep(Core.useScene, () => {
    if (handle.commit) handle.commit(node as never, next as never, sceneApi as never, modifiers)
    else sceneApi.update(node.id as never, next as never)
  })
}

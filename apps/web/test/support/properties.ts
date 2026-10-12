import { type PropTarget, fieldsFor } from '../../src/editor/shell/properties-model'

/** Un elemento elegido de prueba: el nodo con su id (`<tipo>_1`) y lo que el panel necesita de su entorno. */
export const target = (node: Record<string, unknown>, extra: Partial<PropTarget> = {}): PropTarget => ({
  node: { id: `${node.type}_1`, ...node } as PropTarget['node'],
  hostLength: null,
  descendants: 0,
  ...extra,
})

/** Lo que muestra cada campo del panel, por id. */
export const values = (t: PropTarget) => Object.fromEntries(fieldsFor(t).map((f) => [f.id, f.value]))

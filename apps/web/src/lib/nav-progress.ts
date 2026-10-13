/**
 * Estado de la barra de navegación (lógica pura, sin React). Cada control que inicia una navegación (un enlace o un
 * `router.push` dentro de una transición) es una "fuente" con su propio id. La barra está pendiente mientras haya al
 * menos una; cuando se acaba la última pasa a "completa" y, pasado un instante, vuelve a reposo.
 */
export type NavPhase = 'idle' | 'pending' | 'done'

export type NavState = { phase: NavPhase; sources: string[] }

export type NavAction = { type: 'pending'; id: string; pending: boolean } | { type: 'reset' }

export const initialNavState: NavState = { phase: 'idle', sources: [] }

export function navReducer(state: NavState, action: NavAction): NavState {
  if (action.type === 'reset') return state.phase === 'done' ? initialNavState : state
  const has = state.sources.includes(action.id)
  if (action.pending) {
    if (has && state.phase === 'pending') return state
    return { phase: 'pending', sources: has ? state.sources : [...state.sources, action.id] }
  }
  if (!has) return state
  const sources = state.sources.filter((id) => id !== action.id)
  return { phase: sources.length === 0 ? 'done' : 'pending', sources }
}

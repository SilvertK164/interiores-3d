export type Gate = 'wait' | 'login' | 'show'

/**
 * Decide si una página protegida muestra su contenido, espera o manda a ingresar.
 * Si la sesión vence con el editor ya abierto, NO se desmonta: se perdería lo que aún no se guardó.
 * El aviso de sesión vencida del guardador explica qué hacer sin tirar el trabajo local.
 */
export function sessionGate(s: { loading: boolean; hasSession: boolean; hadSession: boolean }): Gate {
  if (s.hasSession || s.hadSession) return 'show'
  return s.loading ? 'wait' : 'login'
}

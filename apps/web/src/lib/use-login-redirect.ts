'use client'

import { useCallback } from 'react'
import { type LoginReason, loginHref } from './login-params'
import { useNavigate } from './use-navigate'

/**
 * Manda a /login desde una página protegida (sin sesión o con la sesión vencida). Por defecto guarda la ruta actual en
 * `next` para volver a ella después de ingresar (`next: null` no guarda ninguna); `reason: 'sesion'` hace que /login
 * explique que la sesión venció. Reemplaza la entrada del historial: "Atrás" no vuelve a una página que ya no se puede usar.
 */
export function useLoginRedirect() {
  const { go } = useNavigate()
  return useCallback(
    (options: { reason?: LoginReason; next?: string | null } = {}) => {
      const here = `${window.location.pathname}${window.location.search}`
      go(loginHref({ reason: options.reason, next: options.next === undefined ? here : options.next }), 'replace')
    },
    [go],
  )
}

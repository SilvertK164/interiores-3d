'use client'

import { useEffect, useState } from 'react'
import { type RecoveryState, nextRecoveryState } from './new-password'
import { supabaseBrowser } from './supabase/browser'

/**
 * ¿Hay sesión de recuperación? El enlace del correo lleva a /nueva-contrasena y Supabase (`detectSessionInUrl`) la crea
 * al leerlo; `getSession()` espera a ese trabajo, y `onAuthStateChange` avisa de `PASSWORD_RECOVERY`. Sin sesión el
 * enlace venció, ya se usó o la página se abrió sin enlace. El token no se toca: Supabase lo quita de la URL.
 */
export function useRecoverySession(): RecoveryState {
  const [state, setState] = useState<RecoveryState>('checking')

  useEffect(() => {
    const supabase = supabaseBrowser()
    let alive = true
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (alive) setState((current) => nextRecoveryState(current, event, session !== null))
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (alive) setState((current) => nextRecoveryState(current, 'GET_SESSION', session !== null))
    })
    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [])

  return state
}

'use client'

import { useState } from 'react'
import { supabaseBrowser } from './supabase/browser'
import { useNavigate } from './use-navigate'

/**
 * Salir de la cuenta: cierra la sesión y lleva a /login. `leaving` es verdadero desde el clic (la sesión que desaparece a
 * propósito no es una sesión vencida: la página lo usa para no mandar a /login con un aviso); `signingOut` incluye también
 * la navegación, para dejar el botón ocupado hasta que llega /login.
 */
export function useSignOut() {
  const nav = useNavigate()
  const [leaving, setLeaving] = useState(false)
  const signOut = async () => {
    if (leaving || nav.pending) return
    setLeaving(true)
    try {
      await supabaseBrowser().auth.signOut()
      nav.go('/login', 'replace')
    } catch {
      setLeaving(false)
    }
  }
  return { leaving, signingOut: leaving || nav.pending, signOut }
}

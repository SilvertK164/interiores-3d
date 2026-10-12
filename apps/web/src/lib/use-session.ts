'use client'

import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from './supabase/browser'

/**
 * La sesión de Supabase en esta pantalla. `hadSession` pasa a verdadero la primera vez que hubo sesión y ya no vuelve
 * atrás: si después `session` es null, la sesión se perdió estando aquí (venció o se cerró en otra pestaña) y no es que
 * nunca se hubiera ingresado.
 */
export function useSession(): { session: Session | null; loading: boolean; hadSession: boolean } {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [hadSession, setHadSession] = useState(false)

  useEffect(() => {
    const supabase = supabaseBrowser()
    const apply = (next: Session | null) => {
      setSession(next)
      if (next) setHadSession(true)
    }
    supabase.auth.getSession().then(({ data }) => {
      apply(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => apply(next))
    return () => data.subscription.unsubscribe()
  }, [])

  return { session, loading, hadSession }
}

'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { useReportNavPending } from '@/components/NavProgress'

/**
 * Navegación desde el código (después de ingresar, de crear un proyecto o de salir). Va dentro de una transición:
 * `pending` es verdadero hasta que llega la página nueva y también enciende la barra superior. Quien lo usa deja el
 * control que la inició en `aria-busy` y deshabilitado mientras `pending`.
 */
export function useNavigate() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  useReportNavPending(pending)
  const go = useCallback(
    (href: string, mode: 'push' | 'replace' = 'push') => {
      startTransition(() => {
        if (mode === 'replace') router.replace(href)
        else router.push(href)
      })
    },
    [router],
  )
  return { go, pending }
}

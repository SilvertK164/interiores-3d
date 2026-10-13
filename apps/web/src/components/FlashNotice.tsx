'use client'

import { CircleCheck } from 'lucide-react'
import { useEffect } from 'react'

/**
 * Aviso breve y flotante («Proyecto eliminado»). La región viva está siempre en la página para que los lectores de pantalla
 * anuncien el texto cuando aparece; se oculta solo tras `ms` (`onDone` debe ser estable o el reloj se reinicia).
 */
export function FlashNotice({ message, onDone, ms = 5000 }: { message: string | null; onDone: () => void; ms?: number }) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onDone, ms)
    return () => window.clearTimeout(timer)
  }, [message, onDone, ms])

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" role="status">
      {message && (
        <p className="glass-float inline-flex min-h-11 animate-[app-pop_220ms_ease-out] items-center gap-2.5 rounded-full px-5 text-[15px] font-medium text-ink">
          <CircleCheck aria-hidden className="shrink-0 text-ok" size={20} />
          {message}
        </p>
      )}
    </div>
  )
}

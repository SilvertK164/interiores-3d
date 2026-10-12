'use client'

import Link, { useLinkStatus } from 'next/link'
import { type ComponentProps, useEffect, useState } from 'react'
import { useReportNavPending } from './NavProgress'

/** Va dentro del enlace (es la única forma de leer `useLinkStatus`): avisa a la barra y al propio enlace. */
function LinkStatus({ onChange }: { onChange: (pending: boolean) => void }) {
  const { pending } = useLinkStatus()
  useReportNavPending(pending)
  useEffect(() => {
    onChange(pending)
  }, [pending, onChange])
  return null
}

/**
 * Enlace de Next que muestra su navegación en la barra superior, queda en `aria-busy` mientras la página nueva
 * llega y no admite un segundo clic. Se usa igual que `Link`.
 */
export function BusyLink({ children, onClick, ...props }: ComponentProps<typeof Link>) {
  const [busy, setBusy] = useState(false)
  return (
    <Link
      {...props}
      aria-busy={busy || undefined}
      onClick={(e) => {
        if (busy) return e.preventDefault()
        onClick?.(e)
      }}
    >
      <LinkStatus onChange={setBusy} />
      {children}
    </Link>
  )
}

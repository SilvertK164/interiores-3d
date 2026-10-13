import { Info, TriangleAlert } from 'lucide-react'
import type { AuthAction, AuthNotice } from '@/lib/auth-errors'

type Props = {
  notice: AuthNotice
  /** Qué hacer al pulsar el botón del aviso (si el aviso trae una acción). */
  onAction?: (kind: AuthAction['kind']) => void
  id?: string
}

/** Aviso del acceso: un error (`role="alert"`) o una información (`role="status"`), con el botón que lo resuelve si lo hay. */
export function AuthBanner({ notice, onAction, id }: Props) {
  const isError = notice.tone === 'error'
  const Icon = isError ? TriangleAlert : Info
  const { action } = notice
  return (
    <div
      className={`flex items-start gap-2 rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug ${isError ? 'bg-danger-wash text-danger-ink' : 'bg-brand-mist text-brand-deep'}`}
      id={id}
      role={isError ? 'alert' : 'status'}
    >
      <Icon aria-hidden className="mt-0.5 shrink-0" size={16} />
      <p>
        {notice.message}
        {action && onAction && (
          <>
            {' '}
            <button className="focus-ring cursor-pointer rounded font-semibold underline" onClick={() => onAction(action.kind)} type="button">
              {action.label}
            </button>
          </>
        )}
      </p>
    </div>
  )
}

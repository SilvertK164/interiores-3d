'use client'

import type { SaverStatus } from './scene-saver'

type Props = { status: SaverStatus; onKeepEditing: () => void; dismissed: boolean }

/** Estado de guardado siempre visible; en conflicto o sesión vencida explica qué hacer sin perder lo local. */
export function SaveBanner({ status, onKeepEditing, dismissed }: Props) {
  if (status === 'conflict' && !dismissed) {
    return (
      <div role="alert" className="absolute left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col gap-2 rounded-xl bg-white p-4 shadow-lg">
        <p className="text-sm font-medium">Este proyecto cambió desde otra pestaña y tiene una versión más nueva.</p>
        <p className="text-sm text-muted-foreground">Tu trabajo local sigue aquí. Elige qué hacer:</p>
        <div className="flex gap-2">
          <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={() => window.location.reload()} type="button">
            Recargar la versión del servidor
          </button>
          <button className="rounded-md bg-secondary px-3 py-2 text-sm" onClick={onKeepEditing} type="button">
            Seguir editando sin guardar
          </button>
        </div>
      </div>
    )
  }
  if (status === 'unauthorized') {
    return (
      <div role="alert" className="absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl bg-white p-4 text-sm shadow-lg">
        Tu sesión venció. Tu trabajo local sigue aquí: <a className="underline" href="/login" rel="noreferrer" target="_blank">ingresa de nuevo en otra pestaña</a> y vuelve.
      </div>
    )
  }
  const label: Record<string, string> = {
    pending: 'Cambios sin guardar…',
    saving: 'Guardando…',
    saved: 'Guardado',
    error: 'No pudimos guardar. Reintentando…',
    conflict: 'Sin guardar (versión desactualizada)',
  }
  const text = label[status]
  if (!text) return null
  return (
    <p role="status" className="absolute right-4 top-4 z-50 rounded-full bg-white/90 px-3 py-1 text-xs shadow">
      {text}
    </p>
  )
}

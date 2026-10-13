'use client'

import type { SaverStatus } from './scene-saver'

type Props = { status: SaverStatus; detail?: string; onKeepEditing: () => void; dismissed: boolean }

const ALERT = 'absolute left-1/2 top-24 z-50 -translate-x-1/2 rounded-xl bg-white p-4 text-sm shadow-lg'

/**
 * Avisos que explican qué hacer cuando el guardado se detiene (rechazo, conflicto o sesión vencida) sin perder lo local.
 * El estado corriente (guardando, guardado…) lo muestra el chip de la barra superior del shell.
 */
export function SaveBanner({ status, detail, onKeepEditing, dismissed }: Props) {
  if (status === 'rejected') {
    return (
      <div data-testid="save-alert" role="alert" className={ALERT}>
        {detail ?? 'La escena no se puede guardar.'} Tu trabajo local sigue en esta pantalla.
      </div>
    )
  }
  if (status === 'conflict' && !dismissed) {
    return (
      <div data-testid="save-alert" role="alert" className={`${ALERT} flex flex-col gap-2`}>
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
      <div data-testid="save-alert" role="alert" className={ALERT}>
        Tu sesión venció. Tu trabajo local sigue aquí:{' '}
        <a className="underline" href="/login" rel="noreferrer" target="_blank">
          ingresa de nuevo en otra pestaña
        </a>{' '}
        y este editor retomará el guardado solo.
      </div>
    )
  }
  return null
}

'use client'

import { Ellipsis, Trash2 } from 'lucide-react'
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'
import { useDismiss } from '@/editor/shell/use-dismiss'
import { menuLabel, menuStep } from '@/lib/delete-project'

const menuItems = (root: HTMLElement | null) => Array.from(root?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])

const ITEM =
  'focus-ring flex h-11 w-full cursor-pointer items-center gap-3 rounded-[14px] px-3 text-left text-[15px] font-medium text-danger transition-colors duration-150 ease-out hover:bg-danger-wash focus-visible:bg-danger-wash'

/** El menú de vidrio con sus opciones (por ahora solo «Eliminar proyecto»). */
export function ProjectMenuPanel({ id, labelledBy, onDelete }: { id: string; labelledBy: string; onDelete: () => void }) {
  return (
    <div
      aria-labelledby={labelledBy}
      aria-orientation="vertical"
      className="glass-float absolute right-0 top-full z-10 mt-2 w-[208px] animate-[app-pop_160ms_ease-out] rounded-[20px] p-1.5"
      id={id}
      role="menu"
    >
      <button className={ITEM} onClick={onDelete} role="menuitem" tabIndex={-1} type="button">
        <Trash2 aria-hidden size={20} />
        Eliminar proyecto
      </button>
    </div>
  )
}

/**
 * Botón «…» de una tarjeta con su menú. Va FUERA del enlace de la tarjeta (un botón dentro de un <a> no es válido y haría navegar).
 * Esc o un clic fuera lo cierran, las flechas recorren las opciones y el foco vuelve al botón.
 */
export function ProjectCardMenu({ name, onDelete }: { name: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const ids = useId()
  const buttonId = `${ids}-button`
  const menuId = `${ids}-menu`

  useDismiss(open, rootRef, () => setOpen(false))

  useEffect(() => {
    if (open) menuItems(rootRef.current)[0]?.focus()
  }, [open])

  const closeToButton = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      return closeToButton()
    }
    if (event.key === 'Tab') return setOpen(false)
    const list = menuItems(rootRef.current)
    const next = menuStep(event.key, list.indexOf(document.activeElement as HTMLElement), list.length)
    if (next === null) return
    event.preventDefault()
    list[next]?.focus()
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: recoge el teclado de sus hijos (el botón y el menú); no es un control.
    <div className="absolute right-[17px] top-[17px] z-10" onKeyDown={onKeyDown} ref={rootRef}>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={menuLabel(name)}
        className="glass focus-ring relative grid size-8 cursor-pointer place-items-center rounded-full text-ink transition-colors duration-150 ease-out before:absolute before:-inset-1.5 before:content-[''] hover:bg-white aria-expanded:bg-white"
        id={buttonId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (open || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return
          event.preventDefault()
          setOpen(true)
        }}
        ref={buttonRef}
        type="button"
      >
        <Ellipsis aria-hidden size={20} />
      </button>
      {open && (
        <ProjectMenuPanel
          id={menuId}
          labelledBy={buttonId}
          onDelete={() => {
            // El foco vuelve al botón ANTES de abrir el diálogo: así el diálogo lo recuerda y lo recupera al cerrarse.
            closeToButton()
            onDelete()
          }}
        />
      )}
    </div>
  )
}

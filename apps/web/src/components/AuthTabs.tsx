'use client'

import { type ReactNode, useId, useRef } from 'react'
import { type AuthMode, MODES, tabForKey } from '@/lib/auth-form'

const LABELS: Record<AuthMode, string> = { login: 'Ingresar', register: 'Crear cuenta' }

type Props = {
  mode: AuthMode
  onChange: (mode: AuthMode) => void
  /** Mientras se envía el formulario no se cambia de pestaña. */
  disabled?: boolean
  /** Contenido de la pestaña activa (su formulario). */
  children: ReactNode
}

/**
 * Pestañas "Ingresar" | "Crear cuenta" (patrón de pestañas de WAI-ARIA): `tablist`, `tab` con `aria-selected`,
 * y un `tabpanel` con el formulario de la pestaña activa. Solo la activa entra en el orden del teclado; las flechas,
 * Inicio y Fin cambian de pestaña y llevan el foco a la nueva (la selección sigue al foco).
 */
export function AuthTabs({ mode, onChange, disabled = false, children }: Props) {
  const base = useId()
  const tabId = (m: AuthMode) => `${base}-tab-${m}`
  const panelId = `${base}-panel`
  const tabs = useRef<Partial<Record<AuthMode, HTMLButtonElement | null>>>({})

  return (
    <>
      <div aria-label="Acceso a tu cuenta" className="flex rounded-full bg-brand-mist p-1" role="tablist">
        {MODES.map((m) => {
          const selected = m === mode
          return (
            <button
              aria-controls={selected ? panelId : undefined}
              aria-selected={selected}
              className={`focus-ring flex-1 cursor-pointer rounded-full py-2 text-center text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${selected ? 'bg-white text-ink shadow-soft' : 'text-ink-muted hover:text-ink'}`}
              disabled={disabled}
              id={tabId(m)}
              key={m}
              onClick={() => onChange(m)}
              onKeyDown={(e) => {
                const target = tabForKey(mode, e.key)
                if (!target) return
                e.preventDefault()
                onChange(target)
                tabs.current[target]?.focus()
              }}
              ref={(el) => {
                tabs.current[m] = el
              }}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {LABELS[m]}
            </button>
          )
        })}
      </div>
      <div aria-labelledby={tabId(mode)} id={panelId} role="tabpanel">
        {children}
      </div>
    </>
  )
}

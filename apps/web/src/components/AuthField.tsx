'use client'

import { Check, Eye, EyeOff } from 'lucide-react'
import { type ReactNode, type Ref, useState } from 'react'

type Props = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  type?: 'text' | 'email' | 'password'
  autoComplete: string
  placeholder?: string
  /** Error en línea: marca el campo (`aria-invalid`), se enlaza con `aria-describedby` y se anuncia (`role="alert"`). */
  error?: string | null
  /** Ayuda a la derecha de la etiqueta ("6 caracteres o más"). */
  hint?: ReactNode
  /** Ids de otros textos que describen el campo: el aviso del servidor, el medidor de fuerza. */
  describedBy?: string
  /** El valor ya se revisó y está bien: muestra una marca verde (decorativa). */
  ok?: boolean
  inputRef?: Ref<HTMLInputElement>
  /** Va debajo del campo y de su error (el medidor de fuerza). */
  children?: ReactNode
}

const LABEL = 'ml-1.5 block text-[13px] text-ink-muted'

/**
 * Campo de texto del acceso: etiqueta, ayuda, error en línea y, en la contraseña, el botón para verla u ocultarla.
 * El botón no roba el foco del campo al pulsarlo con el ratón (así no dispara la validación del campo).
 */
export function AuthField({ id, label, value, onChange, onBlur, type = 'text', autoComplete, placeholder, error, hint, describedBy, ok, inputRef, children }: Props) {
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const described = [hint ? hintId : null, describedBy, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className={LABEL} htmlFor={id}>
          {label}
        </label>
        {hint && (
          <span className="mr-1.5 text-[12px] text-ink-muted" id={hintId}>
            {hint}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          aria-describedby={described}
          aria-invalid={error ? true : undefined}
          autoCapitalize={type === 'text' ? 'words' : 'none'}
          autoComplete={autoComplete}
          className={isPassword || ok ? 'field pr-12' : 'field'}
          id={id}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          ref={inputRef}
          required
          spellCheck={false}
          type={isPassword && shown ? 'text' : type}
          value={value}
        />
        {isPassword && (
          <button
            aria-label="Mostrar contraseña"
            aria-pressed={shown}
            className="focus-ring absolute right-1 top-1/2 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-ink/5 hover:text-ink"
            onClick={() => setShown((current) => !current)}
            onMouseDown={(e) => e.preventDefault()}
            type="button"
          >
            {shown ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
          </button>
        )}
        {ok && !isPassword && <Check aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ok-dot" size={18} />}
      </div>
      {error && (
        <p className="ml-1.5 mt-1.5 text-[13px] text-danger" id={errorId} role="alert">
          {error}
        </p>
      )}
      {children}
    </div>
  )
}

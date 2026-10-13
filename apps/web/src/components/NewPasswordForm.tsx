'use client'

import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import type { AuthAction, AuthNotice } from '@/lib/auth-errors'
import { NEW_PASSWORD_MIN, type NewPasswordField, validateNewPassword } from '@/lib/new-password'
import { AuthBanner } from './AuthBanner'
import { AuthField } from './AuthField'
import { PasswordStrength } from './PasswordStrength'

type Props = {
  /** Guardando o navegando: el botón queda ocupado y no admite otro clic. */
  locked: boolean
  /** Último error del servidor, ya traducido; lleva el foco a la contraseña si apunta a ella. */
  error: AuthNotice | null
  onSubmit: (password: string) => void
  onAction: (kind: AuthAction['kind']) => void
}

/** Formulario de /nueva-contrasena: la contraseña nueva (con su medidor de fuerza) y repetirla. Solo valida y avisa. */
export function NewPasswordForm({ locked, error, onSubmit, onAction }: Props) {
  const ids = useId()
  const bannerId = `${ids}-error`
  const [values, setValues] = useState({ password: '', repeat: '' })
  const [touched, setTouched] = useState<Partial<Record<NewPasswordField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const repeatRef = useRef<HTMLInputElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const { errors, first } = validateNewPassword(values.password, values.repeat)
  const shown = (field: NewPasswordField) => (submitted || touched[field] ? (errors[field] ?? null) : null)
  const touch = (field: NewPasswordField) => setTouched((current) => (current[field] ? current : { ...current, [field]: true }))

  // Tras un error del servidor el foco va a la contraseña (si apunta a ella) o al botón.
  useEffect(() => {
    if (error?.tone !== 'error') return
    if (error.field === 'password') {
      passwordRef.current?.focus()
      passwordRef.current?.select()
    } else submitRef.current?.focus()
  }, [error])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (locked) return
    setSubmitted(true)
    if (first) return (first === 'password' ? passwordRef : repeatRef).current?.focus()
    onSubmit(values.password)
  }

  return (
    <form aria-labelledby={`${ids}-title`} className="flex flex-col gap-3" noValidate onSubmit={submit}>
      <div>
        <h1 className="font-display text-[30px] font-medium leading-[1.05] tracking-[-0.035em]" id={`${ids}-title`}>
          Crea tu contraseña nueva
        </h1>
        <p className="mt-1.5 text-ink-muted">Elige una que no uses en otros sitios.</p>
      </div>
      <AuthField
        autoComplete="new-password"
        describedBy={[error?.field === 'password' ? bannerId : null, values.password ? `${ids}-strength` : null].filter(Boolean).join(' ') || undefined}
        error={shown('password')}
        hint={`${NEW_PASSWORD_MIN} caracteres o más`}
        id={`${ids}-password`}
        inputRef={passwordRef}
        label="Contraseña nueva"
        onBlur={() => touch('password')}
        onChange={(password) => setValues((current) => ({ ...current, password }))}
        placeholder="Elige una contraseña"
        type="password"
        value={values.password}
      >
        <PasswordStrength id={`${ids}-strength`} password={values.password} />
      </AuthField>
      <AuthField
        autoComplete="new-password"
        error={shown('repeat')}
        id={`${ids}-repeat`}
        inputRef={repeatRef}
        label="Repite la contraseña"
        onBlur={() => touch('repeat')}
        onChange={(repeat) => setValues((current) => ({ ...current, repeat }))}
        placeholder="Escríbela otra vez"
        type="password"
        value={values.repeat}
      />
      {error && <AuthBanner id={bannerId} notice={error} onAction={onAction} />}
      <button aria-busy={locked || undefined} className="btn btn-primary h-12" disabled={locked} ref={submitRef} type="submit">
        Guardar contraseña
      </button>
    </form>
  )
}

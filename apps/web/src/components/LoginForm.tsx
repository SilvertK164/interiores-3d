'use client'

import { type FormEvent, useEffect, useId } from 'react'
import type { AuthAction, AuthNotice } from '@/lib/auth-errors'
import { useAuthForm } from '@/lib/use-auth-form'
import { AuthBanner } from './AuthBanner'
import { AuthField } from './AuthField'

type Props = {
  email: string
  onEmail: (value: string) => void
  /** Enviando o navegando: el botón queda ocupado y no admite otro clic. */
  locked: boolean
  /** Aviso informativo bajo el título (por ejemplo, que la sesión venció). */
  notice: AuthNotice | null
  /** Último error del servidor, ya traducido; lleva el foco al campo afectado. */
  error: AuthNotice | null
  onSubmit: (values: { email: string; password: string }) => void
  onAction: (kind: AuthAction['kind']) => void
  /** "¿Olvidaste tu contraseña?": quien lo usa abre el formulario de recuperación. */
  onForgot: () => void
  /** Se llega desde "Ingresar con esa cuenta": el correo ya está, el foco va directo a la contraseña. */
  focusPassword?: boolean
}

/** Formulario de la pestaña "Ingresar": correo y contraseña, validación en línea y el error del servidor sobre el botón. */
export function LoginForm({ email, onEmail, locked, notice, error, onSubmit, onAction, onForgot, focusPassword = false }: Props) {
  const ids = useId()
  const bannerId = `${ids}-error`
  const form = useAuthForm('login', { email, onEmail }, error)
  const passwordRef = form.refs.password

  useEffect(() => {
    if (focusPassword) passwordRef.current?.focus()
  }, [focusPassword, passwordRef])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (locked || !form.validate()) return
    onSubmit({ email: form.values.email.trim(), password: form.values.password })
  }

  return (
    <form aria-labelledby={`${ids}-title`} className="flex flex-col gap-3" noValidate onSubmit={submit}>
      <div>
        <h1 className="font-display text-[30px] font-medium leading-[1.05] tracking-[-0.035em]" id={`${ids}-title`}>
          Te damos la bienvenida
        </h1>
        <p className="mt-1.5 text-ink-muted">Ingresa a tu cuenta para abrir tus proyectos.</p>
      </div>
      {notice && <AuthBanner notice={notice} />}
      <AuthField
        autoComplete="email"
        describedBy={error?.field === 'email' ? bannerId : undefined}
        error={form.errors.email}
        id={`${ids}-email`}
        inputRef={form.refs.email}
        label="Correo"
        onBlur={() => form.blur('email')}
        onChange={(value) => form.set('email', value)}
        placeholder="nombre@correo.com"
        type="email"
        value={form.values.email}
      />
      <AuthField
        autoComplete="current-password"
        describedBy={error?.field === 'password' ? bannerId : undefined}
        error={form.errors.password}
        id={`${ids}-password`}
        inputRef={passwordRef}
        label="Contraseña"
        onBlur={() => form.blur('password')}
        onChange={(value) => form.set('password', value)}
        placeholder="Tu contraseña"
        type="password"
        value={form.values.password}
      />
      <button
        className="focus-ring -my-1 min-h-11 cursor-pointer self-end rounded-full px-3 text-[13px] font-medium text-brand transition-colors duration-150 ease-out hover:bg-brand-mist"
        disabled={locked}
        onClick={onForgot}
        type="button"
      >
        ¿Olvidaste tu contraseña?
      </button>
      {error && <AuthBanner id={bannerId} notice={error} onAction={onAction} />}
      <button aria-busy={locked || undefined} className="btn btn-primary h-12" disabled={locked} ref={form.submitRef} type="submit">
        Ingresar
      </button>
    </form>
  )
}

'use client'

import { type FormEvent, useId } from 'react'
import type { AuthAction, AuthNotice } from '@/lib/auth-errors'
import { PASSWORD_MIN } from '@/lib/password-strength'
import { useAuthForm } from '@/lib/use-auth-form'
import { AuthBanner } from './AuthBanner'
import { AuthField } from './AuthField'
import { PasswordStrength } from './PasswordStrength'

type Props = {
  email: string
  onEmail: (value: string) => void
  /** Enviando o navegando: el botón queda ocupado y no admite otro clic. */
  locked: boolean
  /** Último error del servidor (o el aviso de confirmar el correo), ya traducido. */
  error: AuthNotice | null
  onSubmit: (values: { name: string; email: string; password: string }) => void
  onAction: (kind: AuthAction['kind']) => void
}

/** Formulario de la pestaña "Crear cuenta": nombre (para saludar), correo y contraseña con su medidor de fuerza. */
export function RegisterForm({ email, onEmail, locked, error, onSubmit, onAction }: Props) {
  const ids = useId()
  const bannerId = `${ids}-error`
  const form = useAuthForm('register', { email, onEmail }, error)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (locked || !form.validate()) return
    onSubmit({ name: form.values.name, email: form.values.email.trim(), password: form.values.password })
  }

  return (
    <form aria-labelledby={`${ids}-title`} className="flex flex-col gap-3" noValidate onSubmit={submit}>
      <h1 className="font-display text-[30px] font-medium leading-[1.05] tracking-[-0.035em]" id={`${ids}-title`}>
        Crea tu cuenta
      </h1>
      <AuthField
        autoComplete="name"
        error={form.errors.name}
        id={`${ids}-name`}
        inputRef={form.refs.name}
        label="¿Cómo te llamamos?"
        ok={form.ok('name')}
        onBlur={() => form.blur('name')}
        onChange={(value) => form.set('name', value)}
        placeholder="Tu nombre"
        value={form.values.name}
      />
      <AuthField
        autoComplete="email"
        describedBy={error?.field === 'email' ? bannerId : undefined}
        error={form.errors.email}
        id={`${ids}-email`}
        inputRef={form.refs.email}
        label="Correo"
        ok={form.ok('email')}
        onBlur={() => form.blur('email')}
        onChange={(value) => form.set('email', value)}
        placeholder="nombre@correo.com"
        type="email"
        value={form.values.email}
      />
      <AuthField
        autoComplete="new-password"
        describedBy={[error?.field === 'password' ? bannerId : null, form.values.password ? `${ids}-strength` : null].filter(Boolean).join(' ') || undefined}
        error={form.errors.password}
        hint={`${PASSWORD_MIN} caracteres o más`}
        id={`${ids}-password`}
        inputRef={form.refs.password}
        label="Contraseña"
        onBlur={() => form.blur('password')}
        onChange={(value) => form.set('password', value)}
        placeholder="Elige una contraseña"
        type="password"
        value={form.values.password}
      >
        <PasswordStrength id={`${ids}-strength`} password={form.values.password} />
      </AuthField>
      {error && <AuthBanner id={bannerId} notice={error} onAction={onAction} />}
      <button aria-busy={locked || undefined} className="btn btn-primary h-12" disabled={locked} ref={form.submitRef} type="submit">
        Crear mi cuenta
      </button>
      <p className="text-center text-[12px] text-ink-muted">Sin tarjeta. Usamos tu nombre solo para saludarte.</p>
    </form>
  )
}

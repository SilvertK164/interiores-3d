'use client'

import { ArrowLeft } from 'lucide-react'
import { type FormEvent, type Ref, useEffect, useId, useRef, useState } from 'react'
import { type AuthNotice, RESET_SENT_NOTICE } from '@/lib/auth-errors'
import { validateField } from '@/lib/auth-form'
import { AuthBanner } from './AuthBanner'
import { AuthField } from './AuthField'

type Props = {
  email: string
  onEmail: (value: string) => void
  /** Enviando: el botón queda ocupado y no admite otro clic. */
  locked: boolean
  /** Error amable del servidor (límite de envíos, sin conexión), ya traducido. */
  error: AuthNotice | null
  /** Ya se pidió el enlace: se muestra siempre el mismo aviso, exista o no el correo. */
  sent: boolean
  onSubmit: (email: string) => void
  onBack: () => void
}

function BackButton({ onBack, locked, buttonRef }: { onBack: () => void; locked: boolean; buttonRef?: Ref<HTMLButtonElement> }) {
  return (
    <button className="btn btn-ghost h-12" disabled={locked} onClick={onBack} ref={buttonRef} type="button">
      <ArrowLeft aria-hidden size={16} />
      Volver a ingresar
    </button>
  )
}

/**
 * "¿Olvidaste tu contraseña?": pide el correo y avisa; quien lo usa (`LoginScreen`) habla con Supabase. Tras enviar solo
 * queda el aviso de siempre (nunca se dice si el correo está registrado) y el botón para volver.
 */
export function ForgotPasswordForm({ email, onEmail, locked, error, sent, onSubmit, onBack }: Props) {
  const ids = useId()
  const [seen, setSeen] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const invalid = validateField('login', 'email', email)

  // El campo recibe el foco al abrir; al enviar su botón desaparece y el foco pasa a "Volver a ingresar".
  useEffect(() => {
    if (sent) backRef.current?.focus()
    else emailRef.current?.focus()
  }, [sent])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (locked) return
    setSeen(true)
    if (invalid) return emailRef.current?.focus()
    onSubmit(email.trim())
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-[30px] font-medium leading-[1.05] tracking-[-0.035em]">Revisa tu correo</h1>
        <AuthBanner notice={RESET_SENT_NOTICE} />
        <BackButton buttonRef={backRef} locked={false} onBack={onBack} />
      </div>
    )
  }

  const bannerId = `${ids}-error`
  return (
    <form aria-labelledby={`${ids}-title`} className="flex flex-col gap-3" noValidate onSubmit={submit}>
      <div>
        <h1 className="font-display text-[30px] font-medium leading-[1.05] tracking-[-0.035em]" id={`${ids}-title`}>
          ¿Olvidaste tu contraseña?
        </h1>
        <p className="mt-1.5 text-ink-muted">Escribe tu correo y te enviamos un enlace para crear una contraseña nueva.</p>
      </div>
      <AuthField
        autoComplete="email"
        describedBy={error?.field === 'email' ? bannerId : undefined}
        error={seen ? invalid : null}
        id={`${ids}-email`}
        inputRef={emailRef}
        label="Correo"
        onBlur={() => email !== '' && setSeen(true)}
        onChange={onEmail}
        placeholder="nombre@correo.com"
        type="email"
        value={email}
      />
      {error && <AuthBanner id={bannerId} notice={error} />}
      <button aria-busy={locked || undefined} className="btn btn-primary h-12" disabled={locked} type="submit">
        Enviar enlace
      </button>
      <BackButton locked={locked} onBack={onBack} />
    </form>
  )
}

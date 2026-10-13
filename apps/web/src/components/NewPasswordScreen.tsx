'use client'

import { ArrowRight, CircleCheck, TimerOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { type AuthAction, type AuthNotice, describeAuthError } from '@/lib/auth-errors'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { useNavigate } from '@/lib/use-navigate'
import { useRecoverySession } from '@/lib/use-recovery-session'
import { AppShell } from './AppShell'
import { AuthBackdrop } from './AuthBackdrop'
import { BusyLink } from './BusyLink'
import { LoaderPortal } from './LoaderPortal'
import { Logo } from './Logo'
import { NewPasswordForm } from './NewPasswordForm'

/** Pausa para leer el aviso de éxito antes de llevar a la persona a sus proyectos. */
const REDIRECT_MS = 1800

const TITLE = 'font-display text-[30px] font-medium leading-[1.05] tracking-[-0.035em]'

/**
 * `/nueva-contrasena`: a donde llega el enlace del correo de "¿Olvidaste tu contraseña?". Es el único que habla con
 * Supabase aquí (`updateUser`); el formulario solo valida. Sin sesión de recuperación (enlace vencido, ya usado o abierto
 * sin enlace) dice que el enlace venció y lleva a /login. La contraseña no sale de la memoria: ni URL ni consola.
 */
export function NewPasswordScreen() {
  const recovery = useRecoverySession()
  const nav = useNavigate()
  const [error, setError] = useState<AuthNotice | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  // Candado síncrono: el estado de React llega tarde y un doble clic enviaría dos pedidos.
  const lock = useRef(false)
  const { go } = nav

  useEffect(() => {
    if (!done) return
    const timer = window.setTimeout(() => go('/proyectos', 'replace'), REDIRECT_MS)
    return () => window.clearTimeout(timer)
  }, [done, go])

  function finish(notice?: AuthNotice) {
    if (notice) setError(notice)
    lock.current = false
    setBusy(false)
  }

  async function save(password: string) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError(null)
    try {
      const { error: authError } = await supabaseBrowser().auth.updateUser({ password })
      if (authError) return finish(describeAuthError(authError, 'new-password'))
      setDone(true)
      finish()
    } catch (err) {
      finish(describeAuthError(err, 'new-password'))
    }
  }

  const onAction = (kind: AuthAction['kind']) => {
    if (kind === 'go-login') go('/login')
  }

  if (recovery === 'checking') return <LoaderPortal label="Verificando tu enlace" />

  return (
    <AppShell className="relative grid place-items-center px-3 py-6">
      <AuthBackdrop />
      <main className="glass relative flex w-[min(480px,94vw)] flex-col gap-4 rounded-[34px] p-[clamp(20px,4vw,34px)]">
        <Logo showName />
        {recovery === 'expired' ? (
          <div className="flex flex-col gap-3">
            <TimerOff aria-hidden className="text-brand" size={28} />
            <h1 className={TITLE}>El enlace venció o ya se usó</h1>
            <p className="text-ink-muted">Los enlaces para crear una contraseña nueva duran poco y sirven una sola vez. Pide otro desde «¿Olvidaste tu contraseña?» al ingresar.</p>
            <BusyLink className="btn btn-primary h-12" href="/login">
              Volver a ingresar
              <ArrowRight aria-hidden size={16} />
            </BusyLink>
          </div>
        ) : done ? (
          <div className="flex flex-col gap-3" role="status">
            <CircleCheck aria-hidden className="text-ok-dot" size={28} />
            <h1 className={TITLE}>Listo, tu contraseña ya cambió</h1>
            <p className="text-ink-muted">Te llevamos a tus proyectos.</p>
            <BusyLink className="btn btn-primary h-12" href="/proyectos">
              Ir a mis proyectos
              <ArrowRight aria-hidden size={16} />
            </BusyLink>
          </div>
        ) : (
          <NewPasswordForm error={error} locked={busy || nav.pending} onAction={onAction} onSubmit={save} />
        )}
      </main>
    </AppShell>
  )
}

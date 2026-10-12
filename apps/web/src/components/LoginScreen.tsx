'use client'

import { useRef, useState } from 'react'
import { type AuthAction, type AuthNotice, CONFIRM_EMAIL_NOTICE, SESSION_EXPIRED_NOTICE, describeAuthError } from '@/lib/auth-errors'
import type { AuthMode } from '@/lib/auth-form'
import type { LoginReason } from '@/lib/login-params'
import { normalizeName } from '@/lib/person-name'
import { safeNext } from '@/lib/safe-next'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { useNavigate } from '@/lib/use-navigate'
import { AppShell } from './AppShell'
import { AuthBackdrop } from './AuthBackdrop'
import { AuthTabs } from './AuthTabs'
import { LoginForm } from './LoginForm'
import { Logo } from './Logo'
import { RegisterForm } from './RegisterForm'

type Props = {
  /** Pestaña con la que abre (`/login?modo=crear` abre "Crear cuenta"). */
  initialMode: AuthMode
  /** `sesion`: se llegó porque la sesión venció. */
  reason: LoginReason | null
  /** Ruta a la que volver tras ingresar; se valida con `safeNext` al navegar. */
  next: string | null
}

/**
 * Pantalla de acceso: tarjeta de vidrio sobre una plantilla desenfocada, con las pestañas "Ingresar" y "Crear cuenta".
 * Aquí está lo que habla con Supabase; los formularios solo validan y avisan. El correo se comparte entre pestañas.
 */
export function LoginScreen({ initialMode, reason, next }: Props) {
  const nav = useNavigate()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<AuthNotice | null>(null)
  const [busy, setBusy] = useState(false)
  const [focusPassword, setFocusPassword] = useState(false)
  // Candado síncrono: el estado de React llega tarde y un doble clic enviaría dos pedidos.
  const lock = useRef(false)
  const locked = busy || nav.pending

  function changeMode(target: AuthMode, options: { focusPassword?: boolean } = {}) {
    setMode(target)
    setError(null)
    setFocusPassword(options.focusPassword === true)
  }

  function finish(notice?: AuthNotice) {
    if (notice) setError(notice)
    lock.current = false
    setBusy(false)
  }

  async function login(values: { email: string; password: string }) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError(null)
    try {
      const { error: authError } = await supabaseBrowser().auth.signInWithPassword(values)
      if (authError) return finish(describeAuthError(authError, 'login'))
      // Los botones siguen ocupados (`nav.pending`) hasta que llega la página de destino.
      nav.go(safeNext(next), 'replace')
      finish()
    } catch (err) {
      finish(describeAuthError(err, 'login'))
    }
  }

  async function register(values: { name: string; email: string; password: string }) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError(null)
    try {
      const { data, error: authError } = await supabaseBrowser().auth.signUp({
        email: values.email,
        password: values.password,
        options: { data: { name: normalizeName(values.name) } },
      })
      if (authError) return finish(describeAuthError(authError, 'register'))
      // Sin sesión es que el proyecto pide confirmar el correo: se explica qué hacer en vez de dejar la pantalla igual.
      if (!data.session) return finish(CONFIRM_EMAIL_NOTICE)
      nav.go('/bienvenida', 'replace')
      finish()
    } catch (err) {
      finish(describeAuthError(err, 'register'))
    }
  }

  const onAction = (kind: AuthAction['kind']) => {
    if (kind === 'go-login') changeMode('login', { focusPassword: true })
  }

  return (
    <AppShell className="relative grid place-items-center px-3 py-6">
      <AuthBackdrop />

      <main className="glass relative grid w-[min(1000px,94vw)] gap-3.5 rounded-[34px] p-3.5 desk:min-h-[min(560px,88dvh)] desk:grid-cols-[1.05fr_1fr]">
        <div className="relative hidden overflow-hidden rounded-3xl desk:block">
          {/* biome-ignore lint/performance/noImgElement: foto decorativa de una plantilla propia, ya optimizada. */}
          <img alt="" className="absolute inset-0 size-full object-cover" src="/templates/loft.jpg" />
          <div className="glass absolute inset-x-3.5 bottom-3.5 rounded-[20px] px-[18px] py-4">
            <p className="font-display text-[26px] font-medium leading-[1.1] tracking-[-0.03em]">Diseña. Prueba. Habita.</p>
            <p className="mt-1.5 text-sm text-ink-muted">Plantillas de viviendas y comercios listas para personalizar en 3D.</p>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-3 px-5 py-6 desk:px-[34px] desk:py-2.5">
          <Logo showName />
          <AuthTabs disabled={locked} mode={mode} onChange={changeMode}>
            {mode === 'login' ? (
              <LoginForm
                email={email}
                error={error}
                focusPassword={focusPassword}
                locked={locked}
                notice={reason === 'sesion' ? SESSION_EXPIRED_NOTICE : null}
                onAction={onAction}
                onEmail={setEmail}
                onSubmit={login}
              />
            ) : (
              <RegisterForm email={email} error={error} locked={locked} onAction={onAction} onEmail={setEmail} onSubmit={register} />
            )}
          </AuthTabs>
        </div>
      </main>
    </AppShell>
  )
}

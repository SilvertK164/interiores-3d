'use client'

import { type FormEvent, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Logo } from '@/components/Logo'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { useNavigate } from '@/lib/use-navigate'

const LABEL = 'mb-1.5 ml-1.5 block text-[13px] text-ink-muted'

export default function LoginPage() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const locked = busy || nav.pending

  async function submit(mode: 'login' | 'register', e: FormEvent) {
    e.preventDefault()
    if (locked) return
    setBusy(true)
    setMessage(null)
    const auth = supabaseBrowser().auth
    const { data, error } =
      mode === 'login' ? await auth.signInWithPassword({ email, password }) : await auth.signUp({ email, password })
    if (error) {
      setBusy(false)
      setMessage(mode === 'login' ? 'Correo o contraseña incorrectos.' : 'No pudimos crear tu cuenta. Revisa el correo y usa al menos 6 caracteres.')
      return
    }
    if (!data.session) {
      setBusy(false)
      setMessage('Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve a ingresar.')
      return
    }
    // Los botones siguen ocupados (`nav.pending`) hasta que llega /proyectos.
    nav.go('/proyectos', 'replace')
    setBusy(false)
  }

  return (
    <AppShell className="relative grid place-items-center overflow-hidden">
      {/* Fondo: una plantilla desenfocada con un velo claro. */}
      <img alt="" aria-hidden className="absolute -inset-10 h-[calc(100%+5rem)] w-[calc(100%+5rem)] max-w-none object-cover blur-[30px] saturate-[1.1]" src="/templates/cafe.jpg" />
      <div aria-hidden className="absolute inset-0 bg-canvas/55" />

      <main className="glass relative grid w-[min(1000px,94vw)] gap-3.5 rounded-[34px] p-3.5 desk:h-[min(560px,88dvh)] desk:grid-cols-[1.05fr_1fr]">
        <div className="relative hidden overflow-hidden rounded-3xl desk:block">
          <img alt="" className="absolute inset-0 size-full object-cover" src="/templates/loft.jpg" />
          <div className="glass absolute inset-x-3.5 bottom-3.5 rounded-[20px] px-[18px] py-4">
            <p className="font-display text-[26px] font-medium leading-[1.1] tracking-[-0.03em]">Diseña. Prueba. Habita.</p>
            <p className="mt-1.5 text-sm text-ink-muted">Plantillas de viviendas y comercios listas para personalizar en 3D.</p>
          </div>
        </div>

        <form className="flex flex-col justify-center gap-3.5 px-5 py-6 desk:px-[34px] desk:py-2.5" onSubmit={(e) => submit('login', e)}>
          <Logo showName />
          <div>
            <h1 className="font-display text-[34px] font-medium leading-[1.05] tracking-[-0.035em]">Te damos la bienvenida</h1>
            <p className="mt-1.5 text-ink-muted">Ingresa a tu cuenta para abrir tus proyectos.</p>
          </div>
          <div>
            <label className={LABEL} htmlFor="login-email">
              Correo
            </label>
            <input
              autoComplete="email"
              className="field"
              id="login-email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@correo.com"
              required
              type="email"
              value={email}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="login-password">
              Contraseña
            </label>
            <input
              autoComplete="current-password"
              className="field"
              id="login-password"
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              required
              type="password"
              value={password}
            />
          </div>
          {message && (
            <p className="text-sm text-destructive" role="status">
              {message}
            </p>
          )}
          <button aria-busy={locked || undefined} className="btn btn-primary h-12" disabled={locked} type="submit">
            Ingresar
          </button>
          <p className="text-center text-sm text-ink-muted">
            ¿Primera vez?{' '}
            <button
              className="focus-ring cursor-pointer rounded font-medium text-brand disabled:cursor-not-allowed disabled:opacity-60"
              disabled={locked}
              onClick={(e) => submit('register', e)}
              type="button"
            >
              Crear cuenta
            </button>
          </p>
        </form>
      </main>
    </AppShell>
  )
}

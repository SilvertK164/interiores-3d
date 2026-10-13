'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(mode: 'login' | 'register', e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const auth = supabaseBrowser().auth
    const { data, error } =
      mode === 'login' ? await auth.signInWithPassword({ email, password }) : await auth.signUp({ email, password })
    setBusy(false)
    if (error) {
      setMessage(mode === 'login' ? 'Correo o contraseña incorrectos.' : 'No pudimos crear tu cuenta. Revisa el correo y usa al menos 6 caracteres.')
      return
    }
    if (!data.session) {
      setMessage('Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve a ingresar.')
      return
    }
    router.replace('/proyectos')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Ingresa a tus proyectos</h1>
      <form className="flex flex-col gap-3" onSubmit={(e) => submit('login', e)}>
        <label className="flex flex-col gap-1 text-sm">
          Correo
          <input className="rounded-md bg-secondary px-3 py-2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Contraseña
          <input className="rounded-md bg-secondary px-3 py-2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {message && <p role="status" className="text-sm text-destructive">{message}</p>}
        <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground disabled:opacity-60" disabled={busy} type="submit">
          Ingresar
        </button>
        <button className="rounded-md bg-secondary px-3 py-2 disabled:opacity-60" disabled={busy} type="button" onClick={(e) => submit('register', e)}>
          Crear cuenta
        </button>
      </form>
    </main>
  )
}

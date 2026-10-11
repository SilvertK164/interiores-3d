'use client'

import type { ProjectSummary } from '@interiores/contract'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { api } from '@/lib/api/instance'
import { friendlyMessage } from '@/lib/api/errors'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { useSession } from '@/lib/use-session'

export default function ProjectsPage() {
  const router = useRouter()
  const { session, loading } = useSession()
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'vivienda' | 'comercio'>('vivienda')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!session) return router.replace('/login')
    api.listProjects().then(setProjects, (e) => setError(friendlyMessage(e)))
  }, [loading, session, router])

  async function create(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const created = await api.createProject({ name, kind })
      router.push(`/proyectos/${created.id}`)
    } catch (err) {
      setError(friendlyMessage(err))
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mis proyectos</h1>
        <button className="text-sm underline" onClick={() => supabaseBrowser().auth.signOut().then(() => router.replace('/login'))} type="button">
          Salir
        </button>
      </header>
      <form className="flex flex-wrap items-end gap-3" onSubmit={create}>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Nombre del proyecto
          <input className="rounded-md bg-secondary px-3 py-2" maxLength={80} required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tipo
          <select className="rounded-md bg-secondary px-3 py-2" value={kind} onChange={(e) => setKind(e.target.value as 'vivienda' | 'comercio')}>
            <option value="vivienda">Vivienda</option>
            <option value="comercio">Comercio</option>
          </select>
        </label>
        <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" type="submit">
          Crear proyecto
        </button>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {projects === null ? (
        <p className="text-muted-foreground">Cargando tus proyectos…</p>
      ) : projects.length === 0 ? (
        <p className="text-muted-foreground">Aún no tienes proyectos. Crea el primero arriba.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3" href={`/proyectos/${p.id}`}>
                <span className="font-medium">{p.name}</span>
                <span className="text-sm text-muted-foreground">{p.kind ?? 'sin tipo'}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

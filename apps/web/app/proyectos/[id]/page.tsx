'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { use, useEffect } from 'react'
import { useSession } from '@/lib/use-session'

// El editor usa WebGPU y el DOM: nunca se renderiza en el servidor.
const ProjectEditor = dynamic(() => import('@/editor/ProjectEditor'), {
  ssr: false,
  loading: () => <p className="p-6 text-muted-foreground">Cargando el editor…</p>,
})

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { session, loading } = useSession()
  useEffect(() => {
    if (!loading && !session) router.replace('/login')
  }, [loading, session, router])
  if (loading || !session) return <p className="p-6 text-muted-foreground">Cargando…</p>
  return <ProjectEditor projectId={id} />
}

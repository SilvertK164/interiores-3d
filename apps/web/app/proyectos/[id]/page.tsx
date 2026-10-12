'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { use, useEffect, useRef } from 'react'
import { Loader } from '@/components/Loader'
import { sessionGate } from '@/lib/session-gate'
import { useSession } from '@/lib/use-session'

const OPENING = 'Abriendo tu proyecto'

// El editor usa WebGPU y el DOM: nunca se renderiza en el servidor.
const ProjectEditor = dynamic(() => import('@/editor/ProjectEditor'), {
  ssr: false,
  loading: () => <Loader fullscreen label={OPENING} size="lg" />,
})

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { session, loading } = useSession()
  // Si la sesión vence con el editor abierto no se desmonta: lo no guardado se perdería (lo explica el aviso del guardador).
  const hadSession = useRef(false)
  if (session) hadSession.current = true
  const gate = sessionGate({ loading, hasSession: Boolean(session), hadSession: hadSession.current })
  useEffect(() => {
    if (gate === 'login') router.replace('/login')
  }, [gate, router])
  if (gate !== 'show') return <Loader fullscreen label={OPENING} size="lg" />
  return <ProjectEditor projectId={id} />
}

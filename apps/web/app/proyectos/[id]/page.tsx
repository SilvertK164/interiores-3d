'use client'

import dynamic from 'next/dynamic'
import { use, useEffect } from 'react'
import { LoaderPortal } from '@/components/LoaderPortal'
import { sessionGate } from '@/lib/session-gate'
import { useLoginRedirect } from '@/lib/use-login-redirect'
import { useSession } from '@/lib/use-session'

// El editor usa WebGPU y el DOM: nunca se renderiza en el servidor.
const ProjectEditor = dynamic(() => import('@/editor/ProjectEditor'), {
  ssr: false,
  loading: () => <LoaderPortal />,
})

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const toLogin = useLoginRedirect()
  const { session, loading, hadSession } = useSession()
  // Si la sesión vence con el editor abierto no se desmonta: lo no guardado se perdería (lo explica el aviso del guardador).
  const gate = sessionGate({ loading, hasSession: Boolean(session), hadSession })
  // Sin sesión desde el principio: a ingresar, y al volver se abre este mismo proyecto (`next`).
  useEffect(() => {
    if (gate === 'login') toLogin()
  }, [gate, toLogin])
  if (gate !== 'show') return <LoaderPortal />
  return <ProjectEditor projectId={id} />
}

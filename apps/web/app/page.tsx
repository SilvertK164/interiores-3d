'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { LoaderPortal } from '@/components/LoaderPortal'
import { APP_NAME } from '@/lib/ui-text'
import { useSession } from '@/lib/use-session'

export default function Home() {
  const router = useRouter()
  const { session, loading } = useSession()
  useEffect(() => {
    if (!loading) router.replace(session ? '/proyectos' : '/login')
  }, [loading, session, router])
  return <LoaderPortal label={`Abriendo ${APP_NAME}`} />
}

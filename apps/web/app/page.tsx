'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader } from '@/components/Loader'
import { useSession } from '@/lib/use-session'

export default function Home() {
  const router = useRouter()
  const { session, loading } = useSession()
  useEffect(() => {
    if (!loading) router.replace(session ? '/proyectos' : '/login')
  }, [loading, session, router])
  return <Loader fullscreen />
}

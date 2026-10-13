import { AppShell } from '@/components/AppShell'
import { ProjectsPageSkeleton } from '@/components/Skeleton'

/** Se muestra al instante al entrar a /proyectos mientras llega la página (misma maqueta que la real, sin mover nada). */
export default function Loading() {
  return (
    <AppShell>
      <ProjectsPageSkeleton />
    </AppShell>
  )
}

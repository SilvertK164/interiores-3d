'use client'

import type { ProjectSummary } from '@interiores/contract'
import { Clock, Folder, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { AppShell } from '@/components/AppShell'
import { NewProjectDialog } from '@/components/NewProjectDialog'
import { ProjectsSection } from '@/components/ProjectsSection'
import { HeaderChipsSkeleton, ProjectsPageSkeleton } from '@/components/Skeleton'
import { TemplateGallery } from '@/components/TemplateGallery'
import { ApiError } from '@/lib/api/client'
import { friendlyMessage } from '@/lib/api/errors'
import { api } from '@/lib/api/instance'
import { type NewProjectPreset, parseNewProjectParam } from '@/lib/new-project-preset'
import { greetingName, savedName } from '@/lib/person-name'
import { filterProjects, filterTemplates } from '@/lib/project-search'
import { CHIPS_ROW, GREETING_ROW, PROJECTS_FRAME, SECTION, SECTION_TITLE } from '@/lib/ui-layout'
import { greetingForHour, pluralProjects, whenLabel } from '@/lib/ui-text'
import { useLoginRedirect } from '@/lib/use-login-redirect'
import { useSession } from '@/lib/use-session'
import { useSignOut } from '@/lib/use-sign-out'

const CHIP = 'chip glass bg-white/70'

export default function ProjectsPage() {
  const toLogin = useLoginRedirect()
  const { leaving, signingOut, signOut } = useSignOut()
  const { session, loading, hadSession } = useSession()
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<{ open: boolean; preset: NewProjectPreset | null }>({ open: false, preset: null })

  const load = useCallback(() => {
    api.listProjects().then(
      (list) => {
        setProjects(list)
        setError(null)
      },
      (e) => {
        // La API dice que la sesión no sirve: a ingresar, y al volver se retoma esta pantalla.
        if (e instanceof ApiError && e.status === 401) return toLogin({ reason: 'sesion' })
        setError(friendlyMessage(e))
      },
    )
  }, [toLogin])

  useEffect(() => {
    // Al salir a propósito (`leaving`) la sesión también desaparece, pero eso no es una sesión vencida.
    if (loading || leaving) return
    if (!session) return toLogin(hadSession ? { reason: 'sesion' } : {})
    load()
  }, [loading, leaving, session, hadSession, toLogin, load])

  // `?nuevo=vivienda|comercio|blanco` (viene de /bienvenida): abre el diálogo con eso marcado y limpia la URL.
  const ready = !loading && session !== null
  useEffect(() => {
    if (!ready) return
    const preset = parseNewProjectParam(window.location.search)
    if (!preset) return
    setDialog({ open: true, preset })
    window.history.replaceState(null, '', window.location.pathname)
  }, [ready])

  const openDialog = (templateId: string | null = null) => setDialog({ open: true, preset: templateId ? { templateId } : null })
  const closeDialog = () => setDialog((d) => ({ ...d, open: false }))

  if (loading || !session) {
    return (
      <AppShell>
        <ProjectsPageSkeleton />
      </AppShell>
    )
  }

  // La fecha y la hora solo se usan aquí, después de cargar la sesión (en el navegador): no hay diferencias con el servidor.
  const now = new Date()
  const email = session.user.email
  const name = greetingName(session.user)
  const visible = projects ? filterProjects(projects, query) : []
  const templates = filterTemplates(query)
  const lastChange = projects?.length
    ? projects.reduce((a, b) => (Date.parse(b.updatedAt) > Date.parse(a.updatedAt) ? b : a)).updatedAt
    : null

  return (
    <AppShell>
      <div className={PROJECTS_FRAME}>
        <AppHeader
          email={email}
          name={savedName(session.user)}
          onNew={() => openDialog()}
          onQuery={setQuery}
          onSignOut={signOut}
          query={query}
          signingOut={signingOut}
        />

        <div className={GREETING_ROW}>
          <div>
            <p className="text-sm text-ink-muted">{greetingForHour(now.getHours())}</p>
            <h1 className="mt-0.5 font-display text-[clamp(28px,3.6vw,46px)] font-medium leading-[1.05] tracking-[-0.035em]">
              {name ? (
                <>
                  <span className="font-bold">{name},</span>{' '}
                  <span className="font-light text-brand">¿qué vamos a armar hoy?</span>
                </>
              ) : (
                <span className="font-light text-brand">¿Qué vamos a armar hoy?</span>
              )}
            </h1>
          </div>
          {projects === null && !error && <HeaderChipsSkeleton />}
          {projects && projects.length > 0 && lastChange && (
            <div className={CHIPS_ROW}>
              <span className={CHIP}>
                <Folder aria-hidden size={14} />
                {pluralProjects(projects.length)}
              </span>
              <span className={CHIP}>
                <Clock aria-hidden size={14} />
                {whenLabel('Último cambio', lastChange, now)}
              </span>
            </div>
          )}
        </div>

        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>Tus proyectos</h2>
          <ProjectsSection
            error={error}
            now={now}
            onNew={() => openDialog()}
            projects={projects}
            query={query}
            visible={visible}
          />
        </section>

        <section className={SECTION}>
          <div className="flex items-baseline justify-between">
            <h2 className={SECTION_TITLE}>Empieza desde una plantilla</h2>
            <button className="focus-ring cursor-pointer rounded text-sm font-medium text-brand" onClick={() => openDialog()} type="button">
              Ver todas
            </button>
          </div>
          {templates.length > 0 ? (
            <TemplateGallery onPick={openDialog} onSeeAll={() => openDialog()} templates={templates} />
          ) : (
            <p className="glass grid min-h-[96px] place-items-center rounded-[20px] p-4 text-center text-sm text-ink-muted">
              <span className="inline-flex items-center gap-2">
                <Search aria-hidden size={16} />
                Ninguna plantilla coincide con «{query.trim()}».
              </span>
            </p>
          )}
        </section>
      </div>

      <NewProjectDialog onClose={closeDialog} onPartial={load} open={dialog.open} preset={dialog.preset} />
    </AppShell>
  )
}

'use client'

import type { ProjectSummary } from '@interiores/contract'
import { Clock, Folder, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { AppShell } from '@/components/AppShell'
import { NewProjectDialog } from '@/components/NewProjectDialog'
import { ProjectsSection } from '@/components/ProjectsSection'
import { HeaderChipsSkeleton, ProjectsPageSkeleton } from '@/components/Skeleton'
import { TemplateGallery } from '@/components/TemplateGallery'
import { friendlyMessage } from '@/lib/api/errors'
import { api } from '@/lib/api/instance'
import { filterProjects, filterTemplates } from '@/lib/project-search'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { CHIPS_ROW, GREETING_ROW, PROJECTS_FRAME, SECTION, SECTION_TITLE } from '@/lib/ui-layout'
import { useNavigate } from '@/lib/use-navigate'
import { greetingForHour, nameFromEmail, pluralProjects, whenLabel } from '@/lib/ui-text'
import { useSession } from '@/lib/use-session'

const CHIP = 'chip glass bg-white/70'

export default function ProjectsPage() {
  const router = useRouter()
  const nav = useNavigate()
  const [leaving, setLeaving] = useState(false)
  const { session, loading } = useSession()
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<{ open: boolean; templateId: string | null }>({ open: false, templateId: null })

  const load = useCallback(() => {
    api.listProjects().then(
      (list) => {
        setProjects(list)
        setError(null)
      },
      (e) => setError(friendlyMessage(e)),
    )
  }, [])

  useEffect(() => {
    if (loading) return
    if (!session) return router.replace('/login')
    load()
  }, [loading, session, router, load])

  const openDialog = (templateId: string | null = null) => setDialog({ open: true, templateId })
  const closeDialog = () => setDialog((d) => ({ ...d, open: false }))
  const signOut = async () => {
    if (leaving || nav.pending) return
    setLeaving(true)
    try {
      await supabaseBrowser().auth.signOut()
      nav.go('/login', 'replace')
    } catch {
      setLeaving(false)
    }
  }

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
  const name = nameFromEmail(email)
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
          onNew={() => openDialog()}
          onQuery={setQuery}
          onSignOut={signOut}
          query={query}
          signingOut={leaving || nav.pending}
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

      <NewProjectDialog onClose={closeDialog} onPartial={load} open={dialog.open} presetTemplateId={dialog.templateId} />
    </AppShell>
  )
}

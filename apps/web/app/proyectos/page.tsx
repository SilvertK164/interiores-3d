'use client'

import type { ProjectSummary } from '@interiores/contract'
import { Clock, Folder, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { AppShell } from '@/components/AppShell'
import { NewProjectDialog } from '@/components/NewProjectDialog'
import { ProjectsSection } from '@/components/ProjectsSection'
import { TemplateGallery } from '@/components/TemplateGallery'
import { friendlyMessage } from '@/lib/api/errors'
import { api } from '@/lib/api/instance'
import { filterProjects, filterTemplates } from '@/lib/project-search'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { greetingForHour, nameFromEmail, pluralProjects, whenLabel } from '@/lib/ui-text'
import { useSession } from '@/lib/use-session'

const H2 = 'font-display text-[19px] font-bold tracking-[-0.02em]'
const CHIP = 'chip glass bg-white/70'

export default function ProjectsPage() {
  const router = useRouter()
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
  const signOut = () => supabaseBrowser().auth.signOut().then(() => router.replace('/login'))

  if (loading || !session) return <AppShell><p className="p-6 text-ink-muted">Cargando…</p></AppShell>

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
      <div className="mx-auto flex min-h-dvh max-w-[1360px] flex-col gap-4 px-[clamp(20px,4vw,56px)] pb-6 pt-[18px] desk:grid desk:h-dvh desk:min-h-[620px] desk:grid-rows-[auto_auto_minmax(0,1fr)_minmax(0,1fr)] desk:gap-3.5 desk:overflow-hidden desk:pb-[22px]">
        <AppHeader email={email} onNew={() => openDialog()} onQuery={setQuery} onSignOut={signOut} query={query} />

        <div className="flex items-end gap-5 pt-1">
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
          {projects && projects.length > 0 && lastChange && (
            <div className="ml-auto hidden gap-2 pb-1.5 desk:flex">
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

        <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5">
          <h2 className={H2}>Tus proyectos</h2>
          <ProjectsSection
            error={error}
            now={now}
            onNew={() => openDialog()}
            projects={projects}
            query={query}
            visible={visible}
          />
        </section>

        <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5">
          <div className="flex items-baseline justify-between">
            <h2 className={H2}>Empieza desde una plantilla</h2>
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

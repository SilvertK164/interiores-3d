'use client'

import { type FormEvent, useEffect, useRef, useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { AppShell } from '@/components/AppShell'
import { LoaderPortal } from '@/components/LoaderPortal'
import { api } from '@/lib/api/instance'
import type { AnalysisCandidate } from '@/lib/lab/analysis-catalog'
import { analysisToDefinition } from '@/lib/lab/analysis-to-definition'
import { describeLabError } from '@/lib/lab/describe-error'
import { labProjectName, parseKnownWidth } from '@/lib/lab/form-helpers'
import { LabError } from '@/lib/lab/lab-error'
import { showEditorPathTool } from '@/lib/lab/lab-view'
import { SAMPLE_ANALYSIS } from '@/lib/lab/sample-analysis'
import type { RoomAnalysis } from '@/lib/lab/schema'
import { savedName } from '@/lib/person-name'
import { TEMPLATE_DEFINITIONS } from '@/lib/templates'
import { type CreateFromTemplateResult, retrySaveTemplate } from '@/lib/templates/create-from-template'
import type { TemplateDefinition } from '@/lib/templates/types'
import { useLoginRedirect } from '@/lib/use-login-redirect'
import { useNavigate } from '@/lib/use-navigate'
import { useSession } from '@/lib/use-session'
import { useSignOut } from '@/lib/use-sign-out'
import { EditorPathTool } from './EditorPathTool'
import type { Notice, NoticePlace } from './LabNotice'
import { type Busy, PhotoCard } from './PhotoCard'
import { ResultsCard } from './ResultsCard'

const SAVE_FAILED = 'El proyecto se creó, pero no pudimos guardar la escena. Puedes reintentar.'
const FRAME = 'mx-auto flex min-h-dvh max-w-[1100px] flex-col gap-5 px-[clamp(20px,4vw,56px)] pb-12 pt-[18px]'

/** El aviso para la pantalla; del error inesperado, el detalle técnico queda en la consola del navegador. */
function noticeFor(error: unknown, place: NoticePlace): Notice {
  if (!(error instanceof LabError)) console.error('[escena-desde-foto]', error)
  return { text: describeLabError(error), place }
}

/** «Escena desde una foto»: del análisis de una foto al proyecto en el editor. */
export default function EscenaDesdeFotoPage() {
  const nav = useNavigate()
  const toLogin = useLoginRedirect()
  const { leaving, signingOut, signOut } = useSignOut()
  const { session, loading, hadSession } = useSession()
  const [file, setFile] = useState<File | null>(null)
  const [widthText, setWidthText] = useState('')
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null)
  // Las piezas del catálogo que se le ofrecieron al análisis: con ellas se escriben los nombres de la tabla.
  const [candidates, setCandidates] = useState<AnalysisCandidate[]>([])
  const [fromExample, setFromExample] = useState(false)
  const [modelWarnings, setModelWarnings] = useState<string[]>([])
  const [notice, setNotice] = useState<Notice | null>(null)
  const [pending, setPending] = useState<CreateFromTemplateResult | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  // Candado síncrono: el estado de React llega tarde y un doble clic crearía dos proyectos.
  const lock = useRef(false)

  useEffect(() => {
    // Sin sesión desde el principio no hay aviso; si se perdió estando aquí, /login explica que venció. Salir a propósito no es perderla.
    if (loading || leaving) return
    if (!session) toLogin(hadSession ? { reason: 'sesion' } : {})
  }, [loading, leaving, session, hadSession, toLogin])

  function start(next: Exclude<Busy, null>): boolean {
    if (lock.current) return false
    lock.current = true
    setBusy(next)
    setNotice(null)
    setPending(null)
    return true
  }
  function release() {
    lock.current = false
    setBusy(null)
  }

  /** Las piezas del catálogo local que se le ofrecen al análisis. Pascal se carga recién aquí (o al abrir el editor), nunca antes. */
  async function loadCandidates(): Promise<AnalysisCandidate[]> {
    const { analysisCatalog } = await import('@/editor/lab-scene')
    const { candidates: loaded } = await analysisCatalog()
    setCandidates(loaded)
    return loaded
  }

  async function analyze(event: FormEvent) {
    event.preventDefault()
    if (lock.current) return
    if (!file) return setNotice({ text: 'Elige primero la foto del ambiente.', place: 'form' })
    start('analizando')
    try {
      const knownWidthM = parseKnownWidth(widthText)
      setAnalysis(await api.analyzeRoom(file, { knownWidthM, catalog: await loadCandidates() }))
      setFromExample(false)
      setModelWarnings([])
    } catch (error) {
      setNotice(noticeFor(error, 'form'))
    } finally {
      release()
    }
  }

  /** Arma la definición (con `build`), la guarda como proyecto nuevo y abre el editor. Pascal se carga recién aquí. */
  async function openInEditor(build: (warn: (message: string) => void) => TemplateDefinition | Promise<TemplateDefinition>, place: NoticePlace, label?: string) {
    if (!start('abriendo')) return
    const warnings: string[] = []
    let going = false
    try {
      const definition = await build((message) => warnings.push(message))
      const { openDefinitionAsProject } = await import('@/editor/lab-scene')
      const result = await openDefinitionAsProject(definition, {
        api,
        name: labProjectName(new Date(), label),
        navigate: (href) => nav.go(href),
      })
      if (result.saved) going = true // el candado sigue puesto: la página se reemplaza por el editor
      else {
        setPending(result)
        setNotice({ text: SAVE_FAILED, place })
      }
    } catch (error) {
      setNotice(noticeFor(error, place))
    } finally {
      setModelWarnings(warnings)
      if (!going) release()
    }
  }

  /** El ambiente de la foto: las piezas se resuelven contra el catálogo local, que se carga recién aquí (Pascal no se importa antes). */
  const modelAnalysis = (current: RoomAnalysis) => async (warn: (message: string) => void) => {
    const { analysisCatalog } = await import('@/editor/lab-scene')
    const { pieces } = await analysisCatalog()
    return analysisToDefinition(current, (id) => pieces.get(id), { knownWidthM: parseKnownWidth(widthText), warn })
  }

  async function tryExample() {
    if (!start('analizando')) return
    try {
      await loadCandidates()
    } catch (error) {
      return setNotice(noticeFor(error, 'form'))
    } finally {
      release()
    }
    setAnalysis(SAMPLE_ANALYSIS)
    setFromExample(true)
    void openInEditor(modelAnalysis(SAMPLE_ANALYSIS), 'results')
  }

  async function retry() {
    const place = notice?.place ?? 'results'
    if (!pending || !start('abriendo')) return
    const result = await retrySaveTemplate(api, pending)
    if (result.saved) return nav.go(`/proyectos/${result.project.id}`)
    setPending(result)
    setNotice(noticeFor(result.error, place))
    release()
  }

  // Solo fuera de producción (o con NEXT_PUBLIC_E2E=1): Next reemplaza estos dos valores al compilar si se escriben tal cual.
  const loft = showEditorPathTool({ nodeEnv: process.env.NODE_ENV, e2e: process.env.NEXT_PUBLIC_E2E })
    ? TEMPLATE_DEFINITIONS.find((definition) => definition.id === 'loft')
    : undefined

  if (loading || !session) return <LoaderPortal label="Abriendo la escena desde una foto" />

  return (
    <AppShell>
      <div className={FRAME}>
        <AppHeader current="escena-desde-foto" email={session.user.email} name={savedName(session.user)} onSignOut={signOut} signingOut={signingOut} />

        <div className="flex flex-col gap-2 pt-3">
          <h1 className="m-0 font-display text-[clamp(28px,3.6vw,44px)] font-bold leading-[1.05] tracking-[-0.035em]">Escena desde una foto</h1>
          <p className="m-0 max-w-[58ch] text-[15px] text-ink-muted">
            Sube la foto de un ambiente y te proponemos qué muebles del catálogo hay y dónde. Después la llevas a un proyecto nuevo y sigues editando.
          </p>
        </div>

        <div className="grid items-start gap-5 desk:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <PhotoCard
            busy={busy}
            file={file}
            notice={notice}
            onExample={() => void tryExample()}
            onFile={setFile}
            onRetry={() => void retry()}
            onSubmit={analyze}
            onWidth={setWidthText}
            pending={pending}
            widthText={widthText}
          />
          <ResultsCard
            analysis={analysis}
            busy={busy}
            candidates={candidates}
            fromExample={fromExample}
            modelWarnings={modelWarnings}
            notice={notice}
            onOpen={() => analysis && void openInEditor(modelAnalysis(analysis), 'results')}
            onRetry={() => void retry()}
            pending={pending}
          />
        </div>

        {loft && (
          <EditorPathTool
            busy={busy}
            notice={notice}
            onOpenLoft={() => void openInEditor(() => loft, 'tool', 'prueba Loft')}
            onRetry={() => void retry()}
            pending={pending}
          />
        )}
      </div>
    </AppShell>
  )
}

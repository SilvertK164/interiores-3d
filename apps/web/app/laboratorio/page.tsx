'use client'

import { ArrowRight, FlaskConical, LoaderCircle, ScanSearch, Wrench } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { LoaderPortal } from '@/components/LoaderPortal'
import { api } from '@/lib/api/instance'
import { analysisToDefinition } from '@/lib/lab/analysis-to-definition'
import { analyzeRoom } from '@/lib/lab/analyze-room'
import { describeLabError } from '@/lib/lab/describe-error'
import { labProjectName, normalizeServiceUrl, parseKnownWidth, readSavedServiceUrl, saveServiceUrl } from '@/lib/lab/form-helpers'
import { LabError, LabNotImplementedError } from '@/lib/lab/lab-error'
import { SAMPLE_ANALYSIS } from '@/lib/lab/sample-analysis'
import type { RoomAnalysis } from '@/lib/lab/schema'
import { TEMPLATE_DEFINITIONS } from '@/lib/templates'
import { type CreateFromTemplateResult, retrySaveTemplate } from '@/lib/templates/create-from-template'
import type { TemplateDefinition } from '@/lib/templates/types'
import { useLoginRedirect } from '@/lib/use-login-redirect'
import { useSession } from '@/lib/use-session'
import { PiecesTable } from './PiecesTable'
import { WarningList } from './WarningList'

const DEFAULT_URL = process.env.NEXT_PUBLIC_LAB_PHOTO_URL ?? 'http://localhost:8000'
const PRIMARY = 'inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60'
const SECONDARY = 'inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 disabled:opacity-60'
const FIELD = 'rounded-md bg-secondary px-3 py-2'
const SAVE_FAILED = 'El proyecto se creó, pero no pudimos guardar la escena. Puedes reintentar.'

type Notice = { kind: 'info' | 'error'; text: string }
type Busy = 'analizando' | 'abriendo' | null

/** El aviso para la pantalla; del error inesperado, el detalle técnico queda en la consola del navegador. */
function noticeFor(error: unknown): Notice {
  if (!(error instanceof LabError)) console.error('[laboratorio]', error)
  return { kind: error instanceof LabNotImplementedError ? 'info' : 'error', text: describeLabError(error) }
}

export default function LaboratorioPage() {
  const router = useRouter()
  const toLogin = useLoginRedirect()
  const { session, loading, hadSession } = useSession()
  const [file, setFile] = useState<File | null>(null)
  const [widthText, setWidthText] = useState('')
  const [serviceUrl, setServiceUrl] = useState(DEFAULT_URL)
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null)
  const [fromExample, setFromExample] = useState(false)
  const [modelWarnings, setModelWarnings] = useState<string[]>([])
  const [notice, setNotice] = useState<Notice | null>(null)
  const [pending, setPending] = useState<CreateFromTemplateResult | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  // Candado síncrono: el estado de React llega tarde y un doble clic crearía dos proyectos.
  const lock = useRef(false)

  useEffect(() => {
    // Sin sesión desde el principio no hay aviso; si se perdió estando aquí, /login explica que venció.
    if (!loading && !session) toLogin(hadSession ? { reason: 'sesion' } : {})
  }, [loading, session, hadSession, toLogin])
  useEffect(() => {
    const saved = readSavedServiceUrl()
    if (saved) setServiceUrl(saved)
  }, [])

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

  async function analyze(e: FormEvent) {
    e.preventDefault()
    if (lock.current) return
    if (!file) return setNotice({ kind: 'error', text: 'Elige primero la foto del ambiente.' })
    start('analizando')
    try {
      const baseUrl = normalizeServiceUrl(serviceUrl)
      const knownWidthM = parseKnownWidth(widthText)
      saveServiceUrl(baseUrl)
      setAnalysis(await analyzeRoom(file, { baseUrl, knownWidthM }))
      setFromExample(false)
      setModelWarnings([])
    } catch (error) {
      setNotice(noticeFor(error))
    } finally {
      release()
    }
  }

  /** Arma la definición (con `build`), la guarda como proyecto nuevo y abre el editor. Pascal se carga recién aquí. */
  async function openInEditor(build: (warn: (message: string) => void) => TemplateDefinition, label?: string) {
    if (!start('abriendo')) return
    const warnings: string[] = []
    let leaving = false
    try {
      const definition = build((message) => warnings.push(message))
      const { openDefinitionAsProject } = await import('@/editor/lab-scene')
      const result = await openDefinitionAsProject(definition, {
        api,
        name: labProjectName(new Date(), label),
        navigate: router.push,
      })
      if (result.saved) leaving = true // el candado sigue puesto: la página se reemplaza por el editor
      else {
        setPending(result)
        setNotice({ kind: 'error', text: SAVE_FAILED })
      }
    } catch (error) {
      setNotice(noticeFor(error))
    } finally {
      setModelWarnings(warnings)
      if (!leaving) release()
    }
  }

  const modelAnalysis = (current: RoomAnalysis) => (warn: (message: string) => void) =>
    analysisToDefinition(current, { knownWidthM: parseKnownWidth(widthText), warn })

  function tryExample() {
    if (lock.current) return
    setAnalysis(SAMPLE_ANALYSIS)
    setFromExample(true)
    void openInEditor(modelAnalysis(SAMPLE_ANALYSIS))
  }

  async function retry() {
    if (!pending || !start('abriendo')) return
    const result = await retrySaveTemplate(api, pending)
    if (result.saved) return router.push(`/proyectos/${result.project.id}`)
    setPending(result)
    setNotice(noticeFor(result.error))
    release()
  }

  const loft = TEMPLATE_DEFINITIONS.find((d) => d.id === 'loft')

  if (loading || !session) return <LoaderPortal label="Abriendo el laboratorio" />

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <FlaskConical aria-hidden size={24} />
            Laboratorio de Victoria
          </h1>
          <p className="text-muted-foreground">Modelado a partir de fotos con Pascal</p>
        </div>
        <Link className="text-sm underline" href="/proyectos">
          Mis proyectos
        </Link>
      </header>

      <p className="text-sm text-muted-foreground">
        Sube la foto de un ambiente y el servicio de TP3 propone qué muebles hay y dónde. Aquí ves lo que devuelve y, con «Abrir en el editor», lo llevas a un
        proyecto nuevo. Los pasos para tener TP3 corriendo están en lab/README.md.
      </p>

      <form className="flex flex-col gap-4" onSubmit={analyze}>
        <label className="flex flex-col gap-1 text-sm">
          Foto del ambiente (JPG, PNG o WebP)
          <input accept="image/jpeg,image/png,image/webp" className={FIELD} onChange={(e) => setFile(e.target.files?.[0] ?? null)} type="file" />
          <span className="text-xs text-muted-foreground">
            La foto va a tu servicio de TP3 y de ahí a Gemini (Google AI Studio). En el nivel gratuito Google puede usar el contenido para mejorar sus
            productos: conviene evitar fotos privadas.
          </span>
        </label>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Ancho conocido del ambiente, en metros (opcional)
            <input className={FIELD} inputMode="decimal" onChange={(e) => setWidthText(e.target.value)} placeholder="4,5" value={widthText} />
          </label>
          <label className="flex min-w-64 flex-1 flex-col gap-1 text-sm">
            Dirección del servicio de TP3
            <input autoComplete="off" className={FIELD} inputMode="url" onChange={(e) => setServiceUrl(e.target.value)} spellCheck={false} value={serviceUrl} />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button aria-busy={busy === 'analizando'} className={PRIMARY} disabled={busy !== null} type="submit">
            {busy === 'analizando' ? <LoaderCircle aria-hidden className="animate-spin" size={16} /> : <ScanSearch aria-hidden size={16} />}
            {busy === 'analizando' ? 'Analizando…' : 'Analizar foto'}
          </button>
          <button className={SECONDARY} disabled={busy !== null} onClick={tryExample} type="button">
            Probar con un ejemplo (sin servicio)
          </button>
        </div>
      </form>

      {notice && (
        <p
          className={`whitespace-pre-line text-sm ${notice.kind === 'error' ? 'text-destructive' : 'rounded-xl bg-secondary px-4 py-3'}`}
          role={notice.kind === 'error' ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      )}
      {pending && (
        <div className="flex gap-3">
          <button className={PRIMARY} disabled={busy !== null} onClick={retry} type="button">
            Reintentar guardar la escena
          </button>
          <Link className={SECONDARY} href={`/proyectos/${pending.project.id}`}>
            Abrir el proyecto vacío
          </Link>
        </div>
      )}

      {analysis && (
        <section aria-labelledby="resultado" className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold" id="resultado">
            Resultado del análisis
          </h2>
          <p className="text-sm text-muted-foreground">
            {fromExample ? 'Análisis de ejemplo: no viene de TP3.' : 'Respuesta del servicio de TP3.'}{' '}
            {analysis.calibration.status === 'user_provided' && analysis.calibration.width_m !== null
              ? `Ancho conocido: ${new Intl.NumberFormat('es', { maximumFractionDigits: 2 }).format(analysis.calibration.width_m)} m.`
              : 'Sin ancho conocido: las medidas son proporciones del ambiente.'}
          </p>
          <WarningList title="Avisos del servicio" warnings={analysis.warnings} />
          <WarningList title="Avisos del modelado" warnings={modelWarnings} />
          <PiecesTable furniture={analysis.furniture} />
          <details className="rounded-xl bg-secondary px-4 py-3 text-sm" open>
            <summary className="cursor-pointer font-medium">JSON crudo</summary>
            <pre className="mt-2 max-h-72 overflow-auto text-xs" data-testid="raw-json">
              {JSON.stringify(analysis, null, 2)}
            </pre>
          </details>
          <div className="flex flex-col items-start gap-2">
            <button className={PRIMARY} disabled={busy !== null} onClick={() => void openInEditor(modelAnalysis(analysis))} type="button">
              {busy === 'abriendo' ? <LoaderCircle aria-hidden className="animate-spin" size={16} /> : <ArrowRight aria-hidden size={16} />}
              Abrir en el editor
            </button>
            <p className="text-xs text-muted-foreground">Crea el proyecto «Laboratorio · fecha y hora» en tu cuenta y lo abre en el editor.</p>
          </div>
        </section>
      )}

      {loft && (
        <details className="rounded-xl bg-secondary px-4 py-3 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 font-medium">
            <Wrench aria-hidden size={16} />
            Comprobar que el camino al editor funciona (sin análisis)
          </summary>
          <div className="mt-3 flex flex-col items-start gap-2">
            <p className="text-muted-foreground">
              Abre la plantilla Loft como proyecto nuevo, por el mismo camino que usa el laboratorio (cuenta, guardado y editor). Si esto funciona, cualquier
              definición válida también.
            </p>
            <button className={SECONDARY} disabled={busy !== null} onClick={() => void openInEditor(() => loft, 'prueba Loft')} type="button">
              Abrir el Loft como prueba
            </button>
          </div>
        </details>
      )}
    </main>
  )
}

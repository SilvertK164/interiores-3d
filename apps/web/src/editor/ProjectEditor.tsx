'use client'

import { loadPlugin } from '@pascal-app/core'
import { CATALOG_ITEMS, Editor, type SceneGraph } from '@pascal-app/editor'
import { builtinPlugin } from '@pascal-app/nodes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LoaderPortal } from '@/components/LoaderPortal'
import { api } from '@/lib/api/instance'
import { ApiError } from '@/lib/api/client'
import { friendlyMessage } from '@/lib/api/errors'
import { useNavigate } from '@/lib/use-navigate'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { fromEnvelope, toEnvelope } from './adapter'
import { localizeCatalog } from './catalog-assets'
import { HIDDEN_CHROME, type PascalChrome } from './chrome'
import { installE2eHooks } from './e2e-hooks'
import { createPascalBridge } from './pascal-bridge'
import { createSaveHandler } from './save-handler'
import { SaveBanner } from './SaveBanner'
import { EditorShell } from './shell/EditorShell'
import { type SaveOutcome, type SaverStatus, type SceneSaver, createSceneSaver } from './scene-saver'

let pluginReady: Promise<unknown> | null = null
const ensurePlugin = () => {
  pluginReady ??= Promise.resolve(loadPlugin(builtinPlugin))
  return pluginReady
}

type Phase = { kind: 'loading' } | { kind: 'ready'; name: string } | { kind: 'error'; message: string }

export default function ProjectEditor({ projectId }: { projectId: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [status, setStatus] = useState<SaverStatus>('idle')
  const [detail, setDetail] = useState<string | undefined>()
  const [dismissed, setDismissed] = useState(false)
  // Madori dibuja su propio dock, inspector, ayudantes y selector de nivel; los de Pascal quedan ocultos (parche `chrome`).
  const [chrome, setChrome] = useState<PascalChrome>(HIDDEN_CHROME)
  const saver = useRef<SceneSaver<SceneGraph> | null>(null)
  const graphRef = useRef<SceneGraph | null>(null)

  // `<Editor>` vuelve a cargar la escena cada vez que cambia la identidad de `onLoad`:
  // estas funciones deben ser estables o cada cambio de estado de guardado borraría lo editado.
  const onLoad = useCallback(async () => graphRef.current, [])
  const onSave = useMemo(() => createSaveHandler<SceneGraph>(() => saver.current), [])

  const items = useMemo(() => localizeCatalog(CATALOG_ITEMS), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await ensurePlugin()
        const project = await api.getProject(projectId)
        if (cancelled) return
        saver.current = createSceneSaver<SceneGraph>({
          initialVersion: project.version,
          onStatus: (s, detail) => {
            setStatus(s)
            setDetail(detail)
          },
          put: async (graph, version, { keepalive }): Promise<SaveOutcome> => {
            try {
              const res = await api.saveScene(projectId, toEnvelope(graph), version, { keepalive })
              return { kind: 'ok', version: res.version }
            } catch (err) {
              if (err instanceof ApiError && err.status === 409) return { kind: 'conflict' }
              if (err instanceof ApiError && err.status === 401) return { kind: 'unauthorized' }
              // 404, 413 y 422 no se arreglan reintentando: se avisa con el mensaje accionable.
              if (err instanceof ApiError && [404, 413, 422].includes(err.status)) {
                return { kind: 'rejected', message: friendlyMessage(err) }
              }
              return { kind: 'error', message: friendlyMessage(err) }
            }
          },
        })
        graphRef.current = fromEnvelope(project.scene)
        setPhase({ kind: 'ready', name: project.name })
        if (process.env.NEXT_PUBLIC_E2E === '1') installE2eHooks({ setChrome })
      } catch (err) {
        if (!cancelled) setPhase({ kind: 'error', message: friendlyMessage(err) })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  // Lo que el guardador tiene en espera (ya encolado por Pascal, aún sin enviar) se manda al cerrar la página; Pascal solo
  // envía lo que él todavía no encoló.
  useEffect(() => {
    const flush = () => void saver.current?.flushNow().catch(() => {})
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
      flush()
    }
  }, [])

  // Al volver a ingresar (otra pestaña) o renovarse el token, el guardado pausado por sesión vencida se reanuda.
  useEffect(() => {
    const { data } = supabaseBrowser().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') saver.current?.resume()
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // El puente con Pascal y el shell de Madori; `EditorShell` aplica el tema claro y oculta el aviso de cámara al montarse.
  const bridge = useMemo(() => createPascalBridge(), [])
  const { go, pending: leaving } = useNavigate()

  if (phase.kind === 'loading') return <LoaderPortal />
  if (phase.kind === 'error') return <p role="alert" className="p-6 text-destructive">{phase.message}</p>

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <SaveBanner detail={detail} dismissed={dismissed} onKeepEditing={() => setDismissed(true)} status={status} />
      <Editor
        chrome={chrome}
        guardAgainstSceneWipe
        layoutVersion="v2"
        onLoad={onLoad}
        onSave={onSave}
        projectId={projectId}
      />
      <EditorShell
        backBusy={leaving}
        bridge={bridge}
        catalog={items}
        onBack={() => go('/proyectos')}
        projectName={phase.name}
        saveStatus={status}
      />
    </div>
  )
}

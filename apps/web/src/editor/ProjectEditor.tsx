'use client'

import { loadPlugin } from '@pascal-app/core'
import { CATALOG_ITEMS, Editor, ItemsPanel, type SceneGraph } from '@pascal-app/editor'
import { builtinPlugin } from '@pascal-app/nodes'
import { Sofa, Store } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LoaderPortal } from '@/components/LoaderPortal'
import { api } from '@/lib/api/instance'
import { ApiError } from '@/lib/api/client'
import { friendlyMessage } from '@/lib/api/errors'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { fromEnvelope, toEnvelope } from './adapter'
import { localizeCatalog } from './catalog-assets'
import { buildCommerceItems } from './commerce-catalog'
import { installE2eHooks } from './e2e-hooks'
import { SaveBanner } from './SaveBanner'
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
  const saver = useRef<SceneSaver<SceneGraph> | null>(null)
  const graphRef = useRef<SceneGraph | null>(null)

  // `<Editor>` vuelve a cargar la escena cada vez que cambia la identidad de `onLoad`:
  // estas funciones deben ser estables o cada cambio de estado de guardado borraría lo editado.
  const onLoad = useCallback(async () => graphRef.current, [])
  const onSave = useCallback(async (scene: SceneGraph, options?: { keepalive?: boolean }) => {
    const s = saver.current
    if (!s) return
    if (options?.keepalive) await s.flushNow(scene)
    else await s.save(scene)
  }, [])

  const items = useMemo(() => localizeCatalog(CATALOG_ITEMS), [])
  const commerceItems = useMemo(() => buildCommerceItems(items), [items])

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
        if (process.env.NEXT_PUBLIC_E2E === '1') installE2eHooks()
      } catch (err) {
        if (!cancelled) setPhase({ kind: 'error', message: friendlyMessage(err) })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  // Al volver a ingresar (otra pestaña) o renovarse el token, el guardado pausado por sesión vencida se reanuda.
  useEffect(() => {
    const { data } = supabaseBrowser().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') saver.current?.resume()
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const sidebarTabs = useMemo(
    () => [
      {
        id: 'items',
        label: 'Muebles',
        icon: <Sofa aria-hidden size={20} />,
        component: () => <ItemsPanel items={items} showSourceFilter={false} showTagFilters={false} />,
      },
      {
        id: 'commerce',
        label: 'Comercio',
        icon: <Store aria-hidden size={20} />,
        component: () => <ItemsPanel items={commerceItems} showSourceFilter={false} showTagFilters={false} />,
      },
    ],
    [items, commerceItems],
  )

  if (phase.kind === 'loading') return <LoaderPortal />
  if (phase.kind === 'error') return <p role="alert" className="p-6 text-destructive">{phase.message}</p>

  return (
    <div className="relative h-screen w-screen">
      <SaveBanner detail={detail} dismissed={dismissed} onKeepEditing={() => setDismissed(true)} status={status} />
      <Editor
        guardAgainstSceneWipe
        layoutVersion="v2"
        onLoad={onLoad}
        onSave={onSave}
        projectId={projectId}
        sidebarTabs={sidebarTabs}
      />
    </div>
  )
}

'use client'

import { loadPlugin } from '@pascal-app/core'
import { CATALOG_ITEMS, Editor, ItemsPanel, type SceneGraph } from '@pascal-app/editor'
import { builtinPlugin } from '@pascal-app/nodes'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api/instance'
import { ApiError } from '@/lib/api/client'
import { friendlyMessage } from '@/lib/api/errors'
import { fromEnvelope, toEnvelope } from './adapter'
import { type LocalItemsManifest, localizeCatalogItem } from './catalog'
import { installE2eHooks } from './e2e-hooks'
import manifest from './local-items.json'
import { SaveBanner } from './SaveBanner'
import { type SaveOutcome, type SaverStatus, type SceneSaver, createSceneSaver } from './scene-saver'

let pluginReady: Promise<unknown> | null = null
const ensurePlugin = () => {
  pluginReady ??= Promise.resolve(loadPlugin(builtinPlugin))
  return pluginReady
}

type Phase = { kind: 'loading' } | { kind: 'ready'; graph: SceneGraph | null; name: string } | { kind: 'error'; message: string }

export default function ProjectEditor({ projectId }: { projectId: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [status, setStatus] = useState<SaverStatus>('idle')
  const [dismissed, setDismissed] = useState(false)
  const saver = useRef<SceneSaver<SceneGraph> | null>(null)

  const items = useMemo(
    () => CATALOG_ITEMS.flatMap((i) => localizeCatalogItem(i, manifest as LocalItemsManifest) ?? []),
    [],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await ensurePlugin()
        const project = await api.getProject(projectId)
        if (cancelled) return
        saver.current = createSceneSaver<SceneGraph>({
          initialVersion: project.version,
          onStatus: setStatus,
          put: async (graph, version): Promise<SaveOutcome> => {
            try {
              const res = await api.saveScene(projectId, toEnvelope(graph), version)
              return { kind: 'ok', version: res.version }
            } catch (err) {
              if (err instanceof ApiError && err.status === 409) return { kind: 'conflict' }
              if (err instanceof ApiError && err.status === 401) return { kind: 'unauthorized' }
              return { kind: 'error', message: friendlyMessage(err) }
            }
          },
        })
        setPhase({ kind: 'ready', graph: fromEnvelope(project.scene), name: project.name })
        if (process.env.NEXT_PUBLIC_E2E === '1') installE2eHooks()
      } catch (err) {
        if (!cancelled) setPhase({ kind: 'error', message: friendlyMessage(err) })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (phase.kind === 'loading') return <p className="p-6 text-muted-foreground">Abriendo tu proyecto…</p>
  if (phase.kind === 'error') return <p role="alert" className="p-6 text-destructive">{phase.message}</p>

  return (
    <div className="relative h-screen w-screen">
      <SaveBanner dismissed={dismissed} onKeepEditing={() => setDismissed(true)} status={status} />
      <Editor
        guardAgainstSceneWipe
        layoutVersion="v2"
        onLoad={async () => phase.graph}
        onSave={async (scene, options) => {
          const s = saver.current
          if (!s) return
          if (options?.keepalive) await s.flushNow(scene)
          else await s.save(scene)
        }}
        projectId={projectId}
        sidebarTabs={[
          {
            id: 'items',
            label: 'Muebles',
            icon: <span style={{ fontSize: 20 }}>🛋️</span>,
            component: () => <ItemsPanel items={items} showSourceFilter={false} showTagFilters={false} />,
          },
        ]}
      />
    </div>
  )
}

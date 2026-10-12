import { levelDisplayName, zoneDisplayName } from '@/lib/editor-names'
import { withColorFilter } from '@/lib/export/color-filter'
import type { ExportDecisions } from '@/lib/export/decisions'
import { drawSheet } from '@/lib/export/draw-sheet'
import { formatLongDate } from '@/lib/export/format-date'
import type { LegendEntry } from '@/lib/export/legend'
import { type MaterialLookup, floorInfoOf } from '@/lib/export/plan-colors'
import { type GeoLike, paperColor, styleGeometry } from '@/lib/export/plan-style'
import { MM_TO_PT, mmToPt, sheetFor } from '@/lib/export/sheet'
import { TEXT, projectTitle } from '@/lib/export/texts-es'
import type { PlanBuildArgs, PlanResult } from '@/lib/export/types'
import { type Point, areaLabel, polygonArea } from '@/lib/export/zone-labels'
import type { PdfFontBytes } from './pdf-fonts'
import { type PdfRawLike, createPdfSurface, registerPdfFonts } from './pdf-surface'

/** Lo que se lee de un nodo de la escena de Pascal (forma mínima: este archivo no importa Pascal). */
export type SceneNode = {
  id: string
  type: string
  name?: string | null
  level?: number
  color?: string
  polygon?: readonly Point[]
  children?: readonly string[]
  materialPreset?: string
  material?: { color?: string }
}

export type ScenePort = {
  nodes(): Readonly<Record<string, SceneNode>>
  materialById: MaterialLookup
}

/** `FloorplanPagesOptions` del parche de Pascal, con geometrías estructurales. */
export type PagesOptions = {
  levels: readonly string[]
  page: { widthPt: number; heightPt: number; usable: { x: number; y: number; width: number; height: number } }
  scale: number
  mapGeometry?: (node: SceneNode | undefined, geometry: GeoLike) => GeoLike | null
  extraGeometry?: (levelId: string) => GeoLike[]
  wrapRaw?: (raw: PdfRawLike) => PdfRawLike
  setup?: (raw: PdfRawLike) => void | Promise<void>
  pageChrome?: (raw: PdfRawLike, context: { index: number; count: number; levelId: string }) => void | Promise<void>
  onProgress?: (done: number, total: number) => void
  signal?: AbortSignal
}

export type BuildDeps = {
  exportPages(options: PagesOptions): Promise<PlanResult>
  scene: ScenePort
  loadFonts(): Promise<PdfFontBytes>
  decisions: ExportDecisions
}

const ZONE_FALLBACK_COLOR = '#9CA3AF'

/** Arma las opciones del parche a partir de lo que eligió la persona y devuelve el PDF. */
export function createBuildPlan(deps: BuildDeps) {
  return async function buildPlan(args: PlanBuildArgs): Promise<PlanResult> {
    const sheet = sheetFor(args.paper, args.orientation, args.titleBlock)
    const ptPerM = (1000 / args.scale) * MM_TO_PT
    const nodes = () => deps.scene.nodes()
    const childrenOf = (levelId: string, type: string): SceneNode[] =>
      (nodes()[levelId]?.children ?? []).map((id) => nodes()[id]).filter((node): node is SceneNode => node?.type === type)

    const legendFor = (levelId: string): LegendEntry[] => {
      const zones = childrenOf(levelId, 'zone')
        .filter((zone) => (zone.polygon?.length ?? 0) >= 3)
        .map((zone): LegendEntry => ({
          kind: 'zone',
          label: zoneDisplayName(zone.name),
          color: zone.color ?? ZONE_FALLBACK_COLOR,
          areaM2: polygonArea(zone.polygon ?? []),
        }))
      const floors = childrenOf(levelId, 'slab').flatMap((slab): LegendEntry[] => {
        const info = floorInfoOf(slab, deps.scene.materialById)
        return info.label && info.color ? [{ kind: 'material', label: info.label, color: info.color }] : []
      })
      return [...zones, ...floors]
    }
    const areaLabels = (levelId: string): GeoLike[] => {
      const fontSizeM = Math.min(0.3, Math.max(0.1, 7 / ptPerM))
      return childrenOf(levelId, 'zone').flatMap((zone) => {
        const label = areaLabel(zone.polygon ?? [], { fontSizeM })
        const styled = label ? styleGeometry(label, { mode: args.mode, nodeType: 'zone', ptPerUnit: ptPerM }) : null
        return styled ? [styled] : []
      })
    }

    const result = await deps.exportPages({
      levels: args.levelIds,
      page: {
        widthPt: sheet.widthPt,
        heightPt: sheet.heightPt,
        usable: { x: mmToPt(sheet.usable.x), y: mmToPt(sheet.usable.y), width: mmToPt(sheet.usable.width), height: mmToPt(sheet.usable.height) },
      },
      scale: ptPerM,
      mapGeometry: (node, geometry) =>
        styleGeometry(geometry, {
          mode: args.mode,
          nodeType: node?.type,
          ptPerUnit: ptPerM,
          zoneColor: node?.type === 'zone' ? node.color : undefined,
          floorColor: node?.type === 'slab' ? (floorInfoOf(node, deps.scene.materialById).color ?? undefined) : undefined,
        }),
      extraGeometry: deps.decisions.areaLabels === 'madori' ? areaLabels : undefined,
      wrapRaw: args.mode === 'paper' ? (raw) => withColorFilter(raw, paperColor) : undefined,
      setup: async (raw) => {
        if (deps.decisions.fonts === 'dmsans') registerPdfFonts(raw, await deps.loadFonts())
        raw.info = { ...(raw.info ?? {}), Title: projectTitle(args.projectName), Author: args.author, Creator: TEXT.pdf.creator }
      },
      pageChrome: (raw, context) => {
        const node = nodes()[context.levelId]
        const first = args.sheetNumbers?.start ?? 0
        drawSheet(createPdfSurface(raw, deps.decisions.fonts), {
          sheet,
          mode: args.mode,
          scale: args.scale,
          projectName: args.projectName,
          levelLabel: levelDisplayName({ name: node?.name, level: node?.level ?? 0 }),
          author: args.author,
          dateText: formatLongDate(args.date),
          sheetNumber: first + context.index + 1,
          sheetTotal: args.sheetNumbers?.total ?? context.count,
          legend: legendFor(context.levelId),
        })
      },
      onProgress: args.onProgress ? (done, total) => args.onProgress?.({ done, total }) : undefined,
      signal: args.signal,
    })
    return result
  }
}

// Aplica el parche de planos de Madori sobre @pascal-app/editor 1.0.3 (exportación configurable a PDF).
// Uso: pnpm patch @pascal-app/editor@1.0.3 --edit-dir ../madori-editor-plan-edit
//      node scripts/pascal-plan-patch.mjs ../madori-editor-plan-edit
//      pnpm patch-commit ../madori-editor-plan-edit
// Falla (y no escribe nada) si algún ancla ya no aparece exactamente una vez: señal de que Pascal cambió.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir) {
  console.error('Uso: node scripts/pascal-plan-patch.mjs <carpeta abierta con pnpm patch>')
  process.exit(1)
}

const EXPORT_BLOCK = `/* ── Madori: planos configurables (hoja, escala fija y norte arriba) ─────────────────────────────────────── */
type PdfRaw = FloorplanPdfDocument['raw']

export type FloorplanLevelMeasure = {
  id: string
  name: string | null
  level: number
  /** Medidas del dibujo de la planta en metros, sin el margen de cotas. */
  widthM: number
  heightM: number
  empty: boolean
}

export type FloorplanPagesOptions = {
  /** Ids de las plantas elegidas; el orden sale de la planta (de la más baja a la más alta). */
  levels: readonly string[]
  /** Hoja y área útil en puntos del PDF, con el origen arriba a la izquierda. */
  page: {
    widthPt: number
    heightPt: number
    usable: { x: number; y: number; width: number; height: number }
  }
  /** Puntos del PDF por metro del plano (a 1:50 son 56,69). */
  scale: number
  /** Cambia o descarta (null) la geometría de cada nodo antes de dibujarla. */
  mapGeometry?: (node: AnyNode | undefined, geometry: FloorplanGeometry) => FloorplanGeometry | null
  /** Geometría propia que se suma al plano de la planta (por ejemplo, superficies). */
  extraGeometry?: (levelId: string) => FloorplanGeometry[]
  /** Envuelve el documento que usa el renderizador de Pascal (por ejemplo, para filtrar colores). */
  wrapRaw?: (raw: PdfRaw) => PdfRaw
  /** Se llama una vez, con el documento sin envolver, antes de la primera página (fuentes, metadatos). */
  setup?: (raw: PdfRaw) => void | Promise<void>
  /** Se llama al final de cada página, con el documento sin envolver y sin recorte (marco y cajetín). */
  pageChrome?: (
    raw: PdfRaw,
    context: { index: number; count: number; levelId: string },
  ) => void | Promise<void>
  onProgress?: (done: number, total: number) => void
  signal?: AbortSignal
}

export type FloorplanPagesResult = { blob: Blob; pages: number; skippedImages: number }

const MADORI_ROTATION_DEG = 0

function madoriHost(): HTMLDivElement {
  const host = document.createElement('div')
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none;'
  document.body.appendChild(host)
  return host
}

function madoriGeometries(levelId: AnyNodeId): ExportGeometry[] {
  const { nodes, installedPlugins } = useScene.getState()
  const viewer = useViewer.getState()
  const floorplanMode = useFloorplanMode.getState().mode
  const annotationState = useFloorplanAnnotationVisibility.getState()
  return collectFloorplanGeometry(
    nodes,
    levelId,
    'full',
    'metric',
    viewer.metricNotation,
    resolveFloorplanExportAnnotationVisibility(floorplanMode, annotationState.visibility),
    'floor-plan',
    resolveFloorplanWallDimensionReference(floorplanMode, annotationState.wallDimensionReference),
    installedPlugins,
  )
}

/** Mide cada planta del edificio activo (de la más baja a la más alta): metros de ancho y alto del dibujo. */
export async function measureFloorplanLevels(): Promise<FloorplanLevelMeasure[]> {
  const { nodes } = useScene.getState()
  const host = madoriHost()
  const result: FloorplanLevelMeasure[] = []
  try {
    for (const level of resolveExportLevels(nodes)) {
      const node = nodes[level.id]
      const base = {
        id: level.id as string,
        name: node?.name?.trim() || null,
        level: node ? levelIndexOf(node) : 0,
      }
      const geometries = madoriGeometries(level.id)
      const mounted = geometries.some((geometry) => geometry.model)
        ? await mountFloorplanSvg(host, geometries, MADORI_ROTATION_DEG)
        : null
      if (!mounted) {
        result.push({ ...base, widthM: 0, heightM: 0, empty: true })
        continue
      }
      try {
        const bounds = measureFloorplanBounds(mounted.svg, '[data-floorplan-model]')
        result.push({ ...base, widthM: bounds?.width ?? 0, heightM: bounds?.height ?? 0, empty: !bounds })
      } finally {
        mounted.cleanup()
      }
    }
  } finally {
    host.remove()
  }
  return result
}

/**
 * Genera un PDF con una página por planta elegida, a escala fija y con el norte arriba, y devuelve el Blob (no descarga
 * nada). El dibujo queda centrado en el área útil y recortado a ella: un exceso nunca pisa el cajetín.
 */
export async function exportFloorplanPages(
  options: FloorplanPagesOptions,
): Promise<FloorplanPagesResult> {
  const { nodes } = useScene.getState()
  const chosen = resolveExportLevels(nodes).filter((level) => options.levels.includes(level.id))
  if (chosen.length === 0) throw new Error('[floorplan-export] no level to export')
  const { page, scale } = options
  const { doc, raw, finish } = await createFloorplanPdfDocument(
    [page.widthPt, page.heightPt],
    options.wrapRaw,
  )
  if (options.setup) await options.setup(raw)
  const host = madoriHost()
  const area = page.usable
  let pages = 0
  let skippedImages = 0
  const onImageError = () => {
    skippedImages += 1
  }
  try {
    for (const [index, level] of chosen.entries()) {
      if (options.signal?.aborted) throw new DOMException('Exportación cancelada', 'AbortError')
      options.onProgress?.(index, chosen.length)
      await nextFrames(1)
      const geometries = madoriGeometries(level.id).map((geometry) => ({
        ...geometry,
        model:
          geometry.model && options.mapGeometry
            ? options.mapGeometry(nodes[geometry.id], geometry.model)
            : geometry.model,
      }))
      const extras = options.extraGeometry ? options.extraGeometry(level.id) : []
      doc.addPage([page.widthPt, page.heightPt])
      pages += 1
      const mounted = geometries.some((geometry) => geometry.model)
        ? await mountFloorplanSvg(host, geometries, MADORI_ROTATION_DEG)
        : null
      if (mounted) {
        try {
          await mounted.setScreenUnitsPerPixel(1 / scale)
          const { viewport } = mounted
          const width = viewport.width * scale
          const height = viewport.height * scale
          const placement = {
            x: area.x + (area.width - width) / 2,
            y: area.y + (area.height - height) / 2,
            width,
            height,
          }
          raw.save()
          raw.rect(area.x, area.y, area.width, area.height).clip()
          const model = combineGeometryList([...geometries.map((geometry) => geometry.model), ...extras])
          if (model) {
            await renderFloorplanGeometryToPdfKit(doc, model, {
              annotationLayer: false,
              placement,
              rotationDeg: MADORI_ROTATION_DEG,
              viewport,
              onImageError,
              signal: options.signal,
            })
          }
          const annotations = combineGeometryList(geometries.map((geometry) => geometry.annotations))
          if (annotations) {
            await renderFloorplanGeometryToPdfKit(doc, annotations, {
              annotationLabelShifts: mounted.annotationLabelShifts,
              annotationLayer: true,
              placement,
              rotationDeg: MADORI_ROTATION_DEG,
              viewport,
              onImageError,
              signal: options.signal,
            })
          }
          raw.restore()
        } finally {
          mounted.cleanup()
        }
      }
      if (options.pageChrome) {
        await options.pageChrome(raw, { index, count: chosen.length, levelId: level.id as string })
      }
      options.onProgress?.(index + 1, chosen.length)
    }
    return { blob: await finish(), pages, skippedImages }
  } finally {
    host.remove()
  }
}
/* ── fin del parche de planos ─────────────────────────────────────────────────────────────────────────────── */

export function collectFloorplanSchedules(`

const EDITS = {
  'src/lib/floorplan/floorplan-export.tsx': [
    ['export function collectFloorplanSchedules(', EXPORT_BLOCK],
  ],
  'src/lib/floorplan/floorplan-pdfkit-document.ts': [
    [
      'export async function createFloorplanPdfDocument(defaultPageSize: readonly [number, number]) {',
      `export async function createFloorplanPdfDocument(
  defaultPageSize: readonly [number, number],
  /** Madori: envuelve el documento que usa el renderizador (filtro de colores del modo Papel). */
  wrapRaw?: (raw: PdfKitDocumentInstance) => PdfKitDocumentInstance,
) {`,
    ],
    [
      `  return {
    doc: new FloorplanPdfDocument(raw, defaultPageSize),
    save: async (filename: string) => {
      const blob = await new Promise<Blob>((resolve, reject) => {
        stream.on('finish', () => resolve(stream.toBlob('application/pdf')))
        stream.on('error', reject)
        raw.on('error', reject)
        raw.end()
      })
`,
      `  // Madori: cerrar el documento y devolver el Blob sin descargarlo.
  const finish = () =>
    new Promise<Blob>((resolve, reject) => {
      stream.on('finish', () => resolve(stream.toBlob('application/pdf')))
      stream.on('error', reject)
      raw.on('error', reject)
      raw.end()
    })
  return {
    doc: new FloorplanPdfDocument(wrapRaw ? wrapRaw(raw) : raw, defaultPageSize),
    raw,
    finish,
    save: async (filename: string) => {
      const blob = await finish()
`,
    ],
  ],
  'src/lib/floorplan/floorplan-pdfkit-renderer.ts': [
    ['type RenderContext = {\n', 'type RenderContext = {\n  onImageError?: (error: unknown) => void\n  signal?: AbortSignal\n'],
    [
      `    placement: FloorplanPdfKitPlacement
    rotationDeg: number
    viewport: FloorplanExportBounds
  },
): Promise<void> {`,
      `    placement: FloorplanPdfKitPlacement
    rotationDeg: number
    viewport: FloorplanExportBounds
    /** Madori: una imagen que no carga no tumba el PDF; quien llama la cuenta. */
    onImageError?: (error: unknown) => void
    /** Madori: al cancelar, la siguiente imagen corta el dibujo de la planta en curso. */
    signal?: AbortSignal
  },
): Promise<void> {`,
    ],
    [
      `    sceneRotationDeg: options.rotationDeg,
    unitsPerPoint: 1 / pointsPerUnit,
  })`,
      `    sceneRotationDeg: options.rotationDeg,
    unitsPerPoint: 1 / pointsPerUnit,
    onImageError: options.onImageError,
    signal: options.signal,
  })`,
    ],
    [
      `    case 'image':
      await drawImage(doc, geometry)
      return`,
      `    case 'image':
      if (context.signal?.aborted) throw new DOMException('Exportación cancelada', 'AbortError')
      try {
        await drawImage(doc, geometry)
      } catch (error) {
        if (!context.onImageError) throw error
        context.onImageError(error)
      }
      return`,
    ],
  ],
  'src/index.tsx': [
    [
      `export {
  exportFloorplanPdf,
  type FloorplanExportScope,
} from './lib/floorplan/floorplan-export'`,
      `export {
  exportFloorplanPages,
  exportFloorplanPdf,
  type FloorplanExportScope,
  type FloorplanLevelMeasure,
  type FloorplanPagesOptions,
  type FloorplanPagesResult,
  measureFloorplanLevels,
} from './lib/floorplan/floorplan-export'`,
    ],
  ],
}

// Primero se calcula todo; solo si todas las anclas aparecen una vez se escribe.
const outputs = []
for (const [file, edits] of Object.entries(EDITS)) {
  let text = readFileSync(join(dir, file), 'utf8')
  for (const [anchor, replacement] of edits) {
    const count = text.split(anchor).length - 1
    if (count !== 1) {
      console.error(`${file}: el ancla aparece ${count} veces (debía ser 1):\n${anchor.slice(0, 160)}`)
      process.exit(1)
    }
    text = text.replace(anchor, () => replacement)
  }
  outputs.push([file, text])
}
for (const [file, text] of outputs) writeFileSync(join(dir, file), text)
console.log(`OK: ${outputs.length} archivos parchados (${outputs.map(([file]) => file).join(', ')})`)

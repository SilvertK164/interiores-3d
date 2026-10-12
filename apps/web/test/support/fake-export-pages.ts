import { PDFDocument } from './pdfkit'
import { vi } from 'vitest'
import { type BuildDeps, type PagesOptions, type SceneNode, createBuildPlan } from '../../src/editor/export/build-plan'
import type { PdfRawLike } from '../../src/editor/export/pdf-surface'
import type { ExportDecisions } from '../../src/lib/export/decisions'
import type { PlanBuildArgs } from '../../src/lib/export/types'
import { fontBytes } from './pdf-fonts'
import { readPdf } from './pdf-read'

export const NODES: Record<string, SceneNode> = {
  level_a: { id: 'level_a', type: 'level', level: 0, name: null, children: ['zone_1', 'slab_1', 'wall_1'] },
  level_b: { id: 'level_b', type: 'level', level: 1, name: 'Floor 1', children: [] },
  zone_1: { id: 'zone_1', type: 'zone', name: 'Zone 1', color: '#B97A00', polygon: [[0, 0], [4, 0], [4, 3], [0, 3]] },
  slab_1: { id: 'slab_1', type: 'slab', materialPreset: 'library:wood-woodfine22' },
  wall_1: { id: 'wall_1', type: 'wall' },
}
export const DECISIONS: ExportDecisions = { areaLabels: 'madori', fonts: 'dmsans', previewMode: 'pdfjs', previewDelayMs: 250 }
export const ARGS: PlanBuildArgs = {
  paper: 'A4',
  orientation: 'landscape',
  scale: 50,
  mode: 'color',
  levelIds: ['level_a', 'level_b'],
  titleBlock: true,
  projectName: 'Casa Alvear',
  author: 'Silvert Quispe',
  date: new Date(2026, 9, 12),
}

/** Un `exportFloorplanPages` de mentira: abre un PDF real de pdfkit, llama a los ganchos como el parche y devuelve el Blob. */
export function setup(decisions: ExportDecisions = DECISIONS) {
  const received: PagesOptions[] = []
  const seen: { info?: Record<string, unknown> } = {}
  const exportPages = vi.fn(async (options: PagesOptions) => {
    received.push(options)
    const doc = new PDFDocument({ autoFirstPage: false, compress: false, margin: 0 })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    const ended = new Promise<void>((resolve) => doc.on('end', () => resolve()))
    const raw = doc as unknown as PdfRawLike
    await options.setup?.(raw)
    seen.info = { ...(raw.info ?? {}) }
    for (const [index, levelId] of options.levels.entries()) {
      doc.addPage({ size: [options.page.widthPt, options.page.heightPt], margin: 0 })
      options.onProgress?.(index, options.levels.length)
      await options.pageChrome?.(raw, { index, count: options.levels.length, levelId })
      options.onProgress?.(index + 1, options.levels.length)
    }
    doc.end()
    await ended
    return { blob: new Blob([Buffer.concat(chunks)]), pages: options.levels.length, skippedImages: 2 }
  })
  const loadFonts = vi.fn(async () => fontBytes())
  const deps: BuildDeps = {
    exportPages,
    loadFonts,
    decisions,
    scene: {
      nodes: () => NODES,
      materialById: (id) => (id === 'wood-woodfine22' ? { label: 'Madera fina', category: 'wood', previewColor: '#B98A5E' } : undefined),
    },
  }
  return { build: createBuildPlan(deps), received, seen, exportPages, loadFonts }
}

export const textOf = async (blob: Blob) => {
  const pages = await readPdf(new Uint8Array(await blob.arrayBuffer()))
  return pages.map((page) => page.items.map((item) => item.str).join(''))
}


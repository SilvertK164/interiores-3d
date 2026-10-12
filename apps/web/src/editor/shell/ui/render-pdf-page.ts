import { canvasScale } from '@/lib/export/preview-scale'

/** Lo que se usa de pdf.js. La build minificada se sirve desde `public/pdfjs/` (ver FUENTES.txt), así que no hay tipos propios. */
type PdfViewport = { width: number; height: number }
type PdfPage = {
  getViewport(options: { scale: number }): PdfViewport
  render(options: { canvas: HTMLCanvasElement; viewport: PdfViewport }): { promise: Promise<void>; cancel(): void }
}
type PdfDocument = { getPage(number: number): Promise<PdfPage>; destroy(): Promise<void> | void }
type PdfJs = {
  GlobalWorkerOptions: { workerSrc: string }
  getDocument(source: { data: Uint8Array }): { promise: Promise<PdfDocument> }
}

const LIBRARY_URL = '/pdfjs/pdf.min.mjs'
const WORKER_URL = '/pdfjs/pdf.worker.min.mjs'

let library: Promise<PdfJs> | null = null

/**
 * pdf.js se pide una sola vez y solo al dibujar la vista previa: es un archivo estático del mismo origen cargado con `import()`
 * del navegador (los comentarios impiden que Next lo empaquete), así que no entra en el JS inicial de la página del editor.
 */
function loadPdfJs(): Promise<PdfJs> {
  library ??= (import(/* webpackIgnore: true */ /* turbopackIgnore: true */ LIBRARY_URL) as Promise<PdfJs>)
    .then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL
      return pdfjs
    })
    .catch((error: unknown) => {
      library = null
      throw error
    })
  return library
}

/** Dibuja la primera página de un PDF en un `<canvas>`. Devuelve cómo soltar los recursos. */
export async function renderPdfPage(blob: Blob, canvas: HTMLCanvasElement, isCancelled: () => boolean): Promise<() => void> {
  const pdfjs = await loadPdfJs()
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise
  const release = () => void doc.destroy()
  if (isCancelled()) {
    release()
    return () => {}
  }
  const page = await doc.getPage(1)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({
    scale: canvasScale(canvas.clientWidth || canvas.parentElement?.clientWidth || 600, base.width, window.devicePixelRatio || 1),
  })
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const task = page.render({ canvas, viewport })
  await task.promise
  return () => {
    task.cancel()
    release()
  }
}

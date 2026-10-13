import { pagesOf, parseObjects } from './pdf-objects'

/**
 * Intérprete mínimo del contenido de una página de `pdfkit`: sigue la matriz de transformación (`q`, `Q`, `cm`), arma el
 * trazado (`m`, `l`, `c`, `v`, `y`, `re`, `h`) y anota cada vez que se pinta (`f`, `S`, `B`...) su caja en puntos de la hoja
 * (origen abajo a la izquierda), los colores y el ancho de línea efectivo. Con eso las pruebas miden el PDF real (escala,
 * colores, imágenes) sin agregar `pdfjs-dist` ni un rasterizador al proyecto.
 */
export type Paint = {
  op: string
  fill: boolean
  stroke: boolean
  /** Caja del trazado en puntos de la hoja. */
  box: { x0: number; y0: number; x1: number; y1: number }
  fillColor: string
  strokeColor: string
  /** Ancho de línea por la escala de la matriz, en puntos de la hoja. */
  widthPt: number
}
export type PageContent = { paints: Paint[]; images: number; clipped: boolean }

type Matrix = [number, number, number, number, number, number]
type GraphicsState = { ctm: Matrix; fill: string; stroke: string; width: number }

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]
/** `m` aplicada después de `current` (el orden del operador `cm`). */
const concat = (m: Matrix, c: Matrix): Matrix => [
  m[0] * c[0] + m[1] * c[2],
  m[0] * c[1] + m[1] * c[3],
  m[2] * c[0] + m[3] * c[2],
  m[2] * c[1] + m[3] * c[3],
  m[4] * c[0] + m[5] * c[2] + c[4],
  m[4] * c[1] + m[5] * c[3] + c[5],
]
const apply = (m: Matrix, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
const hex = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, '0')
const PAINT_OPS = new Set(['f', 'F', 'f*', 'S', 's', 'B', 'B*', 'b', 'b*'])

/** Los flujos de contenido de todas las páginas, ya descomprimidos y en el orden del documento. */
export const pageStreams = (bytes: Uint8Array): string[] => pagesOf(parseObjects(bytes)).map((page) => page.content)

function tokens(stream: string): string[] {
  // Cadenas y diccionarios no cambian el trazado: se descartan para no confundirlos con operadores.
  const clean = stream.replace(/\((?:\\.|[^\\)])*\)/g, ' ').replace(/<<[\s\S]*?>>/g, ' ').replace(/<[0-9a-fA-F\s]*>/g, ' ')
  return clean.split(/[\s[\]]+/).filter(Boolean)
}

export function interpretPage(stream: string): PageContent {
  const stack: GraphicsState[] = []
  let state: GraphicsState = { ctm: IDENTITY, fill: '#000000', stroke: '#000000', width: 1 }
  let points: [number, number][] = []
  const paints: Paint[] = []
  let images = 0
  let clipped = false
  let operands: string[] = []
  const num = (index: number) => Number(operands[index] ?? 0)
  const add = (x: number, y: number) => points.push(apply(state.ctm, x, y))
  const color = () => `#${hex(num(0))}${hex(num(1))}${hex(num(2))}`

  for (const token of tokens(stream)) {
    if (/^[-+.\d]/.test(token) || token.startsWith('/')) {
      operands.push(token)
      continue
    }
    switch (token) {
      case 'q':
        stack.push({ ...state })
        break
      case 'Q':
        state = stack.pop() ?? state
        break
      case 'cm':
        state = { ...state, ctm: concat([num(0), num(1), num(2), num(3), num(4), num(5)], state.ctm) }
        break
      case 'w':
        state = { ...state, width: num(0) }
        break
      case 'scn':
      case 'sc':
        if (operands.length >= 3) state = { ...state, fill: color() }
        else if (operands.length === 1) state = { ...state, fill: `#${hex(num(0))}${hex(num(0))}${hex(num(0))}` }
        break
      case 'SCN':
      case 'SC':
        if (operands.length >= 3) state = { ...state, stroke: color() }
        else if (operands.length === 1) state = { ...state, stroke: `#${hex(num(0))}${hex(num(0))}${hex(num(0))}` }
        break
      case 'm':
      case 'l':
        add(num(0), num(1))
        break
      case 'c':
        add(num(0), num(1))
        add(num(2), num(3))
        add(num(4), num(5))
        break
      case 'v':
      case 'y':
        add(num(0), num(1))
        add(num(2), num(3))
        break
      case 're':
        add(num(0), num(1))
        add(num(0) + num(2), num(1))
        add(num(0) + num(2), num(1) + num(3))
        add(num(0), num(1) + num(3))
        break
      case 'W':
      case 'W*':
        clipped = true
        break
      case 'Do':
        images += 1
        break
      case 'n':
        points = []
        break
      default:
        if (PAINT_OPS.has(token)) {
          if (points.length > 0) {
            const xs = points.map(([x]) => x)
            const ys = points.map(([, y]) => y)
            const scale = Math.sqrt(Math.abs(state.ctm[0] * state.ctm[3] - state.ctm[1] * state.ctm[2]))
            paints.push({
              op: token,
              fill: token !== 'S' && token !== 's',
              stroke: token === 'S' || token === 's' || token.toLowerCase().startsWith('b'),
              box: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) },
              fillColor: state.fill,
              strokeColor: state.stroke,
              widthPt: state.width * scale,
            })
          }
          points = []
        }
    }
    operands = []
  }
  return { paints, images, clipped }
}

export function readPaints(bytes: Uint8Array): PageContent[] {
  return pageStreams(bytes).map(interpretPage)
}

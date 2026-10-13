import { nameEs } from '@/lib/catalog-es'
import { ANALYSIS_TEXT } from '@/lib/lab/analysis-text'
import { type ClusterPiece, analysisToCluster } from '@/lib/lab/analysis-to-cluster'
import type { RoomAnalysis } from '@/lib/lab/schema'
import type { CatalogItemLike } from './furniture-model'

/** Textos de «Muebles desde una foto» (castellano, tuteo). */
export const TEXT = {
  title: 'Muebles desde una foto',
  subtitle: 'Sube la foto de un ambiente y te proponemos qué muebles del catálogo hay y dónde. Tú eliges cuáles agregar a tu proyecto.',
  close: 'Cerrar',
  photo: 'Foto del ambiente (JPG, PNG o WebP)',
  privacy: ANALYSIS_TEXT.privacy,
  limit: ANALYSIS_TEXT.limit,
  width: 'Ancho del ambiente, en metros (opcional)',
  widthPlaceholder: '4,5',
  widthHint: 'Si lo sabes, mide el muro del fondo (el que ves de frente) de lado a lado: así las medidas de los muebles salen más precisas.',
  analyze: 'Analizar foto',
  analyzing: 'Analizando tu foto…',
  found: 'Muebles encontrados',
  foundHint: 'Quita la marca de los que no quieras. Al agregarlos quedan seleccionados juntos: puedes moverlos, girarlos o borrarlos a la vez.',
  empty: 'No encontramos muebles del catálogo en esta foto. Prueba con otra foto, con más luz o tomada desde más lejos.',
  warnings: 'Avisos',
  back: 'Cambiar la foto',
  add: 'Agregar al proyecto',
  addFailed: 'No pudimos agregar los muebles al proyecto. Revisa que estés en el modo Editar y vuelve a intentar.',
} as const

/** Una pieza detectada que se puede agregar: el conjunto `piece` que recibe el puente, con lo que se muestra en la lista. */
export type PhotoRow = {
  /** Distingue las repetidas (cuatro sillas): posición en el análisis e id. */
  key: string
  piece: ClusterPiece<CatalogItemLike>
  /** Nombre en castellano. */
  name: string
  confidence: number
  checked: boolean
  /** La clave de la fila sobre la que está apoyada (una tele sobre su mueble), o `null` si está en el piso. */
  supportKey: string | null
}

/**
 * Las filas que lista el diálogo y los avisos que las acompañan: los del análisis primero y después lo que el editor corrigió o dejó afuera
 * (confianza baja, un id que el catálogo local no tiene, lo que se movió para que quepa y no se pise). El plano completo pasa por
 * `analysisToCluster` una sola vez (lo apoyado necesita su soporte); cada pieza conserva su lugar en el análisis (`source`) y todas
 * arrancan marcadas.
 */
export function detectedRows(analysis: RoomAnalysis, resolve: (assetId: string) => CatalogItemLike | undefined): { rows: PhotoRow[]; warnings: string[] } {
  const omitted: string[] = []
  const pieces = analysisToCluster(analysis, resolve, { warn: (message) => omitted.push(message) })
  const keyOf = (piece: ClusterPiece<CatalogItemLike>) => `${piece.source}-${piece.asset.id}`
  const rows = pieces.map((piece): PhotoRow => {
    const support = piece.supportedBy === null ? undefined : pieces[piece.supportedBy]
    return {
      key: keyOf(piece),
      piece,
      name: nameEs(piece.asset.id, piece.asset.name),
      confidence: analysis.furniture[piece.source]?.confidence ?? 0,
      checked: true,
      supportKey: support ? keyOf(support) : null,
    }
  })
  return { rows, warnings: [...analysis.warnings, ...omitted] }
}

export type PhotoState = {
  /** `form` pide la foto; `analyzing` espera al análisis; `results` lista lo que encontró. */
  step: 'form' | 'analyzing' | 'results'
  file: File | null
  widthText: string
  error: string | null
  rows: PhotoRow[]
  warnings: string[]
}

export const initialState = (): PhotoState => ({ step: 'form', file: null, widthText: '', error: null, rows: [], warnings: [] })

export type PhotoAction =
  | { type: 'open' }
  | { type: 'file'; file: File | null }
  | { type: 'width'; value: string }
  | { type: 'analyzing' }
  | { type: 'analyzed'; rows: PhotoRow[]; warnings: string[] }
  /** Con `stay` el error se muestra sin salir de la lista (por ejemplo, al agregar). */
  | { type: 'failed'; message: string; stay?: boolean }
  | { type: 'toggle'; key: string }
  | { type: 'back' }

/**
 * Marca o desmarca una fila junto con lo que depende de ella: al quitar un soporte se quita lo que estaba apoyado sobre él, y al marcar
 * lo apoyado se marca su soporte (así no queda una tele flotando donde estaba su mueble).
 */
function toggleRow(rows: readonly PhotoRow[], key: string): PhotoRow[] {
  const target = rows.find((row) => row.key === key)
  if (!target) return [...rows]
  const turnOn = !target.checked
  const byKey = new Map(rows.map((row) => [row.key, row]))
  const touched = new Set<string>()
  if (turnOn) {
    for (let row: PhotoRow | undefined = target; row && !touched.has(row.key); row = row.supportKey ? byKey.get(row.supportKey) : undefined) touched.add(row.key)
  } else {
    touched.add(key)
    for (let grew = true; grew; ) {
      grew = false
      for (const row of rows) {
        if (row.supportKey !== null && touched.has(row.supportKey) && !touched.has(row.key)) {
          touched.add(row.key)
          grew = true
        }
      }
    }
  }
  return rows.map((row) => (touched.has(row.key) ? { ...row, checked: turnOn } : row))
}

export function photoReducer(state: PhotoState, action: PhotoAction): PhotoState {
  switch (action.type) {
    case 'open':
      return initialState()
    case 'file':
      return { ...state, file: action.file, error: null }
    case 'width':
      return { ...state, widthText: action.value }
    case 'analyzing':
      return { ...state, step: 'analyzing', error: null }
    case 'analyzed':
      return { ...state, step: 'results', error: null, rows: action.rows, warnings: action.warnings }
    case 'failed':
      return action.stay ? { ...state, error: action.message } : { ...state, step: 'form', error: action.message }
    case 'toggle':
      return { ...state, rows: toggleRow(state.rows, action.key) }
    case 'back':
      return { ...state, step: 'form', error: null, rows: [], warnings: [] }
  }
}

export const checkedRows = (state: PhotoState): PhotoRow[] => state.rows.filter((row) => row.checked)
/** Se puede analizar con una foto elegida y sin otro análisis en curso. */
export const canAnalyze = (state: PhotoState): boolean => state.file !== null && state.step !== 'analyzing'
/** Se puede agregar desde la lista, con al menos un mueble marcado. */
export const canAdd = (state: PhotoState): boolean => state.step === 'results' && checkedRows(state).length > 0

export function selectionSummary(state: PhotoState): string {
  const total = state.rows.length
  return `${checkedRows(state).length} de ${total} ${total === 1 ? 'mueble elegido' : 'muebles elegidos'}`
}

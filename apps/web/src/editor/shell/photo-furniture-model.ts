import { ANALYSES_PER_HOUR } from '@interiores/contract'
import { nameEs } from '@/lib/catalog-es'
import { type ClusterPiece, analysisToCluster } from '@/lib/lab/analysis-to-cluster'
import type { RoomAnalysis } from '@/lib/lab/schema'
import type { CatalogItemLike } from './furniture-model'

/** Textos de «Muebles desde una foto» (castellano, tuteo). */
export const TEXT = {
  title: 'Muebles desde una foto',
  subtitle: 'Sube la foto de un ambiente y te proponemos qué muebles del catálogo hay y dónde. Tú eliges cuáles agregar a tu proyecto.',
  close: 'Cerrar',
  photo: 'Foto del ambiente (JPG, PNG o WebP)',
  privacy: 'Tu foto se envía a Google (Gemini) para reconocer los muebles y no la guardamos. En el nivel gratuito, Google puede usar las fotos para mejorar sus productos: evita las privadas o con personas.',
  limit: `Puedes analizar hasta ${ANALYSES_PER_HOUR} fotos por hora.`,
  width: 'Ancho del ambiente, en metros (opcional)',
  widthPlaceholder: '4,5',
  widthHint: 'Si lo sabes, la distancia entre los muebles se ajusta a ese ancho; si no, supondremos 4 metros.',
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
}

/**
 * Las filas que lista el diálogo y los avisos que las acompañan: los del análisis primero y después lo que el editor dejó afuera
 * (confianza baja, un id que el catálogo local no tiene). Cada detección pasa por `analysisToCluster` por separado, así que
 * conserva su orden y se sabe cuál es cuál; todas arrancan marcadas.
 */
export function detectedRows(
  analysis: RoomAnalysis,
  resolve: (assetId: string) => CatalogItemLike | undefined,
  knownWidthM: number | null,
): { rows: PhotoRow[]; warnings: string[] } {
  const omitted: string[] = []
  const rows = analysis.furniture.flatMap((detected, index): PhotoRow[] => {
    const [piece] = analysisToCluster({ ...analysis, furniture: [detected] }, resolve, { knownWidthM, warn: (message) => omitted.push(message) })
    return piece ? [{ key: `${index}-${detected.asset_id}`, piece, name: nameEs(piece.asset.id, piece.asset.name), confidence: detected.confidence, checked: true }] : []
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
      return { ...state, rows: state.rows.map((row) => (row.key === action.key ? { ...row, checked: !row.checked } : row)) }
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

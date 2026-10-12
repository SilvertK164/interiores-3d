import { type FitResult, fitScale, largestFittingScale, maxExtent, suggestOrientation } from '@/lib/export/fit'
import { type Sheet, sheetFor } from '@/lib/export/sheet'
import { TEXT, fitSummary, noFitMessage, scaleDisabledReason, skippedImagesText } from '@/lib/export/texts-es'
import { type Orientation, type PaperSize, type PlanBuildArgs, type PlanLevel, type PlanMode, type PlanProgress, SCALES, type Scale } from '@/lib/export/types'

export type ExportForm = {
  paper: PaperSize
  orientation: Orientation
  scale: Scale
  mode: PlanMode
  /** Ids de las plantas marcadas. */
  checked: readonly string[]
  titleBlock: boolean
}

export type ExportState = {
  status: 'idle' | 'measuring' | 'ready' | 'generating'
  levels: readonly PlanLevel[]
  form: ExportForm
  /** La persona ya eligió orientación o escala: no se las pisa al cambiar de hoja o de plantas (mientras sigan cabiendo). */
  touched: { orientation: boolean; scale: boolean }
  progress: PlanProgress | null
  message: string | null
  messageKind: 'error' | 'notice' | null
  /** Posición, entre las plantas marcadas, de la que muestra la vista previa. */
  previewIndex: number
}

export type ExportAction =
  | { type: 'open' }
  | { type: 'measured'; levels: readonly PlanLevel[] }
  | { type: 'measureFailed' }
  | { type: 'paper'; value: PaperSize }
  | { type: 'orientation'; value: Orientation }
  | { type: 'scale'; value: Scale }
  | { type: 'mode'; value: PlanMode }
  | { type: 'titleBlock'; value: boolean }
  | { type: 'toggleLevel'; id: string }
  | { type: 'previewLevel'; index: number }
  | { type: 'generate' }
  | { type: 'progress'; value: PlanProgress }
  | { type: 'done'; skippedImages: number }
  | { type: 'failed' }
  | { type: 'cancelled' }
  | { type: 'dismissMessage' }

const DEFAULT_FORM: ExportForm = { paper: 'A4', orientation: 'landscape', scale: 50, mode: 'paper', checked: [], titleBlock: true }

export const initialState: ExportState = {
  status: 'idle',
  levels: [],
  form: DEFAULT_FORM,
  touched: { orientation: false, scale: false },
  progress: null,
  message: null,
  messageKind: null,
  previewIndex: 0,
}

/** Las plantas marcadas, en el orden en que las midió Pascal (de la más baja a la más alta). */
export const selectedLevels = (state: ExportState): PlanLevel[] => state.levels.filter((level) => state.form.checked.includes(level.id))
export const currentSheet = (state: ExportState): Sheet => sheetFor(state.form.paper, state.form.orientation, state.form.titleBlock)

/** Vuelve a calcular lo que depende de la hoja y de las plantas: orientación sugerida, escala que cabe y vista previa. */
function normalize(state: ExportState): ExportState {
  const extent = maxExtent(selectedLevels(state))
  let { orientation, scale } = state.form
  if (!state.touched.orientation) orientation = suggestOrientation(extent, state.form.paper, state.form.titleBlock)
  const sheet = sheetFor(state.form.paper, orientation, state.form.titleBlock)
  const best = largestFittingScale(extent, sheet)
  if (best !== null && (!state.touched.scale || !fitScale(extent, sheet, scale).fits)) scale = best
  const previewIndex = Math.min(state.previewIndex, Math.max(0, selectedLevels(state).length - 1))
  return { ...state, form: { ...state.form, orientation, scale }, previewIndex }
}

export function scaleOptions(state: ExportState): { scale: Scale; fit: FitResult; enabled: boolean; reason: string | null }[] {
  const extent = maxExtent(selectedLevels(state))
  const sheet = currentSheet(state)
  const best = largestFittingScale(extent, sheet)
  return SCALES.map((scale) => {
    const fit = fitScale(extent, sheet, scale)
    return { scale, fit, enabled: fit.fits, reason: fit.fits ? null : scaleDisabledReason(scale, state.form.paper, fit, best) }
  })
}

export const suggestedOrientation = (state: ExportState): Orientation =>
  suggestOrientation(maxExtent(selectedLevels(state)), state.form.paper, state.form.titleBlock)

export function fitInfo(state: ExportState): { summary: string | null; problem: 'nothing' | 'nofit' | null; canDownload: boolean; best: Scale | null } {
  const chosen = selectedLevels(state)
  const extent = maxExtent(chosen)
  const best = largestFittingScale(extent, currentSheet(state))
  if (state.status === 'idle' || state.status === 'measuring') return { summary: null, problem: null, canDownload: false, best }
  if (chosen.length === 0) return { summary: TEXT.errors.nothing, problem: 'nothing', canDownload: false, best }
  if (best === null) return { summary: noFitMessage(state.form.paper), problem: 'nofit', canDownload: false, best }
  const fit = fitScale(extent, currentSheet(state), state.form.scale)
  return { summary: fitSummary(fit), problem: null, canDownload: state.status === 'ready' && fit.fits, best }
}

export function exportReducer(state: ExportState, action: ExportAction): ExportState {
  switch (action.type) {
    case 'open':
      return { ...initialState, status: 'measuring' }
    case 'measured': {
      const checked = action.levels.filter((level) => !level.empty).map((level) => level.id)
      return normalize({ ...initialState, status: 'ready', levels: action.levels, form: { ...DEFAULT_FORM, checked } })
    }
    case 'measureFailed':
      return { ...initialState, status: 'ready', message: TEXT.errors.failed, messageKind: 'error' }
    case 'paper':
      return normalize({ ...state, form: { ...state.form, paper: action.value } })
    case 'orientation':
      return normalize({ ...state, touched: { ...state.touched, orientation: true }, form: { ...state.form, orientation: action.value } })
    case 'scale': {
      const option = scaleOptions(state).find((o) => o.scale === action.value)
      if (!option?.enabled || action.value === state.form.scale) return state
      return { ...state, touched: { ...state.touched, scale: true }, form: { ...state.form, scale: action.value } }
    }
    case 'mode':
      return { ...state, form: { ...state.form, mode: action.value } }
    case 'titleBlock':
      return normalize({ ...state, form: { ...state.form, titleBlock: action.value } })
    case 'toggleLevel': {
      const level = state.levels.find((l) => l.id === action.id)
      if (!level || level.empty) return state
      const isOn = state.form.checked.includes(action.id)
      if (isOn && state.form.checked.length === 1) return state
      const checked = state.levels.filter((l) => (l.id === action.id ? !isOn : state.form.checked.includes(l.id))).map((l) => l.id)
      return normalize({ ...state, form: { ...state.form, checked } })
    }
    case 'previewLevel':
      return normalize({ ...state, previewIndex: Math.max(0, action.index) })
    case 'generate':
      if (!fitInfo(state).canDownload) return state
      return { ...state, status: 'generating', progress: { done: 0, total: selectedLevels(state).length }, message: null, messageKind: null }
    case 'progress':
      return state.status === 'generating' ? { ...state, progress: action.value } : state
    case 'done':
      return {
        ...state,
        status: 'ready',
        progress: null,
        message: action.skippedImages > 0 ? skippedImagesText(action.skippedImages) : null,
        messageKind: action.skippedImages > 0 ? 'notice' : null,
      }
    case 'failed':
      return { ...state, status: 'ready', progress: null, message: TEXT.errors.failed, messageKind: 'error' }
    case 'cancelled':
      return { ...state, status: 'ready', progress: null, message: TEXT.errors.cancelled, messageKind: 'notice' }
    case 'dismissMessage':
      return { ...state, message: null, messageKind: null }
  }
}

type Meta = { projectName: string; author: string; date: Date }

/** Las opciones del PDF completo (una hoja por planta marcada). */
export function buildArgs(state: ExportState, meta: Meta): PlanBuildArgs {
  const { paper, orientation, scale, mode, titleBlock } = state.form
  return { paper, orientation, scale, mode, levelIds: selectedLevels(state).map((level) => level.id), titleBlock, ...meta }
}

/** Las opciones de la vista previa: solo la planta que se está viendo, numerada como en el PDF completo. */
export function previewArgs(state: ExportState, meta: Meta): PlanBuildArgs {
  const chosen = selectedLevels(state)
  const level = chosen[state.previewIndex]
  return { ...buildArgs(state, meta), levelIds: level ? [level.id] : [], sheetNumbers: { start: state.previewIndex, total: chosen.length } }
}

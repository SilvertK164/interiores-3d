/** Tipos compartidos de la exportación de planos. Código puro: sin Pascal ni DOM (excepto `Blob`, `AbortSignal` y `Date`, que son del lenguaje). */
export type PaperSize = 'A4' | 'A3'
export type Orientation = 'landscape' | 'portrait'
/** Papel = blanco y negro para imprimir; Color = ambientes, pisos y muebles para presentar. */
export type PlanMode = 'paper' | 'color'

/** Escalas que ofrece el diálogo (decisión de Silvert, 2026-10-12): 1:25, 1:50 y 1:100. */
export const SCALES = [25, 50, 100] as const
export type Scale = (typeof SCALES)[number]

/** Medidas de un dibujo en metros. */
export type Extent = { widthM: number; heightM: number }

/** Una planta como la ve el diálogo: el nombre ya está en castellano. */
export type PlanLevel = Extent & { id: string; label: string; empty: boolean }

/** Una planta como la mide Pascal, antes de ponerle nombre (`name` nulo = sin nombre propio). */
export type LevelMeasure = Extent & { id: string; name: string | null; level: number; empty: boolean }

export type PlanOptions = {
  paper: PaperSize
  orientation: Orientation
  scale: Scale
  mode: PlanMode
  /** Ids de las plantas elegidas. */
  levelIds: readonly string[]
  titleBlock: boolean
  /** Suma una hoja isométrica por planta al final del PDF. */
  isometric?: boolean
  projectName: string
  /** Nombre de la cuenta (o el correo si no tiene nombre). */
  author: string
  date: Date
}

export type PlanProgress = { done: number; total: number }

/** La foto isométrica de una planta (PNG), ya en el estilo del modo elegido. */
export type IsoImage = { levelId: string; bytes: ArrayBuffer }

export type PlanBuildArgs = PlanOptions & {
  isoImages?: readonly IsoImage[]
  /** Vista previa de una hoja isométrica: el PDF trae la planta y, como página 2, su hoja isométrica. */
  isoPreview?: boolean
  onProgress?: (progress: PlanProgress) => void
  signal?: AbortSignal
  /** Para la vista previa de una sola planta: "Hoja `start + 1` de `total`" en lugar de "Hoja 1 de 1". */
  sheetNumbers?: { start: number; total: number }
}

export type PlanResult = { blob: Blob; pages: number; skippedImages: number }

/** `bridge.plan`: lo único que el diálogo sabe de Pascal. */
export type PlanBridge = {
  measureLevels(): Promise<PlanLevel[]>
  build(args: PlanBuildArgs): Promise<PlanResult>
}

/** Las dos funciones reales (o de mentira, en las pruebas) que alimentan a `bridge.plan`. */
export type PlanDeps = {
  measureLevels(): Promise<LevelMeasure[]>
  buildPlan(args: PlanBuildArgs): Promise<PlanResult>
}

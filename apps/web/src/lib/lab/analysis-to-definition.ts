import type { TemplateDefinition } from '../templates/types'
import { LabNotImplementedError } from './lab-error'
import type { RoomAnalysis } from './schema'

/** Lo que `analysisToDefinition` recibe además del análisis. */
export type AnalysisToDefinitionOptions = {
  /** Ancho del ambiente en metros si la persona lo escribió en el formulario; `null` o ausente si no lo sabe. */
  knownWidthM?: number | null
  /** Para contarle algo a la persona sobre lo modelado (por ejemplo, una pieza que no se pudo representar): la página lo muestra junto a los avisos de TP3. */
  warn?: (message: string) => void
}

/**
 * Aquí va el modelado con Pascal: convertir lo que TP3 detectó en un `TemplateDefinition`, es decir, un ambiente con sus
 * muros, aberturas y piezas que el editor sabe dibujar. Es el espacio de exploración del Laboratorio de Victoria.
 *
 * Qué entra y qué sale:
 *  - Entra el análisis de TP3 (forma en `schema.ts`; `SAMPLE_ANALYSIS` trae uno de ejemplo con siete piezas del catálogo: cada
 *    `asset_id` es el id de una pieza de Pascal que el catálogo local de `analysis-catalog.ts` ofreció a TP3).
 *  - Sale una definición de plantilla (tipos en `src/lib/templates/types.ts`, ayudas en `geometry.ts` y ejemplos reales en
 *    `src/lib/templates/definitions/`). Con ella ya funciona el resto del camino: la página la convierte en escena con
 *    `buildLabEnvelope`, crea el proyecto, lo guarda y abre el editor. Si la definición tiene un problema, el mensaje del
 *    validador (`validate.ts`) aparece en pantalla.
 *
 * Qué medidas tiene el ambiente, qué pieza de Pascal representa cada tipo, cómo se trata lo dudoso: todo eso queda abierto
 * para explorar. La guía («Por dónde empezar») y las convenciones útiles están en lab/README.md.
 *
 * Mientras esté en blanco lanza `LabNotImplementedError`, y la página lo muestra con un mensaje amable. Cuando quieras
 * empezar, basta con reemplazar el `throw` por tu definición.
 */
export function analysisToDefinition(_analysis: RoomAnalysis, _opts: AnalysisToDefinitionOptions = {}): TemplateDefinition {
  throw new LabNotImplementedError()
}

import { nameEs } from '../catalog-es'

/** Límites de TP3 para `catalog_json` (`MAX_CATALOG_ITEMS` y `MAX_CATALOG_BYTES` de TP3/backend/main.py). */
export const MAX_CATALOG_ITEMS = 100
export const MAX_CATALOG_BYTES = 64 * 1024

/**
 * Lo que se le cuenta a TP3 de cada pieza que puede elegir: nada más que esto. Sin rutas, sin `src` y sin medidas, porque TP3 (y
 * Gemini) solo escogen un identificador y el tamaño real sale siempre del catálogo local. TP3 rechaza cualquier campo de más.
 */
export type AnalysisCandidate = { id: string; name: string; category: string; tags: string[] }

/** Lo mínimo que se pide de una pieza local (el `CatalogItem` de Pascal ya localizado trae esto y mucho más). */
export type LocalPieceLike = { id: string; name: string; attachTo?: string; tool?: string }

export type AnalysisCatalog<T extends LocalPieceLike> = {
  /** Lo que viaja a TP3 en `catalog_json`. */
  candidates: AnalysisCandidate[]
  /** id → pieza local de cada candidata: con esto se resuelve lo que TP3 devuelve (solo ids de la lista enviada). */
  pieces: ReadonlyMap<string, T>
}

type Meta = { category: string; tags: readonly string[] }

/**
 * Las piezas que una persona reconoce en la foto de un ambiente (mobiliario y decoración que se apoyan en el piso), con la
 * categoría y las etiquetas que ayudan a Gemini a distinguirlas (los nombres salen de `catalog-es`). Quedan fuera las
 * instalaciones y artefactos chicos (detectores, termostatos, hidrantes), lo que se cuelga de pared o techo (no hay dónde
 * colgarlo en un conjunto suelto), lo que va sobre una mesa (lámparas de mesa, electrodomésticos chicos) y el gabinete modular
 * (que se arma con su propia herramienta). Una pieza nueva de Pascal no es candidata hasta que se la agrega aquí.
 */
const RECOGNIZABLE: Readonly<Record<string, Meta>> = {
  sofa: { category: 'seating', tags: ['living-room', 'couch', 'seat'] },
  'livingroom-chair': { category: 'seating', tags: ['living-room', 'armchair', 'seat'] },
  'lounge-chair': { category: 'seating', tags: ['lounge', 'armchair', 'reclining'] },
  'coffee-table': { category: 'tables', tags: ['living-room', 'low-table'] },
  'tv-stand': { category: 'storage', tags: ['living-room', 'tv-unit', 'media-console'] },
  television: { category: 'electronics', tags: ['living-room', 'tv', 'screen'] },
  bookshelf: { category: 'storage', tags: ['bookcase', 'shelving', 'books'] },
  'floor-lamp': { category: 'lighting', tags: ['lamp', 'standing-lamp', 'light'] },
  'rectangular-carpet': { category: 'rugs', tags: ['rug', 'floor-covering', 'rectangular'] },
  'round-carpet': { category: 'rugs', tags: ['rug', 'floor-covering', 'round'] },
  piano: { category: 'instruments', tags: ['music', 'keyboard'] },
  'dining-table': { category: 'tables', tags: ['dining-room', 'table', 'eating'] },
  'dining-chair': { category: 'seating', tags: ['dining-room', 'chair'] },
  stool: { category: 'seating', tags: ['bar-stool', 'counter', 'seat'] },
  'office-table': { category: 'tables', tags: ['office', 'desk', 'workspace'] },
  'office-chair': { category: 'seating', tags: ['office', 'swivel-chair', 'desk-chair'] },
  'single-bed': { category: 'beds', tags: ['bedroom', 'one-person', 'mattress'] },
  'double-bed': { category: 'beds', tags: ['bedroom', 'two-person', 'mattress'] },
  bunkbed: { category: 'beds', tags: ['bedroom', 'bunk', 'kids'] },
  'bedside-table': { category: 'storage', tags: ['bedroom', 'nightstand', 'small-table'] },
  dresser: { category: 'storage', tags: ['bedroom', 'chest-of-drawers', 'drawers'] },
  closet: { category: 'storage', tags: ['bedroom', 'wardrobe', 'tall-cabinet'] },
  'coat-rack': { category: 'storage', tags: ['entryway', 'hanger', 'hooks'] },
  'indoor-plant': { category: 'plants', tags: ['houseplant', 'large-plant', 'pot'] },
  'small-indoor-plant': { category: 'plants', tags: ['houseplant', 'small-plant', 'pot'] },
  cactus: { category: 'plants', tags: ['succulent', 'small-plant', 'pot'] },
  'trash-bin': { category: 'utility', tags: ['waste', 'bin'] },
  'pool-table': { category: 'recreation', tags: ['game-room', 'billiards'] },
  kitchen: { category: 'kitchen', tags: ['kitchen', 'cabinetry', 'island'] },
  'kitchen-counter': { category: 'kitchen', tags: ['kitchen', 'counter', 'worktop'] },
  'kitchen-cabinet': { category: 'kitchen', tags: ['kitchen', 'cabinet', 'storage'] },
  fridge: { category: 'kitchen', tags: ['kitchen', 'refrigerator', 'appliance'] },
  stove: { category: 'kitchen', tags: ['kitchen', 'cooker', 'oven'] },
  'washing-machine': { category: 'appliances', tags: ['laundry', 'washer'] },
  bathtub: { category: 'bathroom', tags: ['bathroom', 'bath', 'tub'] },
  toilet: { category: 'bathroom', tags: ['bathroom', 'wc'] },
  'bathroom-sink': { category: 'bathroom', tags: ['bathroom', 'sink', 'vanity'] },
  'shower-angle': { category: 'bathroom', tags: ['bathroom', 'shower', 'corner-shower'] },
  'shower-square': { category: 'bathroom', tags: ['bathroom', 'shower', 'square-shower'] },
}

/** Los ids que pueden ser candidatos, en el orden en que se ofrecen. */
export const RECOGNIZABLE_IDS: readonly string[] = Object.keys(RECOGNIZABLE)

/** El JSON exacto que viaja en `catalog_json`: compacto y con las tildes tal cual (TP3 mide sus bytes en UTF-8). */
export const serializeCandidates = (candidates: readonly AnalysisCandidate[]): string => JSON.stringify(candidates)

const encodedSize = (candidates: readonly AnalysisCandidate[]) => new TextEncoder().encode(serializeCandidates(candidates)).length

/** Recorta la lista a lo que TP3 acepta (hasta 100 opciones y 64 KB), conservando el orden: solo se pierde la cola. */
export function fitToLimits(candidates: readonly AnalysisCandidate[]): AnalysisCandidate[] {
  const kept: AnalysisCandidate[] = []
  for (const candidate of candidates) {
    if (kept.length >= MAX_CATALOG_ITEMS || encodedSize([...kept, candidate]) > MAX_CATALOG_BYTES) break
    kept.push(candidate)
  }
  return kept
}

/**
 * Arma lo que TP3 necesita para elegir piezas: los candidatos (id, nombre en castellano, categoría y etiquetas) y el mapa
 * id → pieza local con el que luego se resuelve cada `asset_id` devuelto. Solo son candidatas las piezas reconocibles que de
 * verdad están en `items` (el catálogo local), sin las que se cuelgan de pared o techo ni las de herramienta propia; si un id
 * viene repetido gana la primera. Siempre sale en el mismo orden, y dentro de los límites de TP3.
 */
export function buildAnalysisCatalog<T extends LocalPieceLike>(items: readonly T[]): AnalysisCatalog<T> {
  const byId = new Map<string, T>()
  for (const item of items) {
    if (RECOGNIZABLE[item.id] && !item.attachTo && !item.tool && !byId.has(item.id)) byId.set(item.id, item)
  }
  const candidates = fitToLimits(
    RECOGNIZABLE_IDS.flatMap((id) => {
      const item = byId.get(id)
      const meta = RECOGNIZABLE[id]
      return item && meta ? [{ id, name: nameEs(id, item.name), category: meta.category, tags: [...meta.tags] }] : []
    }),
  )
  const pieces = new Map<string, T>()
  for (const { id } of candidates) pieces.set(id, byId.get(id) as T)
  return { candidates, pieces }
}

/** Nombre en castellano de una pieza que propuso TP3; si no es del catálogo enviado lo dice, con el id tal cual. */
export function pieceLabel(assetId: string, candidates: readonly AnalysisCandidate[]): string {
  return candidates.find((c) => c.id === assetId)?.name ?? `${assetId} (no está en el catálogo)`
}

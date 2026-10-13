import { CARPET_ASSETS } from '../../editor/carpet-order'
import { MAX_SUPPORT_M, MIN_CONFIDENCE } from './layout-constants'
import { normalizeDeg } from './layout-geometry'
import { type Entry, type SolverAsset, labelOf } from './layout-types'
import type { RoomAnalysis } from './schema'

/** Medida de una pieza sin `dimensions`: la que usa Pascal por omisión (1 × 1 × 1 m). */
const DEFAULT_SIDE_M = 1

/** `[ancho, alto, fondo]` reales del catálogo; si no se conocen (o no son tres números positivos), 1 × 1 × 1 m. */
function realSize(asset: SolverAsset): [number, number, number] {
  const [w, h, d] = asset.dimensions ?? []
  const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0
  return ok(w) && ok(h) && ok(d) ? [w, h, d] : [DEFAULT_SIDE_M, DEFAULT_SIDE_M, DEFAULT_SIDE_M]
}

/**
 * Saca una pieza de la lista con su aviso y, en cadena, todo lo que estaba apoyado sobre ella (una tele sin su mueble no tiene dónde
 * quedar: se omite también). `reason` es lo que se le cuenta a la persona de la pieza que se saca.
 */
export function dropEntry<T extends SolverAsset>(entries: Entry<T>[], entry: Entry<T>, reason: string, warnings: string[]): void {
  const at = entries.indexOf(entry)
  if (at < 0) return
  entries.splice(at, 1)
  warnings.push(`Se omitió «${entry.label}»: ${reason}`)
  for (const dependent of entries.filter((other) => other.supportSource === entry.source)) {
    dropEntry(entries, dependent, `estaba apoyado sobre «${entry.label}», que se omitió.`, warnings)
  }
}

/**
 * Las piezas del plano que se pueden acomodar: las del catálogo local y con la confianza suficiente (lo demás sale con aviso, nunca
 * se sustituye por otra pieza). Cada una trae su tamaño real y, si está apoyada, cuál es su soporte: un soporte que se descartó se
 * lleva a lo apoyado; uno de más de 1,4 m (una biblioteca) o un ciclo (que el contrato ya rechaza) dejan la pieza en el piso.
 */
export function collectEntries<T extends SolverAsset>(analysis: RoomAnalysis, resolve: (assetId: string) => T | undefined, warnings: string[]): Entry<T>[] {
  const entries: Entry<T>[] = []
  const dropped = new Map<number, string>()
  analysis.furniture.forEach((detected, source) => {
    const asset = resolve(detected.asset_id)
    if (!asset) {
      warnings.push(`El análisis propuso «${detected.asset_id}», que no está en el catálogo de este editor: no se agregó.`)
      dropped.set(source, detected.asset_id)
      return
    }
    const label = labelOf(asset)
    if (detected.confidence < MIN_CONFIDENCE) {
      warnings.push(`Se omitió «${label}»: el análisis no está seguro de que esté en la foto (confianza de ${Math.round(detected.confidence * 100)} %).`)
      dropped.set(source, label)
      return
    }
    const [width, height, depth] = realSize(asset)
    const rug = CARPET_ASSETS.has(asset.id)
    entries.push({
      source,
      asset,
      label,
      width,
      height,
      depth,
      confidence: detected.confidence,
      gx: detected.x_m,
      gz: detected.z_m,
      x: detected.x_m,
      z: detected.z_m,
      y: 0,
      facing: normalizeDeg(detected.facing_deg),
      wall: rug ? null : detected.against_wall,
      hx: 0,
      hz: 0,
      supportSource: rug || detected.on_top_of === source ? null : detected.on_top_of, // una alfombra siempre está en el piso
      rug,
      movedBy: { wall: 0, inside: 0, overlap: 0, opening: 0 },
    })
  })
  settleSupports(entries, dropped, warnings)
  return entries
}

/** Resuelve de qué está apoyada cada pieza: sin soporte válido, sin ciclos y sin apoyarse sobre algo demasiado alto. */
function settleSupports<T extends SolverAsset>(entries: Entry<T>[], dropped: ReadonlyMap<number, string>, warnings: string[]): void {
  const bySource = () => new Map(entries.map((entry) => [entry.source, entry]))
  // Una pieza apoyada sobre otra que se descartó se omite (y lo que esté sobre ella).
  for (const entry of [...entries]) {
    const support = entry.supportSource
    if (support !== null && dropped.has(support)) dropEntry(entries, entry, `estaba apoyado sobre «${dropped.get(support)}», que se omitió.`, warnings)
  }
  let known = bySource()
  for (const entry of entries) {
    if (entry.supportSource !== null && !known.has(entry.supportSource)) entry.supportSource = null // un índice que no existe
  }
  // Los ciclos (A sobre B y B sobre A): todas las piezas del ciclo quedan en el piso.
  const cyclic = entries.filter((entry) => {
    let current = known.get(entry.supportSource ?? -1)
    for (let steps = 0; current && steps <= entries.length; steps++) {
      if (current === entry) return true
      current = known.get(current.supportSource ?? -1)
    }
    return false
  })
  for (const entry of cyclic) entry.supportSource = null
  // Sobre algo muy alto no se apoya nada.
  known = bySource()
  for (const entry of entries) {
    const support = known.get(entry.supportSource ?? -1)
    if (support && support.height > MAX_SUPPORT_M) {
      warnings.push(`«${entry.label}» no puede apoyarse sobre «${support.label}» (mide más de 1,4 m): se dejó en el piso.`)
      entry.supportSource = null
    }
  }
}

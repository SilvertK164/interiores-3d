type Polygon = readonly (readonly [number, number])[]

export type WalkSpawn = { x: number; z: number; yaw: number }

const area = (polygon: Polygon) => {
  let twice = 0
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length] as readonly [number, number]
    twice += a[0] * b[1] - b[0] * a[1]
  })
  return twice / 2
}

const inside = (polygon: Polygon, x: number, z: number) => {
  let on = false
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length] as readonly [number, number]
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) on = !on
  })
  return on
}

const edgeDistance = (polygon: Polygon, x: number, z: number) => {
  let best = Number.POSITIVE_INFINITY
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length] as readonly [number, number]
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const len = dx * dx + dz * dz || 1
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / len))
    best = Math.min(best, Math.hypot(x - (a[0] + t * dx), z - (a[1] + t * dz)))
  })
  return best
}

/** Un punto dentro del polígono: el centroide si cae dentro y, si no (una L), el punto más alejado de las paredes. */
function interiorPoint(polygon: Polygon): [number, number] {
  const a = area(polygon)
  let cx = 0
  let cz = 0
  polygon.forEach((p, i) => {
    const q = polygon[(i + 1) % polygon.length] as readonly [number, number]
    const cross = p[0] * q[1] - q[0] * p[1]
    cx += (p[0] + q[0]) * cross
    cz += (p[1] + q[1]) * cross
  })
  const centroid: [number, number] = [cx / (6 * a), cz / (6 * a)]
  if (inside(polygon, centroid[0], centroid[1])) return centroid
  const xs = polygon.map((p) => p[0])
  const zs = polygon.map((p) => p[1])
  let best = centroid
  let bestDistance = -1
  for (let i = 0; i <= 24; i++) {
    for (let j = 0; j <= 24; j++) {
      const x = Math.min(...xs) + ((Math.max(...xs) - Math.min(...xs)) * i) / 24
      const z = Math.min(...zs) + ((Math.max(...zs) - Math.min(...zs)) * j) / 24
      if (!inside(polygon, x, z)) continue
      const d = edgeDistance(polygon, x, z)
      if (d > bestDistance) {
        bestDistance = d
        best = [x, z]
      }
    }
  }
  return best
}

/**
 * Dónde empieza Recorrer: el centro del ambiente más grande de la planta activa, mirando hacia el extremo más lejano.
 * `yaw` usa el convenio de Pascal (`deriveFirstPersonSpawn`: `atan2(-dx, -dz)`). Sin ambientes devuelve `null`.
 */
export function pickSpawn(zones: readonly { polygon: Polygon }[]): WalkSpawn | null {
  const valid = zones.filter((z) => z.polygon.length >= 3 && Math.abs(area(z.polygon)) > 0.5)
  const biggest = [...valid].sort((a, b) => Math.abs(area(b.polygon)) - Math.abs(area(a.polygon)))[0]
  if (!biggest) return null
  const [x, z] = interiorPoint(biggest.polygon)
  let far: readonly [number, number] = biggest.polygon[0] as readonly [number, number]
  for (const p of biggest.polygon) if (Math.hypot(p[0] - x, p[1] - z) > Math.hypot(far[0] - x, far[1] - z)) far = p
  return { x, z, yaw: Math.atan2(-(far[0] - x), -(far[1] - z)) }
}

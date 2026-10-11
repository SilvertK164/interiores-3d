export type Pt = [number, number]

export type WallDef = {
  id: string
  from: Pt
  to: Pt
  name?: string
  /** Alto del muro en metros (parapetos y barandas); por defecto, el alto del nivel. */
  height?: number
  /** Material del lado que mira a un ambiente (id de la biblioteca de Pascal). */
  inside?: string
  /** Material del lado de afuera. */
  outside?: string
}

export type RoomDef = {
  id: string
  name: string
  color: string
  rect: [number, number, number, number]
  /** Material del piso (id de la biblioteca). */
  floor?: string
  /** Material del cielo; `null` = sin cielo (terraza). Si falta, el cielo queda sin material. */
  ceiling?: string | null
  /** Bordes que no llevan muro (por ejemplo, el entrepiso que mira a la planta baja). */
  open?: ('n' | 'e' | 's' | 'w')[]
}

export type OpeningDef = {
  id: string
  type: 'door' | 'window'
  wall: string
  /** Distancia en metros desde el inicio (`from`) del muro hasta el centro de la abertura. */
  at: number
  width: number
  height?: number
  /** Solo ventanas: altura del borde inferior sobre el piso. */
  sill?: number
  name?: string
}

export type ItemDef = { asset: string; at: Pt; rotY?: number; y?: number }

export type StairDef = {
  id: string
  /** Punto de arranque de la escalera en el nivel donde está definida. */
  at: Pt
  rotY: number
  width: number
  steps: number
  /** Id del nivel al que sube. */
  to: string
  rail?: 'none' | 'left' | 'right' | 'both'
}

export type LevelDef = {
  id: string
  height?: number
  /** Material por defecto del lado interior de los muros de este nivel. */
  wallInside?: string
  /** Material por defecto del lado exterior. */
  wallOutside?: string
  /** Zócalo y cornisa en los muros interiores. */
  trim?: boolean
  walls: WallDef[]
  rooms: RoomDef[]
  openings: OpeningDef[]
  items: ItemDef[]
  stairs?: StairDef[]
}

export type TemplateDefinition = {
  id: string
  kind: 'vivienda' | 'comercio'
  name: string
  summary: string
  /** El primero es la planta baja; la escalera de cada nivel sube al que indica `to`. */
  levels: LevelDef[]
}

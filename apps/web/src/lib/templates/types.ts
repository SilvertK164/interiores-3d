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
  /** Pie de la escalera (donde pisas el primer escalón) en el nivel donde está definida. */
  at: Pt
  /** Con 0 la escalera sube caminando hacia +z; con π/2, hacia +x; con π, hacia -z; con -π/2, hacia -x. */
  rotY: number
  /** Recorrido horizontal en metros (por defecto 3, como en Pascal): el último escalón queda a esta distancia de `at`. */
  run?: number
  /** Ancho, centrado sobre el eje de subida. */
  width: number
  steps: number
  /** Id del nivel al que sube. */
  to: string
  rail?: 'none' | 'left' | 'right' | 'both'
}

/** Estante paramétrico de Pascal. `at` es el centro de su base; el frente mira a +z cuando `rotY` es 0. */
export type ShelfDef = {
  id: string
  /** `open-rack` = góndola industrial; `bookshelf` = biblioteca; `cubby` = exhibidor de casilleros; `wall-shelf` = repisa. */
  style: 'wall-shelf' | 'bookshelf' | 'open-rack' | 'cubby'
  at: Pt
  rotY?: number
  /** Altura de la base sobre el piso (por ejemplo, una repisa de pared); por defecto, sobre la losa. */
  y?: number
  width: number
  depth: number
  height: number
  rows?: number
  columns?: number
  withBack?: boolean
  withBottom?: boolean
  /** Material de la biblioteca de Pascal. */
  material?: string
  name?: string
}

/** Un compartimento del módulo de un gabinete (los mismos nombres y campos que `CabinetNode` de Pascal). */
export type CompartmentDef =
  | { type: 'door'; doorType?: 'single-left' | 'single-right' | 'double' | 'glass'; shelfCount?: number }
  | { type: 'drawer'; drawerCount?: number }
  | { type: 'shelf'; shelfCount?: number }
  | { type: 'sink'; sinkLayout?: 'single' | 'double' | 'double-offset' }
  | { type: 'fridge-single' | 'fridge-double' | 'fridge-top-freezer' | 'fridge-bottom-freezer' | 'oven' | 'microwave' | 'dishwasher' }

export type CabinetModuleDef = { width: number; stack: CompartmentDef[] }

/**
 * Corrida de gabinetes paramétricos: módulos en fila sobre el eje local x. `at` es el centro de la base de toda la corrida;
 * el frente mira a +z cuando `rotY` es 0. Sirve para mostradores, cajas, barras, vitrinas y heladeras de exhibición.
 */
export type CabinetDef = {
  id: string
  at: Pt
  rotY?: number
  y?: number
  depth: number
  /** Alto del cuerpo (sin zócalo ni mesada); Pascal usa 0,8 m en gabinetes bajos. */
  height: number
  tier?: 'base' | 'tall'
  /** Mesada; por defecto, sí en `base` y no en `tall`. */
  countertop?: boolean
  frontStyle?: 'slab' | 'shaker' | 'raised-arch'
  /** Barra elevada por el lado de atrás (para sentarse en banquetas). */
  bar?: boolean
  material?: string
  name?: string
  modules: CabinetModuleDef[]
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
  shelves?: ShelfDef[]
  cabinets?: CabinetDef[]
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

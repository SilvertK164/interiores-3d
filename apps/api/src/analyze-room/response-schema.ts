import { type CatalogOption, WALL_SIDES } from '@interiores/contract'

const number = (description?: string): { type: 'NUMBER'; description?: string } => (description ? { type: 'NUMBER', description } : { type: 'NUMBER' })
const WALLS = { type: 'STRING', enum: [...WALL_SIDES] } as const

/**
 * El esquema de la respuesta de Gemini (`responseSchema`): el plano del contrato (`RoomAnalysisSchema`). Las propiedades llevan
 * `propertyOrdering` porque el JSON sale en ese orden y el modelo razona al escribirlo: primero el ambiente, después la cámara, las
 * aberturas y los muebles (con su centro y su giro antes de si están contra un muro o apoyados). Cada mueble elige su `asset_id`
 * entre las opciones recibidas (enumeradas); `against_wall` y `on_top_of` son obligatorios pero pueden ser nulos. Las descripciones
 * son cortas: dicen la unidad y el sentido de cada número, que es lo que el modelo suele confundir.
 */
export function responseSchemaFor(catalog: readonly CatalogOption[]) {
  const room = {
    type: 'OBJECT',
    propertyOrdering: ['width_m', 'depth_m'],
    properties: {
      width_m: number('De oeste a este, en metros (1,5 a 12)'),
      depth_m: number('De norte a sur, en metros (1,5 a 12)'),
    },
    required: ['width_m', 'depth_m'],
  } as const

  const camera = {
    type: 'OBJECT',
    propertyOrdering: ['x_m', 'z_m', 'look_at', 'fov_deg'],
    properties: {
      x_m: number('Dónde estaba quien sacó la foto, en metros desde la esquina noroeste (x hacia el este)'),
      z_m: number('Dónde estaba quien sacó la foto, en metros desde la esquina noroeste (z hacia el sur)'),
      look_at: {
        type: 'OBJECT',
        description: 'El punto del plano al que apunta el centro de la foto (distinto de la posición de la cámara)',
        propertyOrdering: ['x_m', 'z_m'],
        properties: { x_m: number(), z_m: number() },
        required: ['x_m', 'z_m'],
      },
      fov_deg: number('Campo de visión vertical en grados (30 a 100); omítelo si no es evidente'),
    },
    required: ['x_m', 'z_m', 'look_at'],
  } as const

  const opening = {
    type: 'OBJECT',
    propertyOrdering: ['type', 'wall', 'at_m', 'width_m'],
    properties: {
      type: { type: 'STRING', enum: ['door', 'window'] },
      wall: WALLS,
      at_m: number('Metros hasta el CENTRO de la abertura, desde la esquina izquierda mirando el muro desde dentro del ambiente'),
      width_m: number('Ancho de la abertura en metros'),
    },
    required: ['type', 'wall', 'at_m', 'width_m'],
  } as const

  const furnitureKeys = ['asset_id', 'x_m', 'z_m', 'facing_deg', 'against_wall', 'on_top_of', 'confidence'] as const
  const piece = {
    type: 'OBJECT',
    propertyOrdering: [...furnitureKeys],
    properties: {
      asset_id: { type: 'STRING', enum: catalog.map((option) => option.id) },
      x_m: number('Centro de la huella en metros desde la esquina noroeste (x hacia el este)'),
      z_m: number('Centro de la huella en metros desde la esquina noroeste (z hacia el sur)'),
      facing_deg: number('Hacia dónde mira el frente: 0 = mira al sur, giro horario visto desde arriba (90 oeste, 180 norte, 270 este)'),
      against_wall: { ...WALLS, nullable: true, description: 'El muro que toca su parte de atrás, o null' },
      on_top_of: { type: 'INTEGER', nullable: true, description: 'Índice (desde 0) de otro mueble de esta lista sobre el que está apoyado, o null si está en el piso' },
      confidence: number('Entre 0 y 1'),
    },
    required: [...furnitureKeys],
  } as const

  const keys = ['room', 'camera', 'openings', 'furniture', 'warnings'] as const
  return {
    type: 'OBJECT',
    propertyOrdering: [...keys],
    properties: {
      room,
      camera,
      openings: { type: 'ARRAY', items: opening },
      furniture: { type: 'ARRAY', items: piece },
      warnings: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: [...keys],
  } as const
}

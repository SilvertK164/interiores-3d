import { COUNTER_Y, perimeter, row, shelfRow } from '../geometry'
import type { CabinetDef, TemplateDefinition } from '../types'

const Q = Math.PI / 2
const DOOR = { type: 'door', doorType: 'double' } as const
const DRAWERS = { type: 'drawer', drawerCount: 3 } as const
const GLASS_LOW = { type: 'door', doorType: 'glass', shelfCount: 3 } as const
const COOLER = { type: 'fridge-double' } as const

const rack = { style: 'open-rack', width: 1.5, depth: 0.5, height: 1.8, rows: 5, withBack: true, name: 'Góndola' } as const
const coolerWall = (id: string, x: number): CabinetDef => ({
  id,
  name: 'Heladeras de exhibición',
  at: [x, 0.6],
  depth: 0.7,
  height: 1.9,
  tier: 'tall',
  modules: [{ width: 0.9, stack: [COOLER] }, { width: 0.9, stack: [COOLER] }, { width: 0.9, stack: [COOLER] }],
})
const checkout = (n: number, x: number): CabinetDef => ({
  id: `caja-${n}`,
  name: `Caja ${n}`,
  at: [x, 9.4],
  depth: 0.7,
  height: 0.8,
  material: 'preset-charcoal',
  modules: [{ width: 0.6, stack: [DRAWERS] }, { width: 0.6, stack: [DOOR] }],
})

/** Supermercado de barrio de 18 × 11 m: concreto pulido, pared de heladeras, góndolas en pasillos, tres cajas, panadería y depósito. */
export const supermercado: TemplateDefinition = {
  id: 'supermercado',
  kind: 'comercio',
  name: 'Supermercado de barrio',
  summary: 'Salón con pared de heladeras, góndolas en pasillos y tres cajas; panadería con vitrina, depósito con portón, oficina y baños.',
  levels: [
    {
      id: 'pb',
      height: 3.6,
      wallInside: 'concrete-plaster',
      wallOutside: 'concrete-stucco',
      trim: true,
      walls: [
        ...perimeter('p', 0, 0, 18, 11),
        { id: 'div', from: [13, 0], to: [13, 11] },
        { id: 'div-pan', from: [13, 4.5], to: [18, 4.5] },
        { id: 'div-dep', from: [13, 8], to: [18, 8] },
        { id: 'div-ofi', from: [15.5, 8], to: [15.5, 11] },
      ],
      rooms: [
        { id: 'salon', name: 'Salón de ventas', color: '#1F5FE0', rect: [0, 0, 13, 11], floor: 'concrete-polished', ceiling: 'concrete-raw' },
        { id: 'panaderia', name: 'Panadería', color: '#B97A00', rect: [13, 0, 18, 4.5], floor: 'flooring-tile85a', ceiling: 'concrete-drywall' },
        { id: 'deposito', name: 'Depósito', color: '#7A8AA8', rect: [13, 4.5, 18, 8], floor: 'concrete-polished', ceiling: 'concrete-raw' },
        { id: 'oficina', name: 'Oficina', color: '#1FA971', rect: [13, 8, 15.5, 11], floor: 'wood-woodfine22', ceiling: 'concrete-plaster' },
        { id: 'banos', name: 'Baños', color: '#1FA971', rect: [15.5, 8, 18, 11], floor: 'flooring-tile85a', ceiling: 'concrete-drywall' },
      ],
      openings: [
        { id: 'puerta-doble', type: 'door', wall: 'p-s', at: 3, width: 2.4, height: 2.4 },
        { id: 'vidriera', type: 'window', wall: 'p-s', at: 8.5, width: 5, height: 2.4, sill: 0.3 },
        { id: 'ventana-oeste', type: 'window', wall: 'p-w', at: 5.5, width: 3 },
        { id: 'porton', type: 'door', wall: 'p-e', at: 6.2, width: 2.2, height: 2.6 },
        { id: 'puerta-panaderia', type: 'door', wall: 'div', at: 2.2, width: 1.2 },
        { id: 'puerta-deposito', type: 'door', wall: 'div', at: 6.2, width: 1.8, height: 2.4 },
        { id: 'puerta-oficina', type: 'door', wall: 'div', at: 9.5, width: 0.9 },
        { id: 'puerta-banos', type: 'door', wall: 'div-dep', at: 3.7, width: 0.8 },
      ],
      shelves: [
        ...shelfRow('pasillo-1', rack, [1.6, 3.0], [9.6, 3.0], 5),
        ...shelfRow('pasillo-2', rack, [1.6, 5.0], [9.6, 5.0], 5),
        ...shelfRow('pasillo-3', rack, [1.6, 7.0], [9.6, 7.0], 5),
        ...shelfRow('frutas', { style: 'cubby', width: 1.2, depth: 0.8, height: 0.6, rows: 2, columns: 2, withBottom: true, name: 'Exhibidor de fruta' }, [11.4, 3.0], [11.4, 6.0], 3, { rotY: Q }),
        ...shelfRow('rack-deposito-1', { style: 'open-rack', width: 1.5, depth: 0.5, height: 1.8, rows: 4, withBack: true }, [14.4, 5.0], [16.4, 5.0], 2),
        ...shelfRow('rack-deposito-2', { style: 'open-rack', width: 1.5, depth: 0.5, height: 1.8, rows: 4, withBack: true }, [14.4, 7.3], [16.4, 7.3], 2),
      ],
      cabinets: [
        coolerWall('heladeras-1', 2.4),
        coolerWall('heladeras-2', 5.4),
        coolerWall('heladeras-3', 8.4),
        coolerWall('heladeras-4', 11.4),
        checkout(1, 2.0),
        checkout(2, 4.2),
        checkout(3, 6.4),
        { id: 'mostrador-pan', name: 'Mostrador de panadería', at: [15.0, 0.9], depth: 0.7, height: 0.8, material: 'preset-white', modules: [{ width: 1.2, stack: [GLASS_LOW] }, { width: 1.2, stack: [GLASS_LOW] }] },
        { id: 'vitrina-pan', name: 'Vitrina de panadería', at: [17.5, 2.5], rotY: -Q, depth: 0.5, height: 1.9, tier: 'tall', modules: [{ width: 1.2, stack: [{ type: 'door', doorType: 'glass', shelfCount: 4 }] }, { width: 1.2, stack: [{ type: 'door', doorType: 'glass', shelfCount: 4 }] }] },
      ],
      items: [
        ...[2.0, 4.2, 6.4].map((x) => ({ asset: 'computer', at: [x, 9.4] as [number, number], y: COUNTER_Y })),
        { asset: 'trash-bin', at: [0.5, 10.3] },
        { asset: 'trash-bin', at: [8.4, 10.3] },
        { asset: 'indoor-plant', at: [12.3, 10.3] },
        { asset: 'coffee-machine', at: [15.0, 0.9], y: COUNTER_Y },
        { asset: 'stove', at: [14.6, 3.6] },
        { asset: 'fridge', at: [16.4, 3.6] },
        { asset: 'office-table', at: [14.2, 10.1] },
        { asset: 'office-chair', at: [14.2, 9.3], rotY: Math.PI },
        { asset: 'computer', at: [14.2, 10.1], y: 0.78 },
        { asset: 'toilet', at: [17.3, 9.2] },
        { asset: 'bathroom-sink', at: [16.0, 10.4] },
        ...row('indoor-plant', [0.6, 8.6], [0.6, 9.4], 2),
      ],
    },
  ],
}

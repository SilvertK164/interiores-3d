import { perimeter, row } from '../geometry'
import type { TemplateDefinition } from '../types'

const Q = Math.PI / 2
const DOOR = { type: 'door', doorType: 'double' } as const
const DRAWERS = { type: 'drawer', drawerCount: 3 } as const

/** Loft de doble altura de 12 × 7 m: concreto pulido, ladrillo expuesto, cocina con isla paramétrica y dormitorio en el entrepiso. */
export const loft: TemplateDefinition = {
  id: 'loft',
  kind: 'vivienda',
  name: 'Loft de doble altura',
  summary: 'Cocina con isla, comedor y estar sobre concreto pulido; baño, estudio y dormitorio en el entrepiso.',
  levels: [
    {
      id: 'pb',
      height: 3.6,
      wallInside: 'concrete-plaster',
      wallOutside: 'flooring-agedbrick',
      trim: true,
      walls: [
        ...perimeter('p', 0, 0, 12, 7).map((w) => (w.id === 'p-w' ? { ...w, inside: 'flooring-rusticbrick' } : w.id === 'p-n' ? { ...w, inside: 'preset-charcoal' } : w)),
        { id: 'div', from: [8.5, 0], to: [8.5, 7] },
        { id: 'div-bano', from: [8.5, 3], to: [12, 3] },
      ],
      rooms: [
        { id: 'salon', name: 'Cocina, comedor y estar', color: '#1F5FE0', rect: [0, 0, 8.5, 7], floor: 'concrete-polished', ceiling: 'concrete-raw' },
        { id: 'bano', name: 'Baño', color: '#1FA971', rect: [8.5, 0, 12, 3], floor: 'flooring-tile85a', ceiling: 'concrete-drywall' },
        { id: 'estudio', name: 'Estudio', color: '#7A8AA8', rect: [8.5, 3, 12, 7], floor: 'wood-woodfine22', ceiling: 'concrete-plaster' },
      ],
      openings: [
        { id: 'puerta-entrada', type: 'door', wall: 'p-s', at: 1.5, width: 1 },
        { id: 'ventanal', type: 'window', wall: 'p-s', at: 5, width: 3.6, height: 2.4, sill: 0.3 },
        { id: 'ventana-oeste', type: 'window', wall: 'p-w', at: 3.5, width: 2 },
        { id: 'ventana-norte', type: 'window', wall: 'p-n', at: 6.5, width: 2.2 },
        { id: 'ventana-estudio', type: 'window', wall: 'p-e', at: 5, width: 1.6 },
        { id: 'ventana-bano', type: 'window', wall: 'p-e', at: 1.5, width: 0.7, height: 0.6, sill: 1.5 },
        { id: 'puerta-bano', type: 'door', wall: 'div', at: 1.5, width: 0.8 },
        { id: 'puerta-estudio', type: 'door', wall: 'div', at: 5, width: 0.9 },
      ],
      shelves: [
        { id: 'biblioteca-estar', style: 'bookshelf', at: [7.4, 0.35], width: 1.8, depth: 0.4, height: 2.2, rows: 5, columns: 2, withBack: true },
        { id: 'biblioteca-oeste', style: 'bookshelf', at: [0.35, 5.2], rotY: Q, width: 1.8, depth: 0.4, height: 2.2, rows: 5, columns: 2, withBack: true },
        { id: 'biblioteca-estudio', style: 'bookshelf', at: [11.65, 5.0], rotY: -Q, width: 2, depth: 0.4, height: 2.1, rows: 5, columns: 2, withBack: true },
        { id: 'repisa-cocina', style: 'wall-shelf', at: [2.6, 0.23], y: 1.5, width: 1.8, depth: 0.25, height: 0.5, rows: 2 },
      ],
      cabinets: [
        { id: 'cocina', name: 'Cocina', at: [2.6, 0.45], depth: 0.6, height: 0.8, modules: [{ width: 1, stack: [{ type: 'sink', sinkLayout: 'double' }] }, { width: 0.6, stack: [{ type: 'dishwasher' }] }, { width: 0.8, stack: [DOOR] }] },
        { id: 'isla', name: 'Isla', at: [4.4, 2.8], rotY: Math.PI, depth: 0.9, height: 0.8, bar: true, modules: [{ width: 1.2, stack: [DRAWERS] }, { width: 1.2, stack: [DOOR] }] },
      ],
      items: [
        { asset: 'fridge', at: [0.7, 0.7] },
        { asset: 'stove', at: [4.4, 0.6] },
        { asset: 'hood', at: [4.4, 0.6], y: 1.9 },
        ...row('stool', [3.7, 3.75], [5.1, 3.75], 3),
        { asset: 'dining-table', at: [2.4, 5.2] },
        { asset: 'dining-chair', at: [1.5, 5.2], rotY: Q },
        { asset: 'dining-chair', at: [3.3, 5.2], rotY: -Q },
        { asset: 'dining-chair', at: [2.4, 4.4] },
        { asset: 'dining-chair', at: [2.4, 6.0], rotY: Math.PI },
        { asset: 'sofa', at: [7.4, 3.6], rotY: -Q },
        { asset: 'coffee-table', at: [6.1, 3.6] },
        { asset: 'rectangular-carpet', at: [6.3, 3.6] },
        { asset: 'tv-stand', at: [4.9, 5.3], rotY: Math.PI },
        { asset: 'floor-lamp', at: [7.9, 4.7] },
        { asset: 'indoor-plant', at: [0.6, 6.4] },
        { asset: 'bathtub', at: [10.8, 0.9] },
        { asset: 'toilet', at: [11.6, 1.9], rotY: -Q },
        { asset: 'bathroom-sink', at: [10.0, 2.55], rotY: Math.PI },
        { asset: 'office-table', at: [10.4, 6.2] },
        { asset: 'office-chair', at: [10.4, 5.5], rotY: Math.PI },
        { asset: 'computer', at: [10.4, 6.2], y: 0.76 },
        { asset: 'indoor-plant', at: [9.0, 6.5] },
        { asset: 'rectangular-carpet', at: [10.3, 4.4] },
      ],
      stairs: [{ id: 'escalera', at: [4.7, 6.2], rotY: Q, run: 3.8, width: 1.1, steps: 14, to: 'alta', rail: 'both' }],
    },
    {
      id: 'alta',
      height: 2.8,
      wallInside: 'preset-cream',
      wallOutside: 'flooring-agedbrick',
      trim: true,
      walls: [
        { id: 'a-n', from: [8.5, 0], to: [12, 0] },
        { id: 'a-e', from: [12, 0], to: [12, 7] },
        { id: 'a-s', from: [8.5, 7], to: [12, 7] },
        { id: 'baranda', from: [8.5, 0], to: [8.5, 5], height: 1.05 },
      ],
      rooms: [
        { id: 'dormitorio', name: 'Dormitorio', color: '#7A8AA8', rect: [8.5, 0, 12, 7], floor: 'wood-hungarianparquet10', ceiling: 'concrete-plaster', open: ['w'] },
      ],
      openings: [
        { id: 'ventana-norte', type: 'window', wall: 'a-n', at: 1.7, width: 1.4 },
        { id: 'ventana-este', type: 'window', wall: 'a-e', at: 3.5, width: 2.2 },
      ],
      cabinets: [
        { id: 'placard', name: 'Placard', at: [11.6, 5.4], rotY: -Q, depth: 0.6, height: 2.2, tier: 'tall', modules: [{ width: 0.9, stack: [DOOR] }, { width: 0.9, stack: [DOOR] }] },
      ],
      items: [
        { asset: 'double-bed', at: [10.6, 2.8] },
        { asset: 'bedside-table', at: [9.2, 0.8] },
        { asset: 'bedside-table', at: [11.9, 0.8] },
        { asset: 'dresser', at: [9.4, 6.4], rotY: Math.PI },
        { asset: 'rectangular-carpet', at: [10.4, 3.0] },
        { asset: 'floor-lamp', at: [9.0, 4.8] },
        { asset: 'indoor-plant', at: [11.6, 6.5] },
      ],
    },
  ],
}

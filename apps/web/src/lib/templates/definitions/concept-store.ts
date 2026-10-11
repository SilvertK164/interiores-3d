import { COUNTER_Y, grid, perimeter, row, shelfRow } from '../geometry'
import type { TemplateDefinition } from '../types'

const Q = Math.PI / 2
const DOOR = { type: 'door', doorType: 'double' } as const
const DRAWERS = { type: 'drawer', drawerCount: 3 } as const
const GLASS = { type: 'door', doorType: 'glass', shelfCount: 4 } as const

/** Concept store de 14 × 8 m con entrepiso: parquet, ladrillo, terrazo y concreto pulido; cubbies, vitrinas y mostradores paramétricos. */
export const conceptStore: TemplateDefinition = {
  id: 'concept-store',
  kind: 'comercio',
  name: 'Concept store de 2 niveles',
  summary: 'Salón de ventas con doble vidriera, vitrinas, caja y barra de café; entrepiso de showroom y oficina con escalera.',
  levels: [
    {
      id: 'pb',
      height: 3.4,
      wallInside: 'concrete-plaster',
      wallOutside: 'flooring-agedbrick',
      trim: true,
      walls: [
        ...perimeter('p', 0, 0, 14, 8).map((w) => (w.id === 'p-n' ? { ...w, inside: 'flooring-rusticbrick' } : w)),
        { id: 'div', from: [9.5, 0], to: [9.5, 8] },
        { id: 'div-barra', from: [9.5, 4], to: [14, 4] },
        { id: 'div-bano', from: [9.5, 6], to: [14, 6] },
      ],
      rooms: [
        { id: 'salon', name: 'Salón de ventas', color: '#1F5FE0', rect: [0, 0, 9.5, 8], floor: 'wood-hungarianparquet10', ceiling: 'concrete-plaster' },
        { id: 'barra', name: 'Barra de café', color: '#B97A00', rect: [9.5, 0, 14, 4], floor: 'flooring-terrazzo19', ceiling: 'concrete-plaster' },
        { id: 'deposito', name: 'Depósito', color: '#7A8AA8', rect: [9.5, 4, 14, 6], floor: 'concrete-polished', ceiling: 'concrete-drywall' },
        { id: 'bano', name: 'Baño', color: '#1FA971', rect: [9.5, 6, 14, 8], floor: 'flooring-tile85a', ceiling: 'concrete-drywall' },
      ],
      openings: [
        { id: 'puerta-entrada', type: 'door', wall: 'p-s', at: 2.2, width: 1.6, height: 2.4 },
        { id: 'vidriera-1', type: 'window', wall: 'p-s', at: 5.1, width: 2.4, height: 2.4, sill: 0.3 },
        { id: 'vidriera-2', type: 'window', wall: 'p-s', at: 8.0, width: 2.0, height: 2.4, sill: 0.3 },
        { id: 'ventana-oeste', type: 'window', wall: 'p-w', at: 6.4, width: 2.0, height: 2, sill: 0.6 },
        { id: 'ventana-barra', type: 'window', wall: 'p-n', at: 11.7, width: 1.6 },
        { id: 'paso-barra', type: 'door', wall: 'div', at: 2, width: 1.2 },
        { id: 'puerta-deposito', type: 'door', wall: 'div', at: 5, width: 0.9 },
        { id: 'puerta-bano', type: 'door', wall: 'div', at: 7, width: 0.8 },
      ],
      shelves: [
        ...shelfRow('expositor', { style: 'cubby', width: 1.5, depth: 0.4, height: 1.2, rows: 3, columns: 3, withBack: true, withBottom: true, name: 'Exhibidor' }, [1.4, 0.35], [7.8, 0.35], 5),
        ...shelfRow('repisa', { style: 'wall-shelf', width: 1.5, depth: 0.25, height: 0.9, rows: 3, name: 'Repisa' }, [1.4, 0.23], [7.8, 0.23], 5, { y: 1.5 }),
        ...shelfRow('rack-deposito', { style: 'open-rack', width: 1.5, depth: 0.5, height: 1.8, rows: 4, withBack: true }, [11.0, 4.45], [13.0, 4.45], 2),
        { id: 'rack-este', style: 'open-rack', at: [13.65, 5.2], rotY: -Q, width: 1.4, depth: 0.5, height: 1.8, rows: 4, withBack: true },
      ],
      cabinets: [
        { id: 'caja', name: 'Caja', at: [7.3, 6.7], depth: 0.7, height: 0.8, material: 'preset-charcoal', modules: [{ width: 0.6, stack: [DRAWERS] }, { width: 1.2, stack: [DOOR] }, { width: 0.6, stack: [DRAWERS] }] },
        { id: 'vitrina-oeste', name: 'Vitrina', at: [0.4, 4.2], rotY: Q, depth: 0.5, height: 1.9, tier: 'tall', modules: [{ width: 1, stack: [GLASS] }, { width: 1, stack: [GLASS] }] },
        { id: 'barra', name: 'Barra de café', at: [12.0, 1.9], rotY: Math.PI, depth: 0.7, height: 0.8, bar: true, modules: [{ width: 1.2, stack: [DOOR] }, { width: 1.2, stack: [DOOR] }] },
      ],
      items: [
        ...grid('dining-table', [2.6, 2.6], 3, 2, [2.2, 1.6]),
        { asset: 'rectangular-carpet', at: [4.8, 3.4] },
        { asset: 'sofa', at: [2.2, 7.0], rotY: Math.PI },
        { asset: 'coffee-table', at: [2.2, 5.9] },
        { asset: 'indoor-plant', at: [0.6, 7.4] },
        { asset: 'indoor-plant', at: [9.0, 7.4] },
        { asset: 'floor-lamp', at: [0.6, 5.9] },
        { asset: 'computer', at: [7.0, 6.7], y: COUNTER_Y },
        { asset: 'coffee-machine', at: [11.3, 1.9], y: COUNTER_Y },
        { asset: 'fridge', at: [13.4, 0.65] },
        ...row('stool', [11.2, 2.95], [12.8, 2.95], 3),
        { asset: 'toilet', at: [13.4, 7.4] },
        { asset: 'bathroom-sink', at: [10.6, 7.4] },
      ],
      stairs: [{ id: 'escalera', at: [5.5, 6.9], rotY: 0, width: 1.1, steps: 14, to: 'alta', rail: 'both' }],
    },
    {
      id: 'alta',
      height: 2.8,
      wallInside: 'preset-cream',
      wallOutside: 'flooring-agedbrick',
      trim: true,
      walls: [
        { id: 'a-n', from: [9.5, 0], to: [14, 0] },
        { id: 'a-e', from: [14, 0], to: [14, 8] },
        { id: 'a-s', from: [9.5, 8], to: [14, 8] },
        { id: 'baranda', from: [9.5, 0], to: [9.5, 5.6], height: 1.05 },
      ],
      rooms: [
        { id: 'showroom', name: 'Showroom y oficina', color: '#7A8AA8', rect: [9.5, 0, 14, 8], floor: 'wood-woodfine22', ceiling: 'concrete-plaster', open: ['w'] },
      ],
      openings: [
        { id: 'ventana-norte', type: 'window', wall: 'a-n', at: 2.2, width: 1.4 },
        { id: 'ventana-este', type: 'window', wall: 'a-e', at: 3.5, width: 2.6 },
        { id: 'ventana-sur', type: 'window', wall: 'a-s', at: 2.2, width: 1.4 },
      ],
      shelves: [
        ...shelfRow('exhibidor-alto', { style: 'cubby', width: 1.5, depth: 0.4, height: 1.2, rows: 3, columns: 3, withBack: true, withBottom: true }, [10.8, 0.35], [13.0, 0.35], 2),
        { id: 'biblioteca', style: 'bookshelf', at: [13.65, 3.0], rotY: -Q, width: 1.8, depth: 0.4, height: 2, rows: 5, columns: 2, withBack: true },
      ],
      cabinets: [
        { id: 'vitrina-alta', name: 'Vitrina', at: [10.2, 5.2], rotY: Q, depth: 0.5, height: 1.9, tier: 'tall', modules: [{ width: 1, stack: [GLASS] }, { width: 1, stack: [GLASS] }] },
      ],
      items: [
        { asset: 'sofa', at: [11.6, 1.8] },
        { asset: 'coffee-table', at: [11.6, 3.0] },
        { asset: 'rectangular-carpet', at: [11.6, 2.8] },
        ...row('coat-rack', [11.2, 4.4], [13.4, 4.4], 3),
        { asset: 'office-table', at: [12.9, 6.9] },
        { asset: 'office-chair', at: [12.9, 6.1], rotY: Math.PI },
        { asset: 'computer', at: [12.9, 6.9], y: 0.78 },
        { asset: 'dresser', at: [13.6, 5.5], rotY: -Q },
        { asset: 'indoor-plant', at: [10.2, 7.4] },
        { asset: 'floor-lamp', at: [10.3, 0.7] },
      ],
    },
  ],
}

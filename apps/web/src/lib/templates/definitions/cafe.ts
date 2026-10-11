import { COUNTER_Y, grid, perimeter, row, shelfRow } from '../geometry'
import type { ItemDef, TemplateDefinition } from '../types'

const Q = Math.PI / 2
const DOOR = { type: 'door', doorType: 'double' } as const
const DRAWERS = { type: 'drawer', drawerCount: 3 } as const
const GLASS_LOW = { type: 'door', doorType: 'glass', shelfCount: 3 } as const

const interiorTables = grid('dining-table', [1.4, 2.0], 2, 3, [2.0, 2.6])
const terraceTables = grid('dining-table', [2.0, 10.4], 3, 2, [3.6, 1.9])
const chairsAround = (tables: ItemDef[], dx: number): ItemDef[] =>
  tables.flatMap((t) => [
    { asset: 'dining-chair', at: [t.at[0] - dx, t.at[1]] as [number, number], rotY: Q },
    { asset: 'dining-chair', at: [t.at[0] + dx, t.at[1]] as [number, number], rotY: -Q },
  ])

/** Café de especialidad de 12 × 9 m con terraza de 12 × 4 m: madera, ladrillo, azulejo y piedra; barra con banquetas y vitrina de pastelería. */
export const cafe: TemplateDefinition = {
  id: 'cafe',
  kind: 'comercio',
  name: 'Café de especialidad con terraza',
  summary: 'Salón de madera con barra, vitrina de pastelería y mesas; cocina y baño con azulejo, depósito y terraza con sombrillas.',
  levels: [
    {
      id: 'pb',
      height: 3.2,
      wallInside: 'preset-cream',
      wallOutside: 'concrete-stucco',
      trim: true,
      walls: [
        ...perimeter('p', 0, 0, 12, 9).map((w) => (w.id === 'p-w' ? { ...w, inside: 'flooring-rusticbrick' } : w)),
        { id: 'div', from: [8, 0], to: [8, 9] },
        { id: 'div-bano', from: [8, 4], to: [12, 4] },
        { id: 'div-dep', from: [8, 6.5], to: [12, 6.5] },
        { id: 't-w', from: [0, 9], to: [0, 13], height: 1.1, inside: 'preset-sage', outside: 'preset-sage' },
        { id: 't-e', from: [12, 9], to: [12, 13], height: 1.1, inside: 'preset-sage', outside: 'preset-sage' },
        { id: 't-s', from: [0, 13], to: [12, 13], height: 1.1, inside: 'preset-sage', outside: 'preset-sage' },
      ],
      rooms: [
        { id: 'salon', name: 'Salón', color: '#1F5FE0', rect: [0, 0, 8, 9], floor: 'wood-woodfine22', ceiling: 'concrete-plaster' },
        { id: 'cocina', name: 'Cocina', color: '#B97A00', rect: [8, 0, 12, 4], floor: 'flooring-tile85a', ceiling: 'concrete-drywall' },
        { id: 'bano', name: 'Baño', color: '#1FA971', rect: [8, 4, 12, 6.5], floor: 'flooring-tile85a', ceiling: 'concrete-drywall' },
        { id: 'deposito', name: 'Depósito', color: '#7A8AA8', rect: [8, 6.5, 12, 9], floor: 'concrete-polished', ceiling: 'concrete-drywall' },
        { id: 'terraza', name: 'Terraza', color: '#1FA971', rect: [0, 9, 12, 13], floor: 'flooring-wallstone1', ceiling: null },
      ],
      openings: [
        { id: 'puerta-salon', type: 'door', wall: 'p-s', at: 3, width: 1.6, height: 2.2 },
        { id: 'vidriera', type: 'window', wall: 'p-s', at: 5.6, width: 3, height: 2.2, sill: 0.4 },
        { id: 'acceso', type: 'door', wall: 't-w', at: 2, width: 1.4 },
        { id: 'ventana-oeste', type: 'window', wall: 'p-w', at: 6.5, width: 2.2 },
        { id: 'ventana-norte', type: 'window', wall: 'p-n', at: 1.6, width: 1.6 },
        { id: 'puerta-cocina', type: 'door', wall: 'div', at: 2, width: 1 },
        { id: 'puerta-bano', type: 'door', wall: 'div', at: 5.2, width: 0.8 },
        { id: 'puerta-deposito', type: 'door', wall: 'div', at: 7.7, width: 0.8 },
      ],
      shelves: [
        ...shelfRow('repisa', { style: 'wall-shelf', width: 1.5, depth: 0.25, height: 0.9, rows: 2, name: 'Repisa' }, [3.6, 0.23], [7.0, 0.23], 3, { y: 1.5 }),
        { id: 'biblioteca', style: 'bookshelf', at: [0.35, 5.5], rotY: Q, width: 1.8, depth: 0.4, height: 2, rows: 5, columns: 2, withBack: true },
        ...shelfRow('rack', { style: 'open-rack', width: 1.5, depth: 0.5, height: 1.8, rows: 4, withBack: true }, [9.0, 7.0], [11.0, 7.0], 2),
        { id: 'cubby-cocina', style: 'cubby', at: [11.6, 3.2], rotY: -Q, width: 1.2, depth: 0.4, height: 1.2, rows: 3, columns: 3, withBack: true, withBottom: true },
      ],
      cabinets: [
        { id: 'barra-1', name: 'Barra con bacha', at: [6.2, 2.0], rotY: Q, depth: 0.7, height: 0.8, bar: true, modules: [{ width: 1, stack: [{ type: 'sink', sinkLayout: 'single' }] }, { width: 0.8, stack: [DRAWERS] }, { width: 0.6, stack: [DOOR] }] },
        { id: 'barra-2', name: 'Barra', at: [6.2, 4.8], rotY: Q, depth: 0.7, height: 0.8, bar: true, modules: [{ width: 1.2, stack: [DOOR] }, { width: 1.2, stack: [DOOR] }] },
        { id: 'vitrina-pasteleria', name: 'Vitrina de pastelería', at: [3.8, 0.45], depth: 0.5, height: 1.2, material: 'preset-white', modules: [{ width: 1.2, stack: [GLASS_LOW] }, { width: 1.2, stack: [GLASS_LOW] }] },
        { id: 'cocina-mesada', name: 'Mesada de cocina', at: [9.9, 0.45], depth: 0.6, height: 0.8, modules: [{ width: 1, stack: [{ type: 'sink', sinkLayout: 'double' }] }, { width: 0.6, stack: [{ type: 'dishwasher' }] }, { width: 0.8, stack: [DOOR] }] },
      ],
      items: [
        ...interiorTables,
        ...chairsAround(interiorTables, 0.8),
        ...row('stool', [5.1, 1.2], [5.1, 5.6], 5),
        { asset: 'coffee-machine', at: [6.2, 3.0], y: COUNTER_Y },
        { asset: 'coffee-machine', at: [6.2, 4.8], y: COUNTER_Y },
        { asset: 'indoor-plant', at: [0.6, 8.4] },
        { asset: 'indoor-plant', at: [7.4, 8.4] },
        { asset: 'floor-lamp', at: [0.6, 3.3] },
        { asset: 'stove', at: [11.5, 0.6] },
        { asset: 'hood', at: [11.5, 0.6], y: 1.9 },
        { asset: 'fridge', at: [11.5, 2.2], rotY: -Q },
        { asset: 'toilet', at: [11.5, 5.7] },
        { asset: 'bathroom-sink', at: [9.0, 5.7] },
        ...terraceTables,
        ...chairsAround(terraceTables, 0.8),
        { asset: 'patio-umbrella', at: [2.0, 10.4] },
        { asset: 'patio-umbrella', at: [9.2, 10.4] },
        ...row('indoor-plant', [0.6, 12.4], [11.4, 12.4], 6),
        { asset: 'palm', at: [0.8, 9.8] },
        { asset: 'palm', at: [11.2, 9.8] },
      ],
    },
  ],
}

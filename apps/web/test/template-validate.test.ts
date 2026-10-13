import { describe, expect, it } from 'vitest'
import { definitionArea, perimeter } from '../src/lib/templates/geometry'
import type { LevelDef, TemplateDefinition } from '../src/lib/templates/types'
import { validateDefinition } from '../src/lib/templates/validate'

const ASSETS = new Set(['cash-register', 'sofa'])
const MATERIALS = new Set(['wood-hungarianparquet10', 'concrete-plaster', 'flooring-agedbrick'])

function ground(): LevelDef {
  return {
    id: 'pb',
    wallInside: 'concrete-plaster',
    wallOutside: 'flooring-agedbrick',
    walls: [...perimeter('p', 0, 0, 8, 4), { id: 'int', from: [5, 0], to: [5, 4] }],
    rooms: [
      { id: 'salon', name: 'Salón', color: '#1F5FE0', rect: [0, 0, 5, 4], floor: 'wood-hungarianparquet10', ceiling: 'concrete-plaster' },
      { id: 'deposito', name: 'Depósito', color: '#7A8AA8', rect: [5, 0, 8, 4] },
    ],
    openings: [
      { id: 'entrada', type: 'door', wall: 'p-s', at: 2, width: 1 },
      { id: 'vidriera', type: 'window', wall: 'p-s', at: 3.8, width: 1.4, sill: 0.5 },
      { id: 'interior', type: 'door', wall: 'int', at: 2, width: 0.9 },
    ],
    items: [{ asset: 'cash-register', at: [1, 1] }],
    shelves: [{ id: 'gondola', style: 'open-rack', at: [2.5, 3.5], width: 1.5, depth: 0.5, height: 1.8, rows: 5 }],
    cabinets: [
      { id: 'caja', at: [1.5, 0.45], depth: 0.7, height: 0.8, modules: [{ width: 1.2, stack: [{ type: 'door', doorType: 'double' }] }, { width: 0.6, stack: [{ type: 'drawer', drawerCount: 3 }] }] },
    ],
    stairs: [{ id: 'escalera', at: [1, 3.2], rotY: Math.PI / 2, run: 3, width: 1, steps: 12, to: 'alta' }],
  }
}

function upper(): LevelDef {
  return {
    id: 'alta',
    walls: [...perimeter('a', 4, 0, 8, 4)],
    rooms: [{ id: 'showroom', name: 'Showroom', color: '#1FA971', rect: [4, 0, 8, 4], open: ['w'] }],
    openings: [],
    items: [{ asset: 'sofa', at: [6, 2] }],
  }
}

function valid(): TemplateDefinition {
  return { id: 'prueba', kind: 'comercio', name: 'Prueba', summary: 'Un local de prueba', levels: [ground(), upper()] }
}

const check = (def: TemplateDefinition) => validateDefinition(def, ASSETS, MATERIALS)
const lv = (def: TemplateDefinition, i = 0) => def.levels[i] as LevelDef

describe('validateDefinition', () => {
  it('acepta una definición correcta de dos niveles', () => {
    expect(check(valid())).toEqual([])
  })

  it('suma el área de todos los niveles', () => {
    expect(definitionArea(valid())).toBe(48)
  })

  it('rechaza un ambiente cuyos muros no cierran', () => {
    const def = valid()
    lv(def).walls = lv(def).walls.map((w) => (w.id === 'p-s' ? { ...w, to: [7, 4] as [number, number] } : w))
    expect(check(def).some((e) => e.includes('depósito') && e.includes('no cierra'))).toBe(true)
  })

  it('tolera un borde declarado abierto y rechaza el mismo borde si no lo está', () => {
    const def = valid()
    lv(def, 1).walls = lv(def, 1).walls.filter((w) => w.id !== 'a-w')
    expect(check(def)).toEqual([])
    lv(def, 1).rooms = [{ id: 'showroom', name: 'Showroom', color: '#1FA971', rect: [4, 0, 8, 4] }]
    expect(check(def).some((e) => e.includes('showroom') && e.includes('no cierra'))).toBe(true)
  })

  it('rechaza una abertura que se sale del muro, que queda pegada a la esquina o que se pisa con otra', () => {
    const def = valid()
    lv(def).openings.push({ id: 'rara', type: 'window', wall: 'p-n', at: 7.9, width: 1 })
    lv(def).openings.push({ id: 'pisa', type: 'window', wall: 'p-s', at: 2.3, width: 1 })
    const errors = check(def)
    expect(errors.some((e) => e.includes('rara'))).toBe(true)
    expect(errors.some((e) => e.includes('se pisan'))).toBe(true)
  })

  it('rechaza una puerta o ventana más alta que su muro (por ejemplo, una puerta de 2,1 m en un parapeto de 1,1 m)', () => {
    const def = valid()
    lv(def).walls.push({ id: 'parapeto', from: [0, 4], to: [3, 4], height: 1.1 })
    lv(def).openings.push({ id: 'puerta-alta', type: 'door', wall: 'parapeto', at: 1.5, width: 0.9 })
    lv(def).openings.push({ id: 'puerta-baja', type: 'door', wall: 'parapeto', at: 0.5, width: 0.6, height: 1 })
    const errors = check(def)
    expect(errors.some((e) => e.includes('puerta-alta') && e.includes('más alta'))).toBe(true)
    expect(errors.some((e) => e.includes('puerta-baja'))).toBe(false)
  })

  it('rechaza una abertura en un muro que no existe', () => {
    const def = valid()
    lv(def).openings.push({ id: 'huerfana', type: 'door', wall: 'no-existe', at: 1, width: 1 })
    expect(check(def).some((e) => e.includes('no-existe'))).toBe(true)
  })

  it('rechaza una pieza que no está en el catálogo o cae fuera de los ambientes de su nivel', () => {
    const def = valid()
    lv(def).items.push({ asset: 'heladera-fantasma', at: [1, 1] }, { asset: 'sofa', at: [20, 20] })
    lv(def, 1).items.push({ asset: 'sofa', at: [1, 1] })
    const errors = check(def)
    expect(errors.some((e) => e.includes('heladera-fantasma'))).toBe(true)
    expect(errors.filter((e) => e.includes('fuera de los ambientes'))).toHaveLength(2)
  })

  it('rechaza un material que no existe en la biblioteca de Pascal', () => {
    const def = valid()
    lv(def).wallInside = 'madera-inventada'
    lv(def).rooms[1] = { ...(lv(def).rooms[1] as LevelDef['rooms'][number]), floor: 'piso-fantasma' }
    const errors = check(def)
    expect(errors.some((e) => e.includes('madera-inventada'))).toBe(true)
    expect(errors.some((e) => e.includes('piso-fantasma'))).toBe(true)
  })

  it('rechaza una escalera que sube a un nivel inexistente, o a sí mismo, o que arranca fuera de los ambientes', () => {
    const def = valid()
    lv(def).stairs = [
      { id: 'a', at: [1, 3], rotY: 0, width: 1, steps: 12, to: 'azotea' },
      { id: 'b', at: [1, 3], rotY: 0, width: 1, steps: 12, to: 'pb' },
      { id: 'c', at: [30, 30], rotY: 0, width: 1, steps: 12, to: 'alta' },
    ]
    const errors = check(def)
    expect(errors.filter((e) => e.includes('escalera'))).toHaveLength(3)
  })

  it('rechaza una escalera que sale de los ambientes del nivel o que termina lejos del piso de arriba', () => {
    const sale = valid()
    // rotY 0 camina hacia +z: desde (1, 3) llega a z = 6 y atraviesa el muro sur del salón (z = 4)
    lv(sale).stairs = [{ id: 'sale', at: [1, 3], rotY: 0, width: 1, steps: 12, to: 'alta' }]
    expect(check(sale).some((e) => e.includes('sale') && e.includes('fuera de los ambientes'))).toBe(true)

    const corta = valid()
    // camina hacia +x pero solo 1 m: termina en x = 2, dentro del salón y lejos del entrepiso (que empieza en x = 4)
    lv(corta).stairs = [{ id: 'corta', at: [1, 3.2], rotY: Math.PI / 2, run: 1, width: 1, steps: 12, to: 'alta' }]
    expect(check(corta).some((e) => e.includes('corta') && e.includes('no llega'))).toBe(true)
  })

  it('rechaza ids repetidos, ambientes solapados y muros diagonales', () => {
    const def = valid()
    lv(def).rooms.push({ id: 'salon', name: 'Otro', color: '#fff', rect: [4, 0, 6, 4] })
    lv(def).walls.push({ id: 'diagonal', from: [0, 0], to: [3, 3] })
    const errors = check(def)
    expect(errors.some((e) => e.includes('repetido'))).toBe(true)
    expect(errors.some((e) => e.includes('se solapan'))).toBe(true)
    expect(errors.some((e) => e.includes('diagonal'))).toBe(true)
  })

  it('rechaza dos niveles con el mismo id', () => {
    const def = valid()
    lv(def, 1).id = 'pb'
    expect(check(def).some((e) => e.includes('nivel') && e.includes('repetido'))).toBe(true)
  })
})

describe('validateDefinition: estantes y gabinetes paramétricos', () => {
  it('rechaza un estante o un gabinete cuya base cae (aunque sea en parte) fuera de los ambientes', () => {
    const def = valid()
    lv(def).shelves = [{ id: 'afuera', style: 'bookshelf', at: [4.9, 3.9], width: 1.8, depth: 0.4, height: 2 }]
    lv(def).cabinets = [{ id: 'girado', at: [0.2, 2], rotY: Math.PI / 2, depth: 0.7, height: 0.8, modules: [{ width: 1.2, stack: [{ type: 'door' }] }] }]
    const errors = check(def)
    expect(errors.some((e) => e.includes('afuera') && e.includes('fuera de los ambientes'))).toBe(true)
    expect(errors.some((e) => e.includes('girado') && e.includes('fuera de los ambientes'))).toBe(true)
  })

  it('rechaza medidas que Pascal no admite: estante muy ancho, gabinete sin módulos o de más de 3 m', () => {
    const def = valid()
    lv(def).shelves = [{ id: 'enorme', style: 'open-rack', at: [2.5, 2], width: 3.5, depth: 0.5, height: 1.8 }]
    lv(def).cabinets = [
      { id: 'vacio', at: [2.5, 2], depth: 0.7, height: 0.8, modules: [] },
      { id: 'largo', at: [2.5, 2], depth: 0.7, height: 0.8, modules: [{ width: 2, stack: [{ type: 'door' }] }, { width: 1.5, stack: [{ type: 'door' }] }] },
    ]
    const errors = check(def)
    expect(errors.some((e) => e.includes('enorme') && e.includes('medidas'))).toBe(true)
    expect(errors.some((e) => e.includes('vacio') && e.includes('módulo'))).toBe(true)
    expect(errors.some((e) => e.includes('largo') && e.includes('3 m'))).toBe(true)
  })

  it('rechaza ids repetidos entre estantes o entre gabinetes, y materiales que no existen', () => {
    const def = valid()
    lv(def).shelves = [
      { id: 'dup', style: 'cubby', at: [1, 2], width: 1, depth: 0.4, height: 1.2, material: 'laca-inventada' },
      { id: 'dup', style: 'cubby', at: [3, 2], width: 1, depth: 0.4, height: 1.2 },
    ]
    const errors = check(def)
    expect(errors.some((e) => e.includes('repetido'))).toBe(true)
    expect(errors.some((e) => e.includes('laca-inventada'))).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { TEMPLATE_DEFINITIONS } from '../src/lib/templates'
import { renderTemplateThumbnail } from '../src/lib/templates/thumbnail'

describe('renderTemplateThumbnail', () => {
  const def = TEMPLATE_DEFINITIONS[0]!
  const svg = renderTemplateThumbnail(def)
  const ground = def.levels[0]!

  it('es un SVG con viewBox y un trazo por muro de la planta baja', () => {
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('viewBox="0 0 240 160"')
    expect(svg.match(/<line /g)?.length).toBeGreaterThanOrEqual(ground.walls.length)
  })

  it('dibuja un rectángulo por ambiente de la planta baja y marca con línea punteada los niveles de arriba', () => {
    expect(svg.match(/<rect /g)?.length).toBeGreaterThanOrEqual(ground.rooms.length)
    expect(def.levels.length).toBeGreaterThan(1)
    expect(svg).toContain('stroke-dasharray')
  })

  it('dibuja la base de cada estante y gabinete de la planta baja como un rectángulo girado', () => {
    const furniture = (ground.shelves ?? []).length + (ground.cabinets ?? []).length
    expect(furniture).toBeGreaterThan(0)
    expect(svg.match(/<rect [^>]*data-kind="(shelf|cabinet)"/g)?.length).toBe(furniture)
  })

  it('es determinista', () => {
    expect(renderTemplateThumbnail(def)).toBe(svg)
  })
})

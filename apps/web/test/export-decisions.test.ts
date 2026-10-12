import { describe, expect, it } from 'vitest'
import { EXPORT_DECISIONS } from '../src/lib/export/decisions'

describe('decisiones medidas en la Tarea 0', () => {
  it('cada decisión tiene un valor permitido', () => {
    expect(['pascal', 'madori']).toContain(EXPORT_DECISIONS.areaLabels)
    expect(['dmsans', 'helvetica']).toContain(EXPORT_DECISIONS.fonts)
    expect(['pdfjs', 'frame']).toContain(EXPORT_DECISIONS.previewMode)
  })

  it('la espera de la vista previa está entre 150 y 800 ms', () => {
    expect(EXPORT_DECISIONS.previewDelayMs).toBeGreaterThanOrEqual(150)
    expect(EXPORT_DECISIONS.previewDelayMs).toBeLessThanOrEqual(800)
  })
})

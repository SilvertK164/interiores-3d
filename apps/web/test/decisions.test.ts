import { describe, expect, it } from 'vitest'
import { DECISIONS } from '../src/editor/shell/decisions'

describe('decisiones del spike de la Tarea 0', () => {
  it('cada decisión está fijada con un valor admitido', () => {
    expect(['patch', 'css']).toContain(DECISIONS.chromeStrategy)
    expect(['pascal', 'temporal']).toContain(DECISIONS.historySource)
    for (const key of ['walkthrough', 'cameraControl', 'styleControl', 'furnishPhaseBeforeItem', 'zoneTool'] as const) {
      expect(typeof DECISIONS[key], key).toBe('boolean')
    }
  })
})

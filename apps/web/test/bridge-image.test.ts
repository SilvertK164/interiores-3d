import { describe, expect, it, vi } from 'vitest'
import { createBridge } from '../src/editor/shell/bridge'
import { createFakeDeps } from './support/fake-deps'

describe('bridge.image.captureIsometric', () => {
  it('pasa a ortográfica, fotografía y devuelve la cámara anterior', async () => {
    vi.useFakeTimers()
    const fake = createFakeDeps()
    fake.viewer.setState({ cameraMode: 'perspective' })
    const seen: string[] = []
    fake.deps.captureView.mockImplementation(async () => {
      seen.push(fake.viewer.getState().cameraMode)
      return new Blob(['x'])
    })
    const pending = createBridge(fake.deps).image.captureIsometric()
    await vi.advanceTimersByTimeAsync(700)
    await pending
    expect(seen).toEqual(['orthographic'])
    expect(fake.viewer.getState().cameraMode).toBe('perspective')
    vi.useRealTimers()
  })

  it('devuelve la cámara anterior aunque la captura falle', async () => {
    vi.useFakeTimers()
    const fake = createFakeDeps()
    fake.viewer.setState({ cameraMode: 'perspective' })
    fake.deps.captureView.mockRejectedValue(new Error('x'))
    const pending = createBridge(fake.deps).image.captureIsometric()
    const assertion = expect(pending).rejects.toThrow('x')
    await vi.advanceTimersByTimeAsync(700)
    await assertion
    expect(fake.viewer.getState().cameraMode).toBe('perspective')
    vi.useRealTimers()
  })
})

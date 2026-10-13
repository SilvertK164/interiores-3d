import { emitter } from '@pascal-app/core'
import type { SnapshotCameraData } from '@pascal-app/editor'
import type { ImageDeps } from '../shell/bridge/image'

type Pending = {
  resolve: (blob: Blob) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}
const pending = new Map<string, Pending>()
const TIMEOUT_MS = 15_000

/** Se pasa a `<Editor onThumbnailCapture>`: Pascal entrega aquí la foto pedida con `requestId`. */
export function onThumbnailCapture(blob: Blob, data: SnapshotCameraData): void {
  const request = data.requestId ? pending.get(data.requestId) : undefined
  if (!request || !data.requestId) return
  clearTimeout(request.timer)
  pending.delete(data.requestId)
  request.resolve(blob)
}

/** `captureView` con el generador de miniaturas de Pascal (evento `camera-controls:generate-thumbnail`, modo `viewport`). */
export function imageDeps(): ImageDeps {
  return {
    captureView: () =>
      new Promise<Blob>((resolve, reject) => {
        const requestId = `madori-image-${Date.now()}`
        const timer = setTimeout(() => {
          pending.delete(requestId)
          reject(new Error('La captura tardó demasiado.'))
        }, TIMEOUT_MS)
        pending.set(requestId, { resolve, reject, timer })
        emitter.emit('camera-controls:generate-thumbnail', {
          projectId: '',
          requestId,
          captureMode: 'viewport',
        })
      }),
  }
}

import type { IsoImage, PlanMode } from '@/lib/export/types'
import type { ShellBridge } from './bridge'
import { toPng } from './to-png'

/** Una foto isométrica por planta, en PNG; en modo Papel, en blanco y negro (como el resto de la hoja). */
export async function captureIsoImages(bridge: Pick<ShellBridge, 'image'>, levelIds: readonly string[], mode: PlanMode): Promise<IsoImage[]> {
  const photos = await bridge.image.captureIsometricLevels(levelIds)
  return Promise.all(
    photos.map(async (photo, i) => {
      const png = await toPng(photo, mode === 'paper' ? 'bn' : 'color')
      return { levelId: levelIds[i] as string, bytes: await png.arrayBuffer() }
    }),
  )
}

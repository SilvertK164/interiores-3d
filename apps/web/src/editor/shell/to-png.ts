export type ImageStyle = 'color' | 'bn'

/** Pasa la imagen que entrega Pascal (WebP o JPEG) a PNG; en `bn` la deja en blanco y negro (grises por luminancia). */
export async function toPng(source: Blob, style: ImageStyle = 'color'): Promise<Blob> {
  if (source.type === 'image/png' && style === 'color') return source
  const bitmap = await createImageBitmap(source)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(bitmap, 0, 0)
    if (ctx && style === 'bn') {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const px = data.data
      for (let i = 0; i < px.length; i += 4) {
        const grey = 0.2126 * (px[i] ?? 0) + 0.7152 * (px[i + 1] ?? 0) + 0.0722 * (px[i + 2] ?? 0)
        px[i] = px[i + 1] = px[i + 2] = grey
      }
      ctx.putImageData(data, 0, 0)
    }
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('No se pudo crear el PNG'))),
        'image/png',
      ),
    )
  } finally {
    bitmap.close()
  }
}

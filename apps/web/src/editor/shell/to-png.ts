/** Pasa la imagen que entrega Pascal (WebP o JPEG) a PNG sin perder más calidad. */
export async function toPng(source: Blob): Promise<Blob> {
  if (source.type === 'image/png') return source
  const bitmap = await createImageBitmap(source)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0)
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

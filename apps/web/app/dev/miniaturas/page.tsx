'use client'

import dynamic from 'next/dynamic'
import { use, useState } from 'react'
import { THUMBNAIL_SIZE } from '@/editor/dev/thumbnail-camera'

// R3F usa el DOM y WebGL: nunca se renderiza en el servidor.
const ThumbnailStage = dynamic(() => import('@/editor/dev/ThumbnailStage'), { ssr: false })

// El tablero de cuadros gris y blanco solo está para ver la transparencia; `toDataURL` guarda únicamente los píxeles del lienzo.
const CHECKERBOARD = {
  backgroundImage: 'conic-gradient(#dfe5f1 25%, #ffffff 0 50%, #dfe5f1 0 75%, #ffffff 0)',
  backgroundSize: '16px 16px',
}

/** Solo para desarrollo: dibuja un mueble sobre fondo transparente para fotografiarlo (`pnpm items:thumbs`). */
export default function ThumbnailPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = use(searchParams)
  const [ready, setReady] = useState(false)
  if (process.env.NODE_ENV === 'production') return null
  if (!id) return <p className="p-6">Falta el mueble: abre /dev/miniaturas?id=sofa</p>
  return (
    <main className="min-h-dvh p-6">
      <div
        key={id}
        data-thumb-ready={ready ? id : undefined}
        style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, ...CHECKERBOARD }}
      >
        <ThumbnailStage id={id} onReady={() => setReady(true)} />
      </div>
    </main>
  )
}

'use client'

import manifest from '@/editor/local-items.json'
import { nameEs } from '@/lib/catalog-es'

const IDS = Object.keys(manifest).sort()
// El tablero gris claro y blanco deja ver la transparencia de cada miniatura.
const CHECKERBOARD = {
  backgroundImage: 'conic-gradient(#dfe5f1 25%, #ffffff 0 50%, #dfe5f1 0 75%, #ffffff 0)',
  backgroundSize: '16px 16px',
}

/** Solo para desarrollo: todas las miniaturas en una cuadrícula, para revisarlas a ojo después de regenerarlas. */
export default function ContactSheetPage() {
  if (process.env.NODE_ENV === 'production') return null
  return (
    <main className="min-h-dvh p-4" style={CHECKERBOARD}>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3 p-0" aria-label="Miniaturas de los muebles">
        {IDS.map((id) => (
          <li key={id} className="flex flex-col items-center gap-1">
            {/* biome-ignore lint/performance/noImgElement: página de desarrollo, no necesita next/image */}
            <img src={`/items/${id}/thumbnail.webp`} alt={nameEs(id, id)} width={128} height={128} />
            <span className="rounded bg-white/90 px-1 text-[11px] leading-tight text-black">{id}</span>
          </li>
        ))}
      </ul>
    </main>
  )
}

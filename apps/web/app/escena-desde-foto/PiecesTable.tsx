import { type AnalysisCandidate, pieceLabel } from '@/lib/lab/analysis-catalog'
import { confidenceLevel, detailLines, percent, rotationText, sizeText } from '@/lib/lab/lab-view'
import type { DetectedFurniture } from '@/lib/lab/schema'

const TH = 'px-2.5 py-2.5 font-medium'
/** Las columnas de detalle solo caben cuando la tarjeta es ancha: abajo de eso van en una línea bajo el nombre (`@md` es de la tarjeta, no de la pantalla). */
const DETAIL_TH = `${TH} hidden @md:table-cell`
const DETAIL_TD = 'hidden whitespace-nowrap px-2.5 py-2.5 align-top @md:table-cell'

/** La barrita de confianza: decorativa (el porcentaje va en texto); amarilla si es baja. */
function ConfidenceBar({ value }: { value: number }) {
  const low = confidenceLevel(value) === 'low'
  return (
    <span aria-hidden className="block h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-ink/10">
      <span className={`block h-full rounded-full ${low ? 'bg-sun' : 'bg-brand'}`} style={{ width: percent(value).replace(' ', '') }} />
    </span>
  )
}

/**
 * Las piezas que detectó el análisis, tal cual las devuelve (proporciones del ambiente), sin interpretarlas. El nombre sale del
 * catálogo que se le envió (`candidates`); si devolviera un id que no está, se muestra tal cual y se aclara. Sin desplazamiento
 * horizontal: con poco ancho solo se ven la pieza y su confianza.
 */
export function PiecesTable({ furniture, candidates }: { furniture: DetectedFurniture[]; candidates: readonly AnalysisCandidate[] }) {
  if (furniture.length === 0) {
    return <p className="m-0 rounded-[20px] bg-white/60 px-4 py-6 text-center text-sm text-ink-muted">No se detectó ningún mueble del catálogo en esta foto.</p>
  }
  const rows = furniture.map((piece, index) => ({ piece, key: `${index}-${piece.asset_id}` }))
  return (
    <div className="@container overflow-hidden rounded-[20px] bg-white/60">
      <table className="w-full table-auto text-left text-[13.5px]">
        <caption className="sr-only">Piezas detectadas</caption>
        <thead className="text-xs text-ink-muted">
          <tr>
            <th className={TH} scope="col">
              Pieza
            </th>
            <th className={TH} scope="col">
              Confianza
            </th>
            <th className={DETAIL_TH} scope="col">
              Posición del centro
            </th>
            <th className={DETAIL_TH} scope="col">
              Tamaño estimado
            </th>
            <th className={DETAIL_TH} scope="col">
              Giro (horario)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/5">
          {rows.map(({ piece, key }) => (
            <tr key={key}>
              <th className="px-2.5 py-2.5 align-top font-medium" scope="row">
                {pieceLabel(piece.asset_id, candidates)}
                {confidenceLevel(piece.confidence) === 'low' && <span className="mt-0.5 block text-xs font-normal text-sun-ink">Confianza baja</span>}
                <span className="mt-0.5 block text-xs font-normal text-ink-muted @md:hidden">
                  {detailLines(piece).map((line) => (
                    <span className="block" key={line}>
                      {line}
                    </span>
                  ))}
                </span>
              </th>
              <td className="px-2.5 py-2.5 align-top">
                <span className="flex flex-col items-start gap-1 @md:flex-row @md:items-center @md:gap-2">
                  <span className="whitespace-nowrap">{percent(piece.confidence)}</span>
                  <ConfidenceBar value={piece.confidence} />
                </span>
              </td>
              <td className={DETAIL_TD}>
                <span className="block">{percent(piece.x)} del ancho</span>
                <span className="block">{percent(piece.y)} del fondo</span>
              </td>
              <td className={DETAIL_TD}>{sizeText(piece)}</td>
              <td className={DETAIL_TD}>{rotationText(piece)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

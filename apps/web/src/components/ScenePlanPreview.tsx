import type { CSSProperties } from 'react'
import type { Pt } from '@/lib/templates/types'
import type { PlanPreview, PreviewLabel, PreviewPiece } from '@/lib/lab/plan-preview'

const points = (list: readonly Pt[]): string => list.map(([x, z]) => `${x},${z}`).join(' ')

/** Un texto del plano: dentro de su pieza va claro sobre cobalto; al lado, oscuro con un halo claro para leerse sobre el piso, una alfombra o un mueble. */
function PlanLabel({ label, fontSize, onDark }: { label: PreviewLabel; fontSize: number; onDark: boolean }) {
  const halo: CSSProperties = { paintOrder: 'stroke', stroke: 'white', strokeWidth: fontSize * 0.3, strokeLinejoin: 'round' }
  return (
    <text
      className={label.inside && onDark ? 'fill-white' : 'fill-ink'}
      dominantBaseline="central"
      fontSize={fontSize}
      fontWeight={600}
      style={label.inside ? undefined : halo}
      textAnchor="middle"
      x={label.x}
      y={label.z}
    >
      {label.text}
    </text>
  )
}

const fillOf = (piece: PreviewPiece): string =>
  piece.kind === 'rug' ? 'fill-brand-wash stroke-brand' : piece.stacked ? 'fill-ink stroke-white' : 'fill-brand stroke-brand-deep'

function Piece({ piece }: { piece: PreviewPiece }) {
  return (
    <g>
      <polygon className={fillOf(piece)} points={points(piece.corners)} strokeLinejoin="round" strokeWidth={0.025} />
      {piece.front && <polygon className="fill-sun stroke-ink" points={points([piece.front.base[0], piece.front.tip, piece.front.base[1]])} strokeLinejoin="round" strokeWidth={0.02} />}
    </g>
  )
}

const LEGEND_ICON = 'size-5 shrink-0'
/** Lo que significa cada marca del plano: decorativa (`aria-hidden`), porque el dibujo ya trae su texto alternativo. */
function Legend() {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-[12.5px] text-ink-muted">
      <li className="flex items-center gap-1.5">
        <svg aria-hidden className={LEGEND_ICON} viewBox="0 0 20 20">
          <polygon className="fill-sun stroke-ink" points="4,15 10,3 16,15" strokeLinejoin="round" strokeWidth={1.2} />
        </svg>
        Hacia dónde mira cada mueble
      </li>
      <li className="flex items-center gap-1.5">
        <svg aria-hidden className={LEGEND_ICON} viewBox="0 0 20 20">
          <path className="stroke-brand" d="M3 17 H17 M3 17 A14 14 0 0 1 17 3" fill="none" strokeDasharray="2 1.5" strokeWidth={1.4} />
          <line className="stroke-ink" strokeWidth={1.6} x1={3} x2={3} y1={17} y2={3} />
        </svg>
        Puerta
      </li>
      <li className="flex items-center gap-1.5">
        <svg aria-hidden className={LEGEND_ICON} viewBox="0 0 20 20">
          <rect className="fill-sky stroke-brand" height={5} strokeWidth={1.2} width={16} x={2} y={7.5} />
        </svg>
        Ventana
      </li>
      <li className="flex items-center gap-1.5">
        <svg aria-hidden className={LEGEND_ICON} viewBox="0 0 20 20">
          <polygon className="fill-brand/15 stroke-brand" points="10,12 3,3 17,3" strokeDasharray="2 1.5" strokeWidth={1.1} />
          <circle className="fill-ink stroke-white" cx={10} cy={13} r={4} strokeWidth={1} />
          <circle className="fill-sun" cx={10} cy={13} r={1.5} />
        </svg>
        Dónde se tomó la foto
      </li>
    </ul>
  )
}

/**
 * La escena vista desde arriba (con el norte arriba), dibujada en SVG a partir de `planPreview`: el ambiente con sus muros, las puertas y
 * ventanas en su muro, cada mueble con su tamaño real, su giro y una marca Sol en su frente, la tele sobre su mueble, y desde dónde se
 * tomó la foto y hacia dónde apunta. Se escala sola al ancho que tenga (sin desplazamiento horizontal) y es una imagen para los lectores
 * de pantalla: su texto alternativo es `plan.summary`.
 */
export function ScenePlanPreview({ plan }: { plan: PlanPreview }) {
  const { x, y, width, height } = plan.viewBox
  const { room, camera, fontSize } = plan
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-2.5">
      <div className="rounded-[20px] bg-white/60 p-2.5">
        <svg
          aria-label={plan.summary}
          className="mx-auto block h-auto max-h-[34rem] w-full"
          data-testid="scene-plan"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`${x} ${y} ${width} ${height}`}
        >
          <rect className="fill-brand-mist" height={room.z1 - room.z0} width={room.x1 - room.x0} x={room.x0} y={room.z0} />
          {camera && <polygon className="fill-brand/15 stroke-brand" points={points(camera.cone)} strokeDasharray="0.1 0.07" strokeLinejoin="round" strokeWidth={0.03} />}
          {plan.pieces.map((piece) => (
            <Piece key={piece.key} piece={piece} />
          ))}
          {plan.walls.map((wall) => (
            <line className="stroke-ink" key={wall.id} strokeLinecap="square" strokeWidth={0.12} x1={wall.from[0]} x2={wall.to[0]} y1={wall.from[1]} y2={wall.to[1]} />
          ))}
          {plan.openings.map((opening) => (
            <g key={opening.id}>
              <polygon className={opening.type === 'window' ? 'fill-sky stroke-brand' : 'fill-brand-mist stroke-brand-mist'} points={points(opening.corners)} strokeWidth={0.03} />
              {opening.swing && (
                <>
                  <line className="stroke-ink" strokeLinecap="round" strokeWidth={0.04} x1={opening.swing.leaf[0][0]} x2={opening.swing.leaf[1][0]} y1={opening.swing.leaf[0][1]} y2={opening.swing.leaf[1][1]} />
                  <path className="stroke-brand" d={opening.swing.arc} fill="none" strokeDasharray="0.08 0.06" strokeWidth={0.03} />
                </>
              )}
            </g>
          ))}
          {camera && (
            <g>
              <circle className="fill-ink stroke-white" cx={camera.at[0]} cy={camera.at[1]} r={0.16} strokeWidth={0.03} />
              <circle className="fill-sun" cx={camera.at[0]} cy={camera.at[1]} r={0.06} />
            </g>
          )}
          {plan.pieces.map((piece) => piece.label && <PlanLabel fontSize={fontSize} key={piece.key} label={piece.label} onDark={piece.kind === 'piece'} />)}
          {camera?.label && <PlanLabel fontSize={fontSize} label={camera.label} onDark={false} />}
        </svg>
      </div>
      <figcaption className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">Vista desde arriba: el norte queda arriba.</span>
        <Legend />
      </figcaption>
    </figure>
  )
}

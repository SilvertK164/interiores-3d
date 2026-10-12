import { BRAND, WINDOW } from '@/lib/brand'

type Props = {
  /** Color del marco; por defecto el del texto que lo rodea (`currentColor`). */
  frameColor?: string
  /** Si se pasa, el sol se recorta con el vidrio (hace falta cuando se anima). */
  clipId?: string
  /**
   * Versión del portal (Loader de pantalla completa): el vidrio se pinta con el color del fondo (así tapa lo que haya
   * detrás), el sol lleva 12 rayos y el marco es un trazo continuo de puntas redondas que se puede dibujar de a poco.
   */
  portal?: boolean
}

const rayAngles = Array.from({ length: WINDOW.rays.count }, (_, i) => (360 / WINDOW.rays.count) * i)

/**
 * Contenido SVG de la ventana (sin la etiqueta `<svg>`): el sol con su anillo y el marco. El vidrio no se pinta:
 * es transparente (salvo con `portal`). Las clases `madori-w-*` son los ganchos que usan `Loader.css` y
 * `LoaderPortal.css` para animar; sin CSS queda estática.
 */
export function MadoriWindow({ frameColor = 'currentColor', clipId, portal = false }: Props) {
  const { sun, ring, rays } = WINDOW
  return (
    <>
      {clipId && (
        <defs>
          <clipPath id={clipId}>
            <path d={WINDOW.glass} />
          </clipPath>
        </defs>
      )}
      {portal && <path className="madori-w-glass" d={WINDOW.frame} fill="none" />}
      <g clipPath={clipId ? `url(#${clipId})` : undefined}>
        <g className="madori-w-sun" fill={BRAND.sol}>
          {portal && (
            <g className="madori-w-rays">
              {rayAngles.map((angle) => (
                <line
                  key={angle}
                  stroke={BRAND.sol}
                  strokeLinecap="round"
                  strokeWidth={rays.strokeWidth}
                  transform={`rotate(${angle} ${sun.cx} ${sun.cy})`}
                  x1={sun.cx}
                  x2={sun.cx}
                  y1={sun.cy - rays.inner}
                  y2={sun.cy - rays.outer}
                />
              ))}
            </g>
          )}
          <circle
            className="madori-w-ring"
            cx={sun.cx}
            cy={sun.cy}
            fill="none"
            r={ring.r}
            stroke={BRAND.sol}
            strokeOpacity={0.55}
            strokeWidth={ring.strokeWidth}
          />
          <circle cx={sun.cx} cy={sun.cy} r={sun.r} />
        </g>
      </g>
      <path
        className="madori-w-frame"
        d={WINDOW.frame}
        fill="none"
        pathLength={portal ? 100 : undefined}
        stroke={frameColor}
        strokeLinecap={portal ? 'round' : undefined}
        strokeLinejoin="round"
        strokeWidth={WINDOW.strokeWidth}
      />
    </>
  )
}

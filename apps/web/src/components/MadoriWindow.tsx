import { BRAND, WINDOW } from '@/lib/brand'

type Props = {
  /** Color del marco; por defecto el del texto que lo rodea (`currentColor`). */
  frameColor?: string
  /** Si se pasa, el sol se recorta con el vidrio (hace falta cuando se anima). */
  clipId?: string
}

/**
 * Contenido SVG de la ventana (sin la etiqueta `<svg>`): el sol con su anillo y el marco. El vidrio no se pinta:
 * es transparente. Las clases `madori-w-*` son los ganchos que usa `Loader.css` para animar; sin CSS queda estática.
 */
export function MadoriWindow({ frameColor = 'currentColor', clipId }: Props) {
  const { sun, ring } = WINDOW
  return (
    <>
      {clipId && (
        <defs>
          <clipPath id={clipId}>
            <path d={WINDOW.glass} />
          </clipPath>
        </defs>
      )}
      <g clipPath={clipId ? `url(#${clipId})` : undefined}>
        <g className="madori-w-sun" fill={BRAND.sol}>
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
        stroke={frameColor}
        strokeLinejoin="round"
        strokeWidth={WINDOW.strokeWidth}
      />
    </>
  )
}

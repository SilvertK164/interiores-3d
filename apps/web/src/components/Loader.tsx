import { useId } from 'react'
import { WINDOW } from '@/lib/brand'
import './Loader.css'
import { MadoriWindow } from './MadoriWindow'

type Props = {
  size?: 'sm' | 'md' | 'lg'
  /** Texto para lectores de pantalla y, por defecto, también visible bajo la ventana. */
  label?: string
  /** `false` deja el texto solo para lectores de pantalla. */
  showLabel?: boolean
  /** Ocupa toda la pantalla (página o editor que aún no se mostró). */
  fullscreen?: boolean
  className?: string
}

/** Estado de carga de Madori: el sol sube por la ventana y un anillo de luz se expande. Con "reducir movimiento" queda quieto. */
export function Loader({
  size = 'md',
  label = 'Abriendo tu espacio',
  showLabel = true,
  fullscreen = false,
  className = '',
}: Props) {
  const clipId = `madori-clip-${useId().replace(/[^\w-]/g, '')}`
  const classes = [
    'madori-loader',
    `madori-loader--${size}`,
    fullscreen && 'madori-loader--screen',
    className,
  ].filter(Boolean)
  return (
    <div className={classes.join(' ')} role="status">
      <svg
        aria-hidden="true"
        className="madori-loader__win"
        focusable="false"
        viewBox={WINDOW.viewBox}
      >
        <MadoriWindow clipId={clipId} />
      </svg>
      <span
        className={showLabel ? 'madori-loader__label' : 'madori-loader__label madori-loader__sr'}
      >
        {label}
      </span>
    </div>
  )
}

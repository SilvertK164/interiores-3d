'use client'

import { useId } from 'react'
import { WINDOW } from '@/lib/brand'
import './Loader.css'
import { MadoriWindow } from './MadoriWindow'

type Props = {
  size?: 'sm' | 'md'
  /** Texto para lectores de pantalla y, por defecto, también visible bajo la ventana. */
  label?: string
  /** `false` deja el texto solo para lectores de pantalla. */
  showLabel?: boolean
  /** Ventana y texto en una fila (para junto a un botón o dentro de un formulario). */
  inline?: boolean
  className?: string
}

/**
 * Estado de carga compacto de Madori (botones, formularios, listas): la ventana pequeña, el sol sube y un anillo de luz
 * se expande. Con "reducir movimiento" queda quieto. Las pantallas completas usan `LoaderPortal`.
 */
export function Loader({
  size = 'md',
  label = 'Abriendo tu espacio',
  showLabel = true,
  inline = false,
  className = '',
}: Props) {
  const clipId = `madori-clip-${useId().replace(/[^\w-]/g, '')}`
  const classes = [
    'madori-loader',
    `madori-loader--${size}`,
    inline && 'madori-loader--inline',
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

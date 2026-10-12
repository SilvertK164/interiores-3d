import { WINDOW } from '@/lib/brand'
import { APP_NAME } from '@/lib/ui-text'
import './Logo.css'
import { MadoriWindow } from './MadoriWindow'

type Props = {
  /** Con `showName`: tamaño de la letra en px. Sin él: lado del icono en px. */
  size?: number
  showName?: boolean
  className?: string
}

/** El nombre se parte en la primera "o", que se dibuja como la ventana. */
function splitAtO(name: string): [string, string] | null {
  const i = name.toLowerCase().indexOf('o')
  return i < 0 ? null : [name.slice(0, i), name.slice(i + 1)]
}

/**
 * Marca de Madori. Con `showName` es el logotipo (letras en Fraunces y la "o" como ventana con el sol); sin él, el
 * icono circular, que es decorativo. Siempre estático: solo el Loader y la intro se animan.
 */
export function Logo({ size, showName = false, className = '' }: Props) {
  const parts = showName ? splitAtO(APP_NAME) : null
  if (!parts) {
    const side = size ?? 36
    return (
      <img
        alt=""
        aria-hidden
        className={`shrink-0 ${className}`}
        height={side}
        src="/logo.svg"
        width={side}
      />
    )
  }
  return (
    <span
      aria-label={APP_NAME}
      className={`madori-logo ${className}`}
      role="img"
      style={{ fontSize: size ?? 28 }}
    >
      <span aria-hidden="true">{parts[0]}</span>
      <svg
        aria-hidden="true"
        className="madori-logo__o"
        focusable="false"
        preserveAspectRatio="none"
        viewBox={WINDOW.viewBox}
      >
        <MadoriWindow />
      </svg>
      <span aria-hidden="true">{parts[1]}</span>
    </span>
  )
}

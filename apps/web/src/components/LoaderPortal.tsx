'use client'

import { Fraunces } from 'next/font/google'
import { type CSSProperties, useId, useLayoutEffect, useRef } from 'react'
import { WINDOW } from '@/lib/brand'
import { type PortalLetter, portalGeometry, portalLetters } from '@/lib/portal-geometry'
import { APP_NAME } from '@/lib/ui-text'
import './LoaderPortal.css'
import { MadoriWindow } from './MadoriWindow'

// El editor (/proyectos/[id]) no usa AppShell, que es quien carga Fraunces en el resto de la interfaz: el portal la
// trae consigo (mismas opciones que en AppShell, así Next sirve un solo archivo).
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'opsz'],
})

type Props = {
  /** Texto para lectores de pantalla (no se ve en pantalla). */
  label?: string
  className?: string
}

function Letter({ letter }: { letter: PortalLetter }) {
  return (
    <span
      aria-hidden="true"
      className="madori-portal__letter"
      style={{ '--d': letter.d, '--ld': letter.delay } as CSSProperties}
    >
      <span>{letter.ch}</span>
    </span>
  )
}

/**
 * Carga de pantalla completa: el portal que se achica y suelta las letras de "Madori" (ver `LoaderPortal.css`). Sin
 * texto, puntos ni barra de avance; los lectores de pantalla oyen `label`. Para botones y listas, `Loader`.
 */
export function LoaderPortal({ label = 'Abriendo tu proyecto', className = '' }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const wordRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLSpanElement>(null)
  const clipId = `madori-clip-${useId().replace(/[^\w-]/g, '')}`
  const { left, right } = portalLetters(APP_NAME)

  // Centro (--dx, --dy) y escala (--S) del portal grande. Se miden con offset*, que las transformaciones no alteran,
  // y se repiten al cambiar el tamaño de la ventana o de la palabra (también cuando llega la fuente).
  useLayoutEffect(() => {
    const root = rootRef.current
    const word = wordRef.current
    const slot = slotRef.current
    if (!root || !word || !slot) return
    const measure = () => {
      const g = portalGeometry({
        wordW: word.offsetWidth,
        wordH: word.offsetHeight,
        slotLeft: slot.offsetLeft,
        slotTop: slot.offsetTop,
        slotW: slot.offsetWidth,
        slotH: slot.offsetHeight,
        fontSize: Number.parseFloat(getComputedStyle(word).fontSize),
        viewportH: window.innerHeight,
      })
      if (!g) return
      word.style.setProperty('--dx', `${g.dx.toFixed(2)}px`)
      word.style.setProperty('--dy', `${g.dy.toFixed(2)}px`)
      word.style.setProperty('--S', g.scale.toFixed(4))
    }
    let alive = true
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    observer.observe(word)
    void document.fonts?.ready.then(() => alive && measure())
    return () => {
      alive = false
      observer.disconnect()
    }
  }, [])

  return (
    <div
      aria-label={label}
      className={`madori-portal ${fraunces.variable} ${className}`.trim()}
      ref={rootRef}
      role="status"
    >
      <div className="madori-portal__word" ref={wordRef}>
        <span className="sr-only">{label}</span>
        {left.map((letter) => (
          <Letter key={letter.ch + letter.d} letter={letter} />
        ))}
        <span aria-hidden="true" className="madori-portal__slot" ref={slotRef}>
          <svg
            aria-hidden="true"
            className="madori-portal__win"
            focusable="false"
            viewBox={WINDOW.viewBox}
          >
            <MadoriWindow clipId={clipId} portal />
          </svg>
        </span>
        {right.map((letter) => (
          <Letter key={letter.ch + letter.d} letter={letter} />
        ))}
      </div>
    </div>
  )
}

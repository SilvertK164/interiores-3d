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

// El portal se vuelve a montar al pasar de una pantalla de carga a la siguiente (ruta, editor, escena 3D): cada instancia
// retoma la animación en el punto donde iba la anterior en vez de empezar de cero. Si pasa más de 1 s sin ningún portal,
// es otra carga y empieza de nuevo.
type Shared = { t0: number; mounted: number; lastSeen: number }
const sharedClock = (): Shared => {
  const w = window as unknown as { __madoriLoader?: Shared }
  w.__madoriLoader ??= { t0: performance.now(), mounted: 0, lastSeen: Number.NEGATIVE_INFINITY }
  return w.__madoriLoader
}

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

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const clock = sharedClock()
    const now = performance.now()
    const continuing = clock.mounted > 0 || now - clock.lastSeen < 1000
    if (!continuing) clock.t0 = now
    clock.mounted += 1
    if (continuing) {
      const elapsed = now - clock.t0
      for (const animation of root.getAnimations({ subtree: true })) {
        const name = (animation as CSSAnimation).animationName
        if (name === 'madori-portal-fade') animation.finish()
        else animation.currentTime = elapsed
      }
    }
    return () => {
      clock.mounted -= 1
      clock.lastSeen = performance.now()
    }
  }, [])

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

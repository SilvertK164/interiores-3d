'use client'

import { type RefObject, useEffect, useState } from 'react'

// Pascal dibuja su propio cargador (clases `pascal-loader-N`) sobre una página en blanco mientras prepara la escena 3D.
// Sirve para saber cuándo mostrar el cargador de Madori encima; solo mira el DOM, no importa nada de Pascal.
const PASCAL_LOADER = '[class*="pascal-loader-"]'

/** `true` mientras el editor de Pascal dentro de `rootRef` muestra su cargador de escena; `active` es cuando el editor ya está montado. */
export function useSceneLoading(rootRef: RefObject<HTMLElement | null>, active: boolean): boolean {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const root = rootRef.current
    if (!active || !root) return
    const check = () => setLoading(root.querySelector(PASCAL_LOADER) !== null)
    check()
    const observer = new MutationObserver(check)
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [rootRef, active])
  return loading
}

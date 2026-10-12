'use client'

import { useEffect } from 'react'
import { selectLevels } from './bridge/levels'
import { measureFrame } from './frame-insets'
import { useBridge, useShell } from './use-bridge'

/** Espera a que el diseño se asiente (paneles montados, divisor quieto) antes de medir y encuadrar. */
const SETTLE_MS = 350

/**
 * Cada vista (plano y 3D) se encuadra sola a la planta activa: al entrar a 2D, 3D o Ambas, al cambiar de planta y al
 * redimensionar la ventana o el divisor. Zoom y paneo manuales de una vista no tocan a la otra (están desenlazadas).
 */
export function useFrameViews() {
  const bridge = useBridge()
  const viewMode = useShell((s) => s.editor.viewMode)
  const levelId = useShell((s) => selectLevels(s).activeId)
  const firstPerson = useShell((s) => s.editor.isFirstPersonMode)
  // biome-ignore lint/correctness/useExhaustiveDependencies: la vista y la planta activa no se leen dentro, pero cada cambio pide encuadrar de nuevo.
  useEffect(() => {
    if (firstPerson) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const frame = () => {
      clearTimeout(timer)
      timer = setTimeout(() => bridge.frameViews(measureFrame()), SETTLE_MS)
    }
    // Al abrir, la escena y los lienzos tardan en estar listos: se reintenta hasta encuadrar y una vez más cuando la geometría se asienta.
    let tries = 0
    let framed = 0
    const retry = setInterval(() => {
      tries++
      if (framed < 2) framed = bridge.frameViews(measureFrame()) ? framed + 1 : 0
      if (tries >= 30 || framed >= 2) clearInterval(retry)
    }, 600)
    window.addEventListener('resize', frame)
    // El divisor de Ambas cambia el tamaño de los lienzos sin cambiar la ventana.
    const observer = new ResizeObserver(frame)
    const watch = () => {
      for (const el of document.querySelectorAll('[data-pascal-viewer-3d]')) observer.observe(el)
      const svg = document.querySelector<SVGGElement>('[data-floorplan-scene]')?.ownerSVGElement
      if (svg) observer.observe(svg)
    }
    watch()
    const rewatch = setTimeout(watch, SETTLE_MS * 2)
    return () => {
      clearTimeout(timer)
      clearInterval(retry)
      clearTimeout(rewatch)
      window.removeEventListener('resize', frame)
      observer.disconnect()
    }
  }, [bridge, viewMode, levelId, firstPerson])
}

'use client'

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useReducer,
} from 'react'
import { type NavPhase, initialNavState, navReducer } from '@/lib/nav-progress'
import './NavProgress.css'

/** Cuánto se queda la barra completa antes de volver a reposo (le da tiempo a desvanecerse). */
const DONE_MS = 520

const ReportContext = createContext<(id: string, pending: boolean) => void>(() => {})

/** Barra fina superior (3 px, cobalto, plana). Es solo un indicador: los controles avisan con `aria-busy`. */
export function NavProgressBar({ phase }: { phase: NavPhase }) {
  return <div aria-hidden="true" className="madori-nav" data-state={phase} />
}

/** Va una vez en el diseño raíz: guarda el estado de la barra y la dibuja junto con la página. */
export function NavProgressProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(navReducer, initialNavState)
  const report = useCallback(
    (id: string, pending: boolean) => dispatch({ type: 'pending', id, pending }),
    [],
  )

  useEffect(() => {
    if (state.phase !== 'done') return
    const timer = setTimeout(() => dispatch({ type: 'reset' }), DONE_MS)
    return () => clearTimeout(timer)
  }, [state.phase])

  return (
    <ReportContext.Provider value={report}>
      {children}
      <NavProgressBar phase={state.phase} />
    </ReportContext.Provider>
  )
}

/** Un control avisa aquí mientras su navegación está pendiente; al desmontarse (llegó la página nueva) deja de estarlo. */
export function useReportNavPending(pending: boolean) {
  const id = useId()
  const report = useContext(ReportContext)
  useEffect(() => {
    report(id, pending)
    return () => report(id, false)
  }, [id, pending, report])
}

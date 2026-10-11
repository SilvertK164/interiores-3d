import { Geist } from 'next/font/google'
import type { ReactNode } from 'react'

// La tipografía y los colores nuevos viven SOLO dentro de este contenedor: el editor de Pascal no lo usa y no cambia.
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' })

export function AppShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`app-shell ${geist.variable} ${className}`}>{children}</div>
}

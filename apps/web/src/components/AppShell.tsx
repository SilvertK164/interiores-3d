import { Bricolage_Grotesque, DM_Sans } from 'next/font/google'
import type { ReactNode } from 'react'

// La tipografía y los colores nuevos viven SOLO dentro de este contenedor: el editor de Pascal no lo usa y no cambia.
// Las variables de next/font existen en este elemento (no en :root); app-shell.css las lee desde aquí.
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm', display: 'swap' })
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage', display: 'swap' })

export function AppShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`app-shell ${dmSans.variable} ${bricolage.variable} ${className}`}>{children}</div>
}

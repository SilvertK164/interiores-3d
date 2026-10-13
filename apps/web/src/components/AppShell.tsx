import { Bricolage_Grotesque, DM_Sans, Fraunces } from 'next/font/google'
import type { ReactNode } from 'react'

// La tipografía y los colores nuevos viven SOLO dentro de este contenedor: el editor de Pascal no lo usa y no cambia.
// Las variables de next/font existen en este elemento (no en :root); app-shell.css y Logo.css las leen desde aquí.
// Fraunces es solo del logotipo (SOFT al máximo con font-variation-settings, ver Logo.css).
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm', display: 'swap' })
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
})
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'opsz'],
})

/** Clases con las variables de fuente (DM Sans, Bricolage y Fraunces) para quien las necesite fuera de `.app-shell`, como el editor. */
export const appFontClasses = `${dmSans.variable} ${bricolage.variable} ${fraunces.variable}`

export function AppShell({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`app-shell ${appFontClasses} ${className}`}
    >
      {children}
    </div>
  )
}

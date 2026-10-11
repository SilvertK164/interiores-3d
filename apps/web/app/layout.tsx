import { APP_NAME } from '@/lib/ui-text'
import './globals.css'

export const metadata = { title: APP_NAME }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}

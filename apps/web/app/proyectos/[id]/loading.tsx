import { Loader } from '@/components/Loader'

/** El editor no usa `AppShell` ni sus tokens: el Loader lleva sus propios colores. */
export default function Loading() {
  return <Loader fullscreen label="Abriendo tu proyecto" size="lg" />
}

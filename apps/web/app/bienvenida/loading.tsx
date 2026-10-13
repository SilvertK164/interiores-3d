import { LoaderPortal } from '@/components/LoaderPortal'

/** La bienvenida solo espera la sesión: el portal basta, igual que dentro de la página. */
export default function Loading() {
  return <LoaderPortal label="Preparando tu espacio" />
}

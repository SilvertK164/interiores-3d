import { LoaderPortal } from '@/components/LoaderPortal'

/** La página «Escena desde una foto» solo espera la sesión: el portal basta, igual que dentro de la página. */
export default function Loading() {
  return <LoaderPortal label="Abriendo la escena desde una foto" />
}

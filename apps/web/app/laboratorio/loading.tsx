import { LoaderPortal } from '@/components/LoaderPortal'

/** La página del laboratorio solo espera la sesión: el portal basta, igual que dentro de la página. */
export default function Loading() {
  return <LoaderPortal label="Abriendo el laboratorio" />
}

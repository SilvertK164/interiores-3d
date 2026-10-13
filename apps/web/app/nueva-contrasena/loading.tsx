import { LoaderPortal } from '@/components/LoaderPortal'

/** La página solo espera leer el enlace del correo: el portal basta, igual que dentro de la página. */
export default function Loading() {
  return <LoaderPortal label="Verificando tu enlace" />
}

import { Loader } from '@/components/Loader'

/** La página del laboratorio solo espera la sesión: el Loader basta, igual que dentro de la página. */
export default function Loading() {
  return <Loader fullscreen />
}

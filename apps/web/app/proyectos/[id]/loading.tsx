import { LoaderPortal } from '@/components/LoaderPortal'

/** El editor no usa `AppShell` ni sus tokens: el portal lleva sus propios colores. */
export default function Loading() {
  return <LoaderPortal />
}

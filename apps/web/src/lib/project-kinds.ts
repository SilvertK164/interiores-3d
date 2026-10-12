import type { ProjectKind } from '@interiores/contract'
import { House, Store } from 'lucide-react'

/** Los dos tipos de proyecto con su texto y su ícono: los comparten el diálogo "Nuevo proyecto" y `/bienvenida`. */
export const PROJECT_KINDS: { value: ProjectKind; label: string; hint: string; Icon: typeof House }[] = [
  { value: 'vivienda', label: 'Vivienda', hint: 'Departamentos, casas y lofts', Icon: House },
  { value: 'comercio', label: 'Comercio', hint: 'Tiendas, cafés y supermercados', Icon: Store },
]

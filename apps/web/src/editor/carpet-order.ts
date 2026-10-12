/** Muebles que se pisan con los demás: su proyección en el plano 2D tiene que quedar debajo (Pascal dibuja en el orden de `children`). */
export const CARPET_ASSETS: ReadonlySet<string> = new Set(['rectangular-carpet', 'round-carpet'])

/** Las alfombras primero y el resto en su orden; devuelve `null` si ya estaban así (no hay nada que cambiar). */
export function carpetsFirst(children: readonly string[], isCarpet: (id: string) => boolean): string[] | null {
  const ordered = [...children.filter(isCarpet), ...children.filter((id) => !isCarpet(id))]
  return ordered.every((id, i) => id === children[i]) ? null : ordered
}

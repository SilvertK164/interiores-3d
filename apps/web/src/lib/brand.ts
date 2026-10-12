/**
 * Marca Madori: colores y geometría de la ventana. Única fuente para el logotipo, el icono y el Loader.
 * Los SVG estáticos (`public/logo.svg`, `app/icon.svg`) y la intro de `docs/design/marca/` copian esta geometría
 * (no pueden importarla) y `test/brand.test.ts` comprueba que sigan coincidiendo.
 */
export const BRAND = {
  cobalto: '#1F5FE0',
  noche: '#0B1F4D',
  sol: '#FFB02E',
  cielo: '#CFE0FF',
  crema: '#FFF4E2',
  alba: '#DCE6FF',
} as const

/** Ventana de la "o": óvalo-arco con esquinas inferiores redondeadas, sin alféizar. Caja de 64 × 64. */
export const WINDOW = {
  viewBox: '0 0 64 64',
  /** Mismo grosor que el trazo de las letras. */
  strokeWidth: 11,
  /** Contorno del marco (el trazo se centra sobre este camino). */
  frame: 'M7 46V32A25 25 0 0 1 57 32V46A12 12 0 0 1 45 58H19A12 12 0 0 1 7 46Z',
  /** Borde interior del marco: recorta el sol cuando sube o baja. */
  glass: 'M12.5 46V32A19.5 19.5 0 0 1 51.5 32V46A6.5 6.5 0 0 1 45 52.5H19A6.5 6.5 0 0 1 12.5 46Z',
  sun: { cx: 32, cy: 39, r: 9 },
  ring: { r: 11.5, strokeWidth: 2.2 },
  /** Rayos del sol del portal (Loader de pantalla completa): distancias al centro del sol. */
  rays: { count: 12, inner: 13.5, outer: 17.5, strokeWidth: 2.6 },
  /** Cuánto baja el sol (unidades de la caja) para quedar oculto bajo el vidrio. */
  hidden: 26,
} as const

/**
 * Icono de la aplicación y favicon: cuadrado redondeado Crema con la ventana Noche y el sol, sin anillo. Va sobre
 * Crema (y no transparente) para que se lea igual en pestañas claras y oscuras. Caja de 64 × 64; `transform` coloca y
 * reduce la ventana; el sol es algo mayor que el del logotipo para que se vea a 16 px.
 */
export const ICON = {
  radius: 15,
  transform: 'translate(13.7 13.4) scale(.6)',
  sunRadius: 10,
} as const

/** Parte un nombre en su primera "o" (la que se dibuja como ventana). `null` si no tiene ninguna. */
export function splitAtO(name: string): [string, string] | null {
  const i = name.toLowerCase().indexOf('o')
  return i < 0 ? null : [name.slice(0, i), name.slice(i + 1)]
}

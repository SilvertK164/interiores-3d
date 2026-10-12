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
  /** Cuánto baja el sol (unidades de la caja) para quedar oculto bajo el vidrio. */
  hidden: 26,
} as const

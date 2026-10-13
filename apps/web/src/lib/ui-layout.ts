/**
 * Clases de maquetación de /proyectos que comparten la página real y su esqueleto. Viven aquí para que los
 * esqueletos midan exactamente lo mismo que lo real y la página no se mueva cuando llegan los datos.
 */

/** Marco de la página: columna en móvil y, en escritorio, una sola pantalla con cuatro filas. */
export const PROJECTS_FRAME =
  'mx-auto flex min-h-dvh max-w-[1360px] flex-col gap-4 px-[clamp(20px,4vw,56px)] pb-6 pt-[18px] desk:grid desk:h-dvh desk:min-h-[620px] desk:grid-rows-[auto_auto_minmax(0,1fr)_minmax(0,1fr)] desk:gap-3.5 desk:overflow-hidden desk:pb-[22px]'

export const HEADER_ROW = 'flex flex-wrap items-center gap-3 desk:flex-nowrap desk:gap-4'
export const GREETING_ROW = 'flex items-end gap-5 pt-1'
export const CHIPS_ROW = 'ml-auto hidden gap-2 pb-1.5 desk:flex'

export const SECTION = 'grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5'
export const SECTION_TITLE = 'font-display text-[19px] font-bold tracking-[-0.02em]'

/** Fila "Tus proyectos": tarjetas con scroll horizontal interno en escritorio. */
export const PROJECT_LIST =
  'grid min-h-0 auto-cols-auto grid-flow-row gap-4 pb-1 desk:auto-cols-[minmax(240px,calc((100%-3rem)/4))] desk:grid-flow-col desk:grid-rows-[minmax(0,1fr)] desk:overflow-x-auto desk:overflow-y-hidden desk:px-1 desk:pb-6 desk:pt-1 [scrollbar-width:thin]'
export const PROJECT_ITEM = 'min-h-[220px] min-w-0 desk:min-h-0'

/** Mosaico "Empieza desde una plantilla". */
export const GALLERY_LIST = 'grid min-h-0 grid-cols-2 gap-3 desk:grid-cols-4 desk:grid-rows-2'
export const GALLERY_HERO_ITEM =
  'col-span-2 aspect-[16/10] min-h-0 desk:row-span-2 desk:aspect-auto'
export const GALLERY_TILE_ITEM = 'aspect-[4/3] min-h-0 desk:aspect-auto'

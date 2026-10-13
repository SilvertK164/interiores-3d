/**
 * Fondo de las pantallas de acceso (/login y /bienvenida): una plantilla desenfocada con un velo claro, que sangra
 * fuera del recuadro para que el desenfoque no deje bordes. Va dentro de un contenedor `relative`.
 */
export function AuthBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* biome-ignore lint/performance/noImgElement: fondo decorativo desenfocado; next/image no aporta nada aquí. */}
      <img alt="" className="absolute -inset-10 h-[calc(100%+5rem)] w-[calc(100%+5rem)] max-w-none object-cover blur-[30px] saturate-[1.1]" src="/templates/cafe.jpg" />
      <div className="absolute inset-0 bg-canvas/55" />
    </div>
  )
}

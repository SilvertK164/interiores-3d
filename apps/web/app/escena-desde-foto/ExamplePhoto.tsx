import { Upload } from 'lucide-react'
import { EXAMPLE_PHOTO } from '@/lib/lab/sample-analysis'

type Props = {
  /** Vuelve a pedir la foto de la persona (quita el ejemplo). */
  onUseOwn: () => void
  disabled?: boolean
}

/** La foto de ejemplo que acompaña a «Probar con un ejemplo», completa (sin recortar) y con una etiqueta discreta; la persona puede cambiarla por la suya. */
export function ExamplePhoto({ onUseOwn, disabled = false }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <figure className="relative m-0 overflow-hidden rounded-[24px] bg-white/60">
        {/* biome-ignore lint/performance/noImgElement: foto de ejemplo propia de 1600 px, ya reducida; se muestra completa y sin recortar. */}
        <img alt={EXAMPLE_PHOTO.alt} className="block h-auto w-full" height={1070} src={EXAMPLE_PHOTO.src} width={1600} />
        <figcaption className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[12px] font-medium text-ink-muted shadow-soft">{EXAMPLE_PHOTO.label}</figcaption>
      </figure>
      <button className="btn glass w-full" disabled={disabled} onClick={onUseOwn} type="button">
        <Upload aria-hidden size={18} />
        Usar mi propia foto
      </button>
    </div>
  )
}

import { Check } from 'lucide-react'
import type { TemplateInfo } from '@/lib/templates'
import { templateMeta } from '@/lib/ui-text'

type Props = {
  template: TemplateInfo
  /** hero = destacada grande; small = mosaico; picker = selector del diálogo. */
  size?: 'hero' | 'small' | 'picker'
  badge?: string
  /** Muestra la marca de selección cuando el contenedor (`group`) tiene un radio marcado. */
  selectable?: boolean
}

const INFO: Record<NonNullable<Props['size']>, string> = {
  hero: 'inset-x-2.5 bottom-2.5 items-center justify-between rounded-[18px] px-3.5 py-2.5',
  small: 'inset-x-2 bottom-2 items-center rounded-[14px] px-2.5 py-1.5',
  picker: 'inset-x-2 bottom-2 flex-col items-start gap-0.5 rounded-[14px] px-2.5 py-2',
}

/**
 * Cara de una tarjeta de plantilla: imagen, etiqueta opcional y franja de vidrio con el nombre.
 * Va dentro de un contenedor `group relative isolate overflow-hidden` (botón del mosaico o etiqueta del selector).
 */
export function TemplateFace({ template, size = 'small', badge, selectable = false }: Props) {
  return (
    <>
      <img
        alt=""
        className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        src={template.thumbnail}
      />
      {badge && <span className="chip absolute left-2.5 top-2.5 bg-brand-wash text-brand-deep">{badge}</span>}
      {selectable && (
        <span className="absolute right-2.5 top-2.5 hidden size-7 place-items-center rounded-full bg-brand text-white group-has-[:checked]:grid">
          <Check aria-hidden size={14} />
        </span>
      )}
      <span className={`glass absolute flex gap-2 text-left ${INFO[size]}`}>
        <span className={`min-w-0 truncate font-medium ${size === 'hero' ? 'text-[17px]' : 'text-[13px]'} ${size === 'picker' ? 'max-w-full' : ''}`}>
          {template.name}
        </span>
        {size !== 'small' && <span className="chip bg-white/70">{templateMeta(template)}</span>}
      </span>
    </>
  )
}

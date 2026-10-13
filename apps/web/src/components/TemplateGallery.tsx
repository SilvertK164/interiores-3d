import { LayoutGrid } from 'lucide-react'
import { TEMPLATES, type TemplateInfo } from '@/lib/templates'
import { GALLERY_HERO_ITEM, GALLERY_LIST, GALLERY_TILE_ITEM } from '@/lib/ui-layout'
import { TemplateFace } from './TemplateFace'

type Props = {
  templates: TemplateInfo[]
  /** Abrir el diálogo "Nuevo proyecto" con esta plantilla ya elegida. */
  onPick: (templateId: string) => void
  /** Abrir el diálogo sin plantilla elegida (la galería completa vive allí). */
  onSeeAll: () => void
}

const TILE =
  'group focus-ring relative isolate block size-full cursor-pointer overflow-hidden rounded-[20px] shadow-soft transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-[3px] hover:shadow-lift'

/** Mosaico "Empieza desde una plantilla": una destacada grande, hasta tres chicas y "Ver galería". */
export function TemplateGallery({ templates, onPick, onSeeAll }: Props) {
  const [hero, ...rest] = templates
  return (
    <ul className={GALLERY_LIST}>
      {hero && (
        <li className={GALLERY_HERO_ITEM}>
          <button aria-label={`Empezar con ${hero.name}`} className={TILE} onClick={() => onPick(hero.id)} type="button">
            <TemplateFace badge="Destacada" size="hero" template={hero} />
          </button>
        </li>
      )}
      {rest.slice(0, 3).map((t) => (
        <li className={GALLERY_TILE_ITEM} key={t.id}>
          <button aria-label={`Empezar con ${t.name}`} className={TILE} onClick={() => onPick(t.id)} type="button">
            <TemplateFace size="small" template={t} />
          </button>
        </li>
      ))}
      <li className={GALLERY_TILE_ITEM}>
        <button
          className="focus-ring grid size-full cursor-pointer place-items-center rounded-[20px] bg-white/60 text-center text-brand transition-[transform,background-color] duration-200 ease-out hover:-translate-y-[3px] hover:bg-white"
          onClick={onSeeAll}
          type="button"
        >
          <span>
            <LayoutGrid aria-hidden className="mx-auto" size={20} />
            <span className="mt-1 block font-display text-sm font-medium">Ver galería</span>
            <span className="block text-xs text-ink-muted">{TEMPLATES.length} plantillas y en blanco</span>
          </span>
        </button>
      </li>
    </ul>
  )
}

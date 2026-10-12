import { Check, Palette } from 'lucide-react'
import { cx } from '@/lib/cx'
import type { Swatch } from '../materials-model'
import { ChipRow, FLOAT, SIDE_PANEL } from './primitives'
import { SoonButton } from './status'

type Option = { value: string; label: string }

function SwatchTile({ swatch, onPick }: { swatch: Swatch; onPick: (id: string) => void }) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={swatch.selected}
        onClick={() => onPick(swatch.id)}
        className="focus-ring flex w-full cursor-pointer flex-col gap-1.5 rounded-[18px] p-1.5 text-left transition-colors duration-150 ease-out hover:bg-ink/5"
      >
        <span
          className={cx(
            'relative block aspect-square w-full overflow-hidden rounded-[14px]',
            swatch.selected ? 'ring-2 ring-ink ring-offset-2' : 'ring-1 ring-ink/10',
          )}
          style={swatch.thumbnail ? undefined : { backgroundColor: swatch.color ?? '#F1F5FC' }}
        >
          {swatch.thumbnail && (
            // biome-ignore lint/performance/noImgElement: texturas propias de Pascal ya optimizadas (webp)
            <img
              src={swatch.thumbnail}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className="absolute inset-0 size-full object-cover"
            />
          )}
          {swatch.selected && (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-ink text-white"
            >
              <Check className="size-4" strokeWidth={2.5} />
            </span>
          )}
        </span>
        <span className="block px-0.5 text-[12.5px] font-medium leading-tight text-ink">{swatch.name}</span>
      </button>
    </li>
  )
}

/** Panel izquierdo del modo Materiales: superficie, categoría y muestras; "Color personalizado" llega en una próxima versión. */
export function MaterialsCatalog({
  tabs,
  tab,
  onTab,
  categories,
  category,
  onCategory,
  swatches,
  onPick,
}: {
  tabs: readonly Option[]
  tab: string
  onTab: (value: string) => void
  categories: readonly Option[]
  category: string | null
  onCategory: (value: string) => void
  swatches: readonly Swatch[]
  onPick: (id: string) => void
}) {
  return (
    <aside aria-label="Materiales" className={cx(FLOAT, SIDE_PANEL)}>
      <h2 className="font-display text-[22px] font-semibold leading-none">Materiales</h2>
      <div className="mt-3.5">
        <ChipRow title="Superficie" chips={tabs} active={tab} onPick={onTab} />
      </div>
      <p className="mt-3 rounded-[14px] bg-brand-wash px-3 py-2 text-[13px] leading-snug text-ink">
        Elige un material y haz clic en lo que quieras pintar.
      </p>
      <div className="mt-3">
        <ChipRow title="Categoría" chips={categories} active={category ?? ''} onPick={onCategory} />
      </div>
      {swatches.length === 0 ? (
        <p className="mt-4 text-[14px] text-ink-muted">No hay materiales para esta superficie.</p>
      ) : (
        <ul className="shell-scroll mt-3.5 grid min-h-0 flex-1 grid-cols-3 content-start gap-1 overflow-y-auto pb-1 pr-0.5">
          {swatches.map((swatch) => (
            <SwatchTile key={swatch.id} swatch={swatch} onPick={onPick} />
          ))}
        </ul>
      )}
      <div className="mt-3 flex">
        <SoonButton icon={Palette} label="Color personalizado" />
      </div>
    </aside>
  )
}

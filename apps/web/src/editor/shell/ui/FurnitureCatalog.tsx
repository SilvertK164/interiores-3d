import { Search, Upload } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Badge, ChipRow, FLOAT, SIDE_PANEL } from './primitives'

export type CatalogChip = { id: string; label: string }
export type CatalogCard = {
  id: string
  name: string
  size: string
  thumbnail: string
  selected: boolean
}

function Card({ card, onPick }: { card: CatalogCard; onPick: (id: string) => void }) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={card.selected}
        onClick={() => onPick(card.id)}
        className={cx(
          'focus-ring group flex w-full cursor-pointer flex-col gap-2 rounded-[20px] bg-white p-2 text-left transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5',
          card.selected
            ? 'shadow-[0_0_0_2px_#0B1F4D]'
            : 'shadow-[0_1px_2px_rgb(11_31_77/0.06)] hover:shadow-[0_1px_2px_rgb(11_31_77/0.06),0_8px_20px_rgb(11_31_77/0.1)]',
        )}
      >
        <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-[14px] bg-[#F1F5FC]">
          {/* biome-ignore lint/performance/noImgElement: miniaturas propias de 256 px, ya optimizadas (webp con fondo transparente) */}
          <img
            src={card.thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 size-full object-contain p-1.5"
          />
        </span>
        <span className="px-1 pb-1">
          <span className="block text-[14px] font-semibold leading-tight text-ink">{card.name}</span>
          <span className="block text-[12px] tabular-nums leading-tight text-ink-muted">{card.size}</span>
        </span>
      </button>
    </li>
  )
}

/** Panel izquierdo del modo Muebles: búsqueda, categorías, "Subir mi mueble" (Pronto) y la grilla de tarjetas. */
export function FurnitureCatalog({
  query,
  onQuery,
  chips,
  chip,
  onChip,
  cards,
  onPick,
  custom,
}: {
  query: string
  onQuery: (query: string) => void
  chips: readonly CatalogChip[]
  chip: string
  onChip: (id: string) => void
  cards: readonly CatalogCard[]
  onPick: (id: string) => void
  /** Sección "A medida" (arriba del catálogo). */
  custom?: ReactNode
}) {
  return (
    <aside aria-label="Muebles" data-frame-panel="left" className={cx(FLOAT, SIDE_PANEL)}>
      <h2 className="font-display text-[22px] font-semibold leading-none">Muebles</h2>
      <label className="relative mt-3.5 block">
        <span className="sr-only">Buscar muebles</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Buscar sofá, cama, mesa…"
          className="focus-ring h-11 w-full rounded-[14px] bg-ink/5 pl-10 pr-3 text-[14px] text-ink outline-none placeholder:text-ink-muted"
        />
      </label>
      <div className="mt-3">
        <ChipRow title="Categorías" chips={chips.map((c) => ({ value: c.id, label: c.label }))} active={chip} onPick={onChip} />
      </div>
      <div className="relative mt-3.5">
        <button
          type="button"
          disabled
          className="flex h-11 w-full items-center gap-2.5 rounded-[14px] bg-ink/5 px-3.5 text-[14px] font-semibold text-ink/45"
        >
          <Upload aria-hidden="true" className="size-[18px]" strokeWidth={2} />
          Subir mi mueble
          <Badge className="ml-auto">Pronto</Badge>
        </button>
      </div>
      <div className="shell-scroll mt-3.5 min-h-0 flex-1 overflow-y-auto pb-1 pr-0.5">
        {custom}
        {cards.length === 0 ? (
          <p className="mt-1 text-[14px] text-ink-muted">No encontramos muebles con ese nombre.</p>
        ) : (
          <ul className="grid grid-cols-2 content-start gap-2.5">
            {cards.map((card) => (
              <Card key={card.id} card={card} onPick={onPick} />
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

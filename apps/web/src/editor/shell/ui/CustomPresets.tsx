import type { LucideIcon } from 'lucide-react'
import { cx } from '@/lib/cx'

export type CustomCard = { id: string; label: string; detail: string; icon: LucideIcon }
export type CustomGroup = { id: string; title: string; cards: readonly CustomCard[] }

/** Sección "A medida" del panel de muebles: estantes y gabinetes paramétricos que se arman con un preset. */
export function CustomPresets({
  groups,
  activeId,
  onPick,
}: {
  groups: readonly CustomGroup[]
  /** `grupo:id` de la tarjeta que está armada, si la hay. */
  activeId: string | null
  onPick: (group: string, id: string) => void
}) {
  return (
    <section aria-label="A medida" className="mb-3">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">A medida</h3>
      {groups.map((group) => (
        <fieldset key={group.id} className="mt-2.5 min-w-0 border-0 p-0">
          <legend className="mb-1.5 p-0 text-[13px] font-semibold text-ink">{group.title}</legend>
          <div className="grid grid-cols-2 gap-2">
            {group.cards.map((card) => {
              const Icon = card.icon
              const selected = activeId === `${group.id}:${card.id}`
              return (
                <button
                  key={card.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onPick(group.id, card.id)}
                  className={cx(
                    'focus-ring flex cursor-pointer items-start gap-2 rounded-[14px] bg-white p-2.5 text-left transition-shadow duration-150',
                    selected
                      ? 'shadow-[0_0_0_2px_#0B1F4D]'
                      : 'shadow-[0_1px_2px_rgb(11_31_77/0.06)] hover:shadow-[0_1px_2px_rgb(11_31_77/0.06),0_6px_14px_rgb(11_31_77/0.1)]',
                  )}
                >
                  <Icon aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-ink" strokeWidth={2} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold leading-tight text-ink">{card.label}</span>
                    <span className="block text-[11px] leading-tight text-ink-muted">{card.detail}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}
    </section>
  )
}

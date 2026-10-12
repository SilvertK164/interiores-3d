import { Share2, Sparkles, type LucideIcon } from 'lucide-react'
import { cx } from '@/lib/cx'
import { ChipRow, FLOAT } from './primitives'
import { SoonButton } from './status'

export type ChipGroup = {
  id: string
  title: string
  chips: readonly { value: string; label: string }[]
  active: string
}


/** Panel derecho del modo Ver: un grupo de opciones por tema (Muros, Niveles y, si Pascal lo permite, Cámara y Estilo). */
export function ViewPanel({
  groups,
  onPick,
}: {
  groups: readonly ChipGroup[]
  onPick: (groupId: string, value: string) => void
}) {
  return (
    <aside
      aria-label="Vista 3D"
      className={cx(FLOAT, 'absolute right-5 top-[88px] z-10 w-[316px] rounded-[26px] p-4')}
    >
      <h2 className="font-display text-[19px] font-semibold leading-none">Vista 3D</h2>
      <div className="mt-3.5 flex flex-col gap-3">
        {groups.map((g) => (
          <section key={g.id}>
            <h3 className="mb-2 text-[13px] font-semibold text-ink-muted">{g.title}</h3>
            <ChipRow title={g.title} chips={g.chips} active={g.active} onPick={(value) => onPick(g.id, value)} />
          </section>
        ))}
      </div>
    </aside>
  )
}

export type ViewAction = { id: string; label: string; icon: LucideIcon }

/** Barra flotante inferior del modo Ver: girar, vista superior y recorrer. */
export function ViewBar({
  actions,
  onAction,
}: {
  actions: readonly ViewAction[]
  onAction: (id: string) => void
}) {
  return (
    <div
      role="toolbar"
      aria-label="Cámara"
      className={cx(
        FLOAT,
        'absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-[28px] p-2',
      )}
    >
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onAction(a.id)}
          className="focus-ring flex h-16 w-[100px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[20px] text-[12.5px] font-medium text-ink transition-colors duration-150 ease-out hover:bg-ink/6"
        >
          <a.icon aria-hidden="true" className="size-[22px]" strokeWidth={1.9} />
          {a.label}
        </button>
      ))}
    </div>
  )
}

/** Compartir y Renderizar: visibles pero deshabilitados, con "Pronto". */
export function ShareRender() {
  return (
    <div className="absolute bottom-6 right-5 z-10 flex items-center gap-3">
      <SoonButton icon={Share2} label="Compartir" />
      <SoonButton icon={Sparkles} label="Renderizar" tone="primary" />
    </div>
  )
}

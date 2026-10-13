import { FileDown, ImageDown, type LucideIcon } from 'lucide-react'
import { cx } from '@/lib/cx'
import { ChipRow, FLOAT } from './primitives'

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
      data-frame-panel="right"
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

const EXPORT_BUTTON = cx(FLOAT, 'focus-ring inline-flex h-12 cursor-pointer items-center gap-2 rounded-full px-5 text-[15px] font-semibold text-ink transition-colors duration-150 ease-out hover:bg-white disabled:cursor-wait disabled:opacity-60')

/** Exportar plano (PDF) y exportar la vista isométrica como imagen. */
export function ExportButtons({
  onExportPlan,
  onExportImage,
  imageBusy = false,
  imageStyle = 'color',
  onImageStyle,
}: {
  onExportPlan?: (opener: HTMLElement) => void
  onExportImage?: () => void
  imageBusy?: boolean
  imageStyle?: 'color' | 'bn'
  onImageStyle?: (style: 'color' | 'bn') => void
} = {}) {
  return (
    <div className="absolute bottom-6 right-5 z-10 flex items-center gap-3">
      <fieldset className={cx(FLOAT, 'm-0 inline-flex h-12 items-center gap-1 rounded-full border-0 p-1')}>
        <legend className="sr-only">Colores de la imagen 3D</legend>
        {(
          [
            ['color', 'Color'],
            ['bn', 'Blanco y negro'],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className="relative inline-flex h-10 cursor-pointer items-center rounded-full px-4 text-[14px] font-semibold text-ink hover:bg-white has-[:checked]:bg-ink has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand/45"
          >
            <input checked={imageStyle === value} className="sr-only" name="estilo-imagen-3d" onChange={() => onImageStyle?.(value)} type="radio" value={value} />
            {label}
          </label>
        ))}
      </fieldset>
      <button type="button" onClick={onExportImage} disabled={imageBusy} aria-busy={imageBusy || undefined} className={EXPORT_BUTTON}>
        <ImageDown aria-hidden="true" className="size-[18px]" strokeWidth={2} />
        {imageBusy ? 'Generando imagen…' : 'Exportar imagen 3D'}
      </button>
      <button type="button" onClick={(event) => onExportPlan?.(event.currentTarget)} className={EXPORT_BUTTON}>
        <FileDown aria-hidden="true" className="size-[18px]" strokeWidth={2} />
        Exportar plano
      </button>
    </div>
  )
}

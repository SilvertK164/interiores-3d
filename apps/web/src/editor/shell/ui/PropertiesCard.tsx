import { Copy, type LucideIcon, Trash2, X } from 'lucide-react'
import { cx } from '@/lib/cx'
import { FLOAT, IconTile } from './primitives'

export type FieldOption = { value: string; label: string; disabled?: boolean }
export type FieldView =
  | { kind: 'number' | 'text'; id: string; label: string; value: string }
  | { kind: 'select'; id: string; label: string; value: string; options: readonly FieldOption[] }
  | {
      kind: 'swatch'
      id: string
      label: string
      value: string
      options: readonly (FieldOption & { color: string })[]
    }
  | { kind: 'readonly'; id: string; label: string; value: string }

const CONTROL =
  'focus-ring h-11 w-[156px] rounded-[14px] bg-ink/5 px-3.5 text-[14px] font-medium text-ink outline-none transition-colors duration-150 ease-out hover:bg-ink/8'

function FieldRow({ field, onCommit }: { field: FieldView; onCommit: (id: string, raw: string) => void }) {
  const id = `prop-${field.id}`
  if (field.kind === 'swatch') {
    return (
      <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0 py-1">
        <legend className="mb-1 text-[14px] text-ink-muted">{field.label}</legend>
        <div className="flex gap-1">
          {field.options.map((o) => {
            const on = o.value === field.value
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                aria-label={o.label}
                onClick={() => onCommit(field.id, o.value)}
                className="focus-ring grid size-11 cursor-pointer place-items-center rounded-full"
              >
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: o.color }}
                  className={cx('size-7 rounded-full', on ? 'ring-2 ring-ink ring-offset-2' : 'ring-1 ring-ink/15')}
                />
              </button>
            )
          })}
        </div>
      </fieldset>
    )
  }
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <label htmlFor={id} className="text-[14px] text-ink-muted">
        {field.label}
      </label>
      {field.kind === 'select' && (
        <select
          id={id}
          value={field.value}
          onChange={(event) => onCommit(field.id, event.target.value)}
          className={cx(CONTROL, 'cursor-pointer')}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {(field.kind === 'number' || field.kind === 'text') && (
        <input
          key={`${field.id}:${field.value}`}
          id={id}
          type="text"
          inputMode={field.kind === 'number' ? 'decimal' : 'text'}
          defaultValue={field.value}
          autoComplete="off"
          spellCheck={false}
          onBlur={(event) => {
            if (event.currentTarget.value !== field.value) onCommit(field.id, event.currentTarget.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') event.currentTarget.value = field.value
            if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur()
          }}
          className={cx(CONTROL, field.kind === 'number' && 'tabular-nums')}
        />
      )}
      {field.kind === 'readonly' && (
        <output id={id} className="w-[156px] px-3.5 text-[14px] font-medium tabular-nums text-ink">
          {field.value}
        </output>
      )}
    </div>
  )
}

/** Ficha de propiedades del elemento elegido: campos, Duplicar (si aplica) y Borrar con confirmación opcional. */
export function PropertiesCard({
  title,
  subtitle,
  icon,
  fields,
  onCommit,
  onClose,
  onDuplicate,
  onDelete,
  confirmMessage,
  onConfirmDelete,
  onCancelDelete,
}: {
  title: string
  subtitle?: string
  icon: LucideIcon
  fields: readonly FieldView[]
  onCommit: (fieldId: string, raw: string) => void
  onClose: () => void
  onDuplicate?: () => void
  onDelete: () => void
  confirmMessage?: string | null
  onConfirmDelete: () => void
  onCancelDelete: () => void
}) {
  const BUTTON =
    'focus-ring inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-colors duration-150 ease-out'
  return (
    <aside
      aria-label="Propiedades"
      className={cx(
        FLOAT,
        'shell-scroll absolute right-5 top-[88px] z-10 max-h-[calc(100dvh-200px)] w-[316px] overflow-y-auto rounded-[26px] p-4',
      )}
    >
      <div className="flex items-center gap-3">
        <IconTile icon={icon} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[19px] font-semibold leading-tight">{title}</h2>
          {subtitle && <p className="truncate text-[13px] leading-tight text-ink-muted">{subtitle}</p>}
        </div>
        <button
          type="button"
          aria-label="Cerrar propiedades"
          onClick={onClose}
          className="focus-ring grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink-muted transition-colors duration-150 ease-out hover:bg-ink/6 hover:text-ink"
        >
          <X aria-hidden="true" className="size-5" strokeWidth={2} />
        </button>
      </div>
      <div className="flex flex-col gap-1.5 pb-4 pt-3.5">
        {fields.map((f) => (
          <FieldRow key={f.id} field={f} onCommit={onCommit} />
        ))}
      </div>
      {confirmMessage ? (
        <div role="alert" className="rounded-[18px] bg-danger-wash p-3">
          <p className="text-[14px] font-medium leading-snug text-danger-ink">{confirmMessage}</p>
          <div className="mt-2.5 flex gap-2.5">
            <button type="button" onClick={onCancelDelete} className={cx(BUTTON, 'bg-white text-ink hover:bg-ink/6')}>
              Cancelar
            </button>
            <button type="button" onClick={onConfirmDelete} className={cx(BUTTON, 'bg-danger text-white hover:opacity-90')}>
              Borrar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2.5">
          {onDuplicate && (
            <button type="button" onClick={onDuplicate} className={cx(BUTTON, 'bg-ink/6 text-ink hover:bg-ink/10')}>
              <Copy aria-hidden="true" className="size-[17px]" strokeWidth={2} />
              Duplicar
            </button>
          )}
          <button type="button" onClick={onDelete} className={cx(BUTTON, 'bg-danger-wash text-danger-ink hover:bg-[#fbdcdc]')}>
            <Trash2 aria-hidden="true" className="size-[17px]" strokeWidth={2} />
            Borrar
          </button>
        </div>
      )}
    </aside>
  )
}

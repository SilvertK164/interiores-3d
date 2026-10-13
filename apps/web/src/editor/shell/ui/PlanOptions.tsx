'use client'

import { Palette, Printer, RectangleHorizontal, RectangleVertical } from 'lucide-react'
import { type ReactNode, useId } from 'react'
import { cx } from '@/lib/cx'
import { TEXT, scaleEquivalence, scaleText } from '@/lib/export/texts-es'
import type { Orientation, PaperSize, PlanMode, Scale } from '@/lib/export/types'
import { Badge } from './primitives'

export type ScaleChoice = { scale: Scale; enabled: boolean; reason: string | null }
export type LevelChoice = { id: string; label: string; empty: boolean; checked: boolean }

export type PlanOptionsProps = {
  paper: PaperSize
  orientation: Orientation
  scale: Scale
  mode: PlanMode
  titleBlock: boolean
  suggestedOrientation: Orientation
  scales: readonly ScaleChoice[]
  levels: readonly LevelChoice[]
  /** Generando: nada se puede cambiar. */
  busy: boolean
  onPaper(value: PaperSize): void
  onOrientation(value: Orientation): void
  onScale(value: Scale): void
  onMode(value: PlanMode): void
  onTitleBlock(value: boolean): void
  onToggleLevel(id: string): void
}

const CHIP =
  'relative inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-full bg-white px-4 text-[15px] font-medium text-ink shadow-soft transition-colors duration-150 hover:bg-brand-wash motion-reduce:transition-none has-[:checked]:bg-ink has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand/45 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45 has-[:disabled]:hover:bg-white'

const ROW =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-[16px] bg-white px-4 text-[15px] text-ink shadow-soft has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand/45'

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1.5 ml-1.5 text-[13px] text-ink-muted">{legend}</legend>
      {children}
    </fieldset>
  )
}

function Choice({
  name,
  value,
  label,
  checked,
  disabled,
  describedBy,
  icon,
  badge,
  onChange,
}: {
  name: string
  value: string
  label: string
  checked: boolean
  disabled: boolean
  describedBy?: string
  icon?: ReactNode
  badge?: ReactNode
  onChange(): void
}) {
  return (
    <label className={CHIP}>
      <input
        aria-describedby={describedBy}
        checked={checked}
        className="sr-only"
        disabled={disabled}
        name={name}
        onChange={onChange}
        type="radio"
        value={value}
      />
      {icon}
      {label}
      {badge}
    </label>
  )
}

/** Hoja, orientación, escala, modo, plantas y cajetín: la columna izquierda del diálogo "Exportar plano". */
export function PlanOptions(props: PlanOptionsProps) {
  const id = useId()
  const { busy } = props
  const checkedCount = props.levels.filter((level) => level.checked).length
  const firstBlocked = props.scales.find((choice) => !choice.enabled && choice.reason)
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Group legend={TEXT.paper}>
        <div className="flex flex-wrap gap-2">
          {(['A4', 'A3'] as const).map((paper) => (
            <Choice checked={props.paper === paper} disabled={busy} key={paper} label={paper} name={`${id}-paper`} onChange={() => props.onPaper(paper)} value={paper} />
          ))}
        </div>
      </Group>

      <Group legend={TEXT.orientation}>
        <div className="flex flex-wrap gap-2">
          {(['landscape', 'portrait'] as const).map((orientation) => (
            <Choice
              badge={props.suggestedOrientation === orientation ? <Badge>{TEXT.suggested}</Badge> : null}
              checked={props.orientation === orientation}
              disabled={busy}
              icon={orientation === 'landscape' ? <RectangleHorizontal aria-hidden="true" className="size-[18px]" strokeWidth={2} /> : <RectangleVertical aria-hidden="true" className="size-[18px]" strokeWidth={2} />}
              key={orientation}
              label={orientation === 'landscape' ? TEXT.landscape : TEXT.portrait}
              name={`${id}-orientation`}
              onChange={() => props.onOrientation(orientation)}
              value={orientation}
            />
          ))}
        </div>
      </Group>

      <Group legend={TEXT.scale}>
        <div className="flex flex-wrap gap-2">
          {props.scales.map((choice) => {
            const reasonId = `${id}-reason-${choice.scale}`
            return (
              <span className="contents" key={choice.scale}>
                <Choice
                  checked={props.scale === choice.scale}
                  describedBy={choice.reason ? reasonId : undefined}
                  disabled={busy || !choice.enabled}
                  label={scaleText(choice.scale)}
                  name={`${id}-scale`}
                  onChange={() => props.onScale(choice.scale)}
                  value={String(choice.scale)}
                />
                {choice.reason && (
                  <span className="sr-only" id={reasonId}>
                    {choice.reason}
                  </span>
                )}
              </span>
            )
          })}
        </div>
        {firstBlocked?.reason ? (
          <p className="ml-1.5 mt-1.5 text-[13px] text-sun-ink">{firstBlocked.reason}</p>
        ) : (
          <p className="ml-1.5 mt-1.5 text-[13px] text-ink-muted">{scaleEquivalence(props.scale)}</p>
        )}
      </Group>

      <Group legend={TEXT.mode}>
        <div className="flex flex-wrap gap-2">
          <Choice checked={props.mode === 'paper'} disabled={busy} icon={<Printer aria-hidden="true" className="size-[18px]" strokeWidth={2} />} label={TEXT.modePaper} name={`${id}-mode`} onChange={() => props.onMode('paper')} value="paper" />
          <Choice checked={props.mode === 'color'} disabled={busy} icon={<Palette aria-hidden="true" className="size-[18px]" strokeWidth={2} />} label={TEXT.modeColor} name={`${id}-mode`} onChange={() => props.onMode('color')} value="color" />
        </div>
        <p className="ml-1.5 mt-1.5 text-[13px] text-ink-muted">{props.mode === 'paper' ? TEXT.modePaperHint : TEXT.modeColorHint}</p>
      </Group>

      <Group legend={TEXT.levels}>
        <div className="flex flex-col gap-1.5">
          {props.levels.map((level) => {
            const last = level.checked && checkedCount === 1
            const hint = level.empty ? TEXT.emptyLevelHint : last ? TEXT.levelsMin : null
            const hintId = `${id}-level-${level.id}`
            return (
              <label className={ROW} key={level.id}>
                <input
                  aria-describedby={hint ? hintId : undefined}
                  checked={level.checked}
                  className="size-5 shrink-0 accent-brand"
                  disabled={busy || level.empty || last}
                  onChange={() => props.onToggleLevel(level.id)}
                  type="checkbox"
                  value={level.id}
                />
                <span>{level.empty ? `${level.label} ${TEXT.emptyLevel}` : level.label}</span>
                {hint && (
                  <span className="sr-only" id={hintId}>
                    {hint}
                  </span>
                )}
              </label>
            )
          })}
        </div>
      </Group>

      <label className={cx(ROW, 'justify-between rounded-[20px] py-3')}>
        <span>
          <span className="block font-medium">{TEXT.titleBlock}</span>
          <span className="block text-[13px] text-ink-muted">{TEXT.titleBlockHint}</span>
        </span>
        <input aria-checked={props.titleBlock} checked={props.titleBlock} className="size-6 shrink-0 accent-brand" disabled={busy} onChange={(event) => props.onTitleBlock(event.target.checked)} role="switch" type="checkbox" />
      </label>
    </div>
  )
}

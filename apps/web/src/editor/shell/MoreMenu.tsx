'use client'

import { FileDown, Keyboard, type LucideIcon, Share2, Sparkles, Trash2 } from 'lucide-react'
import { type KeyboardEvent, useEffect, useRef } from 'react'
import { cx } from '@/lib/cx'
import type { SnapMode } from './bridge/types'
import { GRID_STEPS, ITEM_SNAP, SOON_ITEMS, WALL_SNAP } from './more-model'
import { ChipRow, FLOAT } from './ui/primitives'
import { SoonButton } from './ui/status'
import { useBridge, useShell } from './use-bridge'

const SOON_ICONS: Record<string, LucideIcon> = { share: Share2, render: Sparkles, 'export-plan': FileDown }
const ROW =
  'focus-ring flex h-11 w-full cursor-pointer items-center gap-3 rounded-[14px] px-2.5 text-left text-[15px] transition-colors duration-150 ease-out'
const GRID_CHIPS = GRID_STEPS.map((s) => ({ value: String(s.value), label: s.label }))

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-1">
      <h3 className="mb-2 text-xs font-semibold text-ink-muted">{title}</h3>
      {children}
    </section>
  )
}

/** Panel del botón "Más": borrar, cuadrícula y ajustes de Pascal, atajos y lo que llega en una próxima versión. */
export function MoreMenu({ onClose, onShortcuts }: { onClose: () => void; onShortcuts: () => void }) {
  const bridge = useBridge()
  const { mode, gridStep, snapWall, snapItem } = useShell((s) => ({
    mode: s.editor.mode,
    gridStep: s.editor.gridSnapStep,
    snapWall: s.editor.snappingModeByContext.wall,
    snapItem: s.editor.snappingModeByContext.item,
  }))
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus()
  }, [])
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    onClose()
  }
  const deleting = mode === 'delete'
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Más opciones"
      onKeyDown={onKeyDown}
      className={cx(FLOAT, 'absolute bottom-full right-0 z-20 mb-3 flex w-[328px] flex-col gap-3 rounded-[24px] p-3')}
    >
      <button
        type="button"
        aria-pressed={deleting}
        onClick={() => {
          bridge.arm({ kind: 'delete' })
          onClose()
        }}
        className={cx(ROW, deleting ? 'bg-brand-wash font-semibold text-ink' : 'text-ink hover:bg-ink/5')}
      >
        <Trash2 aria-hidden="true" className="size-5 shrink-0 text-ink-muted" strokeWidth={1.9} />
        Eliminar elementos
      </button>
      <Section title="Cuadrícula">
        <ChipRow title="Cuadrícula" chips={GRID_CHIPS} active={String(gridStep)} onPick={(v) => bridge.setGridStep(Number(v))} />
      </Section>
      <Section title="Ajuste de muros">
        <ChipRow title="Ajuste de muros" chips={WALL_SNAP} active={snapWall} onPick={(v) => bridge.setSnap('wall', v as SnapMode)} />
      </Section>
      <Section title="Ajuste de muebles">
        <ChipRow title="Ajuste de muebles" chips={ITEM_SNAP} active={snapItem} onPick={(v) => bridge.setSnap('item', v as SnapMode)} />
      </Section>
      <button type="button" onClick={onShortcuts} className={cx(ROW, 'text-ink hover:bg-ink/5')}>
        <Keyboard aria-hidden="true" className="size-5 shrink-0 text-ink-muted" strokeWidth={1.9} />
        Atajos de teclado
      </button>
      <Section title="Próximamente">
        <div className="flex flex-wrap gap-x-3 gap-y-4 pt-2">
          {SOON_ITEMS.map((item) => (
            <SoonButton key={item.id} icon={SOON_ICONS[item.id] ?? Sparkles} label={item.label} />
          ))}
        </div>
      </Section>
    </div>
  )
}

'use client'

import type { ProjectKind } from '@interiores/contract'
import { Check } from 'lucide-react'
import { templatesForKind } from '@/lib/templates'

type Props = { kind: ProjectKind; value: string | null; onChange: (id: string | null) => void }

const CARD = 'flex cursor-pointer rounded-xl p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary'

/** Tarjetas de plantilla (mínimas; el diseño final llega con el spec de interfaz). */
export function TemplatePicker({ kind, value, onChange }: Props) {
  const templates = templatesForKind(kind)
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">Plantilla</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((t) => (
          <label key={t.id} className={`${CARD} flex-col gap-2 ${value === t.id ? 'bg-primary/10' : 'bg-secondary'}`}>
            <input checked={value === t.id} className="sr-only" name="plantilla" onChange={() => onChange(t.id)} type="radio" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="aspect-[3/2] w-full rounded-lg object-cover" height={400} src={t.thumbnail} width={600} />
            <span className="flex items-center gap-1 font-medium">
              {value === t.id && <Check aria-hidden size={16} />}
              {t.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {t.areaM2} m² · {t.levels > 1 ? `${t.levels} niveles · ` : ''}
              {t.summary}
            </span>
          </label>
        ))}
        <label className={`${CARD} flex-col justify-center gap-1 ${value === null ? 'bg-primary/10' : 'bg-secondary'}`}>
          <input checked={value === null} className="sr-only" name="plantilla" onChange={() => onChange(null)} type="radio" />
          <span className="flex items-center gap-1 font-medium">
            {value === null && <Check aria-hidden size={16} />}
            En blanco
          </span>
          <span className="text-xs text-muted-foreground">Empieza desde cero con una escena vacía.</span>
        </label>
      </div>
    </fieldset>
  )
}

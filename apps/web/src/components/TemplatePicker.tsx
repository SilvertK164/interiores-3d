'use client'

import type { ProjectKind } from '@interiores/contract'
import { templatesForKind } from '@/lib/templates'

type Props = { kind: ProjectKind; value: string | null; onChange: (id: string | null) => void }

/** Tarjetas de plantilla (mínimas; el diseño final llega con el spec de interfaz). */
export function TemplatePicker({ kind, value, onChange }: Props) {
  const templates = templatesForKind(kind)
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">Plantilla</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((t) => (
          <label key={t.id} className={`flex cursor-pointer flex-col gap-2 rounded-xl p-3 ${value === t.id ? 'bg-primary/10' : 'bg-secondary'}`}>
            <input checked={value === t.id} className="sr-only" name="plantilla" onChange={() => onChange(t.id)} type="radio" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="w-full rounded-lg" height={160} src={t.thumbnail} width={240} />
            <span className="font-medium">{t.name}</span>
            <span className="text-xs text-muted-foreground">
              {t.areaM2} m² · {t.levels > 1 ? `${t.levels} niveles · ` : ''}
              {t.summary}
            </span>
          </label>
        ))}
        <label className={`flex cursor-pointer flex-col justify-center gap-1 rounded-xl p-3 ${value === null ? 'bg-primary/10' : 'bg-secondary'}`}>
          <input checked={value === null} className="sr-only" name="plantilla" onChange={() => onChange(null)} type="radio" />
          <span className="font-medium">En blanco</span>
          <span className="text-xs text-muted-foreground">Empieza desde cero con una escena vacía.</span>
        </label>
      </div>
    </fieldset>
  )
}

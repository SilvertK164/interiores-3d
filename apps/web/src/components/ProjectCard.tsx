'use client'

import type { ProjectKind, ProjectSummary } from '@interiores/contract'
import { Box, Ellipsis, House, Store } from 'lucide-react'
import { useState } from 'react'
import { kindLabel, whenLabel } from '@/lib/ui-text'
import { BusyLink } from './BusyLink'
import { SkeletonImage } from './Skeleton'

const KIND_ICON = { vivienda: House, comercio: Store } as const

function KindIcon({ kind, size }: { kind: ProjectKind | null; size: number }) {
  const Icon = kind ? KIND_ICON[kind] : Box
  return <Icon aria-hidden size={size} />
}

/** Tarjeta de un proyecto: imagen de su plantilla (o un recuadro con el ícono del tipo), etiqueta de tipo, nombre y estado. */
export function ProjectCard({ project, now }: { project: ProjectSummary; now: Date }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = project.templateId !== null && !imageFailed
  return (
    <BusyLink
      className="group focus-ring grid size-full min-h-0 grid-rows-[minmax(0,1fr)_auto] rounded-3xl bg-white p-[7px] shadow-soft transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-[3px] hover:shadow-lift"
      href={`/proyectos/${project.id}`}
    >
      <span className="relative isolate block min-h-0 overflow-hidden rounded-[18px]">
        {showImage ? (
          <SkeletonImage
            className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            onError={() => setImageFailed(true)}
            src={`/templates/${project.templateId}.jpg`}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center bg-brand-mist text-brand">
            <KindIcon kind={project.kind} size={40} />
          </span>
        )}
        <span className="chip glass absolute left-2.5 top-2.5 bg-white/70">
          <KindIcon kind={project.kind} size={14} />
          {kindLabel(project.kind)}
        </span>
        {/* Menú decorativo por ahora: sin acciones todavía. */}
        <span aria-hidden className="glass absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full">
          <Ellipsis size={20} />
        </span>
      </span>
      <span className="flex items-center justify-between gap-3 px-2 pb-1 pt-2.5">
        <span className="min-w-0">
          <span className="block truncate font-display text-[15px] font-medium">{project.name}</span>
          <span className="mt-px block text-[12.5px] text-ink-muted">{whenLabel('Editado', project.updatedAt, now)}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-ok">
          <span aria-hidden className="size-[7px] rounded-full bg-ok-dot" />
          Guardado
        </span>
      </span>
    </BusyLink>
  )
}

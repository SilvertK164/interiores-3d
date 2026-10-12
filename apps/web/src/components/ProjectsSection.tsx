import type { ProjectSummary } from '@interiores/contract'
import { Plus, ScanSearch, Search } from 'lucide-react'
import { PROJECT_ITEM, PROJECT_LIST } from '@/lib/ui-layout'
import { BusyLink } from './BusyLink'
import { Logo } from './Logo'
import { ProjectCard } from './ProjectCard'
import { ProjectCardsSkeleton, SkeletonRegion } from './Skeleton'

type Props = {
  /** `null` mientras carga. */
  projects: ProjectSummary[] | null
  /** Proyectos que quedan tras la búsqueda. */
  visible: ProjectSummary[]
  query: string
  error: string | null
  now: Date
  onNew: () => void
}

const PANEL = 'glass grid min-h-0 place-items-center rounded-[28px] p-4 text-center'

/** Fila "Tus proyectos": tarjetas con scroll horizontal interno, invitación si no hay ninguno, o aviso si falló la carga. */
export function ProjectsSection({ projects, visible, query, error, now, onNew }: Props) {
  if (error)
    return (
      <p className={`${PANEL} text-sm text-destructive`} role="alert">
        {error}
      </p>
    )
  if (projects === null) {
    return (
      <SkeletonRegion className={PROJECT_LIST} label="Cargando tus proyectos">
        <ProjectCardsSkeleton />
      </SkeletonRegion>
    )
  }
  if (projects.length === 0) {
    return (
      <div className={PANEL}>
        <div>
          <Logo className="mx-auto" size={56} />
          <h3 className="mt-2.5 font-display text-2xl font-bold tracking-[-0.02em]">
            Empieza tu primer proyecto
          </h3>
          <p className="mx-auto mb-4 mt-1.5 max-w-[440px] text-[15px] text-ink-muted">
            Elige una plantilla de vivienda o de comercio y personalízala con muebles, materiales y
            niveles.
          </p>
          <button className="btn btn-primary" onClick={onNew} type="button">
            <Plus aria-hidden size={20} />
            Nuevo proyecto
          </button>
        </div>
      </div>
    )
  }
  if (visible.length === 0) {
    return (
      <p className={`${PANEL} text-sm text-ink-muted`}>
        <span className="inline-flex items-center gap-2">
          <Search aria-hidden size={16} />
          Ningún proyecto coincide con «{query.trim()}».
        </span>
      </p>
    )
  }
  return (
    <ul aria-label="Tus proyectos" className={PROJECT_LIST}>
      {visible.map((p) => (
        <li className={PROJECT_ITEM} key={p.id}>
          <ProjectCard now={now} project={p} />
        </li>
      ))}
      <li className="min-h-[120px] min-w-0 desk:min-h-0">
        <button
          className="focus-ring grid size-full cursor-pointer place-items-center rounded-3xl bg-white/55 text-center text-brand transition-[transform,background-color] duration-200 ease-out hover:-translate-y-[3px] hover:bg-white/90"
          onClick={onNew}
          type="button"
        >
          <span>
            <Plus aria-hidden className="mx-auto" size={30} />
            <span className="mt-1.5 block font-display font-medium">Nuevo proyecto</span>
            <span className="block text-[13px] text-ink-muted">Elige una plantilla</span>
          </span>
        </button>
      </li>
      <li className="min-h-[120px] min-w-0 desk:min-h-0">
        <BusyLink
          className="focus-ring grid size-full cursor-pointer place-items-center rounded-3xl bg-white/55 text-center text-brand transition-[transform,background-color] duration-200 ease-out hover:-translate-y-[3px] hover:bg-white/90"
          href="/laboratorio"
        >
          <span>
            <ScanSearch aria-hidden className="mx-auto" size={30} />
            <span className="mt-1.5 block font-display font-medium">Escena desde una foto</span>
            <span className="block text-[13px] text-ink-muted">Laboratorio</span>
          </span>
        </BusyLink>
      </li>
    </ul>
  )
}

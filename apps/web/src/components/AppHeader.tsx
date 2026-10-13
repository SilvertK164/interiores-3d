import { Folder, LogOut, Plus, ScanSearch, Search } from 'lucide-react'
import { cx } from '@/lib/cx'
import { initialsFor } from '@/lib/person-name'
import { BusyLink } from './BusyLink'
import { Logo } from './Logo'

type Props = {
  email: string | null | undefined
  /** Nombre que la persona escribió al crear su cuenta (vacío en las cuentas anteriores): sus iniciales van en el avatar. */
  name?: string | null
  onSignOut: () => void
  /** Cerrando sesión (incluye la navegación a /login): el botón queda ocupado y no admite otro clic. */
  signingOut?: boolean
  /** El buscador es de /proyectos: sin `onQuery` no se muestra (en otras páginas no filtraría nada). */
  query?: string
  onQuery?: (value: string) => void
  /** «Nuevo proyecto» es de /proyectos; sin `onNew` se ofrece volver a «Mis proyectos». */
  onNew?: () => void
  /** La página en la que está la persona: su enlace queda marcado (`aria-current`). */
  current?: 'escena-desde-foto'
}

const ROUND = 'glass focus-ring grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink transition-transform duration-200 ease-out hover:-translate-y-px'
const CURRENT = 'bg-brand-wash text-brand-deep'

/** Cabecera de la interfaz propia: marca, buscador de vidrio y nuevo proyecto (en /proyectos), «Escena desde una foto», avatar y salir. */
export function AppHeader({ email, name, onSignOut, signingOut = false, query = '', onQuery, onNew, current }: Props) {
  return (
    <header className="flex flex-wrap items-center gap-3 desk:flex-nowrap desk:gap-4">
      <Logo showName />
      <span className="flex-1" />
      {onQuery && (
        <label className="glass order-last flex h-11 w-full items-center gap-2 rounded-full px-4 text-sm text-ink-muted focus-within:ring-[3px] focus-within:ring-brand/35 desk:order-none desk:w-[300px]">
          <Search aria-hidden className="shrink-0" size={20} />
          <input
            aria-label="Buscar proyectos y plantillas"
            className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-muted"
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Buscar proyectos y plantillas"
            type="search"
            value={query}
          />
        </label>
      )}
      {onNew ? (
        <button className="btn btn-primary" onClick={onNew} type="button">
          <Plus aria-hidden size={20} />
          Nuevo proyecto
        </button>
      ) : (
        <BusyLink aria-label="Mis proyectos" className={ROUND} href="/proyectos" title="Mis proyectos">
          <Folder aria-hidden size={20} />
        </BusyLink>
      )}
      <BusyLink
        aria-current={current === 'escena-desde-foto' ? 'page' : undefined}
        aria-label="Escena desde una foto"
        className={cx(ROUND, current === 'escena-desde-foto' && CURRENT)}
        href="/escena-desde-foto"
        title="Escena desde una foto"
      >
        <ScanSearch aria-hidden size={20} />
      </BusyLink>
      <span
        className="grid size-[42px] shrink-0 place-items-center rounded-full bg-brand-wash text-sm font-medium text-brand-deep"
        role="img"
        aria-label={email ? `Cuenta de ${email}` : 'Tu cuenta'}
        title={email ?? undefined}
      >
        {initialsFor(name, email)}
      </span>
      <button
        aria-busy={signingOut || undefined}
        aria-label="Salir"
        className={`${ROUND} disabled:cursor-not-allowed disabled:opacity-60`}
        disabled={signingOut}
        onClick={onSignOut}
        title="Salir"
        type="button"
      >
        <LogOut aria-hidden size={20} />
      </button>
    </header>
  )
}

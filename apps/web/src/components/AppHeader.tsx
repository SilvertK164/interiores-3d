import { FlaskConical, LogOut, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { initialsFromEmail } from '@/lib/ui-text'
import { Logo } from './Logo'

type Props = {
  email: string | null | undefined
  query: string
  onQuery: (value: string) => void
  onNew: () => void
  onSignOut: () => void
}

const ROUND = 'glass focus-ring grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink transition-transform duration-200 ease-out hover:-translate-y-px'

/** Cabecera de "Tus proyectos": marca, buscador de vidrio, nuevo proyecto, laboratorio, avatar y salir. */
export function AppHeader({ email, query, onQuery, onNew, onSignOut }: Props) {
  return (
    <header className="flex flex-wrap items-center gap-3 desk:flex-nowrap desk:gap-4">
      <Logo showName />
      <span className="flex-1" />
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
      <button className="btn btn-primary" onClick={onNew} type="button">
        <Plus aria-hidden size={20} />
        Nuevo proyecto
      </button>
      <Link aria-label="Laboratorio" className={ROUND} href="/laboratorio" title="Laboratorio">
        <FlaskConical aria-hidden size={20} />
      </Link>
      <span
        className="grid size-[42px] shrink-0 place-items-center rounded-full bg-brand-wash text-sm font-medium text-brand-deep"
        role="img"
        aria-label={email ? `Cuenta de ${email}` : 'Tu cuenta'}
        title={email ?? undefined}
      >
        {initialsFromEmail(email)}
      </span>
      <button aria-label="Salir" className={ROUND} onClick={onSignOut} title="Salir" type="button">
        <LogOut aria-hidden size={20} />
      </button>
    </header>
  )
}

'use client'

import { ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { AppShell } from '@/components/AppShell'
import { AuthBackdrop } from '@/components/AuthBackdrop'
import { BusyLink } from '@/components/BusyLink'
import { LoaderPortal } from '@/components/LoaderPortal'
import { Logo } from '@/components/Logo'
import { greetingName } from '@/lib/person-name'
import { PROJECT_KINDS } from '@/lib/project-kinds'
import { useLoginRedirect } from '@/lib/use-login-redirect'
import { useSession } from '@/lib/use-session'

/** Foto de cada tipo: las mismas plantillas que ya tiene la aplicación. */
const KIND_IMAGE = { vivienda: '/templates/loft.jpg', comercio: '/templates/cafe.jpg' } as const

/**
 * Primera vez: se llega aquí solo después de CREAR la cuenta (no al ingresar). Elegir el tipo lleva a /proyectos con el
 * diálogo "Nuevo proyecto" ya abierto y ese tipo marcado; "empezar en blanco" lo abre con "En blanco".
 */
export default function WelcomePage() {
  const { session, loading } = useSession()
  const toLogin = useLoginRedirect()

  // Sin sesión no hay nada que mostrar. No se guarda `next`: tras ingresar se va a /proyectos, no a esta pantalla de primera vez.
  useEffect(() => {
    if (!loading && !session) toLogin({ next: null })
  }, [loading, session, toLogin])

  if (loading || !session) return <LoaderPortal label="Preparando tu espacio" />

  const name = greetingName(session.user)
  return (
    <AppShell className="relative grid place-items-center px-3 py-6">
      <AuthBackdrop />
      <main className="glass relative flex w-[min(640px,94vw)] flex-col gap-4 rounded-[34px] p-[clamp(20px,4vw,36px)]">
        <Logo showName />
        <div>
          <p className="text-[13px] text-ink-muted">Paso 1 de 2</p>
          <h1 className="mt-1 font-display text-[clamp(26px,4vw,34px)] font-medium leading-[1.1] tracking-[-0.035em]">
            <span className="font-bold">{name ? `Hola, ${name}.` : 'Hola.'}</span>{' '}
            <span className="font-light text-brand">¿Qué vas a diseñar primero?</span>
          </h1>
        </div>
        <ul className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
          {PROJECT_KINDS.map(({ value, label, hint, Icon }) => (
            <li key={value}>
              <BusyLink
                aria-describedby={`bienvenida-${value}-hint`}
                aria-labelledby={`bienvenida-${value}-name`}
                className="focus-ring block overflow-hidden rounded-3xl bg-white/80 shadow-soft transition-transform duration-200 ease-out hover:-translate-y-0.5"
                href={`/proyectos?nuevo=${value}`}
              >
                {/* biome-ignore lint/performance/noImgElement: foto decorativa de una plantilla propia, ya optimizada. */}
                <img alt="" className="h-28 w-full object-cover" src={KIND_IMAGE[value]} />
                <span className="block p-3.5">
                  <span className="flex items-center gap-1.5 font-display text-[17px] font-semibold tracking-[-0.02em]" id={`bienvenida-${value}-name`}>
                    <Icon aria-hidden className="text-brand" size={17} />
                    {label}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-muted" id={`bienvenida-${value}-hint`}>
                    {hint}
                  </span>
                </span>
              </BusyLink>
            </li>
          ))}
        </ul>
        <BusyLink className="focus-ring flex items-center justify-center gap-1.5 rounded-full py-1 text-sm font-medium text-brand" href="/proyectos?nuevo=blanco">
          Prefiero empezar en blanco
          <ArrowRight aria-hidden size={15} />
        </BusyLink>
      </main>
    </AppShell>
  )
}

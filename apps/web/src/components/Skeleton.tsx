'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'
import {
  CHIPS_ROW,
  GALLERY_HERO_ITEM,
  GALLERY_LIST,
  GALLERY_TILE_ITEM,
  GREETING_ROW,
  HEADER_ROW,
  PROJECTS_FRAME,
  PROJECT_ITEM,
  PROJECT_LIST,
  SECTION,
  SECTION_TITLE,
} from '@/lib/ui-layout'
import { Logo } from './Logo'
import './Skeleton.css'

/** Bloque base: plano, decorativo y sin texto. La forma y el tamaño los pone quien lo usa (clases de Tailwind). */
export function Skeleton({
  className = '',
  tone = 'base',
}: {
  className?: string
  tone?: 'base' | 'light'
}) {
  return (
    <span
      aria-hidden="true"
      className={`madori-skeleton ${tone === 'light' ? 'madori-skeleton--light' : ''} ${className}`
        .replace(/\s+/g, ' ')
        .trim()}
    />
  )
}

/** Contenedor de una zona que carga: `aria-busy` y un texto solo para lectores de pantalla; los bloques no se leen. */
export function SkeletonRegion({
  label,
  className = '',
  children,
}: {
  label: string
  className?: string
  children?: ReactNode
}) {
  return (
    <div aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

/**
 * Imagen que muestra su esqueleto hasta que carga. Va dentro de un contenedor `relative` con `overflow-hidden`.
 * Si falla, avisa con `onError` (quien la usa decide qué mostrar) y el esqueleto queda como relleno.
 */
export function SkeletonImage({
  src,
  className = '',
  onError,
}: {
  src: string
  className?: string
  onError?: () => void
}) {
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLImageElement>(null)
  // Una imagen en caché puede estar lista antes de que React enganche `onLoad`.
  // biome-ignore lint/correctness/useExhaustiveDependencies: se vuelve a comprobar solo cuando cambia la imagen
  useEffect(() => {
    setLoaded(Boolean(ref.current?.complete && ref.current.naturalWidth > 0))
  }, [src])
  return (
    <>
      {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
      <img
        alt=""
        className={`${className} ${loaded ? 'madori-img-in' : 'opacity-0'}`}
        onError={onError}
        onLoad={() => setLoaded(true)}
        ref={ref}
        src={src}
      />
    </>
  )
}

/** Mismo tamaño que `ProjectCard`: marco, imagen y pie con nombre, fecha y estado. */
export function ProjectCardSkeleton() {
  return (
    <div className="grid size-full min-h-0 grid-rows-[minmax(0,1fr)_auto] rounded-3xl bg-white p-[7px] shadow-soft">
      <Skeleton className="min-h-0 rounded-[18px]" />
      <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex h-[22px] items-center">
            <Skeleton className="h-3.5 w-3/5 rounded-md" />
          </div>
          <div className="mt-px flex h-[19px] items-center">
            <Skeleton className="h-3 w-2/5 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-3 w-16 rounded-md" />
      </div>
    </div>
  )
}

/** Las tarjetas de "Tus proyectos" mientras cargan (cada una en su celda de la fila). */
export function ProjectCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => `tarjeta-${i}`).map((key) => (
        <div className={PROJECT_ITEM} key={key}>
          <ProjectCardSkeleton />
        </div>
      ))}
    </>
  )
}

const TILE_INFO = {
  hero: 'inset-x-2.5 bottom-2.5 h-[52px] rounded-[18px]',
  small: 'inset-x-2 bottom-2 h-9 rounded-[14px]',
} as const

/** Mismo tamaño que una pieza del mosaico de plantillas: imagen y franja de nombre. */
export function TemplateTileSkeleton({ size = 'small' }: { size?: 'hero' | 'small' }) {
  return (
    <div className="relative isolate size-full overflow-hidden rounded-[20px] bg-white shadow-soft">
      <Skeleton className="absolute inset-0 rounded-none" />
      <Skeleton className={`absolute ${TILE_INFO[size]}`} tone="light" />
    </div>
  )
}

/** El mosaico completo (una destacada, tres chicas y "Ver galería"). */
export function TemplateGallerySkeleton() {
  return (
    <div className={GALLERY_LIST}>
      <div className={GALLERY_HERO_ITEM}>
        <TemplateTileSkeleton size="hero" />
      </div>
      {['a', 'b', 'c'].map((key) => (
        <div className={GALLERY_TILE_ITEM} key={key}>
          <TemplateTileSkeleton />
        </div>
      ))}
      <div className={GALLERY_TILE_ITEM}>
        <Skeleton className="size-full rounded-[20px]" tone="light" />
      </div>
    </div>
  )
}

/** Las dos fichas de la cabecera ("N proyectos" y "Último cambio…"), que dependen de los datos. */
export function HeaderChipsSkeleton() {
  return (
    <div aria-hidden="true" className={CHIPS_ROW}>
      <Skeleton className="h-[1.625rem] w-[92px] rounded-full" />
      <Skeleton className="h-[1.625rem] w-[168px] rounded-full" />
    </div>
  )
}

/** Esqueleto de la página completa de /proyectos (`loading.tsx` y la espera de la sesión). Va dentro de `AppShell`. */
export function ProjectsPageSkeleton() {
  return (
    <SkeletonRegion className={PROJECTS_FRAME} label="Cargando tus proyectos">
      <div className={HEADER_ROW}>
        <Logo showName />
        <span className="flex-1" />
        <Skeleton className="order-last h-11 w-full rounded-full desk:order-none desk:w-[300px]" />
        <Skeleton className="h-11 w-[168px] rounded-full" />
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="size-[42px] rounded-full" />
        <Skeleton className="size-11 rounded-full" />
      </div>

      <div className={GREETING_ROW}>
        <div>
          <div className="flex h-5 items-center">
            <Skeleton className="h-3.5 w-24 rounded-md" />
          </div>
          <div className="mt-0.5 flex h-[calc(clamp(28px,3.6vw,46px)*1.05)] items-center">
            <Skeleton className="h-3/4 w-[min(520px,70vw)] rounded-xl" />
          </div>
        </div>
        <HeaderChipsSkeleton />
      </div>

      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>Tus proyectos</h2>
        <div className={PROJECT_LIST}>
          <ProjectCardsSkeleton />
        </div>
      </section>

      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>Empieza desde una plantilla</h2>
        <TemplateGallerySkeleton />
      </section>
    </SkeletonRegion>
  )
}

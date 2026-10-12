import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Loader } from '../src/components/Loader'
import {
  HeaderChipsSkeleton,
  ProjectCardSkeleton,
  ProjectsPageSkeleton,
  Skeleton,
  SkeletonImage,
  SkeletonRegion,
  TemplateTileSkeleton,
} from '../src/components/Skeleton'

const css = readFileSync(new URL('../src/components/Skeleton.css', import.meta.url), 'utf8')
const html = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node)
const count = (text: string, re: RegExp) => text.match(re)?.length ?? 0
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '')

describe('Skeleton (bloque base)', () => {
  it('es decorativo: aria-hidden y sin texto', () => {
    const out = html(createElement(Skeleton, { className: 'h-4 w-20' }))
    expect(out).toContain('aria-hidden="true"')
    expect(out).toContain('madori-skeleton')
    expect(out).toContain('h-4 w-20')
    expect(textOf(out)).toBe('')
  })
})

describe('SkeletonRegion (contenedor accesible)', () => {
  it('lleva aria-busy y un texto oculto en castellano', () => {
    const out = html(
      createElement(SkeletonRegion, { label: 'Cargando tus proyectos' }, createElement(Skeleton)),
    )
    expect(out).toContain('aria-busy="true"')
    expect(out).toMatch(/<span class="sr-only">Cargando tus proyectos<\/span>/)
  })
})

describe('composiciones del mismo tamaño que lo real', () => {
  it('ProjectCardSkeleton: solo bloques ocultos, ninguno con texto', () => {
    const out = html(createElement(ProjectCardSkeleton))
    expect(count(out, /madori-skeleton/g)).toBeGreaterThanOrEqual(4)
    expect(count(out, /madori-skeleton/g)).toBe(count(out, /aria-hidden="true"/g))
    expect(textOf(out)).toBe('')
    // Mismas medidas que ProjectCard: radio, relleno y reparto imagen / pie.
    expect(out).toContain('rounded-3xl')
    expect(out).toContain('p-[7px]')
    expect(out).toContain('grid-rows-[minmax(0,1fr)_auto]')
  })

  it('TemplateTileSkeleton: versión destacada y chica', () => {
    const hero = html(createElement(TemplateTileSkeleton, { size: 'hero' }))
    const small = html(createElement(TemplateTileSkeleton, { size: 'small' }))
    for (const out of [hero, small]) {
      expect(out).toContain('rounded-[20px]')
      expect(textOf(out)).toBe('')
    }
    expect(hero).not.toBe(small)
  })

  it('HeaderChipsSkeleton: dos fichas decorativas con la altura de las reales', () => {
    const out = html(createElement(HeaderChipsSkeleton))
    expect(out).toContain('aria-hidden="true"')
    expect(count(out, /madori-skeleton/g)).toBe(2)
    expect(out).toContain('h-[1.625rem]')
  })
})

describe('ProjectsPageSkeleton (loading.tsx de /proyectos)', () => {
  const out = html(createElement(ProjectsPageSkeleton))
  it('es una sola región ocupada con su texto oculto', () => {
    expect(out).toContain('aria-busy="true"')
    expect(out).toContain('Cargando tus proyectos')
    expect(count(out, /aria-busy="true"/g)).toBe(1)
  })
  it('conserva los títulos reales y reserva el lugar de las tarjetas y las plantillas', () => {
    expect(out).toContain('Tus proyectos')
    expect(out).toContain('Empieza desde una plantilla')
    expect(out).toContain('Madori')
    expect(count(out, /rounded-3xl/g)).toBeGreaterThanOrEqual(3)
  })
  it('usa el mismo marco que la página real', () => {
    expect(out).toContain('desk:grid-rows-[auto_auto_minmax(0,1fr)_minmax(0,1fr)]')
  })
})

describe('SkeletonImage', () => {
  it('muestra el esqueleto y deja la imagen invisible hasta que cargue', () => {
    const out = html(
      createElement(SkeletonImage, { src: '/templates/loft.jpg', className: 'absolute inset-0' }),
    )
    expect(out).toContain('madori-skeleton')
    expect(out).toContain('src="/templates/loft.jpg"')
    expect(out).toContain('opacity-0')
    expect(out).toContain('alt=""')
  })
})

describe('Loader en línea (estado "Creando proyecto")', () => {
  it('admite una versión en fila y pequeña', () => {
    const out = html(createElement(Loader, { size: 'sm', inline: true, label: 'Creando proyecto' }))
    expect(out).toContain('madori-loader--inline')
    expect(out).toContain('Creando proyecto')
  })
})

describe('Skeleton.css', () => {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '')
  it('es plano: sin degradados ni barrido de brillo', () => {
    expect(css).not.toMatch(/gradient/i)
    expect(css).not.toMatch(/shimmer|translateX|background-position/i)
  })
  it('pulsa con la opacidad y se detiene con prefers-reduced-motion', () => {
    expect(css).toMatch(/@keyframes madori-pulse[\s\S]*opacity/)
    expect(css).toContain('prefers-reduced-motion')
    expect(css.slice(css.indexOf('prefers-reduced-motion'))).toContain('animation: none')
  })
  it('sus clases llevan el prefijo madori-', () => {
    expect((plain.match(/\.[a-z][\w-]*/g) ?? []).every((c) => c.startsWith('.madori-'))).toBe(true)
  })
})

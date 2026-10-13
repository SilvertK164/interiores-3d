import type { ProjectSummary } from '@interiores/contract'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/lib/api/client'
import { createProjectDeleter, deleteQuestion, menuLabel, menuStep, PROJECT_DELETED_NOTICE, withoutProject } from '../src/lib/delete-project'

const project = (id: string): ProjectSummary => ({ id, name: `P ${id}`, kind: null, templateId: null, updatedAt: '2026-10-13T10:00:00.000Z' })

describe('textos del borrado', () => {
  it('la pregunta lleva el nombre entre comillas angulares y avisa que no se deshace', () => {
    expect(deleteQuestion('Casa de Ana')).toBe('¿Eliminar «Casa de Ana»? Se borra con todo lo que tiene dentro y no se puede deshacer.')
  })
  it('el botón «…» nombra el proyecto y el aviso es breve', () => {
    expect(menuLabel('Casa de Ana')).toBe('Más opciones del proyecto Casa de Ana')
    expect(PROJECT_DELETED_NOTICE).toBe('Proyecto eliminado')
  })
})

describe('withoutProject', () => {
  it('quita solo el proyecto pedido y respeta la lista que aún carga', () => {
    const list = [project('a'), project('b'), project('c')]
    expect(withoutProject(list, 'b')?.map((p) => p.id)).toEqual(['a', 'c'])
    expect(withoutProject(list, 'zzz')).toHaveLength(3)
    expect(withoutProject(null, 'a')).toBeNull()
  })
})

describe('menuStep (flechas del menú)', () => {
  it('baja y sube dando la vuelta', () => {
    expect(menuStep('ArrowDown', 0, 3)).toBe(1)
    expect(menuStep('ArrowDown', 2, 3)).toBe(0)
    expect(menuStep('ArrowUp', 0, 3)).toBe(2)
    expect(menuStep('ArrowUp', 2, 3)).toBe(1)
  })
  it('Inicio y Fin saltan a los extremos; con un solo ítem se queda ahí', () => {
    expect(menuStep('Home', 2, 3)).toBe(0)
    expect(menuStep('End', 0, 3)).toBe(2)
    expect(menuStep('ArrowDown', 0, 1)).toBe(0)
  })
  it('las demás teclas, o un menú vacío, no mueven nada', () => {
    expect(menuStep('a', 0, 3)).toBeNull()
    expect(menuStep('ArrowDown', 0, 0)).toBeNull()
  })
  it('sin un ítem enfocado (-1) la flecha abajo va al primero y la de arriba al último', () => {
    expect(menuStep('ArrowDown', -1, 3)).toBe(0)
    expect(menuStep('ArrowUp', -1, 3)).toBe(2)
  })
})

describe('createProjectDeleter', () => {
  it('un doble clic llama una sola vez a la API y el segundo intento no hace nada', async () => {
    let release = () => {}
    const remove = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )
    const run = createProjectDeleter(remove)
    const first = run('a')
    const second = await run('a')
    expect(second).toBeNull()
    release()
    await expect(first).resolves.toEqual({ ok: true })
    expect(remove).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledWith('a')
  })

  it('termina el intento y deja reintentar tras un error, con el texto en castellano de friendlyMessage', async () => {
    const remove = vi.fn().mockRejectedValueOnce(new ApiError(0, 'sin_conexion', 'x')).mockResolvedValueOnce(undefined)
    const run = createProjectDeleter(remove)
    const failed = await run('a')
    expect(failed).toMatchObject({ ok: false })
    expect(failed && !failed.ok && failed.message).toMatch(/conexión/i)
    await expect(run('a')).resolves.toEqual({ ok: true })
    expect(remove).toHaveBeenCalledTimes(2)
  })

  it('un error desconocido no filtra detalles técnicos', async () => {
    const run = createProjectDeleter(async () => {
      throw new Error('TypeError: x is undefined')
    })
    await expect(run('a')).resolves.toEqual({ ok: false, message: 'Algo salió mal. Inténtalo de nuevo.' })
  })
})

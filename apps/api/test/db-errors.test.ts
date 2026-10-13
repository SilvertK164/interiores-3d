import { ERROR_CODES } from '@interiores/contract'
import { describe, expect, it } from 'vitest'
import { AppError } from '../src/errors.js'
import { mapDbError } from '../src/db-errors.js'

const check = (constraint: string, table: string) => ({
  code: '23514',
  message: `new row for relation "${table}" violates check constraint "${constraint}"`,
  details: '',
  hint: '',
})

describe('mapDbError', () => {
  it('el tope de proyectos (53400) es un 422 con código propio y mensaje en castellano', () => {
    const err = mapDbError({ code: '53400', message: 'Llegaste al límite de 50 proyectos. Borra alguno para crear otro.', details: '', hint: '' })
    expect(err).toBeInstanceOf(AppError)
    expect(err).toMatchObject({ status: 422, code: ERROR_CODES.projectLimit })
    expect(err.message).toMatch(/límite de 50 proyectos/)
  })

  it('el tamaño de la escena (check de la base) es un 413 escena_demasiado_grande', () => {
    expect(mapDbError(check('project_scenes_scene_size', 'project_scenes'))).toMatchObject({ status: 413, code: ERROR_CODES.tooLarge })
  })

  it('la forma de la escena y el nombre del proyecto (checks) son 422 datos_invalidos', () => {
    expect(mapDbError(check('project_scenes_scene_shape', 'project_scenes'))).toMatchObject({ status: 422, code: ERROR_CODES.invalid })
    expect(mapDbError(check('projects_name_clean', 'projects'))).toMatchObject({ status: 422, code: ERROR_CODES.invalid })
  })

  it('cualquier otro check de la base es 422 y no 500', () => {
    expect(mapDbError(check('projects_kind_check', 'projects'))).toMatchObject({ status: 422, code: ERROR_CODES.invalid })
  })

  it('un error desconocido se devuelve tal cual (acabará en 500 sin filtrar detalles)', () => {
    const other = { code: '08006', message: 'connection failure', details: '', hint: '' }
    expect(mapDbError(other)).toBe(other)
    const plain = new Error('boom')
    expect(mapDbError(plain)).toBe(plain)
  })
})

import { createServer } from 'node:net'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CORS_ORIGINS,
  findPython,
  isPortFree,
  labPaths,
  parseEnvFile,
  parsePythonVersion,
  resolveTp3Env,
  startupNotes,
} from '../scripts/lib/lab-tp3.mjs'

const SECRET = 'clave-de-prueba-que-nunca-debe-aparecer'
const slashes = (path: string) => path.replaceAll('\\', '/')

describe('parseEnvFile', () => {
  it('lee CLAVE=valor, ignora comentarios y líneas vacías', () => {
    expect(parseEnvFile('# comentario\n\nGEMINI_API_KEY=abc\nVISION_MODEL=gemini-x\n')).toEqual({ GEMINI_API_KEY: 'abc', VISION_MODEL: 'gemini-x' })
  })

  it('acepta comillas, espacios alrededor del igual y el prefijo export', () => {
    expect(parseEnvFile('export A="uno"\nB = \'dos\'\nC= tres  ')).toEqual({ A: 'uno', B: 'dos', C: 'tres' })
  })

  it('un valor puede llevar signos igual', () => {
    expect(parseEnvFile('URL=http://x/?a=1&b=2')).toEqual({ URL: 'http://x/?a=1&b=2' })
  })

  it('tolera los saltos de línea de Windows y la marca BOM que agrega el Bloc de notas', () => {
    expect(parseEnvFile('\uFEFFGEMINI_API_KEY=abc\r\nVISION_MODEL=m\r\n')).toEqual({ GEMINI_API_KEY: 'abc', VISION_MODEL: 'm' })
  })

  it('un archivo vacío no da variables', () => {
    expect(parseEnvFile('')).toEqual({})
  })
})

describe('resolveTp3Env', () => {
  it('toma la clave y el modelo del archivo cuando el entorno no los tiene', () => {
    expect(resolveTp3Env({}, { GEMINI_API_KEY: 'k', VISION_MODEL: 'm' })).toEqual({ GEMINI_API_KEY: 'k', VISION_MODEL: 'm', CORS_ORIGINS: DEFAULT_CORS_ORIGINS })
  })

  it('el entorno manda sobre el archivo', () => {
    expect(resolveTp3Env({ GEMINI_API_KEY: 'del-entorno' }, { GEMINI_API_KEY: 'del-archivo' }).GEMINI_API_KEY).toBe('del-entorno')
  })

  it('un valor vacío cuenta como ausente', () => {
    const env = resolveTp3Env({ GEMINI_API_KEY: '' }, { GEMINI_API_KEY: '   ', VISION_MODEL: '' })
    expect(env).toEqual({ CORS_ORIGINS: DEFAULT_CORS_ORIGINS })
  })

  it('por defecto TP3 acepta pedidos de nuestra web local; otro origen se elige solo desde lab/.env.local', () => {
    expect(DEFAULT_CORS_ORIGINS).toBe('http://localhost:3000')
    expect(resolveTp3Env({}, { CORS_ORIGINS: 'http://localhost:3005' }).CORS_ORIGINS).toBe('http://localhost:3005')
    expect(resolveTp3Env({ CORS_ORIGINS: 'http://de-otra-app' }, {}).CORS_ORIGINS).toBe(DEFAULT_CORS_ORIGINS)
  })

  it('no arrastra otras variables del entorno', () => {
    expect(Object.keys(resolveTp3Env({ PATH: '/bin', GEMINI_API_KEY: 'k' }, { OTRA: 'x' })).sort()).toEqual(['CORS_ORIGINS', 'GEMINI_API_KEY'])
  })
})

describe('startupNotes', () => {
  it('con clave: lo dice sin mostrarla jamás', () => {
    const notes = startupNotes({ GEMINI_API_KEY: SECRET, CORS_ORIGINS: DEFAULT_CORS_ORIGINS }).join('\n')
    expect(notes).toMatch(/Clave de Gemini: encontrada/)
    expect(notes).not.toContain(SECRET)
  })

  it('sin clave: arranca igual pero avisa que el análisis dará 503 y que el ejemplo sigue funcionando', () => {
    const notes = startupNotes({ CORS_ORIGINS: DEFAULT_CORS_ORIGINS }).join('\n')
    expect(notes).toMatch(/GEMINI_API_KEY/)
    expect(notes).toMatch(/503/)
    expect(notes).toMatch(/Probar con un ejemplo/)
    expect(notes).toMatch(/lab\/README\.md/)
  })

  it('muestra el modelo elegido o aclara que usa el de TP3', () => {
    expect(startupNotes({ VISION_MODEL: 'gemini-x', CORS_ORIGINS: 'http://localhost:3000' }).join('\n')).toContain('gemini-x')
    expect(startupNotes({ CORS_ORIGINS: 'http://localhost:3000' }).join('\n')).toMatch(/modelo.*TP3/i)
  })

  it('cuenta dónde mirar: la pantalla original de TP3 para comparar y nuestro laboratorio', () => {
    const notes = startupNotes({ CORS_ORIGINS: 'http://localhost:3000' }).join('\n')
    expect(notes).toContain('http://localhost:8000')
    expect(notes).toContain('http://localhost:3000/laboratorio')
  })
})

describe('labPaths', () => {
  it('ubica el clon, el backend y el entorno de Python dentro de lab/vendor', () => {
    const paths = labPaths('/repo', 'linux')
    expect(slashes(paths.repo)).toBe('/repo/lab/vendor/Villalba-Tevez-iisaia')
    expect(slashes(paths.backend)).toBe('/repo/lab/vendor/Villalba-Tevez-iisaia/TP3/backend')
    expect(slashes(paths.envFile)).toBe('/repo/lab/.env.local')
  })

  it('el Python del entorno virtual cambia entre Windows y el resto', () => {
    expect(slashes(labPaths('/repo', 'win32').venvPython)).toBe('/repo/lab/vendor/.venv/Scripts/python.exe')
    expect(slashes(labPaths('/repo', 'linux').venvPython)).toBe('/repo/lab/vendor/.venv/bin/python')
  })
})

describe('parsePythonVersion', () => {
  it.each([
    ['Python 3.11.9', { major: 3, minor: 11 }],
    ['Python 3.14.0\r\n', { major: 3, minor: 14 }],
    ['Python 2.7.18', { major: 2, minor: 7 }],
  ])('"%s"', (text, expected) => {
    expect(parsePythonVersion(text)).toEqual(expected)
  })

  it('el aviso de la tienda de Windows no es una versión', () => {
    expect(parsePythonVersion('Python was not found; run without arguments to install from the Microsoft Store')).toBeNull()
    expect(parsePythonVersion('')).toBeNull()
  })
})

describe('findPython', () => {
  const answer = (table: Record<string, { status: number; stdout?: string }>) => (command: string, args: string[]) => {
    const hit = table[[command, ...args].join(' ')]
    return hit ? { status: hit.status, stdout: hit.stdout ?? '', stderr: '' } : { error: new Error('ENOENT'), status: null, stdout: '', stderr: '' }
  }

  it('usa `python` si sirve', () => {
    const found = findPython('win32', answer({ 'python --version': { status: 0, stdout: 'Python 3.11.9' } }))
    expect(found).toEqual({ command: 'python', args: [], version: '3.11.9' })
  })

  it('si `python` es el atajo de la tienda de Windows, prueba con `py`', () => {
    const found = findPython(
      'win32',
      answer({
        'python --version': { status: 9009, stdout: 'Python was not found; run without arguments to install from the Microsoft Store' },
        'py -3 --version': { status: 0, stdout: 'Python 3.14.0' },
      }),
    )
    expect(found).toEqual({ command: 'py', args: ['-3'], version: '3.14.0' })
  })

  it('descarta un Python demasiado viejo', () => {
    const found = findPython('win32', answer({ 'python --version': { status: 0, stdout: 'Python 3.9.1' }, 'py -3 --version': { status: 0, stdout: 'Python 3.12.1' } }))
    expect(found?.version).toBe('3.12.1')
  })

  it('en Linux y macOS también prueba `python3`', () => {
    expect(findPython('linux', answer({ 'python3 --version': { status: 0, stdout: 'Python 3.12.3' } }))?.command).toBe('python3')
  })

  it('devuelve null si no hay ninguno', () => {
    expect(findPython('win32', answer({}))).toBeNull()
  })
})

describe('isPortFree', () => {
  it('distingue un puerto ocupado de uno libre', async () => {
    const server = createServer()
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as { port: number }
    expect(await isPortFree(port)).toBe(false)
    await new Promise((resolve) => server.close(resolve))
    expect(await isPortFree(port)).toBe(true)
  })
})

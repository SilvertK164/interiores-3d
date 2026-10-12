/** A dónde se va después de ingresar cuando no hay (o no sirve) el destino pedido. */
export const DEFAULT_NEXT = '/proyectos'

const MAX_LENGTH = 2048
// Origen ficticio para comprobar con el analizador de URL que la ruta sigue siendo de esta misma aplicación.
const FAKE_ORIGIN = 'http://madori.invalid'

const isLoginPath = (pathname: string) => pathname === '/login' || pathname.startsWith('/login/')

/** Tabulaciones, saltos de línea y demás caracteres de control: el navegador los quita de las URL y "/\t/evil.com" se vuelve "//evil.com". */
const hasControl = (text: string) => [...text].some((char) => char.charCodeAt(0) <= 0x1f || char.charCodeAt(0) === 0x7f)

/**
 * La ruta interna a la que volver después de ingresar (parámetro `next`), o `null` si no es una ruta de esta
 * aplicación. Solo pasa lo que empieza con UNA barra: nada de `//host`, de `\`, de esquemas (`https:`, `javascript:`),
 * de caracteres de control ni de codificaciones que al decodificarse lo sean (`/%2F…`, `/%5C…`). Así `next` nunca
 * lleva a otro sitio (open redirect). Tampoco vuelve a `/login`.
 */
export function parseNext(next: unknown): string | null {
  if (typeof next !== 'string' || next.length === 0 || next.length > MAX_LENGTH) return null
  if (!next.startsWith('/') || next.startsWith('//')) return null
  if (next.includes('\\') || next.includes('://') || hasControl(next)) return null

  let decoded: string
  try {
    decoded = decodeURIComponent(next)
  } catch {
    return null
  }
  if (decoded.startsWith('//') || decoded.includes('\\') || hasControl(decoded)) return null

  try {
    const url = new URL(next, FAKE_ORIGIN)
    if (url.origin !== FAKE_ORIGIN || isLoginPath(url.pathname)) return null
  } catch {
    return null
  }
  return next
}

/** `parseNext` con /proyectos como respaldo: lo único que debe llegar a `nav.go` desde un parámetro de la URL. */
export const safeNext = (next: unknown): string => parseNext(next) ?? DEFAULT_NEXT

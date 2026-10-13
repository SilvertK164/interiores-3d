// Cabeceras de seguridad de la web (las aplica next.config.mjs). Ver docs/seguridad-revision.md.
// Qué necesita Pascal de verdad (leído en sus paquetes): Draco desde gstatic.com y basis/manifold desde cdn.jsdelivr.net
// (fetch y un import() de respaldo), WebAssembly (manifold, Draco), workers y blob: (carga de GLB/texturas), y el bucket de
// Supabase de Pascal para muebles que no están en public/items. Fuentes de next/font se sirven desde el propio dominio.

const PASCAL_BUCKET = 'https://byrpxoiotywskoojsrzd.supabase.co'
const CDNS = ['https://cdn.jsdelivr.net', 'https://www.gstatic.com']

/** `https://host` de una URL, o null si no es una URL (así una variable mal escrita no rompe el build). */
export function originOf(value) {
  try {
    return new URL(String(value)).origin
  } catch {
    return null
  }
}

/** Siempre en vigor: no depende de que Pascal cargue bien. */
const ENFORCED_CSP = "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'"

function fullCsp(env) {
  const own = [env.NEXT_PUBLIC_API_URL, env.NEXT_PUBLIC_SUPABASE_URL].map(originOf).filter(Boolean)
  const connect = [...new Set(["'self'", 'blob:', 'data:', ...own, PASCAL_BUCKET, ...CDNS])]
  return [
    "default-src 'self'",
    // Next inyecta scripts en línea para hidratar; una CSP con nonce exigiría renderizado dinámico de todas las páginas.
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${CDNS[0]}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${PASCAL_BUCKET}`,
    "font-src 'self' data:",
    "media-src 'self' blob: data:",
    `connect-src ${connect.join(' ')}`,
    "worker-src 'self' blob:",
    "frame-src 'none'",
    ENFORCED_CSP,
  ].join('; ')
}

/**
 * `production` falso (next dev): sin HSTS ni CSP completa, porque Next en desarrollo usa eval y websockets propios.
 * La CSP completa va en modo informe (`Report-Only`): se mira la consola en una vista previa y, si no hay bloqueos
 * del editor, se cambia el nombre de la cabecera a `Content-Security-Policy`.
 */
export function buildSecurityHeaders(env, production) {
  const headers = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  ]
  if (!production) return headers
  return [
    ...headers,
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
    { key: 'Content-Security-Policy', value: ENFORCED_CSP },
    { key: 'Content-Security-Policy-Report-Only', value: fullCsp(env) },
  ]
}

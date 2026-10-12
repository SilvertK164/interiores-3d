import { buildSecurityHeaders } from './security-headers.mjs'

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pascal publica su editor como TypeScript sin compilar: Next debe transpilarlo.
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ['three', '@pascal-app/viewer', '@pascal-app/core', '@pascal-app/editor', '@pascal-app/nodes'],
  // Las texturas del repo MIT de Pascal están en public/material; las que no trae (madera, ladrillo, azulejo, mármol)
  // se piden al CDN predeterminado de sus paquetes. Un archivo local siempre tiene prioridad.
  async rewrites() {
    return { fallback: [{ source: '/material/:path*', destination: 'https://editor.pascal.app/material/:path*' }] }
  },
  // Cabeceras de seguridad (docs/seguridad-revision.md). Fuera de producción solo las inofensivas.
  async headers() {
    return [{ source: '/:path*', headers: buildSecurityHeaders(process.env, process.env.NODE_ENV === 'production') }]
  },
  // Solo en las pruebas en navegador: la insignia "N" de desarrollo de Next (abajo a la izquierda) tapa los controles del shell y
  // bloquea los clics de Playwright. No toca el overlay de errores: un error de ejecución sigue apareciendo y rompe la prueba.
  devIndicators: process.env.NEXT_PUBLIC_E2E === '1' ? false : undefined,
  env: {
    // Pascal arma las URLs de sus assets con esta base; si queda vacía usa editor.pascal.app.
    NEXT_PUBLIC_ASSETS_CDN_URL:
      process.env.NEXT_PUBLIC_ASSETS_CDN_URL ?? (vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000'),
  },
}

export default nextConfig

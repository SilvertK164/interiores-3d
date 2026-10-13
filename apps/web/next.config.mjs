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
  env: {
    // Pascal arma las URLs de sus assets con esta base; si queda vacía usa editor.pascal.app.
    NEXT_PUBLIC_ASSETS_CDN_URL:
      process.env.NEXT_PUBLIC_ASSETS_CDN_URL ?? (vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000'),
  },
}

export default nextConfig

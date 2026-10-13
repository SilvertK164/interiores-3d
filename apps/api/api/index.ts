// Punto de entrada de la API en Vercel: una sola función atiende todas las rutas (vercel.json las reescribe a /api).
// En local la API sigue arrancando desde src/index.ts (pnpm --filter @interiores/api dev).
import { createVercelHandler } from '../src/vercel-handler.js'

export default createVercelHandler()

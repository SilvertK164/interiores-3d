// Crea las cuentas de prueba fijas en la base local: node scripts/seed-users.mjs  (pnpm db:seed)
// Lee SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.test (lo escribe pnpm db:env). No imprime claves.
import { seedUsers, DEV_USERS } from './lib/seed-users.mjs'

try {
  process.loadEnvFile('.env.test')
} catch {
  // sin .env.test: se usan las variables del proceso
}

try {
  const results = await seedUsers({ url: process.env.SUPABASE_URL, serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY })
  for (const r of results) console.log(`${r.status}: ${r.email}`)
  console.log(`Listo. Entra en http://localhost:3000/login con cualquiera de las ${DEV_USERS.length} cuentas (la contraseña está en scripts/lib/seed-users.mjs).`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

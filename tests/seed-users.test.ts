import { describe, expect, it, vi } from 'vitest'
import { DEV_USERS, assertLocalSupabase, seedUsers } from '../scripts/lib/seed-users.mjs'

describe('assertLocalSupabase', () => {
  it('acepta solo la base local', () => {
    expect(() => assertLocalSupabase('http://127.0.0.1:54321')).not.toThrow()
    expect(() => assertLocalSupabase('http://localhost:54321')).not.toThrow()
  })

  it('rechaza cualquier otra dirección: las cuentas de prueba nunca van a la nube', () => {
    expect(() => assertLocalSupabase('https://abcd.supabase.co')).toThrow('solo con la base local')
    expect(() => assertLocalSupabase('http://localhost.evil.com')).toThrow('solo con la base local')
    expect(() => assertLocalSupabase(undefined)).toThrow('SUPABASE_URL')
  })
})

describe('DEV_USERS', () => {
  it('son cuentas de prueba con correo de dominio reservado .test y contraseña fija', () => {
    expect(DEV_USERS.length).toBeGreaterThanOrEqual(2)
    for (const u of DEV_USERS) {
      expect(u.email).toMatch(/^[a-z]+@interiores\.test$/)
      expect(u.password.length).toBeGreaterThanOrEqual(8)
    }
    expect(DEV_USERS.map((u) => u.email)).toEqual(expect.arrayContaining(['silvert@interiores.test', 'victoria@interiores.test']))
  })
})

describe('seedUsers', () => {
  const ok = () => new Response('{}', { status: 200 })
  const exists = () => new Response(JSON.stringify({ error_code: 'email_exists', msg: 'A user with this email address has already been registered' }), { status: 422 })

  it('crea cada cuenta con el correo ya confirmado y devuelve el resultado', async () => {
    const fetchImpl = vi.fn(async () => ok())
    const result = await seedUsers({ url: 'http://127.0.0.1:54321', serviceKey: 'clave-de-servicio', fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(result.map((r: { status: string }) => r.status)).toEqual(DEV_USERS.map(() => 'creada'))
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://127.0.0.1:54321/auth/v1/admin/users')
    expect(JSON.parse(init.body as string)).toMatchObject({ email_confirm: true, email: DEV_USERS[0]?.email })
  })

  it('es repetible: una cuenta que ya existe se informa y no es un error', async () => {
    const fetchImpl = vi.fn(async () => exists())
    const result = await seedUsers({ url: 'http://127.0.0.1:54321', serviceKey: 'k', fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(result.every((r: { status: string }) => r.status === 'ya existía')).toBe(true)
  })

  it('un error real se propaga sin mostrar la clave de servicio', async () => {
    const fetchImpl = vi.fn(async () => new Response('boom', { status: 500 }))
    await expect(seedUsers({ url: 'http://127.0.0.1:54321', serviceKey: 'secreta-123', fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow(/500/)
    await expect(seedUsers({ url: 'http://127.0.0.1:54321', serviceKey: 'secreta-123', fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.not.toThrow(/secreta-123/)
  })

  it('se niega a crear cuentas fuera de la base local', async () => {
    await expect(seedUsers({ url: 'https://abcd.supabase.co', serviceKey: 'k', fetchImpl: vi.fn() as unknown as typeof fetch })).rejects.toThrow('solo con la base local')
  })
})

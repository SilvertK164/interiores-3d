import { createClient } from '@supabase/supabase-js'

export type AuthUser = { id: string; token: string }
export type AuthVerifier = (token: string) => Promise<AuthUser | null>

export function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? '')
  return match ? (match[1] as string) : null
}

export function supabaseAuthVerifier(url: string, anonKey: string): AuthVerifier {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  return async (token) => {
    const { data, error } = await client.auth.getUser(token)
    if (error || !data.user) return null
    return { id: data.user.id, token }
  }
}

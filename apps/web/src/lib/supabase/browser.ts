import { type SupabaseClient, createClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

/** Un solo cliente por pestaña; la sesión vive en localStorage. */
export function supabaseBrowser(): SupabaseClient {
  client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  )
  return client
}

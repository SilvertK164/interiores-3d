import { supabaseBrowser } from '../supabase/browser'
import { createApiClient } from './client'

export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL as string,
  getToken: async () => (await supabaseBrowser().auth.getSession()).data.session?.access_token ?? null,
})

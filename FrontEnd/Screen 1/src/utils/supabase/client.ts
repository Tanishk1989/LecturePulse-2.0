import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

let browserClient: SupabaseClient | null = null

/** Browser Supabase client (Vite SPA). Returns null when env vars are missing. */
export function createClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseKey)
  }

  return browserClient
}

export function getSupabaseUrl(): string | undefined {
  return supabaseUrl
}

export function getSupabaseAnonKey(): string | undefined {
  return supabaseKey
}

export function isSupabaseEnvConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey)
}

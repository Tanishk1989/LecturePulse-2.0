import {
  createClient as createBrowserSupabaseClient,
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseEnvConfigured,
} from '@/utils/supabase/client'

/** True when Supabase URL and key env vars are set. */
export const isSupabaseConfigured = isSupabaseEnvConfigured()

export const supabaseUrl = getSupabaseUrl()
export const supabaseAnonKey = getSupabaseAnonKey()

/** Null when Supabase env vars are not configured — never call `.from()` or `.storage` on null. */
export const supabase = createBrowserSupabaseClient()

if (!isSupabaseConfigured) {
  console.warn('Supabase env vars missing. Running in frontend-only mode.')
}

export const LECTURES_BUCKET = 'lectures'
export const DOCUMENTS_BUCKET = 'documents'

import type { User } from 'firebase/auth'

/**
 * Sync Firebase session to Supabase.
 * @deprecated Supabase auth is no longer used. Authentication is driven entirely by Firebase Admin SDK on the Express backend.
 */
export async function syncSupabaseAuth(_firebaseUser: User | null): Promise<void> {
  // No-op
}

/**
 * Refresh Firebase session to Supabase.
 * @deprecated Supabase auth is no longer used.
 */
export async function refreshSupabaseAuth(_firebaseUser: User | null): Promise<void> {
  // No-op
}

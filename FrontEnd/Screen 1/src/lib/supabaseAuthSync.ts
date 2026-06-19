import type { User } from 'firebase/auth'
import { createClient } from '@/utils/supabase/client'

/**
 * Sync Firebase session to Supabase so RLS policies can read auth.jwt()->>'sub'.
 * Enable Firebase Third-Party Auth in Supabase Dashboard first.
 */
export async function syncSupabaseAuth(firebaseUser: User | null): Promise<void> {
  const supabase = createClient()
  if (!supabase) return

  if (!firebaseUser) {
    await supabase.auth.signOut()
    return
  }

  const idToken = await firebaseUser.getIdToken()

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'firebase',
    token: idToken,
  })

  if (error) {
    console.warn(
      'Supabase auth sync failed:',
      error.message,
      '\n  → Ensure Firebase Third-Party Auth is enabled in Supabase Dashboard (Authentication > Providers > Firebase).',
      '\n  → Without this, RLS policies using auth.jwt() or auth.uid() will reject all queries.',
    )
  }
}

export async function refreshSupabaseAuth(firebaseUser: User | null): Promise<void> {
  if (!firebaseUser) return
  await syncSupabaseAuth(firebaseUser)
}

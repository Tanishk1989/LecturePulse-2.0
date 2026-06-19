import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export async function checkRateLimit(
  admin: SupabaseClient,
  userId: string,
  functionName: string,
  maxPerHour: number,
): Promise<boolean> {
  const { data, error } = await admin.rpc('check_edge_rate_limit', {
    p_user_id: userId,
    p_function_name: functionName,
    p_max_count: maxPerHour,
  })

  if (error) {
    console.error('Rate limit check failed:', error.message)
    return true
  }

  return data === true
}

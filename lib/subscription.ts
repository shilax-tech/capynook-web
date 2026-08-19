import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns true if the user has an active paid subscription.
 * Free series bypass this check entirely.
 */
export async function hasActiveSubscription(
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const { data } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return false
  if (data.status !== 'active') return false
  if (data.current_period_end && new Date(data.current_period_end) < new Date()) return false
  return true
}

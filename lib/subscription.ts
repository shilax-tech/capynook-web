import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Owner bypass.
 *
 * The owner could only read the one series marked is_free, so he could not review his own
 * library. A `subscriptions` row would not survive the planned rebuild of the database, and
 * marking every series free would open the paywall to everyone. An email allowlist in the
 * environment does neither, and it cannot be wiped by a data change.
 *
 * Set OWNER_EMAILS in .env.local and in the host's environment, comma separated.
 */
export function isOwner(email?: string | null): boolean {
  if (!email) return false
  const allowed = (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.toLowerCase())
}

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

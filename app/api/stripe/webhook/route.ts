import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-06-30.basil' })

// Service role client — bypasses RLS so webhook can write subscription rows
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const sub = event.data.object as Stripe.Subscription
  const userId = sub.metadata?.supabase_user_id

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      if (!userId) break
      const periodEnd = new Date((sub as any).current_period_end * 1000).toISOString()
      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
        stripe_subscription_id: sub.id,
        status: sub.status === 'active' ? 'active' : 'inactive',
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      break
    }

    case 'customer.subscription.deleted': {
      if (!userId) break
      await supabase.from('subscriptions')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
      break
    }
  }

  return NextResponse.json({ received: true })
}

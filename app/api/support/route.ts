import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { type, message } = await req.json()
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }

  const from = user?.email ?? 'anonymous'
  const subject = type === 'suggestion' ? 'CapyNook Suggestion' : 'CapyNook Support Request'

  // Send via Resend if key is set, otherwise log + mailto fallback
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'support@capynook.net',
        to: 'shilax@gmail.com',
        subject,
        text: `From: ${from}\n\n${message}`,
      }),
    })
  } else {
    // Fallback: just log (Resend key not configured)
    console.log(`[SUPPORT] ${subject} from ${from}: ${message}`)
  }

  return NextResponse.json({ ok: true })
}

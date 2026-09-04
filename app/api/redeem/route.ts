import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Service role — access_codes has RLS on with no policies, so nothing but this can read it.
// That is deliberate: a signed-in reader must not be able to list or probe codes.
const admin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MESSAGES: Record<string, string> = {
  not_found: "That code isn't recognised. Check the spelling and try again.",
  revoked: 'That code is no longer active.',
  expired: 'That code has expired.',
  used_up: 'That code has already been used.',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please log in first.' }, { status: 401 })
  }

  let code = ''
  try {
    code = String(((await req.json()) as { code?: string }).code ?? '')
  } catch {
    return NextResponse.json({ error: 'Enter a code.' }, { status: 400 })
  }

  // People type codes off paper: strip spaces and dashes, fold case.
  code = code.toUpperCase().replace(/[\s-]+/g, '')
  if (code.length < 4 || code.length > 40) {
    return NextResponse.json({ error: 'Enter a code.' }, { status: 400 })
  }

  // All the validation, the use-count increment and the subscription row happen inside one
  // SQL function so two people redeeming the last use at once cannot both win.
  const { data, error } = await admin.rpc('redeem_access_code', {
    p_code: code,
    p_user: user.id,
  })

  if (error) {
    console.error('redeem failed:', error.message)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row?.ok) {
    return NextResponse.json(
      { error: MESSAGES[row?.reason as string] ?? 'That code could not be used.' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    ok: true,
    already: row.reason === 'already',
    until: row.until ?? null,
  })
}

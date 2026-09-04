'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

/**
 * Password recovery uses the IMPLICIT flow on purpose.
 *
 * The default PKCE flow stores a code verifier in the browser that asked for the reset, so
 * the link is only redeemable in that same browser. People request a reset on a laptop and
 * open the email on their phone, which fails with "PKCE code verifier not found in storage"
 * and strands them with no way through. Ryan hit exactly that.
 *
 * Implicit links carry the tokens in the URL fragment and work from any device, which is the
 * whole point of a recovery link. /auth/reset-password consumes them and immediately strips
 * them out of the address bar.
 */
function recoveryClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: 'implicit' } }
  )
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // Read the field, not React state - password managers can fill without firing the event
    // React listens for. Same trap as the login form.
    const form = new FormData(e.currentTarget)
    const address = String(form.get('email') ?? '').trim() || email
    if (!address) { setError('Enter your email address.'); return }

    setLoading(true)
    setError('')
    const { error } = await recoveryClient().auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setEmail(address); setSent(true); setLoading(false) }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-md p-8">
        <h1 className="text-3xl font-bold text-amber-900 mb-2">Reset password</h1>
        {sent ? (
          <>
            <p className="text-amber-700 mb-6">
              Check your email — we sent a reset link to <strong>{email}</strong>.
            </p>
            <Link href="/login" className="text-amber-600 underline text-sm">
              Back to login
            </Link>
          </>
        ) : (
          <>
            <p className="text-amber-600 mb-8">
              Enter your email and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
            <p className="mt-6 text-center text-amber-700">
              <Link href="/login" className="underline font-semibold">Back to login</Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}

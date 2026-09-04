'use client'
import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

/**
 * Only ever redirect to a path on this site. `?next=https://elsewhere` would otherwise make
 * the signup form an open redirect, and "//host" is a protocol-relative URL, not a path.
 */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/library'
  return raw
}

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<'already' | 'confirm' | null>(null)
  const [loading, setLoading] = useState(false)
  const params = useSearchParams()
  const supabase = createClient()

  // Someone arriving with a gift code goes back to redeem it with the code still in hand,
  // so they never retype it or have to find the subscribe page on their own.
  const next = safeNext(params.get('next'))
  const gift = next.includes('code=')

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}${next}` }
    })
    if (error) { setError(error.message); setLoading(false); return }

    // Supabase returns a deliberate FAKE SUCCESS when the address is already registered -
    // enumeration protection, so nobody can probe who has an account. No error, and no
    // session. Redirecting on "no error" therefore sent people to /library having done
    // nothing, which reads as a successful signup and is not one. An existing user is given
    // away only by an empty identities array, never by an error.
    const alreadyRegistered = data.user && (data.user.identities?.length ?? 0) === 0
    if (alreadyRegistered) {
      setNotice('already')
      setLoading(false)
      return
    }

    // Confirmation is on, so a genuine new signup comes back with a user and no session.
    // Telling them to go and click the email beats dropping them at a login they cannot pass.
    if (!data.session) {
      setNotice('confirm')
      setLoading(false)
      return
    }

    // Hard navigation for the same reason as the login page: a soft push can be served from
    // an RSC payload cached while logged out, and middleware then bounces straight back.
    window.location.assign(next)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-md p-8">
        <h1 className="text-3xl font-bold text-amber-900 mb-2">Start reading</h1>
        <p className="text-amber-600 mb-8">
          {gift
            ? 'Create your account, then your gift code unlocks the library.'
            : 'Create your free account'}
        </p>
        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
            required
          />
          <input
            type="password" placeholder="Password (min 8 chars)" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
            minLength={8} required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {notice === 'already' && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">You already have an account</p>
              <p>
                Use{' '}
                <Link href="/login" className="underline font-semibold">log in</Link>
                {' '}instead, or{' '}
                <Link href="/forgot-password" className="underline font-semibold">reset your password</Link>
                {' '}if you have forgotten it.
              </p>
            </div>
          )}
          {notice === 'confirm' && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">Check your email</p>
              <p>
                We sent a confirmation link to <span className="font-medium">{email}</span>.
                Click it and you can log in. Look in your spam folder if it has not arrived.
              </p>
            </div>
          )}
          <button
            type="submit" disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="mt-6 text-center text-amber-700">
          Have an account? <Link href="/login" className="underline font-semibold">Log in</Link>
        </p>
      </div>
    </main>
  )
}

// useSearchParams needs a Suspense boundary or the whole route opts out of prerendering.
export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  )
}

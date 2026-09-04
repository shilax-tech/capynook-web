'use client'
import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const [loading, setLoading] = useState(false)
  const router = useRouter()
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
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}${next}` }
    })
    if (error) { setError(error.message); setLoading(false) }
    else router.push(next)
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

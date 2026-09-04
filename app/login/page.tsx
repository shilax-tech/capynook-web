'use client'
import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

/** Only ever redirect to a path on this site — never absolute or protocol-relative. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/library'
  return raw
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const params = useSearchParams()
  const supabase = createClient()

  // Someone sent here mid-redemption goes back to their code, not to the library.
  const next = safeNext(params.get('next'))

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Read the FIELDS, not React state.
    //
    // Password managers write straight into the DOM node. Bitwarden in particular can fill
    // without firing the event React listens for, so a controlled input's state stays empty
    // and the form posts blanks - which the server answers with "Invalid login credentials".
    // The password is correct, the request never carried it. Ryan lost an afternoon to this
    // with a password that had never changed.
    const form = new FormData(e.currentTarget)
    const emailValue = String(form.get('email') ?? '').trim() || email
    const passwordValue = String(form.get('password') ?? '') || password

    if (!emailValue || !passwordValue) {
      setError('Enter your email and password.')
      return
    }

    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password: passwordValue,
    })
    if (error) { setError(error.message); setLoading(false); return }

    // HARD navigation, not router.push. A soft navigation can be served from an RSC payload
    // cached while the visitor was still logged out; middleware then sees no session and
    // bounces straight back to this page. The sign-in has already succeeded by then, so
    // nothing shows an error and it reads as the login button doing nothing at all.
    window.location.assign(next)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-md p-8">
        <h1 className="text-3xl font-bold text-amber-900 mb-2">Welcome back</h1>
        <p className="text-amber-600 mb-8">Log in to access your library</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email" name="email" autoComplete="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
            required
          />
          <input
            type="password" name="password" autoComplete="current-password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
            required
          />
          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-amber-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        <p className="mt-6 text-center text-amber-700">
          No account? <Link href="/signup" className="underline font-semibold">Sign up</Link>
        </p>
      </div>
    </main>
  )
}

function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-md p-8 text-center">
        <p className="text-amber-600">Loading&hellip;</p>
      </div>
    </main>
  )
}

// useSearchParams needs a Suspense boundary or the route opts out of prerendering.
export default function LoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LoginForm />
    </Suspense>
  )
}

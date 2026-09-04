'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Phase = 'checking' | 'ready' | 'nolink' | 'done'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<Phase>('checking')
  const supabase = createClient()

  /**
   * Establish the session from the recovery link before anything else.
   *
   * Recovery emails use the IMPLICIT flow: Supabase redirects here with access_token and
   * refresh_token in the URL fragment. createBrowserClient from @supabase/ssr defaults to
   * flowType 'pkce' and does not consume implicit hash tokens, so this page rendered a
   * perfectly good form with no session behind it, and "Update password" failed with
   * "Auth session missing". Confirmed on a live link: hash present, zero auth cookies,
   * zero localStorage keys.
   *
   * So parse the hash and set the session by hand. PKCE-style links arrive as ?code=
   * instead and are handled too, and an existing session is accepted so reloading this page
   * after the tokens are stripped still works.
   */
  useEffect(() => {
    let cancelled = false

    async function establish() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const access_token = hash.get('access_token')
      const refresh_token = hash.get('refresh_token')
      const hashError = hash.get('error_description') || hash.get('error')

      if (hashError) {
        if (!cancelled) { setError(decodeURIComponent(hashError)); setPhase('nolink') }
        return
      }

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        // Never leave credentials sitting in the address bar or in browser history.
        window.history.replaceState(null, '', window.location.pathname)
        if (!cancelled) {
          if (error) { setError(error.message); setPhase('nolink') }
          else setPhase('ready')
        }
        return
      }

      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        window.history.replaceState(null, '', window.location.pathname)
        if (!cancelled) {
          if (error) { setError(error.message); setPhase('nolink') }
          else setPhase('ready')
        }
        return
      }

      const { data } = await supabase.auth.getSession()
      if (!cancelled) setPhase(data.session ? 'ready' : 'nolink')
    }

    establish()
    return () => { cancelled = true }
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setPhase('done')
    // Hard navigation so the library is fetched with the new session rather than from a
    // payload cached while logged out.
    setTimeout(() => window.location.assign('/library'), 1500)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-md p-8">
        <h1 className="text-3xl font-bold text-amber-900 mb-2">New password</h1>

        {phase === 'checking' && <p className="text-amber-600">Checking your link…</p>}

        {phase === 'done' && (
          <p className="text-amber-700">Password updated. Opening your library…</p>
        )}

        {phase === 'nolink' && (
          <>
            <p className="text-amber-700 mb-4">
              This reset link is expired or has already been used.
            </p>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <Link
              href="/forgot-password"
              className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
            >
              Send a new link
            </Link>
            <p className="mt-6 text-center text-amber-700">
              <Link href="/login" className="underline font-semibold">Back to login</Link>
            </p>
          </>
        )}

        {phase === 'ready' && (
          <>
            <p className="text-amber-600 mb-8">Choose a new password for your account.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="password"
                placeholder="New password (min 8 chars)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
                minLength={8}
                required
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full border border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
                minLength={8}
                required
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}

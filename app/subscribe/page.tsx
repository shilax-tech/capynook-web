'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function SubscribePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [redeemed, setRedeemed] = useState(false)

  async function handleSubscribe() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setRedeeming(true)
    setCodeError(null)
    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (data.ok) {
        setRedeemed(true)
        // The paywall reads the subscriptions row on the server, so the library has to be
        // re-fetched rather than client-navigated to.
        router.refresh()
        setTimeout(() => { window.location.href = '/library' }, 1200)
      } else {
        setCodeError(data.error || 'That code could not be used.')
        setRedeeming(false)
      }
    } catch {
      setCodeError('Something went wrong. Try again.')
      setRedeeming(false)
    }
  }

  return (
    <main className="min-h-screen bg-amber-50 flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm p-8 text-center">
        <Image src="/logo.png" alt="" width={72} height={72} className="mx-auto mb-4 w-16 h-16" />
        <h1 className="text-2xl font-bold text-amber-900 mb-2">Unlock the Full Library</h1>
        <p className="text-amber-700 mb-6">
          Unlimited access to every series — new books added every month.
          The Capy Series stays free for everyone.
        </p>

        <div className="bg-amber-50 rounded-2xl p-6 mb-6">
          <div className="text-4xl font-bold text-amber-900">
            $5<span className="text-lg font-normal text-amber-600">/month</span>
          </div>
          <ul className="mt-4 text-sm text-amber-700 space-y-2 text-left">
            <li>✓ 67 series, 2,700+ stories</li>
            <li>✓ New series added regularly</li>
            <li>✓ Reading progress tracked per child</li>
            <li>✓ Cancel anytime</li>
          </ul>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button
          onClick={handleSubscribe}
          disabled={loading || redeemed}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-2xl transition-colors disabled:opacity-60"
        >
          {loading ? 'Redirecting to checkout...' : 'Subscribe — $5/month'}
        </button>
        <p className="mt-3 text-xs text-amber-400">Secure checkout via Stripe. Cancel anytime.</p>

        {/* Gift codes. Family get a code rather than a card, and rather than sharing an
            account. Redeeming writes an ordinary subscription row, so the paywall itself
            never has to know a code was involved. */}
        <div className="mt-7 pt-6 border-t border-amber-100">
          {redeemed ? (
            <p className="text-sm font-medium text-green-700">
              Code accepted — opening your library…
            </p>
          ) : (
            <>
              <p className="text-sm text-amber-700 mb-3">Have a gift code?</p>
              <form onSubmit={handleRedeem} className="flex gap-2">
                <input
                  value={code}
                  onChange={e => { setCode(e.target.value); setCodeError(null) }}
                  placeholder="CAPY-XXXX-XXXX"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Gift code"
                  className="flex-1 min-w-0 border border-amber-200 rounded-xl px-4 py-2.5 text-center tracking-widest uppercase font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="submit"
                  disabled={redeeming || !code.trim()}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white border-2 border-amber-400 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
                >
                  {redeeming ? '…' : 'Redeem'}
                </button>
              </form>
              {codeError && <p className="mt-2 text-sm text-red-600">{codeError}</p>}
            </>
          )}
        </div>

        <Link href="/library" className="mt-6 block text-sm text-amber-600 hover:text-amber-800">
          ← Back to library
        </Link>
      </div>
    </main>
  )
}

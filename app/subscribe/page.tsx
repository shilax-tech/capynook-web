'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function SubscribePage() {
  const [loading, setLoading] = useState(false)

  async function handleSubscribe() {
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(false)
  }

  return (
    <main className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm p-8 text-center">
        <div className="text-6xl mb-4">🦫</div>
        <h1 className="text-2xl font-bold text-amber-900 mb-2">Unlock the Full Library</h1>
        <p className="text-amber-700 mb-6">
          Get unlimited access to 65+ series — new books added every month.
          The Capy Series is always free.
        </p>

        <div className="bg-amber-50 rounded-2xl p-6 mb-6">
          <div className="text-4xl font-bold text-amber-900">
            $5<span className="text-lg font-normal text-amber-600">/month</span>
          </div>
          <ul className="mt-4 text-sm text-amber-700 space-y-2 text-left">
            <li>✓ 65+ book series, 2,000+ stories</li>
            <li>✓ New series added regularly</li>
            <li>✓ Reading progress tracked per child</li>
            <li>✓ Cancel anytime</li>
          </ul>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-2xl transition-colors disabled:opacity-60"
        >
          {loading ? 'Redirecting to checkout...' : 'Subscribe — $5/month'}
        </button>

        <p className="mt-3 text-xs text-amber-400">Secure checkout via Stripe. Cancel anytime.</p>
        <Link href="/library" className="mt-4 block text-sm text-amber-600 hover:text-amber-800">
          ← Back to library
        </Link>
      </div>
    </main>
  )
}

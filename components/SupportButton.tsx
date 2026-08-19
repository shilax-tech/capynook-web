'use client'
import { useState } from 'react'

export default function SupportButton() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'support' | 'suggestion'>('support')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setStatus('sending')
    await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, message }),
    })
    setStatus('sent')
    setTimeout(() => { setOpen(false); setStatus('idle'); setMessage('') }, 1800)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 bg-amber-500 hover:bg-amber-600 text-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center text-xl z-50 transition-colors"
        title="Help & Suggestions"
      >
        ?
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6">
            <h2 className="font-bold text-amber-900 text-lg mb-4">How can we help?</h2>

            <div className="flex gap-2 mb-4">
              {(['support', 'suggestion'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${type === t ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700'}`}>
                  {t === 'support' ? 'Get Support' : 'Suggest a Feature'}
                </button>
              ))}
            </div>

            {status === 'sent' ? (
              <div className="text-center py-6 text-amber-700 font-medium">✓ Sent! We'll get back to you soon.</div>
            ) : (
              <form onSubmit={submit}>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={type === 'support' ? "Describe the issue..." : "What would you like to see?"}
                  className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 mb-3"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setOpen(false)}
                    className="flex-1 py-2 rounded-xl text-sm text-amber-600 border border-amber-200 hover:bg-amber-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={status === 'sending'}
                    className="flex-1 py-2 rounded-xl text-sm bg-amber-500 hover:bg-amber-600 text-white font-medium disabled:opacity-60">
                    {status === 'sending' ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

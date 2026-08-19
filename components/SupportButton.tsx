'use client'

export default function SupportButton() {
  return (
    <button
      onClick={() => { window.open('https://mail.google.com/mail/?view=cm&to=shilax@gmail.com&su=CapyNook+Support', '_blank') }}
      className="fixed bottom-5 right-5 bg-amber-500 hover:bg-amber-600 text-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center text-xl z-50 transition-colors"
      title="Help & Support"
    >
      ?
    </button>
  )
}

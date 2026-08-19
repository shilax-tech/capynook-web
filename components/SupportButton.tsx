'use client'
import { useState, useEffect, useRef } from 'react'

export default function SupportButton() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="absolute bottom-14 right-0 bg-white rounded-xl shadow-lg p-4 w-52 text-sm text-gray-700 border border-amber-100">
          <p className="font-medium mb-1">Need help? Email us:</p>
          <a
            href="mailto:shilax@gmail.com"
            className="text-amber-600 hover:underline break-all"
          >
            shilax@gmail.com
          </a>
        </div>
      )}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="bg-amber-500 hover:bg-amber-600 text-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center text-xl transition-colors"
        title="Help & Support"
      >
        ?
      </button>
    </div>
  )
}

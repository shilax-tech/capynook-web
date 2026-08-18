import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CapyNook — Children\'s Book Library',
  description: 'A cozy nook of stories for curious kids.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-amber-50 min-h-screen`}>
        {children}
      </body>
    </html>
  )
}

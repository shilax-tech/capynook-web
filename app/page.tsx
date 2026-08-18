import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-2xl">
        <h1 className="text-5xl font-bold text-amber-900 mb-4">🦫 CapyNook</h1>
        <p className="text-xl text-amber-700 mb-8">
          A cozy nook of beautifully written children's stories, ready to read together.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 py-4 rounded-2xl text-lg transition-colors"
          >
            Start Reading Free
          </Link>
          <Link
            href="/login"
            className="border-2 border-amber-400 text-amber-700 hover:bg-amber-100 font-semibold px-8 py-4 rounded-2xl text-lg transition-colors"
          >
            Log In
          </Link>
        </div>
        <div className="mt-16 grid grid-cols-3 gap-6 text-amber-800">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="text-3xl mb-2">📖</div>
            <div className="font-semibold">700+ Stories</div>
            <div className="text-sm text-amber-600">New ones added daily</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="text-3xl mb-2">⭐</div>
            <div className="font-semibold">Favorites & Queue</div>
            <div className="text-sm text-amber-600">Pick up where you left off</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="text-3xl mb-2">👾</div>
            <div className="font-semibold">Read-Aloud Coming</div>
            <div className="text-sm text-amber-600">Robot narrator in beta</div>
          </div>
        </div>
      </div>
    </main>
  )
}

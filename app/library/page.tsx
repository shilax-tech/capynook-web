import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ series?: string; search?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const { series: seriesFilter, search } = params

  // Get all series
  const { data: allSeries } = await supabase
    .from('series')
    .select('id, name')
    .eq('platform', 'secular')
    .order('name')

  // Get books with optional filters
  let query = supabase
    .from('books')
    .select('id, title, cover_url, book_number, series_id, series(name)')
    .eq('platform', 'secular')
    .order('book_number')

  if (seriesFilter) query = query.eq('series_id', seriesFilter)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data: books } = await query.limit(100)

  return (
    <main className="min-h-screen px-4 py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-amber-900">🦫 Library</h1>
        <form action="/api/auth/signout" method="post">
          <button className="text-amber-600 hover:text-amber-800 text-sm">Sign out</button>
        </form>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        <form className="flex-1 min-w-48">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search books..."
            className="w-full border border-amber-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          />
        </form>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/library"
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${!seriesFilter ? 'bg-amber-500 text-white' : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'}`}
          >
            All
          </Link>
          {allSeries?.map(s => (
            <Link
              key={s.id}
              href={`/library?series=${s.id}`}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${seriesFilter === s.id ? 'bg-amber-500 text-white' : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'}`}
            >
              {s.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Book grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {books?.map(book => (
          <Link key={book.id} href={`/book/${book.id}`} className="group">
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {book.cover_url ? (
                <div className="relative aspect-[2/3]">
                  <Image
                    src={book.cover_url}
                    alt={book.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-[2/3] bg-amber-100 flex items-center justify-center text-4xl">📖</div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {(!books || books.length === 0) && (
        <div className="text-center py-16 text-amber-600">
          <div className="text-5xl mb-4">📭</div>
          <p>No books found. Try a different filter.</p>
        </div>
      )}
    </main>
  )
}

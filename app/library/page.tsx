import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const PER_PAGE = 60

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ series?: string; search?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const { series: seriesFilter, search } = params

  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const from = (page - 1) * PER_PAGE
  const to = from + PER_PAGE - 1

  // Get all series
  const { data: allSeries } = await supabase
    .from('series')
    .select('id, name')
    .eq('platform', 'secular')
    .order('name')

  // Get books with optional filters.
  // Ordering by series_id first keeps each series' books together. Ordering by book_number
  // alone interleaved the whole library: every series' Book 1, then every series' Book 2.
  const booksQuery = (mode: 'fts' | 'like') => {
    let q = supabase
      .from('books')
      .select('id, title, cover_url, book_number, series_id, series(name)', { count: 'exact' })
      .eq('platform', 'secular')
      .order('series_id')
      .order('book_number')

    if (seriesFilter) q = q.eq('series_id', seriesFilter)

    if (search) {
      if (mode === 'fts') {
        // Needs the search_vector column from supabase-migration-search.sql.
        q = q.textSearch('search_vector', search, {
          type: 'websearch',
          config: 'english',
        })
      } else {
        // Fallback for before that migration is run. Matches the story text as well as the
        // title, which the old title-only search never did. No index, so it is slower.
        const esc = search.replace(/[%,()]/g, ' ')
        q = q.or(`title.ilike.%${esc}%,content.ilike.%${esc}%`)
      }
    }
    return q.range(from, to)
  }

  let { data: books, count, error } = await booksQuery(search ? 'fts' : 'like')

  // If search_vector is not there yet, PostgREST returns an error rather than throwing.
  // Fall back rather than showing the reader an empty library.
  if (error && search) {
    ({ data: books, count } = await booksQuery('like'))
  }

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const showingFrom = total === 0 ? 0 : from + 1
  const showingTo = Math.min(from + PER_PAGE, total)

  // Page links must carry the current filter and search, or paging silently resets them.
  const hrefFor = (p: number) => {
    const q = new URLSearchParams()
    if (seriesFilter) q.set('series', seriesFilter)
    if (search) q.set('search', search)
    if (p > 1) q.set('page', String(p))
    const s = q.toString()
    return s ? `/library?${s}` : '/library'
  }

  // First page, last page, and a few either side of the current one.
  const windowed: (number | '...')[] = []
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 2) {
      windowed.push(p)
    } else if (windowed[windowed.length - 1] !== '...') {
      windowed.push('...')
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-amber-900">Library</h1>
        <form action="/api/auth/signout" method="post">
          <button className="text-amber-600 hover:text-amber-800 text-sm">Sign out</button>
        </form>
      </div>

      {/* Filters.
          There are 64 series. As a row of pills that filled the whole screen before a single
          book appeared, so the series picker is a select and the two controls submit together. */}
      <form className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search titles and stories..."
          className="flex-1 min-w-0 border border-amber-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
        />
        <select
          name="series"
          defaultValue={seriesFilter ?? ''}
          className="sm:w-72 border border-amber-200 rounded-xl px-4 py-2 bg-white text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">All series ({allSeries?.length ?? 0})</option>
          {allSeries?.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-5 py-2 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
        >
          Search
        </button>
        {(search || seriesFilter) && (
          <Link
            href="/library"
            className="px-5 py-2 rounded-xl text-sm font-medium bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 text-center"
          >
            Clear
          </Link>
        )}
      </form>

      {total > 0 && (
        <p className="text-sm text-amber-700 mb-6">
          Showing {showingFrom.toLocaleString()}&ndash;{showingTo.toLocaleString()} of{' '}
          {total.toLocaleString()} book{total === 1 ? '' : 's'}
          {totalPages > 1 && <> &middot; page {page} of {totalPages}</>}
        </p>
      )}

      {/* Book grid.
          Only 91 of 2,570 books have a cover, and search now matches story text as well as
          titles, so a grid of unlabelled placeholders gave the reader no way to tell why any
          result was there. Every card carries its title and series. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {books?.map(book => {
          const seriesName = Array.isArray(book.series)
            ? book.series[0]?.name
            : (book.series as { name?: string } | null)?.name
          return (
            <Link key={book.id} href={`/book/${book.id}`} className="group flex flex-col">
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                {book.cover_url ? (
                  <div className="relative aspect-[2/3]">
                    <Image
                      src={book.cover_url}
                      alt={book.title}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  // No cover. The title sits under every card already, so repeating it here
                  // just doubled it up. A quiet placeholder keeps the grid calm instead.
                  <div className="aspect-[2/3] bg-amber-50 border border-amber-100 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"
                         className="w-8 h-8 text-amber-300" aria-hidden="true">
                      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H18a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5.5A1.5 1.5 0 0 1 4 18.5v-14Z" />
                      <path d="M4 17.5A1.5 1.5 0 0 1 5.5 16H19" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="px-1 pt-2">
                <p className="text-sm font-medium text-amber-900 leading-snug line-clamp-2 group-hover:text-amber-700">
                  {book.title}
                </p>
                <p className="text-xs text-amber-600 mt-0.5 truncate">
                  {seriesName ? `${seriesName}` : 'Unsorted'}
                  {book.book_number ? ` · #${book.book_number}` : ''}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      {totalPages > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-2 mt-10" aria-label="Pagination">
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} className="px-3 py-2 rounded-xl text-sm font-medium bg-white border border-amber-200 text-amber-700 hover:bg-amber-50">
              &larr; Previous
            </Link>
          ) : (
            <span className="px-3 py-2 rounded-xl text-sm font-medium bg-white border border-amber-100 text-amber-300">&larr; Previous</span>
          )}

          {windowed.map((p, i) =>
            p === '...' ? (
              <span key={`gap-${i}`} className="px-2 text-amber-400">&hellip;</span>
            ) : (
              <Link
                key={p}
                href={hrefFor(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${p === page ? 'bg-amber-500 text-white' : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'}`}
              >
                {p}
              </Link>
            )
          )}

          {page < totalPages ? (
            <Link href={hrefFor(page + 1)} className="px-3 py-2 rounded-xl text-sm font-medium bg-white border border-amber-200 text-amber-700 hover:bg-amber-50">
              Next &rarr;
            </Link>
          ) : (
            <span className="px-3 py-2 rounded-xl text-sm font-medium bg-white border border-amber-100 text-amber-300">Next &rarr;</span>
          )}
        </nav>
      )}

      {(!books || books.length === 0) && (
        <div className="text-center py-16 text-amber-600">
          
          <p>No books found. Try a different filter.</p>
        </div>
      )}
    </main>
  )
}

import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 3600

type Cover = { id: string; title: string; cover_url: string }

/**
 * The shop window said "700+ Stories" while the library held 2,741, which undersells the
 * whole thing by a factor of four. Counted rather than typed, so it cannot drift again.
 * Free books are counted separately because "free" is the actual offer on this page.
 */
async function stats() {
  const fallback = { stories: '2,700+', series: 67, free: 100, covers: [] as Cover[] }
  try {
    const supabase = await createClient()

    const [{ count: books }, { data: series }] = await Promise.all([
      supabase.from('books').select('id', { count: 'exact', head: true }),
      supabase.from('series').select('id, name, is_free'),
    ])

    const freeIds = (series ?? []).filter(s => s.is_free).map(s => s.id)

    // Real covers from the free series. These are the books a visitor can actually open, so
    // they are the only honest thing to put in the window. Ordered by book number so the
    // shelf reads as the start of a series rather than a random handful.
    const { data: covers } = freeIds.length
      ? await supabase
          .from('books')
          .select('id, title, cover_url')
          .in('series_id', freeIds)
          .not('cover_url', 'is', null)
          .like('cover_url', 'http%')
          .order('book_number')
          .limit(7)
      : { data: [] }

    const { count: free } = freeIds.length
      ? await supabase.from('books').select('id', { count: 'exact', head: true }).in('series_id', freeIds)
      : { count: 0 }

    return {
      stories: books ? `${(Math.floor(books / 100) * 100).toLocaleString()}+` : fallback.stories,
      series: series?.length ?? fallback.series,
      free: free ?? fallback.free,
      covers: (covers ?? []) as Cover[],
    }
  } catch {
    return fallback
  }
}

export default async function Home() {
  const { stories, series, free, covers } = await stats()

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-14 sm:py-20">
      <div className="w-full max-w-3xl text-center">
        <Image
          src="/logo.png"
          alt=""
          width={132}
          height={132}
          priority
          className="mx-auto mb-5 w-24 h-24 sm:w-32 sm:h-32"
        />
        <h1 className="text-5xl sm:text-6xl font-bold text-amber-900 tracking-tight">CapyNook</h1>
        <p className="mt-4 text-lg sm:text-xl text-amber-700 max-w-xl mx-auto leading-relaxed">
          A cozy nook of beautifully written children&apos;s stories, ready to read together.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 py-4 rounded-2xl text-lg transition-colors shadow-sm"
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
        <p className="mt-4 text-sm text-amber-600">
          {free.toLocaleString()} books free, no card needed.
        </p>
      </div>

      {/* The shelf. Real covers from the free series, fanned like books on a table.
          Hidden entirely rather than rendering an empty row if the query comes back short. */}
      {covers.length > 0 && (
        <section className="w-full max-w-5xl mt-16" aria-label="Books from the free collection">
          <div className="flex justify-center items-end gap-3 sm:gap-5 overflow-x-auto pb-4 px-2">
            {covers.map((b, i) => {
              const mid = (covers.length - 1) / 2
              const off = i - mid
              return (
                <Link
                  key={b.id}
                  href="/signup"
                  title={b.title}
                  className="group shrink-0 transition-transform duration-200 hover:-translate-y-2 hover:rotate-0"
                  style={{
                    transform: `rotate(${off * 2.4}deg) translateY(${Math.abs(off) * 7}px)`,
                    zIndex: 10 - Math.abs(Math.round(off)),
                  }}
                >
                  <div className="relative w-24 sm:w-32 md:w-36 aspect-[2/3] rounded-lg overflow-hidden shadow-md ring-1 ring-amber-900/10 group-hover:shadow-xl transition-shadow">
                    <Image
                      src={b.cover_url}
                      alt={b.title}
                      fill
                      sizes="(max-width: 640px) 96px, (max-width: 768px) 128px, 144px"
                      className="object-cover"
                    />
                  </div>
                </Link>
              )
            })}
          </div>
          <p className="text-center text-sm text-amber-600 mt-3">
            From <span className="font-medium text-amber-800">Caper the Capybara</span> — free to read
          </p>
        </section>
      )}

      <div className="w-full max-w-3xl mt-16 grid grid-cols-1 sm:grid-cols-3 gap-5 text-amber-800">
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div className="text-3xl mb-2">📖</div>
          <div className="font-semibold">{stories} Stories</div>
          <div className="text-sm text-amber-600">Across {series} series</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div className="text-3xl mb-2">🎨</div>
          <div className="font-semibold">Illustrated Covers</div>
          <div className="text-sm text-amber-600">Hand-styled for every series</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div className="text-3xl mb-2">🌙</div>
          <div className="font-semibold">Built for Bedtime</div>
          <div className="text-sm text-amber-600">One story, start to finish</div>
        </div>
      </div>

      <p className="mt-14 text-sm text-amber-600/80">Stories by Herman Finch</p>
    </main>
  )
}

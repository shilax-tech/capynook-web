import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

// Interior pictures live in the public storage bucket "interior-art" at <book id>/,
// with a manifest.json listing which paragraph each picture goes after.
// Paragraphs are counted the same way the picture generator counted them: non-empty lines, from 0.
type Picture = { after: number; src: string; alt: string }

async function getPictures(bookId: string): Promise<Picture[]> {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/interior-art/${bookId}`
  try {
    const res = await fetch(`${base}/manifest.json`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const items = (await res.json()) as Picture[]
    return items.map(p => ({ ...p, src: `${base}/${p.src}` }))
  } catch {
    return []
  }
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()

  const { id } = await params
  const { data: book } = await supabase
    .from('books')
    .select('id, title, content, cover_url, book_number, series(name, is_free)')
    .eq('id', id)
    .single()

  if (!book) notFound()

  // No sign-in and no paywall: every book is open to anyone. Reading progress was tied to
  // a user account, so it is no longer recorded.
  const series = book.series as any
  const pictures = book.content ? await getPictures(book.id) : []
  const paragraphs: string[] = String(book.content ?? '').split('\n').filter((p: string) => p.trim())

  return (
    <main className="min-h-screen bg-amber-50">
      <div className="sticky top-0 bg-white border-b border-amber-100 px-4 py-3 flex items-center gap-4 z-10">
        <Link href="/library" className="text-amber-600 hover:text-amber-800 font-medium text-sm">
          ← Library
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-amber-500 truncate">{series?.name}</p>
          <h1 className="font-bold text-amber-900 truncate">{book.title}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {book.cover_url && (
          <img src={book.cover_url} alt={book.title}
            className="w-40 mx-auto rounded-2xl shadow-md mb-8" />
        )}
        <div className="book-content bg-white rounded-3xl shadow-sm p-8 sm:p-12">
          {!book.content
            ? <p className="text-amber-400 italic">Story content coming soon.</p>
            : pictures.length === 0
              ? <ReactMarkdown>{book.content}</ReactMarkdown>
              : paragraphs.map((para, i) => (
                  <div key={i}>
                    <ReactMarkdown>{para}</ReactMarkdown>
                    {pictures.filter(p => p.after === i).map(p => (
                      <img key={p.src} src={p.src} alt={p.alt} loading="lazy"
                        className="w-full rounded-2xl shadow-sm my-6" />
                    ))}
                  </div>
                ))
          }
        </div>
        <div className="mt-8 text-center">
          <Link href="/library" className="text-amber-600 hover:text-amber-800 font-medium">
            ← Back to Library
          </Link>
        </div>
      </div>
    </main>
  )
}

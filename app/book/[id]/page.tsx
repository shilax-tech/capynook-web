import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const { data: book } = await supabase
    .from('books')
    .select('id, title, content, cover_url, book_number, series(name)')
    .eq('id', id)
    .single()

  if (!book) notFound()

  // Mark as read
  await supabase.from('reading_progress').upsert({
    user_id: user.id,
    book_id: book.id,
    child_profile_id: null,
    completed: true,
    last_read_at: new Date().toISOString(),
  }, { onConflict: 'user_id,book_id,child_profile_id' })

  return (
    <main className="min-h-screen bg-amber-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-amber-100 px-4 py-3 flex items-center gap-4 z-10">
        <Link href="/library" className="text-amber-600 hover:text-amber-800 font-medium text-sm">
          ← Library
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-amber-500 truncate">{(book.series as any)?.name}</p>
          <h1 className="font-bold text-amber-900 truncate">{book.title}</h1>
        </div>
      </div>

      {/* Book content */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        {book.cover_url && (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-40 mx-auto rounded-2xl shadow-md mb-8"
          />
        )}
        <div className="book-content bg-white rounded-3xl shadow-sm p-8 sm:p-12">
          {book.content ? (
            <ReactMarkdown>{book.content}</ReactMarkdown>
          ) : (
            <p className="text-amber-400 italic">Story content coming soon.</p>
          )}
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

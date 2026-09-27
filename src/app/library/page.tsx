'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Search, BookOpen, Layers, Sparkles, Filter, Bookmark, ArrowRight, Loader2 } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
}

interface Book {
  id: string
  title: string
  description: string
  category_id: string
  pdf_path: string
  cover_path: string | null
  page_count: number | null
  created_at: string
  categories?: {
    id: string
    name: string
    slug: string
  } | null
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  'fairy-tales': {
    bg: 'bg-pink-950/40',
    border: 'border-pink-500/30',
    text: 'text-pink-300',
    gradient: 'from-pink-600 to-purple-800',
  },
  adventure: {
    bg: 'bg-amber-950/40',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    gradient: 'from-amber-600 to-red-800',
  },
  animals: {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    gradient: 'from-emerald-600 to-teal-800',
  },
  bedtime: {
    bg: 'bg-indigo-950/40',
    border: 'border-indigo-500/30',
    text: 'text-indigo-300',
    gradient: 'from-indigo-600 to-purple-900',
  },
}

export default function LibraryPage() {
  const supabase = createClient()

  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    fetchLibraryData()
  }, [])

  const fetchLibraryData = async () => {
    setLoading(true)
    try {
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (catData) setCategories(catData)

      const { data: bookData, error } = await supabase
        .from('books')
        .select('*, categories(id, name, slug)')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (bookData) setBooks(bookData as any)
    } catch (err) {
      console.error('Library data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter books based on search query and category tab
  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      selectedCategory === 'all' ||
      book.category_id === selectedCategory ||
      book.categories?.slug === selectedCategory

    return matchesSearch && matchesCategory
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10 mb-10 bg-gradient-to-r from-purple-900/60 via-indigo-900/40 to-slate-900 border border-purple-500/20 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold mb-4 border border-purple-500/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Enchanted Storybook Collection</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-3">
            Explore Magical Stories
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Choose any book below to launch our interactive reader. Toggle between clean 2D layout and realistic 3D paper page flips anytime.
          </p>
        </div>
      </div>

      {/* Search Bar & Category Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles or keywords..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            All Stories ({books.length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

      </div>

      {/* Books Grid */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading storybook collection...</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="py-16 text-center glass-panel rounded-3xl p-8 max-w-md mx-auto">
          <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Storybooks Found</h3>
          <p className="text-sm text-slate-400">
            {searchQuery
              ? `No books matching "${searchQuery}". Try a different keyword.`
              : 'No books available in this category yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map((book) => {
            const slug = book.categories?.slug || 'fairy-tales'
            const style = CATEGORY_COLORS[slug] || CATEGORY_COLORS['fairy-tales']

            return (
              <div
                key={book.id}
                className="group rounded-2xl glass-card overflow-hidden flex flex-col justify-between border border-slate-800 hover:border-purple-500/40"
              >
                <div>
                  {/* Book Cover Container */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900">
                    {book.cover_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/${book.cover_path}`}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      /* Placeholder Stylized Cover */
                      <div className={`w-full h-full bg-gradient-to-br ${style.gradient} p-6 flex flex-col justify-between relative overflow-hidden group-hover:scale-105 transition-transform duration-500`}>
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="relative z-10 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 bg-black/30 px-2 py-0.5 rounded backdrop-blur-sm">
                            {book.categories?.name || 'Storybook'}
                          </span>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                        </div>
                        
                        <div className="relative z-10">
                          <h3 className="text-xl font-extrabold text-white drop-shadow-md leading-tight line-clamp-3">
                            {book.title}
                          </h3>
                        </div>

                        <div className="relative z-10 flex items-center justify-between text-xs text-white/80 font-medium border-t border-white/20 pt-3">
                          <span>StoryBook Original</span>
                          <span>{book.page_count ? `${book.page_count} Pages` : ''}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${style.bg} ${style.border} ${style.text}`}>
                        {book.categories?.name || 'General'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-purple-300 transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {book.description}
                    </p>
                  </div>
                </div>

                {/* Card Action CTA */}
                <div className="p-5 pt-0">
                  <Link
                    href={`/read/${book.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-950/80 hover:bg-purple-600 border border-purple-500/30 text-purple-200 hover:text-white font-semibold text-xs transition-all duration-300 group-hover:shadow-lg group-hover:shadow-purple-600/20"
                  >
                    <span>Read Storybook</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}

'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TwoDViewer from '@/components/reader/TwoDViewer'
import ThreeDViewer from '@/components/reader/ThreeDViewer'
import { loadPdfDocument, renderPdfPage, RenderedPage } from '@/lib/pdfEngine'
import {
  ArrowLeft,
  Layers,
  Box,
  Maximize2,
  Minimize2,
  Loader2,
  AlertCircle,
  BookOpen,
} from 'lucide-react'

interface ReadPageProps {
  params: Promise<{ bookId: string }>
}

export default function ReadBookPage({ params }: ReadPageProps) {
  const { bookId } = use(params)
  const router = useRouter()

  // Book Metadata & Signed URL state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookTitle, setBookTitle] = useState('Storybook')
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [totalPages, setTotalPages] = useState(1)

  // Reader Mode state (Persisted in localStorage)
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D')
  const [currentPage, setCurrentPage] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [jumpPageInput, setJumpPageInput] = useState('')

  // 1. Load initial view mode preference from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('storybook_view_mode')
    if (savedMode === '2D' || savedMode === '3D') {
      setViewMode(savedMode)
    }
  }, [])

  // 2. Fetch signed URL & initialize PDF document
  useEffect(() => {
    let active = true

    const fetchPdfAndInit = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/books/${bookId}/pdf-url`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load PDF document')
        }

        if (!active) return

        setBookTitle(data.title)

        // Load PDF with pdfjs-dist
        const doc = await loadPdfDocument(data.signedUrl)
        if (!active) return

        setPdfDoc(doc)
        setTotalPages(doc.numPages)
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Error loading storybook')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchPdfAndInit()
    return () => {
      active = false
    }
  }, [bookId])

  // 3. Handle Escape key to return to library & arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/library')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  // Shared Page Getter (Uses global in-memory renderCache inside pdfEngine)
  const getPage = useCallback(
    async (pageIndex: number): Promise<RenderedPage | null> => {
      if (!pdfDoc) return null
      try {
        return await renderPdfPage(pdfDoc, pageIndex, 1.5)
      } catch (err) {
        console.error(`Error rendering page ${pageIndex}:`, err)
        return null
      }
    },
    [pdfDoc]
  )

  // Switch mode and persist to localStorage
  const handleToggleViewMode = (mode: '2D' | '3D') => {
    setViewMode(mode)
    localStorage.setItem('storybook_view_mode', mode)
  }

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  // Handle Page Jump Submit
  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const p = parseInt(jumpPageInput, 10)
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setCurrentPage(p)
      setJumpPageInput('')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-6 text-slate-300">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white mb-1">Opening Storybook...</h2>
        <p className="text-xs text-slate-400">Fetching secure signed PDF stream</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-6">
        <div className="glass-panel p-8 rounded-2xl max-w-md text-center border border-rose-500/30">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Unable to Load Book</h2>
          <p className="text-xs text-slate-400 mb-6">{error}</p>
          <Link
            href="/library"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Library</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 h-screen overflow-hidden">
      
      {/* Top Reader Navigation Header */}
      <header className="z-40 h-16 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between shrink-0">
        
        {/* Left: Back Button & Title */}
        <div className="flex items-center gap-4">
          <Link
            href="/library"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/60 transition-all hover:border-purple-500/40"
            title="Return to library (Esc)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Library</span>
          </Link>

          <div className="h-4 w-[1px] bg-slate-700/60 hidden sm:block" />

          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400 hidden sm:block" />
            <h1 className="text-sm sm:text-base font-bold text-white max-w-[180px] sm:max-w-xs md:max-w-md truncate">
              {bookTitle}
            </h1>
          </div>
        </div>

        {/* Center: Page Indicator & Jump Input */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-medium text-slate-400">Page</span>
            <input
              type="text"
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              placeholder={`${currentPage}`}
              className="w-10 h-7 text-center rounded-lg bg-slate-950 border border-slate-700 text-purple-300 font-mono text-xs focus:outline-none focus:border-purple-500"
            />
            <span className="text-xs font-mono font-medium text-slate-400">
              / {totalPages}
            </span>
          </form>
        </div>

        {/* Right: Mode Switcher & Fullscreen */}
        <div className="flex items-center gap-3">
          
          {/* 2D / 3D Mode Toggle Switch */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => handleToggleViewMode('2D')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === '2D'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2D</span>
            </button>
            <button
              onClick={() => handleToggleViewMode('3D')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === '3D'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D</span>
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

        </div>

      </header>

      {/* Main Reader View Area (Switches seamlessly between 2D and 3D) */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {viewMode === '2D' ? (
          <TwoDViewer
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            getPage={getPage}
          />
        ) : (
          <ThreeDViewer
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            getPage={getPage}
          />
        )}
      </main>

    </div>
  )
}

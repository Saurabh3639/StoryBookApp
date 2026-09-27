'use client'

import { useState, useEffect } from 'react'
import { RenderedPage } from '@/lib/pdfEngine'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid,
  Columns,
  Square,
  Loader2,
} from 'lucide-react'

interface TwoDViewerProps {
  totalPages: number
  currentPage: number
  onPageChange: (newPage: number) => void
  getPage: (pageIndex: number) => Promise<RenderedPage | null>
}

export default function TwoDViewer({
  totalPages,
  currentPage,
  onPageChange,
  getPage,
}: TwoDViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [doublePage, setDoublePage] = useState(false)
  const [currentPageData, setCurrentPageData] = useState<RenderedPage | null>(null)
  const [nextPageData, setNextPageData] = useState<RenderedPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [showThumbnails, setShowThumbnails] = useState(false)
  const [thumbnails, setThumbnails] = useState<(RenderedPage | null)[]>([])

  // Load current page & next page data when page or mode changes
  useEffect(() => {
    let active = true
    setLoading(true)

    const loadPages = async () => {
      const page1 = await getPage(currentPage)
      let page2: RenderedPage | null = null

      if (doublePage && currentPage + 1 <= totalPages) {
        page2 = await getPage(currentPage + 1)
      }

      if (active) {
        setCurrentPageData(page1)
        setNextPageData(page2)
        setLoading(false)
      }
    }

    loadPages()
    return () => {
      active = false
    }
  }, [currentPage, doublePage, totalPages, getPage])

  // Pre-load thumbnails if thumbnail drawer opened
  useEffect(() => {
    if (showThumbnails && thumbnails.length === 0) {
      const loadThumbs = async () => {
        const list: (RenderedPage | null)[] = []
        for (let i = 1; i <= Math.min(totalPages, 50); i++) {
          const p = await getPage(i)
          list.push(p)
        }
        setThumbnails(list)
      }
      loadThumbs()
    }
  }, [showThumbnails, totalPages, getPage, thumbnails.length])

  const handlePrev = () => {
    const step = doublePage ? 2 : 1
    onPageChange(Math.max(1, currentPage - step))
  }

  const handleNext = () => {
    const step = doublePage ? 2 : 1
    onPageChange(Math.min(totalPages, currentPage + step))
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-between relative overflow-hidden select-none">
      
      {/* 2D Control Toolbar */}
      <div className="z-20 my-3 px-4 py-2 rounded-2xl glass-panel flex items-center gap-4 text-xs shadow-xl border border-slate-700/60">
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="w-12 text-center font-mono font-medium text-purple-300">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View Mode Toggle: Single Page vs Double Page */}
        <div className="hidden sm:flex items-center bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setDoublePage(false)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
              !doublePage ? 'bg-purple-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>Single</span>
          </button>
          <button
            onClick={() => setDoublePage(true)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
              doublePage ? 'bg-purple-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Spreads</span>
          </button>
        </div>

        {/* Thumbnails Drawer Trigger */}
        <button
          onClick={() => setShowThumbnails(!showThumbnails)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors ${
            showThumbnails
              ? 'bg-purple-950/80 border-purple-500/40 text-purple-300'
              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span className="hidden sm:inline">Thumbnails</span>
        </button>

      </div>

      {/* Main Page Canvas Display Stage */}
      <div className="flex-1 w-full flex items-center justify-center p-4 overflow-auto relative">
        
        {/* Previous Page Button */}
        <button
          onClick={handlePrev}
          disabled={currentPage <= 1}
          className="absolute left-4 z-20 w-12 h-12 rounded-full glass-panel flex items-center justify-center text-slate-200 hover:text-white hover:border-purple-500/50 hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none shadow-2xl"
          title="Previous Page"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {loading ? (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-sm">Rendering storybook page...</p>
          </div>
        ) : (
          <div
            className="flex items-center justify-center gap-2 transition-transform duration-200 max-w-full max-h-[80vh]"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          >
            {/* Left / Single Page */}
            {currentPageData && (
              <div className="relative rounded-lg overflow-hidden shadow-2xl border border-slate-700/50 page-shadow-left max-h-[75vh]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentPageData.dataUrl}
                  alt={`Page ${currentPage}`}
                  className="max-h-[75vh] object-contain block bg-white"
                />
              </div>
            )}

            {/* Right Page (In Double-Page Spread Mode) */}
            {doublePage && nextPageData && (
              <div className="relative rounded-lg overflow-hidden shadow-2xl border border-slate-700/50 page-shadow-right max-h-[75vh]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={nextPageData.dataUrl}
                  alt={`Page ${currentPage + 1}`}
                  className="max-h-[75vh] object-contain block bg-white"
                />
              </div>
            )}
          </div>
        )}

        {/* Next Page Button */}
        <button
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          className="absolute right-4 z-20 w-12 h-12 rounded-full glass-panel flex items-center justify-center text-slate-200 hover:text-white hover:border-purple-500/50 hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none shadow-2xl"
          title="Next Page"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

      </div>

      {/* Thumbnails Drawer */}
      {showThumbnails && (
        <div className="w-full bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 p-4 z-30 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
              const thumb = thumbnails[pNum - 1]
              const isSelected = pNum === currentPage || (doublePage && pNum === currentPage + 1)

              return (
                <button
                  key={pNum}
                  onClick={() => onPageChange(pNum)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 group transition-all ${
                    isSelected ? 'scale-105' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className={`w-16 h-20 rounded bg-slate-800 border overflow-hidden relative flex items-center justify-center ${
                    isSelected ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-slate-700'
                  }`}>
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb.dataUrl} alt={`Page ${pNum}`} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-slate-500">{pNum}</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-purple-300 font-bold' : 'text-slate-400'}`}>
                    {pNum}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}

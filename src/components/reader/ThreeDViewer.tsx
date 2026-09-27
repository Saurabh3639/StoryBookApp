'use client'

import { useState, useEffect, useRef } from 'react'
import HTMLFlipBook from 'react-pageflip'
import { RenderedPage } from '@/lib/pdfEngine'
import { ChevronLeft, ChevronRight, Loader2, Volume2, VolumeX, Monitor } from 'lucide-react'

interface ThreeDViewerProps {
  totalPages: number
  currentPage: number
  onPageChange: (newPage: number) => void
  getPage: (pageIndex: number) => Promise<RenderedPage | null>
}

export default function ThreeDViewer({
  totalPages,
  currentPage,
  onPageChange,
  getPage,
}: ThreeDViewerProps) {
  const flipBookRef = useRef<any>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [pageImages, setPageImages] = useState<(RenderedPage | null)[]>([])
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Check screen width for mobile responsiveness
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 820)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Pre-load all page images into pageImages array
  useEffect(() => {
    let active = true
    setLoading(true)

    const loadAllPages = async () => {
      const list: (RenderedPage | null)[] = []
      for (let i = 1; i <= totalPages; i++) {
        const pageData = await getPage(i)
        list.push(pageData)
      }
      if (active) {
        setPageImages(list)
        setLoading(false)
      }
    }

    loadAllPages()
    return () => {
      active = false
    }
  }, [totalPages, getPage])

  // Sync flipBook page position when currentPage prop updates externally
  useEffect(() => {
    if (flipBookRef.current && flipBookRef.current.pageFlip() && !loading) {
      const currentFlipIndex = flipBookRef.current.pageFlip().getCurrentPageIndex()
      const targetIndex = currentPage - 1
      if (currentFlipIndex !== targetIndex && targetIndex >= 0) {
        try {
          flipBookRef.current.pageFlip().flip(targetIndex)
        } catch (e) {
          // ignore index bound sync errors
        }
      }
    }
  }, [currentPage, loading])

  // Realistic acoustic paper page flip sound simulation
  const playPageTurnSound = () => {
    if (!soundEnabled) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx()
      }
      const audioCtx = audioCtxRef.current
      if (audioCtx.state === 'suspended') {
        audioCtx.resume()
      }

      const now = audioCtx.currentTime

      // 1. Generate realistic paper friction texture (pink-noise + micro-grain crackle)
      const duration = 0.25 // ~250ms natural page turn duration
      const sampleRate = audioCtx.sampleRate
      const bufferSize = Math.floor(sampleRate * duration)
      const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate)
      const channel = buffer.getChannelData(0)

      let b0 = 0, b1 = 0, b2 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        // Pink noise filtering for warm organic paper friction
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        let val = b0 + b1 + b2 + white * 0.08
        // Micro-crackle simulating paper grain sliding across paper
        if (Math.random() < 0.035) {
          val += (Math.random() * 2 - 1) * 0.4
        }
        channel[i] = val * 0.16
      }

      const noiseSource = audioCtx.createBufferSource()
      noiseSource.buffer = buffer

      // 2. Primary paper "whoosh" resonant bandpass filter (sweeps as page arcs & turns)
      const bandpass = audioCtx.createBiquadFilter()
      bandpass.type = 'bandpass'
      bandpass.Q.setValueAtTime(2.2, now)
      bandpass.frequency.setValueAtTime(750, now)
      // Apex of page turn (mid-flight whoosh)
      bandpass.frequency.exponentialRampToValueAtTime(2800, now + 0.09)
      // Settling down as page lands
      bandpass.frequency.exponentialRampToValueAtTime(600, now + duration)

      // 3. Crisp edge sheen filter (highpass)
      const highpass = audioCtx.createBiquadFilter()
      highpass.type = 'highpass'
      highpass.frequency.setValueAtTime(1400, now)

      // 4. Amplitude Envelope (attack -> dual flutter peak -> smooth paper landing decay)
      const gainNode = audioCtx.createGain()
      gainNode.gain.setValueAtTime(0.001, now)
      gainNode.gain.exponentialRampToValueAtTime(0.45, now + 0.04)
      gainNode.gain.setValueAtTime(0.32, now + 0.09)
      gainNode.gain.exponentialRampToValueAtTime(0.52, now + 0.13)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)

      noiseSource.connect(bandpass)
      bandpass.connect(highpass)
      highpass.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      // 5. Soft page landing tap (low frequency resonance when page lands flat on the book)
      const tapOsc = audioCtx.createOscillator()
      const tapGain = audioCtx.createGain()
      tapOsc.type = 'sine'
      tapOsc.frequency.setValueAtTime(110, now + 0.09)
      tapOsc.frequency.exponentialRampToValueAtTime(40, now + 0.22)

      tapGain.gain.setValueAtTime(0.001, now + 0.09)
      tapGain.gain.exponentialRampToValueAtTime(0.18, now + 0.12)
      tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

      tapOsc.connect(tapGain)
      tapGain.connect(audioCtx.destination)

      noiseSource.start(now)
      noiseSource.stop(now + duration)
      tapOsc.start(now + 0.09)
      tapOsc.stop(now + 0.22)
    } catch {
      // AudioContext fallback
    }
  }

  const handleFlip = (e: any) => {
    const newIndex = e.data + 1
    onPageChange(newIndex)
    playPageTurnSound()
  }

  const handlePrev = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipPrev()
    }
  }

  const handleNext = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipNext()
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-between relative overflow-hidden select-none reader-wood-surface w-full h-full">
      
      {/* 3D Stage Top Toolbar */}
      <div className="z-20 my-3 px-4 py-2 rounded-2xl glass-panel flex items-center gap-4 text-xs shadow-2xl border border-slate-700/60">
        <span className="text-purple-300 font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>3D Interactive Flipbook</span>
        </span>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border transition-colors ${
            soundEnabled
              ? 'bg-purple-950/80 border-purple-500/40 text-purple-300'
              : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}
          title="Toggle page flip sound"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Flip Sound</span>
        </button>
      </div>

      {/* Mobile Notice Banner */}
      {isMobile && (
        <div className="mx-4 mb-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 z-20 text-center">
          <Monitor className="w-4 h-4 text-amber-400 shrink-0" />
          <span>💡 3D page flip effects are optimized for desktop screens. You can switch to 2D view anytime.</span>
        </div>
      )}

      {/* Main 3D Book Stage */}
      <div className="flex-1 w-full flex items-center justify-center p-4 relative overflow-hidden">
        
        {/* Left Nav Button */}
        <button
          onClick={handlePrev}
          disabled={currentPage <= 1}
          className="absolute left-4 z-30 w-12 h-12 rounded-full glass-panel flex items-center justify-center text-slate-200 hover:text-white hover:border-purple-500/50 hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none shadow-2xl"
          title="Turn Page Back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {loading ? (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-sm font-medium">Preparing 3D page textures...</p>
          </div>
        ) : (
          <div className="flex items-center justify-center relative drop-shadow-[0_25px_35px_rgba(0,0,0,0.7)] py-4">
            
            {/* @ts-ignore */}
            <HTMLFlipBook
              ref={flipBookRef}
              width={isMobile ? 320 : 460}
              height={isMobile ? 460 : 640}
              size="fixed"
              minWidth={280}
              maxWidth={550}
              minHeight={400}
              maxHeight={750}
              maxShadowOpacity={0.6}
              showCover={true}
              mobileScrollSupport={true}
              onFlip={handleFlip}
              className="storybook-flipbook rounded-lg shadow-2xl"
            >
              {pageImages.map((page, idx) => (
                <div
                  key={idx}
                  className="page bg-white relative overflow-hidden border border-slate-300 shadow-md"
                >
                  {page ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={page.dataUrl}
                      alt={`Page ${idx + 1}`}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-amber-50/20 text-slate-400 text-xs">
                      Page {idx + 1}
                    </div>
                  )}

                  {/* Spine Center Shadow Overlay */}
                  <div className={`absolute top-0 bottom-0 w-8 pointer-events-none ${
                    idx % 2 === 0
                      ? 'right-0 bg-gradient-to-l from-black/25 to-transparent'
                      : 'left-0 bg-gradient-to-r from-black/25 to-transparent'
                  }`} />
                </div>
              ))}
            </HTMLFlipBook>

          </div>
        )}

        {/* Right Nav Button */}
        <button
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          className="absolute right-4 z-30 w-12 h-12 rounded-full glass-panel flex items-center justify-center text-slate-200 hover:text-white hover:border-purple-500/50 hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none shadow-2xl"
          title="Turn Page Forward"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

      </div>

    </div>
  )
}

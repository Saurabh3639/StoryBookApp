import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookOpen, Sparkles, Layers, ShieldCheck, ArrowRight, BookMarked, Eye } from 'lucide-react'

export default async function HomePage() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      redirect('/library')
    }
  } catch (error: any) {
    if (error?.digest === 'DYNAMIC_SERVER_USAGE' || error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    console.error('Home auth check:', error)
  }

  return (
    <div className="flex-1 flex flex-col justify-center items-center relative overflow-hidden px-4 py-16 sm:py-24">
      {/* Background Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-pink-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300 text-xs font-semibold tracking-wide mb-8 shadow-lg shadow-purple-950/50">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span>Next-Gen Storybook Reader</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Bedtime stories,{' '}
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300 bg-clip-text text-transparent">
            beautifully told.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Step into an enchanted library of storybooks. Toggle seamlessly between clean 2D reading and immersive 3D page-flipping views anytime.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-base shadow-xl shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Start Reading Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 font-semibold text-base transition-all hover:border-slate-500"
          >
            <span>Sign In to Account</span>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
          
          <div className="p-6 rounded-2xl glass-card">
            <div className="w-12 h-12 rounded-xl bg-purple-900/50 border border-purple-500/30 flex items-center justify-center mb-4 text-purple-400">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">2D & 3D Page Turning</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Switch anytime between smooth single/double page viewing and realistic 3D paper curling flip experience.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card">
            <div className="w-12 h-12 rounded-xl bg-pink-900/50 border border-pink-500/30 flex items-center justify-center mb-4 text-pink-400">
              <BookMarked className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Curated Categories</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Explore Fairy Tales, Adventure, Animals, and Bedtime stories sorted into easy filterable collections.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card">
            <div className="w-12 h-12 rounded-xl bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center mb-4 text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Secure PDF Storage</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Protected PDF storage powered by Supabase RLS and server-signed URLs for maximum security.
            </p>
          </div>

        </div>

      </div>
    </div>
  )
}

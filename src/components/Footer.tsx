'use client'

import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()

  // Do not render footer on full-screen reader pages
  if (pathname.startsWith('/read/')) {
    return null
  }

  return (
    <footer className="w-full border-t border-slate-900 bg-slate-950/80 backdrop-blur-sm py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs sm:text-sm text-slate-500 font-medium tracking-wide">
          Copyright © StoryBook 2026.
        </p>
      </div>
    </footer>
  )
}

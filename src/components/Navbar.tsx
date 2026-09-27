'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Shield, LogOut, User as UserIcon, Sparkles, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface NavbarProps {
  userEmail?: string | null
  userFullName?: string | null
  userRole?: string | null
}

export default function Navbar({ userEmail, userFullName, userRole }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Show Full Name if there is Full Name, otherwise show Email
  const [displayName, setDisplayName] = useState<string>(() => {
    if (userFullName && userFullName.trim()) return userFullName.trim()
    return userEmail || ''
  })
  const [role, setRole] = useState<string | null>(userRole || null)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-close mobile menu on route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Update when server-rendered props change
  useEffect(() => {
    if (userFullName && userFullName.trim()) {
      setDisplayName(userFullName.trim())
    } else if (userEmail) {
      setDisplayName(userEmail)
    }
    if (userRole) setRole(userRole)
  }, [userFullName, userEmail, userRole])

  // Real-time client sync: ensures metadata from signup/session is immediately reflected
  useEffect(() => {
    let isMounted = true
    const syncCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !isMounted) return

        const metaName = (user.user_metadata?.full_name as string)?.trim() || (user.user_metadata?.name as string)?.trim()
        if (metaName) {
          setDisplayName(metaName)
        } else if (user.email && !displayName) {
          setDisplayName(user.email)
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profile && isMounted && profile.role) {
          setRole(profile.role)
        }
      } catch (err) {
        // silent fallback
      }
    }

    syncCurrentUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user && isMounted) {
        const metaName = (session.user.user_metadata?.full_name as string)?.trim() || (session.user.user_metadata?.name as string)?.trim()
        if (metaName) {
          setDisplayName(metaName)
        } else if (session.user.email) {
          setDisplayName(session.user.email)
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, displayName])

  const handleSignOut = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)

    // Safety timeout: redirects within 2 seconds unconditionally, preventing the button from ever freezing
    const redirectTimeout = setTimeout(() => {
      window.location.href = '/login'
    }, 2000)

    try {
      // 1. Supabase browser client signOut with quick timeout
      const clientSignOut = supabase.auth.signOut().catch(() => {})
      const timeout = new Promise((resolve) => setTimeout(resolve, 800))
      await Promise.race([clientSignOut, timeout])
    } catch (err) {
      console.warn('Client signOut fallback:', err)
    }

    try {
      // 2. Clear server-side session cookies via route handler
      await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {})
    } catch (_) {}

    // 3. Clear any cached auth items from localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          localStorage.removeItem(key)
        }
      }
    } catch (_) {}

    clearTimeout(redirectTimeout)
    // 4. Hard redirect to /login to ensure all client & server state is fresh
    window.location.href = '/login'
  }


  // Don't render top nav on reader full-screen page if needed, or render sleek version
  if (pathname.startsWith('/read/')) {
    return null
  }

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 border-none ${scrolled ? 'glass-nav shadow-xl shadow-black/30 py-3' : 'bg-slate-900/60 backdrop-blur-md py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <Link href={userEmail ? '/library' : '/'} className="flex items-center gap-2.5 sm:gap-3 group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 p-0.5 shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform shrink-0">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 group-hover:text-pink-400 transition-colors" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-200 bg-clip-text text-transparent">
                StoryBook
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Bedtime stories, beautifully told
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-4 sm:gap-6">
          {userEmail ? (
            <>
              <Link
                href="/library"
                className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  pathname === '/library'
                    ? 'text-purple-300 bg-purple-950/60 border border-purple-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Library</span>
              </Link>

              {role === 'admin' && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    pathname.startsWith('/admin')
                      ? 'text-amber-300 bg-amber-950/60 border border-amber-500/30'
                      : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-950/40'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </Link>
              )}

              {/* User Identity Badge & Signout */}
              <div className="flex items-center gap-2 sm:gap-3 pl-2 border-l border-slate-700/60">
                <Link
                  href="/profile"
                  className={`flex items-center gap-1.5 sm:gap-2 text-xs px-2.5 py-1 rounded-full border transition-all duration-200 max-w-[160px] sm:max-w-[220px] group ${
                    pathname === '/profile'
                      ? 'bg-purple-950/80 border-purple-500/60 text-white shadow-sm shadow-purple-500/30 ring-1 ring-purple-500/40'
                      : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/40 hover:border-purple-500/40 text-slate-300 hover:text-white'
                  }`}
                  title={userEmail ? `Signed in as ${userEmail} • Click to open profile` : `${displayName} • Click to open profile`}
                >
                  <UserIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-400 transition-colors shrink-0" />
                  <span className="truncate font-medium text-slate-200 group-hover:text-white">
                    {displayName}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-rose-400 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 hover:border-rose-500/40 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-4 py-1.5 rounded-lg shadow-md shadow-purple-600/20 transition-all hover:scale-105"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Navigation Controls */}
        <div className="flex md:hidden items-center gap-2">
          {userEmail && (
            <Link
              href="/profile"
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all max-w-[125px] sm:max-w-[150px] group ${
                pathname === '/profile'
                  ? 'bg-purple-950/80 border-purple-500/60 text-white'
                  : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/40 text-slate-300'
              }`}
              title={displayName}
            >
              <UserIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-400 shrink-0" />
              <span className="truncate font-medium text-slate-200">
                {displayName}
              </span>
            </Link>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-all focus:outline-none"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-purple-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Slide-Down Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-2xl px-4 py-5 shadow-2xl space-y-4 animate-fadeIn">
          {userEmail ? (
            <>
              {/* User Identity Card */}
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 flex-shrink-0">
                    <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-purple-300 font-bold text-sm">
                      {displayName.slice(0, 2).toUpperCase() || <UserIcon className="w-4 h-4" />}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                      {role === 'admin' && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{userEmail}</p>
                  </div>
                </div>
                <span className="text-xs text-purple-400 group-hover:translate-x-0.5 transition-transform font-medium shrink-0 ml-2">
                  Profile →
                </span>
              </Link>

              {/* Navigation Links */}
              <div className="space-y-1.5 pt-1">
                <Link
                  href="/library"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    pathname === '/library'
                      ? 'text-purple-300 bg-purple-950/60 border border-purple-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <span>Library Catalog</span>
                </Link>

                {role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      pathname.startsWith('/admin')
                        ? 'text-amber-300 bg-amber-950/60 border border-amber-500/30'
                        : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-950/30'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Admin Dashboard</span>
                  </Link>
                )}

                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    pathname === '/profile'
                      ? 'text-purple-300 bg-purple-950/60 border border-purple-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-purple-400" />
                  <span>Account & Security</span>
                </Link>
              </div>

              {/* Sign Out Button */}
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleSignOut()
                  }}
                  disabled={isLoggingOut}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2.5 pt-1">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 px-4 rounded-xl text-sm font-medium text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/30 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

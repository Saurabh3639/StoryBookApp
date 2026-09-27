import type { Metadata } from 'next'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'StoryBook — Bedtime stories, beautifully told',
  description: 'Interactive storybook reader with 2D and 3D page flip experience for enchanted reading.',
}

export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let userEmail: string | null = null
  let userFullName: string | null = null
  let userRole: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      userEmail = user.email || null
      // Check user_metadata (from signup/auth session)
      const metaName = (user.user_metadata?.full_name as string)?.trim() || (user.user_metadata?.name as string)?.trim()
      if (metaName) {
        userFullName = metaName
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.role) {
          userRole = profile.role
        }
      } catch (err) {
        console.warn('Profile read fallback in layout:', err)
      }
    }
  } catch (error: any) {
    if (error?.digest === 'DYNAMIC_SERVER_USAGE') {
      throw error
    }
    // If env vars are not set up yet or connection failed during initial load
    console.error('Supabase init in layout:', error)
  }

  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-purple-500 selection:text-white">
        <Navbar userEmail={userEmail} userFullName={userFullName} userRole={userRole} />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}

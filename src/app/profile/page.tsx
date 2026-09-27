import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileClient, { InitialUserProfile } from './ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  let userRole = 'user'
  let fullName = (user.user_metadata?.full_name as string)?.trim() || (user.user_metadata?.name as string)?.trim() || ''

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
    console.warn('Profile read fallback in profile page:', err)
  }

  // Double check metadata fallback if role is still user
  if (userRole === 'user') {
    const metaRole = (user.app_metadata?.role as string) || (user.user_metadata?.role as string)
    if (metaRole) {
      userRole = metaRole
    }
  }

  const initialUser: InitialUserProfile = {
    id: user.id,
    email: user.email || '',
    fullName,
    role: userRole,
    createdAt: user.created_at || null,
  }

  return <ProfileClient initialUser={initialUser} />
}

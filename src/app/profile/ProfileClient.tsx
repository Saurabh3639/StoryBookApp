'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  User,
  Mail,
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Calendar,
  BookOpen,
  Sparkles,
  RefreshCw,
} from 'lucide-react'

export interface InitialUserProfile {
  id: string
  email: string
  fullName: string
  role: string
  createdAt: string | null
}

interface ProfileClientProps {
  initialUser: InitialUserProfile
}

export default function ProfileClient({ initialUser }: ProfileClientProps) {
  const router = useRouter()
  const supabase = createClient()

  // User state initialized directly from server-rendered data
  const [userId] = useState<string>(initialUser.id)
  const [email] = useState<string>(initialUser.email)
  const [displayedName, setDisplayedName] = useState<string>(initialUser.fullName)
  const [fullNameInput, setFullNameInput] = useState<string>(initialUser.fullName)
  const [role, setRole] = useState<string>(initialUser.role || 'user')
  const [createdAt] = useState<string | null>(initialUser.createdAt)

  // Profile Update form state
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Reset Password form state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Double check client side role sync
  useEffect(() => {
    let isMounted = true
    const checkClientRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !isMounted) return

        // 1. Check profiles table for role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profile && isMounted && profile.role) {
          setRole(profile.role)
        } else if (user && isMounted) {
          // Fallback to metadata
          const metaRole = (user.app_metadata?.role as string) || (user.user_metadata?.role as string)
          if (metaRole) setRole(metaRole)
        }
      } catch (err) {
        // silent fallback to server-provided initialUser
      }
    }

    checkClientRole()

    return () => {
      isMounted = false
    }
  }, [supabase])

  // Handle Profile Information Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileError(null)
    setProfileSuccess(null)

    const trimmedName = fullNameInput.trim()

    try {
      // 1. Update Auth User Metadata
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: { full_name: trimmedName },
      })

      if (authUpdateError) {
        throw new Error(authUpdateError.message)
      }

      // 2. Update public.profiles table (if column exists)
      try {
        if (userId) {
          await supabase
            .from('profiles')
            .update({ full_name: trimmedName })
            .eq('id', userId)
        }
      } catch (profileErr) {
        console.warn('Optional profiles.full_name update note:', profileErr)
      }

      setDisplayedName(trimmedName)
      setProfileSuccess('Profile details updated successfully!')
      router.refresh()

      setTimeout(() => {
        setProfileSuccess(null)
      }, 4000)
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile details.')
    } finally {
      setProfileSaving(false)
    }
  }

  // Handle Reset / Change Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (!newPassword) {
      setPasswordError('Please enter a new password.')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.')
      return
    }

    setPasswordSaving(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        throw new Error(error.message)
      }

      setPasswordSuccess('Password has been successfully updated!')
      setNewPassword('')
      setConfirmPassword('')

      setTimeout(() => {
        setPasswordSuccess(null)
      }, 5000)
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.')
    } finally {
      setPasswordSaving(false)
    }
  }

  // Format date nicely
  const formattedJoinDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  // Initials for avatar based on saved displayedName
  const initials = displayedName.trim()
    ? displayedName
        .trim()
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : email.slice(0, 2).toUpperCase()

  const isAdmin = (role || '').trim().toLowerCase() === 'admin'

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
      
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/library"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors bg-slate-900/60 hover:bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </Link>
      </div>

      {/* Profile Header Hero Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl mb-8 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar */}
          <div className="relative group">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-0.5 shadow-xl transition-all ${
              isAdmin
                ? 'bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 shadow-amber-500/20'
                : 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 shadow-purple-500/20'
            }`}>
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-tr from-purple-200 via-pink-200 to-amber-200">
                {initials || <User className="w-10 h-10 text-purple-400" />}
              </div>
            </div>
            <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border ${
              isAdmin ? 'bg-amber-950 border-amber-500/50' : 'bg-slate-900 border-slate-700'
            }`}>
              {isAdmin ? (
                <Shield className="w-4 h-4 text-amber-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-400" />
              )}
            </div>
          </div>

          {/* User Meta */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {displayedName.trim() || 'StoryBook User'}
              </h1>
              {isAdmin ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full shadow-sm shadow-amber-500/20">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full shadow-sm shadow-purple-500/20">
                  <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                  Reader
                </span>
              )}
            </div>

            <p className="text-sm text-slate-400 mb-3 flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>{email}</span>
            </p>

            {formattedJoinDate && (
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Joined {formattedJoinDate}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Profile Info & Reset Password */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Card 1: Profile Information */}
        <div className="glass-panel p-6 sm:p-7 rounded-2xl shadow-lg border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                <User className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Profile Information</h2>
                <p className="text-xs text-slate-400">Update your account name and identity</p>
              </div>
            </div>

            {profileSuccess && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form id="profile-info-form" onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  This name is displayed in the navigation bar and across the platform.
                </p>
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 cursor-not-allowed text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Email is linked to your authentication login credentials.
                </p>
              </div>

              {/* Account Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Account Role
                </label>
                <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isAdmin
                    ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {isAdmin ? (
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-amber-400" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-purple-400" />
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-semibold capitalize text-white block">
                        {isAdmin ? 'Administrator' : 'Standard Reader'}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {isAdmin ? 'Full administrative & catalog publishing access' : 'Standard reader access to library books'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-mono px-2.5 py-1 rounded-md border font-semibold shrink-0 ${
                    isAdmin
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    {isAdmin ? 'Full Admin Access' : 'Read Access'}
                  </span>
                </div>
              </div>
            </form>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-800">
            <button
              type="submit"
              form="profile-info-form"
              disabled={profileSaving}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-md shadow-purple-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {profileSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update Profile</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 2: Reset / Change Password */}
        <div className="glass-panel p-6 sm:p-7 rounded-2xl shadow-lg border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Reset Password</h2>
                <p className="text-xs text-slate-400">Set a new secure password for your account</p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form id="reset-password-form" onSubmit={handleUpdatePassword} className="space-y-4">
              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Match Status helper */}
                {confirmPassword && (
                  <p className={`text-[11px] mt-1.5 flex items-center gap-1.5 ${
                    newPassword === confirmPassword ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {newPassword === confirmPassword ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Passwords match</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Passwords do not match yet</span>
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Password Requirement Notes */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Security Tips:</p>
                <p>• Use a minimum of 6 characters.</p>
                <p>• Include a mix of letters, numbers, and symbols for stronger protection.</p>
              </div>
            </form>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-800">
            <button
              type="submit"
              form="reset-password-form"
              disabled={passwordSaving || !newPassword || !confirmPassword}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold text-sm shadow-md shadow-pink-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {passwordSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

    </div>
  )
}

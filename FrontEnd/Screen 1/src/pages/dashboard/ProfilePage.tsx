import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardCard } from '@/components/dashboard/ui/DashboardCard'
import { AmbientPageBackground } from '@/components/dashboard/ui/AmbientPageBackground'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/ToastProvider'
import { loadUserPreferences, saveUserPreferences } from '@/lib/userPreferences'
import { useStudyMetrics } from '@/hooks/useStudyMetrics'
import { useLectures } from '@/context/LectureContext'
import {
  changePassword,
  hasPasswordProvider,
  isGoogleOnlyUser,
  requestEmailChange,
  updateDisplayName,
  uploadProfilePhoto,
  fetchUserProfile,
  updateUserProfile,
  getCachedProfile,
} from '@/services/profileService'
import { getAuthErrorMessage } from '@/lib/authErrors'
import { cn } from '@/lib/utils'

export function ProfilePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { metrics, loading: metricsLoading } = useStudyMetrics()
  const { lectures, loading: lecturesLoading } = useLectures()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [course, setCourse] = useState('')
  const [studyGoal, setStudyGoal] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [dirty, setDirty] = useState(false)

  const canChangePassword = user ? hasPasswordProvider(user) : false
  const isGoogleUser = user ? isGoogleOnlyUser(user) : false

  // Load auth preferences & Supabase user profile
  useEffect(() => {
    if (!user) return
    const prefs = loadUserPreferences(user.uid)
    setDisplayName(user.displayName ?? '')
    setEmail(user.email ?? '')
    setBio(prefs.bio)
    setPhotoUrl(user.photoURL)

    async function loadDbProfile() {
      try {
        const dbProfile = await fetchUserProfile()
        setCourse(dbProfile.course || '')
        setStudyGoal(dbProfile.studyGoal || '')
      } catch (err) {
        console.error('Failed to fetch user profile database record:', err)
      }
    }
    void loadDbProfile()
    setDirty(false)
  }, [user])

  const markDirty = useCallback(() => setDirty(true), [])

  const handleCancel = () => {
    if (!user) return
    const prefs = loadUserPreferences(user.uid)
    setDisplayName(user.displayName ?? '')
    setEmail(user.email ?? '')
    setBio(prefs.bio)
    setPhotoUrl(user.photoURL)
    setCurrentPassword('')
    setNewPassword('')
    setEmailPassword('')

    const cached = getCachedProfile()
    if (cached) {
      setCourse(cached.course || '')
      setStudyGoal(cached.studyGoal || '')
    }

    setDirty(false)
  }

  const handlePhotoSelect = async (file: File) => {
    if (!user) return
    setUploadingPhoto(true)
    try {
      const url = await uploadProfilePhoto(user.uid, file)
      setPhotoUrl(url)
      toast.success('Profile photo updated.')
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)

    try {
      const prefs = loadUserPreferences(user.uid)
      const nameChanged = displayName.trim() !== (user.displayName ?? '')
      const bioChanged = bio !== prefs.bio
      const emailChanged = email.trim() !== (user.email ?? '')

      const cached = getCachedProfile()
      const dbCourse = cached?.course || ''
      const dbStudyGoal = cached?.studyGoal || ''
      const dbFieldsChanged = course.trim() !== dbCourse || studyGoal.trim() !== dbStudyGoal

      if (nameChanged) {
        await updateDisplayName(displayName)
      }

      if (bioChanged) {
        saveUserPreferences(user.uid, { ...prefs, bio: bio.trim() })
      }

      if (dbFieldsChanged) {
        await updateUserProfile({
          course: course.trim(),
          studyGoal: studyGoal.trim(),
        })
      }

      if (emailChanged && !isGoogleUser) {
        await requestEmailChange(email, emailPassword)
        toast.success('Email updated. Check your inbox to verify the new address.')
      }

      if (canChangePassword && newPassword) {
        await changePassword(currentPassword, newPassword)
        setCurrentPassword('')
        setNewPassword('')
        toast.success('Password updated.')
      }

      if (!emailChanged && !nameChanged && !bioChanged && !dbFieldsChanged && !newPassword) {
        toast.error('No changes to save.')
        return
      }

      toast.success('Profile saved.')
      setDirty(false)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const initials = (displayName || email || 'S').charAt(0).toUpperCase()

  return (
    <DashboardPageShell>
      <FadeUp>
        <DashboardPageHeader
          title="Profile"
          description="Manage your personal information and how you appear in LecturePulse."
        />
      </FadeUp>

      <FadeUp delay={0.1}>
        <div className="relative max-w-2xl">
          <AmbientPageBackground variant="gold" className="rounded-3xl" />
          <DashboardCard className="relative">
            
            {/* Avatar & Basic Info */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="relative shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={displayName}
                    className="h-24 w-24 rounded-2xl border border-white/10 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-2xl font-semibold text-accent">
                    {initials}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className={cn(
                    'absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl',
                    'border border-white/[0.1] bg-card text-muted hover:text-accent transition-colors cursor-pointer',
                  )}
                  aria-label="Change photo"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handlePhotoSelect(file)
                    e.target.value = ''
                  }}
                />
              </div>

              {/* Display Name & Email */}
              <div className="flex-1 space-y-5">
                <label className="block">
                  <span className="text-xs font-medium text-muted">Display name</span>
                  <input
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value)
                      markDirty()
                    }}
                    className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/30 transition-colors"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-muted">Email address</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      markDirty()
                    }}
                    disabled={isGoogleUser}
                    className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/30 transition-colors disabled:opacity-50"
                  />
                  {isGoogleUser && (
                    <p className="mt-1 text-xs text-muted">
                      Managed by your Google account.
                    </p>
                  )}
                </label>

                {!isGoogleUser && email !== (user?.email ?? '') && (
                  <label className="block">
                    <span className="text-xs font-medium text-muted">
                      Current password (required to change email)
                    </span>
                    <input
                      type="password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/30"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 gap-4 mt-8">
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-accent/25 hover:bg-white/[0.04] transition-all duration-300">
                <span className="text-xl sm:text-2xl font-bold text-accent">
                  {lecturesLoading ? '...' : lectures.length}
                </span>
                <span className="text-[10px] sm:text-xs text-muted mt-1 select-none text-center">Total Lectures</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-accent/25 hover:bg-white/[0.04] transition-all duration-300">
                <span className="text-xl sm:text-2xl font-bold text-accent">
                  {metricsLoading ? '...' : `${metrics.streakDays}d`}
                </span>
                <span className="text-[10px] sm:text-xs text-muted mt-1 select-none text-center">Study Streak</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-accent/25 hover:bg-white/[0.04] transition-all duration-300">
                <span className="text-xl sm:text-2xl font-bold text-accent">
                  {metricsLoading ? '...' : `${metrics.masteredCards}/${metrics.totalCards}`}
                </span>
                <span className="text-[10px] sm:text-xs text-muted mt-1 select-none text-center">Cards Mastered</span>
              </div>
            </div>

            {/* Course, Study Goal & Bio Fields */}
            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="text-xs font-medium text-muted">Course / Major</span>
                <input
                  value={course}
                  onChange={(e) => {
                    setCourse(e.target.value)
                    markDirty()
                  }}
                  placeholder="e.g. Computer Science, Medicine"
                  className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/30 transition-colors"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-muted">Study Goal</span>
                <textarea
                  value={studyGoal}
                  onChange={(e) => {
                    setStudyGoal(e.target.value)
                    markDirty()
                  }}
                  rows={3}
                  placeholder="Describe what you want to achieve or learn..."
                  className="mt-1.5 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/30"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-muted">Bio (optional)</span>
                <textarea
                  value={bio}
                  onChange={(e) => {
                    setBio(e.target.value)
                    markDirty()
                  }}
                  rows={3}
                  maxLength={280}
                  placeholder="A short note about your studies or goals…"
                  className="mt-1.5 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/30"
                />
              </label>

              {canChangePassword && (
                <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-sm font-medium text-foreground">Change password</p>
                  <input
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value)
                      markDirty()
                    }}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/30"
                  />
                  <input
                    type="password"
                    placeholder="New password (min. 8 characters)"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      markDirty()
                    }}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/30"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-wrap gap-3 border-t border-white/[0.06] pt-6">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !dirty}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-background',
                  'hover:bg-accent-soft transition-all cursor-pointer disabled:opacity-40',
                )}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving || !dirty}
                className="rounded-full border border-white/[0.1] px-6 py-2.5 text-sm text-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </DashboardCard>
        </div>
      </FadeUp>
    </DashboardPageShell>
  )
}

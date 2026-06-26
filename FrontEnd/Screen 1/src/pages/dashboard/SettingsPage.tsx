import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Bell,
  CreditCard,
  Download,
  Globe,
  Loader2,
  Settings,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { AccountSectionShell } from '@/components/account/AccountSectionShell'
import { DeleteAccountModal } from '@/components/account/DeleteAccountModal'
import { useAuth } from '@/hooks/useAuth'
import { useLectures } from '@/hooks/useLectures'
import { useToast } from '@/components/ui/ToastProvider'
import { useTheme } from '@/context/ThemeContext'
import { useI18n } from '@/context/I18nContext'
import { loadUserPreferences, saveUserPreferences } from '@/lib/userPreferences'
import { exportUserDataArchive } from '@/services/dataExportService'
import { fetchUserProfile, updateUserProfile, type UserProfile } from '@/services/profileService'
import type { UserPreferences } from '@/types/userPreferences'
import { getAuthErrorMessage } from '@/lib/authErrors'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Data', icon: Shield },
  { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
  { id: 'ai', label: 'AI Preferences', icon: Sparkles },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description?: string
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer',
          checked ? 'bg-accent/80' : 'bg-white/[0.12]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  )
}

export function SettingsPage() {
  const { user } = useAuth()
  const { lectures } = useLectures()
  const { toast } = useToast()
  const { themePreference, setThemePreference, fontSize, setFontSize } = useTheme()
  const { setLocale, translate } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const [prefs, setPrefs] = useState<UserPreferences | null>(null)
  const [dbProfile, setDbProfile] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loadingDb, setLoadingDb] = useState(true)

  const activeSection = (searchParams.get('section') as SectionId) || 'general'

  useEffect(() => {
    if (!user) return
    setPrefs(loadUserPreferences(user.uid))
  }, [user])

  useEffect(() => {
    if (!user) return
    async function loadDbProfile() {
      try {
        const profile = await fetchUserProfile()
        setDbProfile(profile)
      } catch (err) {
        console.error('Failed to load user profile in settings:', err)
      } finally {
        setLoadingDb(false)
      }
    }
    void loadDbProfile()
  }, [user])

  const setSection = useCallback(
    (id: string) => {
      setSearchParams({ section: id })
    },
    [setSearchParams],
  )

  const updatePrefs = useCallback((patch: Partial<UserPreferences>) => {
    setPrefs((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const handleAutoSaveProfile = async (patch: Partial<UserProfile>) => {
    try {
      const updated = await updateUserProfile(patch)
      setDbProfile(updated)
      toast.success('Settings auto-saved.')
    } catch (err) {
      toast.error('Failed to save settings.')
    }
  }

  const handleToggleReminder = async (checked: boolean) => {
    if (checked && 'Notification' in window && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('Notification permission denied. Enable it in browser settings.')
        return
      }
    }
    await handleAutoSaveProfile({ dailyReminder: checked })
  }

  const handleToggleStreakAlerts = async (checked: boolean) => {
    if (checked && 'Notification' in window && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('Notification permission denied. Enable it in browser settings.')
        return
      }
    }
    await handleAutoSaveProfile({ streakAlerts: checked })
  }

  const handleSave = async () => {
    if (!user || !prefs) return
    setSaving(true)
    try {
      saveUserPreferences(user.uid, prefs)
      toast.success('Settings saved.')
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    if (!user) return
    setExporting(true)
    try {
      await exportUserDataArchive(user.uid)
      toast.success('Your data export has started downloading.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  const lectureCount = lectures.length
  const usagePlaceholder = useMemo(
    () => ({
      plan: 'Free',
      lecturesUsed: lectureCount,
      lecturesLimit: 50,
      minutesUsed: lectures.reduce((sum, l) => sum + (l.duration ?? 0), 0),
      minutesLimit: 600,
    }),
    [lectureCount, lectures],
  )

  if (!prefs) return null

  return (
    <>
      <AccountSectionShell
        title="Settings"
        description="Configure how LecturePulse works for you."
        sections={SECTIONS.map((s) => ({ id: s.id, label: s.label, icon: s.icon }))}
        activeSection={activeSection}
        onSectionChange={setSection}
      >
        {activeSection === 'general' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">General</h2>
              <p className="mt-1 text-sm text-muted">
                Configure your app appearance, sizing, and language.
              </p>
            </div>

            {/* Theme Preference Selector */}
            <label className="block">
              <span className="text-xs font-medium text-muted">Theme Preference</span>
              <div className="relative mt-1.5">
                <select
                  value={themePreference}
                  onChange={(e) => setThemePreference(e.target.value as any)}
                  className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/30 cursor-pointer"
                >
                  <option value="light" className="bg-card">Light Mode</option>
                  <option value="dark" className="bg-card">Dark Mode</option>
                  <option value="system" className="bg-card">System Settings</option>
                </select>
              </div>
            </label>

            {/* Font Size Selector */}
            <label className="block">
              <span className="text-xs font-medium text-muted">Font Size</span>
              <div className="relative mt-1.5">
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value as any)}
                  className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/30 cursor-pointer"
                >
                  <option value="small" className="bg-card">Small (14px)</option>
                  <option value="medium" className="bg-card">Medium (16px)</option>
                  <option value="large" className="bg-card">Large (18px)</option>
                </select>
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted">{translate('settings.language')}</span>
              <div className="relative mt-1.5">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <select
                  value={prefs.general.language}
                  onChange={(e) => {
                    const language = e.target.value
                    updatePrefs({ general: { ...prefs.general, language } })
                    setLocale(language === 'hi' ? 'hi' : 'en')
                  }}
                  className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-foreground outline-none focus:border-accent/30 cursor-pointer"
                >
                  <option value="en" className="bg-card">English</option>
                  <option value="hi" className="bg-card">Hindi</option>
                  <option value="hinglish" className="bg-card">Hinglish</option>
                </select>
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted">Timezone</span>
              <input
                value={prefs.general.timezone}
                onChange={(e) =>
                  updatePrefs({ general: { ...prefs.general, timezone: e.target.value } })
                }
                className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/30"
              />
            </label>
          </div>
        )}

        {activeSection === 'notifications' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
              <p className="mt-1 text-sm text-muted">
                Choose how LecturePulse keeps you updated with study reminders and alerts.
              </p>
            </div>

            {!loadingDb && dbProfile && (
              <>
                <Toggle
                  checked={dbProfile.dailyReminder}
                  onChange={handleToggleReminder}
                  label="Daily study reminder"
                  description="Receive push notifications to remind you to review lectures"
                />

                {dbProfile.dailyReminder && (
                  <div className="flex items-center gap-3 pl-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2 mt-1">
                    <span className="text-xs text-muted">Daily reminder time:</span>
                    <input
                      type="time"
                      value={dbProfile.dailyReminderTime || '09:00'}
                      onChange={(e) => handleAutoSaveProfile({ dailyReminderTime: e.target.value })}
                      className="rounded-lg border border-white/[0.08] bg-card px-3 py-1 text-sm text-foreground outline-none focus:border-accent/30"
                    />
                  </div>
                )}

                <Toggle
                  checked={dbProfile.streakAlerts}
                  onChange={handleToggleStreakAlerts}
                  label="Streak alerts"
                  description="Get alerts before your daily study streak is broken"
                />
              </>
            )}

            <Toggle
              checked={prefs.notifications.notesReady}
              onChange={(v) =>
                updatePrefs({ notifications: { ...prefs.notifications, notesReady: v } })
              }
              label="Notes ready"
              description="Email me when AI notes finish processing"
            />
            <Toggle
              checked={prefs.notifications.weeklyDigest}
              onChange={(v) =>
                updatePrefs({ notifications: { ...prefs.notifications, weeklyDigest: v } })
              }
              label="Weekly study digest"
              description="A summary of your learning progress each week"
            />
          </div>
        )}

        {activeSection === 'privacy' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Privacy & Data</h2>
              <p className="mt-1 text-sm text-muted">
                Export or delete your learning data.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
              <p className="text-sm font-medium text-foreground">Export my data</p>
              <p className="mt-1 text-xs text-muted">
                Download a JSON archive of your lectures, notes, flashcards, and preferences.
              </p>
              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={exporting}
                className={cn(
                  'mt-4 inline-flex items-center gap-2 rounded-full border border-white/[0.1] px-5 py-2.5',
                  'text-sm text-foreground hover:border-accent/25 transition-colors cursor-pointer disabled:opacity-40',
                )}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export data
              </button>
            </div>

            <div className="rounded-xl border border-red/25 bg-red/[0.04] p-5">
              <p className="text-sm font-semibold text-red">Danger zone</p>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Permanently delete your account and all associated lectures, transcripts, notes,
                and flashcards.
              </p>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className={cn(
                  'danger-zone-delete mt-4 inline-flex items-center gap-2 rounded-full border border-red/30 px-5 py-2.5',
                  'text-sm font-medium text-red hover:bg-red/[0.08] transition-colors cursor-pointer',
                )}
              >
                <Trash2 className="h-4 w-4" />
                Delete account
              </button>
            </div>
          </div>
        )}

        {activeSection === 'billing' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Billing & Plan</h2>
              <p className="mt-1 text-sm text-muted">
                You&apos;re on the free plan. Paid tiers and usage billing are coming soon.
              </p>
            </div>

            <div className="rounded-xl border border-accent/20 bg-accent/[0.06] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                Current plan
              </p>
              <p className="mt-1 text-2xl font-heading text-foreground">{usagePlaceholder.plan}</p>
              <p className="mt-1 text-sm text-muted">Full access to core features</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <p className="text-xs text-muted">Lectures this month</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {usagePlaceholder.lecturesUsed}{' '}
                  <span className="text-sm font-normal text-muted">
                    / {usagePlaceholder.lecturesLimit}
                  </span>
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <p className="text-xs text-muted">Transcription minutes</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {Math.round(usagePlaceholder.minutesUsed / 60)}{' '}
                  <span className="text-sm font-normal text-muted">
                    / {usagePlaceholder.minutesLimit} min
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="rounded-full bg-accent/40 px-6 py-2.5 text-sm font-medium text-background cursor-not-allowed opacity-60"
            >
              Upgrade — coming soon
            </button>
          </div>
        )}

        {activeSection === 'ai' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">AI Preferences</h2>
              <p className="mt-1 text-sm text-muted">
                Defaults for AI summaries, study styles, and flashcard generation (saved automatically).
              </p>
            </div>

            {!loadingDb && dbProfile && (
              <>
                {/* Tutor style select */}
                <label className="block">
                  <span className="text-xs font-medium text-muted">AI Tutor study style</span>
                  <select
                    value={dbProfile.tutorStyle || 'balanced'}
                    onChange={(e) => handleAutoSaveProfile({ tutorStyle: e.target.value })}
                    className="mt-1.5 w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/30 cursor-pointer"
                  >
                    <option value="balanced" className="bg-card">Balanced (Guidance + Direct Answers)</option>
                    <option value="socratic" className="bg-card">Socratic (Interactive questions only)</option>
                    <option value="direct" className="bg-card">Direct (Straight-to-the-point explanations)</option>
                  </select>
                </label>

                {/* Summary length select */}
                <label className="block">
                  <span className="text-xs font-medium text-muted">Smart summary length</span>
                  <select
                    value={dbProfile.summaryLength || 'auto'}
                    onChange={(e) => handleAutoSaveProfile({ summaryLength: e.target.value })}
                    className="mt-1.5 w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/30 cursor-pointer"
                  >
                    <option value="auto" className="bg-card">Auto (Recommended)</option>
                    <option value="brief" className="bg-card">Brief (Concise summaries only)</option>
                    <option value="detailed" className="bg-card">Detailed (Exhaustive explanations)</option>
                  </select>
                </label>

                {/* Flashcard difficulty select */}
                <label className="block">
                  <span className="text-xs font-medium text-muted">Flashcard generation difficulty</span>
                  <select
                    value={dbProfile.flashcardDifficulty || 'mixed'}
                    onChange={(e) => handleAutoSaveProfile({ flashcardDifficulty: e.target.value })}
                    className="mt-1.5 w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/30 cursor-pointer"
                  >
                    <option value="mixed" className="bg-card">Mixed (All levels)</option>
                    <option value="easy" className="bg-card">Easy (Introductory definitions)</option>
                    <option value="hard" className="bg-card">Hard (Complex, scenario-based questions)</option>
                  </select>
                </label>
              </>
            )}

            <label className="block">
              <span className="text-xs font-medium text-muted">{translate('settings.outputLanguage')}</span>
              <select
                value={prefs.ai.outputLanguage ?? 'en'}
                onChange={(e) =>
                  updatePrefs({
                    ai: {
                      ...prefs.ai,
                      outputLanguage: e.target.value === 'match' ? 'match' : 'en',
                    },
                  })
                }
                className="mt-1.5 w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/30 cursor-pointer"
              >
                <option value="en" className="bg-card">English (recommended)</option>
                <option value="match" className="bg-card">Match lecture language</option>
              </select>
              <p className="mt-1.5 text-xs text-muted">
                Notes, flashcards, and quizzes are generated in English by default — even when your recording is in Hindi.
              </p>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted">{translate('settings.transcriptionLanguage')}</span>
              <select
                value={prefs.ai.transcriptionLanguage}
                onChange={(e) =>
                  updatePrefs({
                    ai: { ...prefs.ai, transcriptionLanguage: e.target.value },
                  })
                }
                className="mt-1.5 w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/30 cursor-pointer"
              >
                <option value="auto" className="bg-card">Auto-detect</option>
                <option value="en" className="bg-card">English</option>
                <option value="hi" className="bg-card">Hindi</option>
                <option value="hinglish" className="bg-card">Hinglish</option>
              </select>
            </label>
          </div>
        )}

        {activeSection !== 'privacy' && activeSection !== 'billing' && activeSection !== 'ai' && activeSection !== 'notifications' && (
          <div className="mt-8 border-t border-white/[0.06] pt-6">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className={cn(
                'inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-background',
                'hover:bg-accent-soft transition-all cursor-pointer disabled:opacity-40',
              )}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save settings
            </button>
          </div>
        )}
      </AccountSectionShell>

      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </>
  )
}

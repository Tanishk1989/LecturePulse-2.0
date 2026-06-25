import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { GuestRoute } from '@/components/auth/GuestRoute'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { CursorSpotlight } from '@/components/effects/CursorSpotlight'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { DashboardRoutes } from '@/pages/dashboard/DashboardRoutes'
import { SharedNotesPage } from '@/pages/dashboard/SharedNotesPage'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { TranscriptPage } from '@/pages/dashboard/TranscriptPage'
import { LectureNotesPage } from '@/pages/dashboard/LectureNotesPage'
import { LectureProvider, useLectures } from '@/hooks/useLectures'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getCachedProfile, fetchUserProfile } from '@/services/profileService'
import { getUserFlashcards } from '@/services/flashcardService'
import { getUserLectures } from '@/services/lectureService'
import { computeStudyStreak } from '@/lib/studyMetrics'
import { countDueFlashcards } from '@/lib/flashcardStudy'
import { loadUserPreferences } from '@/lib/userPreferences'
import { loadTimetable } from '@/lib/timetable'

function TranscriptRedirect() {
  const { lectureId } = useParams<{ lectureId: string }>()
  return <Navigate to={`/transcript/${lectureId ?? ''}`} replace />
}

function NotesRedirectContent() {
  const { lectures, loading } = useLectures()

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (lectures.length === 0) {
    return <Navigate to="/dashboard/notes" replace />
  }

  const latestLecture = [...lectures].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0]

  return <Navigate to={`/notes/${latestLecture.id}`} replace />
}

function NotesRedirect() {
  return (
    <LectureProvider>
      <NotesRedirectContent />
    </LectureProvider>
  )
}

function MainShell() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 bg-noise opacity-[0.03] z-0" aria-hidden />
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-[#4F46E5]/[0.04] blur-[160px] z-0"
        aria-hidden
      />
      <div className="relative z-10">
        <CursorSpotlight />
        <Navbar />
        <LandingPage />
        <Footer />
      </div>
    </>
  )
}

function AppRoutes() {
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'
  const isDashboard = location.pathname.startsWith('/dashboard')
  const isTranscript = location.pathname.startsWith('/transcript')
  const isNotes = location.pathname.startsWith('/notes')
  const isShared = location.pathname.startsWith('/shared')

  if (isAuthPage) {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <GuestRoute>
              <SignupPage />
            </GuestRoute>
          }
        />
      </Routes>
    )
  }

  if (isShared) {
    return (
      <Routes>
        <Route
          path="/shared/:token"
          element={
            <LectureProvider>
              <SharedNotesPage />
            </LectureProvider>
          }
        />
      </Routes>
    )
  }

  if (isNotes) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/notes/:lectureId" element={<DashboardLayout />}>
            <Route index element={<LectureNotesPage />} />
          </Route>
          <Route path="/notes" element={<NotesRedirect />} />
        </Routes>
      </ProtectedRoute>
    )
  }

  if (isTranscript) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/transcript/:lectureId" element={<DashboardLayout />}>
            <Route index element={<TranscriptPage />} />
          </Route>
        </Routes>
      </ProtectedRoute>
    )
  }

  if (isDashboard) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route
            path="/dashboard/lectures/:lectureId/transcript"
            element={<TranscriptRedirect />}
          />
          <Route path="/dashboard/*" element={<DashboardRoutes />} />
        </Routes>
      </ProtectedRoute>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <Routes>
        <Route path="/" element={<MainShell />} />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <GuestRoute>
              <SignupPage />
            </GuestRoute>
          }
        />
      </Routes>
    </div>
  )
}

function NotificationService() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    void fetchUserProfile().catch((err) =>
      console.error('[NotificationService] Failed to fetch profile:', err)
    )
  }, [user])

  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      const profile = getCachedProfile()
      if (!profile) return

      const prefs = loadUserPreferences(user.uid)
      const notificationsAllowed =
        prefs.notifications.pushEnabled &&
        'Notification' in window &&
        Notification.permission === 'granted'

      const now = new Date()
      const currentHours = String(now.getHours()).padStart(2, '0')
      const currentMinutes = String(now.getMinutes()).padStart(2, '0')
      const currentTime = `${currentHours}:${currentMinutes}`
      const todayStr = now.toDateString()

      // 1. Daily Study Reminder
      if (profile.dailyReminder && profile.dailyReminderTime === currentTime) {
        const lastReminder = localStorage.getItem('lecturepulse:last_study_reminder_date')

        if (lastReminder !== todayStr && notificationsAllowed) {
          void getUserFlashcards(user.uid)
            .then((cards) => {
              const dueCount = countDueFlashcards(cards, now)
              const body =
                dueCount > 0
                  ? `You have ${dueCount} flashcard${dueCount === 1 ? '' : 's'} due today. Keep your streak alive!`
                  : 'Time to review your lectures! Keep your streak alive.'

              new Notification('Study Reminder', {
                body,
                icon: '/favicon.ico',
              })
              localStorage.setItem('lecturepulse:last_study_reminder_date', todayStr)
            })
            .catch((err) => {
              console.error('[NotificationService] Failed flashcard due check:', err)
            })
        }
      }

      // 2. Flashcard due reminder (9:00 AM) when push enabled
      if (notificationsAllowed && currentTime === '09:00') {
        const lastDueAlert = localStorage.getItem('lecturepulse:last_flashcard_due_date')
        if (lastDueAlert !== todayStr) {
          void getUserFlashcards(user.uid)
            .then((cards) => {
              const dueCount = countDueFlashcards(cards, now)
              if (dueCount > 0) {
                new Notification('Flashcards due', {
                  body: `${dueCount} card${dueCount === 1 ? '' : 's'} due for review today.`,
                  icon: '/favicon.ico',
                })
                localStorage.setItem('lecturepulse:last_flashcard_due_date', todayStr)
              }
            })
            .catch((err) => {
              console.error('[NotificationService] Failed flashcard due alert:', err)
            })
        }
      }

      // 3. Notes ready notifications
      if (notificationsAllowed && prefs.notifications.notesReady && currentTime === '09:05') {
        const notifiedKey = 'lecturepulse:notified_notes_ready'
        const notifiedRaw = localStorage.getItem(notifiedKey)
        const notifiedIds = new Set<string>(
          notifiedRaw ? (JSON.parse(notifiedRaw) as string[]) : [],
        )

        void getUserLectures(user.uid)
          .then((lectures) => {
            const newlyReady = lectures.filter(
              (lecture) => lecture.status === 'completed' && !notifiedIds.has(lecture.id),
            )
            if (newlyReady.length === 0) return

            const latest = newlyReady[0]
            new Notification('Notes ready', {
              body: `"${latest.title}" is ready to study.`,
              icon: '/favicon.ico',
            })

            newlyReady.forEach((lecture) => notifiedIds.add(lecture.id))
            localStorage.setItem(notifiedKey, JSON.stringify([...notifiedIds]))
          })
          .catch((err) => {
            console.error('[NotificationService] Failed notes ready check:', err)
          })
      }

      // 4. Weekly digest (Sunday 9:30)
      if (
        notificationsAllowed &&
        prefs.notifications.weeklyDigest &&
        now.getDay() === 0 &&
        currentTime === '09:30'
      ) {
        const weekKey = `lecturepulse:weekly_digest:${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`
        if (localStorage.getItem(weekKey) !== todayStr) {
          void Promise.all([getUserFlashcards(user.uid), getUserLectures(user.uid)])
            .then(([cards, lectures]) => {
              const dueCount = countDueFlashcards(cards, now)
              const streakDays = computeStudyStreak(cards, now)
              const completed = lectures.filter((lecture) => lecture.status === 'completed').length

              new Notification('Weekly study digest', {
                body: `${dueCount} cards due · ${streakDays}-day streak · ${completed} lectures completed.`,
                icon: '/favicon.ico',
              })
              localStorage.setItem(weekKey, todayStr)
            })
            .catch((err) => {
              console.error('[NotificationService] Failed weekly digest:', err)
            })
        }
      }

      // 5. Streak Alert (checked at 20:00 / 8 PM if user hasn't studied today)
      if (profile.streakAlerts && currentTime === '20:00') {
        const lastStreakAlert = localStorage.getItem('lecturepulse:last_streak_alert_date')

        if (lastStreakAlert !== todayStr) {
          void getUserFlashcards(user.uid)
            .then((cards) => {
              const studiedToday = cards.some((card) => {
                if (!card.lastReviewedAt) return false
                const reviewDate = new Date(card.lastReviewedAt)
                return (
                  reviewDate.getFullYear() === now.getFullYear() &&
                  reviewDate.getMonth() === now.getMonth() &&
                  reviewDate.getDate() === now.getDate()
                )
              })

              const streakDays = computeStudyStreak(cards, now)

              if (streakDays > 0 && !studiedToday && notificationsAllowed) {
                new Notification('Streak Alert!', {
                  body: `Don't lose your ${streakDays}-day study streak! Review some flashcards today to keep it active.`,
                  icon: '/favicon.ico',
                })
                localStorage.setItem('lecturepulse:last_streak_alert_date', todayStr)
              }
            })
            .catch((err) => {
              console.error('[NotificationService] Failed to check streak cards:', err)
            })
        }
      }
      // 6. Timetable class reminders
      if (notificationsAllowed && user) {
        const timetableEntries = loadTimetable(user.uid).filter((entry) => entry.autoRecordReminder)
        const todayClasses = timetableEntries.filter((entry) => entry.dayOfWeek === now.getDay())

        for (const entry of todayClasses) {
          if (currentTime !== entry.startTime) continue

          const reminderKey = `lecturepulse:timetable_alert:${entry.id}:${todayStr}`
          if (localStorage.getItem(reminderKey)) continue

          new Notification('Class starting', {
            body: `${entry.title} begins now. Tap to start recording.`,
            icon: '/favicon.ico',
          })
          localStorage.setItem(reminderKey, '1')
        }
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [user])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <NotificationService />
            <AppRoutes />
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App


import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { CursorSpotlight } from '@/components/effects/CursorSpotlight'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { DashboardRoutes } from '@/pages/dashboard/DashboardRoutes'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { TranscriptPage } from '@/pages/dashboard/TranscriptPage'
import { LectureNotesPage } from '@/pages/dashboard/LectureNotesPage'
import { LectureProvider, useLectures } from '@/hooks/useLectures'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getCachedProfile, fetchUserProfile } from '@/services/profileService'
import { getUserFlashcards } from '@/services/flashcardService'
import { computeStudyStreak } from '@/lib/studyMetrics'

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

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
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

      const now = new Date()
      const currentHours = String(now.getHours()).padStart(2, '0')
      const currentMinutes = String(now.getMinutes()).padStart(2, '0')
      const currentTime = `${currentHours}:${currentMinutes}`

      // 1. Daily Study Reminder
      if (profile.dailyReminder && profile.dailyReminderTime === currentTime) {
        const todayStr = now.toDateString()
        const lastReminder = localStorage.getItem('lecturepulse:last_study_reminder_date')

        if (lastReminder !== todayStr) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Study Reminder', {
              body: 'Time to review your lectures! Keep your streak alive.',
              icon: '/favicon.ico',
            })
            localStorage.setItem('lecturepulse:last_study_reminder_date', todayStr)
          }
        }
      }

      // 2. Streak Alert (checked at 20:00 / 8 PM if user hasn't studied today)
      if (profile.streakAlerts && currentTime === '20:00') {
        const todayStr = now.toDateString()
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

              if (streakDays > 0 && !studiedToday) {
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('Streak Alert!', {
                    body: `Don't lose your ${streakDays}-day study streak! Review some flashcards today to keep it active.`,
                    icon: '/favicon.ico',
                  })
                  localStorage.setItem('lecturepulse:last_streak_alert_date', todayStr)
                }
              }
            })
            .catch((err) => {
              console.error('[NotificationService] Failed to check streak cards:', err)
            })
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


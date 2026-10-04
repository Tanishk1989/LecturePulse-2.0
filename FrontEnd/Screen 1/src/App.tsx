import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { GuestRoute } from '@/components/auth/GuestRoute'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { CursorSpotlight } from '@/components/effects/CursorSpotlight'
import { LectureProvider, useLectures } from '@/hooks/useLectures'
import { Loader2 } from 'lucide-react'
import { lazy, Suspense, useEffect } from 'react'
import { PushRegistrationService } from '@/components/shared/PushRegistrationService'
import { NotFoundPage } from '@/components/shared/NotFoundPage'
import { AccountSyncStatus } from '@/components/shared/AccountSyncStatus'

const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import('@/pages/SignupPage').then(m => ({ default: m.SignupPage })))
const DashboardRoutes = lazy(() => import('@/pages/dashboard/DashboardRoutes').then(m => ({ default: m.DashboardRoutes })))
const SharedNotesPage = lazy(() => import('@/pages/dashboard/SharedNotesPage').then(m => ({ default: m.SharedNotesPage })))
const DashboardLayout = lazy(() => import('@/components/dashboard/DashboardLayout').then(m => ({ default: m.DashboardLayout })))
const TranscriptPage = lazy(() => import('@/pages/dashboard/TranscriptPage').then(m => ({ default: m.TranscriptPage })))
const LectureNotesPage = lazy(() => import('@/pages/dashboard/LectureNotesPage').then(m => ({ default: m.LectureNotesPage })))

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
  const matchesSection = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  const isDashboard = matchesSection('/dashboard')
  const isTranscript = matchesSection('/transcript')
  const isNotes = matchesSection('/notes')
  const isShared = matchesSection('/shared')

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
        <Route path="*" element={<NotFoundPage />} />
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
          <Route path="*" element={<NotFoundPage />} />
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
          <Route path="*" element={<NotFoundPage />} />
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
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <PushRegistrationService />
            <AccountSyncStatus />
            <Suspense fallback={<div role="status" aria-label="Loading page" className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>}>
              <AppRoutes />
            </Suspense>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App


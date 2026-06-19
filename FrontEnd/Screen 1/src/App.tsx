import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
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

function TranscriptRedirect() {
  const { lectureId } = useParams<{ lectureId: string }>()
  return <Navigate to={`/transcript/${lectureId ?? ''}`} replace />
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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

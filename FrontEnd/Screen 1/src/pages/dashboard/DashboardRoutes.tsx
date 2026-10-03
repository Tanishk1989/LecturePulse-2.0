import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
const DashboardHomePage = lazy(() => import('./DashboardHomePage').then(m => ({ default: m.DashboardHomePage })))
const SmartNotesPage = lazy(() => import('./SmartNotesPage').then(m => ({ default: m.SmartNotesPage })))
const FlashcardsPage = lazy(() => import('./FlashcardsPage').then(m => ({ default: m.FlashcardsPage })))
const ExamFocusPage = lazy(() => import('./ExamFocusPage').then(m => ({ default: m.ExamFocusPage })))
const AITutorPage = lazy(() => import('./AITutorPage').then(m => ({ default: m.AITutorPage })))
const LecturesPage = lazy(() => import('./LecturesPage').then(m => ({ default: m.LecturesPage })))
const RecordLivePage = lazy(() => import('./RecordLivePage').then(m => ({ default: m.RecordLivePage })))
const UploadLecturePage = lazy(() => import('./UploadLecturePage').then(m => ({ default: m.UploadLecturePage })))
const ImportYouTubePage = lazy(() => import('./ImportYouTubePage').then(m => ({ default: m.ImportYouTubePage })))
const UploadPdfPage = lazy(() => import('./UploadPdfPage').then(m => ({ default: m.UploadPdfPage })))
const SummaryPage = lazy(() => import('./SummaryPage').then(m => ({ default: m.SummaryPage })))
const ProfilePage = lazy(() => import('./ProfilePage').then(m => ({ default: m.ProfilePage })))
const SettingsPage = lazy(() => import('./SettingsPage').then(m => ({ default: m.SettingsPage })))
const HelpPage = lazy(() => import('./HelpPage').then(m => ({ default: m.HelpPage })))
const WhatsNewPage = lazy(() => import('./WhatsNewPage').then(m => ({ default: m.WhatsNewPage })))
const StreakPage = lazy(() => import('./StreakPage').then(m => ({ default: m.StreakPage })))
const ExamCountdownPage = lazy(() => import('./ExamCountdownPage').then(m => ({ default: m.ExamCountdownPage })))
const SearchPage = lazy(() => import('./SearchPage').then(m => ({ default: m.SearchPage })))
const RevisionTimelinePage = lazy(() => import('./RevisionTimelinePage').then(m => ({ default: m.RevisionTimelinePage })))
const QuizPage = lazy(() => import('./QuizPage').then(m => ({ default: m.QuizPage })))
const RoadmapPage = lazy(() => import('./RoadmapPage').then(m => ({ default: m.RoadmapPage })))
const TimetablePage = lazy(() => import('./TimetablePage').then(m => ({ default: m.TimetablePage })))
const InstitutionDashboardPage = lazy(() => import('./InstitutionDashboardPage').then(m => ({ default: m.InstitutionDashboardPage })))

export function DashboardRoutes() {
  return (
    <Suspense fallback={<div role="status" aria-label="Loading study page" className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>}><Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<DashboardHomePage />} />
        <Route path="lectures" element={<LecturesPage />} />
        <Route path="notes" element={<SmartNotesPage />} />
        <Route path="summary" element={<SummaryPage />} />
        <Route path="flashcards" element={<FlashcardsPage />} />
        <Route path="quiz" element={<QuizPage />} />
        <Route path="revision" element={<RevisionTimelinePage />} />
        <Route path="roadmap" element={<RoadmapPage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="institution" element={<InstitutionDashboardPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="ai-tutor" element={<AITutorPage />} />
        <Route path="exam-focus" element={<ExamFocusPage />} />
        <Route path="record" element={<RecordLivePage />} />
        <Route path="upload" element={<UploadLecturePage />} />
        <Route path="youtube" element={<ImportYouTubePage />} />
        <Route path="pdf" element={<UploadPdfPage />} />
        <Route path="streak" element={<StreakPage />} />
        <Route path="exam-countdown" element={<ExamCountdownPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="whats-new" element={<WhatsNewPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes></Suspense>
  )
}

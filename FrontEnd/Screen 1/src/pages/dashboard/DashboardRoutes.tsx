import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { DashboardHomePage } from '@/pages/dashboard/DashboardHomePage'
import { KnowledgeGraphPage } from '@/pages/dashboard/KnowledgeGraphPage'
import { SmartNotesPage } from '@/pages/dashboard/SmartNotesPage'
import { FlashcardsPage } from '@/pages/dashboard/FlashcardsPage'
import { ExamFocusPage } from '@/pages/dashboard/ExamFocusPage'
import { AITutorPage } from '@/pages/dashboard/AITutorPage'
import { DashboardPlaceholderPage } from '@/pages/dashboard/DashboardPlaceholderPage'
import { LecturesPage } from '@/pages/dashboard/LecturesPage'
import { RecordLivePage } from '@/pages/dashboard/RecordLivePage'
import { UploadLecturePage } from '@/pages/dashboard/UploadLecturePage'
import { ImportYouTubePage } from '@/pages/dashboard/ImportYouTubePage'
import { UploadPdfPage } from '@/pages/dashboard/UploadPdfPage'
import { SummaryPage } from '@/pages/dashboard/SummaryPage'
import { ProfilePage } from '@/pages/dashboard/ProfilePage'
import { SettingsPage } from '@/pages/dashboard/SettingsPage'
import { HelpPage } from '@/pages/dashboard/HelpPage'
import { WhatsNewPage } from '@/pages/dashboard/WhatsNewPage'
import { StreakPage } from '@/pages/dashboard/StreakPage'
import { ExamCountdownPage } from '@/pages/dashboard/ExamCountdownPage'
import { SearchPage } from '@/pages/dashboard/SearchPage'
import { RevisionTimelinePage } from '@/pages/dashboard/RevisionTimelinePage'
import { QuizPage } from '@/pages/dashboard/QuizPage'
import { RoadmapPage } from '@/pages/dashboard/RoadmapPage'
import { TimetablePage } from '@/pages/dashboard/TimetablePage'
import { InstitutionDashboardPage } from '@/pages/dashboard/InstitutionDashboardPage'

export function DashboardRoutes() {
  return (
    <Routes>
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
        <Route path="knowledge-graph" element={<KnowledgeGraphPage />} />
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
    </Routes>
  )
}

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
import { RevisionTimelinePage } from '@/pages/dashboard/RevisionTimelinePage'

export function DashboardRoutes() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<DashboardHomePage />} />
        <Route path="lectures" element={<LecturesPage />} />
        <Route path="notes" element={<SmartNotesPage />} />
        <Route path="flashcards" element={<FlashcardsPage />} />
        <Route path="knowledge-graph" element={<KnowledgeGraphPage />} />
        <Route path="ai-tutor" element={<AITutorPage />} />
        <Route path="exam-focus" element={<ExamFocusPage />} />
        <Route path="record" element={<RecordLivePage />} />
        <Route path="upload" element={<UploadLecturePage />} />
        <Route path="youtube" element={<ImportYouTubePage />} />
        <Route path="pdf" element={<UploadPdfPage />} />
        <Route path="streak" element={<DashboardPlaceholderPage title="Streak" description="Track your daily learning streak and build consistent habits." />} />
        <Route path="analytics" element={<DashboardPlaceholderPage title="Analytics" description="Deep insights into your learning patterns and progress over time." />} />
        <Route path="roadmap" element={<DashboardPlaceholderPage title="Learning Roadmap" description="Your personalized path from foundation to mastery." />} />
        <Route path="revision" element={<RevisionTimelinePage />} />
        <Route path="profile" element={<DashboardPlaceholderPage title="Profile" description="Manage your account and learning preferences." />} />
        <Route path="settings" element={<DashboardPlaceholderPage title="Settings" description="Configure notifications, privacy, and app preferences." />} />
        <Route path="help" element={<DashboardPlaceholderPage title="Help" description="Get support and learn how to make the most of LecturePulse." />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

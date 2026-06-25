import type { LucideIcon } from 'lucide-react'
import {
  CircleHelp,
  FileText,
  Flame,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Library,
  Network,
  NotebookPen,
  Radio,
  Search,
  Settings,
  Sparkles,
  Target,
  Timer,
  Upload,
  UserRound,
  ClipboardList,
  CalendarClock,
  Building2,
} from 'lucide-react'
import type { MessageKey } from '@/lib/i18n/messages'
import { YoutubeIcon } from '@/components/shared/YoutubeIcon'

export type DashboardNavItem = {
  id: string
  label: string
  icon: LucideIcon
  path: string
  i18nKey?: MessageKey
}

export type DashboardNavSection = {
  id: string
  title: string
  items: DashboardNavItem[]
}

export type UploadAction = {
  id: string
  label: string
  description: string
  icon: LucideIcon
  path: string
}

export const dashboardNavSections: DashboardNavSection[] = [
  {
    id: 'home',
    title: 'Home',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        path: '/dashboard',
        i18nKey: 'nav.dashboard',
      },
    ],
  },
  {
    id: 'deep-dive',
    title: 'DEEP DIVE',
    items: [
      { id: 'study-hub', label: 'Study Hub', icon: GraduationCap, path: '/notes' },
    ],
  },
  {
    id: 'learn',
    title: 'Learn',
    items: [
      { id: 'lectures', label: 'View library', icon: Library, path: '/dashboard/lectures', i18nKey: 'nav.lectures' },
      { id: 'search', label: 'Search', icon: Search, path: '/dashboard/search', i18nKey: 'nav.search' },
      { id: 'notes', label: 'Smart Notes', icon: NotebookPen, path: '/dashboard/notes', i18nKey: 'nav.notes' },
      { id: 'flashcards', label: 'Flashcards', icon: Layers, path: '/dashboard/flashcards', i18nKey: 'nav.flashcards' },
      { id: 'quiz', label: 'Quiz', icon: ClipboardList, path: '/dashboard/quiz', i18nKey: 'nav.quiz' },
      {
        id: 'revision',
        label: 'Revision',
        icon: CalendarClock,
        path: '/dashboard/revision',
        i18nKey: 'nav.revision',
      },
      {
        id: 'knowledge-graph',
        label: 'Knowledge Graph',
        icon: Network,
        path: '/dashboard/knowledge-graph',
        i18nKey: 'nav.knowledgeGraph',
      },
      { id: 'ai-tutor', label: 'AI Tutor', icon: Sparkles, path: '/dashboard/ai-tutor', i18nKey: 'nav.aiTutor' },
      { id: 'exam-focus', label: 'Exam Focus', icon: Target, path: '/dashboard/exam-focus', i18nKey: 'nav.examFocus' },
      { id: 'timetable', label: 'Timetable', icon: CalendarClock, path: '/dashboard/timetable', i18nKey: 'nav.timetable' },
      { id: 'institution', label: 'Institution', icon: Building2, path: '/dashboard/institution', i18nKey: 'nav.institution' },
    ],
  },
  {
    id: 'create',
    title: 'Create',
    items: [
      { id: 'record', label: 'Record Live', icon: Radio, path: '/dashboard/record', i18nKey: 'nav.record' },
      { id: 'upload', label: 'Upload Lecture', icon: Upload, path: '/dashboard/upload' },
      { id: 'youtube', label: 'Import YouTube', icon: YoutubeIcon as any, path: '/dashboard/youtube' },
      { id: 'pdf', label: 'Upload PDF', icon: FileText, path: '/dashboard/pdf' },
    ],
  },
  {
    id: 'progress',
    title: 'Progress',
    items: [
      { id: 'streak', label: 'Streak', icon: Flame, path: '/dashboard/streak' },
      { id: 'exam-countdown', label: 'Exam Countdown', icon: Timer, path: '/dashboard/exam-countdown' },
    ],
  },
  {
    id: 'account',
    title: 'Account',
    items: [
      { id: 'profile', label: 'Profile', icon: UserRound, path: '/dashboard/profile' },
      { id: 'settings', label: 'Settings', icon: Settings, path: '/dashboard/settings' },
      { id: 'help', label: 'Help', icon: CircleHelp, path: '/dashboard/help' },
    ],
  },
]


export const uploadActions: UploadAction[] = [
  {
    id: 'record',
    label: 'Record Live',
    description: 'Record lecture in real time',
    icon: Radio,
    path: '/dashboard/record',
  },
  {
    id: 'upload',
    label: 'Upload Lecture',
    description: 'Upload audio or video files',
    icon: Upload,
    path: '/dashboard/upload',
  },
  {
    id: 'youtube',
    label: 'Import YouTube',
    description: 'Import from a YouTube URL',
    icon: YoutubeIcon as any,
    path: '/dashboard/youtube',
  },
  {
    id: 'pdf',
    label: 'Upload PDF',
    description: 'Upload a PDF document',
    icon: FileText,
    path: '/dashboard/pdf',
  },
]

export const aiSuggestions = [
  'Explain this concept',
  'Summarize lecture',
  'Generate flashcards',
  'Show weak areas',
  'Help me revise',
]

export const searchExamples = [
  'thermodynamics',
  'key definitions',
  'exam tips',
  'photosynthesis',
]

export const roadmapStages = [
  { id: 'foundation', label: 'Foundation', progress: 0 },
  { id: 'core', label: 'Core Concepts', progress: 0 },
  { id: 'advanced', label: 'Advanced Topics', progress: 0 },
  { id: 'mastery', label: 'Mastery', progress: 0 },
]

export const NAV_ICON_SIZE = 18
export const NAV_ICON_STROKE = 1.75

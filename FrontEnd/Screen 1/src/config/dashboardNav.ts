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
  Settings,
  Sparkles,
  Target,
  Timer,
  Upload,
  UserRound,
} from 'lucide-react'
import { YoutubeIcon } from '@/components/shared/YoutubeIcon'

export type DashboardNavItem = {
  id: string
  label: string
  icon: LucideIcon
  path: string
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
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' }],
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
      { id: 'lectures', label: 'View library', icon: Library, path: '/dashboard/lectures' },
      { id: 'notes', label: 'Smart Notes', icon: NotebookPen, path: '/dashboard/notes' },
      { id: 'flashcards', label: 'Flashcards', icon: Layers, path: '/dashboard/flashcards' },
      { id: 'knowledge-graph', label: 'Knowledge Graph', icon: Network, path: '/dashboard/knowledge-graph' },
      { id: 'ai-tutor', label: 'AI Tutor', icon: Sparkles, path: '/dashboard/ai-tutor' },
      { id: 'exam-focus', label: 'Exam Focus', icon: Target, path: '/dashboard/exam-focus' },
    ],
  },
  {
    id: 'create',
    title: 'Create',
    items: [
      { id: 'record', label: 'Record Live', icon: Radio, path: '/dashboard/record' },
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
  'Explain this concept',
  'Summarize lecture',
  'Generate flashcards',
  'Help me revise',
]

export const roadmapStages = [
  { id: 'foundation', label: 'Foundation', progress: 0 },
  { id: 'core', label: 'Core Concepts', progress: 0 },
  { id: 'advanced', label: 'Advanced Topics', progress: 0 },
  { id: 'mastery', label: 'Mastery', progress: 0 },
]

export const NAV_ICON_SIZE = 18
export const NAV_ICON_STROKE = 1.75

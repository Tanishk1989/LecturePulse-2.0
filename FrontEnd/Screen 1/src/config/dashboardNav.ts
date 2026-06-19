import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Brain,
  CalendarClock,
  CircleHelp,
  FileText,
  Flame,
  LayoutDashboard,
  Map,
  Mic2,
  Network,
  NotebookPen,
  PlaySquare,
  Radio,
  Settings,
  Sparkles,
  Target,
  Upload,
  UserRound,
} from 'lucide-react'

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
    id: 'learn',
    title: 'Learn',
    items: [
      { id: 'lectures', label: 'Lectures', icon: Mic2, path: '/dashboard/lectures' },
      { id: 'notes', label: 'Smart Notes', icon: NotebookPen, path: '/dashboard/notes' },
      { id: 'flashcards', label: 'Flashcards', icon: Brain, path: '/dashboard/flashcards' },
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
      { id: 'youtube', label: 'Import YouTube', icon: PlaySquare, path: '/dashboard/youtube' },
      { id: 'pdf', label: 'Upload PDF', icon: FileText, path: '/dashboard/pdf' },
    ],
  },
  {
    id: 'progress',
    title: 'Progress',
    items: [
      { id: 'streak', label: 'Streak', icon: Flame, path: '/dashboard/streak' },
      { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/dashboard/analytics' },
      { id: 'roadmap', label: 'Learning Roadmap', icon: Map, path: '/dashboard/roadmap' },
      { id: 'revision', label: 'Revision Timeline', icon: CalendarClock, path: '/dashboard/revision' },
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
  { id: 'record', label: 'Record Live', icon: Radio, path: '/dashboard/record' },
  { id: 'upload', label: 'Upload Lecture', icon: Upload, path: '/dashboard/upload' },
  { id: 'youtube', label: 'Import YouTube', icon: PlaySquare, path: '/dashboard/youtube' },
  { id: 'pdf', label: 'Upload PDF', icon: FileText, path: '/dashboard/pdf' },
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

import { motion } from 'framer-motion'
import {
  BookOpen,
  Brain,
  FileText,
  HelpCircle,
  ListChecks,
  MessageSquare,
  Layers,
  ClipboardCopy,
  FileDown,
  Network,
} from 'lucide-react'
import type { NoteSectionId, StructuredNotesContent } from '@/types/notes'
import { NOTE_SECTIONS } from '@/types/notes'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/ToastProvider'
import { useDashboard } from '@/context/DashboardContext'
import { formatNotesForCopy } from '@/services/aiGenerationService'

const SECTION_ICONS: Record<string, typeof FileText> = {
  summary: FileText,
  concepts: Brain,
  definitions: BookOpen,
  'mind-map': Network,
  questions: HelpCircle,
  'exam-tips': ListChecks,
  flashcards: Layers,
  'ask-ai': MessageSquare,
}

interface NotesNavigationProps {
  activeSection: NoteSectionId
  onSectionChange: (section: NoteSectionId) => void
  notesContent: StructuredNotesContent | null
  className?: string
}

export function NotesNavigation({
  activeSection,
  onSectionChange,
  notesContent,
  className,
}: NotesNavigationProps) {
  const { toast } = useToast()
  const { openTutor } = useDashboard()

  const handleCopy = async () => {
    if (!notesContent) {
      toast.error('Notes content not loaded yet.')
      return
    }
    try {
      await navigator.clipboard.writeText(formatNotesForCopy(notesContent))
      toast.success('Notes copied to clipboard.')
    } catch {
      toast.error('Could not copy notes.')
    }
  }

  const handleExportPdf = () => {
    if (!notesContent) {
      toast.error('Notes content not loaded yet.')
      return
    }
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Allow pop-ups to export PDF.')
      return
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lecture Notes</title>
        <style>
          body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; line-height: 1.6; color: #111; }
          h1 { font-size: 24px; } h2 { font-size: 18px; margin-top: 24px; } h3 { font-size: 15px; }
          p, li { font-size: 14px; }
        </style>
      </head>
      <body>
        <pre style="white-space: pre-wrap; font-family: inherit;">${formatNotesForCopy(notesContent).replace(/</g, '&lt;')}</pre>
      </body>
      </html>`

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    toast.success('Print dialog opened — save as PDF.')
  }

  return (
    <nav
      className={cn(
        'flex flex-col rounded-3xl border border-white/[0.08] bg-[#0D0D0D]/90 p-4 backdrop-blur-xl',
        'shadow-[0_16px_48px_rgba(0,0,0,0.35)]',
        className,
      )}
    >
      <p className="mb-3 px-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-accent/80">
        Study Hub
      </p>

      {/* Main Content Tabs */}
      <ul className="space-y-1">
        {NOTE_SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section.id] || HelpCircle
          const isActive = activeSection === section.id

          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  'relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-all cursor-pointer',
                  isActive
                    ? 'bg-accent/[0.08] text-foreground shadow-[inset_0_0_20px_rgba(var(--color-accent-rgb),0.06)]'
                    : 'text-muted hover:bg-white/[0.04] hover:text-foreground',
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="notes-nav-active"
                    className="absolute inset-0 rounded-2xl border border-accent/20"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon
                  className={cn('relative h-4 w-4 shrink-0', isActive ? 'text-accent' : 'text-muted')}
                  strokeWidth={1.75}
                />
                <span className="relative font-medium">{section.label}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* Divider */}
      <div className="my-4 border-t border-white/[0.08]" />

      {/* Secondary Study Tools */}
      <p className="mb-2 px-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-muted/50">
        Study Tools
      </p>
      <ul className="space-y-1">
        {(['flashcards', 'ask-ai'] as const).map((id) => {
          const Icon = SECTION_ICONS[id]
          const label = id === 'flashcards' ? 'Flashcards' : 'Ask AI'
          const isActive = id === 'flashcards' && activeSection === id

          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  if (id === 'ask-ai') {
                    openTutor()
                    return
                  }
                  onSectionChange(id)
                }}
                className={cn(
                  'relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-all cursor-pointer',
                  isActive
                    ? 'bg-accent/[0.08] text-foreground shadow-[inset_0_0_20px_rgba(var(--color-accent-rgb),0.06)]'
                    : 'text-muted hover:bg-white/[0.04] hover:text-foreground',
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="notes-nav-active"
                    className="absolute inset-0 rounded-2xl border border-accent/20"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon
                  className={cn('relative h-4 w-4 shrink-0', isActive ? 'text-accent' : 'text-muted')}
                  strokeWidth={1.75}
                />
                <span className="relative font-medium">{label}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* Divider */}
      <div className="my-4 border-t border-white/[0.08]" />

      {/* Action Items */}
      <p className="mb-2 px-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-muted/50">
        Actions
      </p>
      <ul className="space-y-1">
        <li>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!notesContent}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-muted transition-all cursor-pointer hover:bg-white/[0.04] hover:text-foreground disabled:opacity-40"
          >
            <ClipboardCopy className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
            <span className="font-medium">Copy Notes</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={!notesContent}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-muted transition-all cursor-pointer hover:bg-white/[0.04] hover:text-foreground disabled:opacity-40"
          >
            <FileDown className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
            <span className="font-medium">Export PDF</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}

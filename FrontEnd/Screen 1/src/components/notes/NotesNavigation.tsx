import { motion } from 'framer-motion'
import {
  BookOpen,
  Brain,
  ClipboardList,
  FileText,
  HelpCircle,
  Lightbulb,
  ListChecks,
} from 'lucide-react'
import type { NoteSectionId } from '@/types/notes'
import { NOTE_SECTIONS } from '@/types/notes'
import { cn } from '@/lib/utils'

const SECTION_ICONS: Record<NoteSectionId, typeof FileText> = {
  summary: FileText,
  concepts: Brain,
  definitions: BookOpen,
  examples: Lightbulb,
  questions: HelpCircle,
  'exam-tips': ListChecks,
}

interface NotesNavigationProps {
  activeSection: NoteSectionId
  onSectionChange: (section: NoteSectionId) => void
  className?: string
}

export function NotesNavigation({
  activeSection,
  onSectionChange,
  className,
}: NotesNavigationProps) {
  return (
    <nav
      className={cn(
        'flex flex-col rounded-3xl border border-white/[0.08] bg-[#0D0D0D]/90 p-4 backdrop-blur-xl',
        'shadow-[0_16px_48px_rgba(0,0,0,0.35)]',
        className,
      )}
    >
      <p className="mb-4 px-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-accent/80">
        Notes
      </p>

      <ul className="space-y-1">
        {NOTE_SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section.id]
          const isActive = activeSection === section.id

          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  'relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition-all cursor-pointer',
                  isActive
                    ? 'bg-accent/[0.1] text-foreground shadow-[inset_0_0_20px_rgba(214,162,11,0.06)]'
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

      <div className="mt-6 rounded-2xl border border-ambient/20 bg-ambient/[0.06] p-3">
        <div className="flex items-center gap-2 text-xs text-ambient">
          <ClipboardList className="h-3.5 w-3.5" />
          <span className="font-medium">AI-generated from transcript</span>
        </div>
      </div>
    </nav>
  )
}

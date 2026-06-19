import { motion, useReducedMotion } from 'framer-motion'
import {
  BookmarkPlus,
  Bot,
  Brain,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react'
import type { TextSelectionState } from '@/hooks/useTextSelectionMenu'
import { cn } from '@/lib/utils'

export type SelectionAction =
  | 'explain'
  | 'summarize'
  | 'flashcards'
  | 'notes'
  | 'ask-ai'

interface TranscriptSelectionMenuProps {
  selection: TextSelectionState
  onAction: (action: SelectionAction, text: string) => void
  onClose: () => void
}

const ACTIONS: {
  id: SelectionAction
  label: string
  icon: typeof Sparkles
}[] = [
  { id: 'explain', label: 'Explain', icon: Sparkles },
  { id: 'summarize', label: 'Summarize', icon: Bot },
  { id: 'flashcards', label: 'Generate Flashcards', icon: Brain },
  { id: 'notes', label: 'Add to Notes', icon: BookmarkPlus },
  { id: 'ask-ai', label: 'Ask AI', icon: MoreHorizontal },
]

export function TranscriptSelectionMenu({
  selection,
  onAction,
  onClose,
}: TranscriptSelectionMenuProps) {
  const prefersReducedMotion = useReducedMotion()

  const top = Math.max(12, selection.rect.top - 56)
  const left = selection.rect.left + selection.rect.width / 2

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0, y: 4, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      style={{
        position: 'fixed',
        top,
        left,
        transform: 'translateX(-50%)',
        zIndex: 50,
      }}
      className={cn(
        'flex items-center gap-0.5 rounded-2xl border border-accent/25 p-1',
        'bg-[#0D0D0D]/90 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_24px_rgba(214,162,11,0.12)]',
      )}
      onMouseDown={(event) => event.preventDefault()}
    >
      {ACTIONS.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => {
              onAction(action.id, selection.text)
              onClose()
            }}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-foreground/90',
              'transition-all duration-200 cursor-pointer hover:bg-accent/[0.12] hover:text-accent',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        )
      })}
    </motion.div>
  )
}

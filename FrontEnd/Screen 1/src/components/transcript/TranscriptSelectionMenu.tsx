import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Brain, Check, Copy, Sparkles } from 'lucide-react'
import type { TextSelectionState } from '@/hooks/useTextSelectionMenu'
import { cn } from '@/lib/utils'

export type SelectionAction = 'explain' | 'flashcards' | 'copy'

interface TranscriptSelectionMenuProps {
  selection: TextSelectionState
  onAction: (action: SelectionAction, text: string) => void | Promise<void>
  onClose: () => void
}

const ACTIONS: {
  id: SelectionAction
  label: string
  icon: typeof Sparkles
  accent?: boolean
}[] = [
  { id: 'explain', label: 'Explain', icon: Sparkles, accent: true },
  { id: 'flashcards', label: 'Add to flashcards', icon: Brain, accent: true },
  { id: 'copy', label: 'Copy', icon: Copy },
]

export function TranscriptSelectionMenu({
  selection,
  onAction,
  onClose,
}: TranscriptSelectionMenuProps) {
  const prefersReducedMotion = useReducedMotion()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setCopied(false)
  }, [selection.text])

  const top = Math.max(12, selection.rect.top - 52)
  const left = selection.rect.left + selection.rect.width / 2

  const handleAction = async (action: SelectionAction) => {
    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(selection.text)
        setCopied(true)
        setTimeout(() => {
          onClose()
        }, 1500)
      } catch {
        onClose()
      }
      return
    }

    onClose()
    await onAction(action, selection.text)
  }

  return (
    <motion.div
      data-transcript-toolbar
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
        'flex items-center rounded-xl border border-white/[0.12] p-1',
        'bg-[#141414]/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
      )}
      onMouseDown={(event) => event.preventDefault()}
    >
      {ACTIONS.map((action, index) => {
        const Icon = action.id === 'copy' && copied ? Check : action.icon
        const isCopy = action.id === 'copy'

        return (
          <div key={action.id} className="flex items-center">
            {index > 0 && <div className="mx-0.5 h-5 w-px bg-white/[0.1]" />}
            <button
              type="button"
              onClick={() => void handleAction(action.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 cursor-pointer',
                isCopy && copied
                  ? 'text-emerald'
                  : action.accent
                    ? 'text-foreground/90 hover:bg-accent/[0.12] hover:text-accent'
                    : 'text-muted hover:bg-white/[0.06] hover:text-foreground',
              )}
            >
              <Icon
                className={cn('h-3.5 w-3.5', action.accent && !isCopy && 'text-accent')}
                strokeWidth={1.75}
              />
              <span>{isCopy && copied ? 'Copied' : action.label}</span>
            </button>
          </div>
        )
      })}
    </motion.div>
  )
}

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, ExternalLink, Loader2, MessageSquare, Sparkles } from 'lucide-react'
import type { Flashcard } from '@/services/aiGenerationService'
import { cn } from '@/lib/utils'

interface PostRecordingResultsProps {
  summary: string | null
  flashcards: Flashcard[]
  summaryState: 'idle' | 'loading' | 'done' | 'error'
  flashcardsState: 'idle' | 'loading' | 'done' | 'error'
  askAiEnabled: boolean
  onAskAi?: () => void
  className?: string
}

export function PostRecordingResults({
  summary,
  flashcards,
  summaryState,
  flashcardsState,
  askAiEnabled,
  onAskAi,
  className,
}: PostRecordingResultsProps) {
  return (
    <div className={cn('w-full max-w-2xl space-y-4', className)}>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Summary</h3>
          {summaryState === 'loading' && (
            <span className="flex items-center gap-1.5 text-xs text-muted ml-auto">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating Summary…
            </span>
          )}
        </div>
        {summaryState === 'done' && summary && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap"
          >
            {summary}
          </motion.div>
        )}
        {summaryState === 'error' && (
          <p className="text-sm text-muted">Could not generate summary.</p>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Flashcards</h3>
          {flashcardsState === 'loading' && (
            <span className="flex items-center gap-1.5 text-xs text-muted ml-auto">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating Flashcards…
            </span>
          )}
        </div>
        {flashcardsState === 'done' && flashcards.length > 0 && (
          <div className="space-y-2">
            {flashcards.slice(0, 4).map((card, index) => (
              <motion.div
                key={`${card.front}-${index}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl border border-accent/15 bg-accent/[0.04] px-3 py-2.5"
              >
                <p className="text-sm font-medium text-foreground">{card.front}</p>
                <p className="mt-1 text-xs text-muted leading-relaxed">{card.back}</p>
              </motion.div>
            ))}
            {flashcards.length > 4 && (
              <p className="text-xs text-muted pt-1">+{flashcards.length - 4} more flashcards</p>
            )}
            <Link
              to="/dashboard/flashcards"
              className={cn(
                'mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent',
                'hover:text-accent-soft transition-colors',
              )}
            >
              <ExternalLink className="h-3 w-3" />
              Open flashcard deck
            </Link>
          </div>
        )}
        {flashcardsState === 'done' && flashcards.length === 0 && (
          <p className="text-sm text-muted">No flashcards generated.</p>
        )}
        {flashcardsState === 'error' && (
          <p className="text-sm text-muted">Could not generate flashcards.</p>
        )}
      </div>

      {askAiEnabled && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onAskAi}
          className={cn(
            'w-full inline-flex items-center justify-center gap-2 rounded-full border border-accent/30',
            'bg-accent/[0.08] px-6 py-3.5 text-sm font-medium text-accent',
            'hover:bg-accent/[0.12] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
            'shadow-[0_0_28px_rgba(var(--color-accent-rgb),0.15)]',
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Ask AI about this lecture
        </motion.button>
      )}
    </div>
  )
}

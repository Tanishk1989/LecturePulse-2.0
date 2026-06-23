import { Link } from 'react-router-dom'
import { Brain, Layers, Radio, Upload } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardCard } from '@/components/dashboard/ui/DashboardCard'
import { cn } from '@/lib/utils'

interface FlashcardsEmptyStateProps {
  className?: string
  onGenerateAll?: () => void
  batchGenerating?: boolean
  batchProgress?: string | null
  canGenerateAll?: boolean
}

export function FlashcardsEmptyState({
  className,
  onGenerateAll,
  batchGenerating = false,
  batchProgress,
  canGenerateAll = false,
}: FlashcardsEmptyStateProps) {
  return (
    <FadeUp delay={0.15}>
      <DashboardCard className={cn('py-14 text-center', className)}>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald/25 bg-emerald/[0.08]">
          <Brain className="h-7 w-7 text-emerald" strokeWidth={1.75} />
        </div>
        <h2 className="font-heading text-2xl text-foreground">No flashcards yet</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          Record or upload lectures, then generate flashcards automatically. Saved cards use
          spaced repetition so you review them at the right time.
        </p>

        {canGenerateAll && onGenerateAll && (
          <button
            type="button"
            onClick={onGenerateAll}
            disabled={batchGenerating}
            className={cn(
              'mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background',
              'shadow-[0_0_24px_rgba(var(--color-accent-rgb),0.2)] hover:bg-accent-soft hover:-translate-y-0.5 transition-all duration-300',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
            )}
          >
            <Layers className={cn('h-4 w-4', batchGenerating && 'animate-pulse')} />
            {batchGenerating ? 'Generating deck…' : 'Generate deck from all lectures'}
          </button>
        )}

        {batchProgress && (
          <p className="mx-auto mt-4 max-w-sm text-xs text-muted">{batchProgress}</p>
        )}

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/dashboard/record"
            className={cn(
              'inline-flex items-center gap-2 rounded-full bg-red px-6 py-3 text-sm font-medium text-white',
              'shadow-[0_0_24px_rgba(239,68,68,0.2)] hover:bg-red/90 transition-all duration-300',
            )}
          >
            <Radio className="h-4 w-4" />
            Record Live
          </Link>
          <Link
            to="/dashboard/upload"
            className={cn(
              'inline-flex items-center gap-2 rounded-full border border-blue-500/25 px-6 py-3 text-sm font-medium text-blue-600 dark:text-blue-400',
              'bg-blue-500/[0.02] hover:border-blue-500/50 hover:bg-blue-500/[0.08] transition-all duration-300',
            )}
          >
            <Upload className="h-4 w-4" />
            Upload Lecture
          </Link>
        </div>
      </DashboardCard>
    </FadeUp>
  )
}

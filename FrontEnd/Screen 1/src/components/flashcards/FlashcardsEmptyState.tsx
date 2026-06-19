import { Link } from 'react-router-dom'
import { Brain, Layers, Mic2, Upload } from 'lucide-react'
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
          Record or upload lectures, then generate flashcards from transcripts. Saved cards use
          spaced repetition so you review them at the right time.
        </p>

        {canGenerateAll && onGenerateAll && (
          <button
            type="button"
            onClick={onGenerateAll}
            disabled={batchGenerating}
            className={cn(
              'mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background',
              'shadow-[0_0_24px_rgba(214,162,11,0.2)] hover:bg-accent-soft hover:-translate-y-0.5 transition-all duration-300',
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
              'inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-6 py-3 text-sm font-medium text-foreground',
              'bg-white/[0.03] hover:border-accent/25 hover:bg-accent/[0.06] transition-all duration-300',
            )}
          >
            <Mic2 className="h-4 w-4" />
            Record Live
          </Link>
          <Link
            to="/dashboard/upload"
            className={cn(
              'inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-6 py-3 text-sm font-medium text-foreground',
              'bg-white/[0.03] hover:border-accent/25 hover:bg-accent/[0.06] transition-all duration-300',
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

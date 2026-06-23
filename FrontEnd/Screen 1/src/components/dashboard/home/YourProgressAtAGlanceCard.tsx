import { TrendingUp } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { ProgressRing } from '@/components/dashboard/ui/ProgressRing'
import { ViewAllTasksButton } from '@/components/dashboard/ui/ViewAllTasksButton'
import { Skeleton } from '@/components/dashboard/ui/Skeleton'
import { type StudyMetrics } from '@/lib/studyMetrics'
import { cn } from '@/lib/utils'

interface YourProgressAtAGlanceCardProps {
  metrics: StudyMetrics
  loading?: boolean
}

export function YourProgressAtAGlanceCard({
  metrics,
  loading = false,
}: YourProgressAtAGlanceCardProps) {

  return (
    <FadeUp delay={0.1}>
      <div
        className={cn(
          'relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08]',
          'bg-[#0d0d0d]/95 backdrop-blur-xl p-5 md:p-6',
          'transition-all duration-300',
        )}
      >
        <div className="relative mb-5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/20 bg-accent/[0.1]">
            <TrendingUp className="h-4 w-4 text-accent" strokeWidth={1.75} />
          </div>
          <p className="text-xs font-semibold tracking-[0.15em] uppercase text-foreground">
            Your Progress at a Glance
          </p>
        </div>

        <div className="relative mb-5 flex flex-1 flex-col items-center justify-center text-center p-2">
          <div className="shrink-0 mb-4">
            {loading ? (
              <Skeleton className="h-[130px] w-[130px] rounded-full" />
            ) : (
              <ProgressRing
                progress={metrics.progressPercent}
                size={130}
                strokeWidth={5}
                color="gold"
                gradient
                centerSubLabel="Overall progress"
                centerLabelGold
              />
            )}
          </div>
          <p className="text-sm text-muted leading-relaxed max-w-[240px]">
            {metrics.totalCards > 0 
              ? `You have mastered ${metrics.masteredCards} out of ${metrics.totalCards} cards in your active learning stack.`
              : 'Add lectures to generate study flashcards and begin tracking your mastery.'}
          </p>
        </div>

        <ViewAllTasksButton to="/dashboard/revision" label="View full progress" />
      </div>
    </FadeUp>
  )
}

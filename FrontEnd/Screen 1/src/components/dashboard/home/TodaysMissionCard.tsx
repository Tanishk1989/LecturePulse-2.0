import { Calendar, Clock, Flame, Layers, Target } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { ProgressRing } from '@/components/dashboard/ui/ProgressRing'
import { ViewAllTasksButton } from '@/components/dashboard/ui/ViewAllTasksButton'
import { Skeleton } from '@/components/dashboard/ui/Skeleton'
import { formatStudyMinutes, type StudyMetrics } from '@/lib/studyMetrics'
import { cn } from '@/lib/utils'

interface TodaysMissionCardProps {
  metrics: StudyMetrics
  loading?: boolean
}

export function TodaysMissionCard({ metrics, loading = false }: TodaysMissionCardProps) {
  const missionMetrics = [
    {
      id: 'tasks',
      value: String(metrics.tasksDueToday),
      label: 'Tasks due today',
      icon: Calendar,
    },
    {
      id: 'study',
      value: formatStudyMinutes(metrics.studyTimeMinutes),
      label: 'Study time today',
      icon: Clock,
    },
    {
      id: 'reviews',
      value: String(metrics.reviewsDue),
      label: 'Reviews due',
      icon: Layers,
    },
    {
      id: 'streak',
      value: `${metrics.streakDays} day${metrics.streakDays === 1 ? '' : 's'}`,
      label: 'Current streak',
      icon: Flame,
    },
  ]

  return (
    <FadeUp delay={0.1}>
      <div
        className={cn(
          'relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08]',
          'bg-[#0d0d0d]/95 backdrop-blur-xl p-5 md:p-6',
          'transition-all duration-300',
        )}
      >
        <div className="relative flex items-center gap-2.5 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/[0.1] border border-accent/20">
            <Target className="h-4 w-4 text-accent" strokeWidth={1.75} />
          </div>
          <p className="text-xs font-semibold tracking-[0.15em] uppercase text-foreground">
            Today&apos;s Mission
          </p>
        </div>

        <div className="relative flex flex-1 items-center gap-4 mb-5">
          <div className="flex-1 space-y-3.5 min-w-0">
            {loading
              ? missionMetrics.map(({ id }) => (
                  <Skeleton key={id} className="h-9 w-full rounded-lg" />
                ))
              : missionMetrics.map(({ id, value, label, icon: Icon }) => (
                  <div key={id} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/[0.08] border border-accent/15">
                      <Icon className="h-4 w-4 text-accent" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm leading-snug min-w-0">
                      <span className="font-semibold text-foreground">{value}</span>{' '}
                      <span className="text-muted">{label}</span>
                    </p>
                  </div>
                ))}
          </div>

          <div className="shrink-0 pr-1">
            {loading ? (
              <Skeleton className="h-[120px] w-[120px] rounded-full" />
            ) : (
              <ProgressRing
                progress={metrics.progressPercent}
                size={120}
                strokeWidth={5}
                color="gold"
                gradient
                centerSubLabel="Progress"
                centerLabelGold
              />
            )}
          </div>
        </div>

        <ViewAllTasksButton to="/dashboard/revision" label="View revision schedule" />
      </div>
    </FadeUp>
  )
}

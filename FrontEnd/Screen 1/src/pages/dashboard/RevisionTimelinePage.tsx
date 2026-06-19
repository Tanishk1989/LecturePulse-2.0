import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, Layers, Sparkles } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { Skeleton } from '@/components/dashboard/ui/Skeleton'
import { useStudyMetrics } from '@/hooks/useStudyMetrics'
import { formatRelativeDate } from '@/lib/formatDuration'
import { cn } from '@/lib/utils'

const bucketAccent: Record<string, string> = {
  overdue: 'border-red-400/30 bg-red-400/[0.06] text-red-300',
  today: 'border-accent/30 bg-accent/[0.08] text-accent',
  tomorrow: 'border-ambient/30 bg-ambient/[0.08] text-ambient',
  week: 'border-sky-400/25 bg-sky-400/[0.06] text-sky-300',
  later: 'border-white/10 bg-white/[0.03] text-muted',
}

export function RevisionTimelinePage() {
  const { revisionBuckets, lectureTitles, loading, metrics } = useStudyMetrics()
  const dueCount = metrics.reviewsDue
  const scheduledCount = revisionBuckets.reduce((total, bucket) => total + bucket.cards.length, 0)

  return (
    <DashboardPageShell>
      <FadeUp>
        <DashboardPageHeader
          title="Revision Timeline"
          description="Your spaced repetition schedule — review at the right time to lock in what you've learned."
        />
      </FadeUp>

      <FadeUp delay={0.08}>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-accent/20 bg-accent/[0.06] p-5">
            <p className="text-xs uppercase tracking-wider text-muted">Due now</p>
            <p className="mt-2 font-heading text-3xl text-accent">{dueCount}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-card/80 p-5">
            <p className="text-xs uppercase tracking-wider text-muted">Scheduled</p>
            <p className="mt-2 font-heading text-3xl text-foreground">{scheduledCount}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-card/80 p-5">
            <p className="text-xs uppercase tracking-wider text-muted">Mastered</p>
            <p className="mt-2 font-heading text-3xl text-emerald">{metrics.masteredCards}</p>
          </div>
        </div>
      </FadeUp>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : revisionBuckets.length === 0 ? (
        <FadeUp delay={0.12}>
          <div className="rounded-2xl border border-white/[0.08] bg-card/80 p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent/[0.08]">
              <CalendarClock className="h-8 w-8 text-accent" strokeWidth={1.5} />
            </div>
            <p className="mt-6 text-lg font-medium text-foreground">No reviews scheduled yet</p>
            <p className="mt-2 text-sm text-muted max-w-md mx-auto">
              Generate flashcards from your lectures to start a spaced repetition schedule.
            </p>
            <Link
              to="/dashboard/flashcards"
              className={cn(
                'mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-medium text-background',
                'hover:bg-accent-soft transition-colors',
              )}
            >
              Open flashcards
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </FadeUp>
      ) : (
        <div className="space-y-6">
          {revisionBuckets.map((bucket, index) => (
            <FadeUp key={bucket.id} delay={0.1 + index * 0.05}>
              <section className="rounded-2xl border border-white/[0.08] bg-card/80 overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
                        bucketAccent[bucket.id],
                      )}
                    >
                      {bucket.label}
                    </span>
                    <p className="text-sm text-muted">
                      {bucket.cards.length} card{bucket.cards.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  {(bucket.id === 'overdue' || bucket.id === 'today') && (
                    <Link
                      to="/dashboard/flashcards"
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-soft"
                    >
                      Study now
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                <ul className="divide-y divide-white/[0.05]">
                  {bucket.cards.map((card) => (
                    <li key={card.id} className="flex items-start gap-4 px-5 py-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                        <Layers className="h-4 w-4 text-accent" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{card.front}</p>
                        <p className="mt-1 text-xs text-muted truncate">
                          {lectureTitles[card.lectureId] ?? 'Lecture'} ·{' '}
                          {card.status === 'new' ? 'New card' : card.status}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-medium text-foreground">
                          {card.nextReviewAt ? formatRelativeDate(card.nextReviewAt) : 'Now'}
                        </p>
                        {card.lastReviewedAt && (
                          <p className="mt-0.5 text-[10px] text-muted">
                            Last {formatRelativeDate(card.lastReviewedAt)}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </FadeUp>
          ))}
        </div>
      )}

      {!loading && dueCount > 0 && (
        <FadeUp delay={0.2}>
          <Link
            to="/dashboard/flashcards"
            className={cn(
              'flex items-center justify-center gap-2 rounded-2xl border border-accent/25 bg-accent/[0.08] py-4',
              'text-sm font-medium text-accent hover:bg-accent/[0.12] transition-colors',
            )}
          >
            <Sparkles className="h-4 w-4" />
            Review {dueCount} due flashcard{dueCount === 1 ? '' : 's'}
          </Link>
        </FadeUp>
      )}
    </DashboardPageShell>
  )
}

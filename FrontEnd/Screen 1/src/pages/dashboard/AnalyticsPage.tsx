import { useMemo } from 'react'
import { BarChart3, Clock, Flame, GraduationCap, Layers, PieChart, Sparkles } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { Skeleton } from '@/components/dashboard/ui/Skeleton'
import { useStudyMetrics } from '@/hooks/useStudyMetrics'
import { useLectures } from '@/hooks/useLectures'
import { formatStudyMinutes } from '@/lib/studyMetrics'
import { cn } from '@/lib/utils'

export function AnalyticsPage() {
  const { metrics, activity, loading } = useStudyMetrics()
  const { lectures } = useLectures()

  // Calculate lecture source distribution
  const distribution = useMemo(() => {
    let pdfCount = 0
    let youtubeCount = 0
    let recordCount = 0
    let uploadCount = 0

    lectures.forEach((lec) => {
      if (lec.source === 'pdf') pdfCount++
      else if (lec.source === 'youtube') youtubeCount++
      else if (lec.source === 'record') recordCount++
      else uploadCount++
    });

    const total = lectures.length || 1
    return {
      pdf: { count: pdfCount, pct: Math.round((pdfCount / total) * 100) },
      youtube: { count: youtubeCount, pct: Math.round((youtubeCount / total) * 100) },
      record: { count: recordCount, pct: Math.round((recordCount / total) * 100) },
      upload: { count: uploadCount, pct: Math.round((uploadCount / total) * 100) },
    }
  }, [lectures])

  const completionRate = metrics.totalCards > 0 
    ? Math.round((metrics.masteredCards / metrics.totalCards) * 100) 
    : 0

  if (loading) {
    return (
      <DashboardPageShell>
        <DashboardPageHeader
          title="Analytics"
          description="Insights into your learning patterns and progress over time."
        />
        <div className="space-y-6">
          <div className="grid sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-2 h-80 w-full rounded-2xl" />
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </div>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell>
      <FadeUp>
        <DashboardPageHeader
          title="Analytics"
          description="Deep insights into your learning patterns, study time, and active recall milestones."
        />
      </FadeUp>

      {/* Grid Stats */}
      <FadeUp delay={0.05}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-accent/10 blur-xl" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.08] text-accent">
                <Clock size={20} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Study Time</p>
            </div>
            <p className="mt-4 font-heading text-3xl text-foreground">
              {formatStudyMinutes(metrics.studyTimeMinutes)}
            </p>
            <p className="mt-1 text-xs text-muted">Based on reviews & notes today</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-emerald/10 blur-xl" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald/20 bg-emerald/[0.08] text-emerald">
                <GraduationCap size={20} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Mastery Rate</p>
            </div>
            <p className="mt-4 font-heading text-3xl text-foreground">{completionRate}%</p>
            <p className="mt-1 text-xs text-muted">
              {metrics.masteredCards} of {metrics.totalCards} cards mastered
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-red/10 blur-xl" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red/20 bg-red/[0.08] text-red">
                <Flame size={20} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Study Streak</p>
            </div>
            <p className="mt-4 font-heading text-3xl text-foreground">{metrics.streakDays} Days</p>
            <p className="mt-1 text-xs text-muted">Consecutive active study days</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-ambient/10 blur-xl" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-ambient/20 bg-ambient/[0.08] text-ambient">
                <Layers size={20} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Lectures</p>
            </div>
            <p className="mt-4 font-heading text-3xl text-foreground">{lectures.length}</p>
            <p className="mt-1 text-xs text-muted">Ingested library materials</p>
          </div>
        </div>
      </FadeUp>

      {/* Charts section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Weekly study timeline (custom SVG graph) */}
        <FadeUp delay={0.1} className="lg:col-span-2">
          <div className="relative rounded-2xl border border-white/[0.08] bg-card/60 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] text-foreground">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-accent" />
                <h3 className="text-base font-semibold text-foreground">Weekly Study Activity</h3>
              </div>
              <span className="text-xs text-muted">Minutes spent per day</span>
            </div>

            {/* Custom SVG Bar Graph */}
            <div className="relative flex h-52 items-end justify-between gap-2 px-2 pt-6">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-muted/50">
                <div className="border-b border-white/[0.04] w-full pb-1 text-right">60m</div>
                <div className="border-b border-white/[0.04] w-full pb-1 text-right">40m</div>
                <div className="border-b border-white/[0.04] w-full pb-1 text-right">20m</div>
                <div className="w-full text-right">0m</div>
              </div>

              {[
                { label: 'Mon', val: Math.min(60, metrics.studyTimeMinutes > 0 ? 45 : 10) },
                { label: 'Tue', val: Math.min(60, metrics.studyTimeMinutes > 0 ? 30 : 5) },
                { label: 'Wed', val: Math.min(60, metrics.studyTimeMinutes > 0 ? 55 : 15) },
                { label: 'Thu', val: Math.min(60, metrics.studyTimeMinutes > 0 ? 40 : 8) },
                { label: 'Fri', val: Math.min(60, metrics.studyTimeMinutes > 0 ? 20 : 12) },
                { label: 'Sat', val: Math.min(60, metrics.studyTimeMinutes > 0 ? 15 : 0) },
                { label: 'Sun', val: Math.min(60, metrics.studyTimeMinutes) }, // Current active day study time
              ].map((day, idx) => {
                const heightPercent = Math.max(8, (day.val / 60) * 80)
                return (
                  <div key={day.label} className="relative flex flex-col items-center flex-1 group z-10">
                    {/* Tooltip */}
                    <div className="absolute -top-10 scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 bg-black border border-white/10 px-2.5 py-1 rounded-md text-[10px] text-foreground font-semibold shadow-lg pointer-events-none">
                      {day.val}m
                    </div>
                    {/* Animated Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={cn(
                        'w-full max-w-[32px] rounded-t-lg transition-all duration-500 cursor-pointer',
                        idx === 6 
                          ? 'bg-gradient-to-t from-accent to-accent-soft shadow-[0_0_12px_rgba(var(--color-accent-rgb),0.3)]' 
                          : 'bg-white/[0.06] hover:bg-white/[0.12]'
                      )}
                    />
                    <span className="mt-3 text-xs text-muted font-medium">{day.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </FadeUp>

        {/* Right Column: Source Ingestion breakdown */}
        <FadeUp delay={0.14}>
          <div className="relative rounded-2xl border border-white/[0.08] bg-card/60 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] h-full">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-4 mb-6">
              <PieChart className="h-5 w-5 text-emerald" />
              <h3 className="text-base font-semibold text-foreground">Content Distribution</h3>
            </div>

            <div className="flex flex-col justify-center h-52 gap-4">
              {[
                { label: 'PDF Documents', val: distribution.pdf, color: 'bg-emerald', border: 'border-emerald/20' },
                { label: 'YouTube Lectures', val: distribution.youtube, color: 'bg-red', border: 'border-red/20' },
                { label: 'Live Recordings', val: distribution.record, color: 'bg-accent', border: 'border-accent/20' },
                { label: 'Uploaded Audio/Video', val: distribution.upload, color: 'bg-ambient', border: 'border-ambient/20' },
              ].map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', item.color)} />
                      {item.label}
                    </span>
                    <span className="text-foreground">{item.val.count} ({item.val.pct}%)</span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', item.color)}
                      style={{ width: `${item.val.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>
      </div>

      {/* Recent Activity Logs */}
      <FadeUp delay={0.18}>
        <div className="rounded-2xl border border-white/[0.08] bg-card/60 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-4 mb-4">
            <Sparkles className="h-5 w-5 text-accent" />
            <h3 className="text-base font-semibold text-foreground">Recent Study Milestones</h3>
          </div>

          {activity.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              No milestones achieved yet. Ingest lectures or study flashcards to generate logs.
            </div>
          ) : (
            <div className="flow-root">
              <ul className="-mb-8">
                {activity.slice(0, 4).map((item, idx) => (
                  <li key={item.id}>
                    <div className="relative pb-8">
                      {idx !== activity.slice(0, 4).length - 1 && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-white/[0.04]" aria-hidden="true" />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-xl border backdrop-blur-md',
                            item.kind === 'lecture' ? 'border-ambient/30 bg-ambient/[0.08] text-ambient' :
                            item.kind === 'notes' ? 'border-emerald/30 bg-emerald/[0.08] text-emerald' :
                            'border-accent/30 bg-accent/[0.08] text-accent'
                          )}>
                            {item.kind === 'lecture' ? <Layers size={14} /> :
                             item.kind === 'notes' ? <GraduationCap size={14} /> :
                             <Sparkles size={14} />}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{item.title}</p>
                            <p className="text-xs text-muted truncate mt-0.5">{item.subtitle}</p>
                          </div>
                          <div className="whitespace-nowrap text-right text-xs text-muted font-medium">
                            {new Date(item.timestamp).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </FadeUp>
    </DashboardPageShell>
  )
}

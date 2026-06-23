import { useEffect, useState, useMemo } from 'react'
import { CalendarClock, Flame, Award, Sparkles } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { Skeleton } from '@/components/dashboard/ui/Skeleton'
import { getStreakData, useStreakFreeze, letGoStreak, type StreakData } from '@/services/streakService'
import { useToast } from '@/components/ui/ToastProvider'
import { cn } from '@/lib/utils'

const SnowflakeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn("text-sky-400", className)}>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <line x1="12" y1="2" x2="12" y2="22"></line>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
    <line x1="4.93" y1="19.07" x2="19.07" y2="4.93"></line>
  </svg>
)

export function StreakPage() {
  const [streakData, setStreakData] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const data = await getStreakData()
      setStreakData(data)
    } catch (err) {
      console.error('Failed to load streak data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleUseFreeze = async () => {
    setActionLoading(true)
    try {
      const res = await useStreakFreeze()
      if (res.success) {
        toast.success('❄️ Streak protected with a freeze!')
        await loadData()
      }
    } catch (err) {
      toast.error('Failed to apply streak freeze.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLetGo = async () => {
    setActionLoading(true)
    try {
      const res = await letGoStreak()
      if (res.success) {
        toast.success('Streak reset. Start fresh today!')
        await loadData()
      }
    } catch (err) {
      toast.error('Failed to reset streak.')
    } finally {
      setActionLoading(false)
    }
  }

  // Generate 52 weeks grid (7 rows × 52 cols)
  const heatmapWeeks = useMemo(() => {
    if (!streakData) return []

    const weeks = []
    const now = new Date()
    
    // Find Monday of the current week
    const day = now.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday)

    // Monday of 51 weeks ago
    const startMonday = new Date(currentMonday.getTime() - 51 * 7 * 24 * 60 * 60 * 1000)

    for (let w = 0; w < 52; w++) {
      const weekDays = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(startMonday.getTime() + (w * 7 + d) * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        
        const sessionsCount = streakData.sessions[dateStr] || 0
        const isFrozen = streakData.frozenDates.includes(dateStr)

        weekDays.push({
          date,
          dateStr,
          sessionsCount,
          isFrozen,
          isFuture: date.getTime() > now.getTime()
        })
      }
      weeks.push(weekDays)
    }
    return weeks
  }, [streakData])

  // Get month labels above columns
  const monthLabels = useMemo(() => {
    const labels: { index: number; label: string }[] = []
    let lastMonth = -1

    heatmapWeeks.forEach((week, idx) => {
      const monday = week[0]?.date
      if (monday) {
        const month = monday.getMonth()
        if (month !== lastMonth) {
          labels.push({
            index: idx,
            label: monday.toLocaleDateString('en-US', { month: 'short' })
          })
          lastMonth = month
        }
      }
    })

    // Filter labels that are too close to each other
    return labels.filter((lbl, i, arr) => {
      if (i === 0) return true
      return lbl.index - arr[i - 1].index > 2
    })
  }, [heatmapWeeks])

  const getCellClassName = (day: any) => {
    if (day.isFuture) return 'bg-[#09090b]/40 border border-white/[0.01] pointer-events-none'
    if (day.isFrozen) return 'border border-sky-500/30 bg-[#0e2233] flex items-center justify-center'
    
    const count = day.sessionsCount
    if (count === 0) return 'bg-[#18181b] border border-white/[0.03]'
    if (count === 1) return 'bg-[#1a3a1a]'
    if (count === 2) return 'bg-[#2d6a2d]'
    if (count === 3) return 'bg-[#3fa83f]'
    return 'bg-[#57e557]'
  }

  if (loading || !streakData) {
    return (
      <DashboardPageShell>
        <DashboardPageHeader
          title="Daily Streak"
          description="Build consistency and lock in knowledge."
        />
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell>
      <div className="max-w-4xl mx-auto space-y-8">
        <FadeUp>
          <DashboardPageHeader
            title="Daily Streak"
            description="Consistency is the key to locking in memories. Spend 5+ minutes reviewing notes daily to grow your streak!"
          />
        </FadeUp>

        {/* Yesterday Missed Protection Banner */}
        {streakData.hasMissedYesterday && (
          <FadeUp delay={0.02}>
            <div className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 text-sky-200/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                  <SnowflakeIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">You missed yesterday!</h4>
                  <p className="mt-1 text-xs text-muted">Use your streak freeze to protect your {streakData.currentStreak} day streak?</p>
                </div>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <button
                  onClick={handleUseFreeze}
                  disabled={actionLoading}
                  className="rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-[#09090b] hover:bg-sky-400 transition-all cursor-pointer disabled:opacity-50"
                >
                  Use Freeze
                </button>
                <button
                  onClick={handleLetGo}
                  disabled={actionLoading}
                  className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-semibold text-muted hover:text-foreground hover:bg-white/[0.04] transition-all cursor-pointer disabled:opacity-50"
                >
                  Let it go
                </button>
              </div>
            </div>
          </FadeUp>
        )}

        {/* Hero Streak Card */}
        <FadeUp delay={0.05}>
          <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-[#0e0c06] via-card to-[#120f04] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] text-center">
            {/* Ambient background glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-accent/15 blur-[80px] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Flame Badge */}
              <div className="relative mb-6">
                <div className="absolute inset-0 scale-125 bg-orange-500/20 blur-2xl rounded-full" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-orange-500/25 bg-orange-500/[0.08] shadow-[0_0_40px_rgba(249,115,22,0.15)]">
                  <Flame className="h-14 w-14 text-[#f97316] animate-pulse" strokeWidth={1.5} />
                </div>
              </div>

              <h2 className="font-heading text-5xl md:text-6xl text-foreground font-extrabold tracking-tight">
                {streakData.currentStreak}
              </h2>
              <p className="mt-2 text-base font-semibold uppercase tracking-wider text-orange-500">
                Day Study Streak
              </p>

              {/* Goal Progress bar */}
              <div className="mt-6 w-full max-w-sm">
                <div className="flex justify-between items-center text-xs font-medium text-muted mb-2">
                  <span>Weekly Goal: {streakData.weeklyGoalDays} of 7 days</span>
                  <span>{Math.round((streakData.weeklyGoalDays / 7) * 100)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-[#f97316] transition-all duration-500" 
                    style={{ width: `${(streakData.weeklyGoalDays / 7) * 100}%` }}
                  />
                </div>
              </div>

              {streakData.currentStreak === 0 ? (
                <p className="mt-6 max-w-md text-sm text-muted">
                  Start your streak today! Spend 5+ minutes reviewing any lecture notes to set it ablaze.
                </p>
              ) : (
                <p className="mt-6 max-w-md text-sm text-foreground/90 font-medium">
                  🔥 You're on a roll! Spend 5 minutes daily on lecture notes to protect it.
                </p>
              )}
            </div>
          </div>
        </FadeUp>

        {/* Heatmap Contribution Grid */}
        <FadeUp delay={0.1}>
          <div className="rounded-2xl border border-white/[0.08] bg-card/60 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-accent" />
                Study Contribution Heatmap
              </h3>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted">Less</span>
                <div className="flex gap-[2px]">
                  <div className="h-2.5 w-2.5 rounded-[2px] bg-[#18181b] border border-white/[0.03]" />
                  <div className="h-2.5 w-2.5 rounded-[2px] bg-[#1a3a1a]" />
                  <div className="h-2.5 w-2.5 rounded-[2px] bg-[#2d6a2d]" />
                  <div className="h-2.5 w-2.5 rounded-[2px] bg-[#3fa83f]" />
                  <div className="h-2.5 w-2.5 rounded-[2px] bg-[#57e557]" />
                </div>
                <span className="text-[10px] text-muted">More</span>
              </div>
            </div>

            <div className="flex justify-center md:justify-start overflow-x-auto pb-2">
              <div className="flex items-start">
                {/* Weekday labels */}
                <div className="grid grid-rows-7 h-[82px] text-[10px] text-muted-secondary pr-2 select-none pt-[1.5px] pb-[1.5px] font-medium leading-none">
                  <span className="row-start-1 flex items-center">Mon</span>
                  <span className="row-start-3 flex items-center">Wed</span>
                  <span className="row-start-5 flex items-center">Fri</span>
                </div>

                {/* Grid container */}
                <div className="flex flex-col">
                  {/* Months labels */}
                  <div className="relative w-full h-5 mb-1 text-[10px] text-muted-secondary select-none font-medium">
                    {monthLabels.map((lbl) => (
                      <span 
                        key={lbl.index} 
                        className={cn("absolute", lbl.index < 36 && "hidden md:inline")}
                        style={{ left: `${lbl.index * 12}px` }}
                      >
                        {lbl.label}
                      </span>
                    ))}
                    {/* Month labels for mobile shift */}
                    <div className="md:hidden">
                      {monthLabels.filter(lbl => lbl.index >= 36).map((lbl) => (
                        <span 
                          key={`mob-${lbl.index}`} 
                          className="absolute"
                          style={{ left: `${(lbl.index - 36) * 12}px` }}
                        >
                          {lbl.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Columns of weeks */}
                  <div className="flex gap-[2px]">
                    {heatmapWeeks.map((week, wIdx) => (
                      <div 
                        key={wIdx} 
                        className={cn("flex flex-col gap-[2px]", wIdx < 36 && "hidden md:flex")}
                      >
                        {week.map((day, dIdx) => {
                          const dateLabel = day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          const sessionsLabel = day.isFrozen 
                            ? 'Streak Frozen' 
                            : `${day.sessionsCount} session${day.sessionsCount === 1 ? '' : 's'} studied`
                          const tooltip = `${dateLabel} — ${sessionsLabel}`

                          return (
                            <div
                              key={dIdx}
                              title={day.isFuture ? undefined : tooltip}
                              className={cn(
                                'h-2.5 w-2.5 rounded-[2px] transition-colors duration-150',
                                getCellClassName(day)
                              )}
                            >
                              {day.isFrozen && <SnowflakeIcon className="h-1.5 w-1.5" />}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Freeze Badges and Stats */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Streak Freeze Badge & history */}
          <FadeUp delay={0.14}>
            <div className="rounded-2xl border border-white/[0.08] bg-card/60 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/[0.08] text-sky-400">
                  <SnowflakeIcon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">Streak Freeze</h4>
                    <span className="inline-flex rounded-full bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                      {streakData.freezeCount} available
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">Protects your streak if you miss a day. Replenishes every Monday.</p>
                </div>
              </div>

              {/* Freeze history log */}
              {streakData.history.length > 0 && (
                <div className="border-t border-white/[0.04] pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Usage History</p>
                  <div className="space-y-1">
                    {streakData.history.slice(0, 3).map((log, idx) => (
                      <p key={idx} className="text-xs text-muted/80 flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-sky-500/80" />
                        {log}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </FadeUp>

          {/* Record statistics */}
          <FadeUp delay={0.18}>
            <div className="rounded-2xl border border-white/[0.08] bg-card/60 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald/20 bg-emerald/[0.08] text-emerald">
                <Award size={22} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Longest Streak Record</h4>
                <p className="mt-1.5 font-heading text-2xl text-foreground font-bold">
                  {streakData.longestStreak} Days
                </p>
                <p className="mt-1 text-xs text-muted">Your all-time study consistency record.</p>
              </div>
            </div>
          </FadeUp>
        </div>

        {/* Educational/Motivational Advice */}
        <FadeUp delay={0.22}>
          <div className="rounded-2xl border border-white/[0.08] bg-card/60 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-foreground">Why study daily?</h4>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Daily study review strengthens memories and halts the forgetting curve. Reviewing concepts for just 5 minutes a day holds memory pathways in active states, increasing long-term recall efficiency by up to 50%!
              </p>
            </div>
          </div>
        </FadeUp>
      </div>
    </DashboardPageShell>
  )
}

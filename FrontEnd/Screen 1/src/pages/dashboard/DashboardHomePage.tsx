import { useState, useEffect } from 'react'
import { DashboardHero } from '@/components/dashboard/home/DashboardHero'
import { FutureViewSection } from '@/components/dashboard/home/FutureViewSection'
import { LiveLectureCard } from '@/components/dashboard/home/LiveLectureCard'
import { RecentLecturesSection } from '@/components/dashboard/home/RecentLecturesSection'
import { MainContentAmbient } from '@/components/dashboard/ui/MainContentAmbient'
import { DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { useStudyMetrics } from '@/hooks/useStudyMetrics'
import { useLectures } from '@/context/LectureContext'
import { KnowledgeGraphSpotlight } from '@/components/dashboard/home/KnowledgeGraphSpotlight'
import { getStreakData, useStreakFreeze, letGoStreak, type StreakData } from '@/services/streakService'
import { useToast } from '@/components/ui/ToastProvider'
import { cn } from '@/lib/utils'
import { FadeUp } from '@/components/effects/FadeUp'

const SnowflakeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn("text-sky-400", className)}>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <line x1="12" y1="2" x2="12" y2="22"></line>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
    <line x1="4.93" y1="19.07" x2="19.07" y2="4.93"></line>
  </svg>
)

export function DashboardHomePage() {
  const { metrics, loading: metricsLoading } = useStudyMetrics()
  const { lectures } = useLectures()
  const [streakData, setStreakData] = useState<StreakData | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const { toast } = useToast()

  const loadStreak = async () => {
    try {
      const data = await getStreakData()
      setStreakData(data)
    } catch (err) {
      console.error('Failed to load streak data on home:', err)
    }
  }

  useEffect(() => {
    loadStreak()
  }, [])

  const handleUseFreeze = async () => {
    setActionLoading(true)
    try {
      const res = await useStreakFreeze()
      if (res.success) {
        toast.success('❄️ Streak protected with a freeze!')
        await loadStreak()
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
        await loadStreak()
      }
    } catch (err) {
      toast.error('Failed to reset streak.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="relative">
      <MainContentAmbient />
      <DashboardPageShell className="relative space-y-5">
        {/* Yesterday Missed Protection Banner */}
        {streakData?.hasMissedYesterday && (
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

        <DashboardHero metrics={metrics} loading={metricsLoading} />
        <FutureViewSection lectureCount={lectures.length} />
        <KnowledgeGraphSpotlight />
        <LiveLectureCard />
        <RecentLecturesSection />
      </DashboardPageShell>
    </div>
  )
}


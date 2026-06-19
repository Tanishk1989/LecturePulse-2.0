import { DashboardHero } from '@/components/dashboard/home/DashboardHero'
import { TodaysMissionCard } from '@/components/dashboard/home/TodaysMissionCard'
import { LiveLectureCard } from '@/components/dashboard/home/LiveLectureCard'
import { CreateStatsSection } from '@/components/dashboard/home/CreateStatsSection'
import { RecentLecturesSection } from '@/components/dashboard/home/RecentLecturesSection'
import { RecentActivitySection } from '@/components/dashboard/home/RecentActivitySection'
import { MainContentAmbient } from '@/components/dashboard/ui/MainContentAmbient'
import { DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { useStudyMetrics } from '@/hooks/useStudyMetrics'

export function DashboardHomePage() {
  const { metrics, activity, loading } = useStudyMetrics()

  return (
    <div className="relative">
      <MainContentAmbient />
      <DashboardPageShell className="relative space-y-5">
        <DashboardHero />

        <div className="grid lg:grid-cols-2 gap-4">
          <TodaysMissionCard metrics={metrics} loading={loading} />
          <LiveLectureCard />
        </div>

        <CreateStatsSection studyTimeMinutes={metrics.studyTimeMinutes} />

        <div className="grid lg:grid-cols-2 gap-4">
          <RecentLecturesSection />
          <RecentActivitySection activity={activity} loading={loading} />
        </div>
      </DashboardPageShell>
    </div>
  )
}

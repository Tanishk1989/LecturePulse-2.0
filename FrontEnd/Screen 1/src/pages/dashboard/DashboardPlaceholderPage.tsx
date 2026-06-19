import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardCard } from '@/components/dashboard/ui/DashboardCard'
import { AmbientPageBackground } from '@/components/dashboard/ui/AmbientPageBackground'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { Skeleton, SkeletonText } from '@/components/dashboard/ui/Skeleton'

interface DashboardPlaceholderPageProps {
  title: string
  description: string
}

export function DashboardPlaceholderPage({ title, description }: DashboardPlaceholderPageProps) {
  return (
    <DashboardPageShell>
      <FadeUp>
        <DashboardPageHeader title={title} description={description} />
      </FadeUp>

      <FadeUp delay={0.1}>
        <div className="relative">
          <AmbientPageBackground className="rounded-3xl" />
          <DashboardCard className="relative min-h-[480px]">
            <div className="mb-6">
              <p className="text-sm text-muted">Waiting for lecture data</p>
            </div>
            <SkeletonText lines={5} />
            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <Skeleton className="h-44 w-full rounded-xl" />
              <Skeleton className="h-44 w-full rounded-xl" />
              <Skeleton className="h-44 w-full rounded-xl sm:col-span-2 lg:col-span-1" />
            </div>
          </DashboardCard>
        </div>
      </FadeUp>
    </DashboardPageShell>
  )
}

import { FadeUp } from '@/components/effects/FadeUp'
import { AITutorPanel } from '@/components/dashboard/AITutorPanel'
import { AmbientPageBackground } from '@/components/dashboard/ui/AmbientPageBackground'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'

export function AITutorPage() {
  return (
    <DashboardPageShell>
      <FadeUp>
        <DashboardPageHeader
          title="AI Tutor"
          description="Your personal learning assistant. Ask anything once you have lecture content."
        />
      </FadeUp>

      <FadeUp delay={0.1}>
        <div className="relative">
          <AmbientPageBackground variant="indigo" className="rounded-3xl" />
          <div className="relative">
            <AITutorPanel />
          </div>
        </div>
      </FadeUp>
    </DashboardPageShell>
  )
}

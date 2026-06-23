import { FileText } from 'lucide-react'
import { AddLectureHeroCTA } from '@/components/dashboard/AddLectureHeroCTA'
import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardCard } from '@/components/dashboard/ui/DashboardCard'

export function NotesHubEmptyState() {
  return (
    <FadeUp delay={0.15}>
      <DashboardCard className="py-14 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/25 bg-accent/[0.08]">
          <FileText className="h-7 w-7 text-accent" strokeWidth={1.75} />
        </div>
        <h2 className="font-heading text-2xl text-foreground">No lectures yet</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          Record or upload a lecture — smart notes are generated automatically.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center">
          <AddLectureHeroCTA />
        </div>
      </DashboardCard>
    </FadeUp>
  )
}

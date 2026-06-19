import { ParticleField } from '@/components/effects/ParticleField'
import { StatsGrid } from '@/components/dashboard/home/StatsGrid'
import { UploadSection } from '@/components/dashboard/home/UploadSection'
import { cn } from '@/lib/utils'

interface CreateStatsSectionProps {
  studyTimeMinutes?: number
}

export function CreateStatsSection({ studyTimeMinutes = 0 }: CreateStatsSectionProps) {
  return (
    <section className="relative rounded-3xl overflow-hidden">
      {/* Section ambient background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-24 left-1/4 h-64 w-64 rounded-full bg-accent/[0.06] blur-[100px]" />
        <div className="absolute -bottom-20 right-1/4 h-56 w-56 rounded-full bg-ambient/[0.07] blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <ParticleField count={18} yellowRatio={0.45} />
      </div>

      <div className={cn('relative space-y-6 py-2')}>
        <UploadSection />
        <StatsGrid studyTimeMinutes={studyTimeMinutes} />
      </div>
    </section>
  )
}

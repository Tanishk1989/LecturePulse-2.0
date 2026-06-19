import { FadeUp } from '@/components/effects/FadeUp'
import { MainContentAmbient } from '@/components/dashboard/ui/MainContentAmbient'
import { useAuth } from '@/hooks/useAuth'

function getHeadline() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Rise and learn.'
  if (hour < 17) return 'Keep the momentum.'
  return 'Finish what you started.'
}

export function DashboardHero() {
  const { user } = useAuth()
  const firstName = user?.displayName?.split(' ')[0]

  return (
    <FadeUp>
      <div className="relative py-2 md:py-4">
        <MainContentAmbient className="rounded-3xl -inset-x-4 md:-inset-x-6" />

        <div className="relative">
          <h1 className="font-heading text-4xl sm:text-5xl md:text-[3.25rem] text-foreground leading-[0.95] max-w-3xl">
            {getHeadline()}{' '}
            {firstName && (
              <>
                <span className="text-gradient-pulse">{firstName}</span>.
              </>
            )}
          </h1>
          <p className="mt-3 text-base md:text-lg text-muted leading-relaxed max-w-xl">
            Let&apos;s continue your learning journey.
          </p>
        </div>
      </div>
    </FadeUp>
  )
}

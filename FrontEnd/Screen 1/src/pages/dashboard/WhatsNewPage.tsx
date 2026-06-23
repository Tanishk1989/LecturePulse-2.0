import { useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { changelogEntries, CURRENT_CHANGELOG_VERSION } from '@/config/changelog'
import { useAuth } from '@/hooks/useAuth'
import { loadUserPreferences, saveUserPreferences } from '@/lib/userPreferences'
import { cn } from '@/lib/utils'

export function WhatsNewPage() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    const prefs = loadUserPreferences(user.uid)
    if (prefs.lastSeenChangelogVersion !== CURRENT_CHANGELOG_VERSION) {
      saveUserPreferences(user.uid, {
        ...prefs,
        lastSeenChangelogVersion: CURRENT_CHANGELOG_VERSION,
      })
    }
  }, [user])

  return (
    <DashboardPageShell>
      <FadeUp>
        <DashboardPageHeader
          title="What's new"
          description="Recent updates and improvements to LecturePulse."
        />
      </FadeUp>

      <FadeUp delay={0.1}>
        <div className="max-w-2xl space-y-5">
          {changelogEntries.map((entry, index) => (
            <article
              key={entry.version}
              className={cn(
                'rounded-2xl border border-white/[0.08] bg-card/80 p-6 backdrop-blur-xl',
                index === 0 && 'border-accent/20 shadow-[0_0_32px_rgba(180,230,29,0.06)]',
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/[0.08]">
                  <Sparkles className="h-5 w-5 text-accent" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">{entry.title}</h2>
                    {index === 0 && (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                        Latest
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    v{entry.version} · {entry.date}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {entry.highlights.map((highlight) => (
                      <li key={highlight} className="flex gap-2 text-sm text-foreground/90">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </FadeUp>
    </DashboardPageShell>
  )
}

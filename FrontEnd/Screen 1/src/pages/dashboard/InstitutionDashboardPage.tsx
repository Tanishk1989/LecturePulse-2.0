import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, BarChart3, Loader2, Users } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { Skeleton } from '@/components/dashboard/ui/Skeleton'
import { fetchInstitutionAnalytics, type InstitutionAnalytics } from '@/services/analyticsService'
import { useI18n } from '@/context/I18nContext'
import { cn } from '@/lib/utils'

export function InstitutionDashboardPage() {
  const { translate } = useI18n()
  const [data, setData] = useState<InstitutionAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchInstitutionAnalytics()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load analytics.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardPageShell className="space-y-8">
      <FadeUp>
        <DashboardPageHeader
          title={translate('institution.title')}
          description={translate('institution.description')}
        />
      </FadeUp>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red/20 bg-red/[0.06] p-6 text-sm text-red-200">{error}</div>
      ) : data ? (
        <>
          <FadeUp delay={0.05}>
            <div className="grid sm:grid-cols-3 gap-3">
              <StatCard icon={Users} label="Active students" value={String(data.overview.activeStudents)} />
              <StatCard icon={BarChart3} label="Completed lectures" value={String(data.overview.completedLectures)} />
              <StatCard icon={AlertTriangle} label="Quiz attempts" value={String(data.overview.quizAttempts)} />
            </div>
          </FadeUp>

          <div className="grid lg:grid-cols-2 gap-6">
            <FadeUp delay={0.08}>
              <Panel title={translate('institution.confusing')}>
                {data.confusingTopics.length === 0 ? (
                  <p className="text-sm text-muted">Not enough quiz data yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.confusingTopics.map((topic) => (
                      <li key={topic.concept} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-foreground">{topic.concept}</span>
                        <span className="text-xs font-medium text-red-300 bg-red/10 border border-red/20 rounded-full px-2.5 py-1">
                          {topic.wrongCount} misses
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </FadeUp>

            <FadeUp delay={0.1}>
              <Panel title={translate('institution.subjects')}>
                {data.subjectsNeedingReview.length === 0 ? (
                  <p className="text-sm text-muted">No negative feedback recorded yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.subjectsNeedingReview.map((row) => (
                      <li key={row.subject} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-foreground">{row.subject}</span>
                        <span className="text-xs text-muted">{row.reportCount} reports</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </FadeUp>
          </div>

          <FadeUp delay={0.12}>
            <p className="text-xs text-muted text-center">{translate('institution.anonymized')}</p>
          </FadeUp>
        </>
      ) : null}
    </DashboardPageShell>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-card/80 p-5">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="h-4 w-4 text-accent" />
        <p className="text-xs uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-2 font-heading text-3xl text-foreground">{value}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-white/[0.08] bg-card/80 p-6')}>
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </div>
  )
}

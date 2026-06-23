import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, BookOpen, Layers, Mic } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { Skeleton } from '@/components/dashboard/ui/Skeleton'
import { formatRelativeDate } from '@/lib/formatDuration'
import type { ActivityItem } from '@/lib/studyMetrics'
import { cn } from '@/lib/utils'

const kindIcon = {
  lecture: Mic,
  notes: BookOpen,
  review: Layers,
} as const

interface RecentActivitySectionProps {
  activity: ActivityItem[]
  loading?: boolean
}

export function RecentActivitySection({ activity, loading = false }: RecentActivitySectionProps) {
  const hasActivity = activity.length > 0

  return (
    <FadeUp delay={0.28}>
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/90 backdrop-blur-xl p-6 min-h-[260px] flex flex-col">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-ambient" strokeWidth={1.75} />
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted">
              Recent Activity
            </p>
          </div>
          {hasActivity && (
            <Link
              to="/dashboard/revision"
              className="text-xs font-medium text-accent hover:text-accent-soft"
            >
              View schedule
            </Link>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : !hasActivity ? (
          <div className="relative flex flex-1 flex-col items-center justify-center text-center py-2">
            <div className="relative h-20 w-20 mb-5">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <motion.circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="rgba(var(--color-accent-rgb),0.12)"
                  strokeWidth="1.5"
                  strokeDasharray="3 5"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </svg>
            </div>
            <p className="text-base font-medium text-foreground">No recent activity</p>
            <p className="mt-1.5 text-sm text-muted max-w-xs">
              Your study sessions and reviews will show up here.
            </p>
            <Link
              to="/dashboard/upload"
              className={cn(
                'mt-5 inline-flex items-center rounded-lg border border-accent/25 bg-accent/[0.08] px-5 py-2.5 text-sm font-medium text-accent',
                'hover:bg-accent/[0.12] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
              )}
            >
              Upload a lecture
            </Link>
          </div>
        ) : (
          <ul className="space-y-2 flex-1">
            {activity.map((item, index) => {
              const Icon = kindIcon[item.kind]
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <Link
                    to={item.href}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3',
                      'hover:border-white/[0.12] hover:bg-white/[0.04] transition-colors',
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                      <Icon className="h-4 w-4 text-accent" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      <p className="text-xs text-muted truncate">{item.subtitle}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-xs text-muted">
                      <span>{formatRelativeDate(item.timestamp)}</span>
                      <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </div>
                  </Link>
                </motion.li>
              )
            })}
          </ul>
        )}
      </div>
    </FadeUp>
  )
}

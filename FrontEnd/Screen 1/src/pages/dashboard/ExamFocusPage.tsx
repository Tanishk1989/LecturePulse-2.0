import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, BarChart3, Calendar, Clock, Target, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FadeUp } from '@/components/effects/FadeUp'
import { ParticleField } from '@/components/effects/ParticleField'
import { MetricMiniCard } from '@/components/dashboard/ui/MetricMiniCard'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { Skeleton } from '@/components/dashboard/ui/Skeleton'
import { useExamFocus } from '@/hooks/useExamFocus'
import { formatExamFocusTime } from '@/lib/examFocus'
import { cn } from '@/lib/utils'

function ExamFocusBackground() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute inset-0 star-particles opacity-35" />
      <ParticleField count={40} yellowRatio={0.5} />
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.05] via-transparent to-ambient/[0.06]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-accent/[0.04] blur-[100px]" />

      <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden>
        {[...Array(10)].map((_, i) => (
          <motion.line
            key={i}
            x1={`${8 + i * 9}%`}
            y1="0%"
            x2={`${28 + i * 8}%`}
            y2="100%"
            stroke="rgba(var(--color-accent-rgb),0.35)"
            strokeWidth="1"
            animate={prefersReducedMotion ? {} : { opacity: [0.1, 0.45, 0.1] }}
            transition={{ duration: 3.5 + i * 0.35, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </svg>
    </div>
  )
}

export function ExamFocusPage() {
  const { insights, loading } = useExamFocus()
  const {
    focusAreas,
    upcomingTopic,
    upcomingLectureId,
    importanceScore,
    reviewTimeMinutes,
    confidencePercent,
    readinessPercent,
    reviewScheduleCount,
    commonMistakes,
    hasData,
  } = insights

  return (
    <DashboardPageShell>
      <FadeUp>
        <DashboardPageHeader
          title="Exam Focus"
          description="AI-powered exam preparation built from your smart notes and flashcard weak spots."
        />
      </FadeUp>

      <FadeUp delay={0.1}>
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border border-accent/15',
            'bg-card/80 backdrop-blur-xl min-h-[560px] lg:min-h-[600px]',
          )}
        >
          <ExamFocusBackground />
          <div className="absolute inset-0 glass-card opacity-20 pointer-events-none rounded-2xl" />

          <div className="relative z-10 grid lg:grid-cols-[220px_1fr_320px] gap-0 min-h-[560px] lg:min-h-[600px]">
            <div className="flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-white/[0.06] p-8 lg:p-10">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="flex h-28 w-28 items-center justify-center rounded-3xl border border-accent/25 bg-accent/[0.08] shadow-[0_0_60px_rgba(var(--color-accent-rgb),0.15)]"
              >
                <Target className="h-14 w-14 text-accent" strokeWidth={1.5} />
              </motion.div>
              <p className="mt-6 text-[10px] font-semibold tracking-[0.2em] uppercase text-accent">
                Exam Focus
              </p>
              <p className="mt-2 text-sm text-muted text-center">
                {hasData ? `${focusAreas.length} priority areas` : 'Waiting for lecture data'}
              </p>
            </div>

            <div className="flex flex-col justify-center p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-white/[0.06]">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md p-8 min-h-[260px] flex flex-col justify-center">
                <p className="text-xs font-medium uppercase tracking-wider text-muted mb-3">
                  Upcoming Topic
                </p>
                {loading ? (
                  <Skeleton className="h-10 w-3/4 rounded-lg" />
                ) : upcomingTopic ? (
                  <>
                    <p className="font-heading text-3xl text-foreground">{upcomingTopic}</p>
                    {upcomingLectureId && (
                      <Link
                        to={`/notes/${upcomingLectureId}`}
                        className="mt-4 inline-flex text-sm font-medium text-accent hover:text-accent-soft"
                      >
                        Open lecture notes
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-heading text-3xl text-foreground/40">—</p>
                    <p className="mt-4 text-sm text-muted leading-relaxed max-w-sm">
                      Generate smart notes or flashcards to unlock AI-powered exam insights.
                    </p>
                    <Link
                      to="/dashboard/upload"
                      className={cn(
                        'mt-6 inline-flex self-start items-center rounded-xl bg-accent px-6 py-3 text-sm font-medium text-background',
                        'shadow-[0_0_24px_rgba(var(--color-accent-rgb),0.2)] hover:bg-accent-soft hover:-translate-y-0.5',
                        'transition-all duration-300 cursor-pointer',
                      )}
                    >
                      Upload Lecture
                    </Link>
                  </>
                )}

                {!loading && focusAreas.length > 0 && (
                  <ul className="mt-6 space-y-2 border-t border-white/[0.06] pt-5">
                    {focusAreas.slice(0, 4).map((area) => (
                      <li key={area.id} className="flex items-start gap-2 text-sm text-foreground/90">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        <span className="line-clamp-2">{area.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="p-6 lg:p-8 flex flex-col justify-center gap-3">
              {loading ? (
                <>
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </>
              ) : (
                <>
                  <MetricMiniCard
                    label="Importance Score"
                    value={hasData ? String(importanceScore) : '—'}
                    icon={TrendingUp}
                    accent="gold"
                  />
                  <MetricMiniCard
                    label="Review Time"
                    value={formatExamFocusTime(reviewTimeMinutes)}
                    icon={Clock}
                    accent="indigo"
                  />
                  <MetricMiniCard
                    label="Confidence"
                    value={`${confidencePercent}%`}
                    icon={BarChart3}
                    accent="emerald"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={0.15}>
        <div className="grid md:grid-cols-3 gap-3">
          {loading ? (
            <>
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </>
          ) : (
            <>
              <MetricMiniCard label="Focus Areas" value={String(focusAreas.length)} icon={Target} accent="gold" />
              <MetricMiniCard
                label="Review Schedule"
                value={String(reviewScheduleCount)}
                icon={Calendar}
                accent="indigo"
              />
              <MetricMiniCard label="Readiness" value={`${readinessPercent}%`} icon={TrendingUp} accent="emerald" />
            </>
          )}
        </div>
      </FadeUp>

      {!loading && commonMistakes.length > 0 && (
        <FadeUp delay={0.2}>
          <div className="rounded-2xl border border-white/[0.08] bg-card/80 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-accent" strokeWidth={1.75} />
              <p className="text-sm font-medium text-foreground">Common mistakes to avoid</p>
            </div>
            <ul className="space-y-2">
              {commonMistakes.map((mistake) => (
                <li key={mistake} className="text-sm text-muted leading-relaxed">
                  {mistake}
                </li>
              ))}
            </ul>
          </div>
        </FadeUp>
      )}
    </DashboardPageShell>
  )
}

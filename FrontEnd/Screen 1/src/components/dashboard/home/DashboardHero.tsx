import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Library, Upload } from 'lucide-react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { Skeleton } from '@/components/dashboard/ui/Skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useLectures } from '@/context/LectureContext'
import { useDashboard } from '@/context/DashboardContext'
import { formatStudyMinutes, type StudyMetrics } from '@/lib/studyMetrics'
import { cn } from '@/lib/utils'

interface DashboardHeroProps {
  metrics: StudyMetrics
  loading?: boolean
}

const MotionLink = motion(Link)

export function DashboardHero({ metrics, loading = false }: DashboardHeroProps) {
  const { user } = useAuth()
  const { lectures } = useLectures()
  const { openTutor } = useDashboard()
  const firstName = user?.displayName?.split(' ')[0]
  const lectureCount = lectures.length

  const quickStats = [
    { label: 'Lectures', value: String(lectureCount) },
    { label: 'Study time', value: formatStudyMinutes(metrics.studyTimeMinutes) },
    { label: 'Cards mastered', value: `${metrics.masteredCards}/${metrics.totalCards}` },
    { label: 'Streak', value: `${metrics.streakDays}d` },
    { label: 'Tasks due', value: String(metrics.tasksDueToday) },
  ]

  const prefersReducedMotion = useReducedMotion()

  const [typedLength, setTypedLength] = useState(0)
  const [showCursor, setShowCursor] = useState(true)
  const [typingDone, setTypingDone] = useState(false)

  const prefix = 'Welcome back, '
  const fullText = firstName ? `${prefix}${firstName}` : 'Your AI lecture companion'

  useEffect(() => {
    if (prefersReducedMotion) {
      setTypedLength(fullText.length)
      setShowCursor(false)
      setTypingDone(true)
      return
    }

    setTypedLength(0)
    setShowCursor(true)
    setTypingDone(false)

    let current = 0
    const interval = setInterval(() => {
      current += 1
      setTypedLength(current)
      if (current >= fullText.length) {
        clearInterval(interval)
        setTypingDone(true)
        setTimeout(() => {
          setShowCursor(false)
        }, 1200)
      }
    }, 40) // 40ms per character

    return () => {
      clearInterval(interval)
    }
  }, [firstName, prefersReducedMotion, fullText])

  const containerVariants: Variants = prefersReducedMotion
    ? {
        hidden: { opacity: 1 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.5,
            ease: [0.21, 0.47, 0.32, 0.98],
            staggerChildren: 0.08,
            delayChildren: 0.05,
          },
        },
      }

  const childVariants: Variants = prefersReducedMotion
    ? {
        hidden: { opacity: 1 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { opacity: 0, y: 6 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.4,
            ease: 'easeOut',
          },
        },
      }

  return (
    <motion.div
      initial="hidden"
      animate={typingDone ? 'visible' : 'hidden'}
      variants={containerVariants}
      style={{
        background: 'var(--hero-gradient)',
        borderColor: 'var(--hero-border)',
        boxShadow: 'var(--hero-shadow)',
      }}
      className={cn(
        'relative overflow-hidden rounded-2xl border backdrop-blur-xl',
      )}
    >
      {/* Background depth & noise */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.05] via-transparent to-ambient/[0.04]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/[0.06] blur-[80px]"
        aria-hidden
      />
      {/* Subtle radial glow overlay (accent color at low opacity, fading to transparent) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 80% 20%, rgba(180, 230, 29, 0.04) 0%, transparent 60%)',
        }}
        aria-hidden
      />
      {/* Tactile noise overlay */}
      <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.02]" aria-hidden />

      <div className="relative px-8 py-10 md:px-10 md:py-12">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl text-left">
            {/* LECTUREPULSE & greeting heading (visible immediately to show typewriter) */}
            <div className="mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent/85">
                LecturePulse
              </p>
              <h1 className="mt-1.5 font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
                {firstName ? (
                  <>
                    {typedLength <= prefix.length ? (
                      <span>{fullText.slice(0, typedLength)}</span>
                    ) : (
                      <>
                        <span>{prefix}</span>
                        <span
                          className="text-gradient-pulse"
                          style={{ filter: 'drop-shadow(0 0 20px rgba(180, 230, 29, 0.35))' }}
                        >
                          {firstName.slice(0, typedLength - prefix.length)}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <span>{fullText.slice(0, typedLength)}</span>
                )}
                {showCursor && (
                  <span className="inline-block animate-pulse ml-0.5 font-light text-accent">|</span>
                )}
              </h1>
            </div>

            {/* Description text */}
            <motion.div variants={childVariants}>
              <p className="mt-4 text-sm text-muted leading-relaxed md:text-base">
                Record or upload lectures and turn them into smart notes, flashcards, and
                exam-ready insights — all in one place.
              </p>
            </motion.div>

            {/* Stats row */}
            <motion.div variants={childVariants} className="mt-6 flex flex-wrap gap-2">
              {loading
                ? [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-24 rounded-full" />)
                : quickStats.map((stat) => (
                    <motion.div
                      key={stat.label}
                      className="group inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.03] px-3.5 py-1.5 cursor-pointer transition-colors duration-150"
                      whileHover={
                        prefersReducedMotion
                          ? {}
                          : {
                              y: -1.5,
                              borderColor: 'var(--accent)',
                              backgroundColor: 'var(--bg-soft)',
                            }
                      }
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                    >
                      <span className="text-sm font-semibold tabular-nums text-foreground group-hover:text-accent transition-colors duration-150">
                        {stat.value}
                      </span>
                      <span className="text-xs text-muted group-hover:text-muted/80 transition-colors duration-150">
                        {stat.label}
                      </span>
                    </motion.div>
                  ))}
            </motion.div>
          </div>

          {/* Action buttons */}
          <motion.div variants={childVariants} className="flex shrink-0 flex-wrap items-center gap-2 w-full sm:w-auto">
            <MotionLink
              to="/dashboard/upload"
              className={cn(
                'inline-flex items-center justify-center rounded-lg font-medium w-full sm:w-auto',
                'h-11 sm:h-10 px-5 text-sm',
                'bg-accent text-background hover:bg-accent-light',
                'transition-colors duration-150',
              )}
              whileHover={
                prefersReducedMotion
                  ? {}
                  : {
                      scale: 1.02,
                      boxShadow: '0 0 16px rgba(180, 230, 29, 0.25)',
                    }
              }
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" strokeWidth={2} />
              Upload lecture
            </MotionLink>
            <MotionLink
              to="/dashboard/lectures"
              className={cn(
                'inline-flex items-center justify-center rounded-lg font-medium w-full sm:w-auto',
                'h-11 sm:h-10 px-5 text-sm',
                'border border-border bg-white/[0.03] text-foreground',
                'hover:border-border/80 hover:bg-white/[0.06]',
                'transition-all duration-150 ease-out',
              )}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <Library className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
              View library
            </MotionLink>
            <motion.button
              type="button"
              onClick={() => openTutor()}
              className={cn(
                'inline-flex items-center justify-center rounded-lg font-medium w-full sm:w-auto',
                'h-11 sm:h-10 px-4 text-sm text-accent',
                'border border-accent/20 bg-accent/[0.06]',
                'hover:border-accent/35 hover:bg-accent/[0.1]',
                'transition-all duration-150 ease-out cursor-pointer',
              )}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              Ask AI
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </motion.button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

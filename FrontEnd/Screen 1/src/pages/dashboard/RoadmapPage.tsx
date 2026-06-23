import { useMemo } from 'react'
import { Map, CheckCircle2, Radio, NotebookPen, Brain, Award, Sparkles } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { Skeleton } from '@/components/dashboard/ui/Skeleton'
import { useLectures } from '@/hooks/useLectures'
import { useUserNotes } from '@/hooks/useUserNotes'
import { useFlashcards } from '@/hooks/useFlashcards'
import { cn } from '@/lib/utils'

interface RoadmapStage {
  id: string
  label: string
  description: string
  isCompleted: boolean
  isActive: boolean
  icon: any
}

export function RoadmapPage() {
  const { lectures, loading: lecturesLoading } = useLectures()
  const { notes, loading: notesLoading } = useUserNotes()
  const { flashcards, loading: flashcardsLoading } = useFlashcards()

  const loading = lecturesLoading || notesLoading || flashcardsLoading

  // Calculate stage statuses based on actual database activity
  const stages = useMemo((): RoadmapStage[] => {
    const hasLectures = lectures.length > 0
    const hasNotes = notes.some((n) => n.status === 'completed')
    const hasFlashcards = flashcards.length > 0
    const hasMastered = flashcards.some((c) => c.status === 'mastered')

    const stagesData = [
      {
        id: 'foundation',
        label: 'Foundation Ingestion',
        description: 'Ingest your first lecture notes, live audio recordings, or YouTube material.',
        isCompleted: hasLectures,
        isActive: !hasLectures,
        icon: Radio,
      },
      {
        id: 'core',
        label: 'Core Synthesis',
        description: 'Compile audio recordings or PDF files into AI smart notes.',
        isCompleted: hasNotes,
        isActive: hasLectures && !hasNotes,
        icon: NotebookPen,
      },
      {
        id: 'advanced',
        label: 'Active Retention',
        description: 'Generate active recall flashcards to start your spaced repetition timeline.',
        isCompleted: hasFlashcards,
        isActive: hasNotes && !hasFlashcards,
        icon: Brain,
      },
      {
        id: 'mastery',
        label: 'Spaced Mastery',
        description: 'Review your flashcards repeatedly until you master at least one topic card.',
        isCompleted: hasMastered,
        isActive: hasFlashcards && !hasMastered,
        icon: Award,
      },
    ]

    // If all are completed, mark mastery as active as well
    if (hasMastered) {
      stagesData[3].isActive = true
    }

    return stagesData
  }, [lectures, notes, flashcards])

  // Find user's current progress percentage
  const progressPercent = useMemo(() => {
    const completedCount = stages.filter((stage) => stage.isCompleted).length
    return Math.round((completedCount / stages.length) * 100)
  }, [stages])

  // Get active step action hint
  const actionHint = useMemo(() => {
    const activeStage = stages.find((s) => s.isActive || !s.isCompleted)
    if (!activeStage) return 'Congratulations! You have completed all learning roadmap stages.'

    switch (activeStage.id) {
      case 'foundation':
        return 'Record a live lecture or import a YouTube video to complete the Foundation stage.'
      case 'core':
        return 'Go to your Lectures and wait for processing to finish, then view notes to compile Core Synthesis.'
      case 'advanced':
        return 'Open the Flashcards page and generate a review deck from one of your lectures.'
      case 'mastery':
        return 'Go to Flashcards or Revision Timeline and study your due cards until you master one.'
      default:
        return ''
    }
  }, [stages])

  if (loading) {
    return (
      <DashboardPageShell>
        <DashboardPageHeader
          title="Learning Roadmap"
          description="Your personalized path from foundation to mastery."
        />
        <div className="space-y-6 max-w-3xl mx-auto">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-3xl" />
        </div>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell>
      <div className="max-w-3xl mx-auto space-y-8">
        <FadeUp>
          <DashboardPageHeader
            title="Learning Roadmap"
            description="Track your personalized educational path from materials ingestion to active mastery."
          />
        </FadeUp>

        {/* Overview progress dial/bar */}
        <FadeUp delay={0.05}>
          <div className="relative rounded-2xl border border-white/[0.08] bg-card/60 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between text-sm font-semibold mb-3">
              <span className="text-muted flex items-center gap-2">
                <Map className="h-4 w-4 text-accent" />
                Roadmap Progress
              </span>
              <span className="text-accent">{progressPercent}% Completed</span>
            </div>
            {/* Progress bar line */}
            <div className="h-3 w-full rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent via-accent-soft to-emerald shadow-[0_0_12px_rgba(var(--color-accent-rgb),0.2)] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </FadeUp>

        {/* Milestone Timeline Path */}
        <FadeUp delay={0.1}>
          <div className="relative rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(var(--color-accent-rgb),0.02),transparent_70%)] pointer-events-none" />

            <div className="relative space-y-12">
              {stages.map((stage, idx) => {
                const Icon = stage.icon
                return (
                  <div key={stage.id} className="relative flex gap-6 sm:gap-8 items-start group">
                    {/* Vertical connecting line */}
                    {idx !== stages.length - 1 && (
                      <div
                        className={cn(
                          'absolute top-12 left-6 -ml-px h-[calc(100%+32px)] w-0.5 transition-all duration-300',
                          stage.isCompleted ? 'bg-accent/40' : 'bg-white/[0.04]'
                        )}
                      />
                    )}

                    {/* Timeline Node Check-circle */}
                    <div className="relative z-10">
                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-300',
                          stage.isCompleted 
                            ? 'border-accent/40 bg-accent/[0.12] text-accent shadow-[0_0_12px_rgba(var(--color-accent-rgb),0.15)]'
                            : stage.isActive
                              ? 'border-white/20 bg-white/[0.04] text-foreground shadow-[0_0_12px_rgba(255,255,255,0.06)] scale-105'
                              : 'border-white/[0.08] bg-white/[0.02] text-muted/30'
                        )}
                      >
                        <Icon className="h-5 w-5" strokeWidth={stage.isActive ? 2 : 1.5} />
                      </div>
                      {stage.isActive && (
                        <div className="absolute inset-0 rounded-2xl border border-accent animate-ping opacity-25 scale-105 pointer-events-none" />
                      )}
                    </div>

                    {/* Stage Details */}
                    <div className="flex-1 pt-1.5">
                      <div className="flex items-center gap-3">
                        <h4
                          className={cn(
                            'text-base font-semibold leading-none transition-colors',
                            stage.isCompleted ? 'text-foreground' : stage.isActive ? 'text-accent' : 'text-muted/40'
                          )}
                        >
                          {stage.label}
                        </h4>
                        {stage.isCompleted ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-accent shrink-0" />
                        ) : stage.isActive ? (
                          <span className="rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
                            Active Stage
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={cn(
                          'mt-2 text-sm leading-relaxed transition-colors',
                          stage.isCompleted || stage.isActive ? 'text-muted' : 'text-muted/20'
                        )}
                      >
                        {stage.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </FadeUp>

        {/* Active Stage Action Helper */}
        <FadeUp delay={0.14}>
          <div className="rounded-2xl border border-white/[0.08] bg-card/60 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-foreground">Next Milestone Action</h4>
              <p className="mt-1 text-sm leading-relaxed text-muted">{actionHint}</p>
            </div>
          </div>
        </FadeUp>
      </div>
    </DashboardPageShell>
  )
}

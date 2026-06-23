import { motion, useReducedMotion } from 'framer-motion'
import { Check, Loader2, Sparkles, Upload } from 'lucide-react'
import { TranscriptWaveformPreview } from '@/components/transcript/TranscriptWaveformPreview'
import type { TranscriptionProgress, TranscriptionStep } from '@/services/transcriptionService'
import { cn } from '@/lib/utils'

interface TranscriptionProgressCardProps {
  progress: number
  transcriptionProgress: TranscriptionProgress | null
  className?: string
}

const STEPS: {
  id: TranscriptionStep
  label: string
  subtitle: string
  icon: typeof Upload
}[] = [
  {
    id: 'uploading',
    label: 'Uploading…',
    subtitle: 'Preparing your lecture audio',
    icon: Upload,
  },
  {
    id: 'transcribing',
    label: 'Processing…',
    subtitle: 'Understanding your lecture',
    icon: Sparkles,
  },
  {
    id: 'ready',
    label: 'Ready',
    subtitle: 'Your words, captured perfectly',
    icon: Check,
  },
]

function stepIndex(step: TranscriptionStep): number {
  return STEPS.findIndex((item) => item.id === step)
}

export function TranscriptionProgressCard({
  progress,
  transcriptionProgress,
  className,
}: TranscriptionProgressCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const activeStep = transcriptionProgress?.step ?? 'uploading'
  const activeIndex = stepIndex(activeStep)
  const clamped = Math.max(0, Math.min(100, progress))

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-3xl border border-accent/20',
        'bg-gradient-to-b from-accent/[0.06] via-[#0D0D0D] to-[#0A0A0A]',
        'shadow-[0_0_60px_rgba(var(--color-accent-rgb),0.12),0_20px_50px_rgba(0,0,0,0.4)]',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -top-20 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-accent/[0.15] blur-[80px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-32 w-48 rounded-full bg-red/[0.06] blur-[60px]"
        aria-hidden
      />

      <div className="relative p-5 md:p-6">
        <div className="mb-5">
          <TranscriptWaveformPreview
            isPlaying={!prefersReducedMotion}
            progress={clamped}
            className="border-red/25 shadow-[0_0_40px_rgba(239,68,68,0.12)]"
          />
        </div>

        <div className="space-y-1">
          {STEPS.map((step, index) => {
            const isActive = index === activeIndex
            const isComplete = index < activeIndex
            const isPending = index > activeIndex
            const Icon = step.icon

            return (
              <motion.div
                key={step.id}
                layout
                className={cn(
                  'relative flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-colors duration-500',
                  isActive && 'bg-accent/[0.08] shadow-[inset_0_0_24px_rgba(var(--color-accent-rgb),0.06)]',
                  isComplete && 'opacity-70',
                  isPending && 'opacity-40',
                )}
              >
                {isActive && !prefersReducedMotion && (
                  <motion.div
                    layoutId="step-glow"
                    className="pointer-events-none absolute inset-0 rounded-2xl border border-accent/25"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}

                <div
                  className={cn(
                    'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border',
                    isComplete && 'border-emerald/30 bg-emerald/[0.12] text-emerald',
                    isActive && 'border-accent/40 bg-accent/[0.12] text-accent',
                    isPending && 'border-white/[0.08] bg-white/[0.03] text-muted',
                  )}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  ) : isActive && step.id === 'transcribing' ? (
                    <motion.div
                      animate={prefersReducedMotion ? {} : { rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader2 className="h-4 w-4" strokeWidth={2.5} />
                    </motion.div>
                  ) : (
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      isActive ? 'text-foreground' : 'text-foreground/80',
                    )}
                  >
                    {step.label}
                  </p>
                  {isActive && (
                    <motion.p
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-0.5 text-xs text-muted"
                    >
                      {transcriptionProgress?.subtitle || step.subtitle}
                    </motion.p>
                  )}
                </div>

                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'absolute -bottom-3 left-[2.15rem] h-3 w-px',
                      isComplete ? 'bg-emerald/40' : 'bg-white/[0.08]',
                    )}
                    aria-hidden
                  />
                )}
              </motion.div>
            )
          })}
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted">Overall progress</span>
            <span className="font-mono tabular-nums text-accent/90">{Math.round(clamped)}%</span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent/70 via-accent to-accent-soft"
              initial={{ width: 0 }}
              animate={{ width: `${clamped}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
            {!prefersReducedMotion && (
              <motion.div
                className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '500%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

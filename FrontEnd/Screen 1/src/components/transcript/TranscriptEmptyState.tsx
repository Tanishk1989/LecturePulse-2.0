import { motion, useReducedMotion } from 'framer-motion'
import { TranscriptWaveformPreview } from '@/components/transcript/TranscriptWaveformPreview'
import { cn } from '@/lib/utils'

interface TranscriptEmptyStateProps {
  message?: string
  className?: string
}

export function TranscriptEmptyState({
  message = 'Upload or record a lecture to begin.',
  className,
}: TranscriptEmptyStateProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center px-6 py-20 text-center',
        className,
      )}
    >
      <div className="relative mb-10 w-full max-w-xl">
        <div
          className="pointer-events-none absolute -inset-12 rounded-full bg-accent/[0.06] blur-[80px]"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-red/[0.06] blur-3xl" />
        <TranscriptWaveformPreview
          isPlaying={!prefersReducedMotion}
          progress={0}
          className="relative h-24 border-red/20 shadow-[0_0_56px_rgba(239,68,68,0.1)]"
        />
      </div>

      <p className="max-w-md text-lg leading-relaxed text-muted">{message}</p>

      <div className="mt-8 flex items-center gap-2" aria-hidden>
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className="h-2 w-2 rounded-full bg-accent/60"
            animate={
              prefersReducedMotion
                ? { opacity: 0.6 }
                : { opacity: [0.3, 0.9, 0.3], scale: [0.9, 1.15, 0.9] }
            }
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: index * 0.25,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  )
}

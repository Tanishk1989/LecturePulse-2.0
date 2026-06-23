import { motion, useReducedMotion } from 'framer-motion'
import { TranscriptWaveformPreview } from '@/components/transcript/TranscriptWaveformPreview'
import { cn } from '@/lib/utils'

export function TranscriptLoadingState({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center px-6 py-16 text-center',
        className,
      )}
    >
      <div className="relative mb-8 w-full max-w-lg">
        <div
          className="pointer-events-none absolute -inset-8 rounded-full bg-accent/[0.08] blur-3xl"
          aria-hidden
        />
        <TranscriptWaveformPreview
          isPlaying={!prefersReducedMotion}
          progress={45}
          className="relative border-red/25 shadow-[0_0_48px_rgba(239,68,68,0.14)]"
        />
      </div>

      <motion.p
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-lg font-semibold text-foreground"
      >
        AI is understanding your lecture…
      </motion.p>

      <motion.p
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-2 text-sm text-muted"
      >
        This usually takes a minute or two
      </motion.p>

      <div className="mt-10 w-full max-w-lg space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0.2 }}
            animate={prefersReducedMotion ? { opacity: 0.4 } : { opacity: [0.2, 0.55, 0.2] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.12 }}
            className="flex gap-4 rounded-2xl border border-accent/[0.06] bg-accent/[0.02] px-4 py-4"
          >
            <div className="h-3 w-12 shrink-0 rounded bg-accent/[0.08]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-full rounded bg-white/[0.06]" />
              <div className="h-3 w-4/5 rounded bg-white/[0.04]" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

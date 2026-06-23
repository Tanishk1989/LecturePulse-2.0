import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { TranscriptionProgress } from '@/services/transcriptionService'

interface TranscriptionProgressBarProps {
  progress: number
  stage: TranscriptionProgress['stage'] | null
  className?: string
}

const STAGE_LABELS: Record<TranscriptionProgress['stage'], string> = {
  fetching: 'Fetching audio',
  uploading: 'Preparing audio',
  transcribing: 'Processing lecture',
  saving: 'Saving results',
}

export function TranscriptionProgressBar({
  progress,
  stage,
  className,
}: TranscriptionProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, progress))
  const label = stage ? STAGE_LABELS[stage] : 'Processing progress'

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono tabular-nums text-foreground/80">{Math.round(clamped)}%</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full border border-white/[0.06] bg-white/[0.03]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-ambient/80 via-accent/90 to-accent"
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
        {stage === 'transcribing' && (
          <motion.div
            className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            animate={{ x: ['-100%', '400%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>
    </div>
  )
}

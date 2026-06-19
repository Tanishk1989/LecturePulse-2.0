import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface RecordingStatusBadgeProps {
  status: 'recording' | 'paused'
}

export function RecordingStatusBadge({ status }: RecordingStatusBadgeProps) {
  const prefersReducedMotion = useReducedMotion()
  const isRecording = status === 'recording'

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase',
        isRecording
          ? 'border-red/30 bg-red/[0.08] text-red'
          : 'border-orange-400/30 bg-orange-400/[0.08] text-orange-400',
      )}
    >
      <motion.span
        className={cn('h-2 w-2 rounded-full', isRecording ? 'bg-red' : 'bg-orange-400')}
        animate={
          prefersReducedMotion || !isRecording
            ? { opacity: 1 }
            : { opacity: [1, 0.35, 1], scale: [1, 0.85, 1] }
        }
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {isRecording ? 'Live Recording' : 'Paused'}
    </div>
  )
}

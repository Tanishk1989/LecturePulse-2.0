import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface UploadProgressBarProps {
  progress: number
  className?: string
}

export function UploadProgressBar({ progress, className }: UploadProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, progress))

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Upload progress</span>
        <span className="font-mono tabular-nums">{Math.round(clamped)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-white/[0.06] bg-white/[0.03]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-accent/70 via-accent to-accent-soft"
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

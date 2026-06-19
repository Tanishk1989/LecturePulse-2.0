import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TranscriptWaveformPreviewProps {
  progress?: number
  isPlaying?: boolean
  className?: string
}

export function TranscriptWaveformPreview({
  progress = 0,
  isPlaying = false,
  className,
}: TranscriptWaveformPreviewProps) {
  const prefersReducedMotion = useReducedMotion()
  const bars = Array.from({ length: 40 }, (_, index) => {
    const wave = Math.sin(index * 0.38) * 0.35 + Math.cos(index * 0.21) * 0.25 + 0.45
    const active = (index / 40) * 100 <= progress
    return { height: 8 + wave * 28, active }
  })

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-red/15 bg-red/[0.04] p-4',
        'shadow-[0_0_32px_rgba(239,68,68,0.08)]',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-red/[0.06] to-transparent"
        aria-hidden
      />

      <div className="relative flex h-14 items-end gap-[2px]">
        {bars.map((bar, index) => (
          <motion.div
            key={index}
            className={cn(
              'flex-1 rounded-full',
              bar.active ? 'bg-red/70' : 'bg-red/20',
            )}
            style={{ height: `${bar.height}px` }}
            animate={
              isPlaying && !prefersReducedMotion
                ? {
                    scaleY: [1, 1 + Math.sin(index * 0.5) * 0.35, 1],
                    opacity: bar.active ? [0.85, 1, 0.85] : [0.35, 0.55, 0.35],
                  }
                : {}
            }
            transition={{
              duration: 0.8 + (index % 5) * 0.08,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  )
}

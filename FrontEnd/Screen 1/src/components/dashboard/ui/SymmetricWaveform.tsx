import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SymmetricWaveformProps {
  className?: string
  color?: string
  animated?: boolean
  levels?: number[]
}

// Waveform bar heights scaled to fit within a 40px viewport when animated
const BAR_HEIGHTS = [
  6, 11, 16, 8, 19, 11, 21, 7, 13, 24, 9, 16, 5, 12, 20, 8,
  17, 11, 23, 7, 15, 19, 9, 13, 5, 16, 21, 8, 12, 20, 11, 17,
  7, 15, 23, 9, 13, 5
]

export function SymmetricWaveform({
  className,
  color = '#EF4444',
  animated = true,
  levels,
}: SymmetricWaveformProps) {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = animated && !prefersReducedMotion

  const isUsingRealLevels = !!levels && levels.length > 0
  const bars = isUsingRealLevels
    ? levels.map((level) => Math.max(4, Math.min(36, level * 36)))
    : BAR_HEIGHTS

  const numBars = bars.length
  const width = 300
  const pitch = width / numBars

  return (
    <div className={cn('relative w-full h-10 flex items-center justify-center', className)}>
      <svg viewBox={`0 0 ${width} 40`} className="w-full h-full" preserveAspectRatio="none" aria-hidden>
        {bars.map((height, i) => {
          const x = i * pitch + pitch / 2
          return (
            <motion.line
              key={i}
              x1={x}
              x2={x}
              animate={isUsingRealLevels ? {
                y1: 20 - height / 2,
                y2: 20 + height / 2,
                opacity: 0.95
              } : {
                y1: shouldAnimate ? [
                  20 - height / 2,
                  20 - (height * 1.5) / 2,
                  20 - (height * 0.4) / 2,
                  20 - height / 2
                ] : 20 - height / 2,
                y2: shouldAnimate ? [
                  20 + height / 2,
                  20 + (height * 1.5) / 2,
                  20 + (height * 0.4) / 2,
                  20 + height / 2
                ] : 20 + height / 2,
                opacity: shouldAnimate ? 0.95 : 0.3
              }}
              transition={isUsingRealLevels ? {
                type: 'spring',
                stiffness: 300,
                damping: 25
              } : (shouldAnimate ? {
                duration: 0.6 + (i % 7) * 0.12,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
                delay: (i % 5) * 0.08
              } : {
                duration: 0.3
              })}
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )
        })}
      </svg>
    </div>
  )
}

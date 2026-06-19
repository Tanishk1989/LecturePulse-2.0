import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedWaveformProps {
  className?: string
  bars?: number
  color?: 'red' | 'yellow'
  height?: number
}

export function AnimatedWaveform({
  className,
  bars = 12,
  color = 'red',
  height = 24,
}: AnimatedWaveformProps) {
  const prefersReducedMotion = useReducedMotion()
  const barColor = color === 'red' ? 'bg-red/70' : 'bg-accent/70'

  const heights = [3, 5, 2, 7, 4, 8, 3, 6, 5, 9, 4, 7]

  return (
    <div className={cn('flex items-end gap-[3px]', className)} style={{ height }}>
      {Array.from({ length: bars }).map((_, i) => {
        const h = heights[i % heights.length]
        return (
          <motion.div
            key={i}
            className={cn('w-[3px] rounded-full', barColor)}
            animate={
              prefersReducedMotion
                ? { height: `${h * 2}px` }
                : { height: [`${h * 1.5}px`, `${h * 2.5}px`, `${h * 1.5}px`] }
            }
            transition={{
              duration: 0.8 + (i % 4) * 0.15,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.06,
            }}
          />
        )
      })}
    </div>
  )
}

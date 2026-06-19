import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SymmetricWaveformProps {
  className?: string
  color?: string
  animated?: boolean
}

export function SymmetricWaveform({
  className,
  color = '#EF4444',
  animated = true,
}: SymmetricWaveformProps) {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = animated && !prefersReducedMotion

  return (
    <div className={cn('relative w-full h-10 flex items-center justify-center', className)}>
      <svg viewBox="0 0 320 40" className="w-full h-full" preserveAspectRatio="none" aria-hidden>
        <motion.path
          d="M0 20 L20 20 L28 12 L36 28 L44 8 L52 32 L60 14 L68 26 L76 16 L84 24 L92 18 L100 22 L108 20 L116 20 L124 14 L132 26 L140 10 L148 30 L156 12 L164 28 L172 16 L180 24 L188 18 L196 22 L204 20 L212 20 L220 12 L228 28 L236 8 L244 32 L252 14 L260 26 L268 16 L276 24 L284 18 L292 22 L300 20 L320 20"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
          animate={shouldAnimate ? { opacity: [0.5, 0.95, 0.5] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  )
}

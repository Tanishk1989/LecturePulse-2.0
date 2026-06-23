import { motion, useReducedMotion } from 'framer-motion'
import { ParticleField } from '@/components/effects/ParticleField'
import { cn } from '@/lib/utils'

interface AmbientPageBackgroundProps {
  className?: string
  variant?: 'default' | 'gold' | 'indigo'
}

export function AmbientPageBackground({
  className,
  variant = 'default',
}: AmbientPageBackgroundProps) {
  const prefersReducedMotion = useReducedMotion()

  const gradientClass = {
    default: 'from-ambient/[0.05] via-transparent to-emerald/[0.03]',
    gold: 'from-accent/[0.06] via-transparent to-ambient/[0.04]',
    indigo: 'from-ambient/[0.08] via-transparent to-accent/[0.03]',
  }[variant]

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)} aria-hidden>
      <div className={cn('absolute inset-0 bg-gradient-to-br', gradientClass)} />
      <div className="absolute inset-0 star-particles opacity-30" />
      <ParticleField count={30} yellowRatio={0.45} />

      <svg className="absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden>
        {[...Array(8)].map((_, i) => (
          <motion.line
            key={i}
            x1={`${5 + i * 12}%`}
            y1="0%"
            x2={`${25 + i * 10}%`}
            y2="100%"
            stroke="rgba(var(--color-accent-rgb),0.35)"
            strokeWidth="1"
            animate={prefersReducedMotion ? {} : { opacity: [0.08, 0.35, 0.08] }}
            transition={{ duration: 4 + i * 0.4, repeat: Infinity, delay: i * 0.25 }}
          />
        ))}
        {[...Array(5)].map((_, i) => (
          <motion.line
            key={`h-${i}`}
            x1="0%"
            y1={`${15 + i * 18}%`}
            x2="100%"
            y2={`${20 + i * 16}%`}
            stroke="rgba(79,70,229,0.2)"
            strokeWidth="1"
            animate={prefersReducedMotion ? {} : { opacity: [0.05, 0.2, 0.05] }}
            transition={{ duration: 5 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
      </svg>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(var(--color-accent-rgb),0.04),transparent_55%)]" />
    </div>
  )
}

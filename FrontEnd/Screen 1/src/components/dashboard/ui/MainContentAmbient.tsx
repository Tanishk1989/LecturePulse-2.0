import { motion, useReducedMotion } from 'framer-motion'
import { ParticleField } from '@/components/effects/ParticleField'
import { cn } from '@/lib/utils'

export function MainContentAmbient({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      {/* Top-left warm gold blur */}
      <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-accent/[0.06] blur-[120px]" />
      {/* Top-right indigo blur */}
      <div className="absolute -top-24 -right-24 h-[380px] w-[380px] rounded-full bg-ambient/[0.07] blur-[110px]" />
      {/* Bottom radial glow */}
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-[radial-gradient(ellipse,rgba(214,162,11,0.04)_0%,transparent_70%)]" />

      {/* Faint grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Tiny floating particles */}
      <ParticleField count={22} yellowRatio={0.5} />

      {/* Subtle gold gradient wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.02] via-transparent to-transparent" />

      {!prefersReducedMotion && (
        <motion.div
          className="absolute top-1/4 left-1/3 h-2 w-2 rounded-full bg-accent/20"
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  )
}

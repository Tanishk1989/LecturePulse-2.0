import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { PulseIcon } from '@/components/shared/PulseIcon'
import { AuthShowcaseCards } from '@/components/auth/AuthShowcaseCards'
import { ParticleField } from '@/components/effects/ParticleField'

export function AuthBrandPanel() {
  const prefersReducedMotion = useReducedMotion()
  const [parallax, setParallax] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion) return
      const rect = e.currentTarget.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      setParallax({
        x: ((e.clientX - cx) / rect.width) * 40,
        y: ((e.clientY - cy) / rect.height) * 40,
      })
    },
    [prefersReducedMotion],
  )

  const handleMouseLeave = useCallback(() => {
    setParallax({ x: 0, y: 0 })
  }, [])

  return (
    <div
      className="auth-brand-panel relative flex flex-col justify-center overflow-hidden px-8 py-12 lg:px-14 lg:py-16 xl:px-20"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <ParticleField count={28} yellowRatio={0.15} className="opacity-80" />

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <Link to="/" className="inline-flex items-center gap-3.5 group cursor-pointer">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/25 bg-accent/[0.06] transition-all duration-300 ease-out group-hover:scale-[1.03] group-hover:border-accent/40 group-hover:shadow-[0_0_32px_rgba(214,162,11,0.18)]"
            style={{ boxShadow: '0 0 20px rgba(214,162,11,0.12)' }}
          >
            <PulseIcon size={32} />
          </div>
          <span className="font-heading text-2xl">
            <span className="text-[#FAFAFA]">Lecture</span>
            <span className="text-accent">Pulse</span>
          </span>
        </Link>
      </motion.div>

      <motion.div
        className="mt-12 max-w-lg"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
      >
        <h1 className="font-heading text-4xl text-foreground sm:text-5xl lg:text-[3.25rem] xl:text-6xl">
          Turn lectures
          <br />
          into{' '}
          <span className="text-gradient-pulse text-[1.15em]">mastery.</span>
        </h1>
        <p className="mt-6 text-base leading-relaxed text-muted lg:text-lg">
          Capture lectures.
          <br />
          Understand concepts.
          <br />
          Master exams.
          <br />
          <span className="text-foreground/80">AI-powered learning built for students.</span>
        </p>
      </motion.div>

      <motion.div
        className="hidden lg:block"
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <AuthShowcaseCards parallaxX={parallax.x} parallaxY={parallax.y} />
      </motion.div>
    </div>
  )
}

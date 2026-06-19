import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ParallaxGlowProps {
  className?: string
  variant?: 'hero' | 'section'
}

export function ParallaxGlow({ className, variant = 'hero' }: ParallaxGlowProps) {
  const { scrollY } = useScroll()
  const prefersReducedMotion = useReducedMotion()
  const y = useTransform(scrollY, [0, 500], [0, prefersReducedMotion ? 0 : 60])

  return (
    <motion.div
      style={{ y }}
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden
    >
      {variant === 'hero' && (
        <>
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[700px] w-[700px] rounded-full bg-[#D6A20B]/[0.08] blur-[140px]" />
          <div className="absolute top-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-[#4F46E5]/[0.06] blur-[120px]" />
          <div className="absolute bottom-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-[#10B981]/[0.05] blur-[100px]" />
        </>
      )}
      {variant === 'section' && (
        <>
          <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-[#4F46E5]/[0.06] blur-[100px]" />
          <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-[#10B981]/[0.04] blur-[80px]" />
        </>
      )}
    </motion.div>
  )
}

import { type ReactNode } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'

interface AuthGlassCardProps {
  children: ReactNode
}

export const authStaggerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
}

export const authItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
}

export function AuthGlassCard({ children }: AuthGlassCardProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      className="auth-glass-card w-full max-w-[420px] rounded-[28px] p-[48px]"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
    >
      {children}
    </motion.div>
  )
}

export function AuthStagger({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) return <div className="space-y-5">{children}</div>

  return (
    <motion.div
      className="space-y-5"
      variants={authStaggerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  )
}

export function AuthStaggerItem({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) return <>{children}</>

  return <motion.div variants={authItemVariants}>{children}</motion.div>
}

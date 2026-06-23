import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CursorSpotlightProps {
  className?: string
}

export function CursorSpotlight({ className }: CursorSpotlightProps) {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return
      ref.current.style.setProperty('--x', `${e.clientX}px`)
      ref.current.style.setProperty('--y', `${e.clientY}px`)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [prefersReducedMotion])

  if (prefersReducedMotion) return null

  return (
    <div
      ref={ref}
      className={cn(
        'pointer-events-none fixed inset-0 z-30 transition-opacity duration-300',
        className,
      )}
      style={{
        background:
          'radial-gradient(600px circle at var(--x, 50%) var(--y, 50%), rgba(var(--color-accent-rgb),0.03), transparent 40%)',
      }}
      aria-hidden
    />
  )
}

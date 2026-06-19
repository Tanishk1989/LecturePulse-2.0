import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

function YouTubePlayLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 34" className={cn('w-10 h-auto', className)} aria-hidden>
      <rect x="1" y="1" width="46" height="32" rx="8" fill="#FF3B30" />
      <path d="M20 10 L20 24 L34 17 Z" fill="white" />
    </svg>
  )
}

function SoundBars({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion()
  const heights = [8, 14, 10, 18, 12, 16, 9]

  return (
    <div className={cn('flex items-end justify-center gap-[3px] h-8 opacity-[0.08]', className)}>
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-[#FF3B30]"
          animate={
            prefersReducedMotion
              ? { height: h }
              : { height: [h * 0.6, h, h * 0.7, h * 1.1, h * 0.6] }
          }
          transition={{
            duration: 1.2 + i * 0.1,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.08,
          }}
        />
      ))}
    </div>
  )
}

interface YouTubeIconHeroProps {
  isHovered: boolean
}

export function YouTubeIconHero({ isHovered }: YouTubeIconHeroProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="relative flex flex-col items-center justify-center pt-1">
      <motion.div
        className="relative"
        animate={
          prefersReducedMotion
            ? {}
            : { scale: isHovered ? 1.08 : [1, 1.03, 1] }
        }
        transition={
          isHovered
            ? { duration: 0.3, ease: 'easeOut' }
            : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <div
          className={cn(
            'relative flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-[#FF3B30]/30',
            'bg-[#FF3B30]/[0.08] backdrop-blur-md',
          )}
        >
          <SoundBars className="absolute inset-x-2 bottom-2" />
          <YouTubePlayLogo />
        </div>
      </motion.div>
    </div>
  )
}

export function YouTubeReadyBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-medium text-red-400 backdrop-blur-md">
      <span className="text-[9px]">▶</span>
      YouTube Ready
    </span>
  )
}

import { motion } from 'framer-motion'
import { BookOpen, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ParticleField } from '@/components/effects/ParticleField'
import { PulseIcon } from '@/components/shared/PulseIcon'
import { cn } from '@/lib/utils'

interface LectureLibraryEmptyStateProps {
  className?: string
}

export function LectureLibraryEmptyState({ className }: LectureLibraryEmptyStateProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/[0.08]',
        'bg-card/60 backdrop-blur-xl py-20 px-6 text-center min-h-[420px]',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <ParticleField count={32} yellowRatio={0.65} />
        <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.04] via-transparent to-ambient/[0.04]" />
      </div>

      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 rounded-full bg-accent/[0.16] blur-[40px]" />
        <div className="relative flex h-28 w-28 items-center justify-center rounded-[28px] border border-accent/20 bg-accent/[0.06] shadow-[0_0_48px_rgba(var(--color-accent-rgb),0.14)]">
          <BookOpen className="h-12 w-12 text-accent" strokeWidth={1.5} />
        </div>
        <motion.div
          animate={{ y: [0, -4, 0], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="absolute -right-3 -bottom-2 flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-card/80 backdrop-blur-md"
        >
          <PulseIcon size={22} glow />
        </motion.div>
      </motion.div>

      <p className="relative text-xl font-semibold text-foreground">
        Your learning journey starts here.
      </p>
      <p className="relative mt-3 max-w-md text-sm text-muted leading-relaxed">
        Upload audio, video, or PDF lectures — they appear instantly in your library.
      </p>

      <Link
        to="/dashboard/upload"
        className={cn(
          'relative mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3 text-sm font-medium text-background',
          'shadow-[0_0_24px_rgba(var(--color-accent-rgb),0.18)] hover:bg-accent-soft hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
        )}
      >
        <Upload className="h-4 w-4" strokeWidth={2} />
        Upload First Lecture
      </Link>
    </div>
  )
}

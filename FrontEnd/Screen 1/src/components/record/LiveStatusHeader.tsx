import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { DetectedLanguageLabel } from '@/lib/webSpeechRecognition'

interface LiveStatusHeaderProps {
  active: boolean
  paused?: boolean
  language: DetectedLanguageLabel
  className?: string
}

export function LiveStatusHeader({ active, paused = false, language, className }: LiveStatusHeaderProps) {
  const prefersReducedMotion = useReducedMotion()

  if (!active && !paused) return null

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          'inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5',
          paused
            ? 'border-orange-400/30 bg-orange-400/[0.06]'
            : 'border-red/30 bg-red/[0.06]',
        )}
      >
        <motion.span
          className={cn('h-2.5 w-2.5 rounded-full', paused ? 'bg-orange-400' : 'bg-red')}
          animate={
            prefersReducedMotion || paused
              ? { opacity: 1 }
              : { opacity: [1, 0.3, 1], scale: [1, 0.85, 1] }
          }
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span
          className={cn(
            'text-[11px] font-semibold tracking-[0.2em] uppercase',
            paused ? 'text-orange-400' : 'text-red',
          )}
        >
          {paused ? 'Paused' : 'Live'}
        </span>
      </div>

      <p className="text-xs text-muted">
        Language detected:{' '}
        <span className="font-medium text-foreground/90">{language}</span>
      </p>
    </div>
  )
}

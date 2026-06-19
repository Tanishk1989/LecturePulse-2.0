import { motion, useReducedMotion } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RecordingMicVisualProps {
  isRecording: boolean
  isPaused: boolean
  disabled?: boolean
}

export function RecordingMicVisual({ isRecording, isPaused, disabled = false }: RecordingMicVisualProps) {
  const prefersReducedMotion = useReducedMotion()
  const active = isRecording && !disabled
  const slowed = isPaused && !disabled

  return (
    <div className="relative flex h-[120px] w-[120px] items-center justify-center md:h-[140px] md:w-[140px]">
      {!prefersReducedMotion &&
        [0, 1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border border-red/[0.12]"
            style={{
              width: 72 + ring * 28,
              height: 72 + ring * 28,
            }}
            animate={{
              scale: active ? [1, 1.12, 1] : slowed ? [1, 1.04, 1] : [1, 1.02, 1],
              opacity: active
                ? [0.1 - ring * 0.015, 0.06, 0.1 - ring * 0.015]
                : [0.06, 0.03, 0.06],
            }}
            transition={{
              duration: active ? 2.2 + ring * 0.45 : slowed ? 4 + ring * 0.6 : 3 + ring * 0.5,
              repeat: Infinity,
              delay: ring * 0.35,
              ease: 'easeInOut',
            }}
          />
        ))}

      <motion.div
        className={cn(
          'absolute h-24 w-24 rounded-full blur-2xl md:h-28 md:w-28',
          disabled ? 'bg-white/[0.04]' : 'bg-red/[0.18]',
        )}
        animate={
          prefersReducedMotion
            ? {}
            : {
                opacity: active ? [0.45, 0.75, 0.45] : slowed ? [0.25, 0.35, 0.25] : [0.2, 0.3, 0.2],
                scale: active ? [1, 1.08, 1] : [1, 1.03, 1],
              }
        }
        transition={{
          duration: active ? 1.6 : slowed ? 3.5 : 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div
        className={cn(
          'relative flex h-20 w-20 items-center justify-center rounded-full border backdrop-blur-xl md:h-[92px] md:w-[92px]',
          disabled
            ? 'border-white/[0.08] bg-white/[0.03]'
            : 'border-red/30 bg-red/[0.08] shadow-[0_0_48px_rgba(239,68,68,0.25)]',
        )}
      >
        {disabled ? (
          <MicOff className="h-9 w-9 text-muted" strokeWidth={1.5} />
        ) : (
          <Mic className="h-9 w-9 text-red md:h-10 md:w-10" strokeWidth={1.5} />
        )}
      </div>
    </div>
  )
}

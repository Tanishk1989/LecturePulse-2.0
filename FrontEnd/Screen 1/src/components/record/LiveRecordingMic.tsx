import { motion, useReducedMotion } from 'framer-motion'
import { Mic } from 'lucide-react'
import { MinimalAudioRing } from '@/components/record/RecordingWaveform'
import { cn } from '@/lib/utils'

interface LiveRecordingMicProps {
  isRecording: boolean
  isPaused: boolean
  disabled?: boolean
  size?: 'default' | 'large'
  showVisualizer?: boolean
  getAnalyser?: () => AnalyserNode | null
}

export function LiveRecordingMic({
  isRecording,
  isPaused,
  disabled = false,
  size = 'large',
  showVisualizer = false,
  getAnalyser,
}: LiveRecordingMicProps) {
  const prefersReducedMotion = useReducedMotion()
  const active = isRecording && !disabled
  const slowed = isPaused && !disabled
  const large = size === 'large'
  const ringActive = showVisualizer && !disabled && Boolean(getAnalyser)

  return (
    <div
      className={cn(
        'group relative flex items-center justify-center',
        !disabled && 'transition-transform duration-300 hover:scale-105',
        ringActive
          ? 'h-[220px] w-[220px] md:h-[240px] md:w-[240px]'
          : large
            ? 'h-[140px] w-[140px] md:h-[160px] md:w-[160px]'
            : 'h-[120px] w-[120px]',
      )}
    >
      {ringActive && getAnalyser && (
        <MinimalAudioRing
          getAnalyser={getAnalyser}
          active={isRecording || isPaused}
          paused={isPaused}
        />
      )}

      {!ringActive && !prefersReducedMotion &&
        [0, 1, 2].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border border-red-500/15"
            style={{
              width: (large ? 88 : 72) + ring * (large ? 28 : 24),
              height: (large ? 88 : 72) + ring * (large ? 28 : 24),
            }}
            animate={{
              scale: active ? [1, 1.1, 1] : slowed ? [1, 1.04, 1] : [1, 1.02, 1],
              opacity: active ? [0.1, 0.04, 0.1] : [0.06, 0.03, 0.06],
            }}
            transition={{
              duration: active ? 2.4 + ring * 0.5 : 3.2 + ring * 0.5,
              repeat: Infinity,
              delay: ring * 0.35,
              ease: 'easeInOut',
            }}
          />
        ))}

      <motion.div
        className={cn(
          'absolute rounded-full blur-3xl bg-red-500/20',
          ringActive ? 'h-32 w-32' : large ? 'h-32 w-32 md:h-36 md:w-36' : 'h-24 w-24',
          disabled && 'bg-white/[0.04]',
        )}
        animate={
          prefersReducedMotion
            ? {}
            : {
                opacity: active ? [0.35, 0.55, 0.35] : [0.2, 0.3, 0.2],
                scale: active ? [1, 1.06, 1] : [1, 1.02, 1],
              }
        }
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div
        className={cn(
          'relative z-10 flex items-center justify-center rounded-full border backdrop-blur-xl',
          large ? 'h-[104px] w-[104px] md:h-[116px] md:w-[116px]' : 'h-20 w-20 md:h-[92px] md:w-[92px]',
          disabled
            ? 'border-white/[0.08] bg-white/[0.03]'
            : 'border-red-500/20 bg-red-950/10 shadow-lg shadow-red-500/30',
        )}
      >
        {disabled ? (
          <Mic className="h-9 w-9 text-muted" strokeWidth={1.5} />
        ) : (
          <Mic
            className={cn(
              'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]',
              'transition-transform duration-300 group-hover:scale-105',
              large ? 'h-12 w-12 md:h-14 md:w-14' : 'h-10 w-10',
            )}
            strokeWidth={2}
          />
        )}
      </div>
    </div>
  )
}

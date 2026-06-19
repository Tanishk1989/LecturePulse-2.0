import { motion, useReducedMotion } from 'framer-motion'
import { Activity, Mic, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FadeUp } from '@/components/effects/FadeUp'
import { SymmetricWaveform } from '@/components/dashboard/ui/SymmetricWaveform'
import { cn } from '@/lib/utils'

interface LiveLectureCardProps {
  isRecording?: boolean
}

function RecordDotIcon() {
  return (
    <span className="flex h-4 w-4 items-center justify-center rounded-full border border-red/40 bg-red/10">
      <span className="h-2 w-2 rounded-full bg-red" />
    </span>
  )
}

function GlowingMic({ isRecording }: { isRecording: boolean }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="relative flex h-[100px] w-[100px] items-center justify-center">
      {!prefersReducedMotion &&
        [0, 1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border border-red/20"
            style={{
              width: 56 + ring * 22,
              height: 56 + ring * 22,
            }}
            animate={{
              scale: [1, isRecording ? 1.08 : 1.04, 1],
              opacity: [0.35 - ring * 0.06, 0.08, 0.35 - ring * 0.06],
            }}
            transition={{
              duration: 2.5 + ring * 0.5,
              repeat: Infinity,
              delay: ring * 0.3,
              ease: 'easeInOut',
            }}
          />
        ))}
      <div className="absolute h-16 w-16 rounded-full bg-red/[0.12] blur-xl" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-red/30 bg-red/[0.1] shadow-[0_0_40px_rgba(239,68,68,0.2)]">
        <Mic className="h-7 w-7 text-red" strokeWidth={1.5} />
      </div>
    </div>
  )
}

export function LiveLectureCard({ isRecording = false }: LiveLectureCardProps) {
  return (
    <FadeUp delay={0.12}>
      <div
        className={cn(
          'relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08]',
          'bg-[#0d0d0d]/95 backdrop-blur-xl p-5 md:p-6',
        )}
      >
        {/* Header */}
        <div className="relative flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-red" strokeWidth={1.75} />
            <p className="text-xs font-semibold tracking-[0.15em] uppercase text-foreground">
              Live Lecture
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', isRecording ? 'bg-red animate-pulse' : 'bg-red/70')} />
            <span className="text-xs font-medium text-red">
              {isRecording ? 'Recording' : 'Not recording'}
            </span>
          </div>
        </div>

        {/* Center */}
        <div className="relative flex flex-1 flex-col items-center justify-center text-center py-3">
          <GlowingMic isRecording={isRecording} />
          <p className="mt-4 text-base font-semibold text-foreground">No lecture recording</p>
          <p className="mt-1.5 text-sm text-muted max-w-[260px] leading-relaxed">
            Start recording or upload a lecture to begin
          </p>
        </div>

        {/* Waveform + timer */}
        <div className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-4 mb-4">
          <SymmetricWaveform animated={!isRecording} />
          <p className="mt-2 text-center font-mono text-sm text-muted/80 tabular-nums tracking-[0.2em]">
            00:00:00
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            to="/dashboard/record"
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl border border-red/35 bg-transparent py-3 text-sm font-medium text-red',
              'hover:bg-red/[0.06] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
            )}
          >
            <RecordDotIcon />
            Record Live
          </Link>
          <Link
            to="/dashboard/upload"
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-transparent py-3 text-sm font-medium text-foreground',
              'hover:bg-white/[0.03] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
            )}
          >
            <Upload className="h-4 w-4 text-muted" strokeWidth={1.75} />
            Upload Lecture
          </Link>
        </div>
      </div>
    </FadeUp>
  )
}

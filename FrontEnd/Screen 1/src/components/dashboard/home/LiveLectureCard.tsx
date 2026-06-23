import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Activity, FileText, Mic, Upload, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FadeUp } from '@/components/effects/FadeUp'
import { SymmetricWaveform } from '@/components/dashboard/ui/SymmetricWaveform'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'
import { useLectures } from '@/context/LectureContext'
import { cn } from '@/lib/utils'

interface LiveLectureCardProps {
  isRecording?: boolean
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

const MotionLink = motion(Link)

function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.522 3.5 12 3.5 12 3.5s-7.522 0-9.388.556a3.003 3.003 0 0 0-2.11 2.107C0 8.029 0 12 0 12s0 3.971.502 5.837a3.003 3.003 0 0 0 2.11 2.107C4.478 20.5 12 20.5 12 20.5s7.522 0 9.388-.556a3.003 3.003 0 0 0 2.11-2.107C24 15.971 24 12 24 12s0-3.971-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function formatTime(seconds: number) {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return [hrs, mins, secs]
    .map((v) => v.toString().padStart(2, '0'))
    .join(':')
}

export function LiveLectureCard({ isRecording: isRecordingProp = false }: LiveLectureCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const { lectures } = useLectures()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [micStatus, setMicStatus] = useState<'ready' | 'not connected'>('not connected')

  // Integrate the media recorder hook
  const {
    status,
    elapsedSeconds,
    levels,
    requestPermission,
    startRecording,
    stopRecording,
  } = useMediaRecorder()

  const isRecordingActive = status === 'recording' || isRecordingProp

  // Fetch / Compute stats
  const lecturesToday = useMemo(() => {
    const todayStr = new Date().toDateString()
    return lectures.filter(
      (lecture) => new Date(lecture.createdAt).toDateString() === todayStr
    ).length
  }, [lectures])

  const avgLengthMinutes = useMemo(() => {
    const validLectures = lectures.filter((l) => l.duration && l.duration > 0)
    if (validLectures.length === 0) return 0
    const totalSeconds = validLectures.reduce((acc, curr) => acc + (curr.duration || 0), 0)
    const avgSeconds = totalSeconds / validLectures.length
    return Math.round(avgSeconds / 60)
  }, [lectures])

  // Track microphone permission
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName })
        .then((permissionStatus) => {
          setMicStatus(permissionStatus.state === 'granted' ? 'ready' : 'not connected')
          permissionStatus.onchange = () => {
            setMicStatus(permissionStatus.state === 'granted' ? 'ready' : 'not connected')
          }
        })
        .catch(() => {
          // Fallback if query fails
        })
    }
  }, [])

  const handleMicClick = useCallback(() => {
    if (isRecordingActive) {
      stopRecording()
    } else {
      setIsModalOpen(true)
    }
  }, [isRecordingActive, stopRecording])

  const handleConfirmStart = useCallback(async () => {
    setIsModalOpen(false)
    const granted = await requestPermission()
    if (granted) {
      startRecording()
    }
  }, [requestPermission, startRecording])

  return (
    <FadeUp delay={0.12}>
      <div
        className={cn(
          'relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08]',
          'bg-[#0d0d0d]/95 backdrop-blur-xl p-5 md:p-6',
        )}
      >
        {/* Header */}
        <div className="relative flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-red" strokeWidth={1.75} />
            <p className="text-xs font-semibold tracking-[0.15em] uppercase text-foreground">
              Live Lecture
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', isRecordingActive ? 'bg-red animate-pulse' : 'bg-red/70')} />
            <span className="text-xs font-medium text-red">
              {isRecordingActive ? 'Recording' : 'Not recording'}
            </span>
          </div>
        </div>

        {/* Center */}
        <div className="relative flex flex-1 flex-col items-center justify-center text-center py-0">
          <button
            type="button"
            onClick={handleMicClick}
            className="focus:outline-none cursor-pointer transition-transform duration-200 active:scale-95 bg-transparent border-0 p-0"
            aria-label={isRecordingActive ? 'Stop recording' : 'Start recording'}
          >
            <GlowingMic isRecording={isRecordingActive} />
          </button>
          <p className="mt-4 text-base font-semibold text-foreground">
            {isRecordingActive ? 'Lecture recording in progress' : 'No lecture recording'}
          </p>
          <p className="mt-2 text-sm text-muted max-w-[260px] leading-relaxed">
            {isRecordingActive ? 'Speak clearly near your microphone' : 'Start recording or upload a lecture to begin'}
          </p>
        </div>

        {/* Waveform + timer OR Stats Rail */}
        <div className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-4 mt-6 mb-4 min-h-[102px] flex flex-col justify-center">
          {isRecordingActive ? (
            <>
              <SymmetricWaveform levels={levels} animated={status === 'recording'} />
              <p className="mt-2 text-center font-mono text-sm text-muted/80 tabular-nums tracking-[0.2em]">
                {formatTime(elapsedSeconds)}
              </p>
            </>
          ) : (
            <div className="flex items-center justify-around w-full text-center">
              {/* Block 1 */}
              <div className="flex flex-col items-center flex-1">
                <span className="font-heading text-2xl text-foreground font-black">{lecturesToday}</span>
                <span className="text-[9px] text-muted font-bold uppercase tracking-wider mt-0.5">lectures today</span>
              </div>
              
              {/* Divider */}
              <div className="h-8 w-px bg-white/[0.08]" />
              
              {/* Block 2 */}
              <div className="flex flex-col items-center flex-1">
                <span className="font-heading text-2xl text-foreground font-black">{avgLengthMinutes}m</span>
                <span className="text-[9px] text-muted font-bold uppercase tracking-wider mt-0.5">avg length</span>
              </div>
              
              {/* Divider */}
              <div className="h-8 w-px bg-white/[0.08]" />
              
              {/* Block 3 */}
              <div className="flex flex-col items-center flex-1">
                <span className={cn(
                  "font-heading text-[15px] font-black uppercase tracking-wide",
                  micStatus === 'ready' ? "text-accent" : "text-muted"
                )}>
                  {micStatus}
                </span>
                <span className="text-[9px] text-muted font-bold uppercase tracking-wider mt-0.5">mic status</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5">
          <MotionLink
            to="/dashboard/record"
            className="group relative flex items-center gap-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
            whileHover={prefersReducedMotion ? {} : { y: -2, borderColor: 'rgba(255, 255, 255, 0.16)', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)' }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {/* Subtle accent color left border on hover */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-red scale-y-0 group-hover:scale-y-100 transition-transform origin-center duration-200" />
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red/10 text-red transition-all duration-200 group-hover:scale-105 group-hover:bg-red/15">
              <Mic className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <span className="text-sm font-medium text-foreground transition-colors duration-150 group-hover:text-white">
              Record Live
            </span>
          </MotionLink>

          <MotionLink
            to="/dashboard/upload"
            className="group relative flex items-center gap-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
            whileHover={prefersReducedMotion ? {} : { y: -2, borderColor: 'rgba(255, 255, 255, 0.16)', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)' }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent scale-y-0 group-hover:scale-y-100 transition-transform origin-center duration-200" />
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent transition-all duration-200 group-hover:scale-105 group-hover:bg-accent/15">
              <Upload className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <span className="text-sm font-medium text-foreground transition-colors duration-150 group-hover:text-white">
              Upload Lecture
            </span>
          </MotionLink>
        </div>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-2.5 mt-2.5">
          <MotionLink
            to="/dashboard/youtube"
            className="group relative flex items-center gap-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
            whileHover={prefersReducedMotion ? {} : { y: -2, borderColor: 'rgba(255, 255, 255, 0.16)', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)' }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-red scale-y-0 group-hover:scale-y-100 transition-transform origin-center duration-200" />
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red/10 text-red transition-all duration-200 group-hover:scale-105 group-hover:bg-red/15">
              <YoutubeIcon className="h-4 w-4 text-[#FF0000]" />
            </div>
            <span className="text-sm font-medium text-foreground transition-colors duration-150 group-hover:text-white">
              YouTube Import
            </span>
          </MotionLink>

          <MotionLink
            to="/dashboard/pdf"
            className="group relative flex items-center gap-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
            whileHover={prefersReducedMotion ? {} : { y: -2, borderColor: 'rgba(255, 255, 255, 0.16)', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)' }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-emerald scale-y-0 group-hover:scale-y-100 transition-transform origin-center duration-200" />
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald/10 text-emerald transition-all duration-200 group-hover:scale-105 group-hover:bg-emerald/15">
              <FileText className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <span className="text-sm font-medium text-foreground transition-colors duration-150 group-hover:text-white">
              Upload PDF
            </span>
          </MotionLink>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'relative w-full max-w-sm rounded-2xl border border-white/[0.1] bg-card/95 p-6 text-left',
                'shadow-[0_0_48px_rgba(0,0,0,0.45)] backdrop-blur-xl',
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-white/[0.05] transition-colors cursor-pointer border-0 bg-transparent"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="font-heading text-lg text-foreground font-bold">Start recording this lecture?</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Make sure you're in a quiet environment for best transcription accuracy.
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleConfirmStart}
                  className="w-full py-2.5 rounded-xl bg-accent text-background font-bold hover:bg-accent-soft transition-colors cursor-pointer text-sm border-0"
                >
                  Start recording
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-2.5 rounded-xl border border-white/[0.08] bg-transparent text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer text-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </FadeUp>
  )
}

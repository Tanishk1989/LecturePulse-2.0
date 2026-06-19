import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, Mic } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ParticleField } from '@/components/effects/ParticleField'
import { LiveRecordingMic } from '@/components/record/LiveRecordingMic'
import { LiveStatusHeader } from '@/components/record/LiveStatusHeader'
import { LiveTranscriptPanel } from '@/components/record/LiveTranscriptPanel'
import { PostRecordingResults } from '@/components/record/PostRecordingResults'
import { RecordingControls } from '@/components/record/RecordingControls'
import { PulseIcon } from '@/components/shared/PulseIcon'
import { useToast } from '@/components/ui/ToastProvider'
import { useAuthContext } from '@/context/AuthContext'
import { useLiveTranscription } from '@/hooks/useLiveTranscription'
import { useLectures } from '@/hooks/useLectures'
import {
  generateFlashcards,
  generateSummary,
  isAiGenerationConfigured,
  type Flashcard,
} from '@/services/aiGenerationService'
import { createFlashcards } from '@/services/flashcardService'
import { formatDuration } from '@/lib/formatDuration'
import { cn } from '@/lib/utils'

type PostProcessPhase = 'idle' | 'saving' | 'generating' | 'done'

function RecordLiveBackground() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute inset-0 star-particles opacity-30" />
      <ParticleField count={36} yellowRatio={0.55} />
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.04] via-transparent to-ambient/[0.05]" />
      <motion.div
        className="absolute top-1/3 left-1/2 h-[420px] w-[520px] -translate-x-1/2 rounded-full bg-red/[0.04] blur-[120px]"
        animate={prefersReducedMotion ? {} : { opacity: [0.35, 0.55, 0.35], scale: [1, 1.05, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

export function RecordLivePage() {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { toast } = useToast()
  const { uploadLecture } = useLectures()

  const {
    permission,
    status,
    elapsedSeconds,
    audioBlob,
    getAnalyser,
    liveChunks,
    interimText,
    fullText,
    detectedLanguage,
    transcriptionError,
    isProcessingChunk,
    latestChunkId,
    isSpeechRecognitionSupported,
    startLiveRecording,
    pauseLiveRecording,
    resumeLiveRecording,
    stopLiveRecording,
    resetAll,
    retryTranscription,
  } = useLiveTranscription()

  const [phase, setPhase] = useState<PostProcessPhase>('idle')
  const [savedLectureId, setSavedLectureId] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [summaryState, setSummaryState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [flashcardsState, setFlashcardsState] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle',
  )
  const [askAiEnabled, setAskAiEnabled] = useState(false)
  const processingRef = useRef(false)

  const isActiveSession =
    permission === 'granted' && (status === 'recording' || status === 'paused')
  const showEmptyState = permission === 'pending' && status === 'idle' && phase === 'idle'
  const showPostRecording = phase === 'generating' || phase === 'done'

  const handleStart = useCallback(async () => {
    if (!isSpeechRecognitionSupported) {
      toast.error('Speech recognition is not supported. Use Chrome or Edge.')
      return
    }
    await startLiveRecording()
  }, [isSpeechRecognitionSupported, startLiveRecording, toast])

  const handleStop = useCallback(async () => {
    await stopLiveRecording()
  }, [stopLiveRecording])

  useEffect(() => {
    if (status !== 'stopped' || !audioBlob || processingRef.current) return

    processingRef.current = true

    const finalize = async () => {
      setPhase('saving')

      const liveTranscriptText = fullText.trim()
      let transcriptText = liveTranscriptText
      let lectureId: string | null = null

      try {
        if (user) {
          const saved = await uploadLecture({
            title: transcriptText
              ? transcriptText.slice(0, 60) + (transcriptText.length > 60 ? '…' : '')
              : '🎙 Live Recording',
            duration: elapsedSeconds,
            blob: audioBlob,
            mediaKind: 'audio',
            source: 'record',
            mimeType: audioBlob.type || 'audio/webm',
          })

          if (saved) {
            lectureId = saved.id
            setSavedLectureId(saved.id)
          }
        }

        setPhase('generating')

        if (transcriptText && isAiGenerationConfigured()) {
          setSummaryState('loading')
          setFlashcardsState('loading')

          const [summaryResult, flashcardsResult] = await Promise.allSettled([
            generateSummary(transcriptText),
            generateFlashcards(transcriptText),
          ])

          if (summaryResult.status === 'fulfilled') {
            setSummary(summaryResult.value)
            setSummaryState('done')
          } else {
            setSummaryState('error')
          }

          if (flashcardsResult.status === 'fulfilled') {
            setFlashcards(flashcardsResult.value)
            setFlashcardsState('done')

            if (flashcardsResult.value.length > 0 && user && lectureId) {
              try {
                await createFlashcards(user.uid, lectureId, flashcardsResult.value)
              } catch {
                toast.error('Flashcards generated but could not be saved to your deck.')
              }
            }
          } else {
            setFlashcardsState('error')
          }

          setAskAiEnabled(true)
        } else if (transcriptText) {
          setSummaryState('error')
          setFlashcardsState('error')
        }

        setPhase('done')
      } catch {
        toast.error('Failed to save recording.')
        setPhase('idle')
        processingRef.current = false
      }
    }

    void finalize()
  }, [
    status,
    audioBlob,
    fullText,
    elapsedSeconds,
    user,
    uploadLecture,
    toast,
  ])

  const handleRecordAnother = useCallback(() => {
    resetAll()
    setPhase('idle')
    setSavedLectureId(null)
    setSummary(null)
    setFlashcards([])
    setSummaryState('idle')
    setFlashcardsState('idle')
    setAskAiEnabled(false)
    processingRef.current = false
  }, [resetAll])

  return (
    <div className="relative -mx-5 -my-7 lg:-mx-8 lg:-my-9 min-h-[calc(100dvh-72px)]">
      <div
        className={cn(
          'relative flex min-h-[calc(100dvh-72px)] flex-col overflow-hidden',
          'rounded-none border-0 bg-[#080808]/80 backdrop-blur-xl md:rounded-3xl md:border md:border-white/[0.06]',
        )}
      >
        <RecordLiveBackground />

        <div className="relative z-10 flex flex-1 flex-col px-5 py-6 md:px-8 md:py-8">
          {/* TOP — Live status */}
          <div className="flex min-h-[52px] items-start justify-center">
            <LiveStatusHeader
              active={status === 'recording'}
              paused={status === 'paused'}
              language={detectedLanguage}
            />
          </div>

          {/* CENTER — Mic + waveform + controls */}
          <div className="flex flex-1 flex-col items-center justify-center py-4">
            <AnimatePresence mode="wait">
              {showPostRecording ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex w-full flex-col items-center"
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald/30 bg-emerald/[0.1] shadow-[0_0_40px_rgba(16,185,129,0.2)]"
                  >
                    <Check className="h-8 w-8 text-emerald" strokeWidth={2} />
                  </motion.div>
                  <p className="font-heading text-2xl text-foreground md:text-3xl">
                    Recording complete.
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {fullText
                      ? 'Preview ready — full transcript and notes are processing in the background.'
                      : 'Recording saved — transcription is processing in the background.'}
                  </p>

                  {fullText && (
                    <PostRecordingResults
                      className="mt-8"
                      summary={summary}
                      flashcards={flashcards}
                      summaryState={summaryState}
                      flashcardsState={flashcardsState}
                      askAiEnabled={askAiEnabled}
                      onAskAi={() => {
                        if (savedLectureId) navigate(`/transcript/${savedLectureId}`)
                      }}
                    />
                  )}

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    {savedLectureId && fullText && (
                      <Link
                        to={`/notes/${savedLectureId}`}
                        className={cn(
                          'inline-flex items-center justify-center rounded-full border border-accent/30 px-6 py-3 text-sm font-medium text-accent',
                          'bg-accent/[0.08] hover:bg-accent/[0.12] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
                        )}
                      >
                        View Smart Notes
                      </Link>
                    )}
                    {savedLectureId && (
                      <Link
                        to={`/transcript/${savedLectureId}`}
                        className={cn(
                          'inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-background',
                          'shadow-[0_0_24px_rgba(214,162,11,0.2)] hover:bg-accent-soft hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
                        )}
                      >
                        View Transcript
                      </Link>
                    )}
                    <Link
                      to="/dashboard/lectures"
                      className={cn(
                        'inline-flex items-center justify-center rounded-full border border-white/[0.12] px-6 py-3 text-sm font-medium text-foreground',
                        'bg-white/[0.03] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
                      )}
                    >
                      View in Library
                    </Link>
                    <button
                      type="button"
                      onClick={handleRecordAnother}
                      className={cn(
                        'inline-flex items-center justify-center rounded-full border border-white/[0.12] px-6 py-3 text-sm font-medium text-foreground',
                        'bg-white/[0.03] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
                      )}
                    >
                      Record Another
                    </button>
                  </div>
                </motion.div>
              ) : showEmptyState ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  className="flex flex-col items-center text-center"
                >
                  <LiveRecordingMic isRecording={false} isPaused={false} />
                  <p className="mt-8 max-w-md text-xl font-semibold text-foreground md:text-2xl">
                    Start speaking.
                  </p>
                  <p className="mt-2 max-w-sm text-sm text-muted leading-relaxed">
                    LecturePulse will listen.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleStart()}
                    className={cn(
                      'mt-8 inline-flex items-center gap-2.5 rounded-full bg-accent px-8 py-3.5 text-sm font-medium text-background',
                      'shadow-[0_0_32px_rgba(214,162,11,0.25)] hover:bg-accent-soft hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
                    )}
                  >
                    <Mic className="h-4 w-4" strokeWidth={2} />
                    Record Live
                  </button>
                </motion.div>
              ) : permission === 'denied' ? (
                <motion.div
                  key="denied"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center text-center"
                >
                  <LiveRecordingMic isRecording={false} isPaused={false} disabled />
                  <p className="mt-8 text-xl font-semibold text-foreground md:text-2xl">
                    Microphone permission required.
                  </p>
                  <p className="mt-3 max-w-sm text-sm text-muted leading-relaxed">
                    Enable microphone access in your browser settings, then try again.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleStart()}
                    className={cn(
                      'mt-8 inline-flex items-center justify-center rounded-full border border-white/[0.12] px-7 py-3.5 text-sm font-medium text-foreground',
                      'bg-white/[0.03] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
                    )}
                  >
                    Try Again
                  </button>
                </motion.div>
              ) : isActiveSession ? (
                <motion.div
                  key="recording"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  className="flex w-full max-w-xl flex-col items-center"
                >
                  <LiveRecordingMic
                    isRecording={status === 'recording'}
                    isPaused={status === 'paused'}
                    showVisualizer
                    getAnalyser={getAnalyser}
                  />

                  <p className="mt-6 font-mono text-4xl font-black tabular-nums tracking-[0.08em] text-foreground md:text-5xl">
                    {formatDuration(elapsedSeconds)}
                  </p>

                  <div className="mt-8">
                    <RecordingControls
                      status={status === 'paused' ? 'paused' : 'recording'}
                      onPause={pauseLiveRecording}
                      onResume={resumeLiveRecording}
                      onStop={() => void handleStop()}
                    />
                  </div>
                </motion.div>
              ) : phase === 'saving' ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4 text-center"
                >
                  <PulseIcon size={48} glow />
                  <p className="text-sm text-muted">Saving transcript…</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* BOTTOM — Live transcript */}
          {(isActiveSession || (status === 'stopped' && phase === 'idle' && fullText)) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-auto w-full max-w-2xl mx-auto pt-4"
            >
              <LiveTranscriptPanel
                chunks={liveChunks}
                interimText={interimText}
                latestChunkId={latestChunkId}
                isProcessing={isProcessingChunk && status === 'recording'}
                error={transcriptionError}
                onRetry={retryTranscription}
                paused={status === 'paused'}
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

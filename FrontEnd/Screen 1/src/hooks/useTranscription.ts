import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { useToast } from '@/components/ui/ToastProvider'
import { useProcessingPoll } from '@/hooks/useProcessingPoll'
import {
  getTranscriptByLectureId,
  isTranscriptionConfigured,
  isTranscribableMediaUrl,
  type TranscriptionProgress,
} from '@/services/transcriptionService'
import { AI_UNAVAILABLE_MESSAGE } from '@/services/aiGenerationService'
import {
  enqueueLectureProcessing,
  getLectureProcessingStatus,
  isBackgroundProcessingAvailable,
} from '@/services/processingService'
import { updateLecture } from '@/services/lectureService'
import type { Transcript } from '@/types/transcript'

export type TranscriptionPhase =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'transcribing'
  | 'completed'
  | 'failed'

interface UseTranscriptionOptions {
  autoTranscribe?: boolean
  onLectureStatusChange?: () => void
}

interface UseTranscriptionResult {
  transcript: Transcript | null
  phase: TranscriptionPhase
  isLoading: boolean
  isTranscribing: boolean
  transcriptionProgress: TranscriptionProgress | null
  overallProgress: number
  interimText: string
  error: string | null
  canTranscribe: boolean
  refresh: () => Promise<void>
  startTranscription: () => Promise<void>
  retryTranscription: () => Promise<void>
}

function stageWeight(stage: TranscriptionProgress['stage']): number {
  switch (stage) {
    case 'fetching':
      return 0
    case 'uploading':
      return 25
    case 'transcribing':
      return 55
    case 'saving':
      return 90
    default:
      return 0
  }
}

function computeOverallProgress(progress: TranscriptionProgress | null): number {
  if (!progress) return 0
  const base = stageWeight(progress.stage)
  const span =
    progress.stage === 'fetching'
      ? 25
      : progress.stage === 'uploading'
        ? 30
        : progress.stage === 'transcribing'
          ? 35
          : 10
  return Math.min(100, Math.round(base + (progress.progress / 100) * span))
}

export function useTranscription(
  lectureId: string | undefined,
  audioUrl: string | undefined,
  options: UseTranscriptionOptions = {},
): UseTranscriptionResult {
  const { user } = useAuthContext()
  const { toast } = useToast()
  const { autoTranscribe = true, onLectureStatusChange } = options

  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [phase, setPhase] = useState<TranscriptionPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [interimText, setInterimText] = useState('')
  const [transcriptionProgress, setTranscriptionProgress] =
    useState<TranscriptionProgress | null>(null)
  const [isBackgroundProcessing, setIsBackgroundProcessing] = useState(false)

  const transcribingRef = useRef(false)
  const autoStartedRef = useRef(false)

  const canTranscribe =
    isTranscriptionConfigured() && Boolean(audioUrl) && isTranscribableMediaUrl(audioUrl ?? '')

  const refresh = useCallback(async () => {
    if (!user || !lectureId) {
      setTranscript(null)
      setPhase('idle')
      setIsBackgroundProcessing(false)
      return
    }

    setPhase('loading')
    setError(null)

    try {
      const [existing, processingStatus] = await Promise.all([
        getTranscriptByLectureId(user.uid, lectureId),
        getLectureProcessingStatus(user.uid, lectureId),
      ])

      setTranscript(existing)
      setIsBackgroundProcessing(processingStatus.isProcessing)

      if (existing?.status === 'completed') {
        setPhase('completed')
        setTranscriptionProgress({ stage: 'saving', progress: 100, step: 'ready' })
      } else if (existing?.status === 'failed') {
        setPhase('failed')
        setError(existing.errorMessage)
        setTranscriptionProgress(null)
      } else if (processingStatus.isProcessing || existing?.status === 'processing') {
        setPhase('transcribing')
        setTranscriptionProgress({ stage: 'transcribing', progress: 50, step: 'transcribing' })
      } else {
        setPhase('ready')
        setTranscriptionProgress(null)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load transcript.'
      setError(message)
      setPhase('failed')
      toast.error(message)
    }
  }, [lectureId, toast, user])

  useEffect(() => {
    autoStartedRef.current = false
    void refresh()
  }, [refresh])

  useProcessingPoll(user?.uid, lectureId, isBackgroundProcessing, () => {
    void refresh().then(() => onLectureStatusChange?.())
  })

  const startTranscription = useCallback(async () => {
    if (!user || !lectureId || !audioUrl) return
    if (transcribingRef.current) return
    if (!canTranscribe) {
      toast.error(AI_UNAVAILABLE_MESSAGE)
      return
    }

    transcribingRef.current = true
    setPhase('transcribing')
    setError(null)
    setInterimText('')
    setTranscriptionProgress({ stage: 'transcribing', progress: 20, step: 'transcribing' })
    setIsBackgroundProcessing(true)

    try {
      if (isBackgroundProcessingAvailable()) {
        await enqueueLectureProcessing(lectureId, { generateNotes: true })
        toast.success('Processing started. You can leave this page.')
      } else {
        throw new Error(AI_UNAVAILABLE_MESSAGE)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transcription failed.'
      setError(message)
      setPhase('failed')
      setInterimText('')
      setTranscriptionProgress(null)
      setIsBackgroundProcessing(false)
      onLectureStatusChange?.()
      toast.error('Transcription failed. Try again.')
    } finally {
      transcribingRef.current = false
    }
  }, [audioUrl, canTranscribe, lectureId, onLectureStatusChange, toast, user])

  const retryTranscription = useCallback(async () => {
    if (!user || !lectureId) return

    try {
      await updateLecture(user.uid, lectureId, { status: 'uploaded' })
      onLectureStatusChange?.()
    } catch {
      // continue with retry even if status reset fails
    }

    autoStartedRef.current = false
    setIsBackgroundProcessing(true)
    setPhase('transcribing')
    setTranscriptionProgress({ stage: 'transcribing', progress: 20, step: 'transcribing' })

    try {
      await enqueueLectureProcessing(lectureId, {
        generateNotes: true,
        forceRetranscribe: true,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transcription failed.'
      setError(message)
      setPhase('failed')
      setIsBackgroundProcessing(false)
      toast.error(message)
    }
  }, [lectureId, onLectureStatusChange, toast, user])

  useEffect(() => {
    if (!autoTranscribe || !canTranscribe || !lectureId || !user) return
    if (autoStartedRef.current) return
    if (phase !== 'ready') return

    autoStartedRef.current = true

    void (async () => {
      const status = await getLectureProcessingStatus(user.uid, lectureId)

      if (status.isProcessing) {
        setIsBackgroundProcessing(true)
        setPhase('transcribing')
        setTranscriptionProgress({ stage: 'transcribing', progress: 50, step: 'transcribing' })
        return
      }

      if (status.transcriptStatus === 'completed') return

      await startTranscription()
    })()
  }, [autoTranscribe, canTranscribe, lectureId, phase, startTranscription, user])

  const overallProgress = useMemo(
    () => computeOverallProgress(transcriptionProgress),
    [transcriptionProgress],
  )

  return {
    transcript,
    phase,
    isLoading: phase === 'loading',
    isTranscribing: phase === 'transcribing',
    transcriptionProgress,
    overallProgress,
    interimText,
    error,
    canTranscribe,
    refresh,
    startTranscription,
    retryTranscription,
  }
}

/** @deprecated Use `useTranscription` instead */
export const useTranscript = useTranscription
export type TranscriptPhase = TranscriptionPhase

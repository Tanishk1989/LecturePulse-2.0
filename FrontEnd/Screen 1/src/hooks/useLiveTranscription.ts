import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { detectLanguageFromText } from '@/lib/webSpeechRecognition'
import type { DetectedLanguageLabel } from '@/lib/webSpeechRecognition'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'
import { createTranscript, updateTranscript } from '@/services/transcriptionService'
import { transcribeLiveAudioChunk } from '@/services/liveTranscriptionService'
import { detectSpeakers } from '@/services/speakerDetectionService'
import { analyzeVoiceProfile, VoiceClusterTracker } from '@/lib/audioVoiceProfile'
import { classifySegmentHeuristic } from '@/lib/speakerHeuristics'
import type { SpeakerRole, TranscriptSegment } from '@/types/transcript'
import { formatDuration } from '@/lib/formatDuration'

export interface LiveTranscriptChunk {
  id: string
  timestamp: number
  timestampLabel: string
  text: string
  isInterim?: boolean
  speaker?: SpeakerRole
}

const LIVE_CHUNK_INTERVAL_MS = 7000
const STOP_FLUSH_DELAY_MS = 450

function dedupeAppend(existing: string, incoming: string): string {
  const trimmed = incoming.trim()
  if (!trimmed) return existing
  if (!existing) return trimmed

  const existingTail = existing.slice(-120).toLowerCase()
  const incomingHead = trimmed.slice(0, 120).toLowerCase()

  for (let overlap = Math.min(80, existingTail.length, incomingHead.length); overlap > 12; overlap -= 1) {
    if (existingTail.endsWith(incomingHead.slice(0, overlap))) {
      return `${existing}${trimmed.slice(overlap).trimStart()}`.trim()
    }
  }

  return `${existing} ${trimmed}`.trim()
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export type { DetectedLanguageLabel } from '@/lib/webSpeechRecognition'

export function useLiveTranscription(userId?: string | null) {
  const [liveChunks, setLiveChunks] = useState<LiveTranscriptChunk[]>([])
  const [interimText, setInterimText] = useState('')
  const [fullText, setFullText] = useState('')
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [detectedLanguage, setDetectedLanguage] = useState<DetectedLanguageLabel>('Detecting…')
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)
  const [isProcessingChunk, setIsProcessingChunk] = useState(false)
  const [pendingChunkCount, setPendingChunkCount] = useState(0)
  const [latestChunkId, setLatestChunkId] = useState<string | null>(null)

  const fullTextRef = useRef('')
  const segmentsRef = useRef<TranscriptSegment[]>([])
  const chunkIndexRef = useRef(0)
  const elapsedRef = useRef(0)
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const sessionIdRef = useRef(crypto.randomUUID())
  const userIdRef = useRef(userId ?? null)
  const voiceTrackerRef = useRef(new VoiceClusterTracker())

  useEffect(() => {
    userIdRef.current = userId ?? null
  }, [userId])

  const appendFinalText = useCallback(
    (text: string, timestamp: number, duration?: number | null, voiceCluster?: number) => {
      const trimmed = text.trim()
      if (!trimmed) return

      const chunkId = `chunk-${chunkIndexRef.current}`
      chunkIndexRef.current += 1

      const nextText = dedupeAppend(fullTextRef.current, trimmed)
      fullTextRef.current = nextText
      setFullText(nextText)
      setInterimText('')
      setDetectedLanguage(detectLanguageFromText(nextText))

      const speaker = classifySegmentHeuristic(trimmed)
      const segment: TranscriptSegment = {
        id: segmentsRef.current.length,
        start: timestamp,
        end: timestamp + Math.max(1, duration ?? LIVE_CHUNK_INTERVAL_MS / 1000),
        text: trimmed,
        speaker,
        voiceCluster,
      }
      segmentsRef.current = [...segmentsRef.current, segment]
      setSegments(segmentsRef.current)

      setLiveChunks((prev) => [
        ...prev,
        {
          id: chunkId,
          timestamp,
          timestampLabel: formatDuration(timestamp),
          text: trimmed,
          isInterim: false,
          speaker,
        },
      ])
      setLatestChunkId(chunkId)
    },
    [],
  )

  const transcribeChunk = useCallback(
    async (blob: Blob, recorderChunkIndex: number) => {
      const currentUserId = userIdRef.current
      if (!currentUserId || blob.size === 0) return

      setPendingChunkCount((count) => count + 1)
      setIsProcessingChunk(true)
      setTranscriptionError(null)
      setInterimText('Sending audio to Whisper...')

      try {
        const timestamp = elapsedRef.current
        const voiceProfile = await analyzeVoiceProfile(blob)
        const voiceCluster = voiceProfile ? voiceTrackerRef.current.assign(voiceProfile) : undefined

        const result = await transcribeLiveAudioChunk({
          userId: currentUserId,
          sessionId: sessionIdRef.current,
          chunkIndex: recorderChunkIndex,
          blob,
          language: undefined,
        })

        if (result?.text) {
          appendFinalText(result.text, timestamp, result.duration, voiceCluster)
        }
      } catch (error) {
        setTranscriptionError(
          error instanceof Error ? error.message : 'Live processing failed.',
        )
      } finally {
        setPendingChunkCount((count) => {
          const next = Math.max(0, count - 1)
          if (next === 0) {
            setIsProcessingChunk(false)
            setInterimText('')
          }
          return next
        })
      }
    },
    [appendFinalText],
  )

  const enqueueChunk = useCallback(
    (blob: Blob, recorderChunkIndex: number) => {
      queueRef.current = queueRef.current.then(() => transcribeChunk(blob, recorderChunkIndex))
    },
    [transcribeChunk],
  )

  const recorder = useMediaRecorder({
    chunkIntervalMs: LIVE_CHUNK_INTERVAL_MS,
    onChunk: enqueueChunk,
  })

  useEffect(() => {
    elapsedRef.current = recorder.elapsedSeconds
  }, [recorder.elapsedSeconds])

  const resetTranscription = useCallback(() => {
    sessionIdRef.current = crypto.randomUUID()
    queueRef.current = Promise.resolve()
    setLiveChunks([])
    setInterimText('')
    setFullText('')
    setSegments([])
    setDetectedLanguage('Detecting…')
    setTranscriptionError(null)
    setIsProcessingChunk(false)
    setPendingChunkCount(0)
    setLatestChunkId(null)
    fullTextRef.current = ''
    segmentsRef.current = []
    chunkIndexRef.current = 0
    voiceTrackerRef.current.reset()
  }, [])

  const refineSpeakers = useCallback(async (subject?: string) => {
    if (segmentsRef.current.length === 0) return

    try {
      const labeled = await detectSpeakers(segmentsRef.current, { subject, useLlm: true })
      segmentsRef.current = labeled
      setSegments(labeled)
      setLiveChunks((prev) =>
        prev.map((chunk, index) => ({
          ...chunk,
          speaker: labeled[index]?.speaker ?? chunk.speaker,
        })),
      )
    } catch (error) {
      console.error('Speaker refinement failed:', error)
    }
  }, [])

  const startLiveRecording = useCallback(async () => {
    resetTranscription()
    if (!userIdRef.current) {
      setTranscriptionError('Sign in to use live lecture capture.')
      return false
    }
    const granted = await recorder.requestPermission()
    if (!granted) return false
    recorder.startRecording()
    return true
  }, [recorder, resetTranscription])

  const pauseLiveRecording = useCallback(() => {
    recorder.pauseRecording()
    setInterimText('')
  }, [recorder])

  const resumeLiveRecording = useCallback(() => {
    recorder.resumeRecording()
  }, [recorder])

  const stopLiveRecording = useCallback(async () => {
    recorder.stopRecording()
    await wait(STOP_FLUSH_DELAY_MS)
    await queueRef.current
  }, [recorder])

  const resetAll = useCallback(() => {
    resetTranscription()
    recorder.reset()
  }, [recorder, resetTranscription])

  const retryTranscription = useCallback(() => {
    setTranscriptionError(null)
  }, [])

  const saveTranscript = useCallback(
    async (saveUserId: string, lectureId: string, durationSeconds: number) => {
      const text = fullTextRef.current.trim()
      if (!text) return null

      return createTranscript({
        lectureId,
        userId: saveUserId,
        text,
        language: detectedLanguage === 'Detecting…' ? null : detectedLanguage,
        durationSeconds,
        segments: segmentsRef.current,
        status: 'completed',
      })
    },
    [detectedLanguage],
  )

  const updateSavedTranscript = useCallback(
    async (transcriptId: string, saveUserId: string, durationSeconds: number) => {
      const text = fullTextRef.current.trim()
      if (!text) return null

      return updateTranscript(transcriptId, saveUserId, {
        text,
        language: detectedLanguage === 'Detecting…' ? null : detectedLanguage,
        durationSeconds,
        segments: segmentsRef.current,
        status: 'completed',
        errorMessage: null,
      })
    },
    [detectedLanguage],
  )

  return useMemo(
    () => ({
      ...recorder,
      liveChunks,
      interimText,
      fullText,
      segments,
      detectedLanguage,
      transcriptionError,
      isProcessingChunk,
      pendingChunkCount,
      latestChunkId,
      isSpeechRecognitionSupported: true,
      isWhisperConfigured: true,
      startLiveRecording,
      pauseLiveRecording,
      resumeLiveRecording,
      stopLiveRecording,
      resetAll,
      retryTranscription,
      refineSpeakers,
      saveTranscript,
      updateSavedTranscript,
    }),
    [
      recorder,
      liveChunks,
      interimText,
      fullText,
      segments,
      detectedLanguage,
      transcriptionError,
      isProcessingChunk,
      pendingChunkCount,
      latestChunkId,
      startLiveRecording,
      pauseLiveRecording,
      resumeLiveRecording,
      stopLiveRecording,
      resetAll,
      retryTranscription,
      refineSpeakers,
      saveTranscript,
      updateSavedTranscript,
    ],
  )
}

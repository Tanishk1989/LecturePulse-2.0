import { useCallback, useEffect, useRef, useState } from 'react'
import {
  detectLanguageFromText,
  isSpeechRecognitionSupported,
  SpeechRecognitionSession,
} from '@/lib/webSpeechRecognition'
import type { DetectedLanguageLabel } from '@/lib/webSpeechRecognition'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'
import { createTranscript, updateTranscript } from '@/services/transcriptionService'
import type { TranscriptSegment } from '@/types/transcript'
import { formatDuration } from '@/lib/formatDuration'

export interface LiveTranscriptChunk {
  id: string
  timestamp: number
  timestampLabel: string
  text: string
  isInterim?: boolean
}

function dedupeAppend(existing: string, incoming: string): string {
  const trimmed = incoming.trim()
  if (!trimmed) return existing
  if (!existing) return trimmed

  const existingTail = existing.slice(-80).toLowerCase()
  const incomingHead = trimmed.slice(0, 80).toLowerCase()

  for (let overlap = Math.min(60, existingTail.length, incomingHead.length); overlap > 10; overlap -= 1) {
    if (existingTail.endsWith(incomingHead.slice(0, overlap))) {
      return `${existing}${trimmed.slice(overlap).trimStart()}`
    }
  }

  return `${existing} ${trimmed}`.trim()
}

export type { DetectedLanguageLabel } from '@/lib/webSpeechRecognition'

export function useLiveTranscription() {
  const [liveChunks, setLiveChunks] = useState<LiveTranscriptChunk[]>([])
  const [interimText, setInterimText] = useState('')
  const [fullText, setFullText] = useState('')
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [detectedLanguage, setDetectedLanguage] = useState<DetectedLanguageLabel>('Detecting…')
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [latestChunkId, setLatestChunkId] = useState<string | null>(null)

  const sessionRef = useRef<SpeechRecognitionSession | null>(null)
  const fullTextRef = useRef('')
  const segmentsRef = useRef<TranscriptSegment[]>([])
  const chunkIndexRef = useRef(0)
  const elapsedRef = useRef(0)

  const recorder = useMediaRecorder()

  useEffect(() => {
    elapsedRef.current = recorder.elapsedSeconds
  }, [recorder.elapsedSeconds])

  const appendFinalText = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    const chunkId = `chunk-${chunkIndexRef.current}`
    chunkIndexRef.current += 1
    const timestamp = elapsedRef.current

    const nextText = dedupeAppend(fullTextRef.current, trimmed)
    fullTextRef.current = nextText
    setFullText(nextText)
    setInterimText('')
    setDetectedLanguage(detectLanguageFromText(nextText))

    const segment: TranscriptSegment = {
      id: segmentsRef.current.length,
      start: timestamp,
      end: timestamp + 2,
      text: trimmed,
    }
    segmentsRef.current = [...segmentsRef.current, segment]
    setSegments(segmentsRef.current)

    setLiveChunks((prev) => [
      ...prev.filter((chunk) => !chunk.isInterim),
      {
        id: chunkId,
        timestamp,
        timestampLabel: formatDuration(timestamp),
        text: trimmed,
        isInterim: false,
      },
    ])
    setLatestChunkId(chunkId)
  }, [])

  const startRecognition = useCallback(() => {
    if (!isSpeechRecognitionSupported()) return

    sessionRef.current?.abort()

    const session = new SpeechRecognitionSession({
      language: 'auto',
      onInterim: (text) => {
        setInterimText(text)
        setLiveChunks((prev) => {
          const withoutInterim = prev.filter((chunk) => !chunk.isInterim)
          if (!text.trim()) return withoutInterim
          return [
            ...withoutInterim,
            {
              id: 'interim',
              timestamp: elapsedRef.current,
              timestampLabel: formatDuration(elapsedRef.current),
              text,
              isInterim: true,
            },
          ]
        })
      },
      onFinal: (text) => appendFinalText(text),
      onError: (message) => setTranscriptionError(message),
      onStart: () => setIsListening(true),
      onEnd: () => setIsListening(false),
    })

    sessionRef.current = session
    session.start()
  }, [appendFinalText])

  const stopRecognition = useCallback(() => {
    sessionRef.current?.stop()
    sessionRef.current = null
    setIsListening(false)
    setInterimText('')
    setLiveChunks((prev) => prev.filter((chunk) => !chunk.isInterim))
  }, [])

  const resetTranscription = useCallback(() => {
    stopRecognition()
    setLiveChunks([])
    setInterimText('')
    setFullText('')
    setSegments([])
    setDetectedLanguage('Detecting…')
    setTranscriptionError(null)
    setLatestChunkId(null)
    fullTextRef.current = ''
    segmentsRef.current = []
    chunkIndexRef.current = 0
  }, [stopRecognition])

  const startLiveRecording = useCallback(async () => {
    resetTranscription()
    const granted = await recorder.requestPermission()
    if (!granted) return false
    recorder.startRecording()
    startRecognition()
    return true
  }, [recorder, resetTranscription, startRecognition])

  const pauseLiveRecording = useCallback(() => {
    recorder.pauseRecording()
    sessionRef.current?.pause()
    setInterimText('')
    setLiveChunks((prev) => prev.filter((chunk) => !chunk.isInterim))
  }, [recorder])

  const resumeLiveRecording = useCallback(() => {
    recorder.resumeRecording()
    sessionRef.current?.resume()
  }, [recorder])

  const stopLiveRecording = useCallback(async () => {
    recorder.stopRecording()
    stopRecognition()
  }, [recorder, stopRecognition])

  const resetAll = useCallback(() => {
    resetTranscription()
    recorder.reset()
  }, [recorder, resetTranscription])

  const retryTranscription = useCallback(() => {
    setTranscriptionError(null)
    if (recorder.status === 'recording') {
      startRecognition()
    }
  }, [recorder.status, startRecognition])

  const saveTranscript = useCallback(
    async (userId: string, lectureId: string, durationSeconds: number) => {
      const text = fullTextRef.current.trim()
      if (!text) return null

      return createTranscript({
        lectureId,
        userId,
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
    async (transcriptId: string, userId: string, durationSeconds: number) => {
      const text = fullTextRef.current.trim()
      if (!text) return null

      return updateTranscript(transcriptId, userId, {
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

  return {
    ...recorder,
    liveChunks,
    interimText,
    fullText,
    segments,
    detectedLanguage,
    transcriptionError,
    isProcessingChunk: isListening,
    latestChunkId,
    isSpeechRecognitionSupported: isSpeechRecognitionSupported(),
    /** @deprecated Use `isSpeechRecognitionSupported` */
    isWhisperConfigured: isSpeechRecognitionSupported(),
    startLiveRecording,
    pauseLiveRecording,
    resumeLiveRecording,
    stopLiveRecording,
    resetAll,
    retryTranscription,
    saveTranscript,
    updateSavedTranscript,
  }
}

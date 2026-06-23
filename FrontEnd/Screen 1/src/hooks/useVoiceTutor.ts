import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'
import { cancelSpeech, isSpeechActive, speakText } from '@/lib/speechSynthesis'
import { transcribeLiveAudioChunk } from '@/services/liveTranscriptionService'
import type { TutorMessage } from '@/services/aiTutorService'

export type VoiceTutorPhase =
  | 'initializing'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'ready'
  | 'error'

interface UseVoiceTutorOptions {
  enabled: boolean
  loading: boolean
  messages: TutorMessage[]
  ask: (question: string) => Promise<void>
  onMicUnavailable: (message: string) => void
  defaultTtsEnabled?: boolean
}

interface UseVoiceTutorResult {
  phase: VoiceTutorPhase
  ttsEnabled: boolean
  tutorResponseText: string | null
  micError: string | null
  toggleTts: () => void
  handlePrimaryAction: () => void
  stopVoiceSession: () => void
}

export function useVoiceTutor({
  enabled,
  loading,
  messages,
  ask,
  onMicUnavailable,
  defaultTtsEnabled = true,
}: UseVoiceTutorOptions): UseVoiceTutorResult {
  const { user } = useAuthContext()
  const sessionId = useId().replace(/:/g, '')
  const chunkIndexRef = useRef(0)

  const [phase, setPhase] = useState<VoiceTutorPhase>('initializing')
  const [ttsEnabled, setTtsEnabled] = useState(defaultTtsEnabled)
  const [tutorResponseText, setTutorResponseText] = useState<string | null>(null)
  const [micError, setMicError] = useState<string | null>(null)

  const phaseRef = useRef(phase)
  const loadingRef = useRef(loading)
  const prevLoadingRef = useRef(false)
  const handledResponseCountRef = useRef(0)
  const enabledRef = useRef(enabled)
  const startListeningRef = useRef<() => void>(() => {})

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  const recorder = useMediaRecorder({ keepStreamOnStop: true, chunkIntervalMs: 250 })

  const startListening = useCallback(() => {
    if (!enabledRef.current || loadingRef.current) return
    if (recorder.status === 'recording') return
    if (recorder.permission !== 'granted') return

    setMicError(null)
    recorder.startRecording()
    setPhase('listening')
  }, [recorder])

  useEffect(() => {
    startListeningRef.current = startListening
  }, [startListening])

  const finishListeningAndAsk = useCallback(async () => {
    if (recorder.status !== 'recording') return

    setPhase('transcribing')
    const blob = await recorder.stopRecordingAndGetBlob()

    if (!blob || blob.size === 0) {
      setPhase('ready')
      startListeningRef.current()
      return
    }

    if (!user) {
      onMicUnavailable('Sign in to use voice mode.')
      return
    }

    try {
      const result = await transcribeLiveAudioChunk({
        userId: user.uid,
        sessionId,
        chunkIndex: chunkIndexRef.current,
        blob,
      })
      chunkIndexRef.current += 1

      const text = result?.text?.trim()
      if (!text) {
        setPhase('ready')
        startListeningRef.current()
        return
      }

      setPhase('thinking')
      await ask(text)
    } catch (error) {
      setMicError(error instanceof Error ? error.message : 'Transcription failed.')
      setPhase('error')
    }
  }, [ask, onMicUnavailable, recorder, sessionId, user])

  const handlePrimaryAction = useCallback(() => {
    if (phaseRef.current === 'listening') {
      void finishListeningAndAsk()
      return
    }

    if (phaseRef.current === 'speaking' || isSpeechActive()) {
      cancelSpeech()
      setPhase('ready')
      startListeningRef.current()
      return
    }

    if (phaseRef.current === 'ready' && !loadingRef.current) {
      startListeningRef.current()
    }
  }, [finishListeningAndAsk, startListening])

  const stopVoiceSession = useCallback(() => {
    cancelSpeech()
    if (recorder.status === 'recording') {
      void recorder.stopRecordingAndGetBlob()
    }
    recorder.reset()
    setPhase('initializing')
    setMicError(null)
    chunkIndexRef.current = 0
  }, [recorder])

  const toggleTts = useCallback(() => {
    setTtsEnabled((prev) => {
      const next = !prev
      if (!next && isSpeechActive()) {
        cancelSpeech()
        if (phaseRef.current === 'speaking') {
          setPhase('ready')
          startListeningRef.current()
        }
      }
      return next
    })
  }, [])

  // Initialize mic when voice mode is enabled
  useEffect(() => {
    if (!enabled) {
      stopVoiceSession()
      return
    }

    let cancelled = false

    const init = async () => {
      setPhase('initializing')
      setMicError(null)

      if (!navigator.mediaDevices?.getUserMedia) {
        onMicUnavailable('Microphone is not supported in this browser.')
        return
      }

      const granted = await recorder.requestPermission()
      if (cancelled) return

      if (!granted) {
        onMicUnavailable('Microphone access was denied. Switched to text chat.')
        return
      }

      startListeningRef.current()
    }

    void init()

    return () => {
      cancelled = true
      cancelSpeech()
      if (recorder.status === 'recording') {
        void recorder.stopRecordingAndGetBlob()
      }
      recorder.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per enable
  }, [enabled])

  // Sync phase with AI loading state
  useEffect(() => {
    if (!enabled) return
    if (loading && phaseRef.current !== 'transcribing') {
      setPhase('thinking')
    }
  }, [enabled, loading])

  // Show streaming tutor text while the AI is responding
  useEffect(() => {
    if (!enabled || !loading) return
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    if (lastAssistant?.content) {
      setTutorResponseText(lastAssistant.content)
    }
  }, [enabled, loading, messages])

  // Speak tutor response when AI finishes
  useEffect(() => {
    if (!enabled) return

    const assistantCount = messages.filter((m) => m.role === 'assistant' && m.content).length
    const justFinished = prevLoadingRef.current && !loading

    prevLoadingRef.current = loading

    if (!justFinished || assistantCount <= handledResponseCountRef.current) return

    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && m.content)
    if (!lastAssistant?.content || lastAssistant.isStreaming) return

    handledResponseCountRef.current = assistantCount
    setTutorResponseText(lastAssistant.content)

    if (ttsEnabled) {
      setPhase('speaking')
      speakText(lastAssistant.content, {
        onEnd: () => {
          if (!enabledRef.current) return
          setPhase('ready')
          startListeningRef.current()
        },
      })
    } else {
      setPhase('ready')
      startListeningRef.current()
    }
  }, [enabled, loading, messages, ttsEnabled])

  return {
    phase,
    ttsEnabled,
    tutorResponseText,
    micError,
    toggleTts,
    handlePrimaryAction,
    stopVoiceSession,
  }
}

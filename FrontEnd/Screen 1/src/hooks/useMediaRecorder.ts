import { useCallback, useEffect, useRef, useState } from 'react'

export type MicPermission = 'pending' | 'granted' | 'denied'
export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped'

const BAR_COUNT = 48
const IDLE_LEVELS = Array.from({ length: BAR_COUNT }, (_, i) => 0.08 + (i % 5) * 0.015)

export interface UseMediaRecorderOptions {
  /** MediaRecorder timeslice in ms — emits `onChunk` per slice when set */
  chunkIntervalMs?: number
  onChunk?: (blob: Blob, chunkIndex: number) => void
}

export function useMediaRecorder(options: UseMediaRecorderOptions = {}) {
  const { chunkIntervalMs = 250, onChunk } = options
  const [permission, setPermission] = useState<MicPermission>('pending')
  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [levels, setLevels] = useState<number[]>(IDLE_LEVELS)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const statusRef = useRef<RecordingStatus>('idle')
  const elapsedRef = useRef(0)
  const chunkIndexRef = useRef(0)
  const onChunkRef = useRef(onChunk)
  const isStoppingRef = useRef(false)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    elapsedRef.current = elapsedSeconds
  }, [elapsedSeconds])

  useEffect(() => {
    onChunkRef.current = onChunk
  }, [onChunk])

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopVisualization = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  const cleanupStream = useCallback(() => {
    stopTimer()
    stopVisualization()
    mediaRecorderRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close()
    }
    audioContextRef.current = null
    analyserRef.current = null
  }, [stopTimer, stopVisualization])

  useEffect(() => cleanupStream, [cleanupStream])

  const setupAnalyser = useCallback((stream: MediaStream) => {
    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.82
    source.connect(analyser)
    audioContextRef.current = audioContext
    analyserRef.current = analyser
  }, [])

  const startVisualization = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const tick = () => {
      const currentStatus = statusRef.current

      if (currentStatus === 'recording') {
        analyser.getByteFrequencyData(dataArray)
        const step = Math.max(1, Math.floor(bufferLength / BAR_COUNT))
        const nextLevels = Array.from({ length: BAR_COUNT }, (_, index) => {
          let sum = 0
          for (let i = 0; i < step; i += 1) {
            sum += dataArray[index * step + i] ?? 0
          }
          return Math.max(0.1, Math.min(1, sum / step / 180))
        })
        setLevels(nextLevels)
      } else if (currentStatus === 'paused') {
        setLevels((prev) => prev.map((value) => Math.max(0.08, value * 0.92)))
      } else if (currentStatus === 'idle') {
        setLevels(
          IDLE_LEVELS.map((base, index) => base + Math.sin(Date.now() / 900 + index) * 0.015),
        )
      }

      animationRef.current = requestAnimationFrame(tick)
    }

    stopVisualization()
    tick()
  }, [stopVisualization])

  const requestPermission = useCallback(async () => {
    setPermission('pending')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setupAnalyser(stream)
      setPermission('granted')
      startVisualization()
      return true
    } catch {
      setPermission('denied')
      return false
    }
  }, [setupAnalyser, startVisualization])

  const startRecording = useCallback(() => {
    const stream = streamRef.current
    if (!stream || statusRef.current === 'recording') return

    chunksRef.current = []
    chunkIndexRef.current = 0
    isStoppingRef.current = false
    const recorder = new MediaRecorder(stream)

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
        const shouldEmit =
          onChunkRef.current &&
          (statusRef.current === 'recording' || isStoppingRef.current)
        if (shouldEmit) {
          onChunkRef.current?.(event.data, chunkIndexRef.current)
          chunkIndexRef.current += 1
        }
      }
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
      setAudioBlob(blob)
      setAudioUrl(URL.createObjectURL(blob))
      cleanupStream()
    }

    mediaRecorderRef.current = recorder
    recorder.start(chunkIntervalMs)
    setStatus('recording')
    startVisualization()

    stopTimer()
    timerRef.current = window.setInterval(() => {
      if (statusRef.current === 'recording') {
        setElapsedSeconds((prev) => prev + 1)
      }
    }, 1000)
  }, [chunkIntervalMs, startVisualization, stopTimer])

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state !== 'recording') return
    recorder.pause()
    setStatus('paused')
  }, [])

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state !== 'paused') return
    recorder.resume()
    setStatus('recording')
  }, [])

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      isStoppingRef.current = true
      recorder.stop()
    } else {
      cleanupStream()
    }
    stopTimer()
    setStatus('stopped')
  }, [cleanupStream, stopTimer])

  const reset = useCallback(() => {
    if (audioUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setElapsedSeconds(0)
    setStatus('idle')
    setLevels(IDLE_LEVELS)
    cleanupStream()
    setPermission('pending')
  }, [audioUrl, cleanupStream])

  const getAnalyser = useCallback(() => analyserRef.current, [])

  return {
    permission,
    status,
    elapsedSeconds,
    audioBlob,
    audioUrl,
    levels,
    getAnalyser,
    requestPermission,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    reset,
  }
}

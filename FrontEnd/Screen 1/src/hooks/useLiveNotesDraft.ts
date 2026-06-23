import { useEffect, useRef, useState } from 'react'
import {
  generateLiveNotesDraft,
  type LiveNotesDraft,
} from '@/services/liveNotesService'

type DraftStatus = 'idle' | 'waiting' | 'generating' | 'ready' | 'error'

const MIN_TRANSCRIPT_CHARS = 180
const MIN_NEW_CHARS = 260
const DEBOUNCE_MS = 1800

const EMPTY_DRAFT: LiveNotesDraft = {
  summary: '',
  keyPoints: [],
  concepts: [],
}

export function useLiveNotesDraft(transcript: string, active: boolean) {
  const [draft, setDraft] = useState<LiveNotesDraft>(EMPTY_DRAFT)
  const [status, setStatus] = useState<DraftStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const lastGeneratedLengthRef = useRef(0)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const trimmed = transcript.trim()

    if (!active) {
      if (!trimmed) setStatus('idle')
      return
    }

    if (trimmed.length < MIN_TRANSCRIPT_CHARS) {
      setStatus('waiting')
      return
    }

    if (trimmed.length - lastGeneratedLengthRef.current < MIN_NEW_CHARS) {
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setStatus((current) => (current === 'ready' ? 'ready' : 'generating'))
    setError(null)

    const timeout = window.setTimeout(() => {
      setStatus('generating')
      void generateLiveNotesDraft(trimmed)
        .then((nextDraft) => {
          if (requestIdRef.current !== requestId) return
          lastGeneratedLengthRef.current = trimmed.length
          setDraft(nextDraft)
          setStatus('ready')
        })
        .catch((err) => {
          if (requestIdRef.current !== requestId) return
          setError(err instanceof Error ? err.message : 'Could not update live notes.')
          setStatus('error')
        })
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timeout)
  }, [active, transcript])

  const reset = () => {
    requestIdRef.current += 1
    lastGeneratedLengthRef.current = 0
    setDraft(EMPTY_DRAFT)
    setStatus('idle')
    setError(null)
  }

  return { draft, status, error, reset }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { useToast } from '@/components/ui/ToastProvider'
import {
  AI_UNAVAILABLE_MESSAGE,
  generateStructuredNotes,
  isAiGenerationConfigured,
} from '@/services/aiGenerationService'
import {
  createNotes,
  getNotesByLectureId,
  saveNotesContent,
  updateNotes,
} from '@/services/notesService'
import { getLectureProcessingStatus } from '@/services/processingService'
import { getTranscriptByLectureId } from '@/services/transcriptionService'
import type { LectureNotes } from '@/types/notes'
import { useProcessingPoll } from '@/hooks/useProcessingPoll'

export type NotesPhase =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'extracting'
  | 'generating'
  | 'completed'
  | 'failed'

interface UseLectureNotesOptions {
  autoGenerate?: boolean
  isPdf?: boolean
  pdfUrl?: string
  pdfFile?: File
  pageCount?: number | null
}

interface UseLectureNotesResult {
  notes: LectureNotes | null
  transcriptText: string | null
  phase: NotesPhase
  isLoading: boolean
  isGenerating: boolean
  isExtracting: boolean
  error: string | null
  canGenerate: boolean
  refresh: () => Promise<void>
  generateNotes: () => Promise<void>
  retryGeneration: () => Promise<void>
}

export function useLectureNotes(
  lectureId: string | undefined,
  options: UseLectureNotesOptions = {},
): UseLectureNotesResult {
  const { user } = useAuthContext()
  const { toast } = useToast()
  const { autoGenerate = true, isPdf = false } = options

  const [notes, setNotes] = useState<LectureNotes | null>(null)
  const [transcriptText, setTranscriptText] = useState<string | null>(null)
  const [phase, setPhase] = useState<NotesPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isBackgroundProcessing, setIsBackgroundProcessing] = useState(false)

  const generatingRef = useRef(false)
  const autoStartedRef = useRef(false)

  const canGenerate =
    isAiGenerationConfigured() && Boolean(transcriptText?.trim())

  const ensureSourceText = useCallback(async (): Promise<string | null> => {
    if (!user || !lectureId) return null

    const transcript = await getTranscriptByLectureId(user.uid, lectureId)
    if (transcript?.text?.trim()) {
      return transcript.text.trim()
    }

    return null
  }, [lectureId, user])

  const refresh = useCallback(async () => {
    if (!user || !lectureId) {
      setNotes(null)
      setTranscriptText(null)
      setPhase('idle')
      return
    }

    setPhase('loading')
    setError(null)

    try {
      const [existingNotes, sourceText, processingStatus] = await Promise.all([
        getNotesByLectureId(user.uid, lectureId),
        ensureSourceText(),
        getLectureProcessingStatus(user.uid, lectureId),
      ])

      setTranscriptText(sourceText)
      setNotes(existingNotes)
      setIsBackgroundProcessing(processingStatus.isProcessing)

      if (existingNotes?.status === 'completed') {
        setPhase('completed')
      } else if (existingNotes?.status === 'failed') {
        setPhase('failed')
        setError(existingNotes.errorMessage)
      } else if (processingStatus.isProcessing || existingNotes?.status === 'generating') {
        setPhase('generating')
      } else if (processingStatus.transcriptStatus === 'processing') {
        setPhase('extracting')
      } else {
        setPhase('ready')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load notes.'
      setError(message)
      setPhase('failed')
      toast.error(message)
    }
  }, [ensureSourceText, lectureId, toast, user])

  useEffect(() => {
    autoStartedRef.current = false
    void refresh()
  }, [refresh])

  useProcessingPoll(user?.uid, lectureId, isBackgroundProcessing, () => {
    void refresh()
  })

  const generateNotes = useCallback(async () => {
    if (!user || !lectureId) return
    if (generatingRef.current) return

    let text = transcriptText?.trim()
    if (!text) {
      text = (await ensureSourceText()) ?? undefined
      if (text) setTranscriptText(text)
    }

    if (!text) {
      toast.error(
        isPdf
          ? 'Could not extract text from this PDF.'
          : 'Lecture not ready yet. Processing will finish automatically.',
      )
      return
    }

    if (!isAiGenerationConfigured()) {
      toast.error(AI_UNAVAILABLE_MESSAGE)
      return
    }

    generatingRef.current = true
    setPhase('generating')
    setError(null)

    let notesRecord = notes

    try {
      if (!notesRecord) {
        notesRecord = await createNotes({
          lectureId,
          userId: user.uid,
          status: 'generating',
        })
      } else {
        notesRecord = await updateNotes(notesRecord.id, user.uid, {
          status: 'generating',
          errorMessage: null,
        })
      }

      setNotes(notesRecord)

      const content = await generateStructuredNotes(text)
      const saved = await saveNotesContent(notesRecord.id, user.uid, content)

      setNotes(saved)
      setPhase('completed')
      toast.success('Smart notes ready.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Notes generation failed.'

      if (notesRecord) {
        const failed = await updateNotes(notesRecord.id, user.uid, {
          status: 'failed',
          errorMessage: message,
        })
        setNotes(failed)
      }

      setError(message)
      setPhase('failed')
      toast.error('Notes generation failed. Try again.')
    } finally {
      generatingRef.current = false
    }
  }, [ensureSourceText, isPdf, lectureId, notes, toast, transcriptText, user])

  const retryGeneration = useCallback(async () => {
    autoStartedRef.current = false
    await generateNotes()
  }, [generateNotes])

  useEffect(() => {
    if (!autoGenerate || !lectureId) return
    if (autoStartedRef.current) return
    if (phase !== 'ready') return
    if (notes?.status === 'completed') return
    if (isBackgroundProcessing) return
    if (!isAiGenerationConfigured()) return
    if (!transcriptText?.trim()) return

    autoStartedRef.current = true
    void generateNotes()
  }, [
    autoGenerate,
    generateNotes,
    isBackgroundProcessing,
    lectureId,
    notes?.status,
    phase,
    transcriptText,
  ])

  return {
    notes,
    transcriptText,
    phase,
    isLoading: phase === 'loading',
    isGenerating: phase === 'generating',
    isExtracting: phase === 'extracting',
    error,
    canGenerate,
    refresh,
    generateNotes,
    retryGeneration,
  }
}

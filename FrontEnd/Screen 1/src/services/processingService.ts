import { apiFetch } from '@/lib/api'

export interface ProcessingEnqueueResult {
  status: 'processing' | 'queued'
  lectureId: string
}

export interface LectureProcessingStatus {
  lectureStatus: string
  transcriptStatus: string | null
  notesStatus: string | null
  isProcessing: boolean
}

const POLL_INTERVAL_MS = 3000

export function isBackgroundProcessingAvailable(): boolean {
  return true
}

export async function enqueueLectureProcessing(
  lectureId: string,
  options?: { generateNotes?: boolean; forceRetranscribe?: boolean; transcriptionLanguage?: string },
): Promise<ProcessingEnqueueResult> {
  const data = await apiFetch<{ status: string; id: string }>(`/lectures/${lectureId}/process`, {
    method: 'POST',
    body: JSON.stringify({
      generateNotes: options?.generateNotes !== false,
      forceRetranscribe: options?.forceRetranscribe === true,
      transcriptionLanguage: options?.transcriptionLanguage,
    }),
  })

  return {
    status: (data?.status as ProcessingEnqueueResult['status']) ?? 'processing',
    lectureId,
  }
}

export async function getLectureProcessingStatus(
  userId: string,
  lectureId: string,
): Promise<LectureProcessingStatus> {
  const [lecture, transcript, notes] = await Promise.all([
    apiFetch<{ status: string }>(`/lectures/${lectureId}`).catch(() => ({ status: 'uploaded' })),
    apiFetch<{ status: string }>(`/transcripts/lecture/${lectureId}`).catch(() => null),
    apiFetch<{ status: string }>(`/notes/lecture/${lectureId}`).catch(() => null),
  ])

  const lectureStatus = lecture?.status ?? 'uploaded'
  const transcriptStatus = transcript?.status ?? null
  const notesStatus = notes?.status ?? null

  const isProcessing =
    lectureStatus === 'processing' ||
    transcriptStatus === 'processing' ||
    notesStatus === 'generating'

  return { lectureStatus, transcriptStatus, notesStatus, isProcessing }
}

export function pollUntilProcessingDone(
  userId: string,
  lectureId: string,
  onUpdate?: (status: LectureProcessingStatus) => void,
): () => void {
  let cancelled = false

  const tick = async () => {
    if (cancelled) return

    try {
      const status = await getLectureProcessingStatus(userId, lectureId)
      onUpdate?.(status)

      if (!status.isProcessing) {
        cancelled = true
        return
      }
    } catch {
      // keep polling on transient errors
    }

    if (!cancelled) {
      window.setTimeout(() => void tick(), POLL_INTERVAL_MS)
    }
  }

  void tick()

  return () => {
    cancelled = true
  }
}

export async function triggerLectureProcessing(
  lectureId: string,
  options?: { generateNotes?: boolean; forceRetranscribe?: boolean; transcriptionLanguage?: string },
): Promise<void> {
  try {
    await enqueueLectureProcessing(lectureId, options)
  } catch (error) {
    console.warn('Background processing enqueue failed:', error)
  }
}

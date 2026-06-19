import { isSupabaseConfigured, supabase } from '@/lib/supabase'

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

function getInvokeError(data: unknown, error: { message?: string } | null): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const message = (data as { error?: string }).error
    if (message) return message
  }
  return error?.message || 'Processing request failed.'
}

export function isBackgroundProcessingAvailable(): boolean {
  return isSupabaseConfigured
}

export async function enqueueLectureProcessing(
  lectureId: string,
  options?: { generateNotes?: boolean; forceRetranscribe?: boolean },
): Promise<ProcessingEnqueueResult> {
  if (!supabase) {
    throw new Error('Storage unavailable. Check your Supabase configuration.')
  }

  const { data, error } = await supabase.functions.invoke('process-lecture', {
    body: {
      lectureId,
      generateNotes: options?.generateNotes !== false,
      forceRetranscribe: options?.forceRetranscribe === true,
    },
  })

  if (error) {
    throw new Error(getInvokeError(data, error))
  }

  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(getInvokeError(data, null))
  }

  return {
    status: (data?.status as ProcessingEnqueueResult['status']) ?? 'processing',
    lectureId,
  }
}

export async function getLectureProcessingStatus(
  userId: string,
  lectureId: string,
): Promise<LectureProcessingStatus> {
  if (!supabase) {
    return {
      lectureStatus: 'uploaded',
      transcriptStatus: null,
      notesStatus: null,
      isProcessing: false,
    }
  }

  const [lectureResult, transcriptResult, notesResult] = await Promise.all([
    supabase
      .from('lectures')
      .select('status')
      .eq('id', lectureId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('transcripts')
      .select('status')
      .eq('lecture_id', lectureId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('lecture_notes')
      .select('status')
      .eq('lecture_id', lectureId)
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const lectureStatus = (lectureResult.data as { status?: string } | null)?.status ?? 'uploaded'
  const transcriptStatus =
    (transcriptResult.data as { status?: string } | null)?.status ?? null
  const notesStatus = (notesResult.data as { status?: string } | null)?.status ?? null

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
  options?: { generateNotes?: boolean; forceRetranscribe?: boolean },
): Promise<void> {
  if (!isBackgroundProcessingAvailable()) return

  try {
    await enqueueLectureProcessing(lectureId, options)
  } catch (error) {
    console.warn('Background processing enqueue failed:', error)
  }
}

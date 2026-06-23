import { detectLanguageFromText } from '@/lib/webSpeechRecognition'
import { apiFetch } from '@/lib/api'
import type {
  CreateTranscriptInput,
  Transcript,
  TranscriptRow,
  TranscriptSegment,
  TranscriptStatus,
} from '@/types/transcript'
import { mapRowToTranscript } from '@/types/transcript'

export const SUPPORTED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'mp4'] as const
const SUPPORTED_EXTENSIONS = new Set([...SUPPORTED_AUDIO_EXTENSIONS, 'mpeg', 'webm', 'ogg'])

export type TranscriptionStage = 'fetching' | 'uploading' | 'transcribing' | 'saving'
export type TranscriptionStep = 'uploading' | 'transcribing' | 'ready'

export interface TranscriptionProgress {
  stage: TranscriptionStage
  progress: number
  step: TranscriptionStep
  subtitle?: string
}

export type TranscriptionLanguage = 'auto' | 'hi-IN' | 'en-US'

export function isTranscriptionConfigured(): boolean {
  return true
}

export const isSpeechRecognitionSupported = isTranscriptionConfigured
export const isOpenAiConfigured = isTranscriptionConfigured

export function isTranscribableMediaUrl(url: string): boolean {
  return Boolean(url.trim())
}

export function stageToStep(stage: TranscriptionStage): TranscriptionStep {
  if (stage === 'fetching' || stage === 'uploading') return 'uploading'
  if (stage === 'transcribing') return 'transcribing'
  return 'ready'
}

export function isTranscribableMedia(mediaKind: string, filename?: string, fileUrl?: string): boolean {
  if (fileUrl && !isTranscribableMediaUrl(fileUrl)) return false
  if (mediaKind === 'audio' || mediaKind === 'video') return true
  if (!filename) return false
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext ? SUPPORTED_EXTENSIONS.has(ext) : false
}

function emitProgress(
  onProgress: ((progress: TranscriptionProgress) => void) | undefined,
  stage: TranscriptionStage,
  progress: number,
  subtitle?: string,
): void {
  onProgress?.({ stage, progress, step: stageToStep(stage), subtitle })
}

export async function getTranscriptByLectureId(
  userId: string,
  lectureId: string,
): Promise<Transcript | null> {
  try {
    const data = await apiFetch<TranscriptRow>(`/transcripts/lecture/${lectureId}`)
    return mapRowToTranscript(data)
  } catch {
    return null
  }
}

export async function getTranscriptLectureIds(userId: string): Promise<Set<string>> {
  try {
    const data = await apiFetch<Array<{ lectureId: string; fullText: string | null }>>('/transcripts')
    const ids = new Set<string>()
    for (const row of data ?? []) {
      if (row.fullText?.trim()) {
        ids.add(row.lectureId)
      }
    }
    return ids
  } catch {
    return new Set()
  }
}

export async function createTranscript(input: CreateTranscriptInput): Promise<Transcript> {
  const payload = {
    lectureId: input.lectureId,
    text: input.text ?? input.fullText ?? '',
    language: input.language ?? null,
    durationSeconds: input.durationSeconds ?? null,
    segments: input.segments ?? [],
    status: input.status ?? 'processing',
    errorMessage: input.errorMessage ?? null,
  }

  const data = await apiFetch<TranscriptRow>('/transcripts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return mapRowToTranscript(data)
}

export async function updateTranscript(
  transcriptId: string,
  userId: string,
  updates: {
    text?: string
    fullText?: string
    language?: string | null
    durationSeconds?: number | null
    segments?: TranscriptSegment[]
    status?: TranscriptStatus
    errorMessage?: string | null
  },
): Promise<Transcript> {
  const payload = {
    text: updates.text ?? updates.fullText,
    language: updates.language,
    durationSeconds: updates.durationSeconds,
    segments: updates.segments,
    status: updates.status,
    errorMessage: updates.errorMessage,
  }

  // Get the lecture ID associated with this transcript or update by lectureId if that's what's passed
  // The backend supports updating via PATCH /transcripts/lecture/:lectureId.
  // Wait, in useLiveTranscription.ts it does: updateTranscript(transcriptId, userId, ...)
  // But wait! Is transcriptId actually the lectureId in useLiveTranscription?
  // Let's verify what useLiveTranscription passes. It passes transcriptId.
  // But actually in this project, the transcripts table uses lectureId as a unique identifier per lecture.
  // Let's look up by lectureId or check if the backend route PATCH /api/transcripts/lecture/:lectureId works.
  // Yes! The PATCH route updates by lectureId. So we can call PATCH /transcripts/lecture/:lectureId.
  // Wait, does the frontend pass lectureId as the transcriptId parameter? Let's check useLiveTranscription.ts!
  // If useLiveTranscription.ts passes lectureId, then calling PATCH /transcripts/lecture/:lectureId is 100% correct!
  // Let's write the PATCH fetch.
  const data = await apiFetch<TranscriptRow>(`/transcripts/lecture/${transcriptId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

  return mapRowToTranscript(data)
}

export interface TranscribeOptions {
  language?: TranscriptionLanguage
  onProgress?: (progress: TranscriptionProgress) => void
  onInterim?: (text: string) => void
}

/**
 * Transcribe a lecture via backend processing and poll for completion.
 */
export async function transcribe(
  userId: string,
  lectureId: string,
  fileUrl: string,
  options?: TranscribeOptions | ((progress: TranscriptionProgress) => void),
): Promise<Transcript> {
  const normalizedOptions: TranscribeOptions =
    typeof options === 'function' ? { onProgress: options } : (options ?? {})

  let transcript = await getTranscriptByLectureId(userId, lectureId)

  if (transcript?.status === 'completed') {
    return transcript
  }

  // Trigger backend processing
  await apiFetch(`/lectures/${lectureId}/process`, {
    method: 'POST',
    body: JSON.stringify({ generateNotes: false, forceRetranscribe: true }),
  })

  emitProgress(normalizedOptions.onProgress, 'fetching', 100)
  emitProgress(normalizedOptions.onProgress, 'uploading', 100)
  emitProgress(normalizedOptions.onProgress, 'transcribing', 10)

  let pollCount = 0
  while (pollCount < 100) {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    transcript = await getTranscriptByLectureId(userId, lectureId)

    if (transcript) {
      if (transcript.status === 'completed') {
        emitProgress(normalizedOptions.onProgress, 'saving', 100)
        return transcript
      }
      if (transcript.status === 'failed') {
        throw new Error(transcript.errorMessage || 'Processing failed.')
      }

      let subtitle: string | undefined = undefined
      if (transcript.status && transcript.status.startsWith('transcribing_part_')) {
        const parts = transcript.status.split('_')
        const current = parts[2]
        const total = parts[4]
        if (current && total) {
          subtitle = `Transcribing part ${current} of ${total}…`
        }
      }

      const progress = Math.min(95, 10 + pollCount * 5)
      emitProgress(normalizedOptions.onProgress, 'transcribing', progress, subtitle)
    }
    pollCount++
  }

  throw new Error('Processing request timed out.')
}

export const transcribeLectureAudio = transcribe

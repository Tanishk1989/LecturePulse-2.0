import { supabase } from '@/lib/supabase'
import { detectLanguageFromText } from '@/lib/webSpeechRecognition'
import { AI_UNAVAILABLE_MESSAGE } from '@/lib/groqProxy'
import { isYouTubeAudioUrl, isWhisperConfigured, transcribeWithWhisper, transcribeYouTubeWithWhisper } from '@/lib/whisperTranscription'
import { updateLecture } from '@/services/lectureService'
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
}

export type TranscriptionLanguage = 'auto' | 'hi-IN' | 'en-US'

export function isTranscriptionConfigured(): boolean {
  return isWhisperConfigured()
}

/** @deprecated Use `isTranscriptionConfigured` */
export const isSpeechRecognitionSupported = isTranscriptionConfigured

/** @deprecated Use `isTranscriptionConfigured` */
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
): void {
  onProgress?.({ stage, progress, step: stageToStep(stage) })
}

export async function getTranscriptByLectureId(
  userId: string,
  lectureId: string,
): Promise<Transcript | null> {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .eq('lecture_id', lectureId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'Failed to load transcript.')
  }

  if (!data) return null
  return mapRowToTranscript(data as TranscriptRow)
}

export async function getTranscriptLectureIds(userId: string): Promise<Set<string>> {
  if (!supabase) return new Set()

  const { data, error } = await supabase
    .from('transcripts')
    .select('lecture_id, full_text')
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message || 'Failed to load transcripts.')
  }

  const ids = new Set<string>()
  for (const row of data ?? []) {
    const text = (row as { lecture_id: string; full_text: string | null }).full_text
    if (text?.trim()) {
      ids.add((row as { lecture_id: string }).lecture_id)
    }
  }
  return ids
}

export async function createTranscript(input: CreateTranscriptInput): Promise<Transcript> {
  if (!supabase) {
    throw new Error('Storage unavailable. Check your Supabase configuration.')
  }

  const payload = {
    lecture_id: input.lectureId,
    user_id: input.userId,
    full_text: input.text ?? input.fullText ?? '',
    language: input.language ?? null,
    duration_seconds: input.durationSeconds ?? null,
    segments: input.segments ?? [],
    status: input.status ?? 'processing',
    error_message: input.errorMessage ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('transcripts')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to create transcript record.')
  }

  return mapRowToTranscript(data as TranscriptRow)
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
  if (!supabase) {
    throw new Error('Storage unavailable. Check your Supabase configuration.')
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  const textValue = updates.text ?? updates.fullText
  if (textValue !== undefined) payload.full_text = textValue
  if (updates.language !== undefined) payload.language = updates.language
  if (updates.durationSeconds !== undefined) payload.duration_seconds = updates.durationSeconds
  if (updates.segments !== undefined) payload.segments = updates.segments
  if (updates.status !== undefined) payload.status = updates.status
  if (updates.errorMessage !== undefined) payload.error_message = updates.errorMessage

  const { data, error } = await supabase
    .from('transcripts')
    .update(payload)
    .eq('id', transcriptId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to update transcript.')
  }

  return mapRowToTranscript(data as TranscriptRow)
}

export interface TranscribeOptions {
  language?: TranscriptionLanguage
  onProgress?: (progress: TranscriptionProgress) => void
  onInterim?: (text: string) => void
}

/**
 * Transcribe a lecture via Groq Whisper and persist in Supabase.
 */
export async function transcribe(
  userId: string,
  lectureId: string,
  fileUrl: string,
  options?: TranscribeOptions | ((progress: TranscriptionProgress) => void),
): Promise<Transcript> {
  const normalizedOptions: TranscribeOptions =
    typeof options === 'function' ? { onProgress: options } : (options ?? {})

  if (!isTranscriptionConfigured()) {
    throw new Error(AI_UNAVAILABLE_MESSAGE)
  }

  if (!supabase) {
    throw new Error('Storage unavailable. Check your Supabase configuration.')
  }

  let transcript = await getTranscriptByLectureId(userId, lectureId)

  if (transcript?.status === 'completed') {
    return transcript
  }

  if (!transcript) {
    transcript = await createTranscript({
      lectureId,
      userId,
      status: 'processing',
    })
  } else {
    transcript = await updateTranscript(transcript.id, userId, {
      status: 'processing',
      errorMessage: null,
    })
  }

  await updateLecture(userId, lectureId, { status: 'processing' })

  try {
    emitProgress(normalizedOptions.onProgress, 'fetching', 0)
    emitProgress(normalizedOptions.onProgress, 'fetching', 100)
    emitProgress(normalizedOptions.onProgress, 'uploading', 0)
    emitProgress(normalizedOptions.onProgress, 'uploading', 100)
    emitProgress(normalizedOptions.onProgress, 'transcribing', 0)

    const transcribeFn = isYouTubeAudioUrl(fileUrl)
      ? transcribeYouTubeWithWhisper
      : transcribeWithWhisper

    const result = await transcribeFn(fileUrl, {
      language: normalizedOptions.language ?? 'auto',
      onProgress: (whisperProgress) => {
        emitProgress(normalizedOptions.onProgress, 'transcribing', whisperProgress)
      },
    })

    emitProgress(normalizedOptions.onProgress, 'saving', 50)

    const detectedLanguage = detectLanguageFromText(result.text)
    const saved = await updateTranscript(transcript.id, userId, {
      text: result.text.trim(),
      language: detectedLanguage === 'Detecting…' ? result.language : detectedLanguage,
      durationSeconds: result.duration,
      segments: result.segments,
      status: 'completed',
      errorMessage: null,
    })

    await updateLecture(userId, lectureId, { status: 'completed' })
    emitProgress(normalizedOptions.onProgress, 'saving', 100)

    return saved
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transcription failed.'
    const failed = await updateTranscript(transcript.id, userId, {
      status: 'failed',
      errorMessage: message,
    })
    await updateLecture(userId, lectureId, { status: 'failed' })
    throw Object.assign(new Error(message), { transcript: failed })
  }
}

/** @deprecated Use `transcribe` instead */
export const transcribeLectureAudio = transcribe

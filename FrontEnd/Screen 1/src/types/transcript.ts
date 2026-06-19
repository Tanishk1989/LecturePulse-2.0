export type TranscriptStatus = 'processing' | 'completed' | 'failed'

export interface TranscriptSegment {
  id: number
  start: number
  end: number
  text: string
}

export interface TranscriptRow {
  id: string
  lecture_id: string
  user_id: string
  full_text: string
  language: string | null
  duration_seconds: number | null
  segments: TranscriptSegment[]
  status: TranscriptStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface Transcript {
  id: string
  lectureId: string
  userId: string
  /** Transcript body — maps to `full_text` in Supabase */
  text: string
  /** @deprecated Use `text` */
  fullText: string
  language: string | null
  durationSeconds: number | null
  segments: TranscriptSegment[]
  status: TranscriptStatus
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTranscriptInput {
  lectureId: string
  userId: string
  text?: string
  fullText?: string
  language?: string | null
  durationSeconds?: number | null
  segments?: TranscriptSegment[]
  status?: TranscriptStatus
  errorMessage?: string | null
}

export function mapRowToTranscript(row: TranscriptRow): Transcript {
  return {
    id: row.id,
    lectureId: row.lecture_id,
    userId: row.user_id,
    text: row.full_text,
    fullText: row.full_text,
    language: row.language,
    durationSeconds: row.duration_seconds,
    segments: Array.isArray(row.segments) ? row.segments : [],
    status: row.status as TranscriptStatus,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

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
  const record = row as TranscriptRow & {
    lectureId?: string
    userId?: string
    fullText?: string
    durationSeconds?: number | null
    errorMessage?: string | null
    createdAt?: string
    updatedAt?: string
  }

  const text = row.full_text ?? record.fullText ?? ''

  return {
    id: row.id,
    lectureId: row.lecture_id ?? record.lectureId ?? '',
    userId: row.user_id ?? record.userId ?? '',
    text,
    fullText: text,
    language: row.language,
    durationSeconds: row.duration_seconds ?? record.durationSeconds ?? null,
    segments: Array.isArray(row.segments) ? row.segments : [],
    status: row.status as TranscriptStatus,
    errorMessage: row.error_message ?? record.errorMessage ?? null,
    createdAt: row.created_at ?? record.createdAt ?? '',
    updatedAt: row.updated_at ?? record.updatedAt ?? '',
  }
}

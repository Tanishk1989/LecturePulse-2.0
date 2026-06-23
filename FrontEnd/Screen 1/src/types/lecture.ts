export type LectureSource = 'record' | 'upload' | 'youtube' | 'pdf'

export type LectureStatus = 'uploaded' | 'processing' | 'completed' | 'failed'

export type LectureMediaKind = 'audio' | 'video' | 'pdf'

export type LectureDbType = 'audio' | 'video' | 'pdf'

export interface LectureRow {
  id: string
  user_id: string
  title: string
  file_type: LectureDbType
  file_url: string
  duration: number | null
  status: LectureStatus
  favorite: boolean
  created_at: string
  source?: LectureSource
  subject?: string | null
}

export interface LectureRecording {
  id: string
  title: string
  createdAt: string
  duration: number | null
  audioUrl: string
  source: LectureSource
  status: LectureStatus
  mediaKind: LectureMediaKind
  mimeType?: string
  fileSize?: number
  pageCount?: number | null
  originalFilename?: string
  favorite: boolean
  thumbnail?: string | null
  subject?: string | null
}

export interface CreateLectureInput {
  id?: string
  userId: string
  title: string
  fileType: LectureDbType
  fileUrl: string
  duration: number | null
  status?: LectureStatus
  source?: LectureSource
  mimeType?: string
  fileSize?: number
  pageCount?: number | null
  originalFilename?: string
  subject?: string | null
}

export interface UploadLectureInput {
  userId: string
  title: string
  duration: number
  file: File | Blob
  mediaKind: LectureMediaKind
  source?: LectureSource
  pageCount?: number | null
  originalFilename?: string
  mimeType?: string
  subject?: string
}

export type LectureFilter =
  | 'all'
  | 'audio'
  | 'video'
  | 'pdf'
  | 'recorded'
  | 'uploaded'
  | 'favorites'

export type LectureSort = 'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'duration'

export function mapRowToLecture(row: LectureRow): LectureRecording {
  const record = row as LectureRow & {
    createdAt?: string
    fileUrl?: string
    fileType?: LectureDbType
  }

  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at ?? record.createdAt ?? '',
    duration: row.duration,
    audioUrl: row.file_url ?? record.fileUrl ?? '',
    source: row.source ?? 'upload',
    status: row.status,
    mediaKind: row.file_type ?? record.fileType ?? 'audio',
    favorite: row.favorite ?? false,
    subject: row.subject ?? null,
  }
}

import {
  getPublicStorageUrl,
  getStorageBucketForMediaKind,
  uploadFileWithProgress,
} from '@/lib/storageUpload'
import type {
  CreateLectureInput,
  LectureRecording,
  LectureRow,
  UploadLectureInput,
} from '@/types/lecture'
import { mapRowToLecture } from '@/types/lecture'
import { extractAudioToWav } from '@/lib/uploadUtils'
import { apiFetch } from '@/lib/api'

function getExtension(mediaKind: string, mimeType?: string, filename?: string): string {
  if (filename?.includes('.')) {
    return filename.split('.').pop()?.toLowerCase() ?? mediaKind
  }
  if (mimeType?.includes('/')) {
    const ext = mimeType.split('/')[1]?.split(';')[0]
    if (ext) return ext === 'mpeg' ? 'mp3' : ext
  }
  if (mediaKind === 'pdf') return 'pdf'
  if (mediaKind === 'video') return 'mp4'
  if (mediaKind === 'audio') return 'webm'
  return 'bin'
}

export function isStorageConfigured(): boolean {
  return true
}

export async function uploadLecture(
  input: UploadLectureInput,
  onProgress?: (percent: number) => void,
): Promise<LectureRecording> {
  const lectureId = crypto.randomUUID()
  let fileToUpload = input.file
  let mediaKind = input.mediaKind
  let mimeType = input.mimeType ?? (input.file instanceof File ? input.file.type : undefined)
  let ext = getExtension(
    mediaKind,
    mimeType,
    input.originalFilename ?? (input.file instanceof File ? input.file.name : undefined),
  )

  if (mediaKind === 'audio' || mediaKind === 'video') {
    try {
      const audioBlob = await extractAudioToWav(input.file)
      fileToUpload = new File([audioBlob], 'audio.wav', { type: 'audio/wav' })
      mediaKind = 'audio'
      mimeType = 'audio/wav'
      ext = 'wav'
    } catch (e) {
      console.warn('Client-side audio extraction failed, uploading original file:', e)
    }
  }

  const bucket = getStorageBucketForMediaKind(mediaKind)
  const storagePath = `${input.userId}/${lectureId}.${ext}`
  const contentType = mimeType ?? undefined

  try {
    await uploadFileWithProgress(bucket, storagePath, fileToUpload, contentType, onProgress)
  } catch (error) {
    throw error instanceof Error ? error : new Error('Upload failed.')
  }

  const fileUrl = await getPublicStorageUrl(bucket, storagePath)

  return createLecture({
    id: lectureId,
    userId: input.userId,
    title: input.title,
    fileType: mediaKind,
    fileUrl,
    duration: input.duration > 0 ? input.duration : null,
    status: 'uploaded',
    source: input.source ?? 'upload',
    mimeType: contentType,
    fileSize: fileToUpload.size,
    pageCount: input.pageCount,
    originalFilename:
      input.originalFilename ?? (input.file instanceof File ? input.file.name : undefined),
    subject: input.subject,
  })
}

export async function importYouTubeLecture(input: {
  userId: string
  url: string
  title: string
  duration?: number | null
  thumbnail?: string | null
  subject?: string
}): Promise<LectureRecording> {
  return createLecture({
    userId: input.userId,
    title: input.title,
    fileType: 'video',
    fileUrl: input.url,
    duration: input.duration ?? null,
    status: 'uploaded',
    source: 'youtube',
    subject: input.subject,
  }).then((lecture) => ({
    ...lecture,
    thumbnail: input.thumbnail ?? null,
  }))
}

export async function createLecture(input: CreateLectureInput): Promise<LectureRecording> {
  const payload = {
    id: input.id,
    title: input.title,
    fileType: input.fileType,
    fileUrl: input.fileUrl,
    duration: input.duration,
    source: input.source ?? 'upload',
    subject: input.subject,
  }

  const data = await apiFetch<LectureRow>('/lectures', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  const lecture = mapRowToLecture(data)

  return {
    ...lecture,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    pageCount: input.pageCount,
    originalFilename: input.originalFilename,
  }
}

export async function getUserLectures(userId: string): Promise<LectureRecording[]> {
  const data = await apiFetch<LectureRow[]>('/lectures')
  return data.map(mapRowToLecture)
}

export async function deleteLecture(userId: string, lectureId: string): Promise<void> {
  await apiFetch<void>(`/lectures/${lectureId}`, {
    method: 'DELETE',
  })
}

export async function toggleFavorite(
  userId: string,
  lectureId: string,
  favorite: boolean,
): Promise<LectureRecording> {
  const data = await apiFetch<LectureRow>(`/lectures/${lectureId}`, {
    method: 'PATCH',
    body: JSON.stringify({ favorite }),
  })
  return mapRowToLecture(data)
}

export async function updateLecture(
  userId: string,
  lectureId: string,
  updates: { title?: string; status?: LectureRow['status']; subject?: string | null; tags?: string[] },
): Promise<LectureRecording> {
  const data = await apiFetch<LectureRow>(`/lectures/${lectureId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
  return mapRowToLecture(data)
}

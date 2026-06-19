import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import {
  extractStoragePathFromUrl,
  getPublicStorageUrl,
  getStorageBucketForMediaKind,
  removeStorageObject,
  uploadFileWithProgress,
} from '@/lib/storageUpload'
import type {
  CreateLectureInput,
  LectureRecording,
  LectureRow,
  UploadLectureInput,
} from '@/types/lecture'
import { mapRowToLecture } from '@/types/lecture'

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
  return isSupabaseConfigured
}

export async function uploadLecture(
  input: UploadLectureInput,
  onProgress?: (percent: number) => void,
): Promise<LectureRecording> {
  if (!supabase) {
    throw new Error('Storage unavailable. Check your Supabase configuration.')
  }

  const lectureId = crypto.randomUUID()
  const ext = getExtension(
    input.mediaKind,
    input.mimeType ?? (input.file instanceof File ? input.file.type : undefined),
    input.originalFilename ?? (input.file instanceof File ? input.file.name : undefined),
  )
  const bucket = getStorageBucketForMediaKind(input.mediaKind)
  const storagePath = `${input.userId}/${lectureId}.${ext}`
  const contentType =
    input.mimeType ??
    (input.file instanceof File ? input.file.type : undefined) ??
    undefined

  try {
    await uploadFileWithProgress(bucket, storagePath, input.file, contentType, onProgress)
  } catch (error) {
    await removeStorageObject(bucket, storagePath).catch(() => undefined)
    throw error instanceof Error ? error : new Error('Upload failed.')
  }

  const fileUrl = getPublicStorageUrl(bucket, storagePath)

  return createLecture({
    id: lectureId,
    userId: input.userId,
    title: input.title,
    fileType: input.mediaKind,
    fileUrl,
    duration: input.duration > 0 ? input.duration : null,
    status: 'uploaded',
    source: input.source ?? 'upload',
    mimeType: contentType,
    fileSize: input.file.size,
    pageCount: input.pageCount,
    originalFilename:
      input.originalFilename ?? (input.file instanceof File ? input.file.name : undefined),
  })
}

export async function importYouTubeLecture(input: {
  userId: string
  url: string
  title: string
  duration?: number | null
  thumbnail?: string | null
}): Promise<LectureRecording> {
  return createLecture({
    userId: input.userId,
    title: input.title,
    fileType: 'video',
    fileUrl: input.url,
    duration: input.duration ?? null,
    status: 'uploaded',
    source: 'youtube',
  }).then((lecture) => ({
    ...lecture,
    thumbnail: input.thumbnail ?? null,
  }))
}

export async function createLecture(input: CreateLectureInput): Promise<LectureRecording> {
  if (!supabase) {
    throw new Error('Storage unavailable. Check your Supabase configuration.')
  }

  const payload = {
    ...(input.id ? { id: input.id } : {}),
    user_id: input.userId,
    title: input.title,
    file_type: input.fileType,
    file_url: input.fileUrl,
    duration: input.duration,
    status: input.status ?? 'uploaded',
    favorite: false,
    source: input.source ?? 'upload',
  }

  const { data, error } = await supabase.from('lectures').insert(payload).select('*').single()

  if (error) {
    throw new Error(error.message || 'Failed to save lecture metadata.')
  }

  const lecture = mapRowToLecture(data as LectureRow)

  return {
    ...lecture,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    pageCount: input.pageCount,
    originalFilename: input.originalFilename,
  }
}

export async function getUserLectures(userId: string): Promise<LectureRecording[]> {
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to load lectures.')
  }

  return (data as LectureRow[]).map(mapRowToLecture)
}

export async function deleteLecture(userId: string, lectureId: string): Promise<void> {
  if (!supabase) {
    return
  }

  const { data: lecture, error: fetchError } = await supabase
    .from('lectures')
    .select('file_url')
    .eq('id', lectureId)
    .eq('user_id', userId)
    .single()

  if (fetchError) {
    throw new Error(fetchError.message || 'Failed to delete lecture.')
  }

  const fileUrl = (lecture as { file_url: string }).file_url
  const storageLocation = extractStoragePathFromUrl(fileUrl)

  if (storageLocation) {
    await removeStorageObject(storageLocation.bucket, storageLocation.path)
  }

  const { error } = await supabase
    .from('lectures')
    .delete()
    .eq('id', lectureId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message || 'Failed to delete lecture.')
  }
}

export async function toggleFavorite(
  userId: string,
  lectureId: string,
  favorite: boolean,
): Promise<LectureRecording> {
  if (!supabase) {
    throw new Error('Storage unavailable. Check your Supabase configuration.')
  }

  const { data, error } = await supabase
    .from('lectures')
    .update({ favorite })
    .eq('id', lectureId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to update favorite.')
  }

  return mapRowToLecture(data as LectureRow)
}

export async function updateLecture(
  userId: string,
  lectureId: string,
  updates: { title?: string; status?: LectureRow['status'] },
): Promise<LectureRecording> {
  if (!supabase) {
    throw new Error('Storage unavailable. Check your Supabase configuration.')
  }

  const payload: Record<string, string> = {}
  if (updates.title !== undefined) payload.title = updates.title.trim()
  if (updates.status !== undefined) payload.status = updates.status

  const { data, error } = await supabase
    .from('lectures')
    .update(payload)
    .eq('id', lectureId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to update lecture.')
  }

  return mapRowToLecture(data as LectureRow)
}

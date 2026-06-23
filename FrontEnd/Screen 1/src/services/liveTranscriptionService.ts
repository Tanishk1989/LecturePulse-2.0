import { invokeTranscribeAudio } from '@/lib/groqProxy'
import {
  LECTURES_BUCKET,
  getPublicStorageUrl,
  removeStorageObject,
  uploadFileWithProgress,
} from '@/lib/storageUpload'

export interface LiveChunkTranscription {
  text: string
  language: string | null
  duration: number | null
}

function getChunkExtension(mimeType: string | undefined): string {
  if (!mimeType) return 'webm'
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('mpeg')) return 'mp3'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('wav')) return 'wav'
  return 'webm'
}

export async function transcribeLiveAudioChunk(input: {
  userId: string
  sessionId: string
  chunkIndex: number
  blob: Blob
  language?: string
}): Promise<LiveChunkTranscription | null> {
  const ext = getChunkExtension(input.blob.type)
  const path = `${input.userId}/live/${input.sessionId}/chunk-${String(input.chunkIndex).padStart(4, '0')}.${ext}`

  await uploadFileWithProgress(LECTURES_BUCKET, path, input.blob, input.blob.type)

  try {
    const audioUrl = await getPublicStorageUrl(LECTURES_BUCKET, path)
    const data = await invokeTranscribeAudio(audioUrl, input.language)
    const payload = data as {
      text?: string
      language?: string
      duration?: number
    }
    const text = payload.text?.trim()
    if (!text) return null

    return {
      text,
      language: payload.language ?? null,
      duration: typeof payload.duration === 'number' ? payload.duration : null,
    }
  } finally {
    void removeStorageObject(LECTURES_BUCKET, path).catch(() => undefined)
  }
}

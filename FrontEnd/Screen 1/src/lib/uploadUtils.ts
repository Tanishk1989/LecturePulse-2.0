export const ACCEPTED_UPLOAD_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4', '.pdf'] as const

export const ACCEPTED_UPLOAD_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'video/mp4',
  'application/pdf',
] as const

const EXTENSION_KIND: Record<string, 'audio' | 'video' | 'pdf'> = {
  '.mp3': 'audio',
  '.wav': 'audio',
  '.m4a': 'audio',
  '.mp4': 'video',
  '.pdf': 'pdf',
}

export function getFileExtension(name: string): string {
  const index = name.lastIndexOf('.')
  return index >= 0 ? name.slice(index).toLowerCase() : ''
}

export function getMediaKind(file: File): 'audio' | 'video' | 'pdf' | null {
  const extension = getFileExtension(file.name)
  if (extension in EXTENSION_KIND) {
    return EXTENSION_KIND[extension]
  }

  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type === 'application/pdf') return 'pdf'
  return null
}

export function isAcceptedUploadFile(file: File): boolean {
  const kind = getMediaKind(file)
  return kind !== null
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getMediaDuration(file: File): Promise<number> {
  const kind = getMediaKind(file)
  if (kind !== 'audio' && kind !== 'video') {
    return Promise.resolve(0)
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const element = document.createElement(kind === 'video' ? 'video' : 'audio')
    element.preload = 'metadata'

    const finish = (duration: number) => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(duration) ? Math.floor(duration) : 0)
    }

    element.onloadedmetadata = () => finish(element.duration)
    element.onerror = () => finish(0)
    element.src = url
  })
}

export async function getPdfPageCount(file: File): Promise<number | null> {
  try {
    const tail = await file.slice(Math.max(0, file.size - 65536)).arrayBuffer()
    const text = new TextDecoder('latin1').decode(tail)
    const matches = [...text.matchAll(/\/Count\s+(\d+)/g)]
    if (matches.length === 0) return null
    const last = matches[matches.length - 1]
    return last ? parseInt(last[1], 10) : null
  } catch {
    return null
  }
}

export async function analyzeUploadFile(file: File) {
  const mediaKind = getMediaKind(file)
  if (!mediaKind) {
    throw new Error('Unsupported file type')
  }

  const [duration, pageCount] = await Promise.all([
    getMediaDuration(file),
    mediaKind === 'pdf' ? getPdfPageCount(file) : Promise.resolve(null),
  ])

  return {
    mediaKind,
    duration,
    pageCount,
    fileSize: file.size,
    mimeType: file.type || undefined,
    originalFilename: file.name,
  }
}

export function deriveLectureTitle(filename: string): string {
  const baseName = filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  return baseName ? `🎙 ${baseName}` : '🎙 Uploaded Lecture'
}

export const UPLOAD_ACCEPT_STRING = ACCEPTED_UPLOAD_EXTENSIONS.join(',')

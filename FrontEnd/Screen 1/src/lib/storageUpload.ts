import { BACKEND_ORIGIN, BACKEND_URL, getAuthToken } from '@/lib/api'

export const LECTURES_BUCKET = 'lectures'
export const DOCUMENTS_BUCKET = 'documents'

export function getStorageBucketForMediaKind(mediaKind: 'audio' | 'video' | 'pdf'): string {
  return mediaKind === 'pdf' ? DOCUMENTS_BUCKET : LECTURES_BUCKET
}

export async function getPublicStorageUrl(bucket: string, relativePath: string): Promise<string> {
  return `${BACKEND_ORIGIN}/uploads/${bucket}/${relativePath}`
}

export function extractStoragePathFromUrl(fileUrl: string): {
  bucket: string
  path: string
} | null {
  try {
    const url = new URL(fileUrl)
    const marker = '/uploads/'
    const markerIndex = url.pathname.indexOf(marker)
    if (markerIndex === -1) return null

    const remainder = url.pathname.slice(markerIndex + marker.length)
    const firstSlash = remainder.indexOf('/')
    if (firstSlash === -1) return null

    return {
      bucket: remainder.slice(0, firstSlash),
      path: remainder.slice(firstSlash + 1),
    }
  } catch {
    return null
  }
}

export async function uploadFileWithProgress(
  bucket: string,
  relativePath: string,
  file: Blob,
  _contentType: string | undefined,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const token = await getAuthToken()
  if (!token) {
    throw new Error('Sign in to upload files.')
  }

  const formData = new FormData()
  formData.append('category', bucket)
  formData.append('relativePath', relativePath)
  formData.append('file', file, relativePath.split('/').pop() ?? 'upload.bin')

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BACKEND_URL}/uploads`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve()
        return
      }

      let message = `Upload failed (${xhr.status}).`
      try {
        const payload = JSON.parse(xhr.responseText) as { error?: string }
        if (payload.error) message = payload.error
      } catch {
        // ignored
      }
      reject(new Error(message))
    }

    xhr.onerror = () => reject(new Error('Upload failed.'))
    xhr.send(formData)
  })
}

export async function removeStorageObject(bucket: string, relativePath: string): Promise<void> {
  const token = await getAuthToken()
  if (!token) return

  await fetch(`${BACKEND_URL}/uploads`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      category: bucket,
      relativePath,
    }),
  }).catch((error) => {
    console.warn('Local upload deletion failed:', error)
  })
}

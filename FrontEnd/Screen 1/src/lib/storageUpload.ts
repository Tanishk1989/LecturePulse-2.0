import {
  DOCUMENTS_BUCKET,
  LECTURES_BUCKET,
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseUrl,
} from '@/lib/supabase'

export function getStorageBucketForMediaKind(mediaKind: 'audio' | 'video' | 'pdf'): string {
  return mediaKind === 'pdf' ? DOCUMENTS_BUCKET : LECTURES_BUCKET
}

export function getPublicStorageUrl(bucket: string, path: string): string {
  if (!supabaseUrl) return ''
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}

export function extractStoragePathFromUrl(fileUrl: string): { bucket: string; path: string } | null {
  try {
    const url = new URL(fileUrl)
    for (const bucket of [LECTURES_BUCKET, DOCUMENTS_BUCKET]) {
      const marker = `/storage/v1/object/public/${bucket}/`
      const index = url.pathname.indexOf(marker)
      if (index !== -1) {
        return {
          bucket,
          path: decodeURIComponent(url.pathname.slice(index + marker.length)),
        }
      }
    }
    return null
  } catch {
    return null
  }
}

export async function uploadFileWithProgress(
  bucket: string,
  path: string,
  file: Blob,
  contentType: string | undefined,
  onProgress?: (percent: number) => void,
): Promise<void> {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) {
    throw new Error('Storage unavailable. Check your Supabase configuration.')
  }

  const baseUrl = supabaseUrl
  const apiKey = supabaseAnonKey

  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  const url = `${baseUrl}/storage/v1/object/${bucket}/${encodedPath}`

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`)
    xhr.setRequestHeader('apikey', apiKey)
    xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream')
    xhr.setRequestHeader('x-upsert', 'false')

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }

      let message = 'Upload failed.'
      try {
        const payload = JSON.parse(xhr.responseText) as { message?: string; error?: string }
        message = payload.message ?? payload.error ?? message
      } catch {
        if (xhr.responseText) message = xhr.responseText
      }
      reject(new Error(message))
    }

    xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'))
    xhr.onabort = () => reject(new Error('Upload cancelled.'))
    xhr.send(file)
  })
}

export async function removeStorageObject(bucket: string, path: string): Promise<void> {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) return

  const baseUrl = supabaseUrl
  const apiKey = supabaseAnonKey

  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  const url = `${baseUrl}/storage/v1/object/${bucket}/${encodedPath}`

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      apikey: apiKey,
    },
  })

  if (!response.ok && response.status !== 404) {
    throw new Error('Failed to remove uploaded file.')
  }
}

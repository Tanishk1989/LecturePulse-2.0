import { auth } from '@/lib/firebase'
import { sanitizeApiErrorMessage } from '@/lib/apiErrors'

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api'
export const BACKEND_ORIGIN = BACKEND_URL.replace(/\/api\/?$/, '')

export class ApiError extends Error {
  code?: string
  status: number

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await auth.currentUser?.getIdToken()

  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let errMsg = `Request failed: ${response.status} ${response.statusText}`
    let errCode: string | undefined

    try {
      const errJson = await response.json()
      if (errJson && typeof errJson === 'object' && 'error' in errJson) {
        errCode = typeof errJson.code === 'string' ? errJson.code : undefined
        errMsg = sanitizeApiErrorMessage(String(errJson.error), errCode)
      }
    } catch {
      // ignored
    }

    throw new ApiError(errMsg, response.status, errCode)
  }

  return response.json() as Promise<T>
}

export async function getAuthToken(): Promise<string | null> {
  return auth.currentUser?.getIdToken() ?? null
}

export async function apiFetchStream(
  endpoint: string,
  options: RequestInit = {},
  onChunk: (text: string) => void,
): Promise<void> {
  const token = await auth.currentUser?.getIdToken()

  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let errMsg = `Request failed: ${response.status} ${response.statusText}`
    try {
      const errJson = await response.json()
      if (errJson && typeof errJson === 'object' && 'error' in errJson) {
        errMsg = String(errJson.error)
      }
    } catch {
      // ignored
    }
    throw new Error(errMsg)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('ReadableStream not supported by response.')
  }

  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      
      // Save last unfinished line back to buffer
      buffer = lines.pop() || ''

      for (const line of lines) {
        const cleaned = line.trim()
        if (!cleaned || !cleaned.startsWith('data: ')) continue

        const dataStr = cleaned.slice(6)
        if (dataStr === '[DONE]') {
          return
        }

        try {
          const parsed = JSON.parse(dataStr)
          if (parsed.error) {
            throw new Error(parsed.error)
          }
          if (parsed.text) {
            onChunk(parsed.text)
          }
        } catch (err) {
          console.error('Error parsing stream chunk:', err)
          if (err instanceof Error && err.message !== 'Unexpected end of JSON input') {
            throw err
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

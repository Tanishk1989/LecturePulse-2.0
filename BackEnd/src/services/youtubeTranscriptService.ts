import { setTimeout as delay } from 'node:timers/promises'
import { parseYouTubeVideoId } from './youtubeUtils'

export function isYouTubeTranscriptProviderConfigured(): boolean {
  return Boolean(process.env.SUPADATA_API_KEY?.trim())
}

export interface YouTubeTranscript {
  text: string
  language?: string
  duration?: number
  segments: Array<{ id: number; start: number; end: number; text: string }>
}

function providerError(status: number): Error {
  if (status === 401) return new Error('YouTube transcript service credentials need administrator attention.')
  if (status === 402 || status === 429) return new Error('YouTube transcript service quota or rate limit reached. Try again later; no paid upgrade is enabled.')
  if (status === 403 || status === 404) return new Error('This YouTube video is unavailable or restricted. Use a publicly accessible video.')
  if (status === 206) return new Error('No transcript is available for this YouTube video.')
  return new Error('YouTube transcript service could not process this video. Please try again later.')
}

export function parseYouTubeTranscript(data: any): YouTubeTranscript {
  const language = typeof data?.lang === 'string' ? data.lang.slice(0, 30) : undefined
  if (typeof data?.content === 'string' && data.content.trim()) {
    return { text: data.content.trim(), language, segments: [] }
  }
  if (!Array.isArray(data?.content) || !data.content.length || data.content.length > 50_000) {
    throw new Error('YouTube transcript service returned an empty or invalid transcript.')
  }
  const segments = data.content.map((chunk: any, id: number) => {
    if (typeof chunk?.text !== 'string' || !Number.isFinite(chunk.offset) || !Number.isFinite(chunk.duration)
      || chunk.offset < 0 || chunk.duration < 0 || chunk.offset + chunk.duration > 86_400_000) {
      throw new Error('YouTube transcript service returned invalid timestamps.')
    }
    return { id, start: chunk.offset / 1000, end: (chunk.offset + chunk.duration) / 1000, text: chunk.text.trim() }
  }).filter((chunk: { text: string }) => chunk.text)
  if (!segments.length) throw new Error('No readable speech was found in this YouTube video.')
  return { text: segments.map((chunk: { text: string }) => chunk.text).join(' '), language,
    duration: Math.max(...segments.map((chunk: { end: number }) => chunk.end)), segments }
}

/** Only validated public YouTube links go to this fixed origin; the key never enters URLs or logs. */
export async function fetchYouTubeTranscript(youtubeUrl: string, language?: string,
  options: { fetchImpl?: typeof fetch; wait?: typeof delay; timeoutMs?: number } = {}): Promise<YouTubeTranscript> {
  const videoId = parseYouTubeVideoId(youtubeUrl)
  if (!videoId) throw new Error('Invalid YouTube URL.')
  const key = process.env.SUPADATA_API_KEY?.trim()
  if (!key) throw new Error('YouTube transcript service is not configured.')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 120_000)
  const request = async (url: URL) => {
    const response = await (options.fetchImpl ?? fetch)(url, {
      headers: { 'x-api-key': key, Accept: 'application/json' }, signal: controller.signal, redirect: 'error',
    })
    if (![200, 202].includes(response.status)) throw providerError(response.status)
    if (!response.body) throw new Error('YouTube transcript service returned no data.')
    const reader = response.body.getReader()
    const parts: Uint8Array[] = []
    let bytes = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > 4 * 1024 * 1024) throw new Error('YouTube transcript exceeds the supported size limit.')
        parts.push(value)
      }
    } finally { await reader.cancel().catch(() => {}) }
    return JSON.parse(Buffer.concat(parts).toString('utf8'))
  }
  try {
    const url = new URL('https://api.supadata.ai/v1/transcript')
    url.searchParams.set('url', `https://www.youtube.com/watch?v=${videoId}`)
    url.searchParams.set('text', 'false')
    url.searchParams.set('mode', 'auto')
    if (language && language !== 'auto' && /^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(language)) url.searchParams.set('lang', language)
    let data = await request(url)
    if (data.jobId) {
      if (typeof data.jobId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(data.jobId)) throw new Error('Invalid YouTube transcript job response.')
      const jobUrl = new URL(`https://api.supadata.ai/v1/transcript/${data.jobId}`)
      do {
        await (options.wait ?? delay)(2000, undefined, { signal: controller.signal })
        data = await request(jobUrl)
        if (data.status === 'failed') throw new Error('YouTube transcript processing failed. The video may be unavailable.')
        if (!['queued', 'active', 'completed'].includes(data.status)) throw new Error('Invalid YouTube transcript job status.')
      } while (data.status !== 'completed')
      data = data.result ?? data
    }
    return parseYouTubeTranscript(data)
  } catch (error) {
    if (controller.signal.aborted) throw new Error('YouTube transcript processing timed out. Please try again later.')
    // Do not expose provider payloads, URLs, or credentials through low-level network/JSON errors.
    if (error instanceof Error && /^(YouTube |This YouTube |No transcript|Invalid YouTube|No readable)/.test(error.message)) throw error
    throw new Error('YouTube transcript service is temporarily unavailable. Please try again later.')
  } finally { clearTimeout(timer) }
}

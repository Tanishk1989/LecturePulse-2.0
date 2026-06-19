export interface YouTubeVideoMetadata {
  videoId: string
  url: string
  title: string
  authorName: string | null
  thumbnailUrl: string
}

export function parseYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return parsed.pathname.slice(1).split('/')[0] || null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v')
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.split('/')[2] || null
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.split('/')[2] || null
      }
    }
  } catch {
    return null
  }

  return null
}

export function isValidYouTubeUrl(input: string): boolean {
  return parseYouTubeVideoId(input) !== null
}

export function normalizeYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

export async function fetchYouTubeMetadata(input: string): Promise<YouTubeVideoMetadata> {
  const videoId = parseYouTubeVideoId(input)
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Paste a link like youtube.com/watch?v=…')
  }

  const url = normalizeYouTubeUrl(videoId)
  const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`)

  if (!response.ok) {
    throw new Error('Could not fetch video info. Check the URL and try again.')
  }

  const data = (await response.json()) as {
    title?: string
    author_name?: string
    thumbnail_url?: string
    error?: string
  }

  if (data.error) {
    throw new Error(data.error || 'Video not found.')
  }

  return {
    videoId,
    url,
    title: data.title ? `▶ ${data.title}` : '▶ YouTube Video',
    authorName: data.author_name ?? null,
    thumbnailUrl: data.thumbnail_url ?? getYouTubeThumbnailUrl(videoId),
  }
}

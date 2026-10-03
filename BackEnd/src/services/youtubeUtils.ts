export function parseYouTubeVideoId(url: string): string | null {
  const validId = (value: string | null) => value && /^[A-Za-z0-9_-]{11}$/.test(value) ? value : null
  try {
    const parsed = new URL(url)
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.port) return null
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return validId(parsed.pathname.slice(1).split('/')[0])
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        return validId(parsed.searchParams.get('v'))
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        return validId(parsed.pathname.split('/')[2])
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return validId(parsed.pathname.split('/')[2])
      }
    }
  } catch {
    return null
  }

  return null
}

export function isYouTubeUrl(url: string): boolean {
  return parseYouTubeVideoId(url) !== null
}

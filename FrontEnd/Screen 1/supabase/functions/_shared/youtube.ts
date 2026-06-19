import { Innertube } from 'npm:youtubei.js@14'

export function parseYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return parsed.pathname.slice(1).split('/')[0] || null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v')
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.split('/')[2] || null
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.split('/')[2] || null
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

async function resolveYouTubeAudioUrl(videoId: string): Promise<string> {
  const yt = await Innertube.create()
  const info = await yt.getInfo(videoId)
  const format = info.chooseFormat({ type: 'audio', quality: 'best' })

  if (!format) {
    throw new Error('No audio stream found for this YouTube video.')
  }

  if (format.url) {
    return format.url
  }

  if (typeof format.decipher === 'function') {
    const deciphered = await format.decipher(yt.session.player)
    if (deciphered) return deciphered
  }

  throw new Error('Could not resolve YouTube audio stream.')
}

export async function resolveYouTubeTranscriptionUrl(youtubeUrl: string): Promise<string> {
  const videoId = parseYouTubeVideoId(youtubeUrl)
  if (!videoId) {
    throw new Error('Invalid YouTube URL.')
  }
  return resolveYouTubeAudioUrl(videoId)
}

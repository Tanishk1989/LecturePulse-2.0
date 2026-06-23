import { resolveYouTubeAudioUrl } from './services/youtubeService'

async function main() {
  console.log('Resolving audio URL for video ID 60GaSpOnA48...')
  try {
    const url = await resolveYouTubeAudioUrl('60GaSpOnA48')
    console.log('Resolved URL:', url)
  } catch (error: any) {
    console.error('Resolution failed with error:', error)
    if (error.stack) console.error(error.stack)
  }
}

main()

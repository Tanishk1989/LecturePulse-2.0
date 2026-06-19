import { groqTranscribeUrl } from '../_shared/groq.ts'
import { serveProtectedFunction } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'
import { parseYouTubeVideoId, resolveYouTubeTranscriptionUrl } from '../_shared/youtube.ts'

serveProtectedFunction('youtube-transcribe', 10, async (req) => {
  const { youtubeUrl, language } = await req.json()

  if (!youtubeUrl || typeof youtubeUrl !== 'string') {
    return jsonResponse({ error: 'youtubeUrl is required.' }, 400)
  }

  if (!parseYouTubeVideoId(youtubeUrl)) {
    return jsonResponse({ error: 'Invalid YouTube URL.' }, 400)
  }

  const audioUrl = await resolveYouTubeTranscriptionUrl(youtubeUrl)
  const transcription = await groqTranscribeUrl(audioUrl, language)
  return jsonResponse(transcription)
})

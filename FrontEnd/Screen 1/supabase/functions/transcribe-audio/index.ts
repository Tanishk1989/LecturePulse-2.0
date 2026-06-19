import { groqTranscribeUrl } from '../_shared/groq.ts'
import { serveProtectedFunction } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'

serveProtectedFunction('transcribe-audio', 20, async (req) => {
  const { audioUrl, language } = await req.json()

  if (!audioUrl || typeof audioUrl !== 'string') {
    return jsonResponse({ error: 'audioUrl is required.' }, 400)
  }

  const transcription = await groqTranscribeUrl(audioUrl, language)
  return jsonResponse(transcription)
})

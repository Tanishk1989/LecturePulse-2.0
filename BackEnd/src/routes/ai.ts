import { Router, Response } from 'express'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { groqChatCompletion, getGroqClient, getGroqChatModel, enhanceSystemPrompt, formatGroqError } from '../services/groq'
import { normalizeOutputLanguage } from '../services/outputLanguage'
import { prisma } from '../config/db'
import { transcribeFromUrl } from '../services/transcribeService'
import { resolveYouTubeTranscriptionUrl } from '../services/youtubeService'
import { extractPdfTextFromUrl } from '../services/processingService'
import { generateStructuredNotes } from '../services/notesGenerator'
import { sendRouteError } from '../utils/apiError'
import { canonicalOwnedFileUrl } from '../config/storage'
import { requireLectureOwner } from '../middleware/lectureOwner'
import { aiRequestLimit } from '../middleware/aiRequestLimit'
import { fetchYouTubeTranscript, isYouTubeTranscriptProviderConfigured } from '../services/youtubeTranscriptService'

const router = Router()

// POST /api/ai/chat - Proxy chat completion request to Groq SDK
router.post('/chat', requireAuth, aiRequestLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { systemPrompt, userPrompt, temperature, model, outputLanguage } = req.body

  if (!systemPrompt || !userPrompt) {
    return res.status(400).json({ error: 'systemPrompt and userPrompt are required.' })
  }

  try {
    const content = await groqChatCompletion(systemPrompt, userPrompt, {
      temperature,
      model,
      outputLanguage: normalizeOutputLanguage(outputLanguage),
    })
    res.json({ content })
  } catch (error) {
    return sendRouteError(res, error, 'AI chat completion failed.')
  }
})

// POST /api/ai/transcribe - Transcribe audio from a public URL (Firebase, etc.)
router.post('/transcribe', requireAuth, aiRequestLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { audioUrl, language } = req.body

  if (!audioUrl || typeof audioUrl !== 'string') {
    return res.status(400).json({ error: 'audioUrl is required.' })
  }

  try {
    const result = await transcribeFromUrl(canonicalOwnedFileUrl(audioUrl, req.user!.uid), language)
    res.json(result)
  } catch (error) {
    return sendRouteError(res, error, 'Processing failed.')
  }
})

// POST /api/ai/transcribe-youtube - Resolve YouTube audio and transcribe
router.post('/transcribe-youtube', requireAuth, aiRequestLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { youtubeUrl, language } = req.body

  if (!youtubeUrl || typeof youtubeUrl !== 'string') {
    return res.status(400).json({ error: 'youtubeUrl is required.' })
  }

  try {
    if (isYouTubeTranscriptProviderConfigured()) {
      return res.json(await fetchYouTubeTranscript(youtubeUrl, language))
    }
    const audioUrl = await resolveYouTubeTranscriptionUrl(youtubeUrl)
    const result = await transcribeFromUrl(audioUrl, language)
    res.json(result)
  } catch (error) {
    return sendRouteError(res, error, 'YouTube processing failed.')
  }
})

// POST /api/ai/generate-notes - Generate structured notes from transcript text
router.post('/generate-notes', requireAuth, aiRequestLimit, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  const { transcript, outputLanguage } = req.body

  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    return res.status(400).json({ error: 'lecture content is required.' })
  }

  try {
    const content = await generateStructuredNotes(transcript, userId, {
      outputLanguage: normalizeOutputLanguage(outputLanguage),
    })
    res.json(content)
  } catch (error) {
    return sendRouteError(res, error, 'Notes generation failed.')
  }
})

// POST /api/ai/extract-pdf - Extract text from a hosted PDF URL
router.post('/extract-pdf', requireAuth, aiRequestLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { pdfUrl } = req.body

  if (!pdfUrl || typeof pdfUrl !== 'string') {
    return res.status(400).json({ error: 'pdfUrl is required.' })
  }

  try {
    const result = await extractPdfTextFromUrl(canonicalOwnedFileUrl(pdfUrl, req.user!.uid))
    res.json(result)
  } catch (error) {
    return sendRouteError(res, error, 'PDF extraction failed.')
  }
})

// POST /api/ai/stream-chat - Stream chat completion response using Server-Sent Events (SSE)
router.post('/stream-chat', requireAuth, aiRequestLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { systemPrompt, userPrompt, temperature, model, outputLanguage } = req.body

  if (!systemPrompt || !userPrompt) {
    return res.status(400).json({ error: 'systemPrompt and userPrompt are required.' })
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  const controller = new AbortController()
  const cancel = () => controller.abort()
  res.once('close', cancel)

  try {
    const groq = getGroqClient()
    const stream = await groq.chat.completions.create({
      model: model || getGroqChatModel(),
      temperature: temperature !== undefined ? temperature : 0.4,
      messages: [
        {
          role: 'system',
          content: enhanceSystemPrompt(systemPrompt, {
            outputLanguage: normalizeOutputLanguage(outputLanguage),
          }),
        },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
    }, { signal: controller.signal })

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || ''
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error) {
    if (!res.destroyed && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: formatGroqError(error) })}\n\n`)
      res.end()
    }
  } finally {
    res.off('close', cancel)
  }
})

// POST /api/ai/feedback - Save user feedback on generated content
router.post('/feedback', requireAuth, requireLectureOwner(), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { contentType, contentId, lectureId, subject, feedback } = req.body

  if (!contentType || !lectureId || !feedback) {
    return res.status(400).json({ error: 'contentType, lectureId, and feedback are required.' })
  }

  try {
    const record = await prisma.aiFeedback.create({
      data: {
        userId,
        contentType,
        contentId: contentId || null,
        lectureId,
        subject: subject || null,
        feedback,
      },
    })
    res.json({ success: true, record })
  } catch (error) {
    return sendRouteError(res, error, 'Failed to save feedback.')
  }
})

// GET /api/ai/feedback - Retrieve only the authenticated user's feedback
router.get('/feedback', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const records = await prisma.aiFeedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    res.json(records)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to retrieve feedback.')
  }
})

// POST /api/ai/rag-retrieve - Ranked keyword search over owned transcripts
router.post('/rag-retrieve', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { question, lectureIds, topK } = req.body
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required.' })
  }
  if (!Array.isArray(lectureIds) || lectureIds.length === 0) {
    return res.status(400).json({ error: 'lectureIds array is required.' })
  }

  try {
    const { retrieveRagChunks } = await import('../services/ragService')
    const chunks = await retrieveRagChunks(
      userId,
      question,
      lectureIds.filter((id: unknown) => typeof id === 'string'),
      typeof topK === 'number' ? topK : 6,
    )
    res.json({ chunks })
  } catch (error) {
    return sendRouteError(res, error, 'RAG retrieval failed.')
  }
})

// POST /api/ai/translate - Translate lecture content
router.post('/translate', requireAuth, aiRequestLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { text, targetLanguage, contextLabel } = req.body
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required.' })
  }
  if (!targetLanguage || typeof targetLanguage !== 'string') {
    return res.status(400).json({ error: 'targetLanguage is required.' })
  }

  try {
    const { translateText } = await import('../services/translationService')
    const translated = await translateText(text, targetLanguage, contextLabel)
    res.json({ translated })
  } catch (error) {
    return sendRouteError(res, error, 'Translation failed.')
  }
})

// POST /api/ai/detect-speakers - Label transcript segments by speaker role
router.post('/detect-speakers', requireAuth, aiRequestLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { segments, subject, useLlm } = req.body

  if (!Array.isArray(segments) || segments.length === 0) {
    return res.status(400).json({ error: 'segments array is required.' })
  }

  try {
    const { detectSpeakersInSegments } = await import('../services/speakerDetectionService')
    const labeled = await detectSpeakersInSegments(segments, {
      subject: typeof subject === 'string' ? subject : undefined,
      useLlm: useLlm !== false,
    })
    res.json({ segments: labeled })
  } catch (error) {
    return sendRouteError(res, error, 'Speaker detection failed.')
  }
})

export default router

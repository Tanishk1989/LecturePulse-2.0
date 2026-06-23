import { prisma } from '../config/db'
import { generateStructuredNotes } from './notesGenerator'
import { extractAndStoreConcepts } from './conceptExtractor'
import { transcribeFromUrl } from './transcribeService'
import { resolveYouTubeTranscriptionUrl, downloadYouTubeAudio } from './youtubeService'
import { isYouTubeUrl, parseYouTubeVideoId } from './youtubeUtils'
import { readFileBufferFromUrl } from '../config/storage'
import { groqChatCompletion } from './groq'
import pdfParse from 'pdf-parse'

export interface ProcessLectureOptions {
  generateNotes?: boolean
  forceRetranscribe?: boolean
}

export { parseYouTubeVideoId, isYouTubeUrl }

export async function cleanTranscript(rawTranscript: string): Promise<string> {
  const systemPrompt = `You are a transcript cleanup assistant for a lecture transcription app covering any academic subject. You will receive a raw, auto-generated transcript from a speech-to-text system. Your job is to clean it up WITHOUT changing its meaning or adding any new information.

Language Rule:
If the lecture/transcript is in Hindi (whether written in Devanagari script, translated to English, or mixed), you MUST write/transcribe the cleaned transcript in Hinglish (Hindi words in Roman script — e.g., "AI ab khud writing karta hai"). Do NOT translate it to English. Do NOT write in Devanagari script.
If the transcript is in English, leave it in English. Do not translate English to Hinglish.

Rules:
1. Fix obvious mishearing errors only when you are highly confident based on context. If you are not confident, leave the original text unchanged.
2. Add proper punctuation and paragraph breaks based on natural speech pauses and topic shifts.
3. Remove filler words and verbal disfluencies (um, uh, you know, like, repeated words from self-correction) ONLY when they don't carry meaning.
4. Preserve all technical terms, proper nouns, numbers, and specific examples exactly as spoken — do not paraphrase or summarize anything.
5. Do NOT add any information, explanation, or commentary that wasn't in the original transcript.
6. Do NOT change the speaker's meaning, even if you think they misspoke about a fact.
7. If a sentence is incomplete or trails off, leave it as-is rather than completing it yourself.
8. Output only the cleaned transcript text. No preamble, no explanation, no markdown formatting.`

  return groqChatCompletion(systemPrompt, rawTranscript, {
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
  })
}

function getExcerpt(text: string, maxWords = 800): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= maxWords) return text
  return words.slice(0, maxWords).join(' ')
}

function isDefaultOrTemporaryTitle(title: string): boolean {
  const clean = title.replace(/^[🎙📄]\s*/, '').trim()
  if (clean === 'Live Recording' || clean === 'Uploaded Lecture' || clean === 'Lecture') {
    return true
  }
  if (/\.(mp3|wav|m4a|webm|mp4|pdf)$/i.test(clean)) {
    return true
  }
  if (/^recording-\d+$/i.test(clean)) {
    return true
  }
  if (/[_-]/.test(clean) && clean === clean.toLowerCase()) {
    return true
  }
  return false
}

function getCleanedFallbackTitle(currentTitle: string): string {
  const noEmoji = currentTitle.replace(/^[\u2300-\u27BF\uD83C-\uD83D\uD83E\uDD00-\uDDF0\uD83F]\s*/g, '')
  let base = noEmoji.replace(/[_-]+/g, ' ').trim()
  return base
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export async function generateSmartTitle(text: string): Promise<string> {
  const excerpt = getExcerpt(text, 800)
  const systemPrompt = `You are an academic title generator. Given a transcript or text excerpt from a lecture or document, generate a concise, descriptive academic title.

Rules:
- Maximum 8 words
- Format: "Main Topic — Subtopic or Key Concept"
- Use proper academic language
- Do NOT use generic titles like "Lecture 1" or "Class Notes"
- Return ONLY the title, nothing else, no quotes, no explanation

Example outputs:
- Neural Networks — Backpropagation & Gradient Descent
- Operating Systems — Deadlock Detection and Prevention  
- Data Structures — Binary Trees and Tree Traversals
- Indian Constitution — Fundamental Rights and Duties`

  const response = await groqChatCompletion(systemPrompt, `Content excerpt:\n\n${excerpt}`, {
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
  })

  let cleaned = response.trim().replace(/^["']|["']$/g, '')
  if (cleaned.length > 100) {
    cleaned = cleaned.slice(0, 97) + '...'
  }
  return cleaned
}

export async function extractPdfTextFromUrl(pdfUrl: string): Promise<{
  text: string
  pageCount: number | null
}> {
  const buffer = await readFileBufferFromUrl(pdfUrl)
  const parsed = await pdfParse(buffer)
  const cleaned = parsed.text.replace(/\s+/g, ' ').trim()
  
  if (!cleaned) {
    throw new Error('No readable text found in this PDF.')
  }
  
  return {
    text: cleaned,
    pageCount: parsed.numpages || null
  }
}

export async function triggerLectureProcessing(
  lectureId: string,
  userId: string,
  options: ProcessLectureOptions = {}
): Promise<void> {
  const generateNotes = options.generateNotes !== false
  const forceRetranscribe = options.forceRetranscribe === true

  try {
    const lecture = await prisma.lecture.findFirst({
      where: { id: lectureId, userId }
    })

    if (!lecture) {
      throw new Error('Lecture not found.')
    }

    // Set lecture status to processing
    await prisma.lecture.update({
      where: { id: lectureId },
      data: { status: 'processing' }
    })

    // Get or create transcript record
    let transcript = await prisma.transcript.findFirst({
      where: { lectureId, userId }
    })

    let sourceText = transcript?.fullText?.trim() ?? ''
    const hasCompletedTranscript =
      transcript?.status === 'completed' && Boolean(sourceText) && !forceRetranscribe

    if (!hasCompletedTranscript) {
      // Set or create transcript status to processing
      if (transcript) {
        transcript = await prisma.transcript.update({
          where: { id: transcript.id },
          data: {
            status: 'processing',
            errorMessage: null,
            updatedAt: new Date()
          }
        })
      } else {
        transcript = await prisma.transcript.create({
          data: {
            lectureId,
            userId,
            fullText: '',
            segments: [],
            status: 'processing'
          }
        })
      }

      try {
        let extractedText = ''
        let language = 'auto'
        let durationSeconds = 0
        let segments: any[] = []

        if (lecture.fileType === 'pdf' || lecture.source === 'pdf') {
          const pdfResult = await extractPdfTextFromUrl(lecture.fileUrl)
          extractedText = pdfResult.text
          durationSeconds = pdfResult.pageCount || 0
        } else {
          let audioUrl = lecture.fileUrl

          if (lecture.source === 'youtube' || isYouTubeUrl(lecture.fileUrl)) {
            audioUrl = await downloadYouTubeAudio(lecture.fileUrl, lectureId)
            await prisma.lecture.update({
              where: { id: lectureId },
              data: { fileUrl: audioUrl }
            })
          }

          const transcriptionResult = await transcribeFromUrl(
            audioUrl,
            undefined,
            lectureId,
            lecture.subject || undefined,
          )
          extractedText = transcriptionResult.text?.trim() ?? ''
          language = transcriptionResult.language ?? 'en'
          durationSeconds = transcriptionResult.duration ? Math.round(transcriptionResult.duration) : 0
          segments = (transcriptionResult.segments ?? []).map((seg, index) => ({
            id: seg.id ?? index,
            start: seg.start,
            end: seg.end,
            text: seg.text.trim()
          }))
        }

        if (!extractedText) {
          throw new Error('No readable speech or text detected in this lecture.')
        }

        let cleanedText = extractedText
        try {
          cleanedText = await cleanTranscript(extractedText)
        } catch (cleanErr) {
          console.error('Transcript cleanup failed, falling back to raw:', cleanErr)
          cleanedText = extractedText
        }

        sourceText = cleanedText

        // Update transcript to completed
        await prisma.transcript.update({
          where: { id: transcript.id },
          data: {
            fullText: cleanedText,
            rawText: extractedText,
            language,
            durationSeconds,
            segments,
            status: 'completed',
            errorMessage: null,
            updatedAt: new Date()
          }
        })
      } catch (err: any) {
        const msg = err.message || 'Processing failed.'
        await prisma.transcript.update({
          where: { id: transcript.id },
          data: {
            status: 'failed',
            errorMessage: msg,
            updatedAt: new Date()
          }
        })
        await prisma.lecture.update({
          where: { id: lectureId },
          data: { status: 'failed' }
        })
        throw err
      }
    }

    // Generate smart title if needed
    if (sourceText) {
      try {
        const currentLecture = await prisma.lecture.findUnique({
          where: { id: lectureId },
          select: { title: true, fileType: true, source: true }
        })

        if (
          currentLecture &&
          (isDefaultOrTemporaryTitle(currentLecture.title) || !currentLecture.title.includes('—'))
        ) {
          let smartTitle = ''
          try {
            smartTitle = await generateSmartTitle(sourceText)
          } catch (titleErr) {
            console.error('AI title generation failed, falling back:', titleErr)
            smartTitle = getCleanedFallbackTitle(currentLecture.title)
          }

          if (smartTitle) {
            const emoji = currentLecture.fileType === 'pdf' || currentLecture.source === 'pdf' ? '📄' : '🎙'
            await prisma.lecture.update({
              where: { id: lectureId },
              data: { title: `${emoji} ${smartTitle}` }
            })
          }
        }
      } catch (titleGenErr) {
        console.error('Failed in title generation lifecycle:', titleGenErr)
      }
    }

    // Process notes if requested
    if (generateNotes && sourceText) {
      let notes = await prisma.lectureNote.findFirst({
        where: { lectureId, userId }
      })

      const notesCompleted = notes?.status === 'completed' && !forceRetranscribe

      if (!notesCompleted) {
        if (notes) {
          notes = await prisma.lectureNote.update({
            where: { id: notes.id },
            data: {
              status: 'generating',
              errorMessage: null,
              updatedAt: new Date()
            }
          })
        } else {
          notes = await prisma.lectureNote.create({
            data: {
              lectureId,
              userId,
              status: 'generating'
            }
          })
        }

        try {
          const notesContent = await generateStructuredNotes(sourceText, userId)

          await prisma.lectureNote.update({
            where: { id: notes.id },
            data: {
              summary: notesContent.summary,
              keyConcepts: notesContent.keyConcepts,
              importantPoints: notesContent.importantPoints,
              definitions: notesContent.definitions,
              examples: notesContent.examples,
              mindMap: (notesContent.mindMap ?? {}) as object,
              questions: notesContent.questions,
              examTips: notesContent.examTips,
              status: 'completed',
              errorMessage: null,
              updatedAt: new Date()
            }
          })

          void extractAndStoreConcepts(lectureId, userId, sourceText).catch((kgErr) => {
            console.error(`Knowledge graph extraction failed for lecture ${lectureId}:`, kgErr)
          })
        } catch (err: any) {
          const msg = err.message || 'Notes generation failed.'
          await prisma.lectureNote.update({
            where: { id: notes.id },
            data: {
              status: 'failed',
              errorMessage: msg,
              updatedAt: new Date()
            }
          })
        }
      }
    }

    if (sourceText) {
      const conceptCount = await prisma.kgConcept.count({ where: { lectureId, userId } })
      const lectureMeta = await prisma.lecture.findFirst({
        where: { id: lectureId },
        select: { kgStatus: true },
      })
      if (
        conceptCount === 0 &&
        lectureMeta?.kgStatus !== 'extracting' &&
        lectureMeta?.kgStatus !== 'completed'
      ) {
        void extractAndStoreConcepts(lectureId, userId, sourceText).catch((kgErr) => {
          console.error(`Knowledge graph extraction failed for lecture ${lectureId}:`, kgErr)
        })
      }
    }

    // Set lecture status to completed
    await prisma.lecture.update({
      where: { id: lectureId },
      data: { status: 'completed' }
    })
  } catch (error) {
    console.error(`Error processing lecture ${lectureId}:`, error)
    await prisma.lecture.update({
      where: { id: lectureId },
      data: { status: 'failed' }
    }).catch(() => {})
  }
}

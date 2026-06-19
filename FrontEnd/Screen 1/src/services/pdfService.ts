import { extractTextFromPdfFile, extractTextFromPdfUrl } from '@/lib/pdfTextExtraction'
import { invokeExtractPdfText } from '@/lib/groqProxy'
import {
  createTranscript,
  getTranscriptByLectureId,
  updateTranscript,
} from '@/services/transcriptionService'
import { updateLecture } from '@/services/lectureService'
import type { Transcript } from '@/types/transcript'

export interface PdfExtractionResult {
  text: string
  pageCount: number | null
}

async function extractPdfText(pdfUrl: string, file?: File): Promise<PdfExtractionResult> {
  if (file) {
    try {
      const text = await extractTextFromPdfFile(file)
      if (text.trim()) {
        return { text, pageCount: null }
      }
    } catch {
      // fall through to server/client URL extraction
    }
  }

  try {
    return await invokeExtractPdfText(pdfUrl)
  } catch {
    const text = await extractTextFromPdfUrl(pdfUrl)
    return { text, pageCount: null }
  }
}

export async function processPdfLecture(
  userId: string,
  lectureId: string,
  pdfUrl: string,
  options?: { file?: File; pageCount?: number | null },
): Promise<Transcript> {
  const existing = await getTranscriptByLectureId(userId, lectureId)
  if (existing?.status === 'completed' && existing.text.trim()) {
    return existing
  }

  let transcript =
    existing ??
    (await createTranscript({
      lectureId,
      userId,
      status: 'processing',
    }))

  if (existing && existing.status !== 'completed') {
    transcript = await updateTranscript(transcript.id, userId, {
      status: 'processing',
      errorMessage: null,
    })
  }

  await updateLecture(userId, lectureId, { status: 'processing' })

  try {
    const { text, pageCount } = await extractPdfText(pdfUrl, options?.file)
    const resolvedPageCount = pageCount ?? options?.pageCount ?? null

    const saved = await updateTranscript(transcript.id, userId, {
      text,
      language: 'auto',
      durationSeconds: resolvedPageCount,
      segments: [],
      status: 'completed',
      errorMessage: null,
    })

    await updateLecture(userId, lectureId, { status: 'completed' })
    return saved
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PDF text extraction failed.'
    const failed = await updateTranscript(transcript.id, userId, {
      status: 'failed',
      errorMessage: message,
    })
    await updateLecture(userId, lectureId, { status: 'failed' })
    throw Object.assign(new Error(message), { transcript: failed })
  }
}

import { groqTranscribeBuffer } from './groq'
import { readFileBufferFromUrl } from '../config/storage'
import { prisma } from '../config/db'
import { convertBufferToMonoWav } from './audioConvertService'
import { parseWavHeader, splitWavBuffer, type WavHeaderInfo } from './wavAudio'

function extensionFromContentType(contentType: string | null): string {
  if (!contentType) return 'webm'
  if (contentType.includes('wav')) return 'wav'
  if (contentType.includes('mpeg') || contentType.includes('mp3')) return 'mp3'
  if (contentType.includes('mp4')) return 'mp4'
  if (contentType.includes('ogg')) return 'ogg'
  return 'webm'
}

const GROQ_MAX_BYTES = 20 * 1024 * 1024 // stay under Groq's ~25MB limit

async function prepareWavBuffer(
  buffer: Buffer,
  ext: string,
): Promise<{ buffer: Buffer; wavInfo: WavHeaderInfo }> {
  let workingBuffer = buffer
  let wavInfo = parseWavHeader(workingBuffer)

  const mustNormalize =
    !wavInfo ||
    workingBuffer.length > GROQ_MAX_BYTES ||
    wavInfo.sampleRate > 16000 ||
    wavInfo.numChannels > 1 ||
    wavInfo.bitsPerSample !== 16

  if (mustNormalize) {
    workingBuffer = await convertBufferToMonoWav(workingBuffer, wavInfo ? 'wav' : ext)
    wavInfo = parseWavHeader(workingBuffer)
  }

  if (!wavInfo) {
    throw new Error(
      'Could not prepare audio for transcription. Install ffmpeg and restart the backend, then try again.',
    )
  }

  return { buffer: workingBuffer, wavInfo }
}

async function transcribeWavInChunks(
  workingBuffer: Buffer,
  wavInfo: WavHeaderInfo,
  language: string | undefined,
  lectureId: string | undefined,
  subject: string | undefined,
): Promise<{
  text: string
  language?: string
  duration?: number
  segments?: Array<{ id: number; start: number; end: number; text: string }>
}> {
  const wavChunks = splitWavBuffer(workingBuffer, wavInfo, GROQ_MAX_BYTES)
  const totalChunks = wavChunks.length

  let combinedText = ''
  let combinedSegments: Array<{ id: number; start: number; end: number; text: string }> = []
  let resolvedLanguage = language || 'en'

  for (let i = 0; i < totalChunks; i++) {
    if (wavChunks[i].buffer.length > GROQ_MAX_BYTES) {
      throw new Error(
        `Internal chunking error: part ${i + 1} is still too large. Contact support.`,
      )
    }

    if (lectureId) {
      try {
        const existing = await prisma.transcript.findFirst({ where: { lectureId } })
        if (existing) {
          await prisma.transcript.update({
            where: { id: existing.id },
            data: { status: `transcribing_part_${i + 1}_of_${totalChunks}` },
          })
        }
      } catch (dbErr) {
        console.error('Failed to update chunk status in database:', dbErr)
      }
    }

    const chunkResult = await groqTranscribeBuffer(
      wavChunks[i].buffer,
      `audio_part_${i + 1}.wav`,
      'audio/wav',
      language,
      subject,
    )

    if (chunkResult.language) {
      resolvedLanguage = chunkResult.language
    }

    const chunkText = chunkResult.text?.trim() ?? ''
    if (chunkText) {
      combinedText += (combinedText ? ' ' : '') + chunkText
    }

    const chunkOffsetSeconds = wavChunks[i].startSeconds
    const chunkSegments = (chunkResult.segments ?? []).map((seg, idx) => ({
      id: combinedSegments.length + idx,
      start: seg.start + chunkOffsetSeconds,
      end: seg.end + chunkOffsetSeconds,
      text: seg.text,
    }))
    combinedSegments = combinedSegments.concat(chunkSegments)
  }

  return {
    text: combinedText,
    language: resolvedLanguage,
    duration: wavInfo.duration,
    segments: combinedSegments,
  }
}

export async function transcribeFromUrl(
  audioUrl: string,
  language?: string,
  lectureId?: string,
  subject?: string,
): Promise<{
  text: string
  language?: string
  duration?: number
  segments?: Array<{ id: number; start: number; end: number; text: string }>
}> {
  const contentType = 'application/octet-stream'
  const buffer = await readFileBufferFromUrl(audioUrl)

  let resolvedContentType = contentType
  if (audioUrl.includes('.')) {
    const ext = audioUrl.split('.').pop()?.split('?')[0]?.toLowerCase()
    if (ext === 'wav') resolvedContentType = 'audio/wav'
    else if (ext === 'mp3') resolvedContentType = 'audio/mpeg'
    else if (ext === 'webm') resolvedContentType = 'audio/webm'
    else if (ext === 'mp4') resolvedContentType = 'video/mp4'
    else if (ext === 'pdf') resolvedContentType = 'application/pdf'
  }

  const ext = extensionFromContentType(resolvedContentType)

  let prepared: Awaited<ReturnType<typeof prepareWavBuffer>>
  try {
    prepared = await prepareWavBuffer(buffer, ext)
  } catch (prepErr) {
    // Last resort for small compressed files that fit in one Groq request.
    if (buffer.length <= GROQ_MAX_BYTES) {
      console.error('WAV prep failed, trying direct transcription:', prepErr)
      return groqTranscribeBuffer(buffer, `audio.${ext}`, resolvedContentType, language, subject)
    }
    throw prepErr
  }
  // Provider failures must not restart a completed chunk sequence or duplicate billing.
  const { buffer: workingBuffer, wavInfo } = prepared
  if (wavInfo.duration > 600 || workingBuffer.length > GROQ_MAX_BYTES) {
    return transcribeWavInChunks(workingBuffer, wavInfo, language, lectureId, subject)
  }
  return groqTranscribeBuffer(workingBuffer, 'audio.wav', 'audio/wav', language, subject)
}

import {
  detectLanguageFromText,
  type RecognitionLanguage,
} from '@/lib/webSpeechRecognition'
import { invokeTranscribeAudio, invokeYouTubeTranscribe, isAiBackendConfigured } from '@/lib/groqProxy'
import type { TranscriptSegment } from '@/types/transcript'

interface VerboseWhisperResponse {
  text: string
  language?: string
  duration?: number
  segments?: Array<{ id: number; start: number; end: number; text: string }>
}

export interface WhisperTranscriptionResult {
  text: string
  language: string
  duration: number
  segments: TranscriptSegment[]
}

export function isWhisperConfigured(): boolean {
  return isAiBackendConfigured()
}

function resolveWhisperLanguage(language: RecognitionLanguage): string | undefined {
  if (language === 'auto') return undefined
  if (language === 'hi-IN') return 'hi'
  if (language === 'en-US') return 'en'
  return undefined
}

export function isYouTubeAudioUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be'
  } catch {
    return false
  }
}

function mapWhisperResponse(response: VerboseWhisperResponse): WhisperTranscriptionResult {
  const text = response.text?.trim() ?? ''
  if (!text) {
    throw new Error('No speech detected in this audio file.')
  }

  const segments: TranscriptSegment[] = (response.segments ?? []).map((segment, index) => ({
    id: segment.id ?? index,
    start: segment.start,
    end: segment.end,
    text: segment.text.trim(),
  }))

  const detected = detectLanguageFromText(text)
  const language =
    detected !== 'Detecting…' ? detected : (response.language ?? 'auto')

  return {
    text,
    language,
    duration: response.duration ?? 0,
    segments,
  }
}

/**
 * Transcribe hosted audio/video via Groq Whisper edge function.
 */
export async function transcribeWithWhisper(
  audioUrl: string,
  options: {
    language?: RecognitionLanguage
    onProgress?: (progress: number) => void
  } = {},
): Promise<WhisperTranscriptionResult> {
  const whisperLanguage = resolveWhisperLanguage(options.language ?? 'auto')
  options.onProgress?.(20)

  const response = (await invokeTranscribeAudio(
    audioUrl,
    whisperLanguage,
  )) as VerboseWhisperResponse

  options.onProgress?.(95)
  return mapWhisperResponse(response)
}

/**
 * Transcribe a YouTube video via the youtube-transcribe edge function.
 */
export async function transcribeYouTubeWithWhisper(
  youtubeUrl: string,
  options: {
    language?: RecognitionLanguage
    onProgress?: (progress: number) => void
  } = {},
): Promise<WhisperTranscriptionResult> {
  const whisperLanguage = resolveWhisperLanguage(options.language ?? 'auto')
  options.onProgress?.(20)

  const response = (await invokeYouTubeTranscribe(
    youtubeUrl,
    whisperLanguage,
  )) as VerboseWhisperResponse

  options.onProgress?.(95)
  return mapWhisperResponse(response)
}

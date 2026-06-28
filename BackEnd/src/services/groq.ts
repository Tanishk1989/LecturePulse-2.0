import Groq from 'groq-sdk'
import { File } from 'node:buffer'
import {
  type AiOutputLanguage,
  MATCH_LECTURE_OUTPUT_RULE,
  normalizeOutputLanguage,
  STRICT_ENGLISH_OUTPUT_RULE,
  TRANSCRIPT_LANGUAGE_RULE,
} from './outputLanguage'

export type { AiOutputLanguage }

export interface EnhancePromptOptions {
  outputLanguage?: AiOutputLanguage
  /** Transcript cleanup only — do not apply study-output language rules */
  transcriptOnly?: boolean
  /** Skip all LecturePulse language wrappers (e.g. explicit translation requests) */
  skipEnhancement?: boolean
}

export function getGroqClient(): Groq {
  const raw = process.env.GROQ_API_KEY?.trim().replace(/^["']|["']$/g, '')
  if (!raw) {
    throw new Error('GROQ_API_KEY environment variable is not configured.')
  }
  return new Groq({ apiKey: raw })
}

const GROQ_KEY_HELP =
  'Create a new API key at https://console.groq.com/keys, set GROQ_API_KEY in BackEnd/.env (and on Render if deployed), then restart the backend.'

export function formatGroqError(error: unknown): string {
  const message = String(error instanceof Error ? error.message : error ?? '')

  if (
    /invalid api key|invalid_api_key|401/i.test(message) ||
    message.includes('GROQ_API_KEY environment variable is not configured')
  ) {
    return `Groq API key is missing or invalid. ${GROQ_KEY_HELP}`
  }

  if (/too large|payload|413|file size/i.test(message)) {
    return 'Audio file is too large for transcription. Try a shorter lecture or ensure ffmpeg is installed.'
  }

  if (/too long|context|token/i.test(message)) {
    return 'Transcript input is too long for AI processing. Notes will use the raw transcript instead.'
  }

  if (/rate limit|429/i.test(message)) {
    return 'Groq rate limit reached. Wait a minute and try again.'
  }

  // Avoid surfacing raw JSON error blobs in the UI.
  if (message.startsWith('401') || message.startsWith('403') || message.includes('{"error"')) {
    return `AI service request failed. ${GROQ_KEY_HELP}`
  }

  return message || 'AI processing failed. Please try again.'
}

export function enhanceSystemPrompt(
  systemPrompt: string,
  options: EnhancePromptOptions = {},
): string {
  if (options.skipEnhancement) {
    return systemPrompt
  }

  const outputLanguage = normalizeOutputLanguage(options.outputLanguage)
  const marker = 'LecturePulse language policy'

  if (systemPrompt.includes(marker)) {
    return systemPrompt
  }

  const rules: string[] = [`You are an AI study assistant for LecturePulse. ${marker}:`]

  if (options.transcriptOnly) {
    rules.push(TRANSCRIPT_LANGUAGE_RULE)
  } else if (outputLanguage === 'match') {
    rules.push(MATCH_LECTURE_OUTPUT_RULE)
  } else {
    rules.push(STRICT_ENGLISH_OUTPUT_RULE)
  }

  return `${rules.join('\n\n')}\n\n${systemPrompt}`
}

export async function groqChatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    temperature?: number
    model?: string
    jsonMode?: boolean
    outputLanguage?: AiOutputLanguage
    transcriptOnly?: boolean
    skipEnhancement?: boolean
  },
): Promise<string> {
  const enhancedPrompt = enhanceSystemPrompt(systemPrompt, {
    outputLanguage: options?.outputLanguage,
    transcriptOnly: options?.transcriptOnly,
    skipEnhancement: options?.skipEnhancement,
  })
  const groq = getGroqClient()
  try {
    const completion = await groq.chat.completions.create({
    model: options?.model || 'llama-3.3-70b-versatile',
    temperature: options?.temperature !== undefined ? options.temperature : 0.4,
    messages: [
      { role: 'system', content: enhancedPrompt },
      { role: 'user', content: userPrompt },
    ],
    ...(options?.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    })

    const content = completion.choices?.[0]?.message?.content?.trim()
    if (!content) {
      throw new Error('Empty response from AI.')
    }

    return content
  } catch (error) {
    throw new Error(formatGroqError(error))
  }
}

function buildWhisperPrompt(subjectName?: string): string {
  if (subjectName && subjectName.trim()) {
    return `This is a college lecture transcription for a ${subjectName.trim()} course. Transcribe technical and subject-specific terminology accurately, preserve proper capitalization for acronyms and proper nouns, and maintain natural punctuation based on speech pauses.`
  }
  return `This is a college lecture transcription. Transcribe technical and subject-specific terminology accurately, preserve proper capitalization for acronyms and proper nouns, and maintain natural punctuation based on speech pauses.`
}

export async function groqTranscribeBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  language?: string,
  subject?: string,
): Promise<{
  text: string
  language?: string
  duration?: number
  segments?: Array<{ id: number; start: number; end: number; text: string }>
}> {
  const GROQ_MAX_BYTES = 20 * 1024 * 1024
  if (buffer.length > GROQ_MAX_BYTES) {
    throw new Error(
      `Audio chunk is too large (${Math.round(buffer.length / (1024 * 1024))}MB). Splitting should happen before this step.`,
    )
  }

  const groq = getGroqClient()
  const file = new File([buffer], filename, { type: mimeType || 'application/octet-stream' })

  try {
    const transcription = await groq.audio.transcriptions.create({
      model: 'whisper-large-v3',
      file,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      prompt: buildWhisperPrompt(subject),
      ...(language ? { language } : {}),
    })

    return transcription as any
  } catch (error) {
    throw new Error(formatGroqError(error))
  }
}

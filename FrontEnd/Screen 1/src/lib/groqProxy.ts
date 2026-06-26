import { apiFetch } from '@/lib/api'
import { auth } from '@/lib/firebase'
import { getOutputLanguagePreference } from '@/lib/processingPreferences'

export function isAiBackendConfigured(): boolean {
  return true
}

export async function invokeGroqChat(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; model?: string },
): Promise<string> {
  const uid = auth.currentUser?.uid
  const outputLanguage = uid ? getOutputLanguagePreference(uid) : 'en'

  const data = await apiFetch<{ content: string }>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      systemPrompt,
      userPrompt,
      temperature: options?.temperature ?? 0.4,
      model: options?.model,
      outputLanguage,
    }),
  })

  return data.content.trim()
}

export interface TranscriptionPayload {
  text?: string
  language?: string
  duration?: number
  segments?: Array<{ id: number; start: number; end: number; text: string }>
}

export async function invokeTranscribeAudio(
  audioUrl: string,
  language?: string,
): Promise<TranscriptionPayload> {
  return apiFetch<TranscriptionPayload>('/ai/transcribe', {
    method: 'POST',
    body: JSON.stringify({ audioUrl, language }),
  })
}

export async function invokeYouTubeTranscribe(
  youtubeUrl: string,
  language?: string,
): Promise<TranscriptionPayload> {
  return apiFetch<TranscriptionPayload>('/ai/transcribe-youtube', {
    method: 'POST',
    body: JSON.stringify({ youtubeUrl, language }),
  })
}

export async function invokeExtractPdfText(
  pdfUrl: string,
): Promise<{ text: string; pageCount: number | null }> {
  return apiFetch<{ text: string; pageCount: number | null }>('/ai/extract-pdf', {
    method: 'POST',
    body: JSON.stringify({ pdfUrl }),
  })
}

export const AI_UNAVAILABLE_MESSAGE = 'AI service is currently unavailable.'

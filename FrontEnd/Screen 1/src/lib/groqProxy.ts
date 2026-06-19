import { isSupabaseConfigured, supabase } from '@/lib/supabase'

const AI_UNAVAILABLE_MESSAGE =
  'AI service unavailable. Deploy Supabase edge functions and set the GROQ_API_KEY secret.'

export function isAiBackendConfigured(): boolean {
  return isSupabaseConfigured
}

function getInvokeError(data: unknown, error: { message?: string } | null): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const message = (data as { error?: string }).error
    if (message) return message
  }
  return error?.message || AI_UNAVAILABLE_MESSAGE
}

export async function invokeGroqChat(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; model?: string },
): Promise<string> {
  if (!supabase) {
    throw new Error(AI_UNAVAILABLE_MESSAGE)
  }

  const { data, error } = await supabase.functions.invoke('groq-chat', {
    body: {
      systemPrompt,
      userPrompt,
      temperature: options?.temperature ?? 0.4,
      model: options?.model,
    },
  })

  if (error || !data?.content) {
    throw new Error(getInvokeError(data, error))
  }

  return String(data.content).trim()
}

export async function invokeYouTubeTranscribe(
  youtubeUrl: string,
  language?: string,
): Promise<unknown> {
  if (!supabase) {
    throw new Error(AI_UNAVAILABLE_MESSAGE)
  }

  const { data, error } = await supabase.functions.invoke('youtube-transcribe', {
    body: { youtubeUrl, language },
  })

  if (error) {
    throw new Error(getInvokeError(data, error))
  }

  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(getInvokeError(data, null))
  }

  return data
}

export async function invokeTranscribeAudio(
  audioUrl: string,
  language?: string,
): Promise<unknown> {
  if (!supabase) {
    throw new Error(AI_UNAVAILABLE_MESSAGE)
  }

  const { data, error } = await supabase.functions.invoke('transcribe-audio', {
    body: { audioUrl, language },
  })

  if (error) {
    throw new Error(getInvokeError(data, error))
  }

  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(getInvokeError(data, null))
  }

  return data
}

export async function invokeExtractPdfText(pdfUrl: string): Promise<{
  text: string
  pageCount: number | null
}> {
  if (!supabase) {
    throw new Error(AI_UNAVAILABLE_MESSAGE)
  }

  const { data, error } = await supabase.functions.invoke('extract-pdf-text', {
    body: { pdfUrl },
  })

  if (error) {
    throw new Error(getInvokeError(data, error))
  }

  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(getInvokeError(data, null))
  }

  const text = typeof data?.text === 'string' ? data.text.trim() : ''
  if (!text) {
    throw new Error('No readable text found in this PDF.')
  }

  return {
    text,
    pageCount: typeof data?.pageCount === 'number' ? data.pageCount : null,
  }
}

export { AI_UNAVAILABLE_MESSAGE }

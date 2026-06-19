import Groq from 'npm:groq-sdk@0.15.0'

export function getGroqClient(): Groq {
  const groqKey = Deno.env.get('GROQ_API_KEY')
  if (!groqKey) {
    throw new Error('GROQ_API_KEY is not configured.')
  }
  return new Groq({ apiKey: groqKey })
}

export async function groqChatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; model?: string },
): Promise<string> {
  const groq = getGroqClient()
  const completion = await groq.chat.completions.create({
    model: options?.model ?? 'llama-3.3-70b-versatile',
    temperature: options?.temperature ?? 0.4,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const content = completion.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('Empty response from AI.')
  }

  return content
}

export async function groqTranscribeUrl(
  audioUrl: string,
  language?: string,
): Promise<{
  text: string
  language?: string
  duration?: number
  segments?: Array<{ id: number; start: number; end: number; text: string }>
}> {
  const groq = getGroqClient()
  const transcription = await groq.audio.transcriptions.create({
    model: 'whisper-large-v3',
    url: audioUrl,
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
    ...(language ? { language } : {}),
  })

  return transcription as {
    text: string
    language?: string
    duration?: number
    segments?: Array<{ id: number; start: number; end: number; text: string }>
  }
}

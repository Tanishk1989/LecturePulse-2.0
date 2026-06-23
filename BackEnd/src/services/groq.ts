import Groq from 'groq-sdk'
import { File } from 'node:buffer'

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not configured.')
  }
  return new Groq({ apiKey })
}

export function enhanceSystemPrompt(systemPrompt: string): string {
  const centralInstruction = `You are an AI study assistant for LecturePulse. 
The user's lecture may be in Hindi. Follow these rules strictly:

1. Transcript: If the lecture is in Hindi, write the transcript 
   in Hinglish (Hindi spoken words written in Roman/Latin script). 
   Do NOT translate to English. Do NOT use Devanagari script.

2. All other outputs (summary, notes, definitions, mind map, 
   key takeaways, questions, exam tips, flashcards, answers): 
   Always write in English only, regardless of the lecture language.

Never mix these up. Transcript = Hinglish. Everything else = English.`;

  if (systemPrompt.includes('AI study assistant for LecturePulse') && systemPrompt.includes('Transcript = Hinglish')) {
    return systemPrompt;
  }

  return `${centralInstruction}\n\n${systemPrompt}`;
}

export async function groqChatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; model?: string; jsonMode?: boolean },
): Promise<string> {
  const enhancedPrompt = enhanceSystemPrompt(systemPrompt)
  const groq = getGroqClient()
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
  const groq = getGroqClient()
  const file = new File([buffer], filename, { type: mimeType || 'application/octet-stream' })

  const transcription = await groq.audio.transcriptions.create({
    model: 'whisper-large-v3',
    file,
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
    prompt: buildWhisperPrompt(subject),
    ...(language ? { language } : {}),
  })

  return transcription as any
}

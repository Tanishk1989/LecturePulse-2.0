import { chatCompletion } from '@/services/aiGenerationService'

export interface LiveNotesDraft {
  summary: string
  keyPoints: string[]
  concepts: string[]
}

const EMPTY_DRAFT: LiveNotesDraft = {
  summary: '',
  keyPoints: [],
  concepts: [],
}

function parseDraft(raw: string): LiveNotesDraft {
  try {
    const parsed = JSON.parse(raw) as Partial<LiveNotesDraft>
    return {
      summary: parsed.summary?.trim() ?? '',
      keyPoints: Array.isArray(parsed.keyPoints)
        ? parsed.keyPoints.filter(Boolean).map(String).slice(0, 6)
        : [],
      concepts: Array.isArray(parsed.concepts)
        ? parsed.concepts.filter(Boolean).map(String).slice(0, 8)
        : [],
    }
  } catch {
    return {
      ...EMPTY_DRAFT,
      summary: raw.trim(),
    }
  }
}

export async function generateLiveNotesDraft(transcript: string): Promise<LiveNotesDraft> {
  const trimmed = transcript.trim()
  if (!trimmed) return EMPTY_DRAFT

  const raw = await chatCompletion(
    [
      'You are an expert live academic note-taking scribe.',
      'Your job is to generate a coherent, high-yield running draft of lecture notes based on the transcript recorded so far.',
      'Keep the same language as the lecture (English, Hindi, or Hinglish). Do not translate.',
      'Your output must be a single, valid JSON object matching this schema:',
      '{"summary":"string (a clean 1-2 paragraph description of the topics discussed so far)","keyPoints":["string (3-6 high-yield bullet points summarizing the most important points so far)"],"concepts":["string (3-8 core terms, formulas, or concepts introduced so far)"]}.',
      'Base your response ONLY on the provided lecture transcript text. Do not invent details.',
      'Do not wrap the JSON in markdown code blocks or add any other text.',
    ].join(' '),
    `Lecture so far:\n\n${trimmed.slice(0, 100000)}`,
  )

  return parseDraft(raw)
}

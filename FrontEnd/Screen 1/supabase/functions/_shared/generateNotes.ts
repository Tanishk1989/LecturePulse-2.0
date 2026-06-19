import { groqChatCompletion } from './groq.ts'

export const NOTES_SYSTEM_PROMPT = `You are an expert academic note-taker for LecturePulse students.
Convert lecture transcripts into structured study notes.
Keep the SAME language as the transcript (English, Hindi, or Hinglish). Do not translate.
Return ONLY valid JSON matching this schema:
{
  "summary": "string — 3-6 short paragraphs separated by \\n\\n, easy to read overview",
  "keyConcepts": [{"title": "string", "explanation": "string", "importance": "string"}],
  "importantPoints": ["string"],
  "definitions": [{"term": "string", "definition": "string", "example": "string"}],
  "examples": [{"title": "string", "description": "string", "context": "string"}],
  "questions": [{"difficulty": "easy|medium|hard", "question": "string", "answer": "string"}],
  "examTips": {
    "mostImportant": ["string"],
    "commonMistakes": ["string"],
    "topicsToRevise": ["string"]
  }
}
Rules:
- Generate 4-8 key concepts, 3-6 definitions, 2-5 examples, 6-9 questions (2 easy, 2-3 medium, 2-4 hard).
- Exam tips must NOT predict marks or grades.
- Base everything ONLY on the transcript. Do not invent topics not mentioned.`

function parseJsonFromAi<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0]) as T
    } catch {
      return null
    }
  }
}

export interface StructuredNotesContent {
  summary: string
  keyConcepts: Array<{ title: string; explanation: string; importance: string }>
  importantPoints: string[]
  definitions: Array<{ term: string; definition: string; example: string }>
  examples: Array<{ title: string; description: string; context: string }>
  questions: Array<{ difficulty: string; question: string; answer: string }>
  examTips: {
    mostImportant: string[]
    commonMistakes: string[]
    topicsToRevise: string[]
  }
}

export async function generateStructuredNotes(transcript: string): Promise<StructuredNotesContent> {
  const raw = await groqChatCompletion(
    NOTES_SYSTEM_PROMPT,
    `Generate smart study notes from this lecture transcript:\n\n${transcript}`,
  )

  const parsed = parseJsonFromAi<StructuredNotesContent>(raw)
  if (!parsed) {
    throw new Error('AI returned invalid notes format.')
  }

  return {
    summary: parsed.summary?.trim() ?? '',
    keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
    importantPoints: Array.isArray(parsed.importantPoints) ? parsed.importantPoints : [],
    definitions: Array.isArray(parsed.definitions) ? parsed.definitions : [],
    examples: Array.isArray(parsed.examples) ? parsed.examples : [],
    questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    examTips: {
      mostImportant: parsed.examTips?.mostImportant ?? [],
      commonMistakes: parsed.examTips?.commonMistakes ?? [],
      topicsToRevise: parsed.examTips?.topicsToRevise ?? [],
    },
  }
}

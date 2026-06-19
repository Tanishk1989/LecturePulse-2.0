import { invokeGroqChat, isAiBackendConfigured, AI_UNAVAILABLE_MESSAGE } from '@/lib/groqProxy'
import type { FlashcardInput } from '@/types/flashcard'
import type { StructuredNotesContent } from '@/types/notes'
import { emptyStructuredNotes } from '@/types/notes'

export type { FlashcardInput as Flashcard }

export function isAiGenerationConfigured(): boolean {
  return isAiBackendConfigured()
}

export async function chatCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
  return invokeGroqChat(systemPrompt, userPrompt)
}

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

const NOTES_SYSTEM_PROMPT = `You are an expert academic note-taker for LecturePulse students.
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

export async function generateStructuredNotes(transcript: string): Promise<StructuredNotesContent> {
  if (!transcript.trim()) {
    throw new Error('No transcript available to generate notes.')
  }

  const raw = await chatCompletion(
    NOTES_SYSTEM_PROMPT,
    `Generate smart study notes from this lecture transcript:\n\n${transcript}`,
  )

  const parsed = parseJsonFromAi<StructuredNotesContent>(raw)
  if (!parsed) {
    throw new Error('AI returned invalid notes format. Try again.')
  }

  const base = emptyStructuredNotes()
  return {
    summary: parsed.summary?.trim() ?? base.summary,
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

export async function generateSummary(transcript: string): Promise<string> {
  if (!transcript.trim()) {
    return 'No transcript available to summarize.'
  }

  return chatCompletion(
    'You summarize lecture transcripts for students. Keep the same language as the transcript (English, Hindi, or Hinglish). Do not translate. Write 3-5 concise bullet points covering the key topics.',
    `Summarize this lecture transcript:\n\n${transcript}`,
  )
}

export async function generateFlashcards(transcript: string): Promise<FlashcardInput[]> {
  if (!transcript.trim()) {
    return []
  }

  const raw = await chatCompletion(
    'You create study flashcards from lecture transcripts. Keep the same language as the transcript (English, Hindi, or Hinglish). Do not translate. Return ONLY valid JSON: an array of objects with "front" and "back" string fields. Create 5-8 flashcards.',
    `Create flashcards from this lecture transcript:\n\n${transcript}`,
  )

  try {
    const parsed = JSON.parse(raw) as FlashcardInput[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((card) => card?.front?.trim() && card?.back?.trim())
      .map((card) => ({ front: card.front.trim(), back: card.back.trim() }))
  } catch {
    const match = raw.match(/\[[\s\S]*\]/)
    if (match) {
      try {
        const parsed = JSON.parse(match[0]) as FlashcardInput[]
        return parsed.filter((card) => card?.front?.trim() && card?.back?.trim())
      } catch {
        return []
      }
    }
    return []
  }
}

export async function askAboutNotes(
  transcript: string,
  question: string,
  context?: string,
): Promise<string> {
  const contextBlock = context ? `\n\nRelevant context:\n${context}` : ''
  return chatCompletion(
    'You are a helpful study assistant. Answer using only the lecture transcript and notes context. Keep the same language as the transcript. Be concise and clear.',
    `Transcript:\n${transcript}${contextBlock}\n\nQuestion: ${question}`,
  )
}

export function formatNotesForCopy(content: StructuredNotesContent): string {
  const lines: string[] = ['# Lecture Notes', '']

  if (content.summary) {
    lines.push('## Summary', content.summary, '')
  }

  if (content.keyConcepts.length) {
    lines.push('## Key Concepts')
    content.keyConcepts.forEach((concept) => {
      lines.push(`### ${concept.title}`, concept.explanation, `*Importance:* ${concept.importance}`, '')
    })
  }

  if (content.importantPoints.length) {
    lines.push('## Important Points')
    content.importantPoints.forEach((point) => lines.push(`- ${point}`))
    lines.push('')
  }

  if (content.definitions.length) {
    lines.push('## Definitions')
    content.definitions.forEach((def) => {
      lines.push(`**${def.term}**`, def.definition, `*Example:* ${def.example}`, '')
    })
  }

  if (content.examples.length) {
    lines.push('## Examples')
    content.examples.forEach((ex) => {
      lines.push(`### ${ex.title}`, ex.description, `*Context:* ${ex.context}`, '')
    })
  }

  if (content.questions.length) {
    lines.push('## Questions')
    content.questions.forEach((q) => {
      lines.push(`**[${q.difficulty}]** ${q.question}`, `*Answer:* ${q.answer}`, '')
    })
  }

  if (content.examTips.mostImportant.length || content.examTips.commonMistakes.length) {
    lines.push('## Exam Tips')
    if (content.examTips.mostImportant.length) {
      lines.push('### Most Important')
      content.examTips.mostImportant.forEach((item) => lines.push(`- ${item}`))
    }
    if (content.examTips.commonMistakes.length) {
      lines.push('### Common Mistakes')
      content.examTips.commonMistakes.forEach((item) => lines.push(`- ${item}`))
    }
    if (content.examTips.topicsToRevise.length) {
      lines.push('### Topics to Revise')
      content.examTips.topicsToRevise.forEach((item) => lines.push(`- ${item}`))
    }
  }

  return lines.join('\n')
}

export { AI_UNAVAILABLE_MESSAGE }

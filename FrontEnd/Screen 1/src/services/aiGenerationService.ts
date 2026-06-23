import { invokeGroqChat, isAiBackendConfigured, AI_UNAVAILABLE_MESSAGE } from '@/lib/groqProxy'
import { apiFetch, apiFetchStream } from '@/lib/api'
import type { FlashcardInput } from '@/types/flashcard'
import type { StructuredNotesContent } from '@/types/notes'
import { getCachedProfile } from '@/services/profileService'

export type { FlashcardInput as Flashcard }

export function isAiGenerationConfigured(): boolean {
  return isAiBackendConfigured()
}

export async function chatCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
  return invokeGroqChat(systemPrompt, userPrompt)
}


export async function generateStructuredNotes(transcript: string): Promise<StructuredNotesContent> {
  if (!transcript.trim()) {
    throw new Error('No lecture content available to generate notes.')
  }

  return apiFetch<StructuredNotesContent>('/ai/generate-notes', {
    method: 'POST',
    body: JSON.stringify({ transcript }),
  })
}

export const SUMMARY_SYSTEM_PROMPT = `You are an academic note-taking assistant. Given a lecture transcript, produce structured notes with this format:
1. Identify the 3-7 core concepts covered in the lecture.
2. For each concept, write a clear 1-3 sentence definition or explanation in your own words.
3. Include any specific examples, formulas, dates, or facts the lecturer mentioned, attributed to the relevant concept.
4. End with a short 'Key Takeaways' section (2-4 bullet points) summarizing what a student should remember for an exam.
Do not invent facts, rely only on the transcript.

If any part of the source transcript is ambiguous, unclear, or could be a transcription error (e.g. a term that doesn't make sense in context, a number that seems inconsistent, or a sentence that's hard to interpret), do NOT guess or assume what was meant. Instead, mark that specific piece of content with the tag [unclear from audio] right after it. Never present uncertain or inferred information as a confirmed fact.`

function getSummarySystemPrompt(): string {
  let prompt = SUMMARY_SYSTEM_PROMPT
  const profile = getCachedProfile()
  if (profile && profile.summaryLength) {
    if (profile.summaryLength === 'brief') {
      prompt += '\n\nFormat guidelines: Provide brief, concise summaries. Keep paragraphs short.'
    } else if (profile.summaryLength === 'detailed') {
      prompt += '\n\nFormat guidelines: Provide highly detailed, comprehensive summaries explaining the sub-topics thoroughly.'
    }
  }
  return prompt
}

export async function generateSummary(
  transcript: string,
  options?: { lectureTitle?: string },
): Promise<string> {
  if (!transcript.trim()) {
    return 'No lecture content available to summarize.'
  }

  const titleBlock = options?.lectureTitle ? `Lecture title: ${options.lectureTitle}\n\n` : ''

  return chatCompletion(
    getSummarySystemPrompt(),
    `Summarize this lecture:\n\n${titleBlock}${transcript}`,
  )
}

export async function generateCombinedSummary(content: string): Promise<string> {
  if (!content.trim()) {
    return 'No lecture content available to summarize.'
  }

  return chatCompletion(
    `${getSummarySystemPrompt()}\nIf multiple lectures are included, give a brief overall overview first, then highlight each lecture.`,
    `Summarize these lecture materials:\n\n${content}`,
  )
}

export async function generateSummaryStream(
  transcript: string,
  options: { lectureTitle?: string },
  onChunk: (text: string) => void,
): Promise<void> {
  const titleBlock = options?.lectureTitle ? `Lecture title: ${options.lectureTitle}\n\n` : ''
  const systemPrompt = getSummarySystemPrompt()
  const userPrompt = `Summarize this lecture:\n\n${titleBlock}${transcript}`

  await apiFetchStream('/ai/stream-chat', {
    method: 'POST',
    body: JSON.stringify({ systemPrompt, userPrompt }),
  }, onChunk)
}

export async function generateCombinedSummaryStream(
  content: string,
  onChunk: (text: string) => void,
): Promise<void> {
  const systemPrompt = `${getSummarySystemPrompt()}\nIf multiple lectures are included, give a brief overall overview first, then highlight each lecture.`
  const userPrompt = `Summarize these lecture materials:\n\n${content}`

  await apiFetchStream('/ai/stream-chat', {
    method: 'POST',
    body: JSON.stringify({ systemPrompt, userPrompt }),
  }, onChunk)
}

// ----------------------------------------------------
// Robust JSON Parsing Utilities
// ----------------------------------------------------

export function parseJsonFromAiText<T>(raw: string): T | null {
  let text = raw.trim()

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    text = fenced[1].trim()
  }

  try {
    return JSON.parse(text) as T
  } catch {
    // Attempt balancing extraction for objects and arrays
  }

  const startBrace = text.indexOf('{')
  const startBracket = text.indexOf('[')

  if (startBrace === -1 && startBracket === -1) {
    return null
  }

  const start = (startBrace !== -1 && (startBracket === -1 || startBrace < startBracket)) ? startBrace : startBracket
  const startChar = text[start]
  const endChar = startChar === '{' ? '}' : ']'

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
    } else if (ch === startChar) {
      depth += 1
    } else if (ch === endChar) {
      depth -= 1
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1)) as T
        } catch {
          return null
        }
      }
    }
  }

  return null
}

// ----------------------------------------------------
// Chunking Helper
// ----------------------------------------------------

export async function chunkTranscriptIfLong(transcript: string): Promise<string[]> {
  const words = transcript.trim().split(/\s+/)
  if (words.length <= 3500) {
    return [transcript]
  }

  const systemPrompt = `You are a lecture assistant. Analyze this transcript and identify 2-5 natural topic-based section breaks. For each section break, identify the exact sentence that starts the new topic. Return ONLY a valid JSON array of these starting sentences. Do not wrap in markdown or write other text.`

  try {
    const raw = await chatCompletion(systemPrompt, `Transcript:\n${transcript}`)
    const parsed = parseJsonFromAiText<string[]>(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      const boundaries = parsed
        .map((sentence) => ({ sentence, index: transcript.indexOf(sentence) }))
        .filter((item) => item.index !== -1)
        .sort((a, b) => a.index - b.index)

      if (boundaries.length > 0) {
        const sections: string[] = []
        for (let i = 0; i < boundaries.length; i++) {
          const start = boundaries[i].index
          const end = i < boundaries.length - 1 ? boundaries[i + 1].index : transcript.length
          sections.push(transcript.substring(start, end).trim())
        }
        return sections
      }
    }
  } catch (err) {
    console.error('Failed to split transcript, falling back to word limit:', err)
  }

  const chunks: string[] = []
  const chunkSize = 2000
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '))
  }
  return chunks
}

// ----------------------------------------------------
// Self-Verification Feature & Prompts
// ----------------------------------------------------

export const ENABLE_VERIFICATION_PASS = true

const FLASHCARDS_VERIFICATION_SYSTEM_PROMPT = `You are an academic validator. Compare the generated flashcards JSON against the original lecture transcript.
Your task is to identify any flashcards that contain incorrect facts, hallucinated details, or information not supported by the transcript.
- Strip out any flashcard that is factually incorrect or unsupported.
- If a flashcard is slightly inaccurate but can be corrected using the transcript, modify its "question", "answer", or "concept" fields to make it 100% accurate.
- Maintain the exact same JSON schema: { "flashcards": [ { "question": "string", "answer": "string", "concept": "string" } ] }.
- Return ONLY the clean, verified valid JSON object. Do not include markdown code block fences or any explanation.`

export async function verifyFlashcards(flashcardsJson: string, transcript: string): Promise<string> {
  const userPrompt = `Original Transcript:\n${transcript}\n\nGenerated Flashcards JSON:\n${flashcardsJson}`
  return chatCompletion(FLASHCARDS_VERIFICATION_SYSTEM_PROMPT, userPrompt)
}

const QUIZ_VERIFICATION_SYSTEM_PROMPT = `You are an academic validator. Compare the generated quiz JSON against the original lecture transcript.
Your task is to identify any quiz questions that contain incorrect facts, hallucinated details, or information not supported by the transcript.
- Strip out any quiz question that is factually incorrect or unsupported.
- If a question is slightly inaccurate or has options that don't match the transcript, modify the question, options, correctAnswer, explanation, or concept fields to make it 100% accurate.
- Maintain the exact same JSON schema: { "quiz": [ { "question": "string", "options": ["string"], "correctAnswer": "string", "explanation": "string", "concept": "string" } ] }.
- Return ONLY the clean, verified valid JSON object. Do not include markdown code block fences or any explanation.`

export async function verifyQuiz(quizJson: string, transcript: string): Promise<string> {
  const userPrompt = `Original Transcript:\n${transcript}\n\nGenerated Quiz JSON:\n${quizJson}`
  return chatCompletion(QUIZ_VERIFICATION_SYSTEM_PROMPT, userPrompt)
}

// ----------------------------------------------------
// Flashcards Generation
// ----------------------------------------------------

export const FLASHCARDS_SYSTEM_PROMPT = `You are LecturePulse's Expert Active-Recall Flashcard Creator.
Your mission is to extract the most high-yield concepts, facts, formulas, or details from the transcript and format them into premium study flashcards.
Language Rule: All generated flashcards (questions, answers, concepts) must always be in English, regardless of what language the lecture or transcript is in. Even if the transcript is in Hindi or Hinglish, always generate the flashcards in English. Do NOT translate or write flashcards in Hindi or Hinglish.

Return ONLY a valid JSON object matching the exact schema below. Do not wrap the JSON in markdown code blocks or add any other text.

JSON Schema:
{
  "flashcards": [
    {
      "question": "string - Atomic question that asks exactly one clear concept or scenario-based detail.",
      "answer": "string - Precise direct answer followed by a brief, one-sentence explanatory context to solidify understanding.",
      "concept": "string - The academic concept this flashcard covers."
    }
  ]
}

Constraints & Rules:
1. Minimum Information Principle: Each flashcard must be atomic. It should ask exactly one clear question.
2. Avoid simple definition matching (like "What is X?"). Instead, use conceptual, scenario-based, or completion questions (e.g., "How does X affect Y in scenario Z?" or "What formula is used to calculate X, and what does term Y represent?").
3. Rely ONLY on the provided transcript. Do not invent facts.
4. Output JSON: Do not include markdown code block fences or any commentary. Output only the pure JSON string.
5. Confidence Flagging: If any part of the source transcript is ambiguous, unclear, or could be a transcription error (e.g. a term that doesn't make sense in context, a number that seems inconsistent, or a sentence that's hard to interpret), do NOT guess or assume what was meant. Instead, mark that specific piece of content with the tag [unclear from audio] right after it. Never present uncertain or inferred information as a confirmed fact.`

function getFlashcardsSystemPrompt(): string {
  let prompt = FLASHCARDS_SYSTEM_PROMPT
  const profile = getCachedProfile()
  if (profile && profile.flashcardDifficulty) {
    if (profile.flashcardDifficulty === 'easy') {
      prompt += '\n\nDifficulty guidelines: Target beginner/easy difficulty for the flashcard questions and answers. Focus on basic definitions and core introductory details.'
    } else if (profile.flashcardDifficulty === 'hard') {
      prompt += '\n\nDifficulty guidelines: Target advanced/challenging difficulty for the flashcard questions and answers. Focus on complex edge cases, logic, and deep conceptual scenarios.'
    }
  }
  return prompt
}

async function generateFlashcardsForChunk(chunk: string): Promise<FlashcardInput[]> {
  const userPrompt = `Create active-recall flashcards from this lecture transcript chunk:\n\n${chunk}`

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await chatCompletion(
      getFlashcardsSystemPrompt(),
      attempt === 1
        ? `${userPrompt}\n\nIMPORTANT: You must return ONLY valid JSON matching the specified schema. Do not include markdown code block fences or any commentary.`
        : userPrompt
    )

    const parsed = parseJsonFromAiText<{ flashcards: Array<{ question: string; answer: string; concept?: string | null }> }>(raw)
    if (parsed && Array.isArray(parsed.flashcards)) {
      return parsed.flashcards
        .filter(c => c?.question?.trim() && c?.answer?.trim())
        .map(c => ({
          front: c.question.trim(),
          back: c.answer.trim(),
          concept: c.concept?.trim() || null
        }))
    }
  }

  return []
}

export async function generateFlashcards(transcript: string): Promise<FlashcardInput[]> {
  if (!transcript.trim()) {
    return []
  }

  const chunks = await chunkTranscriptIfLong(transcript)

  let combinedCards: FlashcardInput[] = []

  for (const chunk of chunks) {
    const chunkCards = await generateFlashcardsForChunk(chunk)
    combinedCards = combinedCards.concat(chunkCards)
  }

  if (combinedCards.length === 0) {
    return []
  }

  if (ENABLE_VERIFICATION_PASS) {
    try {
      const schemaCards = combinedCards.map(c => ({
        question: c.front,
        answer: c.back,
        concept: c.concept || ''
      }))
      const flashcardsJsonString = JSON.stringify({ flashcards: schemaCards }, null, 2)
      const verifiedRaw = await verifyFlashcards(flashcardsJsonString, transcript)
      const verifiedParsed = parseJsonFromAiText<{ flashcards: Array<{ question: string; answer: string; concept?: string | null }> }>(verifiedRaw)
      if (verifiedParsed && Array.isArray(verifiedParsed.flashcards)) {
        return verifiedParsed.flashcards
          .filter(c => c?.question?.trim() && c?.answer?.trim())
          .map(c => ({
            front: c.question.trim(),
            back: c.answer.trim(),
            concept: c.concept?.trim() || null
          }))
      }
    } catch (err) {
      console.error('Flashcards self-verification failed, falling back to unverified:', err)
    }
  }

  return combinedCards
}

export async function generateFlashcardFromExcerpt(
  excerpt: string,
  lectureContext?: string,
): Promise<FlashcardInput | null> {
  if (!excerpt.trim()) return null

  const contextBlock = lectureContext?.trim()
    ? `\n\nFull lecture context (for grounding only):\n${lectureContext.slice(0, 8000)}`
    : ''

  const raw = await chatCompletion(
    [
      'You are LecturePulse\'s flashcard creator.',
      'Create exactly ONE high-quality study flashcard from the provided excerpt.',
      'Return ONLY valid JSON: {"front":"question","back":"answer with brief context"}',
      'No markdown fences or commentary.',
      'Language Rule: The flashcard must be in English, regardless of the excerpt language. Do NOT use Hindi or Hinglish.',
    ].join('\n'),
    `Excerpt:\n"${excerpt}"${contextBlock}`,
  )

  try {
    const parsed = parseJsonFromAiText<FlashcardInput>(raw)
    if (parsed?.front?.trim() && parsed?.back?.trim()) {
      return { front: parsed.front.trim(), back: parsed.back.trim() }
    }
  } catch {
    // fall through
  }

  const cards = await generateFlashcards(`Focus only on this excerpt:\n"${excerpt}"`)
  return cards[0] ?? null
}

// ----------------------------------------------------
// Quiz Generation
// ----------------------------------------------------

export interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
  concept?: string | null
}

export const QUIZ_SYSTEM_PROMPT = `You are LecturePulse's Expert Quiz Creator.
Your mission is to generate a comprehensive, high-quality assessment quiz from the lecture transcript.
Language Rule: All quiz questions, options, answers, and explanations must always be in English, regardless of what language the lecture or transcript is in. Even if the transcript is in Hindi or Hinglish, always generate the quiz in English. Do NOT translate or write quiz questions in Hindi or Hinglish.

Return ONLY a valid JSON object matching the exact schema below. Do not wrap the JSON in markdown code blocks or add any other text.

JSON Schema:
{
  "quiz": [
    {
      "question": "string - Clear, thought-provoking multiple-choice question assessing comprehension of core concepts, terminology, or application.",
      "options": ["string - Exactly 4 options, clear and plausible but with only one correct option."],
      "correctAnswer": "string - The exact option text from the options array that represents the correct answer.",
      "explanation": "string - A concise 1-2 sentence explanation of why the answer is correct and why the distractors are incorrect, grounded in the lecture transcript.",
      "concept": "string - The academic concept or topic name this question relates to."
    }
  ]
}

Constraints & Rules:
1. Grounding: Rely ONLY on facts present in the transcript. Do not invent details or test external facts.
2. Options: Each question must have exactly 4 choices in the options array.
3. Correct Answer: The "correctAnswer" value must exactly match one of the items inside the "options" array.
4. Output JSON: Do not include markdown code block fences or any commentary. Output only the pure JSON string.
5. Confidence Flagging: If any part of the source transcript is ambiguous, unclear, or could be a transcription error (e.g. a term that doesn't make sense in context, a number that seems inconsistent, or a sentence that's hard to interpret), do NOT guess or assume what was meant. Instead, mark that specific piece of content with the tag [unclear from audio] right after it. Never present uncertain or inferred information as a confirmed fact.`

async function generateQuizForChunk(chunk: string): Promise<QuizQuestion[]> {
  const userPrompt = `Create a quiz from this lecture transcript chunk:\n\n${chunk}`

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await chatCompletion(
      QUIZ_SYSTEM_PROMPT,
      attempt === 1
        ? `${userPrompt}\n\nIMPORTANT: You must return ONLY valid JSON matching the specified schema. Do not include markdown code block fences or any commentary.`
        : userPrompt
    )

    const parsed = parseJsonFromAiText<{ quiz: QuizQuestion[] }>(raw)
    if (parsed && Array.isArray(parsed.quiz)) {
      return parsed.quiz.filter(q => q?.question?.trim() && Array.isArray(q.options) && q.options.length > 0)
    }
  }

  return []
}

export async function generateQuiz(transcript: string): Promise<QuizQuestion[]> {
  if (!transcript.trim()) {
    return []
  }

  const chunks = await chunkTranscriptIfLong(transcript)

  let combinedQuizQuestions: QuizQuestion[] = []

  for (const chunk of chunks) {
    const chunkQuestions = await generateQuizForChunk(chunk)
    combinedQuizQuestions = combinedQuizQuestions.concat(chunkQuestions)
  }

  if (combinedQuizQuestions.length === 0) {
    return []
  }

  if (ENABLE_VERIFICATION_PASS) {
    try {
      const quizJsonString = JSON.stringify({ quiz: combinedQuizQuestions }, null, 2)
      const verifiedRaw = await verifyQuiz(quizJsonString, transcript)
      const verifiedParsed = parseJsonFromAiText<{ quiz: QuizQuestion[] }>(verifiedRaw)
      if (verifiedParsed && Array.isArray(verifiedParsed.quiz)) {
        return verifiedParsed.quiz.filter(q => q?.question?.trim() && Array.isArray(q.options) && q.options.length > 0)
      }
    } catch (err) {
      console.error('Quiz self-verification failed, falling back to unverified:', err)
    }
  }

  return combinedQuizQuestions
}

export async function generateConceptQuiz(
  conceptName: string,
  conceptDescription: string,
  transcript: string,
  questionCount = 4,
): Promise<QuizQuestion[]> {
  if (!transcript.trim()) return []

  const systemPrompt = `${QUIZ_SYSTEM_PROMPT}

Additional constraints:
- Generate exactly ${questionCount} questions focused ONLY on the concept "${conceptName}".
- Every question must test understanding of this specific concept and use only transcript content relevant to it.
- Set the "concept" field to "${conceptName}" for every question.`

  const userPrompt = `Concept: ${conceptName}
Description: ${conceptDescription}

Create a focused quiz from the transcript below. Only test this concept.

Transcript:
${transcript.slice(0, 60000)}`

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await chatCompletion(
      systemPrompt,
      attempt === 1
        ? `${userPrompt}\n\nIMPORTANT: Return ONLY valid JSON with exactly ${questionCount} questions.`
        : userPrompt,
    )

    const parsed = parseJsonFromAiText<{ quiz: QuizQuestion[] }>(raw)
    if (parsed && Array.isArray(parsed.quiz)) {
      return parsed.quiz
        .filter((q) => q?.question?.trim() && Array.isArray(q.options) && q.options.length > 0)
        .slice(0, questionCount)
        .map((q) => ({ ...q, concept: conceptName }))
    }
  }

  return []
}

export async function askAboutNotes(
  transcript: string,
  question: string,
  context?: string,
): Promise<string> {
  const contextBlock = context ? `\n\nRelevant context:\n${context}` : ''
  return chatCompletion(
    [
      'You are LecturePulse\'s Advanced Q&A Study Assistant.',
      'Your role is to answer the student\'s question precisely, using only the provided lecture transcript and notes context.',
      'Guidelines:',
      '- Grounding: Ground your answer strictly in the provided text. If the answer is not mentioned, state: "This concept isn\'t covered in the lecture materials. Let me know if you would like general educational guidance on it."',
      '- Formatting: Use clear headings, bold keywords, and syntax-highlighted code blocks or structured lists to make your answers easy to scan.',
      '- Language: Always respond in English, regardless of the language of the lecture materials or transcript. Do NOT respond in Hindi or Hinglish.',
      '- Conciseness: Be concise, clear, and direct. Avoid fluff.'
    ].join('\n'),
    `Lecture content:\n${transcript}${contextBlock}\n\nQuestion: ${question}`,
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

  if (content.examples?.length) {
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

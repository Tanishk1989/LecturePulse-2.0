import { chatCompletion } from '@/services/aiGenerationService'
import { getUserNotes } from '@/services/notesService'
import { retrieveRagContext } from '@/services/translationService'
import { apiFetch, apiFetchStream } from '@/lib/api'
import { auth } from '@/lib/firebase'
import { getOutputLanguagePreference } from '@/lib/processingPreferences'
import type { LectureRecording } from '@/types/lecture'
import { getCachedProfile } from '@/services/profileService'

const MAX_LECTURES = 5

export interface TutorMessage {
  role: 'user' | 'assistant' | 'context-notice'
  content: string
  isStreaming?: boolean
  hasError?: boolean
}

const TUTOR_SYSTEM_PROMPT_TEMPLATE = `You are an AI tutor helping a student understand their lecture material. You have access to relevant excerpts from their lecture transcript below. Follow these principles:
1. Explain concepts clearly and at a level appropriate for a student learning the material, not an expert.
2. If the student's question is ambiguous or could mean multiple things, ask a brief clarifying question before answering at length.
3. Don't just give direct answers to exam-style questions — guide the student toward understanding, using questions or hints first if appropriate, unless they explicitly ask for a direct answer.
4. Ground your answers in the provided lecture excerpts. If the question goes beyond what's in the transcript, say so clearly rather than inventing an answer, and offer to explain the general concept if you can.
5. Keep responses conversational and encouraging, not robotic or overly formal.

Formatting & Visual Hierarchy:
- Structure responses beautifully using GitHub-style markdown.
- Use clear sub-headings (###), bold terms for core vocabulary, structured lists, and syntax-highlighted code blocks for programming or formulas.
- For key definitions or critical formulas, call them out clearly using blockquotes or standard markdown highlights.

Bilingual & Hinglish Support:
{languageDirective}

Relevant lecture excerpts:
{relevantChunks}

Directives for Specific Task Formats:
- **Summarize Request**: Output a structured summary containing (1) a brief executive overview, (2) key takeaways grouped by major topics, and (3) a list of open issues or next steps.
- **Flashcard Generation Request**: Output 3-5 flashcard pairs formatted cleanly as bullet points:
  * **Front**: [Highly targeted, atomic question]
  * **Back**: [Clear, concise answer with context]
- **Identify Weak Areas**: Analyze the transcript/notes, look for topics that are briefly introduced, highly complex, or lack complete examples, and suggest a targeted study plan for those areas.`

function getLanguageDirective(): string {
  const uid = auth.currentUser?.uid
  const outputLanguage = uid ? getOutputLanguagePreference(uid) : 'en'

  if (outputLanguage === 'match') {
    return `- Keep the native language of the lecture materials (English, Hindi, or Hinglish).
- If the material or conversation includes Hinglish (Hindi in the Latin script), respond in fluent, natural, conversational Hinglish. Do not force English.`
  }

  return `- Always respond in English only, regardless of the lecture language.
- Do not use Hindi, Hinglish, or Devanagari script unless the student explicitly asks for another language.`
}

function getSystemPrompt(relevantChunks: string): string {
  let basePrompt = TUTOR_SYSTEM_PROMPT_TEMPLATE
    .replace('{relevantChunks}', relevantChunks)
    .replace('{languageDirective}', getLanguageDirective())
  const profile = getCachedProfile()
  if (profile && profile.tutorStyle) {
    if (profile.tutorStyle === 'socratic') {
      basePrompt += '\n\nTUTOR STYLE DIRECTIVE: You MUST act as a Socratic Tutor. Do not give direct explanations or direct answers immediately. Instead, ask probing, guidance questions that lead the student to discover the answers themselves. Use analogies and break down complex problems into step-by-step thinking paths.'
    } else if (profile.tutorStyle === 'direct') {
      basePrompt += '\n\nTUTOR STYLE DIRECTIVE: You MUST act as a Direct/Informative Tutor. Give straight-to-the-point, clear, and comprehensive answers immediately. Skip leading questions or hints unless explicitly asked for.'
    } else if (profile.tutorStyle === 'balanced') {
      basePrompt += '\n\nTUTOR STYLE DIRECTIVE: You MUST act as a Balanced Tutor. Mix direct explanations with interactive prompts, guiding hints, and questions to keep the student engaged while ensuring they get answers.'
    }
  }
  return basePrompt
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

interface LectureInfo {
  title: string
  transcript: string
  summary: string | null
}

export function parseLectureContext(lectureContext: string): LectureInfo[] {
  const blocks = lectureContext.split('\n\n---\n\n').filter((b) => b.trim().length > 0)
  return blocks.map((block) => {
    // Check if there is notes summary
    const parts = block.split('\n\nNotes summary:\n')
    const transcriptPart = parts[0]
    const summary = parts[1]?.trim() || null

    // Extract title from the first line
    const lines = transcriptPart.split('\n')
    const firstLine = lines[0] ?? ''
    const title = firstLine.startsWith('## ') ? firstLine.slice(3).trim() : 'Lecture'

    // The rest is the transcript
    const transcript = lines.slice(1).join('\n').trim()

    return { title, transcript, summary }
  })
}

function splitTranscriptIntoChunks(transcript: string): string[] {
  // Try to split by double newlines first
  let chunks = transcript.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 0)

  // If we end up with very few or single chunk because of formatting, let's split by single newlines
  if (chunks.length <= 2) {
    chunks = transcript.split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 0)
  }

  // If still very few chunks, split by word count (e.g., ~150 words per chunk)
  if (chunks.length <= 2) {
    const words = transcript.split(/\s+/)
    if (words.length > 200) {
      chunks = []
      const chunkSize = 150
      for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(words.slice(i, i + chunkSize).join(' '))
      }
    }
  }

  return chunks
}

function getRelevanceScore(chunk: string, question: string): number {
  const chunkText = chunk.toLowerCase()
  const questionText = question.toLowerCase()

  const stopWords = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'cannot', 'could', 'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down',
    'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent',
    'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres', 'hers', 'herself', 'him', 'himself',
    'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isnt', 'it', 'its',
    'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off',
    'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
    'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than',
    'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these',
    'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too', 'under',
    'until', 'up', 'very', 'was', 'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'werent', 'what', 'whats',
    'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom', 'why', 'whys', 'with',
    'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve', 'your', 'yours', 'yourself',
    'yourselves'
  ])

  const words = questionText
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w))

  if (words.length === 0) {
    const allWords = questionText
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 0)

    let score = 0
    for (const word of allWords) {
      if (chunkText.includes(word)) {
        score += 1
      }
    }
    return score
  }

  let score = 0
  for (const word of words) {
    const regex = new RegExp(`\\b${word}\\b`, 'g')
    const matches = chunkText.match(regex)
    if (matches) {
      score += matches.length
    } else if (chunkText.includes(word)) {
      score += 0.5
    }
  }

  return score
}

interface ChunkWithScore {
  chunk: string
  score: number
  lectureTitle: string
}

export async function retrieveRelevantChunksHybrid(
  question: string,
  lectureContext: string,
  lectureIds: string[] = [],
): Promise<{ context: string; usedFallback: boolean }> {
  if (lectureIds.length > 0) {
    try {
      const chunks = await retrieveRagContext(question, lectureIds, 6)
      if (chunks.length > 0) {
        const contextString = chunks
          .map((chunk) => `[From Lecture: ${chunk.lectureTitle}]\n${chunk.text}`)
          .join('\n\n')
        return { context: contextString, usedFallback: false }
      }
    } catch (error) {
      console.warn('Vector RAG failed, using keyword fallback:', error)
    }
  }

  return retrieveRelevantChunks(question, lectureContext)
}

export function retrieveRelevantChunks(
  question: string,
  lectureContext: string,
): { context: string; usedFallback: boolean } {
  try {
    const lectures = parseLectureContext(lectureContext)
    const allChunksWithScore: ChunkWithScore[] = []

    for (const lecture of lectures) {
      const chunks = splitTranscriptIntoChunks(lecture.transcript)
      for (const chunk of chunks) {
        const score = getRelevanceScore(chunk, question)
        allChunksWithScore.push({
          chunk: `[From Lecture: ${lecture.title}]\n${chunk}`,
          score,
          lectureTitle: lecture.title,
        })
      }
    }

    // Sort by score descending
    allChunksWithScore.sort((a, b) => b.score - a.score)

    // Check if we have good matches
    const topMatches = allChunksWithScore.filter((item) => item.score > 0).slice(0, 4)

    if (topMatches.length > 0) {
      const contextString = topMatches.map((item) => item.chunk).join('\n\n')
      return { context: contextString, usedFallback: false }
    }
  } catch (err) {
    console.error('Error during chunk retrieval:', err)
  }

  // Fallback to summaries
  try {
    const lectures = parseLectureContext(lectureContext)
    const summaries = lectures
      .map((l) => (l.summary ? `[Summary for Lecture: ${l.title}]\n${l.summary}` : null))
      .filter(Boolean) as string[]

    if (summaries.length > 0) {
      return { context: summaries.join('\n\n'), usedFallback: true }
    }
  } catch (err) {
    console.error('Error getting summaries fallback:', err)
  }

  // Final fallback: use truncated full context if summary also doesn't exist
  return { context: lectureContext.slice(0, 4000), usedFallback: true }
}

export async function buildTutorContext(
  userId: string,
  lectures: LectureRecording[],
): Promise<string> {
  const isSingleLecture = lectures.length === 1
  const transcriptLimit = isSingleLecture ? 100000 : 20000
  const notesLimit = isSingleLecture ? 10000 : 5000

  const transcripts = await apiFetch<Array<{ lectureId: string; fullText: string | null }>>('/transcripts')

  const transcriptMap = new Map<string, string>()
  for (const row of transcripts ?? []) {
    const text = row.fullText?.trim()
    if (text) transcriptMap.set(row.lectureId, text)
  }

  const lecturesWithTranscripts = lectures.filter((lecture) => transcriptMap.has(lecture.id))

  if (lecturesWithTranscripts.length === 0) {
    return ''
  }

  const notes = await getUserNotes(userId)
  const notesByLecture = new Map(notes.map((note) => [note.lectureId, note]))

  const blocks = lecturesWithTranscripts.slice(0, MAX_LECTURES).map((lecture) => {
    const transcript = transcriptMap.get(lecture.id)!
    const note = notesByLecture.get(lecture.id)
    const notesSummary =
      note?.status === 'completed' && note.content.summary.trim()
        ? truncate(note.content.summary, notesLimit)
        : null

    let block = `## ${lecture.title}\n${truncate(transcript, transcriptLimit)}`
    if (notesSummary) {
      block += `\n\nNotes summary:\n${notesSummary}`
    }
    return block
  })

  return blocks.join('\n\n---\n\n')
}

export async function askTutorQuestion(
  question: string,
  lectureContext: string,
  history: TutorMessage[] = [],
  lectureIds: string[] = [],
): Promise<string> {
  if (!lectureContext.trim()) {
    throw new Error(
      'No lecture content found. Record or upload a lecture first.',
    )
  }

  let relevantChunks = ''
  try {
    const res = await retrieveRelevantChunksHybrid(question, lectureContext, lectureIds)
    relevantChunks = res.context
  } catch (err) {
    console.error('Error during retrieveRelevantChunks:', err)
    relevantChunks = lectureContext.slice(0, 4000)
  }

  const systemPrompt = getSystemPrompt(relevantChunks)

  const historyBlock = history
    .slice(-8)
    .map((message) => `${message.role === 'user' ? 'Student' : 'Tutor'}: ${message.content}`)
    .join('\n')

  const userPrompt = [
    historyBlock ? `Recent conversation:\n${historyBlock}\n` : '',
    `Student's Question: ${question}`,
  ]
    .filter(Boolean)
    .join('\n')

  return chatCompletion(systemPrompt, userPrompt)
}

export async function askAboutTranscript(
  transcript: string,
  question: string,
  options?: { notesContext?: string; lectureId?: string },
): Promise<string> {
  if (!transcript.trim()) {
    throw new Error('Lecture not ready yet. Wait for processing to finish.')
  }

  let lectureContext = `## Lecture\n${transcript}`
  if (options?.notesContext) {
    lectureContext += `\n\nNotes summary:\n${options.notesContext}`
  }

  let relevantChunks = ''
  try {
    const res = await retrieveRelevantChunksHybrid(
      question,
      lectureContext,
      options?.lectureId ? [options.lectureId] : [],
    )
    relevantChunks = res.context
  } catch (err) {
    console.error('Error during retrieveRelevantChunks:', err)
    relevantChunks = lectureContext.slice(0, 4000)
  }

  const systemPrompt = getSystemPrompt(relevantChunks)

  return chatCompletion(
    systemPrompt,
    `Student's Question: ${question}`,
  )
}

export async function askTutorQuestionStream(
  question: string,
  lectureContext: string,
  history: TutorMessage[] = [],
  onChunk: (text: string) => void,
  lectureIds: string[] = [],
): Promise<void> {
  if (!lectureContext.trim()) {
    throw new Error(
      'No lecture content found. Record or upload a lecture first.',
    )
  }

  let relevantChunks = ''
  try {
    const res = await retrieveRelevantChunksHybrid(question, lectureContext, lectureIds)
    relevantChunks = res.context
  } catch (err) {
    console.error('Error during retrieveRelevantChunks:', err)
    relevantChunks = lectureContext.slice(0, 4000)
  }

  const systemPrompt = getSystemPrompt(relevantChunks)

  const historyBlock = history
    .slice(-8)
    .map((message) => `${message.role === 'user' ? 'Student' : 'Tutor'}: ${message.content}`)
    .join('\n')

  const userPrompt = [
    historyBlock ? `Recent conversation:\n${historyBlock}\n` : '',
    `Student's Question: ${question}`,
  ]
    .filter(Boolean)
    .join('\n')

  await apiFetchStream('/ai/stream-chat', {
    method: 'POST',
    body: JSON.stringify({
      systemPrompt,
      userPrompt,
      outputLanguage: auth.currentUser?.uid
        ? getOutputLanguagePreference(auth.currentUser.uid)
        : 'en',
    }),
  }, onChunk)
}

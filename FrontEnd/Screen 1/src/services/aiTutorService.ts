import { chatCompletion } from '@/services/aiGenerationService'
import { getUserNotes } from '@/services/notesService'
import { supabase } from '@/lib/supabase'
import type { LectureRecording } from '@/types/lecture'

const MAX_LECTURES = 5
const TRANSCRIPT_EXCERPT = 2500
const NOTES_EXCERPT = 800

export interface TutorMessage {
  role: 'user' | 'assistant'
  content: string
}

const TUTOR_SYSTEM_PROMPT = `You are LecturePulse AI Tutor — a helpful study assistant for university students.
Answer using ONLY the lecture materials provided below. Keep the same language as the lectures (English, Hindi, or Hinglish). Do not translate.
Be concise, clear, and educational. If the answer is not in the materials, say so and suggest what to review.
For flashcard requests, output 3-5 flashcard pairs as bullet points labeled Front / Back.
For summarize requests, give a concise bullet summary across available lectures.
For weak-area requests, infer topics that seem complex or under-explained from the material.`

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

export async function buildTutorContext(
  userId: string,
  lectures: LectureRecording[],
): Promise<string> {
  if (!supabase) return ''

  const { data: transcripts, error } = await supabase
    .from('transcripts')
    .select('lecture_id, full_text, status')
    .eq('user_id', userId)
    .eq('status', 'completed')

  if (error) {
    throw new Error(error.message || 'Failed to load lecture transcripts.')
  }

  const transcriptMap = new Map<string, string>()
  for (const row of transcripts ?? []) {
    const typed = row as { lecture_id: string; full_text: string | null }
    const text = typed.full_text?.trim()
    if (text) transcriptMap.set(typed.lecture_id, text)
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
        ? truncate(note.content.summary, NOTES_EXCERPT)
        : null

    let block = `## ${lecture.title}\n${truncate(transcript, TRANSCRIPT_EXCERPT)}`
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
): Promise<string> {
  if (!lectureContext.trim()) {
    throw new Error(
      'No lecture transcripts found. Record or upload a lecture and transcribe it first.',
    )
  }

  const historyBlock = history
    .slice(-6)
    .map((message) => `${message.role === 'user' ? 'Student' : 'Tutor'}: ${message.content}`)
    .join('\n')

  const userPrompt = [
    `Lecture materials:\n${lectureContext}`,
    historyBlock ? `\nRecent conversation:\n${historyBlock}` : '',
    `\nQuestion: ${question}`,
  ]
    .filter(Boolean)
    .join('\n')

  return chatCompletion(TUTOR_SYSTEM_PROMPT, userPrompt)
}

export async function askAboutTranscript(
  transcript: string,
  question: string,
  options?: { notesContext?: string },
): Promise<string> {
  if (!transcript.trim()) {
    throw new Error('Transcript not ready. Complete transcription first.')
  }

  const contextBlock = options?.notesContext
    ? `\n\nRelevant notes:\n${options.notesContext}`
    : ''

  return chatCompletion(
    'You are a helpful study assistant for this lecture. Answer using only the transcript and notes context. Keep the same language as the transcript. Be concise and clear.',
    `Transcript:\n${transcript}${contextBlock}\n\nQuestion: ${question}`,
  )
}

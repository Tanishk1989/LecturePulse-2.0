import { apiFetch } from '@/lib/api'
import type {
  CreateNotesInput,
  LectureNotes,
  LectureNotesRow,
  StructuredNotesContent,
  NotesStatus,
} from '@/types/notes'
import { emptyStructuredNotes, mapRowToNotes } from '@/types/notes'

export async function getNotesByLectureId(
  userId: string,
  lectureId: string,
): Promise<LectureNotes | null> {
  try {
    const data = await apiFetch<LectureNotesRow>(`/notes/lecture/${lectureId}`)
    return mapRowToNotes(data)
  } catch {
    return null
  }
}

export async function getUserNotes(userId: string): Promise<LectureNotes[]> {
  try {
    const data = await apiFetch<LectureNotesRow[]>('/notes')
    return data.map(mapRowToNotes)
  } catch {
    return []
  }
}

export async function getNotesCount(userId: string): Promise<number> {
  try {
    const notes = await getUserNotes(userId)
    return notes.filter((n) => n.status === 'completed').length
  } catch {
    return 0
  }
}

export async function createNotes(input: CreateNotesInput): Promise<LectureNotes> {
  const content = { ...emptyStructuredNotes(), ...input.content }
  const payload = {
    lectureId: input.lectureId,
    summary: content.summary,
    keyConcepts: content.keyConcepts,
    importantPoints: content.importantPoints,
    definitions: content.definitions,
    examples: content.examples,
    mindMap: content.mindMap,
    questions: content.questions,
    examTips: content.examTips,
    status: input.status ?? 'generating',
    errorMessage: input.errorMessage ?? null,
  }

  const data = await apiFetch<LectureNotesRow>('/notes', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return mapRowToNotes(data)
}

export async function updateNotes(
  notesId: string,
  userId: string,
  updates: {
    content?: Partial<StructuredNotesContent>
    status?: NotesStatus
    errorMessage?: string | null
  },
): Promise<LectureNotes> {
  const payload: Record<string, unknown> = {}

  if (updates.content) {
    if (updates.content.summary !== undefined) payload.summary = updates.content.summary
    if (updates.content.keyConcepts !== undefined) payload.keyConcepts = updates.content.keyConcepts
    if (updates.content.importantPoints !== undefined) {
      payload.importantPoints = updates.content.importantPoints
    }
    if (updates.content.definitions !== undefined) payload.definitions = updates.content.definitions
    if (updates.content.examples !== undefined) payload.examples = updates.content.examples
    if (updates.content.mindMap !== undefined) payload.mindMap = updates.content.mindMap
    if (updates.content.questions !== undefined) payload.questions = updates.content.questions
    if (updates.content.examTips !== undefined) payload.examTips = updates.content.examTips
  }

  if (updates.status !== undefined) payload.status = updates.status
  if (updates.errorMessage !== undefined) payload.errorMessage = updates.errorMessage

  const data = await apiFetch<LectureNotesRow>(`/notes/${notesId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

  return mapRowToNotes(data)
}

export async function saveNotesContent(
  notesId: string,
  userId: string,
  content: StructuredNotesContent,
): Promise<LectureNotes> {
  return updateNotes(notesId, userId, {
    content,
    status: 'completed',
    errorMessage: null,
  })
}

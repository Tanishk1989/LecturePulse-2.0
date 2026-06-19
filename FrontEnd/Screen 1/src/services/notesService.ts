import { supabase } from '@/lib/supabase'
import type {
  CreateNotesInput,
  LectureNotes,
  LectureNotesRow,
  StructuredNotesContent,
  NotesStatus,
} from '@/types/notes'
import { emptyStructuredNotes, mapRowToNotes } from '@/types/notes'

function rowPayload(content: StructuredNotesContent, status?: NotesStatus, errorMessage?: string | null) {
  return {
    summary: content.summary,
    key_concepts: content.keyConcepts,
    important_points: content.importantPoints,
    definitions: content.definitions,
    examples: content.examples,
    questions: content.questions,
    exam_tips: content.examTips,
    status: status ?? 'completed',
    error_message: errorMessage ?? null,
    updated_at: new Date().toISOString(),
  }
}

export async function getNotesByLectureId(
  userId: string,
  lectureId: string,
): Promise<LectureNotes | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('lecture_notes')
    .select('*')
    .eq('lecture_id', lectureId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'Failed to load notes.')
  }

  if (!data) return null
  return mapRowToNotes(data as LectureNotesRow)
}

export async function getUserNotes(userId: string): Promise<LectureNotes[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('lecture_notes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to load notes.')
  }

  return (data as LectureNotesRow[]).map(mapRowToNotes)
}

export async function getNotesCount(userId: string): Promise<number> {
  if (!supabase) return 0

  const { count, error } = await supabase
    .from('lecture_notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')

  if (error) {
    throw new Error(error.message || 'Failed to count notes.')
  }

  return count ?? 0
}

export async function createNotes(input: CreateNotesInput): Promise<LectureNotes> {
  if (!supabase) {
    throw new Error('Storage unavailable. Check your Supabase configuration.')
  }

  const content = { ...emptyStructuredNotes(), ...input.content }
  const payload = {
    lecture_id: input.lectureId,
    user_id: input.userId,
    ...rowPayload(content, input.status ?? 'generating', input.errorMessage),
  }

  const { data, error } = await supabase
    .from('lecture_notes')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to create notes record.')
  }

  return mapRowToNotes(data as LectureNotesRow)
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
  if (!supabase) {
    throw new Error('Storage unavailable. Check your Supabase configuration.')
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.content) {
    if (updates.content.summary !== undefined) payload.summary = updates.content.summary
    if (updates.content.keyConcepts !== undefined) payload.key_concepts = updates.content.keyConcepts
    if (updates.content.importantPoints !== undefined) {
      payload.important_points = updates.content.importantPoints
    }
    if (updates.content.definitions !== undefined) payload.definitions = updates.content.definitions
    if (updates.content.examples !== undefined) payload.examples = updates.content.examples
    if (updates.content.questions !== undefined) payload.questions = updates.content.questions
    if (updates.content.examTips !== undefined) payload.exam_tips = updates.content.examTips
  }

  if (updates.status !== undefined) payload.status = updates.status
  if (updates.errorMessage !== undefined) payload.error_message = updates.errorMessage

  const { data, error } = await supabase
    .from('lecture_notes')
    .update(payload)
    .eq('id', notesId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to update notes.')
  }

  return mapRowToNotes(data as LectureNotesRow)
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

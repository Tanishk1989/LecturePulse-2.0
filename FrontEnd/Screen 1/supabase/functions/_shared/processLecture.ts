import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { generateStructuredNotes } from './generateNotes.ts'
import { groqTranscribeUrl } from './groq.ts'
import { extractPdfTextFromUrl } from './pdfExtract.ts'
import { isYouTubeUrl, resolveYouTubeTranscriptionUrl } from './youtube.ts'

interface LectureRow {
  id: string
  user_id: string
  title: string
  file_type: string
  file_url: string
  status: string
  source: string
}

interface TranscriptRow {
  id: string
  full_text: string
  status: string
}

interface NotesRow {
  id: string
  status: string
}

export interface ProcessLectureOptions {
  generateNotes?: boolean
  forceRetranscribe?: boolean
}

async function getLecture(
  admin: SupabaseClient,
  lectureId: string,
  userId: string,
): Promise<LectureRow> {
  const { data, error } = await admin
    .from('lectures')
    .select('id, user_id, title, file_type, file_url, status, source')
    .eq('id', lectureId)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    throw new Error('Lecture not found.')
  }

  return data as LectureRow
}

async function getTranscript(
  admin: SupabaseClient,
  lectureId: string,
): Promise<TranscriptRow | null> {
  const { data } = await admin
    .from('transcripts')
    .select('id, full_text, status')
    .eq('lecture_id', lectureId)
    .maybeSingle()

  return (data as TranscriptRow | null) ?? null
}

async function getNotes(admin: SupabaseClient, lectureId: string): Promise<NotesRow | null> {
  const { data } = await admin
    .from('lecture_notes')
    .select('id, status')
    .eq('lecture_id', lectureId)
    .maybeSingle()

  return (data as NotesRow | null) ?? null
}

async function upsertTranscriptProcessing(
  admin: SupabaseClient,
  lectureId: string,
  userId: string,
  existing: TranscriptRow | null,
): Promise<string> {
  if (existing) {
    await admin
      .from('transcripts')
      .update({
        status: 'processing',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    return existing.id
  }

  const { data, error } = await admin
    .from('transcripts')
    .insert({
      lecture_id: lectureId,
      user_id: userId,
      full_text: '',
      segments: [],
      status: 'processing',
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create transcript record.')
  }

  return (data as { id: string }).id
}

async function saveTranscript(
  admin: SupabaseClient,
  transcriptId: string,
  payload: {
    text: string
    language?: string | null
    durationSeconds?: number | null
    segments?: unknown[]
  },
): Promise<void> {
  const { error } = await admin
    .from('transcripts')
    .update({
      full_text: payload.text,
      language: payload.language ?? null,
      duration_seconds: payload.durationSeconds ?? null,
      segments: payload.segments ?? [],
      status: 'completed',
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transcriptId)

  if (error) {
    throw new Error(error.message)
  }
}

async function failTranscript(
  admin: SupabaseClient,
  transcriptId: string,
  message: string,
): Promise<void> {
  await admin
    .from('transcripts')
    .update({
      status: 'failed',
      error_message: message,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transcriptId)
}

async function upsertNotesGenerating(
  admin: SupabaseClient,
  lectureId: string,
  userId: string,
  existing: NotesRow | null,
): Promise<string> {
  if (existing) {
    await admin
      .from('lecture_notes')
      .update({
        status: 'generating',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    return existing.id
  }

  const { data, error } = await admin
    .from('lecture_notes')
    .insert({
      lecture_id: lectureId,
      user_id: userId,
      status: 'generating',
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create notes record.')
  }

  return (data as { id: string }).id
}

async function saveNotes(
  admin: SupabaseClient,
  notesId: string,
  content: Awaited<ReturnType<typeof generateStructuredNotes>>,
): Promise<void> {
  const { error } = await admin
    .from('lecture_notes')
    .update({
      summary: content.summary,
      key_concepts: content.keyConcepts,
      important_points: content.importantPoints,
      definitions: content.definitions,
      examples: content.examples,
      questions: content.questions,
      exam_tips: content.examTips,
      status: 'completed',
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', notesId)

  if (error) {
    throw new Error(error.message)
  }
}

async function failNotes(
  admin: SupabaseClient,
  notesId: string,
  message: string,
): Promise<void> {
  await admin
    .from('lecture_notes')
    .update({
      status: 'failed',
      error_message: message,
      updated_at: new Date().toISOString(),
    })
    .eq('id', notesId)
}

async function extractSourceText(
  lecture: LectureRow,
): Promise<{ text: string; language: string | null; durationSeconds: number | null; segments: unknown[] }> {
  if (lecture.file_type === 'pdf' || lecture.source === 'pdf') {
    const { text, pageCount } = await extractPdfTextFromUrl(lecture.file_url)
    return { text, language: 'auto', durationSeconds: pageCount, segments: [] }
  }

  let audioUrl = lecture.file_url

  if (lecture.source === 'youtube' || isYouTubeUrl(lecture.file_url)) {
    audioUrl = await resolveYouTubeTranscriptionUrl(lecture.file_url)
  }

  const result = await groqTranscribeUrl(audioUrl)
  const text = result.text?.trim() ?? ''

  if (!text) {
    throw new Error('No speech detected in this lecture.')
  }

  const segments = (result.segments ?? []).map((segment, index) => ({
    id: segment.id ?? index,
    start: segment.start,
    end: segment.end,
    text: segment.text.trim(),
  }))

  return {
    text,
    language: result.language ?? null,
    durationSeconds: result.duration ?? null,
    segments,
  }
}

export async function processLectureJob(
  admin: SupabaseClient,
  lectureId: string,
  userId: string,
  options: ProcessLectureOptions = {},
): Promise<void> {
  const generateNotes = options.generateNotes !== false
  const forceRetranscribe = options.forceRetranscribe === true

  const lecture = await getLecture(admin, lectureId, userId)
  let transcript = await getTranscript(admin, lectureId)
  let notes = await getNotes(admin, lectureId)

  await admin
    .from('lectures')
    .update({ status: 'processing' })
    .eq('id', lectureId)
    .eq('user_id', userId)

  let sourceText = transcript?.full_text?.trim() ?? ''

  const hasCompletedTranscript =
    transcript?.status === 'completed' && Boolean(sourceText) && !forceRetranscribe

  if (!hasCompletedTranscript) {
    const transcriptId = await upsertTranscriptProcessing(admin, lectureId, userId, transcript)

    try {
      const extracted = await extractSourceText(lecture)
      sourceText = extracted.text

      await saveTranscript(admin, transcriptId, {
        text: extracted.text,
        language: extracted.language,
        durationSeconds: extracted.durationSeconds,
        segments: extracted.segments,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transcription failed.'
      await failTranscript(admin, transcriptId, message)
      await admin.from('lectures').update({ status: 'failed' }).eq('id', lectureId)
      throw error
    }
  }

  if (generateNotes && sourceText) {
    const notesCompleted = notes?.status === 'completed' && !forceRetranscribe

    if (!notesCompleted) {
      const notesId = await upsertNotesGenerating(admin, lectureId, userId, notes)

      try {
        const content = await generateStructuredNotes(sourceText)
        await saveNotes(admin, notesId, content)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Notes generation failed.'
        await failNotes(admin, notesId, message)
        await admin.from('lectures').update({ status: 'failed' }).eq('id', lectureId)
        throw error
      }
    }
  }

  await admin
    .from('lectures')
    .update({ status: 'completed' })
    .eq('id', lectureId)
    .eq('user_id', userId)
}

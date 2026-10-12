export type NotesHubStatus = 'needs_pdf_text' | 'needs_transcript' | 'not_started' | 'processing_lecture' | 'lecture_failed' | 'ready' | 'generating' | 'failed' | 'no_notes'

export function resolveHubStatus(
  lectureStatus: string,
  notesStatus: string | null,
  hasTranscript: boolean,
  isPdf: boolean,
): NotesHubStatus {
  // Existing notes remain accessible even if a later processing attempt failed.
  if (notesStatus === 'completed') return 'ready'
  if (notesStatus === 'failed') return 'failed'
  if (lectureStatus === 'failed') return hasTranscript ? 'failed' : 'lecture_failed'
  if (!hasTranscript) {
    if (lectureStatus === 'processing') return 'processing_lecture'
    if (isPdf) return 'needs_pdf_text'
    if (lectureStatus === 'uploaded') return 'not_started'
    return 'needs_transcript'
  }
  if (notesStatus === 'generating' || notesStatus === 'idle') return 'generating'
  if (lectureStatus === 'processing') return 'processing_lecture'
  return 'no_notes'
}

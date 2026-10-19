export type NotesHubStatus = 'needs_pdf_text' | 'needs_transcript' | 'not_started' | 'processing_lecture' | 'lecture_failed' | 'ready' | 'generating' | 'failed' | 'no_notes'

export function resolveHubStatus(
  lectureStatus: string,
  notesStatus: string | null,
  hasTranscript: boolean,
  isPdf: boolean,
): NotesHubStatus {
  // Existing notes remain accessible even if a later processing attempt failed.
  if (notesStatus === 'completed') return 'ready'
  if (lectureStatus === 'processing') return notesStatus === 'generating' ? 'generating' : 'processing_lecture'
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

export function countHubStatuses(statuses: NotesHubStatus[]) {
  const ready = statuses.filter(status => status === 'ready').length
  const pending = statuses.filter(status => status === 'generating' || status === 'processing_lecture').length
  const failed = statuses.filter(status => status === 'failed' || status === 'lecture_failed').length
  const notStarted = statuses.length - ready - pending - failed
  return { total: statuses.length, ready, pending, failed, notStarted }
}

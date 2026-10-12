const STALE_PROCESSING_MS = 30 * 60 * 1000

export interface DerivedProcessingStatus {
  lectureStatus: string
  transcriptStatus: string | null
  notesStatus: string | null
  isProcessing: boolean
  stage: 'not_started' | 'transcribing' | 'generating_notes' | 'ready' | 'failed'
  message: string
  progressPercent: number
}

function isTranscriptBusy(lectureStatus: string, transcriptStatus: string | null): boolean {
  return (
    (lectureStatus === 'processing' && transcriptStatus !== 'completed') ||
    transcriptStatus === 'processing' ||
    Boolean(transcriptStatus?.startsWith('transcribing'))
  )
}

export function deriveProcessingStatus(
  lectureStatus: string,
  transcriptStatus: string | null,
  notesStatus: string | null,
): DerivedProcessingStatus {
  if (lectureStatus === 'failed' || transcriptStatus === 'failed' || notesStatus === 'failed') {
    return {
      lectureStatus,
      transcriptStatus,
      notesStatus,
      isProcessing: false,
      stage: 'failed',
      message: 'Processing failed. Please try again.',
      progressPercent: 0,
    }
  }

  if (isTranscriptBusy(lectureStatus, transcriptStatus)) {
    const chunkMatch = transcriptStatus?.match(/transcribing_part_(\d+)_of_(\d+)/)
    if (chunkMatch) {
      const part = parseInt(chunkMatch[1], 10)
      const total = parseInt(chunkMatch[2], 10)
      return {
        lectureStatus,
        transcriptStatus,
        notesStatus,
        isProcessing: true,
        stage: 'transcribing',
        message: `Transcribing part ${part} of ${total}…`,
        progressPercent: Math.min(75, Math.round((part / total) * 75)),
      }
    }

    return {
      lectureStatus,
      transcriptStatus,
      notesStatus,
      isProcessing: true,
      stage: 'transcribing',
      message: 'Transcribing your lecture…',
      progressPercent: 45,
    }
  }

  if (notesStatus === 'generating') {
    return {
      lectureStatus,
      transcriptStatus,
      notesStatus,
      isProcessing: true,
      stage: 'generating_notes',
      message: 'Generating smart notes…',
      progressPercent: 88,
    }
  }

  if (lectureStatus === 'processing') {
    return {
      lectureStatus, transcriptStatus, notesStatus, isProcessing: true,
      stage: 'generating_notes', message: 'Finishing lecture processing…', progressPercent: 85,
    }
  }

  if (lectureStatus === 'uploaded' && transcriptStatus !== 'completed') {
    return {
      lectureStatus, transcriptStatus, notesStatus, isProcessing: false,
      stage: 'not_started', message: 'Processing has not started. Start processing to generate the transcript and notes.', progressPercent: 0,
    }
  }

  return {
    lectureStatus,
    transcriptStatus,
    notesStatus,
    isProcessing: false,
    stage: 'ready',
    message: '',
    progressPercent: 100,
  }
}

export function isProcessingStale(updatedAt: Date): boolean {
  return Date.now() - updatedAt.getTime() > STALE_PROCESSING_MS
}

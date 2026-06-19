import { generateFlashcards } from '@/services/aiGenerationService'
import { createFlashcards, getFlashcardsByLectureId } from '@/services/flashcardService'
import { getTranscriptByLectureId } from '@/services/transcriptionService'

export interface BatchGenerateProgress {
  current: number
  total: number
  lectureTitle: string
  phase: 'checking' | 'generating' | 'saving' | 'skipped' | 'done'
}

export interface BatchGenerateResult {
  totalSaved: number
  lecturesProcessed: number
  lecturesSkipped: number
  lecturesFailed: number
}

export async function generateDeckFromAllLectures(
  userId: string,
  lectures: Array<{ id: string; title: string }>,
  options: {
    skipExisting?: boolean
    onProgress?: (progress: BatchGenerateProgress) => void
  } = {},
): Promise<BatchGenerateResult> {
  const { skipExisting = true, onProgress } = options
  const eligible = lectures.filter(Boolean)
  const total = eligible.length

  let totalSaved = 0
  let lecturesProcessed = 0
  let lecturesSkipped = 0
  let lecturesFailed = 0

  for (let index = 0; index < eligible.length; index++) {
    const lecture = eligible[index]
    const baseProgress = { current: index + 1, total, lectureTitle: lecture.title }

    onProgress?.({ ...baseProgress, phase: 'checking' })

    try {
      if (skipExisting) {
        const existing = await getFlashcardsByLectureId(userId, lecture.id)
        if (existing.length > 0) {
          lecturesSkipped += 1
          onProgress?.({ ...baseProgress, phase: 'skipped' })
          continue
        }
      }

      const transcript = await getTranscriptByLectureId(userId, lecture.id)
      if (!transcript?.fullText?.trim()) {
        lecturesSkipped += 1
        onProgress?.({ ...baseProgress, phase: 'skipped' })
        continue
      }

      onProgress?.({ ...baseProgress, phase: 'generating' })
      const generated = await generateFlashcards(transcript.fullText)
      if (generated.length === 0) {
        lecturesSkipped += 1
        onProgress?.({ ...baseProgress, phase: 'skipped' })
        continue
      }

      onProgress?.({ ...baseProgress, phase: 'saving' })
      const saved = await createFlashcards(userId, lecture.id, generated)
      totalSaved += saved.length
      lecturesProcessed += 1
    } catch {
      lecturesFailed += 1
    }
  }

  onProgress?.({
    current: total,
    total,
    lectureTitle: '',
    phase: 'done',
  })

  return { totalSaved, lecturesProcessed, lecturesSkipped, lecturesFailed }
}

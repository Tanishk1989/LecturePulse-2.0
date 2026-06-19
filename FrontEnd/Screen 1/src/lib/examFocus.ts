import { countDueFlashcards } from '@/lib/flashcardStudy'
import { countReviewsInNextDays, formatStudyMinutes } from '@/lib/studyMetrics'
import type { Flashcard } from '@/types/flashcard'
import type { LectureNotes } from '@/types/notes'

export interface ExamFocusArea {
  id: string
  title: string
  source: 'exam-tip' | 'topic' | 'flashcard' | 'concept'
  lectureId?: string
  priority: number
}

export interface ExamFocusInsights {
  focusAreas: ExamFocusArea[]
  upcomingTopic: string | null
  upcomingLectureId: string | null
  importanceScore: number
  reviewTimeMinutes: number
  confidencePercent: number
  readinessPercent: number
  reviewScheduleCount: number
  hardQuestionsCount: number
  commonMistakes: string[]
  hasData: boolean
}

function uniqueByTitle(areas: ExamFocusArea[]): ExamFocusArea[] {
  const seen = new Set<string>()
  return areas.filter((area) => {
    const key = area.title.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function buildExamFocusInsights(
  notes: LectureNotes[],
  flashcards: Flashcard[],
  now = new Date(),
): ExamFocusInsights {
  const completedNotes = notes.filter((note) => note.status === 'completed')
  const areas: ExamFocusArea[] = []

  for (const note of completedNotes) {
    for (const item of note.content.examTips.mostImportant) {
      areas.push({
        id: `${note.lectureId}-important-${item}`,
        title: item,
        source: 'exam-tip',
        lectureId: note.lectureId,
        priority: 5,
      })
    }

    for (const item of note.content.examTips.topicsToRevise) {
      areas.push({
        id: `${note.lectureId}-revise-${item}`,
        title: item,
        source: 'topic',
        lectureId: note.lectureId,
        priority: 4,
      })
    }

    for (const concept of note.content.keyConcepts.slice(0, 3)) {
      areas.push({
        id: `${note.lectureId}-concept-${concept.title}`,
        title: concept.title,
        source: 'concept',
        lectureId: note.lectureId,
        priority: 3,
      })
    }
  }

  const weakCards = flashcards.filter(
    (card) => card.status === 'new' || card.easeFactor < 2.2 || card.repetitions === 0,
  )

  for (const card of weakCards.slice(0, 8)) {
    areas.push({
      id: `card-${card.id}`,
      title: card.concept?.trim() || card.front,
      source: 'flashcard',
      lectureId: card.lectureId,
      priority: card.status === 'new' ? 4 : 3,
    })
  }

  const focusAreas = uniqueByTitle(areas).sort((a, b) => b.priority - a.priority).slice(0, 12)
  const topArea = focusAreas[0]

  const totalCards = flashcards.length
  const masteredCards = flashcards.filter((card) => card.status === 'mastered').length
  const confidencePercent =
    totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0

  const notesReady = completedNotes.length
  const notesTotal = notes.length || completedNotes.length
  const notesScore = notesTotal > 0 ? (notesReady / notesTotal) * 100 : 0
  const readinessPercent = Math.round(confidencePercent * 0.6 + notesScore * 0.4)

  const reviewScheduleCount = countReviewsInNextDays(flashcards, 7, now)
  const reviewTimeMinutes = Math.max(countDueFlashcards(flashcards, now) * 2, 0)

  const hardQuestionsCount = completedNotes.reduce(
    (count, note) =>
      count + note.content.questions.filter((question) => question.difficulty === 'hard').length,
    0,
  )

  const commonMistakes = uniqueByTitle(
    completedNotes.flatMap((note) =>
      note.content.examTips.commonMistakes.map((item) => ({
        id: `${note.lectureId}-mistake-${item}`,
        title: item,
        source: 'exam-tip' as const,
        lectureId: note.lectureId,
        priority: 2,
      })),
    ),
  )
    .slice(0, 5)
    .map((area) => area.title)

  return {
    focusAreas,
    upcomingTopic: topArea?.title ?? null,
    upcomingLectureId: topArea?.lectureId ?? null,
    importanceScore: Math.min(100, focusAreas.length * 12 + hardQuestionsCount * 4),
    reviewTimeMinutes,
    confidencePercent,
    readinessPercent,
    reviewScheduleCount,
    hardQuestionsCount,
    commonMistakes,
    hasData: focusAreas.length > 0 || totalCards > 0 || completedNotes.length > 0,
  }
}

export function formatExamFocusTime(minutes: number): string {
  return formatStudyMinutes(minutes)
}

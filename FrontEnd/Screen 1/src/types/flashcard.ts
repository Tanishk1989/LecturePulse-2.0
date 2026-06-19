export type FlashcardStatus = 'new' | 'review' | 'mastered'

export type ReviewRating = 'hard' | 'good'

export interface FlashcardInput {
  front: string
  back: string
  concept?: string | null
}

export interface FlashcardRow {
  id: string
  lecture_id: string
  user_id: string
  front: string
  back: string
  concept: string | null
  status: FlashcardStatus
  repetitions: number
  ease_factor: number
  interval_days: number
  next_review_at: string | null
  last_reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface Flashcard {
  id: string
  lectureId: string
  userId: string
  front: string
  back: string
  concept: string | null
  status: FlashcardStatus
  repetitions: number
  easeFactor: number
  intervalDays: number
  nextReviewAt: string | null
  lastReviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export function mapRowToFlashcard(row: FlashcardRow): Flashcard {
  return {
    id: row.id,
    lectureId: row.lecture_id,
    userId: row.user_id,
    front: row.front,
    back: row.back,
    concept: row.concept,
    status: row.status,
    repetitions: row.repetitions,
    easeFactor: row.ease_factor ?? 2.5,
    intervalDays: row.interval_days ?? 0,
    nextReviewAt: row.next_review_at,
    lastReviewedAt: row.last_reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export type FlashcardStatus = 'new' | 'review' | 'mastered'

export type ReviewRating = 'hard' | 'good'

export interface FlashcardInput {
  front: string
  back: string
  concept?: string | null
  conceptId?: string | null
}

export interface FlashcardRow {
  id: string
  lecture_id?: string
  lectureId?: string
  user_id?: string
  userId?: string
  front: string
  back: string
  concept?: string | null
  concept_id?: string | null
  conceptId?: string | null
  concept_name?: string | null
  conceptName?: string | null
  status: FlashcardStatus
  repetitions?: number
  ease_factor?: number
  interval_days?: number
  review_attempts?: number
  reviewAttempts?: number
  correct_attempts?: number
  correctAttempts?: number
  next_review_at?: string | null
  nextReviewAt?: string | null
  last_reviewed_at?: string | null
  lastReviewedAt?: string | null
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
}

export interface Flashcard {
  id: string
  lectureId: string
  userId: string
  front: string
  back: string
  concept: string | null
  conceptId: string | null
  status: FlashcardStatus
  repetitions: number
  easeFactor: number
  intervalDays: number
  reviewAttempts: number
  correctAttempts: number
  nextReviewAt: string | null
  lastReviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export function mapRowToFlashcard(row: FlashcardRow): Flashcard {
  return {
    id: row.id,
    lectureId: row.lectureId ?? row.lecture_id ?? '',
    userId: row.userId ?? row.user_id ?? '',
    front: row.front,
    back: row.back,
    concept: row.conceptName ?? row.concept_name ?? row.concept ?? null,
    conceptId: row.conceptId ?? row.concept_id ?? null,
    status: row.status,
    repetitions: row.repetitions ?? 0,
    easeFactor: row.ease_factor ?? 2.5,
    intervalDays: row.interval_days ?? 0,
    reviewAttempts: row.reviewAttempts ?? row.review_attempts ?? 0,
    correctAttempts: row.correctAttempts ?? row.correct_attempts ?? 0,
    nextReviewAt: row.nextReviewAt ?? row.next_review_at ?? null,
    lastReviewedAt: row.lastReviewedAt ?? row.last_reviewed_at ?? null,
    createdAt: row.createdAt ?? row.created_at ?? '',
    updatedAt: row.updatedAt ?? row.updated_at ?? '',
  }
}

import type { Flashcard, FlashcardStatus } from '@/types/flashcard'

export type ReviewRating = 'hard' | 'good'

export interface SpacedRepetitionState {
  easeFactor: number
  intervalDays: number
  repetitions: number
}

export interface SpacedRepetitionResult extends SpacedRepetitionState {
  nextReviewAt: string
  status: FlashcardStatus
}

const MIN_EASE = 1.3
const DEFAULT_EASE = 2.5

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function sm2Quality(rating: ReviewRating): number {
  return rating === 'good' ? 4 : 2
}

function deriveStatus(
  repetitions: number,
  intervalDays: number,
  rating: ReviewRating,
): FlashcardStatus {
  if (repetitions === 0) {
    return rating === 'hard' ? 'review' : 'new'
  }
  if (repetitions >= 3 && intervalDays >= 6) return 'mastered'
  return 'review'
}

export function defaultSpacedRepetitionState(): SpacedRepetitionState {
  return {
    easeFactor: DEFAULT_EASE,
    intervalDays: 0,
    repetitions: 0,
  }
}

export function applySpacedRepetitionReview(
  state: SpacedRepetitionState,
  rating: ReviewRating,
  now = new Date(),
): SpacedRepetitionResult {
  const quality = sm2Quality(rating)
  let { easeFactor, intervalDays, repetitions } = state

  if (quality < 3) {
    repetitions = 0
    intervalDays = 1
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.2)
  } else {
    if (repetitions === 0) {
      intervalDays = 1
    } else if (repetitions === 1) {
      intervalDays = 6
    } else {
      intervalDays = Math.max(1, Math.round(intervalDays * easeFactor))
    }
    repetitions += 1
    easeFactor = Math.max(
      MIN_EASE,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
    )
  }

  const nextReviewAt = addDays(now, intervalDays).toISOString()
  const status = deriveStatus(repetitions, intervalDays, rating)

  return {
    easeFactor,
    intervalDays,
    repetitions,
    nextReviewAt,
    status,
  }
}

export function formatNextReview(nextReviewAt: string | null): string {
  if (!nextReviewAt) return 'Review now'

  const now = new Date()
  const due = new Date(nextReviewAt)
  const diffMs = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Due now'
  if (diffDays === 1) return 'Due tomorrow'
  if (diffDays < 7) return `Due in ${diffDays} days`
  if (diffDays < 30) return `Due in ${Math.round(diffDays / 7)} weeks`
  return `Due in ${Math.round(diffDays / 30)} months`
}

export function formatIntervalDays(days: number): string {
  if (days <= 0) return 'New card'
  if (days === 1) return '1 day interval'
  if (days < 7) return `${days} day interval`
  if (days < 30) return `${Math.round(days / 7)} week interval`
  return `${Math.round(days / 30)} month interval`
}

export function flashcardFromSrFields(card: Flashcard): SpacedRepetitionState {
  return {
    easeFactor: card.easeFactor,
    intervalDays: card.intervalDays,
    repetitions: card.repetitions,
  }
}

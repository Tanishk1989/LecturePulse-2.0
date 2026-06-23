import { apiFetch } from '@/lib/api'
import {
  applySpacedRepetitionReview,
  defaultSpacedRepetitionState,
  flashcardFromSrFields,
} from '@/lib/spacedRepetition'
import type {
  Flashcard,
  FlashcardInput,
  FlashcardRow,
  FlashcardStatus,
  ReviewRating,
} from '@/types/flashcard'
import { mapRowToFlashcard } from '@/types/flashcard'

export async function getUserFlashcards(userId: string): Promise<Flashcard[]> {
  try {
    const data = await apiFetch<FlashcardRow[]>('/flashcards')
    return data.map(mapRowToFlashcard)
  } catch {
    return []
  }
}

export async function getFlashcardsByLectureId(
  userId: string,
  lectureId: string,
): Promise<Flashcard[]> {
  try {
    const data = await apiFetch<FlashcardRow[]>(`/flashcards/lecture/${lectureId}`)
    return data.map(mapRowToFlashcard)
  } catch {
    return []
  }
}

export async function getFlashcardCount(userId: string): Promise<number> {
  try {
    const cards = await getUserFlashcards(userId)
    return cards.length
  } catch {
    return 0
  }
}

export async function createFlashcards(
  userId: string,
  lectureId: string,
  cards: FlashcardInput[],
): Promise<Flashcard[]> {
  const validCards = cards.filter((card) => card.front.trim() && card.back.trim())
  if (validCards.length === 0) return []

  const data = await apiFetch<FlashcardRow[]>('/flashcards/batch', {
    method: 'POST',
    body: JSON.stringify({
      lectureId,
      cards: validCards,
    }),
  })

  return data.map(mapRowToFlashcard)
}

export async function reviewFlashcard(
  flashcardId: string,
  userId: string,
  rating: ReviewRating,
): Promise<Flashcard> {
  const cards = await getUserFlashcards(userId)
  const card = cards.find((c) => c.id === flashcardId)

  if (!card) {
    throw new Error('Flashcard not found.')
  }

  const result = applySpacedRepetitionReview(flashcardFromSrFields(card), rating)
  const now = new Date().toISOString()

  const payload = {
    status: result.status,
    nextReviewAt: result.nextReviewAt,
    lastReviewedAt: now,
    rating,
  }

  const data = await apiFetch<FlashcardRow>(`/flashcards/${flashcardId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

  return mapRowToFlashcard(data)
}

/** @deprecated Use reviewFlashcard with spaced repetition instead */
export async function updateFlashcardStatus(
  flashcardId: string,
  userId: string,
  status: FlashcardStatus,
): Promise<Flashcard> {
  const rating: ReviewRating = status === 'mastered' ? 'good' : 'hard'
  return reviewFlashcard(flashcardId, userId, rating)
}

export async function deleteFlashcard(flashcardId: string, userId: string): Promise<void> {
  await apiFetch<void>(`/flashcards/${flashcardId}`, {
    method: 'DELETE',
  })
}

export async function deleteFlashcardsByLectureId(
  userId: string,
  lectureId: string,
): Promise<void> {
  await apiFetch<void>(`/flashcards/lecture/${lectureId}`, {
    method: 'DELETE',
  })
}

import { supabase } from '@/lib/supabase'
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
  if (!supabase) return []

  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to load flashcards.')
  }

  return (data as FlashcardRow[]).map(mapRowToFlashcard)
}

export async function getFlashcardsByLectureId(
  userId: string,
  lectureId: string,
): Promise<Flashcard[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('user_id', userId)
    .eq('lecture_id', lectureId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to load flashcards.')
  }

  return (data as FlashcardRow[]).map(mapRowToFlashcard)
}

export async function getFlashcardCount(userId: string): Promise<number> {
  if (!supabase) return 0

  const { count, error } = await supabase
    .from('flashcards')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message || 'Failed to count flashcards.')
  }

  return count ?? 0
}

export async function createFlashcards(
  userId: string,
  lectureId: string,
  cards: FlashcardInput[],
): Promise<Flashcard[]> {
  if (!supabase) {
    throw new Error('Storage unavailable. Check your Supabase configuration.')
  }

  const validCards = cards.filter((card) => card.front.trim() && card.back.trim())
  if (validCards.length === 0) return []

  const defaults = defaultSpacedRepetitionState()
  const now = new Date().toISOString()
  const payload = validCards.map((card) => ({
    lecture_id: lectureId,
    user_id: userId,
    front: card.front.trim(),
    back: card.back.trim(),
    concept: card.concept?.trim() || null,
    status: 'new' as FlashcardStatus,
    ease_factor: defaults.easeFactor,
    interval_days: defaults.intervalDays,
    updated_at: now,
  }))

  const { data, error } = await supabase.from('flashcards').insert(payload).select('*')

  if (error) {
    throw new Error(error.message || 'Failed to save flashcards.')
  }

  return (data as FlashcardRow[]).map(mapRowToFlashcard)
}

export async function reviewFlashcard(
  flashcardId: string,
  userId: string,
  rating: ReviewRating,
): Promise<Flashcard> {
  if (!supabase) {
    throw new Error('Storage unavailable. Check your Supabase configuration.')
  }

  const { data: existing, error: fetchError } = await supabase
    .from('flashcards')
    .select('*')
    .eq('id', flashcardId)
    .eq('user_id', userId)
    .single()

  if (fetchError) {
    throw new Error(fetchError.message || 'Failed to load flashcard.')
  }

  const card = mapRowToFlashcard(existing as FlashcardRow)
  const result = applySpacedRepetitionReview(flashcardFromSrFields(card), rating)
  const now = new Date().toISOString()

  const payload = {
    status: result.status,
    repetitions: result.repetitions,
    ease_factor: result.easeFactor,
    interval_days: result.intervalDays,
    next_review_at: result.nextReviewAt,
    last_reviewed_at: now,
    updated_at: now,
  }

  const { data, error } = await supabase
    .from('flashcards')
    .update(payload)
    .eq('id', flashcardId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to update flashcard.')
  }

  return mapRowToFlashcard(data as FlashcardRow)
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
  if (!supabase) {
    throw new Error('Storage unavailable. Check your Supabase configuration.')
  }

  const { error } = await supabase
    .from('flashcards')
    .delete()
    .eq('id', flashcardId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message || 'Failed to delete flashcard.')
  }
}

export async function deleteFlashcardsByLectureId(
  userId: string,
  lectureId: string,
): Promise<void> {
  if (!supabase) {
    throw new Error('Storage unavailable. Check your Supabase configuration.')
  }

  const { error } = await supabase
    .from('flashcards')
    .delete()
    .eq('user_id', userId)
    .eq('lecture_id', lectureId)

  if (error) {
    throw new Error(error.message || 'Failed to delete flashcards.')
  }
}

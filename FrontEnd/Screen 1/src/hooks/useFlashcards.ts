import { useCallback, useEffect, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { useToast } from '@/components/ui/ToastProvider'
import {
  createFlashcards,
  deleteFlashcard,
  getUserFlashcards,
  reviewFlashcard,
} from '@/services/flashcardService'
import type { Flashcard, FlashcardInput, ReviewRating } from '@/types/flashcard'

export function useFlashcards() {
  const { user } = useAuthContext()
  const { toast } = useToast()
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setFlashcards([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const rows = await getUserFlashcards(user.uid)
      setFlashcards(rows)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load flashcards.'
      toast.error(message)
      setFlashcards([])
    } finally {
      setLoading(false)
    }
  }, [toast, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveFlashcards = useCallback(
    async (lectureId: string, cards: FlashcardInput[], concept?: string | null) => {
      if (!user) {
        toast.error('Sign in to save flashcards.')
        return []
      }

      const withConcept = concept
        ? cards.map((card) => ({ ...card, concept: card.concept ?? concept }))
        : cards

      try {
        const saved = await createFlashcards(user.uid, lectureId, withConcept)
        setFlashcards((prev) => [...saved, ...prev])
        return saved
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save flashcards.'
        toast.error(message)
        return []
      }
    },
    [toast, user],
  )

  const reviewCard = useCallback(
    async (flashcardId: string, rating: ReviewRating) => {
      if (!user) return null

      try {
        const updated = await reviewFlashcard(flashcardId, user.uid, rating)
        setFlashcards((prev) => prev.map((card) => (card.id === flashcardId ? updated : card)))
        return updated
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update flashcard.'
        toast.error(message)
        return null
      }
    },
    [toast, user],
  )

  const removeFlashcard = useCallback(
    async (flashcardId: string) => {
      if (!user) return

      try {
        await deleteFlashcard(flashcardId, user.uid)
        setFlashcards((prev) => prev.filter((card) => card.id !== flashcardId))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete flashcard.'
        toast.error(message)
      }
    },
    [toast, user],
  )

  return {
    flashcards,
    loading,
    refresh,
    saveFlashcards,
    reviewCard,
    removeFlashcard,
  }
}

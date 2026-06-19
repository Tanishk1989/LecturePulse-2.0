import type { Flashcard } from '@/types/flashcard'

export function isFlashcardDue(card: Flashcard, now = new Date()): boolean {
  if (card.status === 'new') return true
  if (!card.nextReviewAt) return true
  return new Date(card.nextReviewAt).getTime() <= now.getTime()
}

export function countDueFlashcards(cards: Flashcard[], now = new Date()): number {
  return cards.filter((card) => isFlashcardDue(card, now)).length
}

const STATUS_PRIORITY: Record<Flashcard['status'], number> = {
  new: 0,
  review: 1,
  mastered: 2,
}

export function sortFlashcardsForStudy(cards: Flashcard[], now = new Date()): Flashcard[] {
  return [...cards].sort((a, b) => {
    const aDue = isFlashcardDue(a, now)
    const bDue = isFlashcardDue(b, now)
    if (aDue !== bDue) return aDue ? -1 : 1

    if (aDue && bDue) {
      const aNext = a.nextReviewAt ? new Date(a.nextReviewAt).getTime() : 0
      const bNext = b.nextReviewAt ? new Date(b.nextReviewAt).getTime() : 0
      if (aNext !== bNext) return aNext - bNext
    }

    const statusDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
    if (statusDiff !== 0) return statusDiff

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export function filterDueFlashcards(cards: Flashcard[], now = new Date()): Flashcard[] {
  return cards.filter((card) => isFlashcardDue(card, now))
}

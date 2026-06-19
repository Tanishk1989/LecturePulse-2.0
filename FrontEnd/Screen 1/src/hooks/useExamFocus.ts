import { useMemo } from 'react'
import { buildExamFocusInsights, type ExamFocusInsights } from '@/lib/examFocus'
import { useFlashcards } from '@/hooks/useFlashcards'
import { useUserNotes } from '@/hooks/useUserNotes'

export function useExamFocus(): { insights: ExamFocusInsights; loading: boolean } {
  const { notes, loading: notesLoading } = useUserNotes()
  const { flashcards, loading: flashcardsLoading } = useFlashcards()

  const insights = useMemo(
    () => buildExamFocusInsights(notes, flashcards),
    [flashcards, notes],
  )

  return {
    insights,
    loading: notesLoading || flashcardsLoading,
  }
}

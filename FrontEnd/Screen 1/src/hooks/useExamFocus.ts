import { useMemo } from 'react'
import { buildExamFocusInsights, type ExamFocusInsights } from '@/lib/examFocus'
import { useFlashcards } from '@/hooks/useFlashcards'
import { useUserNotes } from '@/hooks/useUserNotes'

export function useExamFocus(): { insights: ExamFocusInsights; loading: boolean; error: string | null; refresh: () => Promise<void> } {
  const { notes, loading: notesLoading, error: notesError, refresh: refreshNotes } = useUserNotes()
  const { flashcards, loading: flashcardsLoading, error: flashcardsError, refresh: refreshFlashcards } = useFlashcards()

  const insights = useMemo(
    () => buildExamFocusInsights(notes, flashcards),
    [flashcards, notes],
  )

  return {
    insights,
    loading: notesLoading || flashcardsLoading,
    error: notesError || flashcardsError,
    refresh: async () => { await Promise.all([refreshNotes(), refreshFlashcards()]) },
  }
}

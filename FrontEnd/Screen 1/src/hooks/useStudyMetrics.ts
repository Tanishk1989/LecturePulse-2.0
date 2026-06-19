import { useMemo } from 'react'
import { useFlashcards } from '@/hooks/useFlashcards'
import { useLectures } from '@/hooks/useLectures'
import { useUserNotes } from '@/hooks/useUserNotes'
import {
  buildRecentActivity,
  buildStudyMetrics,
  groupFlashcardsForRevision,
  type ActivityItem,
  type RevisionBucket,
  type StudyMetrics,
} from '@/lib/studyMetrics'

interface UseStudyMetricsResult {
  metrics: StudyMetrics
  activity: ActivityItem[]
  revisionBuckets: RevisionBucket[]
  lectureTitles: Record<string, string>
  loading: boolean
}

export function useStudyMetrics(): UseStudyMetricsResult {
  const { lectures, loading: lecturesLoading } = useLectures()
  const { notes, loading: notesLoading } = useUserNotes()
  const { flashcards, loading: flashcardsLoading } = useFlashcards()

  const lectureTitles = useMemo(
    () => Object.fromEntries(lectures.map((lecture) => [lecture.id, lecture.title])),
    [lectures],
  )

  const metrics = useMemo(
    () => buildStudyMetrics(flashcards, notes, lectures),
    [flashcards, lectures, notes],
  )

  const activity = useMemo(
    () => buildRecentActivity(flashcards, notes, lectures, lectureTitles),
    [flashcards, lectureTitles, lectures, notes],
  )

  const revisionBuckets = useMemo(
    () => groupFlashcardsForRevision(flashcards),
    [flashcards],
  )

  return {
    metrics,
    activity,
    revisionBuckets,
    lectureTitles,
    loading: lecturesLoading || notesLoading || flashcardsLoading,
  }
}

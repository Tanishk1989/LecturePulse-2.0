import { countDueFlashcards, filterDueFlashcards, isFlashcardDue } from '@/lib/flashcardStudy'
import type { LectureRecording } from '@/types/lecture'
import type { Flashcard } from '@/types/flashcard'
import type { LectureNotes } from '@/types/notes'

export interface StudyMetrics {
  reviewsDue: number
  tasksDueToday: number
  studyTimeMinutes: number
  streakDays: number
  progressPercent: number
  pendingNotes: number
  masteredCards: number
  totalCards: number
}

export interface ActivityItem {
  id: string
  title: string
  subtitle: string
  timestamp: string
  href: string
  kind: 'lecture' | 'notes' | 'review'
}

export interface RevisionBucket {
  id: 'overdue' | 'today' | 'tomorrow' | 'week' | 'later'
  label: string
  cards: Flashcard[]
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

function uniqueActivityDays(dates: Date[]): Set<string> {
  return new Set(dates.map((date) => startOfDay(date).toISOString()))
}

export function computeStudyStreak(flashcards: Flashcard[], now = new Date()): number {
  const reviewDays = flashcards
    .map((card) => card.lastReviewedAt)
    .filter(Boolean)
    .map((value) => new Date(value as string))

  if (reviewDays.length === 0) return 0

  const daySet = uniqueActivityDays(reviewDays)
  let streak = 0
  let cursor = startOfDay(now)

  while (daySet.has(cursor.toISOString())) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return streak
}

export function estimateStudyTimeMinutes(
  flashcards: Flashcard[],
  notes: LectureNotes[],
  now = new Date(),
): number {
  const reviewsToday = flashcards.filter(
    (card) => card.lastReviewedAt && isSameDay(new Date(card.lastReviewedAt), now),
  ).length

  const notesCompletedToday = notes.filter(
    (note) =>
      note.status === 'completed' &&
      note.updatedAt &&
      isSameDay(new Date(note.updatedAt), now),
  ).length

  return reviewsToday * 2 + notesCompletedToday * 8
}

export function computeMissionProgress(
  flashcards: Flashcard[],
  notes: LectureNotes[],
  lectures: LectureRecording[],
): number {
  if (flashcards.length > 0) {
    const mastered = flashcards.filter((card) => card.status === 'mastered').length
    return Math.round((mastered / flashcards.length) * 100)
  }

  const completedNotes = notes.filter((note) => note.status === 'completed').length
  if (lectures.length === 0) return 0
  return Math.round((completedNotes / lectures.length) * 100)
}

export function buildStudyMetrics(
  flashcards: Flashcard[],
  notes: LectureNotes[],
  lectures: LectureRecording[],
  now = new Date(),
): StudyMetrics {
  const reviewsDue = countDueFlashcards(flashcards, now)
  const pendingNotes = notes.filter(
    (note) => note.status !== 'completed' && note.status !== 'generating',
  ).length

  return {
    reviewsDue,
    tasksDueToday: reviewsDue + pendingNotes,
    studyTimeMinutes: estimateStudyTimeMinutes(flashcards, notes, now),
    streakDays: computeStudyStreak(flashcards, now),
    progressPercent: computeMissionProgress(flashcards, notes, lectures),
    pendingNotes,
    masteredCards: flashcards.filter((card) => card.status === 'mastered').length,
    totalCards: flashcards.length,
  }
}

export function buildRecentActivity(
  flashcards: Flashcard[],
  notes: LectureNotes[],
  lectures: LectureRecording[],
  lectureTitles: Record<string, string>,
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const lecture of lectures.slice(0, 6)) {
    items.push({
      id: `lecture-${lecture.id}`,
      title: 'Lecture added',
      subtitle: lecture.title,
      timestamp: lecture.createdAt,
      href: `/dashboard/lectures`,
      kind: 'lecture',
    })
  }

  for (const note of notes.filter((entry) => entry.status === 'completed').slice(0, 6)) {
    items.push({
      id: `notes-${note.id}`,
      title: 'Smart notes ready',
      subtitle: lectureTitles[note.lectureId] ?? 'Lecture notes',
      timestamp: note.updatedAt,
      href: `/notes/${note.lectureId}`,
      kind: 'notes',
    })
  }

  for (const card of flashcards.filter((entry) => entry.lastReviewedAt).slice(0, 12)) {
    items.push({
      id: `review-${card.id}-${card.lastReviewedAt}`,
      title: 'Flashcard reviewed',
      subtitle: card.front,
      timestamp: card.lastReviewedAt as string,
      href: '/dashboard/flashcards',
      kind: 'review',
    })
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8)
}

function bucketForDate(reviewDate: Date, now: Date): RevisionBucket['id'] {
  const today = startOfDay(now)
  const target = startOfDay(reviewDate)

  if (target.getTime() < today.getTime()) return 'overdue'
  if (target.getTime() === today.getTime()) return 'today'

  const tomorrow = addDays(today, 1)
  if (target.getTime() === tomorrow.getTime()) return 'tomorrow'

  const weekEnd = addDays(today, 7)
  if (target.getTime() <= weekEnd.getTime()) return 'week'
  return 'later'
}

export function groupFlashcardsForRevision(
  flashcards: Flashcard[],
  now = new Date(),
): RevisionBucket[] {
  const buckets: Record<RevisionBucket['id'], Flashcard[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    week: [],
    later: [],
  }

  for (const card of flashcards) {
    if (!isFlashcardDue(card, now) && card.nextReviewAt) {
      const reviewDate = new Date(card.nextReviewAt)
      const bucket = bucketForDate(reviewDate, now)
      buckets[bucket].push(card)
      continue
    }

    if (isFlashcardDue(card, now)) {
      if (!card.nextReviewAt) {
        buckets.today.push(card)
        continue
      }

      const reviewDate = new Date(card.nextReviewAt)
      const bucket = bucketForDate(reviewDate, now)
      buckets[bucket].push(card)
    }
  }

  const labels: Record<RevisionBucket['id'], string> = {
    overdue: 'Overdue',
    today: 'Due today',
    tomorrow: 'Tomorrow',
    week: 'This week',
    later: 'Later',
  }

  return (Object.keys(buckets) as RevisionBucket['id'][])
    .map((id) => ({
      id,
      label: labels[id],
      cards: buckets[id].sort(
        (a, b) =>
          new Date(a.nextReviewAt ?? a.createdAt).getTime() -
          new Date(b.nextReviewAt ?? b.createdAt).getTime(),
      ),
    }))
    .filter((bucket) => bucket.cards.length > 0)
}

export function countReviewsInNextDays(flashcards: Flashcard[], days: number, now = new Date()): number {
  const end = addDays(startOfDay(now), days).getTime()
  return flashcards.filter((card) => {
    if (!card.nextReviewAt) return isFlashcardDue(card, now)
    const time = new Date(card.nextReviewAt).getTime()
    return time <= end
  }).length
}

export function formatStudyMinutes(minutes: number): string {
  if (minutes <= 0) return '0 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`
}

export { filterDueFlashcards }

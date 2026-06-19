import type { LectureFilter, LectureRecording, LectureSort } from '@/types/lecture'

export function getLectureMediaKind(lecture: LectureRecording): 'audio' | 'video' | 'pdf' {
  if (lecture.mediaKind) return lecture.mediaKind
  if (lecture.source === 'record') return 'audio'
  return 'audio'
}

export function getFileTypeLabel(lecture: LectureRecording): string {
  const kind = getLectureMediaKind(lecture)
  if (lecture.source === 'record') return 'Recording'
  if (kind === 'audio') return 'Audio'
  if (kind === 'video') return 'Video'
  return 'PDF'
}

export function matchesLectureFilter(lecture: LectureRecording, filter: LectureFilter): boolean {
  const kind = getLectureMediaKind(lecture)

  switch (filter) {
    case 'all':
      return true
    case 'audio':
      return kind === 'audio'
    case 'video':
      return kind === 'video'
    case 'pdf':
      return kind === 'pdf'
    case 'recorded':
      return lecture.source === 'record'
    case 'uploaded':
      return lecture.source === 'upload'
    case 'favorites':
      return Boolean(lecture.favorite)
    default:
      return true
  }
}

export function matchesLectureSearch(lecture: LectureRecording, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  return (
    lecture.title.toLowerCase().includes(normalized) ||
    (lecture.originalFilename?.toLowerCase().includes(normalized) ?? false)
  )
}

export function sortLectures(lectures: LectureRecording[], sort: LectureSort): LectureRecording[] {
  const copy = [...lectures]

  switch (sort) {
    case 'oldest':
      return copy.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
    case 'title-asc':
      return copy.sort((a, b) => a.title.localeCompare(b.title))
    case 'title-desc':
      return copy.sort((a, b) => b.title.localeCompare(a.title))
    case 'duration':
      return copy.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))
    case 'newest':
    default:
      return copy.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
  }
}

export function filterAndSortLectures(
  lectures: LectureRecording[],
  query: string,
  filter: LectureFilter,
  sort: LectureSort,
): LectureRecording[] {
  return sortLectures(
    lectures.filter(
      (lecture) => matchesLectureFilter(lecture, filter) && matchesLectureSearch(lecture, query),
    ),
    sort,
  )
}

export const LECTURE_FILTER_OPTIONS: { value: LectureFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'pdf', label: 'PDF' },
  { value: 'recorded', label: 'Recorded' },
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'favorites', label: 'Favorites' },
]

export const LECTURE_SORT_OPTIONS: { value: LectureSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
  { value: 'duration', label: 'Longest first' },
]

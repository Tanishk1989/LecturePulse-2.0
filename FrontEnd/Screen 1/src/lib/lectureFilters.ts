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
    (lecture.originalFilename?.toLowerCase().includes(normalized) ?? false) ||
    (lecture.subject?.toLowerCase().includes(normalized) ?? false) ||
    lecture.tags.some((tag) => tag.toLowerCase().includes(normalized))
  )
}

export function matchesTagFilter(lecture: LectureRecording, tag: string | null): boolean {
  if (!tag) return true
  return lecture.tags.includes(tag)
}

export function getAllLectureTags(lectures: LectureRecording[]): string[] {
  const tags = new Set<string>()
  for (const lecture of lectures) {
    for (const tag of lecture.tags) {
      tags.add(tag)
    }
  }
  return Array.from(tags).sort((a, b) => a.localeCompare(b))
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
  tagFilter: string | null = null,
  searchResultIds: Set<string> | null = null,
): LectureRecording[] {
  const normalized = query.trim().toLowerCase()

  const filtered = lectures.filter((lecture) => {
    if (!matchesLectureFilter(lecture, filter)) return false
    if (!matchesTagFilter(lecture, tagFilter)) return false

    if (normalized.length >= 2 && searchResultIds) {
      return searchResultIds.has(lecture.id)
    }

    return matchesLectureSearch(lecture, query)
  })

  return sortLectures(filtered, sort)
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

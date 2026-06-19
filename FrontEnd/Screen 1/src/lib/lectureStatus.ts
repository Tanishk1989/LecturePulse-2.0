import type { LectureRecording } from '@/types/lecture'

export function getLectureStatusLabel(lecture: LectureRecording): string {
  switch (lecture.status) {
    case 'uploaded':
      return 'Uploaded'
    case 'processing':
      return 'Processing'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    default:
      return 'Uploaded'
  }
}

export function getLectureStatusStyles(lecture: LectureRecording): {
  container: string
  dot: string
} {
  switch (lecture.status) {
    case 'processing':
      return {
        container: 'border-red/25 bg-red/[0.08] text-red',
        dot: 'status-pulse-dot bg-red',
      }
    case 'failed':
      return {
        container: 'border-red/25 bg-red/[0.08] text-red',
        dot: 'bg-red',
      }
    case 'completed':
      return {
        container: 'border-emerald/25 bg-emerald/[0.08] text-emerald',
        dot: 'bg-emerald',
      }
    case 'uploaded':
    default:
      return {
        container: 'border-accent/25 bg-accent/[0.08] text-accent',
        dot: 'bg-accent',
      }
  }
}

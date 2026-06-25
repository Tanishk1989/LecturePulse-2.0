import type { SpeakerRole } from '@/types/transcript'

export const SPEAKER_LABELS: Record<SpeakerRole, string> = {
  professor: 'Professor',
  student: 'Student',
  unknown: 'Speaker',
}

export const SPEAKER_BADGE_CLASS: Record<SpeakerRole, string> = {
  professor: 'border-accent/30 bg-accent/10 text-accent',
  student: 'border-ambient/30 bg-ambient/10 text-ambient',
  unknown: 'border-white/[0.1] bg-white/[0.04] text-muted',
}

export function hasSpeakerLabels(segments: Array<{ speaker?: SpeakerRole }>): boolean {
  return segments.some((segment) => segment.speaker && segment.speaker !== 'unknown')
}

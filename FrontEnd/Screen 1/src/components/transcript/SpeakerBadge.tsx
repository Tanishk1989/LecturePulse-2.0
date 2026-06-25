import type { SpeakerRole } from '@/types/transcript'
import { SPEAKER_BADGE_CLASS, SPEAKER_LABELS } from '@/lib/speakerLabels'
import { cn } from '@/lib/utils'

interface SpeakerBadgeProps {
  speaker?: SpeakerRole
  className?: string
  compact?: boolean
}

export function SpeakerBadge({ speaker = 'unknown', className, compact }: SpeakerBadgeProps) {
  if (!speaker) return null

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
        SPEAKER_BADGE_CLASS[speaker],
        className,
      )}
    >
      {SPEAKER_LABELS[speaker]}
    </span>
  )
}

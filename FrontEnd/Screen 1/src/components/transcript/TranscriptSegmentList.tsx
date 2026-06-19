import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { formatTimestamp } from '@/lib/transcriptUtils'
import type { TranscriptSearchMatch } from '@/hooks/useTranscriptSearch'
import type { TranscriptSegment } from '@/types/transcript'
import { cn } from '@/lib/utils'

interface TranscriptSegmentListProps {
  segments: TranscriptSegment[]
  fullText: string
  currentTime: number
  query: string
  activeMatch: TranscriptSearchMatch | null
  onSeek: (seconds: number) => void
  className?: string
}

function highlightText(
  text: string,
  query: string,
  activeMatch: TranscriptSearchMatch | null,
  segmentIndex: number,
): ReactNode {
  if (!query.trim()) return text

  const normalized = query.trim()
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  let localMatchIndex = 0

  return parts.map((part, index) => {
    if (part.toLowerCase() !== normalized.toLowerCase()) return part

    const isActive =
      activeMatch?.segmentIndex === segmentIndex &&
      activeMatch.matchIndex === localMatchIndex

    localMatchIndex += 1

    return (
      <mark
        key={index}
        className={cn(
          'rounded-sm px-0.5 not-italic',
          isActive
            ? 'bg-accent/40 text-foreground ring-1 ring-accent/50'
            : 'bg-accent/20 text-foreground',
        )}
      >
        {part}
      </mark>
    )
  })
}

export function TranscriptSegmentList({
  segments,
  fullText,
  currentTime,
  query,
  activeMatch,
  onSeek,
  className,
}: TranscriptSegmentListProps) {
  const prefersReducedMotion = useReducedMotion()
  const activeRef = useRef<HTMLDivElement>(null)
  const matchRef = useRef<HTMLDivElement>(null)

  const activeSegmentId = useMemo(() => {
    const active = segments.find(
      (segment) => currentTime >= segment.start && currentTime < segment.end,
    )
    return active?.id ?? null
  }, [currentTime, segments])

  useEffect(() => {
    if (query.trim() && activeMatch) {
      matchRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
      })
      return
    }

    if (!query.trim() && activeSegmentId != null) {
      activeRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
      })
    }
  }, [activeMatch, activeSegmentId, prefersReducedMotion, query])

  if (segments.length === 0 && fullText) {
    return (
      <div className={cn('px-1 py-2', className)}>
        <p className="text-[15px] leading-[1.75] text-foreground/90">
          {highlightText(fullText, query, activeMatch, 0)}
        </p>
      </div>
    )
  }

  if (segments.length === 0) {
    return null
  }

  return (
    <div className={cn('min-h-0 flex-1 space-y-0 overflow-y-auto px-1', className)}>
      {segments.map((segment, segmentIndex) => {
        const isActive = segment.id === activeSegmentId && !query.trim()
        const isMatchSegment = activeMatch?.segmentIndex === segmentIndex

        return (
          <motion.div
            key={segment.id}
            ref={
              isMatchSegment && query.trim()
                ? matchRef
                : isActive
                  ? activeRef
                  : undefined
            }
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(segmentIndex * 0.02, 0.4) }}
            role="button"
            tabIndex={0}
            onClick={() => onSeek(segment.start)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSeek(segment.start)
              }
            }}
            className={cn(
              'group cursor-pointer rounded-2xl border px-4 py-4 transition-all duration-200',
              isActive
                ? 'border-accent/25 bg-accent/[0.07] shadow-[0_0_28px_rgba(214,162,11,0.07)]'
                : 'border-transparent hover:border-accent/15 hover:bg-accent/[0.04]',
            )}
          >
            <div className="mb-2 flex items-center gap-3">
              <span
                className={cn(
                  'font-mono text-xs tabular-nums transition-colors',
                  isActive ? 'text-accent' : 'text-muted group-hover:text-accent/80',
                )}
              >
                {formatTimestamp(segment.start)}
              </span>
              <div
                className={cn(
                  'h-px flex-1 transition-colors',
                  isActive ? 'bg-accent/25' : 'bg-white/[0.06] group-hover:bg-accent/15',
                )}
              />
            </div>
            <p
              className={cn(
                'text-[15px] leading-[1.75] transition-colors select-text',
                isActive ? 'text-foreground' : 'text-foreground/85 group-hover:text-foreground',
              )}
            >
              {highlightText(segment.text, query, activeMatch, segmentIndex)}
            </p>
          </motion.div>
        )
      })}
    </div>
  )
}

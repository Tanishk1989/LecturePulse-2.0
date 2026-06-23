import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Download,
  MoreVertical,
  NotebookPen,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDuration, formatRelativeDate } from '@/lib/formatDuration'
import { getFileTypeLabel } from '@/lib/lectureFilters'
import { getLectureStatusLabel, getLectureStatusStyles } from '@/lib/lectureStatus'
import { formatLanguage } from '@/lib/transcriptUtils'
import type { LectureRecording } from '@/types/lecture'
import type { Transcript } from '@/types/transcript'
import { TranscriptWaveformPreview } from '@/components/transcript/TranscriptWaveformPreview'
import { cn } from '@/lib/utils'

interface TranscriptSidebarProps {
  lecture: LectureRecording
  transcript: Transcript | null
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlay: () => void
  onPause: () => void
  onRestart: () => void
  className?: string
}

export function TranscriptSidebar({
  lecture,
  transcript,
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onPause,
  onRestart,
  className,
}: TranscriptSidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const status = getLectureStatusStyles(lecture)
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const displayLanguage = formatLanguage(transcript?.language)

  const controlClass = cn(
    'flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08]',
    'bg-white/[0.03] text-muted transition-all duration-200 cursor-pointer',
    'hover:-translate-y-0.5 hover:border-accent/25 hover:text-accent hover:shadow-[0_0_16px_rgba(var(--color-accent-rgb),0.12)]',
  )

  return (
    <aside
      className={cn(
        'flex flex-col rounded-3xl border border-white/[0.08] bg-[#0D0D0D]/90 p-5 backdrop-blur-xl',
        'shadow-[0_16px_48px_rgba(0,0,0,0.35)]',
        className,
      )}
    >
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
          Lecture
        </p>
        <h2 className="mt-2 font-heading text-2xl text-foreground leading-tight">
          {lecture.title}
        </h2>
      </div>

      <dl className="mb-6 space-y-3 text-sm">
        <InfoRow label="Recorded" value={formatRelativeDate(lecture.createdAt)} />
        <InfoRow
          label="Duration"
          value={duration > 0 ? formatDuration(duration) : '—'}
        />
        <InfoRow label="Status">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
              status.container,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
            {getLectureStatusLabel(lecture)}
          </span>
        </InfoRow>
        <InfoRow label="Language" value={displayLanguage ?? '—'} />
        <InfoRow label="File Type" value={getFileTypeLabel(lecture)} />
      </dl>

      <div className="mb-5 flex items-center gap-2">
        <button
          type="button"
          onClick={onPlay}
          aria-label="Play"
          className={cn(
            controlClass,
            'h-11 w-11 border-accent/30 bg-accent/[0.1] text-accent',
            'hover:shadow-[0_0_24px_rgba(var(--color-accent-rgb),0.2)]',
          )}
        >
          <Play className="h-5 w-5 ml-0.5" />
        </button>
        <button type="button" onClick={onPause} aria-label="Pause" className={controlClass}>
          <Pause className="h-4 w-4" />
        </button>
        <button type="button" onClick={onRestart} aria-label="Restart" className={controlClass}>
          <RotateCcw className="h-4 w-4" />
        </button>
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="More options"
            className={controlClass}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 top-full z-10 mt-2 w-44 rounded-2xl border border-white/[0.08] bg-[#0D0D0D] p-1.5 shadow-xl"
            >
              <MenuItem icon={Download} label="Download audio" disabled />
              <MenuItem icon={Share2} label="Share lecture" disabled />
              <MenuItem icon={Trash2} label="Delete lecture" disabled />
            </motion.div>
          )}
        </div>
      </div>

      <TranscriptWaveformPreview progress={progress} isPlaying={isPlaying} />

      <div className="mt-3 flex justify-between font-mono text-[11px] tabular-nums text-muted">
        <span>{formatDuration(Math.floor(currentTime))}</span>
        <span>{formatDuration(duration)}</span>
      </div>

      {transcript?.status === 'completed' && (
        <Link
          to={`/notes/${lecture.id}`}
          className={cn(
            'mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-accent/25',
            'bg-accent/[0.08] px-4 py-2.5 text-sm font-medium text-accent transition-all cursor-pointer',
            'hover:bg-accent/[0.12] hover:shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.12)]',
          )}
        >
          <NotebookPen className="h-4 w-4" />
          Smart Notes
        </Link>
      )}
    </aside>
  )
}

function InfoRow({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-foreground/90 capitalize">{children ?? value}</dd>
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  disabled,
}: {
  icon: typeof Download
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-muted',
        'transition-colors cursor-pointer hover:bg-white/[0.04] hover:text-foreground',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

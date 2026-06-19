import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, FileAudio, FileText, FileVideo, Mic, NotebookPen, ScrollText, Trash2, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ParticleField } from '@/components/effects/ParticleField'
import {
  LectureCardPreview,
  type LectureCardPreviewHandle,
} from '@/components/lectures/LectureCardPreview'
import { formatDuration, formatRelativeDate } from '@/lib/formatDuration'
import { getFileTypeLabel, getLectureMediaKind } from '@/lib/lectureFilters'
import { getLectureStatusLabel, getLectureStatusStyles } from '@/lib/lectureStatus'
import type { LectureRecording } from '@/types/lecture'
import { cn } from '@/lib/utils'

interface LectureCardProps {
  lecture: LectureRecording
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  onToggleFavorite: (id: string) => void
  compact?: boolean
  className?: string
}

function LectureIcon({ lecture }: { lecture: LectureRecording }) {
  const kind = getLectureMediaKind(lecture)

  if (lecture.source === 'record') {
    return <Mic className="h-5 w-5 text-red" strokeWidth={1.75} />
  }
  if (kind === 'video') {
    return <FileVideo className="h-5 w-5 text-accent" strokeWidth={1.75} />
  }
  if (kind === 'pdf') {
    return <FileText className="h-5 w-5 text-emerald" strokeWidth={1.75} />
  }
  if (lecture.source === 'upload') {
    return <Upload className="h-5 w-5 text-accent" strokeWidth={1.75} />
  }
  return <FileAudio className="h-5 w-5 text-accent" strokeWidth={1.75} />
}

export function LectureCard({
  lecture,
  onDelete,
  onRename,
  onToggleFavorite: _onToggleFavorite,
  compact = false,
  className,
}: LectureCardProps) {
  const previewRef = useRef<LectureCardPreviewHandle>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(lecture.title)
  const status = getLectureStatusStyles(lecture)
  const kind = getLectureMediaKind(lecture)
  const openUrl = lecture.audioUrl
  const transcriptPath = kind !== 'pdf' ? `/transcript/${lecture.id}` : null
  const notesPath = `/notes/${lecture.id}`

  useEffect(() => {
    setTitleDraft(lecture.title)
  }, [lecture.title])

  const handleRenameSubmit = () => {
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== lecture.title) {
      onRename(lecture.id, trimmed)
    } else {
      setTitleDraft(lecture.title)
    }
    setIsEditing(false)
  }

  const hoverActionClass = cn(
    'inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-black/50 px-4 py-2',
    'text-xs font-medium text-foreground backdrop-blur-md transition-all duration-300',
    'hover:-translate-y-0.5 hover:border-accent/30 hover:bg-black/70',
  )

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        'group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-card/80 backdrop-blur-xl',
        'shadow-[0_0_40px_rgba(214,162,11,0.04)] transition-all duration-300 cursor-pointer',
        'hover:-translate-y-[5px] hover:border-accent/20 hover:shadow-[0_16px_48px_rgba(0,0,0,0.35),0_0_32px_rgba(214,162,11,0.08)]',
        compact ? 'min-w-[300px] max-w-[340px] shrink-0' : 'w-full',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
        <ParticleField count={compact ? 12 : 18} yellowRatio={0.65} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.04] via-transparent to-ambient/[0.03]" />

      <div
        className={cn(
          'absolute inset-0 z-20 flex items-center justify-center gap-2 bg-black/55 opacity-0 backdrop-blur-sm',
          'transition-opacity duration-300 group-hover:opacity-100 group-hover:pointer-events-auto',
          'pointer-events-none',
        )}
      >
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={hoverActionClass}
          onClick={(event) => event.stopPropagation()}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open
        </a>
        {transcriptPath && (
          <Link
            to={transcriptPath}
            className={hoverActionClass}
            onClick={(event) => event.stopPropagation()}
          >
            <ScrollText className="h-3.5 w-3.5" />
            Transcript
          </Link>
        )}
        {notesPath && (
          <Link
            to={notesPath}
            className={hoverActionClass}
            onClick={(event) => event.stopPropagation()}
          >
            <NotebookPen className="h-3.5 w-3.5" />
            Notes
          </Link>
        )}
        <button
          type="button"
          className={cn(hoverActionClass, 'hover:border-red/30 hover:text-red')}
          onClick={(event) => {
            event.stopPropagation()
            onDelete(lecture.id)
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      <div className={cn('relative z-10 flex flex-col', compact ? 'p-4' : 'p-5 md:p-6')}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
            <LectureIcon lecture={lecture} />
          </div>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
              status.container,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
            <span className="text-[10px] font-semibold tracking-wide">
              {getLectureStatusLabel(lecture)}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <LectureCardPreview ref={previewRef} lecture={lecture} compact={compact} />
        </div>

        <div className="mb-4 min-w-0 space-y-2">
          {isEditing ? (
            <input
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleRenameSubmit()
                if (event.key === 'Escape') {
                  setTitleDraft(lecture.title)
                  setIsEditing(false)
                }
              }}
              autoFocus
              className={cn(
                'w-full rounded-xl border border-accent/25 bg-white/[0.04] px-3 py-2',
                'text-sm font-semibold text-foreground outline-none focus:border-accent/45',
              )}
            />
          ) : (
            <h3
              className="truncate text-base font-semibold text-foreground"
              onDoubleClick={() => setIsEditing(true)}
            >
              {lecture.title}
            </h3>
          )}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span>{formatRelativeDate(lecture.createdAt)}</span>
            <span className="text-white/15">·</span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium">
              {getFileTypeLabel(lecture)}
            </span>
            {lecture.duration != null && lecture.duration > 0 && kind !== 'pdf' && (
              <>
                <span className="text-white/15">·</span>
                <span className="font-mono tabular-nums">{formatDuration(lecture.duration)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  )
}

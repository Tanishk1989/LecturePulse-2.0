import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronRight,
  FileAudio,
  FileText,
  FileVideo,
  Mic,
  Pencil,
  Star,
  Trash2,
  Upload,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDuration, formatRelativeDate } from '@/lib/formatDuration'
import { getFileTypeLabel, getLectureMediaKind } from '@/lib/lectureFilters'
import { getLectureStatusLabel } from '@/lib/lectureStatus'
import { LectureTagsEditor } from '@/components/lectures/LectureTagsEditor'
import type { LectureRecording } from '@/types/lecture'
import { cn } from '@/lib/utils'

interface LectureCardProps {
  lecture: LectureRecording
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  onToggleFavorite: (id: string) => void
  onUpdateTags: (id: string, tags: string[]) => void
}

function LectureIcon({ lecture }: { lecture: LectureRecording }) {
  const kind = getLectureMediaKind(lecture)

  if (lecture.source === 'record') {
    return <Mic className="h-4 w-4" strokeWidth={1.75} />
  }
  if (kind === 'video') {
    return <FileVideo className="h-4 w-4" strokeWidth={1.75} />
  }
  if (kind === 'pdf') {
    return <FileText className="h-4 w-4" strokeWidth={1.75} />
  }
  if (lecture.source === 'upload') {
    return <Upload className="h-4 w-4" strokeWidth={1.75} />
  }
  return <FileAudio className="h-4 w-4" strokeWidth={1.75} />
}

function getBadgeStyle(lecture: LectureRecording): string {
  const kind = getLectureMediaKind(lecture)
  if (lecture.source === 'record') {
    return 'bg-red/10 text-red'
  }
  if (kind === 'video') {
    return 'bg-accent/10 text-accent'
  }
  if (kind === 'pdf') {
    return 'bg-emerald/10 text-emerald'
  }
  return 'bg-accent/10 text-accent'
}

function getLectureStatusTextColor(lecture: LectureRecording): string {
  switch (lecture.status) {
    case 'completed':
      return 'text-muted'
    case 'failed':
      return 'text-red font-medium'
    case 'processing':
    case 'uploaded':
    default:
      return 'text-accent font-medium animate-pulse'
  }
}

export function LectureCard({
  lecture,
  onDelete,
  onRename,
  onToggleFavorite,
  onUpdateTags,
}: LectureCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(lecture.title)
  const kind = getLectureMediaKind(lecture)

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

  const detailPath = kind === 'pdf' ? `/notes/${lecture.id}` : `/transcript/${lecture.id}`

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        to={detailPath}
        className={cn(
          'group flex items-center justify-between gap-4 py-3.5 px-4.5 transition-all duration-150',
          'hover:bg-white/[0.03]',
        )}
      >
        {/* Left side: Icon badge & Title/Meta */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
              getBadgeStyle(lecture),
            )}
          >
            <LectureIcon lecture={lecture} />
          </div>

          <div className="min-w-0 flex-1 text-left">
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
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                autoFocus
                className={cn(
                  'w-full max-w-md rounded-lg border border-accent/25 bg-white/[0.04] px-2.5 py-1',
                  'text-sm font-semibold text-foreground outline-none focus:border-accent/45',
                )}
              />
            ) : (
              <div className="flex items-center gap-2 group/title">
                <h3
                  className="truncate text-sm font-medium text-foreground group-hover:text-white"
                  onDoubleClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (lecture.status !== 'processing' && lecture.status !== 'uploaded') {
                      setIsEditing(true)
                    }
                  }}
                >
                  {lecture.status === 'processing' || lecture.status === 'uploaded' ? (
                    <span className="text-muted/60 italic animate-pulse">Generating title...</span>
                  ) : (
                    lecture.title
                  )}
                </h3>
                {lecture.status !== 'processing' && lecture.status !== 'uploaded' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsEditing(true)
                    }}
                    className="opacity-0 group-hover/title:opacity-100 p-0.5 rounded hover:bg-white/10 text-muted hover:text-foreground transition-all cursor-pointer shrink-0"
                    title="Rename lecture"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            <div className="mt-1 flex items-center gap-x-2 text-xs text-muted">
              <span>{formatRelativeDate(lecture.createdAt)}</span>
              <span className="text-white/10">·</span>
              <span>{getFileTypeLabel(lecture)}</span>
              {lecture.duration != null && lecture.duration > 0 && kind !== 'pdf' && (
                <>
                  <span className="text-white/10">·</span>
                  <span className="font-mono tabular-nums">{formatDuration(lecture.duration)}</span>
                </>
              )}
            </div>
            <div
              className="mt-2"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
            >
              <LectureTagsEditor
                tags={lecture.tags}
                compact
                onChange={(tags) => onUpdateTags(lecture.id, tags)}
              />
            </div>
          </div>
        </div>

        {/* Right side: Status, Options, Chevron */}
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <span className={cn('text-xs font-semibold', getLectureStatusTextColor(lecture))}>
            {getLectureStatusLabel(lecture)}
          </span>

          {/* Favorite Toggle Button */}
          <button
            type="button"
            className={cn(
              'p-1.5 rounded-lg hover:bg-white/5 transition-all duration-200 cursor-pointer',
              lecture.favorite
                ? 'text-accent opacity-100'
                : 'text-muted hover:text-accent opacity-0 group-hover:opacity-100',
            )}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onToggleFavorite(lecture.id)
            }}
            title={lecture.favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star
              className="h-4 w-4"
              fill={lecture.favorite ? 'currentColor' : 'none'}
              strokeWidth={1.75}
            />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            className={cn(
              'p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-red transition-all duration-200 cursor-pointer',
              'opacity-0 group-hover:opacity-100',
            )}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onDelete(lecture.id)
            }}
            title="Delete lecture"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>

          <ChevronRight
            className="h-4 w-4 text-muted group-hover:text-foreground transition-colors shrink-0"
            strokeWidth={1.75}
          />
        </div>
      </Link>
    </motion.div>
  )
}

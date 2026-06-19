import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Mic, Pause, Pencil, Play, Trash2, Upload } from 'lucide-react'
import { formatDuration, formatRelativeDate } from '@/lib/formatDuration'
import { formatFileSize } from '@/lib/uploadUtils'
import type { LectureRecording } from '@/types/lecture'
import { cn } from '@/lib/utils'

interface LectureRecordingCardProps {
  recording: LectureRecording
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
}

function SourceIcon({ recording }: { recording: LectureRecording }) {
  if (recording.source === 'record') {
    return <Mic className="h-4 w-4 shrink-0 text-red" strokeWidth={1.75} />
  }
  if (recording.mediaKind === 'pdf') {
    return <FileText className="h-4 w-4 shrink-0 text-emerald" strokeWidth={1.75} />
  }
  return <Upload className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
}

function statusLabel(recording: LectureRecording) {
  if (recording.source === 'upload' || recording.status === 'processing') {
    return 'Ready for processing'
  }
  return 'Ready'
}

function statusStyles(recording: LectureRecording) {
  if (recording.source === 'upload' || recording.status === 'processing') {
    return 'border-accent/25 bg-accent/[0.08] text-accent'
  }
  return 'border-emerald/25 bg-emerald/[0.08] text-emerald'
}

function statusDot(recording: LectureRecording) {
  if (recording.source === 'upload' || recording.status === 'processing') {
    return 'bg-accent'
  }
  return 'bg-emerald'
}

export function LectureRecordingCard({ recording, onDelete, onRename }: LectureRecordingCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(recording.title)
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)

  const canPlay = recording.mediaKind === 'audio' || recording.mediaKind === 'video' || recording.source === 'record'

  useEffect(() => {
    setTitleDraft(recording.title)
  }, [recording.title])

  useEffect(() => {
    return () => {
      mediaRef.current?.pause()
      mediaRef.current = null
    }
  }, [])

  const togglePlay = () => {
    if (!canPlay) return

    if (!mediaRef.current) {
      const element =
        recording.mediaKind === 'video'
          ? document.createElement('video')
          : document.createElement('audio')
      element.src = recording.audioUrl
      element.onended = () => setIsPlaying(false)
      mediaRef.current = element
    }

    if (isPlaying) {
      mediaRef.current.pause()
      setIsPlaying(false)
      return
    }

    void mediaRef.current.play()
    setIsPlaying(true)
  }

  const handleRenameSubmit = () => {
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== recording.title) {
      onRename(recording.id, trimmed)
    } else {
      setTitleDraft(recording.title)
    }
    setIsEditing(false)
  }

  const actionButtonClass = cn(
    'flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08]',
    'bg-white/[0.03] backdrop-blur-md text-muted transition-all duration-300 cursor-pointer',
    'hover:-translate-y-0.5 hover:scale-[1.03] hover:text-foreground hover:border-white/[0.14]',
  )

  const metaLine =
    recording.mediaKind === 'pdf'
      ? recording.fileSize
        ? formatFileSize(recording.fileSize)
        : null
      : recording.duration != null && recording.duration > 0
        ? formatDuration(recording.duration)
        : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/[0.08]',
        'bg-card/90 backdrop-blur-xl p-5 transition-all duration-300',
        'hover:-translate-y-0.5 hover:border-white/[0.12] hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <SourceIcon recording={recording} />
            {isEditing ? (
              <input
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleRenameSubmit()
                  if (event.key === 'Escape') {
                    setTitleDraft(recording.title)
                    setIsEditing(false)
                  }
                }}
                autoFocus
                className={cn(
                  'w-full rounded-lg border border-accent/25 bg-white/[0.04] px-2 py-1',
                  'text-sm font-medium text-foreground outline-none',
                )}
              />
            ) : (
              <p className="truncate text-sm font-semibold text-foreground">{recording.title}</p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>{formatRelativeDate(recording.createdAt)}</span>
            {metaLine && (
              <>
                <span className="text-white/20">·</span>
                <span className="font-mono tabular-nums">{metaLine}</span>
              </>
            )}
          </div>

          <div
            className={cn(
              'mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
              statusStyles(recording),
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', statusDot(recording))} />
            <span className="text-[11px] font-medium">{statusLabel(recording)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canPlay && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause lecture playback' : 'Play lecture'}
              className={cn(
                actionButtonClass,
                isPlaying && 'border-accent/25 text-accent hover:text-accent',
              )}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label="Rename lecture"
            className={actionButtonClass}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(recording.id)}
            aria-label="Delete lecture"
            className={cn(actionButtonClass, 'hover:border-red/25 hover:text-red')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

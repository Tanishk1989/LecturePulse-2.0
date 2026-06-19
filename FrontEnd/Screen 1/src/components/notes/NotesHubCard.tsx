import { ArrowRight, FileText, Loader2, ScrollText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatRelativeDate } from '@/lib/formatDuration'
import { getFileTypeLabel, getLectureMediaKind } from '@/lib/lectureFilters'
import type { LectureRecording } from '@/types/lecture'
import type { LectureNotes } from '@/types/notes'
import { cn } from '@/lib/utils'

export type NotesHubStatus =
  | 'needs_pdf_text'
  | 'needs_transcript'
  | 'ready'
  | 'generating'
  | 'failed'
  | 'no_notes'

interface NotesHubCardProps {
  lecture: LectureRecording
  notes: LectureNotes | null
  hasTranscript: boolean
}

function resolveHubStatus(
  lecture: LectureRecording,
  notes: LectureNotes | null,
  hasTranscript: boolean,
): NotesHubStatus {
  if (getLectureMediaKind(lecture) === 'pdf' && !hasTranscript) return 'needs_pdf_text'
  if (!hasTranscript) return 'needs_transcript'
  if (!notes) return 'no_notes'
  if (notes.status === 'completed') return 'ready'
  if (notes.status === 'failed') return 'failed'
  return 'generating'
}

const statusConfig: Record<
  NotesHubStatus,
  { label: string; container: string; dot: string; action: string; href: (id: string) => string }
> = {
  ready: {
    label: 'Ready',
    container: 'border-emerald/20 bg-emerald/[0.08] text-emerald',
    dot: 'bg-emerald',
    action: 'Open Notes',
    href: (id) => `/notes/${id}`,
  },
  no_notes: {
    label: 'Not generated',
    container: 'border-accent/20 bg-accent/[0.08] text-accent',
    dot: 'bg-accent',
    action: 'Generate Notes',
    href: (id) => `/notes/${id}`,
  },
  generating: {
    label: 'Generating',
    container: 'border-sky-400/20 bg-sky-400/[0.08] text-sky-400',
    dot: 'bg-sky-400 animate-pulse',
    action: 'View Progress',
    href: (id) => `/notes/${id}`,
  },
  failed: {
    label: 'Failed',
    container: 'border-red/20 bg-red/[0.08] text-red',
    dot: 'bg-red',
    action: 'Retry',
    href: (id) => `/notes/${id}`,
  },
  needs_transcript: {
    label: 'Needs transcript',
    container: 'border-white/[0.1] bg-white/[0.04] text-muted',
    dot: 'bg-muted',
    action: 'Transcribe',
    href: (id) => `/transcript/${id}`,
  },
  needs_pdf_text: {
    label: 'Needs extraction',
    container: 'border-white/[0.1] bg-white/[0.04] text-muted',
    dot: 'bg-muted',
    action: 'Generate Notes',
    href: (id) => `/notes/${id}`,
  },
}

function summaryPreview(notes: LectureNotes | null, status: NotesHubStatus): string | null {
  if (status !== 'ready' || !notes?.content.summary) return null
  const text = notes.content.summary.trim()
  if (text.length <= 120) return text
  return `${text.slice(0, 120).trim()}…`
}

export function NotesHubCard({ lecture, notes, hasTranscript }: NotesHubCardProps) {
  const status = resolveHubStatus(lecture, notes, hasTranscript)
  const config = statusConfig[status]
  const preview = summaryPreview(notes, status)
  const href = config.href(lecture.id)

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/80 backdrop-blur-xl',
        'transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/20',
        'hover:shadow-[0_12px_40px_rgba(0,0,0,0.25),0_0_24px_rgba(214,162,11,0.06)]',
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.03] via-transparent to-ambient/[0.02]" />

      <div className="relative flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
                config.container,
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
              <span className="text-[10px] font-semibold tracking-wide">{config.label}</span>
            </div>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-muted">
              {getFileTypeLabel(lecture)}
            </span>
          </div>

          <h3 className="truncate text-base font-semibold text-foreground">{lecture.title}</h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span>{formatRelativeDate(lecture.createdAt)}</span>
            {notes?.updatedAt && status === 'ready' && (
              <>
                <span className="text-white/15">·</span>
                <span>Updated {formatRelativeDate(notes.updatedAt)}</span>
              </>
            )}
          </div>

          {preview && (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted">{preview}</p>
          )}

          {status === 'needs_transcript' && (
            <p className="mt-3 text-sm text-muted">
              Transcribe this lecture to generate smart notes.
            </p>
          )}

          {status === 'needs_pdf_text' && (
            <p className="mt-3 text-sm text-muted">
              Open notes to extract text from this PDF and generate smart notes.
            </p>
          )}
        </div>

        <div className="shrink-0">
          <Link
            to={href}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 cursor-pointer',
              status === 'ready' || status === 'no_notes'
                ? 'bg-accent text-background shadow-[0_0_20px_rgba(214,162,11,0.15)] hover:bg-accent-soft'
                : 'border border-white/[0.12] bg-white/[0.03] text-foreground hover:border-accent/25',
            )}
          >
            {status === 'generating' && <Loader2 className="h-4 w-4 animate-spin" />}
            {status === 'needs_transcript' && <ScrollText className="h-4 w-4" />}
            {(status === 'ready' ||
              status === 'no_notes' ||
              status === 'failed' ||
              status === 'needs_pdf_text') && <FileText className="h-4 w-4" />}
            {config.action}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}

export function notesHubStats(notes: LectureNotes[]) {
  const ready = notes.filter((n) => n.status === 'completed').length
  const pending = notes.filter((n) => n.status === 'generating' || n.status === 'idle').length
  const failed = notes.filter((n) => n.status === 'failed').length
  return { total: notes.length, ready, pending, failed }
}

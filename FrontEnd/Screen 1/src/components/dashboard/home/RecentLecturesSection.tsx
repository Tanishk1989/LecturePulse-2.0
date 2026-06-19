import { AnimatePresence, motion } from 'framer-motion'
import { FileText, Mic, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FadeUp } from '@/components/effects/FadeUp'
import { PulseIcon } from '@/components/shared/PulseIcon'
import { useLectures } from '@/context/LectureContext'
import { formatDuration, formatRelativeDate } from '@/lib/formatDuration'
import { getFileTypeLabel, getLectureMediaKind } from '@/lib/lectureFilters'
import { getLectureStatusLabel, getLectureStatusStyles } from '@/lib/lectureStatus'
import { formatFileSize } from '@/lib/uploadUtils'
import type { LectureRecording } from '@/types/lecture'
import { cn } from '@/lib/utils'

function LectureRowIcon({ lecture }: { lecture: LectureRecording }) {
  const kind = getLectureMediaKind(lecture)
  if (lecture.source === 'record') {
    return <Mic className="h-3.5 w-3.5 shrink-0 text-red" strokeWidth={1.75} />
  }
  if (kind === 'pdf') {
    return <FileText className="h-3.5 w-3.5 shrink-0 text-emerald" strokeWidth={1.75} />
  }
  return <Upload className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.75} />
}

export function RecentLecturesSection() {
  const { lectures } = useLectures()
  const recent = lectures.slice(0, 3)
  const hasLectures = recent.length > 0

  return (
    <FadeUp delay={0.25}>
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/90 backdrop-blur-xl p-6 min-h-[260px] flex flex-col">
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted">
            Recent Lectures
          </p>
          {hasLectures && (
            <Link
              to="/dashboard/lectures"
              className="text-xs font-medium text-accent hover:text-accent-soft transition-colors cursor-pointer"
            >
              View all
            </Link>
          )}
        </div>

        {!hasLectures ? (
          <div className="relative flex flex-1 flex-col items-center justify-center text-center py-4">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative mb-5"
            >
              <div className="absolute inset-0 h-16 w-16 rounded-full bg-accent/[0.12] blur-[24px] mx-auto" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.06]">
                <PulseIcon size={36} glow />
              </div>
            </motion.div>

            <p className="text-base font-medium text-foreground">No lectures yet.</p>
            <p className="mt-1.5 text-sm text-muted max-w-xs leading-relaxed">
              Record or upload your first lecture and start building your knowledge base.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Link
                to="/dashboard/upload"
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-background',
                  'shadow-[0_0_20px_rgba(214,162,11,0.18)] hover:bg-accent-soft hover:-translate-y-0.5',
                  'transition-all duration-300 cursor-pointer',
                )}
              >
                <Upload className="h-4 w-4" strokeWidth={2} />
                Upload Lecture
              </Link>
              <Link
                to="/dashboard/record"
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg border border-red/30 px-5 py-2.5 text-sm font-medium text-red',
                  'hover:bg-red/[0.06] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
                )}
              >
                <Mic className="h-4 w-4" strokeWidth={2} />
                Record Live
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {recent.map((lecture) => {
                const status = getLectureStatusStyles(lecture)
                const kind = getLectureMediaKind(lecture)

                return (
                  <motion.div
                    key={lecture.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'rounded-xl border border-white/[0.06] bg-white/[0.02] p-4',
                      'transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.03]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <LectureRowIcon lecture={lecture} />
                          <p className="truncate text-sm font-semibold text-foreground">
                            {lecture.title}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                          <span>{formatRelativeDate(lecture.createdAt)}</span>
                          <span className="text-white/20">·</span>
                          <span className="font-mono tabular-nums">
                            {kind === 'pdf' && lecture.fileSize
                              ? formatFileSize(lecture.fileSize)
                              : lecture.duration != null && lecture.duration > 0
                                ? formatDuration(lecture.duration)
                                : '—'}
                          </span>
                          <span className="text-white/20">·</span>
                          <span>{getFileTypeLabel(lecture)}</span>
                        </div>
                        <div
                          className={cn(
                            'mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5',
                            status.container,
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                          <span className="text-[10px] font-medium">
                            {getLectureStatusLabel(lecture)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </FadeUp>
  )
}
